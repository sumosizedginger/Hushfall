// FLOOR COURSES (2026-11-19, the visual pass: a large hall or yard was one texture flooded from wall to wall, nothing on it to give it a size or a
// shape). What builders lay in a big floor: a KERB, a frame of paler stone one cell in from the walls, and COURSE JOINTS, a band across the field
// every few cells, and PANELS, every other block between the joints a shade darker, so the floor reads as a paved field with a size and the eye can
// count its way across. PURE: a MapData in, a list of strips out;
// levelmesh.js draws them a few millimetres over the floor in the floor's own texture, paler or darker. Drawn only: the simulation never sees them.
// Only on built floors, roofed or open (the stone, wood and metal families of surfaces.js, less the natural rock; a salt flat, a carpet or a
// living floor is not laid in courses), only on
// a FIELD: cells at least COURSE.clear cells from anything that is not plain floor at the same height and skin, in a connected patch of at least
// COURSE.minField cells. Never on a moving floor, water, a current, a door, under a lantern bay's inlay or across a step.
import { FLOOR_SKINS, FX } from '../engine/defs.js';
import { familyOfFloor } from '../engine/surfaces.js';

export const COURSE = Object.freeze({
  families: ['stone', 'wood', 'metal'],
  natural: ['floor_faultrock_a', 'floor_flowstone_a', 'floor_rootwell_a'], // stone nobody laid: a cave floor has no courses
  minField: 20, // cells in a connected field
  clear: 1, // cells from anything that is not the same plain floor (2 left every pillared hall bare)
  every: 3, // a joint every this many cells (world-aligned, so two rooms of one map share the rhythm)
  joint: 0.5, // m wide (0.34 was lost in the texture at the game's 480 pixels)
  kerb: 0.7, // m wide, laid inside the field's edge
  lift: 0.006, // m over the floor (the floor marks sit at 0.014); a panel lies 2 mm under it, a kerb 2 mm over
  tint: { joint: 0.42, kerb: 1.3, panel: 0.78 }, // of the floor's own tint: dark joints, a pale kerb (darker on both read as nothing on a dark floor)
});

const N4 = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];

/**
 * the strips: [{ x0, z0, x1, z1, y, skin, part: 'kerb' | 'joint' }] in world metres. `skip(cx, cz)` (optional) is true for a cell the caller
 * decorates otherwise (a bay's inlay)
 */
export function floorCourses(map, skip = () => false) {
  const S = map.cell,
    W = map.w,
    Hh = map.h,
    idx = (x, z) => z * W + x;
  // plain floor of a built family, nothing moving or flowing on it
  const skinOf = new Array(W * Hh).fill(null);
  for (let z = 0; z < Hh; z++)
    for (let x = 0; x < W; x++) {
      const k = map.kind(x, z);
      if (k !== 'floor' && k !== 'outdoor') continue;
      const c = map.skin(x, z),
        f = FLOOR_SKINS[c];
      if (!f || !COURSE.families.includes(familyOfFloor(f.tex)) || COURSE.natural.includes(f.tex)) continue;
      if (map.sectorAt(x, z) >= 0 || skip(x, z)) continue;
      const fx = map.fx(x, z);
      if (fx && fx !== '.' && (fx === 'w' || fx === 'x' || fx === 'h' || FX[fx]?.flow)) continue;
      skinOf[idx(x, z)] = c;
    }
  const same = (x, z, c, y) => x >= 0 && z >= 0 && x < W && z < Hh && skinOf[idx(x, z)] === c && Math.abs(map.floor(x, z) - y) < 1e-6;
  // a field cell: its whole neighbourhood out to COURSE.clear is the same plain floor
  const field = new Uint8Array(W * Hh),
    C = COURSE.clear;
  for (let z = 0; z < Hh; z++)
    for (let x = 0; x < W; x++) {
      const c = skinOf[idx(x, z)];
      if (!c) continue;
      const y = map.floor(x, z);
      let ok = true;
      for (let dz = -C; dz <= C && ok; dz++) for (let dx = -C; dx <= C && ok; dx++) if (!same(x + dx, z + dz, c, y)) ok = false;
      if (ok) field[idx(x, z)] = 1;
    }
  // keep the connected patches big enough to read as a hall
  const keep = new Uint8Array(W * Hh),
    seen = new Uint8Array(W * Hh);
  for (let i = 0; i < W * Hh; i++) {
    if (!field[i] || seen[i]) continue;
    const patch = [i];
    seen[i] = 1;
    for (let k = 0; k < patch.length; k++) {
      const x = patch[k] % W,
        z = (patch[k] / W) | 0;
      for (const [dx, dz] of N4) {
        const nx = x + dx,
          nz = z + dz;
        if (nx < 0 || nz < 0 || nx >= W || nz >= Hh) continue;
        const j = idx(nx, nz);
        if (field[j] && !seen[j]) {
          seen[j] = 1;
          patch.push(j);
        }
      }
    }
    if (patch.length >= COURSE.minField) for (const j of patch) keep[j] = 1;
  }
  const isF = (x, z) => x >= 0 && z >= 0 && x < W && z < Hh && keep[idx(x, z)] === 1;
  const out = [];
  const J = COURSE.joint / 2,
    K = COURSE.kerb,
    E = COURSE.every;
  for (let z = 0; z < Hh; z++)
    for (let x = 0; x < W; x++) {
      if (!isF(x, z)) continue;
      const c = skinOf[idx(x, z)],
        y = map.floor(x, z) + COURSE.lift,
        yk = y + 0.002, // the kerb over a joint where they meet
        yp = y - 0.002,
        x0 = x * S,
        z0 = z * S;
      // PANELS: every other block of E x E cells a shade darker, a checker the eye counts across a hall at the low angle a joint is lost at
      if ((Math.floor(x / E) + Math.floor(z / E)) % 2 === 1) out.push({ x0, z0, x1: x0 + S, z1: z0 + S, y: yp, skin: c, part: 'panel' });
      // the kerb along each side where the field ends
      const w = !isF(x - 1, z),
        e = !isF(x + 1, z),
        n = !isF(x, z - 1),
        s = !isF(x, z + 1);
      if (w) out.push({ x0, z0, x1: x0 + K, z1: z0 + S, y: yk, skin: c, part: 'kerb' });
      if (e) out.push({ x0: x0 + S - K, z0, x1: x0 + S, z1: z0 + S, y: yk, skin: c, part: 'kerb' });
      if (n) out.push({ x0: x0 + (w ? K : 0), z0, x1: x0 + S - (e ? K : 0), z1: z0 + K, y: yk, skin: c, part: 'kerb' });
      if (s) out.push({ x0: x0 + (w ? K : 0), z0: z0 + S - K, x1: x0 + S - (e ? K : 0), z1: z0 + S, y: yk, skin: c, part: 'kerb' });
      // a joint on the cell's west edge every E cells, and its north edge, inside the field only (both halves of the edge in the field)
      const lo = (a) => (a ? K : 0);
      if (x % E === 0 && isF(x - 1, z) && !w) out.push({ x0: x0 - J, z0: z0 + lo(n), x1: x0 + J, z1: z0 + S - lo(s), y, skin: c, part: 'joint' });
      if (z % E === 0 && isF(x, z - 1) && !n) out.push({ x0: x0 + lo(w), z0: z0 - J, x1: x0 + S - lo(e), z1: z0 + J, y, skin: c, part: 'joint' });
    }
  return out;
}
