// Render-side contracts that need no GPU: the level mesh builder runs headless (Three.js scene graph only), so structure can be asserted.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { buildLevel } from '../src/render/levelmesh.js';
import { shippedMap } from './helpers.js';

const tex = new Proxy({}, { get: (o, k) => (o[k] ??= new THREE.Texture()) });
const level = buildLevel(shippedMap(), tex);
const countMeshes = (root) => { let n = 0; root.traverse((o) => { if (o.isMesh) n++; }); return n; };

test('the secret panel carries a lamplight tell on each open side; ordinary doors do not', () => {
  const panel = level.doorViews.get('4,22'), strips = panel.children.filter((c) => c.isMesh && c.material.color?.getHex() === 0xffb45a);
  assert.equal(strips.length, 2, 'one hairline of light on the hut side and one on the loft side');
  for (const s of strips) assert.ok(s.material.transparent && s.material.opacity < 1 && s.geometry.parameters.width < 0.1, 'thin and faint: a hint, not a sign');
  const door = level.doorViews.get('7,19'); assert.ok(door && !door.children.some((c) => c.material?.color?.getHex() === 0xffb45a));
});

test('rooms are lit differently: warm oil lamps, cold customs tubes and teal pods (audit F10)', () => {
  const hues = new Set(level.lights.map((l) => l.color.getHex()));
  for (const c of [0xffb060, 0xa8dcff, 0x50ffd8]) assert.ok(hues.has(c), 'a light of colour ' + c.toString(16));
});

test('static scene budget: the merged level stays small (regression guard; real draw calls are measured in the browser check)', () => {
  const n = countMeshes(level.group); assert.ok(n < 260, `level scene has ${n} meshes`);
});

// ---- Gate 2 terrain: the level mesh builder understands heights, sectors, hazards, switches and closets
import { parseMap } from '../src/engine/mapformat.js';
const kitMap = () => parseMap({
  format: 1, id: 'R1', version: 1, name: 'Render kit', ceilingHeight: 6,
  grid: ['############', '#..........#', '#...#X#....#', '#..........#', '############'], heights: ['............', '.......12344', '............', '............', '............'], fx: ['............', '............', '.ww.........', '.xx.........', '............'],
  sectors: [{ id: 'lift', cells: [[8, 3]], low: 0, high: 1, speed: 1 }], closets: [{ at: [5, 2] }], doors: [],
  entities: [{ type: 'player', at: [1, 1] }, { type: 'exit', at: [10, 3] }, { type: 'switch', id: 's', at: [3, 3], wall: 'south', do: [{ open: [5, 2] }, { sector: { id: 'lift', to: 'high' } }] }, { type: 'prop', kind: 'cart', at: [2, 1] }, { type: 'prop', kind: 'cradle', at: [9, 1] }, { type: 'prop', kind: 'lantern', at: [1, 3] }],
});
test('terrain level mesh: risers for the stairs, a moving-floor group per sector, hazard overlays, a switch panel, a closet that looks like wall, a lantern light', () => {
  const m = kitMap(), lv = buildLevel(m, tex);
  assert.equal(lv.sectorViews.length, 1); assert.ok(lv.sectorViews[0].children.length >= 2, 'top + skirts');
  assert.ok(lv.fxMats.w && lv.fxMats.x, 'wading and toxic overlays'); assert.equal(lv.switchViews.size, 1); assert.ok(lv.switchViews.get('s').lamp.material.color, 'lamp colour is per panel');
  assert.ok(lv.doorViews.get('5,2'), 'the closet has a panel that opens like a door'); assert.ok(lv.exitViews.get('exit0'));
  assert.ok(lv.lights.length >= 2, 'lantern and cradle lights: ' + lv.lights.length);
  let tris = 0; lv.group.traverse((o) => { if (o.isMesh) tris += (o.geometry.index?.count ?? 0) / 3; }); assert.ok(tris > 60, 'geometry exists: ' + tris);
  let bad = 0; lv.group.traverse((o) => { if (o.isMesh) for (const v of o.geometry.attributes.position.array) if (!Number.isFinite(v)) bad++; }); assert.equal(bad, 0, 'no NaN in any vertex');
});
test('flat maps build exactly as before (no sector groups, no overlays, no switch views)', () => {
  assert.equal(level.sectorViews.length, 0); assert.deepEqual(Object.keys(level.fxMats), []); assert.equal(level.switchViews.size, 0);
});
