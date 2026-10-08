// PT-021 step 5: the Vael's growth with thickness. Where a map says it started, lobes of resin climb the walls, thick at the origin and thinning to a front; the spread follows the floor plan (a corridor, a door), never a straight
// line through a wall; it is deterministic and bounded, and a map's growth list is validated.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { parseMap, validateMap } from '../src/engine/mapformat.js';
import { GROWTH } from '../src/engine/defs.js';
import { floodFrom, growthLobes, buildGrowth } from '../src/render/growth.js';
import { shippedMap } from './helpers.js';

// room A (cells 1..8 x 1..5), a door at (9, 3), room B (10..17 x 1..5); room C (1..8 x 8..11) is walled off from both
const GRID = ['###################', '#........#........#', '#........#........#', '#........D........#', '#........#........#', '#........#........#', '###################', '###################', '#........##########', '#........##########', '#........##########', '#........##########', '###################'];
const src = (extra = {}) => ({ format: 1, id: 'G1', version: 1, name: 'Growth', ceilingHeight: 3.2, grid: GRID, doors: [{ at: [9, 3] }], secrets: [], entities: [{ type: 'player', at: [2, 3], facing: 'east' }, { type: 'exit', at: [16, 3] }], ...extra });
const map = (g) => parseMap(src({ growth: g }));

test('floodFrom: metres of walking from the origin, through the door, never through a wall', () => {
  const m = map([]), f = floodFrom(m, 4, 3, 100), S = m.cell;
  assert.equal(f.get('4,3'), 0); assert.equal(f.get('5,3'), S); assert.equal(f.get('9,3'), 5 * S, 'the door is walked through'); assert.equal(f.get('12,3'), 8 * S, 'room B is reached through it');
  assert.ok(!f.has('4,9'), 'room C is walled off'); assert.ok(!floodFrom(m, 4, 3, 6).has('9,3'), 'the reach limit holds');
});

test('the lobes: on the walls beside reachable cells only, thick near the origin and thinner far away, none beyond the reach, none in the walled-off room', () => {
  const m = map([{ at: [2, 2], r: 24, power: 1 }]), lobes = growthLobes(m).filter((l) => l.glow !== 2), S = m.cell;
  assert.ok(lobes.length > 40, 'a mass of lobes: ' + lobes.length);
  assert.ok(lobes.every((l) => l.z < 14), 'none in room C (z >= 16 m is its wall and floor)'); assert.ok(lobes.every((l) => l.d <= 24 + 1e-9), 'none beyond the reach');
  const near = lobes.filter((l) => l.d <= 8).length / Math.max(1, new Set(lobes.filter((l) => l.d <= 8).map((l) => Math.floor(l.x / S) + ',' + Math.floor(l.z / S))).size), far = lobes.filter((l) => l.d > 16).length / Math.max(1, new Set(lobes.filter((l) => l.d > 16).map((l) => Math.floor(l.x / S) + ',' + Math.floor(l.z / S))).size);
  assert.ok(near > far, `thicker near (${near.toFixed(2)} a cell) than far (${far.toFixed(2)})`);
  assert.ok(lobes.some((l) => l.x > 10 * S), 'it came through the door into room B'); assert.ok(lobes.some((l) => l.front), 'a wet front at the edge');
  const sizeNear = lobes.filter((l) => l.d <= 6).reduce((a, l) => a + l.sx, 0) / lobes.filter((l) => l.d <= 6).length, sizeFar = lobes.filter((l) => l.d > 16).reduce((a, l) => a + l.sx, 0) / Math.max(1, lobes.filter((l) => l.d > 16).length);
  assert.ok(sizeNear > sizeFar, 'the lobes are larger near the origin');
});

test('every lobe stands on a wall face of the room: its centre is within a lobe-thickness of the wall plane, protruding into the open cell', () => {
  const m = map([{ at: [2, 2], r: 24 }]), S = m.cell;
  for (const l of growthLobes(m).filter((q) => q.glow !== 2)) {
    const cx = Math.floor((l.x + l.nx * 0.05) / S), cz = Math.floor((l.z + l.nz * 0.05) / S); assert.notEqual(m.kind(cx, cz), 'wall', 'the lobe sits in the open cell beside the wall');
    const back = l.sz * 0.45 + 0.05, wx = Math.floor((l.x - l.nx * back) / S), wz = Math.floor((l.z - l.nz * back) / S); assert.equal(m.kind(wx, wz), 'wall', 'and the wall is right behind it');
    assert.ok(l.y >= 0 && l.y <= 3.3, 'within the wall height: ' + l.y);
  }
});

test('growth is deterministic, bounded, and absent when a map names none', () => {
  const m = map([{ at: [2, 2], r: 24 }]); assert.deepEqual(growthLobes(m), growthLobes(m)); assert.equal(growthLobes(map([])).length, 0); assert.equal(buildGrowth(map([]), null), null);
  const shipped = shippedMap('C1E2M05'), n = growthLobes(shipped).length; assert.ok(n > 150 && n < 5000, 'the Annex: ' + n + ' lobes');
  const grp = buildGrowth(shipped, null); let verts = 0, meshes = 0; grp.traverse((o) => { if (o.isMesh) { meshes++; verts += o.geometry.attributes.position.count; } });
  assert.ok(meshes >= 1 && meshes <= 2, 'one or two draw calls: ' + meshes); assert.ok(verts < 160000, 'a bounded vertex count: ' + verts);
  const choke = growthLobes(shippedMap('C1E1M04')); assert.ok(choke.some((l) => l.z < 31 * 2 && l.z > 25 * 2), 'the Chandlery growth has come through the hatch into the office');
});

test('the growth list is validated: inside the grid, on a walkable cell, a sensible radius and power, and no more than the cap', () => {
  const bad = (growth, re) => { const v = validateMap(src({ growth })); assert.equal(v.ok, false); assert.ok(v.errors.some((e) => re.test(e)), JSON.stringify(v.errors)); };
  assert.equal(validateMap(src({ growth: [{ at: [2, 2], r: 10 }] })).ok, true);
  bad([{ at: [99, 2], r: 10 }], /inside the grid/); bad([{ at: [0, 0], r: 10 }], /walkable/); bad([{ at: [2, 2], r: 1 }], /r must be/); bad([{ at: [2, 2], r: 99 }], /r must be/); bad([{ at: [2, 2], r: 10, power: 5 }], /power must be/);
  bad(Array.from({ length: GROWTH.max + 1 }, () => ({ at: [2, 2], r: 10 })), /at most/);
});
