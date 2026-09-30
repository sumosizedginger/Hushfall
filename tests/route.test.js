import test from 'node:test';
import assert from 'node:assert/strict';
import { runRoute } from '../src/engine/harness.js';
import { createWorld, step } from '../src/engine/world.js';
import { loadMap, route } from './helpers.js';

test('canonical main route: spawn -> key -> locked door -> exit, through the real input layer', () => {
  const r = runRoute(loadMap(), route('C1E1M01.main'), { seed: 1 });
  assert.equal(r.result, 'complete', r.failure);
  assert.equal(r.world.stats.kills, 9);
  assert.deepEqual(r.world.player.keys, ['brass']);
  assert.ok(r.world.player.weapons.includes('scattergun'), 'the route picks up the scattergun');
  assert.ok(r.events.some((e) => e.type === 'weapon_pickup') && r.events.some((e) => e.type === 'fire' && e.weapon === 'flare'), 'the scattergun was picked up and the flare cannon was fired (the bot chooses by range; the scattergun own behaviour is tested in weapons.test.js)');
  assert.ok(r.world.enemies.some((e) => e.kind === 'gaunt') && r.world.enemies.every((e) => e.state === 'dead'), 'the Gaunts were among the kills');
  assert.ok(r.events.some((e) => e.type === 'door_open') && r.events.some((e) => e.type === 'level_complete'));
  assert.ok(r.world.endStats.time > 20 && r.world.endStats.time < 300);
});

test('canonical secret route reaches the secret and still exits', () => {
  const r = runRoute(loadMap(), route('C1E1M01.secret'), { seed: 1 });
  assert.equal(r.result, 'complete', r.failure);
  assert.equal(r.world.stats.secrets, 1);
  assert.ok(r.events.some((e) => e.type === 'secret'));
  assert.ok(r.world.player.armor > 0 || r.world.stats.items > 4, 'secret reward was collected');
});

test('routes are reproducible: identical seed => identical final state hash', () => {
  const a = runRoute(loadMap(), route('C1E1M01.main'), { seed: 9 }), b = runRoute(loadMap(), route('C1E1M01.main'), { seed: 9 });
  assert.equal(a.hash, b.hash); assert.equal(a.ticks, b.ticks);
});

test('routes complete on every difficulty', () => {
  for (const difficulty of ['easy', 'normal', 'hard']) {
    const r = runRoute(loadMap(), route('C1E1M01.main'), { seed: 1, difficulty });
    assert.equal(r.result, 'complete', `${difficulty}: ${r.failure}`);
  }
});

test('the bot cannot skip the lock: a route that never takes the key fails instead of exiting', () => {
  const noKey = route('C1E1M01.main').filter((op) => !(op.op === 'goto' && op.at[0] === 9 && op.at[1] === 13));
  const r = runRoute(loadMap(), noKey, { seed: 1, maxTicks: 60 * 200 });
  assert.notEqual(r.result, 'complete');
});

test('player dying mid-route ends the run as dead, not as a hang', () => {
  const map = loadMap(); const w = createWorld(map, { seed: 1 });
  w.player.hp = 1;
  const e = w.enemies[0]; e.x = w.player.x + 1.2; e.z = w.player.z; e.state = 'chase'; e.attackT = 0.96 - 1 / 120;      // an enemy that strikes on the very next tick
  const r = runRoute(map, route('C1E1M01.main'), { world: w, maxTicks: 60 * 120 });
  assert.equal(r.result, 'dead');
});

test('an enemy-proof world is still exitable only via the key door (no alternate path)', () => {
  const map = loadMap(); const w = createWorld(map, { seed: 1 });
  for (const e of w.enemies) e.state = 'dead';
  const ex = map.exits[0]; w.player.x = 20; w.player.z = 7; w.player.yaw = -Math.PI / 2;
  for (let i = 0; i < 60 * 20; i++) step(w, { move: [0, 1], yaw: 0, pitch: 0, fire: false, use: i % 30 === 0, weapon: null });
  assert.notEqual(w.status, 'complete');
  assert.ok(Math.hypot(w.player.x - ex.x, w.player.z - ex.z) > 10);
});
