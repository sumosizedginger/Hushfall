// Headless, deterministic simulation. Fixed 1/60 s ticks, seeded RNG, plain-data state (JSON-serialisable).
// Nothing here touches DOM/Three/time/Math.random. The renderer reads state and drains events.
import { gateOpen, sporeState } from './breath.js';
import { cycleHeight } from './platforms.js';
import { loadState, loadIndex, inLoad } from './loads.js';
import { makeChimes, strikeChime, playTree, updateChimes, chimeTarget } from './chimes.js';
import { SUPPRESS, TICK, DIFFICULTY, PLAYER, AMMO_MAX, WEAPONS, WEAPON_ORDER, SLOT_KEYS, MELEE_ORDER, ALL_WEAPONS, GUARD, BASH, ENEMY_STRIKE, ENEMIES, PICKUPS, PROPS, DOOR, NOISE, STEP, FX, LOWG, VACUUM, LOCK, LOADS, FLOW, GRAFT, LANTERN, ECHO } from './defs.js';
import { ammoCap, armorCap, sanitizeUpgrades } from './progress.js';
import { nextRandom, initialRngState } from './rng.js';
import { updateExplored, EXPLORE_EVERY_TICKS } from './automap.js';
import { cellFloor, floorAt, groundAt, tooHigh, ceilingAt, fxAt, fxSpeed } from './terrain.js';
import { maybeDrop, updateDrops, trackFired } from './drops.js';
import { navWaypoint } from './nav.js';
import { updateSectors, updateTriggers, activateSwitch, choiceHolds } from './script.js';
import { insideHit, insideFuse, hitCylinder } from './hitvolume.js';
import { holdTarget, holdUpkeep, rangePlayer } from './range.js';
import { spawnPhys, physAt, physBlocks, blastProps, updatePhys, updateShoves, gravInput, gravDrop, rangePhys } from './gravity.js';      // PT-022: the gravity tool and the movable props (nothing here runs on a map without movable props unless the fork is in hand)
import { designate as mortarShot } from './mortar.js';                                                              // PT-027: the Bell-breaker mortar (indirect fire)
import { sawStep } from './saw.js';                                                                                  // PT-022: the chainsaw's held fire
import { traceBeams, nextRot } from './beams.js';                                                                    // PT-033: the Mirror Array's light (lazy state: only a map with an emitter has `w.mirrors` and `w.beams`)
import { lockBusy, inVacuum } from './airlock.js';                                                                    // PT-033: airlocks and vacuum (lazy: only a map that has them uses them)
import { sweepStep } from './sweep.js';                                                                              // PT-033: the Gate Warden's sweep
import { folkStep, folkHears, frighten } from './folk.js';
import { makeResonators, resonatorsHear, updateResonators } from './resonator.js';                                   // PT-037: the standing forks (lazy: only a map with a resonator prop has `w.resonators`)                                                            // PT-037: the Vael civilians (peaceful: states 'calm' and 'flee', never 'idle' or 'chase')

const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const rand = (w) => nextRandom(w);
const lerp = (a, b, t) => a + (b - a) * t;
const isMelee = (id) => WEAPONS[id]?.kind === 'melee';
const owns = (p, id) => id === 'fists' || p.weapons.includes(id);                     // fists are always owned
const hidden = (o, k, v) => Object.defineProperty(o, k, { value: v, enumerable: false, writable: true, configurable: true });

/** the one place an enemy record is built (createWorld and tests both use it) */
export function spawnEnemy(w, kind, x, z, yaw = Math.PI) {
  const def = ENEMIES[kind], diff = DIFFICULTY[w.difficulty];
  const e = { id: w.nextId++, kind, x, z, y: groundAt(w, x, z, def.radius), group: null, yaw, hp: def.hp * diff.enemyHp, state: def.peaceful ? 'calm' : 'idle', walk: 0, phase: 0, attackT: -1, cd: 0, struck: false, flash: 0, dead: 0, lungeT: -1, lungeCd: 0, lungeHit: false, lastX: null, lastZ: null, lost: 0, steer: 0, stunT: 0, chargeT: -1, chargeCd: 0, channelT: -1, supCd: 0, revived: 0, pulseCd: 2, pulseT: -1, summonCd: 8, shotCd: 2 };
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

export function createWorld(map, { seed = 1, difficulty = 'normal', carry = null, ammoScale = null, choices = null } = {}) {
  carry = arrivalInventory(carry, map.entryLoadout ?? null);
  const diff = DIFFICULTY[difficulty];
  if (!diff) throw new Error('unknown difficulty ' + difficulty);
  const w = {
    ...(ammoScale != null ? { ammoScale } : {}),                        // robustness testing only: a level whose ammo pickups are scaled (a player who wastes shots)
    ...(choices && Object.keys(choices).length ? { choices: { ...choices } } : {}),                // PT-039: what earlier maps remembered (progress.choices): lazy, a world without any has no field
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
    sectors: map.sectors.map((s) => { const h = s.cycle ? cycleHeight(s, 0) : s.start === 'high' ? s.high : s.low; return { id: s.id, h, target: h, speed: s.speed }; }),      // moving floors (lifts, ramps)
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
    if (e.type === 'enemy') { const en = spawnEnemy(w, e.kind, e.x, e.z, typeof e.facing === 'number' ? e.facing : Math.PI); if (e.group) en.group = e.group; if (e.variant) en.variant = e.variant; if (e.spawns) en.spawns = e.spawns; if (e.summons) en.summons = e.summons.map(([cx, cz]) => [(cx + 0.5) * map.cell, (cz + 0.5) * map.cell]); if (e.hold) holdTarget(en, e); }
    else if (e.type === 'pickup') w.pickups.push({ id: w.nextId++, kind: e.kind, x: e.x, z: e.z, y: floorAt(w, e.x, e.z) });
  }
  w.player.y = groundAt(w, w.player.x, w.player.z, PLAYER.radius);
  if (map.movables?.length) w.phys = spawnPhys(w, map);                                      // PT-022: props the gravity tool can lift (only a map that lists them has any)
  for (const d of map.doors.values()) { const on = d.breath ? (gateOpen(d.breath, 0) ? 1 : 0) : d.startOpen ? 1 : 0; w.doors.push({ cx: d.cx, cz: d.cz, key: d.key, open: on, target: on, hold: 0, secret: !!d.closet || !!d.remote || !!d.startOpen, remote: !!d.remote, closet: !!d.closet, sealed: false, ...(d.breath ? { breath: d.breath } : {}), ...(d.soundlock ? { soundlock: d.soundlock } : {}), ...(d.interlock ? { interlock: d.interlock, closedAt: -99 } : {}) }); }
  for (const s of map.secrets) w.doors.push({ cx: s.panel[0], cz: s.panel[1], key: null, open: 0, target: 0, hold: 0, secret: true, secretId: s.id });
  if (map.emitters.length || map.mirrors.length) w.mirrors = Object.fromEntries(map.mirrors.map((m) => [m.id, m.rot]));
  { const ch = makeChimes(map); if (ch) w.chimes = ch; }                                                           // PT-038 (E6): chime state, only where the map has a chime or a tree
  if (map.lantern) w.player.lamp = { on: false, oil: map.lantern.oil, max: map.lantern.max ?? LANTERN.max, eternal: !!map.lantern.eternal };          // PT-038 (E5): the hand lantern: lazy, only a map that carries one has it
  if (map.dark) w.lit = false;                                                                                  // ...and only a dark place keeps the 'is the player lit' flag
  if (map.props.some((p) => p.kind === 'resonator')) w.resonators = makeResonators(map);            // PT-037 (resonator.js)
  if (map.emitters.length) { w.beams = { lit: [] }; updateBeams(w, true); }          // PT-033: the beams (beams.js)
  return w;
}

export function drainEvents(w) { const e = w.events; w.events = []; hidden(w, 'events', w.events); return e; }
export const emit = (w, type, data = {}) => w.events.push({ type, tick: w.tick, ...data });

// ---------------------------------------------------------------- collision
export const doorAtCell = (w, cx, cz) => w.doors.find((d) => d.cx === cx && d.cz === cz);
/** PT-033: trace the beams again; a receiver that becomes lit or dark says so (the view and the audio read the events, a trigger reads `w.beams.lit`) */
export function updateBeams(w, silent = false) {
  const open = (cx, cz) => { const d = doorAtCell(w, cx, cz); return !!d && d.open >= 0.85; };
  const t = traceBeams(w.map, w.mirrors, open), was = w.beams.lit, cell = w.map.cell;
  if (!silent) for (const r of w.map.receivers) { const on = t.lit.includes(r.id), off = !was.includes(r.id); if (on && off) emit(w, 'receiver_lit', { id: r.id, x: (r.at[0] + 0.5) * cell, z: (r.at[1] + 0.5) * cell }); else if (!on && !off) emit(w, 'receiver_dark', { id: r.id, x: (r.at[0] + 0.5) * cell, z: (r.at[1] + 0.5) * cell }); }
  w.beams.lit = t.lit;
}
/** PT-033: Use on a mirror turns it a quarter step clockwise */
export function turnMirror(w, id) {
  const m = w.map.mirrors.find((q) => q.id === id); if (!m) return;
  w.mirrors[id] = nextRot(w.mirrors[id]); emit(w, 'mirror_turn', { id, rot: w.mirrors[id], x: (m.at[0] + 0.5) * w.map.cell, z: (m.at[1] + 0.5) * w.map.cell }); if (w.beams) updateBeams(w);
}
export function cellSolid(w, cx, cz) {
  const m = w.map, k = m.kind(cx, cz);
  if (k === 'wall') return true;
  if (k === 'door' || k === 'secret') { const d = doorAtCell(w, cx, cz); return !d || d.open < DOOR.passableAt; }
  return false;
}
/** blocks walking: walls, closed doors, and water. (Sight and projectiles use cellSolid, so they pass over water.) */
function blocksMove(w, cx, cz, air = false) { return cellSolid(w, cx, cz) || w.map.kind(cx, cz) === 'water' || (!air && w.map.hasVoid && w.map.kind(cx, cz) === 'void'); }      // (PT-032: open sky blocks everyone who is not in the air)
/** `self` = the moving entity (player or enemy): living enemies and the player then block it, so nothing walks through anyone. */
export function blockedCircle(w, x, z, r, self = null) {
  const S = w.map.cell, fly = !!(self && self.kind && ENEMIES[self.kind]?.flying), air = !!(self && self.air);                  // a flyer (Drone-Gill) is stopped by walls and closed doors only: not by water, ledges or props
  for (let cz = Math.floor((z - r) / S); cz <= Math.floor((z + r) / S); cz++) for (let cx = Math.floor((x - r) / S); cx <= Math.floor((x + r) / S); cx++) {
    if (!(fly ? cellSolid(w, cx, cz) : blocksMove(w, cx, cz, air))) continue;
    const nx = clamp(x, cx * S, (cx + 1) * S), nz = clamp(z, cz * S, (cz + 1) * S);
    if ((x - nx) ** 2 + (z - nz) ** 2 < r * r) return true;
  }
  if (self && !fly && tooHigh(w, self, x, z, r)) return true;                            // a ledge more than a step above the mover's feet
  const over = air && self.y > groundAt(w, x, z, r) + 2.2;                                                 // PT-033: a body in the air above the height of a prop or a creature passes over it
  if (!fly && !over) for (const p of w.map.props) { const pr = PROPS[p.kind].radius; if (pr > 0 && (x - p.x) ** 2 + (z - p.z) ** 2 < (r + pr) ** 2) return true; }
  if (!fly && w.phys && physBlocks(w, x, z, r, self)) return true;                       // a movable prop that has come to rest is as solid as a static one
  if (self) {
    for (const e of w.enemies) if (e !== self && e.state !== 'dead' && (x - e.x) ** 2 + (z - e.z) ** 2 < (r + ENEMIES[e.kind].radius) ** 2 && !(air && (self.y > (e.y ?? 0) + ENEMIES[e.kind].height + (ENEMIES[e.kind].hover ?? 0) || self.y + 1.7 < (e.y ?? 0)))) return true;
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
/** wading water or a current: what the arc lamp conducts through (PT-037: a current is water that moves) */
function inWater(w, x, z) { const c = fxAt(w, x, z); return c === 'w' || !!(c && FX[c]?.water); }
/** PT-037 (E3): a flowing floor pushes whoever stands on it, FLOW.push m/s, on top of their own movement */
function flowPush(w, o, r, dt) { const c = fxAt(w, o.x, o.z), f = c && FX[c]?.flow; if (f) tryMove(w, o, f[0] * FLOW.push * dt, f[1] * FLOW.push * dt, r); }
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
/** is the player inside the arc in front of enemy `e` (cos of the half-angle)? The enemy's facing is its yaw: forward = (sin yaw, cos yaw) */
function inFront(e, p, cos) { const dx = p.x - e.x, dz = p.z - e.z, d = Math.hypot(dx, dz); return d < 1e-6 || (Math.sin(e.yaw) * dx + Math.cos(e.yaw) * dz) / d >= cos; }
export const forwardVec = (p) => [-Math.sin(p.yaw) * Math.cos(p.pitch), Math.sin(p.pitch), -Math.cos(p.yaw) * Math.cos(p.pitch)];

// ---------------------------------------------------------------- damage
/** PT-033: a body in a region of vacuum takes VACUUM.dps a second (the difficulty scales it, as a toxic bed's); `p.vac` is lazy state that only a map with vacuum has */
function vacuumStep(w, dt, diff) {
  const p = w.player, on = inVacuum(w, p.x, p.z);
  if (on) { p.vacT = (p.vacT || 0) + dt; if (p.vacT >= VACUUM.tick) { p.vacT -= VACUUM.tick; p.vacAcc = (p.vacAcc || 0) + VACUUM.dps * VACUUM.tick * diff.enemyDamage; const whole = Math.floor(p.vacAcc); p.vacAcc -= whole; hurtPlayer(w, whole); } } else p.vacT = 0;          // fractions carry over: Easy and Hard feel it too
  if (on !== !!p.vac) { p.vac = on; emit(w, on ? 'vacuum_enter' : 'vacuum_leave', {}); }
}
function hurtPlayer(w, dmg) {
  const p = w.player; if (p.hp <= 0 || dmg <= 0) return;
  const absorbed = Math.min(p.armor, Math.floor(dmg * PLAYER.armorAbsorb));
  p.armor -= absorbed; const real = dmg - absorbed; p.hp -= real; p.hurt = 1; w.stats.damageTaken += real;
  emit(w, 'hurt', { amount: real });
}

/** how far a creature notices the player (PT-038, E5): its own range, except in a dark place, where it is `sightDark` unless the player is lit; the Hush-driven kinds ignore the light */
function sightIn(w, def) {
  if (!w.map.dark || def.hush) return def.sight;
  return Math.min(def.sight, w.lit ? LANTERN.sightLit : LANTERN.sightDark);
}

/** is the player lit this tick: the lantern is lit, or a lit prop (a lantern, a lamp) is within `LANTERN.radius` of them (computed once a tick in a dark place, never elsewhere) */
function playerLit(w) {
  const p = w.player; if (p.lamp?.on) return true;
  for (const q of w.map.props) if (LANTERN.lightProps.includes(q.kind) && Math.hypot(q.x - p.x, q.z - p.z) < LANTERN.radius) return true;
  return false;
}

/** the lantern's own clock (lazy: only where the map has one): the toggle, the burn, the cough when the oil is gone */
function updateLamp(w, cmd, dt) {
  const p = w.player, L = p.lamp; if (!L) return;
  if (cmd.lamp && p.hp > 0) {
    if (L.on) { L.on = false; emit(w, 'lamp', { on: false }); }
    else if (L.oil > 0 || L.eternal) { L.on = true; emit(w, 'lamp', { on: true }); }
    else emit(w, 'lamp_dry', {});
  }
  if (L.on && !L.eternal) { L.oil = Math.max(0, L.oil - LANTERN.burn * dt); if (L.oil <= 0) { L.on = false; emit(w, 'lamp_out', {}); } }
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
  hurtPlayer(w, dmg); graftPlayer(w, e); return 'hit';
}

/** a Zealot's lance that lands GRAFTS (PT-038): `p.graftT` is lazy state, set only here; it slows the walk (the speed line in updatePlayer) and counts down with the clock */
function graftPlayer(w, e) {
  const g = ENEMIES[e.kind].graft, p = w.player; if (!g || p.hp <= 0) return;
  if (!(p.graftT > 0)) emit(w, 'graft', { x: p.x, z: p.z });
  p.graftT = g.time;
}

/** Wake an enemy (idle -> chase) remembering where the player is; enemies near the one that woke are alerted too. */
export function wakeEnemy(w, e, loud, scripted = false) {
  e.state = 'chase'; e.lost = 0; e.lastX = w.player.x; e.lastZ = w.player.z;
  if (loud) emit(w, 'enemy_alert', { id: e.id, kind: e.kind, x: e.x, z: e.z });
  if (!scripted) for (const o of w.enemies) if (o.state === 'idle' && Math.hypot(o.x - e.x, o.z - e.z) < 12 && hasLOS(w, e.x, e.z, o.x, o.z)) { o.state = 'chase'; o.lost = 0; o.lastX = w.player.x; o.lastZ = w.player.z; }
}
/** Loud noise (gunfire, explosion): idle enemies within `radius` wake if nothing solid is between, or if it is very close. */
export function noise(w, x, z, radius) {
  if (w.map.echo !== 1 && radius > ECHO.loud) radius *= w.map.echo;                       // PT-039 (Act B): in a place with an echo a loud noise carries that much further (a quiet one does not)
  if (w.resonators) resonatorsHear(w, x, z, radius);                                       // PT-037: a fork in earshot will ring
  if (w.map.hasSoundlock) w.noise = { t: w.time, x, z };                                   // PT-029: a sound-lock door listens (only a map that has one records this)
  for (const e of w.enemies) {
    if (e.state === 'calm' || e.state === 'flee') { folkHears(w, e, x, z, radius); continue; }          // PT-037: a peaceful creature runs from it instead of waking
    if (e.state !== 'idle') continue; const d = Math.hypot(e.x - x, e.z - z);
    if (d < radius && (d < NOISE.closeRange || hasLOS(w, x, z, e.x, e.z))) wakeEnemy(w, e, false);
  }
}

/** apply damage to an enemy; returns true if this killed it (and emits the death). Callers emit enemy_hit for survivors. */
export function damageEnemy(w, e, dmg, opts = {}) {
  const def = ENEMIES[e.kind];
  if (def.armor && !opts.splash && !opts.pierceArmor && !(def.armor.opens && e.attackT >= 0)) {                             // (a Bulwark Shell's carapace is open while it bashes, PT-028) plate on the front arc: only the shooter's side counts, splash and a harpoon bolt ignore it
    if ((e.stunT || 0) > 0) dmg *= def.armor.stunMult ?? 1;
    else { const tx = w.player.x - e.x, tz = w.player.z - e.z, tl = Math.hypot(tx, tz) || 1; if ((Math.sin(e.yaw) * tx + Math.cos(e.yaw) * tz) / tl > def.armor.cos) { dmg *= def.armor.front; emit(w, 'armor_hit', { id: e.id, x: e.x, z: e.z }); } }
  }
  if (!def.ward && !def.node && !def.boss) { const A = wardOf(w, e); if (A) { dmg *= ENEMIES.acolyte.ward.reduce; emit(w, 'ward_hit', { id: e.id, x: e.x, z: e.z }); } }          // PT-029: an awake Acolyte's ward
  if (def.shield && w.enemies.some((n) => ENEMIES[n.kind].node && n.state !== 'dead')) { dmg *= def.shield.reduce; emit(w, 'shield_hit', { id: e.id, x: e.x, z: e.z }); }
  else if (def.boss && (e.stunT || 0) > 0) dmg *= 1.5;                                 // a staggered Cantor with its shield down takes more      // the Cantor sings through its ring
  if ((e.channelT ?? -1) >= 0 && dmg > 0 && !opts.burn) { e.channelT = -1; e.supCd = Math.max(e.supCd || 0, 1.8); }      // hurting a channelling Sexton breaks the rite, and it needs a moment to start again
  e.hp -= dmg; e.flash = 1; if (e.hold) e.hurtT = 0;
  if (def.peaceful && e.hp > 0) frighten(w, e, w.player.x, w.player.z);                                  // PT-037: hurt, it runs (from the one who did it)
  if (e.state === 'idle' && e.hp > 0 && !def.node) wakeEnemy(w, e, !opts.burn, !!opts.burn);                    // being shot wakes you, whether or not you can see the shooter (a creature set alight wakes alone: it does not call its neighbours, the burst that lit it already made its noise)
  if (e.hp <= 0 && e.state !== 'dead') {
    e.state = 'dead'; e.attackT = -1; e.lungeT = -1; e.chargeT = -1; e.channelT = -1;
    if (def.peaceful) { w.stats.innocents = (w.stats.innocents ?? 0) + 1; emit(w, 'enemy_died', { id: e.id, kind: e.kind, x: e.x, z: e.z, folk: true }); emit(w, 'innocent', { id: e.id, kind: e.kind, x: e.x, z: e.z }); return true; }          // PT-037: an innocent is not a kill, and leaves nothing
    w.stats.kills++; emit(w, 'enemy_died', { id: e.id, kind: e.kind, x: e.x, z: e.z }); maybeDrop(w, e);
    if (def.node) { emit(w, 'node_severed', { id: e.id, kind: e.kind, x: e.x, z: e.z }); for (const c of w.enemies) if (!def.spawner && ENEMIES[c.kind].boss && c.state !== 'dead') { c.stunT = ENEMIES[c.kind].stagger ?? 2; c.pulseT = -1; c.pulseCd = Math.max(c.pulseCd, 2.5); } }
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
export function hitEffects(w, e, h, dist = 99) {
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

/** a BREATHING gate (breath.js): open while its clock says so, whatever anyone does; it never shuts on a body (anyone within the door clearance holds it open), and it announces every change */
function breathGate(w, d, dt) {
  const cxw = (d.cx + 0.5) * w.map.cell, czw = (d.cz + 0.5) * w.map.cell;
  let want = gateOpen(d.breath, w.time);
  if (!want && d.target === 1 && [w.player, ...w.enemies.filter((e) => e.state !== 'dead')].some((o) => Math.hypot(o.x - cxw, o.z - czw) < DOOR.autoCloseClearance)) want = true;
  const goal = want ? 1 : 0;
  if (goal !== d.target) { d.target = goal; emit(w, goal ? 'door_open' : 'door_close', { cx: d.cx, cz: d.cz, x: cxw, z: czw, breath: true }); }
  if (d.open < d.target) d.open = Math.min(d.target, d.open + dt * DOOR.speed); else if (d.open > d.target) d.open = Math.max(d.target, d.open - dt * DOOR.speed);
}
/** the spore regions announce their blooms (audio and the view; the damage itself is just fxAt): lazy state, so a map without pulses is untouched */
function updateSpores(w) {
  const st = w.spores ?? (w.spores = w.map.pulses.map((p) => { const s = sporeState(p, w.time); return { on: s.on, warned: s.warn > 0 }; }));
  w.map.pulses.forEach((p, i) => {
    const s = sporeState(p, w.time), o = st[i], x = (p.rect[0] + p.rect[2] + 1) / 2 * w.map.cell, z = (p.rect[1] + p.rect[3] + 1) / 2 * w.map.cell;
    if (s.on && !o.on) emit(w, 'spore_bloom', { i, x, z, r: Math.hypot(p.rect[2] - p.rect[0] + 1, p.rect[3] - p.rect[1] + 1) * w.map.cell / 2 });
    else if (!s.on && o.on) emit(w, 'spore_fade', { i, x, z });
    else if (s.warn > 0 && !o.warned && !s.on) emit(w, 'spore_warn', { i, x, z });
    o.on = s.on; o.warned = s.warn > 0;
  });
}

function explode(w, x, y, z, ownerIsPlayer, def, struck = null) {
  emit(w, 'explode', { x, y, z, r: def.splash }); noise(w, x, z, NOISE.explosion);
  if (def.burn) ignite(w, x, y, z, def.burn);
  for (const e of w.enemies) {
    if (e.state === 'dead') continue;
    const ed = ENEMIES[e.kind], base = e.y + (ed.hover ?? 0) * (1 - Math.min(1, e.dead ?? 0)), lo = ed.hover ? 0.3 : 1.0, body = ed.height, d = Math.hypot(x - e.x, y - (base + Math.min(Math.max(y - base, lo), Math.max(lo, body - 1.0))), z - e.z);      // measured from the blast's own height on the body (1 m up, or higher on a tall one): a flare on the Cantor's head is not 3 m from it
    if (d < def.splash) {
      let dmg = def.splashDamage * (1 - d / def.splash) + def.direct; if (e === struck && def.directHit) dmg += def.directHit; if (ed.node && def.nodeMult) dmg *= def.nodeMult;       // PT-022: the rocket's direct hit, and a bell node takes the blast twice over
      const killed = damageEnemy(w, e, dmg, { splash: true });
      const k = (def.knock ?? 0.8) * (1 - d / def.splash), nx = (e.x - x) / (d || 1), nz = (e.z - z) / (d || 1); tryMove(w, e, nx * k, nz * k, ENEMIES[e.kind].radius);
      if (!killed) emit(w, 'enemy_hit', { id: e.id, kind: e.kind, x: e.x, z: e.z });
    }
  }
  if (w.phys) blastProps(w, x, y, z, def);
  const p = w.player, d = Math.hypot(x - p.x, y - (p.y + PLAYER.eye), z - p.z);
  if (ownerIsPlayer && d < def.splash * 0.65) hurtPlayer(w, Math.round(def.splashDamage * def.selfDamage * (1 - d / (def.splash * 0.65))));
}

// ---------------------------------------------------------------- weapons
/** Scatter def.pellets rays from the eye. Pellets stop at walls, closed doors, solid props, and the first enemy they touch. */
function fireHitscan(w, def, cone) {
  const p = w.player, map = w.map, hits = new Map(), push = new Map(), heads = new Set(), struckChimes = new Set(); let impacts = 0;
  for (let i = 0; i < def.pellets; i++) {
    const f = forwardVec({ yaw: p.yaw + (rand(w) * 2 - 1) * cone, pitch: p.pitch + (rand(w) * 2 - 1) * cone });
    let x = p.x, y = p.y + PLAYER.eye, z = p.z, target = null, stop = false, dist = 0;
    for (dist = 0.25; dist <= def.range && !target && !stop; dist += 0.25) {
      x += f[0] * 0.25; y += f[1] * 0.25; z += f[2] * 0.25;
      if (y < floorAt(w, x, z) + 0.02 || y > ceilingAt(w, x, z) || cellSolid(w, Math.floor(x / map.cell), Math.floor(z / map.cell))) { stop = true; break; }
      for (const pr of map.props) if (PROPS[pr.kind].radius > 0 && Math.hypot(x - pr.x, z - pr.z) < PROPS[pr.kind].radius && y < floorAt(w, pr.x, pr.z) + 1.3) { stop = true; if (pr.kind === 'chime' && w.chimes && !struckChimes.has(pr)) struckChimes.add(pr); }
      if (!stop && w.phys && physAt(w, x, y, z)) stop = true;
      if (stop) break;
      for (const e of w.enemies) if (e.state !== 'dead' && insideHit(e, x, y, z, 0.05)) { target = e; break; }
    }
    if (target) {
      const fall = dist <= def.falloffStart ? 1 : 1 - (1 - def.falloffMin) * Math.min(1, (dist - def.falloffStart) / (def.range - def.falloffStart));
      let mult = 1;
      if (def.head && !ENEMIES[target.kind].node) { const c = hitCylinder(target); if (y >= c.y0 + (c.y1 - c.y0) * def.head.from) mult = def.head.mult; }       // PT-022, the carbine: a round in the top of the body
      const killed = damageEnemy(w, target, def.damage * fall * mult);
      if (mult > 1) { heads.add(target); emit(w, 'headshot', { id: target.id, x: target.x, y, z: target.z, killed }); }
      if (!killed) hits.set(target.id, target);
      const k = push.get(target.id) || { e: target, x: 0, z: 0 }; k.x += f[0] * def.knock * fall; k.z += f[2] * def.knock * fall; push.set(target.id, k);      // applied after the volley: pellets are simultaneous
    } else if (stop && impacts < 3 && i % 3 === 0) { emit(w, 'impact', { x, y, z }); impacts++; }
  }
  for (const pr of struckChimes) strikeChime(w, pr, emit);                                                  // PT-038: a shot that stopped on a chime struck it (once a volley)
  const range0 = new Map([...hits.values()].map((e) => [e, Math.hypot(e.x - p.x, e.z - p.z)]));                    // how far it was when it was hit: before the knockback carries it away
  for (const k of push.values()) tryMove(w, k.e, k.x, k.z, ENEMIES[k.e.kind].radius);
  for (const e of hits.values()) if (e.state !== 'dead') { hitEffects(w, e, def.hit, range0.get(e)); if (heads.has(e)) hitEffects(w, e, { flinch: def.head.flinch }); emit(w, 'enemy_hit', { id: e.id, kind: e.kind, x: e.x, z: e.z }); }
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
    if (!stop && w.phys && physAt(w, x, y, z)) stop = true;
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
export function rayClear(w, x0, y0, z0, x1, y1, z1, skipPhys = false) {
  const map = w.map, dx = x1 - x0, dy = y1 - y0, dz = z1 - z0, n = Math.max(1, Math.ceil(Math.hypot(dx, dy, dz) / 0.25));
  for (let i = 1; i < n; i++) {
    const t = i / n, x = x0 + dx * t, y = y0 + dy * t, z = z0 + dz * t;
    if (y < floorAt(w, x, z) + 0.02 || y > ceilingAt(w, x, z) || cellSolid(w, Math.floor(x / map.cell), Math.floor(z / map.cell))) return false;
    for (const pr of map.props) if (PROPS[pr.kind].radius > 0 && Math.hypot(x - pr.x, z - pr.z) < PROPS[pr.kind].radius && y < floorAt(w, pr.x, pr.z) + 1.3) return false;
    if (!skipPhys && w.phys && physAt(w, x, y, z)) return false;
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
    if (e.state === 'dead' || ENEMIES[e.kind].peaceful) continue;                                         // (PT-037: the lamp never locks onto a peaceful Vael)
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
        if (e.state === 'dead' || hit.has(e) || ENEMIES[e.kind].peaceful) continue;
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
    if (!inWater(w, e.x, e.z) || ENEMIES[e.kind].flying) continue;
    for (const o of w.enemies) {
      if (conducted >= W.max) break; if (o.state === 'dead' || hit.has(o) || ENEMIES[o.kind].flying || !inWater(w, o.x, o.z) || Math.hypot(o.x - e.x, o.z - e.z) > W.r) continue;
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
  if ((p.ammo[def.ammo] || 0) < (def.cost ?? 1)) { p.cooldown = 0.4; emit(w, 'dry'); return; }
  // the lamp: 0 = the tap arc (one cell); a charge spends more cells for a bigger bolt, as many as are left
  let cf = 0, cost = def.cost ?? 1;
  if (def.kind === 'arc' && def.charge) {
    const C = def.charge; cf = charge < C.min ? 0 : Math.min(1, (charge - C.min) / (C.max - C.min)); cost = cf === 0 ? 1 : 1 + Math.round(cf * (C.cells - 1));
    const have = p.ammo[def.ammo]; if (cost > have) { cf = cf * (have - 1) / Math.max(1, cost - 1); cost = have; }
  }
  p.ammo[def.ammo] -= cost; p.cooldown = def.cooldown + cf * (def.charge?.recover ?? 0); p.kick = (def.kick ?? 0.06) * (1 + 6 * cf); w.stats.shots++;
  // accuracy: hip spread grows with movement; aiming tightens it. RNG draws happen in a fixed order so replays are deterministic.
  const moveFrac = Math.min(1, Math.hypot(p.vx, p.vz) / PLAYER.speed), sp = def.spread;
  const heat = p.heat || 0, cone = ((sp.hip * (1 + sp.moveFactor * moveFrac)) * (1 - p.ads) + sp.ads * p.ads) * (1 + heat * (def.heatCone || 0)) * (1 + SUPPRESS.cone * Math.min(1, (p.suppT || 0) / SUPPRESS.time));
  if (def.heatPerShot) p.heat = Math.min(1, heat + def.heatPerShot);                                     // holding the trigger blooms the pattern
  if (def.kind === 'arc') fireArc(w, def, cf);
  else if (def.kind === 'hitscan') (def.pierce != null ? fireBolt : fireHitscan)(w, def, cone);
  else if (def.designate) {                                                                                 // PT-027: the mortar throws the shell TO the point the crosshair rests on (the landing, not the aim, is what the unsteady hand scatters)
    const f = forwardVec(p), r = [Math.cos(p.yaw), 0, -Math.sin(p.yaw)], mRight = def.muzzle.right * (1 - p.ads), mDown = def.muzzle.down * (1 - 0.7 * p.ads), jitter = [(rand(w) * 2 - 1) * cone, (rand(w) * 2 - 1) * cone];
    const from = [p.x + f[0] * def.muzzle.fwd + r[0] * mRight, p.y + PLAYER.eye + f[1] * def.muzzle.fwd - mDown, p.z + f[2] * def.muzzle.fwd + r[2] * mRight], s = mortarShot(w, p, def, f, from, jitter);
    w.projectiles.push({ id: w.nextId++, weapon: p.weapon, x: from[0], y: from[1], z: from[2], vx: s.vx, vy: s.vy, vz: s.vz, g: s.g, life: s.T + 1.5 });
  }
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
  { const ch = chimeTarget(w); if (ch) return { chimeProp: ch, secret: false, target: 0, open: 0, key: null, remote: false, sealed: false }; }          // PT-038: a chime or the tree
  // mirrors (PT-033): the nearest one within reach that the player is facing
  if (map.mirrors.length) {
    let bm = null, bdm = 1e9;
    for (const m of map.mirrors) { const mx = (m.at[0] + 0.5) * map.cell, mz = (m.at[1] + 0.5) * map.cell, dx = mx - p.x, dz = mz - p.z, d = Math.hypot(dx, dz); if (d < PLAYER.useReach + 0.7 && Math.abs(floorAt(w, mx, mz) - p.y) < 1.5 && (dx * fx + dz * fz) / (d || 1) > 0.7 && d < bdm) { bdm = d; bm = m; } }
    if (bm) return { mirrorId: bm.id, rot: w.mirrors[bm.id], secret: false, target: 0, open: 0, key: null, remote: false, sealed: false };
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
function fireEnemyShot(w, e, def, diff, inBurst = false) {
  const R = def.ranged, p = w.player, ox = e.x + Math.sin(e.yaw) * 0.6, oy = e.y + (R.muzzleY ?? 1.5), oz = e.z + Math.cos(e.yaw) * 0.6;
  let dx = p.x - ox, dy = p.y + R.aimHeight - oy, dz = p.z - oz; const len = Math.hypot(dx, dy, dz) || 1;       // aimed at where the player IS: a strafing player is not hit
  let vx = dx / len * R.speed, vy = dy / len * R.speed, vz = dz / len * R.speed;
  if (R.burst) { const j = R.burst.spread, a = (rand(w) * 2 - 1) * j, b = (rand(w) * 2 - 1) * j, c = Math.cos(a), sn = Math.sin(a); [vx, vz] = [vx * c - vz * sn, vx * sn + vz * c]; vy += b * R.speed; }          // a burst is a little off the line, shot by shot (the seeded RNG: deterministic)
  w.enemyShots.push({ id: w.nextId++, x: ox, y: oy, z: oz, vx, vy, vz, life: 4, dmg: Math.round(R.damage * diff.enemyDamage), ...(R.suppress ? { sup: R.suppress.r } : {}) });
  emit(w, 'enemy_shot', { id: e.id, kind: e.kind, x: e.x, z: e.z, burst: inBurst });
  if (R.burst && !inBurst) { e.burstLeft = R.burst.count - 1; e.burstT = R.burst.gap; }
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
      if (!gone && w.phys && physAt(w, q.x, q.y, q.z)) { gone = true; emit(w, 'shot_impact', { x: q.x, y: q.y, z: q.z }); }
      if (!gone && q.reflected) { for (const e of w.enemies) if (e.state !== 'dead' && insideFuse(e, q.x, q.y, q.z)) { gone = true; if (!damageEnemy(w, e, q.dmg)) { hitEffects(w, e, { flinch: 0.5 }); emit(w, 'enemy_hit', { id: e.id, kind: e.kind, x: e.x, y: e.y, z: e.z }); } emit(w, 'shot_impact', { x: q.x, y: q.y, z: q.z }); break; } }
      else if (!gone && p.hp > 0 && Math.hypot(q.x - p.x, q.z - p.z) < 0.55 && q.y > p.y + 0.1 && q.y < p.y + 1.9) { gone = true; hurtPlayer(w, q.dmg); emit(w, 'shot_impact', { x: q.x, y: q.y, z: q.z }); }
      if (!gone && q.sup && p.hp > 0 && Math.hypot(q.x - p.x, q.z - p.z) < q.sup && q.y > p.y && q.y < p.y + 2.1) { if ((p.suppT || 0) < SUPPRESS.time * 0.5) emit(w, 'suppress', { x: q.x, z: q.z }); p.suppT = SUPPRESS.time; }          // whizzing past: the player is suppressed (their guns open up)
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
      if (!e.chargeHit && Math.hypot(p.x - e.x, p.z - e.z) < def.radius + PLAYER.radius + 0.45 && Math.abs(p.y - e.y) < 1.4 && p.hp > 0 && inFront(e, p, ENEMY_STRIKE.dashCos)) {
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
  if (e.echoT > 0) { e.echoT -= dt; if (e.echoT <= 0) { e.echoT = 0; w.pulses.push({ id: w.nextId++, x: e.x, z: e.z, y: e.y, r: 0.6, speed: P.speed, dmg: Math.round(P.damage * diff.enemyDamage), width: P.width, maxR: P.maxR, hit: false }); emit(w, 'pulse', { x: e.x, z: e.z, echo: true }); } }       // PT-030: the second ring of a double pulse (the Grand Cantor)
  if (def.sweep && sweepStep(w, e, def, diff, dt, sees, dist, { emit, hurtPlayer, damageEnemy, solid: (cx, cz) => cellSolid(w, cx, cz) })) return true;                  // PT-033: the Gate Warden's sweep
  if (P && (e.pulseT ?? -1) >= 0) {
    e.pulseT += dt; e.walk *= 0.85;
    if (e.pulseT >= P.windup) { w.pulses.push({ id: w.nextId++, x: e.x, z: e.z, y: e.y, r: 0.6, speed: P.speed, dmg: Math.round(P.damage * diff.enemyDamage), width: P.width, maxR: P.maxR, hit: false }); emit(w, 'pulse', { x: e.x, z: e.z }); e.pulseT = -1; e.pulseCd = enraged ? def.enragedPulseCooldown : P.cooldown; if (P.echo) e.echoT = P.echo.gap; }
    return true;
  }
  if (P && sees && e.pulseCd <= 0) { e.pulseT = 0; emit(w, 'enemy_windup', { id: e.id, kind: e.kind, x: e.x, z: e.z }); return true; }
  if (def.summon && e.summons?.length && sees && e.summonCd <= 0) {
    const S = def.summon;
    if (w.enemies.filter((o) => o.kind === S.kind && o.state !== 'dead').length < S.max) for (let i = 0; i < S.count; i++) {
      e.summonN = (e.summonN ?? -1) + 1; const [sx, sz] = e.summons[e.summonN % e.summons.length], g = spawnEnemy(w, S.kind, sx, sz, Math.atan2(p.x - sx, p.z - sz)); g.summoned = true; w.stats.total.enemies++; wakeEnemy(w, g, false, true); emit(w, 'enemy_spawn', { id: g.id, kind: g.kind, x: g.x, z: g.z });
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

// ---------------------------------------------------------------- the Cantor Acolyte (PT-029)
/** the awake, unstaggered Acolyte whose ward covers creature `e` (another creature than the one asked about, within ward.r), or null */
function wardOf(w, e) {
  for (const a of w.enemies) { if (a === e || a.kind !== 'acolyte' || a.state === 'dead' || a.state === 'idle' || a.hold === 'inert' || (a.stunT || 0) > 0) continue; if (Math.hypot(a.x - e.x, a.z - e.z) < ENEMIES.acolyte.ward.r) return ENEMIES.acolyte.ward; }
  return null;
}
/** Acolyte: a tone pulse after a windup (the Cantor's ring, smaller), and it keeps away from the player; returns true when the tick is used up */
function acolyteStep(w, e, def, diff, dt, sees, dist) {
  const P = def.pulse; e.pulseCd = Math.max(0, (e.pulseCd ?? 0) - dt);
  if ((e.pulseT ?? -1) >= 0) {
    e.pulseT += dt; e.walk *= 0.85;
    if (e.pulseT >= P.windup) { w.pulses.push({ id: w.nextId++, x: e.x, z: e.z, y: e.y, r: 0.6, speed: P.speed, dmg: Math.round(P.damage * diff.enemyDamage), width: P.width, maxR: P.maxR, hit: false }); emit(w, 'pulse', { x: e.x, z: e.z }); e.pulseT = -1; e.pulseCd = P.cooldown; }
    return true;
  }
  if (e.attackT >= 0) return false;
  if (sees && e.pulseCd <= 0 && dist > 3 && dist <= P.maxR) { e.pulseT = 0; emit(w, 'enemy_windup', { id: e.id, kind: e.kind, x: e.x, z: e.z }); return true; }
  if (sees && dist < def.keepAway) { retreatStep(w, e, def, dt); e.walk = Math.min(1, e.walk + dt * 3); e.phase += dt * def.gait; return true; }
  return false;
}

// ---------------------------------------------------------------- the Brood Vat (PT-030)
/**
 * Brood Vat: asleep until it sees the player inside `spawner.range` (or a noise / a map's `wake` wakes it). Awake, it counts `every` s (x the difficulty's reaction), swells its dome for `swell` s (announced: the `vat_swell` event; the view draws the dome bulging)
 * and then `count` creatures drop beside it (`vat_birth`), at most `max` of ITS brood alive; when its brood is full it looks again in two seconds. It never fights and is a node: killing it ends the brood (what is already born stays).
 */
function vatStep(w, e, def, diff, dt) {
  const S = def.spawner, p = w.player;
  if (e.vatT === undefined) { e.vatT = -1; e.summonCd = S.first; e.brood = []; e.vatN = 0; }
  if (e.state === 'idle') { if (p.hp > 0 && Math.hypot(p.x - e.x, p.z - e.z) < S.range && hasLOS(w, e.x, e.z, p.x, p.z)) wakeEnemy(w, e, false, true); else return; }
  e.summonCd = Math.max(0, e.summonCd - dt);
  if (e.vatT >= 0) {
    e.vatT += dt;
    if (e.vatT >= S.swell) {
      e.vatT = -1; e.summonCd = S.every * diff.reaction; e.brood = e.brood.filter((id) => w.enemies.some((o) => o.id === id && o.state !== 'dead')); const taken = [], kinds = e.spawns ?? S.kinds;
      for (let i = 0; i < S.count && e.brood.length < S.max; i++) {
        const kind = kinds[e.vatN++ % kinds.length], spot = broodSpot(w, e, kind, taken); if (!spot) break; taken.push(spot);
        const g = spawnEnemy(w, kind, spot[0], spot[1], Math.atan2(p.x - spot[0], p.z - spot[1])); g.summoned = true; e.brood.push(g.id); w.stats.total.enemies++; wakeEnemy(w, g, false, true); emit(w, 'enemy_spawn', { id: g.id, kind: g.kind, x: g.x, z: g.z, brood: true, vat: true });
      }
      emit(w, 'vat_birth', { id: e.id, x: e.x, z: e.z });
    }
    return;
  }
  if (e.summonCd <= 0) {
    e.brood = e.brood.filter((id) => w.enemies.some((o) => o.id === id && o.state !== 'dead'));
    if (e.brood.length < S.max) { e.vatT = 0; emit(w, 'vat_swell', { id: e.id, x: e.x, z: e.z }); } else e.summonCd = 2;
  }
}

// ---------------------------------------------------------------- the Weeping Mother (PT-028)
/** the pool a tear left under a point, or null: the effect char 'p' (FX.p) */
function patchAt(w, x, z) { for (const q of w.patches) if (Math.hypot(x - q.x, z - q.z) < q.r) return 'p'; return null; }
/** a free spot on a ring round the mother for a creature of `kind` (toward the player first, then round the ring), or null */
function broodSpot(w, e, kind, taken) {
  const r = ENEMIES[kind].radius, toward = Math.atan2(w.player.x - e.x, w.player.z - e.z);
  for (const off of [0.5, -0.5, 1.1, -1.1, 1.7, -1.7, 2.4, -2.4, 3.0]) for (const d of [2.3, 3.0]) {
    const a = toward + off, x = e.x + Math.sin(a) * d, z = e.z + Math.cos(a) * d;
    if (!blockedCircle(w, x, z, r + 0.05) && !tooHigh(w, e, x, z, r) && moveClear(w, e.x, e.z, x, z, r) && !taken.some(([tx, tz]) => Math.hypot(tx - x, tz - z) < r * 2.2)) return [x, z];
  }
  return null;
}
/**
 * Weeping Mother: she plants herself `stand` metres from the player and works from there. BROOD: a sac swells (`brood.swell` s, announced, she stops) and `count` creatures drop beside her, at most `max` of her brood alive.
 * TEARS: after a `windup` s tell a slow tear is lobbed to the place the player stands (an arc long enough to see: it lands a flight later) and leaves a pool (`updateTears`). Up close the ordinary swing in updateEnemy takes over.
 * Returns true when the tick is used up.
 */
function motherStep(w, e, def, diff, dt, sees, dist) {
  const B = def.brood, T = def.tears, p = w.player;
  if (e.broodT === undefined) { e.broodT = -1; e.shotCd = T.first; e.summonCd = B.first; e.brood = []; e.home = { x: e.x, z: e.z }; }
  e.shotCd = Math.max(0, (e.shotCd ?? 0) - dt); e.summonCd = Math.max(0, (e.summonCd ?? 0) - dt);
  if (e.attackT >= 0) return false;                                                                          // she is in the middle of a slam: updateEnemy finishes it
  if (e.broodT >= 0) {
    e.broodT += dt; e.walk *= 0.85;
    if (e.broodT >= B.swell) {
      e.broodT = -1; e.summonCd = B.every; e.brood = e.brood.filter((id) => w.enemies.some((o) => o.id === id && o.state !== 'dead')); const taken = [];
      for (let i = 0; i < B.count && e.brood.length < B.max; i++) {
        const spot = broodSpot(w, e, B.kind, taken); if (!spot) break; taken.push(spot);
        const g = spawnEnemy(w, B.kind, spot[0], spot[1], Math.atan2(p.x - spot[0], p.z - spot[1])); g.summoned = true; e.brood.push(g.id); w.stats.total.enemies++; wakeEnemy(w, g, false, true); emit(w, 'enemy_spawn', { id: g.id, kind: g.kind, x: g.x, z: g.z, brood: true });
      }
      emit(w, 'brood_birth', { id: e.id, x: e.x, z: e.z });
    }
    return true;
  }
  if ((e.pulseT ?? -1) >= 0) {                                                                                // the tear's windup (she draws it up, then throws)
    e.pulseT += dt; e.walk *= 0.85;
    if (e.pulseT >= T.windup) { e.pulseT = -1; e.shotCd = T.every; lobTear(w, e, def); }
    return true;
  }
  if (!sees) return false;
  if (e.summonCd <= 0) {
    e.brood = e.brood.filter((id) => w.enemies.some((o) => o.id === id && o.state !== 'dead'));
    if (e.brood.length < B.max) { e.broodT = 0; emit(w, 'brood_swell', { id: e.id, x: e.x, z: e.z }); return true; }
    e.summonCd = 2;                                                                                           // the brood is full: look again in a moment
  }
  if (e.shotCd <= 0 && dist >= T.minRange && dist <= T.maxRange) { e.pulseT = 0; emit(w, 'tear_windup', { id: e.id, x: e.x, z: e.z }); return true; }
  if (dist <= def.stand && dist > def.attack.range + 0.4) { e.walk = Math.max(0, e.walk - dt * 3); return true; }      // planted: she works from here
  if (def.leash && dist > def.attack.range + 0.4 && Math.hypot(e.x - e.home.x, e.z - e.home.z) >= def.leash) { e.walk = Math.max(0, e.walk - dt * 3); return true; }      // and a throne is a throne: she goes no further than `leash` m from where she sits
  return false;
}
/** throw a tear to where the player stands: a flight of `speedPerM` s a metre between `minFlight` and `maxFlight`, the arc exact for this integrator (vy from the gravity and the height difference) */
function lobTear(w, e, def) {
  const T = def.tears, p = w.player, ox = e.x + Math.sin(e.yaw) * 0.5, oz = e.z + Math.cos(e.yaw) * 0.5, oy = e.y + def.height * 0.8, tx = p.x, tz = p.z, ty = floorAt(w, tx, tz) + 0.05;
  const d = Math.hypot(tx - ox, tz - oz), flight = clamp(d * T.speedPerM, T.minFlight, T.maxFlight), n = Math.max(1, Math.round(flight / TICK)), g = T.gravity, tt = n * TICK;
  const vy = (ty - oy) / tt + 0.5 * g * (tt + TICK);                                                         // the per-tick integrator (vy -= g dt; y += vy dt) lands exactly on ty after n ticks
  (w.tears ?? (w.tears = [])).push({ id: w.nextId++, x: ox, y: oy, z: oz, vx: (tx - ox) / tt, vy, vz: (tz - oz) / tt, g, left: n, r: T.r, life: T.life });
  w.patches ??= []; emit(w, 'tear_lob', { id: e.id, x: ox, y: oy, z: oz });
}
/** the tears in flight, and the pools they leave */
function updateTears(w, dt) {
  for (let i = w.tears.length - 1; i >= 0; i--) {
    const q = w.tears[i]; q.vy -= q.g * dt; q.x += q.vx * dt; q.y += q.vy * dt; q.z += q.vz * dt; q.left--;
    const solid = cellSolid(w, Math.floor(q.x / w.map.cell), Math.floor(q.z / w.map.cell));
    if (q.left <= 0 || solid || q.y <= floorAt(w, q.x, q.z) + 0.02) {
      w.tears.splice(i, 1); if (solid) continue;
      w.patches.push({ id: w.nextId++, x: q.x, z: q.z, r: q.r, life: q.life, t0: w.time }); emit(w, 'tear_land', { x: q.x, y: floorAt(w, q.x, q.z), z: q.z, r: q.r });
    }
  }
  for (let i = (w.patches?.length ?? 0) - 1; i >= 0; i--) { const q = w.patches[i]; q.life -= dt; if (q.life <= 0) { emit(w, 'pool_dry', { x: q.x, z: q.z }); w.patches.splice(i, 1); } }
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

// ---------------------------------------------------------------- falling loads (PT-032, Episode 4 Batch A: the Ascent Tether)
/** a load lands at the start of each of its cycles (loads.js): a warning event as it starts to fall, and at the impact whoever is on the ground inside its rect is struck (the player hurt, a walker crushed). Lazy state: only a map with loads has `w.loadSeen`. */
function updateLoads(w) {
  const st = w.loadSeen ?? (w.loadSeen = w.map.loads.map((L) => ({ idx: loadIndex(L, w.time), warned: false })));
  const p = w.player, S = w.map.cell, diff = DIFFICULTY[w.difficulty];
  w.map.loads.forEach((L, i) => {
    const o = st[i], idx = loadIndex(L, w.time), x = (L.rect[0] + L.rect[2] + 1) / 2 * S, z = (L.rect[1] + L.rect[3] + 1) / 2 * S;
    if (idx > o.idx) {
      o.idx = idx; o.warned = false; emit(w, 'load_land', { i, x, y: floorAt(w, x, z), z });
      if (p.hp > 0 && !p.air && inLoad(L, p.x, p.z, S, PLAYER.radius)) { emit(w, 'load_hit', { x: p.x, z: p.z }); hurtPlayer(w, Math.round(LOADS.damage * diff.enemyDamage)); }
      for (const e of w.enemies) { const d = ENEMIES[e.kind]; if (e.state !== 'dead' && !d.flying && !d.node && !d.boss && inLoad(L, e.x, e.z, S, 0)) damageEnemy(w, e, LOADS.enemyDamage); }
    } else if (!o.warned && loadState(L, w.time).warn > 0) { o.warned = true; emit(w, 'load_warn', { i, x, z }); }
  });
}

// ---------------------------------------------------------------- the air state and the launch vents (PT-032, Episode 4 Batch A)
/** throw the player from a plate to its landing cell: an arc exact for the per-tick integrator (vy -= g dt; y += vy dt lands on y1 after n ticks, as lobTear does) */
function launchFrom(w, p, v) {
  const S = w.map.cell, x1 = (v.to[0] + 0.5) * S, z1 = (v.to[1] + 0.5) * S, n = Math.max(1, Math.round(v.time / TICK)), tt = n * TICK, g = v.g ?? LOWG.g;
  const y1 = groundAt(w, x1, z1, PLAYER.radius), vy = (y1 - p.y) / tt + 0.5 * g * (tt + TICK);
  p.air = { vy, g, bx: (x1 - p.x) / tt, bz: (z1 - p.z) / tt, sx: 0, sz: 0, t: 0, low: Math.min(p.y, y1) - 0.4 }; p.ventCd = LOWG.ventCooldown; p.vx = p.air.bx; p.vz = p.air.bz;
  emit(w, 'vent_launch', { x: p.x, z: p.z });
}
/** on the ground in a map with vents or open sky: a plate under the feet fires, and the last solid place stood on is remembered (the void sets the player back there) */
function groundAir(w, p, dt) {
  p.ventCd = Math.max(0, (p.ventCd ?? 0) - dt);
  const m = w.map, cx = Math.floor(p.x / m.cell), cz = Math.floor(p.z / m.cell);
  if (m.ventCells.has(cx + ',' + cz)) { if (p.ventCd <= 0) { const v = m.vents.find((q) => q.at[0] === cx && q.at[1] === cz); if (v) launchFrom(w, p, v); } return; }
  if (m.hasVoid) p.lastSafe = { x: p.x, z: p.z };
}
/** open sky took the player: hurt, back on the last solid ground, not killed */
function voidFall(w, p) {
  const s = p.lastSafe ?? { x: w.map.spawn.x, z: w.map.spawn.z };
  delete p.air; p.x = s.x; p.z = s.z; p.vx = 0; p.vz = 0; p.y = groundAt(w, p.x, p.z, PLAYER.radius); p.ventCd = LOWG.setBackCooldown;
  emit(w, 'void_fall', { x: p.x, z: p.z }); hurtPlayer(w, LOWG.voidDamage);
}
/** one tick of a body in low gravity: the launch velocity plus steering, the arc, a ceiling, the landing (or the void) */
function airMove(w, p, sx, sf, fx, fz, rx, rz, dt) {
  const A = p.air, m = w.map, steer = PLAYER.speed * LOWG.steer, k = Math.min(1, dt * PLAYER.accel * LOWG.steer);
  A.t += dt; p.ventCd = Math.max(0, (p.ventCd ?? 0) - dt);
  A.sx += ((fx * sf + rx * sx) * steer - A.sx) * k; A.sz += ((fz * sf + rz * sx) * steer - A.sz) * k;
  p.vx = A.bx + A.sx; p.vz = A.bz + A.sz;
  const y0 = p.y; tryMove(w, p, p.vx * dt, p.vz * dt, PLAYER.radius);                                      // (walls and ledges higher than the body stop it; tryMove puts p.y on the ground: the height below is the body's own)
  const over = m.hasVoid && m.kind(Math.floor(p.x / m.cell), Math.floor(p.z / m.cell)) === 'void';
  A.vy -= (over && A.vy < 0 && y0 < A.low ? LOWG.voidFallG : A.g) * dt; let y = y0 + A.vy * dt;
  const roof = ceilingAt(w, p.x, p.z) - PLAYER.eye - 0.3; if (A.vy > 0 && y > roof) { y = Math.max(y0, roof); A.vy = 0; }
  const ground = groundAt(w, p.x, p.z, PLAYER.radius);
  if (over && y <= ground + 0.05) { p.y = y; return voidFall(w, p); }
  if (!over && A.vy <= 0 && y <= ground + 1e-9) {
    const speed = Math.abs(A.vy); p.y = ground; delete p.air; p.vx *= 0.35; p.vz *= 0.35; emit(w, 'air_land', { x: p.x, z: p.z, speed }); return;
  }
  p.y = y;
  if (A.t > LOWG.maxAir) { p.y = ground; delete p.air; }                                                    // a body that has not come down in 14 s is put down (a ceiling, a wedge)
}

/** a range target's way back to its post: walk there, then (a 'fixed' one, or one that cannot see you) turn back to its heading. Returns true while it is still moving or turning. */
function homeStep(w, e, def, dt, turnHome) {
  const dx = e.post.x - e.x, dz = e.post.z - e.z, d = Math.hypot(dx, dz), turn = def.turnRate * dt, face = (to) => { const a = Math.atan2(Math.sin(to - e.yaw), Math.cos(to - e.yaw)); e.yaw += clamp(a, -turn, turn); return Math.abs(a) > turn; };
  if (d > 0.15) { const a = Math.atan2(dx, dz); face(a); const s = Math.min(d, def.speed * dt * moveMult(e)); tryMove(w, e, Math.sin(a) * s, Math.cos(a) * s, def.radius); e.walk = Math.min(1, e.walk + dt * 3); e.phase += dt * (def.gait ?? 5.2); return true; }
  e.walk = Math.max(0, e.walk - dt * 3);
  return (turnHome || e.hold === 'fixed') && face(e.post.yaw);
}
function updateEnemy(w, e, diff, dt) {
  const p = w.player, def = ENEMIES[e.kind]; e.flash = Math.max(0, e.flash - dt * 4); if (e.slowT > 0) { e.slowT = Math.max(0, e.slowT - dt); e.slowAge = (e.slowAge || 0) + dt; if (e.slowAge >= SLOW_MAX || e.slowT === 0) { e.slowT = 0; e.slowAge = 0; e.slowImm = SLOW_IMMUNE; } } else if (e.slowImm > 0) e.slowImm = Math.max(0, e.slowImm - dt); if (e.intCd > 0) e.intCd = Math.max(0, e.intCd - dt);
  if (e.hold) holdUpkeep(w, e, dt, emit);                                          // a range target: heal when left alone, stand up again after a kill (range.js)
  e.y = groundAt(w, e.x, e.z, def.radius);                                         // every state rides a moving floor: a corpse, a staggered Warden or a ring node on the funicular car keep standing on it
  if (e.state === 'dead') { e.dead = Math.min(1, e.dead + dt / 0.9); e.walk *= 0.9; return; }
  if ((e.stunT || 0) > 0) { e.stunT -= dt; e.walk *= 0.9; e.attackT = -1; e.chargeT = -1; e.pulseT = -1; e.lungeT = -1; e.lungeHit = false; e.burstLeft = 0; if (e.broodT !== undefined) e.broodT = -1; if (e.echoT > 0) e.echoT = 0; return; }          // staggered: it does nothing
  if (def.spawner && e.hold !== 'inert') vatStep(w, e, def, diff, dt);                                   // PT-030: a Brood Vat swells and births while it is awake; it never fights
  if (def.node) return;
  if (w.map.hasCurrent && e.state !== 'idle' && !def.flying && !e.hold && def.speed > 0) flowPush(w, e, def.radius, dt);          // PT-037: a walker in a current is carried by it (a sleeper is not: it lies where the map put it)
  if (e.burstLeft > 0) { e.burstT -= dt; if (e.burstT <= 0) { fireEnemyShot(w, e, def, diff, true); e.burstLeft--; e.burstT = def.ranged.burst.gap; } }          // the rest of a Chorister's burst (PT-026)
  if (e.hold === 'inert') { if (e.post && Math.hypot(e.x - e.post.x, e.z - e.post.z) > 0.15 && !w.shoves?.some((q) => q.id === e.id)) homeStep(w, e, def, dt, false); else e.walk *= 0.9; return; }      // a target that only takes it (and walks back to its post when a blast, a punt or the beam has moved it)
  if (def.peaceful) { folkStep(w, e, def, dt); return; }                                 // PT-037: it never fights: it wanders, watches, and runs (folk.js)
  const dx = p.x - e.x, dz = p.z - e.z, dist = Math.hypot(dx, dz), dyv = Math.abs(p.y - e.y);          // dyv: an enemy cannot hit someone standing on a ledge two metres above it
  const sees = dist < (e.sightR ?? sightIn(w, def)) && p.hp > 0 && hasLOS(w, e.x, e.z, p.x, p.z);
  if (sees) { e.lastX = p.x; e.lastZ = p.z; e.lost = 0; }
  if (e.hold && !sees && e.attackT < 0 && (e.lungeT ?? -1) < 0 && (e.chargeT ?? -1) < 0) { homeStep(w, e, def, dt, true); return; }      // a range target that cannot see you goes back to its post and its heading
  if (e.state === 'idle') { if (sees) wakeEnemy(w, e, true); else return; }
  else if (!sees) e.lost = (e.lost || 0) + dt;
  // hunt: head for the last place the player was seen; give up after a while (or on arrival) and go back to sleep
  const tx = sees ? p.x : (e.lastX ?? p.x), tz = sees ? p.z : (e.lastZ ?? p.z), tdist = Math.hypot(tx - e.x, tz - e.z);
  if (!sees && e.attackT < 0 && (e.lungeT ?? -1) < 0 && (tdist < 1.2 || e.lost > 8)) { e.state = 'idle'; e.walk = 0; return; }
  // steering: straight at the target when it is in view and the ground allows it; otherwise follow the distance field around walls, doors and ledges
  let ax = tx, az = tz;
  if (!e.hold && (!sees || !stepClear(w, e.x, e.z, tx, tz) || !moveClear(w, e.x, e.z, tx, tz, def.radius))) { const wp = navWaypoint(w, e.x, e.z, tx, tz); if (wp && wp.dist > 0) { ax = wp.x; az = wp.z; } }
  let dy = Math.atan2(ax - e.x, az - e.z) - e.yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy));
  const dashing = (def.lunge && (e.lungeT ?? -1) >= def.lunge.windup) || (def.charge && (e.chargeT ?? -1) >= def.charge.windup);                 // a dash keeps its heading: that is what makes it dodgeable
  if (e.attackT < 0 && !dashing && e.hold !== 'fixed') e.yaw += clamp(dy, -def.turnRate * dt, def.turnRate * dt);
  e.cd = Math.max(0, e.cd - dt);
  if (e.hold && e.attackT < 0 && (e.lungeT ?? -1) < 0 && (e.chargeT ?? -1) < 0 && homeStep(w, e, def, dt, false)) return;      // pushed off its post (by its own lunge or charge): back first
  if (def.charge && chargeStep(w, e, def, diff, dt, sees, dist, dyv)) return;
  if (def.support && !e.hold && supportStep(w, e, def, dt, sees, dist)) return;
  if (def.boss && !e.hold && bossStep(w, e, def, diff, dt, sees, dist)) return;
  if (def.brood && !e.hold && motherStep(w, e, def, diff, dt, sees, dist)) return;
  if (def.ward && !e.hold && acolyteStep(w, e, def, diff, dt, sees, dist)) return;
  if (def.lunge) {
    const L = def.lunge; e.lungeCd = Math.max(0, (e.lungeCd || 0) - dt);
    if ((e.lungeT ?? -1) >= 0) {
      e.lungeT += dt;
      if (e.lungeT < L.windup) e.walk *= 0.8;                                        // crouch: the readable tell
      else if (e.lungeT < L.windup + L.duration) {
        const hit = () => { if (!e.lungeHit) { e.lungeHit = true; strikePlayer(w, e, Math.round(def.attack.damage * diff.enemyDamage)); emit(w, 'enemy_strike', { id: e.id, kind: e.kind, x: e.x, z: e.z }); } };
        tryMove(w, e, Math.sin(e.yaw) * L.speed * dt, Math.cos(e.yaw) * L.speed * dt, def.radius); e.walk = 1; e.phase += dt * def.gait;
        if (dist < def.attack.reach * 0.7 && dyv < 1.6 && inFront(e, p, ENEMY_STRIKE.dashCos)) hit();
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
      else { if (dist < def.attack.reach && dyv < 1.6 && inFront(e, p, ENEMY_STRIKE.cos)) { const res = strikePlayer(w, e, Math.round(def.attack.damage * diff.enemyDamage), !!def.boss || def.attack.damage >= 28 || !!def.attack.heavy); if (def.attack.knock && (res === 'hit' || res === 'broken')) tryMove(w, p, Math.sin(e.yaw) * def.attack.knock, Math.cos(e.yaw) * def.attack.knock, PLAYER.radius); } emit(w, 'enemy_strike', { id: e.id, kind: e.kind, x: e.x, z: e.z }); }
    }
    if (e.attackT >= def.attack.duration) { e.attackT = -1; e.cd = def.attack.cooldown * diff.reaction; e.struck = false; }
  } else if (R && sees && e.cd <= 0 && dist <= R.maxRange && dist >= R.minRange) {
    e.attackT = 0; e.struck = false; emit(w, 'enemy_windup', { id: e.id, kind: e.kind, x: e.x, z: e.z });
  } else if (!e.hold && (def.flying || def.retreat) && R && sees && dist < (R.keep ?? R.minRange) && retreatStep(w, e, def, dt)) {
    e.walk = Math.min(1, e.walk + dt * 3); e.phase += dt * def.gait;
  } else if (!e.hold && (sees ? !(dist <= engage && dyv < 1.6) : tdist > 1.2)) {
    chaseStep(w, e, def, dt);
    e.walk = Math.min(1, e.walk + dt * 3); e.phase += dt * (def.gait ?? 5.2);
  } else {
    if (e.hold) e.walk = Math.max(0, e.walk - dt * 3); else if (def.strafe && sees && !strafeStep(w, e, def, dt)) e.walk = Math.max(0, e.walk - dt * 3); else if (!def.strafe || !sees) e.walk = Math.max(0, e.walk - dt * 3);
    if (sees && dist <= def.attack.range + 0.1 && dyv < 1.6 && e.cd <= 0 && (e.hold !== 'turn' || inFront(e, p, ENEMY_STRIKE.cos))) { e.attackT = 0; e.struck = false; emit(w, 'enemy_windup', { id: e.id, kind: e.kind, x: e.x, z: e.z }); }      // (a range 'turn' target swings once it faces you, as a creature that walked up to you would; a 'fixed' one swings regardless)
  }
}

/** PT-033 (owner 2026-10-10: "the lock won't open"): a Use on an airlock door that is still cycling is not thrown away. `want` is set by that press: the OTHER door is told to shut now (unless somebody stands in it), and this one opens by itself the moment the air has settled (airlock.js `lockBusy`). Walking more than LOCK.giveUp metres away forgets it. Lazy: only a lock door that was pressed while busy ever has it, and the route bot never presses a busy door. */
function lockQueued(w, d) {
  const pr = w.doors.find((q) => q.cx === d.interlock[0] && q.cz === d.interlock[1]), p = w.player, cell = w.map.cell, cxw = (d.cx + 0.5) * cell, czw = (d.cz + 0.5) * cell;
  if (!pr || d.target === 1 || Math.hypot(p.x - cxw, p.z - czw) > LOCK.giveUp) { d.want = false; return; }
  const px = (pr.cx + 0.5) * cell, pz = (pr.cz + 0.5) * cell;
  if (pr.target === 1 && pr.open >= 1 && ![p, ...w.enemies.filter((e) => e.state !== 'dead')].some((o) => Math.hypot(o.x - px, o.z - pz) < DOOR.autoCloseClearance)) { pr.target = 0; emit(w, 'door_close', { cx: pr.cx, cz: pr.cz, x: px, z: pz }); }
  if (!lockBusy(w, d)) { d.want = false; d.target = 1; d.hold = 0; emit(w, 'door_open', { cx: d.cx, cz: d.cz, secret: d.secret, x: cxw, z: czw }); }
}

// ---------------------------------------------------------------- step
export function step(w, cmd) {
  if (w.status !== 'playing') return;
  const p = w.player, diff = DIFFICULTY[w.difficulty], dt = TICK, map = w.map;
  w.tick++; w.time = w.tick * dt; if (p.suppT > 0) p.suppT = Math.max(0, p.suppT - dt); if (p.graftT > 0) p.graftT = Math.max(0, p.graftT - dt);
  if (p.lamp) updateLamp(w, cmd, dt); if (map.dark) w.lit = playerLit(w);                         // PT-038 (E5)
  updateSectors(w, dt); if (!p.air) p.y = groundAt(w, p.x, p.z, PLAYER.radius);          // moving floors carry whoever stands on them (a body in the air keeps its own height)
  if (w.sectors.length) for (const it of w.pickups) it.y = floorAt(w, it.x, it.z);       // ...and whatever lies on them (audit A22)

  // look + move
  p.yaw += cmd.yaw || 0; p.pitch = clamp(p.pitch + (cmd.pitch || 0), -1.3, 1.3);
  let sx = clamp(cmd.move?.[0] || 0, -1, 1), sf = clamp(cmd.move?.[1] || 0, -1, 1);
  const len = Math.hypot(sx, sf); if (len > 1) { sx /= len; sf /= len; }
  const fx = -Math.sin(p.yaw), fz = -Math.cos(p.yaw), rx = Math.cos(p.yaw), rz = -Math.sin(p.yaw), a = Math.min(1, dt * PLAYER.accel);
  // stance: aim wins over sprint; sprint needs forward input; a dead-on-arrival sprint (no forward) is not a sprint
  const melee = isMelee(p.weapon), tool = WEAPONS[p.weapon]?.kind === 'tool', aimHeld = !!cmd.aim && !melee && !tool && p.swingT < 0, wasSprinting = p.sprinting;       // with a melee weapon in hand the Aim key is the GUARD (below), not the sights; a swing drops the sights
  p.brokenT = Math.max(0, p.brokenT - dt); p.riposteT = Math.max(0, p.riposteT - dt); p.parryCd = Math.max(0, p.parryCd - dt);
  const guardHeld = melee && !WEAPONS[p.weapon].noGuard && !!cmd.aim && p.swingT < 0 && p.brokenT <= 0 && p.switchT <= 0 && p.hp > 0;          // not while the weapon is still coming up
  if (guardHeld && !p.guarding) { p.parryW = p.parryCd <= 0 ? GUARD.window : 0; if (p.parryW > 0) p.parryCd = GUARD.window + GUARD.whiffCd; emit(w, 'guard_up', {}); }
  else if (guardHeld) p.parryW = Math.max(0, p.parryW - dt); else p.parryW = 0;
  p.guarding = guardHeld; p.guard = clamp(p.guard + (guardHeld ? 1 : -1) * dt / GUARD.raise, 0, 1);
  p.sprinting = !!cmd.sprint && sf >= PLAYER.sprintMinForward && !aimHeld && !guardHeld && !(tool && cmd.aim) && p.swingT < 0;       // (the tuning-fork's beam is Aim too: holding it ends a sprint, as the sights do, or a held Shift would silence the beam)
  if (wasSprinting && !p.sprinting) p.recover = PLAYER.sprintRecover;
  p.recover = Math.max(0, p.recover - dt);
  p.ads = clamp(p.ads + (aimHeld ? 1 : -1) * dt / PLAYER.adsTime, 0, 1);
  p.sprint = clamp(p.sprint + (p.sprinting ? 1 : -1) * dt / PLAYER.sprintBlendTime, 0, 1);
  const fxc = fxAt(w, p.x, p.z) ?? (w.patches?.length ? patchAt(w, p.x, p.z) : null), speed = PLAYER.speed * fxSpeed(fxc) * (1 - (1 - PLAYER.adsMoveMult) * p.ads) * (1 - 0.3 * p.guard) * (p.graftT > 0 ? 1 - GRAFT.slow : 1) * (p.saw && WEAPONS[p.weapon].saw ? 1 - WEAPONS[p.weapon].saw.slow * p.saw.spin : 1), fwdSpeed = speed * (p.sprinting ? PLAYER.sprintMult : 1);
  if (p.air) airMove(w, p, sx, sf, fx, fz, rx, rz, dt);                                                  // PT-032: a vent has thrown the player: low gravity, a little steering
  else {
    const ag = fxc && FX[fxc].grip != null ? a * FX[fxc].grip : a;                                              // PT-033: a drift floor has almost no grip (FX.d): the same pull, a tenth of the rate
    p.vx += ((fx * sf * fwdSpeed + rx * sx * speed) - p.vx) * ag; p.vz += ((fz * sf * fwdSpeed + rz * sx * speed) - p.vz) * ag;
    tryMove(w, p, p.vx * dt, p.vz * dt, PLAYER.radius);
    if (w.map.hasCurrent) flowPush(w, p, PLAYER.radius, dt);                                                         // PT-037: the current carries you
    if (w.map.vents.length || w.map.hasVoid) groundAir(w, p, dt);
  }
  if (fxc !== p.fx) { if (fxc) emit(w, 'wade', { kind: fxc }); p.fx = fxc; }
  if (fxc && FX[fxc].dps) { p.hazardT = (p.hazardT || 0) + dt; if (p.hazardT >= 0.5) { p.hazardT -= 0.5; hurtPlayer(w, Math.round(FX[fxc].dps * 0.5 * diff.enemyDamage)); } } else p.hazardT = 0;
  if (map.vacuum.length) vacuumStep(w, dt, diff);                                                                 // PT-033: vacuum (airlock.js)
  if (!p.air) p.bob += Math.hypot(p.vx, p.vz) * dt * 1.9;
  if (p.heat > 0) p.heat = Math.max(0, p.heat - dt * (WEAPONS[p.weapon].heatDecay || 1.4));
  p.cooldown = Math.max(0, p.cooldown - dt); p.hurt = Math.max(0, p.hurt - dt * 1.2); p.kick = Math.max(0, p.kick - dt * 0.4);
  // weapon selection: slot key, or cycle through owned weapons (mouse wheel). Switching costs the new weapon's switchTime.
  p.switchT = Math.max(0, (p.switchT || 0) - dt);
  // key 6 is the melee slot (pressing it again cycles the melee weapons you carry); Q goes back to the last weapon; the wheel / next / previous step through the guns and the melee slot
  const meleeOwned = MELEE_ORDER.filter((id) => owns(p, id)), curMelee = isMelee(p.weapon) ? p.weapon : (owns(p, p.meleeWeapon) ? p.meleeWeapon : 'fists');
  let want = null;
  const slotKey = cmd.weapon != null ? SLOT_KEYS[cmd.weapon] : null;                                        // PT-022: keys 1-5 the first guns, 6 the melee slot, 7-9 the later guns
  if (slotKey === 'melee') want = isMelee(p.weapon) ? meleeOwned[(meleeOwned.indexOf(p.weapon) + 1) % meleeOwned.length] : curMelee;
  else if (slotKey) want = slotKey;
  else if (cmd.weaponLast) want = p.lastWeapon;
  else if (cmd.weaponStep) { const ring = SLOT_KEYS.filter((id) => id === 'melee' || p.weapons.includes(id)).map((id) => (id === 'melee' ? curMelee : id)), i = ring.indexOf(isMelee(p.weapon) ? curMelee : p.weapon); want = ring[(i + cmd.weaponStep + ring.length) % ring.length]; }
  if (want && want !== p.weapon && owns(p, want) && (p.swingT < 0 || p.swingHit)) {
    p.lastWeapon = p.weapon; p.weapon = want; if (isMelee(want)) p.meleeWeapon = want; p.switchT = WEAPONS[want].switchTime; p.charge = 0; p.swingT = -1; p.queuedT = 0; emit(w, 'weapon_switch', { weapon: want });
  }

  // use: first door/secret panel along the view ray
  if (cmd.use) {
    const hit = useTarget(w);
    if (hit?.chimeProp) { if (hit.chimeProp.kind === 'chime') strikeChime(w, hit.chimeProp, emit); else playTree(w, hit.chimeProp, emit); }
    else if (hit?.mirrorId) turnMirror(w, hit.mirrorId);
    else if (hit?.switchId) activateSwitch(w, map.switches.find((s) => s.id === hit.switchId));
    else if (hit) {
      if (hit.soundlock && w.time - (w.noise?.t ?? -99) < hit.soundlock.quiet && Math.hypot(w.noise.x - (hit.cx + 0.5) * map.cell, w.noise.z - (hit.cz + 0.5) * map.cell) < hit.soundlock.radius) emit(w, 'door_listen', { cx: hit.cx, cz: hit.cz, x: (hit.cx + 0.5) * map.cell, z: (hit.cz + 0.5) * map.cell });          // PT-029: the lock is listening: it will not open to Use until it has heard nothing for `quiet` s
      else if (hit.breath) emit(w, 'door_breath', { cx: hit.cx, cz: hit.cz, x: (hit.cx + 0.5) * map.cell, z: (hit.cz + 0.5) * map.cell });          // PT-027: it opens when the ship breathes in, whatever you do
      else if (hit.sealed || hit.remote) emit(w, 'door_remote', { cx: hit.cx, cz: hit.cz, x: (hit.cx + 0.5) * map.cell, z: (hit.cz + 0.5) * map.cell });          // opened elsewhere (a switch, or an event)
      else if (hit.key && !p.keys.includes(hit.key)) emit(w, 'door_locked', { key: hit.key, cx: hit.cx, cz: hit.cz, x: (hit.cx + 0.5) * map.cell, z: (hit.cz + 0.5) * map.cell });
      else if (hit.interlock && hit.target === 0 && lockBusy(w, hit)) { hit.want = true; emit(w, 'door_cycling', { cx: hit.cx, cz: hit.cz, x: (hit.cx + 0.5) * map.cell, z: (hit.cz + 0.5) * map.cell }); }          // PT-033: the other door of the airlock is open or the air is still moving; the press is KEPT (owner 2026-10-10, "the lock won't open"): the other door shuts now and this one opens by itself when the air has settled (the door loop below)
      else if (hit.target === 0) { hit.target = 1; hit.hold = 0; emit(w, 'door_open', { cx: hit.cx, cz: hit.cz, secret: hit.secret, x: (hit.cx + 0.5) * map.cell, z: (hit.cz + 0.5) * map.cell }); }
    }
  }

  // swings in progress, the quick bash (V), the fire key. A charging weapon (the lamp, the fists) charges while the key is held and fires on release.
  updateSwing(w, dt);
  if (cmd.melee && p.swingT < 0 && p.switchT <= 0 && p.hp > 0) { if (isMelee(p.weapon)) { if (p.cooldown <= 0) startSwing(w, p.weapon === 'fists' ? 'jab' : p.weapon); } else startSwing(w, 'bash'); }
  const canAct = p.cooldown <= 0 && p.switchT <= 0 && !p.sprinting && p.recover <= 0 && p.swingT < 0;               // no firing mid-switch, mid-swing or from the sprint pose
  const wdef = WEAPONS[p.weapon];
  if (p.saw && !wdef.saw) { p.saw.spin = 0; p.saw.eng = false; }                                              // a saw put away stops running
  if (p.grav && !wdef.grav) gravDrop(w);                                                                    // a fork put away lets go of what it holds
  if (wdef.saw) sawStep(w, cmd, wdef, dt);                                                                  // PT-022: the chainsaw (hold to rev and cut, saw.js)
  else if (wdef.grav) gravInput(w, cmd, wdef, canAct, dt);                                                   // PT-022: the tuning-fork (gravity.js)
  else if (wdef.charge) chargeInput(w, cmd, wdef, canAct);
  else if (cmd.fire && canAct) fireWeapon(w);

  updateShoves(w, dt); updatePhys(w, dt);                                                                   // PT-022: creatures a punt is carrying, and the movable props (both do nothing unless there are some)

  // doors
  for (const d of w.doors) {
    if (d.breath) { breathGate(w, d, dt); continue; }
    if (d.want) lockQueued(w, d);                                                                           // PT-033: a Use that came while the airlock was cycling is kept
    if (d.target === 1 && d.open < 1) { d.open = Math.min(1, d.open + dt * DOOR.speed); }
    else if (d.target === 1 && d.open >= 1 && !d.secret) {
      const cxw = (d.cx + 0.5) * map.cell, czw = (d.cz + 0.5) * map.cell;
      const occupied = [p, ...w.enemies.filter((e) => e.state !== 'dead')].some((o) => Math.hypot(o.x - cxw, o.z - czw) < DOOR.autoCloseClearance);
      d.hold = occupied ? 0 : d.hold + dt;
      if (d.hold >= (d.interlock ? LOCK.hold : DOOR.holdOpen)) { d.target = 0; emit(w, 'door_close', { cx: d.cx, cz: d.cz, x: cxw, z: czw }); }
    } else if (d.target === 0 && d.open > 0) { d.open = Math.max(0, d.open - dt * DOOR.speed); if (d.open === 0 && d.interlock) d.closedAt = w.time; }
  }

  if (map.pulses?.length) updateSpores(w);
  if (map.loads?.length) updateLoads(w);

  // enemies + their shots + the fire on the ground
  updateBurns(w, dt);
  for (const e of w.enemies) updateEnemy(w, e, diff, dt);
  updateEnemyShots(w, diff, dt); updatePulses(w, dt); if (w.tears) updateTears(w, dt); if (w.resonators) updateResonators(w);

  // projectiles (substepped so fast flares cannot tunnel through walls)
  for (let i = w.projectiles.length - 1; i >= 0; i--) {
    const q = w.projectiles[i], def = WEAPONS[q.weapon ?? 'flare']; q.life -= dt; q.vy -= (q.g ?? def.gravity) * dt;      // projectiles keep their own weapon stats after you switch away
    const speed = Math.hypot(q.vx, q.vy, q.vz), n = Math.ceil(speed * dt / 0.25); let hit = q.life <= 0, struck = null;
    for (let k = 0; k < n && !hit; k++) {
      q.x += q.vx * dt / n; q.y += q.vy * dt / n; q.z += q.vz * dt / n;
      const cx = Math.floor(q.x / map.cell), cz = Math.floor(q.z / map.cell);
      if (q.y < floorAt(w, q.x, q.z) + 0.05 || q.y > ceilingAt(w, q.x, q.z) || cellSolid(w, cx, cz)) hit = true;
      for (const pr of map.props) if (PROPS[pr.kind].radius > 0 && Math.hypot(q.x - pr.x, q.z - pr.z) < PROPS[pr.kind].radius && q.y < floorAt(w, pr.x, pr.z) + 1.3) hit = true;
      if (w.phys && physAt(w, q.x, q.y, q.z)) hit = true;
      for (const e of w.enemies) if (e.state !== 'dead' && insideFuse(e, q.x, q.y, q.z)) { hit = true; struck ??= e; }
    }
    if (hit) { w.projectiles.splice(i, 1); explode(w, q.x, q.y, q.z, true, def, struck); }
  }

  // last-resort feed: a player with no ammunition of ANY kind (for a gun they carry: bolts picked up before the rifle do not count) is never left with nothing: the flare cannon's feed drops one flare after a few seconds (and again each time it is spent).
  // PT-013 gave everybody fists, and the first version of this batch removed the feed ("fists mean you are never empty"). It is back, as a safety net: fists cannot hurt a plated Warden from the front (a bash does a third of its damage through the plate), so a player who ran dry in front of one could be soft-locked, and the robustness gate (a strafing fighter with 25% less ammunition pickups must finish C1E1M06) failed without it.
  if (p.hp > 0 && !Object.keys(AMMO_MAX).some((k) => (p.ammo[k] || 0) > 0 && Object.entries(WEAPONS).some(([id, wd]) => wd.ammo === k && p.weapons.includes(id)))) { p.feedT = (p.feedT ?? 0) + dt; if (p.feedT >= PLAYER.dryFeed.every) { p.feedT = 0; p.ammo.flare = (p.ammo.flare || 0) + PLAYER.dryFeed.amount; emit(w, 'dry_feed', { x: p.x, z: p.z }); } } else if (p.feedT) p.feedT = 0;
  // ammunition drops (PT-025): the guns fired this tick are noted and a box that has dropped slides toward the player; both do nothing on a map without `drops`
  if (w.map.drops) { trackFired(w); updateDrops(w, dt); }
  // pickups
  for (let i = w.pickups.length - 1; i >= 0; i--) {
    const it = w.pickups[i], def = PICKUPS[it.kind];
    if (Math.hypot(p.x - it.x, p.z - it.z) > 0.9 || Math.abs((it.y ?? 0) - p.y) > 1.0) continue;
    let took = false;
    const aCap = def.type === 'armor' ? armorCap(w.upgrades) : 0, mCap = def.ammo ? ammoCap(def.ammo, w.upgrades) : 0;      // the caps rise with the persistent upgrades (progress.js)
    if (def.type === 'health' && p.hp < PLAYER.maxHp) { p.hp = Math.min(PLAYER.maxHp, p.hp + def.amount); took = true; }
    else if (def.type === 'armor' && p.armor < aCap) { p.armor = Math.min(aCap, p.armor + def.amount); took = true; }
    else if (def.type === 'ammo' && (p.ammo[def.ammo] || 0) < mCap) { const was = p.ammo[def.ammo] || 0; p.ammo[def.ammo] = Math.min(mCap, was + Math.round(def.amount * diff.ammoPickup * (w.ammoScale ?? 1))); (w.stats.gained ??= {})[def.ammo] = (w.stats.gained[def.ammo] || 0) + p.ammo[def.ammo] - was; took = true; }
    else if (def.type === 'key' && !p.keys.includes(def.key)) { p.keys.push(def.key); took = true; }
    else if (def.type === 'oil' && p.lamp && p.lamp.oil < p.lamp.max) { p.lamp.oil = Math.min(p.lamp.max, p.lamp.oil + def.amount); took = true; }          // PT-038: lamp oil (only where there is a lantern, and not past its tank)
    else if (def.type === 'weapon' && (!p.weapons.includes(def.weapon) || (def.ammo && (p.ammo[def.ammo] || 0) < mCap))) {
      if (!p.weapons.includes(def.weapon)) { p.weapons.push(def.weapon); p.weapons.sort((a, b) => ALL_WEAPONS.indexOf(a) - ALL_WEAPONS.indexOf(b)); p.lastWeapon = p.weapon; p.weapon = def.weapon; if (isMelee(def.weapon)) p.meleeWeapon = def.weapon; p.switchT = WEAPONS[def.weapon].switchTime; p.charge = 0; p.swingT = -1; }
      if (def.ammo) { const was = p.ammo[def.ammo] || 0; p.ammo[def.ammo] = Math.min(mCap, was + Math.round(def.amount * diff.ammoPickup * (w.ammoScale ?? 1))); (w.stats.gained ??= {})[def.ammo] = (w.stats.gained[def.ammo] || 0) + p.ammo[def.ammo] - was; }
      took = true;
    }
    if (took) { w.pickups.splice(i, 1); if (def.type !== 'key' && !it.drop) w.stats.items++; emit(w, def.type === 'weapon' ? 'weapon_pickup' : 'pickup', def.type === 'key' && map.keyLabels?.[def.key] ? { kind: it.kind, label: map.keyLabels[def.key] } : { kind: it.kind }); }
  }

  if (w.tick === 1 || w.tick % EXPLORE_EVERY_TICKS === 0) {
    updateExplored(w);
    // in-world messages (transmissions, notes): shown once, the first time the player comes within range
    for (const m of map.messages) if (!w.messagesSeen.includes(m.id) && Math.hypot(p.x - m.x, p.z - m.z) <= m.r && (!m.choice || choiceHolds(w, m.choice))) { w.messagesSeen.push(m.id); emit(w, 'message', { id: m.id, speaker: m.speaker || '', text: m.text }); }
  }          // automap: remember what has been seen

  // secrets: found when the player stands in one of the secret's cells
  const pcx = Math.floor(p.x / map.cell), pcz = Math.floor(p.z / map.cell);
  for (const s of map.secrets) if (!w.secretsFound.includes(s.id) && s.cells.some(([cx, cz]) => cx === pcx && cz === pcz)) { w.secretsFound.push(s.id); w.stats.secrets++; emit(w, 'secret', { id: s.id }); }

  if (w.chimes) updateChimes(w, dt, emit);                                                                       // PT-038: the chime tree's phrase goes on
  if (w.beams) updateBeams(w);                                                                                   // PT-033: the beams follow the mirrors and the doors
  updateTriggers(w);
  if (map.range) { rangePlayer(w, dt); rangePhys(w, dt); }                                                       // the dev range: you cannot die, run dry or stay hurt (range.js)

  // resolution order matters: damage is settled first, so a player who dies this tick cannot also exit
  if (p.hp <= 0) { p.hp = 0; w.status = 'dead'; emit(w, 'player_died'); }
  else {
    const near = map.exits.find((x) => Math.hypot(p.x - x.x, p.z - x.z) < 1.4 && Math.abs(floorAt(w, x.x, x.z) - p.y) < 1.5);
    if (near && w.exitLocked[near.id]) { if (w.tick % 90 === 0) emit(w, 'exit_locked', { x: near.x, z: near.z }); }
    else if (near) {
      w.status = 'complete'; w.endStats = { time: w.time, kills: w.stats.kills, items: w.stats.items, secrets: w.stats.secrets, total: w.stats.total, damageTaken: w.stats.damageTaken, dest: near.dest, ...(w.stats.innocents ? { innocents: w.stats.innocents } : {}) };
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
