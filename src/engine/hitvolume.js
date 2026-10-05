// The volume a shot tests against. Pure sim, no DOM/Three.
//
// An enemy's hit volume is a vertical cylinder standing on its feet (e.y): `height` tall, `hitRadius` wide (default: its movement collider `radius`),
// centred `hitForward` metres ahead of the sim position along its facing (default 0: the hunched Gaunt's body hangs ~0.3 m in front of its feet).
// `radius` stays the MOVEMENT collider (walls, props, other bodies, pathing); only shots use `hitRadius` / `hitForward`.
//
// Fairness rule (owner decision, 2026-10-05: "the hit box should match the enemy"): the volume matches the drawn body, measured on the real rig in
// tests/enemy-hit-volume.test.js: the height is the drawn height (+-0.10 m), the cylinder covers >= 85% of the standing rig's vertices, and it is no
// more than 0.15 m wider than needed for that. Arms, weapons and trailing cloth that stick out past the torso are not hittable; the torso and head are.
import { ENEMIES } from './defs.js';

/** the cylinder as plain numbers: centre x/z in the world, radius, base y, top y */
export function hitCylinder(e) {
  const d = ENEMIES[e.kind], fwd = d.hitForward ?? 0;
  return { x: e.x + Math.sin(e.yaw) * fwd, z: e.z + Math.cos(e.yaw) * fwd, r: d.hitRadius ?? d.radius, y0: e.y, y1: e.y + d.height };
}

/** is the world point (x, y, z) inside enemy `e`'s hit volume? `pad` is the thickness of whatever is testing (a pellet: 0.05, a flare: 0.1) */
export function insideHit(e, x, y, z, pad = 0.05) {
  const c = hitCylinder(e);
  return y > c.y0 && y < c.y1 && Math.hypot(x - c.x, z - c.z) < c.r + pad;
}

/** a thrown flare bursts on contact with the body, or within `minReach` of its axis (the old fixed 0.5 m proximity fuse), whichever reaches farther: a small enemy keeps the fuse the game was tuned with, a big one is burst on at its drawn surface */
export function insideFuse(e, x, y, z, minReach = 0.5, pad = 0.1) {
  const d = ENEMIES[e.kind];
  return insideHit(e, x, y, z, Math.max(pad, minReach - (d.hitRadius ?? d.radius)));
}
