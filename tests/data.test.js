// tests/data.test.js
'use strict';
const assert = require('assert');
const { TEAMS } = require('../lib/teams');
const colors = require('../data/team-colors.json');
const history = require('../data/wc-history.json');
const stadiums = require('../data/stadiums.json');

const names = TEAMS.map(t => t.name);

// colors: exactly the 48 canonical names, valid hexes, 2-3 per team
assert.deepStrictEqual(Object.keys(colors).sort(), [...names].sort(), 'colors cover exactly the 48 teams');
for (const [team, arr] of Object.entries(colors)) {
  assert.ok(arr.length >= 2 && arr.length <= 3, `${team}: 2-3 colors`);
  for (const c of arr) assert.match(c, /^#[0-9a-f]{6}$/, `${team}: valid hex ${c}`);
}

// history: exactly the 48 names, sane fields
assert.deepStrictEqual(Object.keys(history).sort(), [...names].sort(), 'history covers exactly the 48 teams');
for (const [team, h] of Object.entries(history)) {
  assert.ok(Number.isInteger(h.titles) && h.titles >= 0 && h.titles <= 5, `${team}: titles`);
  assert.ok(Number.isInteger(h.appearances) && h.appearances >= 1, `${team}: appearances`);
  assert.ok(typeof h.bestFinish === 'string' && h.bestFinish.length > 0, `${team}: bestFinish`);
}
assert.strictEqual(history['Brazil'].titles, 5);

// stadiums: 16 venues, no duplicate ground aliases
assert.strictEqual(stadiums.length, 16, '16 stadiums');
const allGrounds = stadiums.flatMap(s => s.grounds);
assert.strictEqual(new Set(allGrounds).size, allGrounds.length, 'no duplicate ground aliases');
for (const s of stadiums) assert.ok(s.capacity > 40000 && s.stadium && s.city && s.country);

// city-health: covers exactly the 16 stadium cities, sane fields
const cityHealth = require('../data/city-health.json');
const stadiumCities = [...new Set(stadiums.map(s => s.city))];
assert.deepStrictEqual(
  Object.keys(cityHealth.cities).sort(), stadiumCities.sort(),
  'city-health covers exactly the 16 stadium cities'
);
for (const [city, h] of Object.entries(cityHealth.cities)) {
  for (const k of ['heatRisk', 'ozoneRisk', 'smokeRisk', 'composite']) {
    assert.ok(h[k] >= 0 && h[k] <= 100, `${city}: ${k} in 0-100`);
  }
  assert.ok(h.pm25Annual > 0 && h.pm25Annual < 60, `${city}: pm25Annual sane`);
  assert.ok(h.altitudeM >= 0, `${city}: altitudeM >= 0`);
  assert.ok(['severe', 'high', 'moderate', 'lower'].includes(h.tier), `${city}: valid tier`);
  assert.strictEqual(typeof h.roofed, 'boolean', `${city}: roofed boolean`);
}

// tournament payload exposes colors + history on team objects
(async () => {
  const fs = require('fs');
  const path = require('path');
  const { buildTournament } = require('../lib/tournament');
  const fixture = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'sample.json'), 'utf8'));
  const t = await buildTournament({ fetcher: { get: async () => fixture }, sourceUrl: 'x' });
  const bra = t.teams.find(x => x.name === 'Brazil');
  assert.deepStrictEqual(bra.colors, ['#ffdf00', '#009c3b', '#002776'], 'colors flow through payload');
  const mex = t.teams.find(x => x.name === 'Mexico');
  assert.ok(Array.isArray(mex.colors) && mex.colors.length >= 2, 'mexico has colors');
  assert.strictEqual(mex.history.bestFinish, 'Quarter-finals (1970, 1986)');
  console.log('data.test.js OK');
})().catch(e => { console.error(e); process.exit(1); });
