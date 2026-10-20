// THE MENDER (PT-060, R8 of the Director's Plan; design/ENEMY_ROSTER.md section 2): a small Vael that heals the creatures near it. A priority target with a smaller footprint than the Acolyte's ward: it does not make anything take less, it undoes what you have done, `rate` hit points
// a second to the most hurt creature within `range` (one at a time, a visible tether), until that creature is whole. It keeps `keepAway` from you, stands behind the ones it tends and has nothing else to do: cornered it fights with its hands. It never mends a node, a boss, a spawner,
// a peaceful creature, another Mender or a corpse. Pure: the world's own functions come in through `ctx`. Lazy fields on the creature: `healTarget` (an enemy id or null).
import { ENEMIES } from './defs.js';
import { runAway } from './reposition.js';

const mendable = (o) => { const d = ENEMIES[o.kind]; return o.state !== 'dead' && o.state !== 'idle' && o.state !== 'calm' && o.state !== 'flee' && !d.node && !d.boss && !d.spawner && !d.peaceful && !d.heal; };
export function healStep(ctx) {
  const { w, e, def, diff, dt, sees, dist, emit, retreat, toward } = ctx, H = def.heal;
  const full = (o) => ENEMIES[o.kind].hp * diff.enemyHp, wounded = (o, lim) => mendable(o) && o.hp < full(o) * lim, within = (o, r) => Math.hypot(o.x - e.x, o.z - e.z) <= r;
  let t = e.healTarget != null ? w.enemies.find((o) => o.id === e.healTarget) : null;
  if (t && !(wounded(t, 0.999) && within(t, H.range * 1.3))) { e.healTarget = null; emit(w, 'mender_stop', { id: e.id, x: e.x, z: e.z }); t = null; }       // whole, dead or out of reach: the tether lets go
  if (!t) {
    let best = null, bf = 2;
    for (const o of w.enemies) if (o !== e && wounded(o, H.below) && within(o, H.range)) { const f = o.hp / full(o); if (f < bf) { best = o; bf = f; } }
    if (best) { t = best; e.healTarget = best.id; emit(w, 'mender_start', { id: e.id, x: e.x, z: e.z, tx: best.x, tz: best.z }); }
  }
  if (t) { t.hp = Math.min(full(t), t.hp + H.rate * dt); e.walk *= 0.85; }
  if (runAway(ctx, H.keepAway, 1.5, 3)) return true;                                          // too close: it turns and runs (PT-064), it does not moonwalk; walled in, it fights with its hands
  if (t) return true;                                                                         // tending: it stands where it is
  // nothing to mend: it stays among the others, never walks up to you
  let ally = null; for (const o of w.enemies) if (o !== e && mendable(o) && (!ally || Math.hypot(o.x - e.x, o.z - e.z) < Math.hypot(ally.x - e.x, ally.z - e.z))) ally = o;
  if (ally && !within(ally, H.range * 0.6) && toward(ally.x, ally.z)) { e.walk = Math.min(1, e.walk + dt * 3); e.phase += dt * def.gait; return true; }
  if (sees && dist <= def.attack.range + 0.1) return false;                                    // cornered: it fights with its hands
  e.walk = Math.max(0, e.walk - dt * 3); return true;
}
