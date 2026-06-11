// lib/sim.js
'use strict';
const { findTeam } = require('./teams');
const { computeStandings, thirdPlaceTable } = require('./standings');

function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const DRAW_SHARE = 0.24; // group games
const STAGE_OF_ROUND = (round) => {
  const r = String(round || '').toLowerCase();
  if (r.includes('32')) return 'r32';
  if (r.includes('16')) return 'r16';
  if (r.startsWith('quarter')) return 'qf';
  if (r.startsWith('semi')) return 'sf';
  if (r.includes('third')) return null; // 3rd-place match doesn't define progression
  if (r === 'final') return 'final';
  return null;
};
const STAGES = ['r32', 'r16', 'qf', 'sf', 'final', 'champion'];

function decisive(m) { return (m.score && (m.score.p || m.score.et || m.score.ft)) || null; }

// matches: raw match list (with num); groups: {name:[teams]}; oddsEntries: [{team, prob}]
function simulate({ matches, groups, oddsEntries, iterations = 10000, seed = 1 }) {
  const rng = mulberry32(seed);
  const strength = new Map(oddsEntries.map(e => [e.team, Math.max(e.prob, 1e-4)]));
  const sOf = (t) => strength.get(t) || 1e-4;
  const bt = (a, b) => sOf(a) / (sOf(a) + sOf(b));
  const knownTeam = (ref) => {
    const direct = findTeam(ref);
    if (direct) return direct.name;
    return Object.values(groups).some(arr => arr.includes(ref)) ? ref : null;
  };

  const groupMatches = matches.filter(m => m.group);
  const koMatches = matches.filter(m => !m.group).sort((a, b) => a.num - b.num);
  const counts = {}; // team -> stage -> n
  const bump = (team, stage) => {
    if (!team || !stage) return;
    const c = (counts[team] = counts[team] || { r32: 0, r16: 0, qf: 0, sf: 0, final: 0, champion: 0 });
    c[stage]++;
  };

  for (let it = 0; it < iterations; it++) {
    // 1. complete the group stage
    const simGroup = groupMatches.map(m => {
      if (m.score && m.score.ft) return m;
      const r = rng();
      const pA = (1 - DRAW_SHARE) * bt(m.team1, m.team2);
      const ft = r < pA ? [1, 0] : r < pA + DRAW_SHARE ? [1, 1] : [0, 1];
      return { ...m, score: { ft } };
    });
    const standings = computeStandings(groups, simGroup);
    const thirdsQ = thirdPlaceTable(standings).filter(t => t.qualified).map(t => t.team);

    // 2. knockout
    const winners = new Map();
    const losers = new Map();
    let thirdIdx = 0;
    const resolve = (ref) => {
      if (!ref) return null;
      const direct = knownTeam(ref);
      if (direct) return direct;
      let m;
      if ((m = /^([12])([A-L])$/.exec(ref))) {
        const g = standings['Group ' + m[2]];
        return g && g.table[+m[1] - 1] ? g.table[+m[1] - 1].team : null;
      }
      if ((m = /^W(\d+)$/.exec(ref))) return winners.get(+m[1]) || null;
      if ((m = /^L(\d+)$/.exec(ref))) return losers.get(+m[1]) || null;
      if (/^3/.test(ref)) return thirdsQ[thirdIdx++] || null; // documented simplification
      return null;
    };

    let champion = null;
    for (const m of koMatches) {
      const t1 = resolve(m.team1), t2 = resolve(m.team2);
      const stage = STAGE_OF_ROUND(m.round);
      bump(t1, stage); if (t2 !== t1) bump(t2, stage);
      let w, l;
      const real = decisive(m);
      if (real && real[0] !== real[1]) {
        w = real[0] > real[1] ? t1 : t2; l = w === t1 ? t2 : t1;
      } else if (t1 && t2 && t1 !== t2) {
        w = rng() < bt(t1, t2) ? t1 : t2; l = w === t1 ? t2 : t1;
      } else { w = t1 || t2 || null; l = null; }
      winners.set(m.num, w); losers.set(m.num, l);
      if (stage === 'final') champion = w;
    }
    bump(champion, 'champion');
  }

  const teams = {};
  for (const [team, c] of Object.entries(counts)) {
    teams[team] = {};
    for (const s of STAGES) teams[team][s] = c[s] / iterations;
  }
  return { iterations, seed, model: 'Bradley-Terry on de-vigged outright odds', teams };
}

module.exports = { simulate, mulberry32 };
