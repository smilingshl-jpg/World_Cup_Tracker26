import { esc, textOn } from './format.js';
import { colorsOf } from './state.js';

// Inline match-detail panels. Open panels survive signature-guard re-renders:
// wireMatchDetails re-applies any panel whose match num is in `open`.
const open = new Set();
const cache = new Map(); // num -> { at, data }
const CACHE_MS = 60 * 1000;

async function fetchDetail(num) {
  const hit = cache.get(num);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.data;
  const data = await fetch('/api/matchdetail?num=' + num).then(r => r.json());
  cache.set(num, { at: Date.now(), data });
  return data;
}

function lineupCol(l) {
  const player = (p) => `<div class="lp"><span class="jersey">${esc(p.jersey ?? '')}</span> ${esc(p.name)} <span class="pos">${esc(p.pos ?? '')}</span></div>`;
  return `<div class="lineup-col">
    <div class="label">${esc(l.team)}${l.formation ? ` · ${esc(l.formation)}` : ''}</div>
    ${l.starters.map(player).join('')}
    ${l.subs.length ? `<div class="label" style="margin-top:8px;">Bench</div>${l.subs.map(player).join('')}` : ''}
  </div>`;
}

const lastName = (full) => {
  const parts = String(full).split(' ');
  return parts.length > 1 ? parts.slice(1).join(' ') : full;
};

// Players on a pitch: home attacks right (left half), away mirrored on the right half.
// Rows come from the formation string ("4-1-4-1" -> GK + [4,1,4,1]); players fill rows
// sorted by ESPN's formationPlace (1 = goalkeeper).
function pitchSide(l, mirror) {
  const rows = [1, ...String(l.formation).split('-').map(Number)];
  const starters = [...l.starters].sort((a, b) => (a.place ?? 99) - (b.place ?? 99));
  if (rows.some(isNaN) || rows.reduce((s, n) => s + n, 0) !== starters.length) return null;
  const cols = colorsOf(l.team);
  const fill = cols[0];
  const ring = cols[1] && cols[1].toLowerCase() !== fill.toLowerCase() ? cols[1] : '#f6f1e7';
  const ink = textOn(fill);
  let idx = 0;
  const dots = [];
  rows.forEach((count, r) => {
    // depth across this team's half: GK hugs the goal line, last row near midfield
    const xHalf = 6 + (r / Math.max(rows.length - 1, 1)) * 38; // 6%..44% of full pitch
    const x = mirror ? 100 - xHalf : xHalf;
    for (let j = 0; j < count; j++, idx++) {
      const p = starters[idx];
      const y = ((j + 0.5) / count) * 100;
      dots.push(`<div class="pl" style="left:${x}%;top:${y}%;">
        <span class="dot" style="background:${fill};border-color:${ring};color:${ink};">${esc(p.jersey ?? '')}</span>
        <span class="pname">${esc(lastName(p.name))}</span>
      </div>`);
    }
  });
  return dots.join('');
}

function lineupsHtml(lineups) {
  const home = pitchSide(lineups[0], false);
  const away = lineups[1] ? pitchSide(lineups[1], true) : null;
  if (!home || !away) {
    return `<div class="lineups">${lineups.map(lineupCol).join('')}</div>`; // fallback: list view
  }
  const bench = (l) => l.subs.length
    ? `<div class="bench-col"><div class="label">${esc(l.team)} bench</div>${
        l.subs.map(p => `<span class="bench-p"><span class="jersey">${esc(p.jersey ?? '')}</span> ${esc(lastName(p.name))}</span>`).join('')}</div>`
    : '';
  return `<div class="pitch-head">
      <span>${esc(lineups[0].team)} · ${esc(lineups[0].formation)}</span>
      <span>${esc(lineups[1].formation)} · ${esc(lineups[1].team)}</span>
    </div>
    <div class="pitch">
      <div class="pitch-lines"></div>
      ${home}${away}
    </div>
    <div class="benches">${bench(lineups[0])}${bench(lineups[1])}</div>`;
}

function statBars(stats) {
  return stats.map(s => {
    const h = parseFloat(s.home) || 0, a = parseFloat(s.away) || 0;
    const total = h + a || 1;
    return `<div class="stat-row">
      <span class="sv">${esc(s.home ?? '–')}</span>
      <div class="sbar"><div class="sb l" style="width:${(h / total) * 100}%"></div><div class="sb r" style="width:${(a / total) * 100}%"></div></div>
      <span class="sv">${esc(s.away ?? '–')}</span>
      <span class="sl">${esc(s.label)}</span>
    </div>`;
  }).join('');
}

function formChips(side) {
  const chip = (r) => `<span class="form-chip ${r.result === 'W' ? 'w' : r.result === 'L' ? 'l' : 'd'}" title="${esc(r.score)} vs ${esc(r.opponent)}">${esc(r.result)}</span>`;
  return `<div class="form-line"><b>${esc(side.team)}</b> ${side.results.map(chip).join('')}</div>`;
}

function panelHtml(d) {
  if (!d.available) return '<div class="detail-panel"><p class="scenario-note">No extra detail available for this match yet.</p></div>';
  const parts = [];
  if (d.lineups) parts.push(`<div class="detail-section"><div class="label">Lineups</div>${lineupsHtml(d.lineups)}</div>`);
  if (d.stats && d.stats.length) parts.push(`<div class="detail-section"><div class="label">Match stats</div>${statBars(d.stats)}</div>`);
  if (d.form) parts.push(`<div class="detail-section"><div class="label">Form (last 5)</div>${d.form.map(formChips).join('')}</div>`);
  if (d.h2h) parts.push(`<div class="detail-section"><div class="label">Head to head</div>${d.h2h.slice(0, 5).map(h => `<div class="h2h-line">${esc((h.date || '').slice(0, 10))} — ${esc(h.text)}</div>`).join('')}</div>`);
  const infoBits = [];
  if (d.info && d.info.venue) infoBits.push(d.info.venue);
  if (d.info && d.info.referee) infoBits.push('Referee: ' + d.info.referee);
  if (d.info && d.info.attendance) infoBits.push('Att: ' + Number(d.info.attendance).toLocaleString());
  if (d.odds && d.odds.details) infoBits.push(`${d.odds.provider || 'Odds'}: ${d.odds.details}${d.odds.overUnder != null ? ' · O/U ' + d.odds.overUnder : ''}`);
  if (infoBits.length) parts.push(`<div class="detail-section info-line">${esc(infoBits.join('  ·  '))}</div>`);
  return `<div class="detail-panel">${parts.join('') || '<p class="scenario-note">Nothing to show yet.</p>'}</div>`;
}

async function showPanel(row, num) {
  let panel = row.nextElementSibling;
  if (!panel || !panel.classList.contains('detail-panel')) {
    panel = document.createElement('div');
    panel.className = 'detail-panel';
    panel.innerHTML = '<p class="scenario-note">Loading match details…</p>';
    row.after(panel);
  }
  try {
    const d = await fetchDetail(num);
    const fresh = document.createElement('div');
    fresh.innerHTML = panelHtml(d);
    const next = fresh.firstElementChild;
    next.style.setProperty('--c1', row.style.getPropertyValue('--c1')); // stat bars in kit colors
    next.style.setProperty('--c2', row.style.getPropertyValue('--c2'));
    panel.replaceWith(next);
  } catch {
    panel.innerHTML = '<p class="scenario-note">Could not load match details.</p>';
  }
}

function hidePanel(row) {
  const panel = row.nextElementSibling;
  if (panel && panel.classList.contains('detail-panel')) panel.remove();
}

// Auto-refresh: every minute, re-fetch and re-render any open panel so live
// lineups/stats stay accurate even when the surrounding view doesn't re-render.
setInterval(() => {
  if (!open.size) return;
  cache.clear();
  document.querySelectorAll('.vs-row[data-num]').forEach(row => {
    const num = Number(row.dataset.num);
    if (open.has(num)) showPanel(row, num);
  });
}, 60 * 1000);

// Called after any view render: binds clicks and restores open panels.
export function wireMatchDetails(el) {
  el.querySelectorAll('.vs-row[data-num]').forEach(row => {
    const num = Number(row.dataset.num);
    if (open.has(num)) showPanel(row, num); // restore after re-render
    row.addEventListener('click', (ev) => {
      if (ev.target.closest('a, details, summary')) return;
      if (open.has(num)) { open.delete(num); hidePanel(row); }
      else { open.add(num); showPanel(row, num); }
    });
  });
}
