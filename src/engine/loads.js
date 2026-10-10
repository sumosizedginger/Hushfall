// FALLING LOADS (PT-032, Episode 4 Batch A, the Ascent Tether): a region of a deck is struck by a load (a cargo container, a section of the lattice) on a clock. Pure functions of the sim time (`w.time`, seconds), like breath.js: a save, a
// replay and the route bots need nothing stored. A load is `{ rect: [x0, z0, x1, z1] (cells), period, phase }`: it lands at the START of every cycle (the cycle shifted by `phase`), is seen coming for LOADS.warn seconds (a shadow on the deck, a creak, the
// container itself dropping out of the dark), and leaves a settling cloud for LOADS.linger seconds after. Anyone on the ground inside the rect when it lands takes LOADS.damage (a creature LOADS.enemyDamage): a body in the air (a vent's arc) passes over.
import { LOADS } from './defs.js';

const cycle = (L, t) => (((t + (L.phase || 0)) % L.period) + L.period) % L.period;
/** which impact is this: the number of landings so far (it rises by one at each) */
export const loadIndex = (L, t) => Math.floor((t + (L.phase || 0)) / L.period);
/** the state of a load at time t: `warn` 0..1 (0 until LOADS.warn s before the impact, then rising to 1), `until` (s to the next impact), `since` (s since the last), `linger` 1..0 (the dust after an impact), `fall` 0..1 (how far down the container is: 0 = at the top, 1 = on the deck) */
export function loadState(L, t) {
  const c = cycle(L, t), until = L.period - c, warn = until < LOADS.warn ? 1 - until / LOADS.warn : 0, linger = c < LOADS.linger ? 1 - c / LOADS.linger : 0;
  return { warn, until, since: c, linger, fall: warn > 0 ? Math.min(1, warn * warn) : 0 };
}
/** is the point (x, z) metres (a body of radius r) inside the load's rect? */
export function inLoad(L, x, z, cell, r = 0) { return x >= L.rect[0] * cell - r && x <= (L.rect[2] + 1) * cell + r && z >= L.rect[1] * cell - r && z <= (L.rect[3] + 1) * cell + r; }
/** is the cell (cx, cz) inside any load's rect? returns that load or null */
export function loadAtCell(map, cx, cz) { for (const L of map.loads) if (cx >= L.rect[0] && cx <= L.rect[2] && cz >= L.rect[1] && cz <= L.rect[3]) return L; return null; }
