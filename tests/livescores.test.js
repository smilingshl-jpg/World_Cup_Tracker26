// tests/livescores.test.js
'use strict';
const assert = require('assert');
const { parseScoreboard, applyLive, ESPN_URL } = require('../lib/livescores');

assert.ok(ESPN_URL.includes('fifa.world'), 'world cup scoreboard url');

// ESPN-shaped fixture: one live match (with a goal detail), one finished, one pre
const scoreboard = {
  events: [
    {
      competitions: [{
        competitors: [
          { homeAway: 'home', score: '1', team: { id: '203', displayName: 'Mexico' } },
          { homeAway: 'away', score: '0', team: { id: '988', displayName: 'South Africa' } }
        ],
        details: [
          { type: { text: 'Goal' }, clock: { displayValue: "53'" }, team: { id: '203' },
            athletesInvolved: [{ displayName: 'R. Jiménez' }], scoringPlay: true }
        ],
        status: { type: { state: 'in' }, displayClock: "67'" }
      }],
      status: { type: { state: 'in' } }
    },
    {
      competitions: [{
        competitors: [
          { homeAway: 'home', score: '2', team: { id: '451', displayName: 'Czech Republic' } },
          { homeAway: 'away', score: '1', team: { id: '450', displayName: 'Korea Republic' } }
        ],
        details: [],
        status: { type: { state: 'post' }, displayClock: "FT" }
      }]
    },
    {
      competitions: [{
        competitors: [
          { homeAway: 'home', score: '0', team: { id: '1', displayName: 'Canada' } },
          { homeAway: 'away', score: '0', team: { id: '2', displayName: 'Curacao' } }
        ],
        status: { type: { state: 'pre' }, displayClock: '0:00' }
      }]
    }
  ]
};

const entries = parseScoreboard(scoreboard);
assert.strictEqual(entries.length, 3);
const live = entries.find(e => e.team1 === 'Mexico');
assert.deepStrictEqual([live.state, live.score, live.clock], ['in', [1, 0], "67'"]);
assert.strictEqual(live.team2, 'South Africa');
assert.strictEqual(live.goals1[0].name, 'R. Jiménez');
assert.strictEqual(live.goals1[0].minute, 53);
const post = entries.find(e => e.team1 === 'Czechia'); // canonical name mapping
assert.deepStrictEqual([post.state, post.score, post.team2], ['post', [2, 1], 'South Korea']);

// --- overlay onto raw openfootball matches ---
const raw = [
  { num: 1, group: 'Group A', team1: 'Mexico', team2: 'South Africa' },                 // live
  { num: 2, group: 'Group A', team1: 'South Korea', team2: 'Czechia' },                 // post, REVERSED order vs ESPN
  { num: 3, group: 'Group B', team1: 'Canada', team2: 'Curaçao' },                      // pre: untouched
  { num: 4, group: 'Group C', team1: 'Spain', team2: 'France', score: { ft: [9, 9] } }  // committed: never overridden
];
applyLive(raw, entries);

assert.ok(!raw[0].score, 'live match gets no committed score');
assert.deepStrictEqual(raw[0]._live.score, [1, 0]);
assert.strictEqual(raw[0]._live.clock, "67'");
assert.strictEqual(raw[0]._live.goals1[0].name, 'R. Jiménez');

assert.deepStrictEqual(raw[1].score, { ft: [1, 2] }, 'post score applied with sides swapped to match raw order');
assert.strictEqual(raw[1].liveSource, 'espn');

assert.ok(!raw[2].score && !raw[2]._live, 'pre match untouched');
assert.deepStrictEqual(raw[3].score, { ft: [9, 9] }, 'existing openfootball score wins');

// malformed input -> no throw
applyLive(raw, parseScoreboard({}));
applyLive(raw, parseScoreboard(null));

console.log('livescores.test.js OK');
