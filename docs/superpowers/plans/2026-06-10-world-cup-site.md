# World Cup 2026 Hub Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A self-hosted World Cup 2026 website with live group tables, full tournament bracket, match schedule in local time, and win probabilities backed by real bookmaker odds and live tournament data.

**Architecture:** A single zero-dependency Node.js server (port 3001) fetches and caches the public-domain openfootball 2026 JSON (fixtures + results, no API key) and — optionally — live odds from The Odds API. All tournament logic (standings with FIFA tiebreakers, third-place qualification, bracket resolution, implied probabilities) lives in small testable `lib/` modules. The client is a vanilla HTML/CSS/JS single-page app with six tabs (Today, Groups, Schedule, Bracket, Teams, Stats) that polls the server and re-renders only when data actually changes (signature guard — lesson from the uno flicker bug d4a0b76).

**Tech Stack:** Node.js ≥18 (built-in `fetch`, `http`, `node:test`-free plain assert scripts matching the uno project's test style), vanilla HTML/CSS/JS, SVG charts hand-rolled (no chart library), flag images from flagcdn.com.

**Data sources (verified 2026-06-10):**
- Fixtures/results/groups: `https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.json` — public domain, no key. Match objects: `{round, date, time ("13:00 UTC-6"), team1, team2, group?, ground, score?: {ft:[a,b], et?, p?}}`. Knockout slots use placeholders (`"1A"`, `"2B"`, `"W73"`, third-place pool strings like `"3C/3D/3E/3F"`).
- Live odds (optional, needs free API key in env `ODDS_API_KEY`): The Odds API v4, sport keys `soccer_fifa_world_cup_winner` (outrights) and `soccer_fifa_world_cup` (match h2h). [UNCLEAR: free tier is believed to be 500 credits/month — we cache 6 h per endpoint, ~10 credits/day, safely inside it.]
- No-key odds fallback: bundled snapshot of real DraftKings outright odds for all 48 teams (June 5 2026, via ESPN), in `data/odds-snapshot.json` (Task 4).

**Known data caveats:**
- [UNCLEAR] openfootball results update when the upstream repo updates — typically same-day, not minute-by-minute live. The UI labels in-progress matches "LIVE" by kickoff time, but scores appear only after upstream commits.
- [UNCLEAR] The exact knockout placeholder strings and whether all 104 matches are present in the file (a fetch on 2026-06-10 suggested ~80 entries). All code derives rounds/matches from whatever the file contains and renders unresolved slots as their placeholder labels — never assume 104 matches or specific ref formats beyond the regexes in Task 6.
- Which third-placed team goes to which Round-of-32 slot depends on FIFA's allocation table (495 combinations). We do NOT implement it: third-place slots stay as placeholder labels until openfootball fills in the real team names. Group winners/runners-up (`1A`, `2B`) ARE resolved locally once a group completes.

**File structure (final):**

```
worldcup/
  package.json
  server.js               # http server: static + /api/tournament + /api/odds
  lib/fetcher.js          # cached fetch with disk fallback (stale-on-error)
  lib/teams.js            # 48 teams, codes, flags, alias resolution, group derivation
  lib/standings.js        # group tables w/ tiebreakers, third-place table
  lib/bracket.js          # knockout slot resolution (1A/2B/W##/L##)
  lib/odds.js             # The Odds API client + snapshot fallback + implied probs
  lib/tournament.js       # assembles the /api/tournament payload
  data/odds-snapshot.json # real DraftKings outrights, all 48 teams
  data/cache/             # runtime cache (gitignored)
  public/index.html
  public/styles.css
  public/app.js
  tests/fixtures/sample.json
  tests/fetcher.test.js
  tests/teams.test.js
  tests/odds.test.js
  tests/standings.test.js
  tests/bracket.test.js
  tests/api.test.js
  docs/superpowers/plans/  (this plan)
```

**Brainstormed features — included in this plan:**
1. "Today" hero: countdown to next kickoff + today's match cards
2. Kickoff times auto-converted to the visitor's local timezone
3. Third-place qualification tracker (the new best-8-of-12 rule — unique to 2026)
4. Win-probability bar chart from de-vigged bookmaker odds (live or snapshot)
5. Tournament stats strip: matches played, total goals, goals/match, biggest win
6. Goals-by-round bar chart
7. Schedule text/stage filters; team cards with flag, group, odds rank, fixtures
8. Flicker-free 60 s live polling (signature-guarded re-render)

**Future ideas (out of scope, YAGNI):** bracket pick'em saved to localStorage, golden-boot tracker (needs paid player-stats API), head-to-head history, PWA offline mode, share-card image generation, push notifications for kickoffs, model-vs-market probability comparison.

---

### Task 1: Project scaffold

**Files:**
- Create: `package.json`, `.gitignore`, `data/cache/.gitkeep`

- [ ] **Step 1: Initialize repo and folders**

```powershell
cd c:\Users\sahil\worldcup
git init
New-Item -ItemType Directory -Force lib, data\cache, public, tests\fixtures | Out-Null
New-Item -ItemType File tests\fixtures\.gitkeep, data\cache\.gitkeep | Out-Null
```

- [ ] **Step 2: Write `package.json`**

```json
{
  "name": "worldcup2026",
  "version": "0.1.0",
  "private": true,
  "description": "World Cup 2026 hub: groups, bracket, schedule, odds",
  "scripts": {
    "start": "node server.js",
    "test": "node tests/fetcher.test.js && node tests/teams.test.js && node tests/odds.test.js && node tests/standings.test.js && node tests/bracket.test.js && node tests/api.test.js"
  },
  "engines": { "node": ">=18" }
}
```

- [ ] **Step 3: Write `.gitignore`**

```
node_modules/
data/cache/*
!data/cache/.gitkeep
.env
```

- [ ] **Step 4: Verify Node version**

Run: `node --version`
Expected: v18 or higher (needs global `fetch`).

- [ ] **Step 5: Commit**

```powershell
git add -A
git commit -m "chore: scaffold worldcup2026 project + implementation plan"
```

---

### Task 2: Cached fetcher (`lib/fetcher.js`)

A tiny fetch wrapper: in-memory + on-disk JSON cache with TTL, and stale-on-error fallback so the site keeps working if GitHub or the odds API hiccups.

**Files:**
- Create: `lib/fetcher.js`
- Test: `tests/fetcher.test.js`

- [ ] **Step 1: Write the failing test**

```js
// tests/fetcher.test.js
'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { Fetcher } = require('../lib/fetcher');

(async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'wc-fetch-'));
  let calls = 0;
  let fail = false;
  const fakeFetch = async (url) => {
    calls++;
    if (fail) throw new Error('network down');
    return { ok: true, json: async () => ({ url, n: calls }) };
  };
  const f = new Fetcher({ cacheDir: dir, fetchImpl: fakeFetch });

  // 1. first call hits the network
  const a = await f.get('https://example.com/x', 60000);
  assert.strictEqual(a.n, 1, 'first call fetches');

  // 2. second call within TTL is served from cache
  const b = await f.get('https://example.com/x', 60000);
  assert.strictEqual(b.n, 1, 'cached within TTL');
  assert.strictEqual(calls, 1);

  // 3. TTL 0 forces refetch
  const c = await f.get('https://example.com/x', 0);
  assert.strictEqual(c.n, 2, 'ttl 0 refetches');

  // 4. network failure falls back to stale disk cache
  fail = true;
  const d = await f.get('https://example.com/x', 0);
  assert.strictEqual(d.n, 2, 'stale-on-error returns last good payload');

  // 5. failure with no cache at all throws
  let threw = false;
  try { await f.get('https://example.com/never-seen', 0); } catch { threw = true; }
  assert.ok(threw, 'no cache + failure throws');

  // 6. fresh Fetcher instance reads the disk cache (memory cold)
  fail = false;
  const f2 = new Fetcher({ cacheDir: dir, fetchImpl: fakeFetch });
  const e = await f2.get('https://example.com/x', 60 * 60 * 1000);
  assert.strictEqual(e.n, 2, 'disk cache survives restart');

  console.log('fetcher.test.js OK');
})().catch((err) => { console.error(err); process.exit(1); });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node tests/fetcher.test.js`
Expected: FAIL — `Cannot find module '../lib/fetcher'`

- [ ] **Step 3: Write the implementation**

```js
// lib/fetcher.js
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class Fetcher {
  constructor({ cacheDir, fetchImpl } = {}) {
    this.cacheDir = cacheDir || path.join(__dirname, '..', 'data', 'cache');
    this.fetchImpl = fetchImpl || globalThis.fetch;
    this.mem = new Map(); // key -> { fetchedAt, body }
    fs.mkdirSync(this.cacheDir, { recursive: true });
  }

  _key(url) {
    return crypto.createHash('sha1').update(url).digest('hex');
  }

  _diskPath(key) {
    return path.join(this.cacheDir, key + '.json');
  }

  _readDisk(key) {
    try {
      return JSON.parse(fs.readFileSync(this._diskPath(key), 'utf8'));
    } catch {
      return null;
    }
  }

  async get(url, ttlMs) {
    const key = this._key(url);
    const now = Date.now();

    let entry = this.mem.get(key) || this._readDisk(key);
    if (entry && now - entry.fetchedAt < ttlMs) {
      this.mem.set(key, entry);
      return entry.body;
    }

    try {
      const res = await this.fetchImpl(url, { headers: { 'user-agent': 'worldcup2026-hub' } });
      if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
      const body = await res.json();
      entry = { fetchedAt: now, body };
      this.mem.set(key, entry);
      fs.writeFileSync(this._diskPath(key), JSON.stringify(entry));
      return body;
    } catch (err) {
      if (entry) return entry.body; // stale-on-error
      throw err;
    }
  }
}

module.exports = { Fetcher };
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node tests/fetcher.test.js`
Expected: `fetcher.test.js OK`

- [ ] **Step 5: Commit**

```powershell
git add lib/fetcher.js tests/fetcher.test.js
git commit -m "feat: cached fetcher with TTL + stale-on-error disk fallback"
```

---

### Task 3: Team registry (`lib/teams.js`)

Canonical data for all 48 qualified teams (final list after the March 2026 playoffs: Iraq beat Bolivia for the last spot), with FIFA codes, flagcdn codes, and alias resolution — because openfootball, DraftKings, and The Odds API spell names differently ("Türkiye"/"Turkey", "DR Congo"/"Congo DR", "Côte d'Ivoire"/"Ivory Coast"…). Groups are NOT hardcoded; they are derived from the fixture data.

**Files:**
- Create: `lib/teams.js`
- Test: `tests/teams.test.js`

- [ ] **Step 1: Write the failing test**

```js
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node tests/teams.test.js`
Expected: FAIL — `Cannot find module '../lib/teams'`

- [ ] **Step 3: Write the implementation**

```js
// lib/teams.js
'use strict';

// All 48 qualified teams for the 2026 World Cup (final after March 2026 playoffs).
// flag = flagcdn.com code, e.g. https://flagcdn.com/h24/<flag>.png
const TEAMS = [
  { name: 'Algeria',                code: 'ALG', flag: 'dz', aliases: [] },
  { name: 'Argentina',              code: 'ARG', flag: 'ar', aliases: [] },
  { name: 'Australia',              code: 'AUS', flag: 'au', aliases: [] },
  { name: 'Austria',                code: 'AUT', flag: 'at', aliases: [] },
  { name: 'Belgium',                code: 'BEL', flag: 'be', aliases: [] },
  { name: 'Bosnia and Herzegovina', code: 'BIH', flag: 'ba', aliases: ['Bosnia-Herzegovina', 'Bosnia & Herzegovina', 'Bosnia'] },
  { name: 'Brazil',                 code: 'BRA', flag: 'br', aliases: [] },
  { name: 'Canada',                 code: 'CAN', flag: 'ca', aliases: [] },
  { name: 'Cape Verde',             code: 'CPV', flag: 'cv', aliases: ['Cabo Verde'] },
  { name: 'Colombia',               code: 'COL', flag: 'co', aliases: [] },
  { name: "Côte d'Ivoire",          code: 'CIV', flag: 'ci', aliases: ['Ivory Coast'] },
  { name: 'Croatia',                code: 'CRO', flag: 'hr', aliases: [] },
  { name: 'Curaçao',                code: 'CUW', flag: 'cw', aliases: [] },
  { name: 'Czechia',                code: 'CZE', flag: 'cz', aliases: ['Czech Republic'] },
  { name: 'DR Congo',               code: 'COD', flag: 'cd', aliases: ['Congo DR', 'Democratic Republic of the Congo', 'Congo, Democratic Republic of the'] },
  { name: 'Ecuador',                code: 'ECU', flag: 'ec', aliases: [] },
  { name: 'Egypt',                  code: 'EGY', flag: 'eg', aliases: [] },
  { name: 'England',                code: 'ENG', flag: 'gb-eng', aliases: [] },
  { name: 'France',                 code: 'FRA', flag: 'fr', aliases: [] },
  { name: 'Germany',                code: 'GER', flag: 'de', aliases: [] },
  { name: 'Ghana',                  code: 'GHA', flag: 'gh', aliases: [] },
  { name: 'Haiti',                  code: 'HAI', flag: 'ht', aliases: [] },
  { name: 'Iran',                   code: 'IRN', flag: 'ir', aliases: ['IR Iran'] },
  { name: 'Iraq',                   code: 'IRQ', flag: 'iq', aliases: [] },
  { name: 'Japan',                  code: 'JPN', flag: 'jp', aliases: [] },
  { name: 'Jordan',                 code: 'JOR', flag: 'jo', aliases: [] },
  { name: 'Mexico',                 code: 'MEX', flag: 'mx', aliases: [] },
  { name: 'Morocco',                code: 'MAR', flag: 'ma', aliases: [] },
  { name: 'Netherlands',            code: 'NED', flag: 'nl', aliases: ['Holland'] },
  { name: 'New Zealand',            code: 'NZL', flag: 'nz', aliases: [] },
  { name: 'Norway',                 code: 'NOR', flag: 'no', aliases: [] },
  { name: 'Panama',                 code: 'PAN', flag: 'pa', aliases: [] },
  { name: 'Paraguay',               code: 'PAR', flag: 'py', aliases: [] },
  { name: 'Portugal',               code: 'POR', flag: 'pt', aliases: [] },
  { name: 'Qatar',                  code: 'QAT', flag: 'qa', aliases: [] },
  { name: 'Saudi Arabia',           code: 'KSA', flag: 'sa', aliases: [] },
  { name: 'Scotland',               code: 'SCO', flag: 'gb-sct', aliases: [] },
  { name: 'Senegal',                code: 'SEN', flag: 'sn', aliases: [] },
  { name: 'South Africa',           code: 'RSA', flag: 'za', aliases: [] },
  { name: 'South Korea',            code: 'KOR', flag: 'kr', aliases: ['Korea Republic', 'Republic of Korea'] },
  { name: 'Spain',                  code: 'ESP', flag: 'es', aliases: [] },
  { name: 'Sweden',                 code: 'SWE', flag: 'se', aliases: [] },
  { name: 'Switzerland',            code: 'SUI', flag: 'ch', aliases: [] },
  { name: 'Tunisia',                code: 'TUN', flag: 'tn', aliases: [] },
  { name: 'Türkiye',                code: 'TUR', flag: 'tr', aliases: ['Turkey'] },
  { name: 'United States',          code: 'USA', flag: 'us', aliases: ['USA', 'United States of America'] },
  { name: 'Uruguay',                code: 'URU', flag: 'uy', aliases: [] },
  { name: 'Uzbekistan',             code: 'UZB', flag: 'uz', aliases: [] },
];

// lowercase, strip diacritics, drop everything but a-z0-9
function normalizeName(s) {
  if (!s) return '';
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

const LOOKUP = new Map();
for (const t of TEAMS) {
  LOOKUP.set(normalizeName(t.name), t);
  for (const a of t.aliases) LOOKUP.set(normalizeName(a), t);
}

function findTeam(raw) {
  if (!raw) return null;
  return LOOKUP.get(normalizeName(raw)) || null;
}

// Build { "Group A": [canonical names...] } from group-stage matches.
function deriveGroups(matches) {
  const groups = {};
  for (const m of matches) {
    if (!m.group) continue;
    const set = (groups[m.group] = groups[m.group] || new Set());
    for (const raw of [m.team1, m.team2]) {
      const t = findTeam(raw);
      if (t) set.add(t.name);
    }
  }
  const out = {};
  for (const [g, set] of Object.entries(groups)) out[g] = [...set];
  return out;
}

module.exports = { TEAMS, findTeam, normalizeName, deriveGroups };
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node tests/teams.test.js`
Expected: `teams.test.js OK`

- [ ] **Step 5: Commit**

```powershell
git add lib/teams.js tests/teams.test.js
git commit -m "feat: 48-team registry with alias/diacritic resolution and group derivation"
```

---

### Task 4: Odds module + real snapshot (`lib/odds.js`, `data/odds-snapshot.json`)

Implied win probabilities from decimal odds (de-vigged: `p_i = (1/price_i) / Σ(1/price_j)`). Live source: The Odds API outrights, averaged across bookmakers, cached 6 h. No key → bundled real DraftKings snapshot.

**Files:**
- Create: `data/odds-snapshot.json`, `lib/odds.js`
- Test: `tests/odds.test.js`

- [ ] **Step 1: Write `data/odds-snapshot.json`** (real DraftKings outright odds, 2026-06-05, American odds converted to decimal: +450 → 5.50, 14-1 → 15.0, etc. Names are canonical — they must all resolve via `findTeam`, which the test enforces.)

```json
{
  "source": "DraftKings outright winner odds, 2026-06-05 (via ESPN betting roundup)",
  "entries": [
    { "team": "Spain", "decimal": 5.5 },
    { "team": "France", "decimal": 5.75 },
    { "team": "England", "decimal": 8.0 },
    { "team": "Portugal", "decimal": 9.5 },
    { "team": "Argentina", "decimal": 10.0 },
    { "team": "Brazil", "decimal": 10.5 },
    { "team": "Germany", "decimal": 15.0 },
    { "team": "Netherlands", "decimal": 21.0 },
    { "team": "Norway", "decimal": 36.0 },
    { "team": "Belgium", "decimal": 41.0 },
    { "team": "Colombia", "decimal": 41.0 },
    { "team": "Morocco", "decimal": 51.0 },
    { "team": "United States", "decimal": 61.0 },
    { "team": "Switzerland", "decimal": 66.0 },
    { "team": "Uruguay", "decimal": 66.0 },
    { "team": "Japan", "decimal": 66.0 },
    { "team": "Mexico", "decimal": 81.0 },
    { "team": "Ecuador", "decimal": 81.0 },
    { "team": "Türkiye", "decimal": 91.0 },
    { "team": "Croatia", "decimal": 91.0 },
    { "team": "Senegal", "decimal": 91.0 },
    { "team": "Sweden", "decimal": 121.0 },
    { "team": "Austria", "decimal": 151.0 },
    { "team": "Canada", "decimal": 201.0 },
    { "team": "Scotland", "decimal": 201.0 },
    { "team": "Côte d'Ivoire", "decimal": 251.0 },
    { "team": "Czechia", "decimal": 251.0 },
    { "team": "Paraguay", "decimal": 301.0 },
    { "team": "Egypt", "decimal": 301.0 },
    { "team": "Ghana", "decimal": 301.0 },
    { "team": "Algeria", "decimal": 351.0 },
    { "team": "South Korea", "decimal": 401.0 },
    { "team": "Bosnia and Herzegovina", "decimal": 501.0 },
    { "team": "Tunisia", "decimal": 501.0 },
    { "team": "Australia", "decimal": 601.0 },
    { "team": "Iran", "decimal": 701.0 },
    { "team": "DR Congo", "decimal": 1001.0 },
    { "team": "Saudi Arabia", "decimal": 1001.0 },
    { "team": "South Africa", "decimal": 1001.0 },
    { "team": "Panama", "decimal": 1001.0 },
    { "team": "Cape Verde", "decimal": 1001.0 },
    { "team": "Qatar", "decimal": 1501.0 },
    { "team": "Uzbekistan", "decimal": 1501.0 },
    { "team": "New Zealand", "decimal": 1501.0 },
    { "team": "Iraq", "decimal": 1501.0 },
    { "team": "Jordan", "decimal": 2501.0 },
    { "team": "Curaçao", "decimal": 2501.0 },
    { "team": "Haiti", "decimal": 2501.0 }
  ]
}
```

- [ ] **Step 2: Write the failing test**

```js
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
```

- [ ] **Step 3: Run test to verify it fails**

Run: `node tests/odds.test.js`
Expected: FAIL — `Cannot find module '../lib/odds'`

- [ ] **Step 4: Write the implementation**

```js
// lib/odds.js
'use strict';
const { findTeam } = require('./teams');
const SNAPSHOT = require('../data/odds-snapshot.json');

const OUTRIGHTS_URL = (key) =>
  `https://api.the-odds-api.com/v4/sports/soccer_fifa_world_cup_winner/odds/?apiKey=${key}&regions=us,uk,eu&markets=outrights&oddsFormat=decimal`;
const ODDS_TTL = 6 * 60 * 60 * 1000; // 6h — stays well inside the free monthly quota

// p_i = (1/price_i) / sum_j (1/price_j)  — removes the bookmaker overround
function impliedProbabilities(entries) {
  const inv = entries.map(e => ({ ...e, raw: 1 / e.decimal }));
  const total = inv.reduce((s, e) => s + e.raw, 0);
  return inv
    .map(({ raw, ...e }) => ({ ...e, prob: raw / total }))
    .sort((a, b) => b.prob - a.prob);
}

async function getOutrightOdds({ fetcher, apiKey }) {
  if (apiKey && fetcher) {
    try {
      const events = await fetcher.get(OUTRIGHTS_URL(apiKey), ODDS_TTL);
      const prices = new Map(); // canonical name -> number[]
      for (const ev of events || []) {
        for (const bk of ev.bookmakers || []) {
          for (const mkt of bk.markets || []) {
            if (mkt.key !== 'outrights') continue;
            for (const o of mkt.outcomes || []) {
              const t = findTeam(o.name);
              if (!t || !(o.price > 1)) continue;
              if (!prices.has(t.name)) prices.set(t.name, []);
              prices.get(t.name).push(o.price);
            }
          }
        }
      }
      if (prices.size > 0) {
        const entries = [...prices.entries()].map(([team, ps]) => ({
          team,
          decimal: ps.reduce((s, p) => s + p, 0) / ps.length
        }));
        return { live: true, source: 'The Odds API (bookmaker average)', fetchedAt: new Date().toISOString(), entries: impliedProbabilities(entries) };
      }
    } catch {
      // fall through to snapshot
    }
  }
  const entries = SNAPSHOT.entries.map(e => ({ team: findTeam(e.team).name, decimal: e.decimal }));
  return { live: false, source: SNAPSHOT.source, fetchedAt: null, entries: impliedProbabilities(entries) };
}

module.exports = { impliedProbabilities, getOutrightOdds, SNAPSHOT };
```

- [ ] **Step 5: Run test to verify it passes**

Run: `node tests/odds.test.js`
Expected: `odds.test.js OK`

- [ ] **Step 6: Commit**

```powershell
git add data/odds-snapshot.json lib/odds.js tests/odds.test.js
git commit -m "feat: odds module - live Odds API outrights with real DraftKings snapshot fallback"
```

---

### Task 5: Standings (`lib/standings.js`)

Group tables from results using the official 2026 tiebreakers we have data for: points → goal difference → goals scored → head-to-head points among tied teams → name (deterministic last resort; FIFA's further criteria — fair play points, drawing of lots — aren't in our data). Plus the 2026-specific third-place table: best 8 of 12 third-placed teams advance (ranked by points → GD → GF).

**Files:**
- Create: `lib/standings.js`
- Test: `tests/standings.test.js`

- [ ] **Step 1: Write the failing test**

```js
// tests/standings.test.js
'use strict';
const assert = require('assert');
const { computeStandings, thirdPlaceTable } = require('../lib/standings');

// --- basic table: MEX 6, CAN 5, RSA 4, QAT 1 ---
const groups = { 'Group A': ['Mexico', 'Canada', 'South Africa', 'Qatar'] };
const matches = [
  { group: 'Group A', team1: 'Mexico', team2: 'South Africa', score: { ft: [2, 0] } },
  { group: 'Group A', team1: 'Canada', team2: 'Qatar', score: { ft: [1, 1] } },
  { group: 'Group A', team1: 'Mexico', team2: 'Canada', score: { ft: [0, 1] } },
  { group: 'Group A', team1: 'South Africa', team2: 'Qatar', score: { ft: [3, 1] } },
  { group: 'Group A', team1: 'Mexico', team2: 'Qatar', score: { ft: [2, 1] } },
  { group: 'Group A', team1: 'Canada', team2: 'South Africa', score: { ft: [2, 2] } },
];
const s = computeStandings(groups, matches);
const a = s['Group A'];
assert.strictEqual(a.complete, true, 'group complete after 6 results');
assert.deepStrictEqual(a.table.map(r => r.team), ['Mexico', 'Canada', 'South Africa', 'Qatar']);
const mex = a.table[0];
assert.deepStrictEqual(
  [mex.played, mex.won, mex.drawn, mex.lost, mex.gf, mex.ga, mex.gd, mex.points],
  [3, 2, 0, 1, 4, 2, 2, 6]
);

// --- head-to-head tiebreak: P and Q both pts 6, gd +2, gf 4; Q beat P -> Q first ---
const g2 = { 'Group B': ['P', 'Q', 'R', 'S'] };
const m2 = [
  { group: 'Group B', team1: 'P', team2: 'R', score: { ft: [2, 0] } },
  { group: 'Group B', team1: 'P', team2: 'S', score: { ft: [2, 1] } },
  { group: 'Group B', team1: 'Q', team2: 'P', score: { ft: [1, 0] } },
  { group: 'Group B', team1: 'Q', team2: 'R', score: { ft: [3, 1] } },
  { group: 'Group B', team1: 'S', team2: 'Q', score: { ft: [1, 0] } },
  { group: 'Group B', team1: 'R', team2: 'S', score: { ft: [2, 2] } },
];
const s2 = computeStandings(g2, m2);
assert.deepStrictEqual(s2['Group B'].table.map(r => r.team).slice(0, 2), ['Q', 'P'], 'h2h winner ranks first');

// --- unplayed matches: zero rows, complete=false ---
const s3 = computeStandings(
  { 'Group C': ['X', 'Y'] },
  [{ group: 'Group C', team1: 'X', team2: 'Y' }] // no score yet
);
assert.strictEqual(s3['Group C'].complete, false);
assert.strictEqual(s3['Group C'].table[0].played, 0);

// --- third-place table: ranked by pts/gd/gf, top 8 qualify ---
const fakeStandings = {};
for (let i = 0; i < 12; i++) {
  const g = 'Group ' + String.fromCharCode(65 + i);
  fakeStandings[g] = {
    complete: true,
    table: [
      { team: g + '-1st', points: 9, gd: 5, gf: 9 },
      { team: g + '-2nd', points: 6, gd: 2, gf: 6 },
      { team: g + '-3rd', points: i, gd: i - 3, gf: i }, // strictly increasing strength A..L
      { team: g + '-4th', points: 0, gd: -5, gf: 1 },
    ]
  };
}
const thirds = thirdPlaceTable(fakeStandings);
assert.strictEqual(thirds.length, 12);
assert.strictEqual(thirds[0].team, 'Group L-3rd', 'strongest third first');
assert.strictEqual(thirds.filter(t => t.qualified).length, 8, 'exactly 8 qualify');
assert.strictEqual(thirds[8].qualified, false);

console.log('standings.test.js OK');
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node tests/standings.test.js`
Expected: FAIL — `Cannot find module '../lib/standings'`

- [ ] **Step 3: Write the implementation**

```js
// lib/standings.js
'use strict';
const { findTeam } = require('./teams');

// Resolve a raw name to canonical if possible, else use it verbatim
// (lets tests use synthetic team names like 'P').
function canon(raw) {
  const t = findTeam(raw);
  return t ? t.name : raw;
}

function ftScore(m) {
  return m.score && Array.isArray(m.score.ft) ? m.score.ft : null;
}

function emptyRow(team) {
  return { team, played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, gd: 0, points: 0 };
}

function applyResult(row, scored, conceded) {
  row.played++;
  row.gf += scored;
  row.ga += conceded;
  row.gd = row.gf - row.ga;
  if (scored > conceded) { row.won++; row.points += 3; }
  else if (scored === conceded) { row.drawn++; row.points += 1; }
  else { row.lost++; }
}

// Head-to-head points among an exactly-tied cluster of rows.
function h2hPoints(clusterTeams, matches) {
  const pts = new Map(clusterTeams.map(t => [t, 0]));
  const inCluster = new Set(clusterTeams);
  for (const m of matches) {
    const t1 = canon(m.team1), t2 = canon(m.team2);
    const ft = ftScore(m);
    if (!ft || !inCluster.has(t1) || !inCluster.has(t2)) continue;
    if (ft[0] > ft[1]) pts.set(t1, pts.get(t1) + 3);
    else if (ft[0] < ft[1]) pts.set(t2, pts.get(t2) + 3);
    else { pts.set(t1, pts.get(t1) + 1); pts.set(t2, pts.get(t2) + 1); }
  }
  return pts;
}

// groups: { "Group A": [names] }; matches: full match list (group-stage entries used)
// Returns { "Group A": { complete, table: [rows] } }
function computeStandings(groups, matches) {
  const out = {};
  for (const [groupName, teamNames] of Object.entries(groups)) {
    const rows = new Map(teamNames.map(t => [t, emptyRow(t)]));
    const groupMatches = matches.filter(m => m.group === groupName);
    for (const m of groupMatches) {
      const ft = ftScore(m);
      if (!ft) continue;
      const t1 = canon(m.team1), t2 = canon(m.team2);
      if (rows.has(t1)) applyResult(rows.get(t1), ft[0], ft[1]);
      if (rows.has(t2)) applyResult(rows.get(t2), ft[1], ft[0]);
    }
    let table = [...rows.values()].sort(
      (a, b) => b.points - a.points || b.gd - a.gd || b.gf - a.gf || a.team.localeCompare(b.team)
    );
    // refine exactly-tied clusters (same pts, gd, gf) with head-to-head points
    for (let i = 0; i < table.length; ) {
      let j = i + 1;
      while (
        j < table.length &&
        table[j].points === table[i].points &&
        table[j].gd === table[i].gd &&
        table[j].gf === table[i].gf
      ) j++;
      if (j - i > 1) {
        const cluster = table.slice(i, j);
        const h2h = h2hPoints(cluster.map(r => r.team), groupMatches);
        cluster.sort((a, b) => h2h.get(b.team) - h2h.get(a.team) || a.team.localeCompare(b.team));
        table.splice(i, j - i, ...cluster);
      }
      i = j;
    }
    const complete = table.length > 0 && table.every(r => r.played >= table.length - 1);
    out[groupName] = { complete, table };
  }
  return out;
}

// Best 8 of the 12 third-placed teams advance (2026 rule): pts -> gd -> gf.
function thirdPlaceTable(standingsByGroup) {
  const thirds = [];
  for (const [group, { table }] of Object.entries(standingsByGroup)) {
    if (table[2]) thirds.push({ group, ...table[2] });
  }
  thirds.sort((a, b) => b.points - a.points || b.gd - a.gd || b.gf - a.gf || a.team.localeCompare(b.team));
  return thirds.map((t, i) => ({ ...t, qualified: i < 8 }));
}

module.exports = { computeStandings, thirdPlaceTable };
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node tests/standings.test.js`
Expected: `standings.test.js OK`

- [ ] **Step 5: Commit**

```powershell
git add lib/standings.js tests/standings.test.js
git commit -m "feat: group standings with FIFA tiebreakers + best-8 third-place table"
```

---

### Task 6: Bracket resolution (`lib/bracket.js`)

Knockout matches are every match without a `group`. Slot refs resolve in this order: (1) already a real team name (openfootball fills these in as the tournament progresses) → use it; (2) `1A`/`2B` → group standings, only once that group is complete; (3) `W73`/`L73` → winner/loser of match #73 if it has a final score (penalties → extra time → full time); (4) anything else (e.g. third-place pool `"3C/3D/3E/3F"`) stays as a label.

**Files:**
- Create: `lib/bracket.js`
- Test: `tests/bracket.test.js`

- [ ] **Step 1: Write the failing test**

```js
// tests/bracket.test.js
'use strict';
const assert = require('assert');
const { buildBracket, matchWinner } = require('../lib/bracket');

// winner precedence: penalties > extra time > full time
assert.strictEqual(matchWinner({ team1: 'A', team2: 'B', score: { ft: [1, 1], et: [1, 1], p: [3, 1] } }), 'A');
assert.strictEqual(matchWinner({ team1: 'A', team2: 'B', score: { ft: [1, 1], et: [2, 1] } }), 'A');
assert.strictEqual(matchWinner({ team1: 'A', team2: 'B', score: { ft: [0, 2] } }), 'B');
assert.strictEqual(matchWinner({ team1: 'A', team2: 'B' }), null);

const standings = {
  'Group A': {
    complete: true,
    table: [
      { team: 'Mexico', points: 6 }, { team: 'Canada', points: 5 },
      { team: 'South Africa', points: 4 }, { team: 'Qatar', points: 1 }
    ]
  },
  'Group B': { complete: false, table: [{ team: 'Spain', points: 3 }] }
};

const matches = [
  { num: 73, round: 'Round of 32', date: '2026-06-28', team1: '1A', team2: '3C/3D/3E/3F', ground: 'Boston' },
  { num: 74, round: 'Round of 32', date: '2026-06-29', team1: '2A', team2: '1B', ground: 'Dallas' },
  { num: 75, round: 'Round of 32', date: '2026-06-29', team1: 'Croatia', team2: 'Japan', ground: 'Houston',
    score: { ft: [1, 1], et: [1, 1], p: [3, 1] } },
  { num: 89, round: 'Round of 16', date: '2026-07-03', team1: 'W75', team2: 'W74', ground: 'Seattle' },
  // a group match must be excluded from the bracket
  { num: 1, round: 'Matchday 1', date: '2026-06-11', group: 'Group A', team1: 'Mexico', team2: 'South Africa' }
];

const bracket = buildBracket(matches, standings);
assert.strictEqual(bracket.length, 4, 'only knockout matches');

const m73 = bracket.find(m => m.num === 73);
assert.strictEqual(m73.team1, 'Mexico');           // 1A resolved from complete group
assert.strictEqual(m73.resolved1, true);
assert.strictEqual(m73.team2, '3C/3D/3E/3F');      // third-place pool stays a label
assert.strictEqual(m73.resolved2, false);

const m74 = bracket.find(m => m.num === 74);
assert.strictEqual(m74.team1, 'Canada');            // 2A resolved
assert.strictEqual(m74.team2, '1B');                // Group B incomplete -> placeholder
assert.strictEqual(m74.resolved2, false);

const m89 = bracket.find(m => m.num === 89);
assert.strictEqual(m89.team1, 'Croatia');           // W75 via penalties
assert.strictEqual(m89.team2, 'W74');               // match 74 not played yet
assert.strictEqual(m89.resolved1, true);

// matches without num get one assigned from file order (1-based)
const noNums = buildBracket(
  [{ round: 'Final', team1: 'A', team2: 'B' }],
  {}
);
assert.strictEqual(noNums[0].num, 1);

console.log('bracket.test.js OK');
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node tests/bracket.test.js`
Expected: FAIL — `Cannot find module '../lib/bracket'`

- [ ] **Step 3: Write the implementation**

```js
// lib/bracket.js
'use strict';
const { findTeam } = require('./teams');

// Decisive score: penalties beat extra time beat full time.
function decisive(m) {
  if (!m.score) return null;
  return m.score.p || m.score.et || m.score.ft || null;
}

function matchWinner(m) {
  const s = decisive(m);
  if (!s || s[0] === s[1]) return null;
  return s[0] > s[1] ? m.team1 : m.team2;
}

function matchLoser(m) {
  const s = decisive(m);
  if (!s || s[0] === s[1]) return null;
  return s[0] > s[1] ? m.team2 : m.team1;
}

// matches: raw openfootball list; standings: output of computeStandings.
// Returns knockout matches with team slots resolved where possible.
function buildBracket(matches, standings) {
  const numbered = matches.map((m, i) => ({ ...m, num: m.num || i + 1 }));
  const byNum = new Map(numbered.map(m => [m.num, m]));

  function resolveRef(ref) {
    if (!ref) return null;
    const direct = findTeam(ref);
    if (direct) return direct.name;
    let m;
    if ((m = /^([12])([A-L])$/.exec(ref))) {
      const g = standings['Group ' + m[2]];
      if (g && g.complete && g.table[+m[1] - 1]) return g.table[+m[1] - 1].team;
      return null;
    }
    if ((m = /^W(\d+)$/.exec(ref))) {
      const src = byNum.get(+m[1]);
      const w = src && matchWinner(src);
      return w ? resolveRef(w) || w : null;
    }
    if ((m = /^L(\d+)$/.exec(ref))) {
      const src = byNum.get(+m[1]);
      const l = src && matchLoser(src);
      return l ? resolveRef(l) || l : null;
    }
    return null; // third-place pools etc. stay unresolved
  }

  return numbered
    .filter(m => !m.group)
    .map(m => {
      const r1 = resolveRef(m.team1);
      const r2 = resolveRef(m.team2);
      return {
        num: m.num,
        round: m.round,
        date: m.date || null,
        time: m.time || null,
        ground: m.ground || null,
        team1: r1 || m.team1,
        team2: r2 || m.team2,
        resolved1: !!r1,
        resolved2: !!r2,
        score: m.score || null
      };
    });
}

module.exports = { buildBracket, matchWinner, matchLoser };
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node tests/bracket.test.js`
Expected: `bracket.test.js OK`

- [ ] **Step 5: Commit**

```powershell
git add lib/bracket.js tests/bracket.test.js
git commit -m "feat: knockout bracket resolution (group slots, W/L refs, placeholder passthrough)"
```

---

### Task 7: Tournament assembly + HTTP server (`lib/tournament.js`, `server.js`)

`lib/tournament.js` turns the raw openfootball JSON into the full `/api/tournament` payload: annotated matches (ISO kickoff, status), derived groups, standings, third-place table, bracket, and team metadata. `server.js` serves `public/` plus two JSON endpoints. Everything injectable for tests.

**Files:**
- Create: `lib/tournament.js`, `server.js`, `tests/fixtures/sample.json`
- Test: `tests/api.test.js`

- [ ] **Step 1: Write the fixture** (`tests/fixtures/sample.json` — Group A fully played, two knockout entries)

```json
{
  "name": "FIFA World Cup 2026 (fixture)",
  "matches": [
    { "num": 1, "round": "Matchday 1", "date": "2026-06-11", "time": "13:00 UTC-6", "team1": "Mexico", "team2": "South Africa", "group": "Group A", "ground": "Mexico City", "score": { "ft": [2, 0] } },
    { "num": 2, "round": "Matchday 1", "date": "2026-06-11", "time": "19:00 UTC-6", "team1": "Canada", "team2": "Qatar", "group": "Group A", "ground": "Toronto", "score": { "ft": [1, 1] } },
    { "num": 3, "round": "Matchday 2", "date": "2026-06-14", "time": "13:00 UTC-6", "team1": "Mexico", "team2": "Canada", "group": "Group A", "ground": "Guadalajara", "score": { "ft": [0, 1] } },
    { "num": 4, "round": "Matchday 2", "date": "2026-06-14", "time": "19:00 UTC-6", "team1": "South Africa", "team2": "Qatar", "group": "Group A", "ground": "Toronto", "score": { "ft": [3, 1] } },
    { "num": 5, "round": "Matchday 3", "date": "2026-06-18", "time": "13:00 UTC-6", "team1": "Mexico", "team2": "Qatar", "group": "Group A", "ground": "Mexico City", "score": { "ft": [2, 1] } },
    { "num": 6, "round": "Matchday 3", "date": "2026-06-18", "time": "13:00 UTC-6", "team1": "Canada", "team2": "South Africa", "group": "Group A", "ground": "Vancouver", "score": { "ft": [2, 2] } },
    { "num": 73, "round": "Round of 32", "date": "2026-06-28", "time": "15:00 UTC-4", "team1": "1A", "team2": "3C/3D/3E/3F", "ground": "Boston" },
    { "num": 74, "round": "Round of 32", "date": "2026-06-29", "time": "15:00 UTC-4", "team1": "2A", "team2": "1B", "ground": "Dallas" }
  ]
}
```

- [ ] **Step 2: Write the failing test**

```js
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
```

- [ ] **Step 3: Run test to verify it fails**

Run: `node tests/api.test.js`
Expected: FAIL — `Cannot find module '../lib/tournament'`

- [ ] **Step 4: Write `lib/tournament.js`**

```js
// lib/tournament.js
'use strict';
const { TEAMS, findTeam, deriveGroups } = require('./teams');
const { computeStandings, thirdPlaceTable } = require('./standings');
const { buildBracket } = require('./bracket');

const SOURCE_TTL = 5 * 60 * 1000; // refetch fixtures/results every 5 minutes
const LIVE_WINDOW_MS = 130 * 60 * 1000; // kickoff + ~130min counts as in progress

// "13:00 UTC-6" + "2026-06-11" -> "2026-06-11T13:00:00-06:00"
function parseKickoff(date, time) {
  if (!date || !time) return null;
  const m = /^(\d{1,2}):(\d{2})\s*UTC([+-])(\d{1,2})(?::(\d{2}))?$/.exec(time);
  if (!m) return null;
  const hh = m[1].padStart(2, '0');
  const offH = m[4].padStart(2, '0');
  const offM = m[5] || '00';
  return `${date}T${hh}:${m[2]}:00${m[3]}${offH}:${offM}`;
}

function matchStatus(m, kickoffIso, now) {
  if (m.score && (m.score.ft || m.score.p || m.score.et)) return 'finished';
  if (kickoffIso) {
    const k = Date.parse(kickoffIso);
    if (!Number.isNaN(k) && now >= k && now < k + LIVE_WINDOW_MS) return 'live';
  }
  return 'upcoming';
}

async function buildTournament({ fetcher, sourceUrl, now = Date.now() }) {
  const raw = await fetcher.get(sourceUrl, SOURCE_TTL);
  const rawMatches = (raw.matches || []).map((m, i) => ({ ...m, num: m.num || i + 1 }));

  const matches = rawMatches.map((m) => {
    const kickoff = parseKickoff(m.date, m.time);
    const t1 = findTeam(m.team1);
    const t2 = findTeam(m.team2);
    return {
      ...m,
      team1: t1 ? t1.name : m.team1,
      team2: t2 ? t2.name : m.team2,
      flag1: t1 ? t1.flag : null,
      flag2: t2 ? t2.flag : null,
      kickoff,
      status: matchStatus(m, kickoff, now)
    };
  });

  const groups = deriveGroups(matches);
  const standings = computeStandings(groups, matches);
  const thirdPlace = thirdPlaceTable(standings);
  const bracket = buildBracket(rawMatches, standings).map(b => {
    const t1 = findTeam(b.team1);
    const t2 = findTeam(b.team2);
    return { ...b, flag1: t1 ? t1.flag : null, flag2: t2 ? t2.flag : null, kickoff: parseKickoff(b.date, b.time) };
  });

  const groupOf = {};
  for (const [g, teamNames] of Object.entries(groups)) for (const n of teamNames) groupOf[n] = g;
  const teams = TEAMS.map(t => ({ name: t.name, code: t.code, flag: t.flag, group: groupOf[t.name] || null }));

  return { generatedAt: new Date(now).toISOString(), name: raw.name || 'FIFA World Cup 2026', teams, groups, standings, thirdPlace, matches, bracket };
}

module.exports = { buildTournament, parseKickoff, matchStatus };
```

- [ ] **Step 5: Write `server.js`**

```js
// server.js
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const { Fetcher } = require('./lib/fetcher');
const { buildTournament } = require('./lib/tournament');
const { getOutrightOdds } = require('./lib/odds');

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
  return http.createServer(async (req, res) => {
    const url = new URL(req.url, 'http://localhost');
    try {
      if (url.pathname === '/api/tournament') {
        return sendJson(res, 200, await buildTournament({ fetcher: f, sourceUrl }));
      }
      if (url.pathname === '/api/odds') {
        return sendJson(res, 200, await getOutrightOdds({ fetcher: f, apiKey: oddsKey }));
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
```

- [ ] **Step 6: Create a placeholder `public/index.html`** (so the static-serve assertion passes; replaced in Task 8)

```html
<!doctype html><meta charset="utf-8"><title>World Cup 2026</title><p>loading…</p>
```

- [ ] **Step 7: Run test to verify it passes**

Run: `node tests/api.test.js`
Expected: `api.test.js OK`

- [ ] **Step 8: Smoke-test against the real upstream**

Run: `node -e "const {Fetcher}=require('./lib/fetcher');const {buildTournament}=require('./lib/tournament');buildTournament({fetcher:new Fetcher({}),sourceUrl:'https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.json'}).then(t=>console.log('matches:',t.matches.length,'groups:',Object.keys(t.groups).length,'teams in groups:',Object.values(t.groups).flat().length))"`
Expected: 12 groups and 48 teams placed in groups. Match count is whatever upstream currently publishes (~80–104). **If teams-in-groups < 48, an openfootball spelling is missing from the alias table in `lib/teams.js` — print `Object.values(t.groups).flat()` against `TEAMS`, add the missing alias, and re-run `node tests/teams.test.js`.**

- [ ] **Step 9: Commit**

```powershell
git add lib/tournament.js server.js tests/api.test.js tests/fixtures/sample.json public/index.html
git commit -m "feat: tournament assembly + HTTP server with /api/tournament and /api/odds"
```

---

### Task 8: Client shell (`public/index.html`, `public/styles.css`)

Six-tab dark UI. No frameworks, no external fonts (flags from flagcdn are the only external assets).

**Files:**
- Modify: `public/index.html` (replace placeholder)
- Create: `public/styles.css`

- [ ] **Step 1: Write `public/index.html`**

```html
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>World Cup 2026 Hub</title>
<link rel="stylesheet" href="styles.css">
</head>
<body>
<header class="topbar">
  <h1>⚽ World Cup 2026</h1>
  <nav class="tabs">
    <button class="tab active" data-view="today">Today</button>
    <button class="tab" data-view="groups">Groups</button>
    <button class="tab" data-view="schedule">Schedule</button>
    <button class="tab" data-view="bracket">Bracket</button>
    <button class="tab" data-view="teams">Teams</button>
    <button class="tab" data-view="stats">Stats</button>
  </nav>
  <div id="data-status" class="data-status">loading…</div>
</header>
<main>
  <section id="view-today" class="view active"></section>
  <section id="view-groups" class="view"></section>
  <section id="view-schedule" class="view"></section>
  <section id="view-bracket" class="view"></section>
  <section id="view-teams" class="view"></section>
  <section id="view-stats" class="view"></section>
</main>
<footer class="footer">
  Fixtures &amp; results: openfootball (public domain) · Odds: <span id="odds-source"></span> · Times shown in your local timezone
</footer>
<script src="app.js"></script>
</body>
</html>
```

- [ ] **Step 2: Write `public/styles.css`**

```css
:root {
  --bg: #0c1220;
  --panel: #141d31;
  --panel-2: #1b2742;
  --line: #2a3a5e;
  --text: #e8edf7;
  --muted: #93a3c4;
  --accent: #38bdf8;
  --gold: #fbbf24;
  --green: #34d399;
  --red: #f87171;
  --radius: 10px;
}
* { box-sizing: border-box; }
body {
  margin: 0;
  background: linear-gradient(180deg, #0a0f1c, var(--bg) 240px);
  color: var(--text);
  font: 15px/1.5 system-ui, "Segoe UI", sans-serif;
}
.topbar {
  display: flex; flex-wrap: wrap; align-items: center; gap: 16px;
  padding: 12px 20px; border-bottom: 1px solid var(--line);
  position: sticky; top: 0; background: rgba(10, 15, 28, .92); backdrop-filter: blur(6px); z-index: 5;
}
.topbar h1 { font-size: 20px; margin: 0; letter-spacing: .5px; }
.tabs { display: flex; gap: 6px; flex-wrap: wrap; }
.tab {
  background: var(--panel); color: var(--muted); border: 1px solid var(--line);
  border-radius: 999px; padding: 6px 16px; cursor: pointer; font: inherit;
  transition: all .35s;
}
.tab:hover { color: var(--text); border-color: var(--accent); }
.tab.active { background: var(--accent); border-color: var(--accent); color: #06243a; font-weight: 600; }
.data-status { margin-left: auto; font-size: 12px; color: var(--muted); }
main { max-width: 1200px; margin: 0 auto; padding: 20px; }
.view { display: none; }
.view.active { display: block; animation: fadein .35s ease; }
@keyframes fadein { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; } }

.card {
  background: var(--panel); border: 1px solid var(--line);
  border-radius: var(--radius); padding: 14px 16px; margin-bottom: 16px;
}
h2 { font-size: 17px; margin: 0 0 10px; }
h3 { font-size: 14px; margin: 0 0 8px; color: var(--muted); text-transform: uppercase; letter-spacing: 1px; }
table { width: 100%; border-collapse: collapse; font-size: 14px; }
th, td { text-align: left; padding: 6px 8px; border-bottom: 1px solid var(--line); white-space: nowrap; }
th { color: var(--muted); font-weight: 500; font-size: 12px; text-transform: uppercase; }
td.num, th.num { text-align: right; }
tr.qualified td:first-child { border-left: 3px solid var(--green); }
tr.eliminated { opacity: .45; }
.flag { width: 22px; height: 15px; border-radius: 2px; vertical-align: -2px; margin-right: 7px; object-fit: cover; }

.countdown { font-size: 34px; font-weight: 700; color: var(--gold); letter-spacing: 2px; font-variant-numeric: tabular-nums; }
.match-row {
  display: flex; align-items: center; gap: 10px; padding: 10px 12px;
  border-bottom: 1px solid var(--line);
}
.match-row:last-child { border-bottom: none; }
.match-team { flex: 1; display: flex; align-items: center; gap: 6px; min-width: 0; }
.match-team.right { justify-content: flex-end; text-align: right; }
.match-score { min-width: 64px; text-align: center; font-weight: 700; font-variant-numeric: tabular-nums; }
.match-meta { color: var(--muted); font-size: 12px; min-width: 130px; }
.chip {
  display: inline-block; font-size: 11px; padding: 1px 8px; border-radius: 999px;
  border: 1px solid var(--line); color: var(--muted);
}
.chip.live { border-color: var(--red); color: var(--red); animation: pulse 1.2s infinite; }
@keyframes pulse { 50% { opacity: .45; } }

.group-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(330px, 1fr)); gap: 16px; }
.filters { display: flex; gap: 10px; margin-bottom: 14px; flex-wrap: wrap; }
.filters input, .filters select {
  background: var(--panel-2); color: var(--text); border: 1px solid var(--line);
  border-radius: 8px; padding: 7px 12px; font: inherit;
}
.day-header { margin: 18px 0 6px; color: var(--gold); font-weight: 600; }

.bracket { display: flex; gap: 14px; overflow-x: auto; padding-bottom: 10px; }
.bracket-round { min-width: 215px; display: flex; flex-direction: column; gap: 10px; }
.bracket-round h3 { position: sticky; top: 0; }
.bracket-match { background: var(--panel-2); border: 1px solid var(--line); border-radius: 8px; padding: 8px 10px; font-size: 13px; }
.bracket-match .slot { display: flex; justify-content: space-between; gap: 8px; padding: 2px 0; }
.bracket-match .slot.placeholder { color: var(--muted); font-style: italic; }
.bracket-match .slot.winner { color: var(--gold); font-weight: 700; }
.bracket-match .meta { color: var(--muted); font-size: 11px; margin-top: 4px; }

.team-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 14px; }
.team-card .odds-line { color: var(--muted); font-size: 13px; }
.team-card .fixtures { margin-top: 8px; font-size: 12.5px; color: var(--muted); }

.stat-strip { display: flex; gap: 14px; flex-wrap: wrap; margin-bottom: 16px; }
.stat { background: var(--panel); border: 1px solid var(--line); border-radius: var(--radius); padding: 10px 18px; }
.stat .big { font-size: 26px; font-weight: 700; color: var(--accent); }
.stat .label { font-size: 12px; color: var(--muted); }
.bar-chart .bar { fill: var(--accent); }
.bar-chart .bar.gold { fill: var(--gold); }
.bar-chart text { fill: var(--text); font-size: 12px; }
.bar-chart .val { fill: var(--muted); }
.footer { text-align: center; color: var(--muted); font-size: 12px; padding: 18px; border-top: 1px solid var(--line); margin-top: 30px; }
@media (max-width: 700px) {
  .data-status { display: none; }
  main { padding: 12px; }
}
```

- [ ] **Step 3: Commit**

```powershell
git add public/index.html public/styles.css
git commit -m "feat: client shell - six-tab dark layout"
```

---

### Task 9: Client core + Today view (`public/app.js`)

Data loading, tab switching, 60-second polling with a **signature guard** (re-render a view only when its data slice changes — prevents the entrance-animation flicker found in uno bug d4a0b76), countdown hero, today's matches.

**Files:**
- Create: `public/app.js`

- [ ] **Step 1: Write the core of `public/app.js`**

```js
'use strict';

const state = { tournament: null, odds: null, view: 'today' };
const sigs = {}; // per-view render signatures: re-render only on change

const $ = (sel) => document.querySelector(sel);
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const flagImg = (flag, name) => flag
  ? `<img class="flag" src="https://flagcdn.com/h24/${flag}.png" alt="" title="${esc(name)}">`
  : '';

function localTime(iso) {
  if (!iso) return 'TBD';
  return new Date(iso).toLocaleString(undefined, {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
  });
}
function localDay(iso) {
  if (!iso) return 'Date TBD';
  return new Date(iso).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
}
function scoreText(m) {
  if (!m.score) return 'vs';
  const s = m.score.ft || m.score.et || m.score.p;
  if (!s) return 'vs';
  let txt = `${s[0]} – ${s[1]}`;
  if (m.score.p) txt += ` (${m.score.p[0]}–${m.score.p[1]} pens)`;
  else if (m.score.et) txt = `${m.score.et[0]} – ${m.score.et[1]} (aet)`;
  return txt;
}
function statusChip(m) {
  if (m.status === 'live') return '<span class="chip live">LIVE</span>';
  if (m.status === 'finished') return '<span class="chip">FT</span>';
  return '';
}
function matchRowHtml(m) {
  return `<div class="match-row">
    <span class="match-meta">${esc(localTime(m.kickoff))}<br>${esc(m.ground || '')}</span>
    <span class="match-team right">${esc(m.team1)} ${flagImg(m.flag1, m.team1)}</span>
    <span class="match-score">${esc(scoreText(m))}</span>
    <span class="match-team">${flagImg(m.flag2, m.team2)} ${esc(m.team2)}</span>
    <span class="chip">${esc(m.group || m.round || '')}</span>
    ${statusChip(m)}
  </div>`;
}

// ---- rendering with signature guards (uno lesson: per-poll innerHTML + CSS animation = flicker) ----
const RENDERERS = {
  today: renderToday,
  groups: renderGroups,
  schedule: renderSchedule,
  bracket: renderBracket,
  teams: renderTeams,
  stats: renderStats
};

function renderAll() {
  if (!state.tournament) return;
  for (const [view, fn] of Object.entries(RENDERERS)) {
    const el = $('#view-' + view);
    const { sig, html } = fn();
    if (sigs[view] !== sig) {
      el.innerHTML = html;
      sigs[view] = sig;
      if (view === 'schedule') wireScheduleFilters();
    }
  }
  $('#data-status').textContent = 'updated ' + new Date().toLocaleTimeString();
  if (state.odds) $('#odds-source').textContent = state.odds.live ? 'live (The Odds API)' : state.odds.source;
}

// ---- Today view ----
function renderToday() {
  const t = state.tournament;
  const now = Date.now();
  const today = new Date().toDateString();
  const todays = t.matches.filter(m => m.kickoff && new Date(m.kickoff).toDateString() === today);
  const next = t.matches
    .filter(m => m.status === 'upcoming' && m.kickoff && Date.parse(m.kickoff) > now)
    .sort((a, b) => Date.parse(a.kickoff) - Date.parse(b.kickoff))[0];

  const sig = JSON.stringify([todays, next && next.num]); // countdown digits update separately
  let html = '';
  if (next) {
    html += `<div class="card">
      <h3>Next kickoff — ${esc(next.team1)} vs ${esc(next.team2)}, ${esc(localTime(next.kickoff))}</h3>
      <div class="countdown" id="countdown" data-kickoff="${esc(next.kickoff)}">--:--:--</div>
    </div>`;
  }
  html += `<div class="card"><h2>Today's matches</h2>${
    todays.length ? todays.map(matchRowHtml).join('') : '<p>No matches today.</p>'
  }</div>`;
  return { sig, html };
}

function tickCountdown() {
  const el = $('#countdown');
  if (!el) return;
  const diff = Date.parse(el.dataset.kickoff) - Date.now();
  if (diff <= 0) { el.textContent = 'KICKOFF!'; return; }
  const h = Math.floor(diff / 3600000);
  const m = Math.floor(diff / 60000) % 60;
  const s = Math.floor(diff / 1000) % 60;
  el.textContent = (h > 23 ? Math.floor(h / 24) + 'd ' : '') +
    String(h % 24).padStart(2, '0') + ':' + String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
}

// ---- data + boot ----
async function refresh() {
  try {
    const [tour, odds] = await Promise.all([
      fetch('/api/tournament').then(r => r.json()),
      state.odds && Date.now() - state.oddsAt < 30 * 60 * 1000
        ? Promise.resolve(state.odds)
        : fetch('/api/odds').then(r => r.json()).then(o => { state.oddsAt = Date.now(); return o; })
    ]);
    state.tournament = tour;
    state.odds = odds;
    renderAll();
  } catch (err) {
    $('#data-status').textContent = 'refresh failed — retrying';
  }
}

document.querySelectorAll('.tab').forEach(btn => {
  btn.addEventListener('click', () => {
    state.view = btn.dataset.view;
    document.querySelectorAll('.tab').forEach(b => b.classList.toggle('active', b === btn));
    document.querySelectorAll('.view').forEach(v => v.classList.toggle('active', v.id === 'view-' + state.view));
  });
});

refresh();
setInterval(refresh, 60 * 1000);
setInterval(tickCountdown, 1000);
```

The view functions `renderGroups`, `renderSchedule`, `renderBracket`, `renderTeams`, `renderStats` and `wireScheduleFilters` are added in Tasks 10–12. To keep this step runnable on its own, temporarily add stubs **at the top of the file, right below `const RENDERERS` requirement — i.e. directly above `function renderAll()`**:

```js
function renderGroups() { return { sig: 'stub', html: '<p>coming in task 10</p>' }; }
function renderSchedule() { return { sig: 'stub', html: '<p>coming in task 11</p>' }; }
function renderBracket() { return { sig: 'stub', html: '<p>coming in task 11</p>' }; }
function renderTeams() { return { sig: 'stub', html: '<p>coming in task 12</p>' }; }
function renderStats() { return { sig: 'stub', html: '<p>coming in task 12</p>' }; }
function wireScheduleFilters() {}
```

- [ ] **Step 2: Verify in the browser**

Run: `npm start` then open http://localhost:3001 — Today tab shows a countdown (kickoff is June 11!) and today's match cards; status line says "updated HH:MM:SS"; no console errors. Leave it open for 2 polls (2 min): the view must NOT flicker or re-animate.

- [ ] **Step 3: Commit**

```powershell
git add public/app.js
git commit -m "feat: client core - polling with signature guards, countdown, Today view"
```

---

### Task 10: Groups view + third-place tracker

**Files:**
- Modify: `public/app.js` (replace the `renderGroups` stub)

- [ ] **Step 1: Replace the `renderGroups` stub with the real implementation**

```js
function renderGroups() {
  const t = state.tournament;
  const sig = JSON.stringify([t.standings, t.thirdPlace]);
  const flagOf = Object.fromEntries(t.teams.map(x => [x.name, x.flag]));

  const groupCards = Object.keys(t.standings).sort().map(g => {
    const { table, complete } = t.standings[g];
    return `<div class="card">
      <h2>${esc(g)} ${complete ? '<span class="chip">complete</span>' : ''}</h2>
      <table><thead><tr>
        <th>Team</th><th class="num">P</th><th class="num">W</th><th class="num">D</th>
        <th class="num">L</th><th class="num">GF</th><th class="num">GA</th><th class="num">GD</th><th class="num">Pts</th>
      </tr></thead><tbody>${
        table.map((r, i) => `<tr class="${complete && i < 2 ? 'qualified' : ''}">
          <td>${flagImg(flagOf[r.team], r.team)}${esc(r.team)}</td>
          <td class="num">${r.played}</td><td class="num">${r.won}</td><td class="num">${r.drawn}</td>
          <td class="num">${r.lost}</td><td class="num">${r.gf}</td><td class="num">${r.ga}</td>
          <td class="num">${r.gd > 0 ? '+' : ''}${r.gd}</td><td class="num"><b>${r.points}</b></td>
        </tr>`).join('')
      }</tbody></table>
    </div>`;
  }).join('');

  const thirds = `<div class="card">
    <h2>Third-place race <span class="chip">best 8 of 12 advance</span></h2>
    <table><thead><tr>
      <th>#</th><th>Team</th><th>Group</th><th class="num">Pts</th><th class="num">GD</th><th class="num">GF</th>
    </tr></thead><tbody>${
      t.thirdPlace.map((r, i) => `<tr class="${r.qualified ? 'qualified' : 'eliminated'}">
        <td>${i + 1}</td>
        <td>${flagImg(flagOf[r.team], r.team)}${esc(r.team)}</td>
        <td>${esc(r.group.replace('Group ', ''))}</td>
        <td class="num"><b>${r.points}</b></td>
        <td class="num">${r.gd > 0 ? '+' : ''}${r.gd}</td><td class="num">${r.gf}</td>
      </tr>`).join('')
    }</tbody></table>
  </div>`;

  return { sig, html: `<div class="group-grid">${groupCards}</div>${thirds}` };
}
```

- [ ] **Step 2: Verify in the browser**

Reload http://localhost:3001 → Groups tab: 12 group tables (A–L, 4 teams each, flags showing) + third-place table with 12 rows, top 8 green-edged. Before any results all rows show 0s — correct.

- [ ] **Step 3: Commit**

```powershell
git add public/app.js
git commit -m "feat: groups view with 12 tables and best-8 third-place tracker"
```

---

### Task 11: Schedule + Bracket views

**Files:**
- Modify: `public/app.js` (replace the `renderSchedule`, `wireScheduleFilters`, `renderBracket` stubs)

- [ ] **Step 1: Replace the `renderSchedule` and `wireScheduleFilters` stubs**

```js
const scheduleFilter = { text: '', stage: 'all' };

function renderSchedule() {
  const t = state.tournament;
  const txt = scheduleFilter.text.toLowerCase();
  const matches = t.matches.filter(m => {
    if (scheduleFilter.stage === 'group' && !m.group) return false;
    if (scheduleFilter.stage === 'knockout' && m.group) return false;
    if (txt && !(`${m.team1} ${m.team2} ${m.ground || ''} ${m.group || ''} ${m.round || ''}`.toLowerCase().includes(txt))) return false;
    return true;
  });
  const sig = JSON.stringify([matches, scheduleFilter]);

  const byDay = new Map();
  for (const m of matches) {
    const day = localDay(m.kickoff);
    if (!byDay.has(day)) byDay.set(day, []);
    byDay.get(day).push(m);
  }
  const days = [...byDay.entries()].map(([day, list]) =>
    `<div class="day-header">${esc(day)}</div><div class="card">${list.map(matchRowHtml).join('')}</div>`
  ).join('');

  const html = `<div class="filters">
      <input id="sched-text" type="search" placeholder="Filter by team, venue, group…" value="${esc(scheduleFilter.text)}">
      <select id="sched-stage">
        <option value="all" ${scheduleFilter.stage === 'all' ? 'selected' : ''}>All stages</option>
        <option value="group" ${scheduleFilter.stage === 'group' ? 'selected' : ''}>Group stage</option>
        <option value="knockout" ${scheduleFilter.stage === 'knockout' ? 'selected' : ''}>Knockouts</option>
      </select>
    </div>${days || '<div class="card"><p>No matches match the filter.</p></div>'}`;
  return { sig, html };
}

function wireScheduleFilters() {
  const txt = $('#sched-text');
  const stage = $('#sched-stage');
  if (!txt) return;
  txt.addEventListener('input', () => { scheduleFilter.text = txt.value; sigs.schedule = null; renderAll(); requestAnimationFrame(() => { const e = $('#sched-text'); e.focus(); e.setSelectionRange(e.value.length, e.value.length); }); });
  stage.addEventListener('change', () => { scheduleFilter.stage = stage.value; sigs.schedule = null; renderAll(); });
}
```

- [ ] **Step 2: Replace the `renderBracket` stub**

```js
const ROUND_ORDER = ['Round of 32', 'Round of 16', 'Quarter-finals', 'Semi-finals', 'Match for third place', 'Final'];

function renderBracket() {
  const t = state.tournament;
  const sig = JSON.stringify(t.bracket);
  if (!t.bracket.length) {
    return { sig, html: '<div class="card"><p>Knockout fixtures appear here once the data source publishes them.</p></div>' };
  }
  // group by round; order known rounds first, then any others in appearance order
  const rounds = new Map();
  for (const m of t.bracket) {
    if (!rounds.has(m.round)) rounds.set(m.round, []);
    rounds.get(m.round).push(m);
  }
  const ordered = [...rounds.keys()].sort((a, b) => {
    const ia = ROUND_ORDER.indexOf(a), ib = ROUND_ORDER.indexOf(b);
    return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
  });

  const winnerName = (m) => {
    if (!m.score) return null;
    const s = m.score.p || m.score.et || m.score.ft;
    return s && s[0] !== s[1] ? (s[0] > s[1] ? m.team1 : m.team2) : null;
  };

  const cols = ordered.map(round => `<div class="bracket-round">
    <h3>${esc(round)}</h3>${
    rounds.get(round).map(m => {
      const w = winnerName(m);
      const slot = (team, flag, resolved) =>
        `<div class="slot ${resolved ? '' : 'placeholder'} ${w === team ? 'winner' : ''}">
          <span>${flagImg(flag, team)}${esc(team)}</span><span>${esc(slotScore(m, team))}</span>
        </div>`;
      return `<div class="bracket-match">
        ${slot(m.team1, m.flag1, m.resolved1)}
        ${slot(m.team2, m.flag2, m.resolved2)}
        <div class="meta">${esc(localTime(m.kickoff))} · ${esc(m.ground || '')}</div>
      </div>`;
    }).join('')
  }</div>`).join('');

  return { sig, html: `<div class="bracket">${cols}</div>` };
}

function slotScore(m, team) {
  if (!m.score) return '';
  const s = m.score.p || m.score.et || m.score.ft;
  if (!s) return '';
  return team === m.team1 ? s[0] : s[1];
}
```

- [ ] **Step 3: Verify in the browser**

Reload → Schedule tab: matches grouped by local-time day headers, filter box narrows live (type "mexico"), stage dropdown works. Bracket tab: columns per round; unresolved slots (e.g. `1A`, `3C/3D/3E/3F`) render italic/muted.

- [ ] **Step 4: Commit**

```powershell
git add public/app.js
git commit -m "feat: schedule view with filters + knockout bracket view"
```

---

### Task 12: Teams + Stats views (odds, probabilities, charts)

**Files:**
- Modify: `public/app.js` (replace the `renderTeams` and `renderStats` stubs)

- [ ] **Step 1: Replace the `renderTeams` stub**

```js
function renderTeams() {
  const t = state.tournament;
  const odds = state.odds;
  const sig = JSON.stringify([t.teams, t.matches.length, odds && odds.fetchedAt, odds && odds.entries.length]);
  const oddsByTeam = odds ? Object.fromEntries(odds.entries.map((e, i) => [e.team, { ...e, rank: i + 1 }])) : {};

  const cards = [...t.teams]
    .sort((a, b) => (oddsByTeam[a.name]?.rank ?? 99) - (oddsByTeam[b.name]?.rank ?? 99))
    .map(team => {
      const o = oddsByTeam[team.name];
      const fixtures = t.matches
        .filter(m => m.group && (m.team1 === team.name || m.team2 === team.name))
        .map(m => `${esc(localTime(m.kickoff))} — ${esc(m.team1)} ${esc(scoreText(m))} ${esc(m.team2)}`)
        .join('<br>');
      return `<div class="card team-card">
        <h2>${flagImg(team.flag, team.name)}${esc(team.name)} <span class="chip">${esc(team.group || 'TBD')}</span></h2>
        <div class="odds-line">${o
          ? `#${o.rank} favourite · ${(o.prob * 100).toFixed(1)}% win probability · ${o.decimal.toFixed(o.decimal < 20 ? 2 : 0)} decimal odds`
          : 'odds unavailable'}</div>
        <div class="fixtures">${fixtures || 'Fixtures TBD'}</div>
      </div>`;
    }).join('');

  return { sig, html: `<div class="team-grid">${cards}</div>` };
}
```

- [ ] **Step 2: Replace the `renderStats` stub** (SVG bar charts hand-rolled, no library)

```js
function svgBarChart(rows, { valueLabel }) {
  // rows: [{ label, value, display, gold? }]
  const W = 720, rowH = 26, pad = 4;
  const H = rows.length * rowH + pad * 2;
  const max = Math.max(...rows.map(r => r.value), 1e-9);
  const labelW = 170, valW = 70, barMax = W - labelW - valW - 20;
  const bars = rows.map((r, i) => {
    const y = pad + i * rowH;
    const w = Math.max(2, (r.value / max) * barMax);
    return `<text x="${labelW - 6}" y="${y + 17}" text-anchor="end">${esc(r.label)}</text>
      <rect class="bar ${r.gold ? 'gold' : ''}" x="${labelW}" y="${y + 4}" width="${w}" height="${rowH - 9}" rx="3"></rect>
      <text class="val" x="${labelW + w + 8}" y="${y + 17}">${esc(r.display)}</text>`;
  }).join('');
  return `<svg class="bar-chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(valueLabel)}">${bars}</svg>`;
}

function renderStats() {
  const t = state.tournament;
  const odds = state.odds;
  const finished = t.matches.filter(m => m.status === 'finished' && m.score && m.score.ft);
  const sig = JSON.stringify([finished.length, odds && odds.fetchedAt, odds && odds.entries.slice(0, 3)]);

  // tournament totals
  let goals = 0, biggest = null;
  for (const m of finished) {
    const [a, b] = m.score.ft;
    goals += a + b;
    const margin = Math.abs(a - b);
    if (!biggest || margin > biggest.margin) biggest = { margin, text: `${m.team1} ${a}–${b} ${m.team2}` };
  }
  const strip = `<div class="stat-strip">
    <div class="stat"><div class="big">${finished.length}</div><div class="label">matches played</div></div>
    <div class="stat"><div class="big">${goals}</div><div class="label">goals</div></div>
    <div class="stat"><div class="big">${finished.length ? (goals / finished.length).toFixed(2) : '—'}</div><div class="label">goals / match</div></div>
    <div class="stat"><div class="big">${biggest ? esc(biggest.text) : '—'}</div><div class="label">biggest win</div></div>
  </div>`;

  // win probability chart (top 15)
  let probChart = '<div class="card"><p>Odds loading…</p></div>';
  if (odds) {
    const rows = odds.entries.slice(0, 15).map((e, i) => ({
      label: e.team, value: e.prob, display: (e.prob * 100).toFixed(1) + '%', gold: i === 0
    }));
    probChart = `<div class="card">
      <h2>Win probability <span class="chip">${odds.live ? 'live bookmaker average' : 'snapshot: ' + esc(odds.source)}</span></h2>
      ${svgBarChart(rows, { valueLabel: 'Win probability' })}
    </div>`;
  }

  // goals by round
  const byRound = new Map();
  for (const m of finished) {
    const key = m.group ? m.round : m.round; // Matchday 1..3 / knockout round names
    byRound.set(key, (byRound.get(key) || 0) + m.score.ft[0] + m.score.ft[1]);
  }
  const goalsChart = byRound.size
    ? `<div class="card"><h2>Goals by round</h2>${svgBarChart(
        [...byRound.entries()].map(([label, value]) => ({ label, value, display: String(value) })),
        { valueLabel: 'Goals by round' }
      )}</div>`
    : '';

  // full odds table
  let oddsTable = '';
  if (odds) {
    const flagOf = Object.fromEntries(t.teams.map(x => [x.name, x.flag]));
    oddsTable = `<div class="card"><h2>Outright winner odds — all 48 teams</h2>
      <table><thead><tr><th>#</th><th>Team</th><th class="num">Decimal odds</th><th class="num">Implied prob.</th></tr></thead>
      <tbody>${odds.entries.map((e, i) =>
        `<tr><td>${i + 1}</td><td>${flagImg(flagOf[e.team], e.team)}${esc(e.team)}</td>
         <td class="num">${e.decimal.toFixed(2)}</td><td class="num">${(e.prob * 100).toFixed(2)}%</td></tr>`
      ).join('')}</tbody></table></div>`;
  }

  return { sig, html: strip + probChart + goalsChart + oddsTable };
}
```

- [ ] **Step 3: Verify in the browser**

Reload → Stats tab: stat strip (0 matches before kickoff — fine), win-probability bar chart with Spain ~13–14% on top (gold bar), full 48-row odds table with flags. Teams tab: 48 cards sorted by favourite rank, each with group chip, probability line, and its three group fixtures in local time.

- [ ] **Step 4: Run the full test suite**

Run: `npm test`
Expected: all six `OK` lines, exit code 0.

- [ ] **Step 5: Commit**

```powershell
git add public/app.js
git commit -m "feat: teams view + stats view with win-probability and goals charts"
```

---

### Task 13: End-to-end verification, README, preview config

**Files:**
- Create: `README.md`
- Modify: `C:\Users\sahil\.claude\launch.json` (add preview entry)

- [ ] **Step 1: Full test suite**

Run: `npm test`
Expected: `fetcher.test.js OK`, `teams.test.js OK`, `odds.test.js OK`, `standings.test.js OK`, `bracket.test.js OK`, `api.test.js OK`.

- [ ] **Step 2: Live verification with preview tooling**

Add a `"worldcup"` entry to the user-level `C:\Users\sahil\.claude\launch.json` (alongside the existing `"uno-cabinet"` and `"aba"` entries — modify, don't overwrite):

```json
{
  "name": "worldcup",
  "command": "npm start",
  "cwd": "c:/Users/sahil/worldcup",
  "url": "http://localhost:3001"
}
```

Then `preview_start` → walk all six tabs with `preview_snapshot`; check `preview_console_logs` for errors; wait 2 polling cycles on the Today tab and confirm no DOM flicker (tag a node via `preview_eval`, confirm it persists — same technique that verified uno d4a0b76). `preview_screenshot` of Groups, Bracket, and Stats as proof.

- [ ] **Step 3: Write `README.md`**

```markdown
# World Cup 2026 Hub

Self-hosted dashboard for the 2026 FIFA World Cup: live group tables, third-place
race, knockout bracket, full schedule in your local timezone, and win
probabilities from real bookmaker odds.

## Run

    npm start          # http://localhost:3001

Optional live odds (free key from https://the-odds-api.com):

    $env:ODDS_API_KEY = "yourkey"; npm start

Without a key the site uses a bundled real-odds snapshot (DraftKings, 2026-06-05).

## Data sources

- Fixtures & results: openfootball/worldcup.json (public domain, no key, cached 5 min)
- Live odds: The Odds API, `soccer_fifa_world_cup_winner` outrights (cached 6 h)

## Tests

    npm test
```

- [ ] **Step 4: Final commit**

```powershell
git add README.md
git commit -m "docs: README with run instructions and data source notes"
```

---

## Self-Review (completed)

- **Spec coverage:** team info from real APIs ✓ (openfootball + Odds API + team registry), group points ✓ (Task 5/10), full bracket ✓ (Task 6/11), schedule per game ✓ (Task 11), winning odds with real data ✓ (Task 4/12 — live API or real DraftKings snapshot), data shown ✓ (Task 12 charts/stat strip), brainstormed features ✓ (header list: countdown, third-place tracker, local-time, filters; future ideas listed).
- **Placeholder scan:** none — every code step has complete code; the only "stubs" are explicitly created and then replaced by named tasks (9 → 10/11/12).
- **Type consistency:** `Fetcher#get(url, ttlMs)` used identically in odds/tournament/server; standings rows `{team, played, won, drawn, lost, gf, ga, gd, points}` consumed by `thirdPlaceTable`, `buildBracket` (`table[i].team`), and `renderGroups`; bracket items `{num, round, date, time, ground, team1, team2, resolved1, resolved2, score}` consumed by `renderBracket`; `/api/odds` shape `{live, source, fetchedAt, entries:[{team, decimal, prob}]}` consumed by `renderTeams`/`renderStats`. Checked.
