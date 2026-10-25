// THE HEAVY AMMUNITION CRATE (FREEZE F8, 2026-10-25; PICKUPS.ammo_crate): where an ordinary ammunition box feeds ONE gun, a crate brings EVERY gun you carry up to `fill` of what it can hold. It is for the places the drops do not reach: the caches behind a secret.
// PURE: no DOM, no state of its own. A crate never takes anything away (a gun already past the mark keeps what it has), is only taken when it would add something to at least one gun, and is scaled by the difficulty's pickup factor exactly as an ordinary box is,
// so the "25% less ammunition" robustness runs weigh it the same way. Guns with no ammunition (fists, the melee weapons, the tuning-fork, the chainsaw) are not counted; a gun that shares a type (the line-thrower and the mortar both fire rockets) counts once.
import { WEAPONS } from './defs.js';

/** the ammunition types of the guns the player carries, each once, in a stable order */
export function carriedAmmoTypes(p) {
  const out = []; for (const id of p.weapons) { const a = WEAPONS[id]?.ammo; if (a && !out.includes(a)) out.push(a); } return out;
}
/** what the crate would add to each carried type: { type: gain }, only the types that gain; `capOf(type)` is the cap with the Locker's upgrades, `scale` the pickup factor of the difficulty */
export function crateGains(p, def, capOf, scale = 1) {
  const gains = {};
  for (const type of carriedAmmoTypes(p)) {
    const cap = capOf(type), target = Math.min(cap, Math.round(cap * def.fill * scale)), have = p.ammo[type] || 0;
    if (target > have) gains[type] = target - have;
  }
  return gains;
}
/** take the crate: raise the ammunition and note it in the stats; true when anything was added (false leaves the crate where it lies) */
export function takeCrate(w, p, def, capOf, scale = 1) {
  const gains = crateGains(p, def, capOf, scale), types = Object.keys(gains); if (!types.length) return false;
  const gained = (w.stats.gained ??= {});
  for (const t of types) { p.ammo[t] = (p.ammo[t] || 0) + gains[t]; gained[t] = (gained[t] || 0) + gains[t]; }
  return true;
}
