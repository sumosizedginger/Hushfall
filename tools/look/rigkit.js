// Rig kit for the refined creature designs. A creature is built EXACTLY the way src/render/models.js builds the shipped ones, so a rig written here moves into src/render/models_choir.js in L1 with
// no change of shape: root (the view's world placement) > rig (everything a pose may change) > joints > primitives wearing ONE painted atlas through atlas(geom, cell); one Lambert material per
// creature (its emissive is the hit flash), one Basic teal material for glow; pose(p) writes only the rig; makeRigGrounder lifts the lowest vertex onto the contact plane.
// Contracts this kit keeps (checked by tools/look/check-rigs.mjs, which re-applies the project's own fairness and grounding rules to these rigs):
//   - a creature has ONE or TWO materials plus teal glow, because view.js merges a sleeping enemy into one mesh PER MATERIAL (mergeStatic keeps only position/normal/uv: vertex colour would be lost)
//   - ring/echo shells are never switched with `visible` (a merge would bake them in): they go to a vanishing scale when idle
import * as THREE from 'three';
import { atlas, makeRigGrounder } from '../../src/render/models.js';

/** the cell contract with tools/look/recipes_proto.js (and, in L1, tools/baker/recipes_choir.js) */
export const CELL = { skin: 0, bruise: 1, oil: 2, oilY: 3, bone: 4, nodal: 5, bronze: 6, bronzeDk: 7, verd: 8, memb: 9, membDk: 10, glass: 11, ox: 12, iron: 13, drum: 14, lamp: 15 };

export const ease = (t) => t * t * (3 - 2 * t);
export const clamp01 = (x) => Math.min(1, Math.max(0, x));

/** a bell: lathe profile from the crown (top) to the lip. `flare` > 1 flares the lower half harder. */
export function bellProfile(h, rTop, rLip, flare = 1.6, n = 9) {
  const pts = [];
  for (let i = 0; i <= n; i++) { const t = i / n, y = h * (1 - t), r = rTop + (rLip - rTop) * Math.pow(t, flare); pts.push(new THREE.Vector2(Math.max(0.001, r), y)); }
  return pts;
}

/**
 * makeCreature(atlasTex, build, pose, opts) -> { root, rig, pose, mat, J }   (the same shape as makeTollbearer / makeDroneGill: view.js and the tests use root, rig, pose, mat)
 *   build(R)        authors the joints and primitives (R below)
 *   pose(p, J, R)   p = { t, walk, phase, attack, lunge, dead, flash }; writes joints only
 *   opts.afterGround(p, J, R)  runs after the grounder (a flyer adds its hover here, exactly like models_e2.js)
 */
export function makeCreature(atlasTex, build, pose, opts = {}) {
  const mat = new THREE.MeshLambertMaterial({ map: atlasTex });
  const glow = new THREE.MeshBasicMaterial({ color: 0x3fffe0 });
  const echoMat = new THREE.MeshBasicMaterial({ color: 0x3fffe0, transparent: true, opacity: 0.4, depthWrite: false, side: THREE.BackSide });
  const root = new THREE.Group(), rig = new THREE.Group(); root.add(rig);
  const J = { rig }, echoes = [];
  const fit = (m, o = {}) => { if (o.pos) m.position.set(...o.pos); if (o.rot) m.rotation.set(...o.rot); if (o.scale) m.scale.set(...(Array.isArray(o.scale) ? o.scale : [o.scale, o.scale, o.scale])); return m; };
  const R = {
    mat, glow, echoMat, J, rig, root, echoes,
    /** a named joint (a Group) under `parent` (a joint name, or null = the rig) */
    joint(name, parent, pos = [0, 0, 0], rot) { const g = new THREE.Group(); g.position.set(...pos); if (rot) g.rotation.set(...rot); (parent ? J[parent] : rig).add(g); J[name] = g; return g; },
    /** any geometry on the atlas (cell) or on glow (cell = 'glow'); o: {pos, rot, scale, name} */
    prim(parent, geom, cell, o = {}) { const m = fit(new THREE.Mesh(cell === 'glow' ? geom : atlas(geom, cell), cell === 'glow' ? glow : (o.m ?? mat)), o); (parent ? J[parent] : rig).add(m); if (o.name) J[o.name] = m; return m; },
    cyl(parent, rt, rb, h, seg, cell, o) { return R.prim(parent, new THREE.CylinderGeometry(rt, rb, h, seg), cell, o); },
    cone(parent, r, h, seg, cell, o) { return R.prim(parent, new THREE.ConeGeometry(r, h, seg), cell, o); },
    box(parent, w, h, d, cell, o) { return R.prim(parent, new THREE.BoxGeometry(w, h, d), cell, o); },
    ico(parent, r, detail, cell, o) { return R.prim(parent, new THREE.IcosahedronGeometry(r, detail), cell, o); },
    sph(parent, r, ws, hs, cell, o) { return R.prim(parent, new THREE.SphereGeometry(r, ws, hs), cell, o); },
    lathe(parent, profile, seg, cell, o) { const m = R.prim(parent, new THREE.LatheGeometry(profile, seg), cell, o); m.userData.profile = profile; return m; },
    tor(parent, r, tube, rs, ts, cell, o) { return R.prim(parent, new THREE.TorusGeometry(r, tube, rs, ts), cell, o); },
    /** a two-segment limb hanging down from `name` (a joint at `pos` under `parent`): joint `name` (the hip/shoulder) and `name`+'M' (knee/elbow) */
    limb(parent, name, pos, { a, b, r0, r1, r2, cellA, cellB, seg = 7 }) {
      R.joint(name, parent, pos); R.joint(name + 'M', name, [0, -a, 0]);
      R.cyl(name, r0, r1, a, seg, cellA, { pos: [0, -a / 2, 0] }); R.cyl(name + 'M', r1 * 0.96, r2, b, seg, cellB ?? cellA, { pos: [0, -b / 2, 0] });
    },
    /** teal outline shells round a mesh (the RINGING tell): k copies of its geometry, each a little larger, hidden by a vanishing scale (never visible=false, see the top of this file) */
    echo(src, k = 2, step = 0.12) {
      const out = [];
      const pr = src.userData.profile, cheap = pr ? new THREE.LatheGeometry(pr.filter((_, i) => i % 3 === 0 || i === pr.length - 1), 8) : src.geometry;
      for (let i = 1; i <= k; i++) { const m = new THREE.Mesh(cheap, echoMat); m.position.copy(src.position); m.rotation.copy(src.rotation); m.userData.base = src.scale.clone().multiplyScalar(1 + i * step); m.scale.copy(m.userData.base).multiplyScalar(0.0001); src.parent.add(m); out.push(m); echoes.push(m); }
      return out;
    },
    /** drive a set of echo shells: amp 0 = vanished, 1 = full */
    ring(shells, amp) { for (const m of shells) { m.scale.copy(m.userData.base).multiplyScalar(amp > 0.02 ? 1 : 0.0001); } echoMat.opacity = 0.15 + 0.4 * clamp01(amp); },
  };
  build(R);
  root.traverse((o) => { if (o.isMesh) o.frustumCulled = true; });
  const ground = makeRigGrounder(root, rig, opts.maxLift ?? 3);
  function posed(p) {
    pose(p, J, R); ground(); opts.afterGround?.(p, J, R);
    const f = p.flash || 0; mat.emissive.setRGB(0.7 * f, 0.55 * f, 0.4 * f);
  }
  return { root, rig, pose: posed, mat, J };
}

/** walking, breathing and the arm-raise attack for any two-legged build (joints legA/legB (+M), armA/armB (+M), spine, head, jaw, hips), the same maths as the shipped Tollbearer: tells keep their timing */
export function humanoidPose(p, J, k = {}) {
  const w = p.walk, ph = p.phase, t = p.t, stoop = k.stoop ?? 0.2, hipY = k.hipY ?? 0.96, stride = k.stride ?? 0.65;
  const swing = Math.sin(ph) * stride * w;
  J.legA.rotation.x = swing; J.legB.rotation.x = -swing;
  J.legAM.rotation.x = 0.12 + Math.max(0, Math.cos(ph)) * 0.8 * w; J.legBM.rotation.x = 0.12 + Math.max(0, -Math.cos(ph)) * 0.8 * w;
  J.hips.position.y = hipY - 0.02 + Math.abs(Math.sin(ph)) * 0.035 * w;
  J.spine.rotation.x = stoop + 0.08 * w + Math.sin(t * 1.3) * 0.02; J.spine.rotation.z = (k.lean ?? 0) + Math.sin(ph) * 0.06 * w + Math.sin(t * 0.9) * 0.015; J.spine.rotation.y = -Math.sin(ph) * 0.12 * w;
  J.armA.rotation.x = -Math.sin(ph) * 0.4 * w + Math.sin(t * 1.1) * 0.05; J.armA.rotation.z = -0.08;
  J.armB.rotation.x = Math.sin(ph) * 0.4 * w + Math.sin(t * 1.3 + 1) * 0.05; J.armB.rotation.z = 0.08;
  J.armAM.rotation.x = -0.12 - 0.1 * w; J.armBM.rotation.x = -0.2;
  const a = p.attack;
  let raise = 0, slam = 0, rec = 0;
  if (a > 0) {
    raise = a < 0.55 ? ease(a / 0.55) : 1; slam = a < 0.55 ? 0 : ease(clamp01((a - 0.55) / 0.12)); rec = a < 0.7 ? 0 : ease(clamp01((a - 0.7) / 0.3));
    J.armB.rotation.x = -2.5 * raise + (2.6 * slam) * (1 - rec); J.armBM.rotation.x = -0.6 * raise * (1 - slam);
    J.spine.rotation.x += 0.35 * slam * (1 - rec) - 0.15 * raise * (1 - slam);
  }
  if (J.jaw) J.jaw.rotation.x = (k.jawOpen ?? 0.15) + (a > 0 ? 0.55 * raise : 0.1 * Math.sin(t * 2));
  if (J.head) { J.head.rotation.x = (k.headX ?? 0.35) + Math.sin(t * 0.8) * 0.04; J.head.rotation.z = (k.headZ ?? 0) + Math.sin(t * 0.6) * 0.05; }
  // death: topple backwards about the feet (the grounder rests it ON the floor)
  const d = ease(clamp01(p.dead)); J.rig.rotation.x = -d * 1.5 + (p.dead > 0.85 ? Math.sin((p.dead - 0.85) * 40) * 0.02 : 0);
  return { raise, slam, rec, d };
}
