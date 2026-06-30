// tests/bracket-tree.test.js
'use strict';
const assert = require('assert');
const path = require('path');
const { pathToFileURL } = require('url');

(async () => {
  const { buildWings } = await import(pathToFileURL(path.join(__dirname, '..', 'public', 'js', 'bracket-tree.js')).href);

  // 8-team KO: QFs 1-4 -> SFs 5,6 -> Final 7 (+3rd place 8)
  const bracket = [
    { num: 1, round: 'Quarter-final', ref1: 'A', ref2: 'B' },
    { num: 2, round: 'Quarter-final', ref1: 'C', ref2: 'D' },
    { num: 3, round: 'Quarter-final', ref1: 'E', ref2: 'F' },
    { num: 4, round: 'Quarter-final', ref1: 'G', ref2: 'H' },
    { num: 5, round: 'Semi-final', ref1: 'W1', ref2: 'W2' },
    { num: 6, round: 'Semi-final', ref1: 'W3', ref2: 'W4' },
    { num: 7, round: 'Final', ref1: 'W5', ref2: 'W6' },
    { num: 8, round: 'Match for third place', ref1: 'L5', ref2: 'L6' }
  ];
  const w = buildWings(bracket);
  assert.ok(w, 'wings derivable');
  assert.strictEqual(w.final.num, 7);
  assert.strictEqual(w.third.num, 8);
  assert.deepStrictEqual(w.left.map(col => col.map(m => m.num)), [[5], [1, 2]], 'left wing: SF then QFs');
  assert.deepStrictEqual(w.right.map(col => col.map(m => m.num)), [[6], [3, 4]], 'right wing');

  // broken chain -> null (fallback to flat layout)
  assert.strictEqual(buildWings(bracket.filter(m => m.num !== 5)), null);

  // pre-placed team / bye: a QF feeds from a literal team instead of a W## sub-match.
  // Wings must still derive (matches real 2026 data where a host is slotted into the R16).
  const withBye = bracket.map(m => m.num === 1 ? { ...m, ref1: 'Canada' } : m);
  const wb = buildWings(withBye);
  assert.ok(wb, 'wings still derive with a pre-placed team in one branch');
  assert.deepStrictEqual(wb.left.map(col => col.map(m => m.num)), [[5], [1, 2]], 'bye branch stops short, wing intact');

  console.log('bracket-tree.test.js OK');
})().catch(e => { console.error(e); process.exit(1); });
