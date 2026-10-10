// THE BELL-BREAKER MORTAR (PT-027, Episode 3 Batch B; weapon 10, key 0): INDIRECT FIRE. The shell does not fly down the crosshair, it flies TO the point the crosshair rests on: the view ray is marched out to the first wall, floor, ceiling,
// solid prop or body (or to maxRange, and then down to the floor under it), that point is the landing point, and the shell is thrown on a high arc that gets there in a second or two. So it goes up onto a ledge a flat gun cannot hold a line to,
// over a crate, and lands exactly where the ring on the ground said (the view draws that ring with the same `designate`). Inside `minRange` the landing point is pushed out to it (a mortar cannot be fired at your own boots).
// The arc is exact for the sim's own integrator (projectiles lose `g * dt` of vertical speed THEN move: see the projectile loop in world.js), so the shell lands on the point to a few centimetres. Everything here is pure and deterministic.
import { PLAYER, PROPS, TICK } from './defs.js';
import { floorAt, ceilingAt } from './terrain.js';
import { cellSolid, forwardVec } from './world.js';
import { insideFuse } from './hitvolume.js';

const eyeOf = (p) => [p.x, p.y + PLAYER.eye, p.z];

/** the point the view ray rests on, as [x, y, z] on the ground, plus what stopped it: 'floor' | 'wall' | 'ceiling' | 'prop' | 'body' | 'range' */
export function aimPoint(w, p, D, f = forwardVec(p)) {
  const map = w.map, e = eyeOf(p), step = 0.25, n = Math.ceil(D.maxRange / step);
  let prev = e, what = 'range';
  for (let i = 1; i <= n; i++) {
    const x = e[0] + f[0] * i * step, y = e[1] + f[1] * i * step, z = e[2] + f[2] * i * step, cx = Math.floor(x / map.cell), cz = Math.floor(z / map.cell);
    if (cellSolid(w, cx, cz)) { what = 'wall'; break; }
    if (y < floorAt(w, x, z)) { what = 'floor'; prev = [x, y, z]; break; }
    if (y > ceilingAt(w, x, z)) { what = 'ceiling'; break; }
    let stop = false;
    for (const pr of map.props) if (PROPS[pr.kind].radius > 0 && Math.hypot(x - pr.x, z - pr.z) < PROPS[pr.kind].radius && y < floorAt(w, pr.x, pr.z) + 1.3) { stop = true; what = 'prop'; break; }
    if (!stop) for (const en of w.enemies) if (en.state !== 'dead' && insideFuse(en, x, y, z)) { stop = true; what = 'body'; break; }
    if (stop) break;
    prev = [x, y, z];
  }
  return { x: prev[0], z: prev[2], y: floorAt(w, prev[0], prev[2]), what };
}

/** the landing point the crosshair means (min range applied) and the shot that gets there. `from` is where the shell leaves; `f` the view direction; `jitter` = [jx, jz] fractions of the distance the landing is knocked off the mark by (the unsteady crosshair:
 * scatter is applied to the LANDING POINT, never to the aim ray, because a ray at a shallow angle meets the floor a very different distance away for a tiny change of pitch and the ring would lie). */
export function designate(w, p, def, f = forwardVec(p), from = eyeOf(p), jitter = null) {
  const D = def.designate, a = aimPoint(w, p, D, f), hx = Math.hypot(f[0], f[2]) || 1, ux = hx > 0.05 ? f[0] / hx : -Math.sin(p.yaw), uz = hx > 0.05 ? f[2] / hx : -Math.cos(p.yaw);
  let lx = a.x, lz = a.z, d = Math.hypot(lx - p.x, lz - p.z), clamped = false;
  if (d < D.minRange) { lx = p.x + ux * D.minRange; lz = p.z + uz * D.minRange; d = D.minRange; clamped = true; }
  if (jitter) { lx += jitter[0] * d; lz += jitter[1] * d; }
  const ly = floorAt(w, lx, lz);
  const T0 = Math.min(D.tmax, Math.max(D.tmin, d / D.speed)), N = Math.max(2, Math.round(T0 / TICK)), T = N * TICK;
  const dx = lx - from[0], dz = lz - from[2], dy = ly + 0.05 - from[1];
  let A = Math.min(D.apex, d / 8), g = 8 * A / (T * T);
  // keep the arc under the ceiling: sample the flight and flatten it while it would hit one (a hall is high, a corridor is not)
  for (let tries = 0; tries < 6; tries++) {
    const vy = (dy + g * TICK * TICK * N * (N + 1) / 2) / T; let clear = true;
    for (let k = 1; k <= 14; k++) { const s = T * k / 15, x = from[0] + dx * s / T, z = from[2] + dz * s / T, y = from[1] + vy * s - 0.5 * g * s * s; if (y > ceilingAt(w, x, z) - 0.3) { clear = false; break; } }
    if (clear || A <= 0.35) break; A = Math.max(0.35, A * 0.7); g = 8 * A / (T * T);
  }
  const vy = (dy + g * TICK * TICK * N * (N + 1) / 2) / T;
  return { x: lx, y: ly, z: lz, d, T, g, vx: dx / T, vy, vz: dz / T, clamped, what: a.what };
}
