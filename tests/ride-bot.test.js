// PT-046: the route bot's `ride` op (E8b's bot half, owed since PT-045): wait at the dock, step onto the deck while the car dwells, stay on it, step off at the other stop. Played on the Hive Yards' two cars. Node only.
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadMapFile, runRoute } from '../src/engine/harness.js';
import { createWorld } from '../src/engine/world.js';
import { ROOT } from './helpers.js';
import path from 'node:path';

const map = () => loadMapFile(path.join(ROOT, 'maps-dev/HIVEYARDS.json'));
const start = (m, cx, cz, difficulty = 'easy') => { const w = createWorld(m, { seed: 1, difficulty }); Object.assign(w.player, { x: (cx + 0.5) * 2, z: (cz + 0.5) * 2, yaw: -Math.PI / 2, hp: 1e6 }); return w; };

test('the bot rides the shuttle east, and back west, and lands on the docks, never in the void', () => {
  const m = map(), w = start(m, 88, 12), route = [{ op: 'ride', id: 'shuttle', board: [92, 12], from: 0, to: 1, exit: [109, 12] }, { op: 'goto', at: [112, 12] }, { op: 'ride', id: 'shuttle', board: [108, 12], from: 1, to: 0, exit: [92, 12] }, { op: 'goto', at: [88, 12] }];
  const r = runRoute(m, route, { world: w, seed: 1, difficulty: 'easy', maxTicks: 60 * 200 }); assert.equal(r.failure, null, r.failure); assert.equal(r.result, 'route-ended');
  assert.ok(Math.abs(w.player.x / 2 - 88.5) < 2 && Math.abs(w.player.z / 2 - 12.5) < 2, 'back where it began: ' + [w.player.x / 2, w.player.z / 2]);
  assert.ok(!r.events.some((e) => e.type === 'void_fall'), 'a ride is not a fall (the two Choristers on the far dock shoot at riders: that damage is theirs)');
});

test('the bot rides the car that climbs three metres and steps off on the raised dock', () => {
  const m = map(), w = start(m, 88, 28), route = [{ op: 'ride', id: 'climber', board: [92, 28], from: 0, to: 1, exit: [109, 28] }];
  const r = runRoute(m, route, { world: w, seed: 1, difficulty: 'easy', maxTicks: 60 * 120 }); assert.equal(r.failure, null, r.failure);
  assert.ok(w.player.y >= 2.9, 'on the raised dock: ' + w.player.y); assert.ok(w.player.x / 2 > 108, 'on the east side');
});

test('a ride on a car that does not exist fails by name', () => {
  const m = map(), w = start(m, 88, 12), r = runRoute(m, [{ op: 'ride', id: 'nope', board: [92, 12], from: 0, to: 1, exit: [109, 12] }], { world: w, seed: 1, maxTicks: 600 });
  assert.match(r.failure ?? '', /no car nope/);
});
