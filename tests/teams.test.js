// tests/teams.test.js
'use strict';
const assert = require('assert');
const { TEAMS, findTeam, normalizeName, deriveGroups } = require('../lib/teams');

// exactly 48 teams, unique names/codes/flags
assert.strictEqual(TEAMS.length, 48, 'exactly 48 teams');
const names = new Set(TEAMS.map(t => t.name));
const codes = new Set(TEAMS.map(t => t.code));
const flags = new Set(TEAMS.map(t => t.flag));
assert.strictEqual(names.size, 48, 'unique names');
assert.strictEqual(codes.size, 48, 'unique FIFA codes');
assert.strictEqual(flags.size, 48, 'unique flag codes');

// canonical lookups
assert.strictEqual(findTeam('Spain').code, 'ESP');
assert.strictEqual(findTeam('United States').flag, 'us');
assert.strictEqual(findTeam('England').flag, 'gb-eng');
assert.strictEqual(findTeam('Scotland').flag, 'gb-sct');

// alias + diacritics resolution
assert.strictEqual(findTeam('Turkey').name, 'Türkiye');
assert.strictEqual(findTeam('Türkiye').name, 'Türkiye');
assert.strictEqual(findTeam('Ivory Coast').code, 'CIV');
assert.strictEqual(findTeam("Côte d'Ivoire").code, 'CIV');
assert.strictEqual(findTeam('Congo DR').name, 'DR Congo');
assert.strictEqual(findTeam('Democratic Republic of the Congo').name, 'DR Congo');
assert.strictEqual(findTeam('Cabo Verde').name, 'Cape Verde');
assert.strictEqual(findTeam('Korea Republic').name, 'South Korea');
assert.strictEqual(findTeam('Czech Republic').name, 'Czechia');
assert.strictEqual(findTeam('Curacao').name, 'Curaçao');
assert.strictEqual(findTeam('Bosnia-Herzegovina').code, 'BIH');
assert.strictEqual(findTeam('USA').code, 'USA');
assert.strictEqual(findTeam('IR Iran').code, 'IRN');

// non-teams return null (knockout placeholders must NOT resolve)
assert.strictEqual(findTeam('1A'), null);
assert.strictEqual(findTeam('W73'), null);
assert.strictEqual(findTeam('3C/3D/3E/3F'), null);
assert.strictEqual(findTeam(''), null);
assert.strictEqual(findTeam(undefined), null);

// normalization
assert.strictEqual(normalizeName("Côte d'Ivoire"), 'cotedivoire');

// group derivation from match data
const groups = deriveGroups([
  { group: 'Group A', team1: 'Mexico', team2: 'South Africa' },
  { group: 'Group A', team1: 'Canada', team2: 'Qatar' },
  { group: 'Group B', team1: 'Spain', team2: 'Turkey' }, // alias on purpose
  { round: 'Round of 32', team1: '1A', team2: '3C/3D/3E/3F' } // ignored: no group
]);
assert.deepStrictEqual(groups['Group A'].sort(), ['Canada', 'Mexico', 'Qatar', 'South Africa']);
assert.deepStrictEqual(groups['Group B'].sort(), ['Spain', 'Türkiye']);
assert.strictEqual(Object.keys(groups).length, 2);

console.log('teams.test.js OK');
