# Ultimate World Cup 2026 Hub — Design Spec

Date: 2026-06-11 · Status: approved by user · Builds on the shipped v0.1 hub (commit bbfcb07)

## Goal

Turn the working six-tab hub into the "ultimate all-in-one" World Cup site: a dark
broadcast-TV visual identity driven by each nation's kit colors, a real two-wing
bracket with Pick'em, an odds-driven tournament simulator, Golden Boot tracking,
and venue/history/scenario/news content — all on the existing zero-dependency
Node ≥18 + vanilla JS stack (Approach 1; no frameworks, no npm deps).

## Non-goals

- No user accounts or server-side persistence of user data (Pick'em is localStorage, single browser).
- No live minute-by-minute match data (upstream updates post-hoc; UI labels "LIVE" by kickoff window only).
- No light theme. No framework/rewrite. No calendar/.ics export (explicitly not picked).

## 1. Visual system — "Ink Broadcast × Team Colors"

**Chrome (always dark, team-color-safe):**
- Background `#14181d`, panels `#1d242c`, hairlines `#2d3742`, body text `#f6f1e7` (warm cream),
  muted `#9aa3b2`, label-gold `#fde68a`, win-green `#22c55e`, live-red `#dc2626`.
- Display type: bold condensed italic via local font stack (`'Arial Black', 'Segoe UI Black', sans-serif`,
  `font-style: italic`, tight letter-spacing) for the wordmark, tab strip, scores, big numerals.
  Body stays `system-ui`. No webfonts (zero-dep rule).
- Sharp corners everywhere (border-radius 0 on structural panels; chips may keep pills).
- Header = broadcast title bar: `WORLD CUP 26` wordmark with angled accent stripe
  (CSS skew), tab strip styled as a TV rundown, thin news ticker strip beneath it (see §8).
- Small ALL-CAPS letterspaced gold labels for metadata (venue, round, group).

**Team colors (`data/team-colors.json`):** all 48 teams → 2–3 official kit hexes:
`{ "Mexico": ["#006847", "#ce1126", "#ffffff"], "Japan": ["#002984", "#e60012"], ... }`.
Keys are canonical team names from `lib/teams.js`. Served inside `/api/tournament` team objects
as `colors`. Two consumers, per user selection:

- **(A) Kit-stripe accents:** group-table rows, team cards, Golden Boot rows, and bracket slots get
  a team-colored left edge plus a thin multi-stop gradient stripe built from the team's colors.
- **(B) Versus banners:** Today + Schedule match rows render as head-to-head banners — team 1's
  primary color bleeds in from the left at ~105°, team 2's from the right, ink score chip centered.
  Team names always sit on a dark scrim overlay so any kit color stays readable.

**Navigation:** seven tabs — Today · Groups · Schedule · Bracket · Teams · Stats · Venues.
Pick'em lives inside Bracket (toggle), simulator inside Stats + team cards, history on team
cards, scenarios inside Groups.

## 2. TV bracket (two wings, final center)

- 9-column grid: `R32-L · R16-L · QF-L · SF-L · CENTER · SF-R · QF-R · R16-R · R32-R`.
- Tree derived from data, never hardcoded: start at the Final, follow `W##` feeder refs
  backwards recursively; Final's first feeder subtree = left wing, second = right wing.
  Matches whose refs are already real team names still resolve via the existing
  `lib/bracket.js` num map. If the chain is incomplete (missing rounds upstream),
  fall back to the current flat column layout.
- Cells: both slots with kit stripes, score, gold-highlighted winner, venue/date in label type.
- Center column: Final (large, trophy header) stacked above third-place match.
- Responsive: below ~1100px viewport width, render the existing single-direction layout
  (horizontal scroll) instead of two wings.
- Connectors: CSS border "elbow" lines between columns (pseudo-elements); skipped in fallback.

## 3. Bracket Pick'em

- `Real / My Picks` toggle on the Bracket tab; same tree renderer, different data source.
- Picks mode: clicking a team in a slot advances it to the next round's slot. Changing a pick
  clears all downstream picks that depended on the previous winner.
- Slots whose real participants are unknown (unresolved `1A`/third-place pools) are unpickable.
  When a slot's real participants later change/appear, stale picks referencing teams no longer
  in that subtree are pruned on load.
- Storage: `localStorage["wc26-picks-v1"]` = `{ "<matchNum>": "<teamName>", ... }`.
- Scoring (pure function, unit-tested): correct pick of a match's real winner scores by round —
  R32 1, R16 2, QF 4, SF 8, Final 16 (third-place match 8). Score chip on the toggle:
  "Your bracket: N pts · k/m correct".

## 4. Tournament simulator

- `lib/sim.js`, exposed at `GET /api/simulation`.
- Strength s_i = de-vigged outright win probability (existing `lib/odds.js` output).
- Match model: Bradley–Terry `pA = sA/(sA+sB)`; group matches add a fixed 24% draw share
  (win probs scaled to the remaining 76%); knockout draws resolved by re-flip (coin weighted pA).
- Simulates the REMAINING tournament from current real standings/results, 10,000 iterations,
  seeded RNG (mulberry32) so tests are deterministic.
- Third-place R32 allocation inside the sim: best-8 thirds enter the unresolved third-place
  slots in bracket order (documented simplification — FIFA's 495-combo table not modeled).
- Output: per-team probability of reaching R32 / R16 / QF / SF / Final / Champion.
- Cached; recomputed only when the (results, odds) signature changes.
- UI: sortable table + bar chart on Stats ("ROAD TO THE FINAL — model"), one-line odds on each
  team card. Labelled "model from bookmaker outrights", distinct from the raw odds table.

## 5. Golden Boot

- `lib/scorers.js` parses `goals1`/`goals2` arrays on finished matches
  (openfootball format: `{ name, minute, offset?, penalty? }` — verify exact field names against
  live data when first results land; the parser must tolerate missing fields).
- Stats tab: leaderboard (rank, player, team + kit stripe, goals, pens noted). Ties share rank.
- Schedule/Today: finished match rows expand on click to show scorers + minutes per side.

## 6. Venues tab

- `data/stadiums.json`: 16 entries `{ ground, city, country, capacity }` where `ground`
  matches the match data's `ground` strings (alias list if upstream spellings vary).
- Cards per stadium: name, city/country, capacity, count + list of its matches (versus-banner
  mini rows). Unknown grounds in data render a plain card with just the matches (no hard fail).

## 7. World Cup history

- `data/wc-history.json`: per canonical team — `{ titles, appearances, bestFinish }`
  (curated static data, accurate as of 2026; includes e.g. Brazil 5 titles).
- Team cards show: title stars, "Nth appearance", best finish. Debutants flagged "DEBUT".

## 8. Qualification scenarios

- `lib/scenarios.js`: for each group where every team has ≤1 group match remaining,
  enumerate remaining match outcomes (≤9 combos) and classify each team:
  `THROUGH` (top-2 in all combos) · `OUT` (never top-3-with-qualifying-chance) ·
  `ALIVE` (otherwise), plus short text like "wins and is through".
- Third-place nuance: teams whose fate depends on other groups get `3RD-PLACE RACE`
  with the current best-8 cutoff shown; cross-group outcomes are NOT enumerated.
- Groups view: status chips on rows + one-line explanation under the table, only when applicable.

## 9. News ticker

- `lib/news.js`: server-side fetch of BBC Football RSS (`http://feeds.bbci.co.uk/sport/football/rss.xml`),
  minimal regex/string XML item parsing (title, link, pubDate), cached 15 min via existing Fetcher
  (needs a text mode: Fetcher gains `getText()` or news module caches internally).
- `GET /api/news` → `{ items: [{title, link, pubDate}], fetchedAt }`; failures → `{ items: [] }`.
- UI: thin auto-scrolling strip under the header on all tabs (CSS marquee animation,
  pauses on hover, links open in new tab). Hidden entirely when `items` is empty.

## 10. Architecture changes

- Client split: `public/app.js` → `public/js/` ES modules (`<script type="module">`):
  `main.js` (state, polling, signature guards, tabs), `format.js` (shared helpers),
  one file per view: `today.js, groups.js, schedule.js, bracket.js (incl. pick'em), teams.js,
  stats.js, venues.js`, plus `ticker.js`.
- Server: new endpoints `/api/simulation`, `/api/news`; `/api/tournament` teams gain `colors`,
  matches already carry scorer arrays through (no change needed beyond passthrough).
- New libs: `sim.js, scorers.js, scenarios.js, news.js`. New data: `team-colors.json,
  stadiums.json, wc-history.json`.
- Existing signature-guard polling pattern retained (uno flicker lesson).

## 11. Testing

Plain-assert node scripts, added to `npm test`:
- `sim.test.js` — seeded determinism; probs in [0,1]; champion probs sum ≈ 1; stronger team wins more.
- `scorers.test.js` — aggregation, penalties, tolerant of missing fields.
- `scenarios.test.js` — crafted last-matchday group: THROUGH/OUT/ALIVE all exercised; inactive before final matchday.
- `bracket-tree.test.js` — wing derivation from W## chains on a synthetic 8-team bracket; fallback flag when chain broken.
- `picks.test.js` — scoring function; downstream-clear logic (pure helpers shared with client via duplicated pure JS or a small common file served statically and required in tests).
- `news.test.js` — parse fixture RSS XML; empty/failure path.
- Data integrity inside `teams.test.js`-style checks: team-colors/history cover exactly the 48 canonical names; stadiums grounds match fixture data grounds.
- UI verified against the live preview (all tabs, console clean, flicker guard re-proven).

## 12. Risks / open points

- [UNCLEAR] Exact openfootball scorer-array field names for 2026 — parser written tolerant; verify on first real result.
- [UNCLEAR] BBC RSS availability/format drift — ticker degrades to hidden.
- Bracket wing derivation assumes the Final's feeders chain down to R32 via W## refs once
  upstream publishes them; until then the two-wing view may legitimately fall back.
- Sim's third-place slot assignment is a documented simplification.
