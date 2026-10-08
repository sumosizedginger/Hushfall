// PT-021 step 3: the guns. Each in its OWN materials and silhouette (the outside critique: "a scattergun, a rivet gun, a harpoon, and a lamp should not look like cousins"), with hands that are hands (the melee
// weapons' finger-ring fists on a swept sleeve, not two boxes and two cylinders), bigger at the hip; and the boss's shield is plates and a ring of sound, not a wireframe ball.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { makeFlareCannon, makeScattergun } from '../src/render/models.js';
import { makeRivetDriver } from '../src/render/models_rivet.js';
import { makeHarpoonRifle } from '../src/render/models_harpoon.js';
import { makeArcLamp } from '../src/render/models_arc.js';
import { HIP_SCALE, adsTarget } from '../src/render/weapon-pose.js';
import { makeShield, SHIELD } from '../src/render/shield.js';

const MAKERS = { flare: makeFlareCannon, scattergun: makeScattergun, rivet: makeRivetDriver, harpoon: makeHarpoonRifle, arc: makeArcLamp };
/** the cells of guns_atlas a rig draws from (read from the UVs of every part that wears the guns' material) */
const cellsOf = (root) => { const s = new Set(); root.traverse((o) => { if (!o.isMesh || o.material.userData?.atlas !== 'guns') return; const uv = o.geometry.attributes.uv; for (let i = 0; i < uv.count; i += Math.max(1, Math.floor(uv.count / 6))) s.add(Math.floor(Math.min(0.999, uv.getX(i)) * 4) + 4 * Math.floor((1 - Math.min(0.999, uv.getY(i))) * 4)); }); return s; };
const fingers = (root) => { let n = 0; root.traverse((o) => { if (o.isMesh && o.geometry.type === 'TorusGeometry' && Math.abs(o.geometry.parameters.arc - Math.PI * 1.55) < 1e-6) n++; }); return n; };

test('every gun draws from its own set of materials: no two guns share their signature cell, and each uses at least five of the sixteen', () => {
  const sets = Object.fromEntries(Object.entries(MAKERS).map(([k, make]) => [k, cellsOf(make(null, null).group)]));
  for (const [k, s] of Object.entries(sets)) assert.ok(s.size >= 5, k + ' uses ' + [...s].join(','));
  const SIGNATURE = { scattergun: 1, flare: 4, rivet: 5, harpoon: 7, arc: 10 };         // blued steel, signal-yellow enamel, perforated sheet, bleached oak, ribbed lantern brass
  for (const [k, c] of Object.entries(SIGNATURE)) { assert.ok(sets[k].has(c), k + ' wears cell ' + c); for (const [o, s] of Object.entries(sets)) if (o !== k) assert.ok(!s.has(c), `${o} must not wear ${k}'s cell ${c}`); }
  const key = (s) => [...s].sort((a, b) => a - b).join(',');
  assert.equal(new Set(Object.values(sets).map(key)).size, 5, 'five different material sets');
});

test('the guns carry hands: eight finger rings (two fists of four), a forearm sleeve each in the fading sleeve material; a gun on the ground (hands: false) carries none', () => {
  for (const [k, make] of Object.entries(MAKERS)) {
    const rig = make(null, null); assert.equal(fingers(rig.group), 8, k + ': two fists');
    let sleeves = 0; rig.group.traverse((o) => { if (o.isMesh && o.material === rig.sleeveMat && o.geometry.attributes.position.count > 300) sleeves++; }); assert.equal(sleeves, 2, k + ': two forearms');
    assert.ok(rig.sleeveMat.transparent && rig.sleeveMat.depthWrite === false, k + ': the sleeves fade in the sights');
    const bare = make(null, null, { hands: false }); assert.equal(fingers(bare.group), 0, k + ': a pickup has no hands');
    for (const f of ['flash', 'sights', 'sleeveMat', 'group']) assert.ok(rig[f], `${k}.${f}`); assert.ok(rig.sights.rear && rig.sights.front, k + ' names its sight line');
  }
});

test('the guns are bigger at the hip and the aimed gun is not (the sight picture was calibrated and stays)', () => {
  assert.ok(HIP_SCALE >= 0.7 && HIP_SCALE <= 0.85, 'hip scale ' + HIP_SCALE);
  for (const [k, make] of Object.entries(MAKERS)) assert.ok(adsTarget(make(null, null)).scale <= 0.5 + 1e-9, k + ': aimed scale unchanged');
});

test('the forearm of a gun is solved once and sits on the screen below the hand: its shoulder end is far below and behind the hand', () => {
  for (const [k, make] of Object.entries(MAKERS)) {
    const rig = make(null, null); let ok = 0;
    rig.group.traverse((o) => { if (o.isMesh && o.material === rig.sleeveMat && o.geometry.attributes.position.count > 300) { o.geometry.computeBoundingBox(); const b = o.geometry.boundingBox; if (b.min.y < -0.6 && b.max.y > -0.25) ok++; } });
    assert.equal(ok, 2, k + ': both forearms rise from below the frame to the hand');
  }
});

test('the shield is plates, not a ball: three bands of ten curved plates, no wireframe, a resting strength that flares when a hit is absorbed', () => {
  const s = makeShield(); assert.equal(s.rings.length, SHIELD.bands.length);
  for (const m of s.rings) { assert.ok(!m.material.wireframe && m.material.transparent && m.material.side === THREE.DoubleSide); assert.equal(m.geometry.type, 'BufferGeometry', 'merged plates, not an icosphere'); assert.ok(Math.abs(m.material.opacity - SHIELD.rest) < 1e-9); }
  assert.equal(s.rings[0].geometry.index.count / (6 * 6), SHIELD.plates, 'ten plates a band (six segments each)');
  s.update(0, 1); assert.ok(s.rings.every((m) => Math.abs(m.material.opacity - SHIELD.flare) < 1e-9), 'flares when a hit is absorbed'); s.update(1, 0); assert.ok(s.rings.every((m) => Math.abs(m.material.opacity - SHIELD.rest) < 1e-9));
  const a = s.rings[0].rotation.y; s.update(2, 0); assert.notEqual(s.rings[0].rotation.y, a, 'the bands turn');
  const box = new THREE.Box3().setFromObject(s.group, true); assert.ok(box.max.x <= 1.01 && box.min.x >= -1.01 && box.max.y - box.min.y > 1.5 && box.max.y - box.min.y < 2.6, 'unit radius, a person-sized cage');
});
