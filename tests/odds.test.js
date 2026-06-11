// tests/odds.test.js
'use strict';
const assert = require('assert');
const { findTeam } = require('../lib/teams');
const { impliedProbabilities, getOutrightOdds, SNAPSHOT } = require('../lib/odds');

// snapshot integrity: 48 entries, every name resolves to a canonical team, no dupes
assert.strictEqual(SNAPSHOT.entries.length, 48, 'snapshot covers all 48 teams');
const resolved = SNAPSHOT.entries.map(e => {
  const t = findTeam(e.team);
  assert.ok(t, `snapshot team resolves: ${e.team}`);
  assert.ok(e.decimal > 1, `decimal odds > 1: ${e.team}`);
  return t.name;
});
assert.strictEqual(new Set(resolved).size, 48, 'no duplicate teams in snapshot');

// de-vig: probabilities normalize to 1, ordering follows prices
const probs = impliedProbabilities([
  { team: 'A', decimal: 2.0 },
  { team: 'B', decimal: 4.0 },
  { team: 'C', decimal: 4.0 }
]);
const sum = probs.reduce((s, e) => s + e.prob, 0);
assert.ok(Math.abs(sum - 1) < 1e-9, 'probs sum to 1');
assert.strictEqual(probs[0].team, 'A');
assert.ok(Math.abs(probs[0].prob - 0.5) < 1e-9, '1/2 over (1/2+1/4+1/4) = 0.5');

// no key -> snapshot source
(async () => {
  const out = await getOutrightOdds({ fetcher: null, apiKey: '' });
  assert.strictEqual(out.live, false);
  assert.strictEqual(out.entries.length, 48);
  assert.ok(out.entries[0].prob > out.entries[47].prob, 'sorted by probability desc');

  // with key -> parses The Odds API outrights shape, averages bookmakers
  const fakeFetcher = {
    get: async () => ([{
      sport_key: 'soccer_fifa_world_cup_winner',
      bookmakers: [
        { key: 'bk1', markets: [{ key: 'outrights', outcomes: [
          { name: 'Spain', price: 5.0 }, { name: 'Turkey', price: 90.0 }
        ] }] },
        { key: 'bk2', markets: [{ key: 'outrights', outcomes: [
          { name: 'Spain', price: 6.0 }
        ] }] }
      ]
    }])
  };
  const live = await getOutrightOdds({ fetcher: fakeFetcher, apiKey: 'k' });
  assert.strictEqual(live.live, true);
  const spain = live.entries.find(e => e.team === 'Spain');
  assert.ok(Math.abs(spain.decimal - 5.5) < 1e-9, 'bookmaker average');
  const tur = live.entries.find(e => e.team === 'Türkiye');
  assert.ok(tur, 'odds-api name "Turkey" mapped to canonical Türkiye');
  console.log('odds.test.js OK');
})().catch(err => { console.error(err); process.exit(1); });
