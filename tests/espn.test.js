// tests/espn.test.js
'use strict';
const assert = require('assert');
const { parseTeams, parseRoster, parseSummary, parseShootout, findEvent } = require('../lib/espn');
const { parseScoreboard } = require('../lib/livescores');

// ---- teams: ESPN displayName -> canonical name -> id ----
const teamsJson = { sports: [{ leagues: [{ teams: [
  { team: { id: '202', displayName: 'Argentina' } },
  { team: { id: '451', displayName: 'Czech Republic' } },   // alias -> Czechia
  { team: { id: '9999', displayName: 'Narnia' } }            // unknown: skipped
] }] }] };
const ids = parseTeams(teamsJson);
assert.strictEqual(ids.get('Argentina'), '202');
assert.strictEqual(ids.get('Czechia'), '451');
assert.strictEqual(ids.size, 2);

// ---- roster ----
const rosterJson = { athletes: [
  { displayName: 'Emiliano Martínez', jersey: '23', age: 33, position: { displayName: 'Goalkeeper', abbreviation: 'G' } },
  { displayName: 'Lionel Messi', jersey: '10', age: 38, position: { displayName: 'Forward', abbreviation: 'F' } },
  { displayName: 'No Position Guy' } // tolerated
] };
const roster = parseRoster(rosterJson);
assert.strictEqual(roster.length, 3);
assert.deepStrictEqual(roster[1], { name: 'Lionel Messi', jersey: '10', age: 38, position: 'Forward', pos: 'F' });
assert.strictEqual(roster[2].position, null);

// ---- summary (mirrors real event 760415 structure) ----
const summaryJson = {
  broadcasts: [
    { media: { shortName: 'FOX' } }, { media: { shortName: 'Peacock' } }, { market: { type: 'Home' } }
  ],
  keyEvents: [
    { type: { text: 'Kickoff' }, clock: { displayValue: '' }, team: {} },
    { type: { text: 'Goal' }, scoringPlay: true, clock: { displayValue: "9'" }, team: { id: '1' },
      text: 'Goal! Mexico 1, South Africa 0. Julián Quiñones (Mexico).' },
    { type: { text: 'Yellow Card' }, clock: { displayValue: "40'" }, team: { id: '2' }, text: 'Bongani booked.' },
    { type: { text: 'Substitution' }, clock: { displayValue: "60'" }, team: { id: '1' }, text: 'Sub: in for out.' }
  ],
  rosters: [
    { homeAway: 'home', formation: '4-1-4-1', team: { id: '1', displayName: 'Mexico' }, roster: [
      { starter: true, jersey: '1', formationPlace: '1', position: { abbreviation: 'G' }, athlete: { displayName: 'Raúl Rangel' } },
      { starter: false, jersey: '9', position: { abbreviation: 'F' }, athlete: { displayName: 'Bench Guy' } }
    ] },
    { homeAway: 'away', formation: '4-3-3', team: { id: '2', displayName: 'South Africa' }, roster: [
      { starter: true, jersey: '5', position: { abbreviation: 'D' }, athlete: { displayName: 'Defender Dan' } }
    ] }
  ],
  boxscore: { teams: [
    { team: { displayName: 'Mexico' }, statistics: [
      { name: 'possessionPct', displayValue: '51.9' }, { name: 'totalShots', displayValue: '7' },
      { name: 'irrelevantStat', displayValue: '42' }
    ] },
    { team: { displayName: 'South Africa' }, statistics: [
      { name: 'possessionPct', displayValue: '48.1' }, { name: 'totalShots', displayValue: '3' }
    ] }
  ] },
  headToHeadGames: [{ team: { displayName: 'Mexico' }, events: [
    { atVs: '@', opponent: { displayName: 'South Africa' }, homeTeamScore: '1', awayTeamScore: '1',
      gameResult: 'D', leagueName: 'FIFA World Cup', gameDate: '2010-06-11T14:00Z' }
  ] }],
  lastFiveGames: [
    { team: { displayName: 'Mexico' }, events: [
      { gameResult: 'W', homeTeamScore: '5', awayTeamScore: '1', opponent: { displayName: 'Serbia' } }
    ] },
    { team: { displayName: 'South Africa' }, events: [
      { gameResult: 'L', homeTeamScore: '0', awayTeamScore: '2', opponent: { displayName: 'Nigeria' } }
    ] }
  ],
  gameInfo: { venue: { fullName: 'Estadio Banorte' }, attendance: 87000, officials: [{ displayName: 'Wilton Pereira Sampaio' }] },
  pickcenter: [{ provider: { name: 'DraftKings' }, details: 'MEX -1.5', overUnder: 2.5 }]
};
const d = parseSummary(summaryJson);
assert.strictEqual(d.lineups[0].team, 'Mexico');
assert.strictEqual(d.lineups[0].formation, '4-1-4-1');
assert.deepStrictEqual(d.lineups[0].starters[0], { name: 'Raúl Rangel', jersey: '1', pos: 'G', place: 1 });
assert.strictEqual(d.lineups[0].subs[0].name, 'Bench Guy');
assert.strictEqual(d.lineups[0].subs[0].place, null, 'bench has no formation place');
assert.strictEqual(d.lineups[1].team, 'South Africa');
const poss = d.stats.find(s => s.key === 'possessionPct');
assert.deepStrictEqual([poss.home, poss.away, poss.label], ['51.9', '48.1', 'Possession %']);
assert.ok(!d.stats.find(s => s.key === 'irrelevantStat'), 'only curated stats');
assert.strictEqual(d.h2h[0].result, 'D');
assert.ok(d.h2h[0].text.includes('1-1'), 'h2h text mentions score');
assert.strictEqual(d.form[0].team, 'Mexico');
assert.deepStrictEqual(d.form[0].results[0], { result: 'W', score: '5-1', opponent: 'Serbia' });
assert.deepStrictEqual(d.info, { venue: 'Estadio Banorte', referee: 'Wilton Pereira Sampaio', attendance: 87000 });
assert.deepStrictEqual(d.odds, { provider: 'DraftKings', details: 'MEX -1.5', overUnder: 2.5 });

// broadcasts: media short names only, deduped
assert.deepStrictEqual(d.broadcasts, ['FOX', 'Peacock']);

// timeline: meaningful events only (kickoff dropped), tagged with side + goal flag
assert.strictEqual(d.timeline.length, 3);
assert.deepStrictEqual(
  [d.timeline[0].clock, d.timeline[0].kind, d.timeline[0].side, d.timeline[0].goal],
  ["9'", 'Goal', 'home', true]
);
assert.strictEqual(d.timeline[1].side, 'away');      // yellow card to team id 2 = away
assert.strictEqual(d.timeline[2].kind, 'Substitution');
assert.ok(d.timeline[0].text.includes('Quiñones'));

// missing sections tolerated (live matches drop lastFiveGames)
const sparse = parseSummary({ rosters: [], boxscore: {}, gameInfo: {} });
assert.deepStrictEqual([sparse.lineups, sparse.stats.length, sparse.h2h, sparse.form, sparse.odds],
  [null, 0, null, null, null]);
assert.deepStrictEqual([sparse.broadcasts, sparse.timeline], [[], []]);
assert.strictEqual(parseSummary(null).lineups, null);

// ---- event id lookup via scoreboard (id passthrough + pair match incl. swap) ----
const scoreboard = { events: [{ id: '760415', competitions: [{
  competitors: [
    { homeAway: 'home', score: '1', team: { id: '203', displayName: 'Mexico' } },
    { homeAway: 'away', score: '0', team: { id: '988', displayName: 'South Africa' } }
  ],
  status: { type: { state: 'in' }, displayClock: "67'" }
}] }] };
assert.strictEqual(parseScoreboard(scoreboard)[0].id, '760415', 'parseScoreboard exposes event id');
assert.strictEqual(findEvent(scoreboard, 'Mexico', 'South Africa'), '760415');
assert.strictEqual(findEvent(scoreboard, 'South Africa', 'Mexico'), '760415', 'reversed order matches');
assert.strictEqual(findEvent(scoreboard, 'Spain', 'France'), null);

// ---- penalty shootout (real ESPN structure: per-team shots; entry.id = team id) ----
const koSides = { '477': 'home', '205': 'away' }; // Croatia home, Brazil away (event 633843)
const shootout = [
  { id: '205', team: 'Brazil', shots: [
    { shotNumber: 1, player: 'Rodrygo', didScore: false },
    { shotNumber: 2, player: 'Casemiro', didScore: true },
    { shotNumber: 3, player: 'Pedro ', didScore: true },
    { shotNumber: 4, player: 'Marquinhos', didScore: false }
  ] },
  { id: '477', team: 'Croatia', shots: [
    { shotNumber: 1, player: 'Nikola Vlasic', didScore: true },
    { shotNumber: 2, player: 'Lovro Majer', didScore: true },
    { shotNumber: 3, player: 'Luka Modric', didScore: true },
    { shotNumber: 4, player: 'Mislav Orsic', didScore: true }
  ] }
];
const so = parseShootout(shootout, koSides);
assert.deepStrictEqual(so.result, [4, 2], 'home(Croatia) 4 – away(Brazil) 2');
const cro = so.teams.find(t => t.side === 'home');
assert.strictEqual(cro.team, 'Croatia');
assert.strictEqual(cro.kicks.length, 4);
assert.strictEqual(cro.kicks.filter(k => k.scored).length, 4, 'Croatia scored all 4');
const bra = so.teams.find(t => t.side === 'away');
assert.strictEqual(bra.kicks[0].scored, false, 'Rodrygo missed first');
assert.strictEqual(bra.kicks[2].taker, 'Pedro', 'taker name trimmed');
assert.deepStrictEqual(bra.kicks.map(k => k.n), [1, 2, 3, 4], 'kicks sorted by shot number');
// flows through parseSummary, mapping sides from rosters
const dko = parseSummary({ rosters: [
  { homeAway: 'home', team: { id: '477', displayName: 'Croatia' } },
  { homeAway: 'away', team: { id: '205', displayName: 'Brazil' } }
], shootout });
assert.deepStrictEqual(dko.pens.result, [4, 2], 'pens flow through parseSummary');
assert.strictEqual(parseSummary({ rosters: [] }).pens, null, 'no shootout -> null');
assert.strictEqual(parseShootout(null, {}), null);

console.log('espn.test.js OK');
