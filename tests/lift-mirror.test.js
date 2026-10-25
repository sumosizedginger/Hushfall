// FREEZE F7, the timing platform returns (design/MECHANICS_RETURNING.md): the Mirror Array (C1E4M04) has a hoist plinth in the south-west chamber's west wall: nine cells of floor that rise to a ledge two metres up, hold, and sink, on a clock of fourteen seconds.
// The clock itself is tested in tests/platforms.test.js; this holds what the MAP does with it: the plinth and the ledge are where the source says, the ledge is sealed in solid wall, nobody on the routes ever stands on the plinth or the ledge, the third route
// (`plat`) waits for the plinth, rides it and takes the cache, and a body standing on the plinth is carried up to the height of the ledge.
import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import fs from 'node:fs';
import { loadMapFile, loadRouteFile, runRoute } from '../src/engine/harness.js';
import { createWorld, step } from '../src/engine/world.js';
import { platformState, lowDwell } from '../src/engine/platforms.js';
import { shippedSrc, ROOT } from './helpers.js';

const src = shippedSrc('C1E4M04'), map = () => loadMapFile(path.join(ROOT, 'maps/C1E4M04.json')), route = (n) => loadRouteFile(path.join(ROOT, 'routes/C1E4M04.' + n + '.route.json'));
const idle = { move: [0, 0], yaw: 0, pitch: 0, fire: false, aim: false, sprint: false, use: false, weapon: null, weaponStep: 0 };
const lift = src.sectors.find((s) => s.id === 'lift');

test('one plinth of nine cells that rises two metres, holds eight seconds, and stands low for at least four: long enough to step on', () => {
  assert.equal(src.sectors.length, 1); assert.equal(lift.cells.length, 9); assert.deepEqual([lift.low, lift.high, lift.cycle.period, lift.cycle.hold], [0, 2, 14, 8]);
  assert.ok(lowDwell(lift) >= 4 - 1e-9, 'low for ' + lowDwell(lift) + ' s');
  assert.equal(platformState(lift, 0).phase, 'high', 'the clock begins with the plinth up'); assert.equal(platformState(lift, 0).h, 2);
});

test('the ledge is six cells at the height of the plinth when it is up, cut into solid wall: every neighbour that is not the plinth is wall', () => {
  const m = map(), ledge = [[27, 37], [28, 37], [27, 38], [28, 38], [27, 39], [28, 39]], inLedge = (x, z) => ledge.some(([a, b]) => a === x && b === z), inLift = (x, z) => lift.cells.some(([a, b]) => a === x && b === z);
  for (const [x, z] of ledge) { assert.equal(m.kind(x, z), 'floor'); assert.equal(m.floor(x, z), lift.high, `ledge cell ${x},${z} is at the plinth's high stop`); }
  for (const [x, z] of ledge) for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) { const nx = x + dx, nz = z + dz; if (inLedge(nx, nz) || inLift(nx, nz) || nx > 28) continue; /* x = 29 is the plinth's own column: the chamber's floor goes on past its rows, and a 2 m ledge cannot be climbed from there */ assert.equal(m.kind(nx, nz), 'wall', `the ledge is sealed: ${nx},${nz}`); }
  for (const [x, z] of lift.cells) assert.equal(m.floor(x, z), lift.low, 'the plinth stands in the chamber at the chamber\'s floor');
});

test('the cache on the ledge is a large satchel and a vest, and nothing on the routes ever stands on the plinth or the ledge', () => {
  const m = map(), cache = src.entities.filter((e) => e.type === 'pickup' && e.at[0] >= 27 && e.at[0] <= 28 && e.at[1] >= 37 && e.at[1] <= 39);
  assert.deepEqual(cache.map((e) => e.kind).sort(), ['armor_vest', 'health_large']);
  const lane = JSON.parse(fs.readFileSync(path.join(ROOT, 'maps-src/lanes/C1E4M04.json'), 'utf8')).map((k) => k.split(',').map(Number));
  for (const [x, z] of lift.cells) for (const [a, b] of lane) assert.ok(Math.max(Math.abs(a - x), Math.abs(b - z)) >= 2, `the traffic of the routes keeps two cells clear of the plinth: ${a},${b} against ${x},${z}`);
  for (const name of ['main', 'secret']) for (const difficulty of ['easy', 'normal']) {
    let seen = 0; runRoute(m, route(name), { seed: 1, difficulty, onTick: (w) => { const cx = Math.floor(w.player.x / w.map.cell), cz = Math.floor(w.player.z / w.map.cell); if (cx <= 31 && cx >= 27 && cz >= 37 && cz <= 39) seen++; } });
    assert.equal(seen, 0, `${name} on ${difficulty} never enters the plinth or the ledge`);
  }
});

test('the message is told from beside the plinth, in plain words', () => {
  const msg = src.messages.find((q) => q.id === 'lift'); assert.ok(msg && msg.speaker === 'HULL' && msg.text.length <= 180);
  assert.ok(!/\b(very|really|truly)\b|—|;/.test(msg.text), 'plain words'); assert.ok(Math.hypot(msg.at[0] - 30, msg.at[1] - 38) <= 4, 'within sight of the plinth');
});

test('a body on the plinth is carried up to the ledge and can walk onto it; the plinth sinks again and leaves the body on the ledge, not in the wall', () => {
  const w = createWorld(map(), { seed: 1, difficulty: 'normal' }), p = w.player, m = w.map; p.hp = 1e6;
  // wait until the plinth is low with time to spare (the clock is a pure function of w.time; nothing but the player moves here)
  for (let i = 0; i < 60 * 30 && !(platformState(lift, w.time).phase === 'low' && platformState(lift, w.time).left >= 2.5); i++) step(w, idle); assert.equal(platformState(lift, w.time).phase, 'low');
  Object.assign(p, { x: 30.5 * m.cell, z: 38.5 * m.cell, y: 0, yaw: Math.PI / 2 }); const y0 = p.y;
  for (let i = 0; i < 60 * 8 && platformState(lift, w.time).phase !== 'high'; i++) step(w, idle);
  for (let i = 0; i < 20; i++) step(w, idle); assert.ok(p.y >= lift.high - 0.05, `carried to the ledge's height: ${y0} -> ${p.y.toFixed(2)}`);
  p.yaw = Math.PI / 2; for (let i = 0; i < 60 * 1.5; i++) step(w, { ...idle, move: [0, 1] });            // walk west (the player's yaw is set directly; a command's yaw is a turn)
  assert.ok(p.x / m.cell < 29 && p.y >= lift.high - 0.05, `on the ledge: x ${(p.x / m.cell).toFixed(2)}, y ${p.y.toFixed(2)}`);
});

test('the plat route waits for the plinth, rides it, takes the satchel and the vest, and reaches the exit on every difficulty (hard by either fighter); the ride costs time', () => {
  const m = map(), plat = route('plat'), main = route('main');
  assert.ok(plat.some((o) => o.op === 'waitplatform' && o.id === 'lift'));
  for (const difficulty of ['easy', 'normal', 'hard']) { const r = runRoute(m, plat, { seed: 1, difficulty }); assert.equal(r.result, 'complete', `${difficulty}: ${r.result} ${r.failure ?? ''}`); }
  const a = runRoute(m, plat, { seed: 1, difficulty: 'normal' }), b = runRoute(m, main, { seed: 1, difficulty: 'normal' });
  assert.ok(a.ticks > b.ticks + 300, `waiting for the plinth costs time: ${a.ticks} against ${b.ticks}`); assert.equal(a.world.stats.items - b.world.stats.items, 2, 'two more pickups taken'); assert.ok(a.world.player.armor >= 50, 'the vest');
});
