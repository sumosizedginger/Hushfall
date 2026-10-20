// THE HELD GUN IN THE PLACE'S LIGHT (PT-065, V3 measured): the first build scaled the weapon scene's light by the look's HEMISPHERE (view.js), and the sign-off probe (tools/dev/probe-gun.mjs, 29 maps' arrival frames) showed that is a poor guide to how bright a place LOOKS: C2M19's look has
// hemisphere 1.8 and a scene luma of 166, C2M13's has 0.38 and 83 (lamps), so the gun's core luma moved only 46 to 68 against scenes of 26 to 166 (correlation 0.44; the baseline was flat at 109 to 116, correlation 0.22). So each look the 29 sign-off maps use now names the weapon-light factor that brings the
// gun's core to about 45 + 0.30 x the scene's luma there (the gun core is about 25 + 43 x the factor): GUN_LIGHT[look]. A look with no row (the dev ranges) keeps the hemisphere's formula. The factor multiplies the old weapon light (1.5 hemisphere, 1.6 key), and follows the level's ambient (lights going out dim the gun).
import { LOOKS } from '../engine/defs.js';
export const GUN_LIGHT = {
  dusk: 0.35, customs: 1.1, moon: 0.89, cradle: 0.93, steppe: 1.33, deepgate: 0.72, markets: 1.02, halls: 1.21, drowned: 0.75, ossuary: 1.04, gardens: 0.82, basilica: 0.89, heart: 0.79, hive: 0.87, nerve: 0.88, woven: 1.62, veins: 0.95, reactor: 0.86, mourning: 1.11, copy: 1.35,
  conductor: 0.7, descent: 0.74, roots: 0.83, fault: 0.89, tide: 1.13, rootbell: 0.66, unrung: 0.65, tender: 0.97, quiet: 1.32,
};
/** the name of a look row (the rows do not carry it) */
export const lookName = (look) => Object.keys(LOOKS).find((n) => LOOKS[n] === look) ?? null;
/** the weapon light's factor for a look at an ambient level, or null when the look has no row (the caller keeps the hemisphere's formula) */
export const gunFactor = (look, ambient = 1) => { const f = GUN_LIGHT[lookName(look)]; return f == null ? null : f * Math.min(1.1, Math.max(0.3, Math.sqrt(Math.max(0, ambient)))); };
