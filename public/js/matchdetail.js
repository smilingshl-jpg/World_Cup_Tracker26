import { esc } from './format.js';

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
  if (d.lineups) parts.push(`<div class="detail-section"><div class="label">Lineups</div><div class="lineups">${d.lineups.map(lineupCol).join('')}</div></div>`);
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
