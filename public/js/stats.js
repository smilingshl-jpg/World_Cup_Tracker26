import { state, teamMap } from './state.js';
import { esc, flagImg, svgBarChart } from './format.js';

function goldenBootRows(matches) {
  const tally = new Map();
  for (const m of matches) {
    for (const [arr, team] of [[m.goals1, m.team1], [m.goals2, m.team2]]) {
      for (const g of arr || []) {
        const name = g.name || g.player;
        if (!name || g.owngoal) continue;
        const key = name + '|' + team;
        const e = tally.get(key) || { player: name, team, goals: 0, penalties: 0 };
        e.goals++; if (g.penalty) e.penalties++;
        tally.set(key, e);
      }
    }
  }
  return [...tally.values()].sort((a, b) => b.goals - a.goals || a.penalties - b.penalties || a.player.localeCompare(b.player));
}

export function renderStats() {
  const t = state.tournament, odds = state.odds, sim = state.sim;
  const finished = t.matches.filter(m => m.status === 'finished' && m.score && m.score.ft);
  const sig = JSON.stringify([finished.length, odds && odds.fetchedAt, sim && sim.generatedAt]);
  const tm = teamMap();
  const kitOf = (team) => ((tm[team] && tm[team].colors) || ['#2d3742'])[0];

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

  // golden boot
  const boot = goldenBootRows(t.matches).slice(0, 15);
  const bootCard = `<div class="card"><h2>Golden Boot</h2>${
    boot.length ? `<table><thead><tr><th>#</th><th>Player</th><th>Team</th><th class="num">Goals</th><th class="num">Pens</th></tr></thead><tbody>${
      boot.map((e, i) => `<tr class="kit-row" style="--kit:${kitOf(e.team)};">
          <td>${i + 1}</td><td>${esc(e.player)}</td>
          <td>${flagImg((tm[e.team] || {}).flag, e.team)}${esc(e.team)}</td>
          <td class="num"><b>${e.goals}</b></td><td class="num">${e.penalties || ''}</td></tr>`).join('')
    }</tbody></table>` : '<p>No goals yet — check back after kickoff.</p>'}</div>`;

  // simulator
  let simCard = '';
  if (sim) {
    const top = sim.teams.slice(0, 15).map((s, i) => ({ label: s.team, value: s.champion, display: (s.champion * 100).toFixed(1) + '%', gold: i === 0 }));
    const pc = (x) => (x * 100).toFixed(1) + '%';
    simCard = `<div class="card"><h2>Road to the final <span class="chip">model · ${sim.iterations.toLocaleString()} sims</span></h2>
      ${svgBarChart(top, 'Championship probability (simulated)')}
      <table><thead><tr><th>Team</th><th class="num">R16</th><th class="num">QF</th><th class="num">SF</th><th class="num">Final</th><th class="num">🏆</th></tr></thead><tbody>${
        sim.teams.slice(0, 20).map(s => `<tr class="kit-row" style="--kit:${kitOf(s.team)};">
            <td>${flagImg((tm[s.team] || {}).flag, s.team)}${esc(s.team)}</td>
            <td class="num">${pc(s.r16)}</td><td class="num">${pc(s.qf)}</td><td class="num">${pc(s.sf)}</td>
            <td class="num">${pc(s.final)}</td><td class="num"><b>${pc(s.champion)}</b></td></tr>`).join('')
      }</tbody></table>
      <div class="scenario-note">Bradley–Terry model on de-vigged bookmaker outrights — not betting prices.</div></div>`;
  }

  // bookmaker odds
  let oddsCard = '';
  if (odds) {
    oddsCard = `<div class="card"><h2>Outright winner odds — all 48 <span class="chip">${odds.live ? 'live' : esc(odds.source)}</span></h2>
      <table><thead><tr><th>#</th><th>Team</th><th class="num">Decimal</th><th class="num">Implied</th></tr></thead><tbody>${
        odds.entries.map((e, i) => `<tr class="kit-row" style="--kit:${kitOf(e.team)};"><td>${i + 1}</td>
            <td>${flagImg((tm[e.team] || {}).flag, e.team)}${esc(e.team)}</td>
            <td class="num">${e.decimal.toFixed(2)}</td><td class="num">${(e.prob * 100).toFixed(2)}%</td></tr>`).join('')
      }</tbody></table></div>`;
  }

  // goals by round
  const byRound = new Map();
  for (const m of finished) byRound.set(m.round, (byRound.get(m.round) || 0) + m.score.ft[0] + m.score.ft[1]);
  const goalsChart = byRound.size
    ? `<div class="card"><h2>Goals by round</h2>${svgBarChart([...byRound.entries()].map(([label, value]) => ({ label, value, display: String(value) })), 'Goals by round')}</div>`
    : '';

  return { sig, html: strip + bootCard + simCard + goalsChart + oddsCard };
}
