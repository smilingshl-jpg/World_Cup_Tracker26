// lib/livescores.js
'use strict';
const { findTeam } = require('./teams');

// ESPN's public (unofficial) World Cup scoreboard JSON — supplements openfootball
// with near-live scores; openfootball stays the source of truth once it commits.
const ESPN_URL = 'https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard';
const LIVE_TTL = 60 * 1000;

function canon(raw) {
  const t = findTeam(raw);
  return t ? t.name : null;
}

function parseMinute(clockText) {
  const m = /(\d+)/.exec(String(clockText || ''));
  return m ? Number(m[1]) : null;
}

// Scoring plays -> goals arrays in openfootball shape, per side (by ESPN team id).
function parseDetails(details, homeId) {
  const home = [], away = [];
  for (const d of details || []) {
    if (!d || d.scoringPlay === false) continue;
    const text = String((d.type && d.type.text) || '');
    if (!/goal|penalty - scored/i.test(text)) continue;
    const name = d.athletesInvolved && d.athletesInvolved[0] && d.athletesInvolved[0].displayName;
    if (!name) continue;
    const goal = {
      name,
      minute: parseMinute(d.clock && d.clock.displayValue),
      penalty: /penalty/i.test(text),
      owngoal: /own goal/i.test(text)
    };
    // own goals are credited against the scorer's team -> count for the other side
    const forHome = (String(d.team && d.team.id) === String(homeId)) !== goal.owngoal;
    (forHome ? home : away).push(goal);
  }
  return { home, away };
}

// ESPN scoreboard JSON -> [{ team1, team2, score:[h,a], state, clock, goals1, goals2 }]
function parseScoreboard(scoreboard) {
  const out = [];
  for (const ev of (scoreboard && scoreboard.events) || []) {
    const comp = ev.competitions && ev.competitions[0];
    if (!comp || !Array.isArray(comp.competitors)) continue;
    const home = comp.competitors.find(c => c.homeAway === 'home');
    const away = comp.competitors.find(c => c.homeAway === 'away');
    if (!home || !away) continue;
    const team1 = canon(home.team && home.team.displayName);
    const team2 = canon(away.team && away.team.displayName);
    if (!team1 || !team2) continue;
    const status = (comp.status && comp.status.type) || (ev.status && ev.status.type) || {};
    const goals = parseDetails(comp.details, home.team && home.team.id);
    out.push({
      id: ev.id ? String(ev.id) : null,
      team1, team2,
      score: [Number(home.score) || 0, Number(away.score) || 0],
      state: status.state || 'pre', // 'pre' | 'in' | 'post'
      clock: (comp.status && comp.status.displayClock) || null,
      goals1: goals.home,
      goals2: goals.away
    });
  }
  return out;
}

// Overlay parsed entries onto raw openfootball matches (before standings are computed).
// - 'post'  -> commit score.ft (only if openfootball hasn't), flagged liveSource:'espn'
// - 'in'    -> attach m._live = { score, clock, goals1, goals2 } (no committed score)
// - 'pre'   -> untouched. Sides are swapped when ESPN's home/away order differs.
function applyLive(rawMatches, entries) {
  if (!Array.isArray(entries) || !entries.length) return rawMatches;
  const byPair = new Map();
  for (const e of entries) byPair.set(e.team1 + '|' + e.team2, e);

  for (const m of rawMatches) {
    if (m.score) continue;
    const t1 = canon(m.team1), t2 = canon(m.team2);
    if (!t1 || !t2) continue;
    let e = byPair.get(t1 + '|' + t2);
    let swapped = false;
    if (!e) { e = byPair.get(t2 + '|' + t1); swapped = !!e; }
    if (!e) continue;
    const score = swapped ? [e.score[1], e.score[0]] : e.score;
    const goals1 = swapped ? e.goals2 : e.goals1;
    const goals2 = swapped ? e.goals1 : e.goals2;
    if (e.state === 'post') {
      m.score = { ft: score };
      m.liveSource = 'espn';
      if (goals1.length || goals2.length) { m.goals1 = goals1; m.goals2 = goals2; }
    } else if (e.state === 'in') {
      m._live = { score, clock: e.clock, goals1, goals2 };
    }
  }
  return rawMatches;
}

module.exports = { parseScoreboard, applyLive, ESPN_URL, LIVE_TTL };
