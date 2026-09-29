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
