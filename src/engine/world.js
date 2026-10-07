// Headless, deterministic simulation. Fixed 1/60 s ticks, seeded RNG, plain-data state (JSON-serialisable).
// Nothing here touches DOM/Three/time/Math.random. The renderer reads state and drains events.
import { TICK, DIFFICULTY, PLAYER, AMMO_MAX, WEAPONS, WEAPON_ORDER, MELEE_ORDER, ALL_WEAPONS, GUARD, BASH, ENEMIES, PICKUPS, PROPS, DOOR, NOISE, STEP, FX } from './defs.js';
import { ammoCap, armorCap, sanitizeUpgrades } from './progress.js';
import { nextRandom, initialRngState } from './rng.js';
import { updateExplored, EXPLORE_EVERY_TICKS } from './automap.js';
import { cellFloor, floorAt, groundAt, tooHigh, ceilingAt, fxAt, fxSpeed } from './terrain.js';
import { navWaypoint } from './nav.js';
import { updateSectors, updateTriggers, activateSwitch } from './script.js';
import { insideHit, insideFuse, hitCylinder } from './hitvolume.js';

const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const rand = (w) => nextRandom(w);
const lerp = (a, b, t) => a + (b - a) * t;
const isMelee = (id) => WEAPONS[id]?.kind === 'melee';
const owns = (p, id) => id === 'fists' || p.weapons.includes(id);                     // fists are always owned
const hidden = (o, k, v) => Object.defineProperty(o, k, { value: v, enumerable: false, writable: true, configurable: true });

/** the one place an enemy record is built (createWorld and tests both use it) */
export function spawnEnemy(w, kind, x, z, yaw = Math.PI) {
  const def = ENEMIES[kind], diff = DIFFICULTY[w.difficulty];
  const e = { id: w.nextId++, kind, x, z, y: groundAt(w, x, z, def.radius), group: null, yaw, hp: def.hp * diff.enemyHp, state: 'idle', walk: 0, phase: 0, attackT: -1, cd: 0, struck: false, flash: 0, dead: 0, lungeT: -1, lungeCd: 0, lungeHit: false, lastX: null, lastZ: null, lost: 0, steer: 0, stunT: 0, chargeT: -1, chargeCd: 0, channelT: -1, supCd: 0, revived: 0, pulseCd: 2, pulseT: -1, summonCd: 8, shotCd: 2 };
  w.enemies.push(e); return e;
}

/**
 * What a player has when a level starts: a cold start gets the map's authored entryLoadout; arriving from the previous map they keep what they carry, FLOORED at that loadout (health, each ammo type, weapons).
 * The floor makes the authored loadout a lower bound on every arrival, so the balance evidence measured from it holds in a campaign run (audit A16), and a player who limps out of one map is never stranded at 1 HP with an empty gun.
 */
export function arrivalInventory(carry, entry) {
  if (!carry) return entry ?? null; if (!entry) return carry;
  const ammo = { ...(carry.ammo ?? {}) }; for (const [k, v] of Object.entries(entry.ammo ?? {})) ammo[k] = Math.max(ammo[k] ?? 0, v);
  const weapons = [...new Set([...(carry.weapons ?? []), ...(entry.weapons ?? [])])].sort((x, y) => ALL_WEAPONS.indexOf(x) - ALL_WEAPONS.indexOf(y));
  return { hp: Math.max(carry.hp ?? 0, entry.hp ?? 0), armor: Math.max(carry.armor ?? 0, entry.armor ?? 0), ammo, weapons, ...(carry.upgrades ? { upgrades: carry.upgrades } : {}) };      // the persistent upgrade tiers ride along: they are never part of a map's authored loadout
}

export function createWorld(map, { seed = 1, difficulty = 'normal', carry = null, ammoScale = null } = {}) {
  carry = arrivalInventory(carry, map.entryLoadout ?? null);
  const diff = DIFFICULTY[difficulty];
  if (!diff) throw new Error('unknown difficulty ' + difficulty);
  const w = {
    ...(ammoScale != null ? { ammoScale } : {}),                        // robustness testing only: a level whose ammo pickups are scaled (a player who wastes shots)
    v: 1, mapId: map.id, mapVersion: map.version, seed, difficulty, rngState: initialRngState(seed), tick: 0, time: 0,
    status: 'playing',                       // playing | dead | complete
    nextId: 1,
    player: {
      x: map.spawn.x, z: map.spawn.z, y: 0, yaw: map.spawn.yaw, pitch: 0, vx: 0, vz: 0, bob: 0, hazardT: 0, fx: null,
      hp: carry?.hp ?? PLAYER.maxHp, armor: carry?.armor ?? 0,
      ammo: { ...(carry?.ammo ?? PLAYER.startAmmo) }, weapons: [...(carry?.weapons ?? ['flare'])], weapon: 'flare',
      keys: [], cooldown: 0, hurt: 0, kick: 0, switchT: 0,
      ads: 0, sprint: 0, recover: 0, sprinting: false,      // ads/sprint are 0..1 blends the view reads; sprinting = sprint active this tick
      charge: 0,                                           // seconds the fire key has been held on a charging weapon (the lamp, the fists); the weapon fires on release
      swingT: -1, swingKind: null, swingHit: false,        // a melee swing in progress (-1 = none): seconds since it began, which move, whether its blow has landed
      guard: 0, guarding: false, parryW: 0, parryCd: 0, riposteT: 0, brokenT: 0,   // guard blend 0..1, the parry window left, the whiff cooldown, the riposte bonus left, the broken-guard lockout
      meleeWeapon: [...MELEE_ORDER].reverse().find((id) => (carry?.weapons ?? []).includes(id)) ?? 'fists', lastWeapon: null,              // what key 6 brings up (the heaviest found melee weapon you carry in, else the fists); what Q swaps back to
    },
    enemies: [], projectiles: [], enemyShots: [], pulses: [], pickups: [], doors: [], burns: [],      // burns: the flare cannon's burning ground
    sectors: map.sectors.map((s) => { const h = s.start === 'high' ? s.high : s.low; return { id: s.id, h, target: h, speed: s.speed }; }),      // moving floors (lifts, ramps)
    triggerState: Object.fromEntries(map.triggers.map((t) => [t.id, { fired: false }])), switchState: Object.fromEntries(map.switches.map((s) => [s.id, { used: false, on: false }])),
    exitLocked: Object.fromEntries(map.exits.map((x) => [x.id, !!x.locked])), objective: map.objective ?? null,
    upgrades: sanitizeUpgrades(carry?.upgrades),                         // the campaign's persistent upgrade tiers (progress.js): they set the ammunition and armour CAPS, nothing else; the sim never changes them
    levelStart: { hp: carry?.hp ?? PLAYER.maxHp, armor: carry?.armor ?? 0, ammo: { ...(carry?.ammo ?? PLAYER.startAmmo) }, weapons: [...(carry?.weapons ?? ['flare'])], upgrades: sanitizeUpgrades(carry?.upgrades) },      // what Retry restores (never the mid-level inventory)
    secretsFound: [], messagesSeen: [], explored: new Array(map.w * map.h).fill(0),
    stats: { kills: 0, items: 0, secrets: 0, damageTaken: 0, shots: 0, total: map.counts() },
    endStats: null,
  };
  hidden(w, 'map', map); hidden(w, 'events', []);
  for (const e of map.entities) {
    if (e.type === 'enemy') { const en = spawnEnemy(w, e.kind, e.x, e.z, typeof e.facing === 'number' ? e.facing : Math.PI); if (e.group) en.group = e.group; if (e.summons) en.summons = e.summons.map(([cx, cz]) => [(cx + 0.5) * map.cell, (cz + 0.5) * map.cell]); }
    else if (e.type === 'pickup') w.pickups.push({ id: w.nextId++, kind: e.kind, x: e.x, z: e.z, y: floorAt(w, e.x, e.z) });
  }
  w.player.y = groundAt(w, w.player.x, w.player.z, PLAYER.radius);
  for (const d of map.doors.values()) w.doors.push({ cx: d.cx, cz: d.cz, key: d.key, open: 0, target: 0, hold: 0, secret: !!d.closet || !!d.remote, remote: !!d.remote, closet: !!d.closet, sealed: false });
  for (const s of map.secrets) w.doors.push({ cx: s.panel[0], cz: s.panel[1], key: null, open: 0, target: 0, hold: 0, secret: true, secretId: s.id });
  return w;
}

export function drainEvents(w) { const e = w.events; w.events = []; hidden(w, 'events', w.events); return e; }
export const emit = (w, type, data = {}) => w.events.push({ type, tick: w.tick, ...data });

// ---------------------------------------------------------------- collision
export const doorAtCell = (w, cx, cz) => w.doors.find((d) => d.cx === cx && d.cz === cz);
export function cellSolid(w, cx, cz) {
  const m = w.map, k = m.kind(cx, cz);
  if (k === 'wall') return true;
  if (k === 'door' || k === 'secret') { const d = doorAtCell(w, cx, cz); return !d || d.open < DOOR.passableAt; }
  return false;
}
/** blocks walking: walls, closed doors, and water. (Sight and projectiles use cellSolid, so they pass over water.) */
function blocksMove(w, cx, cz) { return cellSolid(w, cx, cz) || w.map.kind(cx, cz) === 'water'; }
/** `self` = the moving entity (player or enemy): living enemies and the player then block it, so nothing walks through anyone. */
export function blockedCircle(w, x, z, r, self = null) {
  const S = w.map.cell, fly = !!(self && self.kind && ENEMIES[self.kind]?.flying);                  // a flyer (Drone-Gill) is stopped by walls and closed doors only: not by water, ledges or props
  for (let cz = Math.floor((z - r) / S); cz <= Math.floor((z + r) / S); cz++) for (let cx = Math.floor((x - r) / S); cx <= Math.floor((x + r) / S); cx++) {
    if (!(fly ? cellSolid(w, cx, cz) : blocksMove(w, cx, cz))) continue;
    const nx = clamp(x, cx * S, (cx + 1) * S), nz = clamp(z, cz * S, (cz + 1) * S);
    if ((x - nx) ** 2 + (z - nz) ** 2 < r * r) return true;
  }
  if (self && !fly && tooHigh(w, self, x, z, r)) return true;                            // a ledge more than a step above the mover's feet
  if (!fly) for (const p of w.map.props) { const pr = PROPS[p.kind].radius; if (pr > 0 && (x - p.x) ** 2 + (z - p.z) ** 2 < (r + pr) ** 2) return true; }
  if (self) {
    for (const e of w.enemies) if (e !== self && e.state !== 'dead' && (x - e.x) ** 2 + (z - e.z) ** 2 < (r + ENEMIES[e.kind].radius) ** 2) return true;
    if (self !== w.player && (x - w.player.x) ** 2 + (z - w.player.z) ** 2 < (r + PLAYER.radius) ** 2) return true;
  }
  return false;
}
/** Chase movement with cheap obstacle avoidance: go straight if free, otherwise try angled headings, remembering the side that worked. */
function chaseStep(w, e, def, dt) {
  const spd = def.speed * dt * fxSpeed(fxAt(w, e.x, e.z)) * moveMult(e), s = e.steer || (e.id % 2 ? 0.7 : -0.7);
  for (const off of [0, s, -s, 2 * s, -2 * s, 2.4 * s, -2.4 * s]) {                       // wide angles last: head-on against a round collider only a near-tangential step is free
    const a = e.yaw + off, sx = Math.sin(a) * spd, sz = Math.cos(a) * spd;
    if (!blockedCircle(w, e.x + sx, e.z + sz, def.radius, e)) { e.x += sx; e.z += sz; e.y = groundAt(w, e.x, e.z, def.radius); if (off !== 0) e.steer = off; else if (e.steer) e.steer = 0; return true; }
  }
  return false;
}
/** move with axis-sliding collision, in steps of at most 0.25 m: a displacement larger than a wall is thick (the Warden's 3 m knockback) must stop AT the wall, not test only where it would land (audit A03) */
export function tryMove(w, o, dx, dz, r) {
  const n = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dz)) / 0.25)), sx = dx / n, sz = dz / n;
  for (let i = 0; i < n; i++) {
    let moved = false;
    if (!blockedCircle(w, o.x + sx, o.z, r, o)) { o.x += sx; moved = true; }
    if (!blockedCircle(w, o.x, o.z + sz, r, o)) { o.z += sz; moved = true; }
    if (!moved) break;
  }
  o.y = groundAt(w, o.x, o.z, r);
}
export function hasLOS(w, x0, z0, x1, z1) {
  const S = w.map.cell, d = Math.hypot(x1 - x0, z1 - z0), n = Math.ceil(d / 0.4), flat = w.map.flat && w.map.sectors.length === 0;
  const ya = flat ? 0 : floorAt(w, x0, z0) + 1.4, yb = flat ? 0 : floorAt(w, x1, z1) + 1.4;                     // eye line from head to head; a ledge above it blocks the view, a step below it does not
  for (let i = 1; i < n; i++) {
    const t = i / n, x = x0 + (x1 - x0) * t, z = z0 + (z1 - z0) * t;
    if (cellSolid(w, Math.floor(x / S), Math.floor(z / S))) return false;
    if (!flat && floorAt(w, x, z) > ya + (yb - ya) * t - 0.1) return false;
    for (const p of w.map.props) if (PROPS[p.kind].blocksSight && (x - p.x) ** 2 + (z - p.z) ** 2 < PROPS[p.kind].radius ** 2) return false;      // pillars and stacked crates hide what is behind them
  }
  return true;
}
const forwardVec = (p) => [-Math.sin(p.yaw) * Math.cos(p.pitch), Math.sin(p.pitch), -Math.cos(p.yaw) * Math.cos(p.pitch)];

// ---------------------------------------------------------------- damage
function hurtPlayer(w, dmg) {
  const p = w.player; if (p.hp <= 0 || dmg <= 0) return;
  const absorbed = Math.min(p.armor, Math.floor(dmg * PLAYER.armorAbsorb));
  p.armor -= absorbed; const real = dmg - absorbed; p.hp -= real; p.hurt = 1; w.stats.damageTaken += real;
  emit(w, 'hurt', { amount: real });
}

/**
 * A MELEE strike on the player (a swing, a Gaunt's lunge, a Warden's charge): the guard (PT-013) answers it. Returns 'hit' | 'block' | 'broken' | 'parry'.
 * With a melee weapon in hand and the guard up, and the attacker in front: a guard raised no more than GUARD.window s ago PARRIES (no damage, the attacker is staggered, the next melee hit is doubled);
 * a guard held longer BLOCKS (most of the damage is stopped); a heavy blow breaks the block. Ranged toll-shots never come through here.
 */
function strikePlayer(w, e, dmg, heavy = false) {
  const p = w.player;
  if (p.guarding && p.hp > 0 && dmg > 0) {
    const dx = e.x - p.x, dz = e.z - p.z, d = Math.hypot(dx, dz) || 1;
    if ((dx * -Math.sin(p.yaw) + dz * -Math.cos(p.yaw)) / d > GUARD.cos) {
      if (p.parryW > 0) {
        const def = ENEMIES[e.kind], poise = def.poise ?? 1;
        e.stunT = Math.max(e.stunT || 0, def.boss ? 0.5 : GUARD.parryStun / (poise >= 3 ? 2 : 1)); e.attackT = -1; e.chargeT = -1; e.lungeT = -1; e.lungeHit = false; e.struck = false; e.cd = Math.max(e.cd || 0, 0.4);
        p.riposteT = GUARD.riposteT; p.parryCd = 0; emit(w, 'parry', { x: e.x, z: e.z, id: e.id }); return 'parry';
      }
      if (heavy) { p.brokenT = GUARD.brokenT; p.guarding = false; p.guard = 0; emit(w, 'guard_break', { x: e.x, z: e.z }); hurtPlayer(w, dmg); return 'broken'; }
      emit(w, 'block', { x: e.x, z: e.z }); hurtPlayer(w, Math.max(1, Math.round(dmg * GUARD.block))); return 'block';
    }
  }
  hurtPlayer(w, dmg); return 'hit';
}

/** Wake an enemy (idle -> chase) remembering where the player is; enemies near the one that woke are alerted too. */
export function wakeEnemy(w, e, loud, scripted = false) {
  e.state = 'chase'; e.lost = 0; e.lastX = w.player.x; e.lastZ = w.player.z;
  if (loud) emit(w, 'enemy_alert', { id: e.id, kind: e.kind, x: e.x, z: e.z });
  if (!scripted) for (const o of w.enemies) if (o.state === 'idle' && Math.hypot(o.x - e.x, o.z - e.z) < 12 && hasLOS(w, e.x, e.z, o.x, o.z)) { o.state = 'chase'; o.lost = 0; o.lastX = w.player.x; o.lastZ = w.player.z; }
}
/** Loud noise (gunfire, explosion): idle enemies within `radius` wake if nothing solid is between, or if it is very close. */
function noise(w, x, z, radius) {
  for (const e of w.enemies) {
    if (e.state !== 'idle') continue; const d = Math.hypot(e.x - x, e.z - z);
    if (d < radius && (d < NOISE.closeRange || hasLOS(w, x, z, e.x, e.z))) wakeEnemy(w, e, false);
  }
}

/** apply damage to an enemy; returns true if this killed it (and emits the death). Callers emit enemy_hit for survivors. */
export function damageEnemy(w, e, dmg, opts = {}) {
  const def = ENEMIES[e.kind];
  if (def.armor && !opts.splash && !opts.pierceArmor) {                             // plate on the front arc: only the shooter's side counts, splash and a harpoon bolt ignore it
    if ((e.stunT || 0) > 0) dmg *= def.armor.stunMult ?? 1;
    else { const tx = w.player.x - e.x, tz = w.player.z - e.z, tl = Math.hypot(tx, tz) || 1; if ((Math.sin(e.yaw) * tx + Math.cos(e.yaw) * tz) / tl > def.armor.cos) { dmg *= def.armor.front; emit(w, 'armor_hit', { id: e.id, x: e.x, z: e.z }); } }
  }
  if (def.shield && w.enemies.some((n) => ENEMIES[n.kind].node && n.state !== 'dead')) { dmg *= def.shield.reduce; emit(w, 'shield_hit', { id: e.id, x: e.x, z: e.z }); }
  else if (def.boss && (e.stunT || 0) > 0) dmg *= 1.5;                                 // a staggered Cantor with its shield down takes more      // the Cantor sings through its ring
  if ((e.channelT ?? -1) >= 0 && dmg > 0 && !opts.burn) { e.channelT = -1; e.supCd = Math.max(e.supCd || 0, 1.8); }      // hurting a channelling Sexton breaks the rite, and it needs a moment to start again
  e.hp -= dmg; e.flash = 1;
  if (e.state === 'idle' && e.hp > 0 && !def.node) wakeEnemy(w, e, !opts.burn, !!opts.burn);                    // being shot wakes you, whether or not you can see the shooter (a creature set alight wakes alone: it does not call its neighbours, the burst that lit it already made its noise)
  if (e.hp <= 0 && e.state !== 'dead') {
    e.state = 'dead'; e.attackT = -1; e.lungeT = -1; e.chargeT = -1; e.channelT = -1; w.stats.kills++; emit(w, 'enemy_died', { id: e.id, kind: e.kind, x: e.x, z: e.z });
    if (def.node) { emit(w, 'node_severed', { id: e.id, x: e.x, z: e.z }); for (const c of w.enemies) if (ENEMIES[c.kind].boss && c.state !== 'dead') { c.stunT = ENEMIES[c.kind].stagger ?? 2; c.pulseT = -1; c.pulseCd = Math.max(c.pulseCd, 2.5); } }
    return true;
  }
  return false;
}

// ---- what a hit DOES to a creature that survives it (PT-013: every weapon has its own answer) ----------------------------------------------------------------------------------------------------
/** slow an enemy: k = the share of its speed taken away, t seconds; a stronger or longer slow wins, they do not stack */
function setSlow(e, k, t) {
  if ((e.slowImm || 0) > 0) return;                                                       // diminishing returns: a creature that has just shaken a slow off cannot be slowed again at once (a held trigger keeps one slow going for at most SLOW_MAX s, then it steadies for SLOW_IMMUNE s)
  const cur = (e.slowT || 0) > 0 ? (e.slowK || 0) : 0; e.slowK = Math.max(cur, k); e.slowT = Math.max(e.slowT || 0, t);
}
const SLOW_MAX = 1.0, SLOW_IMMUNE = 0.9;
/** the speed multiplier a flinch or a rivet's slow leaves an enemy with */
const moveMult = (e) => ((e.slowT || 0) > 0 ? 1 - (e.slowK || 0) : 1);
/**
 * `h` is a weapon's `hit` block or a melee move. flinch: a short stumble (`flinchK`, default 50%, slower) that is shorter for the heavy (÷ poise); slow/slowT: the rivets; interrupt: inside that many metres the hit breaks the windup of the blow it lands on;
 * cancelLunge: it breaks a Gaunt's lunge windup; stun: a stagger (the elites take half, the bosses none). Bosses and nodes shrug off interrupts (poise 3 and above).
 */
function hitEffects(w, e, h, dist = 99) {
  if (!h || e.state === 'dead') return;
  const def = ENEMIES[e.kind], poise = def.poise ?? 1;
  if (h.flinch && !def.node) setSlow(e, h.flinchK ?? 0.5, Math.min(0.6, h.flinch / poise));
  if (h.slow && !def.node) setSlow(e, h.slow, h.slowT ?? 1);
  if (poise < 3 && !def.node) {
    if (h.interrupt && dist < h.interrupt && e.attackT >= 0 && !e.struck && (e.intCd || 0) <= 0) { e.attackT = -1; e.cd = Math.max(e.cd || 0, 0.5); e.intCd = 1.8; }      // ...and it cannot be broken again for a moment: close range is strong, not a lock
    if (h.cancelLunge && def.lunge && (e.lungeT ?? -1) >= 0 && e.lungeT < def.lunge.windup && (e.intCd || 0) <= 0) { e.lungeT = -1; e.lungeHit = false; e.lungeCd = def.lunge.cooldown * 0.5; e.intCd = 1.8; }
  }
  if (h.stun && !def.node && poise < 8) e.stunT = Math.max(e.stunT || 0, h.stun / (poise >= 3 ? 2 : 1));
}
/** burning ground (the flare cannon): a patch of fire that burns the enemies standing in it for a few seconds. Plain data in w.burns. */
function ignite(w, x, y, z, B) {
  const gy = floorAt(w, x, z); if (y - gy > 1.6) return;                                        // a flare that burst high on a wall leaves no fire on the floor far below
  w.burns.push({ id: 'b' + w.tick + '_' + w.burns.length, x, z, y: gy, r: B.r, t: B.t, max: B.t, dps: B.dps });          // (not w.nextId: the ids of real entities steer their pathing, and a patch of fire must not shift them)
  while (w.burns.length > (B.max ?? 8)) w.burns.shift();
  emit(w, 'burn', { x, y: gy, z, r: B.r, t: B.t });
}
function updateBurns(w, dt) {
  for (let i = w.burns.length - 1; i >= 0; i--) {
    const b = w.burns[i]; b.t -= dt; if (b.t <= 0) { w.burns.splice(i, 1); continue; }
    for (const e of w.enemies) {
      if (e.state === 'dead') continue; const d = ENEMIES[e.kind]; if (d.node || d.flying) continue;
      if (Math.hypot(e.x - b.x, e.z - b.z) < b.r + 0.2 && Math.abs((e.y ?? 0) - b.y) < 1.0) damageEnemy(w, e, b.dps * dt, { burn: true });
    }
  }
}

function explode(w, x, y, z, ownerIsPlayer, def) {
  emit(w, 'explode', { x, y, z }); noise(w, x, z, NOISE.explosion);
  if (def.burn) ignite(w, x, y, z, def.burn);
  for (const e of w.enemies) {
    if (e.state === 'dead') continue;
    const ed = ENEMIES[e.kind], base = e.y + (ed.hover ?? 0) * (1 - Math.min(1, e.dead ?? 0)), lo = ed.hover ? 0.3 : 1.0, body = ed.height, d = Math.hypot(x - e.x, y - (base + Math.min(Math.max(y - base, lo), Math.max(lo, body - 1.0))), z - e.z);      // measured from the blast's own height on the body (1 m up, or higher on a tall one): a flare on the Cantor's head is not 3 m from it
    if (d < def.splash) {
      const killed = damageEnemy(w, e, def.splashDamage * (1 - d / def.splash) + def.direct, { splash: true });
      const k = 0.8 * (1 - d / def.splash), nx = (e.x - x) / (d || 1), nz = (e.z - z) / (d || 1); tryMove(w, e, nx * k, nz * k, ENEMIES[e.kind].radius);
      if (!killed) emit(w, 'enemy_hit', { id: e.id, kind: e.kind, x: e.x, z: e.z });
    }
  }
  const p = w.player, d = Math.hypot(x - p.x, y - (p.y + PLAYER.eye), z - p.z);
  if (ownerIsPlayer && d < def.splash * 0.65) hurtPlayer(w, Math.round(def.splashDamage * def.selfDamage * (1 - d / (def.splash * 0.65))));
}

// ---------------------------------------------------------------- weapons
/** Scatter def.pellets rays from the eye. Pellets stop at walls, closed doors, solid props, and the first enemy they touch. */
function fireHitscan(w, def, cone) {
  const p = w.player, map = w.map, hits = new Map(), push = new Map(); let impacts = 0;
  for (let i = 0; i < def.pellets; i++) {
    const f = forwardVec({ yaw: p.yaw + (rand(w) * 2 - 1) * cone, pitch: p.pitch + (rand(w) * 2 - 1) * cone });
    let x = p.x, y = p.y + PLAYER.eye, z = p.z, target = null, stop = false, dist = 0;
    for (dist = 0.25; dist <= def.range && !target && !stop; dist += 0.25) {
      x += f[0] * 0.25; y += f[1] * 0.25; z += f[2] * 0.25;
      if (y < floorAt(w, x, z) + 0.02 || y > ceilingAt(w, x, z) || cellSolid(w, Math.floor(x / map.cell), Math.floor(z / map.cell))) { stop = true; break; }
      for (const pr of map.props) if (PROPS[pr.kind].radius > 0 && Math.hypot(x - pr.x, z - pr.z) < PROPS[pr.kind].radius && y < floorAt(w, pr.x, pr.z) + 1.3) stop = true;
      if (stop) break;
      for (const e of w.enemies) if (e.state !== 'dead' && insideHit(e, x, y, z, 0.05)) { target = e; break; }
    }
    if (target) {
      const fall = dist <= def.falloffStart ? 1 : 1 - (1 - def.falloffMin) * Math.min(1, (dist - def.falloffStart) / (def.range - def.falloffStart));
      const killed = damageEnemy(w, target, def.damage * fall);
      if (!killed) hits.set(target.id, target);
      const k = push.get(target.id) || { e: target, x: 0, z: 0 }; k.x += f[0] * def.knock * fall; k.z += f[2] * def.knock * fall; push.set(target.id, k);      // applied after the volley: pellets are simultaneous
    } else if (stop && impacts < 3 && i % 3 === 0) { emit(w, 'impact', { x, y, z }); impacts++; }
  }
  const range0 = new Map([...hits.values()].map((e) => [e, Math.hypot(e.x - p.x, e.z - p.z)]));                    // how far it was when it was hit: before the knockback carries it away
  for (const k of push.values()) tryMove(w, k.e, k.x, k.z, ENEMIES[k.e.kind].radius);
  for (const e of hits.values()) if (e.state !== 'dead') { hitEffects(w, e, def.hit, range0.get(e)); emit(w, 'enemy_hit', { id: e.id, kind: e.kind, x: e.x, z: e.z }); }
}

/** The harpoon bolt: one ray from the eye, it stops at walls, closed doors and solid props, and goes THROUGH bodies: up to 1 + def.pierce of them, the later ones for def.pierceDamage of the damage.
 *  Emits 'bolt' (the line it travelled, for the view's streak and the bolt left in the wall) and, on a wall, an 'impact'. */
function fireBolt(w, def, cone) {
  const p = w.player, map = w.map, hit = [], f = forwardVec({ yaw: p.yaw + (rand(w) * 2 - 1) * cone, pitch: p.pitch + (rand(w) * 2 - 1) * cone });
  const x0 = p.x, y0 = p.y + PLAYER.eye, z0 = p.z; let x = x0, y = y0, z = z0, stop = false, dist = 0;
  for (dist = 0.25; dist <= def.range && !stop && hit.length <= def.pierce; dist += 0.25) {
    x += f[0] * 0.25; y += f[1] * 0.25; z += f[2] * 0.25;
    if (y < floorAt(w, x, z) + 0.02 || y > ceilingAt(w, x, z) || cellSolid(w, Math.floor(x / map.cell), Math.floor(z / map.cell))) { stop = true; break; }
    for (const pr of map.props) if (PROPS[pr.kind].radius > 0 && Math.hypot(x - pr.x, z - pr.z) < PROPS[pr.kind].radius && y < floorAt(w, pr.x, pr.z) + 1.3) stop = true;
    if (stop) break;
    for (const e of w.enemies) if (e.state !== 'dead' && !hit.includes(e) && insideHit(e, x, y, z, 0.05)) { hit.push(e); break; }
  }
  const survivors = [];
  hit.forEach((e, i) => {
    const mult = i === 0 ? 1 : def.pierceDamage;
    if (!damageEnemy(w, e, def.damage * mult, { pierceArmor: def.pierceArmor })) survivors.push(e);
    tryMove(w, e, f[0] * def.knock * mult, f[2] * def.knock * mult, ENEMIES[e.kind].radius);
  });
  if (stop) emit(w, 'impact', { x, y, z });
  emit(w, 'bolt', { x0, y0, z0, x1: x, y1: y, z1: z, stuck: stop });
  const pin = def.hit?.pin;
  for (const e of survivors) if (e.state !== 'dead') {
    hitEffects(w, e, def.hit, Math.hypot(e.x - x0, e.z - z0));
    const ed = ENEMIES[e.kind];
    if (pin && !ed.boss && !ed.node && !ed.armor && (ed.poise ?? 1) < 3) {                      // a wall close behind it: the bolt nails it there
      let walled = false; for (let s = 0.4; s <= pin.wall && !walled; s += 0.25) { const qx = e.x + f[0] * s, qz = e.z + f[2] * s; walled = cellSolid(w, Math.floor(qx / map.cell), Math.floor(qz / map.cell)) || map.props.some((pr) => PROPS[pr.kind].radius > 0 && Math.hypot(qx - pr.x, qz - pr.z) < PROPS[pr.kind].radius); }
      if (walled) { e.stunT = Math.max(e.stunT || 0, pin.t); e.attackT = -1; e.lungeT = -1; e.chargeT = -1; emit(w, 'pin', { id: e.id, x: e.x, z: e.z }); }
    }
    emit(w, 'enemy_hit', { id: e.id, kind: e.kind, x: e.x, z: e.z });
  }
}

/** is the straight line between two points free of walls, closed doors, solid props, floor and ceiling? (the arc's line of sight: a body behind a corner is not a target) */
function rayClear(w, x0, y0, z0, x1, y1, z1) {
  const map = w.map, dx = x1 - x0, dy = y1 - y0, dz = z1 - z0, n = Math.max(1, Math.ceil(Math.hypot(dx, dy, dz) / 0.25));
  for (let i = 1; i < n; i++) {
    const t = i / n, x = x0 + dx * t, y = y0 + dy * t, z = z0 + dz * t;
    if (y < floorAt(w, x, z) + 0.02 || y > ceilingAt(w, x, z) || cellSolid(w, Math.floor(x / map.cell), Math.floor(z / map.cell))) return false;
    for (const pr of map.props) if (PROPS[pr.kind].radius > 0 && Math.hypot(x - pr.x, z - pr.z) < PROPS[pr.kind].radius && y < floorAt(w, pr.x, pr.z) + 1.3) return false;
  }
  return true;
}
/** the point on a body the arc strikes: its torso, 60% of the way up the drawn volume (a flyer's included) */
const arcPoint = (e) => { const c = hitCylinder(e); return [c.x, c.y0 + (c.y1 - c.y0) * 0.6, c.z]; };

/**
 * The charge-arc lamp: lock onto the best body inside a cone around the view ray (the sights narrow it), then jump the arc from body to body. `f` (0..1) is how far it was charged: 0 is the short tap arc;
 * more is a longer, harder, wider-forking bolt (WEAPONS.arc.charge). A body standing in water conducts to the others in the same water; a Drone-Gill is stunned, a bell node takes extra (WEAPONS.arc.vael).
 * Emits 'arc' (the paths it travelled, for the view) and 'enemy_hit'.
 */
function fireArc(w, def, f = 0) {
  const p = w.player, C = def.charge, W = def.water, V = def.vael, ex = p.x, ey = p.y + PLAYER.eye, ez = p.z, dir = forwardVec(p);
  const base = lerp(def.damage, C.damage, f), range = lerp(def.range, C.range, f), chain = def.chain + Math.round(f * (C.chain - def.chain)), fall = lerp(def.chainFalloff, C.chainFalloff, f), jump = lerp(def.jump, C.jump, f);
  const cone = (def.lock.hip * (1 - p.ads) + def.lock.ads * p.ads) * (1 + 0.5 * f), forks = f > 0.3 ? C.forks : 1;
  const cands = [];
  for (const e of w.enemies) {
    if (e.state === 'dead') continue;
    const [tx, ty, tz] = arcPoint(e), dx = tx - ex, dy = ty - ey, dz = tz - ez, d = Math.hypot(dx, dy, dz); if (d > range || d < 0.3) continue;
    const ang = Math.acos(Math.min(1, Math.max(-1, (dx * dir[0] + dy * dir[1] + dz * dir[2]) / d))), slack = Math.atan2(hitCylinder(e).r, d);          // a wide body is easier to lock than a thin one at the same distance
    if (ang - slack > cone || !rayClear(w, ex, ey, ez, tx, ty, tz)) continue;
    cands.push({ e, pt: [tx, ty, tz], score: ang + d * 0.004 });
  }
  cands.sort((a, b) => a.score - b.score);
  // the first branch takes the best body; a second branch needs a body in a clearly different direction (a fork, not two strikes down the same line), and nothing is struck twice
  const starts = cands.slice(0, 1);
  if (forks > 1 && cands.length > 1) {
    const dirTo = (c) => { const dx = c.pt[0] - ex, dy = c.pt[1] - ey, dz = c.pt[2] - ez, l = Math.hypot(dx, dy, dz) || 1; return [dx / l, dy / l, dz / l]; }, d0 = dirTo(cands[0]);
    const second = cands.slice(1).find((c) => { const d = dirTo(c); return Math.acos(Math.min(1, Math.max(-1, d0[0] * d[0] + d0[1] * d[1] + d0[2] * d[2]))) > 0.06; }); if (second) starts.push(second);
  }
  const paths = [], hit = new Set(starts.map((s) => s.e)), struck = [];
  for (const start of starts) {
    const path = []; let cur = start, dmg = base;
    for (let j = 0; j <= chain && cur; j++) {
      path.push(cur.pt); hit.add(cur.e); struck.push([cur.e, dmg]); dmg *= fall;
      let next = null, nd = jump;
      for (const e of w.enemies) {
        if (e.state === 'dead' || hit.has(e)) continue;
        const pt = arcPoint(e), d = Math.hypot(pt[0] - cur.pt[0], pt[1] - cur.pt[1], pt[2] - cur.pt[2]);
        if (d < nd && rayClear(w, cur.pt[0], cur.pt[1], cur.pt[2], pt[0], pt[1], pt[2])) { nd = d; next = { e, pt }; }
      }
      cur = next;
    }
    paths.push(path);
  }
  // water: a struck body standing in wading water conducts the shock to everything else standing in that water
  let conducted = 0;
  for (const [e] of [...struck]) {
    if (fxAt(w, e.x, e.z) !== 'w' || ENEMIES[e.kind].flying) continue;
    for (const o of w.enemies) {
      if (conducted >= W.max) break; if (o.state === 'dead' || hit.has(o) || ENEMIES[o.kind].flying || fxAt(w, o.x, o.z) !== 'w' || Math.hypot(o.x - e.x, o.z - e.z) > W.r) continue;
      hit.add(o); struck.push([o, base * W.mult]); paths.push([arcPoint(e), arcPoint(o)]); conducted++;
    }
  }
  let end = null;
  if (!cands.length) { let x = ex, y = ey, z = ez; for (let s = 0.25; s <= range; s += 0.25) { const nx = ex + dir[0] * s, ny = ey + dir[1] * s, nz = ez + dir[2] * s; if (!rayClear(w, x, y, z, nx, ny, nz)) break; x = nx; y = ny; z = nz; } end = [x, y, z]; }      // a miss still crackles, out to the wall or the end of its reach
  emit(w, 'arc', { x0: ex, y0: ey, z0: ez, pts: paths[0] ?? [], paths, end, charge: f });
  for (const [e, dmg0] of struck) {
    const ed = ENEMIES[e.kind]; let dmg = dmg0;
    if (ed.node) dmg *= V.nodeMult;
    if (V.kinds.includes(e.kind)) e.stunT = Math.max(e.stunT || 0, V.stun);
    if (!damageEnemy(w, e, dmg)) { hitEffects(w, e, def.hit); emit(w, 'enemy_hit', { id: e.id, kind: e.kind, x: e.x, z: e.z }); }
  }
}

// ---- melee (PT-013) ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
/** the numbers of a swing by its name: 'bash' (key V), 'jab' / 'heavy' (the fists) or a found weapon's id */
const swingDef = (k) => (k === 'bash' ? BASH : k === 'jab' ? WEAPONS.fists.swing : k === 'heavy' ? WEAPONS.fists.charge.heavy : WEAPONS[k]?.swing);
function startSwing(w, kind) {
  const p = w.player, S = swingDef(kind); if (!S || p.swingT >= 0) return false;
  p.swingT = 0; p.swingKind = kind; p.swingHit = false; p.cooldown = Math.max(p.cooldown, S.windup + S.recover); p.charge = 0; p.sprinting = false; p.recover = 0;      // a swing drops the sights and the sprint
  emit(w, 'swing', { kind, heavy: kind === 'heavy' }); return true;
}
function updateSwing(w, dt) {
  const p = w.player; if (p.swingT < 0) return;
  const S = swingDef(p.swingKind); if (!S) { p.swingT = -1; return; }
  p.swingT += dt;
  if (!p.swingHit && p.swingT >= S.windup) { p.swingHit = true; resolveSwing(w, S); }
  if (p.swingT >= S.windup + S.recover) p.swingT = -1;
}
/** the blow lands: every body (the best-aligned one, or all of them for a cleave) inside reach and arc, with a clear line, takes it */
function resolveSwing(w, S) {
  const p = w.player, fx = -Math.sin(p.yaw), fz = -Math.cos(p.yaw), ey = p.y + PLAYER.eye, found = [];
  for (const e of w.enemies) {
    if (e.state === 'dead') continue;
    const c = hitCylinder(e), dx = c.x - p.x, dz = c.z - p.z, d = Math.hypot(dx, dz);
    if (d - c.r > S.reach || c.y1 < p.y + 0.15 || c.y0 > ey + 0.4) continue;
    const ang = Math.acos(clamp((dx * fx + dz * fz) / (d || 1), -1, 1)), slack = Math.atan2(c.r, Math.max(d, 0.01));
    if (d > 0.05 && ang - slack > S.arc / 2) continue;
    if (!rayClear(w, p.x, ey - 0.3, p.z, c.x, clamp(ey - 0.4, c.y0 + 0.2, c.y1 - 0.2), c.z)) continue;
    found.push({ e, d, ux: dx / (d || 1), uz: dz / (d || 1), rank: ang * 2 + d * 0.05 });
  }
  found.sort((a, b) => a.rank - b.rank);
  let landed = false; const ripo = (p.riposteT || 0) > 0;
  for (const { e, d, ux, uz } of S.cleave ? found : found.slice(0, 1)) {
    const def = ENEMIES[e.kind], poise = Math.max(1, def.poise ?? 1); let dmg = S.damage;
    if (ripo) dmg *= GUARD.riposteMult;
    if (S.backstab) { const tx = p.x - e.x, tz = p.z - e.z, tl = Math.hypot(tx, tz) || 1; if (e.state === 'idle' || (Math.sin(e.yaw) * tx + Math.cos(e.yaw) * tz) / tl < -0.2) dmg *= S.backstab; }      // asleep, or turned away
    landed = true;
    const killed = damageEnemy(w, e, dmg, { melee: true, pierceArmor: !!S.ignorePlate });
    if (!killed) {
      if (S.knock) tryMove(w, e, ux * S.knock / poise, uz * S.knock / poise, def.radius);
      if (S.pull && poise < 3) { const pl = Math.min(S.pull, Math.max(0, d - (def.hitRadius ?? def.radius) - PLAYER.radius - 0.4)); if (pl > 0) tryMove(w, e, -ux * pl, -uz * pl, def.radius); }
      hitEffects(w, e, S, d); emit(w, 'enemy_hit', { id: e.id, kind: e.kind, x: e.x, z: e.z });
    }
    emit(w, 'melee_hit', { x: e.x, z: e.z, kind: p.swingKind, killed, riposte: ripo });
  }
  if (landed) { if (ripo) p.riposteT = 0; noise(w, p.x, p.z, NOISE.melee); }
}

/** a charging weapon (the lamp, the fists): the fire key charges it, RELEASING fires it. A tap (released before it counts as a charge) is the light attack; a tap that lands during a cooldown is kept for a moment, not lost. */
function chargeInput(w, cmd, def, canAct) {
  const p = w.player, C = def.charge;
  if (p.sprinting || p.switchT > 0 || p.swingT >= 0) { p.charge = 0; p.queuedT = 0; return; }
  const release = (c) => { if (def.kind === 'melee') startSwing(w, c >= C.max - 0.05 ? 'heavy' : 'jab'); else fireWeapon(w, c); };
  if ((p.queuedT || 0) > 0) { p.queuedT -= TICK; if (canAct) { p.queuedT = 0; release(p.queuedC || 0); } return; }
  if (cmd.fire) {
    const before = p.charge || 0; p.charge = Math.min(C.max, before + TICK);
    if (before < C.min && p.charge >= C.min) emit(w, 'charge_start', { weapon: p.weapon });
    if (before < C.max && p.charge >= C.max) emit(w, 'charge_full', { weapon: p.weapon });
  } else if ((p.charge || 0) > 0) {
    const c = p.charge; p.charge = 0;
    if (canAct) release(c); else { p.queuedT = 0.15; p.queuedC = c; }
  }
}

function fireWeapon(w, charge = 0) {
  const p = w.player, def = WEAPONS[p.weapon];
  if (def.kind === 'melee') { startSwing(w, p.weapon === 'fists' ? 'jab' : p.weapon); return; }
  if ((p.ammo[def.ammo] || 0) <= 0) { p.cooldown = 0.4; emit(w, 'dry'); return; }
  // the lamp: 0 = the tap arc (one cell); a charge spends more cells for a bigger bolt, as many as are left
  let cf = 0, cost = 1;
  if (def.kind === 'arc' && def.charge) {
    const C = def.charge; cf = charge < C.min ? 0 : Math.min(1, (charge - C.min) / (C.max - C.min)); cost = cf === 0 ? 1 : 1 + Math.round(cf * (C.cells - 1));
    const have = p.ammo[def.ammo]; if (cost > have) { cf = cf * (have - 1) / Math.max(1, cost - 1); cost = have; }
  }
  p.ammo[def.ammo] -= cost; p.cooldown = def.cooldown + cf * (def.charge?.recover ?? 0); p.kick = (def.kick ?? 0.06) * (1 + 6 * cf); w.stats.shots++;
  // accuracy: hip spread grows with movement; aiming tightens it. RNG draws happen in a fixed order so replays are deterministic.
  const moveFrac = Math.min(1, Math.hypot(p.vx, p.vz) / PLAYER.speed), sp = def.spread;
  const heat = p.heat || 0, cone = ((sp.hip * (1 + sp.moveFactor * moveFrac)) * (1 - p.ads) + sp.ads * p.ads) * (1 + heat * (def.heatCone || 0));
  if (def.heatPerShot) p.heat = Math.min(1, heat + def.heatPerShot);                                     // holding the trigger blooms the pattern
  if (def.kind === 'arc') fireArc(w, def, cf);
  else if (def.kind === 'hitscan') (def.pierce != null ? fireBolt : fireHitscan)(w, def, cone);
  else {
    const f = forwardVec({ yaw: p.yaw + (rand(w) * 2 - 1) * cone, pitch: p.pitch + (rand(w) * 2 - 1) * cone }), r = [Math.cos(p.yaw), 0, -Math.sin(p.yaw)];
    // the weapon is held right and low at the hip; at the sights it is centred, so the shot leaves along the crosshair
    const mRight = def.muzzle.right * (1 - p.ads), mDown = def.muzzle.down * (1 - 0.7 * p.ads);
    const pos = [p.x + f[0] * def.muzzle.fwd + r[0] * mRight, p.y + PLAYER.eye + f[1] * def.muzzle.fwd - mDown, p.z + f[2] * def.muzzle.fwd + r[2] * mRight];
    w.projectiles.push({ id: w.nextId++, weapon: p.weapon, x: pos[0], y: pos[1], z: pos[2], vx: f[0] * def.speed, vy: f[1] * def.speed, vz: f[2] * def.speed, life: 4 });
  }
  emit(w, 'fire', { weapon: p.weapon, charge: cf }); noise(w, p.x, p.z, (NOISE[p.weapon] ?? 22) * (1 + 0.6 * cf));
}


/** The door or secret panel that Use would act on right now (first one along the view ray within reach), or null. The UI reads this for its prompt. */
export function useTarget(w) {
  const p = w.player, map = w.map, fx = -Math.sin(p.yaw), fz = -Math.cos(p.yaw);
  for (let s = 0.3; s <= PLAYER.useReach; s += 0.25) {
    const cx = Math.floor((p.x + fx * s) / map.cell), cz = Math.floor((p.z + fz * s) / map.cell), k = map.kind(cx, cz);
    if (k === 'door' || k === 'secret') { const d = doorAtCell(w, cx, cz); if (d?.closet) break; return d; }         // a closet panel is a wall to the player
    if (k === 'wall') break;
  }
  // wall switches: the nearest one within reach that the player is facing
  let best = null, bd = 1e9;
  for (const sw of map.switches) {
    const dx = sw.px - p.x, dz = sw.pz - p.z, d = Math.hypot(dx, dz);
    if (d < PLAYER.useReach && Math.abs(floorAt(w, sw.x, sw.z) - p.y) < 1.5 && (dx * fx + dz * fz) / (d || 1) > 0.55 && d < bd) { bd = d; best = sw; }
  }
  return best ? { switchId: best.id, used: !!w.switchState[best.id]?.used, once: best.once, secret: false, target: 0, open: 0, key: null, remote: false, sealed: false } : null;
}
/** can a body of radius r walk the straight line from (x0,z0) to (x1,z1) past walls, closed doors and solid props? (actors are ignored: they move) */
export function moveClear(w, x0, z0, x1, z1, r) {
  const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, z1 - z0) / 0.45));
  for (let i = 1; i <= n; i++) if (blockedCircle(w, x0 + (x1 - x0) * i / n, z0 + (z1 - z0) * i / n, r * 0.9)) return false;
  return true;
}
/** can an actor walk in a straight line from (x0,z0) to (x1,z1) without meeting a ledge more than a step high? (always true on flat maps) */
function stepClear(w, x0, z0, x1, z1) {
  if (w.map.flat && w.map.sectors.length === 0) return true;
  const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, z1 - z0) / 0.5)); let prev = floorAt(w, x0, z0);
  for (let i = 1; i <= n; i++) { const f = floorAt(w, x0 + (x1 - x0) * i / n, z0 + (z1 - z0) * i / n); if (f - prev > STEP + 1e-6) return false; prev = f; }
  return true;
}

// ---------------------------------------------------------------- enemies
function fireEnemyShot(w, e, def, diff) {
  const R = def.ranged, p = w.player, ox = e.x + Math.sin(e.yaw) * 0.6, oy = e.y + (R.muzzleY ?? 1.5), oz = e.z + Math.cos(e.yaw) * 0.6;
  const dx = p.x - ox, dy = p.y + R.aimHeight - oy, dz = p.z - oz, len = Math.hypot(dx, dy, dz) || 1;       // aimed at where the player IS: a strafing player is not hit
  w.enemyShots.push({ id: w.nextId++, x: ox, y: oy, z: oz, vx: dx / len * R.speed, vy: dy / len * R.speed, vz: dz / len * R.speed, life: 4, dmg: Math.round(R.damage * diff.enemyDamage) });
  emit(w, 'enemy_shot', { id: e.id, kind: e.kind, x: e.x, z: e.z });
}

function updateEnemyShots(w, diff, dt) {
  const map = w.map, p = w.player;
  for (let i = w.enemyShots.length - 1; i >= 0; i--) {
    const q = w.enemyShots[i]; q.life -= dt; let gone = q.life <= 0;
    const n = Math.ceil(Math.hypot(q.vx, q.vy, q.vz) * dt / 0.25);
    for (let k = 0; k < n && !gone; k++) {
      q.x += q.vx * dt / n; q.y += q.vy * dt / n; q.z += q.vz * dt / n;
      if (q.y < floorAt(w, q.x, q.z) + 0.05 || q.y > ceilingAt(w, q.x, q.z) || cellSolid(w, Math.floor(q.x / map.cell), Math.floor(q.z / map.cell))) { gone = true; emit(w, 'shot_impact', { x: q.x, y: q.y, z: q.z }); }
      for (const pr of map.props) if (!gone && PROPS[pr.kind].radius > 0 && Math.hypot(q.x - pr.x, q.z - pr.z) < PROPS[pr.kind].radius && q.y < floorAt(w, pr.x, pr.z) + 1.3) { gone = true; emit(w, 'shot_impact', { x: q.x, y: q.y, z: q.z }); }
      if (!gone && p.hp > 0 && Math.hypot(q.x - p.x, q.z - p.z) < 0.55 && q.y > p.y + 0.1 && q.y < p.y + 1.9) { gone = true; hurtPlayer(w, q.dmg); emit(w, 'shot_impact', { x: q.x, y: q.y, z: q.z }); }
    }
    if (gone) w.enemyShots.splice(i, 1);
  }
}

// ---------------------------------------------------------------- elites and the boss
const isNode = (n) => ENEMIES[n.kind].node && n.state !== 'dead';
const nodesAlive = (w) => w.enemies.filter(isNode).length;

/** step away from the player (Sextons and the Cantor keep their distance) */
function retreatStep(w, e, def, dt) {
  const spd = def.speed * dt * fxSpeed(fxAt(w, e.x, e.z)) * moveMult(e), away = Math.atan2(e.x - w.player.x, e.z - w.player.z);
  for (const off of [0, 0.7, -0.7, 1.4, -1.4]) {
    const a = away + off, sx = Math.sin(a) * spd, sz = Math.cos(a) * spd;
    if (!blockedCircle(w, e.x + sx, e.z + sz, def.radius, e)) { e.x += sx; e.z += sz; e.y = groundAt(w, e.x, e.z, def.radius); return true; }
  }
  return false;
}

/** Warden-Graft: windup -> straight-line charge -> (hit the player | crash into geometry and stagger | give way to another body) */
function chargeStep(w, e, def, diff, dt, sees, dist, dyv) {
  const C = def.charge, p = w.player; e.chargeCd = Math.max(0, (e.chargeCd || 0) - dt);
  if ((e.chargeT ?? -1) >= 0) {
    e.chargeT += dt;
    if (e.chargeT < C.windup) { e.walk *= 0.85; return true; }                                       // the tell: it stops and lowers its shoulder
    if (e.chargeT < C.windup + C.duration) {
      const step = C.speed * dt, nx = Math.sin(e.yaw) * step, nz = Math.cos(e.yaw) * step; e.walk = 1; e.phase += dt * def.gait * 2;
      if (!e.chargeHit && Math.hypot(p.x - e.x, p.z - e.z) < def.radius + PLAYER.radius + 0.45 && Math.abs(p.y - e.y) < 1.4 && p.hp > 0) {
        const res = strikePlayer(w, e, Math.round(C.damage * diff.enemyDamage), true); emit(w, 'enemy_strike', { id: e.id, kind: e.kind, x: e.x, z: e.z });
        if (res === 'hit' || res === 'broken') tryMove(w, p, Math.sin(e.yaw) * C.knock, Math.cos(e.yaw) * C.knock, PLAYER.radius);
        e.chargeT = -1; e.chargeCd = C.cooldown * diff.reaction; return true;
      }
      if (blockedCircle(w, e.x + nx, e.z + nz, def.radius) || tooHigh(w, e, e.x + nx, e.z + nz, def.radius)) {          // walls, doors, props, ledges: it crashes and is stunned
        e.stunT = C.stun; e.chargeT = -1; e.chargeCd = C.cooldown * diff.reaction; emit(w, 'warden_crash', { id: e.id, x: e.x, z: e.z }); return true;
      }
      if (blockedCircle(w, e.x + nx, e.z + nz, def.radius, e)) { e.chargeT = -1; e.chargeCd = 1; return true; }        // another body in the way: it gives up the charge
      e.x += nx; e.z += nz; e.y = groundAt(w, e.x, e.z, def.radius); return true;
    }
    e.chargeT = -1; e.chargeCd = C.cooldown * diff.reaction; return false;
  }
  if (sees && e.attackT < 0 && e.chargeCd <= 0 && dist >= C.min && dist <= C.max && dyv < 1.2 && moveClear(w, e.x, e.z, p.x, p.z, def.radius)) {
    e.chargeT = 0; emit(w, 'enemy_windup', { id: e.id, kind: e.kind, x: e.x, z: e.z }); return true;
  }
  return false;
}

function reviveEnemy(w, c, S) {
  c.state = 'chase'; c.hp = ENEMIES[c.kind].hp * DIFFICULTY[w.difficulty].enemyHp * S.reviveHp; c.dead = 0; c.attackT = -1; c.lungeT = -1; c.stunT = 0; c.revived = (c.revived || 0) + 1; c.lost = 0; c.lastX = w.player.x; c.lastZ = w.player.z;
  w.stats.kills--; emit(w, 'enemy_revived', { id: c.id, kind: c.kind, x: c.x, z: c.z });
}
/** Sexton: channel over a corpse to raise it; keep away from the player; hurting it mid-channel breaks the rite (see damageEnemy) */
function supportStep(w, e, def, dt, sees, dist) {
  const S = def.support; e.supCd = Math.max(0, (e.supCd || 0) - dt);
  if ((e.channelT ?? -1) >= 0) {
    const c = w.enemies.find((o) => o.id === e.channelTarget);
    if (!c || c.state !== 'dead' || Math.hypot(c.x - e.x, c.z - e.z) > S.range * 1.3) { e.channelT = -1; return false; }
    e.channelT += dt; e.walk *= 0.85;
    if (e.channelT >= S.channel) { reviveEnemy(w, c, S); e.channelT = -1; e.supCd = S.cooldown; }
    return true;
  }
  if (e.supCd <= 0) {
    let best = null, bd = 1e9;
    for (const o of w.enemies) if (o.state === 'dead' && o.dead >= 1 && S.kinds.includes(o.kind) && (o.revived || 0) < S.maxRevives) { const d = Math.hypot(o.x - e.x, o.z - e.z); if (d < S.range && d < bd && hasLOS(w, e.x, e.z, o.x, o.z)) { best = o; bd = d; } }
    if (best) { e.channelT = 0; e.channelTarget = best.id; emit(w, 'sexton_channel', { id: e.id, x: e.x, z: e.z, tx: best.x, tz: best.z }); return true; }
  }
  if (sees && dist < S.keepAway) { retreatStep(w, e, def, dt); e.walk = Math.min(1, e.walk + dt * 3); e.phase += dt * def.gait; return true; }
  if (sees && dist < S.keepAway + 5) { e.walk = Math.max(0, e.walk - dt * 3); return true; }             // holds its ground at range, waiting for someone to fall
  return false;
}

/** Cantor: tone pulses (windup -> ring), Gaunt summons, and once the ring is broken, fans of toll-shots. It keeps its distance. */
function bossStep(w, e, def, diff, dt, sees, dist) {
  const p = w.player, enraged = nodesAlive(w) === 0, P = def.pulse;
  e.pulseCd = Math.max(0, (e.pulseCd ?? 0) - dt); e.shotCd = Math.max(0, (e.shotCd ?? 0) - dt); e.summonCd = Math.max(0, (e.summonCd ?? 0) - dt);
  if (P && (e.pulseT ?? -1) >= 0) {
    e.pulseT += dt; e.walk *= 0.85;
    if (e.pulseT >= P.windup) { w.pulses.push({ id: w.nextId++, x: e.x, z: e.z, y: e.y, r: 0.6, speed: P.speed, dmg: Math.round(P.damage * diff.enemyDamage), width: P.width, maxR: P.maxR, hit: false }); emit(w, 'pulse', { x: e.x, z: e.z }); e.pulseT = -1; e.pulseCd = enraged ? def.enragedPulseCooldown : P.cooldown; }
    return true;
  }
  if (P && sees && e.pulseCd <= 0) { e.pulseT = 0; emit(w, 'enemy_windup', { id: e.id, kind: e.kind, x: e.x, z: e.z }); return true; }
  if (def.summon && e.summons?.length && sees && e.summonCd <= 0) {
    const S = def.summon;
    if (w.enemies.filter((o) => o.kind === S.kind && o.state !== 'dead').length < S.max) for (let i = 0; i < S.count; i++) {
      e.summonN = (e.summonN ?? -1) + 1; const [sx, sz] = e.summons[e.summonN % e.summons.length], g = spawnEnemy(w, S.kind, sx, sz, Math.atan2(p.x - sx, p.z - sz)); w.stats.total.enemies++; wakeEnemy(w, g, false, true); emit(w, 'enemy_spawn', { id: g.id, kind: g.kind, x: g.x, z: g.z });
    }
    e.summonCd = S.every * (enraged ? 0.7 : 1);
  }
  if ((enraged || def.shots?.always) && def.shots && sees && e.shotCd <= 0 && dist > 4) {
    const Sh = def.shots, ox = e.x + Math.sin(e.yaw) * 0.8, oz = e.z + Math.cos(e.yaw) * 0.8, oy = e.y + (Sh.muzzleY ?? 1.9), base = Math.atan2(p.x - ox, p.z - oz);
    for (let i = -Math.floor(Sh.count / 2); i <= Math.floor(Sh.count / 2); i++) {
      const a = base + i * Sh.spread, dy = p.y + Sh.aimHeight - oy, hz = Math.hypot(p.x - ox, p.z - oz) || 1, len = Math.hypot(hz, dy);
      w.enemyShots.push({ id: w.nextId++, x: ox, y: oy, z: oz, vx: Math.sin(a) * hz / len * Sh.speed, vy: dy / len * Sh.speed, vz: Math.cos(a) * hz / len * Sh.speed, life: 4, dmg: Math.round(Sh.damage * diff.enemyDamage) });
    }
    emit(w, 'enemy_shot', { id: e.id, kind: e.kind, x: e.x, z: e.z }); e.shotCd = Sh.cooldown;
  }
  if (sees && dist < (def.keepAway ?? 6)) { retreatStep(w, e, def, dt); e.walk = Math.min(1, e.walk + dt * 3); e.phase += dt * def.gait; return true; }
  return false;
}

/** a hovering shooter circles the player instead of standing: alternate sideways runs (the direction and length come from the seeded RNG, so the sim stays deterministic) */
function strafeStep(w, e, def, dt) {
  const S = def.strafe, p = w.player; e.strafeT = (e.strafeT ?? 0) - dt;
  if (e.strafeT <= 0) { e.strafeDir = rand(w) < 0.5 ? -1 : 1; e.strafeT = S.every * (0.6 + rand(w) * 0.8); }
  const a = Math.atan2(p.x - e.x, p.z - e.z) + e.strafeDir * Math.PI / 2, sx = Math.sin(a) * S.speed * dt * moveMult(e), sz = Math.cos(a) * S.speed * dt * moveMult(e);
  if (!blockedCircle(w, e.x + sx, e.z + sz, def.radius, e)) { e.x += sx; e.z += sz; e.y = groundAt(w, e.x, e.z, def.radius); e.walk = Math.min(1, e.walk + dt * 3); e.phase += dt * def.gait; return true; }
  e.strafeDir = -e.strafeDir; return false;
}

function updatePulses(w, dt) {
  const p = w.player;
  for (let i = w.pulses.length - 1; i >= 0; i--) {
    const q = w.pulses[i]; q.r += q.speed * dt;
    if (!q.hit && p.hp > 0) {
      const d = Math.hypot(p.x - q.x, p.z - q.z);
      if (Math.abs(d - q.r) < q.width / 2 + PLAYER.radius && Math.abs(p.y - q.y) < 1.0 && hasLOS(w, q.x, q.z, p.x, p.z)) { q.hit = true; hurtPlayer(w, q.dmg); emit(w, 'pulse_hit', {}); }      // cover breaks the line; standing a metre above the floor clears the ring
    }
    if (q.r > q.maxR) w.pulses.splice(i, 1);
  }
}

function updateEnemy(w, e, diff, dt) {
  const p = w.player, def = ENEMIES[e.kind]; e.flash = Math.max(0, e.flash - dt * 4); if (e.slowT > 0) { e.slowT = Math.max(0, e.slowT - dt); e.slowAge = (e.slowAge || 0) + dt; if (e.slowAge >= SLOW_MAX || e.slowT === 0) { e.slowT = 0; e.slowAge = 0; e.slowImm = SLOW_IMMUNE; } } else if (e.slowImm > 0) e.slowImm = Math.max(0, e.slowImm - dt); if (e.intCd > 0) e.intCd = Math.max(0, e.intCd - dt);
  e.y = groundAt(w, e.x, e.z, def.radius);                                         // every state rides a moving floor: a corpse, a staggered Warden or a ring node on the funicular car keep standing on it
  if (e.state === 'dead') { e.dead = Math.min(1, e.dead + dt / 0.9); e.walk *= 0.9; return; }
  if ((e.stunT || 0) > 0) { e.stunT -= dt; e.walk *= 0.9; e.attackT = -1; e.chargeT = -1; e.pulseT = -1; e.lungeT = -1; e.lungeHit = false; return; }          // staggered: it does nothing
  if (def.node) return;
  const dx = p.x - e.x, dz = p.z - e.z, dist = Math.hypot(dx, dz), dyv = Math.abs(p.y - e.y);          // dyv: an enemy cannot hit someone standing on a ledge two metres above it
  const sees = dist < def.sight && p.hp > 0 && hasLOS(w, e.x, e.z, p.x, p.z);
  if (sees) { e.lastX = p.x; e.lastZ = p.z; e.lost = 0; }
  if (e.state === 'idle') { if (sees) wakeEnemy(w, e, true); else return; }
  else if (!sees) e.lost = (e.lost || 0) + dt;
  // hunt: head for the last place the player was seen; give up after a while (or on arrival) and go back to sleep
  const tx = sees ? p.x : (e.lastX ?? p.x), tz = sees ? p.z : (e.lastZ ?? p.z), tdist = Math.hypot(tx - e.x, tz - e.z);
  if (!sees && e.attackT < 0 && (e.lungeT ?? -1) < 0 && (tdist < 1.2 || e.lost > 8)) { e.state = 'idle'; e.walk = 0; return; }
  // steering: straight at the target when it is in view and the ground allows it; otherwise follow the distance field around walls, doors and ledges
  let ax = tx, az = tz;
  if (!sees || !stepClear(w, e.x, e.z, tx, tz) || !moveClear(w, e.x, e.z, tx, tz, def.radius)) { const wp = navWaypoint(w, e.x, e.z, tx, tz); if (wp && wp.dist > 0) { ax = wp.x; az = wp.z; } }
  let dy = Math.atan2(ax - e.x, az - e.z) - e.yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy));
  const dashing = (def.lunge && (e.lungeT ?? -1) >= def.lunge.windup) || (def.charge && (e.chargeT ?? -1) >= def.charge.windup);                 // a dash keeps its heading: that is what makes it dodgeable
  if (e.attackT < 0 && !dashing) e.yaw += clamp(dy, -def.turnRate * dt, def.turnRate * dt);
  e.cd = Math.max(0, e.cd - dt);
  if (def.charge && chargeStep(w, e, def, diff, dt, sees, dist, dyv)) return;
  if (def.support && supportStep(w, e, def, dt, sees, dist)) return;
  if (def.boss && bossStep(w, e, def, diff, dt, sees, dist)) return;
  if (def.lunge) {
    const L = def.lunge; e.lungeCd = Math.max(0, (e.lungeCd || 0) - dt);
    if ((e.lungeT ?? -1) >= 0) {
      e.lungeT += dt;
      if (e.lungeT < L.windup) e.walk *= 0.8;                                        // crouch: the readable tell
      else if (e.lungeT < L.windup + L.duration) {
        const hit = () => { if (!e.lungeHit) { e.lungeHit = true; strikePlayer(w, e, Math.round(def.attack.damage * diff.enemyDamage)); emit(w, 'enemy_strike', { id: e.id, kind: e.kind, x: e.x, z: e.z }); } };
        tryMove(w, e, Math.sin(e.yaw) * L.speed * dt, Math.cos(e.yaw) * L.speed * dt, def.radius); e.walk = 1; e.phase += dt * def.gait;
        if (dist < def.attack.reach * 0.7 && dyv < 1.6) hit();
      } else { e.lungeT = -1; e.lungeCd = L.cooldown * diff.reaction; e.lungeHit = false; }
      return;
    }
    if (sees && e.attackT < 0 && e.lungeCd <= 0 && dist >= L.min && dist <= L.max) { e.lungeT = 0; e.lungeHit = false; emit(w, 'enemy_lunge', { id: e.id, kind: e.kind, x: e.x, z: e.z }); return; }
  }
  const R = def.ranged, engage = R ? R.hold : def.attack.range;
  if (e.attackT >= 0) {
    e.attackT += dt; e.walk *= 0.85;
    if (!e.struck && e.attackT >= def.attack.duration * def.attack.windup) {
      e.struck = true;
      if (R && dist >= R.minRange) fireEnemyShot(w, e, def, diff);                      // ranged: toll a shot
      else { if (dist < def.attack.reach && dyv < 1.6) strikePlayer(w, e, Math.round(def.attack.damage * diff.enemyDamage), !!def.boss || def.attack.damage >= 28); emit(w, 'enemy_strike', { id: e.id, kind: e.kind, x: e.x, z: e.z }); }
    }
    if (e.attackT >= def.attack.duration) { e.attackT = -1; e.cd = def.attack.cooldown * diff.reaction; e.struck = false; }
  } else if (R && sees && e.cd <= 0 && dist <= R.maxRange && dist >= R.minRange) {
    e.attackT = 0; e.struck = false; emit(w, 'enemy_windup', { id: e.id, kind: e.kind, x: e.x, z: e.z });
  } else if (def.flying && R && sees && dist < R.minRange && retreatStep(w, e, def, dt)) {
    e.walk = Math.min(1, e.walk + dt * 3); e.phase += dt * def.gait;
  } else if ((sees ? !(dist <= engage && dyv < 1.6) : tdist > 1.2)) {
    chaseStep(w, e, def, dt);
    e.walk = Math.min(1, e.walk + dt * 3); e.phase += dt * (def.gait ?? 5.2);
  } else {
    if (def.strafe && sees && !strafeStep(w, e, def, dt)) e.walk = Math.max(0, e.walk - dt * 3); else if (!def.strafe || !sees) e.walk = Math.max(0, e.walk - dt * 3);
    if (sees && dist <= def.attack.range + 0.1 && dyv < 1.6 && e.cd <= 0) { e.attackT = 0; e.struck = false; emit(w, 'enemy_windup', { id: e.id, kind: e.kind, x: e.x, z: e.z }); }
  }
}

// ---------------------------------------------------------------- step
export function step(w, cmd) {
  if (w.status !== 'playing') return;
  const p = w.player, diff = DIFFICULTY[w.difficulty], dt = TICK, map = w.map;
  w.tick++; w.time = w.tick * dt;
  updateSectors(w, dt); p.y = groundAt(w, p.x, p.z, PLAYER.radius);                       // moving floors carry whoever stands on them
  if (w.sectors.length) for (const it of w.pickups) it.y = floorAt(w, it.x, it.z);       // ...and whatever lies on them (audit A22)

  // look + move
  p.yaw += cmd.yaw || 0; p.pitch = clamp(p.pitch + (cmd.pitch || 0), -1.3, 1.3);
  let sx = clamp(cmd.move?.[0] || 0, -1, 1), sf = clamp(cmd.move?.[1] || 0, -1, 1);
  const len = Math.hypot(sx, sf); if (len > 1) { sx /= len; sf /= len; }
  const fx = -Math.sin(p.yaw), fz = -Math.cos(p.yaw), rx = Math.cos(p.yaw), rz = -Math.sin(p.yaw), a = Math.min(1, dt * PLAYER.accel);
  // stance: aim wins over sprint; sprint needs forward input; a dead-on-arrival sprint (no forward) is not a sprint
  const melee = isMelee(p.weapon), aimHeld = !!cmd.aim && !melee && p.swingT < 0, wasSprinting = p.sprinting;       // with a melee weapon in hand the Aim key is the GUARD (below), not the sights; a swing drops the sights
  p.brokenT = Math.max(0, p.brokenT - dt); p.riposteT = Math.max(0, p.riposteT - dt); p.parryCd = Math.max(0, p.parryCd - dt);
  const guardHeld = melee && !!cmd.aim && p.swingT < 0 && p.brokenT <= 0 && p.switchT <= 0 && p.hp > 0;          // not while the weapon is still coming up
  if (guardHeld && !p.guarding) { p.parryW = p.parryCd <= 0 ? GUARD.window : 0; if (p.parryW > 0) p.parryCd = GUARD.window + GUARD.whiffCd; emit(w, 'guard_up', {}); }
  else if (guardHeld) p.parryW = Math.max(0, p.parryW - dt); else p.parryW = 0;
  p.guarding = guardHeld; p.guard = clamp(p.guard + (guardHeld ? 1 : -1) * dt / GUARD.raise, 0, 1);
  p.sprinting = !!cmd.sprint && sf >= PLAYER.sprintMinForward && !aimHeld && !guardHeld && p.swingT < 0;
  if (wasSprinting && !p.sprinting) p.recover = PLAYER.sprintRecover;
  p.recover = Math.max(0, p.recover - dt);
  p.ads = clamp(p.ads + (aimHeld ? 1 : -1) * dt / PLAYER.adsTime, 0, 1);
  p.sprint = clamp(p.sprint + (p.sprinting ? 1 : -1) * dt / PLAYER.sprintBlendTime, 0, 1);
  const fxc = fxAt(w, p.x, p.z), speed = PLAYER.speed * fxSpeed(fxc) * (1 - (1 - PLAYER.adsMoveMult) * p.ads) * (1 - 0.3 * p.guard), fwdSpeed = speed * (p.sprinting ? PLAYER.sprintMult : 1);
  p.vx += ((fx * sf * fwdSpeed + rx * sx * speed) - p.vx) * a; p.vz += ((fz * sf * fwdSpeed + rz * sx * speed) - p.vz) * a;
  tryMove(w, p, p.vx * dt, p.vz * dt, PLAYER.radius);
  if (fxc !== p.fx) { if (fxc) emit(w, 'wade', { kind: fxc }); p.fx = fxc; }
  if (fxc && FX[fxc].dps) { p.hazardT = (p.hazardT || 0) + dt; if (p.hazardT >= 0.5) { p.hazardT -= 0.5; hurtPlayer(w, Math.round(FX[fxc].dps * 0.5 * diff.enemyDamage)); } } else p.hazardT = 0;
  p.bob += Math.hypot(p.vx, p.vz) * dt * 1.9;
  if (p.heat > 0) p.heat = Math.max(0, p.heat - dt * (WEAPONS[p.weapon].heatDecay || 1.4));
  p.cooldown = Math.max(0, p.cooldown - dt); p.hurt = Math.max(0, p.hurt - dt * 1.2); p.kick = Math.max(0, p.kick - dt * 0.4);
  // weapon selection: slot key, or cycle through owned weapons (mouse wheel). Switching costs the new weapon's switchTime.
  p.switchT = Math.max(0, (p.switchT || 0) - dt);
  // key 6 is the melee slot (pressing it again cycles the melee weapons you carry); Q goes back to the last weapon; the wheel / next / previous step through the guns and the melee slot
  const meleeOwned = MELEE_ORDER.filter((id) => owns(p, id)), curMelee = isMelee(p.weapon) ? p.weapon : (owns(p, p.meleeWeapon) ? p.meleeWeapon : 'fists');
  let want = null;
  if (cmd.weapon === WEAPON_ORDER.length) want = isMelee(p.weapon) ? meleeOwned[(meleeOwned.indexOf(p.weapon) + 1) % meleeOwned.length] : curMelee;
  else if (cmd.weapon != null) want = WEAPON_ORDER[cmd.weapon];
  else if (cmd.weaponLast) want = p.lastWeapon;
  else if (cmd.weaponStep) { const ring = [...WEAPON_ORDER.filter((id) => p.weapons.includes(id)), curMelee], i = ring.indexOf(isMelee(p.weapon) ? curMelee : p.weapon); want = ring[(i + cmd.weaponStep + ring.length) % ring.length]; }
  if (want && want !== p.weapon && owns(p, want) && (p.swingT < 0 || p.swingHit)) {
    p.lastWeapon = p.weapon; p.weapon = want; if (isMelee(want)) p.meleeWeapon = want; p.switchT = WEAPONS[want].switchTime; p.charge = 0; p.swingT = -1; p.queuedT = 0; emit(w, 'weapon_switch', { weapon: want });
  }

  // use: first door/secret panel along the view ray
  if (cmd.use) {
    const hit = useTarget(w);
    if (hit?.switchId) activateSwitch(w, map.switches.find((s) => s.id === hit.switchId));
    else if (hit) {
      if (hit.sealed || hit.remote) emit(w, 'door_remote', { cx: hit.cx, cz: hit.cz, x: (hit.cx + 0.5) * map.cell, z: (hit.cz + 0.5) * map.cell });          // opened elsewhere (a switch, or an event)
      else if (hit.key && !p.keys.includes(hit.key)) emit(w, 'door_locked', { key: hit.key, cx: hit.cx, cz: hit.cz, x: (hit.cx + 0.5) * map.cell, z: (hit.cz + 0.5) * map.cell });
      else if (hit.target === 0) { hit.target = 1; hit.hold = 0; emit(w, 'door_open', { cx: hit.cx, cz: hit.cz, secret: hit.secret, x: (hit.cx + 0.5) * map.cell, z: (hit.cz + 0.5) * map.cell }); }
    }
  }

  // swings in progress, the quick bash (V), the fire key. A charging weapon (the lamp, the fists) charges while the key is held and fires on release.
  updateSwing(w, dt);
  if (cmd.melee && p.swingT < 0 && p.switchT <= 0 && p.hp > 0) { if (isMelee(p.weapon)) { if (p.cooldown <= 0) startSwing(w, p.weapon === 'fists' ? 'jab' : p.weapon); } else startSwing(w, 'bash'); }
  const canAct = p.cooldown <= 0 && p.switchT <= 0 && !p.sprinting && p.recover <= 0 && p.swingT < 0;               // no firing mid-switch, mid-swing or from the sprint pose
  const wdef = WEAPONS[p.weapon];
  if (wdef.charge) chargeInput(w, cmd, wdef, canAct);
  else if (cmd.fire && canAct) fireWeapon(w);

  // doors
  for (const d of w.doors) {
    if (d.target === 1 && d.open < 1) { d.open = Math.min(1, d.open + dt * DOOR.speed); }
    else if (d.target === 1 && d.open >= 1 && !d.secret) {
      const cxw = (d.cx + 0.5) * map.cell, czw = (d.cz + 0.5) * map.cell;
      const occupied = [p, ...w.enemies.filter((e) => e.state !== 'dead')].some((o) => Math.hypot(o.x - cxw, o.z - czw) < DOOR.autoCloseClearance);
      d.hold = occupied ? 0 : d.hold + dt;
      if (d.hold >= DOOR.holdOpen) { d.target = 0; emit(w, 'door_close', { cx: d.cx, cz: d.cz, x: cxw, z: czw }); }
    } else if (d.target === 0 && d.open > 0) d.open = Math.max(0, d.open - dt * DOOR.speed);
  }

  // enemies + their shots + the fire on the ground
  updateBurns(w, dt);
  for (const e of w.enemies) updateEnemy(w, e, diff, dt);
  updateEnemyShots(w, diff, dt); updatePulses(w, dt);

  // projectiles (substepped so fast flares cannot tunnel through walls)
  for (let i = w.projectiles.length - 1; i >= 0; i--) {
    const q = w.projectiles[i], def = WEAPONS[q.weapon ?? 'flare']; q.life -= dt; q.vy -= def.gravity * dt;      // projectiles keep their own weapon stats after you switch away
    const speed = Math.hypot(q.vx, q.vy, q.vz), n = Math.ceil(speed * dt / 0.25); let hit = q.life <= 0;
    for (let k = 0; k < n && !hit; k++) {
      q.x += q.vx * dt / n; q.y += q.vy * dt / n; q.z += q.vz * dt / n;
      const cx = Math.floor(q.x / map.cell), cz = Math.floor(q.z / map.cell);
      if (q.y < floorAt(w, q.x, q.z) + 0.05 || q.y > ceilingAt(w, q.x, q.z) || cellSolid(w, cx, cz)) hit = true;
      for (const pr of map.props) if (PROPS[pr.kind].radius > 0 && Math.hypot(q.x - pr.x, q.z - pr.z) < PROPS[pr.kind].radius && q.y < floorAt(w, pr.x, pr.z) + 1.3) hit = true;
      for (const e of w.enemies) if (e.state !== 'dead' && insideFuse(e, q.x, q.y, q.z)) hit = true;
    }
    if (hit) { w.projectiles.splice(i, 1); explode(w, q.x, q.y, q.z, true, def); }
  }

  // last-resort feed: a player with no ammunition of ANY kind (for a gun they carry: bolts picked up before the rifle do not count) is never left with nothing: the flare cannon's feed drops one flare after a few seconds (and again each time it is spent).
  // PT-013 gave everybody fists, and the first version of this batch removed the feed ("fists mean you are never empty"). It is back, as a safety net: fists cannot hurt a plated Warden from the front (a bash does a third of its damage through the plate), so a player who ran dry in front of one could be soft-locked, and the robustness gate (a strafing fighter with 25% less ammunition pickups must finish C1E1M06) failed without it.
  if (p.hp > 0 && !Object.keys(AMMO_MAX).some((k) => (p.ammo[k] || 0) > 0 && Object.entries(WEAPONS).some(([id, wd]) => wd.ammo === k && p.weapons.includes(id)))) { p.feedT = (p.feedT ?? 0) + dt; if (p.feedT >= PLAYER.dryFeed.every) { p.feedT = 0; p.ammo.flare = (p.ammo.flare || 0) + PLAYER.dryFeed.amount; emit(w, 'dry_feed', { x: p.x, z: p.z }); } } else if (p.feedT) p.feedT = 0;
  // pickups
  for (let i = w.pickups.length - 1; i >= 0; i--) {
    const it = w.pickups[i], def = PICKUPS[it.kind];
    if (Math.hypot(p.x - it.x, p.z - it.z) > 0.9 || Math.abs((it.y ?? 0) - p.y) > 1.0) continue;
    let took = false;
    const aCap = def.type === 'armor' ? armorCap(w.upgrades) : 0, mCap = def.ammo ? ammoCap(def.ammo, w.upgrades) : 0;      // the caps rise with the persistent upgrades (progress.js)
    if (def.type === 'health' && p.hp < PLAYER.maxHp) { p.hp = Math.min(PLAYER.maxHp, p.hp + def.amount); took = true; }
    else if (def.type === 'armor' && p.armor < aCap) { p.armor = Math.min(aCap, p.armor + def.amount); took = true; }
    else if (def.type === 'ammo' && (p.ammo[def.ammo] || 0) < mCap) { p.ammo[def.ammo] = Math.min(mCap, (p.ammo[def.ammo] || 0) + Math.round(def.amount * diff.ammoPickup * (w.ammoScale ?? 1))); took = true; }
    else if (def.type === 'key' && !p.keys.includes(def.key)) { p.keys.push(def.key); took = true; }
    else if (def.type === 'weapon' && (!p.weapons.includes(def.weapon) || (def.ammo && (p.ammo[def.ammo] || 0) < mCap))) {
      if (!p.weapons.includes(def.weapon)) { p.weapons.push(def.weapon); p.weapons.sort((a, b) => ALL_WEAPONS.indexOf(a) - ALL_WEAPONS.indexOf(b)); p.lastWeapon = p.weapon; p.weapon = def.weapon; if (isMelee(def.weapon)) p.meleeWeapon = def.weapon; p.switchT = WEAPONS[def.weapon].switchTime; p.charge = 0; p.swingT = -1; }
      if (def.ammo) p.ammo[def.ammo] = Math.min(mCap, (p.ammo[def.ammo] || 0) + Math.round(def.amount * diff.ammoPickup * (w.ammoScale ?? 1)));
      took = true;
    }
    if (took) { w.pickups.splice(i, 1); if (def.type !== 'key') w.stats.items++; emit(w, def.type === 'weapon' ? 'weapon_pickup' : 'pickup', def.type === 'key' && map.keyLabels?.[def.key] ? { kind: it.kind, label: map.keyLabels[def.key] } : { kind: it.kind }); }
  }

  if (w.tick === 1 || w.tick % EXPLORE_EVERY_TICKS === 0) {
    updateExplored(w);
    // in-world messages (transmissions, notes): shown once, the first time the player comes within range
    for (const m of map.messages) if (!w.messagesSeen.includes(m.id) && Math.hypot(p.x - m.x, p.z - m.z) <= m.r) { w.messagesSeen.push(m.id); emit(w, 'message', { id: m.id, speaker: m.speaker || '', text: m.text }); }
  }          // automap: remember what has been seen

  // secrets: found when the player stands in one of the secret's cells
  const pcx = Math.floor(p.x / map.cell), pcz = Math.floor(p.z / map.cell);
  for (const s of map.secrets) if (!w.secretsFound.includes(s.id) && s.cells.some(([cx, cz]) => cx === pcx && cz === pcz)) { w.secretsFound.push(s.id); w.stats.secrets++; emit(w, 'secret', { id: s.id }); }

  updateTriggers(w);

  // resolution order matters: damage is settled first, so a player who dies this tick cannot also exit
  if (p.hp <= 0) { p.hp = 0; w.status = 'dead'; emit(w, 'player_died'); }
  else {
    const near = map.exits.find((x) => Math.hypot(p.x - x.x, p.z - x.z) < 1.4 && Math.abs(floorAt(w, x.x, x.z) - p.y) < 1.5);
    if (near && w.exitLocked[near.id]) { if (w.tick % 90 === 0) emit(w, 'exit_locked', { x: near.x, z: near.z }); }
    else if (near) {
      w.status = 'complete'; w.endStats = { time: w.time, kills: w.stats.kills, items: w.stats.items, secrets: w.stats.secrets, total: w.stats.total, damageTaken: w.stats.damageTaken, dest: near.dest };
      emit(w, 'level_complete', { dest: near.dest });
    }
  }
}

/** A fresh run of the same level with the SAME seed and difficulty and the inventory the level began with (used by Retry). */
export const restartWorld = (w) => createWorld(w.map, { seed: w.seed, difficulty: w.difficulty, carry: w.levelStart });

/** Inventory carried into the next map / level-start checkpoint. Keys do not carry. */
export const carryOver = (w) => ({ hp: Math.max(1, w.player.hp), armor: w.player.armor, ammo: { ...w.player.ammo }, weapons: [...w.player.weapons], upgrades: { ...w.upgrades } });

export function hashWorld(w) {
  const s = JSON.stringify(w, (k, v) => (typeof v === 'number' ? Math.round(v * 1e5) / 1e5 : v));
  let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h.toString(16).padStart(8, '0');
}
