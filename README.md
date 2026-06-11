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
