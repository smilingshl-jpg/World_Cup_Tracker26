// tests/bracket.test.js
'use strict';
const assert = require('assert');
const { buildBracket, matchWinner } = require('../lib/bracket');

// winner precedence: penalties > extra time > full time
assert.strictEqual(matchWinner({ team1: 'A', team2: 'B', score: { ft: [1, 1], et: [1, 1], p: [3, 1] } }), 'A');
assert.strictEqual(matchWinner({ team1: 'A', team2: 'B', score: { ft: [1, 1], et: [2, 1] } }), 'A');
assert.strictEqual(matchWinner({ team1: 'A', team2: 'B', score: { ft: [0, 2] } }), 'B');
assert.strictEqual(matchWinner({ team1: 'A', team2: 'B' }), null);

const standings = {
  'Group A': {
    complete: true,
    table: [
      { team: 'Mexico', points: 6 }, { team: 'Canada', points: 5 },
      { team: 'South Africa', points: 4 }, { team: 'Qatar', points: 1 }
    ]
  },
  'Group B': { complete: false, table: [{ team: 'Spain', points: 3 }] }
};

const matches = [
  { num: 73, round: 'Round of 32', date: '2026-06-28', team1: '1A', team2: '3C/3D/3E/3F', ground: 'Boston' },
  { num: 74, round: 'Round of 32', date: '2026-06-29', team1: '2A', team2: '1B', ground: 'Dallas' },
  { num: 75, round: 'Round of 32', date: '2026-06-29', team1: 'Croatia', team2: 'Japan', ground: 'Houston',
    score: { ft: [1, 1], et: [1, 1], p: [3, 1] } },
  { num: 89, round: 'Round of 16', date: '2026-07-03', team1: 'W75', team2: 'W74', ground: 'Seattle' },
  // a group match must be excluded from the bracket
  { num: 1, round: 'Matchday 1', date: '2026-06-11', group: 'Group A', team1: 'Mexico', team2: 'South Africa' }
];

const bracket = buildBracket(matches, standings);
assert.strictEqual(bracket.length, 4, 'only knockout matches');

const m73 = bracket.find(m => m.num === 73);
assert.strictEqual(m73.team1, 'Mexico');           // 1A resolved from complete group
assert.strictEqual(m73.resolved1, true);
assert.strictEqual(m73.team2, '3C/3D/3E/3F');      // third-place pool stays a label
assert.strictEqual(m73.resolved2, false);

const m74 = bracket.find(m => m.num === 74);
assert.strictEqual(m74.team1, 'Canada');            // 2A resolved
assert.strictEqual(m74.team2, '1B');                // Group B incomplete -> placeholder
assert.strictEqual(m74.resolved2, false);

const m89 = bracket.find(m => m.num === 89);
assert.strictEqual(m89.team1, 'Croatia');           // W75 via penalties
assert.strictEqual(m89.team2, 'W74');               // match 74 not played yet
assert.strictEqual(m89.resolved1, true);

// matches without num get one assigned from file order (1-based)
const noNums = buildBracket(
  [{ round: 'Final', team1: 'A', team2: 'B' }],
  {}
);
assert.strictEqual(noNums[0].num, 1);

console.log('bracket.test.js OK');
