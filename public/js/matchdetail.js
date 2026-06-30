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

const EVENT_ICON = (e) => e.goal ? '⚽' : /red card/i.test(e.kind) ? '🟥' : /yellow card/i.test(e.kind) ? '🟨' : /substitution/i.test(e.kind) ? '🔁' : '•';

function timelineHtml(events) {
  return `<div class="timeline">${events.map(e => `<div class="tl-ev ${e.side || ''}">
    <span class="tl-clock">${esc(e.clock)}</span>
    <span class="tl-icon">${EVENT_ICON(e)}</span>
    <span class="tl-text">${esc(e.text || e.kind)}</span>
  </div>`).join('')}</div>`;
}

// Watch & React: broadcasters (real) + highlights search + X / Reddit match threads.
function watchReactHtml(d, num) {
  const m = (window.__matchByNum && window.__matchByNum[num]) || {};
  const q = encodeURIComponent(`${m.team1 || ''} ${m.team2 || ''} World Cup`);
  const bcast = (d.broadcasts && d.broadcasts.length)
    ? `<span class="wr-bcast">📺 ${d.broadcasts.map(esc).join(' · ')}</span>` : '';
  return `<div class="detail-section watch-react">
    ${bcast}
    <a class="wr-btn" href="https://www.youtube.com/results?search_query=${q}+highlights" target="_blank" rel="noopener">▶ Highlights</a>
    <a class="wr-btn" href="https://x.com/search?q=${q}&f=live" target="_blank" rel="noopener">𝕏 Reactions</a>
    <a class="wr-btn" href="https://www.reddit.com/r/soccer/search/?q=${q}&sort=new" target="_blank" rel="noopener">🔥 r/soccer</a>
  </div>`;
}

// Deterministic RNG seeded from a string (so a kick always lands in the same spot).
function seedRand(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return () => { h += 0x6d2b79f5; let t = h; t = Math.imul(t ^ (t >>> 15), 1 | t); t ^= t + Math.imul(t ^ (t >>> 7), 61 | t); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

// Penalty shootout: net shaded by historical scoring probability (real stats) + real
// kick outcomes/takers from ESPN. Marker POSITIONS are modelled (no feed records them).
function shootoutHtml(d, num) {
  const pens = d.pens;
  if (!pens || !Array.isArray(pens.teams) || pens.teams.length < 2) return '';
  const zones = d.penaltyZones || [];
  const m = (window.__matchByNum && window.__matchByNum[num]) || {};
  const home = pens.teams.find(t => t.side === 'home') || pens.teams[0];
  const away = pens.teams.find(t => t.side === 'away') || pens.teams[1];
  const [ph, pa] = pens.result;
  const winner = ph > pa ? home : away;
  const pw = Math.max(ph, pa), pl = Math.min(ph, pa);
  const sc = d.score && (d.score.et || d.score.ft);
  const ftLine = sc ? `${esc(m.team1 || home.team)} ${sc[0]}–${sc[1]} ${esc(m.team2 || away.team)}${d.score.et ? ' <span class="aet">(a.e.t.)</span>' : ''} — ` : '';

  // goal geometry (viewBox 0 0 300 150)
  const X0 = 34, Y0 = 16, W = 232, H = 92, colW = W / 3, rowH = H / 2;
  const shade = (c) => Math.max(0.08, Math.min(0.8, (c - 0.66) * 2.1));
  const zoneSvg = zones.map(z => {
    const x = X0 + z.col * colW, y = Y0 + z.row * rowH;
    return `<rect x="${x}" y="${y}" width="${colW}" height="${rowH}" fill="rgba(34,197,94,${shade(z.conversion).toFixed(2)})" stroke="rgba(246,241,231,.15)"/>
      <text x="${x + colW / 2}" y="${y + rowH / 2 + 4}" class="so-zpct">${Math.round(z.conversion * 100)}%</text>`;
  }).join('');

  // place each real kick into a zone (seeded): scored skew to high-conversion corners, misses to centre
  const pickZone = (scored, rnd) => {
    if (!zones.length) return null;
    const w = zones.map(z => scored ? Math.pow(z.conversion, 2) * (0.4 + z.share) : (1 - z.conversion) * (0.4 + z.share));
    const sum = w.reduce((a, b) => a + b, 0); let r = rnd() * sum;
    for (let i = 0; i < zones.length; i++) if ((r -= w[i]) <= 0) return zones[i];
    return zones[zones.length - 1];
  };
  const markers = pens.teams.flatMap(side => side.kicks.map(k => {
    const rnd = seedRand(`${num}|${side.team}|${k.n}|${k.scored}`);
    const z = pickZone(k.scored, rnd);
    if (!z) return '';
    const cx = X0 + z.col * colW + colW * (0.22 + 0.56 * rnd());
    const cy = Y0 + z.row * rowH + rowH * (0.22 + 0.56 * rnd());
    return `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="5.5" class="so-kick ${k.scored ? 'scored' : 'miss'}"><title>${esc(side.team)} — ${esc(k.taker)} (${k.scored ? 'scored' : 'missed'})</title></circle>`;
  })).join('');

  const net = `<svg viewBox="0 0 300 150" class="so-net" role="img" aria-label="Goal net shaded by historical penalty scoring probability with shootout kicks plotted">
    <rect x="${X0}" y="${Y0}" width="${W}" height="${H}" fill="rgba(255,255,255,.03)"/>
    ${zoneSvg}
    <g stroke="rgba(246,241,231,.10)">${[1, 2].map(i => `<line x1="${X0 + i * colW}" y1="${Y0}" x2="${X0 + i * colW}" y2="${Y0 + H}"/>`).join('')}<line x1="${X0}" y1="${Y0 + rowH}" x2="${X0 + W}" y2="${Y0 + rowH}"/></g>
    <g stroke="var(--gold)" stroke-width="3.5" fill="none"><line x1="${X0}" y1="${Y0}" x2="${X0}" y2="${Y0 + H}"/><line x1="${X0 + W}" y1="${Y0}" x2="${X0 + W}" y2="${Y0 + H}"/><line x1="${X0}" y1="${Y0}" x2="${X0 + W}" y2="${Y0}"/></g>
    <line x1="14" y1="${Y0 + H}" x2="286" y2="${Y0 + H}" stroke="rgba(246,241,231,.25)" stroke-width="2"/>
    ${markers}
  </svg>`;

  const seqRow = (side) => `<div class="so-row"><span class="so-team">${esc(side.team)}</span>${
    side.kicks.map(k => `<span class="so-tick ${k.scored ? 'scored' : 'miss'}" title="${esc(k.taker)} — ${k.scored ? 'scored' : 'missed'}">${k.scored ? '●' : '○'}<em>${esc(lastName(k.taker))}</em></span>`).join('')
  }</div>`;

  return `<div class="detail-section shootout">
    <div class="label">Penalty shootout</div>
    <div class="so-result">${ftLine}<b>${esc(winner.team)}</b> win ${pw}–${pl} on penalties</div>
    ${net}
    <div class="so-seq">${seqRow(home)}${seqRow(away)}</div>
    <div class="so-cap">Net shaded by historical scoring probability per zone. Kick outcomes &amp; takers are real (ESPN); marker positions are illustrative — exact placement isn't recorded.</div>
  </div>`;
}

function panelHtml(d, num) {
  if (!d.available) return '<div class="detail-panel"><p class="scenario-note">No extra detail available for this match yet.</p></div>';
  const parts = [];
  if (d.pens) parts.push(shootoutHtml(d, num));
  parts.push(watchReactHtml(d, num));
  if (d.timeline && d.timeline.length) parts.push(`<div class="detail-section"><div class="label">Timeline</div>${timelineHtml(d.timeline)}</div>`);
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
    fresh.innerHTML = panelHtml(d, num);
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
