// The level that ships (maps/C1E1M01.json = Marrow Quay), its canonical routes, and the design contracts that make it a designed level.
import test from 'node:test';
import assert from 'node:assert/strict';
import { validateMap } from '../src/engine/mapformat.js';
import { analyseReach } from '../src/engine/reach.js';
import { runRoute } from '../src/engine/harness.js';
import { PICKUPS, PLAYER, WEAPONS, DIFFICULTY } from '../src/engine/defs.js';
import { shippedSrc, shippedMap, shippedRoute } from './helpers.js';

const map = shippedMap();
const cellDist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
const at = (kind) => map.entities.filter((e) => e.kind === kind);

test('Marrow Quay is valid, and structurally what the design says it is', () => {
  assert.deepEqual(validateMap(shippedSrc()), { ok: true, errors: [] });
  assert.equal(map.name, 'Marrow Quay'); assert.equal(map.id, 'C1E1M01');
  assert.deepEqual(map.counts().secrets, 1);
  assert.ok(map.scenery.some((s) => s.kind === 'tower'), 'the bell tower is visible landmark scenery');
  assert.ok(map.scenery.filter((s) => s.kind === 'boat').length >= 2);
  const kinds = new Set(map.tiles.flat()); for (const t of ['~', 'p', ':', 'B', '.', 'D', 'S']) assert.ok(kinds.has(t), 'uses tile ' + t);
});

test('reachability: exit, key, every pickup and enemy, and the secret are all reachable', () => {
  const r = analyseReach(map);
  assert.equal(r.exitReachable, true); assert.deepEqual(r.keysObtainable, ['brass']); assert.deepEqual(r.unreachable, []);
  assert.deepEqual(r.secretsReachable, [{ id: 'net-loft', reachable: true }]);
});

test('the exit really is gated: without the brass key the dock is unreachable', () => {
  const src = shippedSrc(); src.entities = src.entities.filter((e) => e.kind !== 'key_brass');
  assert.equal(validateMap(src).ok, false, 'a keyed door with no key is rejected outright');
  const moved = shippedSrc(); moved.entities.find((e) => e.kind === 'key_brass').at = [39, 30];         // key on the dock, behind its own door
  assert.equal(analyseReach(new (shippedMap().constructor)(moved)).exitReachable, false);
});

test('design contract: the start is a safe pier (no enemy near, first Tollbearer far down the pier)', () => {
  const spawn = [map.spawn.x / 2 - 0.5, map.spawn.z / 2 - 0.5];
  const enemies = map.entities.filter((e) => e.type === 'enemy'); const nearest = Math.min(...enemies.map((e) => cellDist(e.at, spawn)));
  assert.ok(nearest >= 10, `nearest enemy is ${nearest.toFixed(1)} cells from the spawn`);
  assert.ok(enemies.find((e) => cellDist(e.at, spawn) === nearest).kind === 'tollbearer', 'the first thing you meet is the slow, readable enemy');
});

test('design contract: the scattergun is at hand when the Gaunts wake in the customs shed', () => {
  const door = [22, 8], gun = at('weapon_scattergun')[0].at, gaunts = map.entities.filter((e) => e.kind === 'gaunt' && e.at[1] < 8);
  assert.equal(gaunts.length, 2, 'two Gaunts wait in the shed');
  assert.ok(cellDist(door, gun) <= 3, 'the scattergun is within 3 cells of the door: ' + cellDist(door, gun).toFixed(1));
  for (const g of gaunts) assert.ok(cellDist(gun, g.at) >= 3, 'each Gaunt starts some distance from the gun');
});

test('design contract: both enemy kinds and both weapons matter (no unused content)', () => {
  const kinds = new Set(map.entities.filter((e) => e.type === 'enemy').map((e) => e.kind));
  assert.deepEqual([...kinds].sort(), ['gaunt', 'tollbearer']);
  assert.ok(at('ammo_flare').length >= 4 && at('ammo_shell').length >= 5);
});

test('design contract: ammo is neither starving nor flooding at normal difficulty', () => {
  const d = DIFFICULTY.normal, flare = PLAYER.startAmmo.flare + at('ammo_flare').length * Math.round(PICKUPS.ammo_flare.amount * d.ammoPickup);
  const shells = (at('ammo_shell').length * PICKUPS.ammo_shell.amount + PICKUPS.weapon_scattergun.amount) * d.ammoPickup;
  const enemies = map.counts().enemies, capacity = flare + shells;
  assert.ok(capacity >= enemies * 2, `capacity ${capacity} shots for ${enemies} enemies (needs slack for misses)`);
  assert.ok(capacity <= enemies * 8, `capacity ${capacity} would make ammo irrelevant`);
  assert.ok(WEAPONS.flare.cooldown > 0);
});

test('design contract: the secret pays out (armor, shells, health) and is worth finding', () => {
  const inLoft = map.entities.filter((e) => e.type === 'pickup' && e.at[0] <= 3 && e.at[1] >= 21 && e.at[1] <= 23).map((e) => e.kind).sort();
  assert.deepEqual(inLoft, ['ammo_shell', 'armor_vest', 'health_large']);
});

test('canonical routes: main and secret complete on every difficulty with every enemy dead', () => {
  for (const name of ['C1E1M01.main', 'C1E1M01.secret']) for (const difficulty of ['easy', 'normal', 'hard']) {
    const r = runRoute(map, shippedRoute(name), { seed: 1, difficulty });
    assert.equal(r.result, 'complete', `${name} ${difficulty}: ${r.failure}`);
    assert.equal(r.world.stats.kills, 13, `${name} ${difficulty}`);
    assert.ok(r.world.player.keys.includes('brass'));
  }
});

test('canonical routes: only the secret route finds the secret, and both stay within par', () => {
  const main = runRoute(map, shippedRoute('C1E1M01.main'), { seed: 1 }), sec = runRoute(map, shippedRoute('C1E1M01.secret'), { seed: 1 });
  assert.equal(main.world.stats.secrets, 0); assert.equal(sec.world.stats.secrets, 1);
  assert.ok(sec.world.stats.items > main.world.stats.items, 'the secret adds items');
  for (const r of [main, sec]) { assert.ok(r.world.endStats.time > 30, 'not trivially short'); assert.ok(r.world.endStats.time < map.par.time, 'within par: ' + r.world.endStats.time.toFixed(0)); }
});

test('the route exercises the level: doors, scattergun, flare, lunges are possible, pickups, exit', () => {
  const r = runRoute(map, shippedRoute('C1E1M01.secret'), { seed: 1 }), types = new Set(r.events.map((e) => e.type));
  for (const t of ['door_open', 'weapon_pickup', 'pickup', 'secret', 'enemy_died', 'level_complete', 'explode', 'impact']) assert.ok(types.has(t), 'route should exercise ' + t);
  assert.ok(r.events.some((e) => e.type === 'fire' && e.weapon === 'flare') && r.events.some((e) => e.type === 'fire' && e.weapon === 'scattergun'));
  assert.ok(r.events.filter((e) => e.type === 'door_open').length >= 4, 'hut, shed, warehouse, net-loft/dock');
});

test('routes are reproducible on the shipped level (same seed => same final state)', () => {
  const a = runRoute(map, shippedRoute('C1E1M01.main'), { seed: 5 }), b = runRoute(map, shippedRoute('C1E1M01.main'), { seed: 5 });
  assert.equal(a.hash, b.hash); assert.equal(a.ticks, b.ticks);
});
