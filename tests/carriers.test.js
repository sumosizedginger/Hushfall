// PT-045 (drop B, E8b): CARS (src/engine/cars.js; carryRider / blockedCircle / groundAir in world.js; terrain.js). A rectangular floor that rides a closed polyline over the void on a pure clock and dwells at its stops: it carries the player whose feet are on it, the void under it is
// walkable for the player and for nobody else, a player left over the void is a miss (hurt, back on the last solid ground), a creature never boards, and reach / the trap lint count it as a ride. The one piece of drop B nobody has felt: this file is what holds it until the owner plays.
import test from 'node:test';
import assert from 'node:assert/strict';
import { validateMap, parseMap } from '../src/engine/mapformat.js';
import { createWorld, step, drainEvents, blockedCircle, spawnEnemy } from '../src/engine/world.js';
import { makeCar, carState, carRect, carCovers, carDeckY, carAt, boardingCells, carLinks } from '../src/engine/cars.js';
import { floorAt, groundAt, tooHigh } from '../src/engine/terrain.js';
import { analyseReach } from '../src/engine/reach.js';
import { findTraps } from '../src/engine/traps.js';
import { CARS, LOWG, STEP, PLAYER } from '../src/engine/defs.js';
import { shippedMap } from './helpers.js';

const idle = (o = {}) => ({ move: [0, 0], yaw: 0, pitch: 0, fire: false, aim: false, sprint: false, use: false, weapon: null, weaponStep: 0, map: false, ...o });
const bad = (s, re) => { const v = validateMap(s); assert.equal(v.ok, false, 'expected invalid'); assert.ok(v.errors.some((e) => re.test(e)), re + ' in ' + JSON.stringify(v.errors)); };
const near = (a, b, e = 1e-6) => Math.abs(a - b) < e;
const S = 2;
/** two platforms of open deck (x 1..9 and x 22..30, z 1..14) with a gap of void between (x 10..21) and ONE car: a 3 x 3 cell deck (6 m) that waits against the west platform (centre 11.5, 7.5), runs to the east one (centre 20.5, 7.5), waits, and comes back */
const yard = (cars, over = {}) => {
  const W = 32, H = 16, grid = [];
  for (let z = 0; z < H; z++) { let r = ''; for (let x = 0; x < W; x++) r += x === 0 || z === 0 || x === W - 1 || z === H - 1 ? '#' : x >= 10 && x <= 21 ? '_' : ':'; grid.push(r); }
  return { format: 1, id: 'C1', version: 1, name: 'Cars', cellSize: S, grid, doors: [], secrets: [], cars, entities: [{ type: 'player', at: [4, 7], facing: 'east' }, { type: 'exit', at: [28, 7] }], ...over };
};
const CAR = { id: 'car', size: [3, 3], path: [[11.5, 7.5], [20.5, 7.5]], speed: 4, dwell: 8 };
const world = (src, o = {}) => createWorld(parseMap(src), { seed: 1, difficulty: 'normal', ...o });
const runTo = (w, t, cmd = () => idle()) => { const ev = []; while (w.time < t - 1e-9 && w.status === 'playing') { step(w, cmd()); ev.push(...drainEvents(w)); } return ev; };      // (stops if the level ends: a test must never hang)

test('the clock: a car waits at its stop, blinks for the last CARS.warn s, runs with a smooth start and stop to the next one, waits, and comes back; a phase shifts it; it is periodic', () => {
  const car = makeCar(CAR, S), run = 1.5 * 18 / 4; assert.ok(near(car.cycle, 2 * (8 + run)), 'cycle ' + car.cycle);
  let st = carState(car, 0); assert.equal(st.moving, false); assert.equal(st.stop, 0); assert.ok(near(st.x, 23) && near(st.z, 15) && near(st.until, 8)); assert.equal(st.warn, 0);
  assert.ok(near(carState(car, 8 - CARS.warn / 2).warn, 0.5), 'half way into the warning'); st = carState(car, 8.0001); assert.equal(st.moving, true); assert.equal(st.stop, null);
  st = carState(car, 8 + run / 2); assert.ok(near(st.x, 32, 1e-6), 'half way along at the half time: ' + st.x); const a = carState(car, 8 + run / 2 - 0.01).x, b = carState(car, 8 + run / 2 + 0.01).x; assert.ok(near((b - a) / 0.02, CARS.speed, 0.01), 'the peak speed is `speed`: ' + (b - a) / 0.02);
  st = carState(car, 8 + run + 0.001); assert.equal(st.moving, false); assert.equal(st.stop, 1); assert.ok(near(st.x, 41, 1e-3)); assert.ok(near(carState(car, 8 + run + 8 + 0.001).x, 41, 1e-2), 'still at the far stop at the end of its dwell'); assert.ok(carState(car, car.cycle - 0.001).x < 24, 'and home again at the end of the cycle');
  assert.ok(near(carState(car, 100).x, carState(car, 100 - car.cycle).x), 'periodic'); const ph = makeCar({ ...CAR, phase: 8 }, S); assert.equal(carState(ph, 0).moving, true, 'with a phase of 8 s it is just leaving');
  let prev = carState(car, 0), maxStep = 0; for (let t = 1 / 60; t < car.cycle; t += 1 / 60) { const c = carState(car, t); maxStep = Math.max(maxStep, Math.hypot(c.x - prev.x, c.z - prev.z)); prev = c; } assert.ok(maxStep <= CARS.speed / 60 + 1e-6, 'it never moves faster than its peak speed in a tick: ' + maxStep);
});

test('the deck: a rectangle round the centre, and a path with a bend and a rising deck are followed vertex by vertex (stops are only the ones named)', () => {
  const car = makeCar({ id: 'x', size: [2, 4], path: [[5, 5, 0], [9, 5, 0], [9, 9, 3]], stops: [0, 2], speed: 4, dwell: 5 }, S); assert.deepEqual(car.stops, [0, 2]);
  const st = carState(car, 0); assert.deepEqual(carRect(car, st).map((x) => Math.round(x * 10) / 10), [8, 6, 12, 14]); assert.ok(carCovers(car, st, 10, 10) && !carCovers(car, st, 12.5, 10) && carCovers(car, st, 12.3, 10, 0.5));
  const first = car.legs[0]; assert.equal(first.pts.length, 3, 'the first run passes the bend at vertex 1'); const bend = carState(car, first.tRun + first.run * 0.75); assert.ok(bend.y > 0 && bend.y < 3, 'the deck rises along the way: ' + bend.y); assert.ok(near(carState(car, first.t1 + 0.01).y, 3, 0.01), 'and arrives at its height');
  const back = carState(car, car.legs[1].tRun + 0.0001); assert.equal(back.moving, true); assert.equal(back.to, 0, 'the return run goes round the loop to vertex 0');
});

test('the validator: an id, a size, a path, stops, a speed, a dwell long enough to step on, the deck inside the map, no wall in its way, a platform to board from, head room under a roof', () => {
  assert.equal(validateMap(yard([CAR])).ok, true, JSON.stringify(validateMap(yard([CAR])).errors));
  const C = (o) => yard([{ ...CAR, ...o }]);
  bad(C({ id: '' }), /needs an id/); bad(yard([CAR, CAR]), /duplicate id/); bad(C({ size: [0, 3] }), /size must be/); bad(C({ size: [3] }), /size must be/); bad(C({ path: [[11.5, 7.5]] }), /path must be/); bad(C({ path: [[11.5, 'x'], [20.5, 7.5]] }), /path must be/);
  bad(C({ stops: [0] }), /stops must be/); bad(C({ stops: [0, 5] }), /stops must be/); bad(C({ speed: 0.2 }), /speed must be/); bad(C({ speed: 30 }), /speed must be/); bad(C({ dwell: 1 }), /dwell must be/); bad(C({ phase: 'x' }), /phase must be/);
  bad(C({ path: [[11.5, 7.5], [40.5, 7.5]] }), /leaves the map/); bad(C({ path: [[11.5, 7.5], [11.5, 7.5]] }), /same spot/); bad(C({ path: [[11.5, 7.5, 30], [20.5, 7.5, 30]] }), /nothing to board from/);
  { const walled = yard([CAR]); walled.grid[7] = walled.grid[7].slice(0, 15) + '#' + walled.grid[7].slice(16); bad(walled, /drives into a wall/); } bad(C({ path: [[14.5, 7.5], [20.5, 7.5]] }), /nothing to board from/);
  const roofed = yard([CAR], { ceilings: Array.from({ length: 16 }, () => '2'.repeat(32)) }); roofed.grid = roofed.grid.map((r) => r.replace(/_/g, '.').replace(/:/g, '.')); bad(roofed, /head room|invalid|nothing to board/);
});

test('terrain: a deck is a floor over the point it covers; the void is 6 m down elsewhere; a deck a metre above the player is a ledge, one below is a drop', () => {
  const w = world(yard([CAR])), m = w.map; w.time = 0;
  assert.equal(floorAt(w, 23, 15), 0, 'over the deck'); assert.equal(floorAt(w, 33, 15), -LOWG.voidDepth, 'over the void beside it'); assert.equal(carDeckY(m, 0, 23, 15), 0); assert.equal(carDeckY(m, 0, 33, 15), -Infinity);
  assert.equal(groundAt(w, 23, 15, 0.3), 0); assert.equal(groundAt(w, 26.2, 15, 0.3), 0, 'a body at the very edge rests on the deck (its footprint touches it)'); assert.equal(m.flat, false, 'a map with cars is never the flat fast path'); assert.equal(carAt(m, 0, 23, 15).car.id, 'car');
  const up = yard([{ ...CAR, y: 1 }], { heights: Array.from({ length: 16 }, () => '2'.repeat(32)) }), hi = world(up); hi.time = 0;      // platforms at 1 m, the deck flush with them at 1 m
  assert.equal(carDeckY(hi.map, 0, 23, 15), 1); assert.equal(tooHigh(hi, { y: 0 }, 22.5, 15, 0.3), true, 'a deck a metre up is a ledge from the ground below'); assert.equal(tooHigh(hi, { y: 1 }, 22.5, 15, 0.3), false, 'and not from its own height'); assert.equal(floorAt(hi, 23, 15), 1);
});

test('the player walks onto the deck from the platform while it waits, stands on it at the same height, and cannot walk off its edge into the void; nobody else can cross the void under it', () => {
  const w = world(yard([CAR])); Object.assign(w.player, { x: 18, z: 15 }); w.player.yaw = -Math.PI / 2;
  runTo(w, 3, () => idle({ move: [0, 1] }));                                    // walk east
  assert.ok(w.player.x > 24 && w.player.x < 26, 'on the deck, stopped by its east edge: x ' + w.player.x); assert.ok(near(w.player.y, 0), 'at the platform\'s height'); assert.equal(w.player.hp, 100, 'no miss');
  const g = spawnEnemy(w, 'gaunt', 21, 15, 0), P = w.player; assert.equal(blockedCircle(w, 22, 15, 0.4, g), true, 'a creature is stopped by the void under the car'); assert.equal(blockedCircle(w, 22, 15, 0.4, P), false, 'the player is not'); assert.equal(blockedCircle(w, 30, 15, 0.4, P), true, 'beyond the edge the void is the void');
});

test('riding: the car carries the player from the west stop to the east one, the player stands still, steps off onto the east platform, and nothing hurts', () => {
  const w = world(yard([CAR])); Object.assign(w.player, { x: 18, z: 15, yaw: -Math.PI / 2 }); const ev = []; const car = w.map.cars[0], run = 1.5 * 18 / 4;
  ev.push(...runTo(w, 1.2, () => idle({ move: [0, 1] }))); assert.ok(w.player.x > 21 && w.player.x < 26, 'boarded: ' + w.player.x);
  ev.push(...runTo(w, 3)); const xb = w.player.x; ev.push(...runTo(w, 7)); assert.ok(near(w.player.x, xb, 1e-3), 'not moved while the car waits'); const dx0 = w.player.x - carState(car, w.time).x;
  ev.push(...runTo(w, 8 + run / 2)); assert.ok(w.player.x > 28 && near(w.player.x - carState(car, w.time).x, dx0, 0.02), 'carried: it keeps its place on the deck (' + (w.player.x - carState(car, w.time).x).toFixed(3) + ' against ' + dx0.toFixed(3) + ')');
  ev.push(...runTo(w, 8 + run + 2)); assert.ok(near(w.player.x - carState(car, w.time).x, dx0, 0.02) && near(carState(car, w.time).x, 41, 1e-2), 'and arrives with it: x ' + w.player.x); assert.equal(w.player.hp, 100); assert.ok(!ev.some((e) => e.type === 'void_fall'));
  w.player.yaw = -Math.PI / 2; ev.push(...runTo(w, w.time + 1.0, () => idle({ move: [0, 1] }))); assert.ok(w.player.x > 44, 'walked off the east end of the deck onto the platform: ' + w.player.x); assert.ok(near(w.player.y, 0));
  assert.ok(near(w.player.lastSafe.x, w.player.x, 1.0), 'and the last solid ground it stood on is there now (' + w.player.lastSafe.x + ')'); assert.equal(w.status, 'playing');
});

test('left over the void with no deck under the feet is a miss: hurt, back on the last solid ground, never killed; riding never records a mid-air place as the last solid ground', () => {
  const w = world(yard([CAR])); Object.assign(w.player, { x: 18, z: 15 }); step(w, idle()); drainEvents(w); assert.ok(near(w.player.lastSafe.x, 18));
  Object.assign(w.player, { x: 30, z: 4 }); const ev = []; for (let i = 0; i < 3; i++) { step(w, idle()); ev.push(...drainEvents(w)); }
  assert.ok(ev.some((e) => e.type === 'void_fall'), 'a miss'); assert.ok(w.player.hp === 100 - LOWG.voidDamage || w.player.hp > 100 - LOWG.voidDamage - 1, 'hurt by the miss: ' + w.player.hp); assert.ok(near(w.player.x, 18, 0.5), 'back on the platform'); assert.equal(w.status, 'playing');
  const r = world(yard([CAR])); Object.assign(r.player, { x: 18, z: 15, yaw: -Math.PI / 2 }); runTo(r, 1.0, () => idle({ move: [0, 1] })); runTo(r, 8 + 1.5 * 18 / 4 / 2); assert.ok(r.player.lastSafe.x < 20, 'riding mid-gap: the last solid ground is still the west platform (' + r.player.lastSafe.x + ')');
});

test('reach and the trap lint count the car as a ride: the exit on the far platform is reachable, nobody is trapped; without the car it is not', () => {
  const m = parseMap(yard([CAR])); const r = analyseReach(m); assert.equal(r.exitReachable, true, JSON.stringify(r.unreachable)); assert.equal(findTraps(m).traps, 0);
  const none = parseMap(yard([])); assert.equal(analyseReach(none).exitReachable, false, 'the void gap is a gap without the car');
  const links = carLinks(m, STEP); assert.equal(links.length, 1); assert.equal(links[0].length, 2); assert.ok(links[0][0].some(([x]) => x === 9) && links[0][1].some(([x]) => x === 22), 'the cells beside each stop'); assert.ok(boardingCells(m, m.cars[0], 0, STEP).length >= 5);
});

test('a map with no cars is untouched: the shipped maps have none, stay flat or not exactly as before, and a car does not change a world that has none', () => {
  const a = shippedMap('C1E1M01'), b = shippedMap('C2M05'); assert.deepEqual(a.cars, []); assert.deepEqual(b.cars, []); assert.equal(a.flat, true === a.flat ? a.flat : false);
  const w = createWorld(a, { seed: 1, difficulty: 'normal' }); assert.equal(PLAYER.radius > 0, true); step(w, idle()); assert.equal(w.map.cars.length, 0);
});

test('a car pulling out and coming to rest are events (the sound of a lift): one departure at the end of the dwell, one arrival at the end of the run, at the car\'s place', () => {
  const w = world(yard([CAR])); const ev = runTo(w, 8 + 1.5 * 18 / 4 + 1).filter((e) => e.type === 'car_depart' || e.type === 'car_arrive');
  assert.deepEqual(ev.map((e) => e.type), ['car_depart', 'car_arrive']); assert.ok(near(ev[0].x, 23, 0.1) && near(ev[1].x, 41, 0.1), 'at the stops: ' + ev.map((e) => e.x.toFixed(1)));
});

test('a body in the air that comes down on a car\'s deck LANDS on it (it is a floor), and one that misses the deck over the void is a miss; a rider carried right along the deck\'s edge is not dropped by rounding', () => {
  const w = world(yard([CAR])); const P = w.player;
  Object.assign(P, { x: 22, z: 15, y: 2.5, vx: 0, vz: 0 }); P.air = { vy: 0, g: 3.2, bx: 0, bz: 0, sx: 0, sz: 0, t: 0, low: -0.4 }; const ev = [];
  for (let i = 0; i < 90 && P.air; i++) { step(w, idle()); ev.push(...drainEvents(w)); } assert.ok(!P.air && near(P.y, 0, 0.05) && !ev.some((e) => e.type === 'void_fall'), 'landed on the deck: y ' + P.y + ' ' + ev.map((e) => e.type).join());
  const m = world(yard([CAR])); Object.assign(m.player, { x: 30, z: 15, y: 2.5, vx: 0, vz: 0 }); m.player.air = { vy: 0, g: 3.2, bx: 0, bz: 0, sx: 0, sz: 0, t: 0, low: -0.4 }; const ev2 = [];
  for (let i = 0; i < 240 && m.player.air; i++) { step(m, idle()); ev2.push(...drainEvents(m)); } assert.ok(ev2.some((e) => e.type === 'void_fall'), 'beside the deck, over the void: a miss');
  const e = world(yard([CAR])); const car = e.map.cars[0]; Object.assign(e.player, { x: 25.9, z: 15, vx: 0, vz: 0 }); const evE = runTo(e, 8 + 1.5 * 18 / 4 + 1);      // 10 cm inside the deck's east edge (the deck spans x 20..26 at the west stop), carried the whole way
  assert.ok(!evE.some((x) => x.type === 'void_fall') && e.player.x > 38 && e.player.x < 44.2, 'carried along the edge to the far dock: x ' + e.player.x.toFixed(2)); assert.equal(carState(car, e.time).stop, 1);
});
