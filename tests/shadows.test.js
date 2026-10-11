// PT-035: the contact shadows (src/render/shadows.js): one instanced mesh, a soft disc (dark in the middle, nothing at the rim), laid on the floor under each live creature from the sim's own position, floor and radius; render only.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import * as THREE from 'three';
import { makeShadows, shadowGeometry, SHADOW } from '../src/render/shadows.js';
import { ROOT } from './helpers.js';

test('the disc is soft: its alpha is highest at the centre and zero at the rim, all vertices are dark, every triangle is flat on the floor', () => {
  const g = shadowGeometry(), c = g.attributes.color, p = g.attributes.position; assert.equal(c.itemSize, 4);
  assert.ok(Math.abs(c.getW(0) - SHADOW.alpha) < 1e-6, 'the centre is the darkest (float32)');
  let rim = 0; for (let i = 0; i < p.count; i++) { assert.equal(p.getY(i), 0, 'flat'); assert.ok(c.getX(i) < 0.1 && c.getY(i) < 0.1 && c.getZ(i) < 0.1, 'dark'); if (Math.hypot(p.getX(i), p.getZ(i)) > 0.99) { rim++; assert.equal(c.getW(i), 0, 'no shadow at the rim'); } }
  assert.equal(rim, SHADOW.segs); assert.equal(g.index.count, SHADOW.segs * 9, 'a fixed, small number of triangles');
});
test('one instanced mesh, one draw call: it places a disc under each creature on the floor the sim gives (lifted a hair), scaled by its radius, and never more than its capacity', () => {
  const S = makeShadows(4); assert.ok(S.mesh.isInstancedMesh); assert.equal(S.mesh.count, 0);
  const n = S.update([{ x: 3, y: 1.5, z: -2, r: 0.4 }, { x: 0, y: 0, z: 0, r: 1.6 }, { x: 1, y: 0, z: 1, r: 0.4, fade: 0.5 }]); assert.equal(n, 3); assert.equal(S.mesh.count, 3);
  const m = new THREE.Matrix4(), pos = new THREE.Vector3(), q = new THREE.Quaternion(), sc = new THREE.Vector3();
  S.mesh.getMatrixAt(0, m); m.decompose(pos, q, sc); assert.deepEqual([pos.x, pos.z], [3, -2]); assert.ok(pos.y > 1.5 && pos.y < 1.6, 'on the floor it stands on, a hair above it'); assert.ok(Math.abs(sc.x - 0.4 * SHADOW.radius) < 1e-6 && sc.y === 1);
  S.mesh.getMatrixAt(1, m); m.decompose(pos, q, sc); assert.ok(sc.x > 1.5, 'a big creature has a big disc');
  S.mesh.getMatrixAt(2, m); m.decompose(pos, q, sc); assert.ok(Math.abs(sc.x - 0.4 * SHADOW.radius * 0.5) < 1e-6, 'a flyer\'s disc is smaller');
  assert.equal(S.update(Array.from({ length: 9 }, () => ({ x: 0, y: 0, z: 0, r: 1 }))), 4, 'the capacity is a hard limit'); assert.equal(S.update([]), 0);
  assert.equal(S.mesh.material.depthWrite, false); assert.equal(S.mesh.material.transparent, true);
});
test('the view feeds it every creature that is not a corpse, from the root the view placed (the sim\'s ground), and nothing else writes the shadows', () => {
  const src = fs.readFileSync(path.join(ROOT, 'src/render/view.js'), 'utf8');
  assert.match(src, /import \{ makeShadows \} from '\.\/shadows\.js'/); assert.match(src, /e\.state === 'dead'\) continue/); assert.match(src, /this\.shadows\.update\(discs\)/);
});
