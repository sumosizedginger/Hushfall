// FREEZE F7, the cars return (design/MECHANICS_RETURNING.md): the Pulse Foundry (C2M21) has a flat car, the SKIFF, that crosses the pit between a gap in the top ring's inner wall on the west and one on the east. The mechanism is tested in tests/carriers.test.js and
// tests/ride-bot.test.js; this holds what the MAP does with it: the car and its two docks are where the source says, the deck's path is clear (the validator sweeps it), the third route rides it and gets to the exit, and the main and secret routes are the very
// routes they were: a dock in the first place tried (north of the pit, beside the Resonant that stands by the last valve) moved a Hard seed, so the docks are on the south side.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { loadMapFile, loadRouteFile, runRoute, runRouteEither } from '../src/engine/harness.js';
import { validateMap, parseMap } from '../src/engine/mapformat.js';
import { shippedSrc, ROOT } from './helpers.js';

const src = shippedSrc('C2M21'), map = () => loadMapFile(path.join(ROOT, 'maps/C2M21.json'));
const route = (name) => loadRouteFile(path.join(ROOT, 'routes/C2M21.' + name + '.route.json'));

test('one car, a 3 x 3 skiff on a straight path across the pit, ten seconds at each end', () => {
  assert.equal(src.cars.length, 1); const c = src.cars[0];
  assert.deepEqual([c.id, c.size, c.stops, c.dwell], ['skiff', [3, 3], [0, 1], 10]);
  assert.equal(c.path.length, 2); assert.equal(c.path[0][1], c.path[1][1], 'it runs along one row: east-west'); assert.ok(c.path[0][0] < 50 && c.path[1][0] > 50, 'from the west of the pit to the east of it');
  const v = validateMap(src); assert.deepEqual(v.errors, [], 'the validator sweeps the deck along its whole path and finds no wall'); assert.equal(v.ok, true);
});

test('both docks: the deck at each stop overhangs the pit, and the ground it touches on its outer edge is walkable on every row of its width; between the stops there is nothing but pit', () => {
  const m = parseMap(src), c = src.cars[0], walk = (k) => k === 'floor' || k === 'outdoor';
  const z0 = Math.floor(c.path[0][1]), west = Math.floor(c.path[0][0] - 1.5) - 1, east = Math.floor(c.path[1][0] + 1.5);
  for (let dz = -1; dz <= 1; dz++) { assert.ok(walk(m.kind(west, z0 + dz)), 'west dock ground ' + west + ',' + (z0 + dz)); assert.ok(walk(m.kind(east, z0 + dz)), 'east dock ground ' + east + ',' + (z0 + dz)); }
  for (const [x, z] of c.path) for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) assert.notEqual(m.kind(Math.floor(x) + dx, Math.floor(z) + dz), 'wall', 'the stopped deck is over no wall');
  for (let x = Math.floor(c.path[0][0]) + 2; x <= Math.floor(c.path[1][0]) - 2; x++) assert.equal(m.kind(x, z0), 'void', 'pit between the stops at ' + x);
});

test('the skiff is told in a message the main route hears', () => {
  const msg = src.messages.find((q) => q.id === 'skiff'); assert.ok(msg && msg.speaker === 'INES' && msg.text.length <= 180, 'a short line by Ines');
  assert.ok(!/\b(very|really|truly)\b|—|;/.test(msg.text), 'plain words');
});

test('the car route rides the skiff and reaches the exit: easy and normal as they stand, hard by either fighter; it takes longer than the main route (it waits for the car)', () => {
  const m = map(), car = route('car'), main = route('main');
  assert.ok(car.some((o) => o && o.op === 'ride' && o.id === 'skiff'), 'it has a ride op');
  for (const difficulty of ['easy', 'normal']) { const r = runRoute(m, car, { seed: 1, difficulty }); assert.equal(r.result, 'complete', `${difficulty}: ${r.result} ${r.failure ?? ''}`); }
  const hard = runRouteEither(m, car, { seed: 1, difficulty: 'hard' }); assert.equal(hard.result, 'complete', 'hard: ' + hard.result);
  const a = runRoute(m, car, { seed: 1, difficulty: 'normal' }), b = runRoute(m, main, { seed: 1, difficulty: 'normal' }); assert.ok(a.ticks > b.ticks + 600, `the ride costs time: ${a.ticks} against ${b.ticks}`);
});

test('the main and secret routes are what they were before the skiff: the committed route files did not change', () => {
  // the routes are regenerated from the source's waypoints; their sha is part of the evidence, so a change here is a change of what the other maps' gates ran on
  const main = JSON.parse(fs.readFileSync(path.join(ROOT, 'routes/C2M21.main.route.json'), 'utf8')), secret = JSON.parse(fs.readFileSync(path.join(ROOT, 'routes/C2M21.secret.route.json'), 'utf8'));
  assert.ok(!main.some((o) => o && o.op === 'ride') && !secret.some((o) => o && o.op === 'ride'), 'neither uses the car: it is optional');
});
