// PT-011 (the owner: "Is this what I should see when I aim down sights? No, like COD."): with the gun raised, the eye sits on the line through the rear notch and the front blade (src/render/weapon-pose.js).
// These tests re-derive that from the real rigs and the real pose function, with no browser: the sight line must run through the view axis, the rear sight must stand at the aim distance, the gun must not
// reach through the camera, and the hip and sprint poses must be the ones the game had before.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { makeFlareCannon, makeScattergun } from '../src/render/models.js';
import { makeRivetDriver } from '../src/render/models_rivet.js';
import { makeHarpoonRifle } from '../src/render/models_harpoon.js';
import { makeArcLamp } from '../src/render/models_arc.js';
import { weaponPose, adsTarget, HIP, SPRINT_POSE } from '../src/render/weapon-pose.js';

const RIGS = { flare: makeFlareCannon, scattergun: makeScattergun, rivet: makeRivetDriver, harpoon: makeHarpoonRifle, arc: makeArcLamp };
const place = (rig, pose) => { rig.group.scale.setScalar(pose.scale); rig.group.position.set(...pose.pos); rig.group.rotation.set(...pose.rot); rig.group.updateMatrixWorld(true); };
const world = (rig, p) => new THREE.Vector3(...p).applyMatrix4(rig.group.matrixWorld);

test('aimed: the rear sight stands dead centre at the aim distance and the front blade is on the same line through the eye', () => {
  for (const [name, make] of Object.entries(RIGS)) {
    const rig = make(null); assert.ok(rig.sights && rig.sights.rear && rig.sights.front, `${name}: the rig must name its sights`);
    place(rig, weaponPose(rig, { ads: 1, sprint: 0 }));
    const rear = world(rig, rig.sights.rear), front = world(rig, rig.sights.front), dist = rig.adsDist ?? 0.24;
    assert.ok(Math.abs(rear.x) < 1e-6 && Math.abs(rear.y) < 1e-6, `${name}: the rear sight is off the view axis (${rear.x.toFixed(4)}, ${rear.y.toFixed(4)})`);
    assert.ok(Math.abs(rear.z + dist) < 1e-6, `${name}: the rear sight is ${(-rear.z).toFixed(3)} m ahead of the eye, wanted ${dist}`);
    assert.ok(front.z < rear.z - 0.2, `${name}: the front blade (${front.z.toFixed(3)}) is not well beyond the rear sight (${rear.z.toFixed(3)})`);
    assert.ok(Math.abs(front.x) < 1e-6 && Math.abs(front.y) < 1e-4, `${name}: the front blade is off the sight line (${front.x.toFixed(4)}, ${front.y.toFixed(5)}): the player would not see the blade in the notch`);
  }
});

test('aimed: nothing solid is closer to the eye than the weapon camera\'s near plane, except the tang that is cut by it (the view is never inside a mesh)', () => {
  for (const [name, make] of Object.entries(RIGS)) {
    const rig = make(null); place(rig, weaponPose(rig, { ads: 1, sprint: 0 })); const NEAR = 0.1;
    let behind = 0, total = 0, closest = Infinity; const v = new THREE.Vector3();
    rig.group.traverse((o) => { if (!o.isMesh || o.material === rig.sleeveMat) return; for (let o2 = o; o2; o2 = o2.parent) if (o2.visible === false) return; const p = o.geometry.attributes.position; for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i).applyMatrix4(o.matrixWorld); total++; if (-v.z < NEAR) behind++; closest = Math.min(closest, -v.z); } });
    assert.ok(behind / total < 0.12, `${name}: ${(100 * behind / total).toFixed(0)}% of the gun's vertices are inside the near plane (closest ${closest.toFixed(3)} m)`);
  }
});

test('hip and sprint are unchanged by the sight-line pose; the legacy pose is still reproducible', () => {
  for (const [name, make] of Object.entries(RIGS)) {
    const rig = make(null), hip = weaponPose(rig, { ads: 0, sprint: 0 }), spr = weaponPose(rig, { ads: 0, sprint: 1 });
    assert.deepEqual(hip.pos.map((x) => +x.toFixed(6)), [HIP.x, HIP.y, HIP.z], `${name}: hip position`); assert.ok(Math.abs(hip.scale - 0.62) < 1e-9 && Math.abs(hip.rot[1] - 0.1) < 1e-9, `${name}: hip scale/yaw`);
    assert.deepEqual(spr.pos.map((x) => +x.toFixed(6)), [SPRINT_POSE.x, SPRINT_POSE.y, SPRINT_POSE.z], `${name}: sprint position`); assert.ok(Math.abs(spr.rot[0] - SPRINT_POSE.rx) < 1e-9 && Math.abs(spr.rot[1] - SPRINT_POSE.ry) < 1e-9, `${name}: sprint rotation`);
    const old = weaponPose(rig, { ads: 1, sprint: 0, legacy: true }); assert.deepEqual(old.pos.map((x) => +x.toFixed(3)), [0, +(rig.adsY * 0.56 / 0.62).toFixed(3), -0.6], `${name}: legacy ADS position`);
    assert.ok(adsTarget(rig).scale <= 0.62, `${name}: the aimed gun is not larger than the hip gun`);
  }
});

test('recoil is damped in the sights and the pose stays finite for every blend of aim and sprint', () => {
  for (const [name, make] of Object.entries(RIGS)) {
    const rig = make(null);
    for (const ads of [0, 0.3, 0.7, 1]) for (const sprint of [0, 0.5, 1]) { const p = weaponPose(rig, { ads, sprint, sway: 0.01, recoil: 1, dead: 0, dip: 0 }); assert.ok([...p.pos, ...p.rot, p.scale].every(Number.isFinite), `${name}: ads ${ads} sprint ${sprint}`); }
    const hip = weaponPose(rig, { ads: 0, sprint: 0, recoil: 1 }).pos[2] - weaponPose(rig, { ads: 0, sprint: 0, recoil: 0 }).pos[2], aimed = weaponPose(rig, { ads: 1, sprint: 0, recoil: 1 }).pos[2] - weaponPose(rig, { ads: 1, sprint: 0, recoil: 0 }).pos[2];
    assert.ok(aimed < hip, `${name}: the kick in the sights (${aimed.toFixed(3)}) is not smaller than at the hip (${hip.toFixed(3)})`);
  }
});
