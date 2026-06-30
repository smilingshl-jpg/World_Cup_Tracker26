// tests/penalty.test.js
'use strict';
const assert = require('assert');
const path = require('path');
const { pathToFileURL } = require('url');

(async () => {
  const { orderedKicks, winProbSteps } = await import(pathToFileURL(path.join(__dirname, '..', 'public', 'js', 'penalty.js')).href);

  // Croatia (home) 4 – Brazil (away) 2, as parsed from ESPN event 633843
  const pens = { result: [4, 2], teams: [
    { team: 'Croatia', side: 'home', kicks: [
      { n: 1, taker: 'Vlasic', scored: true }, { n: 2, taker: 'Majer', scored: true },
      { n: 3, taker: 'Modric', scored: true }, { n: 4, taker: 'Orsic', scored: true } ] },
    { team: 'Brazil', side: 'away', kicks: [
      { n: 1, taker: 'Rodrygo', scored: false }, { n: 2, taker: 'Casemiro', scored: true },
      { n: 3, taker: 'Pedro', scored: true }, { n: 4, taker: 'Marquinhos', scored: false } ] }
  ] };

  // ordering: home#1, away#1, home#2, away#2, …
  const { seq } = orderedKicks(pens);
  assert.strictEqual(seq.length, 8, '8 kicks total');
  assert.deepStrictEqual([seq[0].side, seq[0].team, seq[1].side], ['home', 'Croatia', 'away']);
  assert.deepStrictEqual(seq.map(k => k.side), ['home', 'away', 'home', 'away', 'home', 'away', 'home', 'away']);

  const { steps, p } = winProbSteps(pens, { sims: 4000, seed: 1 });
  assert.strictEqual(steps.length, 8);
  assert.ok(p > 0 && p < 1, 'conversion p set');
  for (const s of steps) assert.ok(s.pHome >= 0 && s.pHome <= 1 && Math.abs(s.pHome + s.pAway - 1) < 1e-9, 'probs valid');

  // final tally + decided result (Croatia home win -> pHome = 1)
  const last = steps[steps.length - 1];
  assert.deepStrictEqual([last.homeGoals, last.awayGoals], [4, 2]);
  assert.strictEqual(last.pHome, 1, 'decided shootout -> home win certain');

  // Brazil's first miss (Rodrygo, step index 1) should hand the edge to home
  assert.ok(steps[1].pHome > 0.5, 'home favoured after away miss');

  // deterministic for a fixed seed
  const again = winProbSteps(pens, { sims: 4000, seed: 1 }).steps.map(s => s.pHome);
  assert.deepStrictEqual(steps.map(s => s.pHome), again, 'deterministic');

  console.log('penalty.test.js OK');
})().catch(e => { console.error(e); process.exit(1); });
