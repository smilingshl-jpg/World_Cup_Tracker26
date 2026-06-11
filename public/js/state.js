export const state = { tournament: null, odds: null, sim: null, view: 'today', oddsAt: 0, simAt: 0 };
export const sigs = {}; // per-view render signatures

export function colorsOf(team) {
  const t = state.tournament && state.tournament.teams.find(x => x.name === team);
  return (t && t.colors) || ['#2d3742', '#2d3742'];
}

export function teamMap() {
  const m = {};
  if (state.tournament) for (const t of state.tournament.teams) m[t.name] = t;
  return m;
}
