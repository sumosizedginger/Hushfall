// PT-054 (the owner, 2026-10-19, after playing the rebuilt maps): "the Journal does not track items or weapons you pick up, so the player still isn't sure what all they have and how best to use it" and "you have it recording what is said by the narrator but no way to tell when or where it
// was said, the sayings should be based on the level you are currently on, and be sorted by the level you are currently on". The Log is now sorted BY LEVEL (this level first, each line with the time into the level, a place in words and a pin number; the earlier levels after it, the most recent first),
// and the Items page says what you carry, how to use it, and what you picked up on this level, when and where. All the models are pure; the screen is drawn against the stand-in DOM, the pins against the stand-in canvas.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { clock, placeOf, journalLog, itemsPage } from '../src/game/journal.js';
import { recordAtAdd, foundAdd, attemptReset, FOUND_MAX } from '../src/game/record.js';
import { WEAPON_USE, pickupUse } from '../src/game/itemhelp.js';
import { sanitizeProgress } from '../src/engine/progress.js';
import { WEAPONS, PICKUPS } from '../src/engine/defs.js';
import { drawAutomap } from '../src/game/automap.js';
import { UI } from '../src/game/ui.js';
import { standInDom, canvasContext } from './stubs.js';
import { ROOT } from './helpers.js';

const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
const mk = (start, msgs) => ({ cell: 2, entities: [{ type: 'player', at: start }, { type: 'enemy', kind: 'gaunt', at: [1, 1] }], messages: msgs.map(([id, speaker, text]) => ({ id, speaker, text })) });
const maps = { A: mk([10, 10], [['m1', 'INES', 'one'], ['m2', 'HULL', 'two'], ['m3', 'PELLEW, MATE (LOG)', 'three']]), B: mk([0, 0], [['b1', 'INES', 'bee one']]), C: mk([4, 4], [['c1', 'INES', 'sea one'], ['c2', 'HULL', 'sea two']]) };
const manifest = { maps: [{ id: 'A', name: 'Alpha', campaign: 1 }, { id: 'B', name: 'Bravo', campaign: 1 }, { id: 'C', name: 'Charlie', campaign: 1 }] };

test('the clock reads minutes and seconds; a place is in words from the start of the map (north is up)', () => {
  assert.equal(clock(5), '0:05'); assert.equal(clock(247), '4:07'); assert.equal(clock(3600), '60:00'); assert.equal(clock(-3), '0:00');
  const m = maps.A;                                                                                          // the start is cell 10,10; a cell is two metres
  assert.equal(placeOf(m, 10, 10), 'near the start'); assert.equal(placeOf(m, 12, 11), 'near the start');
  assert.equal(placeOf(m, 30, 10), '40 m east of the start'); assert.equal(placeOf(m, 10, 0), '20 m north of the start'); assert.equal(placeOf(m, 10, 30), '40 m south of the start'); assert.equal(placeOf(m, 0, 10), '20 m west of the start');
  assert.equal(placeOf(m, 22, 22), '35 m south-east of the start'); assert.equal(placeOf(m, 0, 0), '30 m north-west of the start'); assert.equal(placeOf(null, 1, 1), ''); assert.equal(placeOf(m, NaN, 1), '');
});

test('the Log is sorted by level: this level first (newest first, numbered in the order received, with the time and the place), then the earlier levels, the most recent first', () => {
  const progress = { record: { A: ['m1', 'm2'], B: ['b1'], C: ['c1', 'c2'] }, recordAt: { A: { m1: [65, 10, 10], m2: [200, 30, 10] }, B: { b1: [12, 0, 0] }, C: { c1: [30, 4, 4] } } };
  const log = journalLog({ maps, progress, mapId: 'B', unread: new Set(['b1']), seen: ['b1'], manifest });
  assert.deepEqual(log.entries.map((e) => e.id), ['b1']); assert.equal(log.entries[0].n, 1); assert.equal(log.entries[0].when, '0:12'); assert.equal(log.entries[0].where, 'near the start'); assert.equal(log.newCount, 1); assert.deepEqual(log.pins, [{ n: 1, cx: 0, cz: 0 }]);
  assert.deepEqual(log.levels.map((l) => l.mapId), ['C', 'A'], 'the earlier levels, the most recent first'); assert.deepEqual(log.levels.map((l) => l.name), ['Charlie', 'Alpha']);
  assert.deepEqual(log.levels[1].entries.map((e) => [e.id, e.when, e.where]), [['m1', '1:05', 'near the start'], ['m2', '3:20', '40 m east of the start']], 'an earlier level keeps the order of its map, each with its time and place');
  assert.equal(log.levels[0].entries[1].when, null, 'a line received before this was recorded has no time and says none');
  assert.equal(log.earlier, 4);
  // the level being played: the attempt (the world's messagesSeen) wins over everything the Record holds, newest first, numbered oldest = 1
  const a = journalLog({ maps, progress: { record: { A: ['m1', 'm2', 'm3'] }, recordAt: { A: { m2: [9, 10, 10] } } }, mapId: 'A', seen: ['m3', 'm2'], manifest });
  assert.deepEqual(a.entries.map((e) => [e.id, e.n]), [['m2', 2], ['m3', 1]]); assert.deepEqual(a.pins, [{ n: 2, cx: 10, cz: 10 }], 'only a line with a place has a pin'); assert.equal(a.entries[1].document, true, 'a found log is still set apart');
  // without a manifest or a seen list: as before
  const b = journalLog({ maps, progress, mapId: 'A' }); assert.deepEqual(b.entries.map((e) => e.id), ['m2', 'm1']); assert.deepEqual(b.levels, []);
});

test('recording: when and where a message arrived (the latest receipt), the ledger of pickups (capped), and a fresh start of the map empties both', () => {
  let p = {}; p = recordAtAdd(p, 'A', 'm1', 64.6, 10.2, 11); assert.deepEqual(p.recordAt.A.m1, [65, 10, 11]); const q = recordAtAdd(p, 'A', 'm1', 300, 2, 3); assert.deepEqual(q.recordAt.A.m1, [300, 2, 3], 'the latest receipt'); assert.deepEqual(p.recordAt.A.m1, [65, 10, 11], 'the old object is untouched');
  assert.strictEqual(recordAtAdd(p, '', 'x', 1, 1, 1), p); assert.strictEqual(recordAtAdd(p, 'A', 'x', NaN, 1, 1), p);
  let f = {}; f = foundAdd(f, 'A', 'health_small', 20.4, 3, 4); f = foundAdd(f, 'A', 'weapon_axe', 75, 10, 12); assert.deepEqual(f.found.A, [['health_small', 20, 3, 4], ['weapon_axe', 75, 10, 12]]);
  for (let i = 0; i < FOUND_MAX + 20; i++) f = foundAdd(f, 'A', 'ammo_shell', i, 1, 1); assert.equal(f.found.A.length, FOUND_MAX, 'the oldest go first');
  const both = { ...f, ...p, record: { A: ['m1'] } }, r = attemptReset(both, 'A'); assert.equal(r.found, undefined); assert.equal(r.recordAt, undefined); assert.deepEqual(r.record, { A: ['m1'] }, 'the Record is the campaign\'s memory and stays');
  const two = attemptReset({ found: { A: [['oil', 1, 1, 1]], B: [['oil', 2, 2, 2]] } }, 'A'); assert.deepEqual(Object.keys(two.found), ['B']); assert.strictEqual(attemptReset({ salvage: 1 }, 'A').salvage, 1);
});

test('the progress carries them safely: wrong shapes, unknown pickups and huge numbers are dropped or clamped, and a save without them is unchanged', () => {
  const p = sanitizeProgress({ recordAt: { A: { ok: [12.4, 3, 4], short: [1, 2], text: 'x', nan: [NaN, 1, 1], big: [1e12, 9999, -5] }, B: 'junk' }, found: { A: [['health_small', 5, 1, 2], ['nope', 1, 1, 1], ['key_iron', 9, 3], ['key_iron', 9, 3, 4], 'junk'], B: [] } });
  assert.deepEqual(p.recordAt, { A: { ok: [12, 3, 4], big: [1e6, 2000, 0] } }); assert.deepEqual(p.found, { A: [['health_small', 5, 1, 2], ['key_iron', 9, 3, 4]] });
  const old = sanitizeProgress({ salvage: 5 }); assert.equal(old.recordAt, undefined); assert.equal(old.found, undefined);
  const many = sanitizeProgress({ found: { A: Array.from({ length: 500 }, (_, i) => ['oil', i, 1, 1]) } }); assert.equal(many.found.A.length, 300); assert.equal(many.found.A[0][1], 200, 'the newest 300 are kept');
});

test('every gun and every kind of pickup has its line of help, and the lines are facts (a pickup that is only taken when it helps says so)', () => {
  for (const id of Object.keys(WEAPONS)) { const h = WEAPON_USE[id]; assert.ok(h && h.role && h.use.length > 20 && h.use.length < 260, 'a weapon with no help: ' + id); }
  for (const kind of Object.keys(PICKUPS)) { const u = pickupUse(kind); assert.ok(u && u.length > 20, 'a pickup with no help: ' + kind); }
  assert.ok(/only taken while you are hurt/.test(pickupUse('health_large'))); assert.ok(/15 health/.test(pickupUse('health_small'))); assert.ok(/(armour|flak)/i.test(pickupUse('armor_vest')) && /50/.test(pickupUse('armor_vest'))); assert.ok(/lantern/.test(pickupUse('oil'))); assert.equal(pickupUse('nonsense'), null);
  assert.ok(/2\.4 times/.test(WEAPON_USE.carbine.use) && /three times/.test(WEAPON_USE.marlinspike.use) && /hurts you/.test(WEAPON_USE.linethrower.use) && /hurts you/.test(WEAPON_USE.mortar.use), 'the numbers match the cards and the definitions');
});

test('the Items page: what you carry with how to use it and where it came from, the keys, the lantern, and a ledger of this level in order of importance with the first and the last of each', () => {
  const found = [['health_small', 20, 3, 3], ['weapon_axe', 75, 10, 12], ['key_iron', 60, 5, 5], ['health_small', 190, 8, 9], ['ammo_shell', 40, 6, 6], ['armor_vest', 100, 7, 7], ['oil', 110, 9, 9]];
  const pg = itemsPage({ player: { weapons: ['flare', 'scattergun', 'axe'], ammo: { flare: 3, shell: 5 }, keys: ['iron'], armor: 20, lamp: { oil: 40.7, max: 240 } }, found, map: { cell: 2, entities: [{ type: 'player', at: [2, 2] }] } });
  assert.deepEqual(pg.weapons.map((w) => w.id), ['flare', 'scattergun', 'axe']); assert.equal(pg.weapons[2].key, '6'); assert.equal(pg.weapons[2].role, 'Cleaving'); assert.ok(pg.weapons[2].use.includes('cleaves')); assert.deepEqual(pg.weapons[2].from, { when: '1:15', where: '25 m south-east of the start' }); assert.equal(pg.weapons[0].from, null, 'carried from before');
  assert.equal(pg.keys[0].name, 'Iron key'); assert.ok(pg.keys[0].use.includes('doors')); assert.deepEqual(pg.lamp, { oil: 40, max: 240, use: pickupUse('oil') });
  assert.deepEqual(pg.ledger.map((r) => [r.name, r.count, r.tier]), [['Fire axe', 1, 'major'], ['Iron key', 1, 'major'], ['Canvas flak vest', 1, 'medium'], ['Lamp oil', 1, 'medium'], ['Field dressing', 2, 'minor'], ['Shotgun shells', 1, 'minor']]);
  const dr = pg.ledger.find((r) => r.kind === 'health_small'); assert.equal(dr.first.when, '0:20'); assert.equal(dr.last.when, '3:10'); assert.ok(dr.use.includes('hurt'));
  assert.deepEqual(itemsPage().ledger, []); assert.equal(itemsPage().lamp, null); assert.deepEqual(itemsPage({ found: 'junk' }).ledger, [], 'a damaged ledger draws as an empty one');
});

test('the screen: the Log shows this level then the earlier ones as folds, every line with its time, place and pin; the Items page shows the help and the ledger; every text is escaped (stand-in DOM)', () => {
  const dom = standInDom();
  try {
    const ui = new UI(new Proxy({}, { get: () => () => {} })), el = (id) => dom.els.get(id) ?? document.getElementById(id);
    const progress = { record: { A: ['m1'], B: ['b1'] }, recordAt: { A: { m1: [65, 30, 10] }, B: { b1: [12, 0, 0] } } };
    const mp = { ...maps, B: mk([0, 0], [['b1', 'INES', 'bee <i>one</i>']]) };
    const log = journalLog({ maps: mp, progress, mapId: 'B', unread: new Set(['b1']), seen: ['b1'], manifest });
    const items = itemsPage({ player: { weapons: ['flare', 'carbine'], ammo: { flare: 4, round: 20 }, keys: [], armor: 0 }, found: [['weapon_carbine', 33, 6, 0], ['health_small', 20, 1, 1]], map: mp.B });
    ui.show('journal', { log, items, mapName: 'Bravo <Harbour>', tab: 'log' });
    const lg = el('journal-list').innerHTML;
    assert.ok(lg.includes('Bravo &lt;Harbour&gt;') && lg.includes('this level'), 'the level heading, escaped: ' + lg.slice(0, 160)); assert.ok(lg.includes('class="pin">1<') && lg.includes('0:12 into the level') && lg.includes('near the start'), 'a line has its pin, time and place');
    assert.ok(lg.includes('bee &lt;i&gt;one&lt;/i&gt;') && !lg.includes('<i>one</i>'), 'escaped'); assert.ok(lg.includes('<details class="lvlbox"><summary>Alpha') && lg.includes('1:05 into the level') && lg.includes('40 m east of the start'), 'an earlier level is a fold with its own times');
    assert.ok(lg.indexOf('this level') < lg.indexOf('Alpha'), 'this level comes first'); assert.equal(el('journal-new').textContent, '(1 new)');
    const it = el('journal-items').innerHTML;
    assert.ok(it.includes('Harbour carbine') && it.includes('Precision') && it.includes('2.4 times') && it.includes('Picked up at 0:33'), 'the gun, what it is for, how to use it, when it was picked up: ' + it.slice(0, 300));
    assert.ok(it.includes('Carried from before') && it.includes('Picked up on this level') && it.includes('Field dressing') && it.includes('Restores 15 health'), 'the ledger and the help'); assert.ok(!it.includes('Lantern'), 'no lantern on a map without one');
    ui.show('journal', { log: { entries: [], newCount: 0, earlier: 3 }, mapName: 'X', tab: 'log' }); assert.ok(el('journal-list').innerHTML.includes('Nothing said on this level yet') && el('journal-list').innerHTML.includes('3 more from earlier maps'), 'an old-style log still draws');
  } finally { dom.restore(); }
});

test('the Map page draws a numbered pin for every line of the Log that has a place, and nothing when there are none', () => {
  globalThis.innerWidth = 1280; globalThis.innerHeight = 720;
  try {
    const model = { w: 10, h: 10, cell: 2, cells: [{ cx: 1, cz: 1, kind: 'floor' }], doors: [], exits: [], switches: [], player: { x: 3, z: 3, yaw: 0 }, name: 'T', kills: 0, secrets: 0, totals: { enemies: 1, secrets: 0 } };
    const draw = (m) => { const ctx = canvasContext(); drawAutomap({ width: 0, height: 0, getContext: () => ctx }, m); return ctx.calls; };
    const bare = draw(model), pinned = draw({ ...model, pins: [{ n: 1, cx: 1, cz: 1 }, { n: 2, cx: 4, cz: 4 }] });
    assert.equal((pinned.get('fillText') ?? 0) - (bare.get('fillText') ?? 0), 2, 'two numbers drawn'); assert.equal((pinned.get('arc') ?? 0) - (bare.get('arc') ?? 0), 2, 'two discs'); assert.equal(draw({ ...model, pins: [] }).get('fillText'), bare.get('fillText'));
  } finally { delete globalThis.innerWidth; delete globalThis.innerHeight; }
});

test('the shell wires it: the time and place of every message and every pickup are recorded, a fresh start empties the ledger, the Journal opens with the attempt\'s lines, the campaign\'s order, the ledger, and the pins go to the Map page', () => {
  const main = read('src/game/main.js');
  assert.ok(main.includes('recordAtAdd(g.progress, g.mapId, e.id, g.world.time') && main.includes("e.type === 'pickup' || e.type === 'weapon_pickup'") && main.includes('foundAdd(g.progress, g.mapId, e.kind, g.world.time'), 'recorded where the events are handled');
  assert.ok(main.includes('if (!world) g.progress = attemptReset(g.progress, g.mapId)'), 'a fresh start of the map, not a resumed save, empties the ledger');
  assert.ok(main.includes('seen: g.world.messagesSeen, manifest: CAMPAIGN') && main.includes('found: g.progress.found?.[g.mapId] ?? []') && main.includes('g.journalPins = log.pins') && main.includes('mdl.pins = g.journalPins'), 'the Journal is built from the attempt, the campaign order and the ledger; the pins reach the map');
  assert.ok(!/world\.time\s*=/.test(read('src/game/itemhelp.js') + read('src/game/journal.js') + read('src/game/record.js')), 'nothing here writes the clock');
});
