// Act C / D map helpers (PT-046): a polyline CENTRELINE with a band round it, for the maps that are a long thing with a figure to follow (the Hive-Song gorge, the Vein Rail's ring, the Root Well). Pure builders over `Level`; no new format.
//   const cl = centreline([[x, z], ...]);          the path in cell coordinates (cell centres), with its length in cells
//   cl.at(s, off)                                   the point at arc length s (cells) and `off` cells to the LEFT of the way of travel (z grows southward, so for a path that runs east, left = north = smaller z)
//   cl.frame(x, z)                                  { d, off, s }: the distance to the path, the signed offset (left positive) and the arc length of the nearest point
//   band(L, cl, half, fn)                           calls fn({ x, z, d, off, s }) for every cell whose centre is within `half` cells of the path; the callback decides the cell (setCell, ...)
import { setCell } from './c2.mjs';

export function centreline(pts) {
  const segs = []; let total = 0;
  for (let i = 0; i + 1 < pts.length; i++) { const [x0, z0] = pts[i], [x1, z1] = pts[i + 1], len = Math.hypot(x1 - x0, z1 - z0); segs.push({ x0, z0, x1, z1, len, s0: total, ux: (x1 - x0) / len, uz: (z1 - z0) / len }); total += len; }
  const at = (s, off = 0) => {
    s = Math.max(0, Math.min(total, s)); const g = segs.find((q) => s <= q.s0 + q.len) ?? segs[segs.length - 1], t = s - g.s0;
    return [g.x0 + g.ux * t + g.uz * off, g.z0 + g.uz * t - g.ux * off];                                  // left of (ux, uz) in a z-down grid is (uz, -ux)
  };
  const frame = (x, z) => {
    let best = null;
    for (const g of segs) {
      const t = Math.max(0, Math.min(g.len, (x - g.x0) * g.ux + (z - g.z0) * g.uz)), px = g.x0 + g.ux * t, pz = g.z0 + g.uz * t, d = Math.hypot(x - px, z - pz);
      if (!best || d < best.d - 1e-9) best = { d, off: (x - px) * g.uz - (z - pz) * g.ux, s: g.s0 + t };
    }
    return { d: best.d, off: best.off, s: best.s };                                                        // off > 0 on the left of the way of travel
  };
  return { pts, segs, length: total, at, frame };
}

/** call fn for every cell centre within `half` cells of the path */
export function band(L, cl, half, fn) {
  for (let z = 0; z < L.h; z++) for (let x = 0; x < L.w; x++) { const f = cl.frame(x + 0.5, z + 0.5); if (f.d <= half) fn({ x, z, ...f }); }
}

/** a rectangle test in path coordinates: is the cell centre between arc lengths s0..s1 and offsets o0..o1 (left positive)? */
export const inBox = (f, s0, s1, o0, o1) => f.s >= s0 && f.s <= s1 && f.off >= o0 && f.off <= o1;

export { setCell };
