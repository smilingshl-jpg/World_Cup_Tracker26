import { state, colorsOf } from './state.js';
import { $, esc, localTime, vsRow, relTime } from './format.js';
import { followed, isFollowed } from './follow.js';

export function renderToday() {
  const t = state.tournament;
  const now = Date.now();
  const today = new Date().toDateString();
  const todays = t.matches.filter(m => m.kickoff && new Date(m.kickoff).toDateString() === today);
  const next = t.matches
    .filter(m => m.status === 'upcoming' && m.kickoff && Date.parse(m.kickoff) > now)
    .sort((a, b) => Date.parse(a.kickoff) - Date.parse(b.kickoff))[0];

  const follows = followed();
  const myMatches = follows.length
    ? t.matches
        .filter(m => (isFollowed(m.team1) || isFollowed(m.team2)) && (m.status === 'live' || (m.kickoff && Date.parse(m.kickoff) > now)))
        .sort((a, b) => Date.parse(a.kickoff || 0) - Date.parse(b.kickoff || 0))
        .slice(0, 3)
    : [];

  const sig = JSON.stringify([todays, next && next.num, myMatches.map(m => [m.num, m.status, m.live]), follows]);
  let html = '';
  if (myMatches.length) {
    html += `<div class="card my-teams"><h2>⭐ Your teams</h2>${myMatches.map(m => vsRow(m, colorsOf)).join('')}</div>`;
  }
  if (next) {
    html += `<div class="card">
      <h3>Next kickoff — ${esc(next.team1)} vs ${esc(next.team2)}, ${esc(localTime(next.kickoff))}</h3>
      <div class="countdown" id="countdown" data-kickoff="${esc(next.kickoff)}">--:--:--</div>
    </div>`;
  }
  html += `<div class="card"><h2>Today's matches</h2>${
    todays.length ? todays.map(m => vsRow(m, colorsOf)).join('') : '<p>No matches today.</p>'
  }</div>`;
  return { sig, html };
}

export function tickCountdown() {
  // keep all "in Xh Ym" kickoff chips current without re-rendering views
  document.querySelectorAll('.chip.rel[data-kick]').forEach(c => {
    const txt = relTime(c.dataset.kick);
    if (c.textContent !== txt) c.textContent = txt;
  });
  const el = $('#countdown');
  if (!el) return;
  const diff = Date.parse(el.dataset.kickoff) - Date.now();
  if (diff <= 0) { el.textContent = 'KICKOFF!'; return; }
  const h = Math.floor(diff / 3600000), m = Math.floor(diff / 60000) % 60, s = Math.floor(diff / 1000) % 60;
  el.textContent = (h > 23 ? Math.floor(h / 24) + 'd ' : '') +
    String(h % 24).padStart(2, '0') + ':' + String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
}
