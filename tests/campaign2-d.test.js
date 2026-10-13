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

const BUILT = ['C2M25', 'C2M26'];
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
    for (const m of SRC[id].messages) { if (m.text.length > 180) bad.push(`${id} ${m.id}: ${m.text.length} characters`); const n = (m.text.match(/[.!?]/g) ?? []).length, cap = /(LOG|LEDGER|PLATE|TALLY|NOTE|MANIFEST)/.test(m.speaker) ? 6 : 4; if (n > cap) bad.push(`${id} ${m.id}: ${n} sentences (limit ${cap})`); }
  }
  assert.deepEqual(bad, []);
  const VOICES = new Set(['INES', 'HULL', 'A SILENT', 'A SILENT (NOTE)', 'A ZEALOT', 'SIGNAL HOUSE']), found = /(LOG|LEDGER|PLATE|TALLY|NOTE|MANIFEST)/;
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
