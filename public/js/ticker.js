import { $, esc } from './format.js';

export async function refreshTicker() {
  try {
    const { items } = await fetch('/api/news').then(r => r.json());
    const el = $('#ticker'), track = $('#ticker-track');
    if (!items || !items.length) { el.hidden = true; return; }
    track.innerHTML = items.map(i =>
      `<a href="${esc(i.link)}" target="_blank" rel="noopener">${esc(i.title)}</a>`).join('');
    el.hidden = false;
  } catch { $('#ticker').hidden = true; }
}
