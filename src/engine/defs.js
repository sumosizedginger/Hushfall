// Data tables. Everything tunable about the simulation lives here (no magic numbers in world.js).
export const TICK = 1 / 60;          // fixed simulation step (seconds)
export const CELL = 2;               // metres per map cell
export const DEFAULT_CEILING = 3.6;

export const DIFFICULTY = {
  easy: { name: 'Easy', enemyHp: 0.75, enemyDamage: 0.6, ammoPickup: 1.5, reaction: 1.3 },
  normal: { name: 'Normal', enemyHp: 1, enemyDamage: 1, ammoPickup: 1, reaction: 1 },
  hard: { name: 'Hard', enemyHp: 1.2, enemyDamage: 1.25, ammoPickup: 0.8, reaction: 0.85 },
};

export const PLAYER = {
  radius: 0.32, eye: 1.6, accel: 14, maxHp: 100, maxArmor: 100, startAmmo: { flare: 8 }, dryFeed: { every: 10, amount: 1 }, useReach: 2.3, armorAbsorb: 0.5,
  speed: 6.4,               // walk, m/s
  sprintMult: 1.55,         // applies to the forward component only; strafing and backing up stay at walk speed
  sprintMinForward: 0.3,    // sprint needs this much forward input
  sprintRecover: 0.18,      // s after sprint ends before the weapon can fire (weapon raise)
  sprintBlendTime: 0.2,     // s to lower/raise the weapon (view pose)
  adsTime: 0.14,            // s to bring the weapon up to the sights
  adsMoveMult: 0.55,        // movement speed at full aim
};
// Camera constants shared by the view and the sensitivity scaling (view-only; the sim never reads FOV).
export const VIEW = { fov: 70, adsFov: 46, sprintFovKick: 5 };
/** enemies notice loud gunfire this far away (only if nothing solid is in the way, or very close) */
export const NOISE = { flare: 22, scattergun: 26, rivet: 20, harpoon: 30, arc: 14, explosion: 24, closeRange: 9, melee: 9 };
export const AMMO_MAX = { flare: 30, shell: 40, rivet: 200, bolt: 24, cell: 100 };
/** fixed slot order of the GUNS (keys 1..5); a weapon occupies its slot once owned. Slot 6 (key 6) is the melee slot: fists always, plus the found weapons of MELEE_ORDER (pressing 6 again cycles them). */
export const WEAPON_ORDER = ['flare', 'scattergun', 'rivet', 'harpoon', 'arc'];
export const MELEE_ORDER = ['fists', 'boathook', 'marlinspike', 'mallet', 'axe'];
export const MELEE_SLOT = WEAPON_ORDER.length;                                    // the slot index of the melee slot (0-based: key 6)
/** every weapon id in one stable order (save sorting, the HUD) */
export const ALL_WEAPONS = [...WEAPON_ORDER, ...MELEE_ORDER];
/** Guard and parry (PT-013, owner go 2026-10-07; every number a first guess). With a melee weapon in hand the Aim key GUARDS (always a hold). A guard raised no more than `window` s before a melee strike lands PARRIES it:
 *  the attacker is staggered `parryStun` s and the next melee hit lands for `riposteMult` x (for `riposteT` s). A guard held longer BLOCKS (`block` of the damage gets through; a heavy blow breaks the block for `brokenT` s). A parry window that found nothing
 *  costs `whiffCd` s before a new one can open (no spamming the key). Only attackers in front of the player (`cos`) can be guarded against. Ranged toll-shots are not guarded (a deliberate limit). */
export const GUARD = { raise: 0.1, window: 0.2, whiffCd: 0.6, block: 0.3, cos: 0.3, parryStun: 1.0, riposteT: 2.0, riposteMult: 2, brokenT: 0.8 };
/** a quick bash with whatever is in hand (key V): a free, weak strike that does not need ammunition. It blocks the gun for its own duration. */
/** PT-014: where an enemy's melee blow can land. A blow lands only on a player INSIDE the creature's frontal arc at the moment it lands (cos of the half-angle: 0.34 = about 70 degrees each side), a dash (a Gaunt's lunge, a Warden's charge) only on a player AHEAD of it (0.5 = 60 degrees). The windup is the tell: a creature does not turn once it has begun. cos -1 = the old behaviour, a blow all the way round. */
export const ENEMY_STRIKE = { cos: 0.34, dashCos: 0.5 };
/** PT-016, the dev-only weapons range (maps-dev/RANGE.json, `range: true`; never part of the campaign). A target with `hold` stands on its post: 'inert' never fights, 'turn' faces you and swings, 'fixed' never turns; it heals fully after `healAfter` s unhurt and, killed, stands up again after `respawnAfter` s. The player cannot die there, is healed after `playerHealAfter` s unhurt and has every ammunition refilled after `refillAfter` s without firing (or at once when the gun in hand is empty). */
/** The tell of a secret panel (PT-015: the owner finished the level and "no sign of a secret"; the old tell was a 5 cm hairline at 32% in the middle of the panel). View constants only, the sim never reads them: lamplight leaks out of the
 *  seam into every open side as a bright full-height seam (`seam` metres wide), stepped halos round it ([width m, opacity]) and a patch of light on the floor in front of it ([width m, depth m, opacity]), all additive. */
export const SECRET_TELL = { color: 0xffb45a, seam: 0.12, seamOpacity: 0.9, halo: [[0.45, 0.22], [1.0, 0.1]], spill: [[1.0, 0.7, 0.3], [1.8, 1.6, 0.18], [2.6, 2.6, 0.1]] };
/**
 * The LOOK of a place (PT-021, the outside critique: "the rooms are boxes... a player should know which place they are in with the gun down", "the light is flat"): until now EVERY map was lit by the same hemisphere, the same purple
 * sun and one global post grade, and a map differed only by its fog colour, its sky and an `ambient` scalar. A map now names a look (`atmosphere.look`); the default is exactly the old one, so a map that names none is unchanged.
 * View constants only: the simulation never reads them (render and post read them; the validator only checks the name).
 *   hemi [sky, ground, level]   sun [colour, level, [x, y, z] direction]   lamp  scale of every lamp / pod / lantern light   exposure  scale of the post exposure
 *   grade { shadow, light, sat }  the post pass's cool-shadow / warm-light tint (multipliers per channel) and its saturation
 *   shade { foot, ao, patch }  baked into the level's vertex colours: how dark a wall's foot and head are, how much a floor / ceiling darkens toward a wall, how strongly large patches vary the tile (0 = off)
 */
const GR = (shadow, light, sat) => ({ shadow, light, sat });
export const LOOKS = {
  harbour: { hemi: [0x9fb4d0, 0x3a2a40, 2.4], sun: [0xd8b0e0, 1.3, [-8, 14, -6]], lamp: 1, exposure: 1, grade: GR([0.9, 1.0, 1.08], [1.07, 1.0, 0.93], 1), shade: { foot: 0, ao: 0, patch: 0 } },                    // the pre-PT-021 light: the default
  dusk: { hemi: [0xd2aa98, 0x2c2638, 2.3], sun: [0xffa868, 1.9, [-14, 7, -5]], lamp: 1, exposure: 1, grade: GR([0.84, 0.92, 1.14], [1.14, 1.0, 0.84], 1.12), shade: { foot: 0.3, ao: 0.35, patch: 0.08 } },          // Port Marrow's one hour: low warm sun, violet shade
  customs: { hemi: [0xb4c4cc, 0x2a3038, 1.5], sun: [0xe8f0ff, 0.5, [-6, 14, -8]], lamp: 1.25, exposure: 1, grade: GR([0.9, 1.0, 1.0], [1.0, 1.03, 0.97], 0.78), shade: { foot: 0.35, ao: 0.4, patch: 0.1 } },       // institutional: cold tubes, grey-green, drained
  moon: { hemi: [0x6c84b8, 0x181e34, 1.5], sun: [0x9cb4ff, 1.0, [7, 13, -9]], lamp: 1.45, exposure: 1, grade: GR([0.8, 0.94, 1.22], [1.1, 1.02, 0.9], 1.08), shade: { foot: 0.3, ao: 0.4, patch: 0.1 } },            // the harbour at night: blue shade, the lamps are the warm things
  cellar: { hemi: [0x4a7068, 0x141c1c, 1.1], sun: [0x80c0b0, 0.2, [-6, 14, -6]], lamp: 1.6, exposure: 1, grade: GR([0.82, 1.06, 1.0], [1.1, 1.0, 0.86], 0.9), shade: { foot: 0.45, ao: 0.5, patch: 0.12 } },           // damp stone under the quay: green-black, a lamp is a room
  signal: { hemi: [0x5c6c88, 0x14182a, 1.2], sun: [0x9aa8c8, 0.3, [-6, 14, -6]], lamp: 1.6, exposure: 1, grade: GR([0.84, 0.94, 1.18], [1.08, 1.0, 0.9], 0.85), shade: { foot: 0.4, ao: 0.45, patch: 0.1 } },          // the dark house on the hill: cold blue, the generator light
  hill: { hemi: [0xa8b4c8, 0x383440, 2.1], sun: [0xd0d0e0, 0.9, [-9, 12, -3]], lamp: 1.1, exposure: 1, grade: GR([0.9, 0.97, 1.1], [1.04, 1.0, 0.94], 0.95), shade: { foot: 0.25, ao: 0.3, patch: 0.08 } },           // overcast, wind, the survivors' lanterns
  salt: { hemi: [0xe4e6e6, 0x8c887a, 3.0], sun: [0xfff2dc, 2.4, [-5, 18, -4]], lamp: 0.55, exposure: 1, grade: GR([0.97, 1.03, 1.0], [1.03, 1.02, 0.97], 0.62), shade: { foot: 0.25, ao: 0.3, patch: 0.07 } },          // the works: bleached, hard, chemical, drained of colour
  kiln: { hemi: [0x7a5240, 0x1e1412, 1.3], sun: [0xff8a4c, 1.1, [-12, 6, -6]], lamp: 1.5, exposure: 1, grade: GR([1.0, 0.88, 0.84], [1.16, 0.98, 0.78], 1.15), shade: { foot: 0.4, ao: 0.45, patch: 0.1 } },            // Kiln Row: soot and ember, red-brown shade
  cradle: { hemi: [0x58b4a4, 0x2a1830, 1.3], sun: [0x70f0d0, 0.25, [-6, 14, -6]], lamp: 1.5, exposure: 1, grade: GR([0.84, 1.06, 1.06], [1.1, 1.03, 0.88], 1), shade: { foot: 0.4, ao: 0.5, patch: 0.14 } },             // the Vael's rooms: wet teal, the pods are the light
  pump: { hemi: [0x78988a, 0x16201a, 1.5], sun: [0xd0e0c0, 0.7, [-4, 16, -2]], lamp: 1.3, exposure: 1, grade: GR([0.9, 1.04, 0.96], [1.04, 1.02, 0.9], 0.8), shade: { foot: 0.4, ao: 0.45, patch: 0.1 } },               // pumps and slurry: industrial green-black
  rime: { hemi: [0xcce0f0, 0x5a7088, 2.6], sun: [0xe0f0ff, 1.5, [-8, 15, -6]], lamp: 0.9, exposure: 1, grade: GR([0.88, 1.0, 1.16], [1.02, 1.02, 1.0], 0.7), shade: { foot: 0.25, ao: 0.3, patch: 0.06 } },              // the cold vault: pale, blue, still
};
export const lookOf = (atmosphere) => LOOKS[atmosphere?.look] ?? LOOKS.harbour;
/**
 * MARKS THAT STAY (PT-021 step 2): the cells of the 4 x 4 `decals_atlas` by name, how many marks of each ring the view keeps (the oldest is recycled), and which creatures bleed (the rest leave the Vael's ichor).
 * A map may list its own marks (`decals`, validated by kind). View data only: the simulation never reads it and no save holds it.
 */
export const DECALS = {
  kinds: { blood: [0, 1, 2], pock: [3], ichor: [4, 5, 6], drip: [7], bloodpool: [8], ichorpool: [9], scorch: [10], streak: [11], smear: [12], scrape: [13], damp: [14], soot: [15] },
  rings: { pock: 96, splat: 128, mark: 96 },
  human: ['tollbearer', 'gaunt', 'bellhand', 'sexton', 'wardengraft'],
};
/** THE VAEL'S GROWTH with thickness (PT-021 step 5): a map lists where it started (`growth: [{ at, r, power }]`); render-only. max sources, how fast it thins with distance, lobes per wall face at full strength, how high it climbs, sacs at the heart. */
export const GROWTH = { max: 8, falloff: 1.15, perFace: 9, reach: 3.2, sacs: 14 };
export const RANGE = { holdModes: ['inert', 'turn', 'fixed'], healAfter: 3, respawnAfter: 5, playerHealAfter: 3, refillAfter: 1.5 };
export const BASH = { reach: 1.9, arc: 1.3, damage: 15, windup: 0.1, recover: 0.35, knock: 0.5, flinch: 0.5 };
export const KEYS = { brass: { name: 'Brass key', color: '#c9a44c' }, iron: { name: 'Iron key', color: '#8fa3b8' }, bell: { name: 'Bell key', color: '#4ff3d4' } };

// ---- terrain (Gate 2 production kit) ----------------------------------------------------------------------------------
/** heights are authored in 0.5 m units (0-9, a-z); an actor can step UP at most STEP metres and can drop any distance */
export const HEIGHT_UNIT = 0.5, STEP = 0.6;
/** floor effects (the map's optional `fx` layer): wading water slows; toxic residue slows a little and burns */
export const FX = { w: { name: 'wading water', speed: 0.62 }, x: { name: 'toxic residue', speed: 0.8, dps: 6 }, h: { name: 'ember bed', speed: 0.85, dps: 8 } };
/** how much room an interior cell must have between floor and ceiling for the player to fit (validated) */
export const MIN_HEADROOM = 2.4;
/** wall / floor skins: the tile char picks the painted texture. kind: what the sim/renderer treat it as. ceiling: interior cells get one. */
export const WALL_SKINS = { '#': 'wall_bulkhead_a', B: 'brick_warm_a', W: 'wall_timber_a', P: 'wall_plaster_a', C: 'wall_concrete_a', I: 'wall_iron_a', R: 'wall_resin_a', T: 'tower_stone_a', L: 'wall_saltbrick_a', K: 'wall_corrugated_a', Y: 'wall_kiln_a', Z: 'wall_rime_a' };            // L, K: Episode 2 (the Salt Works); Y kiln brick, Z frosted steel (Gate 4 batch 2)
export const FLOOR_SKINS = {
  '.': { kind: 'floor', tex: 'floor_planks_a' }, ':': { kind: 'outdoor', tex: 'cobble_wet_a' }, p: { kind: 'outdoor', tex: 'floor_planks_a', tint: 0xa8b0bc },
  t: { kind: 'floor', tex: 'floor_tile_a' }, g: { kind: 'floor', tex: 'floor_grate_a' }, c: { kind: 'floor', tex: 'floor_carpet_a' }, f: { kind: 'floor', tex: 'floor_flag_a' },
  m: { kind: 'outdoor', tex: 'floor_silt_a' }, n: { kind: 'floor', tex: 'floor_silt_a' }, s: { kind: 'outdoor', tex: 'floor_slate_a' },
  l: { kind: 'outdoor', tex: 'floor_saltcrust_a' },                                  // Episode 2: the pans
  b: { kind: 'outdoor', tex: 'floor_track_a' }, q: { kind: 'floor', tex: 'floor_track_a' }, k: { kind: 'floor', tex: 'floor_clinker_a' }, v: { kind: 'floor', tex: 'floor_slurry_a' }, r: { kind: 'floor', tex: 'floor_rime_a' },   // Episode 2 (batch 2): rail track, kiln clinker, slurry, rime deck
};

// kind 'projectile' is implemented; other kinds are added with their weapons in Gate 1.
export const WEAPONS = {
  flare: { name: 'Flare cannon', kind: 'projectile', ammo: 'flare', cooldown: 0.9, speed: 24, gravity: 2.2, splash: 3.4, splashDamage: 70, direct: 12, selfDamage: 0.35, switchTime: 0.4,
    // PT-013 identity: AREA. The burst leaves burning ground (enemies standing in it burn; the player is not hurt by their own fire) and lights the room for as long as it lasts.
    burn: { r: 2.5, t: 4, dps: 9, max: 8 }, muzzle: { fwd: 0.7, right: 0.16, down: 0.14 },
    spread: { hip: 0.035, ads: 0.003, moveFactor: 0.5 },   // radians (half-angle); hip spread grows with movement, aiming tightens it
  },
  // hitscan close-range punch: instant, no splash, no self-damage, useless past ~15 m. The flare is the slow area-denial counterpart.
  scattergun: { name: 'Tidewarden scattergun', kind: 'hitscan', ammo: 'shell', cooldown: 0.95, switchTime: 0.35, pellets: 9, damage: 9, range: 26, falloffStart: 5, falloffMin: 0.3, knock: 0.22, kick: 0.11, spread: { hip: 0.075, ads: 0.038, moveFactor: 0.4 }, muzzle: { fwd: 0.7, right: 0.12, down: 0.14 },
    hit: { flinch: 0.25, interrupt: 3 } },                  // PT-013 identity: CLOSE. Every hit staggers a little; inside `interrupt` metres a hit CANCELS the windup of the attack it lands on. (First try 0.45 s: on C1E2M03 it cut a perfect bot's damage taken on normal from 51 to 19: a flinch that long is a stun-lock in a stationary player's hands.)
  // sustained fire from the hip or the sights: a stream of small hits, accurate while you stay still and settled (bloom builds the longer you hold the trigger).
  // The answer to crowds of weak targets and the workhorse when shells and flares run dry; weak per hit, so it does not replace the scattergun's punch.
  rivet: { name: 'Riveter driver', kind: 'hitscan', ammo: 'rivet', cooldown: 0.085, switchTime: 0.35, pellets: 1, damage: 7, range: 34, falloffStart: 14, falloffMin: 0.55, knock: 0.05, kick: 0.035, muzzle: { fwd: 0.7, right: 0.1, down: 0.1 }, heatPerShot: 0.075, heatDecay: 1.4, heatCone: 3.2, spread: { hip: 0.03, ads: 0.006, moveFactor: 1.2 },
    hit: { slow: 0.1, slowT: 0.8, cancelLunge: true } },    // PT-013 identity: SUPPRESS. Rivets slow what they hit (10% for 0.8 s, at most 1 s at a time: SLOW_MAX in world.js) and break a Gaunt's lunge windup (once in a while): it holds crowds off, it does not kill them. (First tries: 30% for 1 s cut a perfect bot's damage taken on C1E2M04 hard from 45 to 9; 20% still failed C1E2M04 and C1E2M07's viability gates; 10% passes all of them. A stream of 12 shots a second turns any slow into a permanent one: that is why it is small.)
  // the long gun (Gate 4, owner go 2026-10-06): one heavy bolt, instant, almost no drop-off at 90 m, and it goes THROUGH: it punches the front plate of an armoured target (the Warden-Graft's shield-arm no longer
  // turns it) and the bolt carries on into a second body behind the first at 60%. Slow (a bolt every 1.35 s), few rounds (24 at most), loud (30 m), and only accurate when you stop and use the sights, which also zoom it right in.
  // It is the answer to what the other three cannot reach: a Drone-Gill hovering out of scattergun range, a Bellhand on a far causeway, plate. It is not the answer to a crowd.
  harpoon: { name: 'Harpoon rifle', kind: 'hitscan', ammo: 'bolt', cooldown: 1.35, switchTime: 0.55, pellets: 1, damage: 80, range: 90, falloffStart: 90, falloffMin: 1, pierce: 1, pierceDamage: 0.6, pierceArmor: true, knock: 0.55, kick: 0.07, adsFov: 24, muzzle: { fwd: 0.8, right: 0.1, down: 0.12 },
    spread: { hip: 0.05, ads: 0.0008, moveFactor: 1.2 },
    hit: { flinch: 0.4, pin: { wall: 3, t: 2 } } },         // PT-013 identity: ONE HEAVY SHOT. A bolt that leaves a body with a wall within `wall` metres behind it PINS it for `t` s (not the elites or the bosses)
  // the lamp (Gate 4, owner go 2026-10-06): held fire, 12 m, it picks its own target (the nearest body inside a lock cone around where you look; the sights narrow the cone) and the arc JUMPS to up to `chain` more bodies within `jump` metres of the last, each for `chainFalloff` of the one before.
  // Forgiving where the rifle is exact, and quiet (14 m). It is the answer to what the others handle badly: a crowd, a clutch of Gills hovering about, a dark room. Weak per hit; plate and shields count as they do for any shot.
  arc: { name: 'Charge-arc lamp', kind: 'arc', ammo: 'cell', cooldown: 0.16, switchTime: 0.4, damage: 11, range: 12, chain: 3, jump: 4.5, chainFalloff: 0.7, lock: { hip: 0.14, ads: 0.06 }, kick: 0.012, muzzle: { fwd: 0.6, right: 0.1, down: 0.1 }, spread: { hip: 0, ads: 0, moveFactor: 0 },
    // PT-013 identity (owner: 'it doesn't make me feel more powerful or like I have more range'): TAP = the short arc above (it fires on release). HOLD past `min` s CHARGES to `max`: a forked bolt, `range` m, `damage`, `chain` jumps at `chainFalloff`, up to `forks` branches, for up to `cells` cells.
    // WATER: a struck body standing in wading water conducts to every body in the same water within `water.r` m, for `water.mult` x the base damage. VAEL: Drone-Gills struck are stunned `vael.stun` s; bell nodes take `vael.nodeMult` x.
    charge: { min: 0.35, max: 1.2, damage: 60, range: 24, chain: 5, chainFalloff: 0.8, jump: 6, forks: 2, cells: 8, recover: 0.35 }, water: { r: 8, mult: 1.5, max: 8 }, vael: { stun: 1.2, kinds: ['gill'], nodeMult: 2 }, hit: { flinch: 0.15 } },
  // ---- melee (PT-013): fists are always owned (slot 6); the found weapons are picked up and take the same slot (key 6 again cycles). `swing`: reach m (from the player's centre to the body's surface), arc rad (full cone), damage, windup/recover s, knock m, flinch s,
  // optional stun s, pull m, backstab x (sleeping or turned-away targets), cleave (every body in the arc), ignorePlate (the Warden's front plate does not turn it). Every number a first guess.
  fists: { name: 'Fists', kind: 'melee', switchTime: 0.25, swing: { reach: 1.9, arc: 1.3, damage: 8, windup: 0.08, recover: 0.27, knock: 0.25, flinch: 0.25 },
    charge: { min: 0.3, max: 0.65, heavy: { reach: 2.1, arc: 1.2, damage: 30, windup: 0.1, recover: 0.8, knock: 1.4, stun: 1.0, flinch: 0.6 } } },
  boathook: { name: 'Boat hook', kind: 'melee', switchTime: 0.4, swing: { reach: 2.8, arc: 0.7, damage: 28, windup: 0.2, recover: 0.5, knock: 0, pull: 1.5, flinch: 0.4 } },
  marlinspike: { name: 'Marlinspike', kind: 'melee', switchTime: 0.3, swing: { reach: 1.9, arc: 0.6, damage: 16, windup: 0.07, recover: 0.25, knock: 0.1, backstab: 3, flinch: 0.15 } },      // 16 x 3 = 48: a stab kills a Tollbearer (45) that did not see it coming
  mallet: { name: "Lamplighter's mallet", kind: 'melee', switchTime: 0.5, swing: { reach: 2.1, arc: 1.1, damage: 30, windup: 0.3, recover: 0.65, knock: 1.0, stun: 1.5, ignorePlate: true, flinch: 0.6 } },
  axe: { name: 'Fire axe', kind: 'melee', switchTime: 0.55, swing: { reach: 2.3, arc: 1.75, damage: 55, windup: 0.35, recover: 0.75, knock: 0.8, cleave: true, flinch: 0.6 } },
};

// `radius` is the MOVEMENT collider (walls, props, bodies, pathing). SHOTS test the hit volume (src/engine/hitvolume.js): `height` is the DRAWN height, `hitRadius` (default `radius`) and
// `hitForward` (default 0: metres ahead of the feet along the facing) fit the drawn body. Measured on the real rigs and enforced by tests/hit-volume-fair.test.js (owner decision 2026-10-05, PT-005).
export const ENEMIES = {
  tollbearer: { name: 'Tollbearer', hp: 45, speed: 1.8, gait: 6.5, radius: 0.4, height: 2.25, sight: 22, turnRate: 3, attack: { range: 1.9, reach: 2.6, windup: 0.64, duration: 1.5, cooldown: 0.9, damage: 18 } },
  // fast, fragile pursuer. Crouches (the tell), then dashes in a straight line: strafe out of it. Punishes standing still.
  gaunt: { name: 'Gaunt Runner', poise: 0.8, hp: 24, speed: 4.2, gait: 12, radius: 0.34, height: 1.5, hitRadius: 0.5, hitForward: 0.3, sight: 26, turnRate: 6, attack: { range: 1.5, reach: 2.1, windup: 0.4, duration: 0.75, cooldown: 0.4, damage: 9 }, lunge: { min: 3, max: 6, windup: 0.3, duration: 0.36, speed: 11, cooldown: 2.4 } },
  // Ranged: stops at `hold` metres and tolls a slow, dodgeable shot after a readable arm-raise. Punishes running in straight lines and standing in the open.
  bellhand: { name: 'Bellhand', hp: 32, speed: 1.9, gait: 6, radius: 0.38, height: 2.35, sight: 32, turnRate: 3.5, attack: { range: 1.9, reach: 2.4, windup: 0.6, duration: 1.3, cooldown: 1.1, damage: 12 }, ranged: { hold: 9, minRange: 3, maxRange: 22, speed: 9.5, damage: 14, aimHeight: 1.2 } },
};

// ---- Gate 2 roster ---------------------------------------------------------------------------------------------------------
// Sexton: support. Keeps its distance and raises the fallen after a visible channel (a teal beam from its bell to the corpse). Kill it first, or interrupt it by hurting it.
ENEMIES.sexton = { name: 'Sexton', hp: 42, speed: 1.7, gait: 6, radius: 0.38, height: 2.35, sight: 28, turnRate: 3.5, attack: { range: 1.6, reach: 2.1, windup: 0.7, duration: 1.2, cooldown: 1.4, damage: 8 },
  support: { range: 11, channel: 2.2, cooldown: 5, reviveHp: 0.5, keepAway: 8, maxRevives: 2, kinds: ['tollbearer', 'gaunt', 'bellhand'] } };
// Warden-Graft: elite. Plate on the front arc (direct hits from the front do a third of the damage; splash and hits from behind do not care). Charges in a straight line after a
// readable windup; a charge into a wall or prop staggers it, and it takes extra damage while it is down. The flare cannon and a step to the side are the answers.
ENEMIES.wardengraft = { name: 'Warden-Graft', poise: 3, hp: 260, speed: 1.5, gait: 5, radius: 0.55, height: 3.0, sight: 30, turnRate: 2.4, attack: { range: 2.6, reach: 3.2, windup: 0.62, duration: 1.7, cooldown: 1.2, damage: 30 },
  armor: { front: 0.34, cos: 0.6, stunMult: 1.6 }, charge: { min: 5, max: 16, windup: 0.85, speed: 11.5, duration: 1.5, damage: 36, stun: 2.6, cooldown: 3.2, knock: 3.0 } };
// Bell node: one of the ring the Cantor sings through. Immobile; destroying them all breaks the Cantor's shield.
ENEMIES.bellnode = { name: 'Bell node', hp: 120, speed: 0, gait: 0, radius: 0.7, height: 2.45, sight: 0, turnRate: 0, attack: { range: 0, reach: 0, windup: 1, duration: 1, cooldown: 1, damage: 0 }, node: true };
// Cantor: the boss. Shielded (5% damage) while any bell node stands. Sings expanding tone pulses (cover and height stop them), summons Gaunts, and fans toll-shots once its ring is broken.
ENEMIES.cantor = { name: 'Cantor', poise: 8, hp: 720, speed: 1.3, gait: 4.5, radius: 0.65, height: 4.8, hitRadius: 0.8, sight: 70, turnRate: 2, attack: { range: 3.0, reach: 3.6, windup: 0.8, duration: 1.6, cooldown: 2.4, damage: 28 }, boss: true,
  shield: { reduce: 0.05 }, pulse: { cooldown: 5.6, windup: 1.2, speed: 9.5, damage: 22, width: 1.3, maxR: 40, hitHeight: 1.0 }, enragedPulseCooldown: 3.6,
  shots: { count: 3, spread: 0.26, speed: 9, damage: 15, cooldown: 3.2, aimHeight: 1.2 }, summon: { kind: 'gaunt', count: 3, every: 18, max: 8 }, stagger: 3.0 };

// ---- Gate 4 batch 2 roster (Episode 2): the first Vael-grown creatures -------------------------------------------------------------------------------------------------------------------------
// Drone-Gill: a hatched, FLYING Vael drone (design/CAMPAIGN_SPINE.md section 3: the first non-human enemy, C1E2M05). It hovers `hover` metres above the floor (the hit volume starts there: shoot at the body, not at the floor
// under it), ignores props and water (only walls and closed doors stop it), keeps its distance, strafes while it spits slow spores, and drops to the floor when it dies. Fragile; the scattergun and the rivet driver answer it.
ENEMIES.gill = { name: 'Drone-Gill', poise: 0.8, hp: 30, speed: 2.7, gait: 9, radius: 0.36, height: 1.15, hover: 1.2, flying: true, hitRadius: 0.6, sight: 30, turnRate: 4.5,
  attack: { range: 1.8, reach: 2.2, windup: 0.5, duration: 0.9, cooldown: 0.8, damage: 8 },
  ranged: { hold: 7, minRange: 2.2, maxRange: 20, speed: 8.5, damage: 9, aimHeight: 1.1, muzzleY: 1.75 }, strafe: { speed: 2.4, every: 1.1 } };
// Cradle feeder: one of the three feeding cradles that keep the Graft-Mother's shield up (the Cantor's bell node, grown: immobile, destroying them all drops the shield).
ENEMIES.feeder = { name: 'Cradle feeder', hp: 100, speed: 0, gait: 0, radius: 0.7, height: 2.1, sight: 0, turnRate: 0, attack: { range: 0, reach: 0, windup: 1, duration: 1, cooldown: 1, damage: 0 }, node: true };
// Graft-Mother: the Episode 2 boss. A vast pod-body on the line's end, shielded (6% damage) while any feeder stands. Spits fans of spores (always, wider once her feeders are gone), hatches Drone-Gills from the pods round her,
// and slams anything that reaches her. She barely moves.
ENEMIES.graftmother = { name: 'Graft-Mother', poise: 8, hp: 680, speed: 0.8, keepAway: 0, gait: 3, radius: 0.9, height: 4.2, hitRadius: 1.4, sight: 70, turnRate: 1.6, attack: { range: 3.6, reach: 4.2, windup: 0.8, duration: 1.6, cooldown: 2.2, damage: 34 }, boss: true,
  shield: { reduce: 0.06, y: 2.2, r: 3.1, note: ['FEEDER', 'FEEDERS', 'STILL FEED'] }, shots: { count: 5, spread: 0.2, speed: 7.5, damage: 11, cooldown: 4.0, aimHeight: 1.2, always: true }, summon: { kind: 'gill', count: 2, every: 18, max: 4 }, stagger: 3.0 };

export const PICKUPS = {
  key_iron: { type: 'key', key: 'iron' },
  key_bell: { type: 'key', key: 'bell' },
  health_small: { type: 'health', amount: 15 },
  health_large: { type: 'health', amount: 40 },
  ammo_flare: { type: 'ammo', ammo: 'flare', amount: 4 },
  ammo_shell: { type: 'ammo', ammo: 'shell', amount: 6 },
  weapon_scattergun: { type: 'weapon', weapon: 'scattergun', ammo: 'shell', amount: 8 },
  weapon_rivet: { type: 'weapon', weapon: 'rivet', ammo: 'rivet', amount: 60 },
  ammo_rivet: { type: 'ammo', ammo: 'rivet', amount: 40 },
  weapon_harpoon: { type: 'weapon', weapon: 'harpoon', ammo: 'bolt', amount: 6 },
  ammo_bolt: { type: 'ammo', ammo: 'bolt', amount: 4 },
  weapon_arc: { type: 'weapon', weapon: 'arc', ammo: 'cell', amount: 30 },
  ammo_cell: { type: 'ammo', ammo: 'cell', amount: 20 },
  weapon_boathook: { type: 'weapon', weapon: 'boathook' },
  weapon_marlinspike: { type: 'weapon', weapon: 'marlinspike' },
  weapon_mallet: { type: 'weapon', weapon: 'mallet' },
  weapon_axe: { type: 'weapon', weapon: 'axe' },
  armor_vest: { type: 'armor', amount: 50 },
  key_brass: { type: 'key', key: 'brass' },
};

// radius > 0 means a solid circular collider; blocksCell marks props that make a whole 2 m cell impassable for pathing.
export const PROPS = {
  crate: { radius: 0.78, blocksCell: true },
  crate2: { radius: 0.78, blocksCell: true, blocksSight: true },            // two stacked crates
  stall: { radius: 0.95, blocksCell: true },             // fish-market stall with an awning
  bollard: { radius: 0.22, blocksCell: false },          // mooring post
  barrel: { radius: 0.5, blocksCell: false },
  pillar: { radius: 0.62, blocksCell: true, blocksSight: true },
  lamppost: { radius: 0.3, blocksCell: false },
  lamp: { radius: 0, blocksCell: false },
  pod: { radius: 0, blocksCell: false },
  // Gate 2 set dressing
  cart: { radius: 0.85, blocksCell: true },              // handcart / luggage trolley
  sack: { radius: 0.45, blocksCell: false },             // grain / salt sacks
  cradle: { radius: 0, blocksCell: false },              // a Vael cradle: a captive hung from the ceiling (nothing to bump into)
  rope: { radius: 0.3, blocksCell: false },              // coil of rope
  table: { radius: 0.8, blocksCell: true },
  shelf: { radius: 0.7, blocksCell: true, blocksSight: true },
  lantern: { radius: 0, blocksCell: false },             // small lamp on a hook: warm light, survivors' signal
  bellnode: { radius: 0.7, blocksCell: false },          // decor twin of the boss ring nodes
};

/** distant, non-colliding set dressing (may lie outside the playable grid) */
export const SCENERY = { tower: {}, boat: {}, crane: {}, gantry: {} };

export const DOOR = { speed: 1.5, passableAt: 0.85, holdOpen: 5, autoCloseClearance: 1.3 };
export const FACING = { east: -Math.PI / 2, west: Math.PI / 2, north: 0, south: Math.PI };
