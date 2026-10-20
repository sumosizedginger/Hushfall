// THE FLOOR MARKS (PT-063, V6b of the visual plan: "floors are flat"). PURE: a parsed map in, a list of decal SPECS out (render only: the simulation never reads it, no save holds it); `DecalLayer` (decals.js) draws them from the baked `decals_floor_atlas`.
// What the floors of a place carry before anyone fights on them, chosen by what the floor is MADE of: every floor texture belongs to a FAMILY (wood, stone, metal, earth, soft, organic) and a family has its own weights over the atlas's sixteen marks
// (plank seams, a grate, a crack, a cracked web, two puddles, rubble, a coil of rope, a drain, tile seams, a drift of dust, a rust stain, a chalk tally, boot prints, soot and ash, straw). Scattering is DETERMINISTIC (seeded by the map's id), denser along walls and in corners,
// sparser out in the open, never in water, on a moving floor or on a current, and capped (`FLOORMARKS.cap`), so a load is the same picture every time and the draw cost is one more mesh of at most that many quads.
import { FLOOR_SKINS, FX } from '../engine/defs.js';

export const FLOORMARKS = { cap: 1600, base: 0.3, wall: 1.8, open: 0.65, ring: 'floor', atlas: 'decals_floor_atlas' };
/** the atlas's cells by name */
export const MARK = { seams: 0, grate: 1, crack: 2, web: 3, puddle: 4, puddleLong: 5, rubble: 6, rope: 7, drain: 8, tiles: 9, dust: 10, rust: 11, chalk: 12, prints: 13, soot: 14, litter: 15 };
/** size (m, [min, max]), alpha, whether it is turned to the room's axes (a seam, a grate) or any way, and whether it wants open sky over it (a puddle is rain: an outdoor floor only) */
export const MARK_LOOK = {
  seams: { size: [1.9, 2.6], a: [0.6, 0.85], axes: true }, grate: { size: [1.1, 1.4], a: [0.85, 0.95], axes: true }, crack: { size: [1.8, 3.0], a: [0.75, 0.92] }, web: { size: [1.4, 2.2], a: [0.75, 0.92] },
  puddle: { size: [1.2, 2.2], a: [0.75, 0.92], sky: true }, puddleLong: { size: [1.8, 3.0], a: [0.75, 0.92], sky: true }, rubble: { size: [1.2, 2.0], a: [0.75, 0.92] }, rope: { size: [1.0, 1.35], a: [0.88, 0.97] },
  drain: { size: [0.95, 1.2], a: [0.88, 0.97], axes: true }, tiles: { size: [1.9, 2.6], a: [0.55, 0.8], axes: true }, dust: { size: [2.2, 3.6], a: [0.6, 0.92] }, rust: { size: [1.3, 2.1], a: [0.65, 0.9] },
  chalk: { size: [1.2, 1.7], a: [0.65, 0.9] }, prints: { size: [1.4, 1.9], a: [0.55, 0.8] }, soot: { size: [1.6, 2.8], a: [0.65, 0.92] }, litter: { size: [1.4, 2.4], a: [0.7, 0.92] },
};
/** the family of every floor texture the game has (a test fails for a texture that has none) */
export const FLOOR_FAMILY = {
  floor_planks_a: 'wood', floor_loft_a: 'wood', floor_deck_a: 'wood', floor_dock_a: 'wood', floor_tideplank_a: 'wood',
  cobble_wet_a: 'stone', floor_tile_a: 'stone', floor_flag_a: 'stone', floor_slate_a: 'stone', floor_approach_a: 'stone', floor_stair_a: 'stone', floor_gate_a: 'stone', floor_basaltflag_a: 'stone', floor_marble_a: 'stone', floor_mourning_a: 'stone', floor_amphi_a: 'stone',
  floor_bellstone_a: 'stone', floor_unrung_a: 'stone', floor_prism_a: 'stone', floor_faultrock_a: 'stone', floor_flowstone_a: 'stone', floor_rootwell_a: 'stone',
  floor_grate_a: 'metal', floor_track_a: 'metal', floor_foundry_a: 'metal', floor_hull_a: 'metal', floor_veinrail_a: 'metal', floor_nervegrid_a: 'metal', floor_reactor_a: 'metal',
  floor_silt_a: 'earth', floor_saltcrust_a: 'earth', floor_clinker_a: 'earth', floor_slurry_a: 'earth', floor_rime_a: 'earth', floor_glasssand_a: 'earth', floor_moss_a: 'earth', floor_terrace_a: 'earth', floor_rootloam_a: 'earth',
  floor_carpet_a: 'soft', floor_quiet_a: 'soft',
  floor_gill_a: 'organic', floor_flesh_a: 'organic', floor_hivetrench_a: 'organic', floor_chitin_a: 'organic', floor_crystal_a: 'organic', floor_throat_a: 'organic', floor_loom_a: 'organic', floor_loomweave_a: 'organic',
};
/** each family's weights over the marks, and a tint (multiplied into the atlas colours, so a puddle in a gill garden is slime and a seam in a loft is old wood) */
export const FAMILY_MARKS = {
  wood: { w: { seams: 4, rubble: 1, rope: 0.8, chalk: 0.8, prints: 2, soot: 2.2, puddle: 1.5, dust: 2.2, litter: 1.8 }, tint: [0.95, 0.9, 0.84] },
  stone: { w: { crack: 2.5, web: 1, tiles: 2.5, rubble: 2.5, puddle: 2, puddleLong: 1.5, dust: 3.5, chalk: 0.7, prints: 1, soot: 2, drain: 0.4, litter: 1 }, tint: [1, 1, 1] },
  metal: { w: { grate: 0.8, drain: 1, rust: 4.5, soot: 3.5, tiles: 1, rubble: 0.5, puddle: 1.5, prints: 1, crack: 0.5 }, tint: [1, 0.98, 0.96] },
  earth: { w: { dust: 6, prints: 3, rubble: 2, litter: 3, crack: 1, puddle: 1.5, soot: 1, chalk: 0.3 }, tint: [1, 0.95, 0.85] },
  soft: { w: { prints: 2, soot: 2, litter: 3, dust: 2 }, tint: [0.9, 0.85, 0.8] },
  organic: { w: { litter: 3, puddle: 3, puddleLong: 1.5, crack: 0.5, dust: 0.6, prints: 0.5, soot: 1 }, tint: [0.75, 0.9, 0.72] },
};
export const familyOf = (tex) => FLOOR_FAMILY[tex] ?? 'stone';

/** a small seeded generator (the same sequence for the same seed, in node and in the browser) */
function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const hashOf = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];

/** the floor skin of a cell, as the level mesh picks it (the cell's own, else a neighbour's) */
function skinOf(map, cx, cz) {
  const c = map.skin(cx, cz); if (FLOOR_SKINS[c]) return c;
  for (const [dx, dz] of DIRS) { const n = map.skin(cx + dx, cz + dz); if (FLOOR_SKINS[n]) return n; }
  return '.';
}

/** the cells that may carry a mark: open floor or ground outdoors, not water, not on a moving floor or a current or a bed that burns, not a door */
export function markableCells(map) {
  const out = [];
  for (let cz = 0; cz < map.h; cz++) for (let cx = 0; cx < map.w; cx++) {
    const k = map.kind(cx, cz); if (k !== 'floor' && k !== 'outdoor') continue;
    if (map.sectorAt(cx, cz) >= 0) continue;
    const fx = map.fx(cx, cz); if (fx === 'w' || fx === 'x' || fx === 'h' || fx === 's' || fx === 'p' || FX[fx]?.flow) continue;
    out.push([cx, cz, k]);
  }
  return out;
}

/** every cell the square [x - r, x + r] x [z - r, z + r] touches is a wall (a mark is hidden by it) or a markable floor at the same height */
function footprintOk(map, x, z, r, floor) {
  const S = map.cell;
  for (let cz = Math.floor((z - r) / S); cz <= Math.floor((z + r) / S); cz++) for (let cx = Math.floor((x - r) / S); cx <= Math.floor((x + r) / S); cx++) {
    const k = map.kind(cx, cz); if (k === 'wall') continue;
    if (k !== 'floor' && k !== 'outdoor') return false;
    if (Math.abs(map.floor(cx, cz) - floor) > 0.01 || map.sectorAt(cx, cz) >= 0) return false;
    const fx = map.fx(cx, cz); if (fx === 'w' || fx === 'x' || fx === 'h' || fx === 's' || fx === 'p' || FX[fx]?.flow) return false;
  }
  return true;
}

/** the floor marks of a map: [{ ring, cell, pos, n, w, h, rot, tint, a, grow }] in decalplace.js's spec shape, deterministic for the map's id, at most FLOORMARKS.cap of them */
export function floorMarks(map, id = map.id ?? `${map.w}x${map.h}`) {
  const cells = markableCells(map); if (!cells.length) return [];
  const rnd = rng(hashOf(String(id)) ^ 0x9e3779b9), S = map.cell, p0 = Math.min(FLOORMARKS.base, 0.92 * FLOORMARKS.cap / cells.length), out = [];
  const wallsAround = (cx, cz) => { let n = 0; for (const [dx, dz] of DIRS) if (map.kind(cx + dx, cz + dz) === 'wall') n++; for (const [dx, dz] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) if (map.kind(cx + dx, cz + dz) === 'wall') n += 0.5; return n; };
  for (const [cx, cz, kind] of cells) {
    const walls = wallsAround(cx, cz), p = p0 * (walls >= 1 ? FLOORMARKS.wall * Math.min(1.6, 1 + 0.25 * walls) : FLOORMARKS.open);
    if (rnd() >= p) continue;
    const fam = FAMILY_MARKS[familyOf(FLOOR_SKINS[skinOf(map, cx, cz)]?.tex)], entries = Object.entries(fam.w).filter(([name]) => !MARK_LOOK[name].sky || kind === 'outdoor'), total = entries.reduce((s, [, w]) => s + w, 0);
    let pick = rnd() * total, name = entries[0][0]; for (const [n, w] of entries) { pick -= w; if (pick <= 0) { name = n; break; } }
    const look = MARK_LOOK[name], size = look.size[0] + rnd() * (look.size[1] - look.size[0]), alpha = look.a[0] + rnd() * (look.a[1] - look.a[0]);
    // inside the cell, kept off its very edge so a mark stays on ITS floor; near a wall it is pushed toward it a little (dirt gathers there)
    let ox = (rnd() - 0.5) * 0.6, oz = (rnd() - 0.5) * 0.6; for (const [dx, dz] of DIRS) if (map.kind(cx + dx, cz + dz) === 'wall' && rnd() < 0.6) { ox += dx * 0.2; oz += dz * 0.2; }
    ox = Math.max(-0.4, Math.min(0.4, ox)); oz = Math.max(-0.4, Math.min(0.4, oz));
    const x = (cx + 0.5 + ox) * S, z = (cz + 0.5 + oz) * S, rot = look.axes ? Math.floor(rnd() * 4) * Math.PI / 2 + (rnd() - 0.5) * 0.06 : rnd() * Math.PI * 2, shade = 0.78 + rnd() * 0.22;
    if (!footprintOk(map, x, z, size * 0.58, map.floor(cx, cz))) continue;                                         // a mark never hangs over a step, an edge, water or a moving floor: every cell it touches is a wall (it hides there) or the same flat floor
    out.push({ ring: FLOORMARKS.ring, cell: MARK[name], pos: [x, map.floor(cx, cz) + 0.012, z], n: [0, 1, 0], w: size, h: name === 'seams' || name === 'tiles' ? size : (name === 'puddleLong' || name === 'dust' ? size * 0.55 : size), rot, tint: [fam.tint[0] * shade, fam.tint[1] * shade, fam.tint[2] * shade], a: alpha, grow: 0, mark: name });
  }
  while (out.length > FLOORMARKS.cap) { const i = Math.floor(rnd() * out.length); out[i] = out[out.length - 1]; out.pop(); }                                  // (a map with room to spare is thinned at random, not cut off at one end)
  return out;
}
