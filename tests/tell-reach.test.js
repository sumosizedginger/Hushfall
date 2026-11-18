// A windup reads at a distance (the outside playtest of 2026-11-18: "the tells are visible only up close"). Up close the glint is as it was; past
// TELL.near metres it grows with the distance so it keeps its size on screen, and a soft glow of its colour comes up round the creature's body.
// tools/dev/probe-read.mjs measured it in the real game (the PRODUCTION_LOG entry of the day has the numbers).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { TELL, tellReach, Tells } from '../src/render/tells.js';

test('near, a tell is drawn as before; far, it keeps its size on screen up to a limit and wears the glow', () => {
  assert.deepEqual(tellReach(3), { grow: 1, far: 0 });
  assert.deepEqual(tellReach(TELL.near), { grow: 1, far: 0 });
  const mid = tellReach(15),
    far = tellReach(40);
  assert.ok(Math.abs(mid.grow - 15 / TELL.near) < 1e-9, 'it grows with the distance');
  assert.equal(far.grow, TELL.grow, 'and stops growing');
  assert.equal(tellReach(TELL.glow.far[0]).far, 0);
  assert.equal(tellReach(TELL.glow.far[1]).far, 1);
  assert.ok(mid.far > 0.8);
});

test('the glow is drawn only for a far creature, in the tell colour the player chose, and the pool hides it again', () => {
  const scene = new THREE.Scene(),
    tells = new Tells(scene),
    cam = new THREE.PerspectiveCamera();
  tells.setColors(0x112233, 0x445566);
  tells.begin();
  tells.add(0, 0, -4, 0, 2, { k: 0.5, ranged: false }, cam);
  tells.add(0, 0, -20, 0, 2, { k: 0.5, ranged: true }, cam);
  tells.end();
  const [nearOne, farOne] = tells.pool;
  assert.equal(nearOne.h.visible, false);
  assert.equal(farOne.h.visible, true);
  assert.equal(farOne.hm.color.getHex(), 0x445566);
  assert.ok(farOne.hm.opacity > 0 && farOne.hm.opacity <= TELL.glow.opacity);
  assert.ok(farOne.g.scale.x > nearOne.g.scale.x * 2, 'the far glint is drawn larger');
  tells.begin();
  tells.end();
  assert.equal(farOne.h.visible, false);
  tells.dispose();
});
