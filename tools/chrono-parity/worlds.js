// The three worlds the parity check draws, made from a new world's own
// templates. The record step reads that new world from the first build it
// opens and writes these three beside its transcripts, and every other build
// loads the same files, so both sides of a comparison draw the very same JSON.
//
//   centuries     spans five centuries: eras (one with no start year), a
//                 crowded Character lane, marriages (both sides declared,
//                 one side, open-ended, open-started, a missing partner),
//                 open-ended and approximate spans, a name history, a secret
//                 date, and a group's dated subfields.
//   twoYears      everything inside two years, so zooming in reaches day
//                 ticks; an era starts mid-chart.
//   twoCalendars  a second calendar, the Reckoning of Ash, with its own
//                 months and eras and an anchor eight centuries in; entries
//                 bound to each calendar, and a marriage across them.
//   oneMoment     two events on the same day, so the auto-fit bounds widen a
//                 single moment; a briefer run of steps.

const STAMP = '2026-01-01T00:00:00.000Z';
const ASH = 'cal-parity-ash';

const D = (year, monthIndex = 0, day = 1, approximate = false) =>
  (approximate ? { year, monthIndex, day, approximate: true } : { year, monthIndex, day });
const R = (start, end) => ({ start: start || null, end: end || null });

// A small seeded generator, so the crowded lane is the same on every run.
function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function lookups(fresh) {
  const tpl = (name) => {
    const t = fresh.templates.find(x => x.name === name);
    if (!t) throw new Error(`the new world has no template named ${name}`);
    return t;
  };
  const fld = (t, label, type) => {
    const f = t.fields.find(x => x.label === label && x.type === type);
    if (!f) throw new Error(`${t.name} has no ${type} field labeled ${label}`);
    return f.id;
  };
  const C = tpl('Character');
  const E = tpl('Historical Event');
  const F = tpl('Faction / Government / Organization');
  const H = tpl('House / Dynasty / Clan / Bloodline');
  const L = tpl('Location');
  const P = tpl('Plot Thread');
  return {
    char: { id: C.id, life: fld(C, 'Lifespan', 'calendar-date-range'), spouse: fld(C, 'Spouse', 'entry-ref'), names: fld(C, 'Former Names', 'name-history') },
    event: { id: E.id, date: fld(E, 'Calendar Date', 'calendar-date'), span: fld(E, 'Duration', 'calendar-date-range') },
    faction: { id: F.id, founded: fld(F, 'Founded', 'calendar-date'), span: fld(F, 'Active Period', 'calendar-date-range'), names: fld(F, 'Former Names', 'name-history') },
    house: { id: H.id, founded: fld(H, 'Founded', 'calendar-date'), span: fld(H, 'Active Span', 'calendar-date-range') },
    place: { id: L.id, founded: fld(L, 'Founded / Discovered', 'calendar-date') },
    thread: { id: P.id, span: fld(P, 'Timespan', 'calendar-date-range') },
  };
}

// A template of the check's own: a secret date and a group with dated rows.
const LEDGER = {
  id: 'tpl-parity-ledger',
  name: 'Ledger',
  icon: '▤',
  color: '#8ec4b0',
  kind: 'standard',
  fields: [
    { id: 'fld-ledger-sealed', label: 'Sealed On', type: 'calendar-date', secret: true },
    { id: 'fld-ledger-voyages', label: 'Voyages', type: 'group', secret: false, subfields: [
      { id: 'fld-voyage-departed', label: 'Departed', type: 'calendar-date', secret: false },
      { id: 'fld-voyage-span', label: 'Voyage', type: 'calendar-date-range', secret: false },
    ] },
    { id: 'fld-ledger-notes', label: 'Notes', type: 'textarea', secret: false },
  ],
};

function base(fresh, name) {
  const w = JSON.parse(JSON.stringify(fresh));
  w.world.name = name;
  w.world.createdAt = STAMP;
  w.world.updatedAt = STAMP;
  w.entries = [];
  w.calendars = [];
  w.viewPrefs = {};
  w.templates = [...w.templates, JSON.parse(JSON.stringify(LEDGER))];
  return w;
}

const entry = (id, templateId, name, fields, calendarId = null) =>
  ({ id, templateId, name, tags: [], fields, calendarId, createdAt: STAMP, updatedAt: STAMP });

function centuries(fresh) {
  const k = lookups(fresh);
  const w = base(fresh, 'Parity: Centuries');
  w.world.calendar.eras = [
    { id: 'era-before', name: 'Before the Count', shortName: '' },
    { id: 'era-embers', name: 'Age of Embers', shortName: 'AE', startYear: 1000 },
    { id: 'era-salt', name: 'Age of Salt', shortName: 'AS', startYear: 1250 },
    { id: 'era-quiet', name: 'The Long Quiet', shortName: 'LQ', startYear: 1420 },
  ];
  const E = [];
  // The crowded lane: sixteen lives laid down by the seeded generator.
  const names = ['Aldric Vane', 'Berrin Holt', 'Cassia Morrow', 'Dunstan Reeve', 'Elowen Sarre', 'Fennick Ash',
    'Gisela Thorn', 'Halvard Crane', 'Isolde Wick', 'Jory Baskin', 'Kestrel Dunmore', 'Lisbet Faye',
    'Merek Stanhope', 'Nell Corwin', 'Osric Lyle', 'Perrin Gale'];
  const r = rng(1817);
  const ids = names.map((n, i) => `ent-c-${String(i + 1).padStart(2, '0')}`);
  names.forEach((n, i) => {
    const y0 = 1080 + Math.floor(r() * 320);
    const len = 20 + Math.floor(r() * 70);
    const start = D(y0, Math.floor(r() * 12), 1 + Math.floor(r() * 28), i % 4 === 1);
    const end = D(y0 + len, Math.floor(r() * 12), 1 + Math.floor(r() * 28), i % 5 === 2);
    let life = R(start, end);
    if (n === 'Perrin Gale') life = R(D(1436, 2, 9));            // still living
    if (n === 'Osric Lyle') life = R(null, D(1201, 7, 30));       // birth unknown
    E.push(entry(ids[i], k.char.id, n, { [k.char.life]: life }));
  });
  const byName = (n) => E.find(e => e.name === n);
  const marry = (a, b, marriedOn, endedOn) => {
    const f = byName(a).fields;
    f[k.char.spouse] = [...(f[k.char.spouse] || []), { id: b.startsWith('ent-') ? b : byName(b).id, marriedOn: marriedOn || null, endedOn: endedOn || null }];
  };
  marry('Aldric Vane', 'Cassia Morrow', D(1121, 3, 10), D(1150, 0, 1));
  marry('Cassia Morrow', 'Aldric Vane', D(1121, 3, 10), D(1150, 0, 1));
  marry('Berrin Holt', 'Elowen Sarre', D(1160, 5, 2, true), null);
  marry('Dunstan Reeve', 'Gisela Thorn', D(1210, 8, 9), D(1233, 1, 2));
  marry('Halvard Crane', 'Isolde Wick', null, D(1290, 10, 11));
  marry('Jory Baskin', 'Lisbet Faye', null, null);
  marry('Kestrel Dunmore', 'ent-missing-partner', D(1305, 4, 4), null);
  // Events: points, spans, an open-ended span, an approximate end, and a
  // cluster that stacks.
  const ev = (id, name, date, span) => E.push(entry(id, k.event.id, name, {
    ...(date ? { [k.event.date]: date } : {}), ...(span ? { [k.event.span]: span } : {}) }));
  ev('ent-e-01', 'Burning of Vell', D(1048, 7, 12));
  ev('ent-e-02', 'Salt Accord', D(1250, 0, 1));
  ev('ent-e-03', 'The Drowned Winter', null, R(D(1301, 10, 1), D(1302, 2, 15)));
  ev('ent-e-04', 'War of Three Crowns', null, R(D(1180, 4, 1), D(1203, 8, 30, true)));
  ev('ent-e-05', 'Founding Night', D(1001, 0, 1, true));
  ev('ent-e-06', 'Comet of Iru', D(1420, 5, 21));
  ev('ent-e-07', 'The Long March', null, R(D(1344, 2, 1), null));
  ev('ent-e-08', 'Treaty at Mire', D(1244, 4, 2));
  ev('ent-e-09', 'Fall of Corran', D(1244, 5, 15));
  ev('ent-e-10', 'Bridge of Teeth', D(1245, 0, 9));
  ev('ent-e-11', 'Second Treaty', D(1246, 6, 7), R(D(1246, 6, 7), D(1249, 1, 1)));
  // Factions: a name history read at the founding, an open span, and a
  // span approximate at both ends.
  E.push(entry('ent-f-01', k.faction.id, 'Order of the Lantern', {
    [k.faction.names]: [{ name: 'The Ember Compact', from: null, to: D(1150, 0, 1) }],
    [k.faction.founded]: D(1102, 2, 3), [k.faction.span]: R(D(1102, 2, 3), D(1388, 11, 31)) }));
  E.push(entry('ent-f-02', k.faction.id, 'Saltwardens', { [k.faction.founded]: D(1251, 0, 1, true), [k.faction.span]: R(D(1251, 0, 1), null) }));
  E.push(entry('ent-f-03', k.faction.id, 'Crown Assembly', { [k.faction.span]: R(D(1180, 0, 1, true), D(1260, 0, 1, true)) }));
  E.push(entry('ent-h-01', k.house.id, 'House Vane', { [k.house.founded]: D(1090, 0, 1), [k.house.span]: R(D(1090, 0, 1), D(1410, 6, 1)) }));
  E.push(entry('ent-h-02', k.house.id, 'House Morrow', { [k.house.span]: R(D(1150, 3, 3), D(1299, 9, 9)) }));
  E.push(entry('ent-l-01', k.place.id, 'Vell', { [k.place.founded]: D(1005, 1, 14) }));
  E.push(entry('ent-l-02', k.place.id, 'Mirehold', { [k.place.founded]: D(1244, 0, 1, true) }));
  E.push(entry('ent-g-01', LEDGER.id, 'Harbor Ledger', {
    'fld-ledger-sealed': D(1333, 8, 9),
    'fld-ledger-voyages': [
      { 'fld-voyage-departed': D(1310, 3, 1), 'fld-voyage-span': R(D(1310, 3, 1), D(1311, 1, 20)) },
      { 'fld-voyage-departed': D(1312, 5, 10), 'fld-voyage-span': R(D(1312, 5, 10), null) },
      { 'fld-voyage-span': R(null, D(1315, 0, 1)) },
    ] }));
  E.push(entry('ent-g-02', LEDGER.id, 'Quiet Ledger', { 'fld-ledger-sealed': D(1425, 0, 1), 'fld-ledger-voyages': [] }));
  w.entries = E;
  return w;
}

function twoYears(fresh) {
  const k = lookups(fresh);
  const w = base(fresh, 'Parity: Two Years');
  w.world.calendar.eras = [
    { id: 'era-old', name: 'Old Reckoning', shortName: 'OR', startYear: 1 },
    { id: 'era-new', name: 'New Reckoning', shortName: 'NR', startYear: 1302 },
  ];
  const E = [];
  const ev = (id, name, date, span) => E.push(entry(id, k.event.id, name, {
    ...(date ? { [k.event.date]: date } : {}), ...(span ? { [k.event.span]: span } : {}) }));
  ev('ent-y-01', 'First Thaw', D(1301, 2, 2));
  ev('ent-y-02', 'Market Fire', D(1301, 2, 4));
  ev('ent-y-03', 'Bell Raising', D(1301, 2, 5));
  ev('ent-y-04', 'Guild Vote', D(1301, 2, 5));
  ev('ent-y-05', 'Night of Lamps', D(1301, 11, 31));
  ev('ent-y-06', 'New Year Rite', D(1302, 0, 1));
  ev('ent-y-07', 'Flood Mark', D(1302, 4, 17, true));
  ev('ent-y-08', 'Eclipse', D(1302, 10, 3));
  ev('ent-y-09', 'Siege of Arn', null, R(D(1301, 5, 1), D(1301, 7, 15)));
  ev('ent-y-10', 'Quarantine', null, R(D(1301, 6, 20), D(1301, 6, 28)));
  ev('ent-y-11', 'The Long Rain', null, R(D(1302, 3, 1), null));
  E.push(entry('ent-y-20', k.char.id, 'Infant Tam', { [k.char.life]: R(D(1301, 1, 10), D(1301, 1, 12)) }));
  E.push(entry('ent-y-21', k.char.id, 'Wenna Coyle', { [k.char.life]: R(D(1301, 0, 5, true), D(1302, 11, 20)) }));
  E.push(entry('ent-y-22', k.char.id, 'Sela Marsh', { [k.char.life]: R(D(1301, 0, 1), null),
    [k.char.spouse]: [{ id: 'ent-y-23', marriedOn: D(1301, 8, 9), endedOn: D(1302, 1, 2) }] }));
  E.push(entry('ent-y-23', k.char.id, 'Brann Marsh', { [k.char.life]: R(D(1301, 0, 1), D(1302, 1, 2)),
    [k.char.spouse]: [{ id: 'ent-y-22', marriedOn: D(1301, 8, 9), endedOn: D(1302, 1, 2) }] }));
  E.push(entry('ent-y-30', k.thread.id, 'The Missing Bell', { [k.thread.span]: R(D(1301, 2, 5), D(1301, 3, 30)) }));
  w.entries = E;
  return w;
}

function twoCalendars(fresh) {
  const k = lookups(fresh);
  const w = base(fresh, 'Parity: Two Calendars');
  w.world.calendar.eras = [
    { id: 'era-crown', name: 'Crown Years', shortName: 'CY', startYear: 1 },
    { id: 'era-tide', name: 'Tide Years', shortName: 'TY', startYear: 850 },
  ];
  const months = [['Cinder', 'CIN'], ['Smolder', 'SMO'], ['Ember', 'EMB'], ['Kindle', 'KIN'], ['Blaze', 'BLA'],
    ['Flare', 'FLA'], ['Glow', 'GLO'], ['Ashfall', 'ASF'], ['Soot', 'SOO'], ['Hearth', 'HEA']];
  w.calendars = [{
    id: ASH,
    name: 'Reckoning of Ash',
    months: months.map(([name, abbreviation]) => ({ name, days: 36, abbreviation })),
    eras: [
      { id: 'era-ash-first', name: 'First Ash', shortName: 'FA', startYear: 1 },
      { id: 'era-ash-second', name: 'Second Ash', shortName: 'SA', startYear: 60 },
    ],
    anchor: { absoluteDay: 365 * 799 + 200 },
    notes: '',
    week: { daysPerWeek: 6, dayNames: [] },
    celestials: [],
    seasons: [],
    dateFormat: 'name-day',
  }];
  const E = [];
  // Bound to the primary calendar.
  E.push(entry('ent-p-01', k.char.id, 'Corin Hale', { [k.char.life]: R(D(780, 3, 3), D(851, 9, 12)),
    [k.char.spouse]: [{ id: 'ent-a-01', marriedOn: D(812, 5, 20), endedOn: D(840, 0, 1) }] }));
  E.push(entry('ent-p-02', k.char.id, 'Della Hale', { [k.char.life]: R(D(805, 0, 1, true), D(870, 6, 6)) }));
  E.push(entry('ent-p-03', k.char.id, 'Ivo Brand', { [k.char.life]: R(D(830, 1, 14), null) }));
  E.push(entry('ent-p-10', k.event.id, 'Great Muster', { [k.event.date]: D(822, 7, 8) }));
  E.push(entry('ent-p-11', k.event.id, 'Tide Turning', { [k.event.date]: D(850, 0, 1), [k.event.span]: R(D(850, 0, 1), D(870, 3, 3)) }));
  E.push(entry('ent-p-12', k.event.id, 'Grain Riots', { [k.event.span]: R(D(841, 4, 4, true), D(842, 2, 2)) }));
  // Bound to the Reckoning of Ash: its dates are Ash dates.
  E.push(entry('ent-a-01', k.char.id, 'Ysolde of Ash', { [k.char.life]: R(D(3, 2, 10), D(70, 8, 1)),
    [k.char.spouse]: [{ id: 'ent-a-02', marriedOn: D(41, 0, 5), endedOn: null }] }, ASH));
  E.push(entry('ent-a-02', k.char.id, 'Tarn the Grey', { [k.char.life]: R(D(20, 4, 4, true), D(95, 9, 30)) }, ASH));
  E.push(entry('ent-a-03', k.char.id, 'Mother Sooth', { [k.char.life]: R(null, D(58, 6, 6)) }, ASH));
  E.push(entry('ent-a-10', k.event.id, 'Kindling Day', { [k.event.date]: D(1, 0, 1) }, ASH));
  E.push(entry('ent-a-11', k.event.id, 'Ashfall Synod', { [k.event.date]: D(44, 7, 30), [k.event.span]: R(D(44, 7, 30), D(66, 1, 1)) }, ASH));
  E.push(entry('ent-a-12', k.event.id, 'The Second Burning', { [k.event.span]: R(D(60, 0, 1), null) }, ASH));
  E.push(entry('ent-a-13', k.house.id, 'House Cinder', { [k.house.founded]: D(12, 3, 3), [k.house.span]: R(D(12, 3, 3), D(110, 9, 36)) }, ASH));
  w.entries = E;
  return w;
}

function oneMoment(fresh) {
  const k = lookups(fresh);
  const w = base(fresh, 'Parity: One Moment');
  w.entries = [
    entry('ent-m-01', k.event.id, 'The Stillness', { [k.event.date]: D(612, 3, 14) }),
    entry('ent-m-02', k.place.id, 'Stillwater', { [k.place.founded]: D(612, 3, 14) }),
  ];
  return w;
}

const WORLDS = { centuries, twoYears, twoCalendars, oneMoment };

// The events each world's edit steps work on: a span to select, step in the
// panel, drag, and drag by its start, and a point to drag. In the second
// calendar's world each view drags one entry bound to each calendar: shown
// in the primary, Tide Turning is the primary's and Kindling Day is Ash's;
// shown in Ash, Ashfall Synod is Ash's and Great Muster is the primary's.
const TARGETS = {
  centuries: { span: ['Order of the Lantern', 'Active Period'], point: ['Bridge of Teeth', 'Calendar Date'] },
  twoYears: { span: ['Wenna Coyle', 'Lifespan'], point: ['Eclipse', 'Calendar Date'] },
  twoCalendars: { span: ['Tide Turning', 'Duration'], point: ['Kindling Day', 'Calendar Date'], calendar: ASH,
    second: { span: ['Ashfall Synod', 'Duration'], point: ['Great Muster', 'Calendar Date'] } },
  oneMoment: { brief: true, point: ['The Stillness', 'Calendar Date'] },
};

module.exports = { WORLDS, TARGETS, makeWorlds: (fresh) => Object.fromEntries(Object.entries(WORLDS).map(([n, f]) => [n, f(fresh)])) };
