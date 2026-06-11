export const $ = (sel) => document.querySelector(sel);
export const esc = (s) => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
export const flagImg = (flag, name) => flag
  ? `<img class="flag" src="https://flagcdn.com/h24/${flag}.png" alt="" title="${esc(name)}">`
  : '';

export function localTime(iso) {
  if (!iso) return 'TBD';
  return new Date(iso).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}
export function localDay(iso) {
  if (!iso) return 'Date TBD';
  return new Date(iso).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
}
export function scoreText(m) {
  if (!m.score) return 'vs';
  const s = m.score.ft || m.score.et || m.score.p;
  if (!s) return 'vs';
  let txt = `${s[0]} – ${s[1]}`;
  if (m.score.p) txt += ` (${m.score.p[0]}–${m.score.p[1]}p)`;
  else if (m.score.et) txt = `${m.score.et[0]} – ${m.score.et[1]} aet`;
  return txt;
}
export function statusChip(m) {
  if (m.status === 'live') return '<span class="chip live">LIVE</span>';
  if (m.status === 'finished') return '<span class="chip">FT</span>';
  return '';
}
export function kitStripe(colors) {
  if (!colors || !colors.length) return '';
  const n = colors.length;
  const stops = colors.map((c, i) => `${c} ${(i / n) * 100}% ${((i + 1) / n) * 100}%`).join(', ');
  return `<div class="kit-stripe" style="background:linear-gradient(90deg, ${stops});"></div>`;
}

// Versus banner row (team-colors feature B). colorsOf: (team) => [hex,...]
// opts.hideGround: skip the venue line (redundant inside venue cards)
export function vsRow(m, colorsOf, extraHtml = '', opts = {}) {
  const c1 = colorsOf(m.team1)[0], c2 = colorsOf(m.team2)[0];
  const meta = esc(localTime(m.kickoff)) + (opts.hideGround ? '' : `<br>${esc(m.ground || '')}`);
  return `<div class="vs-row ${opts.hideGround ? 'compact' : ''}" style="--c1:${c1};--c2:${c2};">
    <div class="side l"></div><div class="side r"></div>
    <div class="inner">
      <span class="match-meta">${meta}</span>
      <span class="t r">${esc(m.team1)} ${flagImg(m.flag1, m.team1)}</span>
      <span class="match-score">${esc(scoreText(m))}</span>
      <span class="t">${flagImg(m.flag2, m.team2)} ${esc(m.team2)}</span>
      <span class="chip">${esc(m.group || m.round || '')}</span>
      ${statusChip(m)}
    </div>
  </div>${extraHtml}`;
}

export function svgBarChart(rows, valueLabel) {
  const W = 720, rowH = 26, pad = 4;
  const H = rows.length * rowH + pad * 2;
  const max = Math.max(...rows.map(r => r.value), 1e-9);
  const labelW = 170, valW = 70, barMax = W - labelW - valW - 20;
  const bars = rows.map((r, i) => {
    const y = pad + i * rowH;
    const w = Math.max(2, (r.value / max) * barMax);
    return `<text x="${labelW - 6}" y="${y + 17}" text-anchor="end">${esc(r.label)}</text>
      <rect class="bar ${r.gold ? 'gold' : ''}" x="${labelW}" y="${y + 4}" width="${w}" height="${rowH - 9}" rx="2"></rect>
      <text class="val" x="${labelW + w + 8}" y="${y + 17}">${esc(r.display)}</text>`;
  }).join('');
  return `<svg class="bar-chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(valueLabel)}">${bars}</svg>`;
}
