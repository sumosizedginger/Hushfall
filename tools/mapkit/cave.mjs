// THE CAVE KIT (PT-037 Act B, design/ACTB.md E4): rooms that are not rectangles, carved out of SOLID rock by a seeded noise. A node tool over `Level` (tools/mapkit/builder.mjs) and the Campaign 2 helpers (c2.mjs):
// no sim, no render, no format change. Safe by construction, like the shaping kit (shape.mjs): it only ever turns a SOLID cell into floor (never a room, a door, a panel, an object or anything already carved
// by another call), never within a cell of the map's edge, and it is deterministic for a seed (a cave is a function of its arguments). Every operation returns the cells it carved so the caller can skin, furnish
// and measure them; `skinWalls` puts a wall skin on the solid cells that touch the carved floor.
//
//   blob(L, cx, cz, rx, rz, { seed, rough, ch, h, lidMid, lidEdge })   a chamber: an ellipse whose edge wanders (rough 0.2 = a cave, 0 = an ellipse), with a domed lid
//   finger(L, [x0, z0], [x1, z1], { seed, width, wobble, ch, h })       a winding passage that wanders about the straight line and ends exactly on its target; never narrower than two cells
//   tiers(L, cx, cz, { rx, rz, rings, rise, ramps, seed, rough, ... })  concentric terraces (a bowl, an amphitheatre) going DOWN to the middle, a stair cut through every ring at each ramp angle
//   smooth(L, cells, passes)                                            removes one-cell nubs and fills one-cell pits among the cells a call carved (a cave has no wall-hair)
//   skinWalls(L, solid, wall)                                           the solid cells that touch carved floor take the wall skin
import { setCell, FLOORS } from './c2.mjs';

/** a small seeded generator (mulberry32): the whole kit reads randomness only from this */
export function rng(seed) { let a = (seed >>> 0) || 1; return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

/** a smooth periodic function of an angle in [-1, 1]: a few harmonics with random phase and a falling amplitude */
export function ringNoise(seed) {
  const r = rng(seed * 7919 + 13), parts = [];
  for (let k = 2; k <= 6; k++) parts.push({ k, a: (1 / k) * (0.6 + 0.8 * r()), p: r() * Math.PI * 2 });
  const norm = parts.reduce((s, q) => s + q.a, 0);
  return (th) => parts.reduce((s, q) => s + q.a * Math.sin(q.k * th + q.p), 0) / norm;
}

const solidOf = (L, solid) => solid ?? L.g[0][0];                                   // the map's edge is always solid fill: whatever it is IS the rock
const inside = (L, x, z) => x >= 1 && z >= 1 && x < L.w - 1 && z < L.h - 1;       // never the outermost ring of cells
const key = (x, z) => x + ',' + z;

/**
 * A chamber. Cells within the wandering ellipse are carved to floor `ch` at height `h` (0.5 m units). `lidMid` / `lidEdge` are the absolute lid in the middle and at the rim (0.5 m units, at most 35):
 * the lid is a dome, so the chamber has a roof that rises to its middle; omit both for an open cavern (no lid is written). Returns the cells carved.
 */
export function blob(L, cx, cz, rx, rz, { seed = 1, rough = 0.2, ch = '.', h = 0, lidMid = null, lidEdge = null, solid = null } = {}) {
  const rock = solidOf(L, solid), f = ringNoise(seed), cells = [];
  for (let z = Math.floor(cz - rz * (1 + rough)) - 1; z <= Math.ceil(cz + rz * (1 + rough)) + 1; z++) for (let x = Math.floor(cx - rx * (1 + rough)) - 1; x <= Math.ceil(cx + rx * (1 + rough)) + 1; x++) {
    if (!inside(L, x, z) || L.g[z][x] !== rock) continue;
    const dx = (x + 0.5 - cx) / rx, dz = (z + 0.5 - cz) / rz, d = Math.hypot(dx, dz);
    if (d > 1 + rough * f(Math.atan2(dz, dx))) continue;
    const lid = lidMid == null ? null : Math.min(35, Math.max(h + 5, Math.round((lidEdge ?? lidMid) + (lidMid - (lidEdge ?? lidMid)) * (1 - Math.min(1, d) ** 2))));
    setCell(L, x, z, ch, h, lid); cells.push([x, z]);
  }
  return cells;
}

/**
 * A winding passage from `a` to `b`. It walks one step at a time toward the target while a smooth sideways wander (amplitude `wobble` cells) pushes it off the straight line, and carves a disc of
 * radius `width / 2` (at least 1.25: never narrower than two cells) at each step; the last steps are pulled onto the target so it always arrives. Returns the cells carved.
 */
export function finger(L, a, b, { seed = 1, width = 3, wobble = 3, ch = '.', h = 0, lid = null, solid = null } = {}) {
  const rock = solidOf(L, solid), r = Math.max(1.25, width / 2), rnd = rng(seed * 104729 + 7), cells = [], seen = new Set();
  const len = Math.hypot(b[0] - a[0], b[1] - a[1]), nx = (b[1] - a[1]) / (len || 1), nz = -(b[0] - a[0]) / (len || 1);          // the unit normal to the straight line
  const ph = [rnd() * 6.28, rnd() * 6.28, rnd() * 6.28], steps = Math.max(2, Math.ceil(len * 1.6));
  for (let i = 0; i <= steps; i++) {
    const t = i / steps, taper = Math.min(1, 4 * t * (1 - t) * 1.6);                              // zero sideways push at both ends: it leaves a and lands on b
    const side = wobble * taper * (0.55 * Math.sin(t * 6.1 + ph[0]) + 0.3 * Math.sin(t * 11.3 + ph[1]) + 0.15 * Math.sin(t * 19.7 + ph[2])), px = a[0] + (b[0] - a[0]) * t + nx * side, pz = a[1] + (b[1] - a[1]) * t + nz * side;
    for (let z = Math.floor(pz - r) - 1; z <= Math.ceil(pz + r) + 1; z++) for (let x = Math.floor(px - r) - 1; x <= Math.ceil(px + r) + 1; x++) {
      if (!inside(L, x, z) || L.g[z][x] !== rock || seen.has(key(x, z)) || Math.hypot(x - px, z - pz) > r) continue;
      setCell(L, x, z, ch, h, lid); seen.add(key(x, z)); cells.push([x, z]);
    }
  }
  return cells;
}

/**
 * Concentric terraces going DOWN to the middle: `rings` rings between the rim (ring 0, at `top`) and the centre, each `rise` units (0.5 m) lower than the one outside it. A wandering rim (rough) makes it
 * a cave and not a stadium. At each of `ramps` angles (default 2, evenly spread from `rampAt` radians) a corridor `rampWidth` cells wide is cut whose floor falls one step at a time, so the whole
 * bowl can be walked down; elsewhere the rings meet in a cliff. `rise` must not exceed the width of a ring in cells or a ramp would be steeper than a step (it throws). Returns { cells, height(x, z), ring(x, z) }.
 */
export function tiers(L, cx, cz, { rx, rz, rings = 5, rise = 3, top = 14, ramps = 2, rampAt = 0, rampWidth = 3, seed = 1, rough = 0.12, ch = '.', lid = null, solid = null } = {}) {
  const rock = solidOf(L, solid), f = ringNoise(seed), cells = [], H = new Map(), RG = new Map();
  const ringCells = Math.min(rx, rz) / rings;
  if (rise > ringCells + 1e-9) throw new Error(`tiers: a rise of ${rise} units over a ring ${ringCells.toFixed(1)} cells wide is steeper than a step: use fewer rings, a bigger bowl or a smaller rise`);
  const rampAngles = Array.from({ length: ramps }, (_, i) => rampAt + (i * Math.PI * 2) / ramps);
  for (let z = Math.floor(cz - rz * (1 + rough)) - 1; z <= Math.ceil(cz + rz * (1 + rough)) + 1; z++) for (let x = Math.floor(cx - rx * (1 + rough)) - 1; x <= Math.ceil(cx + rx * (1 + rough)) + 1; x++) {
    if (!inside(L, x, z) || L.g[z][x] !== rock) continue;
    const dx = (x + 0.5 - cx) / rx, dz = (z + 0.5 - cz) / rz, d = Math.hypot(dx, dz), th = Math.atan2(dz, dx), edge = 1 + rough * f(th);
    if (d > edge) continue;
    const inward = 1 - d / edge, ring = Math.min(rings - 1, Math.floor(inward * rings));
    const onRamp = rampAngles.some((a) => { let da = Math.abs(th - a); da = Math.min(da, Math.PI * 2 - da); return da * Math.min(rx, rz) * Math.max(0.15, d) <= rampWidth / 2; });
    const hh = onRamp ? Math.max(0, Math.round(top - rise * rings * inward)) : Math.max(0, top - ring * rise);
    setCell(L, x, z, ch, hh, lid); cells.push([x, z]); H.set(key(x, z), hh); RG.set(key(x, z), ring);
  }
  return { cells, height: (x, z) => H.get(key(x, z)) ?? null, ring: (x, z) => RG.get(key(x, z)) ?? null };
}

/**
 * One-cell nubs and pits among `cells` (the cells a call carved; nothing else is ever touched): a carved cell with three or more solid orthogonal neighbours is filled back to rock, a rock cell next to
 * the carved set with three or more open orthogonal neighbours is opened like its neighbours. Returns the new list of carved cells.
 */
export function smooth(L, cells, passes = 1, { solid = null } = {}) {
  const rock = solidOf(L, solid), set = new Set(cells.map(([x, z]) => key(x, z)));
  const open = (x, z) => set.has(key(x, z)) || FLOORS.has(L.g[z]?.[x]), N4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  for (let p = 0; p < passes; p++) {
    const fill = [], opened = [];
    for (const k of set) { const [x, z] = k.split(',').map(Number); if (N4.filter(([dx, dz]) => !open(x + dx, z + dz)).length >= 3) fill.push([x, z]); }
    const near = new Set(); for (const k of set) { const [x, z] = k.split(',').map(Number); for (const [dx, dz] of N4) near.add(key(x + dx, z + dz)); }
    for (const k of near) { if (set.has(k)) continue; const [x, z] = k.split(',').map(Number); if (!inside(L, x, z) || L.g[z][x] !== rock) continue; const nb = N4.filter(([dx, dz]) => set.has(key(x + dx, z + dz))); if (nb.length >= 3) opened.push([x, z, nb[0]]); }
    for (const [x, z] of fill) { L.g[z][x] = rock; set.delete(key(x, z)); }
    for (const [x, z, [dx, dz]] of opened) { L.g[z][x] = L.g[z + dz][x + dx]; L.ht[z][x] = L.ht[z + dz][x + dx]; L.ce[z][x] = L.ce[z + dz][x + dx]; set.add(key(x, z)); }
    if (!fill.length && !opened.length) break;
  }
  return [...set].map((k) => k.split(',').map(Number));
}

/** every solid cell (`solid`) that touches carved floor (an 8-neighbour) takes the wall skin `wall` (a char, or a function (x, z) -> char) */
export function skinWalls(L, solid, wall) {
  const plan = [];
  for (let z = 1; z < L.h - 1; z++) for (let x = 1; x < L.w - 1; x++) {
    if (L.g[z][x] !== solid) continue;
    let touch = false; for (let dz = -1; dz <= 1 && !touch; dz++) for (let dx = -1; dx <= 1; dx++) if (FLOORS.has(L.g[z + dz][x + dx])) { touch = true; break; }
    if (touch) plan.push([x, z, typeof wall === 'function' ? wall(x, z) : wall]);
  }
  for (const [x, z, c] of plan) if (c) L.g[z][x] = c;
  return plan.length;
}

/** how much of its bounding rectangle a set of cells fills (1 = a box, a cave is well under 0.8) */
export function boxiness(cells) {
  if (!cells.length) return 0; let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9;
  for (const [x, z] of cells) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); z0 = Math.min(z0, z); z1 = Math.max(z1, z); }
  return cells.length / ((x1 - x0 + 1) * (z1 - z0 + 1));
}
