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
export const NOISE = { flare: 22, scattergun: 26, rivet: 20, explosion: 24, closeRange: 9 };
export const AMMO_MAX = { flare: 30, shell: 40, rivet: 200 };
/** fixed slot order (keys 1, 2, ...); a weapon occupies its slot once owned */
export const WEAPON_ORDER = ['flare', 'scattergun', 'rivet'];
export const KEYS = { brass: { name: 'Brass key', color: '#c9a44c' }, iron: { name: 'Iron key', color: '#8fa3b8' }, bell: { name: 'Bell key', color: '#4ff3d4' } };

// ---- terrain (Gate 2 production kit) ----------------------------------------------------------------------------------
/** heights are authored in 0.5 m units (0-9, a-z); an actor can step UP at most STEP metres and can drop any distance */
export const HEIGHT_UNIT = 0.5, STEP = 0.6;
/** floor effects (the map's optional `fx` layer): wading water slows; toxic residue slows a little and burns */
export const FX = { w: { name: 'wading water', speed: 0.62 }, x: { name: 'toxic residue', speed: 0.8, dps: 6 } };
/** how much room an interior cell must have between floor and ceiling for the player to fit (validated) */
export const MIN_HEADROOM = 2.4;
/** wall / floor skins: the tile char picks the painted texture. kind: what the sim/renderer treat it as. ceiling: interior cells get one. */
export const WALL_SKINS = { '#': 'wall_bulkhead_a', B: 'brick_warm_a', W: 'wall_timber_a', P: 'wall_plaster_a', C: 'wall_concrete_a', I: 'wall_iron_a', R: 'wall_resin_a', T: 'tower_stone_a' };
export const FLOOR_SKINS = {
  '.': { kind: 'floor', tex: 'floor_planks_a' }, ':': { kind: 'outdoor', tex: 'cobble_wet_a' }, p: { kind: 'outdoor', tex: 'floor_planks_a', tint: 0xa8b0bc },
  t: { kind: 'floor', tex: 'floor_tile_a' }, g: { kind: 'floor', tex: 'floor_grate_a' }, c: { kind: 'floor', tex: 'floor_carpet_a' }, f: { kind: 'floor', tex: 'floor_flag_a' },
  m: { kind: 'outdoor', tex: 'floor_silt_a' }, n: { kind: 'floor', tex: 'floor_silt_a' }, s: { kind: 'outdoor', tex: 'floor_slate_a' },
};

// kind 'projectile' is implemented; other kinds are added with their weapons in Gate 1.
export const WEAPONS = {
  flare: { name: 'Flare cannon', kind: 'projectile', ammo: 'flare', cooldown: 0.9, speed: 24, gravity: 2.2, splash: 3.4, splashDamage: 70, direct: 12, selfDamage: 0.35, switchTime: 0.4, muzzle: { fwd: 0.7, right: 0.16, down: 0.14 },
    spread: { hip: 0.035, ads: 0.003, moveFactor: 0.5 },   // radians (half-angle); hip spread grows with movement, aiming tightens it
  },
  // hitscan close-range punch: instant, no splash, no self-damage, useless past ~15 m. The flare is the slow area-denial counterpart.
  scattergun: { name: 'Tidewarden scattergun', kind: 'hitscan', ammo: 'shell', cooldown: 0.95, switchTime: 0.35, pellets: 9, damage: 9, range: 26, falloffStart: 5, falloffMin: 0.3, knock: 0.22, kick: 0.11, spread: { hip: 0.075, ads: 0.038, moveFactor: 0.4 }, muzzle: { fwd: 0.7, right: 0.12, down: 0.14 } },
  // sustained fire from the hip or the sights: a stream of small hits, accurate while you stay still and settled (bloom builds the longer you hold the trigger).
  // The answer to crowds of weak targets and the workhorse when shells and flares run dry; weak per hit, so it does not replace the scattergun's punch.
  rivet: { name: 'Riveter driver', kind: 'hitscan', ammo: 'rivet', cooldown: 0.085, switchTime: 0.35, pellets: 1, damage: 7, range: 34, falloffStart: 14, falloffMin: 0.55, knock: 0.05, kick: 0.035, muzzle: { fwd: 0.7, right: 0.1, down: 0.1 }, heatPerShot: 0.075, heatDecay: 1.4, heatCone: 3.2, spread: { hip: 0.03, ads: 0.006, moveFactor: 1.2 } },
};

// `radius` is the MOVEMENT collider (walls, props, bodies, pathing). SHOTS test the hit volume (src/engine/hitvolume.js): `height` is the DRAWN height, `hitRadius` (default `radius`) and
// `hitForward` (default 0: metres ahead of the feet along the facing) fit the drawn body. Measured on the real rigs and enforced by tests/hit-volume-fair.test.js (owner decision 2026-10-05, PT-005).
export const ENEMIES = {
  tollbearer: { name: 'Tollbearer', hp: 45, speed: 1.8, gait: 6.5, radius: 0.4, height: 2.25, sight: 22, turnRate: 3, attack: { range: 1.9, reach: 2.6, windup: 0.64, duration: 1.5, cooldown: 0.9, damage: 18 } },
  // fast, fragile pursuer. Crouches (the tell), then dashes in a straight line: strafe out of it. Punishes standing still.
  gaunt: { name: 'Gaunt Runner', hp: 24, speed: 4.2, gait: 12, radius: 0.34, height: 1.5, hitRadius: 0.5, hitForward: 0.3, sight: 26, turnRate: 6, attack: { range: 1.5, reach: 2.1, windup: 0.4, duration: 0.75, cooldown: 0.4, damage: 9 }, lunge: { min: 3, max: 6, windup: 0.3, duration: 0.36, speed: 11, cooldown: 2.4 } },
  // Ranged: stops at `hold` metres and tolls a slow, dodgeable shot after a readable arm-raise. Punishes running in straight lines and standing in the open.
  bellhand: { name: 'Bellhand', hp: 32, speed: 1.9, gait: 6, radius: 0.38, height: 2.35, sight: 32, turnRate: 3.5, attack: { range: 1.9, reach: 2.4, windup: 0.6, duration: 1.3, cooldown: 1.1, damage: 12 }, ranged: { hold: 9, minRange: 3, maxRange: 22, speed: 9.5, damage: 14, aimHeight: 1.2 } },
};

// ---- Gate 2 roster ---------------------------------------------------------------------------------------------------------
// Sexton: support. Keeps its distance and raises the fallen after a visible channel (a teal beam from its bell to the corpse). Kill it first, or interrupt it by hurting it.
ENEMIES.sexton = { name: 'Sexton', hp: 42, speed: 1.7, gait: 6, radius: 0.38, height: 2.35, sight: 28, turnRate: 3.5, attack: { range: 1.6, reach: 2.1, windup: 0.7, duration: 1.2, cooldown: 1.4, damage: 8 },
  support: { range: 11, channel: 2.2, cooldown: 5, reviveHp: 0.5, keepAway: 8, maxRevives: 2, kinds: ['tollbearer', 'gaunt', 'bellhand'] } };
// Warden-Graft: elite. Plate on the front arc (direct hits from the front do a third of the damage; splash and hits from behind do not care). Charges in a straight line after a
// readable windup; a charge into a wall or prop staggers it, and it takes extra damage while it is down. The flare cannon and a step to the side are the answers.
ENEMIES.wardengraft = { name: 'Warden-Graft', hp: 260, speed: 1.5, gait: 5, radius: 0.55, height: 3.0, sight: 30, turnRate: 2.4, attack: { range: 2.6, reach: 3.2, windup: 0.62, duration: 1.7, cooldown: 1.2, damage: 30 },
  armor: { front: 0.34, cos: 0.6, stunMult: 1.6 }, charge: { min: 5, max: 16, windup: 0.85, speed: 11.5, duration: 1.5, damage: 36, stun: 2.6, cooldown: 3.2, knock: 3.0 } };
// Bell node: one of the ring the Cantor sings through. Immobile; destroying them all breaks the Cantor's shield.
ENEMIES.bellnode = { name: 'Bell node', hp: 120, speed: 0, gait: 0, radius: 0.7, height: 2.45, sight: 0, turnRate: 0, attack: { range: 0, reach: 0, windup: 1, duration: 1, cooldown: 1, damage: 0 }, node: true };
// Cantor: the boss. Shielded (5% damage) while any bell node stands. Sings expanding tone pulses (cover and height stop them), summons Gaunts, and fans toll-shots once its ring is broken.
ENEMIES.cantor = { name: 'Cantor', hp: 720, speed: 1.3, gait: 4.5, radius: 0.65, height: 4.8, hitRadius: 0.8, sight: 70, turnRate: 2, attack: { range: 3.0, reach: 3.6, windup: 0.8, duration: 1.6, cooldown: 2.4, damage: 28 }, boss: true,
  shield: { reduce: 0.05 }, pulse: { cooldown: 5.6, windup: 1.2, speed: 9.5, damage: 22, width: 1.3, maxR: 40, hitHeight: 1.0 }, enragedPulseCooldown: 3.6,
  shots: { count: 3, spread: 0.26, speed: 9, damage: 15, cooldown: 3.2, aimHeight: 1.2 }, summon: { kind: 'gaunt', count: 3, every: 18, max: 8 }, stagger: 3.0 };

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
