// PT-022 (owner go 2026-10-08): the CHAINSAW, held fire. Unlimited fuel, a STALL (owner: "unlimited with a stall"): hold fire to rev, it cuts every body in front of you every WEAPONS.chainsaw.saw.every seconds, cutting builds heat, plate
// and bells kick it back, and a stalled saw is dead for a moment. Pure function of the world, called from world.js only while the chainsaw is in hand; no shipped map places one yet, so the campaign never reaches this file.
//   p.saw  { spin 0..1 (the revs), heat 0..1, stall (s left), t (to the next cut), noiseT, eng (it is in something), near (m to the nearest body it cut) }   (made when the saw is first used)
import { PLAYER, ENEMIES, NOISE } from './defs.js';
import { emit, damageEnemy, tryMove, rayClear, hitEffects, noise } from './world.js';
import { hitCylinder } from './hitvolume.js';

const clamp = (x, a, b) => Math.min(b, Math.max(a, x));

/** every tick while the chainsaw is in hand. `cmd.fire` held = rev and cut. */
export function sawStep(w, cmd, def, dt) {
  const p = w.player, S = def.saw, st = (p.saw ??= { spin: 0, heat: 0, stall: 0, t: 0, noiseT: 0, eng: false, near: 99 });
  if (st.stall > 0) {                                                                                  // dead: it coughs, the revs die away
    st.stall = Math.max(0, st.stall - dt); st.spin = Math.max(0, st.spin - dt * 4); st.t = 0; st.eng = false;
    if (st.stall === 0) { st.heat = S.restart; emit(w, 'saw_restart', {}); }
    return;
  }
  const want = !!cmd.fire && p.hp > 0 && p.switchT <= 0 && !p.sprinting && p.swingT < 0 && p.recover <= 0;
  if (want) { if (st.spin === 0) { emit(w, 'saw_start', {}); st.noiseT = 0; } st.spin = Math.min(1, st.spin + dt / S.spinUp); }
  else { if (st.spin > 0 && st.spin - dt / S.spinDown <= 0) emit(w, 'saw_stop', {}); st.spin = Math.max(0, st.spin - dt / S.spinDown); st.t = 0; st.eng = false; }
  if (st.spin > 0) { st.noiseT -= dt; if (st.noiseT <= 0) { st.noiseT = S.noiseEvery; noise(w, p.x, p.z, NOISE.chainsaw); emit(w, 'saw_rev', {}); } }
  if (want && st.spin >= 1) {
    st.t -= dt;
    if (st.t <= 0) { st.t += S.every; const n = cutTick(w, S, st, p); st.eng = n > 0; }                        // a cut tick: whoever is in front is struck; `eng` says the saw is in something, and stays so until the next cut finds nothing
    if (st.eng && st.near > 0.9) tryMove(w, p, -Math.sin(p.yaw) * S.drag * dt, -Math.cos(p.yaw) * S.drag * dt, PLAYER.radius);      // it bites and pulls you in (never into the body)
  }
  st.heat = st.eng ? Math.min(1.2, st.heat + dt / S.heatTime) : Math.max(0, st.heat - dt * S.cool);
  if (st.heat >= 1) { st.stall = S.stall; st.heat = 1; st.spin = Math.min(st.spin, 0.5); emit(w, 'saw_stall', { x: p.x, z: p.z }); }
}

/** one cut: every body inside the reach and the arc in front, with a clear line, is struck; the saw drags the player into what it is cutting. Returns how many bodies it struck. */
function cutTick(w, S, st, p) {
  const fx = -Math.sin(p.yaw), fz = -Math.cos(p.yaw), ey = p.y + PLAYER.eye; let n = 0, near = 99;
  for (const e of w.enemies) {
    if (e.state === 'dead') continue;
    const c = hitCylinder(e), dx = c.x - p.x, dz = c.z - p.z, d = Math.hypot(dx, dz);
    if (d - c.r > S.reach || c.y1 < p.y + 0.15 || c.y0 > ey + 0.4) continue;
    const ang = Math.acos(clamp((dx * fx + dz * fz) / (d || 1), -1, 1)), slack = Math.atan2(c.r, Math.max(d, 0.01));
    if (d > 0.05 && ang - slack > S.arc / 2) continue;
    if (!rayClear(w, p.x, ey - 0.3, p.z, c.x, clamp(ey - 0.4, c.y0 + 0.2, c.y1 - 0.2), c.z)) continue;
    const ed = ENEMIES[e.kind];
    let hard = 0;                                                                                       // plate (the front of a Warden) and bells kick the saw back
    if (ed.armor && (e.stunT || 0) <= 0 && (Math.sin(e.yaw) * (p.x - e.x) + Math.cos(e.yaw) * (p.z - e.z)) / (Math.hypot(p.x - e.x, p.z - e.z) || 1) > ed.armor.cos) hard = S.plateHeat; else if (ed.node) hard = S.nodeHeat;
    n++; near = Math.min(near, d - c.r);
    const killed = damageEnemy(w, e, S.damage);
    if (hard) { st.heat = Math.min(1.2, st.heat + hard); emit(w, 'saw_kick', { x: e.x, z: e.z }); }
    if (!killed) { hitEffects(w, e, { flinch: S.flinch }); emit(w, 'enemy_hit', { id: e.id, kind: e.kind, x: e.x, z: e.z }); }
    emit(w, 'saw_hit', { x: e.x, y: e.y + ed.height * 0.55, z: e.z, killed, hard: !!hard });
  }
  st.near = n ? near : 99;
  return n;
}
