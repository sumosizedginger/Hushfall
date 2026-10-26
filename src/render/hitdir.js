// LOOK POLISH 10 (the owner, 2026-10-26: "the screen flashes and shows the direction you are hit from, but not so much it overwhelms the screen"): a short red glow on the EDGE of the screen on the side a blow came from,
// as a PURE model the view feeds and post.js draws. The sim's `hurt` event carries where the blow came from (fx, fz; world.js hurtPlayer); a blow with no source (a toxic floor, vacuum, a fall) has none and only the
// all-round flush shows. The glow is anchored to the WORLD point, so it swings round the edge as you turn toward the attacker; it scales with the size of the hit (a scratch is faint and narrow, a heavy blow bold and
// wide), fades in about a second, and never reaches the middle of the picture (post.js draws it only in a band along the edge). Hits from the same side merge into one glow that refreshes; at most MAX show at once.
import { flashFor } from './hurtflash.js';

export const HITDIR = Object.freeze({ life: 1.1, merge: 0.6, max: 4, flushShare: 0.45, width0: 0.38, widthK: 0.42, s0: 0.3, sK: 0.6 });

/** the bearing of world point (x, z) from a viewer at (px, pz) facing yaw, as { s: sin, c: cos } of the angle from straight ahead (positive = to the right) */
export function bearing(px, pz, yaw, x, z) {
  const dx = x - px, dz = z - pz, d = Math.hypot(dx, dz); if (d < 1e-6) return { s: 0, c: 1 };
  const fwd = (-Math.sin(yaw) * dx - Math.cos(yaw) * dz) / d, right = (Math.cos(yaw) * dx - Math.sin(yaw) * dz) / d;
  return { s: right, c: fwd };
}

export class HitMarkers {
  constructor() { this.list = []; }
  /** a blow of `amount` from world point (x, z), with the viewer at (px, pz) facing yaw at that moment */
  hit(x, z, amount, px, pz, yaw) {
    const k = flashFor(amount); if (k <= 0) return null;
    const b = bearing(px, pz, yaw, x, z), a = Math.atan2(b.s, b.c);
    const same = this.list.find((m) => { const mb = bearing(px, pz, yaw, m.x, m.z), d = Math.abs(Math.atan2(Math.sin(Math.atan2(mb.s, mb.c) - a), Math.cos(Math.atan2(mb.s, mb.c) - a))); return d < HITDIR.merge; });
    if (same) { same.x = x; same.z = z; same.k = Math.max(same.k * (1 - same.age / HITDIR.life), k); same.age = 0; return same; }
    const m = { x, z, k, age: 0 }; this.list.push(m);
    if (this.list.length > HITDIR.max) { this.list.sort((p, q) => (q.k * (1 - q.age / HITDIR.life)) - (p.k * (1 - p.age / HITDIR.life))); this.list.length = HITDIR.max; }
    return m;
  }
  step(dt) { for (const m of this.list) m.age += dt > 0 ? dt : 0; this.list = this.list.filter((m) => m.age < HITDIR.life); }
  /** write the post pass's uniform: four vec4 (sin, cos, strength, half-width in radians); unused slots have strength 0. `out` is an array of objects with set(x, y, z, w) (THREE.Vector4) */
  write(px, pz, yaw, out) {
    for (let i = 0; i < out.length; i++) {
      const m = this.list[i]; if (!m) { out[i].set(0, 1, 0, 0); continue; }
      const b = bearing(px, pz, yaw, m.x, m.z), fade = 1 - m.age / HITDIR.life, s = (HITDIR.s0 + HITDIR.sK * m.k) * fade * fade;
      out[i].set(b.s, b.c, s, HITDIR.width0 + HITDIR.widthK * m.k);
    }
    return out;
  }
}
