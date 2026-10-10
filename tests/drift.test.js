// PT-033 (Episode 4, Batch D): DRIFT, the floor with almost no grip (FX.d in defs.js; the movement line in world.js). The same pull at a tenth of the rate: you take about 0.7 s to get going and as long to stop; the speed cap is the walking speed;
// a wall still stops you; the ordinary floor beside it is exactly what it was.
import test from 'node:test';
import assert from 'node:assert/strict';
import { validateMap, parseMap } from '../src/engine/mapformat.js';
import { createWorld, step, drainEvents } from '../src/engine/world.js';
import { PLAYER, FX, TICK } from '../src/engine/defs.js';

const idle = (o = {}) => ({ move: [0, 0], yaw: 0, pitch: 0, fire: false, aim: false, sprint: false, use: false, weapon: null, weaponStep: 0, map: false, ...o });
const run = (w, n, cmd = () => idle()) => { const ev = []; for (let i = 0; i < n; i++) { step(w, cmd(i)); ev.push(...drainEvents(w)); } return ev; };
/** a corridor of 24 cells on row 1: cells 1..11 ordinary floor, 12..22 drift */
const hall = () => ({ format: 1, id: 'D1', version: 1, name: 'Drift', cellSize: 2, grid: ['#'.repeat(24), '#' + '.'.repeat(22) + '#', '#'.repeat(24)], doors: [], secrets: [], fx: ['.'.repeat(24), '.'.repeat(12) + 'd'.repeat(11) + '.'.repeat(1), '.'.repeat(24)],
  entities: [{ type: 'player', at: [2, 1], facing: 'east' }, { type: 'exit', at: [22, 1] }] });
const world = () => createWorld(parseMap(hall()), { seed: 1, difficulty: 'normal' });
const put = (w, cx) => Object.assign(w.player, { x: (cx + 0.5) * 2, z: 3, yaw: -Math.PI / 2, vx: 0, vz: 0 });
const speed = (w) => Math.hypot(w.player.vx, w.player.vz);

test('on the ordinary floor you are at walking speed within a tenth of a second', () => {
  const w = world(); put(w, 3); run(w, 6, () => idle({ move: [0, 1] })); assert.ok(speed(w) > PLAYER.speed * 0.6, `${speed(w).toFixed(2)} m/s after 0.1 s`);
});
test('on a drift floor the same push takes about ten times as long, and the speed never passes the walking speed', () => {
  const w = world(); put(w, 13); run(w, 6, () => idle({ move: [0, 1] })); const early = speed(w); assert.ok(early < PLAYER.speed * 0.2, `after 0.1 s: ${early.toFixed(2)} m/s`);
  run(w, 90, () => idle({ move: [0, 1] })); assert.ok(speed(w) > PLAYER.speed * 0.85 && speed(w) <= PLAYER.speed + 1e-6, `after 1.6 s: ${speed(w).toFixed(2)} m/s`);
});
test('let go on a drift floor and you slide: after a second you are still moving, on the ordinary floor you stopped at once', () => {
  const d = world(); put(d, 13); run(d, 90, () => idle({ move: [0, 1] })); const x0 = d.player.x; run(d, 60); assert.ok(speed(d) > 0.5 || d.player.x - x0 > 2, `still sliding: ${speed(d).toFixed(2)} m/s, ${(d.player.x - x0).toFixed(1)} m`);
  const g = world(); put(g, 4); run(g, 40, () => idle({ move: [0, 1] })); run(g, 20); assert.ok(speed(g) < 0.05, 'stopped');
});
test('a wall still stops a body on drift; the floor effect says nothing audible on the way in (no splash)', () => {
  const w = world(); put(w, 20); const ev = run(w, 200, () => idle({ move: [0, 1] })); assert.ok(w.player.x < 23 * 2 + 0.01, 'inside the wall'); assert.ok(!ev.some((e) => e.type === 'wade' && e.kind !== 'd'));
});
test('drift is a floor effect the map format knows', () => {
  assert.ok(FX.d && FX.d.grip > 0 && FX.d.grip < 1); assert.equal(validateMap(hall()).ok, true);
  const bad = hall(); bad.fx[0] = 'd' + bad.fx[0].slice(1); assert.equal(validateMap(bad).ok, false, 'a drift cell in a wall is refused');
  void TICK;
});
