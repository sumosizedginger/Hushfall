// A skyline for every level (design/VISUAL_AWE_PLAN.md, session A6). Forty-five of the sixty-eight maps had nothing above their walls: no tower, no
// chimney, no mast against the sky. Marrow Quay's tower is why its picture works. Here every map with open sky and little scenery of its own gets a
// ring of large dark shapes standing OUTSIDE its playable grid, chosen for the kind of place it is and placed by the map's own name (the same
// every time). They are silhouettes: plain dark bodies with a few lit windows or beads, no texture.
// Drawn only, never in or over the grid: they cannot touch play or hide a creature. `skylinePlan` is pure and tested; `makeSkylinePiece` builds.
import * as THREE from 'three';
import { hasOpenSky } from './sunshadow.js';

export const SKYLINE = Object.freeze({
  slots: 9, // pieces round the map
  clear: 20, // metres: the widest footing, turned any way, still lies outside the grid
  minOff: 4, // metres beyond that, at least
  maxOff: 30,
  minH: 13, // metres tall
  maxH: 38,
  landmark: 1.45, // the first piece is the landmark: this much taller
  authored: 3, // a map with this many scenery pieces of its own is left alone
});

/** the kind of place a map is, from its id: what stands on its horizon */
export function familyOf(id) {
  if (id.startsWith('C1E1')) return 'harbour';
  if (id.startsWith('C1E2')) return 'works';
  if (id.startsWith('C1E3')) return 'ship';
  if (id.startsWith('C1E4')) return 'gate';
  const n = /^C2M(\d+)/.exec(id)?.[1];
  if (n != null) return +n <= 8 ? 'shore' : +n <= 16 ? 'deep' : +n <= 24 ? 'hive' : 'root';
  return id === 'C2S01' ? 'deep' : id === 'C2S02' ? 'hive' : 'harbour';
}

export const FAMILIES = Object.freeze({
  harbour: { body: 0x241c2c, lit: 0xffc870, kinds: ['belltower', 'roofrow', 'masts', 'crane'] },
  works: { body: 0x38322c, lit: 0xff9a40, kinds: ['chimney', 'gantry', 'tank', 'roofrow'] },
  ship: { body: 0x2a2620, lit: 0x6ffff0, kinds: ['ribarch', 'pipes', 'fin'] },
  gate: { body: 0xcfcac0, lit: 0xffe7a0, kinds: ['pylon', 'gatearch', 'pylon', 'ring'] },
  shore: { body: 0x2a2030, lit: 0xffe7b0, kinds: ['needle', 'stones'] },
  deep: { body: 0x1c2028, lit: 0x6fe0d0, kinds: ['column', 'cityblock'] },
  hive: { body: 0x3a2418, lit: 0xffb050, kinds: ['pile', 'fin', 'pile'] },
  root: { body: 0x231a14, lit: 0xe8f0ff, kinds: ['trunk', 'crystal', 'trunk'] },
});

const hashStr = (s) => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
};
const rng = (seed) => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

/**
 * the skyline of a map: [{ kind, family, x, z, h, yaw, seed }] in metres, every piece outside the grid; [] for a map with no open sky, a dark
 * (lantern) map, or one with scenery of its own
 */
export function skylinePlan(map) {
  if (map.dark || (map.scenery?.length ?? 0) >= SKYLINE.authored || !hasOpenSky(map)) return [];
  const family = familyOf(map.id ?? ''),
    F = FAMILIES[family],
    r = rng(hashStr(map.id ?? 'x')),
    W = map.w * map.cell,
    D = map.h * map.cell,
    dens = map.atmosphere?.fogDensity ?? 0.01,
    fogK = Math.max(0.55, Math.min(1.15, 0.008 / Math.max(dens, 1e-4))), // a foggy place keeps its skyline close, or it would never be seen
    out = [];
  for (let i = 0; i < SKYLINE.slots; i++) {
    const a = ((i + 0.15 + r() * 0.7) / SKYLINE.slots) * Math.PI * 2,
      dx = Math.cos(a),
      dz = Math.sin(a),
      edge = Math.min(W / 2 / Math.max(Math.abs(dx), 1e-6), D / 2 / Math.max(Math.abs(dz), 1e-6)),
      off = SKYLINE.clear + (SKYLINE.minOff + r() * (SKYLINE.maxOff - SKYLINE.minOff)) * fogK,
      h = (SKYLINE.minH + r() * (SKYLINE.maxH - SKYLINE.minH)) * (i === 0 ? SKYLINE.landmark : 1);
    out.push({
      kind: F.kinds[i === 0 ? 0 : 1 + Math.floor(r() * (F.kinds.length - 1))] ?? F.kinds[0],
      family,
      x: W / 2 + dx * (edge + off),
      z: D / 2 + dz * (edge + off),
      h,
      yaw: Math.atan2(-dx, -dz) + (r() - 0.5) * 0.8, // roughly facing the map
      seed: Math.floor(r() * 1e9),
    });
  }
  return out;
}

// ---------------------------------------------------------------- the kit
const mats = new Map();
const mat = (family) => {
  if (!mats.has(family)) {
    const F = FAMILIES[family];
    mats.set(family, {
      body: new THREE.MeshLambertMaterial({ color: F.body }),
      lit: new THREE.MeshBasicMaterial({ color: F.lit }),
    });
  }
  return mats.get(family);
};
const box = (g, m, w, h, d, x, y, z, ry = 0) => {
  const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
  o.position.set(x, y, z);
  o.rotation.y = ry;
  g.add(o);
  return o;
};
const cyl = (g, m, rt, rb, h, seg, x, y, z) => {
  const o = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), m);
  o.position.set(x, y, z);
  g.add(o);
  return o;
};
const base = (g, m, w, d) => box(g, m, w, 5, d, 0, -1.5, 0); // every piece stands on its own dark footing (a far shore, a hull, a slab)

const KIT = {
  belltower(g, M, h, r) {
    const w = 4 + r() * 2;
    base(g, M.body, w * 3, w * 2.4);
    box(g, M.body, w, h * 0.78, w, 0, h * 0.39, 0);
    cyl(g, M.body, 0, w * 0.85, h * 0.22, 4, 0, h * 0.89, 0).rotation.y = Math.PI / 4;
    box(g, M.lit, w * 0.34, h * 0.07, w * 1.02, 0, h * 0.66, 0); // the lamp room
    box(g, M.lit, w * 1.02, h * 0.07, w * 0.34, 0, h * 0.66, 0);
  },
  roofrow(g, M, h, r) {
    const n = 3 + Math.floor(r() * 3);
    base(g, M.body, n * 7 + 6, 12);
    for (let i = 0; i < n; i++) {
      const hh = h * (0.28 + r() * 0.22),
        x = (i - (n - 1) / 2) * 7;
      box(g, M.body, 6.4, hh, 8, x, hh / 2, 0);
      cyl(g, M.body, 0, 4.6, hh * 0.45, 4, x, hh * 1.22, 0).rotation.y = Math.PI / 4;
      if (r() < 0.7) box(g, M.lit, 1.1, 1.3, 8.06, x + (r() - 0.5) * 3, hh * 0.55, 0);
    }
  },
  masts(g, M, h, r) {
    base(g, M.body, 26, 7);
    box(g, M.body, 22, 3.4, 5.5, 0, 2.2, 0);
    for (const x of [-6, 1, 7.5]) {
      const hh = h * (0.7 + r() * 0.3);
      cyl(g, M.body, 0.14, 0.3, hh, 5, x, hh / 2 + 3, 0);
      box(g, M.body, 7 + r() * 3, 0.28, 0.28, x, hh * 0.62 + 3, 0);
      box(g, M.body, 4.5, 0.24, 0.24, x, hh * 0.86 + 3, 0);
    }
    box(g, M.lit, 0.7, 0.7, 0.7, 9.5, 5, 0);
  },
  crane(g, M, h) {
    base(g, M.body, 12, 10);
    box(g, M.body, 1.6, h * 0.8, 1.6, 0, h * 0.4, 0);
    box(g, M.body, h * 0.75, 1.1, 1.1, h * 0.25, h * 0.82, 0);
    box(g, M.body, 0.3, h * 0.35, 0.3, h * 0.55, h * 0.64, 0);
    box(g, M.lit, 0.8, 0.8, 0.8, 0, h * 0.86, 0);
  },
  chimney(g, M, h, r) {
    const rb = 2 + r() * 1.2;
    base(g, M.body, 16, 14);
    box(g, M.body, 12, h * 0.16, 10, 0, h * 0.08, 0);
    cyl(g, M.body, rb * 0.6, rb, h, 8, 0, h / 2, 0);
    cyl(g, M.lit, rb * 0.66, rb * 0.66, 0.5, 8, 0, h + 0.1, 0); // the fire in its mouth
  },
  gantry(g, M, h) {
    const w = h * 0.9;
    base(g, M.body, w + 8, 8);
    for (const x of [-w / 2, w / 2]) box(g, M.body, 1.3, h * 0.82, 1.3, x, h * 0.41, 0);
    box(g, M.body, w + 3, 1.6, 2.2, 0, h * 0.84, 0);
    box(g, M.body, 0.3, h * 0.3, 0.3, w * 0.12, h * 0.68, 0);
    box(g, M.lit, 0.8, 0.8, 2.26, -w * 0.3, h * 0.84, 0);
  },
  tank(g, M, h, r) {
    const rr = 5 + r() * 3,
      hh = h * 0.5;
    base(g, M.body, rr * 3, rr * 3);
    cyl(g, M.body, rr, rr, hh, 10, 0, hh / 2, 0);
    cyl(g, M.body, rr * 0.2, rr, hh * 0.3, 10, 0, hh * 1.15, 0);
    cyl(g, M.lit, rr * 1.01, rr * 1.01, 0.35, 10, 0, hh * 0.7, 0);
  },
  ribarch(g, M, h) {
    base(g, M.body, h * 1.1, 8);
    for (const s of [-1, 1]) {
      const leg = box(g, M.body, 1.8, h * 1.05, 2.2, s * h * 0.3, h * 0.48, 0);
      leg.rotation.z = s * -0.32; // two ribs lean in and meet
    }
    box(g, M.body, 3.2, 1.6, 2.4, 0, h * 0.97, 0);
    box(g, M.lit, 0.9, 0.9, 2.46, 0, h * 0.97, 0);
  },
  pipes(g, M, h, r) {
    base(g, M.body, 16, 12);
    for (let i = 0; i < 4; i++) {
      const hh = h * (0.45 + r() * 0.55),
        rr = 1 + r() * 1.3,
        x = (i - 1.5) * 3.4;
      cyl(g, M.body, rr, rr * 1.15, hh, 7, x, hh / 2, (r() - 0.5) * 3);
      cyl(g, M.lit, rr * 0.8, rr * 0.8, 0.3, 7, x, hh + 0.1, 0);
    }
  },
  fin(g, M, h, r) {
    base(g, M.body, 14, 8);
    const f = cyl(g, M.body, 0.2, 4.5, h, 4, 0, h / 2, 0);
    f.scale.z = 0.28;
    f.rotation.z = (r() - 0.5) * 0.25;
    box(g, M.lit, 0.5, 0.5, 0.5, 0, h * 0.7, 1.4);
  },
  pylon(g, M, h) {
    base(g, M.body, 12, 12);
    cyl(g, M.body, 1.1, 2.6, h, 4, 0, h / 2, 0).rotation.y = Math.PI / 4;
    cyl(g, M.lit, 0, 1.25, h * 0.07, 4, 0, h * 1.035, 0).rotation.y = Math.PI / 4; // a gold cap
  },
  gatearch(g, M, h) {
    const w = h * 0.7;
    base(g, M.body, w + 10, 10);
    for (const x of [-w / 2, w / 2]) cyl(g, M.body, 1.3, 2.2, h * 0.86, 4, x, h * 0.43, 0).rotation.y = Math.PI / 4;
    box(g, M.body, w + 5, h * 0.1, 3, 0, h * 0.9, 0);
    box(g, M.lit, w * 0.5, 0.5, 3.06, 0, h * 0.9, 0);
  },
  ring(g, M, h) {
    base(g, M.body, 14, 8);
    box(g, M.body, 3, h * 0.3, 3, 0, h * 0.15, 0);
    const t = new THREE.Mesh(new THREE.TorusGeometry(h * 0.3, h * 0.035, 5, 18), M.body);
    t.position.y = h * 0.62;
    g.add(t);
    const d = new THREE.Mesh(new THREE.OctahedronGeometry(h * 0.06), M.lit);
    d.position.y = h * 0.62;
    g.add(d);
  },
  needle(g, M, h) {
    base(g, M.body, 9, 9);
    cyl(g, M.body, 0.9, 2.4, 3.5, 6, 0, 1.75, 0);
    cyl(g, M.body, 0.08, 0.85, h, 5, 0, h / 2 + 3.5, 0);
    const b = new THREE.Mesh(new THREE.SphereGeometry(0.5, 5, 4), M.lit);
    b.position.y = h + 3.8;
    g.add(b);
  },
  stones(g, M, h, r) {
    base(g, M.body, 20, 9);
    for (let i = 0; i < 4; i++) {
      const hh = h * (0.3 + r() * 0.5),
        s = box(g, M.body, 2.2, hh, 1.4, (i - 1.5) * 4.4, hh / 2, (r() - 0.5) * 3, r() * 0.6);
      s.rotation.z = (r() - 0.5) * 0.16;
    }
  },
  column(g, M, h, r) {
    base(g, M.body, 12, 12);
    cyl(g, M.body, 0.6, 3.6 + r() * 2, h * 0.62, 6, 0, h * 0.31, 0); // a stalagmite
    cyl(g, M.body, 3 + r() * 2, 0.4, h * 0.5, 6, 0, h * 1.3, 0); // and the stalactite reaching down to it
    box(g, M.lit, 0.6, 0.6, 0.6, 0, h * 0.66, 0);
  },
  cityblock(g, M, h, r) {
    base(g, M.body, 24, 12);
    let y = 0,
      w = 16;
    for (let i = 0; i < 4; i++) {
      const hh = h * (0.18 + r() * 0.12);
      box(g, M.body, w, hh, 9, (r() - 0.5) * 2, y + hh / 2, 0);
      for (let k = 0; k < 3; k++) if (r() < 0.6) box(g, M.lit, 0.9, 1.2, 9.06, (k - 1) * (w * 0.28), y + hh * 0.55, 0);
      y += hh;
      w *= 0.74;
    }
  },
  pile(g, M, h, r) {
    base(g, M.body, 13, 13);
    let y = 0,
      rr = 4.4 + r();
    for (let i = 0; i < 5; i++) {
      const hh = h * (0.16 + r() * 0.1);
      cyl(g, M.body, rr * 0.8, rr, hh, 6, (r() - 0.5) * 1.4, y + hh / 2, (r() - 0.5) * 1.4);
      if (i > 0) cyl(g, M.lit, rr * 1.02, rr * 1.02, 0.28, 6, 0, y + 0.1, 0); // an amber seam between the cells
      y += hh;
      rr *= 0.78;
    }
  },
  trunk(g, M, h, r) {
    base(g, M.body, 12, 12);
    const t = cyl(g, M.body, 1.2, 3.6, h, 7, 0, h / 2, 0);
    t.rotation.z = (r() - 0.5) * 0.3;
    for (let i = 0; i < 4; i++) {
      const b = cyl(g, M.body, 0.15, 0.8, h * 0.22, 5, 0, h * (0.52 + i * 0.1), 0);
      b.rotation.z = (i % 2 ? 1 : -1) * (0.9 + r() * 0.4);
      b.rotation.y = r() * Math.PI;
      b.translateY(h * 0.1);
    }
  },
  crystal(g, M, h, r) {
    base(g, M.body, 10, 10);
    for (let i = 0; i < 3; i++) {
      const hh = h * (0.5 + r() * 0.5),
        c = cyl(g, i === 0 ? M.lit : M.body, 0, 1.4 + r(), hh, 5, (i - 1) * 2.6, hh / 2, (r() - 0.5) * 2);
      c.rotation.z = (i - 1) * 0.22;
    }
  },
};

/** one piece of a plan, standing at its place (a THREE.Group of dark bodies and a few lit parts) */
export function makeSkylinePiece(p) {
  const g = new THREE.Group();
  (KIT[p.kind] ?? KIT.needle)(g, mat(p.family), p.h, rng(p.seed));
  g.position.set(p.x, 0, p.z);
  g.rotation.y = p.yaw;
  g.userData.skyline = p.kind;
  return g;
}
export const SKYLINE_KINDS = Object.freeze(Object.keys(KIT));
