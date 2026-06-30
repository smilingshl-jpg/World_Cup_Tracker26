# Penalty Direction Probability + Per-Player / Compiled Views — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show each penalty taker's modelled shooting-direction probability, isolate each player's kick in the carousel (no other kicks bleeding into their view), and add a separate "Compiled" view that shows every kick at once.

**Architecture:** Add a pure, seeded per-player `directionTendency` model to `public/js/penalty.js` (distribution over the 6 goal zones, stable per player). The shootout panel gains a view toggle: **By player** (carousel — net shaded by the *current* player's direction tendency, only that player's marker shown, plus their direction breakdown and the existing win-probability) and **Compiled** (net shaded by league conversion, all markers, plus a table of every kick). Each kick's marker is now placed by sampling that player's tendency, so position and the shown distribution agree.

**Tech Stack:** Vanilla ESM (browser), Node `assert` tests run via `npm test`, dynamic-import tests for ESM modules (pattern: `tests/penalty.test.js`).

---

## Data reality (read before coding)
No data feed records penalty *placement* (ESPN gives taker + scored/missed only). The direction tendency is therefore a **modelled, seeded-per-player** distribution (deterministic per name, perturbed from the league shot-share in `data/penalty-zones.json`). It must stay clearly labelled "modelled" in the UI. Outcomes, takers, order, and the win-probability remain as-is.

## File structure
- `public/js/penalty.js` — add `directionTendency(taker, zones)` and `sampleZone(tendency, rng)` (pure, exported, tested). Keep `winProbSteps` unchanged.
- `tests/penalty.test.js` — add tests for the two new functions.
- `public/js/matchdetail.js` — placement now samples the tendency; add `soView` state, a view toggle, `playerHtml`/`compiledHtml`/`toggleHtml`/`soBody`, refactor `netSvg` to take a `mode`, and re-render the body on nav/view change.
- `public/styles.css` — styles for the toggle, the per-player direction breakdown, and the compiled table.

---

## Task 1: Per-player direction tendency model

**Files:**
- Modify: `public/js/penalty.js` (add after `mulberry32`)
- Test: `tests/penalty.test.js`

- [ ] **Step 1: Write the failing test** — append to `tests/penalty.test.js` just before the final `console.log('penalty.test.js OK');` line:

```js
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
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node tests/penalty.test.js`
Expected: FAIL — `directionTendency is not a function` (or `TypeError`), because it isn't exported yet.

- [ ] **Step 3: Implement the model** — in `public/js/penalty.js`, add directly after the `mulberry32` function:

```js
// Hash a string into a mulberry32 RNG (stable per string).
function strRng(str) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return mulberry32(h >>> 0);
}

// Per-player shooting-direction tendency over the goal zones. Seeded + stable per
// player, derived by perturbing the league shot-share. Illustrative — no feed records
// real placement. Returns [{ id, label, col, row, p }] with p summing to 1.
export function directionTendency(taker, zones, { seed = 'dir' } = {}) {
  if (!Array.isArray(zones) || !zones.length) return [];
  const rng = strRng(String(taker) + '|' + seed);
  const raw = zones.map(z => {
    const base = typeof z.share === 'number' ? z.share : 1 / zones.length;
    return base * (0.35 + 1.7 * rng());
  });
  const sum = raw.reduce((a, b) => a + b, 0) || 1;
  return zones.map((z, i) => ({ id: z.id, label: z.label, col: z.col, row: z.row, p: raw[i] / sum }));
}

// Pick a zone from a tendency distribution using rng() in [0,1).
export function sampleZone(tendency, rng) {
  let r = rng();
  for (const t of tendency) { if ((r -= t.p) <= 0) return t; }
  return tendency[tendency.length - 1];
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `node tests/penalty.test.js`
Expected: `penalty.test.js OK`

- [ ] **Step 5: Commit**

```bash
git add public/js/penalty.js tests/penalty.test.js
git commit -m "feat(penalty): per-player direction tendency model + sampleZone"
```

---

## Task 2: Place each kick by sampling the player's tendency

**Files:**
- Modify: `public/js/matchdetail.js` (imports + `buildShootout`)

- [ ] **Step 1: Extend the penalty import** — change the existing import line in `public/js/matchdetail.js`:

```js
import { winProbSteps } from './penalty.js';
```

to:

```js
import { winProbSteps, directionTendency, sampleZone, mulberry32 } from './penalty.js';
```

- [ ] **Step 2: Add the view-state map** — directly below the existing `const soData = new Map(); const soIndex = new Map();` add:

```js
const soView = new Map(); // num -> 'player' | 'compiled' (default 'player')
```

- [ ] **Step 3: Replace `buildShootout`** so each kick carries its player's tendency and a placement sampled from it. Replace the entire current `buildShootout` function with:

```js
function buildShootout(d, num) {
  const pens = d.pens;
  if (!pens || !Array.isArray(pens.teams) || pens.teams.length < 2) return null;
  const zones = d.penaltyZones || [];
  const { X0, Y0, W, H } = SO_GEO, colW = W / 3, rowH = H / 2;
  const { home, away, steps } = winProbSteps(pens);
  for (const st of steps) {
    st.tendency = directionTendency(st.taker, zones);
    const place = mulberry32(2654435761 ^ (st.index * 2246822519));
    const z = st.tendency.length ? sampleZone(st.tendency, place) : null;
    st.zone = z;
    st.cx = z ? X0 + z.col * colW + colW * (0.22 + 0.56 * place()) : X0 + W / 2;
    st.cy = z ? Y0 + z.row * rowH + rowH * (0.22 + 0.56 * place()) : Y0 + H / 2;
  }
  return { steps, home, away, zones };
}
```

- [ ] **Step 4: Verify the module still parses**

Run: `node --check public/js/matchdetail.js`
Expected: no output (exit 0).

- [ ] **Step 5: Commit**

```bash
git add public/js/matchdetail.js
git commit -m "feat(shootout): place each kick by sampling the taker's direction tendency"
```

---

## Task 3: `netSvg` mode (player isolates one kick + shades that player's tendency)

**Files:**
- Modify: `public/js/matchdetail.js` (`netSvg`)

- [ ] **Step 1: Replace `netSvg`** with a mode-aware version. `mode === 'player'` shades the net by the current player's tendency and draws ONLY that player's marker; `mode === 'compiled'` shades by league conversion and draws ALL markers. Replace the entire current `netSvg` function with:

```js
// mode: 'player' (shade by steps[cur].tendency, only that marker) | 'compiled' (conversion, all markers)
function netSvg(data, mode, cur) {
  const { X0, Y0, W, H } = SO_GEO, colW = W / 3, rowH = H / 2;
  const shade = (v) => Math.max(0.08, Math.min(0.82, v));
  const tend = mode === 'player' && data.steps[cur] ? data.steps[cur].tendency : null;
  const byId = tend ? Object.fromEntries(tend.map(t => [t.id, t.p])) : null;
  const zoneSvg = data.zones.map(z => {
    const x = X0 + z.col * colW, y = Y0 + z.row * rowH;
    const v = mode === 'player' ? (byId ? byId[z.id] * 2.2 : 0) : (z.conversion - 0.66) * 2.1;
    const label = mode === 'player' ? (byId ? pct(byId[z.id]) + '%' : '') : pct(z.conversion) + '%';
    return `<rect x="${x}" y="${y}" width="${colW}" height="${rowH}" fill="rgba(34,197,94,${shade(v).toFixed(2)})" stroke="rgba(246,241,231,.15)"/>
      <text x="${x + colW / 2}" y="${y + rowH / 2 + 4}" class="so-zpct">${label}</text>`;
  }).join('');
  const shown = mode === 'player' ? data.steps.filter(s => s.index === cur) : data.steps;
  const markers = shown.map(st => `<circle cx="${st.cx.toFixed(1)}" cy="${st.cy.toFixed(1)}" r="${st.index === cur ? 8 : 5}" data-i="${st.index}" class="so-kick ${st.scored ? 'scored' : 'miss'} ${st.index === cur ? 'cur' : ''}" onclick="window.__soGo(${data.num},${st.index})"><title>${esc(st.team)} — ${esc(st.taker)} (${st.scored ? 'scored' : 'missed'})</title></circle>`).join('');
  return `<svg viewBox="0 0 300 150" class="so-net" role="img" aria-label="${mode === 'player' ? 'Goal net shaded by this player\\'s modelled shooting-direction probability' : 'Goal net shaded by historical scoring probability with every shootout kick plotted'}">
    <rect x="${X0}" y="${Y0}" width="${W}" height="${H}" fill="rgba(255,255,255,.03)"/>
    ${zoneSvg}
    <g stroke="rgba(246,241,231,.10)">${[1, 2].map(i => `<line x1="${X0 + i * colW}" y1="${Y0}" x2="${X0 + i * colW}" y2="${Y0 + H}"/>`).join('')}<line x1="${X0}" y1="${Y0 + rowH}" x2="${X0 + W}" y2="${Y0 + rowH}"/></g>
    <g stroke="var(--gold)" stroke-width="3.5" fill="none"><line x1="${X0}" y1="${Y0}" x2="${X0}" y2="${Y0 + H}"/><line x1="${X0 + W}" y1="${Y0}" x2="${X0 + W}" y2="${Y0 + H}"/><line x1="${X0}" y1="${Y0}" x2="${X0 + W}" y2="${Y0}"/></g>
    <line x1="14" y1="${Y0 + H}" x2="286" y2="${Y0 + H}" stroke="rgba(246,241,231,.25)" stroke-width="2"/>
    ${markers}
  </svg>`;
}
```

- [ ] **Step 2: Verify the module still parses**

Run: `node --check public/js/matchdetail.js`
Expected: no output (exit 0).

(No commit yet — `netSvg` callers are rewritten in Task 4.)

---

## Task 4: View toggle, per-player body, compiled body, nav re-render

**Files:**
- Modify: `public/js/matchdetail.js` (replace `stageHtml`, `carouselHtml`, `shootoutHtml`, `soRender`, and the `__soGo`/`__soStep` handlers; add `directionBreakdown`, `toggleHtml`, `playerHtml`, `compiledHtml`, `soBody`, `__soView`)

- [ ] **Step 1: Replace `stageHtml`** with a version that adds the player's direction breakdown (top zones by probability) alongside the existing win-probability bars. Replace the entire current `stageHtml` with:

```js
// the player's modelled direction breakdown: zones sorted by probability
function directionBreakdown(st) {
  if (!st.tendency || !st.tendency.length) return '';
  const top = [...st.tendency].sort((a, b) => b.p - a.p).slice(0, 3);
  const chips = top.map((t, i) => `<span class="so-dir ${i === 0 ? 'top' : ''}">${esc(t.label)} ${pct(t.p)}%</span>`).join('');
  return `<div class="so-dir-wrap"><span class="so-dir-cap">Likely direction</span>${chips}</div>`;
}

function stageHtml(data, cur) {
  const st = data.steps[cur];
  const teamName = st.side === 'home' ? data.home.team : data.away.team;
  const bar = (name, p, side) => `<div class="so-wp-row">
    <span class="so-wp-name">${esc(name)}</span>
    <span class="so-wp-track"><span class="so-wp-fill ${side}" style="width:${pct(p)}%"></span></span>
    <span class="so-wp-pct">${pct(p)}%</span></div>`;
  return `<div class="so-kickline">
      <span class="so-kn">Kick ${cur + 1}/${data.steps.length}</span>
      <span class="so-${st.scored ? 'scored' : 'miss'}">${st.scored ? '● scored' : '○ missed'}</span>
      <b>${esc(teamName)}</b> · ${esc(st.taker)}
      <span class="so-tally">${st.homeGoals}–${st.awayGoals}</span>
    </div>
    ${directionBreakdown(st)}
    <div class="so-wp">
      <div class="so-wp-cap">Win probability after this kick</div>
      ${bar(data.home.team, st.pHome, 'home')}
      ${bar(data.away.team, st.pAway, 'away')}
    </div>`;
}
```

- [ ] **Step 2: Replace `carouselHtml`** with the toggle + per-player/compiled bodies + a `soBody` dispatcher. Replace the entire current `carouselHtml` function with:

```js
function toggleHtml(num, view) {
  const btn = (mode, label) => `<button class="so-vbtn ${view === mode ? 'on' : ''}" onclick="window.__soView(${num},'${mode}')">${label}</button>`;
  return `<div class="so-toggle">${btn('player', 'By player')}${btn('compiled', 'Compiled')}</div>`;
}

function playerHtml(data, cur) {
  const dots = data.steps.map(st => `<button class="so-dot ${st.scored ? 'scored' : 'miss'} ${st.index === cur ? 'on' : ''}" data-i="${st.index}" aria-label="Kick ${st.index + 1}" onclick="window.__soGo(${data.num},${st.index})"></button>`).join('');
  return `<div class="so-net-wrap">${netSvg(data, 'player', cur)}</div>
    <div class="so-stage" id="so-stage-${data.num}">${stageHtml(data, cur)}</div>
    <div class="so-nav">
      <button class="so-arrow" aria-label="Previous kick" onclick="window.__soStep(${data.num},-1)">‹</button>
      <div class="so-dots">${dots}</div>
      <button class="so-arrow" aria-label="Next kick" onclick="window.__soStep(${data.num},1)">›</button>
    </div>`;
}

function compiledHtml(data) {
  const rows = data.steps.map(st => `<tr class="${st.scored ? 'scored' : 'miss'}">
      <td>${st.index + 1}</td><td>${esc(st.team)}</td><td>${esc(st.taker)}</td>
      <td>${st.scored ? '● scored' : '○ missed'}</td>
      <td>${st.zone ? esc(st.zone.label) : '—'}</td>
      <td>${st.homeGoals}–${st.awayGoals}</td></tr>`).join('');
  return `<div class="so-net-wrap">${netSvg(data, 'compiled', -1)}</div>
    <table class="so-table">
      <thead><tr><th>#</th><th>Team</th><th>Taker</th><th>Outcome</th><th>Direction</th><th>Score</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>`;
}

function soBody(num) {
  const data = soData.get(num);
  if (!data) return '';
  const view = soView.get(num) || 'player';
  if (view === 'compiled') return toggleHtml(num, view) + compiledHtml(data);
  const cur = Math.max(0, Math.min(data.steps.length - 1, soIndex.has(num) ? soIndex.get(num) : data.steps.length - 1));
  soIndex.set(num, cur);
  return toggleHtml(num, view) + playerHtml(data, cur);
}
```

- [ ] **Step 3: Replace `shootoutHtml`** so the body lives in a single re-renderable container. Replace the entire current `shootoutHtml` function with:

```js
function shootoutHtml(d, num) {
  const data = buildShootout(d, num);
  if (!data) return '';
  data.num = num;
  soData.set(num, data);
  if (soIndex.has(num)) soIndex.set(num, Math.min(soIndex.get(num), data.steps.length - 1));
  const m = (window.__matchByNum && window.__matchByNum[num]) || {};
  const ph = data.home.kicks.filter(k => k.scored).length, pa = data.away.kicks.filter(k => k.scored).length;
  const winner = ph > pa ? data.home : data.away;
  const sc = d.score && (d.score.et || d.score.ft);
  const ftLine = sc ? `${esc(m.team1 || data.home.team)} ${sc[0]}–${sc[1]} ${esc(m.team2 || data.away.team)}${d.score.et ? ' <span class="aet">(a.e.t.)</span>' : ''} — ` : '';
  return `<div class="detail-section shootout" id="so-${num}">
    <div class="label">Penalty shootout</div>
    <div class="so-result">${ftLine}<b>${esc(winner.team)}</b> win ${Math.max(ph, pa)}–${Math.min(ph, pa)} on penalties</div>
    <div class="so-body" id="so-body-${num}">${soBody(num)}</div>
    <div class="so-cap">"By player" shades the net by that taker's modelled shooting-direction probability and shows only their kick; "Compiled" shows every kick and the league scoring-probability net. Outcomes &amp; takers are real (ESPN); direction probabilities and marker positions are modelled, not recorded.</div>
  </div>`;
}
```

- [ ] **Step 4: Replace `soRender` and the nav handlers** with body re-rendering + a `__soView` handler. Replace the entire current `soRender` function and the two `window.__soGo` / `window.__soStep` assignments with:

```js
// re-render the whole shootout body (view + net + stage/table) from current state
function soRender(num) {
  const el = document.getElementById('so-body-' + num);
  if (el) el.innerHTML = soBody(num);
}
window.__soGo = (num, i) => { soIndex.set(num, i); soRender(num); };
window.__soStep = (num, dir) => {
  const data = soData.get(num); if (!data) return;
  const cur = soIndex.has(num) ? soIndex.get(num) : data.steps.length - 1;
  soIndex.set(num, Math.max(0, Math.min(data.steps.length - 1, cur + dir)));
  soRender(num);
};
window.__soView = (num, mode) => { soView.set(num, mode); soRender(num); };
```

- [ ] **Step 5: Verify the module still parses**

Run: `node --check public/js/matchdetail.js`
Expected: no output (exit 0).

- [ ] **Step 6: Commit**

```bash
git add public/js/matchdetail.js
git commit -m "feat(shootout): per-player direction view (isolated) + compiled all-kicks view"
```

---

## Task 5: Styles for toggle, direction chips, compiled table

**Files:**
- Modify: `public/styles.css` (add after the existing `.so-cap` rule)

- [ ] **Step 1: Append the styles** — add directly after the `.so-cap { ... }` line in `public/styles.css`:

```css
.so-toggle { display: flex; gap: 6px; margin: 0 0 8px; }
.so-vbtn { background: var(--panel-2); border: 1px solid var(--line); color: var(--muted); font-size: 11px; letter-spacing: 1px; text-transform: uppercase; padding: 4px 10px; cursor: pointer; }
.so-vbtn.on { border-color: var(--teal); color: var(--teal); }
.so-dir-wrap { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; margin: 0 0 8px; }
.so-dir-cap { color: var(--muted); font-size: 10px; text-transform: uppercase; letter-spacing: 1px; }
.so-dir { font-size: 11px; padding: 1px 6px; border: 1px solid var(--line); color: var(--muted); }
.so-dir.top { border-color: var(--teal); color: var(--teal); }
.so-table { width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 4px; }
.so-table th { text-align: left; color: var(--muted); font-weight: 600; font-size: 10px; text-transform: uppercase; letter-spacing: 1px; border-bottom: 1px solid var(--line); padding: 4px 6px; }
.so-table td { padding: 4px 6px; border-bottom: 1px solid var(--line); }
.so-table tr.scored td:nth-child(4) { color: var(--green); }
.so-table tr.miss td:nth-child(4) { color: var(--red); }
```

- [ ] **Step 2: Commit**

```bash
git add public/styles.css
git commit -m "style(shootout): view toggle, direction chips, compiled table"
```

---

## Task 6: End-to-end verification

**Files:** none (verification only)

- [ ] **Step 1: Run the full test suite**

Run: `npm test`
Expected: every suite prints `OK`, including `penalty.test.js OK` (16 suites total).

- [ ] **Step 2: Syntax-check the changed client modules**

Run: `node --check public/js/penalty.js && node --check public/js/matchdetail.js`
Expected: no output (exit 0).

- [ ] **Step 3: Browser-verify both views.** Start the preview server (`preview_start` config `worldcup`; if port 3001 is held by another `node server.js`, stop it first or rely on `autoPort`). Open a knockout match panel that has a shootout (e.g. via the Schedule tab). Confirm:
  - Default **By player** view: the net shows ONLY the current taker's marker, the zones are shaded by that player's direction %, and a "Likely direction" chip row shows their top zones. Stepping with arrows/dots changes the player, the single marker, the shading, and the win-probability bars together.
  - **Compiled** toggle: the net shows every marker again with the league scoring-probability shading, and a table lists every kick (#, team, taker, outcome, direction, running score).
  - Switching back to **By player** restores the isolated view at the last-viewed kick.
  - Capture a screenshot of each view to confirm visually.

- [ ] **Step 4: Final commit (if any verification fixes were needed)**

```bash
git add -A
git commit -m "test(shootout): verify per-player + compiled penalty views"
```

---

## Self-review notes
- **Spec coverage:** (1) per-player direction probability → Task 1 model + Task 3 net shading + Task 4 `directionBreakdown`; (2) other penalties hidden per person → Task 3 `netSvg('player')` filters to `index === cur`; (3) compiled view with all data → Task 4 `compiledHtml` (all markers + table). Win-probability preserved (Task 4 `stageHtml` keeps the bars; `winProbSteps` untouched).
- **Type consistency:** `directionTendency` returns `{id,label,col,row,p}`; consumed by `netSvg` (`t.id`,`t.p`), `directionBreakdown` (`t.label`,`t.p`), and `sampleZone`. `buildShootout` sets `st.tendency`, `st.zone`, `st.cx`, `st.cy`. Views read `soData`/`soIndex`/`soView` keyed by `num`; all nav handlers call `soRender(num)` which rebuilds `#so-body-${num}` from `soBody(num)`.
- **No placeholders:** every step has full code or an exact command + expected result.
