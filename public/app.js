'use strict';

const state = { tournament: null, odds: null, view: 'today' };
const sigs = {}; // per-view render signatures: re-render only on change

const $ = (sel) => document.querySelector(sel);
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const flagImg = (flag, name) => flag
  ? `<img class="flag" src="https://flagcdn.com/h24/${flag}.png" alt="" title="${esc(name)}">`
  : '';

function localTime(iso) {
  if (!iso) return 'TBD';
  return new Date(iso).toLocaleString(undefined, {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
  });
}
function localDay(iso) {
  if (!iso) return 'Date TBD';
  return new Date(iso).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
}
function scoreText(m) {
  if (!m.score) return 'vs';
  const s = m.score.ft || m.score.et || m.score.p;
  if (!s) return 'vs';
  let txt = `${s[0]} – ${s[1]}`;
  if (m.score.p) txt += ` (${m.score.p[0]}–${m.score.p[1]} pens)`;
  else if (m.score.et) txt = `${m.score.et[0]} – ${m.score.et[1]} (aet)`;
  return txt;
}
function statusChip(m) {
  if (m.status === 'live') return '<span class="chip live">LIVE</span>';
  if (m.status === 'finished') return '<span class="chip">FT</span>';
  return '';
}
function matchRowHtml(m) {
  return `<div class="match-row">
    <span class="match-meta">${esc(localTime(m.kickoff))}<br>${esc(m.ground || '')}</span>
    <span class="match-team right">${esc(m.team1)} ${flagImg(m.flag1, m.team1)}</span>
    <span class="match-score">${esc(scoreText(m))}</span>
    <span class="match-team">${flagImg(m.flag2, m.team2)} ${esc(m.team2)}</span>
    <span class="chip">${esc(m.group || m.round || '')}</span>
    ${statusChip(m)}
  </div>`;
}

// ---- view stubs (replaced in tasks 10-12) ----
function renderGroups() {
  const t = state.tournament;
  const sig = JSON.stringify([t.standings, t.thirdPlace]);
  const flagOf = Object.fromEntries(t.teams.map(x => [x.name, x.flag]));

  const groupCards = Object.keys(t.standings).sort().map(g => {
    const { table, complete } = t.standings[g];
    return `<div class="card">
      <h2>${esc(g)} ${complete ? '<span class="chip">complete</span>' : ''}</h2>
      <table><thead><tr>
        <th>Team</th><th class="num">P</th><th class="num">W</th><th class="num">D</th>
        <th class="num">L</th><th class="num">GF</th><th class="num">GA</th><th class="num">GD</th><th class="num">Pts</th>
      </tr></thead><tbody>${
        table.map((r, i) => `<tr class="${complete && i < 2 ? 'qualified' : ''}">
          <td>${flagImg(flagOf[r.team], r.team)}${esc(r.team)}</td>
          <td class="num">${r.played}</td><td class="num">${r.won}</td><td class="num">${r.drawn}</td>
          <td class="num">${r.lost}</td><td class="num">${r.gf}</td><td class="num">${r.ga}</td>
          <td class="num">${r.gd > 0 ? '+' : ''}${r.gd}</td><td class="num"><b>${r.points}</b></td>
        </tr>`).join('')
      }</tbody></table>
    </div>`;
  }).join('');

  const thirds = `<div class="card">
    <h2>Third-place race <span class="chip">best 8 of 12 advance</span></h2>
    <table><thead><tr>
      <th>#</th><th>Team</th><th>Group</th><th class="num">Pts</th><th class="num">GD</th><th class="num">GF</th>
    </tr></thead><tbody>${
      t.thirdPlace.map((r, i) => `<tr class="${r.qualified ? 'qualified' : 'eliminated'}">
        <td>${i + 1}</td>
        <td>${flagImg(flagOf[r.team], r.team)}${esc(r.team)}</td>
        <td>${esc(r.group.replace('Group ', ''))}</td>
        <td class="num"><b>${r.points}</b></td>
        <td class="num">${r.gd > 0 ? '+' : ''}${r.gd}</td><td class="num">${r.gf}</td>
      </tr>`).join('')
    }</tbody></table>
  </div>`;

  return { sig, html: `<div class="group-grid">${groupCards}</div>${thirds}` };
}
const scheduleFilter = { text: '', stage: 'all' };

function renderSchedule() {
  const t = state.tournament;
  const txt = scheduleFilter.text.toLowerCase();
  const matches = t.matches.filter(m => {
    if (scheduleFilter.stage === 'group' && !m.group) return false;
    if (scheduleFilter.stage === 'knockout' && m.group) return false;
    if (txt && !(`${m.team1} ${m.team2} ${m.ground || ''} ${m.group || ''} ${m.round || ''}`.toLowerCase().includes(txt))) return false;
    return true;
  });
  const sig = JSON.stringify([matches, scheduleFilter]);

  const byDay = new Map();
  for (const m of matches) {
    const day = localDay(m.kickoff);
    if (!byDay.has(day)) byDay.set(day, []);
    byDay.get(day).push(m);
  }
  const days = [...byDay.entries()].map(([day, list]) =>
    `<div class="day-header">${esc(day)}</div><div class="card">${list.map(matchRowHtml).join('')}</div>`
  ).join('');

  const html = `<div class="filters">
      <input id="sched-text" type="search" placeholder="Filter by team, venue, group…" value="${esc(scheduleFilter.text)}">
      <select id="sched-stage">
        <option value="all" ${scheduleFilter.stage === 'all' ? 'selected' : ''}>All stages</option>
        <option value="group" ${scheduleFilter.stage === 'group' ? 'selected' : ''}>Group stage</option>
        <option value="knockout" ${scheduleFilter.stage === 'knockout' ? 'selected' : ''}>Knockouts</option>
      </select>
    </div>${days || '<div class="card"><p>No matches match the filter.</p></div>'}`;
  return { sig, html };
}

// upstream uses singular round names ("Quarter-final"); accept both spellings
const ROUND_ORDER = [
  'Round of 32', 'Round of 16',
  'Quarter-final', 'Quarter-finals',
  'Semi-final', 'Semi-finals',
  'Match for third place', 'Third place', 'Final'
];

function renderBracket() {
  const t = state.tournament;
  const sig = JSON.stringify(t.bracket);
  if (!t.bracket.length) {
    return { sig, html: '<div class="card"><p>Knockout fixtures appear here once the data source publishes them.</p></div>' };
  }
  // group by round; order known rounds first, then any others in appearance order
  const rounds = new Map();
  for (const m of t.bracket) {
    if (!rounds.has(m.round)) rounds.set(m.round, []);
    rounds.get(m.round).push(m);
  }
  const ordered = [...rounds.keys()].sort((a, b) => {
    const ia = ROUND_ORDER.indexOf(a), ib = ROUND_ORDER.indexOf(b);
    return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
  });

  const winnerName = (m) => {
    if (!m.score) return null;
    const s = m.score.p || m.score.et || m.score.ft;
    return s && s[0] !== s[1] ? (s[0] > s[1] ? m.team1 : m.team2) : null;
  };

  const cols = ordered.map(round => `<div class="bracket-round">
    <h3>${esc(round)}</h3>${
    rounds.get(round).map(m => {
      const w = winnerName(m);
      const slot = (team, flag, resolved) =>
        `<div class="slot ${resolved ? '' : 'placeholder'} ${w === team ? 'winner' : ''}">
          <span>${flagImg(flag, team)}${esc(team)}</span><span>${esc(slotScore(m, team))}</span>
        </div>`;
      return `<div class="bracket-match">
        ${slot(m.team1, m.flag1, m.resolved1)}
        ${slot(m.team2, m.flag2, m.resolved2)}
        <div class="meta">${esc(localTime(m.kickoff))} · ${esc(m.ground || '')}</div>
      </div>`;
    }).join('')
  }</div>`).join('');

  return { sig, html: `<div class="bracket">${cols}</div>` };
}

function slotScore(m, team) {
  if (!m.score) return '';
  const s = m.score.p || m.score.et || m.score.ft;
  if (!s) return '';
  return team === m.team1 ? s[0] : s[1];
}
function renderTeams() {
  const t = state.tournament;
  const odds = state.odds;
  const sig = JSON.stringify([t.teams, t.matches.length, odds && odds.fetchedAt, odds && odds.entries.length]);
  const oddsByTeam = odds ? Object.fromEntries(odds.entries.map((e, i) => [e.team, { ...e, rank: i + 1 }])) : {};

  const cards = [...t.teams]
    .sort((a, b) => (oddsByTeam[a.name]?.rank ?? 99) - (oddsByTeam[b.name]?.rank ?? 99))
    .map(team => {
      const o = oddsByTeam[team.name];
      const fixtures = t.matches
        .filter(m => m.group && (m.team1 === team.name || m.team2 === team.name))
        .map(m => `${esc(localTime(m.kickoff))} — ${esc(m.team1)} ${esc(scoreText(m))} ${esc(m.team2)}`)
        .join('<br>');
      return `<div class="card team-card">
        <h2>${flagImg(team.flag, team.name)}${esc(team.name)} <span class="chip">${esc(team.group || 'TBD')}</span></h2>
        <div class="odds-line">${o
          ? `#${o.rank} favourite · ${(o.prob * 100).toFixed(1)}% win probability · ${o.decimal.toFixed(o.decimal < 20 ? 2 : 0)} decimal odds`
          : 'odds unavailable'}</div>
        <div class="fixtures">${fixtures || 'Fixtures TBD'}</div>
      </div>`;
    }).join('');

  return { sig, html: `<div class="team-grid">${cards}</div>` };
}

function svgBarChart(rows, { valueLabel }) {
  // rows: [{ label, value, display, gold? }]
  const W = 720, rowH = 26, pad = 4;
  const H = rows.length * rowH + pad * 2;
  const max = Math.max(...rows.map(r => r.value), 1e-9);
  const labelW = 170, valW = 70, barMax = W - labelW - valW - 20;
  const bars = rows.map((r, i) => {
    const y = pad + i * rowH;
    const w = Math.max(2, (r.value / max) * barMax);
    return `<text x="${labelW - 6}" y="${y + 17}" text-anchor="end">${esc(r.label)}</text>
      <rect class="bar ${r.gold ? 'gold' : ''}" x="${labelW}" y="${y + 4}" width="${w}" height="${rowH - 9}" rx="3"></rect>
      <text class="val" x="${labelW + w + 8}" y="${y + 17}">${esc(r.display)}</text>`;
  }).join('');
  return `<svg class="bar-chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(valueLabel)}">${bars}</svg>`;
}

function renderStats() {
  const t = state.tournament;
  const odds = state.odds;
  const finished = t.matches.filter(m => m.status === 'finished' && m.score && m.score.ft);
  const sig = JSON.stringify([finished.length, odds && odds.fetchedAt, odds && odds.entries.slice(0, 3)]);

  // tournament totals
  let goals = 0, biggest = null;
  for (const m of finished) {
    const [a, b] = m.score.ft;
    goals += a + b;
    const margin = Math.abs(a - b);
    if (!biggest || margin > biggest.margin) biggest = { margin, text: `${m.team1} ${a}–${b} ${m.team2}` };
  }
  const strip = `<div class="stat-strip">
    <div class="stat"><div class="big">${finished.length}</div><div class="label">matches played</div></div>
    <div class="stat"><div class="big">${goals}</div><div class="label">goals</div></div>
    <div class="stat"><div class="big">${finished.length ? (goals / finished.length).toFixed(2) : '—'}</div><div class="label">goals / match</div></div>
    <div class="stat"><div class="big">${biggest ? esc(biggest.text) : '—'}</div><div class="label">biggest win</div></div>
  </div>`;

  // win probability chart (top 15)
  let probChart = '<div class="card"><p>Odds loading…</p></div>';
  if (odds) {
    const rows = odds.entries.slice(0, 15).map((e, i) => ({
      label: e.team, value: e.prob, display: (e.prob * 100).toFixed(1) + '%', gold: i === 0
    }));
    probChart = `<div class="card">
      <h2>Win probability <span class="chip">${odds.live ? 'live bookmaker average' : 'snapshot: ' + esc(odds.source)}</span></h2>
      ${svgBarChart(rows, { valueLabel: 'Win probability' })}
    </div>`;
  }

  // goals by round
  const byRound = new Map();
  for (const m of finished) {
    byRound.set(m.round, (byRound.get(m.round) || 0) + m.score.ft[0] + m.score.ft[1]);
  }
  const goalsChart = byRound.size
    ? `<div class="card"><h2>Goals by round</h2>${svgBarChart(
        [...byRound.entries()].map(([label, value]) => ({ label, value, display: String(value) })),
        { valueLabel: 'Goals by round' }
      )}</div>`
    : '';

  // full odds table
  let oddsTable = '';
  if (odds) {
    const flagOf = Object.fromEntries(t.teams.map(x => [x.name, x.flag]));
    oddsTable = `<div class="card"><h2>Outright winner odds — all 48 teams</h2>
      <table><thead><tr><th>#</th><th>Team</th><th class="num">Decimal odds</th><th class="num">Implied prob.</th></tr></thead>
      <tbody>${odds.entries.map((e, i) =>
        `<tr><td>${i + 1}</td><td>${flagImg(flagOf[e.team], e.team)}${esc(e.team)}</td>
         <td class="num">${e.decimal.toFixed(2)}</td><td class="num">${(e.prob * 100).toFixed(2)}%</td></tr>`
      ).join('')}</tbody></table></div>`;
  }

  return { sig, html: strip + probChart + goalsChart + oddsTable };
}
function wireScheduleFilters() {
  const txt = $('#sched-text');
  const stage = $('#sched-stage');
  if (!txt) return;
  txt.addEventListener('input', () => { scheduleFilter.text = txt.value; sigs.schedule = null; renderAll(); requestAnimationFrame(() => { const e = $('#sched-text'); e.focus(); e.setSelectionRange(e.value.length, e.value.length); }); });
  stage.addEventListener('change', () => { scheduleFilter.stage = stage.value; sigs.schedule = null; renderAll(); });
}

// ---- rendering with signature guards (uno lesson: per-poll innerHTML + CSS animation = flicker) ----
const RENDERERS = {
  today: renderToday,
  groups: renderGroups,
  schedule: renderSchedule,
  bracket: renderBracket,
  teams: renderTeams,
  stats: renderStats
};

function renderAll() {
  if (!state.tournament) return;
  for (const [view, fn] of Object.entries(RENDERERS)) {
    const el = $('#view-' + view);
    const { sig, html } = fn();
    if (sigs[view] !== sig) {
      el.innerHTML = html;
      sigs[view] = sig;
      if (view === 'schedule') wireScheduleFilters();
    }
  }
  $('#data-status').textContent = 'updated ' + new Date().toLocaleTimeString();
  if (state.odds) $('#odds-source').textContent = state.odds.live ? 'live (The Odds API)' : state.odds.source;
}

// ---- Today view ----
function renderToday() {
  const t = state.tournament;
  const now = Date.now();
  const today = new Date().toDateString();
  const todays = t.matches.filter(m => m.kickoff && new Date(m.kickoff).toDateString() === today);
  const next = t.matches
    .filter(m => m.status === 'upcoming' && m.kickoff && Date.parse(m.kickoff) > now)
    .sort((a, b) => Date.parse(a.kickoff) - Date.parse(b.kickoff))[0];

  const sig = JSON.stringify([todays, next && next.num]); // countdown digits update separately
  let html = '';
  if (next) {
    html += `<div class="card">
      <h3>Next kickoff — ${esc(next.team1)} vs ${esc(next.team2)}, ${esc(localTime(next.kickoff))}</h3>
      <div class="countdown" id="countdown" data-kickoff="${esc(next.kickoff)}">--:--:--</div>
    </div>`;
  }
  html += `<div class="card"><h2>Today's matches</h2>${
    todays.length ? todays.map(matchRowHtml).join('') : '<p>No matches today.</p>'
  }</div>`;
  return { sig, html };
}

function tickCountdown() {
  const el = $('#countdown');
  if (!el) return;
  const diff = Date.parse(el.dataset.kickoff) - Date.now();
  if (diff <= 0) { el.textContent = 'KICKOFF!'; return; }
  const h = Math.floor(diff / 3600000);
  const m = Math.floor(diff / 60000) % 60;
  const s = Math.floor(diff / 1000) % 60;
  el.textContent = (h > 23 ? Math.floor(h / 24) + 'd ' : '') +
    String(h % 24).padStart(2, '0') + ':' + String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
}

// ---- data + boot ----
async function refresh() {
  try {
    const [tour, odds] = await Promise.all([
      fetch('/api/tournament').then(r => r.json()),
      state.odds && Date.now() - state.oddsAt < 30 * 60 * 1000
        ? Promise.resolve(state.odds)
        : fetch('/api/odds').then(r => r.json()).then(o => { state.oddsAt = Date.now(); return o; })
    ]);
    state.tournament = tour;
    state.odds = odds;
    renderAll();
  } catch (err) {
    $('#data-status').textContent = 'refresh failed — retrying';
  }
}

document.querySelectorAll('.tab').forEach(btn => {
  btn.addEventListener('click', () => {
    state.view = btn.dataset.view;
    document.querySelectorAll('.tab').forEach(b => b.classList.toggle('active', b === btn));
    document.querySelectorAll('.view').forEach(v => v.classList.toggle('active', v.id === 'view-' + state.view));
  });
});

refresh();
setInterval(refresh, 60 * 1000);
setInterval(tickCountdown, 1000);
