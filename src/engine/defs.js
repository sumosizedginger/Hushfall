// Data tables. Everything tunable about the simulation lives here (no magic numbers in world.js).
export const TICK = 1 / 60;          // fixed simulation step (seconds)
export const CELL = 2;               // metres per map cell
export const DEFAULT_CEILING = 3.6;

export const DIFFICULTY = {
  easy: { name: 'Easy', enemyHp: 0.75, enemyDamage: 0.6, ammoPickup: 1.5, reaction: 1.3 },
  normal: { name: 'Normal', enemyHp: 1, enemyDamage: 1, ammoPickup: 1, reaction: 1 },
  hard: { name: 'Hard', enemyHp: 1.25, enemyDamage: 1.4, ammoPickup: 0.75, reaction: 0.8 },
};

export const PLAYER = {
  radius: 0.32, eye: 1.6, accel: 14, maxHp: 100, maxArmor: 100, startAmmo: { flare: 8 }, useReach: 2.3, armorAbsorb: 0.5,
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
export const AMMO_MAX = { flare: 30 };
export const KEYS = { brass: { name: 'Brass key', color: '#c9a44c' } };

// kind 'projectile' is implemented; other kinds are added with their weapons in Gate 1.
export const WEAPONS = {
  flare: { name: 'Flare cannon', kind: 'projectile', ammo: 'flare', cooldown: 0.9, speed: 24, gravity: 2.2, splash: 3.4, splashDamage: 70, direct: 12, selfDamage: 0.35, muzzle: { fwd: 0.7, right: 0.16, down: 0.14 },
    spread: { hip: 0.035, ads: 0.003, moveFactor: 0.5 },   // radians (half-angle); hip spread grows with movement, aiming tightens it
  },
};

export const ENEMIES = {
  tollbearer: { name: 'Tollbearer', hp: 45, speed: 1.2, radius: 0.4, height: 1.95, sight: 22, turnRate: 3, attack: { range: 1.9, reach: 2.6, windup: 0.64, duration: 1.5, cooldown: 0.9, damage: 18 } },
};

export const PICKUPS = {
  health_small: { type: 'health', amount: 15 },
  health_large: { type: 'health', amount: 40 },
  ammo_flare: { type: 'ammo', ammo: 'flare', amount: 4 },
  armor_vest: { type: 'armor', amount: 50 },
  key_brass: { type: 'key', key: 'brass' },
};

// radius > 0 means a solid circular collider; blocksCell marks props that make a whole 2 m cell impassable for pathing.
export const PROPS = {
  crate: { radius: 0.78, blocksCell: true },
  barrel: { radius: 0.5, blocksCell: false },
  pillar: { radius: 0.62, blocksCell: true },
  lamppost: { radius: 0.3, blocksCell: false },
  lamp: { radius: 0, blocksCell: false },
  pod: { radius: 0, blocksCell: false },
};

export const DOOR = { speed: 1.5, passableAt: 0.85, holdOpen: 5, autoCloseClearance: 1.3 };
export const FACING = { east: -Math.PI / 2, west: Math.PI / 2, north: 0, south: Math.PI };
