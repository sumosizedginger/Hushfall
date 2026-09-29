// Static-geometry merging: collapse many small meshes that share a material into one mesh per material (one draw call each).
// Only for things that never move (level props, scenery). Dynamic objects (doors, enemies, pickups) are left alone.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

/** Replace every mesh under `root` with merged meshes (world-space geometry, one per material). Lights and non-meshes are untouched. */
export function mergeStatic(root, { disposeSources = true, cull = false } = {}) {
  root.updateMatrixWorld(true);
  const buckets = new Map(), meshes = [];
  root.traverse((o) => { if (o.isMesh && !Array.isArray(o.material) && !o.userData.keep) meshes.push(o); });      // userData.keep = animated by the view; leave it alone
  for (const m of meshes) {
    const g = m.geometry.index ? m.geometry.toNonIndexed() : m.geometry.clone();
    g.applyMatrix4(m.matrixWorld);
    for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'normal' && k !== 'uv') g.deleteAttribute(k);
    if (!g.attributes.uv) g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
    let b = buckets.get(m.material); if (!b) buckets.set(m.material, b = []); b.push(g);
  }
  for (const m of meshes) { m.parent?.remove(m); if (disposeSources) m.geometry.dispose(); }
  const out = [];
  for (const [material, geoms] of buckets) {
    const merged = mergeGeometries(geoms, false); geoms.forEach((g) => g.dispose());
    if (!merged) continue;
    const mesh = new THREE.Mesh(merged, material); mesh.matrixAutoUpdate = false; mesh.frustumCulled = cull; out.push(mesh); root.add(mesh);
  }
  return out;
}
