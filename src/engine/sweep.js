// THE GATE WARDEN'S SWEEP (PT-033, Episode 4 Batch E, design/EPISODE4.md E5): a beam from the Warden's eye that turns through an arc after a tell. A ray, not a cell walk: it is traced in 0.25 m steps along any angle, stops at a wall, a shut door
// or a prop that fills its cell (a pillar), and is turned by the Mirror Array's mirrors (the same one-sided mirrors as beams.js, `w.mirrors` for their rotation): the ray reflects about the mirror's diagonal if it arrives on its face and ends there if it
// arrives on its back. A reflected stretch that passes through a SEAL (a node on the Warden's arch) shatters it: the Mirror Array's lesson used as a weapon. The beam also hurts the player it crosses (once a second at most). PURE tracing + the step.
import { PROPS } from './defs.js';

const R2 = Math.SQRT1_2;
/** the face normals of a mirror by rotation 0..3 (NW, NE, SE, SW): the side the beam must arrive on is the one the normal points to */
const FACE = [[-R2, -R2], [R2, -R2], [R2, R2], [-R2, R2]];
/** trace a ray from (ox, oz) metres at angle `ang` (0 = +z, like a yaw): returns { pts: [[x, z], ...] (the origin, every mirror it bounced off, the end) } */
export function traceSweep(w, ox, oz, ang, solid, range = 64, step = 0.25) {
  const m = w.map, S = m.cell, mirrorAt = new Map((m.mirrors ?? []).map((q) => [q.at.join(','), q]));
  const blockers = m._sweepBlock ?? (m._sweepBlock = new Set(m.props.filter((p) => PROPS[p.kind]?.blocksCell && !['mirror', 'emitter', 'receiver'].includes(p.kind)).map((p) => Math.floor(p.at[0]) + ',' + Math.floor(p.at[1]))));
  const pts = [[ox, oz]]; let x = ox, z = oz, dx = Math.sin(ang), dz = Math.cos(ang), travelled = 0, bounces = 0, last = null;
  while (travelled < range) {
    const nx = x + dx * step, nz = z + dz * step, cx = Math.floor(nx / S), cz = Math.floor(nz / S);
    if (cx < 0 || cz < 0 || cx >= m.w || cz >= m.h || solid(cx, cz) || blockers.has(cx + ',' + cz)) break;
    const mi = mirrorAt.get(cx + ',' + cz);
    if (mi) {
      if (mi !== last) {
        const n = FACE[(((w.mirrors?.[mi.id] ?? mi.rot) % 4) + 4) % 4], dn = dx * n[0] + dz * n[1], mx = (cx + 0.5) * S, mz = (cz + 0.5) * S;
        if (dn >= 0) { pts.push([mx, mz]); return { pts }; }                                  // the back of a mirror
        dx -= 2 * dn * n[0]; dz -= 2 * dn * n[1]; pts.push([mx, mz]); x = mx; z = mz; last = mi; if (++bounces > 6) return { pts };
        continue;
      }
    } else last = null;
    x = nx; z = nz; travelled += step;
  }
  pts.push([x, z]); return { pts };
}
/** the distance from (px, pz) to the polyline's segment `i` (from pts[i] to pts[i + 1]) */
export function distToSegment(pts, i, px, pz) {
  const [ax, az] = pts[i], [bx, bz] = pts[i + 1], vx = bx - ax, vz = bz - az, l2 = vx * vx + vz * vz, t = l2 ? Math.max(0, Math.min(1, ((px - ax) * vx + (pz - az) * vz) / l2)) : 0;
  return Math.hypot(px - (ax + vx * t), pz - (az + vz * t));
}
/**
 * One tick of the sweep for a Warden `e` (the boss step calls it every tick; true = the tick is used up). `H` = { emit, hurtPlayer, damageEnemy, solid }.
 * Cycle: wait `cooldown` s, TELL for `tell` s (the eye opens, a thin line shows where the beam will start), SWEEP for `duration` s through `arc` radians (centred on where the player stood when the tell began, alternating the direction).
 */
export function sweepStep(w, e, def, diff, dt, sees, dist, H) {
  const S = def.sweep, p = w.player;
  e.sweepCd = Math.max(0, (e.sweepCd ?? S.first) - dt);
  if ((e.sweepT ?? -1) >= 0) {
    e.sweepT += dt; e.walk *= 0.85; const total = S.tell + S.duration, ox = e.x, oz = e.z;
    if (e.sweepT >= total) { e.sweepT = -1; e.sweepCd = S.cooldown; e.sweepLine = null; H.emit(w, 'sweep_end', { id: e.id, x: e.x, z: e.z }); return true; }
    const sweeping = e.sweepT >= S.tell, u = sweeping ? (e.sweepT - S.tell) / S.duration : 0, ang = e.sweepA0 + e.sweepDir * S.arc * u;
    const tr = traceSweep(w, ox, oz, ang, H.solid, S.range); e.sweepLine = { pts: tr.pts, beam: sweeping, ang };
    if (sweeping) {
      if (w.time - (e.sweepHitT ?? -9) >= S.hitCd && p.hp > 0) for (let i = 0; i + 1 < tr.pts.length; i++) if (distToSegment(tr.pts, i, p.x, p.z) < S.width + 0.3 && Math.abs((p.y + 0.9) - S.beamY) < 1.6) { e.sweepHitT = w.time; H.hurtPlayer(w, Math.round(S.damage * diff.enemyDamage)); H.emit(w, 'sweep_hit', { x: p.x, z: p.z }); break; }
      for (const s of w.enemies) if (s.kind === 'seal' && s.state !== 'dead') for (let i = 1; i + 1 < tr.pts.length; i++) if (distToSegment(tr.pts, i, s.x, s.z) < 0.7 + S.width) { H.damageEnemy(w, s, 9999, {}); H.emit(w, 'seal_shatter', { id: s.id, x: s.x, z: s.z }); break; }
    }
    return true;
  }
  if (sees && e.sweepCd <= 0 && dist > 4 && (e.pulseT ?? -1) < 0) {
    e.sweepN = (e.sweepN ?? 0) + 1; e.sweepDir = e.sweepN % 2 ? 1 : -1; e.sweepT = 0;
    e.sweepA0 = Math.atan2(p.x - e.x, p.z - e.z) - e.sweepDir * S.arc / 2; H.emit(w, 'sweep_tell', { id: e.id, x: e.x, z: e.z }); return true;
  }
  return false;
}
