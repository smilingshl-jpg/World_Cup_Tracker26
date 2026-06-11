// tests/scenarios.test.js
'use strict';
const assert = require('assert');
const { computeStandings, thirdPlaceTable } = require('../lib/standings');
const { allScenarios } = require('../lib/scenarios');

// Group with one match left per team: W(6pts) X(3) Y(1) Z(1); remaining W-Y and X-Z.
const groups = { 'Group A': ['W', 'X', 'Y', 'Z'] };
const matches = [
  { group: 'Group A', team1: 'W', team2: 'X', score: { ft: [1, 0] } },
  { group: 'Group A', team1: 'Y', team2: 'Z', score: { ft: [1, 1] } },
  { group: 'Group A', team1: 'W', team2: 'Z', score: { ft: [2, 0] } },
  { group: 'Group A', team1: 'X', team2: 'Y', score: { ft: [3, 0] } },
  { group: 'Group A', team1: 'W', team2: 'Y' },  // unplayed
  { group: 'Group A', team1: 'X', team2: 'Z' }   // unplayed
];
const standings = computeStandings(groups, matches);
const thirds = thirdPlaceTable(standings);
const sc = allScenarios(groups, standings, matches, thirds);
const a = sc['Group A'];
assert.strictEqual(a.active, true, 'final matchday -> active');
assert.strictEqual(a.teams['W'].status, 'THROUGH', 'W top-2 in all 9 combos');
assert.strictEqual(a.teams['Y'].status, '3RD-RACE', 'Y can reach 3rd but never top-2');
assert.strictEqual(a.teams['X'].status, 'ALIVE');
assert.strictEqual(a.teams['Z'].status, 'ALIVE');
assert.ok(typeof a.teams['W'].note === 'string');

// group with 2 matches remaining per team -> inactive
const g2 = { 'Group B': ['P', 'Q', 'R', 'S'] };
const m2 = [
  { group: 'Group B', team1: 'P', team2: 'Q', score: { ft: [1, 0] } },
  { group: 'Group B', team1: 'R', team2: 'S', score: { ft: [0, 0] } },
  { group: 'Group B', team1: 'P', team2: 'R' }, { group: 'Group B', team1: 'Q', team2: 'S' },
  { group: 'Group B', team1: 'P', team2: 'S' }, { group: 'Group B', team1: 'Q', team2: 'R' }
];
const s2 = computeStandings(g2, m2);
assert.strictEqual(allScenarios(g2, s2, m2, [])['Group B'].active, false);

// complete group -> inactive
const allPlayed = matches.map(m => m.score ? m : { ...m, score: { ft: [1, 0] } });
const done = computeStandings(groups, allPlayed);
assert.strictEqual(allScenarios(groups, done, allPlayed, [])['Group A'].active, false);

console.log('scenarios.test.js OK');
