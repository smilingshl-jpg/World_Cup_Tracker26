// lib/scorers.js
'use strict';

// openfootball goal item: { name|player, minute?, offset?, penalty?, owngoal? }
// Parser is deliberately tolerant: exact 2026 field names unverified until first results land.
function normGoal(g) {
  if (!g || typeof g !== 'object') return null;
  const name = g.name || g.player;
  if (!name) return null;
  return {
    name: String(name),
    minute: Number.isFinite(g.minute) ? g.minute : null,
    penalty: !!g.penalty,
    owngoal: !!g.owngoal
  };
}

function matchScorers(m) {
  const parse = (arr) => (Array.isArray(arr) ? arr.map(normGoal).filter(Boolean) : []);
  return { team1: parse(m.goals1), team2: parse(m.goals2) };
}

// Leaderboard across all matches. Own goals never count for the scorer.
function goldenBoot(matches) {
  const tally = new Map(); // "player|team" -> entry
  for (const m of matches) {
    const { team1, team2 } = matchScorers(m);
    for (const [goals, team] of [[team1, m.team1], [team2, m.team2]]) {
      for (const g of goals) {
        if (g.owngoal) continue;
        const key = g.name + '|' + team;
        const e = tally.get(key) || { player: g.name, team, goals: 0, penalties: 0 };
        e.goals++;
        if (g.penalty) e.penalties++;
        tally.set(key, e);
      }
    }
  }
  return [...tally.values()].sort((a, b) => b.goals - a.goals || a.penalties - b.penalties || a.player.localeCompare(b.player));
}

module.exports = { goldenBoot, matchScorers };
