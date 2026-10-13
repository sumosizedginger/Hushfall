// PT-045 (drop B): the views of the new mechanics BUILD AND UPDATE in node with no GPU (Three.js scene graph only). The owner's black screen of 2026-10-13 was a per-frame function nobody had run; no browser job may run without a fresh yes, so every new view
// is constructed here, updated across a stretch of the clock, and its numbers checked (finite, in the right place, the right colour for the state). What this CANNOT show is how any of it looks: that waits for the owner's play.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { parseMap } from '../src/engine/mapformat.js';
import { buildLevel } from '../src/render/levelmesh.js';
import { makeBeltView, updateBeltView } from '../src/render/beltfx.js';
import { makeTideView } from '../src/render/tidefx.js';
import { makeCarView } from '../src/render/carfx.js';
import { carState } from '../src/engine/cars.js';
import { TICK } from '../src/engine/defs.js';
import { BELT } from '../src/engine/defs.js';

const tex = new Proxy({}, { get: (o, k) => (o[k] ??= new THREE.Texture()) });
const W = 40, row = (f) => '#' + f.repeat(W - 2) + '#', fxRow = '.'.repeat(10) + '>'.repeat(20) + '.'.repeat(10);
const beltMap = () => parseMap({ format: 1, id: 'B1', version: 1, name: 'Belts', cellSize: 2, grid: ['#'.repeat(W), row(':'), row(':'), row(':'), '#'.repeat(W)], fx: ['.'.repeat(W), fxRow, fxRow, fxRow, '.'.repeat(W)], doors: [], secrets: [], belts: [{ rect: [10, 1, 29, 3], period: 20 }],
  entities: [{ type: 'player', at: [3, 2], facing: 'east' }, { type: 'exit', at: [38, 2] }] });
const fakeWorld = (map, t) => ({ map, time: t });
const finite = (arr) => arr.every((x) => Number.isFinite(x));

test('a belt view builds one strip and two chevrons per flowing cell, and updates across a whole period with finite matrices', () => {
  const map = beltMap(), bv = makeBeltView(map); assert.equal(bv.views.length, 1); const v = bv.views[0];
  assert.equal(v.cells.length, 60, 'twenty cells by three rows'); assert.equal(v.mesh.count, 120); assert.equal(v.strip.geometry.index.count, 60 * 6);
  for (let t = 0; t < 41; t += 1 / 60) bv.update(fakeWorld(map, t), 1 / 60, t);
  assert.ok(finite(Array.from(v.mesh.instanceMatrix.array)), 'every chevron matrix is finite'); assert.ok(v.p >= 0 && v.p < 1);
});

test('the chevrons slide the way the floor carries you, turn round when it does, and the belt turns amber while it stands still', () => {
  const map = beltMap(), bv = makeBeltView(map), v = bv.views[0], S = map.cell;
  const tipDir = () => { const e = v.mesh.instanceMatrix.array; const m = new THREE.Matrix4().fromArray(e, 0); const f = new THREE.Vector3(0, 0, -1).transformDirection(m); return [Math.round(f.x) || 0, Math.round(f.z) || 0]; };
  let t = 0; const to = (tt) => { while (t < tt) { t += 1 / 60; bv.update(fakeWorld(map, t), 1 / 60, t); } };
  to(2); assert.deepEqual(tipDir(), [1, 0], 'the first half points east, the way the floor is drawn'); const p1 = v.p; to(2.2); assert.notEqual(v.p, p1, 'and they move');
  const dp = ((v.p - p1) % 1 + 1) % 1; assert.ok(dp > 0 && dp < 0.5, 'forward: the pattern advances with the push');
  to(10 - BELT.stop / 2); assert.ok(v.mat.color.r > 0.9 && v.mat.color.b < 0.5, 'stopped: amber (' + v.mat.color.getHexString() + ')'); assert.equal(v.mat.opacity, 0.9);
  to(14); assert.deepEqual(tipDir(), [-1, 0], 'the second half points west: the floor is carrying you back'); assert.ok(v.mat.color.b > 0.8, 'running: pale teal again');
});

test('a level with a belt does not also draw the water-current overlay under it', () => {
  const map = beltMap(), plain = parseMap({ ...JSON.parse(JSON.stringify({ format: 1, id: 'B2', version: 1, name: 'Plain', cellSize: 2, grid: ['#'.repeat(W), row(':'), row(':'), row(':'), '#'.repeat(W)], fx: ['.'.repeat(W), fxRow, fxRow, fxRow, '.'.repeat(W)], doors: [], secrets: [], entities: [{ type: 'player', at: [3, 2], facing: 'east' }, { type: 'exit', at: [38, 2] }] })) });
  assert.ok(buildLevel(plain, tex).fxMats['>'], 'an ordinary current has its water skin'); assert.equal(buildLevel(map, tex).fxMats['>'], undefined, 'a belt has none: the belt view draws it');
});

test('the tide view is hidden while the water is below the map, then sits exactly at the level of the clock and follows it up and down', () => {
  const W2 = 26, grid = [], heights = [];
  for (let z = 0; z < 7; z++) { let g = '', h = ''; for (let x = 0; x < W2; x++) { const edge = x === 0 || z === 0 || x === W2 - 1 || z === 6; g += edge ? '#' : ':'; h += '.'; } grid.push(g); heights.push(h); }
  const map = parseMap({ format: 1, id: 'T2', version: 1, name: 'Tide', cellSize: 2, grid, heights, doors: [], secrets: [], tide: { levels: [[0, -2], [10, -2], [20, 1], [30, 1], [40, 2.2], [50, -2]], loop: 60 }, entities: [{ type: 'player', at: [3, 3], facing: 'east' }, { type: 'exit', at: [24, 3] }] });
  const tv = makeTideView(map, tex); assert.equal(tv.sea.visible, false); let t = 0; const to = (tt) => { while (t < tt) { t += 1 / 60; tv.update({ map, time: t }, 1 / 60, t); } };
  to(5); assert.equal(tv.sea.visible, false, 'the water is out'); to(15); assert.equal(tv.sea.visible, true); assert.ok(Math.abs(tv.sea.position.y - (-2 + 3 * 0.5)) < 0.02, 'half way up: ' + tv.sea.position.y); to(25); assert.ok(Math.abs(tv.sea.position.y - 1) < 1e-6, 'held at a metre');
  to(40); assert.ok(Math.abs(tv.sea.position.y - 2.2) < 0.02); to(42); assert.ok(tv.sea.position.y < 2.2 && tv.sea.position.y > 1, 'and then the tide goes out again: ' + tv.sea.position.y); assert.ok(tv.mat.opacity > 0.4 && tv.mat.opacity < 0.8);
});

const carMap = () => { const W3 = 32, H3 = 16, grid = []; for (let z = 0; z < H3; z++) { let r = ''; for (let x = 0; x < W3; x++) r += x === 0 || z === 0 || x === W3 - 1 || z === H3 - 1 ? '#' : x >= 10 && x <= 21 ? '_' : ':'; grid.push(r); }
  return parseMap({ format: 1, id: 'C1', version: 1, name: 'Cars', cellSize: 2, grid, doors: [], secrets: [], cars: [{ id: 'car', size: [3, 3], path: [[11.5, 7.5], [20.5, 7.5]], speed: 4, dwell: 8 }], entities: [{ type: 'player', at: [4, 7], facing: 'east' }, { type: 'exit', at: [28, 7] }] }); };

test('a car view builds a deck, a rim and four posts, puts the deck where the clock says at the instant the player is drawn, and colours the rim by what the car is about to do', () => {
  const map = carMap(), cv = makeCarView(map), v = cv.views[0]; assert.equal(cv.views.length, 1); let meshes = 0; v.group.traverse((o) => { if (o.isMesh) meshes++; }); assert.ok(meshes >= 12, 'deck, tread, undercarriage, four rim bars, four posts, four lamps: ' + meshes);
  const w = (t) => ({ map, time: t });
  cv.update(w(3), 1, 3); assert.ok(Math.abs(v.group.position.x - carState(map.cars[0], 3).x) < 1e-9, 'at rest it sits at the stop'); const dim = v.rim.color.r;
  cv.update(w(7.5), 1, 0.01); const warnA = v.rim.color.clone(); cv.update(w(7.5), 1, 0.2); assert.notDeepEqual(warnA.toArray(), v.rim.color.toArray(), 'the rim blinks in the last two seconds of the dwell'); assert.ok(['ffa23a', 'fff2d0'].includes(v.rim.color.getHexString()), 'amber or white: ' + v.rim.color.getHexString());
  cv.update(w(11), 1, 1); assert.equal(v.rim.color.getHexString(), '7ff0dc', 'pale teal while it runs'); assert.ok(v.group.position.x > 24 && v.group.position.x < 40);
  cv.update(w(11), 0, 1); const early = v.group.position.x; cv.update(w(11), 1, 1); assert.ok(v.group.position.x > early, 'alpha 0 is a tick behind alpha 1: the deck is drawn at the instant the interpolated player is'); assert.ok(Math.abs(v.group.position.x - early - 4 * TICK) < 0.08);
  for (let t = 0; t < 60; t += 1 / 30) cv.update(w(t), (t * 7) % 1, t); assert.ok(Number.isFinite(v.group.position.x + v.group.position.y + v.group.position.z)); assert.ok(dim <= 0.8);
});
