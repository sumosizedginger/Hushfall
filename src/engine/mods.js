// WEAPON MODS (PT-057, R9 of the Director's Plan; design/WEAPONS_AND_CONTROLS_PLAN.md section 16). PURE: which mods a player owns (`p.mods`), which tier (`w.upgrades.mods2`: bought at the Locker), and the changed copy of a gun's definition a modded shot is fired with. Lazy: `p.mods` exists only
// once a mod has been picked up, so a world that never meets one is byte-for-byte what it was. Nothing here touches the world's random stream or its event queue.
import { MODS, MOD_ORDER } from './defs.js';

/** does the player own this mod? */
export const ownsMod = (p, id) => !!p.mods?.[id];
/** 1 or 2: the tier of an owned mod (two once it has been bought at the Locker) */
export const modTier = (w, id) => (w.upgrades?.mods2?.[id] ? 2 : 1);
/** the owned mods that fit a gun, in MOD_ORDER */
export const modsOf = (p, gun) => (p.mods ? MOD_ORDER.filter((id) => p.mods[id] && MODS[id].gun === gun) : []);
/** a mod picked up: true if it was new */
export function addMod(p, id) { if (!MODS[id] || p.mods?.[id]) return false; (p.mods ??= {})[id] = 1; return true; }
const lerp = (a, b, t) => a + (b - a) * t;

/** the definition `gun` is fired with, given the mods the player owns: the gun's own object when there is none that applies (the same reference, so nothing downstream can tell), a modified copy otherwise. `ctx` = { tier(id), ammo, spin } */
export function modDef(def, gun, p, ctx) {
  const mine = modsOf(p, gun); if (!mine.length) return def;
  let d = def;
  for (const id of mine) {
    const M = MODS[id], t2 = ctx.tier(id) === 2 ? M.tier2 : null;
    if (id === 'doublebarrel') { if ((ctx.ammo ?? 0) >= M.cost) d = { ...d, pellets: d.pellets * M.pellets, cost: M.cost, cooldown: t2?.cooldown ?? M.cooldown, mod: id }; }
    else if (id === 'spinup') {
      const k = Math.min(1, Math.max(0, (ctx.spin ?? 0) / M.time)), sp = d.spread;
      d = { ...d, cooldown: d.cooldown * lerp(1, M.rate, k), spread: { ...sp, hip: sp.hip * (1 - M.tighten * k), ads: sp.ads * (1 - M.tighten * k) }, ...(t2 ? { heatCone: 0 } : {}), mod: id };
    }
    else if (id === 'longchain') { const n = M.chain + (t2?.chain ?? 0); d = { ...d, chain: d.chain + n, charge: d.charge ? { ...d.charge, chain: d.charge.chain + n } : d.charge, mod: id }; }
    else if (id === 'barbed') d = { ...d, barbed: { pin: t2?.pin ?? M.pin, ...(t2?.bleed ? { bleed: t2.bleed } : {}) }, mod: id };
    else if (id === 'phosphor') d = { ...d, burn: { ...d.burn, t: d.burn.t * M.t, ...(t2?.r ? { r: d.burn.r * t2.r } : {}) }, mod: id };
    else if (id === 'airburst') d = { ...d, splash: d.splash * (t2?.r ?? M.r), mod: id };
  }
  return d;
}
/** one line for the HUD: the marks of the mods on a gun ("DB", "DB 2") */
export const modMarks = (p, w, gun) => modsOf(p, gun).map((id) => MODS[id].mark + (modTier(w, id) === 2 ? '+' : '')).join(' ');
