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

/** the Gate seen from the shore of Anselm-Nine (scenery, 21 m tall, its feet in the water): a ring of old gold on two black stone pylons, a thinner ring of white light inside it, and a pale disc between them, dim now: the door has shut. Faces +z (it is seen from the east). */
export function makeGateArch() {
  const g = new THREE.Group(), gold = lam({ color: 0xd8b062, emissive: 0x4a3410 }), black = lam({ color: 0x0e0c12 }), light = bas({ color: 0xfff0cc }), disc = new THREE.MeshBasicMaterial({ color: 0xd8c8a0, transparent: true, opacity: 0.22, side: THREE.DoubleSide, depthWrite: false });
  const ring = new THREE.Mesh(new THREE.TorusGeometry(10, 0.9, 8, 44), gold); ring.position.y = 10.4; g.add(ring);
  const inner = new THREE.Mesh(new THREE.TorusGeometry(9.1, 0.14, 4, 44), light); inner.position.y = 10.4; g.add(inner);
  const d = new THREE.Mesh(new THREE.CircleGeometry(9.1, 36), disc); d.position.y = 10.4; g.add(d);
  for (const s of [-1, 1]) { g.add(box(2.4, 6, 2.4, black, s * 9.2, 3, 0)); g.add(box(1.2, 3, 1.2, gold, s * 9.2, 6.8, 0)); }
  for (let i = 0; i < 9; i++) { const a = -0.9 + i * 0.225 + 1.35, rib = box(0.35, 3.4, 0.35, black, Math.cos(a) * 11.1, 10.4 + Math.sin(a) * 11.1, 0); rib.rotation.z = a - Math.PI / 2; g.add(rib); }        // ribs standing out of the ring's crown
  return g;
}
/** a Vael spire seen far off (scenery): a pale needle of glass on a dark foot, 30 m tall, with a bright bead near its tip */
export function makeSpire() {
  const g = new THREE.Group(), glass = lam({ color: 0xcfdcd8, emissive: 0x1a2220 }), dark = lam({ color: 0x2a2030 }), bead = bas({ color: 0xffe7b0 });
  g.add(cyl(0.9, 2.2, 3, 6, dark, 0, 1.5, 0)); g.add(cyl(0.1, 0.8, 27, 5, glass, 0, 16.5, 0));
  const b = new THREE.Mesh(new THREE.SphereGeometry(0.4, 5, 4), bead); b.position.y = 28.6; g.add(b);
  return g;
}

/** a grave of the Reliquary Road (the Vael keep the dead of every world they have sung): a low mound of pale grit with a slab stood on end at its head, a band of bronze across the slab, and (alternating) a bundle laid on the mound in the dead's own cloth. 1.1 m. */
export function makeGrave(variant = 0) {
  const g = new THREE.Group(), grit = lam({ color: 0xb8aa8c }), slab = lam({ color: 0x8a8a98 }), bronze = lam({ color: 0xb8863c, emissive: 0x20140a }), cloth = lam({ color: [0x7a2e22, 0x2e4a6a, 0xd0c8a8, 0x4a5a2c][variant % 4] });
  const mound = new THREE.Mesh(new THREE.SphereGeometry(0.62, 8, 5, 0, Math.PI * 2, 0, Math.PI / 2), grit); mound.scale.set(1, 0.34, 1.6); g.add(mound);
  g.add(box(0.5, 1.0, 0.1, slab, 0, 0.5, -0.78)); g.add(box(0.54, 0.09, 0.14, bronze, 0, 0.78, -0.78));
  if (variant % 2) { const b = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.2, 0.9, 6), cloth); b.rotation.z = Math.PI / 2; b.rotation.y = 0.1; b.position.set(0, 0.26, 0.15); g.add(b); }
  return g;
}

/** a colossal rib arching over a road (scenery): one half of a bone ring 11 m across and nearly 12 m tall, a hand's breadth of verdigris at its foot, set across the road (its plane faces +x / -x). */
export function makeRib() {
  const g = new THREE.Group(), bone = lam({ color: 0xe0d6bc, emissive: 0x181408 }), verd = lam({ color: 0x6a8a62 });
  const arc = new THREE.Mesh(new THREE.TorusGeometry(5.8, 0.55, 6, 24, Math.PI), bone); arc.position.y = 0.2; g.add(arc);
  for (const s of [-1, 1]) { g.add(cyl(0.8, 0.95, 1.4, 6, verd, s * 5.8, 0.7, 0)); }
  const mid = new THREE.Mesh(new THREE.TorusGeometry(5.8, 0.18, 4, 24, Math.PI), verd); mid.scale.set(0.86, 0.86, 1); mid.position.set(0, 0.2, 0.55); g.add(mid);
  return g;
}
