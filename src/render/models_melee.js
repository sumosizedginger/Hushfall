// The melee view models (PT-013): the fists (always in hand, slot 6) and the four found weapons (boat hook, marlinspike, lamplighter's mallet, fire axe).
// Same contract as the gun rigs (models.js): { group, sleeveMat, flash, ... }, every surface a cell of the baked weapon atlas (flarecannon_atlas; cells 8-15 are the melee set, tools/baker/recipes3d.js).
// What is different: a melee rig has no sights; it carries `anim(st)`, which poses its parts from a swing phase. `st` is plain numbers (weapon-pose.js builds it):
//   { a, b, c }  the swing: wind-up 0..1, the blow 0..1, the return 0..1 (weapon-pose.js swingPhase)    kind: 'jab' | 'heavy' | weapon id
//   charge 0..1  how far the fists are drawn back for the heavy punch       guard 0..1  the guard raised       alt 0|1  which fist leads        t  seconds (idle sway)
// A found weapon is authored UPRIGHT (+y along the handle, the grip near y = 0, the business end at the top, the blade/point facing -z = forward) and posed by keyframes on a `hold` group;
// the forearms are NOT children of the weapon: each runs from an anchor below the screen's edge to wherever the hand is this frame, so an arm never swings with the weapon like a rod.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { atlas } from './atlasuv.js';
import { FEEL } from './weapon-pose.js';

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

export function kit(tex) {
  const mat = new THREE.MeshLambertMaterial({ map: tex, emissive: 0x1c1610 });
  const sleeveMat = new THREE.MeshLambertMaterial({ map: tex, transparent: true, depthWrite: false });      // the view fades the sleeves in the sights; melee has none, but the view reads this material
  const M = (g, cell, m = mat) => new THREE.Mesh(atlas(g, cell), m);
  return { mat, sleeveMat, M };
}
/**
 * a two-bone arm (PT-019) wearing ONE continuous sleeve (PT-020): the arm is solved every frame from a shoulder to the wrist (group space): an upper arm and a forearm that meet at an elbow, the elbow bending out and down (`pole`),
 * a hand out of reach dragging the SHOULDER toward it (the body leans into the blow) instead of stretching the arm. The sleeve is a single tube swept along the smooth curve through shoulder, elbow and wrist, with a radius that swells
 * at the elbow, tapers to the wrist and ripples with creases: no stacked cylinders, so no seams for the ink pass to draw and no faceted kink at the elbow. `last` = { S, E, W } of the latest solve (the tests project them).
 */
const RINGS = 24, SIDES = 14;
function sleeveGeometry() {
  const n = (RINGS + 1) * (SIDES + 1), g = new THREE.BufferGeometry(), uv = new Float32Array(n * 2), idx = [];
  for (let i = 0; i <= RINGS; i++) for (let k = 0; k <= SIDES; k++) { const j = i * (SIDES + 1) + k; uv[j * 2] = k / SIDES; uv[j * 2 + 1] = 1 - i / RINGS; }
  for (let i = 0; i < RINGS; i++) for (let k = 0; k < SIDES; k++) { const a = i * (SIDES + 1) + k, b = a + 1, c = a + SIDES + 1, d = c + 1; idx.push(a, b, c, b, d, c); }
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3)); g.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(n * 3), 3)); g.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); g.setIndex(idx);
  return g;
}
const smooth01 = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
/** the sleeve's radius at t (0 shoulder .. 1 wrist): a swollen upper arm, the elbow's bulge, a taper to the wrist, creases that run across the arm and crowd at the elbow and the cuff */
const sleeveRadius = (r, t) => r * (1.28 - 0.18 * smooth01(0, 0.5, t) + 0.1 * Math.exp(-(((t - 0.56) / 0.07) ** 2)) - 0.34 * smooth01(0.58, 1, t)) * (1 + 0.03 * Math.sin(t * 58) * (0.5 + 0.8 * Math.exp(-(((t - 0.52) / 0.2) ** 2))) + 0.05 * smooth01(0.86, 0.95, t) * Math.sin(t * 150));
export function arm(M, sleeve, r = 0.04, upper = 0.5, fore = 0.5) {
  const geo = sleeveGeometry(), skin = new THREE.Mesh(atlas(geo, 4), sleeve), cuff = M(new THREE.CylinderGeometry(r * 1.2, r * 0.95, 0.1, 8), 8), g = new THREE.Group(); skin.frustumCulled = false; g.add(skin);
  const S = new THREE.Vector3(), W = new THREE.Vector3(), E = new THREE.Vector3(), Hv = new THREE.Vector3(), d = new THREE.Vector3(), p = new THREE.Vector3(), t = new THREE.Vector3(), C = new THREE.Vector3(), P = new THREE.Vector3(), Tn = new THREE.Vector3(), Nn = new THREE.Vector3(), Bn = new THREE.Vector3();
  const pos = geo.attributes.position, nor = geo.attributes.normal;
  return {
    mesh: g, cuff, last: { S, E, W },
    aim(shoulder, hand, pole) {
      S.set(...shoulder); Hv.set(...hand); d.subVectors(Hv, S); W.copy(Hv).addScaledVector(d, -0.07 / (d.length() || 1e-6));      // the wrist: a hand's length short of the hand's centre
      d.subVectors(W, S); let dd = d.length(); const reach = (upper + fore) * 0.97;
      if (dd > reach) { S.addScaledVector(d, (dd - reach) / dd); d.subVectors(W, S); dd = d.length(); }                            // out of reach: the body leans into it
      d.divideScalar(dd); const a = (upper * upper - fore * fore + dd * dd) / (2 * dd), h = Math.sqrt(Math.max(0, upper * upper - a * a));
      p.set(...pole); p.addScaledVector(d, -p.dot(d)); if (p.lengthSq() < 1e-6) p.set(0, -1, 0); p.normalize();
      E.copy(S).addScaledVector(d, a).addScaledVector(p, h);
      C.copy(E).multiplyScalar(2).addScaledVector(S, -0.5).addScaledVector(W, -0.5);                                               // the control point that makes the curve pass THROUGH the elbow at t = 0.5
      for (let i = 0; i <= RINGS; i++) {
        const u = i / RINGS, v = 1 - u;
        P.set(0, 0, 0).addScaledVector(S, v * v).addScaledVector(C, 2 * v * u).addScaledVector(W, u * u);
        Tn.set(0, 0, 0).addScaledVector(C, 1).addScaledVector(S, -1).multiplyScalar(2 * v).addScaledVector(W, 2 * u).addScaledVector(C, -2 * u).normalize();
        Nn.copy(p).addScaledVector(Tn, -p.dot(Tn)).normalize(); Bn.crossVectors(Tn, Nn);
        const rad = sleeveRadius(r, u);
        for (let k = 0; k <= SIDES; k++) { const ang = (k % SIDES) / SIDES * Math.PI * 2, j = i * (SIDES + 1) + k, ca = Math.cos(ang) * rad, sa = Math.sin(ang) * rad; pos.setXYZ(j, P.x + Nn.x * ca + Bn.x * sa, P.y + Nn.y * ca + Bn.y * sa, P.z + Nn.z * ca + Bn.z * sa); }
      }
      pos.needsUpdate = true; geo.computeVertexNormals();
      for (let i = 0; i <= RINGS; i++) { const j0 = i * (SIDES + 1), j1 = j0 + SIDES; nor.setXYZ(j0, (nor.getX(j0) + nor.getX(j1)) / 2, (nor.getY(j0) + nor.getY(j1)) / 2, (nor.getZ(j0) + nor.getZ(j1)) / 2); nor.setXYZ(j1, nor.getX(j0), nor.getY(j0), nor.getZ(j0)); }   // no lighting seam where the tube closes
      nor.needsUpdate = true;
      t.subVectors(W, E).normalize(); cuff.position.copy(W).addScaledVector(t, -0.01); cuff.quaternion.setFromUnitVectors(UP, t);   // a flared linen cuff over the wrist end of the sleeve
    },
  };
}
/** where a found weapon's two arms start (view space, metres from the eye) and which way each elbow bends */
const BODY = [{ shoulder: [0.3, -0.3, -0.12], pole: [0.45, -1, 0.25] }, { shoulder: [-0.3, -0.3, -0.12], pole: [-0.45, -1, 0.25] }];
/** a turned part (a haft with a swell and a knob, a barrel-shaped head): `prof` = [radius, y] points up the axis, spun into a lathe */
const lathe = (M, cell, prof, sides = 10) => M(new THREE.LatheGeometry(prof.map(([r, y]) => new THREE.Vector2(r, y)), sides), cell);
/** a hand closed round a haft (the haft runs through it along y; PT-019: the boxes of the first two versions read as 2x4s): four bare fingers, each a ring round the haft that is open on the player's side, the linen-wrapped back of the hand closing that side, and a thumb along the haft */
export const glove = (M) => {
  const g = new THREE.Group(), back = M(sphere(0.05, 8, 6), 8); back.scale.set(1.0, 0.95, 0.85); back.position.set(0, 0, 0.03); g.add(back);
  for (let i = -1.5; i <= 1.5; i++) {
    const ring = new THREE.Group(), tor = M(new THREE.TorusGeometry(0.041, 0.0125, 5, 12, Math.PI * 1.55), 9); tor.rotation.x = Math.PI / 2; ring.add(tor);
    ring.rotation.y = -0.725 * Math.PI; ring.position.y = i * 0.0225; g.add(ring);
  }
  const thumb = M(new THREE.CylinderGeometry(0.015, 0.013, 0.07, 6), 9); thumb.position.set(0.042, 0.03, 0.03); thumb.rotation.z = 0.15; g.add(thumb);
  const tip = M(sphere(0.015, 6, 4), 9); tip.position.set(0.044, 0.066, 0.03); g.add(tip);
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
  const tmp = new THREE.Vector3(), lunge = K.lunge ?? [0, -0.03, -0.05], arc = K.arc ?? [0, 0, 0], antic = K.antic ?? [0, -0.03, -0.03], Q = { ready: quatOf(K.ready.r), wind: quatOf(K.wind.r), hit: quatOf(K.hit.r), guard: quatOf(K.guard.r) }, q = new THREE.Quaternion(), qo = new THREE.Quaternion();      // the turn between two key poses is a slerp: a lerp of Euler angles swings a weapon through poses nobody authored
  return function anim(st) {
    let p = K.ready.p; q.copy(Q.ready);
    p = [p[0], p[1] + Math.sin((st.t ?? 0) * 1.5) * 0.004, p[2]];
    if ((st.guard ?? 0) > 0) { p = lerp3(p, K.guard.p, st.guard); q.slerp(Q.guard, st.guard); }
    if (st.a > 0 || st.b > 0) {
      p = lerp3(p, K.wind.p, st.a); q.slerp(Q.wind, st.a);
      const an = Math.sin(Math.PI * Math.min(1, st.a * 1.7)) * (1 - st.b);                                             // ANTICIPATION: first the weapon moves AGAINST the blow, then it is drawn back
      p = [p[0] + antic[0] * an, p[1] + antic[1] * an, p[2] + antic[2] * an];
      p = lerp3(p, K.hit.p, st.b); q.slerp(Q.hit, st.b);
      const ov = (FEEL[st.kind]?.over ?? 0.06) * Math.sin(Math.PI * (st.h ?? 0));                                         // OVERSHOOT: after the contact the weapon sinks past its hit pose and settles
      if (ov > 0) { for (let i = 0; i < 3; i++) p[i] += (K.hit.p[i] - K.wind.p[i]) * ov; qo.copy(Q.wind).slerp(Q.hit, 1 + ov); q.copy(qo); }
      p = lerp3(p, K.ready.p, st.c); q.slerp(Q.ready, st.c);
    }
    const strike = st.a > 0 || st.b > 0 ? st.b * (1 - st.c) : 0, bow = st.a > 0 || st.b > 0 ? Math.sin(Math.PI * st.b) * (1 - st.c) : 0;                // the body goes into the blow; the hand takes an arc, not a straight line
    p = [p[0] + lunge[0] * strike + arc[0] * bow, p[1] + lunge[1] * strike + arc[1] * bow, p[2] + lunge[2] * strike + arc[2] * bow];
    hold.position.set(...p); hold.quaternion.copy(q); hold.updateMatrix();
    arms.forEach((a, i) => { const B = BODY[i], sh = hands[i].shoulder ?? B.shoulder; tmp.set(...hands[i].at).applyMatrix4(hold.matrix); a.aim([sh[0] + lunge[0] * strike, sh[1] + lunge[1] * strike, sh[2] + lunge[2] * strike], [tmp.x, tmp.y, tmp.z], hands[i].pole ?? B.pole); });
  };
}
function holdRig(tex, build) {
  const { mat, sleeveMat, M } = kit(tex), g = new THREE.Group(), hold = new THREE.Group(); g.add(hold);
  const spec = build({ M, mat, sleeveMat, hold });                                                                          // { K, hands: [{ at, shoulder?, pole? }], hip }
  const arms = spec.hands.map(() => arm(M, sleeveMat)); arms.forEach((a) => { g.add(a.mesh); g.add(a.cuff); });
  const gloves = spec.hands.map((h) => { const gl = glove(M); gl.position.set(...h.at); if (h.rot) gl.rotation.set(...h.rot); hold.add(gl); return gl; });          // `rot`: a hand closed round a grip that does not run along the weapon's own y (the chainsaw's handles, PT-022)
  return { group: g, flash: null, sleeveMat, melee: true, anim: holdAnim(g, hold, spec.K, arms, spec.hands), adsY: 0, hold, gloves, arms, hands: spec.hands, hip: spec.hip };
}

export function makeBoatHook(tex) {
  return holdRig(tex, ({ M, hold }) => {
    const shaft = M(new THREE.CylinderGeometry(0.026, 0.03, 1.55, 8), 13); shaft.position.y = 0.4; hold.add(shaft);
    const grip = M(new THREE.CylinderGeometry(0.031, 0.031, 0.18, 8), 11); hold.add(grip);                                                 // rope-wrapped where the right hand sits
    const grip2 = M(new THREE.CylinderGeometry(0.031, 0.031, 0.16, 8), 11); grip2.position.y = 0.42; hold.add(grip2);                       // and where the left does
    const collar = M(new THREE.CylinderGeometry(0.045, 0.04, 0.16, 8), 12); collar.position.y = 1.2; hold.add(collar);                       // the iron socket
    const bend = M(new THREE.TorusGeometry(0.24, 0.032, 6, 16, Math.PI * 1.3), 12); bend.position.set(0, 1.36, -0.24); bend.rotation.set(0, Math.PI / 2, Math.PI * 0.35); hold.add(bend);      // the hook: a bend sweeping out and back
    const point = M(new THREE.ConeGeometry(0.022, 0.16, 6), 10); point.position.set(0, 1.22, -0.44); point.rotation.x = Math.PI / 2 + 0.2; hold.add(point);
    const tip = M(new THREE.ConeGeometry(0.026, 0.22, 6), 10); tip.position.y = 1.4; hold.add(tip);                                          // the spike on the end: a boat hook is also a pike
    return { K: {
      ready: { p: [0.28, -0.13, -0.5], r: [-1.15, 0.0, 0.12] }, wind: { p: [0.31, -0.12, -0.34], r: [-1.0, 0.0, 0.22] }, hit: { p: [0.16, -0.2, -0.78], r: [-1.35, 0.0, 0.1] }, guard: { p: [0.02, -0.09, -0.46], r: [-0.3, 0.0, 1.15] }, lunge: [0.0, -0.02, -0.1], antic: [0.0, -0.015, -0.05] },
      hands: [{ at: [0, 0, 0] }, { at: [0, 0.42, 0] }], hip: { pos: [0, 0, 0], scale: 1 } };
  });
}

export function makeMarlinspike(tex) {
  return holdRig(tex, ({ M, hold }) => {
    const grip = M(new THREE.CylinderGeometry(0.03, 0.034, 0.22, 8), 11); hold.add(grip);                                                    // a rope-wrapped grip
    const pommel = M(sphere(0.044, 8, 6), 12); pommel.position.y = -0.13; hold.add(pommel);
    const guard = M(new THREE.BoxGeometry(0.2, 0.028, 0.06), 12); guard.position.y = 0.13; hold.add(guard);
    const spike = M(new THREE.CylinderGeometry(0.006, 0.036, 0.7, 8), 10); spike.position.y = 0.5; hold.add(spike);                          // the spike: thick at the guard, a needle at the tip
    const fuller = M(new THREE.BoxGeometry(0.012, 0.55, 0.012), 10); fuller.position.set(0, 0.45, -0.032); hold.add(fuller);
    return { K: {
      ready: { p: [0.26, -0.1, -0.5], r: [-1.1, 0.0, 0.15] }, wind: { p: [0.29, -0.08, -0.3], r: [-1.05, 0.0, 0.4] }, hit: { p: [0.12, -0.12, -0.86], r: [-1.42, 0.0, 0.1] }, guard: { p: [0.02, -0.09, -0.46], r: [-0.3, 0.0, 1.1] }, lunge: [0.0, -0.02, -0.1], antic: [0.0, -0.01, -0.04] },
      hands: [{ at: [0, 0, 0] }], hip: { pos: [0, 0, 0], scale: 1 } };
  });
}

export function makeMallet(tex) {
  return holdRig(tex, ({ M, hold }) => {
    const handle = M(new THREE.CylinderGeometry(0.03, 0.036, 1.05, 8), 13); handle.position.y = 0.38; hold.add(handle);
    const grip = M(new THREE.CylinderGeometry(0.034, 0.034, 0.2, 8), 11); grip.position.y = -0.02; hold.add(grip);
    const knob = M(sphere(0.042, 8, 6), 13); knob.position.y = -0.13; hold.add(knob);
    const head = lathe(M, 14, [[0.0, -0.18], [0.082, -0.18], [0.102, -0.158], [0.108, -0.12], [0.11, 0.0], [0.108, 0.12], [0.102, 0.158], [0.082, 0.18], [0.0, 0.18]], 14); head.rotation.x = Math.PI / 2; head.position.y = 0.92; hold.add(head);      // the bronze head: a barrel with chamfered faces. Its axis runs along local z, which lies IN the plane the swing turns in (the swing is a rotation about x), so a blow lands with an END FACE (PT-021: it was laid along x, the swing's own axis, and struck with the curved side like a rolling pin)
    for (const s of [-1, 1]) { const band = M(new THREE.CylinderGeometry(0.113, 0.113, 0.04, 10), 12); band.rotation.x = Math.PI / 2; band.position.set(0, 0.92, s * 0.14); hold.add(band); const cap = M(new THREE.CylinderGeometry(0.078, 0.105, 0.03, 10), 12); cap.rotation.x = s * Math.PI / 2; cap.position.set(0, 0.92, s * 0.195); hold.add(cap); }
    const wedge = M(new THREE.BoxGeometry(0.03, 0.05, 0.05), 12); wedge.position.set(0, 1.06, 0); hold.add(wedge);                                   // the iron wedge that keeps the head on
    return { K: {                                                                                                                              // held up and back, brought DOWN over the top
      ready: { p: [0.28, -0.13, -0.52], r: [-0.95, 0.0, 0.12] }, wind: { p: [0.36, -0.12, -0.56], r: [0.2, 0.0, -0.25] }, hit: { p: [0.1, -0.22, -0.62], r: [-1.9, 0.0, 0.1] }, guard: { p: [0.02, -0.09, -0.5], r: [-0.35, 0.0, 1.2] }, arc: [0.04, 0.14, 0.0], lunge: [0.0, -0.06, -0.06], antic: [0.0, -0.08, -0.06] },
      hands: [{ at: [0, 0, 0] }, { at: [0, 0.27, 0] }], hip: { pos: [0, 0, 0], scale: 1 } };
  });
}

export function makeAxe(tex) {
  return holdRig(tex, ({ M, hold }) => {
    const haft = lathe(M, 13, [[0.0, -0.135], [0.03, -0.128], [0.043, -0.1], [0.04, -0.075], [0.03, -0.05], [0.027, -0.02], [0.033, 0.04], [0.035, 0.11], [0.03, 0.2], [0.027, 0.4], [0.026, 0.6], [0.034, 0.685], [0.0, 0.7]], 10); hold.add(haft);        // a turned ash haft: a knob, a neck, a swell where the hands sit, a flare under the head
    const grip = M(new THREE.CylinderGeometry(0.0355, 0.0355, 0.17, 10), 11); grip.position.y = 0.03; hold.add(grip);                                    // cord-wrapped where the hands sit
    const cap = M(new THREE.CylinderGeometry(0.038, 0.04, 0.022, 10), 12); cap.position.y = -0.118; hold.add(cap);                                      // the iron butt cap
    // the head: a fire-axe profile (a poll behind, a bearded blade ahead), extruded and then drawn down to a wedge: thick at the eye, thin at the edge
    const sh = new THREE.Shape(); sh.moveTo(-0.07, -0.05); sh.lineTo(-0.07, 0.05); sh.lineTo(0.03, 0.05); sh.quadraticCurveTo(0.15, 0.075, 0.255, 0.175); sh.quadraticCurveTo(0.305, 0.0, 0.255, -0.2); sh.quadraticCurveTo(0.15, -0.09, 0.03, -0.05); sh.closePath();
    const headG = unitUV(new THREE.ExtrudeGeometry(sh, { depth: 0.046, bevelEnabled: true, bevelThickness: 0.006, bevelSize: 0.006, bevelSegments: 1 })); headG.translate(0, 0, -0.026); headG.rotateY(Math.PI / 2);   // shape x -> forward (-z), the extrusion across (x)
    { const pos = headG.attributes.position; for (let i = 0; i < pos.count; i++) { const fwd = -pos.getZ(i), t = Math.min(1, Math.max(0, (fwd - 0.03) / 0.26)); pos.setX(i, pos.getX(i) * (1 - 0.8 * t ** 1.4)); } pos.needsUpdate = true; headG.computeVertexNormals(); }
    const head = M(headG, 15); head.position.y = 0.66; hold.add(head);
    const pick = M(new THREE.ConeGeometry(0.026, 0.13, 6), 10); pick.position.set(0, 0.645, 0.125); pick.rotation.x = -Math.PI / 2 - 0.2; hold.add(pick);                          // the short pick on the back of the head, angled down
    const socket = M(new THREE.BoxGeometry(0.066, 0.115, 0.1), 12); socket.position.set(0, 0.66, -0.005); hold.add(socket);                                // the eye of the head, banded in iron
    return { K: {                                                                                                                              // raised over the right shoulder, swung across and down: the cleave
      ready: { p: [0.28, -0.13, -0.52], r: [-1.0, 0.0, 0.12, 0.7] }, wind: { p: [0.4, -0.16, -0.58], r: [-0.05, 0.0, -0.3, 0.5] }, hit: { p: [0.1, -0.2, -0.68], r: [-1.5, 0.0, 0.85, 0.3] }, guard: { p: [0.02, -0.09, -0.52], r: [-0.35, 0.0, 1.2, 0.7] }, arc: [0.06, 0.12, 0.0], lunge: [-0.02, -0.05, -0.08], antic: [0.03, -0.07, -0.05] },
      hands: [{ at: [0, 0, 0] }, { at: [0, 0.3, 0] }], hip: { pos: [0, 0, 0], scale: 1 } };
  });
}

/**
 * The shipwright's chainsaw (PT-022): authored with the guide bar along +y like every found weapon (so the key poses read the same), a housing of fire-service red enamel behind it, a rear grip that runs along z (which is UP once the saw is carried
 * level) and a top handle along x. The chain is two sets of teeth in turns: at rest both show, running the view flips between them every frame so the chain seems to travel (and a faint blur sweeps the bar). `st.saw` = { spin 0..1, heat 0..1, stall (s), eng }
 * from the sim's player; a running saw shakes in the hands, a hot one smokes (the view), a stalled one hangs dead.
 */
export function makeChainsaw(tex) {
  const parts = {};
  const rig = holdRig(tex, ({ M, hold }) => {
    const housing = M(new THREE.BoxGeometry(0.13, 0.32, 0.16), 15); housing.position.set(0, 0.12, 0); hold.add(housing);
    const cover = M(new THREE.BoxGeometry(0.11, 0.2, 0.05), 12); cover.position.set(0, 0.1, 0.1); hold.add(cover);
    const tank = M(new THREE.BoxGeometry(0.1, 0.1, 0.06), 12); tank.position.set(0, -0.0, -0.1); hold.add(tank);
    const rear = M(new THREE.CylinderGeometry(0.022, 0.022, 0.2, 8), 13); rear.rotation.x = Math.PI / 2; rear.position.set(0, -0.12, 0.02); hold.add(rear);                       // the rear grip, along z
    const wrap = M(new THREE.CylinderGeometry(0.0235, 0.0235, 0.08, 8), 11); wrap.rotation.x = Math.PI / 2; wrap.position.set(0, -0.12, 0.02); hold.add(wrap);
    for (const s of [-1, 1]) { const strut = M(new THREE.BoxGeometry(0.02, 0.1, 0.02), 12); strut.position.set(0, -0.07, 0.02 + s * 0.095); hold.add(strut); }
    const top = M(new THREE.CylinderGeometry(0.02, 0.02, 0.19, 8), 13); top.rotation.z = Math.PI / 2; top.position.set(0, 0.19, 0.17); hold.add(top);                                // the top handle, along x
    for (const s of [-1, 1]) { const post = M(new THREE.BoxGeometry(0.02, 0.02, 0.12), 12); post.position.set(s * 0.085, 0.19, 0.11); hold.add(post); }
    const guard = M(new THREE.BoxGeometry(0.15, 0.022, 0.1), 12); guard.position.set(0, 0.3, 0.07); hold.add(guard);                                                              // the front hand guard
    const bar = M(new THREE.BoxGeometry(0.016, 0.62, 0.052), 10); bar.position.set(0, 0.6, 0); hold.add(bar);                                                                    // the guide bar: forged steel
    const tip = M(new THREE.CylinderGeometry(0.026, 0.026, 0.016, 12), 10); tip.rotation.z = Math.PI / 2; tip.position.set(0, 0.91, 0); hold.add(tip);
    const sprocket = M(new THREE.CylinderGeometry(0.03, 0.03, 0.03, 10), 12); sprocket.rotation.z = Math.PI / 2; sprocket.position.set(0, 0.3, 0); hold.add(sprocket);
    // the chain: teeth round the bar's edge, 32 of them in two interleaved sets
    const teeth = [[], []]; const N = 32, topZ = 0.032, y0 = 0.3, y1 = 0.91, r = topZ, len = 2 * (y1 - y0) + 2 * Math.PI * r;
    for (let i = 0; i < N; i++) {
      let d = i / N * len, y, z;
      if (d < y1 - y0) { y = y0 + d; z = topZ; } else if ((d -= y1 - y0) < Math.PI * r) { const a = d / r; y = y1 + Math.sin(a) * r; z = Math.cos(a) * r; } else if ((d -= Math.PI * r) < y1 - y0) { y = y1 - d; z = -topZ; } else { const a = (d - (y1 - y0)) / r; y = y0 - Math.sin(a) * r; z = -Math.cos(a) * r; }
      const t = atlas(new THREE.BoxGeometry(0.03, 0.026, 0.016), 12); t.translate(0, y, z); teeth[i % 2].push(t);
    }
    const mats = [teeth[0], teeth[1]].map((set) => { const m = new THREE.Mesh(mergeGeometries(set), new THREE.MeshLambertMaterial({ map: tex, emissive: 0x1c1610 })); hold.add(m); return m; });
    parts.chainA = mats[0]; parts.chainB = mats[1];
    const blur = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.66, 0.085), new THREE.MeshBasicMaterial({ color: 0xcfd6d8, transparent: true, opacity: 0, depthWrite: false })); blur.position.set(0, 0.61, 0); blur.visible = false; hold.add(blur); parts.blur = blur;
    return { K: {
      ready: { p: [0.3, -0.27, -0.36], r: [-1.2, 0.0, 0.5] }, wind: { p: [0.42, -0.22, -0.3], r: [-1.15, 0.0, -0.3] }, hit: { p: [0.06, -0.27, -0.5], r: [-1.3, 0.0, 0.95] }, guard: { p: [0.3, -0.27, -0.36], r: [-1.2, 0.0, 0.5] }, lunge: [0.0, -0.02, -0.08], antic: [0.02, -0.01, -0.03] },
      hands: [{ at: [0, -0.12, 0.02], rot: [Math.PI / 2, 0, 0] }, { at: [0, 0.19, 0.17], rot: [0, 0, -Math.PI / 2] }], hip: { pos: [0, 0, 0], scale: 1 } };
  });
  const base = rig.anim;
  rig.anim = (st) => {
    const S = st.saw ?? {}, spin = S.spin ?? 0, dead = (S.stall ?? 0) > 0, t = st.t ?? 0, run = spin > 0.05 && !dead, flip = Math.floor(t * 60) % 2 === 0;
    base(st);
    const k = 0.0035 * spin + (S.eng ? 0.0025 : 0);                                                                                                  // a running saw shakes in the hands; one that is cutting shakes harder
    if (k > 0) { rig.hold.position.x += Math.sin(t * 93) * k; rig.hold.position.y += Math.sin(t * 117 + 1) * k + 0.012 * spin; rig.hold.position.z += Math.sin(t * 71 + 2) * k; }
    if (dead) rig.hold.position.y -= 0.03;                                                                                                          // hanging dead
    parts.chainA.visible = !run || flip; parts.chainB.visible = !run || !flip; parts.blur.visible = run && spin > 0.6; parts.blur.material.opacity = 0.32 * spin;
  };
  return rig;
}

export const MELEE_MAKERS = { fists: makeFists, boathook: makeBoatHook, marlinspike: makeMarlinspike, mallet: makeMallet, axe: makeAxe, chainsaw: makeChainsaw };

/** a found weapon lying on the floor (the same model, small, lying flat, with a glint): for maps that place one */
export function makePickupMelee(kind, tex) {
  const id = kind.replace(/^weapon_/, ''), make = MELEE_MAKERS[id]; const g = new THREE.Group(); if (!make) return g;
  const rig = make(tex); rig.anim({ a: 0, b: 0, c: 0, t: 0 }); const m = rig.hold ?? rig.group; for (const gl of rig.gloves ?? []) gl.parent?.remove(gl); m.position.set(0, 0.14, 0); m.rotation.set(Math.PI / 2, 0, 0); m.scale.setScalar(0.5); g.add(m);      // the weapon alone, lying flat: not the forearms and gloves of the first-person rig
  const glow = new THREE.Mesh(new THREE.IcosahedronGeometry(0.05, 0), new THREE.MeshBasicMaterial({ color: 0xffe08a })); glow.position.y = 0.62; g.add(glow);
  return g;
}
