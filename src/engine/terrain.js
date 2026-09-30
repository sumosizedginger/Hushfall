// Terrain queries for the sim: floor height (static per cell, or a moving sector), ceiling, floor effects.
// Everything takes the world `w` because sector heights are sim state. A map with no terrain layers and no sectors is "flat": every
// query short-circuits to 0, so Gate 1 maps and frozen test fixtures behave exactly as before.
import { STEP, FX } from './defs.js';

const isFlat = (m) => m.flat && m.sectors.length === 0;

/** floor height of a cell right now (metres): the sector's current height if it belongs to one, else the map's static height */
export function cellFloor(w, cx, cz) {
  const m = w.map;
  if (m.sectors.length) { const si = m.sectorAt(cx, cz); if (si >= 0 && w.sectors?.[si]) return w.sectors[si].h; }
  return m.flat ? 0 : m.floor(cx, cz);
}
export function floorAt(w, x, z) { const m = w.map; return isFlat(m) ? 0 : cellFloor(w, Math.floor(x / m.cell), Math.floor(z / m.cell)); }

/** where an actor of radius r standing at (x,z) rests: the highest floor its footprint touches (centre + four edge points), like a Doom sector overlap */
export function groundAt(w, x, z, r) {
  const m = w.map; if (isFlat(m)) return 0;
  const S = m.cell; let g = cellFloor(w, Math.floor(x / S), Math.floor(z / S));
  for (const [dx, dz] of [[r, 0], [-r, 0], [0, r], [0, -r]]) g = Math.max(g, cellFloor(w, Math.floor((x + dx) / S), Math.floor((z + dz) / S)));
  return g;
}
/** highest floor under the footprint that is NOT a step too high: used to decide whether a move is blocked by a ledge */
export function tooHigh(w, o, x, z, r) {
  const m = w.map; if (isFlat(m)) return false;
  const S = m.cell, y0 = o.y ?? 0;
  for (const [dx, dz] of [[0, 0], [r, 0], [-r, 0], [0, r], [0, -r]]) if (cellFloor(w, Math.floor((x + dx) / S), Math.floor((z + dz) / S)) - y0 > STEP + 1e-6) return true;
  return false;
}
/** ceiling above sea level at a point: the interior cell's ceiling, or Infinity in the open */
export function ceilingAt(w, x, z) {
  const m = w.map, cx = Math.floor(x / m.cell), cz = Math.floor(z / m.cell), k = m.kind(cx, cz);
  return k === 'floor' || k === 'door' || k === 'secret' ? m.ceilingAt(cx, cz) : Infinity;
}
/** the floor-effect char under a point ('w' | 'x' | null) */
export function fxAt(w, x, z) { const m = w.map; return m.fxRows ? m.fx(Math.floor(x / m.cell), Math.floor(z / m.cell)) : null; }
export const fxSpeed = (c) => (c ? FX[c]?.speed ?? 1 : 1);
