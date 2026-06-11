// Derive a two-wing bracket layout from W## feeder refs. Pure ESM.
// Returns { final, third, left: [[SF],[QFs],[R16s],[R32s]], right: [...] } or null if underivable.
export function buildWings(bracket) {
  const byNum = new Map(bracket.map(m => [m.num, m]));
  const final = bracket.find(m => String(m.round).toLowerCase() === 'final');
  if (!final) return null;
  const third = bracket.find(m => String(m.round).toLowerCase().includes('third')) || null;

  const feeder = (ref) => {
    const m = /^W(\d+)$/.exec(ref || '');
    return m ? byNum.get(+m[1]) || null : null;
  };

  function subtreeColumns(root) {
    // BFS by depth: [[root], [its 2 feeders], [4], ...] — stop when a level has no feeders
    const cols = [];
    let level = [root];
    while (level.length) {
      cols.push(level);
      const next = [];
      for (const m of level) {
        const f1 = feeder(m.ref1), f2 = feeder(m.ref2);
        if (f1) next.push(f1);
        if (f2) next.push(f2);
      }
      // a level must be complete (2x parent) to be drawable as a wing
      if (next.length && next.length !== level.length * 2) return null;
      level = next;
    }
    return cols;
  }

  const f1 = feeder(final.ref1), f2 = feeder(final.ref2);
  if (!f1 || !f2) return null;
  const left = subtreeColumns(f1);
  const right = subtreeColumns(f2);
  if (!left || !right || left.length !== right.length) return null;
  return { final, third, left, right };
}
