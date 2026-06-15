import { state, colorsOf } from './state.js';
import { esc, vsRow } from './format.js';

let stadiums = null;
export async function loadStadiums() {
  if (!stadiums) stadiums = await fetch('/api/stadiums').then(r => r.json()).catch(() => []);
}

const lvl = (v, mid, hi) => (v >= hi ? 'hi' : v >= mid ? 'mid' : 'lo');

// conditions block: tier badge + per-factor mini-stats (0-100 risk; PM2.5 µg/m³; altitude m)
function conditions(h) {
  if (!h) return '';
  const altTxt = h.altitudeM >= 1000 ? (h.altitudeM / 1000).toFixed(1) + 'k m' : h.altitudeM + ' m';
  const f = [
    ['Heat', h.heatRisk, lvl(h.heatRisk, 45, 75)],
    ['Ozone', h.ozoneRisk, lvl(h.ozoneRisk, 45, 70)],
    ['PM2.5', h.pm25Annual, lvl(h.pm25Annual, 10, 16)],
    ['Alt', altTxt, lvl(h.altitudeM, 300, 1500)],
    ['Smoke', h.smokeRisk, lvl(h.smokeRisk, 45, 70)]
  ];
  const stats = f.map(([k, v, l]) => `<span class="fct" data-lvl="${l}">${k} ${v}</span>`).join('');
  const roof = h.roofed ? '<span class="chip roofed">Roofed</span>' : '';
  return `<div class="conditions" title="${esc(h.notes || '')}">
    <div class="label">Conditions</div>
    <div class="cond-head"><span class="chip tier-${esc(h.tier)}">${esc(h.tier)} risk</span>${roof}</div>
    <div class="factors">${stats}</div>
  </div>`;
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
      ${conditions(s.health)}
      ${ms.map(m => vsRow(m, colorsOf, '', { hideGround: true })).join('')}
    </div>`;
  });
  // unknown grounds in upstream data still get a plain card (no hard fail)
  const unknownGrounds = [...new Set(t.matches.map(m => m.ground).filter(g => g && !known.has(g)))];
  for (const g of unknownGrounds) {
    const ms = t.matches.filter(m => m.ground === g);
    cards.push(`<div class="card venue-card"><h2>${esc(g)}</h2><div class="cap">${ms.length} matches</div>${ms.map(m => vsRow(m, colorsOf, '', { hideGround: true })).join('')}</div>`);
  }
  return { sig, html: `<div class="venue-grid">${cards.join('')}</div>` };
}
