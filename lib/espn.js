// lib/espn.js
'use strict';
const { findTeam } = require('./teams');
const { parseScoreboard } = require('./livescores');

// Same unofficial ESPN API as livescores. All parsers are tolerant: any missing
// section comes back null/empty so the match-detail panel degrades gracefully.
const TEAMS_URL = 'https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/teams';
const ROSTER_URL = (id) => `https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/teams/${id}/roster`;
const SCOREBOARD_DATE_URL = (yyyymmdd) => `https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard?dates=${yyyymmdd}`;
const SUMMARY_URL = (eventId) => `https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/summary?event=${eventId}`;

const DAY_TTL = 24 * 60 * 60 * 1000;
const MINUTE_TTL = 60 * 1000;

// curated boxscore stats, in display order
const STAT_LABELS = [
  ['possessionPct', 'Possession %'],
  ['totalShots', 'Shots'],
  ['shotsOnTarget', 'On target'],
  ['wonCorners', 'Corners'],
  ['foulsCommitted', 'Fouls'],
  ['yellowCards', 'Yellow cards'],
  ['redCards', 'Red cards'],
  ['saves', 'Saves']
];

// /teams -> Map<canonical name, espn id>
function parseTeams(json) {
  const out = new Map();
  const teams = (((json || {}).sports || [])[0] || { leagues: [{}] }).leagues?.[0]?.teams || [];
  for (const entry of teams) {
    const t = entry && entry.team;
    if (!t) continue;
    const canon = findTeam(t.displayName);
    if (canon) out.set(canon.name, String(t.id));
  }
  return out;
}

// /teams/{id}/roster -> [{name, jersey, age, position, pos}]
function parseRoster(json) {
  return ((json && json.athletes) || []).map(a => ({
    name: a.displayName || a.fullName || '?',
    jersey: a.jersey || null,
    age: Number.isFinite(a.age) ? a.age : null,
    position: (a.position && a.position.displayName) || null,
    pos: (a.position && a.position.abbreviation) || null
  }));
}

function parseLineups(rosters) {
  if (!Array.isArray(rosters) || !rosters.length) return null;
  const sides = [...rosters].sort((a) => (a.homeAway === 'home' ? -1 : 1));
  const lineups = sides.map(side => {
    const players = (side.roster || []).map(p => ({
      name: (p.athlete && p.athlete.displayName) || '?',
      jersey: p.jersey || null,
      pos: (p.position && p.position.abbreviation) || null,
      place: p.starter && p.formationPlace != null ? Number(p.formationPlace) || null : null,
      starter: !!p.starter
    }));
    return {
      team: (side.team && (findTeam(side.team.displayName)?.name || side.team.displayName)) || '?',
      formation: side.formation || null,
      starters: players.filter(p => p.starter).map(({ starter, ...p }) => p),
      subs: players.filter(p => !p.starter).map(({ starter, ...p }) => p)
    };
  });
  return lineups.some(l => l.starters.length) ? lineups : null;
}

function parseStats(boxscore) {
  const teams = (boxscore && boxscore.teams) || [];
  if (teams.length < 2) return [];
  const get = (i, key) => {
    const s = (teams[i].statistics || []).find(x => x.name === key);
    return s ? (s.displayValue ?? s.value ?? null) : null;
  };
  const out = [];
  for (const [key, label] of STAT_LABELS) {
    const home = get(0, key), away = get(1, key);
    if (home !== null || away !== null) out.push({ key, label, home, away });
  }
  return out;
}

function parseH2h(headToHeadGames) {
  const events = (headToHeadGames && headToHeadGames[0] && headToHeadGames[0].events) || [];
  if (!events.length) return null;
  return events.map(e => {
    const score = `${e.homeTeamScore ?? '?'}-${e.awayTeamScore ?? '?'}`;
    const opp = (e.opponent && e.opponent.displayName) || '?';
    return {
      date: e.gameDate || null,
      league: e.leagueName || null,
      result: e.gameResult || null,
      text: `${e.atVs === '@' ? 'at' : 'vs'} ${opp} ${score} (${e.leagueName || 'friendly'})`
    };
  });
}

function parseForm(lastFiveGames) {
  if (!Array.isArray(lastFiveGames) || !lastFiveGames.length) return null;
  return lastFiveGames.map(side => ({
    team: (side.team && (findTeam(side.team.displayName)?.name || side.team.displayName)) || '?',
    results: (side.events || []).map(e => ({
      result: e.gameResult || '?',
      score: `${e.homeTeamScore ?? '?'}-${e.awayTeamScore ?? '?'}`,
      opponent: (e.opponent && e.opponent.displayName) || '?'
    }))
  }));
}

// id -> 'home'|'away' from the rosters block
function sideMap(rosters) {
  const m = {};
  for (const r of rosters || []) {
    if (r.team && r.team.id != null) m[String(r.team.id)] = r.homeAway === 'home' ? 'home' : 'away';
  }
  return m;
}

function parseBroadcasts(broadcasts) {
  const names = [];
  for (const b of broadcasts || []) {
    const n = b && b.media && b.media.shortName;
    if (n && !names.includes(n)) names.push(n);
  }
  return names;
}

const TIMELINE_KINDS = /goal|yellow card|red card|substitution|penalty/i;

function parseTimeline(keyEvents, sides) {
  const out = [];
  for (const e of keyEvents || []) {
    const kind = (e.type && e.type.text) || '';
    if (!TIMELINE_KINDS.test(kind)) continue;
    out.push({
      clock: (e.clock && e.clock.displayValue) || '',
      kind,
      goal: !!e.scoringPlay || /goal/i.test(kind),
      side: (e.team && sides[String(e.team.id)]) || null,
      text: e.text || ''
    });
  }
  return out;
}

// ESPN `shootout`: [{ id: teamId, team: name, shots:[{shotNumber, player, didScore}] }].
// -> { result:[homeGoals, awayGoals], teams:[{ team, side, kicks:[{n,taker,scored}] }] } or null.
function parseShootout(shootout, sides) {
  if (!Array.isArray(shootout) || shootout.length < 2) return null;
  const teams = shootout.map(entry => {
    const canon = findTeam(entry.team);
    return {
      team: canon ? canon.name : (entry.team || '?'),
      side: sides[String(entry.id)] || null,
      kicks: ((entry.shots) || [])
        .map(sh => ({ n: Number(sh.shotNumber) || 0, taker: String(sh.player || '').trim(), scored: !!sh.didScore }))
        .sort((a, b) => a.n - b.n)
    };
  });
  const goalsOf = (t) => t.kicks.filter(k => k.scored).length;
  const home = teams.find(t => t.side === 'home');
  const away = teams.find(t => t.side === 'away');
  const result = (home && away) ? [goalsOf(home), goalsOf(away)] : [goalsOf(teams[0]), goalsOf(teams[1])];
  return { result, teams };
}

function parseSummary(json) {
  const s = json || {};
  const gi = s.gameInfo || {};
  const pick = (s.pickcenter && s.pickcenter[0]) || null;
  return {
    lineups: parseLineups(s.rosters),
    stats: parseStats(s.boxscore),
    h2h: parseH2h(s.headToHeadGames),
    form: parseForm(s.lastFiveGames),
    broadcasts: parseBroadcasts(s.broadcasts),
    timeline: parseTimeline(s.keyEvents, sideMap(s.rosters)),
    pens: parseShootout(s.shootout, sideMap(s.rosters)),
    info: {
      venue: (gi.venue && gi.venue.fullName) || null,
      referee: (gi.officials && gi.officials[0] && gi.officials[0].displayName) || null,
      attendance: gi.attendance || null
    },
    odds: pick ? {
      provider: (pick.provider && pick.provider.name) || null,
      details: pick.details || null,
      overUnder: pick.overUnder ?? null
    } : null
  };
}

// Find the ESPN event id for a team pair in a scoreboard (either order).
function findEvent(scoreboard, team1, team2) {
  for (const e of parseScoreboard(scoreboard)) {
    if ((e.team1 === team1 && e.team2 === team2) || (e.team1 === team2 && e.team2 === team1)) return e.id || null;
  }
  return null;
}

module.exports = {
  parseTeams, parseRoster, parseSummary, parseShootout, findEvent,
  TEAMS_URL, ROSTER_URL, SCOREBOARD_DATE_URL, SUMMARY_URL, DAY_TTL, MINUTE_TTL
};
