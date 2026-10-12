// Campaign 2 map helpers (PT-037): the small pieces every Campaign 2 source repeated in Episode 4 (a placer that puts a thing on the nearest free floor cell, shapes drawn by formula, a way to open
// a ring wall round a floor). Pure builders over `Level` (tools/mapkit/builder.mjs); no new format.
import { FLOOR_SKINS } from '../../src/engine/defs.js';
import { hchar } from './builder.mjs';

export const FLOORS = new Set(Object.keys(FLOOR_SKINS));
export { hchar };

/** set one cell: geometry char, height (0.5 m units) and, when given, an absolute lid (0.5 m units) */
export const setCell = (L, x, z, ch, h = null, ce = null) => { if (x < 0 || z < 0 || x >= L.w || z >= L.h) return; L.g[z][x] = ch; if (h != null) { L.usedHeights = true; L.ht[z][x] = h; } if (ce != null) { L.usedCeil = true; L.ce[z][x] = hchar(ce); } };

/** cells of an ellipse (centre cx, cz; radii rx, rz) as a list of [x, z] */
export const ellipseCells = (cx, cz, rx, rz) => { const out = []; for (let z = Math.floor(cz - rz); z <= Math.ceil(cz + rz); z++) for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) if (((x + 0.5 - cx) / rx) ** 2 + ((z + 0.5 - cz) / rz) ** 2 <= 1) out.push([x, z]); return out; };

/** a filled ellipse of `ch` at height `h` (and lid `ce`) */
export function ellipse(L, cx, cz, rx, rz, ch, h = null, ce = null) { const cells = ellipseCells(cx, cz, rx, rz); for (const [x, z] of cells) setCell(L, x, z, ch, h, ce); return cells; }

/** a rectangle [x0, z0, x1, z1] (inclusive) of `ch` at height `h` and lid `ce` */
export function box(L, r, ch, h = null, ce = null) { const cells = []; for (let z = r[1]; z <= r[3]; z++) for (let x = r[0]; x <= r[2]; x++) { setCell(L, x, z, ch, h, ce); cells.push([x, z]); } return cells; }

/** a stair across a rectangle: from `from` to `to` (0.5 m units) along x or z, one unit per `per` cells; every cell takes `ch`; lid `ce` when given */
export function ramp(L, r, axis, from, to, ch, ce = null, per = 1) { const len = axis === 'x' ? r[2] - r[0] + 1 : r[3] - r[1] + 1, dir = to >= from ? 1 : -1; for (let z = r[1]; z <= r[3]; z++) for (let x = r[0]; x <= r[2]; x++) { const i = axis === 'x' ? x - r[0] : z - r[1]; setCell(L, x, z, ch, from + dir * Math.min(Math.abs(to - from), Math.floor(i / per)), ce); } void len; }

/** the placer of a map source: `put(type, kind, [x, z], extra)` puts an entity on the nearest free walkable cell (never twice on one cell, never on a wall), `E` / `P` / `PR` are the enemy, pickup and prop shorthands */
export function placer(L, { silent = false } = {}) {
  const ents = [], used = new Set(), isFloor = (x, z) => FLOORS.has(L.g[z]?.[x]);
  const near = [[0, 0], [1, 0], [0, 1], [-1, 0], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1], [2, 0], [0, 2], [-2, 0], [0, -2], [2, 1], [1, 2], [-2, -1], [-1, -2], [2, 2], [-2, -2], [3, 0], [0, 3], [-3, 0], [0, -3]];
  const put = (type, kind, [x, z], extra = {}) => {
    for (const [dx, dz] of near) { const xx = x + dx, zz = z + dz, k = xx + ',' + zz; if (isFloor(xx, zz) && !used.has(k)) { used.add(k); ents.push({ type, kind, at: [xx, zz], ...extra }); return [xx, zz]; } }
    if (!silent) console.log(`${L.id ?? 'map'}: no cell for ${kind} near ${x},${z}`); return null;
  };
  const reserve = (x, z) => used.add(x + ',' + z);
  return { ents, used, isFloor, put, reserve, E: (kind, x, z, extra) => put('enemy', kind, [x, z], extra), P: (kind, x, z, extra) => put('pickup', kind, [x, z], extra), PR: (kind, x, z, extra) => put('prop', kind, [x, z], extra) };
}

/** put a wall skin on every solid cell (`#`-like fill char) that touches an open floor cell (an 8-neighbour), so a hand-drawn blob of floor gets a ring of the right wall: `skinOf(x, z)` may return a different char per cell */
export function ring(L, fill, skinOf) {
  const plan = [];
  for (let z = 1; z < L.h - 1; z++) for (let x = 1; x < L.w - 1; x++) {
    if (L.g[z][x] !== fill) continue; let touch = false;
    for (let dz = -1; dz <= 1 && !touch; dz++) for (let dx = -1; dx <= 1; dx++) if (FLOORS.has(L.g[z + dz][x + dx])) { touch = true; break; }
    if (touch) plan.push([x, z, skinOf(x, z)]);
  }
  for (const [x, z, c] of plan) if (c) L.g[z][x] = c;
}
