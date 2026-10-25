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

/** the hand lantern (PT-038, E5): a brass cage round a glowing core, a ring handle, seen small at the lower left of the weapon view; `glow` is the core's material so the view can dim it with the oil */
export function makeHandLantern() {
  const g = new THREE.Group(), brass = lam({ color: 0xb08a3c, emissive: 0x1c1408 }), core = new THREE.MeshBasicMaterial({ color: 0xffdca0 });
  g.add(cyl(0.07, 0.085, 0.03, 8, brass, 0, -0.1, 0), cyl(0.045, 0.075, 0.05, 8, brass, 0, 0.115, 0));
  const top = new THREE.Mesh(new THREE.ConeGeometry(0.075, 0.07, 8), brass); top.position.y = 0.17; g.add(top);
  for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2, bar = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.2, 0.012), brass); bar.position.set(Math.sin(a) * 0.065, 0.005, Math.cos(a) * 0.065); g.add(bar); }
  const flame = new THREE.Mesh(new THREE.IcosahedronGeometry(0.045, 1), core); flame.position.y = 0.01; g.add(flame);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.045, 0.007, 4, 10, Math.PI), brass); ring.position.y = 0.2; g.add(ring);
  g.userData.core = core; g.userData.flame = flame; return g;
}

/** a tin of lamp oil on the floor: a squat brass-red can with a spout and a glint (the pickup for the lantern) */
export function makePickupOil() {
  const g = new THREE.Group(), tin = lam({ color: 0xa0482c, emissive: 0x1c0a06 }), cap = lam({ color: 0xc9a24a, emissive: 0x1a1406 });
  g.add(cyl(0.11, 0.12, 0.2, 8, tin, 0, 0.1, 0), cyl(0.04, 0.05, 0.05, 6, cap, 0, 0.225, 0));
  const spout = new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.1, 5), cap); spout.position.set(0.1, 0.18, 0); spout.rotation.z = -1.1; g.add(spout);
  const glint = new THREE.Mesh(new THREE.IcosahedronGeometry(0.03, 0), new THREE.MeshBasicMaterial({ color: 0xffd488 })); glint.position.y = 0.46; g.add(glint);
  return g;
}

/** a heavy ammunition crate (FREEZE F8): a timber box with two brass straps and a hazard-orange band round its middle, a marker of warm light above it so it reads from across a hall; bigger than any single box, so it looks like what it is */
export function makePickupCrate() {
  const g = new THREE.Group(), wood = lam({ color: 0x6a4a2c, emissive: 0x140c06 }), lid = lam({ color: 0x4e3620, emissive: 0x0e0804 }), brass = lam({ color: 0xb08a3c, emissive: 0x1c1408 }), band = lam({ color: 0xd2641e, emissive: 0x30140a });
  g.add(box(0.56, 0.3, 0.34, wood, 0, 0.15, 0), box(0.6, 0.05, 0.38, lid, 0, 0.325, 0), box(0.565, 0.055, 0.345, band, 0, 0.2, 0));
  for (const x of [-0.18, 0.18]) g.add(box(0.05, 0.34, 0.36, brass, x, 0.17, 0));
  const glint = new THREE.Mesh(new THREE.IcosahedronGeometry(0.035, 0), new THREE.MeshBasicMaterial({ color: 0xffb060 })); glint.position.y = 0.5; g.add(glint);
  return g;
}

/** a Vael city built into the wall of a cavern (scenery, PT-039, Act B): five terraces of pale stone houses stepped up a cliff 26 m wide and 20 m tall, a window or two lit amber in every house, a bridge of gold lamps between the terraces, a dark mouth of a stair in the middle. Faces +z. The windows are a deterministic pattern (no random stream). */
export function makeCityFace() {
  const g = new THREE.Group(), stone = lam({ color: 0x9a927e, emissive: 0x0e0c08 }), dark = lam({ color: 0x241e1c }), win = bas({ color: 0xffc060 }), lamp = bas({ color: 0xffe0a0 }), cliff = lam({ color: 0x1c2234 });
  g.add(box(30, 22, 2.4, cliff, 0, 11, -1.6));
  const h = (i, j) => { const v = Math.sin(i * 12.9898 + j * 78.233) * 43758.5453; return v - Math.floor(v); };
  for (let t = 0; t < 5; t++) {
    const y0 = t * 3.8, n = 8 - (t % 2), w = 26 / n - 0.4;
    for (let i = 0; i < n; i++) {
      const x = -13 + (i + 0.5) * (26 / n), hh = 2.2 + h(t, i) * 1.7, dd = 1.4 + h(i, t) * 1.2;
      g.add(box(w, hh, dd, stone, x, y0 + hh / 2, 0.3 + dd / 2 - 1.2)); g.add(box(w * 0.5, 0.35, dd + 0.2, dark, x, y0 + hh + 0.17, 0.3 + dd / 2 - 1.2));
      const nw = 1 + Math.floor(h(i + 3, t) * 3); for (let k = 0; k < nw; k++) g.add(box(0.5, 0.7, 0.1, win, x - w / 2 + 0.7 + k * (w - 1.4) / Math.max(1, nw - 1 || 1) * (nw > 1 ? 1 : 0.5), y0 + hh * 0.55, 0.3 + dd - 1.18));
    }
    for (let i = 0; i < 9; i++) { const b = new THREE.Mesh(new THREE.SphereGeometry(0.16, 5, 4), lamp); b.position.set(-12 + i * 3, y0 + 3.55, 0.9); g.add(b); }
  }
  g.add(box(2.4, 6, 0.3, dark, 0, 3, 1.0));
  return g;
}
/** a stand of stalactites hanging from a cavern roof (scenery, PT-039): nine cones of wet stone, 1 to 5 m long, hung from y = 0 downward in a cluster 8 m across; place it at the roof's height */
export function makeHangRock() {
  const g = new THREE.Group(), rock = lam({ color: 0x2a3248, emissive: 0x06080c });
  for (let i = 0; i < 9; i++) { const a = i * 2.4, r = 1 + (i % 4) * 1.1, len = 1.2 + ((i * 37) % 10) * 0.42, c = new THREE.Mesh(new THREE.ConeGeometry(0.35 + (i % 3) * 0.18, len, 6), rock); c.rotation.x = Math.PI; c.position.set(Math.cos(a) * r, -len / 2, Math.sin(a) * r); g.add(c); }
  return g;
}

/** the mass at the heart of the Deep (scenery, PT-039): a cluster of swollen red-violet lumps hung from the roof by a stem of vein, 9 m tall, with a pale glowing core and a ring of smaller sacs: static (the look's light does the pulsing) */
export function makeHeartMass() {
  const g = new THREE.Group(), flesh = lam({ color: 0xa03468, emissive: 0x3a0c24 }), dark = lam({ color: 0x5a1a3a, emissive: 0x1a0610 }), core = bas({ color: 0xffb0dc }), vein = lam({ color: 0xc85088, emissive: 0x401428 });
  const lump = (r, x, y, z, m, sy = 1) => { const o = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 1), m); o.position.set(x, y, z); o.scale.y = sy; return o; };
  g.add(lump(2.9, 0, 3.4, 0, flesh, 1.15)); g.add(lump(2.0, 2.5, 2.4, 1.0, dark)); g.add(lump(1.9, -2.4, 2.6, -1.2, dark)); g.add(lump(1.7, 0.8, 6.0, 0.6, flesh)); g.add(lump(1.4, -1.6, 5.2, 1.6, flesh)); g.add(lump(1.2, 0, 3.4, 2.7, core));
  for (let i = 0; i < 6; i++) { const a = i * 1.05 + 0.3; g.add(lump(0.7, Math.cos(a) * 3.1, 1.2 + (i % 3) * 0.9, Math.sin(a) * 3.1, i % 2 ? dark : flesh)); }
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 1.3, 12, 8), vein); stem.position.set(0, 13, 0); g.add(stem);                               // the stem it hangs by, a single thick vein to the roof
  for (let i = 0; i < 4; i++) { const a = i * 1.57 + 0.4, c = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.35, 11, 6), vein); c.position.set(Math.cos(a) * 1.1, 12.2, Math.sin(a) * 1.1); g.add(c); }
  return g;
}

// ---- PT-043 (the Preview): the scenery of Acts C and D. Plain primitives in plain materials, as the rest of this file; all of it far off and never collided with ----------------------------------------------------------------------------------------
/** the Hive tower (scenery, 46 m): a tapering organ-tower of dark violet-red in six stacked drums, a band of amber light round each, bone ribs standing out of it, and a crown of six curved horns round a red core; the Hive's own landmark in every Act C sky */
export function makeHiveTower() {
  const g = new THREE.Group(), body = lam({ color: 0x4a1830, emissive: 0x14060e }), bone = lam({ color: 0xd8ccb0, emissive: 0x1c1810 }), amber = bas({ color: 0xffa83c }), core = bas({ color: 0xff5a44 });
  let y = 0; for (let i = 0; i < 6; i++) { const r0 = 5.2 - i * 0.72, r1 = r0 - 0.6, h = 7.2 - i * 0.4; g.add(cyl(r1, r0, h, 10, body, 0, y + h / 2, 0)); g.add(cyl(r1 + 0.12, r1 + 0.12, 0.5, 10, amber, 0, y + h + 0.1, 0)); for (let k = 0; k < 6; k++) { const a = k * 1.047 + i * 0.4; g.add(box(0.5, h * 0.9, 0.5, bone, Math.cos(a) * (r0 + 0.1), y + h / 2, Math.sin(a) * (r0 + 0.1))); } y += h + 0.2; }
  const sp = new THREE.Mesh(new THREE.SphereGeometry(1.6, 8, 6), core); sp.position.y = y + 1.2; g.add(sp);
  for (let k = 0; k < 6; k++) { const a = k * 1.047; const h = new THREE.Mesh(new THREE.ConeGeometry(0.5, 7, 5), bone); h.position.set(Math.cos(a) * 2.3, y + 3.6, Math.sin(a) * 2.3); h.rotation.z = -Math.cos(a) * 0.35; h.rotation.x = Math.sin(a) * 0.35; g.add(h); }
  return g;
}
/** a ganglion (scenery, 12 m): five swollen lumps of pink-violet flesh joined by thick cords, a bright bead on every knot, hung over a dark stalk: a node of the Hive's nerves */
export function makeGanglion() {
  const g = new THREE.Group(), flesh = lam({ color: 0xa03468, emissive: 0x3a0c24 }), dark = lam({ color: 0x4a1430, emissive: 0x14040c }), cord = lam({ color: 0xc85088, emissive: 0x2a0818 }), bead = bas({ color: 0xffc0e0 });
  const lump = (r, x, y, z, m) => { const o = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 1), m); o.position.set(x, y, z); return o; };
  g.add(cyl(0.8, 1.4, 5, 7, dark, 0, 2.5, 0)); g.add(lump(2.6, 0, 6.6, 0, flesh)); g.add(lump(1.8, 3.2, 7.4, 0.6, dark)); g.add(lump(1.7, -3, 7.6, -0.8, dark)); g.add(lump(1.5, 1, 9.6, 1.2, flesh)); g.add(lump(1.4, -1.4, 9.2, -1.4, flesh));
  for (const [x, y, z, a] of [[1.6, 7, 0.3, -0.9], [-1.5, 7.1, -0.4, 0.9], [0.5, 8.4, 0.6, 0.2]]) { const c = cyl(0.22, 0.28, 3.4, 5, cord, x, y, z); c.rotation.z = a; g.add(c); }
  for (let i = 0; i < 7; i++) { const b = new THREE.Mesh(new THREE.SphereGeometry(0.3, 5, 4), bead); b.position.set(Math.cos(i * 0.9) * 2.6, 6.6 + (i % 3) * 1.4, Math.sin(i * 0.9) * 2.6); g.add(b); }
  return g;
}
/** a reactor stack (scenery, 18 m): a copper drum on a stone footing with rows of orange ports, horizontal pipes round it, a chimney with a plume of heat at the top */
export function makeReactor() {
  const g = new THREE.Group(), cu = lam({ color: 0x9a5a2a, emissive: 0x2a1204 }), dk = lam({ color: 0x3a2418 }), port = bas({ color: 0xff9a30 }), heat = bas({ color: 0xffd070 });
  g.add(cyl(5.6, 6.2, 2, 10, dk, 0, 1, 0)); g.add(cyl(4.4, 4.6, 12, 12, cu, 0, 8, 0));
  for (let r = 0; r < 3; r++) for (let k = 0; k < 8; k++) { const a = k * 0.785 + r * 0.39, p = new THREE.Mesh(new THREE.SphereGeometry(0.42, 5, 4), port); p.position.set(Math.cos(a) * 4.5, 4.4 + r * 3.4, Math.sin(a) * 4.5); g.add(p); }
  for (const y of [5, 9, 13]) g.add(cyl(4.8, 4.8, 0.35, 12, dk, 0, y, 0));
  g.add(cyl(1.2, 1.7, 5, 8, dk, 0, 16.5, 0)); const h = new THREE.Mesh(new THREE.ConeGeometry(1.4, 4, 6), heat); h.position.y = 20.5; g.add(h);
  return g;
}
/** a trestle of rails (scenery, 44 m long): two iron rails on a row of stone piers, sleepers across them, running off into the dark along +z; the Vein Rail's viaduct seen from outside */
export function makeRails() {
  const g = new THREE.Group(), iron = lam({ color: 0x5a5e68, emissive: 0x0a0a0c }), stone = lam({ color: 0x6a5a58 }), tie = lam({ color: 0x2a2020 });
  for (const x of [-0.9, 0.9]) g.add(box(0.2, 0.3, 44, iron, x, 6.1, 0));
  for (let i = 0; i < 22; i++) { g.add(box(2.6, 0.2, 0.4, tie, 0, 5.85, -20 + i * 2)); if (i % 3 === 0) g.add(box(2.4, 6, 1.4, stone, 0, 2.9, -20 + i * 2)); }
  return g;
}
/** a crystal tower (scenery, 30 m): a six-sided prism of pale blue glass tapering to a point, a brighter shaft in its heart, a base of broken facets: the copy of the Marrow lighthouse the Hive grew out of glass */
export function makeCrystalTower() {
  const g = new THREE.Group(), glass = new THREE.MeshLambertMaterial({ color: 0x9cd0ee, emissive: 0x1a3248, transparent: true, opacity: 0.78 }), heart = bas({ color: 0xe8f8ff });
  g.add(cyl(2.6, 3.4, 22, 6, glass, 0, 11, 0)); const tip = new THREE.Mesh(new THREE.ConeGeometry(2.6, 9, 6), glass); tip.position.y = 26.5; g.add(tip); g.add(cyl(0.5, 0.7, 26, 5, heart, 0, 13, 0));
  for (let k = 0; k < 7; k++) { const a = k * 0.9, f = new THREE.Mesh(new THREE.ConeGeometry(0.8 + (k % 3) * 0.4, 4 + (k % 4), 5), glass); f.position.set(Math.cos(a) * 4, 2, Math.sin(a) * 4); f.rotation.z = Math.cos(a) * 0.4; f.rotation.x = -Math.sin(a) * 0.4; g.add(f); }
  return g;
}
/** a root column (scenery, 16 m): a great black root hung from the roof of the world, a cone narrowing downward with four branches that curl away, a copper line along its length: the Bell's own roots, seen standing in the dark */
export function makeRootColumn() {
  const g = new THREE.Group(), root = lam({ color: 0x1e1812, emissive: 0x060402 }), cu = bas({ color: 0xb8742c });
  g.add(cyl(2.2, 0.5, 16, 8, root, 0, 8, 0)); const v = box(0.1, 15, 0.1, cu, 1.2, 8, 0); v.rotation.z = 0.06; g.add(v);
  for (let k = 0; k < 4; k++) { const a = k * 1.57 + 0.4, b = new THREE.Mesh(new THREE.ConeGeometry(0.5, 7, 5), root); b.position.set(Math.cos(a) * 2.6, 12 - k * 1.5, Math.sin(a) * 2.6); b.rotation.z = Math.cos(a) * 1.0; b.rotation.x = -Math.sin(a) * 1.0; g.add(b); }
  return g;
}
/** a shaft (scenery, 20 m): the well of the Descent seen from the side, a ring of dark stone 9 m across standing on its edge with a faint copper glow in its middle: where the stair goes down */
export function makeShaft() {
  const g = new THREE.Group(), stone = lam({ color: 0x2a2e2e, emissive: 0x040606 }), glow = new THREE.MeshBasicMaterial({ color: 0xff8a30, transparent: true, opacity: 0.35, side: THREE.DoubleSide });
  const ring = new THREE.Mesh(new THREE.TorusGeometry(4.5, 1.1, 6, 20), stone); ring.position.y = 6; g.add(ring); const d = new THREE.Mesh(new THREE.CircleGeometry(3.6, 20), glow); d.position.y = 6; g.add(d);
  g.add(box(2.4, 2, 2.4, stone, -5.4, 1, 0)); g.add(box(2.4, 2, 2.4, stone, 5.4, 1, 0));
  return g;
}
