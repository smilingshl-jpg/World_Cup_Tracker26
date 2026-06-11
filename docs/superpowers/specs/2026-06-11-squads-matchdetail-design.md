# Squads + Match Details — Design Spec (addendum to ultimate-hub)

Date: 2026-06-11 · Approved: all four detail sections + inline expand (user choice)

## Goal
Player squads on every team card, and an inline match-details panel (click any
match row) with: lineups & formations, live match stats, head-to-head + recent
form, venue/referee/odds — powered by the same unofficial ESPN API as live scores.

## Data source (verified live against MEX–RSA, event 760415)
- Teams+ids: `…/fifa.world/teams` (48 teams, e.g. Argentina 202) — cached 24 h
- Roster: `…/fifa.world/teams/{id}/roster` (name, position, jersey, age) — cached 24 h, fetched lazily per team
- Event id: `…/fifa.world/scoreboard?dates=YYYYMMDD` matched by canonical team pair (swap-aware) — cached 60 s
- Match summary: `…/fifa.world/summary?event={id}` → rosters w/ formation, boxscore stats
  (possession, shots, corners, fouls, cards), headToHeadGames, lastFiveGames (form),
  gameInfo (venue, referee), pickcenter odds — cached 60 s
- All best-effort: any failure → panel shows whatever sections parsed; never crashes the site.

## Server
- `lib/espn.js`: pure parsers `parseTeams`, `parseRoster`, `parseSummary`, `findEvent`
  + fetch helpers; `lib/livescores.js` `parseScoreboard` gains an `id` field per entry.
- New endpoints:
  - `GET /api/roster?team=<canonical name>` → `{ team, players: [{name, position, jersey, age}] }`
  - `GET /api/matchdetail?num=<match num>` → `{ lineups, stats, h2h, form, info, odds }`
    (sections null when unavailable; pre-match returns rosters/odds/h2h only)

## Client
- Team cards get a lazy `<details>` "Squad" section → fetches `/api/roster` on first open,
  grouped GK/DF/MF/FW with jersey numbers.
- `public/js/matchdetail.js`: every `.vs-row` is clickable (`data-num`); click toggles an
  inline broadcast panel under the row: two-column lineups (formation headers), stat bars
  (two-sided share bars), h2h list, last-5 form chips (W/D/L), venue · referee · odds line.
- Open panels survive the 60 s signature-guard re-render (open-set remembered, re-applied
  and re-fetched after render) — so a goal updating the row doesn't close the panel.
- Wired on Today, Schedule and Venues (everywhere vs-rows render). The old scorers
  `<details>` expander is absorbed into the panel (scorers already render in the row's
  expander; panel supersedes it on click targets — keep scorers expander as-is).

## Tests
`tests/espn.test.js` — fixtures for teams/roster/summary parsing (formation, stats pairs,
h2h, form, referee, odds; tolerant of missing sections); `findEvent` pair matching incl.
reversed home/away; livescores test extended for `id` passthrough.

## Non-goals
No commentary timeline (ESPN doesn't expose one here), no player photos, no per-player
match ratings, no caching of rosters to disk beyond the standard Fetcher cache.
