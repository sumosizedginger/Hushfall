// THE NOISE TELL (PT-045, drop B, E9; design/ACTD.md section 2: the quiet play of C2M26 Silent Roots). Pure and read-only: what a shot from the weapon in hand would carry, so the HUD can say QUIET or LOUD with a number and the automap can draw the ring. The numbers are the
// sim's own (NOISE per weapon in defs.js, a map's `atmosphere.echo` for a loud one, `world.js noise()` is what wakes sleepers inside the radius); nothing here is a second copy of a rule, it only reads them. A map says `noiseTell: true` to show it (the Hive yards,
// C2M26): no shipped map says so yet, so no shipped HUD changes. In a dark place it also says how far a creature that follows EYES would notice the player (LANTERN: 6 m unlit, 24 m with the lamp lit or a lit prop near).
import { NOISE, ECHO, LANTERN, WEAPONS } from './defs.js';

const baseRadius = (weaponId) => { const wd = WEAPONS[weaponId]; return wd?.saw ? NOISE.chainsaw : wd?.kind === 'melee' ? NOISE.melee : (NOISE[weaponId] ?? 22); };      // (the saw is in the melee slot but it is the loud one: saw.js makes a noise of NOISE.chainsaw while it runs)
/** the radius in metres a shot (or a blow) from `weaponId` carries on this map, before the charge of a charging weapon adds up to 60% */
export function noiseRadius(map, weaponId) { const r = baseRadius(weaponId); return map.echo !== 1 && r > ECHO.loud ? r * map.echo : r; }
/** { weapon, loud, label: 'QUIET' | 'LOUD', radius (whole metres), light: null | { lit, sees } } for the weapon in hand: loud is the weapon's own, an echo only makes it carry further */
export function noiseTell(w) {
  const id = w.player.weapon, loud = baseRadius(id) > ECHO.loud;
  return { weapon: id, loud, label: loud ? 'LOUD' : 'QUIET', radius: Math.round(noiseRadius(w.map, id)), light: w.map.dark ? { lit: !!w.lit, sees: w.lit ? LANTERN.sightLit : LANTERN.sightDark } : null };
}
/** the lines the HUD shows: { value: 'QUIET', label: 'NOISE 14 M', loud } (the label adds the light in a dark place: 'NOISE 14 M · DARK 6 M') */
export function noiseHud(w) {
  const t = noiseTell(w);
  return { value: t.label, label: 'NOISE ' + t.radius + ' M' + (t.light ? ' · ' + (t.light.lit ? 'LIT' : 'DARK') + ' ' + t.light.sees + ' M' : ''), loud: t.loud };
}
