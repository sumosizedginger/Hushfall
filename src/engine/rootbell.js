// THE ROOT BELL'S CLAPPER (PT-043; design/ACTD.md section 4): the last boss as a shooting fight. Pure behaviour, with the world's helpers handed in (`ctx`, as sweep.js does), so a node test can hold every rule.
//   HUNG (phase 1, the Toll): a pendulum. Its centre of mass is a pure function of the clock since it woke and of the chain's length and swing (both ease toward the values for the number of root anchors cut), so the shot can be led and
//     the view can draw where it WILL be (`swingAt`). The swing turns `bell.turn` rad at every pass of the middle. At the end of a swing a ring is struck across the floor. Whoever is under the middle of the swing is crushed.
//   FALLING (the last anchor is gone): it drops on its chain's slack and slams the floor (a ring and a shake).
//   GROUND (phase 2, the Drop): the ordinary creature code runs (it faces and follows, its CHARGE crashes into stone and stuns it); this module only adds rooted spikes where the player stands.
//   THE LAST NOTE (under `bell.last` of its hit points, any phase on the ground): the note rolls the whole floor every few seconds, the charge is faster, the heart is open (`bell.exposed` times the damage).
//   DEAD: it does not break: it is drawn back up on its chain and hangs, and the map's trigger cuts the sound.
// Lazy: `e.rb` exists only on a Root Bell, `w.spikes` only once one has struck.
import * as DM from './dmath.js';                                                                            // PT-076: the same bits on every engine (sin, cos, atan2, acos, exp)

const TAU = Math.PI * 2;
const ease = (x, target, k) => x + (target - x) * k;

/** how many anchors are cut, and whether any stands */
export function anchorsOf(w) { let dead = 0, alive = 0; for (const n of w.enemies) if (n.kind === 'rootanchor') { if (n.state === 'dead') dead++; else alive++; } return { dead, alive }; }

/** the pendulum: centre of mass at `tt` s since it woke (a pure function of the state) */
export function swingAt(B, rb, tt) {
  const half = Math.floor(2 * tt / B.period + 1e-9), theta = rb.theta0 + half * B.turn, phi = rb.amp * DM.sin(TAU * tt / B.period), reach = rb.len * DM.sin(phi);
  return { x: rb.cx + DM.cos(theta) * reach, z: rb.cz + DM.sin(theta) * reach, cy: B.top - rb.len * DM.cos(phi), phi, theta, vphi: rb.amp * DM.cos(TAU * tt / B.period) * TAU / B.period };
}

/** the chain's length and swing for `cut` anchors cut */
export const targetOf = (B, cut) => { const i = Math.min(cut, B.len.length - 1); return { len: B.len[i], amp: B.amp[i] }; };

export function bellInit(e, def, groundY) {
  return (e.rb = { mode: 'hung', cx: e.x, cz: e.z, fy: groundY, len: def.bell.len[0], amp: def.bell.amp[0], t0: null, theta0: 0, ringN: -1, lift: 0, crushCd: 0, spikeCd: 3, v: 0, last: false, lastN: -1, cut: 0 });
}

/** it starts to swing from the middle, along the line toward the player, the moment it is awake */
function wakeBell(w, rb) { if (rb.t0 != null) return; rb.t0 = w.time; const p = w.player; rb.theta0 = DM.atan2(p.z - rb.cz, p.x - rb.cx); }

/**
 * Where the clapper is this tick (called at the top of its update, before anything can stun it). Writes e.x, e.z, e.lift. Returns nothing. ctx: { w, e, def, dt, groundAt }
 */
export function bellMotion(ctx) {
  const { w, e, def, dt } = ctx, B = def.bell, rb = e.rb ?? bellInit(e, def, ctx.groundAt(e.x, e.z, def.radius));
  const { dead } = anchorsOf(w);
  const swings = e.state !== 'idle' && (!e.hold || e.swing);                                   // a range sponge hangs still unless its map says `swing`
  if (swings) wakeBell(w, rb);
  const t = targetOf(B, dead), k = 1 - DM.exp(-dt / (B.ease / 3)); rb.len = ease(rb.len, t.len, k); rb.amp = ease(rb.amp, t.amp, k); rb.cut = dead;
  if (e.state !== 'dead' && rb.mode === 'rise') { rb.mode = 'hung'; rb.t0 = null; rb.ringN = -1; rb.lift = 0; }          // a range target that stood up again hangs and swings anew
  if (e.state === 'dead') {                                                                    // it does not break: it is drawn back up and hangs, still
    if (rb.mode !== 'rise') { rb.mode = 'rise'; rb.rx = e.x; rb.rz = e.z; rb.rlift = e.lift ?? 0; rb.rt = 0; }
    rb.rt += dt; const u = Math.min(1, rb.rt / 3.5), s = u * u * (3 - 2 * u), rest = swingAt(B, { ...rb, len: B.len[0] - 1.5, amp: 0 }, 0);
    e.x = rb.rx + (rb.cx - rb.rx) * s; e.z = rb.rz + (rb.cz - rb.rz) * s; e.y = rb.fy; e.lift = rb.rlift + (Math.max(0, rest.cy - def.height / 2 - rb.fy) - rb.rlift) * s; return;
  }
  if (rb.mode === 'hung') {
    const tt = rb.t0 == null ? 0 : w.time - rb.t0, s = swingAt(B, rb, rb.t0 == null ? 0 : tt);
    const live = rb.t0 != null;
    e.x = live ? s.x : rb.cx; e.z = live ? s.z : rb.cz; e.y = rb.fy;
    e.lift = Math.max(0, s.cy - def.height / 2 - rb.fy); rb.lift = e.lift; rb.phi = live ? s.phi : 0; rb.theta = s.theta;
  } else if (rb.mode === 'fall') { e.lift = rb.lift; }
  else e.lift = 0;
}

/**
 * The clapper's behaviours this tick, after it has been woken. Returns true when it used the tick (hung or falling), false when the ordinary creature code should run (on the ground).
 * ctx: { w, e, def, diff, dt, emit, hurt(dmg), pulse(x, z, y, spec), tryMove(o, dx, dz, r), free(x, z, r), hitCyl }
 */
export function bellStep(ctx) {
  const { w, e, def, diff, dt, emit } = ctx, B = def.bell, rb = e.rb, p = w.player;
  wakeBell(w, rb); rb.crushCd = Math.max(0, rb.crushCd - dt);
  const frac = e.hp / (def.hp * ctx.hpScale);
  if (rb.mode === 'hung') {
    const tt = w.time - rb.t0;
    // the end of a swing: a ring across the floor (one every B.ring.every s, at the first extreme)
    const n = Math.floor((tt - B.period / 4) / B.ring.every);
    if (tt >= B.period / 4 && n > rb.ringN) { rb.ringN = n; ctx.pulse(e.x, e.z, rb.fy, { ...B.ring, damage: B.ring.damage, h: B.ring.h ?? 1.0 }); emit(w, 'bell_strike', { x: e.x, z: e.z, id: e.id }); }
    // under the middle of the swing: crushed
    if (rb.crushCd <= 0 && p.hp > 0) {
      const c = ctx.hitCyl(e);
      if (c.y0 < p.y + 1.7 && c.y1 > p.y && Math.hypot(p.x - c.x, p.z - c.z) < B.crush.r + 0.45) { ctx.hurt(Math.round(B.crush.damage * diff.enemyDamage)); rb.crushCd = B.crush.cooldown; const d = Math.hypot(p.x - c.x, p.z - c.z) || 1; ctx.tryMove(p, (p.x - c.x) / d * B.crush.knock, (p.z - c.z) / d * B.crush.knock, 0.4); emit(w, 'bell_crush', { x: p.x, z: p.z }); }
    }
    // the last anchor is gone: it falls
    if (anchorsOf(w).alive === 0 && w.enemies.some((n) => n.kind === 'rootanchor')) { rb.mode = 'fall'; rb.v = 0; rb.lift = e.lift; emit(w, 'bell_fall', { x: e.x, z: e.z, id: e.id }); }
    return true;
  }
  if (rb.mode === 'fall') {
    rb.v += B.fall.g * dt; rb.lift = Math.max(0, rb.lift - rb.v * dt); e.lift = rb.lift;
    if (rb.lift <= 0) {
      rb.mode = 'ground'; e.lift = 0;
      for (let r = 0; r <= 14; r += 0.5) { const a = DM.atan2(rb.cz - e.z, rb.cx - e.x); const nx = e.x + DM.cos(a) * r, nz = e.z + DM.sin(a) * r; if (r === 0 ? ctx.free(e.x, e.z, def.radius) : ctx.free(nx, nz, def.radius)) { if (r > 0) { e.x = nx; e.z = nz; } break; } }
      ctx.pulse(e.x, e.z, rb.fy, { ...B.fall.slam, hitHeight: 1.0, h: 1.6 }); emit(w, 'bell_slam', { x: e.x, z: e.z, id: e.id }); emit(w, 'shake', { amount: 0.9 });
      const dd = Math.hypot(p.x - e.x, p.z - e.z); if (dd < def.hitRadius + 1.6 && p.hp > 0) { ctx.hurt(Math.round(B.crush.damage * diff.enemyDamage)); const d = dd || 1; ctx.tryMove(p, (p.x - e.x) / d * B.crush.knock, (p.z - e.z) / d * B.crush.knock, 0.4); }
      e.chargeCd = 1.5; e.stunT = 1.0;
    }
    return true;
  }
  // ---- on the ground
  if (!rb.last && frac < B.last) {                                                            // the Last Note
    rb.last = true; e.chargeC = { ...def.charge, ...B.lastCharge }; emit(w, 'bell_last', { x: e.x, z: e.z, id: e.id });
  }
  if (rb.last) {                                                                              // the note rolls the whole floor every few seconds, tiers and all
    const tt = w.time - (rb.lastT0 ?? (rb.lastT0 = w.time)), n = Math.floor(tt / B.lastRing.every);
    if (n > rb.lastN) { rb.lastN = n; ctx.pulse(e.x, e.z, rb.fy, { speed: B.lastRing.speed, width: B.ring.width, maxR: B.lastRing.maxR, damage: B.lastRing.damage, h: B.lastRing.h }); emit(w, 'bell_strike', { x: e.x, z: e.z, id: e.id, last: true }); }
  }
  rb.spikeCd -= dt;                                                                           // rooted spikes where the player stands, a second's warning
  if (rb.spikeCd <= 0 && p.hp > 0 && Math.hypot(p.x - e.x, p.z - e.z) < 40) {
    rb.spikeCd = B.spikes.every * diff.reaction * (rb.last ? 0.7 : 1);
    (w.spikes ??= []).push({ id: w.nextId++, x: p.x, z: p.z, y: p.y, age: 0, struck: false }); emit(w, 'spike_warn', { x: p.x, z: p.z });
  }
  return false;
}

/** the spikes tick: after `warn` s a spike strikes up (hurting whoever is inside `r` and not a stride above it), and stays for `life` s more */
export function updateSpikes(ctx) {
  const { w, dt, emit, diff } = ctx, p = w.player, S = ctx.spikes;
  for (let i = w.spikes.length - 1; i >= 0; i--) {
    const q = w.spikes[i]; q.age += dt;
    if (!q.struck && q.age >= S.warn) { q.struck = true; emit(w, 'spike_strike', { x: q.x, z: q.z }); if (p.hp > 0 && Math.hypot(p.x - q.x, p.z - q.z) < S.r + 0.3 && Math.abs(p.y - q.y) < 1.4) ctx.hurt(Math.round(S.damage * diff.enemyDamage)); }
    if (q.age > S.warn + S.life) w.spikes.splice(i, 1);
  }
}
