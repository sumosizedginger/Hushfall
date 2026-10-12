// Set dressing of Campaign 2 (PT-037): what makes Anselm-Nine read as another world even with the gun down. Static, merged into the level mesh like every other prop (levelmesh.js); plain primitives in plain materials, as models_e3d.js.
import * as THREE from 'three';

const lam = (o) => new THREE.MeshLambertMaterial(o), bas = (o) => new THREE.MeshBasicMaterial(o);
const box = (w, h, d, m, x, y, z) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); o.position.set(x, y, z); return o; };
const cyl = (rt, rb, h, seg, m, x, y, z) => { const o = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), m); o.position.set(x, y, z); return o; };

/** a standing tuning-fork of the Tuning Fork Fields (the resonator): a stone footing, a brass handle and yoke, two tall tines tipped with verdigris, a bead of pale light where they meet. 1.8 m. */
export function makeFork() {
  const g = new THREE.Group(), stone = lam({ color: 0x7b7769 }), brass = lam({ color: 0xc89c48, emissive: 0x241804 }), verd = lam({ color: 0x6f8c58 }), glass = bas({ color: 0xa6f0e2 });
  g.add(cyl(0.34, 0.44, 0.24, 8, stone, 0, 0.12, 0));
  g.add(cyl(0.05, 0.075, 0.72, 6, brass, 0, 0.58, 0)); g.add(box(0.4, 0.08, 0.08, brass, 0, 0.96, 0));
  for (const s of [-1, 1]) { g.add(box(0.075, 0.82, 0.075, brass, s * 0.19, 1.37, 0)); g.add(box(0.1, 0.14, 0.1, verd, s * 0.19, 1.8, 0)); }
  const bead = new THREE.Mesh(new THREE.SphereGeometry(0.075, 6, 5), glass); bead.position.set(0, 1.04, 0); g.add(bead);
  return g;
}
