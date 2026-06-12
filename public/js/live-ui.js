// Live UX: "on now" strip, browser-tab score, goal toasts, favicon dot.
import { state, colorsOf } from './state.js';
import { $, esc, scoreText } from './format.js';
import { isFollowed } from './follow.js';

let prevScores = {};   // num -> [h,a] last seen live score
let baseTitle = 'World Cup 26 — The Hub';

function liveMatches() {
  return (state.tournament ? state.tournament.matches : []).filter(m => m.status === 'live' && m.live && m.live.score);
}

function toast(html, cls = '') {
  const box = $('#toasts');
  if (!box) return;
  const el = document.createElement('div');
  el.className = 'toast' + (cls ? ' ' + cls : '');
  el.innerHTML = html;
  box.appendChild(el);
  const life = cls.includes('goal') ? 7000 : 6000;
  setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 400); }, life);
}

// which side's tally went up between two [h,a] scores
function scoringSide(prev, next) {
  if (!prev) return null;
  if (next[0] > prev[0]) return 'home';
  if (next[1] > prev[1]) return 'away';
  return null; // unchanged or a correction downward
}

// confetti burst in the scoring team's colors (CSS-animated spans, self-cleaning)
function confettiBurst(colors) {
  const wrap = document.createElement('div');
  wrap.className = 'confetti';
  const palette = [...colors, '#fde68a', '#f6f1e7'];
  for (let i = 0; i < 22; i++) {
    const p = document.createElement('i');
    p.style.left = Math.random() * 100 + 'vw';
    p.style.background = palette[i % palette.length];
    p.style.animationDelay = (Math.random() * 0.25).toFixed(2) + 's';
    p.style.transform = `rotate(${Math.random() * 360}deg)`;
    wrap.appendChild(p);
  }
  document.body.appendChild(wrap);
  setTimeout(() => wrap.remove(), 1800);
}

function flashRow(num) {
  document.querySelectorAll(`.vs-row[data-num="${num}"]`).forEach(row => {
    row.classList.remove('goal-flash');
    void row.offsetWidth; // restart the animation
    row.classList.add('goal-flash');
    setTimeout(() => row.classList.remove('goal-flash'), 1400);
  });
}

function celebrateGoal(m, side) {
  const team = side === 'home' ? m.team1 : m.team2;
  const cols = colorsOf(team);
  const star = (isFollowed(m.team1) || isFollowed(m.team2)) ? '⭐ ' : '';
  toast(`<span class="goal-word">${star}GOAL!</span><span class="goal-team">${esc(team)}</span>
    <span class="goal-line">${esc(m.team1)} ${esc(m.live.score[0])}–${esc(m.live.score[1])} ${esc(m.team2)}</span>`,
    'goal');
  confettiBurst(cols);
  flashRow(m.num);
}

// canvas favicon with a red "live" dot
function setFavicon(live) {
  let link = document.querySelector('link[rel="icon"]');
  if (!link) { link = document.createElement('link'); link.rel = 'icon'; document.head.appendChild(link); }
  const c = document.createElement('canvas'); c.width = c.height = 32;
  const x = c.getContext('2d');
  x.fillStyle = '#14181d'; x.fillRect(0, 0, 32, 32);
  x.font = 'bold 20px Arial'; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.fillStyle = '#f6f1e7'; x.fillText('⚽', 16, 17);
  if (live) { x.fillStyle = '#dc2626'; x.beginPath(); x.arc(25, 7, 6, 0, 7); x.fill(); }
  link.href = c.toDataURL('image/png');
}

export function updateLiveUI() {
  const live = liveMatches();

  // 1. goal celebration: score changed since last poll
  for (const m of live) {
    const next = m.live.score;
    const prev = prevScores[m.num];
    const side = scoringSide(prev, next);
    if (side) celebrateGoal(m, side);
    prevScores[m.num] = next;
  }
  // forget finished matches so a later re-show doesn't false-fire
  for (const num of Object.keys(prevScores)) if (!live.find(m => String(m.num) === num)) delete prevScores[num];

  // 2. browser tab title shows the marquee live score (followed first)
  if (live.length) {
    const lead = live.find(m => isFollowed(m.team1) || isFollowed(m.team2)) || live[0];
    document.title = `🔴 ${lead.team1} ${lead.live.score[0]}–${lead.live.score[1]} ${lead.team2}`;
  } else {
    document.title = baseTitle;
  }
  setFavicon(live.length > 0);

  // 3. "on now" strip
  const strip = $('#onnow');
  if (!strip) return;
  if (!live.length) { strip.hidden = true; strip.innerHTML = ''; return; }
  strip.hidden = false;
  strip.innerHTML = '<span class="onnow-label">● LIVE</span>' + live.map(m =>
    `<button class="onnow-item" data-jump="${m.num}">${esc(m.team1)} <b>${esc(m.live.score[0])}–${esc(m.live.score[1])}</b> ${esc(m.team2)} <span class="onnow-clock">${esc(m.live.clock || '')}</span></button>`
  ).join('');
  strip.querySelectorAll('.onnow-item').forEach(b => b.addEventListener('click', () => {
    document.querySelector('.tab[data-view="today"]').click();
    const row = document.querySelector(`#view-today .vs-row[data-num="${b.dataset.jump}"]`);
    if (row) row.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }));
}
