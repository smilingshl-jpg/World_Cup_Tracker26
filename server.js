// server.js
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const { Fetcher } = require('./lib/fetcher');
const { buildTournament } = require('./lib/tournament');
const { getOutrightOdds } = require('./lib/odds');
const { simulate } = require('./lib/sim');
const { makeNewsSource } = require('./lib/news');
const { parseScoreboard, ESPN_URL, LIVE_TTL } = require('./lib/livescores');
const espn = require('./lib/espn');
const { findTeam } = require('./lib/teams');
const STADIUMS = require('./data/stadiums.json');
const CITY_HEALTH = require('./data/city-health.json');
const PENALTY_ZONES = require('./data/penalty-zones.json');

const DEFAULT_SOURCE = 'https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.json';
const PUBLIC_DIR = path.join(__dirname, 'public');
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

function sendJson(res, status, body) {
  const buf = JSON.stringify(body);
  res.writeHead(status, { 'content-type': 'application/json', 'cache-control': 'no-store' });
  res.end(buf);
}

function sendStatic(res, urlPath) {
  const rel = urlPath === '/' ? 'index.html' : urlPath.slice(1);
  const file = path.normalize(path.join(PUBLIC_DIR, rel));
  if (!file.startsWith(PUBLIC_DIR)) return sendJson(res, 403, { error: 'forbidden' });
  fs.readFile(file, (err, data) => {
    if (err) return sendJson(res, 404, { error: 'not found' });
    res.writeHead(200, { 'content-type': MIME[path.extname(file)] || 'application/octet-stream' });
    res.end(data);
  });
}

function createServer({ fetcher, sourceUrl = DEFAULT_SOURCE, oddsKey = process.env.ODDS_API_KEY || '' } = {}) {
  const f = fetcher || new Fetcher({});
  let simCache = { key: '', body: null };
  const news = makeNewsSource({});
  // ESPN scoreboard is best-effort: failures degrade to openfootball-only data
  const liveEntries = async () => {
    try { return parseScoreboard(await f.get(ESPN_URL, LIVE_TTL)); } catch { return null; }
  };
  return http.createServer(async (req, res) => {
    const url = new URL(req.url, 'http://localhost');
    try {
      if (url.pathname === '/api/tournament') {
        return sendJson(res, 200, await buildTournament({ fetcher: f, sourceUrl, liveEntries: await liveEntries() }));
      }
      if (url.pathname === '/api/odds') {
        return sendJson(res, 200, await getOutrightOdds({ fetcher: f, apiKey: oddsKey }));
      }
      if (url.pathname === '/api/simulation') {
        const t = await buildTournament({ fetcher: f, sourceUrl, liveEntries: await liveEntries() });
        const odds = await getOutrightOdds({ fetcher: f, apiKey: oddsKey });
        const finished = t.matches.filter(m => m.status === 'finished').length;
        const key = finished + '|' + (odds.fetchedAt || odds.source);
        if (simCache.key !== key) {
          const out = simulate({
            matches: t.matches, groups: t.groups,
            oddsEntries: odds.entries.map(e => ({ team: e.team, prob: e.prob })),
            iterations: 10000, seed: 2026
          });
          const rows = Object.entries(out.teams)
            .map(([team, p]) => ({ team, ...p }))
            .sort((a, b) => b.champion - a.champion);
          simCache = { key, body: { generatedAt: new Date().toISOString(), iterations: out.iterations, model: out.model, teams: rows } };
        }
        return sendJson(res, 200, simCache.body);
      }
      if (url.pathname === '/api/news') {
        const n = await news.get();
        return sendJson(res, 200, { items: n.items, fetchedAt: n.fetchedAt || null });
      }
      if (url.pathname === '/api/stadiums') {
        // enrich each venue with its city's health/conditions profile (static)
        return sendJson(res, 200, STADIUMS.map(s => ({ ...s, health: CITY_HEALTH.cities[s.city] || null })));
      }
      if (url.pathname === '/api/roster') {
        const team = url.searchParams.get('team') || '';
        const ids = espn.parseTeams(await f.get(espn.TEAMS_URL, espn.DAY_TTL));
        const canon = findTeam(team);
        const id = canon && ids.get(canon.name);
        if (!id) return sendJson(res, 404, { error: 'unknown team', team });
        const players = espn.parseRoster(await f.get(espn.ROSTER_URL(id), espn.DAY_TTL));
        return sendJson(res, 200, { team: canon.name, players });
      }
      if (url.pathname === '/api/matchdetail') {
        const num = Number(url.searchParams.get('num'));
        const t = await buildTournament({ fetcher: f, sourceUrl, liveEntries: await liveEntries() });
        const match = t.matches.find(m => m.num === num);
        if (!match) return sendJson(res, 404, { error: 'unknown match', num });
        if (!match.date) return sendJson(res, 200, { num, available: false });
        const yyyymmdd = match.date.replace(/-/g, '');
        const sb = await f.get(espn.SCOREBOARD_DATE_URL(yyyymmdd), espn.MINUTE_TTL);
        const eventId = espn.findEvent(sb, match.team1, match.team2);
        if (!eventId) return sendJson(res, 200, { num, available: false });
        const detail = espn.parseSummary(await f.get(espn.SUMMARY_URL(eventId), espn.MINUTE_TTL));
        const out = { num, available: true, score: match.score || null, ...detail };
        if (out.pens) out.penaltyZones = PENALTY_ZONES.zones; // net-probability shading
        return sendJson(res, 200, out);
      }
      if (url.pathname.startsWith('/api/')) {
        return sendJson(res, 404, { error: 'unknown endpoint' });
      }
      return sendStatic(res, url.pathname);
    } catch (err) {
      return sendJson(res, 502, { error: String(err.message || err) });
    }
  });
}

if (require.main === module) {
  const port = Number(process.env.PORT) || 3001;
  createServer({}).listen(port, () => {
    console.log(`World Cup 2026 hub on http://localhost:${port}`);
    console.log(process.env.ODDS_API_KEY ? 'Odds: LIVE (The Odds API)' : 'Odds: snapshot (set ODDS_API_KEY for live odds)');
  });
}

module.exports = { createServer };
