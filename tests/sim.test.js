// tests/sim.test.js
'use strict';
const assert = require('assert');
const { simulate, mulberry32 } = require('../lib/sim');

// seeded rng determinism
const r1 = mulberry32(7), r2 = mulberry32(7);
assert.strictEqual(r1(), r2());

// tiny synthetic cup: one group of 4; 1A v 2A semi, winner to "final" vs itself ref (exercises W refs)
const groups = { 'Group A': ['Alpha', 'Beta', 'Gamma', 'Delta'] };
const matches = [
  { num: 1, group: 'Group A', round: 'Matchday 1', team1: 'Alpha', team2: 'Beta' },
  { num: 2, group: 'Group A', round: 'Matchday 1', team1: 'Gamma', team2: 'Delta' },
  { num: 3, group: 'Group A', round: 'Matchday 2', team1: 'Alpha', team2: 'Gamma' },
  { num: 4, group: 'Group A', round: 'Matchday 2', team1: 'Beta', team2: 'Delta' },
  { num: 5, group: 'Group A', round: 'Matchday 3', team1: 'Alpha', team2: 'Delta' },
  { num: 6, group: 'Group A', round: 'Matchday 3', team1: 'Beta', team2: 'Gamma' },
  { num: 7, round: 'Semi-final', team1: '1A', team2: '2A' },
  { num: 8, round: 'Final', team1: 'W7', team2: 'W7' }
];
const odds = [
  { team: 'Alpha', prob: 0.70 }, { team: 'Beta', prob: 0.15 },
  { team: 'Gamma', prob: 0.10 }, { team: 'Delta', prob: 0.05 }
];
const out = simulate({ matches, groups, oddsEntries: odds, iterations: 2000, seed: 42 });
assert.strictEqual(out.iterations, 2000);
const A = out.teams['Alpha'], D = out.teams['Delta'] || { champion: 0 };
assert.ok(A.champion > D.champion, 'stronger team wins more');
for (const t of Object.values(out.teams)) {
  assert.ok(t.champion >= 0 && t.champion <= 1);
}
const champSum = Object.values(out.teams).reduce((s, t) => s + t.champion, 0);
assert.ok(Math.abs(champSum - 1) < 1e-9, 'champion probs sum to 1');
// determinism
const out2 = simulate({ matches, groups, oddsEntries: odds, iterations: 2000, seed: 42 });
assert.strictEqual(out2.teams['Alpha'].champion, A.champion);

console.log('sim.test.js OK');
