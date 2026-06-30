import { esc, textOn } from './format.js';
import { colorsOf } from './state.js';
import { winProbSteps } from './penalty.js';

// shootout carousel state, keyed by match num (survives the 60s panel re-render)
const soData = new Map();
const soIndex = new Map();

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
// kick outcomes/takers from ESPN, as a click-through carousel with a live win-probability
// that swings after each kick. Marker POSITIONS are modelled (no feed records them).
const pct = (x) => Math.round(x * 100);
const SO_GEO = { X0: 34, Y0: 16, W: 232, H: 92 };

function buildShootout(d, num) {
  const pens = d.pens;
  if (!pens || !Array.isArray(pens.teams) || pens.teams.length < 2) return null;
  const zones = d.penaltyZones || [];
  const { X0, Y0, W, H } = SO_GEO, colW = W / 3, rowH = H / 2;
  const { home, away, steps } = winProbSteps(pens);
  const pickZone = (scored, rnd) => {
    if (!zones.length) return null;
    const w = zones.map(z => scored ? Math.pow(z.conversion, 2) * (0.4 + z.share) : (1 - z.conversion) * (0.4 + z.share));
    const sum = w.reduce((a, b) => a + b, 0); let r = rnd() * sum;
    for (let i = 0; i < zones.length; i++) if ((r -= w[i]) <= 0) return zones[i];
    return zones[zones.length - 1];
  };
  // attach a modelled placement to each ordered step
  for (const st of steps) {
    const rnd = seedRand(`${num}|${st.team}|${st.n}|${st.scored}`);
    const z = pickZone(st.scored, rnd);
    st.zone = z;
    st.cx = z ? X0 + z.col * colW + colW * (0.22 + 0.56 * rnd()) : X0 + W / 2;
    st.cy = z ? Y0 + z.row * rowH + rowH * (0.22 + 0.56 * rnd()) : Y0 + H / 2;
  }
  return { steps, home, away, zones };
}

function netSvg(data, cur) {
  const { X0, Y0, W, H } = SO_GEO, colW = W / 3, rowH = H / 2;
  const shade = (c) => Math.max(0.08, Math.min(0.8, (c - 0.66) * 2.1));
  const zoneSvg = data.zones.map(z => {
    const x = X0 + z.col * colW, y = Y0 + z.row * rowH;
    return `<rect x="${x}" y="${y}" width="${colW}" height="${rowH}" fill="rgba(34,197,94,${shade(z.conversion).toFixed(2)})" stroke="rgba(246,241,231,.15)"/>
      <text x="${x + colW / 2}" y="${y + rowH / 2 + 4}" class="so-zpct">${pct(z.conversion)}%</text>`;
  }).join('');
  const markers = data.steps.map(st => `<circle cx="${st.cx.toFixed(1)}" cy="${st.cy.toFixed(1)}" r="${st.index === cur ? 8 : 5}" data-i="${st.index}" class="so-kick ${st.scored ? 'scored' : 'miss'} ${st.index === cur ? 'cur' : ''}" onclick="window.__soGo(${data.num},${st.index})"><title>${esc(st.team)} — ${esc(st.taker)} (${st.scored ? 'scored' : 'missed'})</title></circle>`).join('');
  return `<svg viewBox="0 0 300 150" class="so-net" role="img" aria-label="Goal net shaded by historical penalty scoring probability with shootout kicks plotted">
    <rect x="${X0}" y="${Y0}" width="${W}" height="${H}" fill="rgba(255,255,255,.03)"/>
    ${zoneSvg}
    <g stroke="rgba(246,241,231,.10)">${[1, 2].map(i => `<line x1="${X0 + i * colW}" y1="${Y0}" x2="${X0 + i * colW}" y2="${Y0 + H}"/>`).join('')}<line x1="${X0}" y1="${Y0 + rowH}" x2="${X0 + W}" y2="${Y0 + rowH}"/></g>
    <g stroke="var(--gold)" stroke-width="3.5" fill="none"><line x1="${X0}" y1="${Y0}" x2="${X0}" y2="${Y0 + H}"/><line x1="${X0 + W}" y1="${Y0}" x2="${X0 + W}" y2="${Y0 + H}"/><line x1="${X0}" y1="${Y0}" x2="${X0 + W}" y2="${Y0}"/></g>
    <line x1="14" y1="${Y0 + H}" x2="286" y2="${Y0 + H}" stroke="rgba(246,241,231,.25)" stroke-width="2"/>
    ${markers}
  </svg>`;
}

// the per-kick stage (description + win-probability bars) for carousel index `cur`
function stageHtml(data, cur) {
  const st = data.steps[cur];
  const teamName = st.side === 'home' ? data.home.team : data.away.team;
  const zoneTxt = st.zone ? `aimed ${st.zone.label.toLowerCase()} · ${pct(st.zone.conversion)}% zone` : '';
  const bar = (name, p, side) => `<div class="so-wp-row">
    <span class="so-wp-name">${esc(name)}</span>
    <span class="so-wp-track"><span class="so-wp-fill ${side}" style="width:${pct(p)}%"></span></span>
    <span class="so-wp-pct">${pct(p)}%</span></div>`;
  return `<div class="so-kickline">
      <span class="so-kn">Kick ${cur + 1}/${data.steps.length}</span>
      <span class="so-${st.scored ? 'scored' : 'miss'}">${st.scored ? '● scored' : '○ missed'}</span>
      <b>${esc(teamName)}</b> · ${esc(st.taker)} <span class="so-zhint">${esc(zoneTxt)}</span>
      <span class="so-tally">${st.homeGoals}–${st.awayGoals}</span>
    </div>
    <div class="so-wp">
      <div class="so-wp-cap">Win probability after this kick</div>
      ${bar(data.home.team, st.pHome, 'home')}
      ${bar(data.away.team, st.pAway, 'away')}
    </div>`;
}

function carouselHtml(data) {
  const cur = soIndex.has(data.num) ? soIndex.get(data.num) : data.steps.length - 1;
  const dots = data.steps.map(st => `<button class="so-dot ${st.scored ? 'scored' : 'miss'} ${st.index === cur ? 'on' : ''}" data-i="${st.index}" aria-label="Kick ${st.index + 1}" onclick="window.__soGo(${data.num},${st.index})"></button>`).join('');
  return `<div class="so-net-wrap">${netSvg(data, cur)}</div>
    <div class="so-stage" id="so-stage-${data.num}">${stageHtml(data, cur)}</div>
    <div class="so-nav">
      <button class="so-arrow" aria-label="Previous kick" onclick="window.__soStep(${data.num},-1)">‹</button>
      <div class="so-dots">${dots}</div>
      <button class="so-arrow" aria-label="Next kick" onclick="window.__soStep(${data.num},1)">›</button>
    </div>`;
}

function shootoutHtml(d, num) {
  const data = buildShootout(d, num);
  if (!data) return '';
  data.num = num;
  soData.set(num, data);
  if (soIndex.has(num)) soIndex.set(num, Math.min(soIndex.get(num), data.steps.length - 1));
  const m = (window.__matchByNum && window.__matchByNum[num]) || {};
  const ph = data.home.kicks.filter(k => k.scored).length, pa = data.away.kicks.filter(k => k.scored).length;
  const winner = ph > pa ? data.home : data.away;
  const sc = d.score && (d.score.et || d.score.ft);
  const ftLine = sc ? `${esc(m.team1 || data.home.team)} ${sc[0]}–${sc[1]} ${esc(m.team2 || data.away.team)}${d.score.et ? ' <span class="aet">(a.e.t.)</span>' : ''} — ` : '';
  return `<div class="detail-section shootout" id="so-${num}">
    <div class="label">Penalty shootout</div>
    <div class="so-result">${ftLine}<b>${esc(winner.team)}</b> win ${Math.max(ph, pa)}–${Math.min(ph, pa)} on penalties</div>
    ${carouselHtml(data)}
    <div class="so-cap">Click the dots, arrows, or a kick to step through. Net shaded by historical scoring probability per zone; win probability is a shootout model (≈${pct(data.steps[0] ? 0.74 : 0)}% per-kick conversion). Outcomes &amp; takers are real (ESPN); marker positions are illustrative.</div>
  </div>`;
}

// carousel navigation (re-renders only the stage + marker/dot highlight, no refetch)
function soRender(num) {
  const data = soData.get(num);
  if (!data) return;
  const cur = Math.max(0, Math.min(data.steps.length - 1, soIndex.has(num) ? soIndex.get(num) : data.steps.length - 1));
  soIndex.set(num, cur);
  const stage = document.getElementById('so-stage-' + num);
  if (stage) stage.innerHTML = stageHtml(data, cur);
  const root = document.getElementById('so-' + num);
  if (!root) return;
  root.querySelectorAll('.so-kick').forEach(el => {
    const on = Number(el.dataset.i) === cur;
    el.classList.toggle('cur', on);
    el.setAttribute('r', on ? 8 : 5);
  });
  root.querySelectorAll('.so-dot').forEach(el => el.classList.toggle('on', Number(el.dataset.i) === cur));
}
window.__soGo = (num, i) => { soIndex.set(num, i); soRender(num); };
window.__soStep = (num, dir) => {
  const data = soData.get(num); if (!data) return;
  const cur = soIndex.has(num) ? soIndex.get(num) : data.steps.length - 1;
  soIndex.set(num, Math.max(0, Math.min(data.steps.length - 1, cur + dir)));
  soRender(num);
};

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
