// lib/teams.js
'use strict';

// All 48 qualified teams for the 2026 World Cup (final after March 2026 playoffs).
// flag = flagcdn.com code, e.g. https://flagcdn.com/h24/<flag>.png
const TEAMS = [
  { name: 'Algeria',                code: 'ALG', flag: 'dz', aliases: [] },
  { name: 'Argentina',              code: 'ARG', flag: 'ar', aliases: [] },
  { name: 'Australia',              code: 'AUS', flag: 'au', aliases: [] },
  { name: 'Austria',                code: 'AUT', flag: 'at', aliases: [] },
  { name: 'Belgium',                code: 'BEL', flag: 'be', aliases: [] },
  { name: 'Bosnia and Herzegovina', code: 'BIH', flag: 'ba', aliases: ['Bosnia-Herzegovina', 'Bosnia & Herzegovina', 'Bosnia'] },
  { name: 'Brazil',                 code: 'BRA', flag: 'br', aliases: [] },
  { name: 'Canada',                 code: 'CAN', flag: 'ca', aliases: [] },
  { name: 'Cape Verde',             code: 'CPV', flag: 'cv', aliases: ['Cabo Verde'] },
  { name: 'Colombia',               code: 'COL', flag: 'co', aliases: [] },
  { name: "Côte d'Ivoire",          code: 'CIV', flag: 'ci', aliases: ['Ivory Coast'] },
  { name: 'Croatia',                code: 'CRO', flag: 'hr', aliases: [] },
  { name: 'Curaçao',                code: 'CUW', flag: 'cw', aliases: [] },
  { name: 'Czechia',                code: 'CZE', flag: 'cz', aliases: ['Czech Republic'] },
  { name: 'DR Congo',               code: 'COD', flag: 'cd', aliases: ['Congo DR', 'Democratic Republic of the Congo', 'Congo, Democratic Republic of the'] },
  { name: 'Ecuador',                code: 'ECU', flag: 'ec', aliases: [] },
  { name: 'Egypt',                  code: 'EGY', flag: 'eg', aliases: [] },
  { name: 'England',                code: 'ENG', flag: 'gb-eng', aliases: [] },
  { name: 'France',                 code: 'FRA', flag: 'fr', aliases: [] },
  { name: 'Germany',                code: 'GER', flag: 'de', aliases: [] },
  { name: 'Ghana',                  code: 'GHA', flag: 'gh', aliases: [] },
  { name: 'Haiti',                  code: 'HAI', flag: 'ht', aliases: [] },
  { name: 'Iran',                   code: 'IRN', flag: 'ir', aliases: ['IR Iran'] },
  { name: 'Iraq',                   code: 'IRQ', flag: 'iq', aliases: [] },
  { name: 'Japan',                  code: 'JPN', flag: 'jp', aliases: [] },
  { name: 'Jordan',                 code: 'JOR', flag: 'jo', aliases: [] },
  { name: 'Mexico',                 code: 'MEX', flag: 'mx', aliases: [] },
  { name: 'Morocco',                code: 'MAR', flag: 'ma', aliases: [] },
  { name: 'Netherlands',            code: 'NED', flag: 'nl', aliases: ['Holland'] },
  { name: 'New Zealand',            code: 'NZL', flag: 'nz', aliases: [] },
  { name: 'Norway',                 code: 'NOR', flag: 'no', aliases: [] },
  { name: 'Panama',                 code: 'PAN', flag: 'pa', aliases: [] },
  { name: 'Paraguay',               code: 'PAR', flag: 'py', aliases: [] },
  { name: 'Portugal',               code: 'POR', flag: 'pt', aliases: [] },
  { name: 'Qatar',                  code: 'QAT', flag: 'qa', aliases: [] },
  { name: 'Saudi Arabia',           code: 'KSA', flag: 'sa', aliases: [] },
  { name: 'Scotland',               code: 'SCO', flag: 'gb-sct', aliases: [] },
  { name: 'Senegal',                code: 'SEN', flag: 'sn', aliases: [] },
  { name: 'South Africa',           code: 'RSA', flag: 'za', aliases: [] },
  { name: 'South Korea',            code: 'KOR', flag: 'kr', aliases: ['Korea Republic', 'Republic of Korea'] },
  { name: 'Spain',                  code: 'ESP', flag: 'es', aliases: [] },
  { name: 'Sweden',                 code: 'SWE', flag: 'se', aliases: [] },
  { name: 'Switzerland',            code: 'SUI', flag: 'ch', aliases: [] },
  { name: 'Tunisia',                code: 'TUN', flag: 'tn', aliases: [] },
  { name: 'Türkiye',                code: 'TUR', flag: 'tr', aliases: ['Turkey'] },
  { name: 'United States',          code: 'USA', flag: 'us', aliases: ['USA', 'United States of America'] },
  { name: 'Uruguay',                code: 'URU', flag: 'uy', aliases: [] },
  { name: 'Uzbekistan',             code: 'UZB', flag: 'uz', aliases: [] },
];

// lowercase, strip diacritics, drop everything but a-z0-9
function normalizeName(s) {
  if (!s) return '';
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

const LOOKUP = new Map();
for (const t of TEAMS) {
  LOOKUP.set(normalizeName(t.name), t);
  for (const a of t.aliases) LOOKUP.set(normalizeName(a), t);
}

function findTeam(raw) {
  if (!raw) return null;
  return LOOKUP.get(normalizeName(raw)) || null;
}

// Build { "Group A": [canonical names...] } from group-stage matches.
function deriveGroups(matches) {
  const groups = {};
  for (const m of matches) {
    if (!m.group) continue;
    const set = (groups[m.group] = groups[m.group] || new Set());
    for (const raw of [m.team1, m.team2]) {
      const t = findTeam(raw);
      if (t) set.add(t.name);
    }
  }
  const out = {};
  for (const [g, set] of Object.entries(groups)) out[g] = [...set];
  return out;
}

module.exports = { TEAMS, findTeam, normalizeName, deriveGroups };
