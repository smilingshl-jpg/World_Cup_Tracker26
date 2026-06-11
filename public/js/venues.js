import { state, colorsOf } from './state.js';
import { esc, vsRow } from './format.js';

let stadiums = null;
export async function loadStadiums() {
  if (!stadiums) stadiums = await fetch('/api/stadiums').then(r => r.json()).catch(() => []);
}

export function renderVenues() {
  const t = state.tournament;
  if (!stadiums) return { sig: 'loading', html: '<div class="card"><p>Loading venues…</p></div>' };
  const sig = JSON.stringify([stadiums.length, t.matches.map(m => [m.num, m.score && 1])]);

  const known = new Set(stadiums.flatMap(s => s.grounds));
  const cards = stadiums.map(s => {
    const ms = t.matches.filter(m => s.grounds.includes(m.ground));
    return `<div class="card venue-card">
      <h2>${esc(s.stadium)}</h2>
      <div class="label">${esc(s.city)}, ${esc(s.country)}</div>
      <div class="cap">Capacity ${s.capacity.toLocaleString()} · ${ms.length} matches</div>
      ${ms.map(m => vsRow(m, colorsOf)).join('')}
    </div>`;
  });
  // unknown grounds in upstream data still get a plain card (no hard fail)
  const unknownGrounds = [...new Set(t.matches.map(m => m.ground).filter(g => g && !known.has(g)))];
  for (const g of unknownGrounds) {
    const ms = t.matches.filter(m => m.ground === g);
    cards.push(`<div class="card venue-card"><h2>${esc(g)}</h2><div class="cap">${ms.length} matches</div>${ms.map(m => vsRow(m, colorsOf)).join('')}</div>`);
  }
  return { sig, html: `<div class="venue-grid">${cards.join('')}</div>` };
}
