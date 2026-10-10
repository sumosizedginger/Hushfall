// Set dressing of Episode 3's second half (PT-029, PT-030): what makes the Loom, the Loft, the Foundry and the Throat read as different places even with the gun down. Static, merged into the level mesh like every other prop (levelmesh.js);
// plain primitives in plain materials, like models_g2.js. A pew (cover, 1.2 m), an organ case of pipes (a wall of bronze), a vat (the Foundry's green-lit cauldrons), the Loom's string frame (posts and taut gold cables).
import * as THREE from 'three';

const lam = (o) => new THREE.MeshLambertMaterial(o), bas = (o) => new THREE.MeshBasicMaterial(o);
const box = (w, h, d, m, x, y, z) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); o.position.set(x, y, z); return o; };
const cyl = (rt, rb, h, seg, m, x, y, z) => { const o = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), m); o.position.set(x, y, z); return o; };

/** a church pew: a seat, a high back, two carved ends, a kneeler; 1.7 m long along x */
export function makePew() {
  const g = new THREE.Group(), wood = lam({ color: 0x5a3519 }), dark = lam({ color: 0x2c190a }), brass = lam({ color: 0xc0882e, emissive: 0x241604 });
  g.add(box(1.7, 0.08, 0.5, wood, 0, 0.45, 0.02)); g.add(box(1.7, 0.85, 0.07, wood, 0, 0.9, -0.24)); g.add(box(1.5, 0.18, 0.18, dark, 0, 0.14, 0.4));
  for (const s of [-1, 1]) { g.add(box(0.09, 1.25, 0.62, dark, s * 0.85, 0.62, 0)); g.add(cyl(0.07, 0.07, 0.08, 6, brass, s * 0.85, 1.28, -0.2)); }
  return g;
}
/** an organ case: a dark carved base and nine bronze and bone pipes of different lengths, mouths cut in them; `cy` is the room's height (the pipes stop below it) */
export function makeOrgan(cy = 4) {
  const g = new THREE.Group(), dark = lam({ color: 0x24150a }), bronze = lam({ color: 0xc08a34, emissive: 0x2a1806 }), bone = lam({ color: 0xe0d2a8 }), mouth = lam({ color: 0x0a0503 }), glow = bas({ color: 0xffe098 });
  g.add(box(2.3, 0.7, 1.0, dark, 0, 0.35, 0)); g.add(box(2.1, 0.12, 0.9, bronze, 0, 0.74, 0));
  const hs = [2.0, 2.5, 2.9, 3.2, 3.4, 3.2, 2.9, 2.5, 2.0];
  hs.forEach((h0, i) => { const h = Math.min(h0, cy - 0.5), x = -1.0 + i * 0.25, r = 0.1 + 0.02 * (4 - Math.abs(i - 4)) / 4; g.add(cyl(r, r * 1.1, h, 7, i % 2 ? bone : bronze, x, 0.74 + h / 2, 0)); g.add(box(r * 1.4, 0.2, 0.05, mouth, x, 1.35 + (i % 3) * 0.12, r * 1.05)); g.add(new THREE.Mesh(new THREE.SphereGeometry(0.045, 4, 3), glow)).position.set(x, 0.78 + h, 0); });
  return g;
}
/** the Foundry's vat: an iron cauldron with a bronze rim, a green-gold surface that glows, two pipes up the side */
export function makeVat() {
  const g = new THREE.Group(), iron = lam({ color: 0x1c2620 }), rim = lam({ color: 0x4a5a46 }), pipe = lam({ color: 0x2a3a30 }), glow = bas({ color: 0xb0ff60 });
  g.add(cyl(0.98, 1.08, 1.15, 12, iron, 0, 0.58, 0)); const r = new THREE.Mesh(new THREE.TorusGeometry(0.98, 0.08, 5, 14), rim); r.rotation.x = Math.PI / 2; r.position.y = 1.15; g.add(r);
  const surf = new THREE.Mesh(new THREE.CircleGeometry(0.92, 14), glow); surf.rotation.x = -Math.PI / 2; surf.position.y = 1.1; g.add(surf);
  for (const s of [-1, 1]) { g.add(cyl(0.07, 0.07, 1.9, 5, pipe, s * 0.88, 1.0, -0.1)); g.add(cyl(0.1, 0.1, 0.12, 6, rim, s * 0.88, 1.98, -0.1)); }
  for (let i = 0; i < 4; i++) g.add(new THREE.Mesh(new THREE.SphereGeometry(0.07 + 0.02 * i, 4, 3), glow)).position.set(-0.4 + i * 0.28, 1.2 + (i % 2) * 0.05, 0.3 - i * 0.2);
  return g;
}
/** the Loom's string frame: two lacquered posts, seven taut gold cables between them at different heights, bobbins at the foot; `cy` is the room's height; 1.5 m wide along x */
export function makeLoomString(cy = 4) {
  const g = new THREE.Group(), lacquer = lam({ color: 0x2c2040 }), gold = lam({ color: 0xe8c860, emissive: 0x3a2c0a }), bronze = lam({ color: 0xa8782c });
  for (const s of [-1, 1]) { g.add(box(0.14, cy - 0.1, 0.14, lacquer, s * 0.75, (cy - 0.1) / 2, 0)); g.add(cyl(0.16, 0.16, 0.1, 8, bronze, s * 0.75, 0.9, 0)); g.add(cyl(0.16, 0.16, 0.1, 8, bronze, s * 0.75, cy - 0.7, 0)); }
  for (let i = 0; i < 7; i++) { const y = 0.55 + i * ((cy - 1.3) / 6); const c = cyl(0.014, 0.014, 1.5, 4, gold, 0, y, 0); c.rotation.z = Math.PI / 2; g.add(c); }
  for (const s of [-1, 1]) g.add(cyl(0.22, 0.26, 0.3, 8, bronze, s * 0.4, 0.15, 0.2));
  return g;
}
