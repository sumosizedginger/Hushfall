// OUTDOOR WALL TOPS (2026-11-18, the visual pass: long streets read as corridors because every wall against the sky stopped at one height). A wall
// that stands only in the open (no roofed cell beside it) on flat ground (its open neighbours all at one floor height: a street, a yard, a quay,
// never a terrace, where a raised wall would hide the view the level was built for) has its visible top stepped: the ground is cut into blocks of
// WALLTOP.block cells and each block keeps its height or rises by one of WALLTOP.steps, the same every load. Drawn only: a wall cell is solid to the
// sim at any height, so nothing a player can do changes.
export const WALLTOP = Object.freeze({
  block: 4,
  // how much a block rises, chosen by a hash of the block (repeats weight a height)
  steps: [0, 0, 0.9, 1.8, 1.8, 3.0],
  flat: 0.5, // open neighbours within this of each other count as flat ground
});

const hash = (a, b) => {
  let h = (a * 2246822519 + b * 3266489917 + 374761393) >>> 0;
  h = Math.imul(h ^ (h >>> 15), 2246822519) >>> 0;
  return (h ^ (h >>> 13)) >>> 0;
};
const DIRS = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];

/** how far the visible top of wall cell (cx, cz) is raised over its plain top; `roofed(kind)` says a cell has a ceiling (0 for most walls) */
export function wallRaise(map, cx, cz, roofed, fl) {
  let lo = Infinity,
    hi = -Infinity,
    open = 0;
  for (const [dx, dz] of DIRS) {
    const k = map.kind(cx + dx, cz + dz);
    if (k === 'wall') continue;
    if (roofed(k) || k === 'water' || k === 'void' || k === 'door' || k === 'secret') return 0;
    const f = fl(cx + dx, cz + dz);
    lo = Math.min(lo, f);
    hi = Math.max(hi, f);
    open++;
  }
  if (!open || hi - lo > WALLTOP.flat) return 0;
  const B = WALLTOP.block;
  return WALLTOP.steps[hash(Math.floor(cx / B), Math.floor(cz / B)) % WALLTOP.steps.length];
}
