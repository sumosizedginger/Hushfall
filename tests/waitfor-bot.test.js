// PT-046 (C2M28, Last Tide): the route bot's `waitfor` op (stand and fight until a trigger condition holds, `max` seconds at most), the per-op `max` on any op, and the `hunt` flag of a spawn action (a wave creature always knows where you stand). Node only.
import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { loadMapFile, runRoute } from '../src/engine/harness.js';
import { createWorld } from '../src/engine/world.js';
import { ROOT } from './helpers.js';

const map = () => loadMapFile(path.join(ROOT, 'maps/C2M28.json'));

test('waitfor ends when the condition holds (a clock, a list is an AND) and fails when it never does, at `max` seconds', () => {
  const m = map();
  let r = runRoute(m, [{ op: 'waitfor', when: 'time:3' }], { seed: 1, difficulty: 'easy', maxTicks: 60 * 30 }); assert.equal(r.result, 'route-ended'); assert.ok(r.ticks >= 180 && r.ticks < 200, 'ticks ' + r.ticks);
  r = runRoute(m, [{ op: 'waitfor', when: ['time:2', 'time:4'] }], { seed: 1, difficulty: 'easy', maxTicks: 60 * 30 }); assert.equal(r.result, 'route-ended'); assert.ok(r.ticks >= 240 && r.ticks < 260, 'both must hold: ' + r.ticks);
  r = runRoute(m, [{ op: 'waitfor', when: 'dead:never', max: 2 }], { seed: 1, difficulty: 'easy', maxTicks: 60 * 30 }); assert.equal(r.result, 'bot-failed'); assert.match(r.failure, /timed out/); assert.ok(r.ticks >= 120 && r.ticks < 140, 'the max is the op\'s own limit: ' + r.ticks);
});

test('a spawn action with `hunt` makes a creature that never goes back to sleep (what a wave of the dock is)', () => {
  const m = map(), w0 = createWorld(m, { seed: 1, difficulty: 'easy' }); w0.player.hp = 1e9;
  const r = runRoute(m, [{ op: 'waitfor', when: 'time:100' }], { world: w0, seed: 1, difficulty: 'easy', maxTicks: 60 * 110, fights: false }), w = r.world; assert.ok(w.enemies.length > 20, 'the first waves are in: ' + w.enemies.length); assert.ok(w.enemies.every((e) => e.hunt === true), 'every wave creature hunts'); assert.equal(w.enemies.filter((e) => e.state === 'idle').length, 0, 'nobody went back to sleep');
});
