// Contact shadows (PT-035): the outside audits, and my own note since the first look assessment, "actors cast nothing": in a dark room a creature stood on the floor with nothing under it. One soft dark disc under every live creature,
// ONE instanced mesh (one draw call for all of them, a fixed number of triangles): three rings of a fan, darkest at the middle and gone at the rim (vertex alpha), laid on the floor the sim says the creature stands on. Render only: it reads the sim's
// position, floor and radius and never writes any of them. Dead bodies have their own pool (decals), a sleeper in a merged mesh still stands on the floor, so it still has its disc. A flyer's disc is smaller and fainter (it is higher above it).
import * as THREE from 'three';

export const SHADOW = { max: 96, segs: 14, radius: 1.4, alpha: 0.72, lift: 0.025 };            // (the first pass, 1.15 and 0.5, was lost in the value banding: a painted shadow has to be a plain, plainly darker patch)

/** the geometry of one unit disc: a centre and three rings, rgba vertex colours (rgb near black, alpha 0.72 at the centre, 0.58 at 0.6, 0 at the rim) */
export function shadowGeometry({ segs = SHADOW.segs, alpha = SHADOW.alpha } = {}) {
  const rings = [[0, alpha], [0.6, alpha * 0.8], [1, 0]], pos = [0, 0, 0], col = [0.02, 0.02, 0.035, rings[0][1]], idx = [];
  for (let r = 1; r < rings.length; r++) for (let i = 0; i < segs; i++) { const a = (i / segs) * Math.PI * 2; pos.push(Math.cos(a) * rings[r][0], 0, Math.sin(a) * rings[r][0]); col.push(0.02, 0.02, 0.035, rings[r][1]); }
  const at = (ring, i) => 1 + (ring - 1) * segs + (i % segs);
  for (let i = 0; i < segs; i++) idx.push(0, at(1, i + 1), at(1, i), at(1, i), at(1, i + 1), at(2, i + 1), at(1, i), at(2, i + 1), at(2, i));      // (counter-clockwise seen from above)
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 4)); g.setIndex(idx);
  return g;
}

export function makeShadows(max = SHADOW.max) {
  const mat = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2, side: THREE.DoubleSide });
  const mesh = new THREE.InstancedMesh(shadowGeometry(), mat, max); mesh.count = 0; mesh.frustumCulled = false; mesh.renderOrder = 2; mesh.name = 'contactShadows';
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), s = new THREE.Vector3();
  /** discs = [{ x, y, z, r, fade }] (the floor under each creature, its collision radius, 1 = on the ground, less = in the air); the nearest `max` are drawn by the caller's order */
  const update = (discs) => {
    const n = Math.min(max, discs.length);
    for (let i = 0; i < n; i++) { const d = discs[i], k = (d.r ?? 0.4) * SHADOW.radius * (d.fade ?? 1); p.set(d.x, d.y + SHADOW.lift, d.z); s.set(k, 1, k); m.compose(p, q, s); mesh.setMatrixAt(i, m); }
    mesh.count = n; mesh.instanceMatrix.needsUpdate = true; return n;
  };
  return { mesh, update };
}
