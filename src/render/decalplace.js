// Where the world remembers (PT-021 step 2, "nothing sticks: no blood, scorch, body, drag mark or growth crossing a wall"). PURE: a sim event (or a map's own list) in, a list of decal SPECS out; decals.js draws them. Nothing here
// touches the simulation or is saved: the marks are the view's memory of what the events said, so a loaded save starts clean and the map's own marks (what was there before you arrived) come back.
// A spec is { ring, cell, pos: [x, y, z], n: [nx, ny, nz], w, h, rot, tint, a, grow } in world metres; `cell` indexes the 4 x 4 `decals_atlas` (DECALS in defs.js names them).
import { DECALS } from '../engine/defs.js';

/** the smear and the drip are painted neutral in the atlas and coloured here */
const TINT = { blood: [0.62, 0.1, 0.08], ichor: [0.14, 0.8, 0.66] };
const family = (kind) => (DECALS.human.includes(kind) ? 'blood' : 'ichor');
const pickOf = (arr, rnd) => arr[Math.floor(rnd() * arr.length) % arr.length];

/** a spot on the floor under (x, z): null in a wall, in water, on a moving floor or on the ember bed (a mark there would sit under the water overlay or ride a lift) */
export function floorSpot(map, x, z, lift = 0.014) {
  const S = map.cell, cx = Math.floor(x / S), cz = Math.floor(z / S), k = map.kind(cx, cz);
  if (k === 'wall' || k === 'water') return null;
  if (map.sectorAt(cx, cz) >= 0) return null;
  const fx = map.fx(cx, cz); if (fx === 'w' || fx === 'x' || fx === 'h') return null;
  return { pos: [x, map.floor(cx, cz) + lift, z], n: [0, 1, 0] };
}

/** the first wall face a ray meets from (x0, z0) along the unit vector (dx, dz), within `max` metres: { x, z, nx, nz, d } with (nx, nz) the face's normal (it points back at the ray); null if none */
export function rayWall(map, x0, z0, dx, dz, max) {
  const S = map.cell; let cx = Math.floor(x0 / S), cz = Math.floor(z0 / S);
  if (map.kind(cx, cz) === 'wall') return null;
  const sx = dx > 0 ? 1 : -1, sz = dz > 0 ? 1 : -1, ax = Math.abs(dx) < 1e-9 ? Infinity : Math.abs(S / dx), az = Math.abs(dz) < 1e-9 ? Infinity : Math.abs(S / dz);
  let tx = Math.abs(dx) < 1e-9 ? Infinity : ((sx > 0 ? (cx + 1) * S : cx * S) - x0) / dx, tz = Math.abs(dz) < 1e-9 ? Infinity : ((sz > 0 ? (cz + 1) * S : cz * S) - z0) / dz;
  for (let i = 0; i < 400; i++) {
    let t, nx = 0, nz = 0;
    if (tx < tz) { t = tx; cx += sx; tx += ax; nx = -sx; } else { t = tz; cz += sz; tz += az; nz = -sz; }
    if (t > max) return null;
    if (map.kind(cx, cz) === 'wall') return { x: x0 + dx * t, z: z0 + dz * t, nx, nz, d: t };
  }
  return null;
}

/** the face of the wall an impact event stopped in (the ray ends one step inside the wall), or the floor if it stopped low in open air: { pos, n } or null */
export function impactSpot(map, x, y, z) {
  const S = map.cell, cx = Math.floor(x / S), cz = Math.floor(z / S);
  if (map.kind(cx, cz) !== 'wall') { const f = map.floor(cx, cz); return y < f + 0.3 ? floorSpot(map, x, z) : null; }
  let best = null;
  for (const [dx, dz] of [[0, -1], [0, 1], [-1, 0], [1, 0]]) {
    const nx = cx + dx, nz = cz + dz; if (map.kind(nx, nz) === 'wall') continue;
    const fx = dx === 0 ? Math.min(Math.max(x, cx * S), (cx + 1) * S) : (dx < 0 ? cx * S : (cx + 1) * S), fz = dz === 0 ? Math.min(Math.max(z, cz * S), (cz + 1) * S) : (dz < 0 ? cz * S : (cz + 1) * S), d = Math.hypot(x - fx, z - fz);
    if (!best || d < best.d) best = { d, fx, fz, dx, dz, nx, nz };
  }
  if (!best) return null;
  const f = map.floor(best.nx, best.nz), c = map.ceilingAt(best.nx, best.nz), yy = Math.min(Math.max(y, f + 0.08), c - 0.08);
  return { pos: [best.fx, yy, best.fz], n: [best.dx, 0, best.dz] };
}

const clampY = (map, spot, y) => { const S = map.cell, cx = Math.floor((spot.x + spot.nx * 0.05) / S), cz = Math.floor((spot.z + spot.nz * 0.05) / S); return Math.min(Math.max(y, map.floor(cx, cz) + 0.1), map.ceilingAt(cx, cz) - 0.1); };
const wallSpec = (map, hit, ring, cell, y, size, rnd, extra = {}) => ({ ring, cell, pos: [hit.x, clampY(map, hit, y), hit.z], n: [hit.nx, 0, hit.nz], w: size, h: size, rot: (rnd() - 0.5) * 0.9, tint: [1, 1, 1], a: 0.92, grow: 0, ...extra });
const floorSpec = (spot, ring, cell, size, rnd, extra = {}) => ({ ring, cell, pos: spot.pos, n: spot.n, w: size, h: size, rot: rnd() * Math.PI * 2, tint: [1, 1, 1], a: 0.92, grow: 0, ...extra });

/** the marks one sim event leaves. ctx = { map, ex, ez (the eye, so the spatter lands BEHIND what was hit), rnd, kindAt(x, z) (the creature standing there, for a melee hit) } */
export function decalsForEvent(e, ctx) {
  const { map, ex, ez, rnd } = ctx, out = [];
  if (e.type === 'enemy_hit' || e.type === 'melee_hit') {
    const fam = family(e.type === 'melee_hit' ? ctx.kindAt?.(e.x, e.z) : e.kind), melee = e.type === 'melee_hit' ? 1.25 : 1, cells = DECALS.kinds[fam];       // (a melee_hit names the SWING in kind, so the creature is found by where it stands)
    const floor = floorSpot(map, e.x + (rnd() - 0.5) * 0.9, e.z + (rnd() - 0.5) * 0.9);
    if (floor && rnd() < (melee > 1 ? 0.85 : 0.5)) out.push(floorSpec(floor, 'splat', pickOf(cells, rnd), (0.45 + rnd() * 0.45) * melee, rnd));
    const d = Math.hypot(e.x - ex, e.z - ez) || 1, hit = rayWall(map, e.x, e.z, (e.x - ex) / d, (e.z - ez) / d, 5.5);
    if (hit && rnd() < (melee > 1 ? 0.6 : 0.38)) out.push(wallSpec(map, hit, 'splat', pickOf(cells, rnd), 0.7 + rnd() * 1.2, (0.6 + rnd() * 0.5) * melee, rnd));
  } else if (e.type === 'enemy_died') {
    const fam = family(e.kind), d = Math.hypot(e.x - ex, e.z - ez) || 1, ux = (e.x - ex) / d, uz = (e.z - ez) / d, floor = floorSpot(map, e.x, e.z);
    if (floor) {
      out.push(floorSpec(floor, 'mark', DECALS.kinds[fam + 'pool'][0], 1.3 + rnd() * 0.6, rnd, { grow: 2.2, a: 0.95 }));
      const sm = floorSpot(map, e.x + ux * 0.55, e.z + uz * 0.55); if (sm) out.push({ ring: 'mark', cell: DECALS.kinds.smear[0], pos: sm.pos, n: sm.n, w: 1.5, h: 0.75, rot: Math.atan2(uz, ux), tint: fam === 'blood' ? TINT.blood : TINT.ichor, a: 0.85, grow: 0.8 });
    }
    const hit = rayWall(map, e.x, e.z, ux, uz, 3.6); if (hit && rnd() < 0.75) out.push(wallSpec(map, hit, 'splat', pickOf(DECALS.kinds[fam], rnd), 0.8 + rnd() * 1.0, 0.9 + rnd() * 0.5, rnd));
  } else if (e.type === 'impact') {
    const sp = impactSpot(map, e.x, e.y, e.z);
    if (sp) out.push({ ring: 'pock', cell: DECALS.kinds.pock[0], pos: sp.pos, n: sp.n, w: 0.16 + rnd() * 0.12, h: 0.16 + rnd() * 0.12, rot: rnd() * 6.28, tint: [1, 1, 1], a: 0.95, grow: 0 });
  } else if (e.type === 'shot_impact') {
    const sp = impactSpot(map, e.x, e.y, e.z);
    if (sp) out.push({ ring: 'mark', cell: DECALS.kinds.soot[0], pos: sp.pos, n: sp.n, w: 0.55, h: 0.55, rot: rnd() * 6.28, tint: [1, 1, 1], a: 0.8, grow: 0 });
  } else if (e.type === 'explode') {
    const floor = floorSpot(map, e.x, e.z); if (floor) out.push(floorSpec(floor, 'mark', DECALS.kinds.scorch[0], 3.4 + rnd() * 0.6, rnd, { a: 0.9, grow: 0.25 }));
    const hits = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dz]) => rayWall(map, e.x, e.z, dx, dz, 3.2)).filter(Boolean).sort((a, b) => a.d - b.d).slice(0, 2);
    for (const hit of hits) out.push(wallSpec(map, hit, 'mark', DECALS.kinds.streak[0], e.y + 0.4, 1.7 + rnd() * 0.5, rnd, { a: 0.85, h: 2.3 }));
  }
  return out;
}

const tintOf = (d) => (d.kind === 'smear' || d.kind === 'drip' ? TINT[d.tone ?? (d.kind === 'drip' ? 'ichor' : 'blood')] : [1, 1, 1]);
/** the marks a map starts with: what its author put there (map.decals: `at` in cell units like an entity's, [5, 3] the CENTRE of cell (5, 3), a fraction moves inside it) and a drip stain under every cradle and pod */
export function decalsAtLoad(map, rnd = () => 0.5) {
  const out = [], S = map.cell;
  for (const d of map.decals ?? []) {
    const cells = DECALS.kinds[d.kind], cell = cells[Math.floor(rnd() * cells.length) % cells.length], size = d.size ?? 1.2, ring = d.ring ?? 'mark';
    if (d.wall) {
      const px = (d.at[0] + 0.5) * S, pz = (d.at[1] + 0.5) * S, cx = Math.floor(px / S), cz = Math.floor(pz / S), f = map.floor(cx, cz), dirs = { north: [0, -1], south: [0, 1], west: [-1, 0], east: [1, 0] }[d.wall];
      const x = dirs[0] === 0 ? px : (dirs[0] < 0 ? cx * S : (cx + 1) * S), z = dirs[1] === 0 ? pz : (dirs[1] < 0 ? cz * S : (cz + 1) * S);
      out.push({ ring, cell, pos: [x, f + (d.y ?? 1.1), z], n: [-dirs[0], 0, -dirs[1]], w: size, h: d.h ?? size, rot: d.rot ?? 0, tint: tintOf(d), a: 0.95, grow: 0 });
    } else {
      const sp = floorSpot(map, (d.at[0] + 0.5) * S, (d.at[1] + 0.5) * S); if (sp) out.push({ ring, cell, pos: sp.pos, n: sp.n, w: size, h: d.h ?? size, rot: d.rot ?? 0, tint: tintOf(d), a: 0.95, grow: 0 });
    }
  }
  for (const p of map.props ?? []) if (p.kind === 'cradle' || p.kind === 'pod') {                       // what drips from the things that hang there
    const sp = floorSpot(map, p.x, p.z); if (sp) out.push({ ring: 'mark', cell: DECALS.kinds.drip[0], pos: sp.pos, n: sp.n, w: 1.2, h: 1.2, rot: (p.x * 7.13 + p.z * 3.77) % 6.28, tint: TINT.ichor, a: 0.8, grow: 0 });
  }
  return out;
}
