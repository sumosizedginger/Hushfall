// Baked vertex shading for the level mesh (PT-021, "the light is flat", "same door, same beams, different wallpaper"). Pure maths, no Three: levelmesh.js calls it while it builds the quads, and tests/shading.test.js holds it.
// A tile that repeats every cell reads as wallpaper; three cheap things break that without a texture: a wall that is darker at its foot (dirt, damp) and at its head (smoke), a floor and a ceiling that darken toward a wall
// (corner occlusion, read from the grid), and large soft patches of lighter and darker that do not follow the tile. The numbers come from the place's look (LOOKS[x].shade in defs.js); 0 turns each off.

const hash = (i, j, s) => { let h = (Math.imul(i, 374761393) + Math.imul(j, 668265263) + Math.imul(s, 2147483647)) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967295; };
const smooth = (t) => t * t * (3 - 2 * t);
/** smooth value noise in [0, 1] at (x, z), one lattice cell per unit */
export function noise2(x, z, seed = 1) {
  const i = Math.floor(x), j = Math.floor(z), fx = smooth(x - i), fz = smooth(z - j);
  const a = hash(i, j, seed), b = hash(i + 1, j, seed), c = hash(i, j + 1, seed), d = hash(i + 1, j + 1, seed);
  return a + (b - a) * fx + (c - a) * fz + (a - b - c + d) * fx * fz;
}
/** the patch multiplier at a point: two octaves of noise, about 5 m and 12 m across, mean 1, +-`amp` at the extremes */
export const patchFactor = (u, v, amp, seed = 1) => (amp > 0 ? 1 + amp * ((noise2(u / 5, v / 5, seed) * 0.6 + noise2(u / 12 + 7.3, v / 12 - 3.1, seed + 17) * 0.4) * 2 - 1) * 1.6 : 1);

/** the rows of a wall face from y0 up to y1: [y, brightness] with a dark foot and a darker head (a face shorter than 2.4 m squeezes them) */
export function wallRows(y0, y1, foot) {
  const h = y1 - y0; if (!(foot > 0) || h < 0.4) return [[y0, 1], [y1, 1]];
  const lo = Math.min(0.9, h * 0.32), hi = Math.min(0.8, h * 0.28);
  return [[y0, 1 - foot], [y0 + lo, 1 - foot * 0.12], [y1 - hi, 1], [y1, 1 - foot * 0.6]];
}

/** corner occlusion at the lattice point (X, Z): `kindAt(cx, cz)` is the grid; a straight wall touches two wall cells, an inside corner three */
export function cornerAO(kindAt, X, Z, ao) {
  if (!(ao > 0)) return 1;
  let n = 0; for (const [dx, dz] of [[-1, -1], [0, -1], [-1, 0], [0, 0]]) if (kindAt(X + dx, Z + dz) === 'wall') n++;
  return 1 - ao * Math.min(1, n / 3);
}
