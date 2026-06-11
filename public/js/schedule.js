import { state, sigs, colorsOf } from './state.js';
import { $, esc, localDay, vsRow } from './format.js';
import { renderAll } from './main.js';

export const scheduleFilter = { text: '', stage: 'all' };

function scorersHtml(m) {
  const fmt = (arr) => (arr || []).map(g => {
    const nm = g.name || g.player || '?';
    const min = Number.isFinite(g.minute) ? ` ${g.minute}'` : '';
    return `${esc(nm)}${min}${g.penalty ? ' (p)' : ''}${g.owngoal ? ' (og)' : ''}`;
  }).join(', ');
  const a = fmt(m.goals1), b = fmt(m.goals2);
  if (!a && !b) return '';
  return `<details class="scorers"><summary>⚽ scorers</summary>
    <div class="goals"><span><b>${esc(m.team1)}:</b> ${a || '—'}</span><span><b>${esc(m.team2)}:</b> ${b || '—'}</span></div>
  </details>`;
}

export function renderSchedule() {
  const t = state.tournament;
  const txt = scheduleFilter.text.toLowerCase();
  const matches = t.matches.filter(m => {
    if (scheduleFilter.stage === 'group' && !m.group) return false;
    if (scheduleFilter.stage === 'knockout' && m.group) return false;
    if (txt && !(`${m.team1} ${m.team2} ${m.ground || ''} ${m.group || ''} ${m.round || ''}`.toLowerCase().includes(txt))) return false;
    return true;
  });
  const sig = JSON.stringify([matches.map(m => [m.num, m.score, m.status]), scheduleFilter]);

  const byDay = new Map();
  for (const m of matches) {
    const day = localDay(m.kickoff);
    if (!byDay.has(day)) byDay.set(day, []);
    byDay.get(day).push(m);
  }
  const days = [...byDay.entries()].map(([day, list]) =>
    `<div class="day-header">${esc(day)}</div><div class="card">${
      list.map(m => vsRow(m, colorsOf, m.status === 'finished' ? scorersHtml(m) : '')).join('')
    }</div>`).join('');

  const html = `<div class="filters">
      <input id="sched-text" type="search" placeholder="Filter by team, venue, group…" value="${esc(scheduleFilter.text)}">
      <select id="sched-stage">
        <option value="all" ${scheduleFilter.stage === 'all' ? 'selected' : ''}>All stages</option>
        <option value="group" ${scheduleFilter.stage === 'group' ? 'selected' : ''}>Group stage</option>
        <option value="knockout" ${scheduleFilter.stage === 'knockout' ? 'selected' : ''}>Knockouts</option>
      </select>
    </div>${days || '<div class="card"><p>No matches match the filter.</p></div>'}`;
  return { sig, html };
}

export function wireSchedule() {
  const txt = $('#sched-text'), stage = $('#sched-stage');
  if (!txt) return;
  txt.addEventListener('input', () => {
    scheduleFilter.text = txt.value; sigs.schedule = null; renderAll();
    requestAnimationFrame(() => { const e = $('#sched-text'); e.focus(); e.setSelectionRange(e.value.length, e.value.length); });
  });
  stage.addEventListener('change', () => { scheduleFilter.stage = stage.value; sigs.schedule = null; renderAll(); });
}
