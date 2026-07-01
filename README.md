# World Cup 2026 Hub

Self-hosted, all-in-one dashboard for the 2026 FIFA World Cup in a dark
broadcast-TV style driven by each nation's kit colors.

## Features

- **Today** — kickoff countdown + today's matches as team-color versus banners
- **Groups** — 12 live tables with kit stripes, final-matchday qualification
  scenario chips (THROUGH / ALIVE / 3RD-RACE / OUT), best-8 third-place race
- **Schedule** — all 104 matches in your local timezone, filters, expandable scorers
- **Bracket** — two-wing TV bracket (final in the middle) + **Pick'em**: predict
  every knockout match, saved in your browser, scored against real results
- **Teams** — 48 cards: kit stripe, odds rank, simulator road odds, World Cup history
- **Stats** — Golden Boot leaderboard, 10,000-run Monte Carlo "road to the final",
  bookmaker odds table, goals by round
- **Venues** — all 16 stadiums with capacity and their match slates
- **News ticker** — BBC Football headlines under the header

## Run

    npm start          # http://localhost:3001

Optional live odds (free key from https://the-odds-api.com):

    $env:ODDS_API_KEY = "yourkey"; npm start

Without a key the site uses a bundled real-odds snapshot (DraftKings, 2026-06-05).

## Host it online (Cloudflare Tunnel)
cloudflared tunnel --url http://localhost:3001
Expose the locally-running server on a public HTTPS URL — no ports opened, free.
`host.ps1` starts the server and the tunnel together (Ctrl+C stops both).

    .\host.ps1                    # quick tunnel: random https://<name>.trycloudflare.com

For a stable URL on your own domain (optionally locked to your login):

    .\host.ps1 -Named worldcup    # named tunnel — one-time setup below

Full walkthrough (login, DNS, Cloudflare Access lockdown, always-on service):
[HOSTING.md](HOSTING.md).



## Data sources

- Fixtures, results & scorers: openfootball/worldcup.json (public domain, no key, cached 5 min)
- Live odds: The Odds API `soccer_fifa_world_cup_winner` outrights (cached 6 h)
- News: BBC Sport football RSS (cached 15 min)
- Simulator: Bradley–Terry model over de-vigged outright odds (10,000 seeded iterations)

## API

`/api/tournament` · `/api/odds` · `/api/simulation` · `/api/news` · `/api/stadiums`

## Tests

    npm test           # 16 plain-assert suites
