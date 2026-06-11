import { state, sigs, teamMap } from './state.js';
import { esc, flagImg, localTime } from './format.js';
import { buildWings } from './bracket-tree.js';
import { effectiveTeams, applyPick, scorePicks, realWinner } from './picks-core.js';
import { renderAll } from './main.js';

const LS_KEY = 'wc26-picks-v1';
export const bracketUI = { mode: 'real' }; // 'real' | 'picks'

function loadPicks() { try { return JSON.parse(localStorage.getItem(LS_KEY)) || {}; } catch { return {}; } }
function savePicks(p) { localStorage.setItem(LS_KEY, JSON.stringify(p)); }

function slotScore(m, team) {
  if (!m.score) return '';
  const s = m.score.p || m.score.et || m.score.ft;
  if (!s) return '';
  return team === m.team1 ? s[0] : team === m.team2 ? s[1] : '';
}

function matchCell(m, byNum, picks, mode, big = false) {
  const tm = teamMap();
  let t1 = m.team1, t2 = m.team2, r1 = m.resolved1, r2 = m.resolved2;
  if (mode === 'picks') {
    const [a, b] = effectiveTeams(m, picks, byNum);
    if (a) { t1 = a; r1 = true; }
    if (b) { t2 = b; r2 = true; }
  }
  const w = mode === 'picks' ? (realWinner(m) || picks[m.num]) : realWinner(m);
  const kitOf = (name) => (tm[name] && tm[name].colors ? tm[name].colors[0] : 'transparent');
  const canPick = (name, resolved) => mode === 'picks' && resolved && !!tm[name] && !realWinner(m);

  const slot = (team, resolved) => {
    const placeholder = !resolved || !tm[team];
    const pickable = canPick(team, resolved);
    const picked = mode === 'picks' && picks[m.num] === team;
    return `<div class="slot ${placeholder ? 'placeholder' : ''} ${w === team && resolved ? 'winner' : ''} ${pickable ? 'pickable' : ''} ${picked ? 'picked' : ''}"
      style="--kit:${kitOf(team)};" ${pickable ? `data-pick-match="${m.num}" data-pick-team="${esc(team)}"` : ''}>
      <span>${placeholder ? '' : flagImg(tm[team].flag, team)}${esc(team || '—')}</span>
      <span>${slotScore(m, team)}</span>
    </div>`;
  };

  return `<div class="bracket-match ${big ? 'final-match' : ''}">
    ${slot(t1, r1)}
    ${slot(t2, r2)}
    <div class="meta">${esc(localTime(m.kickoff))} · ${esc(m.ground || '')}</div>
  </div>`;
}

export function renderBracket() {
  const t = state.tournament;
  const picks = loadPicks();
  const sig = JSON.stringify([t.bracket, bracketUI.mode, picks, window.innerWidth >= 1100]);
  if (!t.bracket.length) return { sig, html: '<div class="card"><p>Knockout fixtures appear once published.</p></div>' };

  const byNum = new Map(t.bracket.map(m => [m.num, m]));
  const score = scorePicks(picks, t.bracket);
  const toolbar = `<div class="bracket-toolbar">
    <button class="mode-btn ${bracketUI.mode === 'real' ? 'active' : ''}" data-mode="real">Real</button>
    <button class="mode-btn ${bracketUI.mode === 'picks' ? 'active' : ''}" data-mode="picks">My Picks</button>
    ${Object.keys(picks).length ? `<span class="pick-score">Your bracket: ${score.points} pts · ${score.correct}/${score.graded} correct</span>` : ''}
    ${bracketUI.mode === 'picks' ? '<button class="mode-btn" data-mode="clear">Clear picks</button>' : ''}
    ${bracketUI.mode === 'picks' ? '<span class="scenario-note">Click a team to advance it. Unresolved slots unlock as the group stage finishes.</span>' : ''}
  </div>`;

  const wide = window.innerWidth >= 1100;
  const wings = wide ? buildWings(t.bracket) : null;
  let body;
  if (wings) {
    const names = ['Semi-final', 'Quarter-final', 'Round of 16', 'Round of 32'];
    const colHtml = (matches, label) => `<div class="round-col"><div class="label">${esc(label)}</div>${
      matches.map(m => matchCell(m, byNum, picks, bracketUI.mode)).join('')}</div>`;
    const L = wings.left, R = wings.right;
    const cols = [];
    for (let i = L.length - 1; i >= 0; i--) cols.push(colHtml(L[i], names[i] || L[i][0].round));
    cols.push(`<div class="round-col"><div class="label">🏆 Final</div>${matchCell(wings.final, byNum, picks, bracketUI.mode, true)}${
      wings.third ? `<div class="label">Third place</div>${matchCell(wings.third, byNum, picks, bracketUI.mode)}` : ''}</div>`);
    for (let i = 0; i < R.length; i++) cols.push(colHtml(R[i], names[i] || R[i][0].round));
    body = `<div class="bracket2" style="grid-template-columns:repeat(${cols.length}, minmax(150px, 1fr));">${cols.join('')}</div>`;
  } else {
    const ROUND_ORDER = ['Round of 32', 'Round of 16', 'Quarter-final', 'Quarter-finals', 'Semi-final', 'Semi-finals', 'Match for third place', 'Third place', 'Final'];
    const rounds = new Map();
    for (const m of t.bracket) { if (!rounds.has(m.round)) rounds.set(m.round, []); rounds.get(m.round).push(m); }
    const ordered = [...rounds.keys()].sort((a, b) => {
      const ia = ROUND_ORDER.indexOf(a), ib = ROUND_ORDER.indexOf(b);
      return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
    });
    body = `<div class="bracket-flat">${ordered.map(round =>
      `<div class="round-col"><div class="label">${esc(round)}</div>${
        rounds.get(round).map(m => matchCell(m, byNum, picks, bracketUI.mode)).join('')}</div>`).join('')}</div>`;
  }
  return { sig, html: toolbar + body };
}

export function wireBracket(el) {
  el.querySelectorAll('.mode-btn').forEach(b => b.addEventListener('click', () => {
    if (b.dataset.mode === 'clear') savePicks({});
    else bracketUI.mode = b.dataset.mode;
    sigs.bracket = null; renderAll();
  }));
  el.querySelectorAll('.slot.pickable').forEach(s => s.addEventListener('click', () => {
    const byNum = new Map(state.tournament.bracket.map(m => [m.num, m]));
    const next = applyPick(loadPicks(), byNum, +s.dataset.pickMatch, s.dataset.pickTeam);
    savePicks(next);
    sigs.bracket = null; renderAll();
  }));
}
