// How the guns and the blows FEEL, as data. Pure: render only, the simulation never reads this. A new gun gets a row here or tests/feel.test.js
// fails.
export const GUN_FEEL = {
  flare: { recoil: 1, recover: 4.5, flash: 0.07, shake: 0.2, shakeT: 0.14, light: 1, fire: 0xffa848, muzzle: 0xff9040, casing: null },
  scattergun: { recoil: 1.6, recover: 3.2, flash: 0.09, shake: 0.3, shakeT: 0.3, light: 1.25, fire: 0xffb060, muzzle: 0xffc070, casing: 'shell', casingAt: 0.45, pump: true },
  rivet: { recoil: 0.35, recover: 7, flash: 0.045, shake: 0.05, shakeT: 0.14, light: 0.6, fire: 0xffa848, muzzle: 0xffe090, casing: 'pin', spin: true },
  harpoon: { recoil: 2.2, recover: 2.6, flash: 0.07, shake: 0.42, shakeT: 0.3, light: 0.9, fire: 0xcffff0, muzzle: 0xcffff0, casing: null, pump: true, spin: true },
  arc: { recoil: 0.15, recover: 6, flash: 0.07, shake: 0.06, shakeT: 0.14, light: 0.5, fire: 0x6ffff0, muzzle: 0x6ffff0, casing: null },
  carbine: { recoil: 0.5, recover: 7, flash: 0.04, shake: 0.08, shakeT: 0.14, light: 0.6, fire: 0xffa848, muzzle: 0xffd090, casing: 'case' },
  linethrower: { recoil: 2.6, recover: 2.8, flash: 0.1, shake: 0.55, shakeT: 0.3, light: 1.25, fire: 0xffa848, muzzle: 0xff9030, casing: null, spin: true },
  mortar: { recoil: 2.6, recover: 2.8, flash: 0.1, shake: 0.55, shakeT: 0.3, light: 1.25, fire: 0xffa848, muzzle: 0xff9030, casing: null, spin: true },
};

/** a load colours the shot's light */
export const LOAD_LIGHT = { slag: { fire: 0xff7a2a, muzzle: 0xff7a2a }, rime: { fire: 0x9fdcff, muzzle: 0x9fdcff }, pen: { muzzle: 0xfff2c8 } };

/** what the fire key does to the view for this shot (`charge` 0..1 for the lamp, `mod` the barrel's mod) */
export function shotFeel(weapon, { charge = 0, mod = null, load = null } = {}) {
  const f = GUN_FEEL[weapon] ?? GUN_FEEL.flare,
    L = load ? LOAD_LIGHT[load] : null,
    arc = weapon === 'arc',
    held = arc && charge > 0;
  return {
    recoil: weapon === 'scattergun' && mod === 'doublebarrel' ? 2.6 : arc ? f.recoil + 1.4 * charge : f.recoil,
    recover: f.recover,
    flash: arc ? f.flash + 0.12 * charge : f.flash,
    shake: arc ? f.shake + 0.5 * charge : f.shake,
    shakeT: held ? 0.35 : f.shakeT,
    light: arc ? f.light + charge : f.light,
    fire: L?.fire ?? f.fire,
    muzzle: L?.muzzle ?? f.muzzle,
    casing: f.casing,
    casingAt: f.casingAt ?? 0,
    pump: !!f.pump,
    spin: !!f.spin,
  };
}

/** a burst where a shot stopped, by what it hit */
export const SURFACE_BURST = {
  wood: { colors: [0x8a6a44, 0x5e4630, 0xb08a5c], n: 6, speed: 3.2, life: 0.45, size: 0.8, gravity: 14 },
  stone: { colors: [0x9a9284, 0x6e6a62, 0xc4bcae], n: 5, speed: 2.8, life: 0.36, size: 0.65, gravity: 14 },
  metal: { colors: [0xfff0b0, 0xffc060, 0xffffff], n: 7, speed: 6, life: 0.22, size: 0.42, gravity: 8 },
  earth: { colors: [0x6e5a40, 0x4e4232, 0x8a7458], n: 5, speed: 2, life: 0.42, size: 0.75, gravity: 12 },
  soft: { colors: [0x6a5a50, 0x4c4038], n: 3, speed: 1.4, life: 0.34, size: 0.7, gravity: 10 },
  organic: { colors: [0x3fffe0, 0x7a5a80, 0xb0f0d8], n: 6, speed: 2.6, life: 0.5, size: 0.7, gravity: 11 },
  water: { colors: [0xbfe8f0, 0xffffff, 0x8fc4d0], n: 7, speed: 3.2, life: 0.46, size: 0.6, gravity: 13 },
};

/** a body burst into its parts: what kills that way, and how far past dead it has to be */
export const GIBS = {
  guns: { flare: 0.35, linethrower: 0.25, mortar: 0.25, harpoon: 0.6, axe: 0.15, chainsaw: 0.1, mallet: 0.5, scattergun: 0.55 },
  anything: 1.2, // any gun, this far past dead
  maxParts: 14, // parts one body breaks into
  cap: 84, // parts in the room at once (the oldest go first)
  life: [3.5, 5.5],
  speed: 4.2,
};

/**
 * does this kill burst the body? `over` = how far past dead the blow went, as a share of the creature's health. Never a boss, a node or the innocent;
 * never at reduced gore
 */
export function bursts({ weapon, over = 0, def = {}, gore = 'full' }) {
  if (gore !== 'full' || def.boss || def.node || def.peaceful || def.brood || def.spawner || (def.height ?? 2) > 3.2) return false;
  if (over >= GIBS.anything) return true;
  const need = GIBS.guns[weapon];
  return need != null && over >= need;
}

/** the drawn lean of a body that was just hit: a flick away from the blow that is gone within a third of a second (t in s since the hit). Radians. */
export const FLINCH = { rise: 0.05, fall: 0.3, min: 0.07, max: 0.34, perShare: 0.55 };
export function flinchAt(t, strength) {
  if (!(t >= 0) || t > FLINCH.fall) return 0;
  return strength * (t < FLINCH.rise ? t / FLINCH.rise : (1 - (t - FLINCH.rise) / (FLINCH.fall - FLINCH.rise)) ** 2);
}
export const flinchStrength = (amount, maxHp) => Math.min(FLINCH.max, FLINCH.min + (FLINCH.perShare * Math.max(0, amount)) / Math.max(1, maxHp));

/** the turn of the rig that makes a backwards topple fall away from the blow: (dx, dz) is the blow's direction in the world, `yaw` the root's */
export function fallTurn(dx, dz, yaw) {
  const lx = Math.cos(yaw) * dx - Math.sin(yaw) * dz,
    lz = Math.sin(yaw) * dx + Math.cos(yaw) * dz;
  return Math.atan2(-lx, -lz);
}

/** a spent case: its size in metres, its colour */
export const CASINGS = {
  shell: { size: [0.03, 0.03, 0.07], color: 0xb0342a, life: 4, speed: 2.4 },
  pin: { size: [0.012, 0.012, 0.04], color: 0x8a8a88, life: 2.2, speed: 2.6 },
  case: { size: [0.016, 0.016, 0.05], color: 0xc8a048, life: 3, speed: 2.8 },
};
