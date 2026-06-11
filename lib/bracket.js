// lib/bracket.js
'use strict';
const { findTeam } = require('./teams');

// Decisive score: penalties beat extra time beat full time.
function decisive(m) {
  if (!m.score) return null;
  return m.score.p || m.score.et || m.score.ft || null;
}

function matchWinner(m) {
  const s = decisive(m);
  if (!s || s[0] === s[1]) return null;
  return s[0] > s[1] ? m.team1 : m.team2;
}

function matchLoser(m) {
  const s = decisive(m);
  if (!s || s[0] === s[1]) return null;
  return s[0] > s[1] ? m.team2 : m.team1;
}

// matches: raw openfootball list; standings: output of computeStandings.
// Returns knockout matches with team slots resolved where possible.
function buildBracket(matches, standings) {
  const numbered = matches.map((m, i) => ({ ...m, num: m.num || i + 1 }));
  const byNum = new Map(numbered.map(m => [m.num, m]));

  function resolveRef(ref) {
    if (!ref) return null;
    const direct = findTeam(ref);
    if (direct) return direct.name;
    let m;
    if ((m = /^([12])([A-L])$/.exec(ref))) {
      const g = standings['Group ' + m[2]];
      if (g && g.complete && g.table[+m[1] - 1]) return g.table[+m[1] - 1].team;
      return null;
    }
    if ((m = /^W(\d+)$/.exec(ref))) {
      const src = byNum.get(+m[1]);
      const w = src && matchWinner(src);
      return w ? resolveRef(w) || w : null;
    }
    if ((m = /^L(\d+)$/.exec(ref))) {
      const src = byNum.get(+m[1]);
      const l = src && matchLoser(src);
      return l ? resolveRef(l) || l : null;
    }
    return null; // third-place pools etc. stay unresolved
  }

  return numbered
    .filter(m => !m.group)
    .map(m => {
      const r1 = resolveRef(m.team1);
      const r2 = resolveRef(m.team2);
      return {
        num: m.num,
        round: m.round,
        date: m.date || null,
        time: m.time || null,
        ground: m.ground || null,
        ref1: m.team1,
        ref2: m.team2,
        team1: r1 || m.team1,
        team2: r2 || m.team2,
        resolved1: !!r1,
        resolved2: !!r2,
        score: m.score || null
      };
    });
}

module.exports = { buildBracket, matchWinner, matchLoser };
