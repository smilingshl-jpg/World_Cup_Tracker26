// tests/scorers.test.js
'use strict';
const assert = require('assert');
const { goldenBoot, matchScorers } = require('../lib/scorers');

const matches = [
  { team1: 'Mexico', team2: 'Qatar', score: { ft: [2, 1] },
    goals1: [{ name: 'R. Jiménez', minute: 12 }, { name: 'R. Jiménez', minute: 55, penalty: true }],
    goals2: [{ name: 'Akram Afif', minute: 80 }] },
  { team1: 'Spain', team2: 'France', score: { ft: [1, 1] },
    goals1: [{ player: 'Lamine Yamal', minute: 30 }],
    goals2: [{ name: 'K. Mbappé' }] },
  { team1: 'Ghana', team2: 'Egypt', score: { ft: [1, 0] },
    goals1: [{ name: 'M. Salah', minute: 9, owngoal: true }] },
  { team1: 'Japan', team2: 'Iran' }
];

const boot = goldenBoot(matches);
assert.strictEqual(boot[0].player, 'R. Jiménez');
assert.deepStrictEqual([boot[0].goals, boot[0].penalties, boot[0].team], [2, 1, 'Mexico']);
assert.ok(boot.find(e => e.player === 'Lamine Yamal'), 'alt "player" field parsed');
assert.ok(boot.find(e => e.player === 'K. Mbappé'), 'missing minute tolerated');
assert.ok(!boot.find(e => e.player === 'M. Salah'), 'own goals excluded');
assert.ok(boot.every((e, i) => i === 0 || boot[i - 1].goals >= e.goals), 'sorted desc');

const ms = matchScorers(matches[0]);
assert.strictEqual(ms.team1[1].penalty, true);
assert.strictEqual(ms.team1[0].minute, 12);
assert.strictEqual(ms.team2[0].name, 'Akram Afif');
assert.deepStrictEqual(matchScorers(matches[3]), { team1: [], team2: [] });

console.log('scorers.test.js OK');
