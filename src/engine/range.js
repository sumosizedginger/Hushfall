// The dev-only weapons range (PT-016). Pure functions of the world, called from world.js only when a map says `range: true` or an enemy says `hold`; no shipped map does, so nothing here touches the campaign's simulation.
import { RANGE, WEAPONS, AMMO_MAX, PLAYER } from './defs.js';
import { ammoCap, armorCap } from './progress.js';

/** a target on its post: `hold` is 'inert' | 'turn' | 'fixed'; `hp` (optional, absolute) lets a map make a sponge. Called once from createWorld. */
export function holdTarget(en, e) {
  en.hold = e.hold; en.post = { x: en.x, z: en.z, yaw: en.yaw }; en.state = 'chase';        // a target is always awake: no sleeper bonus, no waking by sight
  if (e.hp > 0) en.hp = e.hp; en.maxHp = en.hp; en.hurtT = 0;
  if (e.sight > 0) en.sightR = e.sight;                                                     // metres: a swinger that only notices you when you come close (the hall is not a shooting gallery for the Bellhands)
}

/** every tick, before the enemy acts: heal when it has been left alone, stand up again after a kill (as a revived creature does: the view already knows 'enemy_revived'). `emit` is passed in (world.js owns it). */
export function holdUpkeep(w, e, dt, emit) {
  if (e.state === 'dead') {
    e.respawnT = (e.respawnT ?? RANGE.respawnAfter) - dt;
    if (e.respawnT > 0) return;
    Object.assign(e, { state: 'chase', hp: e.maxHp, dead: 0, x: e.post.x, z: e.post.z, yaw: e.post.yaw, attackT: -1, struck: false, cd: 0.5, lungeT: -1, lungeHit: false, chargeT: -1, channelT: -1, stunT: 0, slowT: 0, slowAge: 0, slowImm: 0, intCd: 0, walk: 0, hurtT: 0, respawnT: undefined, lost: 0, steer: 0 });
    w.stats.kills--; emit(w, 'enemy_revived', { id: e.id, kind: e.kind, x: e.x, z: e.z });
    return;
  }
  e.hurtT = (e.hurtT ?? 0) + dt;
  if (e.hp < e.maxHp && e.hurtT >= RANGE.healAfter) e.hp = e.maxHp;
}

/** the player's side of the range: never dead, healed after a quiet moment, ammunition refilled after a pause in firing (or at once when the gun in hand is empty) */
export function rangePlayer(w, dt) {
  const p = w.player, r = (w.range ??= { dmg: 0, hurtT: 0, shots: 0, fireT: 0 });
  if (w.stats.damageTaken !== r.dmg) { r.dmg = w.stats.damageTaken; r.hurtT = 0; } else r.hurtT += dt;
  if (p.hp < 1) p.hp = 1;                                                                 // the blow that would have killed you is still counted (the 'hurt' event carried it)
  if (r.hurtT >= RANGE.playerHealAfter) { p.hp = Math.max(p.hp, PLAYER.maxHp); p.armor = Math.max(p.armor, armorCap(w.upgrades)); }
  if (w.stats.shots !== r.shots) { r.shots = w.stats.shots; r.fireT = 0; } else r.fireT += dt;
  const kind = WEAPONS[p.weapon]?.ammo;
  if (r.fireT >= RANGE.refillAfter || (kind && (p.ammo[kind] || 0) <= 0)) for (const k of Object.keys(AMMO_MAX)) p.ammo[k] = Math.max(p.ammo[k] || 0, ammoCap(k, w.upgrades));
}
