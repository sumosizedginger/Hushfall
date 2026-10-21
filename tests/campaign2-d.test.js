// PT-046: Campaign 2, Act D THE ROOT BELL (C2M25 to C2M30): what the act promises, and the mechanical part of the text rules of design/LORE.md. The prose is the polish pass's. Node only.
// The list BUILT grows map by map; every map in it is held to the same rules.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, shippedSrc, shippedMap } from './helpers.js';
import { LOOKS, ENEMIES } from '../src/engine/defs.js';
import { createWorld, step, drainEvents } from '../src/engine/world.js';
import { parseMap, validateMap } from '../src/engine/mapformat.js';
import { runRoute } from '../src/engine/harness.js';
import { fxAt } from '../src/engine/terrain.js';
import { isFinale, ENDINGS } from '../src/game/ending.js';

const BUILT = ['C2M25', 'C2M26', 'C2M27', 'C2M28', 'C2M29', 'C2M30'];
const ALL = BUILT;
const SRC = Object.fromEntries(ALL.map((id) => [id, shippedSrc(id)]));
const MANIFEST = JSON.parse(fs.readFileSync(path.join(ROOT, 'CAMPAIGN_MANIFEST.json'), 'utf8'));
const route = (id, name = 'main') => JSON.parse(fs.readFileSync(path.join(ROOT, 'routes', `${id}.${name}.route.json`), 'utf8'));
const idle = (o = {}) => ({ move: [0, 0], yaw: 0, pitch: 0, fire: false, aim: false, sprint: false, use: false, weapon: null, weaponStep: 0, map: false, ...o });
const lines = (src) => [src.intro?.title, ...(src.intro?.lines ?? []), src.outro, src.objective, ...(src.messages ?? []).map((m) => m.text), ...(src.triggers ?? []).flatMap((t) => (t.do ?? []).map((a) => a.objective)), ...(src.entities ?? []).filter((e) => e.type === 'switch').flatMap((e) => (e.do ?? []).map((a) => a.objective))].filter(Boolean);
const BANNED = [/echoes? of/i, /whispers?/i, /testament/i, /tapestry/i, /symphony/i, /dance of/i, /\bancient\b/i, /eldritch/i, /cosmic/i, /unspeakable/i, /chilling/i, /haunting/i, /\beerie\b/i, /the weight of/i, /silence that speaks/i];
const SPEAKS_ONCE = { 'SIGNAL HOUSE': ['C2M30'] };                                                                                  // where a speaker is allowed at all in Act C

test('Act D maps are in the manifest order, load, name their own look, and the beat is gone', () => {
  const order = MANIFEST.maps.filter((x) => x.campaign === 2 && x.kind === 'main').sort((a, b) => a.order - b.order).slice(24, 30).map((x) => x.id);
  assert.deepEqual(order, ['C2M25', 'C2M26', 'C2M27', 'C2M28', 'C2M29', 'C2M30']); assert.equal(MANIFEST.maps.find((x) => x.id === 'C2M24').next, 'C2M25');
  for (const id of ALL) {
    const s = SRC[id]; assert.equal(validateMap(s).ok, true, id + ' ' + JSON.stringify(validateMap(s).errors));
    assert.ok(LOOKS[s.atmosphere.look] && s.atmosphere.look !== 'harbour', id + ' names its own look'); assert.ok(s.intro?.title && s.intro.lines.length === 2 && s.outro, id + ' has an intro and an outro');
    assert.ok(!s.atmosphere.beat, id + ': the Hive Cantor is dead and the beat is gone');
  }
  assert.equal(new Set(ALL.map((id) => SRC[id].atmosphere.look)).size, ALL.length, 'every map its own look');
});

test('the text follows the mechanical rules of LORE.md: no stock phrases, short, only the speakers the story has', () => {
  const bad = [];
  for (const id of ALL) {
    for (const t of lines(SRC[id])) for (const re of BANNED) if (re.test(t)) bad.push(`${id}: '${t.slice(0, 50)}...' matches ${re}`);
    for (const m of SRC[id].messages) { if (m.text.length > 180) bad.push(`${id} ${m.id}: ${m.text.length} characters`); const n = (m.text.match(/[.!?]/g) ?? []).length, cap = /\b(LOG|LEDGER|PLATE|TALLY|NOTE|MANIFEST)\b/.test(m.speaker) ? 6 : 4; if (n > cap) bad.push(`${id} ${m.id}: ${n} sentences (limit ${cap})`); }
  }
  assert.deepEqual(bad, []);
  const VOICES = new Set(['INES', 'HULL', 'A SILENT', 'A SILENT (NOTE)', 'A ZEALOT', 'SIGNAL HOUSE']), found = /\b(LOG|LEDGER|PLATE|TALLY|NOTE|MANIFEST)\b/;
  for (const id of ALL) for (const m of SRC[id].messages) { assert.ok(VOICES.has(m.speaker) || found.test(m.speaker), `${id} ${m.id}: unknown speaker '${m.speaker}'`); if (SPEAKS_ONCE[m.speaker]) assert.ok(SPEAKS_ONCE[m.speaker].includes(id), `${id}: ${m.speaker} speaks only in ${SPEAKS_ONCE[m.speaker]}`); }
});

test('every route of Act D reaches its exit on all three difficulties, and only the secret routes find the secrets', () => {
  for (const id of ALL) {
    const map = shippedMap(id);
    for (const difficulty of ['easy', 'normal', 'hard']) { const r = runRoute(map, route(id), { seed: 2, difficulty }); assert.equal(r.result, 'complete', `${id} main ${difficulty}: ${r.failure}`); }
    if (SRC[id].secrets.length) { const m = runRoute(map, route(id), { seed: 1 }), s = runRoute(map, route(id, 'secret'), { seed: 1 }); assert.equal(m.world.stats.secrets, 0, id + ': the main route finds none'); assert.equal(s.result, 'complete', id + ' secret: ' + s.failure); assert.equal(s.world.stats.secrets, SRC[id].secrets.length, id); }
  }
});

test('C2M25, the descent: six landings thirty metres down, a vent across the dark between each, a lit lantern that holds a ring back, a lever and a door', () => {
  const s = SRC.C2M25, map = shippedMap('C2M25'); assert.equal(s.atmosphere.dark, true); assert.ok(s.lantern.oil > 0); assert.deepEqual(s.lampHolds, { plain: 0.6, own: 0.4 }); assert.equal(s.vents.length, 5);
  const hs = new Set(); for (let z = 0; z < map.h; z++) for (let x = 0; x < map.w; x++) if (map.kind(x, z) === 'outdoor') hs.add(map.floor(x, z)); assert.deepEqual([...hs].sort((a, b) => b - a), [30, 25, 20, 15, 10, 5], 'six landings, a five-metre step each');
  // each vent lands on the next landing, lower by five metres
  for (const v of s.vents) { const a = map.floor(v.at[0], v.at[1]), b = map.floor(v.to[0], v.to[1]); assert.equal(a - b, 5, 'a vent drops five metres: ' + v.at); }
  const lever = s.entities.find((e) => e.type === 'switch'), door = s.doors.find((d) => d.remote); assert.ok(lever && door && lever.do.some((a) => a.open)); assert.ok(s.messages.some((m) => /lit lamp holds the sound back/i.test(m.text) && m.speaker === 'A SILENT (NOTE)'), 'told in the niche');
  assert.equal(s.entities.filter((e) => e.kind === 'resonant').length, 2);
  const r = runRoute(map, route('C2M25'), { seed: 1 }); assert.equal(r.result, 'complete', r.failure); assert.ok(r.events.filter((e) => e.type === 'vent_launch').length >= 5, 'the whole way down by the vents'); assert.ok(r.world.player.lamp.on, 'the bot carried the lamp lit');
});

test('C2M26, Silent Roots: dark and silent, the noise tell on, three chambers of the Silent each with a latch (any order, an AND), a refectory gate, and a hollow root column', () => {
  const s = SRC.C2M26, map = shippedMap('C2M26'); assert.equal(s.noiseTell, true); assert.equal(s.atmosphere.dark, true); assert.equal(s.atmosphere.silence, true); assert.ok(s.lantern.oil > 0);
  const lat = s.entities.filter((e) => e.type === 'switch'); assert.deepEqual(lat.map((q) => q.id).sort(), ['r1', 'r2', 'r3']); const gate = s.triggers.find((t) => t.id === 'gate-open'); assert.deepEqual(gate.when, ['msg:r1', 'msg:r2', 'msg:r3']);
  assert.equal(s.entities.filter((e) => e.kind === 'vaelfolk').length, 3, 'one of the Silent in each chamber'); assert.ok(s.doors.some((d) => d.remote), 'the refectory gate');
  assert.ok(s.messages.filter((m) => m.speaker === 'A SILENT').length >= 3, 'each says what it will not do');
  // the order of the latches does not matter
  const order = (ids) => { const w = createWorld(map, { seed: 1 }); w.player.hp = 1e6; const C = (c) => (c + 0.5) * map.cell, YAW = { north: 0, south: Math.PI, east: -Math.PI / 2, west: Math.PI / 2 }; for (const id of ids) { const q = lat.find((e) => e.id === id); Object.assign(w.player, { x: C(q.at[0]), z: C(q.at[1]), yaw: YAW[q.wall], vx: 0, vz: 0 }); for (let i = 0; i < 4; i++) { step(w, idle({ use: i === 0 })); drainEvents(w); } } for (let i = 0; i < 3; i++) step(w, idle()); return w.doors.find((d) => d.remote)?.target; };
  assert.equal(order(['r3', 'r1']), 0, 'two latches are not enough'); assert.equal(order(['r3', 'r1', 'r2']), 1, 'three, in any order, open the gate'); assert.equal(order(['r2', 'r3', 'r1']), 1);
  // the refectory is sunk two metres below the forest
  assert.ok(map.floor(50, 15) < map.floor(50, 45) - 1.9, 'down a stair to the refectory');
  const sleeping = s.entities.filter((e) => e.type === 'enemy').length; assert.ok(sleeping >= 30, 'sleepers: ' + sleeping);
});

test('C2M27, Fault Line: a front of falling stones from the west end that a player who runs stays ahead of and one who stays is caught by, bridges that sink once crossed with a stair out of the pit, and a lever on the far lip that unlocks the exit', () => {
  const s = SRC.C2M27, map = shippedMap('C2M27'); assert.ok(s.loads.length >= 30 && s.loads.every((l) => l.start >= 45 && l.count === 3), 'strips that start at 45 s and fall three times');
  const starts = [...new Set(s.loads.map((l) => l.start))].sort((a, b) => a - b); assert.ok(starts.every((v, i) => i === 0 || v - starts[i - 1] === 12), 'a strip every twelve seconds, six cells (a metre a second)');
  assert.deepEqual(s.sectors.map((q) => q.id), ['bridge1', 'bridge2', 'bridge3']); for (const q of s.sectors) { assert.equal(q.high - q.low, 1.5, 'a metre and a half'); }
  // a player who does not run is caught by the front: standing at the west end for two minutes is hurt by the stones
  const idle = (o = {}) => ({ move: [0, 0], yaw: 0, pitch: 0, fire: false, aim: false, sprint: false, use: false, weapon: null, weaponStep: 0, map: false, ...o });
  const w = createWorld(map, { seed: 1 }); w.enemies.length = 0; w.player.hp = 1e6; let hits = 0; for (let i = 0; i < 60 * 120; i++) { step(w, idle()); for (const e of drainEvents(w)) if (e.type === 'load_hit') hits++; } assert.ok(hits >= 1, 'the front reached the west end: ' + hits + ' hits');
  // the bot, running, is never hit by one
  const r = runRoute(map, route('C2M27'), { seed: 1 }); assert.equal(r.result, 'complete', r.failure); assert.equal(r.events.filter((e) => e.type === 'load_hit').length, 0, 'ahead of the front'); assert.ok(r.events.filter((e) => e.type === 'sector_start').length >= 2, 'both bridges sank');
  const ex = s.entities.find((e) => e.type === 'exit'); assert.equal(ex.locked, true); assert.ok(s.entities.find((e) => e.type === 'switch').do.some((a) => a.exit?.set === 'unlock'));
});

test('C2M28, Last Tide: eight strokes tolled by the dock and a ninth by hand, a hunting wave through four gates with each, a tide that climbs the lower steps, a last squad, a causeway gate and a rope that unlocks the exit', () => {
  const s = SRC.C2M28, map = shippedMap('C2M28'), idleIn = (o = {}) => ({ move: [0, 0], yaw: 0, pitch: 0, fire: false, aim: false, sprint: false, use: false, weapon: null, weaponStep: 0, map: false, ...o });
  // eight tolled strokes, a plate counting each, eighteen seconds apart
  const times = []; for (let k = 1; k <= 8; k++) { const t = s.triggers.find((q) => q.id === `w${k}-0`); assert.ok(t.do.some((a) => a.sound === 'toll') && t.do.some((a) => a.message === 'stroke' + k), 'stroke ' + k); assert.ok(s.messages.some((m) => m.id === 'stroke' + k && m.speaker === 'TIDE PLATE')); times.push(Number(t.when.slice(5))); }
  assert.ok(times.every((v, i) => i === 0 || v - times[i - 1] === 18) && times[0] >= 30, 'a quiet start and a stroke every eighteen seconds: ' + times);
  const rope = s.entities.find((e) => e.type === 'switch'); assert.equal(rope.id, 'rope'); assert.ok(rope.do.some((a) => a.sound === 'toll') && rope.do.some((a) => a.exit?.set === 'unlock'), 'the ninth stroke is the rope, and it unlocks the exit'); assert.equal(s.entities.find((e) => e.type === 'exit').locked, true);
  // the waves hunt, and come from all four gates
  const spawns = s.triggers.flatMap((t) => t.do.filter((a) => a.spawn).map((a) => a.spawn)); assert.ok(spawns.length >= 70 && spawns.every((q) => q.hunt === true && /^(w[1-8]|last)$/.test(q.group)), 'wave creatures: ' + spawns.length);
  assert.equal(new Set(spawns.map((q) => (q.at[0] > 32 ? 1 : 0) + (q.at[1] > 32 ? 2 : 0))).size, 4, 'all four gates');
  assert.ok(new Set(spawns.map((q) => q.kind)).size >= 7, 'a mixed roster'); assert.ok(!spawns.some((q) => q.kind === 'sexton' || q.kind === 'acolyte'), 'nothing that raises the dead or halves a hit in a stand the bot has to be able to finish');
  // the tide: dry at the start, over the lowest step after the third stroke, over the middle step after the sixth, never over the highest
  const w = createWorld(map, { seed: 1 }), at = (cx, cz) => fxAt(w, (cx + 0.5) * map.cell, (cz + 0.5) * map.cell), LOW = [32, 42], MID = [32, 50], TOP = [32, 57];
  w.time = 0; assert.equal([LOW, MID, TOP].map((c) => at(...c)).join(), ',,', 'dry at the start');
  w.time = 85; assert.equal(at(...LOW), 'w'); assert.equal(at(...MID), null); w.time = 200; assert.equal(at(...LOW), 'w'); assert.equal(at(...MID), 'w'); assert.equal(at(...TOP), null, 'the highest step stays dry');
  // the stand: left alone, the creatures keep coming (none gives up), and the causeway stays shut because the last squad is never put down
  const w2 = createWorld(map, { seed: 1 }); w2.player.hp = 1e9; for (let i = 0; i < 60 * 200; i++) { step(w2, idleIn()); drainEvents(w2); }
  assert.equal(w2.enemies.filter((e) => e.hunt && e.state === 'idle').length, 0, 'nobody went back to sleep'); assert.ok(w2.enemies.some((e) => e.group === 'last'), 'the last squad came');
  const gate = [...w2.doors.values()].find((d) => d.cx === 32 && d.cz === 29); assert.ok(gate && gate.target === 0, 'the causeway gate is still shut');
  // the bot that fights holds, then opens the causeway, rings the rope and walks out
  const r = runRoute(map, route('C2M28'), { seed: 1 }); assert.equal(r.result, 'complete', r.failure); assert.ok(r.events.some((e) => e.type === 'door_open' && e.cx === 32 && e.cz === 29), 'the causeway opened'); assert.equal(r.world.stats.kills, r.world.stats.total.enemies, 'every creature of the stand was put down');
});

test('C2M29, The Root Bell: the final boss map (every weapon, every box stays, dark, the lamp holds a ring back), a clapper on a pendulum, four anchors that pin it, a fall, a last note and a silence that unlocks the stair', () => {
  const s = SRC.C2M29, map = shippedMap('C2M29'); assert.equal(s.atmosphere.dark, true); assert.deepEqual(s.lampHolds, { plain: 0.6, own: 0.4 }); assert.ok(s.entryLoadout.weapons.length >= 14, 'every weapon from the start');
  assert.deepEqual(s.drops.keep, [[0, 0, 71, 71]], 'a boss map keeps every ammunition box'); assert.equal(s.entities.find((e) => e.type === 'exit').locked, true);
  const ents = s.entities.filter((e) => e.type === 'enemy'); assert.equal(ents.filter((e) => e.kind === 'rootbell').length, 1); assert.equal(ents.filter((e) => e.kind === 'rootanchor').length, 4); assert.equal(ents.filter((e) => e.group === 'guard1').length, 4, 'a small guard: the fight is about the clapper');
  const T = (id) => s.triggers.find((t) => t.id === id); assert.ok(T('in').do.some((a) => a.wake === 'rootbell')); assert.equal(T('anchors').when, 'dead:anchors'); assert.equal(T('anchors').do.filter((a) => a.spawn).length, 2, 'two Zealots at the fall');
  assert.equal(T('last').when, 'hp:rootbell<0.3'); assert.ok(T('last').do.some((a) => a.lights != null)); assert.ok(T('down').do.some((a) => a.silence) && T('down').do.some((a) => a.exit?.set === 'unlock'), 'the silence and the stair');
  // three tiers round the floor, a half-step at every radius (a stair all the way round)
  const hs = new Set(); for (let z = 0; z < map.h; z++) for (let x = 0; x < map.w; x++) if (map.kind(x, z) === 'floor' && Math.hypot(x - 44, z - 42) < 11) hs.add(map.floor(x, z)); assert.deepEqual([...hs].sort((a, b) => a - b), [0, 0.5, 1, 1.5, 2, 2.5, 3]);
  // the whole fight: it hangs and does not break, the sound is cut, the stair is open, and nothing else of the map was found on the way (the secret is a thing to look for)
  const r = runRoute(map, route('C2M29'), { seed: 1 }); assert.equal(r.result, 'complete', r.failure); assert.equal(r.world.stats.secrets, 0); assert.equal(r.world.silenced, true, 'the sound was cut');
  const bell = r.world.enemies.find((e) => e.kind === 'rootbell'); assert.equal(bell.state, 'dead'); assert.equal(bell.rb.mode, 'rise', 'drawn back up and hung, not broken');
  assert.ok(r.events.some((e) => e.type === 'bell_fall') && r.events.some((e) => e.type === 'bell_last') && r.events.some((e) => e.type === 'spike_strike' || e.type === 'spike_warn'), 'every phase happened');
});

test('C2M30, The Unrung Gate: no combat, silent, an eternal lamp, six rooms of the descent in reverse, the Gate that opens only for a lit lamp, the finale of Campaign Two with its epilogue, and the last page of Pellew in a seam', () => {
  const s = SRC.C2M30, map = shippedMap('C2M30'); assert.equal(s.atmosphere.silence, true); assert.equal(s.lantern.eternal, true); assert.equal(s.entities.filter((e) => e.type === 'enemy').length, 0, 'no combat'); assert.equal(s.quality.safe, true);
  assert.equal(s.lookZones.length, 6, 'six rooms, each in its own light'); assert.equal(new Set(s.lookZones.map((z) => z.look)).size, 6);
  assert.ok(isFinale(MANIFEST, 'C2M30'), 'the last main map of Campaign Two'); assert.ok(ENDINGS[2] && ENDINGS[2].cards.length >= 4, 'the epilogue (a first draft until the owner has played the descent)');
  assert.equal(s.messages.filter((m) => m.speaker === 'SIGNAL HOUSE').length, 1, 'the voice from the other side answers once at the Gate (the epilogue has the rest of the call: PT-071, the scene is said once)'); assert.ok(s.messages.some((m) => /LOG/.test(m.speaker) && /not the water/.test(m.text)), 'the page that finishes the sentence of the Ossuary');
  const door = s.triggers.find((t) => t.id === 'door'); assert.deepEqual(door.when, ['msg:door', 'lamp:on']); assert.equal(s.entities.find((e) => e.type === 'exit').locked, true);
  // the Gate opens for a LIT lamp only: with the lamp put out the walk ends at a locked exit, and lighting it opens the way
  const R = route('C2M30'), head = R.slice(0, 6), tail = R.slice(6);                                                        // the walk to the steppe, then the Gate (goto 103, goto 106, wait, goto exit)
  const dark = [...head, { op: 'lamp', on: false }, ...tail], r1 = runRoute(map, dark, { seed: 1 }); assert.notEqual(r1.result, 'complete', 'a dark lamp does not open the Gate');
  const lit = [...head, { op: 'lamp', on: false }, ...tail.slice(0, 2), { op: 'lamp', on: true }, ...tail.slice(2)], r2 = runRoute(map, lit, { seed: 1 }); assert.equal(r2.result, 'complete', r2.failure);
});
