// Penalty shootout model: kick ordering + per-kick win probability. Pure ESM.
// Win prob is a Monte-Carlo of the remaining shootout (best-of-5 then sudden death)
// at a fixed per-kick conversion p, evaluated AFTER each kick so it swings live.

export function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Interleave the two teams' kicks into real shootout order (home #1, away #1, home #2 …).
export function orderedKicks(pens) {
  const home = pens.teams.find(t => t.side === 'home') || pens.teams[0];
  const away = pens.teams.find(t => t.side === 'away') || pens.teams[1];
  const maxN = Math.max(0, ...home.kicks.map(k => k.n), ...away.kicks.map(k => k.n));
  const seq = [];
  for (let n = 1; n <= maxN; n++) {
    const h = home.kicks.find(k => k.n === n);
    if (h) seq.push({ ...h, side: 'home', team: home.team });
    const a = away.kicks.find(k => k.n === n);
    if (a) seq.push({ ...a, side: 'away', team: away.team });
  }
  return { home, away, seq };
}

// Probability the home team wins from a mid-shootout state, one Monte-Carlo run.
// h,a = goals so far; ht,at = kicks already taken; p = conversion; rng() in [0,1).
function pHomeWins(h, a, ht, at, p, rng) {
  const rem = [];
  for (let r = 0; r < 5; r++) { if (r >= ht) rem.push(['h', r]); if (r >= at) rem.push(['a', r]); }
  rem.sort((x, y) => (x[1] * 2 + (x[0] === 'a' ? 1 : 0)) - (y[1] * 2 + (y[0] === 'a' ? 1 : 0)));
  let hk = ht, ak = at;
  for (const [side] of rem) {
    if (h > a + (5 - ak)) return 1;          // away can't catch up
    if (a > h + (5 - hk)) return 0;          // home can't catch up
    if (rng() < p) { if (side === 'h') h++; else a++; }
    if (side === 'h') hk++; else ak++;
  }
  if (h > a) return 1;
  if (a > h) return 0;
  for (;;) {                                  // sudden death
    const hs = rng() < p ? 1 : 0, as = rng() < p ? 1 : 0;
    if (hs && !as) return 1;
    if (as && !hs) return 0;
  }
}

// -> { home, away, steps:[{ index, side, team, taker, scored, n, homeGoals, awayGoals, pHome, pAway }] }
export function winProbSteps(pens, { p = 0.74, sims = 3000, seed = 20260 } = {}) {
  const { home, away, seq } = orderedKicks(pens);
  let h = 0, a = 0, hk = 0, ak = 0;
  const steps = [];
  for (let i = 0; i < seq.length; i++) {
    const k = seq[i];
    if (k.side === 'home') { hk++; if (k.scored) h++; } else { ak++; if (k.scored) a++; }
    const rng = mulberry32(seed + i * 7919);
    let wins = 0;
    for (let s = 0; s < sims; s++) wins += pHomeWins(h, a, hk, ak, p, rng);
    const pHome = wins / sims;
    steps.push({ index: i, side: k.side, team: k.team, taker: k.taker, scored: k.scored, n: k.n,
      homeGoals: h, awayGoals: a, pHome, pAway: 1 - pHome });
  }
  return { home, away, steps, p };
}
