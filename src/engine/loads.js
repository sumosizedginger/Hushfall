// FALLING LOADS (PT-032, Episode 4 Batch A, the Ascent Tether): a region of a deck is struck by a load (a cargo container, a section of the lattice) on a clock. Pure functions of the sim time (`w.time`, seconds), like breath.js: a save, a
// replay and the route bots need nothing stored. A load is `{ rect: [x0, z0, x1, z1] (cells), period, phase }`: it lands at the START of every cycle (the cycle shifted by `phase`), is seen coming for LOADS.warn seconds (a shadow on the deck, a creak, the
// container itself dropping out of the dark), and leaves a settling cloud for LOADS.linger seconds after. Anyone on the ground inside the rect when it lands takes LOADS.damage (a creature LOADS.enemyDamage): a body in the air (a vent's arc) passes over.
import { LOADS } from './defs.js';

const cycle = (L, t) => (((t + (L.phase || 0)) % L.period) + L.period) % L.period;
// A SCHEDULED load (PT-045, drop B: the collapse front of C2M27): a load that says `start` (the time of its FIRST impact, s), `count` (how many impacts it makes, then no more) or `loop` (the whole schedule restarts every `loop` s, so a yard can be run again) follows a
// schedule instead of the endless cycle: nothing falls before `start`, impacts are `period` apart from there, and a strip of a front is just a load whose `start` is later the further along the front it lies. A load with none of the three is the old cycle, bit for bit.
const sched = (L) => L.start != null || L.count != null || L.loop != null;
const loopT = (L, t) => (L.loop ? t - Math.floor(t / L.loop) * L.loop : t);
/** which impact is this: the number of landings so far (it rises by one at each, and by nothing at a loop's wrap) */
export const loadIndex = (L, t) => {
  if (!sched(L)) return Math.floor((t + (L.phase || 0)) / L.period);
  const start = L.start ?? 0, n = L.count ?? Infinity, per = L.loop ? Math.min(n, Math.floor((L.loop - start - 1e-9) / L.period) + 1) : n, v = loopT(L, t) - start;       // (per: the impacts one loop holds)
  return (L.loop ? Math.floor(t / L.loop) * per : 0) + (v < 0 ? 0 : Math.min(Math.floor(v / L.period), n - 1) + 1);
};
/** the state of a load at time t: `warn` 0..1 (0 until LOADS.warn s before the impact, then rising to 1), `until` (s to the next impact), `since` (s since the last), `linger` 1..0 (the dust after an impact), `fall` 0..1 (how far down the container is: 0 = at the top, 1 = on the deck) */
export function loadState(L, t) {
  if (sched(L)) {
    const u = loopT(L, t), start = L.start ?? 0, v = u - start, n = L.count ?? Infinity; let since, until;
    if (v < 0) { since = Infinity; until = -v; }
    else { const last = Math.min(Math.floor(v / L.period), n - 1); since = v - last * L.period; until = last + 1 < n ? (last + 1) * L.period - v : Infinity; }
    if (L.loop && u + until >= L.loop) until = L.loop - u + start;                // the next impact is the first of the next loop
    const warn = until < LOADS.warn ? 1 - until / LOADS.warn : 0, linger = since < LOADS.linger ? 1 - since / LOADS.linger : 0;
    return { warn, until, since, linger, fall: warn > 0 ? Math.min(1, warn * warn) : 0 };
  }
  const c = cycle(L, t), until = L.period - c, warn = until < LOADS.warn ? 1 - until / LOADS.warn : 0, linger = c < LOADS.linger ? 1 - c / LOADS.linger : 0;
  return { warn, until, since: c, linger, fall: warn > 0 ? Math.min(1, warn * warn) : 0 };
}
/** is the point (x, z) metres (a body of radius r) inside the load's rect? */
export function inLoad(L, x, z, cell, r = 0) { return x >= L.rect[0] * cell - r && x <= (L.rect[2] + 1) * cell + r && z >= L.rect[1] * cell - r && z <= (L.rect[3] + 1) * cell + r; }
/** is the cell (cx, cz) inside any load's rect? returns that load or null */
export function loadAtCell(map, cx, cz) { for (const L of map.loads) if (cx >= L.rect[0] && cx <= L.rect[2] && cz >= L.rect[1] && cz <= L.rect[3]) return L; return null; }
