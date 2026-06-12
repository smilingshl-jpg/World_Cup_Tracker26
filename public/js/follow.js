// Followed teams, persisted in the browser. Pure state + a change callback.
const LS_KEY = 'wc26-follow-v1';
let set = load();
const listeners = [];

function load() {
  try { return new Set(JSON.parse(localStorage.getItem(LS_KEY)) || []); } catch { return new Set(); }
}
function save() { localStorage.setItem(LS_KEY, JSON.stringify([...set])); }

export function isFollowed(team) { return set.has(team); }
export function followed() { return [...set]; }
export function toggleFollow(team) {
  if (set.has(team)) set.delete(team); else set.add(team);
  save();
  listeners.forEach(fn => fn());
}
export function onFollowChange(fn) { listeners.push(fn); }

// Star button markup for a team card header.
export function starBtn(team) {
  const on = set.has(team);
  return `<button class="star ${on ? 'on' : ''}" data-follow="${team.replace(/"/g, '&quot;')}" title="${on ? 'Following' : 'Follow'}" aria-label="follow">${on ? '★' : '☆'}</button>`;
}
