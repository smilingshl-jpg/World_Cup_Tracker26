// lib/standings.js
'use strict';
const { findTeam } = require('./teams');

// Resolve a raw name to canonical if possible, else use it verbatim
// (lets tests use synthetic team names like 'P').
function canon(raw) {
  const t = findTeam(raw);
  return t ? t.name : raw;
}

function ftScore(m) {
  return m.score && Array.isArray(m.score.ft) ? m.score.ft : null;
}

function emptyRow(team) {
  return { team, played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, gd: 0, points: 0 };
}

function applyResult(row, scored, conceded) {
  row.played++;
  row.gf += scored;
  row.ga += conceded;
  row.gd = row.gf - row.ga;
  if (scored > conceded) { row.won++; row.points += 3; }
  else if (scored === conceded) { row.drawn++; row.points += 1; }
  else { row.lost++; }
}

// Head-to-head points among an exactly-tied cluster of rows.
function h2hPoints(clusterTeams, matches) {
  const pts = new Map(clusterTeams.map(t => [t, 0]));
  const inCluster = new Set(clusterTeams);
  for (const m of matches) {
    const t1 = canon(m.team1), t2 = canon(m.team2);
    const ft = ftScore(m);
    if (!ft || !inCluster.has(t1) || !inCluster.has(t2)) continue;
    if (ft[0] > ft[1]) pts.set(t1, pts.get(t1) + 3);
    else if (ft[0] < ft[1]) pts.set(t2, pts.get(t2) + 3);
    else { pts.set(t1, pts.get(t1) + 1); pts.set(t2, pts.get(t2) + 1); }
  }
  return pts;
}

// groups: { "Group A": [names] }; matches: full match list (group-stage entries used)
// Returns { "Group A": { complete, table: [rows] } }
function computeStandings(groups, matches) {
  const out = {};
  for (const [groupName, teamNames] of Object.entries(groups)) {
    const rows = new Map(teamNames.map(t => [t, emptyRow(t)]));
    const groupMatches = matches.filter(m => m.group === groupName);
    for (const m of groupMatches) {
      const ft = ftScore(m);
      if (!ft) continue;
      const t1 = canon(m.team1), t2 = canon(m.team2);
      if (rows.has(t1)) applyResult(rows.get(t1), ft[0], ft[1]);
      if (rows.has(t2)) applyResult(rows.get(t2), ft[1], ft[0]);
    }
    let table = [...rows.values()].sort(
      (a, b) => b.points - a.points || b.gd - a.gd || b.gf - a.gf || a.team.localeCompare(b.team)
    );
    // refine exactly-tied clusters (same pts, gd, gf) with head-to-head points
    for (let i = 0; i < table.length; ) {
      let j = i + 1;
      while (
        j < table.length &&
        table[j].points === table[i].points &&
        table[j].gd === table[i].gd &&
        table[j].gf === table[i].gf
      ) j++;
      if (j - i > 1) {
        const cluster = table.slice(i, j);
        const h2h = h2hPoints(cluster.map(r => r.team), groupMatches);
        cluster.sort((a, b) => h2h.get(b.team) - h2h.get(a.team) || a.team.localeCompare(b.team));
        table.splice(i, j - i, ...cluster);
      }
      i = j;
    }
    const complete = table.length > 0 && table.every(r => r.played >= table.length - 1);
    out[groupName] = { complete, table };
  }
  return out;
}

// Best 8 of the 12 third-placed teams advance (2026 rule): pts -> gd -> gf.
function thirdPlaceTable(standingsByGroup) {
  const thirds = [];
  for (const [group, { table }] of Object.entries(standingsByGroup)) {
    if (table[2]) thirds.push({ group, ...table[2] });
  }
  thirds.sort((a, b) => b.points - a.points || b.gd - a.gd || b.gf - a.gf || a.team.localeCompare(b.team));
  return thirds.map((t, i) => ({ ...t, qualified: i < 8 }));
}

module.exports = { computeStandings, thirdPlaceTable };
