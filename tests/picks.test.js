// tests/picks.test.js
'use strict';
const assert = require('assert');
const path = require('path');
const { pathToFileURL } = require('url');

(async () => {
  const mod = await import(pathToFileURL(path.join(__dirname, '..', 'public', 'js', 'picks-core.js')).href);
  const { effectiveTeams, applyPick, scorePicks, ROUND_POINTS } = mod;

  // synthetic bracket: 73,74 (R32) feed 89 (R16) feeds 101 (Final)
  const bracket = [
    { num: 73, round: 'Round of 32', team1: 'Mexico', team2: 'Japan', ref1: '1A', ref2: '2B', resolved1: true, resolved2: true, score: null },
    { num: 74, round: 'Round of 32', team1: 'Spain', team2: 'France', ref1: '1C', ref2: '2D', resolved1: true, resolved2: true, score: { ft: [2, 0] } },
    { num: 89, round: 'Round of 16', team1: 'W73', team2: 'W74', ref1: 'W73', ref2: 'W74', resolved1: false, resolved2: false, score: null },
    { num: 101, round: 'Final', team1: 'W89', team2: 'W90', ref1: 'W89', ref2: 'W90', resolved1: false, resolved2: false, score: null }
  ];
  const byNum = new Map(bracket.map(b => [b.num, b]));

  // effective slots in picks mode
  let picks = {};
  assert.deepStrictEqual(effectiveTeams(byNum.get(73), picks, byNum), ['Mexico', 'Japan']);
  assert.deepStrictEqual(effectiveTeams(byNum.get(89), picks, byNum), [null, 'Spain'], 'real result fills W74; W73 unpicked');

  picks = applyPick(picks, byNum, 73, 'Mexico');
  assert.strictEqual(picks[73], 'Mexico');
  assert.deepStrictEqual(effectiveTeams(byNum.get(89), picks, byNum), ['Mexico', 'Spain']);

  picks = applyPick(picks, byNum, 89, 'Mexico');
  assert.strictEqual(picks[89], 'Mexico');

  // changing 73 to Japan must clear downstream pick of Mexico at 89
  picks = applyPick(picks, byNum, 73, 'Japan');
  assert.strictEqual(picks[73], 'Japan');
  assert.strictEqual(picks[89], undefined, 'stale downstream pick cleared');

  // scoring: real winners — 74 finished (Spain). Pick Spain at 74 => R32 points.
  const p2 = applyPick({}, byNum, 74, 'Spain');
  const sc = scorePicks(p2, bracket);
  assert.strictEqual(sc.points, ROUND_POINTS['Round of 32']);
  assert.strictEqual(sc.correct, 1);
  assert.strictEqual(sc.graded, 1);

  // wrong pick scores 0
  const sc2 = scorePicks(applyPick({}, byNum, 74, 'France'), bracket);
  assert.strictEqual(sc2.points, 0);
  assert.strictEqual(sc2.graded, 1);

  console.log('picks.test.js OK');
})().catch(e => { console.error(e); process.exit(1); });
