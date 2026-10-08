// PT-017: how the found melee weapons are HELD and how a swing reads. The owner's four screenshots (axe, boat hook, marlinspike, mallet) showed each weapon lying diagonally across the middle of the screen with its haft through the crosshair,
// one forearm and a floating second hand (the marlinspike: no hands at all), and the blow drawn after the damage had landed. These tests pin the rules that would have caught it: in the ready pose and the guard both hands are on the
// screen, the weapon's long axis stays clear of the crosshair at rest, and the blow ends at the very instant the sim resolves the hit.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { MELEE_MAKERS } from '../src/render/models_melee.js';
import { meleePose, swingPhase, swingTimes, strikeTime } from '../src/render/weapon-pose.js';

const FOUND = ['boathook', 'marlinspike', 'mallet', 'axe'];
const cam = new THREE.PerspectiveCamera(58, 1860 / 940, 0.1, 100);                      // the weapon camera (view.js), at the owner's window shape
cam.updateMatrixWorld(true);
function posed(id, st) {
  const rig = MELEE_MAKERS[id](null), kind = id; rig.anim({ a: 0, b: 0, c: 0, kind, t: 0, ...st });
  const pose = meleePose(rig, {}); rig.group.scale.setScalar(pose.scale); rig.group.position.set(...pose.pos); rig.group.rotation.set(...pose.rot); rig.group.updateMatrixWorld(true);
  return rig;
}
const ndc = (v) => v.clone().project(cam);
/** the weapon's long axis in the view: points along the hold's y from the butt to the business end */
function axisNdc(rig) {
  const box = new THREE.Box3().setFromObject(rig.hold), inv = new THREE.Matrix4().copy(rig.hold.matrixWorld).invert(); box.applyMatrix4(inv);      // (a world box in local terms: only its y extent is used, below)
  const a = [], lo = -0.1, hi = Math.min(box.max.y, 1.1);
  for (let i = 0; i <= 24; i++) a.push(ndc(rig.hold.localToWorld(new THREE.Vector3(0, lo + (hi - lo) * i / 24, 0))));
  return a;
}

test('a swing\'s blow ends at the instant the sim lands it: pull-back + blow = the wind-up, hold + return = the recovery', () => {
  for (const kind of [...FOUND, 'jab', 'heavy', 'bash']) {
    const T = swingTimes(kind), s = strikeTime(T);
    const at = (t) => swingPhase(kind, t);
    assert.equal(at(0).a, 0); assert.equal(at(0).b, 0); assert.ok(at(T.windup - s).a === 1 && at(T.windup - s).b === 0, kind + ': pulled back, the blow not begun');
    assert.ok(at(T.windup - 0.004).b < 1, kind + ': the blow has not landed just before the hit'); assert.equal(at(T.windup).b, 1, kind + ': the blow IS at its end the instant the sim resolves the hit'); assert.equal(at(T.windup).c, 0, kind + ': and nothing has returned yet');
    assert.equal(at(T.windup + T.recover).c, 1, kind + ': home when the recovery ends'); assert.ok(at(T.windup + 0.2 * T.recover * 0.5).c === 0, kind + ': a short hold on the follow-through');
    let prev = [0, 0, 0]; for (let t = 0; t <= T.windup + T.recover; t += 0.004) { const p = at(t); assert.ok(p.a >= prev[0] - 1e-9 && p.b >= prev[1] - 1e-9 && p.c >= prev[2] - 1e-9, kind + ' phases never run backwards'); prev = [p.a, p.b, p.c]; }
  }
});
test('the rig is at its "hit" key pose when the damage lands (not later)', () => {
  for (const id of FOUND) {
    const T = swingTimes(id), rig = MELEE_MAKERS[id](null); rig.anim({ ...swingPhase(id, T.windup), kind: id, t: 0 });
    const hitQ = new THREE.Quaternion(); rig.hold.getWorldQuaternion(hitQ); const hp = rig.hold.position.clone();
    const mid = MELEE_MAKERS[id](null); mid.anim({ ...swingPhase(id, T.windup - 0.03), kind: id, t: 0 });
    assert.ok(mid.hold.position.distanceTo(hp) > 0.01, id + ': 30 ms before the hit the weapon is still on its way');
    const late = MELEE_MAKERS[id](null); late.anim({ ...swingPhase(id, T.windup + 0.2 * T.recover * 0.5), kind: id, t: 0 }); assert.ok(late.hold.position.distanceTo(hp) < 1e-6, id + ': the follow-through holds the hit pose');
  }
});
test('at rest and on guard: BOTH hands (one for the marlinspike) are on the screen, with a forearm, and the weapon\'s axis stays clear of the crosshair at rest', () => {
  for (const id of FOUND) {
    for (const [name, st] of [['ready', {}], ['guard', { guard: 1 }]]) {
      const rig = posed(id, st);
      assert.equal(rig.gloves.length, id === 'marlinspike' ? 1 : 2, id + ': one glove per hand on the weapon');
      for (const [i, gl] of rig.gloves.entries()) { const p = ndc(gl.getWorldPosition(new THREE.Vector3())); assert.ok(Math.abs(p.x) < 0.98 && Math.abs(p.y) < 0.98 && p.z < 1, `${id} ${name}: hand ${i} on screen (${p.x.toFixed(2)}, ${p.y.toFixed(2)})`); }
      for (const a of rig.arms) { const e = a.mesh.children[0]; assert.ok(e.scale.y > 0.2, id + ': a forearm runs to every hand'); }
    }
    const ready = axisNdc(posed(id, {}));
    for (const p of ready) assert.ok(Math.hypot(p.x * 1.98, p.y) > 0.16 || p.z > 1, `${id} ready: the weapon's axis passes the crosshair at (${p.x.toFixed(2)}, ${p.y.toFixed(2)})`);
    assert.ok(Math.max(...ready.map((p) => p.x)) > 0.1 && ready.every((p) => p.x > -0.55), id + ': held at the right of the screen, not across it');
  }
});
test('the wind-up and the blow keep both hands in the picture or leave it only upward (a raised weapon), never across the crosshair', () => {
  for (const id of FOUND) for (const u of [0.25, 0.5, 0.75, 1]) {
    const T = swingTimes(id), s = strikeTime(T), t = (T.windup - s) * (u < 1 ? u : 1) + (u === 1 ? s : 0), rig = posed(id, swingPhase(id, t));
    for (const gl of rig.gloves) { const p = ndc(gl.getWorldPosition(new THREE.Vector3())); assert.ok(p.y < 1 && p.y > -1.6 && p.x > -1.2 && p.x < 1.4, `${id} t=${t.toFixed(2)}: a hand strays (${p.x.toFixed(2)}, ${p.y.toFixed(2)})`); }
  }
});
test('the pickup is the weapon alone: no forearm (sleeve material) and no glove (a linen-wrapped box)', async () => {
  const { makePickupMelee } = await import('../src/render/models_melee.js');
  for (const id of FOUND) { const g = makePickupMelee('weapon_' + id, null); let sleeves = 0, meshes = 0; g.traverse((m) => { if (m.isMesh) { meshes++; if (m.material.transparent && m.material.depthWrite === false) sleeves++; } }); assert.equal(sleeves, 0, id + ': no sleeve in the pickup'); assert.ok(meshes >= 5, id + ': but the weapon itself is there'); }
});
