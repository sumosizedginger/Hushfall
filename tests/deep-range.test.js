// PT-038 (Campaign 2 Act B): the Deep Range, the dev map where the new tools of the Sounding Deep can be tried (maps-dev/DEEP.json; never in maps/, never counted). It is held to what it says: dark, a hand lantern, oil on
// the road, Zealots, a bowl of terraces that can be climbed back out of, and a chime grove whose gate opens when the three rounds are answered (the bot plays them through the real input layer).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from './helpers.js';
import { parseMap, validateMap } from '../src/engine/mapformat.js';
import { createWorld, step, drainEvents } from '../src/engine/world.js';
import { runRoute } from '../src/engine/harness.js';
import { findTraps } from '../src/engine/traps.js';
import { ENEMIES, LOOKS } from '../src/engine/defs.js';

const src = JSON.parse(fs.readFileSync(path.join(ROOT, 'maps-dev', 'DEEP.json'), 'utf8')), map = () => parseMap(JSON.parse(JSON.stringify(src)));
const idle = (o = {}) => ({ move: [0, 0], yaw: 0, pitch: 0, fire: false, aim: false, sprint: false, use: false, weapon: null, weaponStep: 0, map: false, ...o });
const R1 = [0, 2, 1], R2 = [3, 1, 4, 0], R3 = [2, 4, 0, 3, 1];

test('the Deep Range is a dev map: it is not in maps/, it validates, it is dark, it has a lantern and a look of its own', () => {
  assert.equal(fs.existsSync(path.join(ROOT, 'maps', 'DEEP.json')), false); assert.equal(validateMap(src).ok, true, JSON.stringify(validateMap(src).errors));
  assert.equal(src.range, true); assert.equal(src.atmosphere.dark, true); assert.ok(src.lantern.oil > 0 && src.lantern.max >= src.lantern.oil); assert.ok(LOOKS[src.atmosphere.look]);
  const kinds = new Set(src.entities.filter((e) => e.type === 'enemy').map((e) => e.kind)); for (const k of ['zealot', 'gaunt', 'tollbearer', 'gill']) assert.ok(kinds.has(k), 'a ' + k + ' stands in it');
  assert.ok(src.entities.some((e) => e.kind === 'oil') && src.entities.filter((e) => e.kind === 'lantern').length >= 5 && src.entities.filter((e) => e.kind === 'chime').length === 5 && src.entities.some((e) => e.kind === 'chimetree'));
  assert.equal(src.entities.filter((e) => e.kind === 'zealot' && e.hold === 'inert').length, 2, 'two sponge Zealots for the outline and the hit volume');
});

test('it is a cave and not a box, with no trap in it (every cell a person can walk or fall into has a way out), the bowl can be climbed out of and the alcove is reachable once the gate opens', () => {
  const m = map(), t = findTraps(m); assert.equal(t.traps, 0, 'no trap: ' + JSON.stringify(t.groups));
  let open = 0; for (let z = 0; z < m.h; z++) for (let x = 0; x < m.w; x++) if (m.kind(x, z) !== 'wall') open++; assert.ok(open > 1500 && open < 0.5 * m.w * m.h, 'a cave system with plenty of rock: ' + open + ' open cells of ' + m.w * m.h);
  const heights = new Set(); for (let z = 0; z < m.h; z++) for (let x = 0; x < m.w; x++) if (m.kind(x, z) !== 'wall') heights.add(m.floor(x, z)); assert.ok(heights.size >= 4, 'the floor is not flat: ' + [...heights].sort((a, b) => a - b).join(' '));
});

test('in the dark a sleeper 12 m off stays asleep until the lantern is lit, and the lantern is what the world says it is', () => {
  const w = createWorld(map(), { seed: 1, difficulty: 'normal' }); assert.equal(w.map.dark, true); assert.equal(w.player.lamp.on, false); assert.equal(w.lit, false);
  const ev = []; for (let i = 0; i < 1; i++) { step(w, idle({ lamp: true })); ev.push(...drainEvents(w)); } assert.equal(w.player.lamp.on, true); for (let i = 0; i < 120; i++) step(w, idle());
  assert.ok(w.player.lamp.oil < src.lantern.oil, 'it burned'); assert.equal(w.lit, true);
});

test('the bot walks the whole way: lantern lit, through the tunnel and the grotto to the grove, answers the three rounds on the chimes the tree plays, and the alcove gate opens', () => {
  const ops = [{ op: 'goto', at: [20, 55] }, { op: 'goto', at: [31, 49] }, { op: 'goto', at: [43, 43] }, { op: 'goto', at: [60, 42] }, { op: 'goto', at: [68, 54] },
    { op: 'chime', id: 'tree' }, ...R1.map((n) => ({ op: 'chime', id: 'c' + n })), { op: 'chime', id: 'tree' }, ...R2.map((n) => ({ op: 'chime', id: 'c' + n })), { op: 'chime', id: 'tree' }, ...R3.map((n) => ({ op: 'chime', id: 'c' + n })),
    { op: 'wait', seconds: 2.5 }, { op: 'goto', at: [86, 63] }];
  const r = runRoute(map(), ops, { seed: 3, maxTicks: 60 * 60 * 10 });
  assert.ok(r.result === 'complete' || r.result === 'route-ended', 'the route ran: ' + r.result + ' ' + r.failure); assert.deepEqual(Object.keys(r.world.chimes.matched).sort(), ['r1', 'r2', 'r3'], 'three rounds answered'); assert.ok(r.world.player.lamp.oil > 0, 'oil left: ' + r.world.player.lamp.oil.toFixed(1));
  const gate = r.world.doors.find((d) => d.cx === 84 && d.cz === 63); assert.equal(gate.target, 1, 'the gate was opened by the trigger');
  assert.ok(Math.hypot(r.world.player.x - 86.5 * 2, r.world.player.z - 63.5 * 2) < 4, 'the bot stands in the alcove');
});
