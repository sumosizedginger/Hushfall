// The volume a shot tests against. Pure sim, no DOM/Three.
// An enemy's hit volume is a vertical cylinder standing on its feet (e.y; a flyer's start `hover` metres higher): `height` tall, `hitRadius` wide
// (default: its movement collider `radius`),
// centred `hitForward` metres ahead of the sim position along its facing (default 0: the hunched Gaunt's body hangs ~0.3 m in front of its feet).
// `radius` stays the MOVEMENT collider (walls, props, other bodies, pathing); only shots use `hitRadius` / `hitForward`.
// Fairness rule: the volume matches the drawn body, measured on the real rig in
// tests/enemy-hit-volume.test.js: the height is the drawn height (+-0.10 m), the cylinder covers >= 85% of the standing rig's vertices, and it is no
// more than 0.15 m wider than needed for that. Arms, weapons and trailing cloth that stick out past the torso are not hittable; the torso and head
// are.
import { ENEMIES } from './defs.js';
import * as DM from './dmath.js'; // the same bits on every engine (sin, cos, atan2, acos, exp)

/** the cylinder as plain numbers: centre x/z in the world, radius, base y, top y */
export function hitCylinder(e) {
  const d = ENEMIES[e.kind],
    fwd = d.hitForward ?? 0,
    // a flyer's body starts `hover` above its floor, and comes down as it dies
    lift = e.lift ?? (d.hover ? d.hover * (1 - Math.min(1, e.dead ?? 0)) : 0);
  return { x: e.x + DM.sin(e.yaw) * fwd, z: e.z + DM.cos(e.yaw) * fwd, r: d.hitRadius ?? d.radius, y0: e.y + lift, y1: e.y + lift + d.height };
}

/** is the world point (x, y, z) inside enemy `e`'s hit volume? `pad` is the thickness of whatever is testing (a pellet: 0.05, a flare: 0.1) */
export function insideHit(e, x, y, z, pad = 0.05) {
  // the cheap answer first: a shot's march asks this of every creature at every step, and most are nowhere near (the cylinder's centre is at most hitForward from the feet)
  const d = ENEMIES[e.kind],
    reach = (d.hitRadius ?? d.radius) + pad + Math.abs(d.hitForward ?? 0) + 1e-6;
  if (Math.abs(x - e.x) >= reach || Math.abs(z - e.z) >= reach) return false;
  const c = hitCylinder(e);
  return y > c.y0 && y < c.y1 && Math.hypot(x - c.x, z - c.z) < c.r + pad;
}

/**
 * a thrown flare bursts on contact with the body, or within `minReach` of its axis (the old fixed 0.5 m proximity fuse), whichever reaches farther: a
 * small enemy keeps the fuse the game was tuned with, a big one is burst on at its drawn surface
 */
export function insideFuse(e, x, y, z, minReach = 0.5, pad = 0.1) {
  const d = ENEMIES[e.kind];
  return insideHit(e, x, y, z, Math.max(pad, minReach - (d.hitRadius ?? d.radius)));
}
