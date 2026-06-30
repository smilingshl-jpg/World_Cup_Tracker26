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

  // ---- per-player direction tendency (modelled, seeded) ----
  const { directionTendency, sampleZone } = await import(pathToFileURL(path.join(__dirname, '..', 'public', 'js', 'penalty.js')).href);
  const zones = [
    { id: 'TL', col: 0, row: 0, label: 'Top left', conversion: 0.90, share: 0.14 },
    { id: 'TC', col: 1, row: 0, label: 'Top centre', conversion: 0.82, share: 0.05 },
    { id: 'TR', col: 2, row: 0, label: 'Top right', conversion: 0.91, share: 0.14 },
    { id: 'LL', col: 0, row: 1, label: 'Low left', conversion: 0.85, share: 0.27 },
    { id: 'LC', col: 1, row: 1, label: 'Low centre', conversion: 0.70, share: 0.13 },
    { id: 'LR', col: 2, row: 1, label: 'Low right', conversion: 0.86, share: 0.27 }
  ];
  const havertz = directionTendency('Kai Havertz', zones);
  assert.strictEqual(havertz.length, 6, 'one probability per zone');
  assert.ok(Math.abs(havertz.reduce((s, z) => s + z.p, 0) - 1) < 1e-9, 'tendency sums to 1');
  for (const z of havertz) assert.ok(z.p >= 0 && z.p <= 1 && z.id && z.label, 'zone shape + range');
  // stable per player, distinct between players
  const havertz2 = directionTendency('Kai Havertz', zones);
  assert.deepStrictEqual(havertz.map(z => z.p), havertz2.map(z => z.p), 'deterministic per player');
  const messi = directionTendency('Lionel Messi', zones);
  assert.ok(havertz.some((z, i) => Math.abs(z.p - messi[i].p) > 1e-6), 'different players differ');
  // sampleZone is deterministic for a given rng and respects the distribution domain
  const { mulberry32 } = await import(pathToFileURL(path.join(__dirname, '..', 'public', 'js', 'penalty.js')).href);
  const picked = sampleZone(havertz, mulberry32(7));
  assert.ok(zones.some(z => z.id === picked.id), 'sampleZone returns a real zone');
  assert.strictEqual(sampleZone(havertz, mulberry32(7)).id, picked.id, 'sampleZone deterministic for fixed rng');

  console.log('penalty.test.js OK');
})().catch(e => { console.error(e); process.exit(1); });
