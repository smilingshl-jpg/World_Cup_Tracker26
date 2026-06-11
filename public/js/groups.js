import { state, teamMap } from './state.js';
import { esc, flagImg } from './format.js';

const CHIP_CLASS = { THROUGH: 'through', OUT: 'out', ALIVE: 'alive', '3RD-RACE': 'race' };

export function renderGroups() {
  const t = state.tournament;
  const sig = JSON.stringify([t.standings, t.thirdPlace, t.scenarios]);
  const tm = teamMap();

  const groupCards = Object.keys(t.standings).sort().map(g => {
    const { table, complete } = t.standings[g];
    const sc = (t.scenarios && t.scenarios[g]) || { active: false, teams: {} };
    const rows = table.map((r, i) => {
      const team = tm[r.team] || {};
      const kit = (team.colors || ['#2d3742'])[0];
      const scInfo = sc.active ? sc.teams[r.team] : null;
      const chip = scInfo ? ` <span class="chip ${CHIP_CLASS[scInfo.status] || ''}" title="${esc(scInfo.note)}">${esc(scInfo.status)}</span>` : '';
      return `<tr class="kit-row ${complete && i < 2 ? 'qualified' : ''}" style="--kit:${kit};">
        <td>${flagImg(team.flag, r.team)}${esc(r.team)}${chip}</td>
        <td class="num">${r.played}</td><td class="num">${r.won}</td><td class="num">${r.drawn}</td>
        <td class="num">${r.lost}</td><td class="num">${r.gf}</td><td class="num">${r.ga}</td>
        <td class="num">${r.gd > 0 ? '+' : ''}${r.gd}</td><td class="num"><b>${r.points}</b></td>
      </tr>`;
    }).join('');
    const notes = sc.active
      ? `<div class="scenario-note">${table.map(r => sc.teams[r.team] ? `<b>${esc(r.team)}</b>: ${esc(sc.teams[r.team].note)}` : '').filter(Boolean).join(' · ')}</div>`
      : '';
    return `<div class="card">
      <h2>${esc(g)} ${complete ? '<span class="chip">complete</span>' : ''}</h2>
      <table><thead><tr>
        <th>Team</th><th class="num">P</th><th class="num">W</th><th class="num">D</th>
        <th class="num">L</th><th class="num">GF</th><th class="num">GA</th><th class="num">GD</th><th class="num">Pts</th>
      </tr></thead><tbody>${rows}</tbody></table>${notes}
    </div>`;
  }).join('');

  const thirds = `<div class="card">
    <h2>Third-place race <span class="chip">best 8 of 12 advance</span></h2>
    <table><thead><tr>
      <th>#</th><th>Team</th><th>Group</th><th class="num">Pts</th><th class="num">GD</th><th class="num">GF</th>
    </tr></thead><tbody>${
      t.thirdPlace.map((r, i) => {
        const team = tm[r.team] || {};
        const kit = (team.colors || ['#2d3742'])[0];
        return `<tr class="kit-row ${r.qualified ? 'qualified' : 'eliminated'}" style="--kit:${kit};">
          <td>${i + 1}</td>
          <td>${flagImg(team.flag, r.team)}${esc(r.team)}</td>
          <td>${esc((r.group || '').replace('Group ', ''))}</td>
          <td class="num"><b>${r.points}</b></td>
          <td class="num">${r.gd > 0 ? '+' : ''}${r.gd}</td><td class="num">${r.gf}</td>
        </tr>`;
      }).join('')
    }</tbody></table>
  </div>`;

  return { sig, html: `<div class="group-grid">${groupCards}</div>${thirds}` };
}
