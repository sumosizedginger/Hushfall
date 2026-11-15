// design/VISUAL_AWE_PLAN.md, session A3: the sun casts shadows under open sky. The shadow camera must see the whole map from the sun's direction,
// the direction must be the look's own, only still solid surfaces cast and receive, and a place with no open sky is left alone.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { SUN_SHADOW, hasOpenSky, shadowBox, placeSun, setupSunShadow, setSunShadow } from '../src/render/sunshadow.js';
import { buildLevel } from '../src/render/levelmesh.js';
import { LOOKS } from '../src/engine/defs.js';
import { shippedMap } from './helpers.js';
import { texProxy } from './stubs.js';

const fakeRenderer = () => ({ shadowMap: { enabled: false, type: 0, autoUpdate: true, needsUpdate: false } });

test('the sun keeps the direction its look gives it, and its shadow camera holds every corner of the map', () => {
  const map = shippedMap('C1E1M01'),
    sun = new THREE.DirectionalLight(0xffffff, 1),
    dir = LOOKS.dusk.sun[2],
    el = placeSun(sun, map, dir),
    b = shadowBox(map);
  const d = new THREE.Vector3().subVectors(sun.position, sun.target.position).normalize(),
    want = new THREE.Vector3(...dir).normalize();
  assert.ok(d.distanceTo(want) < 1e-9, 'the direction is the look`s');
  assert.ok(Math.abs(el - (Math.asin(want.y) * 180) / Math.PI) < 1e-9);
  // every corner of the map, at the ground and 20 m up, lies inside the camera's box as seen along the sun's direction
  sun.updateMatrixWorld(true);
  sun.shadow.camera.position.copy(sun.position);
  sun.shadow.camera.lookAt(sun.target.position);
  sun.shadow.camera.updateMatrixWorld(true);
  const inv = sun.shadow.camera.matrixWorldInverse.copy(sun.shadow.camera.matrixWorld).invert(),
    c = sun.shadow.camera;
  for (const x of [0, map.w * map.cell])
    for (const z of [0, map.h * map.cell])
      for (const y of [-6, 0, 20]) {
        const p = new THREE.Vector3(x, y, z).applyMatrix4(inv);
        assert.ok(p.x >= c.left && p.x <= c.right && p.y >= c.bottom && p.y <= c.top, `corner ${x},${y},${z} is in the box`);
        assert.ok(-p.z >= c.near && -p.z <= c.far, `corner ${x},${y},${z} is between near and far`);
      }
  assert.equal(b.size, Math.max(map.w, map.h) * map.cell > SUN_SHADOW.bigOver ? SUN_SHADOW.bigSize : SUN_SHADOW.size);
});

test('Marrow Quay (open sky): the sun casts, the map is drawn on demand, and the level`s lit surfaces cast and receive', () => {
  const map = shippedMap('C1E1M01'),
    lvl = buildLevel(map, texProxy()),
    sun = new THREE.DirectionalLight(0xffffff, 1),
    r = fakeRenderer(),
    s = setupSunShadow(r, sun, lvl.group, map);
  assert.equal(hasOpenSky(map), true);
  assert.equal(s.on, true);
  assert.ok(s.casters > 4 && s.receivers > 4);
  assert.equal(r.shadowMap.enabled, true);
  assert.equal(r.shadowMap.autoUpdate, false, 'never redrawn every frame');
  assert.equal(r.shadowMap.type, THREE.BasicShadowMap, 'hard-edged');
  assert.equal(sun.castShadow, true);
  assert.equal(sun.shadow.intensity, SUN_SHADOW.strength);
  lvl.group.traverse((o) => {
    if (o.isMesh && (o.material.transparent || o.material.blending === THREE.AdditiveBlending)) assert.ok(!o.castShadow, 'a see-through thing casts no shadow');
  });
  setSunShadow(r, sun, false);
  assert.equal(sun.castShadow, false, 'the effects rung turns it off');
});

test('a door takes no part in the sun shadow (the owner, 2026-11-15: a hard wedge from its own lintel on the second level); the walls still do', () => {
  const map = shippedMap('C1E1M02'),
    lvl = buildLevel(map, texProxy()),
    s = setupSunShadow(fakeRenderer(), new THREE.DirectionalLight(0xffffff, 1), lvl.group, map);
  assert.equal(s.on, true);
  let doorMeshes = 0;
  for (const v of lvl.doorViews.values())
    v.traverse((o) => {
      if (!o.isMesh || !v.userData.noSunShadow) return;
      doorMeshes++;
      assert.ok(!o.castShadow && !o.receiveShadow, 'a door slab is out of the sun shadow');
    });
  // (a closet panel is drawn as the wall it sits in and keeps the wall's shadow, like a secret panel: a panel lit unlike its wall would be a tell)
  const slabs = [...map.doors.values()].filter((d) => !d.closet).length;
  assert.ok(slabs >= 5 && doorMeshes >= slabs, `every door slab of the map was looked at: ${doorMeshes} meshes, ${slabs} slabs`);
  assert.ok(s.casters > 100, 'the level itself still casts: ' + s.casters);
});

test('a map with no open sky is left alone', () => {
  const sealed = { w: 4, h: 4, cell: 2, kind: () => 'floor' },
    sun = new THREE.DirectionalLight(0xffffff, 1),
    r = fakeRenderer();
  assert.equal(hasOpenSky(sealed), false);
  assert.equal(setupSunShadow(r, sun, new THREE.Group(), sealed).on, false);
  assert.equal(r.shadowMap.enabled, false);
  assert.equal(sun.castShadow, false);
});
