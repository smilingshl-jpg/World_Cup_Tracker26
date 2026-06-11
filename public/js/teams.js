import { state } from './state.js';
import { esc, flagImg, localTime, scoreText, kitStripe } from './format.js';

export function renderTeams() {
  const t = state.tournament;
  const odds = state.odds, sim = state.sim;
  const sig = JSON.stringify([t.teams.length, t.matches.length, odds && odds.fetchedAt, sim && sim.generatedAt]);
  const oddsByTeam = odds ? Object.fromEntries(odds.entries.map((e, i) => [e.team, { ...e, rank: i + 1 }])) : {};
  const simByTeam = sim ? Object.fromEntries(sim.teams.map(s => [s.team, s])) : {};

  const cards = [...t.teams]
    .sort((a, b) => (oddsByTeam[a.name]?.rank ?? 99) - (oddsByTeam[b.name]?.rank ?? 99))
    .map(team => {
      const o = oddsByTeam[team.name];
      const s = simByTeam[team.name];
      const h = team.history;
      const stars = h && h.titles ? `<span class="stars">${'★'.repeat(h.titles)}</span> ` : '';
      const histLine = h
        ? `<div class="hist-line">${stars}${h.titles ? `${h.titles}-time champions · ` : ''}${h.bestFinish === 'Debut' ? 'WORLD CUP DEBUT' : `Appearance #${h.appearances} · Best: ${esc(h.bestFinish)}`}</div>`
        : '';
      const simLine = s
        ? `<div class="sim-line">Model: R16 ${(s.r16 * 100).toFixed(0)}% · QF ${(s.qf * 100).toFixed(0)}% · SF ${(s.sf * 100).toFixed(0)}% · 🏆 ${(s.champion * 100).toFixed(1)}%</div>`
        : '';
      const fixtures = t.matches
        .filter(m => m.group && (m.team1 === team.name || m.team2 === team.name))
        .map(m => `${esc(localTime(m.kickoff))} — ${esc(m.team1)} ${esc(scoreText(m))} ${esc(m.team2)}`)
        .join('<br>');
      return `<div class="card team-card">
        <h2>${flagImg(team.flag, team.name)}${esc(team.name)} <span class="chip">${esc(team.group || 'TBD')}</span></h2>
        ${kitStripe(team.colors)}
        <div class="odds-line">${o ? `#${o.rank} favourite · ${(o.prob * 100).toFixed(1)}% (odds ${o.decimal.toFixed(o.decimal < 20 ? 2 : 0)})` : 'odds unavailable'}</div>
        ${simLine}${histLine}
        <div class="fixtures">${fixtures || 'Fixtures TBD'}</div>
      </div>`;
    }).join('');

  return { sig, html: `<div class="team-grid">${cards}</div>` };
}
