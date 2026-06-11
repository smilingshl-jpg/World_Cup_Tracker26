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
function renderSchedule() { return { sig: 'stub', html: '<p>coming in task 11</p>' }; }
function renderBracket() { return { sig: 'stub', html: '<p>coming in task 11</p>' }; }
function renderTeams() { return { sig: 'stub', html: '<p>coming in task 12</p>' }; }
function renderStats() { return { sig: 'stub', html: '<p>coming in task 12</p>' }; }
function wireScheduleFilters() {}

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
