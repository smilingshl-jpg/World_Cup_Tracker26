// tests/standings.test.js
'use strict';
const assert = require('assert');
const { computeStandings, thirdPlaceTable } = require('../lib/standings');

// --- basic table: MEX 6, CAN 5, RSA 4, QAT 1 ---
const groups = { 'Group A': ['Mexico', 'Canada', 'South Africa', 'Qatar'] };
const matches = [
  { group: 'Group A', team1: 'Mexico', team2: 'South Africa', score: { ft: [2, 0] } },
  { group: 'Group A', team1: 'Canada', team2: 'Qatar', score: { ft: [1, 1] } },
  { group: 'Group A', team1: 'Mexico', team2: 'Canada', score: { ft: [0, 1] } },
  { group: 'Group A', team1: 'South Africa', team2: 'Qatar', score: { ft: [3, 1] } },
  { group: 'Group A', team1: 'Mexico', team2: 'Qatar', score: { ft: [2, 1] } },
  { group: 'Group A', team1: 'Canada', team2: 'South Africa', score: { ft: [2, 2] } },
];
const s = computeStandings(groups, matches);
const a = s['Group A'];
assert.strictEqual(a.complete, true, 'group complete after 6 results');
assert.deepStrictEqual(a.table.map(r => r.team), ['Mexico', 'Canada', 'South Africa', 'Qatar']);
const mex = a.table[0];
assert.deepStrictEqual(
  [mex.played, mex.won, mex.drawn, mex.lost, mex.gf, mex.ga, mex.gd, mex.points],
  [3, 2, 0, 1, 4, 2, 2, 6]
);

// --- head-to-head tiebreak: P and Q both pts 6, gd +2, gf 4; Q beat P -> Q first ---
const g2 = { 'Group B': ['P', 'Q', 'R', 'S'] };
const m2 = [
  { group: 'Group B', team1: 'P', team2: 'R', score: { ft: [2, 0] } },
  { group: 'Group B', team1: 'P', team2: 'S', score: { ft: [2, 1] } },
  { group: 'Group B', team1: 'Q', team2: 'P', score: { ft: [1, 0] } },
  { group: 'Group B', team1: 'Q', team2: 'R', score: { ft: [3, 1] } },
  { group: 'Group B', team1: 'S', team2: 'Q', score: { ft: [1, 0] } },
  { group: 'Group B', team1: 'R', team2: 'S', score: { ft: [2, 2] } },
];
const s2 = computeStandings(g2, m2);
assert.deepStrictEqual(s2['Group B'].table.map(r => r.team).slice(0, 2), ['Q', 'P'], 'h2h winner ranks first');

// --- unplayed matches: zero rows, complete=false ---
const s3 = computeStandings(
  { 'Group C': ['X', 'Y'] },
  [{ group: 'Group C', team1: 'X', team2: 'Y' }] // no score yet
);
assert.strictEqual(s3['Group C'].complete, false);
assert.strictEqual(s3['Group C'].table[0].played, 0);

// --- third-place table: ranked by pts/gd/gf, top 8 qualify ---
const fakeStandings = {};
for (let i = 0; i < 12; i++) {
  const g = 'Group ' + String.fromCharCode(65 + i);
  fakeStandings[g] = {
    complete: true,
    table: [
      { team: g + '-1st', points: 9, gd: 5, gf: 9 },
      { team: g + '-2nd', points: 6, gd: 2, gf: 6 },
      { team: g + '-3rd', points: i, gd: i - 3, gf: i }, // strictly increasing strength A..L
      { team: g + '-4th', points: 0, gd: -5, gf: 1 },
    ]
  };
}
const thirds = thirdPlaceTable(fakeStandings);
assert.strictEqual(thirds.length, 12);
assert.strictEqual(thirds[0].team, 'Group L-3rd', 'strongest third first');
assert.strictEqual(thirds.filter(t => t.qualified).length, 8, 'exactly 8 qualify');
assert.strictEqual(thirds[8].qualified, false);

console.log('standings.test.js OK');
