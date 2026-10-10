// Set dressing of Episode 4's dock (PT-033, Batch C): the Vael LIGHTER, a squat shuttle on its landing struts, parked in the Cold Dock's bays. Static, merged into the level mesh like every other prop (levelmesh.js); plain primitives in plain materials, like models_e3d.js.
import * as THREE from 'three';

const lam = (o) => new THREE.MeshLambertMaterial(o), bas = (o) => new THREE.MeshBasicMaterial(o);
const box = (w, h, d, m, x, y, z) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); o.position.set(x, y, z); return o; };

/** a lighter: a pale hull (a flattened capsule 3.4 m long, 2.2 m wide, 1.5 m high), a dark canopy at the bow, a cyan band, yellow chevrons, two nav lights, four struts; its nose is local +z */
export function makeLighter() {
  const g = new THREE.Group(), hull = lam({ color: 0xc4d2d6, emissive: 0x0c1214 }), dark = lam({ color: 0x1c2a30 }), cyan = bas({ color: 0x40b8d0 }), yel = lam({ color: 0xe8b81c, emissive: 0x2a2004 });
  const body = new THREE.Mesh(new THREE.SphereGeometry(1, 14, 10), hull); body.scale.set(1.1, 0.75, 1.7); body.position.y = 1.35; g.add(body);
  const canopy = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 8, 0, Math.PI * 2, 0, Math.PI / 2), dark); canopy.scale.set(0.7, 0.55, 0.9); canopy.position.set(0, 1.7, 0.85); g.add(canopy);
  g.add(box(2.24, 0.12, 0.5, cyan, 0, 1.3, -0.3)); g.add(box(2.1, 0.1, 0.5, yel, 0, 1.15, -1.1));
  for (const [x, z] of [[-0.8, -0.9], [0.8, -0.9], [-0.7, 1.0], [0.7, 1.0]]) g.add(box(0.14, 0.9, 0.14, dark, x, 0.45, z));
  g.add(box(0.2, 0.2, 0.2, bas({ color: 0xff3030 }), -1.18, 1.35, -0.2)); g.add(box(0.2, 0.2, 0.2, bas({ color: 0x30ff60 }), 1.18, 1.35, -0.2));
  return g;
}
