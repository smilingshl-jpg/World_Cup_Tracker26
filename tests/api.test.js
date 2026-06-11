// tests/api.test.js
'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const http = require('http');
const { buildTournament, parseKickoff } = require('../lib/tournament');
const { createServer } = require('../server');

const fixture = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'sample.json'), 'utf8'));

function getJson(port, route) {
  return new Promise((resolve, reject) => {
    http.get({ host: '127.0.0.1', port, path: route }, (res) => {
      let buf = '';
      res.on('data', (c) => (buf += c));
      res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(buf) }));
    }).on('error', reject);
  });
}

(async () => {
  // --- kickoff parsing ---
  assert.strictEqual(parseKickoff('2026-06-11', '13:00 UTC-6'), '2026-06-11T13:00:00-06:00');
  assert.strictEqual(parseKickoff('2026-06-28', '15:00 UTC-4'), '2026-06-28T15:00:00-04:00');
  assert.strictEqual(parseKickoff('2026-06-28', null), null);

  // --- payload assembly ---
  const fakeFetcher = { get: async () => fixture };
  const t = await buildTournament({ fetcher: fakeFetcher, sourceUrl: 'http://fixture' });
  assert.strictEqual(t.teams.length, 48);
  const mexico = t.teams.find(x => x.name === 'Mexico');
  assert.strictEqual(mexico.group, 'Group A', 'team annotated with derived group');
  assert.strictEqual(t.standings['Group A'].table[0].team, 'Mexico');
  assert.strictEqual(t.standings['Group A'].complete, true);
  assert.strictEqual(t.thirdPlace[0].team, 'South Africa', 'only group -> its 3rd leads thirds');
  const m1 = t.matches.find(m => m.num === 1);
  assert.strictEqual(m1.kickoff, '2026-06-11T13:00:00-06:00');
  assert.strictEqual(m1.status, 'finished');
  const m73 = t.matches.find(m => m.num === 73);
  assert.strictEqual(m73.status, 'upcoming');
  const b73 = t.bracket.find(m => m.num === 73);
  assert.strictEqual(b73.team1, 'Mexico', 'bracket wired into standings');

  // --- HTTP server ---
  const server = createServer({ fetcher: fakeFetcher, sourceUrl: 'http://fixture', oddsKey: '' });
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const port = server.address().port;

  const tour = await getJson(port, '/api/tournament');
  assert.strictEqual(tour.status, 200);
  assert.strictEqual(tour.body.standings['Group A'].table[1].team, 'Canada');

  const odds = await getJson(port, '/api/odds');
  assert.strictEqual(odds.status, 200);
  assert.strictEqual(odds.body.live, false, 'no key -> snapshot');
  assert.strictEqual(odds.body.entries.length, 48);

  const idx = await new Promise((resolve, reject) => {
    http.get({ host: '127.0.0.1', port, path: '/' }, res => resolve(res.statusCode)).on('error', reject);
  });
  assert.strictEqual(idx, 200, 'serves index.html');

  const miss = await getJson(port, '/api/nope');
  assert.strictEqual(miss.status, 404);

  server.close();
  console.log('api.test.js OK');
})().catch(err => { console.error(err); process.exit(1); });
