import { state, sigs } from './state.js';
import { $ } from './format.js';
import { renderToday, tickCountdown } from './today.js';
import { refreshTicker } from './ticker.js';

// stubs replaced by UH-8..UH-12:
const renderGroups = () => ({ sig: 'stub', html: '<p>coming soon</p>' });
const renderTeams = () => ({ sig: 'stub', html: '<p>coming soon</p>' });
const renderSchedule = () => ({ sig: 'stub', html: '<p>coming soon</p>' });
const renderVenues = () => ({ sig: 'stub', html: '<p>coming soon</p>' });
const renderBracket = () => ({ sig: 'stub', html: '<p>coming soon</p>' });
const renderStats = () => ({ sig: 'stub', html: '<p>coming soon</p>' });
const wireView = () => {};

const RENDERERS = { today: renderToday, groups: renderGroups, schedule: renderSchedule, bracket: renderBracket, teams: renderTeams, stats: renderStats, venues: renderVenues };

export function renderAll() {
  if (!state.tournament) return;
  for (const [view, fn] of Object.entries(RENDERERS)) {
    const el = $('#view-' + view);
    const { sig, html } = fn();
    if (sigs[view] !== sig) {
      el.innerHTML = html;
      sigs[view] = sig;
      wireView(view, el);
    }
  }
  $('#data-status').textContent = 'UPDATED ' + new Date().toLocaleTimeString();
  if (state.odds) $('#odds-source').textContent = state.odds.live ? 'live (The Odds API)' : state.odds.source;
}

export async function refresh() {
  try {
    const tour = await fetch('/api/tournament').then(r => r.json());
    if (!state.odds || Date.now() - state.oddsAt > 30 * 60 * 1000) {
      state.odds = await fetch('/api/odds').then(r => r.json());
      state.oddsAt = Date.now();
    }
    if (!state.sim || Date.now() - state.simAt > 30 * 60 * 1000) {
      state.sim = await fetch('/api/simulation').then(r => r.json());
      state.simAt = Date.now();
    }
    state.tournament = tour;
    renderAll();
  } catch {
    $('#data-status').textContent = 'REFRESH FAILED — RETRYING';
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
refreshTicker();
setInterval(refresh, 60 * 1000);
setInterval(refreshTicker, 15 * 60 * 1000);
setInterval(tickCountdown, 1000);
