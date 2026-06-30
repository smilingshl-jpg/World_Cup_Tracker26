# Mobile Responsiveness Pass Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the World Cup hub usable and comfortable on phones — no horizontal page scroll, a scrollable tab bar, single-column grids, tables that scroll inside their cards, readable match rows, and a less-cramped match-detail panel.

**Architecture:** Almost entirely CSS — one comprehensive `@media (max-width: 700px)` block in `public/styles.css` plus a tiny `bracket.js` change that moves the bracket's grid-column definition out of an inline style into a CSS variable so media queries can control column width. No new dependencies, no markup restructure.

**Tech Stack:** Vanilla CSS + a one-line ESM change. Verification via the Claude_Preview MCP at mobile viewport widths.

---

## Context (current mobile problems, from auditing `public/styles.css` + `index.html`)
- `index.html` already has `<meta name="viewport" content="width=device-width, initial-scale=1">` — good baseline.
- **Horizontal page overflow** (the worst issue) comes from: `.venue-grid` `minmax(430px,…)` (wider than a phone), `.group-grid` `minmax(340px,…)`, and every `<table>` using `white-space: nowrap` at 14px (standings/stats overflow the viewport).
- **Tab bar** (`.tabs`) `flex-wrap`s onto 2–3 rows on a phone, eating vertical space under the sticky header.
- **Bracket** sets `grid-template-columns: repeat(N, minmax(150px,1fr))` as an **inline style** in `public/js/bracket.js` (renderBracket), which overrides any CSS media query — so the 9-column bracket can't be narrowed for mobile.
- **Match-detail**: `.lineups` is a hard `1fr 1fr`; the `.pitch` is `16/9` (~200px tall on a phone) so 22 player dots overlap; `.stat-row` has a fixed `110px` label column.
- **Tap targets**: `.so-dot` (12px), `.star` (17px), `.tab` padding are small for touch.

Only two existing `@media (max-width: 700px)` one-liners exist (the `.bracket2 .round-col` min-width and the `.data-status`/`main` rule) — this plan folds both into one consolidated block.

## File structure
- `public/js/bracket.js` — replace the inline `grid-template-columns` with a `--cols` CSS variable.
- `public/styles.css` — add `grid-template-columns` (using `--cols`) to the base `.bracket2` rule; remove the two stand-alone `@media (max-width:700px)` one-liners; append one consolidated mobile block.

---

## Task 1: Move bracket column sizing into CSS (so media queries can control it)

**Files:**
- Modify: `public/js/bracket.js` (renderBracket — the `.bracket2` wrapper)
- Modify: `public/styles.css:176` (`.bracket2` base rule)

- [ ] **Step 1: Replace the inline grid style with a CSS variable.** In `public/js/bracket.js`, find this line inside `renderBracket`:

```js
    body = `<div class="bracket2" style="grid-template-columns:repeat(${cols.length}, minmax(150px, 1fr));">${cols.join('')}</div>`;
```

Replace it with:

```js
    body = `<div class="bracket2" style="--cols:${cols.length};">${cols.join('')}</div>`;
```

- [ ] **Step 2: Move the column definition into the base `.bracket2` CSS rule.** In `public/styles.css`, replace line 176:

```css
.bracket2 { display: grid; gap: 8px; overflow-x: auto; padding-bottom: 10px; }
```

with:

```css
.bracket2 { display: grid; grid-template-columns: repeat(var(--cols, 6), minmax(150px, 1fr)); gap: 8px; overflow-x: auto; padding-bottom: 10px; }
```

- [ ] **Step 3: Verify the module still parses**

Run: `node --check public/js/bracket.js`
Expected: no output (exit 0).

- [ ] **Step 4: Verify the full test suite is still green** (bracket-tree/picks tests exercise this module)

Run: `npm test`
Expected: all 16 suites print `OK`.

- [ ] **Step 5: Commit**

```bash
git add public/js/bracket.js public/styles.css
git commit -m "refactor(bracket): drive grid columns via --cols var (enables mobile sizing)"
```

---

## Task 2: Consolidated mobile stylesheet block

**Files:**
- Modify: `public/styles.css` (remove the two existing `@media (max-width: 700px)` one-liners at ~line 190 and the last line of the file; append the consolidated block at the end)

- [ ] **Step 1: Remove the stand-alone bracket media one-liner.** Delete this line from `public/styles.css` (currently ~line 190, immediately after the `.bracket-flat .round-col` rule):

```css
@media (max-width: 700px) { .bracket2 .round-col { min-width: 116px; } }
```

- [ ] **Step 2: Remove the trailing media one-liner.** Delete this line from the very end of `public/styles.css`:

```css
@media (max-width: 700px) { .data-status { display: none; } main { padding: 12px; } }
```

- [ ] **Step 3: Append the consolidated mobile block** to the end of `public/styles.css`:

```css
/* ===== mobile (phones / small tablets) ===== */
@media (max-width: 700px) {
  main { padding: 12px; }
  .data-status { display: none; }

  /* tab bar: a single horizontally-scrollable row instead of wrapping */
  .topbar { gap: 8px; padding: 8px 12px; }
  .wordmark { font-size: 17px; }
  .tabs { flex-wrap: nowrap; overflow-x: auto; width: 100%; -webkit-overflow-scrolling: touch; scrollbar-width: none; }
  .tabs::-webkit-scrollbar { display: none; }
  .tab { flex: none; padding: 9px 13px 7px; font-size: 13px; }

  /* grids: 1 column on phones, 2 where there's room (~560px+) */
  .group-grid, .team-grid, .venue-grid { grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 12px; }
  .lineups { grid-template-columns: 1fr; gap: 12px; }

  /* wide tables scroll inside their card rather than overflowing the page */
  .card { overflow-x: auto; }
  th, td { padding: 5px 7px; font-size: 12.5px; }

  /* bracket: narrower columns; both layouts still scroll horizontally on their own */
  .bracket2 { grid-template-columns: repeat(var(--cols, 6), minmax(112px, 1fr)); }
  .bracket2 .round-col { min-width: 112px; }
  .bracket-flat .round-col { min-width: 180px; }

  /* match rows: tighten spacing, shrink the meta + score so team names keep room */
  .vs-row .inner { gap: 8px; padding: 8px 10px; }
  .match-meta { min-width: 0; font-size: 10px; }
  .vs-row.compact .match-meta { min-width: 0; }
  .vs-row .match-score { min-width: 54px; font-size: 14px; }

  /* match-detail pitch: squarer + smaller markers so all 11 fit without overlap */
  .pitch { aspect-ratio: 1 / 1; }
  .pitch-head { font-size: 11px; }
  .pl .dot { width: 22px; height: 22px; font-size: 9px; border-width: 2px; }
  .pl .pname { font-size: 8.5px; max-width: 52px; }

  /* stat bars: label drops to its own centered line, bar gets full width */
  .stat-row { grid-template-columns: 40px 1fr 40px; }
  .stat-row .sl { grid-column: 1 / -1; text-align: center; }

  /* shootout + touch targets */
  .so-net-wrap { max-width: 100%; }
  .so-table { font-size: 11px; }
  .so-dot { width: 16px; height: 16px; }
  .so-arrow { width: 38px; height: 34px; }
  .star { font-size: 20px; padding: 0 4px; }
}
```

- [ ] **Step 4: Commit**

```bash
git add public/styles.css
git commit -m "feat(mobile): consolidated responsive stylesheet for phones"
```

---

## Task 3: Verify on mobile viewports

**Files:** none (verification only)

> The dev server runs on port 3001; the user often holds it. Coordinate: if `preview_start` reports the port is busy, ask the user to free it (or stop their instance) before verifying.

- [ ] **Step 1: Start the preview and emulate a phone**

Use `preview_start` (config `worldcup`). Then `preview_resize` to `{ preset: 'mobile' }` (375×812).

- [ ] **Step 2: Assert no horizontal page overflow on every tab.** For each view, click its tab then run this check via `preview_eval`:

```js
(() => {
  const tabs = [...document.querySelectorAll('.tab')];
  const out = {};
  return (async () => {
    for (const t of tabs) {
      t.click();
      await new Promise(r => setTimeout(r, 250));
      out[t.textContent.trim()] = {
        overflow: document.documentElement.scrollWidth - window.innerWidth, // want <= 0
      };
    }
    return out;
  })();
})()
```

Expected: every tab's `overflow` is `<= 0` (no horizontal page scroll). Bracket is allowed to scroll *within* its own `.bracket2` container, but the page itself must not overflow.

- [ ] **Step 3: Spot-check the cramped surfaces.** Confirm via `preview_eval` / `preview_screenshot`:
  - Tabs sit on ONE row and scroll horizontally: `getComputedStyle(document.querySelector('.tabs')).flexWrap === 'nowrap'` and `.tabs.scrollWidth > .tabs.clientWidth`.
  - Groups/Stats: open a tab with a standings table; confirm the table scrolls inside its `.card` (card `scrollWidth > clientWidth`) and the page does not overflow.
  - Open a finished match's detail panel; screenshot the pitch — all 11 dots per side visible without heavy overlap.
  - Open a penalty shootout; the net + carousel fit within the viewport width.

- [ ] **Step 4: Screenshot each tab at 375px** (`preview_screenshot`) for a visual record, and one at 360px (`preview_resize { width: 360, height: 800 }`) to confirm the narrowest common phone is clean.

- [ ] **Step 5: Commit any verification fixes** (only if a check failed and required a CSS tweak)

```bash
git add public/styles.css public/js/bracket.js
git commit -m "fix(mobile): address overflow/layout issues found in verification"
```

---

## Self-review notes
- **Spec coverage** ("better fit for mobile users"): no horizontal overflow (Task 2 grids + table-in-card + Task 3 assertion); usable navigation (scrollable tab bar); readable content (single-column grids, tighter match rows, label-on-own-line stat bars); less-cramped detail panel (squarer pitch + smaller markers, stacked lineups); better touch targets (dots/arrows/stars/tabs).
- **Why the bracket needs Task 1:** the inline `grid-template-columns` would otherwise win over any media query; moving it to `--cols` is the minimal change that lets CSS size the columns per breakpoint. Function name `renderBracket` and the `cols` array are unchanged.
- **Type/selector consistency:** `--cols` is set inline in `bracket.js` and consumed by `.bracket2 { grid-template-columns: repeat(var(--cols, 6), …) }` in both the base rule (Task 1) and the mobile override (Task 2). The `repeat(auto-fill, minmax(260px,1fr))` values match the existing desktop grid idiom already used by `.group-grid`/`.team-grid`.
- **No placeholders:** every CSS/JS change is given in full; the verification step includes the exact overflow assertion.
- **Risk:** CSS-only + one inline-style swap; lowest-risk category. The `.card { overflow-x:auto }` rule only adds a scrollbar when content actually overflows, so non-table cards are unaffected.
