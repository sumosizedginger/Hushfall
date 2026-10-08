// The Vael's growth with THICKNESS (PT-021 step 5): "alien growth should have thickness. A wet front. A place it started. Not a flat sheet." A map names where it started (`growth: [{ at, r, power }]`, cells and metres) and the
// builder lays low-poly resin lobes on the walls and along the foot of them, thick near the origin and thinning to a wet front at `r` metres. The spread follows the floor plan (a flood fill through open cells), not the straight
// line, so it comes down a corridor and through a door, and never shows up behind a wall it could not cross. PURE geometry in, geometry out: no simulation, nothing saved, deterministic (seeded from the map id).
//   growthLobes(map)  the lobe list [{ x, y, z, nx, nz, sx, sy, sz, rot, glow }] (testable, no Three)       buildGrowth(map, tex)  one lit mesh of lobes + one glowing mesh of sacs and fronts, or null
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { GROWTH } from '../engine/defs.js';

const hash = (s) => { let h = 2166136261; for (const c of String(s)) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return h >>> 0; };
const seeded = (seed) => { let s = seed || 1; return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; }; };
const OPEN = (k) => k !== 'wall' && k !== 'water';

/** metres of walking through open cells from the origin cell to every cell it reaches within `max` (a breadth-first flood, 4-neighbour, one cell = one cell width) */
export function floodFrom(map, cx, cz, max) {
  const S = map.cell, dist = new Map([[cx + ',' + cz, 0]]), q = [[cx, cz]];
  for (let i = 0; i < q.length; i++) {
    const [x, z] = q[i], d = dist.get(x + ',' + z); if (d + S > max) continue;
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, nz = z + dz, k = nx + ',' + nz; if (dist.has(k) || !OPEN(map.kind(nx, nz))) continue; dist.set(k, d + S); q.push([nx, nz]); }
  }
  return dist;
}

export function growthLobes(map) {
  const out = [], S = map.cell, rnd = seeded(hash(map.id));
  for (const src of (map.growth ?? []).slice(0, GROWTH.max)) {
    const R = src.r, power = src.power ?? 1, ocx = Math.floor(src.at[0]), ocz = Math.floor(src.at[1]), flow = floodFrom(map, ocx, ocz, R);
    for (const [key, d0] of flow) {
      const [cx, cz] = key.split(',').map(Number), t = 1 - Math.min(1, d0 / R), dens = power * t ** GROWTH.falloff, fy = map.floor(cx, cz), top = Math.min(map.ceilingAt(cx, cz), fy + GROWTH.reach);
      for (const [dx, dz] of [[0, -1], [0, 1], [-1, 0], [1, 0]]) {
        if (map.kind(cx + dx, cz + dz) !== 'wall') continue;                                                      // a face of the wall beside this cell: the growth climbs it
        const fx = (cx + 0.5 + dx * 0.5) * S, fz = (cz + 0.5 + dz * 0.5) * S, ax = -dz, az = dx;                    // the face's centre and the direction along it
        const n = Math.floor(dens * GROWTH.perFace + rnd());
        for (let i = 0; i < n; i++) {
          const u = (rnd() - 0.5) * (S - 0.2), low = rnd() < 0.55, y = low ? fy + 0.05 + rnd() * 0.7 : fy + 0.4 + rnd() * (top - fy - 0.5);                // roots low on the wall, a mass above
          const s = (0.2 + 0.62 * dens * rnd()) * (0.75 + 0.6 * rnd()), thick = s * (0.5 + 0.4 * rnd());
          out.push({ x: fx - dx * thick * 0.45 + ax * u, y, z: fz - dz * thick * 0.45 + az * u, nx: -dx, nz: -dz, sx: s, sy: s * (0.8 + 0.9 * rnd()), sz: thick, rot: rnd() * 6.28, glow: t < 0.22 && rnd() < 0.5 ? 1 : 0, d: d0, front: t < 0.22 });
        }
      }
    }
    for (let i = 0, n = GROWTH.sacs; i < n; i++) {                                                                // sacs at the heart: where it started
      const a = rnd() * 6.28, r = rnd() * Math.min(R * 0.25, 3), x = (ocx + 0.5) * S + Math.cos(a) * r, z = (ocz + 0.5) * S + Math.sin(a) * r, k = map.kind(Math.floor(x / S), Math.floor(z / S));
      if (OPEN(k)) out.push({ x, y: map.floor(Math.floor(x / S), Math.floor(z / S)) + 0.2, z, nx: 0, nz: 1, sx: 0.28 + 0.2 * rnd(), sy: 0.28 + 0.2 * rnd(), sz: 0.28 + 0.2 * rnd(), rot: rnd() * 6.28, glow: 2, d: 0, front: false });
    }
  }
  return out;
}

/** one lit mesh of faceted resin lobes and one glowing mesh of sacs and wet fronts (two draw calls); null when the map names no growth */
export function buildGrowth(map, tex) {
  const lobes = growthLobes(map); if (!lobes.length) return null;
  const rock = [], glow = [], base = new THREE.IcosahedronGeometry(1, 0), q = new THREE.Quaternion(), m = new THREE.Matrix4(), e = new THREE.Euler();
  for (const l of lobes) {
    const g = base.clone(); e.set(0, Math.atan2(l.nx, l.nz), l.rot); q.setFromEuler(e); m.compose(new THREE.Vector3(l.x, l.y, l.z), q, new THREE.Vector3(l.sx, l.sy, l.sz)); g.applyMatrix4(m);
    (l.glow ? glow : rock).push(g);
  }
  const grp = new THREE.Group(), flat = (parts, mat) => { if (!parts.length) return; const mesh = new THREE.Mesh(mergeGeometries(parts), mat); parts.forEach((p) => p.dispose()); mesh.userData.dressing = true; grp.add(mesh); };       // dressing: it stands on the floor and climbs the walls on purpose (the floor-truth test ray-casts past it)
  flat(rock, new THREE.MeshLambertMaterial({ map: tex?.wall_resin_a ?? null, color: 0xdcf0e0, emissive: 0x16382e, flatShading: true }));
  flat(glow, new THREE.MeshBasicMaterial({ color: 0x3fe8c8 }));
  base.dispose(); return grp;
}
