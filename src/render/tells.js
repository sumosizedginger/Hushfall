// ENEMY ACTIONS (2026-10-26): the TELL. While a creature winds up a blow, a shot, a lunge or a charge, a glint grows at its head and is brightest the
// instant before it lands: warm for a blow,
// cold for a shot. Read from the simulation's own clocks every frame (`tellOf`, pure), never from events, so it cannot drift from what the sim will
// do; drawn as a camera-facing star over a
// soft core, additive, from a small pool (a frame rarely has more than a few). Render only.
import * as THREE from 'three';
import { ENEMIES } from '../engine/defs.js';
import { BRAIN } from '../engine/brain.js';

// near: the glint keeps the size it was drawn at up to this many metres, then grows with the distance so it keeps its size ON SCREEN, up to
// `grow` times; glow: from `far[0]` m (none) to `far[1]` m (full) a soft glow of the tell's colour round the upper body (`at` of its height up,
// `size` of its height across), so a windup reads at 15 to 25 m (the outside playtest of 2026-11-18: the tells read only up close;
// tools/dev/probe-read.mjs measures it)
export const TELL = Object.freeze({
  melee: 0xffb070,
  ranged: 0x9ffff0,
  size: [0.35, 1.25],
  up: 0.82,
  fwd: 0.22,
  max: 24,
  near: 7,
  grow: 3,
  glow: { far: [8, 16], opacity: 0.16, at: 0.6, size: 0.42 },
});

/** how a tell `dist` metres from the eye is drawn: grow = its scale, far = 0..1 how much of the far glow it wears (pure) */
export function tellReach(dist) {
  const grow = Math.min(TELL.grow, Math.max(1, dist / TELL.near)),
    [a, b] = TELL.glow.far,
    u = Math.min(1, Math.max(0, (dist - a) / (b - a)));
  return { grow, far: u * u * (3 - 2 * u) };
}

/**
 * how far into a windup creature `e` is: { k: 0..1, ranged } or null when it is not winding up (pure: the sim's attackT / lungeT / chargeT against
 * the creature's own numbers)
 */
export function tellOf(e, distToPlayer = 99) {
  const d = ENEMIES[e.kind];
  if (!d || e.state === 'dead' || (e.stunT || 0) > 0) return null;
  if (e.attackT >= 0 && d.attack) {
    const wu = d.attack.duration * d.attack.windup;
    if (wu > 0 && e.attackT < wu) return { k: e.attackT / wu, ranged: !!d.ranged && distToPlayer >= d.ranged.minRange };
  }
  if (d.lunge && (e.lungeT ?? -1) >= 0 && e.lungeT < d.lunge.windup) return { k: e.lungeT / d.lunge.windup, ranged: false };
  const C = e.chargeC ?? d.charge;
  if (C && (e.chargeT ?? -1) >= 0 && e.chargeT < C.windup) return { k: e.chargeT / C.windup, ranged: false };
  // the groan before a Tollbearer's surge
  if (e.actK === 'lurch' && e.actT > BRAIN.lurch.t) return { k: 1 - (e.actT - BRAIN.lurch.t) / BRAIN.lurch.windup, ranged: false };
  if (e.actK === 'call') return { k: 1 - e.actT / BRAIN.call.windup, ranged: true }; // a Bellhand lifting its bell to call for help
  return null;
}

export class Tells {
  constructor(scene) {
    this.scene = scene;
    this.pool = [];
    this.n = 0;
    const mat = (c, op) =>
      new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: op, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
    this.mats = { melee: [mat(TELL.melee, 0.9), mat(TELL.melee, 0.35)], ranged: [mat(TELL.ranged, 0.9), mat(TELL.ranged, 0.35)] };
    this.ring = new THREE.RingGeometry(0.2, 0.235, 24);
    this.star = new THREE.PlaneGeometry(0.62, 0.07);
    this.core = new THREE.SphereGeometry(0.075, 10, 6);
    this.shell = new THREE.SphereGeometry(1, 12, 8);
  }
  make() {
    const g = new THREE.Group(),
      a = new THREE.Mesh(this.star, this.mats.melee[0]),
      b = new THREE.Mesh(this.star, this.mats.melee[0]),
      c = new THREE.Mesh(this.core, this.mats.melee[1]);
    b.rotation.z = Math.PI / 2;
    const d = new THREE.Mesh(this.ring, this.mats.ranged[0]); // a shot's star is inside a ring: told by shape as well as colour
    d.visible = false;
    for (const m of [a, b, c, d]) {
      m.renderOrder = 6;
      m.frustumCulled = false;
    }
    g.add(a, b, c, d);
    g.visible = false;
    this.scene.add(g);
    // the far glow: three nested shells of one additive colour round the upper body (the centre sums brightest, so it reads as a soft glow with no
    // texture); its own material, since its strength is this creature's alone
    const hm = new THREE.MeshBasicMaterial({ color: TELL.melee, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }),
      h = new THREE.Group();
    for (const r of [1, 0.72, 0.45]) {
      const shell = new THREE.Mesh(this.shell, hm);
      shell.scale.setScalar(r);
      shell.renderOrder = 5;
      shell.frustumCulled = false;
      h.add(shell);
    }
    h.visible = false;
    this.scene.add(h);
    return { g, a, b, c, d, h, hm };
  }
  /** the player's palette: the two colours of a tell */
  setColors(melee, ranged) {
    for (const m of this.mats.melee) m.color.setHex(melee);
    for (const m of this.mats.ranged) m.color.setHex(ranged);
    this.colors = { melee, ranged };
  }
  begin() {
    this.n = 0;
  }
  /** a glint for a creature at root (x, y, z) facing yaw, `height` tall, `t` = tellOf(...); `cam` = the camera (the star faces it) */
  add(x, y, z, yaw, height, t, cam) {
    if (!t || this.n >= TELL.max) return;
    const s = this.pool[this.n] ?? (this.pool[this.n] = this.make());
    this.n++;
    const k = Math.min(1, Math.max(0, t.k)),
      m = this.mats[t.ranged ? 'ranged' : 'melee'],
      gx = x + Math.sin(yaw) * TELL.fwd,
      gy = y + height * TELL.up,
      gz = z + Math.cos(yaw) * TELL.fwd,
      dist = Math.hypot(gx - cam.position.x, gy - cam.position.y, gz - cam.position.z),
      { far, grow } = tellReach(dist),
      sc = (TELL.size[0] + (TELL.size[1] - TELL.size[0]) * k * k) * grow;
    s.a.material = s.b.material = m[0];
    s.c.material = m[1];
    s.d.visible = !!t.ranged;
    s.g.position.set(gx, gy, gz);
    s.g.quaternion.copy(cam.quaternion);
    s.g.scale.setScalar(sc);
    s.a.rotation.z = k * 0.6;
    s.b.rotation.z = Math.PI / 2 + k * 0.6;
    s.g.visible = true; // the star faces the eye and turns as the blow comes
    // the far glow round the body, in the tell's colour, strongest the instant before the blow or the shot
    s.h.visible = far > 0;
    if (far > 0) {
      s.hm.color.setHex(this.colors?.[t.ranged ? 'ranged' : 'melee'] ?? (t.ranged ? TELL.ranged : TELL.melee));
      s.hm.opacity = TELL.glow.opacity * far * (0.35 + 0.65 * k);
      s.h.position.set(x, y + height * TELL.glow.at, z);
      s.h.scale.setScalar(height * TELL.glow.size);
    }
  }
  end() {
    for (let i = this.n; i < this.pool.length; i++) {
      this.pool[i].g.visible = false;
      this.pool[i].h.visible = false;
    }
  }
  dispose() {
    for (const s of this.pool) {
      this.scene.remove(s.g);
      this.scene.remove(s.h);
      s.hm.dispose();
    }
    this.star.dispose();
    this.ring.dispose();
    this.core.dispose();
    this.shell.dispose();
    for (const [a, b] of Object.values(this.mats)) {
      a.dispose();
      b.dispose();
    }
    this.pool = [];
  }
}
