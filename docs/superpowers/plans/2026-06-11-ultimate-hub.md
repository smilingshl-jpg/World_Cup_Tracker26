# Ultimate World Cup 2026 Hub Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (inline — user has explicitly declined subagents) to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade the shipped v0.1 hub to the approved "ultimate" design: ink-broadcast restyle driven by team kit colors, two-wing TV bracket with Pick'em, Monte Carlo simulator, Golden Boot, Venues tab, WC history, qualification scenarios, and a news ticker.

**Architecture:** Approach 1 from the spec (`docs/superpowers/specs/2026-06-11-ultimate-hub-design.md`): grow the zero-dependency Node ≥18 + vanilla stack. New server libs (`sim.js, scorers.js, scenarios.js, news.js`), three static data files, two new endpoints (`/api/simulation`, `/api/news`), and the client split from one `app.js` into `public/js/` ES modules. Existing signature-guard polling and plain-assert tests retained.

**Tech Stack:** Node ≥18 built-ins only; vanilla ES modules in the browser; hand-rolled SVG/CSS; flagcdn images; BBC Football RSS (no key).

**Working state:** repo at `c:\Users\sahil\worldcup`, clean at 9e82c4a, all 6 existing suites green. The site must stay runnable after every task.

---

### Task 1: Static data + integrity tests (colors, history, stadiums)

**Files:**
- Create: `data/team-colors.json`, `data/wc-history.json`, `data/stadiums.json`
- Modify: `lib/tournament.js` (attach `colors` + `history` to teams)
- Test: `tests/data.test.js`; Modify: `package.json` (test script)

- [ ] **Step 1: Write `data/team-colors.json`** (canonical names → 2–3 kit hexes)

```json
{
  "Algeria": ["#006233", "#d21034", "#ffffff"],
  "Argentina": ["#75aadb", "#ffffff", "#f6b40e"],
  "Australia": ["#ffcd00", "#00843d"],
  "Austria": ["#ed2939", "#ffffff"],
  "Belgium": ["#e30613", "#000000", "#fdda24"],
  "Bosnia and Herzegovina": ["#002f6c", "#fecb00"],
  "Brazil": ["#ffdf00", "#009c3b", "#002776"],
  "Canada": ["#d80621", "#ffffff"],
  "Cape Verde": ["#003893", "#cf2027", "#f7d116"],
  "Colombia": ["#fcd116", "#003893", "#ce1126"],
  "Côte d'Ivoire": ["#f77f00", "#009e60", "#ffffff"],
  "Croatia": ["#ff0000", "#ffffff", "#171796"],
  "Curaçao": ["#002b7f", "#f9e814"],
  "Czechia": ["#d7141a", "#11457e", "#ffffff"],
  "DR Congo": ["#007fff", "#ce1021", "#f7d618"],
  "Ecuador": ["#ffdd00", "#034ea2", "#ed1c24"],
  "Egypt": ["#ce1126", "#000000", "#ffffff"],
  "England": ["#ffffff", "#cf081f", "#001489"],
  "France": ["#002654", "#ffffff", "#ed2939"],
  "Germany": ["#000000", "#dd0000", "#ffce00"],
  "Ghana": ["#ce1126", "#fcd116", "#006b3f"],
  "Haiti": ["#00209f", "#d21034"],
  "Iran": ["#ffffff", "#239f40", "#da0000"],
  "Iraq": ["#007a3d", "#ce1126", "#ffffff"],
  "Japan": ["#002984", "#e60012"],
  "Jordan": ["#ce1126", "#007a3d", "#000000"],
  "Mexico": ["#006847", "#ce1126", "#ffffff"],
  "Morocco": ["#c1272d", "#006233"],
  "Netherlands": ["#ff6600", "#21468b"],
  "New Zealand": ["#000000", "#ffffff"],
  "Norway": ["#ba0c2f", "#00205b", "#ffffff"],
  "Panama": ["#da121a", "#072357", "#ffffff"],
  "Paraguay": ["#d52b1e", "#ffffff", "#0038a8"],
  "Portugal": ["#a4161a", "#046a38", "#ffd700"],
  "Qatar": ["#8a1538", "#ffffff"],
  "Saudi Arabia": ["#006c35", "#ffffff"],
  "Scotland": ["#0065bf", "#ffffff"],
  "Senegal": ["#00853f", "#fdef42", "#e31b23"],
  "South Africa": ["#007a4d", "#ffb612", "#000000"],
  "South Korea": ["#cd2e3a", "#0047a0"],
  "Spain": ["#aa151b", "#f1bf00"],
  "Sweden": ["#006aa7", "#fecc02"],
  "Switzerland": ["#da291c", "#ffffff"],
  "Tunisia": ["#e70013", "#ffffff"],
  "Türkiye": ["#e30a17", "#ffffff"],
  "United States": ["#002868", "#bf0a30", "#ffffff"],
  "Uruguay": ["#7bafd4", "#000000", "#ffffff"],
  "Uzbekistan": ["#0099b5", "#ce1126", "#ffffff"]
}
```

- [ ] **Step 2: Write `data/wc-history.json`** (curated; appearances include 2026)

```json
{
  "Algeria": { "titles": 0, "appearances": 5, "bestFinish": "Round of 16 (2014)" },
  "Argentina": { "titles": 3, "appearances": 19, "bestFinish": "Champions (1978, 1986, 2022)" },
  "Australia": { "titles": 0, "appearances": 7, "bestFinish": "Round of 16 (2006, 2022)" },
  "Austria": { "titles": 0, "appearances": 8, "bestFinish": "Third place (1954)" },
  "Belgium": { "titles": 0, "appearances": 15, "bestFinish": "Third place (2018)" },
  "Bosnia and Herzegovina": { "titles": 0, "appearances": 2, "bestFinish": "Group stage (2014)" },
  "Brazil": { "titles": 5, "appearances": 23, "bestFinish": "Champions (1958, 1962, 1970, 1994, 2002)" },
  "Canada": { "titles": 0, "appearances": 3, "bestFinish": "Group stage (1986, 2022)" },
  "Cape Verde": { "titles": 0, "appearances": 1, "bestFinish": "Debut" },
  "Colombia": { "titles": 0, "appearances": 7, "bestFinish": "Quarter-finals (2014)" },
  "Côte d'Ivoire": { "titles": 0, "appearances": 4, "bestFinish": "Group stage" },
  "Croatia": { "titles": 0, "appearances": 7, "bestFinish": "Runners-up (2018)" },
  "Curaçao": { "titles": 0, "appearances": 1, "bestFinish": "Debut" },
  "Czechia": { "titles": 0, "appearances": 10, "bestFinish": "Runners-up (1934, 1962, as Czechoslovakia)" },
  "DR Congo": { "titles": 0, "appearances": 2, "bestFinish": "Group stage (1974, as Zaire)" },
  "Ecuador": { "titles": 0, "appearances": 5, "bestFinish": "Round of 16 (2006)" },
  "Egypt": { "titles": 0, "appearances": 4, "bestFinish": "Group stage" },
  "England": { "titles": 1, "appearances": 17, "bestFinish": "Champions (1966)" },
  "France": { "titles": 2, "appearances": 17, "bestFinish": "Champions (1998, 2018)" },
  "Germany": { "titles": 4, "appearances": 21, "bestFinish": "Champions (1954, 1974, 1990, 2014)" },
  "Ghana": { "titles": 0, "appearances": 5, "bestFinish": "Quarter-finals (2010)" },
  "Haiti": { "titles": 0, "appearances": 2, "bestFinish": "Group stage (1974)" },
  "Iran": { "titles": 0, "appearances": 7, "bestFinish": "Group stage" },
  "Iraq": { "titles": 0, "appearances": 2, "bestFinish": "Group stage (1986)" },
  "Japan": { "titles": 0, "appearances": 8, "bestFinish": "Round of 16 (2002, 2010, 2018, 2022)" },
  "Jordan": { "titles": 0, "appearances": 1, "bestFinish": "Debut" },
  "Mexico": { "titles": 0, "appearances": 18, "bestFinish": "Quarter-finals (1970, 1986)" },
  "Morocco": { "titles": 0, "appearances": 7, "bestFinish": "Fourth place (2022)" },
  "Netherlands": { "titles": 0, "appearances": 12, "bestFinish": "Runners-up (1974, 1978, 2010)" },
  "New Zealand": { "titles": 0, "appearances": 3, "bestFinish": "Group stage (2010, unbeaten)" },
  "Norway": { "titles": 0, "appearances": 4, "bestFinish": "Round of 16 (1998)" },
  "Panama": { "titles": 0, "appearances": 2, "bestFinish": "Group stage (2018)" },
  "Paraguay": { "titles": 0, "appearances": 9, "bestFinish": "Quarter-finals (2010)" },
  "Portugal": { "titles": 0, "appearances": 9, "bestFinish": "Third place (1966)" },
  "Qatar": { "titles": 0, "appearances": 2, "bestFinish": "Group stage (2022)" },
  "Saudi Arabia": { "titles": 0, "appearances": 7, "bestFinish": "Round of 16 (1994)" },
  "Scotland": { "titles": 0, "appearances": 9, "bestFinish": "Group stage" },
  "Senegal": { "titles": 0, "appearances": 4, "bestFinish": "Quarter-finals (2002)" },
  "South Africa": { "titles": 0, "appearances": 4, "bestFinish": "Group stage" },
  "South Korea": { "titles": 0, "appearances": 12, "bestFinish": "Fourth place (2002)" },
  "Spain": { "titles": 1, "appearances": 17, "bestFinish": "Champions (2010)" },
  "Sweden": { "titles": 0, "appearances": 13, "bestFinish": "Runners-up (1958)" },
  "Switzerland": { "titles": 0, "appearances": 13, "bestFinish": "Quarter-finals (1934, 1938, 1954)" },
  "Tunisia": { "titles": 0, "appearances": 7, "bestFinish": "Group stage" },
  "Türkiye": { "titles": 0, "appearances": 3, "bestFinish": "Third place (2002)" },
  "United States": { "titles": 0, "appearances": 12, "bestFinish": "Third place (1930)" },
  "Uruguay": { "titles": 2, "appearances": 15, "bestFinish": "Champions (1930, 1950)" },
  "Uzbekistan": { "titles": 0, "appearances": 1, "bestFinish": "Debut" }
}
```

- [ ] **Step 3: Write `data/stadiums.json`** (`grounds` lists every spelling that may appear in match data's `ground` field; first entry is display label key)

```json
[
  { "grounds": ["Mexico City"], "stadium": "Estadio Azteca", "city": "Mexico City", "country": "Mexico", "capacity": 87523 },
  { "grounds": ["Guadalajara", "Zapopan"], "stadium": "Estadio Akron", "city": "Guadalajara", "country": "Mexico", "capacity": 49850 },
  { "grounds": ["Monterrey", "Guadalupe"], "stadium": "Estadio BBVA", "city": "Monterrey", "country": "Mexico", "capacity": 53500 },
  { "grounds": ["Toronto"], "stadium": "BMO Field", "city": "Toronto", "country": "Canada", "capacity": 45736 },
  { "grounds": ["Vancouver"], "stadium": "BC Place", "city": "Vancouver", "country": "Canada", "capacity": 54500 },
  { "grounds": ["Atlanta"], "stadium": "Mercedes-Benz Stadium", "city": "Atlanta", "country": "United States", "capacity": 71000 },
  { "grounds": ["Boston", "Foxborough"], "stadium": "Gillette Stadium", "city": "Boston", "country": "United States", "capacity": 65878 },
  { "grounds": ["Dallas", "Arlington"], "stadium": "AT&T Stadium", "city": "Dallas", "country": "United States", "capacity": 80000 },
  { "grounds": ["Houston"], "stadium": "NRG Stadium", "city": "Houston", "country": "United States", "capacity": 72220 },
  { "grounds": ["Kansas City"], "stadium": "Arrowhead Stadium", "city": "Kansas City", "country": "United States", "capacity": 76416 },
  { "grounds": ["Los Angeles", "Inglewood"], "stadium": "SoFi Stadium", "city": "Los Angeles", "country": "United States", "capacity": 70240 },
  { "grounds": ["Miami", "Miami Gardens"], "stadium": "Hard Rock Stadium", "city": "Miami", "country": "United States", "capacity": 64767 },
  { "grounds": ["New York/New Jersey", "New York", "East Rutherford", "New Jersey"], "stadium": "MetLife Stadium", "city": "New York / New Jersey", "country": "United States", "capacity": 82500 },
  { "grounds": ["Philadelphia"], "stadium": "Lincoln Financial Field", "city": "Philadelphia", "country": "United States", "capacity": 69796 },
  { "grounds": ["San Francisco", "San Francisco Bay Area", "Santa Clara"], "stadium": "Levi's Stadium", "city": "San Francisco Bay Area", "country": "United States", "capacity": 68500 },
  { "grounds": ["Seattle"], "stadium": "Lumen Field", "city": "Seattle", "country": "United States", "capacity": 68740 }
]
```

- [ ] **Step 4: Write the failing test `tests/data.test.js`**

```js
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

// tournament payload exposes colors + history on team objects
(async () => {
  const fs = require('fs');
  const path = require('path');
  const { buildTournament } = require('../lib/tournament');
  const fixture = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'sample.json'), 'utf8'));
  const t = await buildTournament({ fetcher: { get: async () => fixture }, sourceUrl: 'x' });
  const mex = t.teams.find(x => x.name === 'Mexico');
  assert.deepStrictEqual(mex.colors, ['#006847', '#ce1126', '#ffffff']);
  assert.strictEqual(mex.history.bestFinish, 'Quarter-finals (1970, 1986)');
  console.log('data.test.js OK');
})().catch(e => { console.error(e); process.exit(1); });
```

- [ ] **Step 5: Run to verify it fails** — `node tests/data.test.js` → FAIL (`Cannot find module '../data/team-colors.json'`)

- [ ] **Step 6: Wire colors+history into `lib/tournament.js`** — add requires at top and extend the `teams` mapping:

```js
const COLORS = require('../data/team-colors.json');
const HISTORY = require('../data/wc-history.json');
```

and replace the `teams` line in `buildTournament` with:

```js
  const teams = TEAMS.map(t => ({
    name: t.name, code: t.code, flag: t.flag, group: groupOf[t.name] || null,
    colors: COLORS[t.name] || null, history: HISTORY[t.name] || null
  }));
```

- [ ] **Step 7: Add `node tests/data.test.js` to the `test` script in `package.json`** (append `&& node tests/data.test.js`).

- [ ] **Step 8: Run** `node tests/data.test.js` → `data.test.js OK`; then `npm test` → all green.

- [ ] **Step 9: Smoke vs live data** — print any grounds in the live feed not covered by stadiums.json:

Run: `node -e "const {Fetcher}=require('./lib/fetcher');const {buildTournament}=require('./lib/tournament');const st=require('./data/stadiums.json');const known=new Set(st.flatMap(s=>s.grounds));buildTournament({fetcher:new Fetcher({}),sourceUrl:'https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.json'}).then(t=>{const g=[...new Set(t.matches.map(m=>m.ground).filter(Boolean))];console.log('unmatched:',g.filter(x=>!known.has(x)))})"`
Expected: `unmatched: []`. If not empty, add each printed string to the right stadium's `grounds` array and re-run `node tests/data.test.js`.

- [ ] **Step 10: Commit** — `git add -A; git commit -m "feat: team colors, WC history, stadium data + integrity tests"`

---

### Task 2: Golden Boot (`lib/scorers.js`)

**Files:** Create `lib/scorers.js` · Test `tests/scorers.test.js` · Modify `package.json`

- [ ] **Step 1: Failing test**

```js
// tests/scorers.test.js
'use strict';
const assert = require('assert');
const { goldenBoot, matchScorers } = require('../lib/scorers');

const matches = [
  { team1: 'Mexico', team2: 'Qatar', score: { ft: [2, 1] },
    goals1: [{ name: 'R. Jiménez', minute: 12 }, { name: 'R. Jiménez', minute: 55, penalty: true }],
    goals2: [{ name: 'Akram Afif', minute: 80 }] },
  { team1: 'Spain', team2: 'France', score: { ft: [1, 1] },
    goals1: [{ player: 'Lamine Yamal', minute: 30 }],            // alt field name
    goals2: [{ name: 'K. Mbappé' }] },                            // missing minute
  { team1: 'Ghana', team2: 'Egypt', score: { ft: [1, 0] },
    goals1: [{ name: 'M. Salah', minute: 9, owngoal: true }] },   // own goal: excluded from boot
  { team1: 'Japan', team2: 'Iran' }                               // unplayed: ignored
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
```

- [ ] **Step 2: Run** → FAIL (module not found)

- [ ] **Step 3: Implement**

```js
// lib/scorers.js
'use strict';

// openfootball goal item: { name|player, minute?, offset?, penalty?, owngoal? }
// Parser is deliberately tolerant: exact 2026 field names unverified until first results land.
function normGoal(g) {
  if (!g || typeof g !== 'object') return null;
  const name = g.name || g.player;
  if (!name) return null;
  return {
    name: String(name),
    minute: Number.isFinite(g.minute) ? g.minute : null,
    penalty: !!g.penalty,
    owngoal: !!g.owngoal
  };
}

function matchScorers(m) {
  const parse = (arr) => (Array.isArray(arr) ? arr.map(normGoal).filter(Boolean) : []);
  return { team1: parse(m.goals1), team2: parse(m.goals2) };
}

// Leaderboard across all matches. Own goals never count for the scorer.
function goldenBoot(matches) {
  const tally = new Map(); // "player|team" -> entry
  for (const m of matches) {
    const { team1, team2 } = matchScorers(m);
    for (const [goals, team] of [[team1, m.team1], [team2, m.team2]]) {
      for (const g of goals) {
        if (g.owngoal) continue;
        const key = g.name + '|' + team;
        const e = tally.get(key) || { player: g.name, team, goals: 0, penalties: 0 };
        e.goals++;
        if (g.penalty) e.penalties++;
        tally.set(key, e);
      }
    }
  }
  return [...tally.values()].sort((a, b) => b.goals - a.goals || a.penalties - b.penalties || a.player.localeCompare(b.player));
}

module.exports = { goldenBoot, matchScorers };
```

- [ ] **Step 4: Run** → `scorers.test.js OK`. Append `&& node tests/scorers.test.js` to the test script. `npm test` green.
- [ ] **Step 5: Commit** — `git add -A; git commit -m "feat: golden boot aggregation from openfootball scorer arrays"`

---

### Task 3: Qualification scenarios (`lib/scenarios.js`)

**Files:** Create `lib/scenarios.js` · Modify `lib/tournament.js` (attach `scenarios`) · Test `tests/scenarios.test.js` · Modify `package.json`

- [ ] **Step 1: Failing test**

```js
// tests/scenarios.test.js
'use strict';
const assert = require('assert');
const { computeStandings, thirdPlaceTable } = require('../lib/standings');
const { allScenarios } = require('../lib/scenarios');

// Group with one match left per team: W(6pts) X(4) Y(1) Z(4); remaining W-Y and X-Z.
const groups = { 'Group A': ['W', 'X', 'Y', 'Z'] };
const matches = [
  { group: 'Group A', team1: 'W', team2: 'X', score: { ft: [1, 0] } },
  { group: 'Group A', team1: 'Y', team2: 'Z', score: { ft: [1, 1] } },
  { group: 'Group A', team1: 'W', team2: 'Z', score: { ft: [2, 0] } },
  { group: 'Group A', team1: 'X', team2: 'Y', score: { ft: [3, 0] } },
  { group: 'Group A', team1: 'W', team2: 'Y' },  // unplayed
  { group: 'Group A', team1: 'X', team2: 'Z' }   // unplayed
];
const standings = computeStandings(groups, matches);
const thirds = thirdPlaceTable(standings);
const sc = allScenarios(groups, standings, matches, thirds);
const a = sc['Group A'];
assert.strictEqual(a.active, true, 'final matchday -> active');
assert.strictEqual(a.teams['W'].status, 'THROUGH', 'W top-2 in all 9 combos');
assert.strictEqual(a.teams['Y'].status, '3RD-RACE', 'Y can reach 3rd but never top-2');
assert.ok(['ALIVE', 'THROUGH'].includes(a.teams['X'].status) === false || true);
assert.strictEqual(a.teams['X'].status, 'ALIVE');
assert.strictEqual(a.teams['Z'].status, 'ALIVE');
assert.ok(typeof a.teams['W'].note === 'string');

// group with 2 matches remaining per team -> inactive
const g2 = { 'Group B': ['P', 'Q', 'R', 'S'] };
const m2 = [
  { group: 'Group B', team1: 'P', team2: 'Q', score: { ft: [1, 0] } },
  { group: 'Group B', team1: 'R', team2: 'S', score: { ft: [0, 0] } },
  { group: 'Group B', team1: 'P', team2: 'R' }, { group: 'Group B', team1: 'Q', team2: 'S' },
  { group: 'Group B', team1: 'P', team2: 'S' }, { group: 'Group B', team1: 'Q', team2: 'R' }
];
const s2 = computeStandings(g2, m2);
assert.strictEqual(allScenarios(g2, s2, m2, [])['Group B'].active, false);

// complete group -> inactive
const done = computeStandings(groups, matches.map(m => m.score ? m : { ...m, score: { ft: [1, 0] } }));
assert.strictEqual(allScenarios(groups, done, matches.map(m => m.score ? m : { ...m, score: { ft: [1, 0] } }), [])['Group A'].active, false);

console.log('scenarios.test.js OK');
```

Check the W case is right: W has 6pts; rivals X,Z max 7?? X has 3pts? Recompute: X beat Y 3-0 (3pts) and lost to W (0) = 3pts, plays Z. Z: lost W, drew Y = 1pt, plays X. Y: drew Z, lost X = 1pt, plays W. So W=6, X=3, Y=1, Z=1. If W loses to Y: W=6, Y=4; X-Z winner gets 6 or both 4 on draw. Positions: W can be caught by X or Z (6) but never by both AND Y(4)<6 — W always ≥2nd ✓ THROUGH. Y: max 4pts → can Y be top2? If W beats Y and X-Z draw: X=4,Z=2 → 2nd is X(4) vs Y(1)... Y loses → Y 4th-ish. If Y beats W: Y=4; X-Z draw → X=4, Z=2: order W6, then X4/Y4 by gd (X has +3 vs Y's...). Y gd: 1-1, 0-3, 1-0 → gf2 ga4 -2. X gd: 0-1,3-0,1-1 → +2. So X 2nd, Y 3rd. If Z beats X: Z=4, X=3: W6, then Y4 vs Z4: Z gd: 0-2,1-1,1-0 → 0... Y -2 → Z 2nd, Y 3rd. So Y never top-2, can be 3rd ✓ 3RD-RACE. X: wins vs Z → 6pts 2nd ✓ ALIVE. Z: wins vs X → 4pts; could Z be top2? W6 1st; X3, Y max 4 (if beats W): Z4 vs Y4: Z gd +1 (0-2,1-1,2-1→ gf3 ga4 -1)... hmm depends on synthetic scores. The enumerator uses [1,0]/[1,1]/[0,1] synthetic margins. Z wins X 1-0: Z pts4 gd 0-2,1-1,1-0 → gf2 ga3 = -1. Y beats W 1-0: Y gd 1-1,0-3,1-0 → -2. Z 2nd ✓ ALIVE. With Y losing/drawing, Y≤2pts... wait Y drew Z, lost X = 1pt + result vs W. Fine — Z reaches top-2 in at least one combo ✓.

- [ ] **Step 2: Run** → FAIL

- [ ] **Step 3: Implement**

```js
// lib/scenarios.js
'use strict';
const { computeStandings } = require('./standings');

const OUTCOMES = [[1, 0], [1, 1], [0, 1]]; // synthetic win/draw/loss scores

// One group: enumerate remaining-match outcomes (active only when <=1 left per team
// and the group is unfinished). Cross-group third-place math is NOT enumerated.
function groupScenarios(groupName, teamNames, standing, matches, thirdPlace) {
  const groupMatches = matches.filter(m => m.group === groupName);
  const remaining = groupMatches.filter(m => !(m.score && m.score.ft));
  if (standing.complete || remaining.length === 0) return { active: false, teams: {} };

  const remainingPerTeam = new Map(teamNames.map(t => [t, 0]));
  for (const m of remaining) {
    for (const t of [m.team1, m.team2]) {
      if (remainingPerTeam.has(t)) remainingPerTeam.set(t, remainingPerTeam.get(t) + 1);
    }
  }
  if ([...remainingPerTeam.values()].some(n => n > 1)) return { active: false, teams: {} };

  // enumerate 3^remaining combos (<=9)
  const positions = new Map(teamNames.map(t => [t, new Set()]));
  const winsThrough = new Map(teamNames.map(t => [t, true])); // "if I win my match, am I always top-2?"
  const combos = Math.pow(3, remaining.length);
  for (let c = 0; c < combos; c++) {
    let x = c;
    const synth = remaining.map(m => {
      const o = OUTCOMES[x % 3]; x = Math.floor(x / 3);
      return { ...m, score: { ft: o } };
    });
    const played = groupMatches.filter(m => m.score && m.score.ft);
    const table = computeStandings({ [groupName]: teamNames }, [...played, ...synth])[groupName].table;
    table.forEach((row, i) => positions.get(row.team).add(i + 1));
    // track "wins -> through"
    for (const sm of synth) {
      const winner = sm.score.ft[0] > sm.score.ft[1] ? sm.team1 : sm.score.ft[0] < sm.score.ft[1] ? sm.team2 : null;
      for (const t of [sm.team1, sm.team2]) {
        if (t !== winner && winner !== null) continue;
      }
    }
    for (const t of teamNames) {
      const myMatch = synth.find(m => m.team1 === t || m.team2 === t);
      if (!myMatch) continue;
      const ft = myMatch.score.ft;
      const won = (myMatch.team1 === t && ft[0] > ft[1]) || (myMatch.team2 === t && ft[1] > ft[0]);
      if (won) {
        const pos = table.findIndex(r => r.team === t) + 1;
        if (pos > 2) winsThrough.set(t, false);
      }
    }
  }

  const cutoff = thirdPlace.length >= 8 ? thirdPlace[7] : null;
  const teams = {};
  for (const t of teamNames) {
    const pos = positions.get(t);
    const canTop2 = pos.has(1) || pos.has(2);
    const alwaysTop2 = ![...pos].some(p => p > 2);
    const canThird = pos.has(3);
    let status, note;
    if (alwaysTop2) { status = 'THROUGH'; note = 'Qualified for the knockouts'; }
    else if (canTop2) {
      status = 'ALIVE';
      note = winsThrough.get(t) && remainingPerTeam.get(t) === 1 ? 'Wins and is through' : 'Needs a win and help';
    } else if (canThird) {
      status = '3RD-RACE';
      note = cutoff ? `Best finish 3rd — current cut: ${cutoff.points} pts (depends on other groups)` : 'Best finish 3rd (depends on other groups)';
    } else { status = 'OUT'; note = 'Cannot finish above 4th'; }
    teams[t] = { status, note };
  }
  return { active: true, teams };
}

function allScenarios(groups, standings, matches, thirdPlace) {
  const out = {};
  for (const [g, teamNames] of Object.entries(groups)) {
    out[g] = groupScenarios(g, teamNames, standings[g], matches, thirdPlace);
  }
  return out;
}

module.exports = { allScenarios, groupScenarios };
```

Note: remove the dead inner `for...continue` block during implementation (artifact above); the `winsThrough` logic is the per-team loop that follows it.

- [ ] **Step 4: Attach to payload** — in `lib/tournament.js`: `const { allScenarios } = require('./scenarios');`, then after `thirdPlace` is computed add `const scenarios = allScenarios(groups, standings, matches, thirdPlace);` and include `scenarios` in the returned object.
- [ ] **Step 5: Run** test → OK; append to npm test; `npm test` green.
- [ ] **Step 6: Commit** — `git commit -am "feat: final-matchday qualification scenarios"`

---

### Task 4: Monte Carlo simulator (`lib/sim.js` + `/api/simulation`)

**Files:** Create `lib/sim.js` · Modify `server.js`, `lib/bracket.js` (expose raw refs), `package.json` · Test `tests/sim.test.js`

- [ ] **Step 1: Expose raw slot refs from `lib/bracket.js`** — in the returned object of `buildBracket`, add `ref1: m.team1, ref2: m.team2` (the raw, unresolved strings) alongside the resolved `team1/team2`. Update nothing else; existing tests still pass (additive).

- [ ] **Step 2: Failing test**

```js
// tests/sim.test.js
'use strict';
const assert = require('assert');
const { simulate, mulberry32 } = require('../lib/sim');

// seeded rng determinism
const r1 = mulberry32(7), r2 = mulberry32(7);
assert.strictEqual(r1(), r2());

// tiny synthetic cup: one group of 4, winner & runner-up meet pre-decided KO pair in semis
const groups = { 'Group A': ['Alpha', 'Beta', 'Gamma', 'Delta'] };
const matches = [
  { num: 1, group: 'Group A', round: 'Matchday 1', team1: 'Alpha', team2: 'Beta' },
  { num: 2, group: 'Group A', round: 'Matchday 1', team1: 'Gamma', team2: 'Delta' },
  { num: 3, group: 'Group A', round: 'Matchday 2', team1: 'Alpha', team2: 'Gamma' },
  { num: 4, group: 'Group A', round: 'Matchday 2', team1: 'Beta', team2: 'Delta' },
  { num: 5, group: 'Group A', round: 'Matchday 3', team1: 'Alpha', team2: 'Delta' },
  { num: 6, group: 'Group A', round: 'Matchday 3', team1: 'Beta', team2: 'Gamma' },
  { num: 7, round: 'Semi-final', team1: '1A', team2: '2A' },
  { num: 8, round: 'Final', team1: 'W7', team2: 'W7' } // degenerate but exercises W refs
];
const odds = [
  { team: 'Alpha', prob: 0.70 }, { team: 'Beta', prob: 0.15 },
  { team: 'Gamma', prob: 0.10 }, { team: 'Delta', prob: 0.05 }
];
const out = simulate({ matches, groups, oddsEntries: odds, iterations: 2000, seed: 42 });
assert.strictEqual(out.iterations, 2000);
const A = out.teams['Alpha'], D = out.teams['Delta'];
assert.ok(A.champion > D.champion, 'stronger team wins more');
for (const t of Object.values(out.teams)) {
  for (const k of ['champion']) assert.ok(t[k] >= 0 && t[k] <= 1);
}
const champSum = Object.values(out.teams).reduce((s, t) => s + t.champion, 0);
assert.ok(Math.abs(champSum - 1) < 1e-9, 'champion probs sum to 1');
// determinism
const out2 = simulate({ matches, groups, oddsEntries: odds, iterations: 2000, seed: 42 });
assert.strictEqual(out2.teams['Alpha'].champion, A.champion);

console.log('sim.test.js OK');
```

- [ ] **Step 3: Run** → FAIL

- [ ] **Step 4: Implement `lib/sim.js`**

```js
// lib/sim.js
'use strict';
const { findTeam } = require('./teams');
const { computeStandings, thirdPlaceTable } = require('./standings');

function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const DRAW_SHARE = 0.24; // group games
const STAGE_OF_ROUND = (round) => {
  const r = String(round || '').toLowerCase();
  if (r.includes('32')) return 'r32';
  if (r.includes('16')) return 'r16';
  if (r.startsWith('quarter')) return 'qf';
  if (r.startsWith('semi')) return 'sf';
  if (r.includes('third')) return null; // 3rd-place match doesn't define progression
  if (r === 'final') return 'final';
  return null;
};
const STAGES = ['r32', 'r16', 'qf', 'sf', 'final', 'champion'];

function decisive(m) { return m.score && (m.score.p || m.score.et || m.score.ft) || null; }

// matches: raw match list (with num); groups: {name:[teams]}; oddsEntries: [{team, prob}]
function simulate({ matches, groups, oddsEntries, iterations = 10000, seed = 1 }) {
  const rng = mulberry32(seed);
  const strength = new Map(oddsEntries.map(e => [e.team, Math.max(e.prob, 1e-4)]));
  const sOf = (t) => strength.get(t) || 1e-4;
  const bt = (a, b) => sOf(a) / (sOf(a) + sOf(b));

  const groupMatches = matches.filter(m => m.group);
  const koMatches = matches.filter(m => !m.group).sort((a, b) => a.num - b.num);
  const counts = {}; // team -> stage -> n
  const bump = (team, stage) => {
    if (!team || !stage) return;
    const c = (counts[team] = counts[team] || { r32: 0, r16: 0, qf: 0, sf: 0, final: 0, champion: 0 });
    c[stage]++;
  };

  for (let it = 0; it < iterations; it++) {
    // 1. complete the group stage
    const simGroup = groupMatches.map(m => {
      if (m.score && m.score.ft) return m;
      const r = rng();
      const pA = (1 - DRAW_SHARE) * bt(m.team1, m.team2);
      const ft = r < pA ? [1, 0] : r < pA + DRAW_SHARE ? [1, 1] : [0, 1];
      return { ...m, score: { ft } };
    });
    const standings = computeStandings(groups, simGroup);
    const thirdsQ = thirdPlaceTable(standings).filter(t => t.qualified).map(t => t.team);

    // 2. knockout
    const winners = new Map(); // num -> team
    const losers = new Map();
    let thirdIdx = 0;
    const resolve = (ref) => {
      if (!ref) return null;
      const direct = findTeam(ref);
      if (direct) return direct.name;
      let m;
      if ((m = /^([12])([A-L])$/.exec(ref))) {
        const g = standings['Group ' + m[2]];
        return g && g.table[+m[1] - 1] ? g.table[+m[1] - 1].team : null;
      }
      if ((m = /^W(\d+)$/.exec(ref))) return winners.get(+m[1]) || null;
      if ((m = /^L(\d+)$/.exec(ref))) return losers.get(+m[1]) || null;
      if (/^3/.test(ref)) return thirdsQ[thirdIdx++] || null; // documented simplification
      // synthetic-test team names that aren't real countries:
      return groups && Object.values(groups).some(arr => arr.includes(ref)) ? ref : null;
    };

    let champion = null;
    for (const m of koMatches) {
      const t1 = resolve(m.team1), t2 = resolve(m.team2);
      const stage = STAGE_OF_ROUND(m.round);
      bump(t1, stage); bump(t2, stage);
      let w, l;
      const real = decisive(m);
      if (real && real[0] !== real[1]) {
        w = real[0] > real[1] ? t1 : t2; l = w === t1 ? t2 : t1;
      } else if (t1 && t2) {
        w = rng() < bt(t1, t2) ? t1 : t2; l = w === t1 ? t2 : t1;
      } else { w = t1 || t2 || null; l = null; }
      winners.set(m.num, w); losers.set(m.num, l);
      if (stage === 'final') champion = w;
    }
    bump(champion, 'champion');
  }

  const teams = {};
  for (const [team, c] of Object.entries(counts)) {
    teams[team] = {};
    for (const s of STAGES) teams[team][s] = c[s] / iterations;
  }
  return { iterations, seed, model: 'Bradley-Terry on de-vigged outright odds', teams };
}

module.exports = { simulate, mulberry32 };
```

Note on synthetic-test names: `resolve` falls back to accepting a ref that literally matches a group-listed team name even if `findTeam` doesn't know it — this keeps the module testable with synthetic teams, same trick as `lib/standings.js` `canon()`.

- [ ] **Step 5: Run** → `sim.test.js OK`; append to npm test.

- [ ] **Step 6: Add `/api/simulation` to `server.js`** — imports: `const { simulate } = require('./lib/sim');` and inside `createServer` before `http.createServer`, add a tiny cache, then the route:

```js
  let simCache = { key: '', body: null };
```

route (place beside the other /api routes):

```js
      if (url.pathname === '/api/simulation') {
        const t = await buildTournament({ fetcher: f, sourceUrl });
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
```

- [ ] **Step 7: Verify live** — `Invoke-RestMethod http://localhost:3001/api/simulation` (restart server first): returns 48 rows, Spain near top, champion column sums ≈ 1.
- [ ] **Step 8: `npm test` green → Commit** — `git commit -am "feat: Monte Carlo tournament simulator + /api/simulation"`

---

### Task 5: News ticker backend (`lib/news.js` + `/api/news`)

**Files:** Create `lib/news.js` · Modify `server.js`, `package.json` · Test `tests/news.test.js`

- [ ] **Step 1: Failing test**

```js
// tests/news.test.js
'use strict';
const assert = require('assert');
const { parseRss, makeNewsSource } = require('../lib/news');

const xml = `<?xml version="1.0"?><rss><channel>
<item><title><![CDATA[Spain cruise past rivals]]></title><link>https://bbc.co.uk/1</link><pubDate>Thu, 11 Jun 2026 10:00:00 GMT</pubDate></item>
<item><title>Mexico &amp; the opening night</title><link>https://bbc.co.uk/2</link><pubDate>Thu, 11 Jun 2026 09:00:00 GMT</pubDate></item>
</channel></rss>`;

const items = parseRss(xml);
assert.strictEqual(items.length, 2);
assert.strictEqual(items[0].title, 'Spain cruise past rivals');
assert.strictEqual(items[1].title, 'Mexico & the opening night');
assert.strictEqual(items[0].link, 'https://bbc.co.uk/1');
assert.ok(items[0].pubDate.includes('2026'));

(async () => {
  let calls = 0;
  const src = makeNewsSource({
    fetchImpl: async () => { calls++; return { ok: true, text: async () => xml }; },
    ttlMs: 60000
  });
  const a = await src.get();
  assert.strictEqual(a.items.length, 2);
  await src.get();
  assert.strictEqual(calls, 1, 'cached within ttl');

  const bad = makeNewsSource({ fetchImpl: async () => { throw new Error('down'); }, ttlMs: 0 });
  const b = await bad.get();
  assert.deepStrictEqual(b.items, [], 'failure -> empty items, no throw');
  console.log('news.test.js OK');
})().catch(e => { console.error(e); process.exit(1); });
```

- [ ] **Step 2: Run** → FAIL

- [ ] **Step 3: Implement**

```js
// lib/news.js
'use strict';

const FEED_URL = 'http://feeds.bbci.co.uk/sport/football/rss.xml';
const MAX_ITEMS = 12;

function decodeEntities(s) {
  return s
    .replace(/<!\[CDATA\[(.*?)\]\]>/gs, '$1')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .trim();
}

function tag(block, name) {
  const m = new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`, 'i').exec(block);
  return m ? decodeEntities(m[1]) : '';
}

function parseRss(xml) {
  const items = [];
  const re = /<item[\s>][\s\S]*?<\/item>/gi;
  let m;
  while ((m = re.exec(xml)) && items.length < MAX_ITEMS) {
    const title = tag(m[0], 'title');
    const link = tag(m[0], 'link');
    if (title && link) items.push({ title, link, pubDate: tag(m[0], 'pubDate') });
  }
  return items;
}

// Own in-memory cache (Fetcher is JSON-only; RSS is text).
function makeNewsSource({ fetchImpl = globalThis.fetch, url = FEED_URL, ttlMs = 15 * 60 * 1000 } = {}) {
  let cache = { fetchedAt: 0, items: [] };
  return {
    async get() {
      if (Date.now() - cache.fetchedAt < ttlMs && cache.items.length) return { ...cache };
      try {
        const res = await fetchImpl(url, { headers: { 'user-agent': 'worldcup2026-hub' } });
        if (!res.ok) throw new Error('HTTP ' + res.status);
        cache = { fetchedAt: Date.now(), items: parseRss(await res.text()) };
      } catch {
        // keep stale items if we have them; otherwise empty
        if (!cache.items.length) cache = { fetchedAt: 0, items: [] };
      }
      return { ...cache };
    }
  };
}

module.exports = { parseRss, makeNewsSource, FEED_URL };
```

- [ ] **Step 4: Wire `/api/news` in `server.js`** — `const { makeNewsSource } = require('./lib/news');`; inside `createServer`: `const news = makeNewsSource({});`; route:

```js
      if (url.pathname === '/api/news') {
        const n = await news.get();
        return sendJson(res, 200, { items: n.items, fetchedAt: n.fetchedAt || null });
      }
```

- [ ] **Step 5: Run test → OK; append to npm test; verify live** `Invoke-RestMethod http://localhost:3001/api/news` returns headlines (or empty if offline — both fine).
- [ ] **Step 6: Commit** — `git commit -am "feat: BBC football news ticker endpoint"`

---

### Task 6: Broadcast restyle (styles.css rewrite + index.html shell)

**Files:** Rewrite `public/styles.css` · Rewrite `public/index.html` (ticker strip, Venues tab, module script)

- [ ] **Step 1: Rewrite `public/index.html`**

```html
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>World Cup 26 — The Hub</title>
<link rel="stylesheet" href="styles.css">
</head>
<body>
<header class="topbar">
  <h1 class="wordmark"><span class="stripe"></span>WORLD CUP <em>26</em></h1>
  <nav class="tabs">
    <button class="tab active" data-view="today">Today</button>
    <button class="tab" data-view="groups">Groups</button>
    <button class="tab" data-view="schedule">Schedule</button>
    <button class="tab" data-view="bracket">Bracket</button>
    <button class="tab" data-view="teams">Teams</button>
    <button class="tab" data-view="stats">Stats</button>
    <button class="tab" data-view="venues">Venues</button>
  </nav>
  <div id="data-status" class="data-status">loading…</div>
</header>
<div id="ticker" class="ticker" hidden><div class="ticker-label">NEWS</div><div class="ticker-track" id="ticker-track"></div></div>
<main>
  <section id="view-today" class="view active"></section>
  <section id="view-groups" class="view"></section>
  <section id="view-schedule" class="view"></section>
  <section id="view-bracket" class="view"></section>
  <section id="view-teams" class="view"></section>
  <section id="view-stats" class="view"></section>
  <section id="view-venues" class="view"></section>
</main>
<footer class="footer">
  Fixtures &amp; results: openfootball (public domain) · Odds: <span id="odds-source"></span> · News: BBC Sport · Times in your local timezone
</footer>
<script type="module" src="js/main.js"></script>
</body>
</html>
```

- [ ] **Step 2: Rewrite `public/styles.css`** (full file)

```css
:root {
  --ink: #14181d;
  --panel: #1d242c;
  --panel-2: #232b35;
  --line: #2d3742;
  --text: #f6f1e7;
  --muted: #9aa3b2;
  --gold: #fde68a;
  --teal: #14b8a6;
  --red: #dc2626;
  --green: #22c55e;
}
* { box-sizing: border-box; }
body {
  margin: 0;
  background: var(--ink);
  color: var(--text);
  font: 15px/1.5 system-ui, "Segoe UI", sans-serif;
}
.display, h1, h2, .tab, .match-score, .stat .big, .countdown, .bracket-match {
  font-family: "Arial Black", "Segoe UI Black", Arial, sans-serif;
}

/* ---- broadcast title bar ---- */
.topbar {
  display: flex; flex-wrap: wrap; align-items: center; gap: 18px;
  padding: 10px 20px; border-bottom: 3px solid var(--teal);
  position: sticky; top: 0; background: #0e1115; z-index: 5;
}
.wordmark { font-size: 21px; margin: 0; font-style: italic; letter-spacing: -0.5px; display: flex; align-items: center; gap: 10px; }
.wordmark em { font-style: italic; color: var(--red); }
.wordmark .stripe { display: inline-block; width: 14px; height: 26px; background: var(--teal); transform: skewX(-18deg); }
.tabs { display: flex; gap: 2px; flex-wrap: wrap; }
.tab {
  background: transparent; color: var(--muted); border: none; border-bottom: 3px solid transparent;
  padding: 8px 14px 5px; cursor: pointer; font-size: 13px; font-style: italic;
  text-transform: uppercase; letter-spacing: .5px; transition: color .35s, border-color .35s;
}
.tab:hover { color: var(--text); }
.tab.active { color: var(--text); border-bottom-color: var(--red); }
.data-status { margin-left: auto; font-size: 11px; color: var(--muted); letter-spacing: 1px; }

/* ---- news ticker ---- */
.ticker { display: flex; align-items: stretch; background: #0a0d10; border-bottom: 1px solid var(--line); overflow: hidden; }
.ticker-label { background: var(--red); color: var(--text); font-size: 10px; font-weight: 700; letter-spacing: 2px; padding: 4px 10px; display: flex; align-items: center; flex: none; }
.ticker-track { display: flex; gap: 48px; white-space: nowrap; padding: 4px 0; animation: tick 60s linear infinite; }
.ticker:hover .ticker-track { animation-play-state: paused; }
.ticker-track a { color: var(--muted); text-decoration: none; font-size: 12px; }
.ticker-track a:hover { color: var(--gold); }
.ticker-track a::before { content: "▪ "; color: var(--teal); }
@keyframes tick { from { transform: translateX(100vw); } to { transform: translateX(-100%); } }

main { max-width: 1280px; margin: 0 auto; padding: 20px; }
.view { display: none; }
.view.active { display: block; animation: fadein .35s ease; }
@keyframes fadein { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; } }

.card { background: var(--panel); border: 1px solid var(--line); padding: 14px 16px; margin-bottom: 16px; }
h2 { font-size: 16px; margin: 0 0 10px; font-style: italic; text-transform: uppercase; letter-spacing: .5px; }
h3, .label { font-size: 11px; margin: 0 0 8px; color: var(--gold); text-transform: uppercase; letter-spacing: 2px; font-weight: 600; }
table { width: 100%; border-collapse: collapse; font-size: 14px; }
th, td { text-align: left; padding: 6px 8px; border-bottom: 1px solid var(--line); white-space: nowrap; }
th { color: var(--muted); font-weight: 500; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; }
td.num, th.num { text-align: right; font-variant-numeric: tabular-nums; }
tr.eliminated { opacity: .45; }
.flag { width: 22px; height: 15px; vertical-align: -2px; margin-right: 7px; object-fit: cover; }

/* team kit accents */
.kit-row td:first-child { border-left: 4px solid var(--kit, var(--line)); }
.kit-stripe { height: 4px; width: 100%; margin-top: 4px; }
tr.qualified td:first-child { box-shadow: inset 8px 0 0 -4px var(--green); }

/* chips */
.chip { display: inline-block; font-size: 10px; padding: 1px 8px; border: 1px solid var(--line); color: var(--muted); letter-spacing: 1px; text-transform: uppercase; }
.chip.live { border-color: var(--red); color: var(--red); animation: pulse 1.2s infinite; }
.chip.through { border-color: var(--green); color: var(--green); }
.chip.out { border-color: var(--line); color: var(--muted); }
.chip.alive { border-color: var(--gold); color: var(--gold); }
.chip.race { border-color: var(--teal); color: var(--teal); }
@keyframes pulse { 50% { opacity: .45; } }

/* ---- versus banner match rows ---- */
.vs-row { position: relative; display: flex; align-items: center; margin: 6px 0; min-height: 46px; background: var(--panel-2); overflow: hidden; }
.vs-row .side { position: absolute; top: 0; bottom: 0; width: 42%; }
.vs-row .side.l { left: 0; background: linear-gradient(105deg, var(--c1) 70%, transparent 100%); }
.vs-row .side.r { right: 0; background: linear-gradient(255deg, var(--c2) 70%, transparent 100%); }
.vs-row .side::after { content: ""; position: absolute; inset: 0; background: rgba(10, 13, 16, .55); }
.vs-row .inner { position: relative; display: flex; align-items: center; gap: 10px; width: 100%; padding: 6px 12px; z-index: 1; }
.vs-row .t { flex: 1; display: flex; align-items: center; gap: 7px; font-weight: 700; min-width: 0; }
.vs-row .t.r { justify-content: flex-end; text-align: right; }
.vs-row .match-score { min-width: 70px; text-align: center; background: var(--ink); border: 1px solid var(--line); padding: 3px 8px; font-size: 15px; }
.vs-row .meta { position: absolute; right: 8px; bottom: -1px; font-size: 9px; color: var(--muted); letter-spacing: 1px; }
.match-meta { color: var(--muted); font-size: 11px; min-width: 120px; letter-spacing: .5px; }
details.scorers { margin: -2px 0 8px; }
details.scorers summary { cursor: pointer; font-size: 11px; color: var(--muted); letter-spacing: 1px; }
details.scorers .goals { display: flex; gap: 24px; font-size: 12.5px; color: var(--muted); padding: 6px 12px; }
.countdown { font-size: 36px; color: var(--gold); letter-spacing: 2px; font-variant-numeric: tabular-nums; font-style: italic; }

.group-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 16px; }
.scenario-note { font-size: 12px; color: var(--muted); margin-top: 8px; }
.filters { display: flex; gap: 10px; margin-bottom: 14px; flex-wrap: wrap; }
.filters input, .filters select { background: var(--panel-2); color: var(--text); border: 1px solid var(--line); padding: 7px 12px; font: inherit; }
.day-header { margin: 18px 0 6px; color: var(--gold); font-weight: 700; font-style: italic; text-transform: uppercase; letter-spacing: 1px; }

/* ---- two-wing TV bracket ---- */
.bracket2 { display: grid; grid-template-columns: repeat(9, minmax(150px, 1fr)); gap: 8px; overflow-x: auto; padding-bottom: 10px; }
.bracket2 .round-col { display: flex; flex-direction: column; justify-content: space-around; gap: 8px; min-width: 150px; }
.bracket2 .round-col > .label { text-align: center; }
.bracket-match { background: var(--panel-2); border: 1px solid var(--line); padding: 6px 8px; font-size: 12px; }
.bracket-match.final-match { border: 2px solid var(--gold); padding: 10px; }
.bracket-match .slot { display: flex; justify-content: space-between; gap: 6px; padding: 3px 4px; border-left: 3px solid var(--kit, transparent); cursor: default; }
.bracket-match .slot.pickable { cursor: pointer; }
.bracket-match .slot.pickable:hover { background: rgba(253, 230, 138, .12); }
.bracket-match .slot.placeholder { color: var(--muted); font-style: italic; font-family: system-ui; }
.bracket-match .slot.winner { color: var(--gold); }
.bracket-match .slot.picked { outline: 1px solid var(--teal); }
.bracket-match .meta { color: var(--muted); font-size: 9px; margin-top: 3px; letter-spacing: 1px; font-family: system-ui; }
.bracket-flat { display: flex; gap: 14px; overflow-x: auto; padding-bottom: 10px; }
.bracket-flat .round-col { min-width: 210px; display: flex; flex-direction: column; gap: 10px; }
.bracket-toolbar { display: flex; gap: 10px; align-items: center; margin-bottom: 14px; flex-wrap: wrap; }
.mode-btn { background: var(--panel-2); border: 1px solid var(--line); color: var(--muted); padding: 5px 14px; cursor: pointer; font: inherit; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; }
.mode-btn.active { border-color: var(--teal); color: var(--teal); }
.pick-score { font-size: 12px; color: var(--gold); letter-spacing: 1px; }

.team-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 14px; }
.team-card .odds-line, .team-card .hist-line, .team-card .sim-line { color: var(--muted); font-size: 12.5px; margin-top: 3px; }
.team-card .hist-line .stars { color: var(--gold); letter-spacing: 2px; }
.team-card .fixtures { margin-top: 8px; font-size: 12px; color: var(--muted); }

.stat-strip { display: flex; gap: 14px; flex-wrap: wrap; margin-bottom: 16px; }
.stat { background: var(--panel); border: 1px solid var(--line); border-top: 3px solid var(--teal); padding: 10px 18px; }
.stat .big { font-size: 26px; color: var(--text); font-style: italic; }
.stat .label { font-size: 10px; }
.bar-chart .bar { fill: var(--teal); }
.bar-chart .bar.gold { fill: var(--gold); }
.bar-chart text { fill: var(--text); font-size: 12px; }
.bar-chart .val { fill: var(--muted); }

.venue-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(330px, 1fr)); gap: 16px; }
.venue-card .cap { color: var(--muted); font-size: 12px; }

.footer { text-align: center; color: var(--muted); font-size: 11px; padding: 18px; border-top: 1px solid var(--line); margin-top: 30px; letter-spacing: .5px; }
@media (max-width: 700px) { .data-status { display: none; } main { padding: 12px; } }
```

- [ ] **Step 3:** The site is now broken (no `js/main.js` yet) — that's expected mid-restructure; Task 7 restores it. Don't commit yet; Tasks 6+7 commit together.

---

### Task 7: Client module split + Today (versus banners) + ticker

**Files:** Create `public/js/state.js`, `public/js/format.js`, `public/js/ticker.js`, `public/js/today.js`, `public/js/main.js` · Delete `public/app.js`

- [ ] **Step 1: `public/js/state.js`**

```js
export const state = { tournament: null, odds: null, sim: null, view: 'today', oddsAt: 0, simAt: 0 };
export const sigs = {}; // per-view render signatures
export function colorsOf(team) {
  const t = state.tournament && state.tournament.teams.find(x => x.name === team);
  return (t && t.colors) || ['#2d3742', '#2d3742'];
}
export function teamMap() {
  const m = {};
  if (state.tournament) for (const t of state.tournament.teams) m[t.name] = t;
  return m;
}
```

- [ ] **Step 2: `public/js/format.js`**

```js
export const $ = (sel) => document.querySelector(sel);
export const esc = (s) => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
export const flagImg = (flag, name) => flag
  ? `<img class="flag" src="https://flagcdn.com/h24/${flag}.png" alt="" title="${esc(name)}">`
  : '';

export function localTime(iso) {
  if (!iso) return 'TBD';
  return new Date(iso).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}
export function localDay(iso) {
  if (!iso) return 'Date TBD';
  return new Date(iso).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
}
export function scoreText(m) {
  if (!m.score) return 'vs';
  const s = m.score.ft || m.score.et || m.score.p;
  if (!s) return 'vs';
  let txt = `${s[0]} – ${s[1]}`;
  if (m.score.p) txt += ` (${m.score.p[0]}–${m.score.p[1]}p)`;
  else if (m.score.et) txt = `${m.score.et[0]} – ${m.score.et[1]} aet`;
  return txt;
}
export function statusChip(m) {
  if (m.status === 'live') return '<span class="chip live">LIVE</span>';
  if (m.status === 'finished') return '<span class="chip">FT</span>';
  return '';
}
export function kitStripe(colors) {
  if (!colors || !colors.length) return '';
  const n = colors.length;
  const stops = colors.map((c, i) => `${c} ${(i / n) * 100}% ${((i + 1) / n) * 100}%`).join(', ');
  return `<div class="kit-stripe" style="background:linear-gradient(90deg, ${stops});"></div>`;
}
// Versus banner row (feature B). colorsOf: (team) => [hex,...]
export function vsRow(m, colorsOf, extraHtml = '') {
  const c1 = colorsOf(m.team1)[0], c2 = colorsOf(m.team2)[0];
  return `<div class="vs-row" style="--c1:${c1};--c2:${c2};">
    <div class="side l"></div><div class="side r"></div>
    <div class="inner">
      <span class="match-meta">${esc(localTime(m.kickoff))}<br>${esc(m.ground || '')}</span>
      <span class="t r">${esc(m.team1)} ${flagImg(m.flag1, m.team1)}</span>
      <span class="match-score">${esc(scoreText(m))}</span>
      <span class="t">${flagImg(m.flag2, m.team2)} ${esc(m.team2)}</span>
      <span class="chip">${esc(m.group || m.round || '')}</span>
      ${statusChip(m)}
    </div>
  </div>${extraHtml}`;
}
export function svgBarChart(rows, valueLabel) {
  const W = 720, rowH = 26, pad = 4;
  const H = rows.length * rowH + pad * 2;
  const max = Math.max(...rows.map(r => r.value), 1e-9);
  const labelW = 170, valW = 70, barMax = W - labelW - valW - 20;
  const bars = rows.map((r, i) => {
    const y = pad + i * rowH;
    const w = Math.max(2, (r.value / max) * barMax);
    return `<text x="${labelW - 6}" y="${y + 17}" text-anchor="end">${esc(r.label)}</text>
      <rect class="bar ${r.gold ? 'gold' : ''}" x="${labelW}" y="${y + 4}" width="${w}" height="${rowH - 9}" rx="2"></rect>
      <text class="val" x="${labelW + w + 8}" y="${y + 17}">${esc(r.display)}</text>`;
  }).join('');
  return `<svg class="bar-chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(valueLabel)}">${bars}</svg>`;
}
```

- [ ] **Step 3: `public/js/ticker.js`**

```js
import { $, esc } from './format.js';

export async function refreshTicker() {
  try {
    const { items } = await fetch('/api/news').then(r => r.json());
    const el = $('#ticker'), track = $('#ticker-track');
    if (!items || !items.length) { el.hidden = true; return; }
    track.innerHTML = items.map(i =>
      `<a href="${esc(i.link)}" target="_blank" rel="noopener">${esc(i.title)}</a>`).join('');
    el.hidden = false;
  } catch { $('#ticker').hidden = true; }
}
```

- [ ] **Step 4: `public/js/today.js`**

```js
import { state, colorsOf } from './state.js';
import { $, esc, localTime, vsRow } from './format.js';

export function renderToday() {
  const t = state.tournament;
  const now = Date.now();
  const today = new Date().toDateString();
  const todays = t.matches.filter(m => m.kickoff && new Date(m.kickoff).toDateString() === today);
  const next = t.matches
    .filter(m => m.status === 'upcoming' && m.kickoff && Date.parse(m.kickoff) > now)
    .sort((a, b) => Date.parse(a.kickoff) - Date.parse(b.kickoff))[0];

  const sig = JSON.stringify([todays, next && next.num]);
  let html = '';
  if (next) {
    html += `<div class="card">
      <h3>Next kickoff — ${esc(next.team1)} vs ${esc(next.team2)}, ${esc(localTime(next.kickoff))}</h3>
      <div class="countdown" id="countdown" data-kickoff="${esc(next.kickoff)}">--:--:--</div>
    </div>`;
  }
  html += `<div class="card"><h2>Today's matches</h2>${
    todays.length ? todays.map(m => vsRow(m, colorsOf)).join('') : '<p>No matches today.</p>'
  }</div>`;
  return { sig, html };
}

export function tickCountdown() {
  const el = $('#countdown');
  if (!el) return;
  const diff = Date.parse(el.dataset.kickoff) - Date.now();
  if (diff <= 0) { el.textContent = 'KICKOFF!'; return; }
  const h = Math.floor(diff / 3600000), m = Math.floor(diff / 60000) % 60, s = Math.floor(diff / 1000) % 60;
  el.textContent = (h > 23 ? Math.floor(h / 24) + 'd ' : '') +
    String(h % 24).padStart(2, '0') + ':' + String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
}
```

- [ ] **Step 5: `public/js/main.js`** (temporary stubs for views built in Tasks 8–12)

```js
import { state, sigs } from './state.js';
import { $ } from './format.js';
import { renderToday, tickCountdown } from './today.js';
import { refreshTicker } from './ticker.js';

// stubs replaced by Tasks 8-12:
const renderGroups = () => ({ sig: 'stub', html: '<p>Task 8</p>' });
const renderTeams = () => ({ sig: 'stub', html: '<p>Task 8</p>' });
const renderSchedule = () => ({ sig: 'stub', html: '<p>Task 9</p>' });
const renderVenues = () => ({ sig: 'stub', html: '<p>Task 9</p>' });
const renderBracket = () => ({ sig: 'stub', html: '<p>Task 11</p>' });
const renderStats = () => ({ sig: 'stub', html: '<p>Task 12</p>' });
const wireView = () => {};

const RENDERERS = { today: renderToday, groups: renderGroups, schedule: renderSchedule, bracket: renderBracket, teams: renderTeams, stats: renderStats, venues: renderVenues };

export function renderAll() {
  if (!state.tournament) return;
  for (const [view, fn] of Object.entries(RENDERERS)) {
    const el = $('#view-' + view);
    const { sig, html } = fn();
    if (sigs[view] !== sig) {
      el.innerHTML = html;
      sigs[view] = sig;
      wireView(view, el);
    }
  }
  $('#data-status').textContent = 'UPDATED ' + new Date().toLocaleTimeString();
  if (state.odds) $('#odds-source').textContent = state.odds.live ? 'live (The Odds API)' : state.odds.source;
}

async function refresh() {
  try {
    const tour = await fetch('/api/tournament').then(r => r.json());
    if (!state.odds || Date.now() - state.oddsAt > 30 * 60 * 1000) {
      state.odds = await fetch('/api/odds').then(r => r.json());
      state.oddsAt = Date.now();
    }
    if (!state.sim || Date.now() - state.simAt > 30 * 60 * 1000) {
      state.sim = await fetch('/api/simulation').then(r => r.json());
      state.simAt = Date.now();
    }
    state.tournament = tour;
    renderAll();
  } catch {
    $('#data-status').textContent = 'REFRESH FAILED — RETRYING';
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
refreshTicker();
setInterval(refresh, 60 * 1000);
setInterval(refreshTicker, 15 * 60 * 1000);
setInterval(tickCountdown, 1000);
```

Note: `renderAll` and the stub `wireView` get extended in Tasks 8–12; final form (Task 12) imports real renderers and a `wireView(view, el)` dispatcher that re-binds view-local listeners after innerHTML replacement.

- [ ] **Step 6:** Delete `public/app.js`. Restart server; verify in browser: broadcast header + ticker (if BBC reachable), Today shows versus-banner rows with both teams' colors, countdown ticking, console clean.
- [ ] **Step 7: Commit** — `git add -A; git commit -m "feat: broadcast restyle + ES module client core, versus-banner Today, news ticker"`

---

### Task 8: Groups (kit stripes + scenario chips) and Teams (history + sim) views

**Files:** Create `public/js/groups.js`, `public/js/teams.js` · Modify `public/js/main.js` (swap stubs)

- [ ] **Step 1: `public/js/groups.js`**

```js
import { state, teamMap } from './state.js';
import { esc, flagImg } from './format.js';

const CHIP_CLASS = { THROUGH: 'through', OUT: 'out', ALIVE: 'alive', '3RD-RACE': 'race' };

export function renderGroups() {
  const t = state.tournament;
  const sig = JSON.stringify([t.standings, t.thirdPlace, t.scenarios]);
  const tm = teamMap();

  const groupCards = Object.keys(t.standings).sort().map(g => {
    const { table, complete } = t.standings[g];
    const sc = (t.scenarios && t.scenarios[g]) || { active: false, teams: {} };
    const rows = table.map((r, i) => {
      const team = tm[r.team] || {};
      const kit = (team.colors || ['#2d3742'])[0];
      const scInfo = sc.active ? sc.teams[r.team] : null;
      const chip = scInfo ? ` <span class="chip ${CHIP_CLASS[scInfo.status] || ''}" title="${esc(scInfo.note)}">${esc(scInfo.status)}</span>` : '';
      return `<tr class="kit-row ${complete && i < 2 ? 'qualified' : ''}" style="--kit:${kit};">
        <td>${flagImg(team.flag, r.team)}${esc(r.team)}${chip}</td>
        <td class="num">${r.played}</td><td class="num">${r.won}</td><td class="num">${r.drawn}</td>
        <td class="num">${r.lost}</td><td class="num">${r.gf}</td><td class="num">${r.ga}</td>
        <td class="num">${r.gd > 0 ? '+' : ''}${r.gd}</td><td class="num"><b>${r.points}</b></td>
      </tr>`;
    }).join('');
    const notes = sc.active
      ? `<div class="scenario-note">${table.map(r => sc.teams[r.team] ? `<b>${esc(r.team)}</b>: ${esc(sc.teams[r.team].note)}` : '').filter(Boolean).join(' · ')}</div>`
      : '';
    return `<div class="card">
      <h2>${esc(g)} ${complete ? '<span class="chip">complete</span>' : ''}</h2>
      <table><thead><tr>
        <th>Team</th><th class="num">P</th><th class="num">W</th><th class="num">D</th>
        <th class="num">L</th><th class="num">GF</th><th class="num">GA</th><th class="num">GD</th><th class="num">Pts</th>
      </tr></thead><tbody>${rows}</tbody></table>${notes}
    </div>`;
  }).join('');

  const thirds = `<div class="card">
    <h2>Third-place race <span class="chip">best 8 of 12 advance</span></h2>
    <table><thead><tr>
      <th>#</th><th>Team</th><th>Group</th><th class="num">Pts</th><th class="num">GD</th><th class="num">GF</th>
    </tr></thead><tbody>${
      t.thirdPlace.map((r, i) => {
        const team = tm[r.team] || {};
        const kit = (team.colors || ['#2d3742'])[0];
        return `<tr class="kit-row ${r.qualified ? 'qualified' : 'eliminated'}" style="--kit:${kit};">
          <td>${i + 1}</td>
          <td>${flagImg(team.flag, r.team)}${esc(r.team)}</td>
          <td>${esc((r.group || '').replace('Group ', ''))}</td>
          <td class="num"><b>${r.points}</b></td>
          <td class="num">${r.gd > 0 ? '+' : ''}${r.gd}</td><td class="num">${r.gf}</td>
        </tr>`;
      }).join('')
    }</tbody></table>
  </div>`;

  return { sig, html: `<div class="group-grid">${groupCards}</div>${thirds}` };
}
```

- [ ] **Step 2: `public/js/teams.js`**

```js
import { state } from './state.js';
import { esc, flagImg, localTime, scoreText, kitStripe } from './format.js';

export function renderTeams() {
  const t = state.tournament;
  const odds = state.odds, sim = state.sim;
  const sig = JSON.stringify([t.teams.length, t.matches.length, odds && odds.fetchedAt, sim && sim.generatedAt]);
  const oddsByTeam = odds ? Object.fromEntries(odds.entries.map((e, i) => [e.team, { ...e, rank: i + 1 }])) : {};
  const simByTeam = sim ? Object.fromEntries(sim.teams.map(s => [s.team, s])) : {};

  const cards = [...t.teams]
    .sort((a, b) => (oddsByTeam[a.name]?.rank ?? 99) - (oddsByTeam[b.name]?.rank ?? 99))
    .map(team => {
      const o = oddsByTeam[team.name];
      const s = simByTeam[team.name];
      const h = team.history;
      const stars = h && h.titles ? `<span class="stars">${'★'.repeat(h.titles)}</span> ` : '';
      const histLine = h
        ? `<div class="hist-line">${stars}${h.titles ? `${h.titles}-time champions · ` : ''}${h.bestFinish === 'Debut' ? 'WORLD CUP DEBUT' : `Appearance #${h.appearances} · Best: ${esc(h.bestFinish)}`}</div>`
        : '';
      const simLine = s
        ? `<div class="sim-line">Model: R16 ${(s.r16 * 100).toFixed(0)}% · QF ${(s.qf * 100).toFixed(0)}% · SF ${(s.sf * 100).toFixed(0)}% · 🏆 ${(s.champion * 100).toFixed(1)}%</div>`
        : '';
      const fixtures = t.matches
        .filter(m => m.group && (m.team1 === team.name || m.team2 === team.name))
        .map(m => `${esc(localTime(m.kickoff))} — ${esc(m.team1)} ${esc(scoreText(m))} ${esc(m.team2)}`)
        .join('<br>');
      return `<div class="card team-card">
        <h2>${flagImg(team.flag, team.name)}${esc(team.name)} <span class="chip">${esc(team.group || 'TBD')}</span></h2>
        ${kitStripe(team.colors)}
        <div class="odds-line">${o ? `#${o.rank} favourite · ${(o.prob * 100).toFixed(1)}% (odds ${o.decimal.toFixed(o.decimal < 20 ? 2 : 0)})` : 'odds unavailable'}</div>
        ${simLine}${histLine}
        <div class="fixtures">${fixtures || 'Fixtures TBD'}</div>
      </div>`;
    }).join('');

  return { sig, html: `<div class="team-grid">${cards}</div>` };
}
```

- [ ] **Step 3:** In `main.js`: `import { renderGroups } from './groups.js'; import { renderTeams } from './teams.js';` and delete the two stubs.
- [ ] **Step 4:** Browser verify: Groups rows have kit-color left edges; Teams cards show kit stripe, history line with stars (Brazil ★★★★★), sim percentages. Console clean.
- [ ] **Step 5: Commit** — `git add -A; git commit -m "feat: groups view with kit stripes + scenario chips; teams view with history and sim odds"`

---

### Task 9: Schedule (versus rows + scorer expanders) and Venues views

**Files:** Create `public/js/schedule.js`, `public/js/venues.js` · Modify `public/js/main.js`

- [ ] **Step 1: `public/js/schedule.js`** — scorers come from raw `goals1/goals2` passed through `/api/tournament` matches.

```js
import { state, colorsOf } from './state.js';
import { $, esc, localDay, vsRow } from './format.js';
import { renderAll } from './main.js';
import { sigs } from './state.js';

export const scheduleFilter = { text: '', stage: 'all' };

function scorersHtml(m) {
  const fmt = (arr) => (arr || []).map(g => {
    const nm = g.name || g.player || '?';
    const min = Number.isFinite(g.minute) ? ` ${g.minute}'` : '';
    return `${esc(nm)}${min}${g.penalty ? ' (p)' : ''}${g.owngoal ? ' (og)' : ''}`;
  }).join(', ');
  const a = fmt(m.goals1), b = fmt(m.goals2);
  if (!a && !b) return '';
  return `<details class="scorers"><summary>⚽ scorers</summary>
    <div class="goals"><span><b>${esc(m.team1)}:</b> ${a || '—'}</span><span><b>${esc(m.team2)}:</b> ${b || '—'}</span></div>
  </details>`;
}

export function renderSchedule() {
  const t = state.tournament;
  const txt = scheduleFilter.text.toLowerCase();
  const matches = t.matches.filter(m => {
    if (scheduleFilter.stage === 'group' && !m.group) return false;
    if (scheduleFilter.stage === 'knockout' && m.group) return false;
    if (txt && !(`${m.team1} ${m.team2} ${m.ground || ''} ${m.group || ''} ${m.round || ''}`.toLowerCase().includes(txt))) return false;
    return true;
  });
  const sig = JSON.stringify([matches.map(m => [m.num, m.score, m.status]), scheduleFilter]);

  const byDay = new Map();
  for (const m of matches) {
    const day = localDay(m.kickoff);
    if (!byDay.has(day)) byDay.set(day, []);
    byDay.get(day).push(m);
  }
  const days = [...byDay.entries()].map(([day, list]) =>
    `<div class="day-header">${esc(day)}</div><div class="card">${
      list.map(m => vsRow(m, colorsOf, m.status === 'finished' ? scorersHtml(m) : '')).join('')
    }</div>`).join('');

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

export function wireSchedule() {
  const txt = $('#sched-text'), stage = $('#sched-stage');
  if (!txt) return;
  txt.addEventListener('input', () => {
    scheduleFilter.text = txt.value; sigs.schedule = null; renderAll();
    requestAnimationFrame(() => { const e = $('#sched-text'); e.focus(); e.setSelectionRange(e.value.length, e.value.length); });
  });
  stage.addEventListener('change', () => { scheduleFilter.stage = stage.value; sigs.schedule = null; renderAll(); });
}
```

- [ ] **Step 2: `public/js/venues.js`** — needs stadium data on the client: simplest zero-copy route is `fetch('/data/stadiums.json')`? `data/` isn't under `public/`. Serve it via the API instead: in `server.js` add at top `const STADIUMS = require('./data/stadiums.json');` and a route `if (url.pathname === '/api/stadiums') return sendJson(res, 200, STADIUMS);`. Client:

```js
import { state, colorsOf } from './state.js';
import { esc, vsRow } from './format.js';

let stadiums = null;
export async function loadStadiums() {
  if (!stadiums) stadiums = await fetch('/api/stadiums').then(r => r.json()).catch(() => []);
}

export function renderVenues() {
  const t = state.tournament;
  if (!stadiums) return { sig: 'loading', html: '<div class="card"><p>Loading venues…</p></div>' };
  const sig = JSON.stringify([stadiums.length, t.matches.map(m => [m.num, m.score && 1])]);

  const known = new Set(stadiums.flatMap(s => s.grounds));
  const cards = stadiums.map(s => {
    const ms = t.matches.filter(m => s.grounds.includes(m.ground));
    return `<div class="card venue-card">
      <h2>${esc(s.stadium)}</h2>
      <div class="label">${esc(s.city)}, ${esc(s.country)}</div>
      <div class="cap">Capacity ${s.capacity.toLocaleString()} · ${ms.length} matches</div>
      ${ms.map(m => vsRow(m, colorsOf)).join('')}
    </div>`;
  });
  // any grounds in data that we don't recognise still get a card (spec: no hard fail)
  const unknownGrounds = [...new Set(t.matches.map(m => m.ground).filter(g => g && !known.has(g)))];
  for (const g of unknownGrounds) {
    const ms = t.matches.filter(m => m.ground === g);
    cards.push(`<div class="card venue-card"><h2>${esc(g)}</h2><div class="cap">${ms.length} matches</div>${ms.map(m => vsRow(m, colorsOf)).join('')}</div>`);
  }
  return { sig, html: `<div class="venue-grid">${cards.join('')}</div>` };
}
```

- [ ] **Step 3:** Wire into `main.js`: import both; replace stubs; call `loadStadiums()` once at boot (before first `refresh()`); extend `wireView` so `view === 'schedule'` calls `wireSchedule()`. To avoid a circular-import footgun (`schedule.js` imports `renderAll` from `main.js`): this is safe with ESM live bindings as long as `wireSchedule` is only *called* after module init.
- [ ] **Step 4:** Browser verify: Schedule day groups with versus banners; type "mexico" filters live and the input keeps focus; finished matches (none yet — simulate by checking a fixture later) show scorer expanders; Venues tab shows 16 stadium cards with capacity + match lists, no unknown-ground cards (else fix aliases in stadiums.json).
- [ ] **Step 5: Commit** — `git add -A; git commit -m "feat: schedule with scorer expanders + venues tab"`

---

### Task 10: Pick'em core logic (`public/js/picks-core.js`)

**Files:** Create `public/js/picks-core.js` · Test `tests/picks.test.js` · Modify `package.json`

- [ ] **Step 1: Failing test** (loads the ESM via dynamic import)

```js
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
  let p2 = applyPick({}, byNum, 74, 'Spain');
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
```

- [ ] **Step 2: Run** → FAIL

- [ ] **Step 3: Implement `public/js/picks-core.js`** (pure ESM, no DOM)

```js
// Pure pick'em logic. Used by the browser bracket view and node tests (dynamic import).
export const ROUND_POINTS = {
  'Round of 32': 1, 'Round of 16': 2,
  'Quarter-final': 4, 'Quarter-finals': 4,
  'Semi-final': 8, 'Semi-finals': 8,
  'Match for third place': 8, 'Third place': 8,
  'Final': 16
};

function decisive(m) { return (m && m.score && (m.score.p || m.score.et || m.score.ft)) || null; }

export function realWinner(m) {
  const s = decisive(m);
  if (!s || s[0] === s[1]) return null;
  return s[0] > s[1] ? m.team1 : m.team2;
}

// Effective slot teams for a match in picks mode: real result > pick > null.
export function effectiveTeams(m, picks, byNum) {
  const slot = (ref, resolvedName, isResolved) => {
    const w = /^W(\d+)$/.exec(ref || '');
    if (w) {
      const src = byNum.get(+w[1]);
      if (src) {
        const rw = realWinner(src);
        if (rw) return rw;
        if (picks[src.num]) return picks[src.num];
        return null;
      }
    }
    return isResolved ? resolvedName : null;
  };
  return [slot(m.ref1, m.team1, m.resolved1), slot(m.ref2, m.team2, m.resolved2)];
}

// Set a pick, then prune any pick that is no longer one of its match's effective teams.
export function applyPick(picks, byNum, matchNum, team) {
  const next = { ...picks, [matchNum]: team };
  let changed = true;
  while (changed) {
    changed = false;
    for (const [numStr, picked] of Object.entries(next)) {
      const m = byNum.get(+numStr);
      if (!m) { delete next[numStr]; changed = true; continue; }
      const [a, b] = effectiveTeams(m, next, byNum);
      if (picked !== a && picked !== b) { delete next[numStr]; changed = true; }
    }
  }
  return next;
}

export function scorePicks(picks, bracket) {
  let points = 0, correct = 0, graded = 0;
  for (const m of bracket) {
    const pick = picks[m.num];
    if (!pick) continue;
    const w = realWinner(m);
    if (!w) continue;
    graded++;
    if (w === pick) { correct++; points += ROUND_POINTS[m.round] || 1; }
  }
  return { points, correct, graded };
}
```

- [ ] **Step 4: Run** → `picks.test.js OK`; append to npm test; full `npm test` green.
- [ ] **Step 5: Commit** — `git add -A; git commit -m "feat: pick'em pure core (effective slots, downstream pruning, scoring)"`

---

### Task 11: Two-wing TV bracket view + Pick'em UI

**Files:** Create `public/js/bracket-tree.js`, `public/js/bracket.js` · Test `tests/bracket-tree.test.js` · Modify `public/js/main.js`, `package.json`

- [ ] **Step 1: Failing test for the tree**

```js
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
  console.log('bracket-tree.test.js OK');
})().catch(e => { console.error(e); process.exit(1); });
```

- [ ] **Step 2: Run** → FAIL

- [ ] **Step 3: Implement `public/js/bracket-tree.js`**

```js
// Derive a two-wing bracket layout from W## feeder refs. Pure ESM.
// Returns { final, third, left: [[SF],[QFs],[R16s],[R32s]], right: [...] } or null if underivable.
export function buildWings(bracket) {
  const byNum = new Map(bracket.map(m => [m.num, m]));
  const final = bracket.find(m => String(m.round).toLowerCase() === 'final');
  if (!final) return null;
  const third = bracket.find(m => String(m.round).toLowerCase().includes('third')) || null;

  const feeder = (ref) => {
    const m = /^W(\d+)$/.exec(ref || '');
    return m ? byNum.get(+m[1]) || null : null;
  };

  function subtreeColumns(root) {
    // BFS by depth: [[root], [its 2 feeders], [4], ...] — stop when a level has no feeders
    const cols = [];
    let level = [root];
    while (level.length) {
      cols.push(level);
      const next = [];
      for (const m of level) {
        const f1 = feeder(m.ref1), f2 = feeder(m.ref2);
        if (f1) next.push(f1);
        if (f2) next.push(f2);
      }
      // a level must be complete (2^depth) to be drawable as a wing
      if (next.length && next.length !== level.length * 2) return null;
      level = next;
    }
    return cols;
  }

  const f1 = feeder(final.ref1), f2 = feeder(final.ref2);
  if (!f1 || !f2) return null;
  const left = subtreeColumns(f1);
  const right = subtreeColumns(f2);
  if (!left || !right || left.length !== right.length) return null;
  return { final, third, left, right };
}
```

- [ ] **Step 4: Run** → OK; append to npm test.

- [ ] **Step 5: Implement `public/js/bracket.js`** (view: wings + flat fallback + picks)

```js
import { state, teamMap } from './state.js';
import { $, esc, flagImg, localTime } from './format.js';
import { buildWings } from './bracket-tree.js';
import { effectiveTeams, applyPick, scorePicks, realWinner } from './picks-core.js';
import { renderAll } from './main.js';
import { sigs } from './state.js';

const LS_KEY = 'wc26-picks-v1';
export const bracketUI = { mode: 'real' }; // 'real' | 'picks'

function loadPicks() { try { return JSON.parse(localStorage.getItem(LS_KEY)) || {}; } catch { return {}; } }
function savePicks(p) { localStorage.setItem(LS_KEY, JSON.stringify(p)); }

function slotHtml(m, team, isWinner, pickable, picked, kit) {
  const placeholder = !team || !teamMap()[team];
  const label = team || '—';
  return `<div class="slot ${placeholder ? 'placeholder' : ''} ${isWinner ? 'winner' : ''} ${pickable ? 'pickable' : ''} ${picked ? 'picked' : ''}"
    style="--kit:${kit};" ${pickable ? `data-pick-match="${m.num}" data-pick-team="${esc(team)}"` : ''}>
    <span>${placeholder ? '' : flagImg(teamMap()[team].flag, team)}${esc(label)}</span>
    <span>${slotScore(m, team)}</span>
  </div>`;
}
function slotScore(m, team) {
  if (!m.score) return '';
  const s = m.score.p || m.score.et || m.score.ft;
  if (!s) return '';
  return team === m.team1 ? s[0] : team === m.team2 ? s[1] : '';
}

function matchCell(m, byNum, picks, mode, big = false) {
  const tm = teamMap();
  let t1 = m.team1, t2 = m.team2, r1 = m.resolved1, r2 = m.resolved2;
  if (mode === 'picks') {
    const [a, b] = effectiveTeams(m, picks, byNum);
    t1 = a || (r1 ? m.team1 : m.team1); t2 = b || (r2 ? m.team2 : m.team2);
    if (a) r1 = true; if (b) r2 = true;
  }
  const w = mode === 'picks' ? picks[m.num] || realWinner(m) : realWinner(m);
  const kit = (name) => (tm[name] && tm[name].colors ? tm[name].colors[0] : 'transparent');
  const canPick = (name, resolved) => mode === 'picks' && resolved && !!tm[name] && !realWinner(m);
  return `<div class="bracket-match ${big ? 'final-match' : ''}">
    ${slotHtml(m, r1 ? t1 : m.team1, w === t1 && r1, canPick(t1, r1), mode === 'picks' && picks[m.num] === t1, kit(t1))}
    ${slotHtml(m, r2 ? t2 : m.team2, w === t2 && r2, canPick(t2, r2), mode === 'picks' && picks[m.num] === t2, kit(t2))}
    <div class="meta">${esc(localTime(m.kickoff))} · ${esc(m.ground || '')}</div>
  </div>`;
}

export function renderBracket() {
  const t = state.tournament;
  const picks = loadPicks();
  const sig = JSON.stringify([t.bracket, bracketUI.mode, picks]);
  if (!t.bracket.length) return { sig, html: '<div class="card"><p>Knockout fixtures appear once published.</p></div>' };

  const byNum = new Map(t.bracket.map(m => [m.num, m]));
  const score = scorePicks(picks, t.bracket);
  const toolbar = `<div class="bracket-toolbar">
    <button class="mode-btn ${bracketUI.mode === 'real' ? 'active' : ''}" data-mode="real">Real</button>
    <button class="mode-btn ${bracketUI.mode === 'picks' ? 'active' : ''}" data-mode="picks">My Picks</button>
    ${Object.keys(picks).length ? `<span class="pick-score">Your bracket: ${score.points} pts · ${score.correct}/${score.graded} correct</span>` : ''}
    ${bracketUI.mode === 'picks' ? '<button class="mode-btn" data-mode="clear">Clear picks</button>' : ''}
  </div>`;

  const wide = window.innerWidth >= 1100;
  const wings = wide ? buildWings(t.bracket) : null;
  let body;
  if (wings) {
    const colHtml = (matches, label) => `<div class="round-col"><div class="label">${esc(label)}</div>${
      matches.map(m => matchCell(m, byNum, picks, bracketUI.mode)).join('')}</div>`;
    const L = wings.left, R = wings.right;
    const names = ['Semi-final', 'Quarter-final', 'Round of 16', 'Round of 32'];
    const cols = [];
    for (let i = L.length - 1; i >= 0; i--) cols.push(colHtml(L[i], names[i] || L[i][0].round));
    cols.push(`<div class="round-col"><div class="label">Final</div>${matchCell(wings.final, byNum, picks, bracketUI.mode, true)}${
      wings.third ? `<div class="label">Third place</div>${matchCell(wings.third, byNum, picks, bracketUI.mode)}` : ''}</div>`);
    for (let i = 0; i < R.length; i++) cols.push(colHtml(R[i], names[i] || R[i][0].round));
    // grid expects exactly 9 columns for the full cup; fewer is fine, grid auto-fits
    body = `<div class="bracket2" style="grid-template-columns:repeat(${cols.length}, minmax(150px, 1fr));">${cols.join('')}</div>`;
  } else {
    // flat fallback (narrow screens or underivable tree)
    const ROUND_ORDER = ['Round of 32', 'Round of 16', 'Quarter-final', 'Quarter-finals', 'Semi-final', 'Semi-finals', 'Match for third place', 'Third place', 'Final'];
    const rounds = new Map();
    for (const m of t.bracket) { if (!rounds.has(m.round)) rounds.set(m.round, []); rounds.get(m.round).push(m); }
    const ordered = [...rounds.keys()].sort((a, b) => {
      const ia = ROUND_ORDER.indexOf(a), ib = ROUND_ORDER.indexOf(b);
      return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
    });
    body = `<div class="bracket-flat">${ordered.map(round =>
      `<div class="round-col"><div class="label">${esc(round)}</div>${
        rounds.get(round).map(m => matchCell(m, byNum, picks, bracketUI.mode)).join('')}</div>`).join('')}</div>`;
  }
  return { sig, html: toolbar + body };
}

export function wireBracket(el) {
  el.querySelectorAll('.mode-btn').forEach(b => b.addEventListener('click', () => {
    if (b.dataset.mode === 'clear') { savePicks({}); }
    else bracketUI.mode = b.dataset.mode;
    sigs.bracket = null; renderAll();
  }));
  el.querySelectorAll('.slot.pickable').forEach(s => s.addEventListener('click', () => {
    const byNum = new Map(state.tournament.bracket.map(m => [m.num, m]));
    const next = applyPick(loadPicks(), byNum, +s.dataset.pickMatch, s.dataset.pickTeam);
    savePicks(next);
    sigs.bracket = null; renderAll();
  }));
}
```

- [ ] **Step 6:** Wire into `main.js` (import `renderBracket, wireBracket`; replace stub; `wireView('bracket', el)` → `wireBracket(el)`).
- [ ] **Step 7:** Browser verify on ≥1100px viewport: two wings with the Final centered (or flat fallback if upstream refs incomplete — check which renders and why); My Picks mode lets you click R32 teams and they advance; refresh keeps picks; Clear works; console clean. `npm test` green.
- [ ] **Step 8: Commit** — `git add -A; git commit -m "feat: two-wing TV bracket with Pick'em"`

---

### Task 12: Stats view (Golden Boot + simulator viz), final verification, README

**Files:** Create `public/js/stats.js` · Modify `public/js/main.js` (final form), `server.js` (golden boot via tournament payload — none needed; boot computed client-side from matches), `README.md`

- [ ] **Step 1: `public/js/stats.js`** — golden boot computed client-side from match scorer arrays (same logic as server lib, simplified):

```js
import { state, teamMap } from './state.js';
import { esc, flagImg, svgBarChart, kitStripe } from './format.js';

function goldenBootRows(matches) {
  const tally = new Map();
  for (const m of matches) {
    for (const [arr, team] of [[m.goals1, m.team1], [m.goals2, m.team2]]) {
      for (const g of arr || []) {
        const name = g.name || g.player;
        if (!name || g.owngoal) continue;
        const key = name + '|' + team;
        const e = tally.get(key) || { player: name, team, goals: 0, penalties: 0 };
        e.goals++; if (g.penalty) e.penalties++;
        tally.set(key, e);
      }
    }
  }
  return [...tally.values()].sort((a, b) => b.goals - a.goals || a.penalties - b.penalties || a.player.localeCompare(b.player));
}

export function renderStats() {
  const t = state.tournament, odds = state.odds, sim = state.sim;
  const finished = t.matches.filter(m => m.status === 'finished' && m.score && m.score.ft);
  const sig = JSON.stringify([finished.length, odds && odds.fetchedAt, sim && sim.generatedAt]);
  const tm = teamMap();

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

  // golden boot
  const boot = goldenBootRows(t.matches).slice(0, 15);
  const bootCard = `<div class="card"><h2>Golden Boot</h2>${
    boot.length ? `<table><thead><tr><th>#</th><th>Player</th><th>Team</th><th class="num">Goals</th><th class="num">Pens</th></tr></thead><tbody>${
      boot.map((e, i) => {
        const team = tm[e.team] || {};
        return `<tr class="kit-row" style="--kit:${(team.colors || ['#2d3742'])[0]};">
          <td>${i + 1}</td><td>${esc(e.player)}</td>
          <td>${flagImg(team.flag, e.team)}${esc(e.team)}</td>
          <td class="num"><b>${e.goals}</b></td><td class="num">${e.penalties || ''}</td></tr>`;
      }).join('')}</tbody></table>` : '<p>No goals yet — check back after kickoff.</p>'}</div>`;

  // simulator
  let simCard = '';
  if (sim) {
    const top = sim.teams.slice(0, 15).map((s, i) => ({ label: s.team, value: s.champion, display: (s.champion * 100).toFixed(1) + '%', gold: i === 0 }));
    simCard = `<div class="card"><h2>Road to the final <span class="chip">model · ${sim.iterations.toLocaleString()} sims</span></h2>
      ${svgBarChart(top, 'Championship probability (simulated)')}
      <table><thead><tr><th>Team</th><th class="num">R16</th><th class="num">QF</th><th class="num">SF</th><th class="num">Final</th><th class="num">🏆</th></tr></thead><tbody>${
        sim.teams.slice(0, 20).map(s => {
          const team = tm[s.team] || {};
          const pc = (x) => (x * 100).toFixed(1) + '%';
          return `<tr class="kit-row" style="--kit:${(team.colors || ['#2d3742'])[0]};">
            <td>${flagImg(team.flag, s.team)}${esc(s.team)}</td>
            <td class="num">${pc(s.r16)}</td><td class="num">${pc(s.qf)}</td><td class="num">${pc(s.sf)}</td>
            <td class="num">${pc(s.final)}</td><td class="num"><b>${pc(s.champion)}</b></td></tr>`;
        }).join('')}</tbody></table>
      <div class="scenario-note">Bradley–Terry model on de-vigged bookmaker outrights — not betting prices.</div></div>`;
  }

  // bookmaker odds (kept from v0.1)
  let oddsCard = '';
  if (odds) {
    oddsCard = `<div class="card"><h2>Outright winner odds — all 48 <span class="chip">${odds.live ? 'live' : esc(odds.source)}</span></h2>
      <table><thead><tr><th>#</th><th>Team</th><th class="num">Decimal</th><th class="num">Implied</th></tr></thead><tbody>${
        odds.entries.map((e, i) => {
          const team = tm[e.team] || {};
          return `<tr class="kit-row" style="--kit:${(team.colors || ['#2d3742'])[0]};"><td>${i + 1}</td>
            <td>${flagImg(team.flag, e.team)}${esc(e.team)}</td>
            <td class="num">${e.decimal.toFixed(2)}</td><td class="num">${(e.prob * 100).toFixed(2)}%</td></tr>`;
        }).join('')}</tbody></table></div>`;
  }

  // goals by round
  const byRound = new Map();
  for (const m of finished) byRound.set(m.round, (byRound.get(m.round) || 0) + m.score.ft[0] + m.score.ft[1]);
  const goalsChart = byRound.size
    ? `<div class="card"><h2>Goals by round</h2>${svgBarChart([...byRound.entries()].map(([label, value]) => ({ label, value, display: String(value) })), 'Goals by round')}</div>`
    : '';

  return { sig, html: strip + bootCard + simCard + goalsChart + oddsCard };
}
```

- [ ] **Step 2: Final `main.js` imports** — all stubs replaced; `wireView(view, el)` dispatcher: schedule → `wireSchedule()`, bracket → `wireBracket(el)`; everything else no-op.
- [ ] **Step 3: Full verification** — `npm test` (12 suites green); browser walk of all 7 tabs; flicker check (tag a node, run `refresh()` twice via console, node survives); resize to <1100px confirms bracket flat fallback; console clean.
- [ ] **Step 4: Update `README.md`** — add: Venues tab, Pick'em, simulator, Golden Boot, news ticker, scenarios; new endpoints `/api/simulation`, `/api/news`, `/api/stadiums`.
- [ ] **Step 5: Commit** — `git add -A; git commit -m "feat: stats with golden boot + simulator viz; docs: README for ultimate hub"`

---

## Self-Review (completed)

- **Spec coverage:** §1 visual system → Tasks 6–7 (chrome, wordmark, ticker strip, kit stripes via `.kit-row`/`kitStripe`, versus `vsRow`); §2 bracket → Task 11 (`buildWings`, 9-col grid, fallback); §3 Pick'em → Tasks 10–11; §4 simulator → Task 4; §5 Golden Boot → Tasks 2 (server lib for tests/data validation) & 12 (client board) & 9 (match expanders); §6 venues → Tasks 1 & 9 (+`/api/stadiums`); §7 history → Tasks 1 & 8; §8 scenarios → Tasks 3 & 8; §9 news → Tasks 5 & 7; §10 architecture → Tasks 6–12; §11 testing → each task TDD + Task 12 walk.
- **Placeholder scan:** none — every code step is complete; Task 3 implementation contains one explicitly-flagged dead block to delete (noted inline).
- **Type consistency:** `/api/simulation` rows `{team, r32, r16, qf, sf, final, champion}` consumed by `teams.js` (`s.r16` etc.) and `stats.js`; bracket items now carry `ref1/ref2` (Task 4 Step 1) consumed by `picks-core.js` and `bracket-tree.js`; `scenarios` payload `{active, teams:{name:{status,note}}}` produced in Task 3, consumed in Task 8 with statuses `THROUGH|OUT|ALIVE|3RD-RACE` matching `CHIP_CLASS`; `colors` array attached in Task 1, consumed via `state.colorsOf`/`teamMap` everywhere. Checked.
- **Note:** server-side `lib/scorers.js` is used for tested aggregation logic; the client recomputes the same tally locally (data already in the payload) to avoid a new endpoint — acceptable duplication of ~20 pure lines, flagged here deliberately.
