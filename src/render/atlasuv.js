// The 4 x 4 atlas UV remap, on its own so the gun and melee modules can use it without importing models.js (which imports them).
const INSET = 3 / 256;
/** Remap a primitive's 0..1 UVs into one 64px cell of a 4x4 atlas (cell 0 = top-left of the baked image). */
export function atlas(geom, cell) {
  const uv = geom.attributes.uv, cx = cell % 4, cy = Math.floor(cell / 4);
  const u0 = cx * 0.25 + INSET, u1 = (cx + 1) * 0.25 - INSET;
  const v0 = 1 - (cy + 1) * 0.25 + INSET, v1 = 1 - cy * 0.25 - INSET;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, u0 + uv.getX(i) * (u1 - u0), v0 + uv.getY(i) * (v1 - v0));
  return geom;
}
