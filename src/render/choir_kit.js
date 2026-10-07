// Rig kit for the refined creature designs. A creature is built EXACTLY the way src/render/models.js builds the shipped ones, so a rig written here moves into src/render/models_choir.js in L1 with
// no change of shape: root (the view's world placement) > rig (everything a pose may change) > joints > primitives wearing ONE painted atlas through atlas(geom, cell); one Lambert material per
// creature (its emissive is the hit flash), one Basic teal material for glow; pose(p) writes only the rig; makeRigGrounder lifts the lowest vertex onto the contact plane.
// Contracts this kit keeps (checked by tools/look/check-rigs.mjs, which re-applies the project's own fairness and grounding rules to these rigs):
//   - a creature has ONE or TWO materials plus teal glow, because view.js merges a sleeping enemy into one mesh PER MATERIAL (mergeStatic keeps only position/normal/uv: vertex colour would be lost)
//   - ring/echo shells are never switched with `visible` (a merge would bake them in): they go to a vanishing scale when idle
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { atlas, makeRigGrounder } from './models.js';

/** LatheGeometry faces OUTWARD only for a profile that ASCENDS in y (a crown-first profile built an inside-out shell: the first bells looked like funnels). Profiles may be written crown-first; they are turned round here, which also puts v = 1 (the TOP of an atlas cell) at the crown. */
/** turn a geometry inside out (reverse the winding, flip the normals): the INSIDE of a horn or a bowl, which a one-sided material would otherwise show as a hole */
function insideOut(g) { const ix = g.index; for (let i = 0; i < ix.count; i += 3) { const b = ix.getX(i + 1); ix.setX(i + 1, ix.getX(i + 2)); ix.setX(i + 2, b); } const n = g.attributes.normal; for (let i = 0; i < n.count; i++) n.setXYZ(i, -n.getX(i), -n.getY(i), -n.getZ(i)); return g; }
const ascending = (profile) => (profile[0].y > profile[profile.length - 1].y ? [...profile].reverse() : profile);

/**
 * Merge the meshes of one joint that share a material and are never driven by a pose into ONE mesh (a mesh is a draw call while a creature is awake: the first build of the Tollbearer was 47 of them).
 * Named parts (J[name], which a pose animates) and the echo shells stay as they are; everything else under the same parent joint keeps its place because each geometry is baked into that joint's local space.
 */
function mergeParts(rig, J, echoes) {
  const keep = new Set(echoes); for (const v of Object.values(J)) if (v?.isMesh) keep.add(v);
  const parents = []; rig.traverse((o) => { if (!o.isMesh) parents.push(o); });
  let before = 0, after = 0;
  for (const g of parents) {
    const buckets = new Map();
    for (const c of g.children) if (c.isMesh && !keep.has(c) && !Array.isArray(c.material)) { let b = buckets.get(c.material); if (!b) buckets.set(c.material, b = []); b.push(c); }
    for (const [material, meshes] of buckets) {
      before += meshes.length; if (meshes.length < 2) { after += meshes.length; continue; }
      const geoms = meshes.map((c) => { c.updateMatrix(); const gg = c.geometry.index ? c.geometry.toNonIndexed() : c.geometry.clone(); gg.applyMatrix4(c.matrix); for (const a of Object.keys(gg.attributes)) if (a !== 'position' && a !== 'normal' && a !== 'uv') gg.deleteAttribute(a); return gg; });
      const merged = mergeGeometries(geoms, false); if (!merged) { after += meshes.length; continue; }
      for (const c of meshes) { g.remove(c); c.geometry.dispose(); } geoms.forEach((x) => x.dispose());
      g.add(new THREE.Mesh(merged, material)); after += 1;
    }
  }
  return { before, after };
}

export const ease = (t) => t * t * (3 - 2 * t);
export const clamp01 = (x) => Math.min(1, Math.max(0, x));

/** an old trumpet-like bell profile (kept for the flared horns): crown (top) to lip, `flare` > 1 flares the lower half harder. */
export function bellProfile(h, rTop, rLip, flare = 1.6, n = 9) {
  const pts = [];
  for (let i = 0; i <= n; i++) { const t = i / n, y = h * (1 - t), r = rTop + (rLip - rTop) * Math.pow(t, flare); pts.push(new THREE.Vector2(Math.max(0.001, r), y)); }
  return pts;
}

/** a CHURCH bell: a domed crown, a straight waist, a flared lip (first real renders: the lathe of bellProfile read as a funnel / lampshade). Crown (top) to lip, open below. */
export function churchBell(h, rLip, { crown = 0.46, waist = 0.6 } = {}) {
  const P = [[0.001, 1], [crown * 0.55, 0.995], [crown, 0.955], [crown + 0.1, 0.86], [waist, 0.68], [waist + 0.07, 0.5], [0.8, 0.28], [0.93, 0.13], [1.0, 0.045], [1.0, 0.0]];
  return P.map(([r, y]) => new THREE.Vector2(Math.max(0.001, r * rLip), y * h));
}

/** a tapered curved tube through `pts` ([x,y,z] each) with a radius per point: tendons, ropes, tendrils, necks, curved limbs. Ends are closed by a radius of ~0. */
export function tubeGeom(pts, radii, seg = 6) {
  const P = pts.map((p) => new THREE.Vector3(...p)), n = P.length, rad = Array.isArray(radii) ? radii : P.map((_, i) => radii * (1 - 0.55 * i / (n - 1)));
  const pos = [], uv = [], idx = [];
  for (let i = 0; i < n; i++) {
    const t = (P[Math.min(n - 1, i + 1)].clone().sub(P[Math.max(0, i - 1)])).normalize();
    const ref = Math.abs(t.y) < 0.9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0), N = new THREE.Vector3().crossVectors(ref, t).normalize(), B = new THREE.Vector3().crossVectors(t, N);
    for (let s = 0; s <= seg; s++) { const a = (s / seg) * Math.PI * 2, c = Math.cos(a), sn = Math.sin(a); pos.push(P[i].x + (N.x * c + B.x * sn) * rad[i], P[i].y + (N.y * c + B.y * sn) * rad[i], P[i].z + (N.z * c + B.z * sn) * rad[i]); uv.push(s / seg, i / (n - 1)); }
  }
  for (let i = 0; i < n - 1; i++) for (let s = 0; s < seg; s++) { const a = i * (seg + 1) + s, b = a + seg + 1; idx.push(a, b, a + 1, b, b + 1, a + 1); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals(); return g;
}

/** a lumpy ball (flesh, fists, heads, sacs): a low-detail icosphere whose vertices are pushed in and out by a deterministic field (same position -> same push, so there are no cracks) */
export function lumpGeom(r, detail = 1, amp = 0.12, seed = 1) {
  const g = new THREE.IcosahedronGeometry(r, detail), p = g.attributes.position, v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i); const k = 1 + amp * (Math.sin(v.x * 9 / r + seed) + Math.sin(v.y * 11 / r + seed * 2.3) + Math.sin(v.z * 10 / r + seed * 3.7)) / 3;
    p.setXYZ(i, v.x * k, v.y * k, v.z * k);
  }
  g.computeVertexNormals(); return g;
}

/** a lathe with radial pleats (a coat, a robe, a bell-skirt): the radius is modulated by sin(k * angle), more towards the hem (`hem` = 0..1 how much stronger at the bottom) */
export function pleatGeom(profile, seg = 12, k = 5, amp = 0.06, hem = 0.7, phi) {
  const g = new THREE.LatheGeometry(ascending(profile), seg, phi ? phi[0] : 0, phi ? phi[1] : Math.PI * 2), p = g.attributes.position, ys = profile.map((q) => q.y), y0 = Math.min(...ys), y1 = Math.max(...ys);
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i), r = Math.hypot(x, z) || 1e-6, a = Math.atan2(z, x), low = 1 - (y - y0) / (y1 - y0 || 1), f = 1 + amp * Math.sin(k * a) * (1 - hem + hem * low);
    p.setXYZ(i, x * f, y, z * f);
  }
  g.computeVertexNormals(); return g;
}

/** a ragged cloth strip hanging from its top edge: tapers to a point-ish hem and bends in z along its length (tatters, ribbons, fringes). A closed thin box, so it shows from both sides. */
export function ragGeom(w, len, bend = 0.06, taper = 0.55, thick = 0.02) {
  const g = new THREE.BoxGeometry(w, len, thick, 1, 4, 1), p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { const y = p.getY(i), t = 0.5 - y / len; p.setXYZ(i, p.getX(i) * (1 - taper * t), y, p.getZ(i) + bend * t * t); }
  g.computeVertexNormals(); return g;
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
    /** a lathe; a profile written crown-first (top to bottom) gets its v flipped so the TOP of the atlas cell is the top of the part (paint dirt at the bottom of a cell) */
    lathe(parent, profile, seg, cell, o) { const g = new THREE.LatheGeometry(ascending(profile), seg); if (o?.inside) insideOut(g); const m = R.prim(parent, g, cell, o); m.userData.profile = profile; return m; },
    /** a pleated lathe: coats, robes (pleatGeom) */
    pleat(parent, profile, seg, k, amp, cell, o = {}) { const g = pleatGeom(profile, seg, k, amp, o.hem ?? 0.7, o.phi); const m = R.prim(parent, g, cell, o); m.userData.profile = profile; return m; },
    /** a church bell (churchBell profile) with its dark inside disc and lip ring; returns the bell mesh (echo-able) */
    bell(parent, h, rLip, cell, cellDk, o = {}) {
      const b = R.lathe(parent, churchBell(h, rLip, o.shape), o.seg ?? 10, cell, { pos: o.pos, rot: o.rot, scale: o.scale, name: o.name });
      R.prim(parent, new THREE.CylinderGeometry(rLip * 0.94, rLip * 0.94, 0.02, o.seg ?? 10), cellDk, { pos: [(o.pos?.[0] ?? 0), (o.pos?.[1] ?? 0) + 0.03, (o.pos?.[2] ?? 0)], rot: o.rot });
      return b;
    },
    /** a tapered curved tube through points; radii: a number (tapers) or an array per point */
    tube(parent, pts, radii, seg, cell, o) { return R.prim(parent, tubeGeom(pts, radii, seg), cell, o); },
    /** a lumpy ball */
    lump(parent, r, detail, amp, seed, cell, o) { return R.prim(parent, lumpGeom(r, detail, amp, seed), cell, o); },
    /** a hanging ragged strip */
    rag(parent, w, len, bend, taper, cell, o) { return R.prim(parent, ragGeom(w, len, bend, taper), cell, o); },
    tor(parent, r, tube, rs, ts, cell, o) { return R.prim(parent, new THREE.TorusGeometry(r, tube, rs, ts), cell, o); },
    /** a two-segment limb hanging down from `name` (a joint at `pos` under `parent`): joint `name` (the hip/shoulder) and `name`+'M' (knee/elbow) */
    limb(parent, name, pos, { a, b, r0, r1, r2, cellA, cellB, seg = 7 }) {
      R.joint(name, parent, pos); R.joint(name + 'M', name, [0, -a, 0]);
      R.cyl(name, r0, r1, a, seg, cellA, { pos: [0, -a / 2, 0] }); R.cyl(name + 'M', r1 * 0.96, r2, b, seg, cellB ?? cellA, { pos: [0, -b / 2, 0] });
    },
    /** teal outline shells round a mesh (the RINGING tell): k copies of its geometry, each a little larger, hidden by a vanishing scale (never visible=false, see the top of this file) */
    echo(src, k = 2, step = 0.12) {
      const out = [];
      const pr = src.userData.profile, cheap = pr ? new THREE.LatheGeometry(ascending(pr.filter((_, i) => i % 3 === 0 || i === pr.length - 1)), 8) : src.geometry;
      for (let i = 1; i <= k; i++) { const m = new THREE.Mesh(cheap, echoMat); m.position.copy(src.position); m.rotation.copy(src.rotation); m.userData.base = src.scale.clone().multiplyScalar(1 + i * step); m.scale.copy(m.userData.base).multiplyScalar(0.0001); src.parent.add(m); out.push(m); echoes.push(m); }
      return out;
    },
    /** drive a set of echo shells: amp 0 = vanished, 1 = full */
    ring(shells, amp) { for (const m of shells) { m.scale.copy(m.userData.base).multiplyScalar(amp > 0.02 ? 1 : 0.0001); } echoMat.opacity = 0.15 + 0.4 * clamp01(amp); },
  };
  build(R);
  const merged = mergeParts(rig, J, echoes);
  root.traverse((o) => { if (o.isMesh) o.frustumCulled = true; });
  const ground = makeRigGrounder(root, rig, opts.maxLift ?? 3);
  function posed(p) {
    pose(p, J, R); ground(); opts.afterGround?.(p, J, R);
    const f = p.flash || 0; mat.emissive.setRGB(0.7 * f, 0.55 * f, 0.4 * f);
  }
  return { root, rig, pose: posed, mat, J, merged };
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
