// RUNNING TO OPEN THE RANGE (PT-064; the owner, 2026-10-19, playing the Marksman: "Sniper moves clunky"). The trace of the sim said why: a creature that wants more distance used `retreatStep`, which walks straight AWAY from you while the body keeps FACING you at its turn rate, with the
// forward walk cycle playing: seven seconds of moonwalking at full speed, a stop dead the moment it is far enough, and a snap when it starts to aim. A sniper (and a healer) should do what a person does: turn, run to open the range, turn back and settle.
// `runAway(ctx, keep, settle)` is that, as a pure step the creature's own module calls before anything else: when it can see you inside `keep` metres it picks an OPEN heading (nearest the straight line away first), turns toward it at 1.4 x its turn rate while already moving (speed scales with how
// far round it has turned: an arc, not a pivot), runs until it is `settle` metres past `keep` (so it does not flip at the edge), `maxT` s have passed or it is walled in, then lets go and the ordinary rules turn it back to face you. Lazy fields on the creature: `snipeRun` (true while running), `runYaw`, `runT`.
// The world's own functions come in through `ctx`: `freeHeading(prefer)` -> a heading in radians or null, `headingOpen(a)`, `moveAt(a, k)` -> true if it moved (k = share of its speed).
import * as DM from './dmath.js';                                                                            // PT-076: the same bits on every engine (sin, cos, atan2, acos, exp)
const TAU = Math.PI * 2, wrap = (a) => DM.atan2(DM.sin(a), DM.cos(a)), clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));
export function runAway(ctx, keep, settle = 2.5, maxT = 4) {
  const { e, def, dt, sees, dist, freeHeading, headingOpen, moveAt } = ctx;
  if (!e.snipeRun) {
    if (e.runCd > 0) { e.runCd -= dt; return false; }                                 // it ran and got nowhere: it stands its ground a moment before it tries again
    if (!(sees && dist < keep)) return false;
    const h = freeHeading(null); if (h == null) return false;                       // walled in: the caller fights with its hands
    e.snipeRun = true; e.runYaw = h; e.runT = 0; e.runD0 = dist;
  }
  e.runT += dt;
  if (dist >= keep + settle || (!sees && e.runT > 1)) { e.snipeRun = false; return false; }
  if (e.runT > maxT || (e.runT > 1 && dist < e.runD0 + 1)) { e.snipeRun = false; e.runCd = 2.5; return false; }      // too long, or a second of running has not opened a metre (a wall: it is cornered)
  if (!headingOpen(e.runYaw)) { const h = freeHeading(e.runYaw); if (h == null) { e.snipeRun = false; return false; } e.runYaw = h; }
  const off = wrap(e.runYaw - e.yaw), rate = (def.turnRate ?? 3) * 1.4;
  e.yaw = wrap(e.yaw + clamp(off, -rate * dt, rate * dt));
  const k = Math.max(0, DM.cos(wrap(e.runYaw - e.yaw))), go = k > 0.2 && moveAt(e.yaw, k);        // an arc: it moves as soon as it is half round, faster as it straightens
  e.walk = go ? Math.min(1, e.walk + dt * 5) : Math.max(0, e.walk - dt * 4); if (go) e.phase += dt * def.gait * (0.6 + 0.4 * k);
  return true;
}
export const _wrap = wrap, _TAU = TAU;
