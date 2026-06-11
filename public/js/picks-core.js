// Pure pick'em logic. Used by the browser bracket view and node tests (dynamic import).
export const ROUND_POINTS = {
  'Round of 32': 1, 'Round of 16': 2,
  'Quarter-final': 4, 'Quarter-finals': 4,
  'Semi-final': 8, 'Semi-finals': 8,
  'Match for third place': 8, 'Third place': 8,
  'Final': 16
};

function decisive(m) { return (m && m.score && (m.score.p || m.score.et || m.score.ft)) || null; }

export function realWinner(m) {
  const s = decisive(m);
  if (!s || s[0] === s[1]) return null;
  return s[0] > s[1] ? m.team1 : m.team2;
}

// Effective slot teams for a match in picks mode: real result > pick > null.
export function effectiveTeams(m, picks, byNum) {
  const slot = (ref, resolvedName, isResolved) => {
    const w = /^W(\d+)$/.exec(ref || '');
    if (w) {
      const src = byNum.get(+w[1]);
      if (src) {
        const rw = realWinner(src);
        if (rw) return rw;
        if (picks[src.num]) return picks[src.num];
        return null;
      }
    }
    return isResolved ? resolvedName : null;
  };
  return [slot(m.ref1, m.team1, m.resolved1), slot(m.ref2, m.team2, m.resolved2)];
}

// Set a pick, then prune any pick that is no longer one of its match's effective teams.
export function applyPick(picks, byNum, matchNum, team) {
  const next = { ...picks, [matchNum]: team };
  let changed = true;
  while (changed) {
    changed = false;
    for (const [numStr, picked] of Object.entries(next)) {
      const m = byNum.get(+numStr);
      if (!m) { delete next[numStr]; changed = true; continue; }
      const [a, b] = effectiveTeams(m, next, byNum);
      if (picked !== a && picked !== b) { delete next[numStr]; changed = true; }
    }
  }
  return next;
}

export function scorePicks(picks, bracket) {
  let points = 0, correct = 0, graded = 0;
  for (const m of bracket) {
    const pick = picks[m.num];
    if (!pick) continue;
    const w = realWinner(m);
    if (!w) continue;
    graded++;
    if (w === pick) { correct++; points += ROUND_POINTS[m.round] || 1; }
  }
  return { points, correct, graded };
}
