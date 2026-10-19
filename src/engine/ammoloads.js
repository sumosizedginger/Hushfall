// AMMUNITION LOADS (PT-056, R9 of the Director's Plan; design/WEAPONS_AND_CONTROLS_PLAN.md section 15). PURE: the state a player carries (`p.loads`, `p.loadSel`), the cycling, the spending, the changed copy of a weapon definition a loaded shot uses, and what a hit leaves
// on a creature (`e.ignT`, `e.chillT`, `e.brittle`). The sim (world.js) calls these from the firing code and ticks the statuses; nothing here touches the world's random stream or its event queue, and every field is LAZY: a world that never meets a load never
// creates one, so it is byte-for-byte what it was (tools/dev/route-fingerprint.mjs proves it). Not the falling LOADS of loads.js.
import { AMMO_LOADS, AMMO_LOAD_ORDER, WEAPONS } from './defs.js';

/** how many units of a load a shot spends: 1, or `cost[gun]` (the penetrator: two rounds a shot for the rivet driver and the carbine) */
export const loadCost = (id, gun) => AMMO_LOADS[id]?.cost?.[gun] ?? 1;
/** units of a load the player carries for a gun */
export const loadCount = (p, gun, id) => p.loads?.[gun]?.[id] ?? 0;
/** may this load go in this gun? */
export const loadFits = (id, gun) => !!AMMO_LOADS[id]?.guns.includes(gun);
/** the load a shot from `gun` uses right now: the selected one if there is enough of it for a shot, otherwise null (the standard ammunition) */
export function activeLoad(p, gun) {
  const id = p.loadSel?.[gun]; if (!id || !loadFits(id, gun)) return null;
  return loadCount(p, gun, id) >= loadCost(id, gun) ? id : null;
}
/** the loads a gun could cycle through with something in them, in AMMO_LOAD_ORDER */
export const loadsOf = (p, gun) => AMMO_LOAD_ORDER.filter((id) => loadFits(id, gun) && loadCount(p, gun, id) >= loadCost(id, gun));
/** add `n` units (never past `cap`); the first pickup for a gun selects it (a player who finds a load should see it in use); returns how many units went in */
export function addLoad(p, gun, id, n, cap) {
  const have = loadCount(p, gun, id), put = Math.max(0, Math.min(n, cap - have)); if (put <= 0) return 0;
  const L = (p.loads ??= {}), G = (L[gun] ??= {}); G[id] = have + put;
  if (!p.loadSeen?.[gun]) (p.loadSel ??= {})[gun] = id;                                       // the first load a gun ever gets is selected
  (p.loadSeen ??= {})[gun] = true;
  return put;
}
/** one shot's worth spent from the load (the caller has checked activeLoad); a load that cannot pay for another shot is deselected. Returns true if the gun went back to its standard ammunition */
export function spendLoad(p, gun, id) {
  const G = p.loads[gun]; G[id] -= loadCost(id, gun);
  if (G[id] < loadCost(id, gun)) { if (p.loadSel?.[gun] === id) delete p.loadSel[gun]; return true; }
  return false;
}
/** the next choice for `gun`: standard -> each load that has something in it -> standard. Returns { gun, load } (load null = standard) or null if there is nothing to cycle to */
export function cycleLoad(p, gun) {
  const opts = [null, ...loadsOf(p, gun)]; if (opts.length < 2) return null;
  const now = activeLoad(p, gun), next = opts[(opts.indexOf(now) + 1) % opts.length];
  if (next) (p.loadSel ??= {})[gun] = next; else if (p.loadSel) delete p.loadSel[gun];
  return { gun, load: next };
}
/** the definition a LOADED shot is fired with: a copy of the gun's own (the original is never touched) with the load's damage, reach through bodies, frost ground instead of fire, and `load` naming the load for the hit code */
export function loadedDef(def, gun, id) {
  const L = AMMO_LOADS[id], d = { ...def, load: id };
  if (L.dmg !== 1) { if (d.damage != null) d.damage = def.damage * L.dmg; if (d.splashDamage != null) { d.splashDamage = def.splashDamage * L.dmg; d.direct = def.direct * L.dmg; } }
  if (L.through) { if (def.pierce != null) { d.pierce = def.pierce + L.through; d.pierceDamage = L.throughMult; } else if (def.kind === 'hitscan') d.through = L.through; }
  if (id === 'rime' && def.burn) d.burn = { ...def.burn, dps: 0, frost: true };                // a rime flare leaves ground that slows and chills instead of burning
  return d;
}
/** what a hit leaves on a creature that survives it: slag lights it (unless it stands in water: `wet`), rime chills it, puts the fire out and makes the next blow land harder. Returns the effect that took, for the event the view and the sound read */
export function applyLoadHit(e, id, wet) {
  const L = AMMO_LOADS[id]; if (!L) return null;
  if (L.ignite) { if (wet) return 'fizzle'; e.ignT = Math.max(e.ignT || 0, L.ignite.t); e.ignDps = Math.max(e.ignDps || 0, L.ignite.dps); return 'ignite'; }
  if (L.chill) { e.chillT = Math.max(e.chillT || 0, L.chill.t); e.chillK = L.chill.slow; e.brittle = L.chill.brittle; e.brittleTick = null; if ((e.ignT || 0) > 0) { e.ignT = 0; return 'quench'; } return 'chill'; }
  return null;
}
/** the sentence the HUD and the Journal use for a load */
export const loadLine = (id) => { const L = AMMO_LOADS[id], g = L.guns.map((k) => WEAPONS[k]?.name ?? k).join(', '); return `${L.name}: ${id === 'slag' ? 'sets them alight' : id === 'rime' ? 'chills, and the next hit lands harder' : 'double on plate, through one more body'}. For the ${g}.`; };
