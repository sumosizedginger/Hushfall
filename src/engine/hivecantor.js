// THE HIVE CANTOR'S BEAT (PT-043; design/ACTC.md section 4): the conductor of the Hive hovers over its podium and never walks. It works on the Hive beat (hive.js): one beat before it lets go its ring it draws it (the rig's arms come up), on the beat itself
// the DOUBLE RETURNING RING goes out (turns at `reflect` m, a second ring `echo` s behind the first), and in phase two (half its hit points or the choir dead) the ring comes every bar and the dome calls Choristers. The choir's tiers strike on
// beat floors the MAP authors (`pulses`); this module only reads the clock. Lazy: only a creature with `hive` in its definition runs it.
import { isBeatTick, beatNo, onBeatOf } from './hive.js';

/** ctx: { w, e, def, diff, dt, emit, pulse(x, z, y, spec), spawn(kind, x, z), phase (the phase entry or null) }. Returns true (it used the tick). */
export function hiveStep(ctx) {
  const { w, e, def, diff, dt, emit } = ctx, ph = ctx.phase, ring = { ...def.hive.ring, ...(ph?.hive?.ring ?? {}) };
  if (isBeatTick(w.tick)) {
    const n = beatNo(w.tick);
    if (onBeatOf(n + 1, ring.every, ring.at)) { e.pulseT = 0; emit(w, 'enemy_windup', { id: e.id, kind: e.kind, x: e.x, z: e.z }); }                 // the baton comes up one beat before
    else if (onBeatOf(n, ring.every, ring.at)) { ctx.pulse(e.x, e.z, e.y, { speed: ring.speed, width: ring.width, maxR: ring.maxR, damage: ring.damage, reflectAt: ring.reflect }); emit(w, 'pulse', { x: e.x, z: e.z }); e.pulseT = -1; if (ring.echo) e.echoT = ring.echo; }
  }
  if ((e.pulseT ?? -1) >= 0) e.pulseT += dt;
  if (e.echoT > 0) { e.echoT -= dt; if (e.echoT <= 0) { e.echoT = 0; ctx.pulse(e.x, e.z, e.y, { speed: ring.speed, width: ring.width, maxR: ring.maxR, damage: ring.damage, reflectAt: ring.reflect }); emit(w, 'pulse', { x: e.x, z: e.z, echo: true }); } }
  const S = ph?.summon;
  if (S && e.summons?.length) {
    e.summonCd = Math.max(0, (e.summonCd ?? 0) - dt);
    if (e.summonCd <= 0) {
      if (w.enemies.filter((o) => o.kind === S.kind && o.state !== 'dead' && o.summoned).length < S.max) for (let i = 0; i < S.count; i++) { e.summonN = (e.summonN ?? -1) + 1; const [sx, sz] = e.summons[e.summonN % e.summons.length]; ctx.spawn(S.kind, sx, sz); }
      e.summonCd = S.every * diff.reaction;
    }
  }
  return true;
}
