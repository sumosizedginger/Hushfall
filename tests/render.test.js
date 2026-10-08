// Render-side contracts that need no GPU: the level mesh builder runs headless (Three.js scene graph only), so structure can be asserted.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { buildLevel } from '../src/render/levelmesh.js';
import { SECRET_TELL } from '../src/engine/defs.js';
import { shippedMap } from './helpers.js';

const tex = new Proxy({}, { get: (o, k) => (o[k] ??= new THREE.Texture()) });
const level = buildLevel(shippedMap(), tex);
const countMeshes = (root) => { let n = 0; root.traverse((o) => { if (o.isMesh) n++; }); return n; };

// PT-015: the owner finished the Chandlery with "no sign of a secret"; the earlier test here held the tell to "thin and faint: a hint, not a sign" and let a 5 cm hairline at 32% stand. It is now held to a floor instead.
const bbox = (mesh) => { mesh.geometry.computeBoundingBox(); return mesh.geometry.boundingBox; };
test('the secret panel shows a plain tell on each open side: a bright seam as tall as the panel with halos round it, and a patch of light on the floor; ordinary doors have none', () => {
  const panel = level.doorViews.get('4,22'), tell = panel.children.filter((c) => c.isMesh && c.material.blending === THREE.AdditiveBlending);
  assert.equal(tell.length, 1, 'one merged additive mesh rides with the panel');
  const quads = tell[0].geometry.index.count / 6; assert.equal(quads, 2 * (SECRET_TELL.halo.length + 1), 'a seam and its halos on the hut side and on the loft side');
  const bb = bbox(tell[0]), span = panel.userData.span + 0.05; assert.ok(Math.abs((bb.max.y - bb.min.y) - span) < 1e-6, 'the glow is as tall as the panel: ' + (bb.max.y - bb.min.y));
  assert.ok(SECRET_TELL.seam >= 0.1 && SECRET_TELL.seamOpacity >= 0.6 && SECRET_TELL.halo.length >= 2 && SECRET_TELL.spill.length >= 2, 'a floor under the tell constants: a quiet number cannot creep back in');
  const col = tell[0].geometry.getAttribute('color'); let top = 0; for (let i = 0; i < col.count; i++) top = Math.max(top, col.getX(i)); assert.ok(top >= 0.6 * 1.0 - 1e-6, 'the brightest vertex (the seam) is bright: ' + top);
  const spill = level.group.children.filter((c) => c.isMesh && c.material.blending === THREE.AdditiveBlending && c !== tell[0] && bbox(c).max.y - bbox(c).min.y < 1e-6);
  assert.equal(spill.length, 1, 'one flat mesh of light on the floor'); assert.equal(spill[0].geometry.index.count / 6, 2 * SECRET_TELL.spill.length);
  const floorY = bbox(spill[0]).min.y; assert.ok(floorY > 0 && floorY < 0.2, 'just above the floor: ' + floorY);
  const door = level.doorViews.get('7,19'); assert.ok(door && !door.children.some((c) => c.material?.blending === THREE.AdditiveBlending));
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
