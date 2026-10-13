// PT-045 (drop B, E12): THE TIDE (src/engine/tide.js, fxAt in terrain.js). The water level of the whole map as a pure function of the sim clock; a walkable cell whose floor is under it is wet (the wading effect). It never drowns anyone.
import test from 'node:test';
import assert from 'node:assert/strict';
import { validateMap, parseMap } from '../src/engine/mapformat.js';
import { createWorld, step, drainEvents } from '../src/engine/world.js';
import { fxAt, tideWet } from '../src/engine/terrain.js';
import { tideLevel, tideState } from '../src/engine/tide.js';
import { FX, PLAYER } from '../src/engine/defs.js';
import { shippedMap } from './helpers.js';

const idle = (o = {}) => ({ move: [0, 0], yaw: 0, pitch: 0, fire: false, aim: false, sprint: false, use: false, weapon: null, weaponStep: 0, map: false, ...o });
const bad = (s, re) => { const v = validateMap(s); assert.equal(v.ok, false, 'expected invalid'); assert.ok(v.errors.some((e) => re.test(e)), re + ' in ' + JSON.stringify(v.errors)); };
/** a dock: x 1..8 is the low quay (floor 0), x 9..16 a terrace at 1.5 m (unit '3'), x 17..24 a terrace at 3 m ('6'); a wall in the middle of the low quay's north row to test a non-floor, and the given tide */
const dock = (tide = { levels: [[0, 0], [10, 0], [20, 1.0], [40, 1.0], [50, 2.2], [70, 2.2], [80, 0]], loop: 100 }, over = {}) => {
  const W = 26, grid = [], heights = [];
  for (let z = 0; z < 7; z++) { let g = '', h = ''; for (let x = 0; x < W; x++) { const edge = x === 0 || z === 0 || x === W - 1 || z === 6; g += edge ? '#' : ':'; h += x >= 17 ? '6' : x >= 9 ? '3' : '.'; } grid.push(g); heights.push(h); }
  return { format: 1, id: 'T1', version: 1, name: 'Dock', cellSize: 2, grid, heights, doors: [], secrets: [], tide, entities: [{ type: 'player', at: [3, 3], facing: 'east' }, { type: 'exit', at: [24, 3] }], ...over };
};
const world = (src) => createWorld(parseMap(src), { seed: 1, difficulty: 'normal' });
const near = (a, b, e = 1e-9) => Math.abs(a - b) < e;

test('the level is a polyline in time: linear between points, held before the first and after the last, wrapped by `loop`', () => {
  const m = parseMap(dock()), f = (t) => tideLevel(m, t);
  assert.equal(f(0), 0); assert.equal(f(10), 0); assert.ok(near(f(15), 0.5)); assert.equal(f(20), 1); assert.equal(f(30), 1); assert.ok(near(f(45), 1.6)); assert.equal(f(60), 2.2); assert.ok(near(f(75), 1.1)); assert.equal(f(80), 0); assert.equal(f(95), 0, 'after the last point it holds');
  assert.ok(near(f(115), 0.5), 'and the loop wraps: t = 115 is t = 15'); assert.ok(near(f(-85), 0.5), 'a negative time wraps the same way');
  const h = parseMap(dock({ levels: [[0, 0], [10, 3]] })); assert.equal(tideLevel(h, 99), 3, 'without a loop it holds the last level for good'); assert.equal(tideLevel(parseMap({ ...dock(), tide: undefined }), 5), -Infinity, 'no tide: nothing is ever under it');
  const s = tideState(m, 15); assert.ok(near(s.rate, 0.1) && near(s.next, 5) && near(s.level, 0.5)); assert.equal(tideState(m, 5).rate, 0); assert.ok(near(tideState(m, 85).next, 15), 'the last stretch counts down to the loop');
  assert.ok(tideState(m, 45).rate > 0 && tideState(m, 75).rate < 0, 'rising and falling');
});

test('the validator: a tide needs two to 32 points from t = 0, rising times, levels in range, a loop longer than the last point, and no wall of water', () => {
  assert.equal(validateMap(dock()).ok, true, JSON.stringify(validateMap(dock()).errors));
  bad(dock({ levels: [[0, 0]] }), /tide must be/); bad(dock({ levels: 'x' }), /tide must be/); bad(dock({ levels: [[0, 0], [5, 'x']] }), /tide must be/); bad(dock({ levels: [[1, 0], [10, 1]] }), /first point is at t = 0/); bad(dock({ levels: [[0, 0], [10, 1], [10, 2]] }), /times rise/);
  bad(dock({ levels: [[0, 0], [10, 99]] }), /between -2 and 40/); bad(dock({ levels: [[0, 0], [10, 1], [20, 0]], loop: 20 }), /loop must be longer/); bad(dock({ levels: [[0, 0], [10, 1]], loop: 30 }), /must end at the level it starts at/); bad(dock({ levels: [[0, 0], [1, 1]] }), /faster than 0.5 m a second/);
  bad(dock({ levels: Array.from({ length: 40 }, (_, i) => [i * 10, 0]) }), /tide must be/);
});

test('which cells are wet: those whose floor is under the level, never a wall, a door, the void, or a cell above it; the old fx are untouched', () => {
  const w = world(dock()); const S = 2, at = (cx) => fxAt(w, (cx + 0.5) * S, 3.5 * S); const wetAt = (t, cx) => { w.time = t; return at(cx); };
  assert.equal(wetAt(5, 4), null, 'dry before the tide'); assert.equal(wetAt(30, 4), 'w', 'a metre of water over the low quay'); assert.equal(wetAt(30, 12), null, 'the 1.5 m terrace is dry at 1 m'); assert.equal(wetAt(60, 12), 'w', 'and wet at 2.2 m'); assert.equal(wetAt(60, 20), null, 'the 3 m terrace stays dry');
  assert.equal(wetAt(80, 4), null, 'the water goes out again'); assert.equal(wetAt(30, 0), null, 'a wall is never flooded'); w.time = 30; assert.equal(tideWet(w, 0, 3), false); assert.equal(tideWet(w, 4, 3), true);
  const none = world(dock(undefined, { tide: undefined })); const q = shippedMap('C2M01'); assert.equal(q.tide, null);
  for (const [cx, cz] of [[10, 10], [20, 30], [40, 40]]) assert.equal(fxAt({ map: q, time: 7 }, (cx + 0.5) * q.cell, (cz + 0.5) * q.cell), q.fx(cx, cz) ?? null, 'a map with no tide reads the fx layer as ever'); assert.equal(fxAt(none, 5, 5), null);
});

test('in the world: the player is slowed in the water (FX w) and not before; the wade event fires when the water arrives, and nobody drowns', () => {
  const w = world(dock()); const S = 2; Object.assign(w.player, { x: 4.5 * S, z: 3.5 * S }); const ev = [];
  while (w.time < 30) { step(w, idle()); ev.push(...drainEvents(w)); }
  assert.ok(ev.some((e) => e.type === 'wade' && e.kind === 'w'), 'the wade event: the water has reached the player'); assert.equal(w.player.fx, 'w');
  const x0 = w.player.x; w.player.yaw = -Math.PI / 2; for (let i = 0; i < 30; i++) step(w, idle({ move: [0, 1] })); const wet = w.player.x - x0;
  const d = world(dock({ levels: [[0, 0], [10, 0]] })); Object.assign(d.player, { x: 4.5 * S, z: 3.5 * S }); d.player.yaw = -Math.PI / 2; for (let i = 0; i < 200; i++) step(d, idle()); const e0 = d.player.x; for (let i = 0; i < 30; i++) step(d, idle({ move: [0, 1] })); const dry = d.player.x - e0;
  assert.ok(wet < dry * (FX.w.speed + 0.15) && wet > 0, `wading is slower: ${wet.toFixed(2)} m against ${dry.toFixed(2)} m dry`); assert.equal(w.status, 'playing'); assert.ok(w.player.hp === PLAYER.maxHp || w.player.hp > 0);
});
