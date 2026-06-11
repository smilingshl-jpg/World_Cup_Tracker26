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
