// CLOCKED CONVEYORS (PT-045, drop B, E8a; design/ACTC.md section 3): the flowing floors of Act A (FX '>' '<' '^' 'v', world.js flowPush) with a CLOCK on them. A belt is `{ rect: [x0, z0, x1, z1] (cells), period, phase, mode, on? , speed? }`;
// every flowing cell inside the rect is part of it. Pure functions of the sim time (`w.time`, seconds), like breath.js, platforms.js and loads.js: a save, a replay and the route bots need nothing stored, and a map with no `belts`
// never reaches any of this (`map.belts` is empty: the push is the old one, bit for bit).
//   'flip'  the floor carries you the way it is drawn for the first half of the period, STANDS STILL for BELT.stop seconds, carries you the other way for the second half, stands still again. The stops are the tell.
//   'run'   the floor runs the way it is drawn for `on` seconds of every period and stands still for the rest.
// Every change of direction or of running eases over BELT.ease seconds, so the push is never a jump and the view's chevrons slow down before a belt stops (`warn` 0..1 in that last stretch).
import { BELT } from './defs.js';

const clamp01 = (x) => Math.max(0, Math.min(1, x));
const cycleOf = (B, t) => (((t + (B.phase || 0)) % B.period) + B.period) % B.period;

/** the state of a belt at time t: `factor` -1..1 (the share of the belt's speed, signed against the drawn direction), `dir` the nominal direction of the run it is in (+1, -1, or 0 when it stands still), `warn` 0..1 while it is slowing for a stop, `running` */
export function beltState(B, t) {
  const c = cycleOf(B, t), E = BELT.ease;
  let dir = 0, lo = 0, hi = 0;
  if (B.mode === 'run') { if (c < B.on) { dir = 1; lo = 0; hi = B.on; } }
  else {
    const half = B.period / 2;
    if (c < half - BELT.stop) { dir = 1; lo = 0; hi = half - BELT.stop; }
    else if (c >= half && c < B.period - BELT.stop) { dir = -1; lo = half; hi = B.period - BELT.stop; }
  }
  if (!dir) return { factor: 0, dir: 0, warn: 0, running: false };
  const up = clamp01((c - lo) / E), down = clamp01((hi - c) / E);
  return { factor: dir * Math.min(up, down), dir, warn: 1 - down, running: true };
}
/** the belt a cell belongs to, or null (the first that lists it) */
export function beltAtCell(map, cx, cz) { for (const B of map.belts) if (cx >= B.rect[0] && cx <= B.rect[2] && cz >= B.rect[1] && cz <= B.rect[3]) return B; return null; }
/** the push a point on a flowing floor gets: `{ k, speed }` (k the signed share, speed m/s), or null when the cell is on no belt (the ordinary current: FLOW.push) */
export function beltPush(map, x, z, t) { const B = beltAtCell(map, Math.floor(x / map.cell), Math.floor(z / map.cell)); return B ? { k: beltState(B, t).factor, speed: B.speed } : null; }
