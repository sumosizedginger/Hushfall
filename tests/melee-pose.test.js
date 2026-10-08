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
/** how much of a forearm is INSIDE the picture: the length (m) of its axis whose points project inside the screen and in front of the camera (PT-018: the first fix only asserted the tube had a length, while the lower forearm left the frame 10 cm after the glove and was never seen) */
function visibleLength(rig, a) {
  const { S, E, W } = a.last, n = 60; let len = 0;
  for (const [A0, B0] of [[S, E], [E, W]]) {
    const A = rig.group.localToWorld(A0.clone()), B = rig.group.localToWorld(B0.clone());
    for (let i = 0; i < n; i++) { const p = A.clone().lerp(B, (i + 0.5) / n), q = p.clone().project(cam); if (p.z < -0.1 && Math.abs(q.x) < 1 && Math.abs(q.y) < 1) len += A.distanceTo(B) / n; }
  }
  return len;
}
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
    const hold = 0.2 * T.recover, sink = MELEE_MAKERS[id](null), end = MELEE_MAKERS[id](null), wind = MELEE_MAKERS[id](null); sink.anim({ ...swingPhase(id, T.windup + hold * 0.5), kind: id, t: 0 }); end.anim({ ...swingPhase(id, T.windup + hold), kind: id, t: 0 }); wind.anim({ ...swingPhase(id, T.windup - strikeTime(T)), kind: id, t: 0 });
    const stroke = wind.hold.position.distanceTo(hp), sunk = sink.hold.position.distanceTo(hp);
    assert.ok(sunk > 1e-4 && sunk < stroke * 0.15, id + ': after the contact the weapon sinks a little past the hit pose (' + sunk.toFixed(4) + ' m of a ' + stroke.toFixed(2) + ' m stroke)'); assert.ok(end.hold.position.distanceTo(hp) < 1e-6, id + ': and has settled on the hit pose at the end of the hold');
  }
});
test('at rest and on guard: BOTH hands (one for the marlinspike) are on the screen, with a forearm, and the weapon\'s axis stays clear of the crosshair at rest', () => {
  for (const id of FOUND) {
    for (const [name, st] of [['ready', {}], ['guard', { guard: 1 }]]) {
      const rig = posed(id, st);
      assert.equal(rig.gloves.length, id === 'marlinspike' ? 1 : 2, id + ': one glove per hand on the weapon');
      for (const [i, gl] of rig.gloves.entries()) { const p = ndc(gl.getWorldPosition(new THREE.Vector3())); assert.ok(Math.abs(p.x) < 0.98 && Math.abs(p.y) < 0.98 && p.z < 1, `${id} ${name}: hand ${i} on screen (${p.x.toFixed(2)}, ${p.y.toFixed(2)})`); }
      for (const [i, a] of rig.arms.entries()) { const L = visibleLength(rig, a); assert.ok(L > 0.08, `${id} ${name}: arm ${i} can be SEEN (${L.toFixed(2)} m inside the frame; it must be at least 8 cm: a first-person forearm comes up from the bottom edge, foreshortened)`); }
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

// ---- PT-020: the swing's own clock (a view-only freeze on contact), the feel table, the camera's kick
import { SwingClock, FEEL, swingCamera } from '../src/render/weapon-pose.js';
test('with no hit the clock runs the plain swing and ends with it', () => {
  for (const kind of FOUND) {
    const T = swingTimes(kind), c = new SwingClock(); c.start(kind, 10);
    for (const u of [0.1, 0.3, 0.6, 0.9]) { const t = u * (T.windup + T.recover), a = c.sample(10 + t), b = swingPhase(kind, t); assert.ok(a && Math.abs(a.a - b.a) + Math.abs(a.b - b.b) + Math.abs(a.c - b.c) < 1e-9, kind + ' follows swingPhase'); }
    assert.equal(c.sample(10 + T.windup + T.recover + 0.01), null, kind + ': over when the swing is over');
  }
});
test('a hit freezes the view model ON the hit pose for the weapon\'s stop, once, then the swing carries on and ends that much later', () => {
  for (const kind of FOUND) {
    const T = swingTimes(kind), stop = FEEL[kind].stop, c = new SwingClock(); c.start(kind, 5);
    c.sample(5 + T.windup - 0.01); c.hit(kind, false); c.hit(kind, false);                             // a cleave lands on several bodies: still one freeze
    const at = (dt) => c.sample(5 + T.windup + dt);
    const first = at(0.004); assert.ok(first.b === 1 && first.h === 0 && first.c === 0, kind + ': exactly the hit pose at the contact');
    const mid = at(stop * 0.6), late = at(stop * 0.95); assert.ok(mid.b === 1 && mid.h === 0 && late.b === 1 && late.h === 0, kind + ': held for the stop (' + stop + ' s)');
    const after = at(stop + 0.03); assert.ok(after.h > 0, kind + ': then it carries on (the weapon sinks and settles)');
    assert.ok(c.sample(5 + T.windup + stop + T.recover - 0.02) !== null, kind + ': the swing now ends later by the stop'); assert.equal(c.sample(5 + T.windup + stop + T.recover + 0.02), null, kind + ': and then it is over');
  }
});
test('the freeze counts SIM time: a paused game (time not moving) does not use it up; a heavier weapon holds longer; a kill holds longer still', () => {
  const kind = 'axe', T = swingTimes(kind), c = new SwingClock(); c.start(kind, 0); c.sample(T.windup); c.hit(kind, false);
  for (let i = 0; i < 50; i++) c.sample(T.windup + 0.001);                                              // fifty frames of a paused game
  assert.equal(c.sample(T.windup + 0.002).h, 0, 'still held'); assert.ok(FEEL.axe.stop > FEEL.marlinspike.stop && FEEL.mallet.stop > FEEL.boathook.stop && FEEL.heavy.stop > FEEL.jab.stop, 'weight decides the stop');
  const k = new SwingClock(); k.start(kind, 0); k.sample(T.windup); k.hit(kind, true); assert.ok(k.freeze > FEEL.axe.stop, 'a kill is held a little longer');
  for (const [id, F] of Object.entries(FEEL)) assert.ok(F.stop >= 0.02 && F.stop <= 0.12, id + ': a freeze of a few frames, never a stall');
});
test('the camera kicks: up as the weapon is raised, down on the blow, within a couple of degrees (a visual kick, never a moved aim)', () => {
  for (const kind of Object.keys(FEEL)) {
    const T = swingTimes(kind), a = swingCamera(kind, swingPhase(kind, T.windup * 0.4)), b = swingCamera(kind, swingPhase(kind, T.windup)), n = swingCamera(kind, swingPhase(kind, T.windup + T.recover));
    assert.ok(a.pitch >= 0 && b.pitch < 0, kind + ': the camera rises with the weapon and drops on the blow'); assert.ok(Math.abs(n.pitch) + Math.abs(n.roll) < 1e-6, kind + ': and is level again when the swing is over');
    for (let t = 0; t <= T.windup + T.recover; t += 0.005) { const k = swingCamera(kind, swingPhase(kind, t)); assert.ok(Math.abs(k.pitch) < 0.05 && Math.abs(k.roll) < 0.05, kind + ': under 3 degrees'); }
  }
});
test('a blow ACCELERATES into the contact (the fastest the weapon moves is in the last few hundredths of a second before the hit) and stops dead there', () => {
  for (const id of FOUND) {
    const T = swingTimes(id), rig = MELEE_MAKERS[id](null), speeds = []; let prev = null; const dt = 0.004;
    for (let t = 0; t <= T.windup + 0.1; t += dt) { rig.anim({ ...swingPhase(id, t), kind: id, t: 0 }); const p = rig.hold.position.clone(); if (prev) speeds.push([t, p.distanceTo(prev) / dt]); prev = p; }
    const peak = speeds.reduce((m, s) => (s[1] > m[1] ? s : m), [0, 0]);
    assert.ok(peak[0] > T.windup - 0.02 && peak[0] <= T.windup + 0.004, `${id}: the peak speed (${peak[1].toFixed(1)} m/s) is at ${peak[0].toFixed(3)} s, the contact is at ${T.windup} s`);
    const after = speeds.filter((s) => s[0] > T.windup + 0.012 && s[0] < T.windup + 0.06).map((s) => s[1]); assert.ok(Math.max(...after) < peak[1] * 0.35, `${id}: it does not carry on at speed after the contact`);
  }
});
