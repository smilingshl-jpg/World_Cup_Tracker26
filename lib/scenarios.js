// lib/scenarios.js
'use strict';
const { computeStandings } = require('./standings');

const OUTCOMES = [[1, 0], [1, 1], [0, 1]]; // synthetic win/draw/loss scores

// One group: enumerate remaining-match outcomes (active only when <=1 left per team
// and the group is unfinished). Cross-group third-place math is NOT enumerated.
function groupScenarios(groupName, teamNames, standing, matches, thirdPlace) {
  const groupMatches = matches.filter(m => m.group === groupName);
  const remaining = groupMatches.filter(m => !(m.score && m.score.ft));
  if (standing.complete || remaining.length === 0) return { active: false, teams: {} };

  const remainingPerTeam = new Map(teamNames.map(t => [t, 0]));
  for (const m of remaining) {
    for (const t of [m.team1, m.team2]) {
      if (remainingPerTeam.has(t)) remainingPerTeam.set(t, remainingPerTeam.get(t) + 1);
    }
  }
  if ([...remainingPerTeam.values()].some(n => n > 1)) return { active: false, teams: {} };

  // enumerate 3^remaining combos (<=9)
  const positions = new Map(teamNames.map(t => [t, new Set()]));
  const winsThrough = new Map(teamNames.map(t => [t, true])); // "if I win my match, am I always top-2?"
  const played = groupMatches.filter(m => m.score && m.score.ft);
  const combos = Math.pow(3, remaining.length);
  for (let c = 0; c < combos; c++) {
    let x = c;
    const synth = remaining.map(m => {
      const o = OUTCOMES[x % 3]; x = Math.floor(x / 3);
      return { ...m, score: { ft: o } };
    });
    const table = computeStandings({ [groupName]: teamNames }, [...played, ...synth])[groupName].table;
    table.forEach((row, i) => positions.get(row.team).add(i + 1));
    for (const t of teamNames) {
      const myMatch = synth.find(m => m.team1 === t || m.team2 === t);
      if (!myMatch) continue;
      const ft = myMatch.score.ft;
      const won = (myMatch.team1 === t && ft[0] > ft[1]) || (myMatch.team2 === t && ft[1] > ft[0]);
      if (won) {
        const pos = table.findIndex(r => r.team === t) + 1;
        if (pos > 2) winsThrough.set(t, false);
      }
    }
  }

  const cutoff = thirdPlace.length >= 8 ? thirdPlace[7] : null;
  const teams = {};
  for (const t of teamNames) {
    const pos = positions.get(t);
    const canTop2 = pos.has(1) || pos.has(2);
    const alwaysTop2 = ![...pos].some(p => p > 2);
    const canThird = pos.has(3);
    let status, note;
    if (alwaysTop2) { status = 'THROUGH'; note = 'Qualified for the knockouts'; }
    else if (canTop2) {
      status = 'ALIVE';
      note = winsThrough.get(t) && remainingPerTeam.get(t) === 1 ? 'Wins and is through' : 'Needs a win and help';
    } else if (canThird) {
      status = '3RD-RACE';
      note = cutoff ? `Best finish 3rd — current cut: ${cutoff.points} pts (depends on other groups)` : 'Best finish 3rd (depends on other groups)';
    } else { status = 'OUT'; note = 'Cannot finish above 4th'; }
    teams[t] = { status, note };
  }
  return { active: true, teams };
}

function allScenarios(groups, standings, matches, thirdPlace) {
  const out = {};
  for (const [g, teamNames] of Object.entries(groups)) {
    out[g] = groupScenarios(g, teamNames, standings[g], matches, thirdPlace);
  }
  return out;
}

module.exports = { allScenarios, groupScenarios };
