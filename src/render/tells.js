// ENEMY ACTIONS (2026-10-26): the TELL. While a creature winds up a blow, a shot, a lunge or a charge, a glint grows at its head and is brightest the instant before it lands: warm for a blow,
// cold for a shot. Read from the simulation's own clocks every frame (`tellOf`, pure), never from events, so it cannot drift from what the sim will do; drawn as a camera-facing star over a
// soft core, additive, from a small pool (a frame rarely has more than a few). Render only.
import * as THREE from 'three';
import { ENEMIES } from '../engine/defs.js';
import { BRAIN } from '../engine/brain.js';

export const TELL = Object.freeze({ melee: 0xffb070, ranged: 0x9ffff0, size: [0.35, 1.25], up: 0.82, fwd: 0.22, max: 24 });

/** how far into a windup creature `e` is: { k: 0..1, ranged } or null when it is not winding up (pure: the sim's attackT / lungeT / chargeT against the creature's own numbers) */
export function tellOf(e, distToPlayer = 99) {
  const d = ENEMIES[e.kind]; if (!d || e.state === 'dead' || (e.stunT || 0) > 0) return null;
  if (e.attackT >= 0 && d.attack) { const wu = d.attack.duration * d.attack.windup; if (wu > 0 && e.attackT < wu) return { k: e.attackT / wu, ranged: !!d.ranged && distToPlayer >= d.ranged.minRange }; }
  if (d.lunge && (e.lungeT ?? -1) >= 0 && e.lungeT < d.lunge.windup) return { k: e.lungeT / d.lunge.windup, ranged: false };
  const C = e.chargeC ?? d.charge; if (C && (e.chargeT ?? -1) >= 0 && e.chargeT < C.windup) return { k: e.chargeT / C.windup, ranged: false };
  if (e.actK === 'lurch' && e.actT > BRAIN.lurch.t) return { k: 1 - (e.actT - BRAIN.lurch.t) / BRAIN.lurch.windup, ranged: false };          // PT-076 (brain.js): the groan before a Tollbearer's surge
  if (e.actK === 'call') return { k: 1 - e.actT / BRAIN.call.windup, ranged: true };                                                          // a Bellhand lifting its bell to call for help
  return null;
}

export class Tells {
  constructor(scene) {
    this.scene = scene; this.pool = []; this.n = 0;
    const mat = (c, op) => new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: op, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
    this.mats = { melee: [mat(TELL.melee, 0.9), mat(TELL.melee, 0.35)], ranged: [mat(TELL.ranged, 0.9), mat(TELL.ranged, 0.35)] };
    this.star = new THREE.PlaneGeometry(0.62, 0.07); this.core = new THREE.SphereGeometry(0.075, 10, 6);
  }
  make() {
    const g = new THREE.Group(), a = new THREE.Mesh(this.star, this.mats.melee[0]), b = new THREE.Mesh(this.star, this.mats.melee[0]), c = new THREE.Mesh(this.core, this.mats.melee[1]);
    b.rotation.z = Math.PI / 2; for (const m of [a, b, c]) { m.renderOrder = 6; m.frustumCulled = false; } g.add(a, b, c); g.visible = false; this.scene.add(g); return { g, a, b, c };
  }
  begin() { this.n = 0; }
  /** a glint for a creature at root (x, y, z) facing yaw, `height` tall, `t` = tellOf(...); `cam` = the camera (the star faces it) */
  add(x, y, z, yaw, height, t, cam) {
    if (!t || this.n >= TELL.max) return;
    const s = this.pool[this.n] ?? (this.pool[this.n] = this.make()); this.n++;
    const k = Math.min(1, Math.max(0, t.k)), m = this.mats[t.ranged ? 'ranged' : 'melee'], sc = TELL.size[0] + (TELL.size[1] - TELL.size[0]) * k * k;
    s.a.material = s.b.material = m[0]; s.c.material = m[1];
    s.g.position.set(x + Math.sin(yaw) * TELL.fwd, y + height * TELL.up, z + Math.cos(yaw) * TELL.fwd); s.g.quaternion.copy(cam.quaternion); s.g.scale.setScalar(sc); s.a.rotation.z = k * 0.6; s.b.rotation.z = Math.PI / 2 + k * 0.6; s.g.visible = true;          // the star faces the eye and turns as the blow comes
  }
  end() { for (let i = this.n; i < this.pool.length; i++) this.pool[i].g.visible = false; }
  dispose() { for (const s of this.pool) this.scene.remove(s.g); this.star.dispose(); this.core.dispose(); for (const [a, b] of Object.values(this.mats)) { a.dispose(); b.dispose(); } this.pool = []; }
}
