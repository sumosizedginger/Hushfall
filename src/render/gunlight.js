// THE HELD GUN IN THE PLACE'S LIGHT: the first build scaled the weapon scene's light by the look's HEMISPHERE (view.js), and the sign-off probe
// (tools/dev/probe-gun.mjs, 29 maps' arrival frames) showed that is a poor guide to how bright a place LOOKS: C2M19's look has
// hemisphere 1.8 and a scene luma of 166, C2M13's has 0.38 and 83 (lamps), so the gun's core luma moved only 46 to 68 against scenes of 26 to 166
// (correlation 0.44; the baseline was flat at 109 to 116, correlation 0.22). So each look the 29 sign-off maps use now names the weapon-light factor
// that brings the
// gun's core to about 45 + 0.30 x the scene's luma there (the gun core is about 25 + 43 x the factor): GUN_LIGHT[look]. A look with no row (the dev
// ranges) keeps the hemisphere's formula. The factor multiplies the old weapon light (1.5 hemisphere, 1.6 key), and follows the level's ambient
// (lights going out dim the gun).
// Refitted 2026-11-12 (Session 5 of design/OPUS_HANDOFF.md) from tools/dev/probe-gun.mjs at floor 0.35: the cores ran about 20 above that line (the
// post pass had changed), so the line was moved up to keep the mean core (83) and only the slope (0.30) was fitted: correlation 0.83 -> 0.92.
import { LOOKS } from '../engine/defs.js';
export const GUN_LIGHT = {
  dusk: 0.64,
  customs: 1.05,
  moon: 0.95,
  cradle: 0.94,
  steppe: 1.19,
  deepgate: 0.7,
  markets: 1,
  halls: 1.19,
  drowned: 0.8,
  ossuary: 1.31,
  gardens: 0.85,
  basilica: 0.88,
  heart: 0.69,
  hive: 0.84,
  nerve: 1.03,
  woven: 1.33,
  veins: 1.05,
  reactor: 0.82,
  mourning: 0.86,
  copy: 1.29,
  conductor: 0.69,
  descent: 0.88,
  roots: 0.89,
  fault: 0.92,
  tide: 1.03,
  rootbell: 0.77,
  unrung: 0.71,
  tender: 0.86,
  quiet: 1.21,
};
// SEATING THE GUN (Session 2 of design/OPUS_HANDOFF.md, item G4): in a dark place the held gun still wore its own warm, saturated light and read
// as pasted on. Below `from` the weapon scene's hemisphere ground colour moves toward the place's own ground colour (up to `ground` of the way) and
// the key light loses saturation (up to `desat`), both growing linearly to the full amount at `full` (the darkest row, dusk). The handoff named
// "under about 0.6"; at full lights that is dusk alone, and the navy looks the assessment named (deepgate, conductor, descent, rootbell, unrung,
// drowned) would be untouched, so the tint starts at `from` and is full at the darkest row. (Session 5, 2026-11-12: the rows were refitted from the
// probe, keeping the mean gun core, so the band moved with them: from 1.0, full at the darkest row, dusk 0.64.)
export const GUN_TINT = Object.freeze({ from: 1.0, full: Math.min(...Object.values(GUN_LIGHT)), ground: 0.35, desat: 0.2 });

/** how much a gun factor tints the weapon light: null for a bright place, else { ground, desat } growing to GUN_TINT's numbers at `full` */
export const gunTint = (factor) => {
  const t = Math.min(1, Math.max(0, (GUN_TINT.from - factor) / (GUN_TINT.from - GUN_TINT.full)));
  return t > 0 ? { ground: GUN_TINT.ground * t, desat: GUN_TINT.desat * t } : null;
};

/** a 0xRRGGBB colour moved `t` of the way toward its own grey (Rec. 709 luma) */
export const desaturateHex = (hex, t) => {
  const r = (hex >> 16) & 255,
    g = (hex >> 8) & 255,
    b = hex & 255,
    y = 0.2126 * r + 0.7152 * g + 0.0722 * b,
    m = (c) => Math.min(255, Math.max(0, Math.round(c + (y - c) * t)));
  return (m(r) << 16) | (m(g) << 8) | m(b);
};

/** the name of a look row (the rows do not carry it) */
export const lookName = (look) => Object.keys(LOOKS).find((n) => LOOKS[n] === look) ?? null;
/** the weapon light's factor for a look at an ambient level, or null when the look has no row (the caller keeps the hemisphere's formula) */
export const gunFactor = (look, ambient = 1) => {
  const f = GUN_LIGHT[lookName(look)];
  return f == null ? null : f * Math.min(1.1, Math.max(0.3, Math.sqrt(Math.max(0, ambient))));
};
