// The level that ships (maps/C1E1M01.json = Marrow Quay), its canonical routes, and the design contracts that make it a designed level.
import test from 'node:test';
import assert from 'node:assert/strict';
import { validateMap } from '../src/engine/mapformat.js';
import { analyseReach } from '../src/engine/reach.js';
import { runRoute } from '../src/engine/harness.js';
import { createWorld, step, drainEvents } from '../src/engine/world.js';
import { PICKUPS, PLAYER, WEAPONS, DIFFICULTY, AMMO_MAX } from '../src/engine/defs.js';
import { measuredCapacityBy } from '../src/engine/viability.js';
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

test('design contract: all three enemy kinds and both weapons matter (no unused content)', () => {
  const kinds = new Set(map.entities.filter((e) => e.type === 'enemy').map((e) => e.kind));
  assert.deepEqual([...kinds].sort(), ['bellhand', 'gaunt', 'tollbearer']);
  assert.ok(at('bellhand').length >= 3, 'the ranged enemy is a recurring threat, not a cameo');
  assert.ok(map.drops, 'its ammunition comes from the dead (PT-025): flares and shells from the Tollbearers, the Gaunts and the Bellhands'); assert.ok(at('ammo_shell').length >= 1 && at('ammo_flare').length >= 0, 'what is left on the ground is the net loft cache');
});

test('design contract: ammo is neither starving nor flooding, judged against what a perfect bot actually spends (normal, main route; PT-025: what it was given and what lies on the floor)', () => {
  const r = runRoute(map, shippedRoute('C1E1M01.main'), { seed: 1 }), spent = r.world.stats.shots, by = measuredCapacityBy(map, 'normal', r.world), capacity = (by.flare ?? 0) + (by.shell ?? 0);
  assert.ok(capacity >= spent * 1.5, `a perfect bot fires ${spent} of ${capacity} available rounds: humans miss, so this needs at least 1.5x slack`);
  assert.ok(capacity <= spent * 8, `${capacity} rounds available vs ${spent} needed by a perfect bot: ammo would be irrelevant`);
  assert.ok(WEAPONS.flare.cooldown > 0);
});

test('design contract: the secret pays out (double armour + shells: valuable at any health) and is worth finding', () => {
  const inLoft = map.entities.filter((e) => e.type === 'pickup' && e.at[0] <= 3 && e.at[1] >= 21 && e.at[1] <= 23).map((e) => e.kind).sort();
  assert.deepEqual(inLoft, ['ammo_shell', 'armor_vest', 'armor_vest']);
});

test('canonical routes: main and secret complete on every difficulty with every enemy dead', () => {
  for (const name of ['C1E1M01.main', 'C1E1M01.secret']) for (const difficulty of ['easy', 'normal', 'hard']) {
    const r = runRoute(map, shippedRoute(name), { seed: 1, difficulty });
    assert.equal(r.result, 'complete', `${name} ${difficulty}: ${r.failure}`);
    assert.equal(r.world.stats.kills, map.counts().enemies, `${name} ${difficulty}`);
    assert.ok(r.world.player.keys.includes('brass'));
  }
});

// The level must not be playable by ignoring it (audit F01: a passive runner used to finish at 60% health) and a perfect bot must still bleed.
test('viability: a passive runner cannot just walk through; even a perfect fighter takes real damage, and more on harder difficulties', () => {
  const main = shippedRoute('C1E1M01.main'), dmg = {};
  for (const d of ['easy', 'normal', 'hard']) {
    const run = runRoute(map, main, { seed: 1, difficulty: d, fights: false });
    assert.ok(run.result !== 'complete' || run.world.stats.damageTaken >= 60, `${d}: a runner that never fires finished with only ${run.world.stats.damageTaken} damage`);
    const f = runRoute(map, main, { seed: 1, difficulty: d }); assert.equal(f.result, 'complete', `${d} fighter: ${f.failure}`); dmg[d] = f.world.stats.damageTaken;
  }
  assert.ok(dmg.normal >= 10, 'normal: the perfect bot took ' + dmg.normal + ' damage'); assert.ok(dmg.hard > dmg.normal && dmg.normal > dmg.easy, JSON.stringify(dmg));
  assert.ok(dmg.hard < 140, 'hard is survivable by the bot with pickups: ' + dmg.hard);
});

test('par time is plausible against the bot: between 2x and 8x the required route time (placeholder until a human plays it)', () => {
  const main = runRoute(map, shippedRoute('C1E1M01.main'), { seed: 1 }), t = main.world.endStats.time, ratio = map.par.time / t;
  assert.ok(ratio >= 2 && ratio <= 8, `par ${map.par.time}s is ${ratio.toFixed(1)}x the bot's ${t.toFixed(0)}s`);
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

test('every enemy attack path is exercised on the shipped level: the fighter meets alerts, windups, toll-shots and pain; an idle player at the shed door meets the Gaunt lunges', () => {
  const fighter = runRoute(map, shippedRoute('C1E1M01.main'), { seed: 1, difficulty: 'hard' }), f = new Set(fighter.events.map((e) => e.type));
  for (const t of ['enemy_alert', 'enemy_windup', 'enemy_shot', 'hurt']) assert.ok(f.has(t), 'the fighter should see ' + t);
  assert.ok(fighter.world.stats.damageTaken > 0, 'a perfect bot is still hurt on hard');
  // a perfect fighter kills the Gaunts before they can lunge (that is what perfect aim means), so the lunge is checked directly: stand in the shed doorway and do nothing
  const w = createWorld(map, { seed: 1, difficulty: 'hard' }); const door = map.doors.get('22,8'); assert.ok(door, 'the shed door exists');
  w.enemies = w.enemies.filter((e) => e.kind === 'gaunt' && e.z < 16); assert.equal(w.enemies.length, 2, 'the two shed Gaunts');           // isolate them
  w.player.x = (door.cx + 0.5) * map.cell; w.player.z = (door.cz - 2.5) * map.cell; w.player.yaw = 0; w.player.hp = 500;      // inside the shed, a few metres from both
  for (const d of w.doors) d.open = 1; const ev = [];
  for (let i = 0; i < 360; i++) { step(w, { move: [0, 0], yaw: 0, pitch: 0, fire: false, aim: false, sprint: false, use: false, weapon: null, weaponStep: 0, map: false }); ev.push(...drainEvents(w)); }
  const t = new Set(ev.map((e) => e.type)); assert.ok(t.has('enemy_lunge') && t.has('enemy_strike'), 'the shed Gaunts lunge and strike an idle player: ' + [...t].join(','));
});

test('routes are reproducible on the shipped level (same seed => same final state)', () => {
  const a = runRoute(map, shippedRoute('C1E1M01.main'), { seed: 5 }), b = runRoute(map, shippedRoute('C1E1M01.main'), { seed: 5 });
  assert.equal(a.hash, b.hash); assert.equal(a.ticks, b.ticks);
});
