import { state } from './state.js';
import { esc, flagImg, localTime, scoreText, kitStripe } from './format.js';
import { starBtn, isFollowed, toggleFollow } from './follow.js';

export function renderTeams() {
  const t = state.tournament;
  const odds = state.odds, sim = state.sim;
  const sig = JSON.stringify([t.teams.length, t.matches.length, odds && odds.fetchedAt, sim && sim.generatedAt]);
  const oddsByTeam = odds ? Object.fromEntries(odds.entries.map((e, i) => [e.team, { ...e, rank: i + 1 }])) : {};
  const simByTeam = sim ? Object.fromEntries(sim.teams.map(s => [s.team, s])) : {};

  const cards = [...t.teams]
    .sort((a, b) => {
      const fa = isFollowed(a.name) ? 0 : 1, fb = isFollowed(b.name) ? 0 : 1; // followed pinned first
      return fa - fb || (oddsByTeam[a.name]?.rank ?? 99) - (oddsByTeam[b.name]?.rank ?? 99);
    })
    .map(team => {
      const o = oddsByTeam[team.name];
      const s = simByTeam[team.name];
      const h = team.history;
      const stars = h && h.titles ? `<span class="stars">${'★'.repeat(h.titles)}</span> ` : '';
      const histLine = h
        ? `<div class="hist-line">${stars}${h.titles ? `${h.titles}-time champions · ` : ''}${h.bestFinish === 'Debut' ? 'WORLD CUP DEBUT' : `Appearance #${h.appearances} · Best: ${esc(h.bestFinish)}`}</div>`
        : '';
      const simLine = s
        ? `<div class="sim-line">Model: R16 ${(s.r16 * 100).toFixed(0)}% · QF ${(s.qf * 100).toFixed(0)}% · SF ${(s.sf * 100).toFixed(0)}% · 🏆 ${(s.champion * 100).toFixed(1)}%</div>`
        : '';
      const fixtures = t.matches
        .filter(m => m.group && (m.team1 === team.name || m.team2 === team.name))
        .map(m => `${esc(localTime(m.kickoff))} — ${esc(m.team1)} ${esc(scoreText(m))} ${esc(m.team2)}`)
        .join('<br>');
      return `<div class="card team-card ${isFollowed(team.name) ? 'followed' : ''}">
        <h2>${starBtn(team.name)} ${flagImg(team.flag, team.name)}${esc(team.name)} <span class="chip">${esc(team.group || 'TBD')}</span></h2>
        ${kitStripe(team.colors)}
        <div class="odds-line">${o ? `#${o.rank} favourite · ${(o.prob * 100).toFixed(1)}% (odds ${o.decimal.toFixed(o.decimal < 20 ? 2 : 0)})` : 'odds unavailable'}</div>
        ${simLine}${histLine}
        <div class="fixtures">${fixtures || 'Fixtures TBD'}</div>
        <details class="squad" data-team="${esc(team.name)}">
          <summary>👥 Squad</summary>
          <div class="squad-list"><p class="scenario-note">Loading…</p></div>
        </details>
      </div>`;
    }).join('');

  return { sig, html: `<div class="team-grid">${cards}</div>` };
}

const POSITION_ORDER = ['Goalkeeper', 'Defender', 'Midfielder', 'Forward'];

// Lazy: roster fetched from ESPN the first time a card's Squad section is opened.
export function wireSquads(el) {
  el.querySelectorAll('button.star[data-follow]').forEach(b => b.addEventListener('click', (ev) => {
    ev.stopPropagation();
    toggleFollow(b.dataset.follow);
  }));
  el.querySelectorAll('details.squad').forEach(d => {
    d.addEventListener('toggle', async () => {
      if (!d.open || d.dataset.loaded) return;
      d.dataset.loaded = '1';
      const list = d.querySelector('.squad-list');
      try {
        const { players } = await fetch('/api/roster?team=' + encodeURIComponent(d.dataset.team)).then(r => r.json());
        if (!players || !players.length) { list.innerHTML = '<p class="scenario-note">Squad not published yet.</p>'; return; }
        const groups = new Map();
        for (const p of players) {
          const key = p.position || 'Other';
          if (!groups.has(key)) groups.set(key, []);
          groups.get(key).push(p);
        }
        const ordered = [...groups.keys()].sort((a, b) => {
          const ia = POSITION_ORDER.indexOf(a), ib = POSITION_ORDER.indexOf(b);
          return (ia === -1 ? 9 : ia) - (ib === -1 ? 9 : ib);
        });
        list.innerHTML = ordered.map(pos => `<div class="label" style="margin-top:8px;">${pos}s</div>${
          groups.get(pos)
            .sort((a, b) => (Number(a.jersey) || 99) - (Number(b.jersey) || 99))
            .map(p => `<div class="lp"><span class="jersey">${p.jersey ?? ''}</span> ${p.name}${p.age ? ` <span class="pos">${p.age}y</span>` : ''}</div>`).join('')
        }`).join('');
      } catch {
        d.dataset.loaded = '';
        list.innerHTML = '<p class="scenario-note">Could not load squad.</p>';
      }
    });
  });
}
