// lib/tournament.js
'use strict';
const { TEAMS, findTeam, deriveGroups } = require('./teams');
const { computeStandings, thirdPlaceTable } = require('./standings');
const { buildBracket } = require('./bracket');

const SOURCE_TTL = 5 * 60 * 1000; // refetch fixtures/results every 5 minutes
const LIVE_WINDOW_MS = 130 * 60 * 1000; // kickoff + ~130min counts as in progress

// "13:00 UTC-6" + "2026-06-11" -> "2026-06-11T13:00:00-06:00"
function parseKickoff(date, time) {
  if (!date || !time) return null;
  const m = /^(\d{1,2}):(\d{2})\s*UTC([+-])(\d{1,2})(?::(\d{2}))?$/.exec(time);
  if (!m) return null;
  const hh = m[1].padStart(2, '0');
  const offH = m[4].padStart(2, '0');
  const offM = m[5] || '00';
  return `${date}T${hh}:${m[2]}:00${m[3]}${offH}:${offM}`;
}

function matchStatus(m, kickoffIso, now) {
  if (m.score && (m.score.ft || m.score.p || m.score.et)) return 'finished';
  if (kickoffIso) {
    const k = Date.parse(kickoffIso);
    if (!Number.isNaN(k) && now >= k && now < k + LIVE_WINDOW_MS) return 'live';
  }
  return 'upcoming';
}

async function buildTournament({ fetcher, sourceUrl, now = Date.now() }) {
  const raw = await fetcher.get(sourceUrl, SOURCE_TTL);
  const rawMatches = (raw.matches || []).map((m, i) => ({ ...m, num: m.num || i + 1 }));

  const matches = rawMatches.map((m) => {
    const kickoff = parseKickoff(m.date, m.time);
    const t1 = findTeam(m.team1);
    const t2 = findTeam(m.team2);
    return {
      ...m,
      team1: t1 ? t1.name : m.team1,
      team2: t2 ? t2.name : m.team2,
      flag1: t1 ? t1.flag : null,
      flag2: t2 ? t2.flag : null,
      kickoff,
      status: matchStatus(m, kickoff, now)
    };
  });

  const groups = deriveGroups(matches);
  const standings = computeStandings(groups, matches);
  const thirdPlace = thirdPlaceTable(standings);
  const bracket = buildBracket(rawMatches, standings).map(b => {
    const t1 = findTeam(b.team1);
    const t2 = findTeam(b.team2);
    return { ...b, flag1: t1 ? t1.flag : null, flag2: t2 ? t2.flag : null, kickoff: parseKickoff(b.date, b.time) };
  });

  const groupOf = {};
  for (const [g, teamNames] of Object.entries(groups)) for (const n of teamNames) groupOf[n] = g;
  const teams = TEAMS.map(t => ({ name: t.name, code: t.code, flag: t.flag, group: groupOf[t.name] || null }));

  return { generatedAt: new Date(now).toISOString(), name: raw.name || 'FIFA World Cup 2026', teams, groups, standings, thirdPlace, matches, bracket };
}

module.exports = { buildTournament, parseKickoff, matchStatus };
