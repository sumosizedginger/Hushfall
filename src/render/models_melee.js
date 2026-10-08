// The melee view models (PT-013): the fists (always in hand, slot 6) and the four found weapons (boat hook, marlinspike, lamplighter's mallet, fire axe).
// Same contract as the gun rigs (models.js): { group, sleeveMat, flash, ... }, every surface a cell of the baked weapon atlas (flarecannon_atlas; cells 8-15 are the melee set, tools/baker/recipes3d.js).
// What is different: a melee rig has no sights; it carries `anim(st)`, which poses its parts from a swing phase. `st` is plain numbers (weapon-pose.js builds it):
//   { a, b, c }  the swing: wind-up 0..1, the blow 0..1, the return 0..1 (weapon-pose.js swingPhase)    kind: 'jab' | 'heavy' | weapon id
//   charge 0..1  how far the fists are drawn back for the heavy punch       guard 0..1  the guard raised       alt 0|1  which fist leads        t  seconds (idle sway)
// A found weapon is authored UPRIGHT (+y along the handle, the grip near y = 0, the business end at the top, the blade/point facing -z = forward) and posed by keyframes on a `hold` group;
// the forearms are NOT children of the weapon: each runs from an anchor below the screen's edge to wherever the hand is this frame, so an arm never swings with the weapon like a rod.
import * as THREE from 'three';
import { atlas } from './models.js';

const lerp = (a, b, t) => a + (b - a) * t;
const lerp3 = (A, B, t) => [lerp(A[0], B[0], t), lerp(A[1], B[1], t), lerp(A[2], B[2], t)];
const UP = new THREE.Vector3(0, 1, 0);
/** a primitive whose UVs are not 0..1 (an extruded shape): stretch them to the unit square first so atlas() can put them in a cell without spilling into the next one */
function unitUV(g) {
  const uv = g.attributes.uv; let u0 = 1e9, u1 = -1e9, v0 = 1e9, v1 = -1e9;
  for (let i = 0; i < uv.count; i++) { u0 = Math.min(u0, uv.getX(i)); u1 = Math.max(u1, uv.getX(i)); v0 = Math.min(v0, uv.getY(i)); v1 = Math.max(v1, uv.getY(i)); }
  for (let i = 0; i < uv.count; i++) uv.setXY(i, (uv.getX(i) - u0) / ((u1 - u0) || 1), (uv.getY(i) - v0) / ((v1 - v0) || 1));
  return g;
}

/** a sphere whose UVs stay inside 0..1 (three's poles spill ~0.1 past it, which would paint a neighbouring atlas cell on the tip) */
function sphere(r, w, h) { const g = new THREE.SphereGeometry(r, w, h), uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, Math.min(1, Math.max(0, uv.getX(i))), Math.min(1, Math.max(0, uv.getY(i)))); return g; }

function kit(tex) {
  const mat = new THREE.MeshLambertMaterial({ map: tex, emissive: 0x1c1610 });
  const sleeveMat = new THREE.MeshLambertMaterial({ map: tex, transparent: true, depthWrite: false });      // the view fades the sleeves in the sights; melee has none, but the view reads this material
  const M = (g, cell, m = mat) => new THREE.Mesh(atlas(g, cell), m);
  return { mat, sleeveMat, M };
}
/** a forearm mesh (unit length along +y) re-aimed every frame from `from` to `to` (group space) */
function arm(M, sleeve, radius = 0.046) {
  const s = M(new THREE.CylinderGeometry(radius * 0.8, radius, 1, 8), 4, sleeve), cuff = M(new THREE.CylinderGeometry(radius * 0.86, radius * 0.86, 0.09, 8), 8), g = new THREE.Group(); g.add(s);
  const v = new THREE.Vector3(), d = new THREE.Vector3();
  return {
    mesh: g, cuff,
    aim(from, to) {                                                                                       // the hand-wrap (cuff) sits at the wrist end
      v.set(...from); d.set(to[0] - from[0], to[1] - from[1], to[2] - from[2]); const len = d.length() || 1; d.divideScalar(len);
      s.scale.set(1, len, 1); s.position.set((from[0] + to[0]) / 2, (from[1] + to[1]) / 2, (from[2] + to[2]) / 2); s.quaternion.setFromUnitVectors(UP, d);
      cuff.position.set(to[0] - d.x * 0.05, to[1] - d.y * 0.05, to[2] - d.z * 0.05); cuff.quaternion.copy(s.quaternion);
    },
  };
}
/** a hand closed round a haft (the haft runs through it along y): the linen-wrapped back of the hand, the bare ridge of the knuckles on the forward face, the thumb along the top: the fists' hand (PT-017: the first version was a plank-textured box, and read as a crate on the pole) */
const glove = (M) => {
  const g = new THREE.Group(), back = M(new THREE.BoxGeometry(0.094, 0.082, 0.1), 8); g.add(back);
  for (let i = -1.5; i <= 1.5; i++) { const k = M(sphere(0.021, 6, 4), 9); k.position.set(i * 0.025, 0.0, -0.058); g.add(k); }
  const thumb = M(new THREE.BoxGeometry(0.03, 0.05, 0.075), 9); thumb.position.set(-0.058, 0.026, -0.012); thumb.rotation.y = 0.3; g.add(thumb);
  return g;
};

// ---------------------------------------------------------------------------------------------------------------------- the fists
export function makeFists(tex) {
  const { mat, sleeveMat, M } = kit(tex), g = new THREE.Group();
  const fist = (side) => {
    const a = new THREE.Group(), len = 0.4;
    const sleeve = M(new THREE.CylinderGeometry(0.044, 0.056, len, 8), 4, sleeveMat); sleeve.rotation.x = Math.PI / 2; sleeve.position.z = -len / 2; a.add(sleeve);              // the oilskin sleeve
    const wrap = M(new THREE.CylinderGeometry(0.048, 0.048, 0.13, 8), 8); wrap.rotation.x = Math.PI / 2; wrap.position.z = -len - 0.03; a.add(wrap);                               // the linen hand-wrap
    const hand = new THREE.Group(); hand.position.z = -len - 0.13; a.add(hand);
    const back = M(new THREE.BoxGeometry(0.1, 0.085, 0.14), 8); back.position.set(0, 0, 0.0); hand.add(back);                                                                      // the back of the hand, wrapped
    const knuckles = M(new THREE.BoxGeometry(0.105, 0.07, 0.06), 8); knuckles.position.set(0, -0.01, -0.085); hand.add(knuckles);
    for (let i = -1.5; i <= 1.5; i++) { const k = M(sphere(0.023, 6, 4), 9); k.position.set(i * 0.027, 0.002, -0.12); hand.add(k); }                              // the bare ridge of the fist
    const thumb = M(new THREE.BoxGeometry(0.035, 0.04, 0.09), 9); thumb.position.set(-side * 0.075, -0.012, -0.07); thumb.rotation.y = side * 0.35; hand.add(thumb);
    return a;
  };
  const R = fist(1), L = fist(-1); g.add(R, L);
  // ready: two fists up in front of the chest, the forearms rising from below the screen
  const READY = { R: { p: [0.24, -0.6, 0.22], r: [0.78, 0.1, 0.0] }, L: { p: [-0.24, -0.6, 0.22], r: [0.78, -0.1, 0.0] } };
  const put = (a, P, R_) => { a.position.set(...P); a.rotation.set(...R_); };
  function anim(st) {
    const lead = st.alt ? 'L' : 'R', rear = st.alt ? 'R' : 'L', sgn = lead === 'R' ? 1 : -1, arms = { R, L };
    const sway = Math.sin((st.t ?? 0) * 1.6) * 0.006;
    for (const k of ['R', 'L']) put(arms[k], [READY[k].p[0], READY[k].p[1] + sway * (k === 'R' ? 1 : -1), READY[k].p[2]], READY[k].r);
    // the guard: both fists up and together in front of the face
    const gd = st.guard ?? 0;
    if (gd > 0) { put(R, lerp3(R.position.toArray(), [0.17, -0.62, 0.3], gd), lerp3(R.rotation.toArray(), [0.88, 0.3, -0.1], gd)); put(L, lerp3(L.position.toArray(), [-0.17, -0.62, 0.3], gd), lerp3(L.rotation.toArray(), [0.88, -0.3, 0.1], gd)); }
    // a heavy punch charging: the leading fist drawn back past the shoulder, trembling at full
    const ch = st.charge ?? 0;
    if (ch > 0) { const A = arms[lead], shake = ch >= 1 ? Math.sin((st.t ?? 0) * 70) * 0.006 : 0; put(A, lerp3(A.position.toArray(), [sgn * 0.3 + shake, -0.55, 0.5], ch), lerp3(A.rotation.toArray(), [0.45, sgn * -0.55, sgn * 0.28], ch)); }
    // the swing: wind-up -> blow -> return
    const heavy = st.kind === 'heavy', A = arms[lead], B = arms[rear];
    const wind = heavy ? { p: [sgn * 0.3, -0.55, 0.5], r: [0.45, sgn * -0.55, sgn * 0.28] } : { p: [sgn * 0.26, -0.6, 0.34], r: [0.7, sgn * -0.28, 0] };
    const hit = heavy ? { p: [sgn * -0.05, -0.42, -0.14], r: [0.3, sgn * 0.5, sgn * -0.12] } : { p: [sgn * -0.04, -0.46, 0.06], r: [0.42, sgn * 0.36, 0] };
    if (st.a > 0 || st.b > 0) {
      const ready = A.position.toArray(), rr = A.rotation.toArray();
      let p = lerp3(ready, wind.p, st.a), r = lerp3(rr, wind.r, st.a);
      p = lerp3(p, hit.p, st.b); r = lerp3(r, hit.r, st.b);
      p = lerp3(p, READY[lead].p, st.c); r = lerp3(r, READY[lead].r, st.c); put(A, p, r);
      put(B, lerp3(B.position.toArray(), [-sgn * 0.14, -0.52, 0.2], 0.6 * Math.max(0, st.a - st.c)), B.rotation.toArray());                // the other hand comes in to cover
    }
  }
  return { group: g, flash: null, sleeveMat, melee: true, anim, adsY: 0, parts: { R, L }, hip: { pos: [0, 0.04, -0.34], scale: 0.95 } };
}

// ---------------------------------------------------------------------------------------------------------------------- found weapons
/** a keyframed hold: ready / wind (the pull-back or raise) / hit (the end of the blow) / guard; each { p, r } on the `hold` group; the arms are re-aimed to the hands afterwards */
/** a key pose's orientation: Euler [x, y, z] (XYZ), and an optional 4th number: a ROLL about the weapon's own long axis, applied first (it turns the head to show its flat side) */
const quatOf = (r) => new THREE.Quaternion().setFromEuler(new THREE.Euler(r[0], r[1], r[2], 'XYZ')).multiply(new THREE.Quaternion().setFromAxisAngle(UP, r[3] ?? 0));
function holdAnim(g, hold, K, arms, hands) {
  const tmp = new THREE.Vector3(), Q = { ready: quatOf(K.ready.r), wind: quatOf(K.wind.r), hit: quatOf(K.hit.r), guard: quatOf(K.guard.r) }, q = new THREE.Quaternion();      // the turn between two key poses is a slerp: a lerp of Euler angles swings a weapon through poses nobody authored
  return function anim(st) {
    let p = K.ready.p; q.copy(Q.ready);
    p = [p[0], p[1] + Math.sin((st.t ?? 0) * 1.5) * 0.004, p[2]];
    if ((st.guard ?? 0) > 0) { p = lerp3(p, K.guard.p, st.guard); q.slerp(Q.guard, st.guard); }
    if (st.a > 0 || st.b > 0) {
      p = lerp3(p, K.wind.p, st.a); q.slerp(Q.wind, st.a);
      p = lerp3(p, K.hit.p, st.b); q.slerp(Q.hit, st.b);
      p = lerp3(p, K.ready.p, st.c); q.slerp(Q.ready, st.c);
    }
    hold.position.set(...p); hold.quaternion.copy(q); hold.updateMatrix();
    arms.forEach((a, i) => { tmp.set(...hands[i].at).applyMatrix4(hold.matrix); a.aim(hands[i].from, [tmp.x, tmp.y, tmp.z]); });
  };
}
function holdRig(tex, build) {
  const { mat, sleeveMat, M } = kit(tex), g = new THREE.Group(), hold = new THREE.Group(); g.add(hold);
  const spec = build({ M, mat, sleeveMat, hold });                                                                          // { K, hands: [{ at, from, cell? }], hip }
  const arms = spec.hands.map(() => arm(M, sleeveMat)); arms.forEach((a) => { g.add(a.mesh); g.add(a.cuff); });
  const gloves = spec.hands.map((h) => { const gl = glove(M); gl.position.set(...h.at); hold.add(gl); return gl; });
  return { group: g, flash: null, sleeveMat, melee: true, anim: holdAnim(g, hold, spec.K, arms, spec.hands), adsY: 0, hold, gloves, arms, hip: spec.hip };
}

export function makeBoatHook(tex) {
  return holdRig(tex, ({ M, hold }) => {
    const shaft = M(new THREE.CylinderGeometry(0.026, 0.03, 1.55, 8), 13); shaft.position.y = 0.4; hold.add(shaft);
    const grip = M(new THREE.CylinderGeometry(0.036, 0.036, 0.22, 8), 11); hold.add(grip);                                                 // rope-wrapped where the right hand sits
    const grip2 = M(new THREE.CylinderGeometry(0.036, 0.036, 0.18, 8), 11); grip2.position.y = 0.42; hold.add(grip2);                       // and where the left does
    const collar = M(new THREE.CylinderGeometry(0.045, 0.04, 0.16, 8), 12); collar.position.y = 1.2; hold.add(collar);                       // the iron socket
    const bend = M(new THREE.TorusGeometry(0.24, 0.032, 6, 16, Math.PI * 1.3), 12); bend.position.set(0, 1.36, -0.24); bend.rotation.set(0, Math.PI / 2, Math.PI * 0.35); hold.add(bend);      // the hook: a bend sweeping out and back
    const point = M(new THREE.ConeGeometry(0.022, 0.16, 6), 10); point.position.set(0, 1.22, -0.44); point.rotation.x = Math.PI / 2 + 0.2; hold.add(point);
    const tip = M(new THREE.ConeGeometry(0.026, 0.22, 6), 10); tip.position.y = 1.4; hold.add(tip);                                          // the spike on the end: a boat hook is also a pike
    return { K: {
      ready: { p: [0.28, -0.15, -0.5], r: [-1.15, 0.0, 0.12] }, wind: { p: [0.31, -0.12, -0.34], r: [-1.0, 0.0, 0.22] }, hit: { p: [0.16, -0.2, -0.78], r: [-1.35, 0.0, 0.1] }, guard: { p: [0.02, -0.16, -0.46], r: [-0.3, 0.0, 1.15] } },
      hands: [{ at: [0, 0, 0], from: [0.55, -0.75, -0.1] }, { at: [0, 0.42, 0], from: [-0.35, -0.75, -0.1] }], hip: { pos: [0, 0, 0], scale: 1 } };
  });
}

export function makeMarlinspike(tex) {
  return holdRig(tex, ({ M, hold }) => {
    const grip = M(new THREE.CylinderGeometry(0.04, 0.046, 0.3, 8), 11); hold.add(grip);                                                    // a rope-wrapped grip
    const pommel = M(sphere(0.058, 8, 6), 12); pommel.position.y = -0.18; hold.add(pommel);
    const guard = M(new THREE.BoxGeometry(0.2, 0.028, 0.06), 12); guard.position.y = 0.17; hold.add(guard);
    const spike = M(new THREE.CylinderGeometry(0.006, 0.036, 0.7, 8), 10); spike.position.y = 0.55; hold.add(spike);                          // the spike: thick at the guard, a needle at the tip
    const fuller = M(new THREE.BoxGeometry(0.012, 0.55, 0.012), 10); fuller.position.set(0, 0.5, -0.032); hold.add(fuller);
    return { K: {
      ready: { p: [0.26, -0.17, -0.5], r: [-1.1, 0.0, 0.15] }, wind: { p: [0.29, -0.14, -0.3], r: [-1.05, 0.0, 0.4] }, hit: { p: [0.12, -0.18, -0.86], r: [-1.42, 0.0, 0.1] }, guard: { p: [0.02, -0.16, -0.46], r: [-0.3, 0.0, 1.1] } },
      hands: [{ at: [0, 0, 0], from: [0.8, -0.5, -0.15] }], hip: { pos: [0, 0, 0], scale: 1 } };
  });
}

export function makeMallet(tex) {
  return holdRig(tex, ({ M, hold }) => {
    const handle = M(new THREE.CylinderGeometry(0.03, 0.036, 1.05, 8), 13); handle.position.y = 0.38; hold.add(handle);
    const grip = M(new THREE.CylinderGeometry(0.042, 0.042, 0.26, 8), 11); grip.position.y = -0.02; hold.add(grip);
    const knob = M(sphere(0.052, 8, 6), 13); knob.position.y = -0.17; hold.add(knob);
    const head = M(new THREE.CylinderGeometry(0.105, 0.105, 0.36, 10), 14); head.rotation.z = Math.PI / 2; head.position.y = 0.92; hold.add(head);        // the bronze head, across the top
    for (const s of [-1, 1]) { const band = M(new THREE.CylinderGeometry(0.113, 0.113, 0.04, 10), 12); band.rotation.z = Math.PI / 2; band.position.set(s * 0.14, 0.92, 0); hold.add(band); const cap = M(new THREE.CylinderGeometry(0.078, 0.105, 0.03, 10), 12); cap.rotation.z = Math.PI / 2; cap.position.set(s * 0.195, 0.92, 0); hold.add(cap); }
    const wedge = M(new THREE.BoxGeometry(0.03, 0.05, 0.05), 12); wedge.position.set(0, 1.06, 0); hold.add(wedge);                                   // the iron wedge that keeps the head on
    return { K: {                                                                                                                              // held up and back, brought DOWN over the top
      ready: { p: [0.28, -0.15, -0.52], r: [-0.95, 0.0, 0.12] }, wind: { p: [0.36, -0.12, -0.56], r: [0.2, 0.0, -0.25] }, hit: { p: [0.1, -0.22, -0.62], r: [-1.9, 0.0, 0.1] }, guard: { p: [0.02, -0.18, -0.5], r: [-0.35, 0.0, 1.2] } },
      hands: [{ at: [0, 0, 0], from: [0.55, -0.75, -0.1] }, { at: [0, 0.27, 0], from: [-0.35, -0.75, -0.1] }], hip: { pos: [0, 0, 0], scale: 1 } };
  });
}

export function makeAxe(tex) {
  return holdRig(tex, ({ M, hold }) => {
    const handle = M(new THREE.CylinderGeometry(0.028, 0.036, 0.86, 8), 13); handle.position.y = 0.27; hold.add(handle);
    const grip = M(new THREE.CylinderGeometry(0.04, 0.04, 0.24, 8), 11); grip.position.y = -0.02; hold.add(grip);
    const knob = M(sphere(0.05, 8, 6), 12); knob.position.y = -0.16; hold.add(knob);
    // the head: a red-enamelled fire-axe profile (poll behind, a flaring blade ahead), extruded; its edge is bright steel
    const sh = new THREE.Shape(); sh.moveTo(-0.075, -0.045); sh.lineTo(0.0, -0.06); sh.quadraticCurveTo(0.1, -0.075, 0.22, -0.14); sh.quadraticCurveTo(0.255, 0.0, 0.22, 0.14); sh.quadraticCurveTo(0.1, 0.075, 0.0, 0.06); sh.lineTo(-0.075, 0.05); sh.closePath();
    const headG = unitUV(new THREE.ExtrudeGeometry(sh, { depth: 0.045, bevelEnabled: false })); headG.translate(0, 0, -0.0225); headG.rotateY(Math.PI / 2);                  // shape x -> forward (-z), the extrusion across (x)
    const head = M(headG, 15); head.position.y = 0.66; hold.add(head);
    const edge = M(new THREE.BoxGeometry(0.014, 0.3, 0.03), 10); edge.position.set(0, 0.66, -0.235); hold.add(edge);                                        // the sharpened edge: bright steel (a sliver, in front of the red)
    const pick = M(new THREE.ConeGeometry(0.022, 0.18, 5), 10); pick.position.set(0, 0.66, 0.15); pick.rotation.x = -Math.PI / 2; hold.add(pick);            // the pick on the back of the head
    const socket = M(new THREE.BoxGeometry(0.07, 0.11, 0.11), 12); socket.position.set(0, 0.66, 0.0); hold.add(socket);
    return { K: {                                                                                                                              // raised over the right shoulder, swung across and down: the cleave
      ready: { p: [0.28, -0.15, -0.52], r: [-1.0, 0.0, 0.12, 0.7] }, wind: { p: [0.4, -0.16, -0.58], r: [-0.05, 0.0, -0.3, 0.5] }, hit: { p: [0.1, -0.2, -0.68], r: [-1.5, 0.0, 0.85, 0.3] }, guard: { p: [0.02, -0.18, -0.52], r: [-0.35, 0.0, 1.2, 0.7] } },
      hands: [{ at: [0, 0, 0], from: [0.55, -0.75, -0.1] }, { at: [0, 0.3, 0], from: [-0.35, -0.75, -0.1] }], hip: { pos: [0, 0, 0], scale: 1 } };
  });
}

export const MELEE_MAKERS = { fists: makeFists, boathook: makeBoatHook, marlinspike: makeMarlinspike, mallet: makeMallet, axe: makeAxe };

/** a found weapon lying on the floor (the same model, small, lying flat, with a glint): for maps that place one */
export function makePickupMelee(kind, tex) {
  const id = kind.replace(/^weapon_/, ''), make = MELEE_MAKERS[id]; const g = new THREE.Group(); if (!make) return g;
  const rig = make(tex); rig.anim({ a: 0, b: 0, c: 0, t: 0 }); const m = rig.hold ?? rig.group; for (const gl of rig.gloves ?? []) gl.parent?.remove(gl); m.position.set(0, 0.14, 0); m.rotation.set(Math.PI / 2, 0, 0); m.scale.setScalar(0.5); g.add(m);      // the weapon alone, lying flat: not the forearms and gloves of the first-person rig
  const glow = new THREE.Mesh(new THREE.IcosahedronGeometry(0.05, 0), new THREE.MeshBasicMaterial({ color: 0xffe08a })); glow.position.y = 0.62; g.add(glow);
  return g;
}
