// The held lantern hangs clear of the HUD readouts (the outside playtest of 2026-11-18: in the Root Bell fight it hung over health and ammunition).
// Its bounding box, projected through the game's own camera at the widest and narrowest window shapes we ship for, ends above the readouts.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { makeHandLantern } from '../src/render/models_c2.js';
import { LAMP_Y } from '../src/render/view.js';
import { VIEW } from '../src/engine/defs.js';

const bottomOf = (aspect, fov) => {
  const m = makeHandLantern();
  m.scale.setScalar(0.6);
  m.position.set(-0.44, LAMP_Y + 0.012 - 0.05, -0.7); // the lowest it goes: out (sunk 0.05) at the bottom of its sway
  m.updateMatrixWorld(true);
  const b = new THREE.Box3().setFromObject(m),
    cam = new THREE.PerspectiveCamera(fov, aspect, 0.01, 100);
  cam.updateMatrixWorld(true);
  let y = 0;
  for (const x of [b.min.x, b.max.x]) for (const yy of [b.min.y, b.max.y]) for (const z of [b.min.z, b.max.z]) y = Math.max(y, (1 - new THREE.Vector3(x, yy, z).project(cam).y) / 2);
  return y;
};

test('the held lantern ends above the HUD readouts (the bottom tenth of the screen)', () => {
  for (const aspect of [4 / 3, 16 / 10, 16 / 9, 21 / 9])
    for (const fov of [VIEW.fov, VIEW.fov + VIEW.sprintFovKick + 5]) {
      const y = bottomOf(aspect, fov);
      assert.ok(y < 0.86, `aspect ${aspect.toFixed(2)} fov ${fov}: the lantern reaches ${(y * 100).toFixed(1)}% down the screen`);
    }
});
