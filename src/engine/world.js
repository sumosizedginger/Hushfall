// Headless, deterministic simulation. Fixed 1/60 s ticks, seeded RNG, plain-data state (JSON-serialisable).
// Nothing here touches DOM/Three/time/Math.random. The renderer reads state and drains events.
// This file makes a world and holds the order of a tick; the systems are simcore.js, player.js, weapons.js, enemies.js and place.js.
import { gateOpen } from './breath.js';
import { makeChimes } from './chimes.js';
import { ALL_WEAPONS, DIFFICULTY, ENEMIES, LANTERN, MELEE_ORDER, PLAYER, TICK, inSkill } from './defs.js';
import { updateCreatures } from './enemies.js';
import { spawnPhys } from './gravity.js';
import { noticePlace, settleTick, takePickups, updateAmmoDrops, updateBeams, updateDoors, updateScripts } from './place.js';
import { cycleHeight } from './platforms.js';
import { advanceClocks, dryFeed, movePlayer, selectWeapon, useAction } from './player.js';
import { sanitizeUpgrades } from './progress.js';
import { holdTarget } from './range.js';
import { makeResonators } from './resonator.js';
import { initialRngState } from './rng.js';
import { bellInit } from './rootbell.js';
import { hidden } from './simcore.js';
import { floorAt, groundAt } from './terrain.js';
import { updateProjectiles, weaponInput } from './weapons.js';
export { emit, doorAtCell, cellSolid, blockedCircle, tryMove, hasLOS, forwardVec, moveClear } from './simcore.js';
export { updateBeams, turnMirror } from './place.js';
export { wakeEnemy, noise } from './enemies.js';
export { damageEnemy, hitEffects, rayClear, swingWeapon } from './weapons.js';
export { useTarget } from './player.js';

/** the one place an enemy record is built (createWorld and tests both use it) */
export function spawnEnemy(w, kind, x, z, yaw = Math.PI) {
  const def = ENEMIES[kind],
    diff = DIFFICULTY[w.difficulty];
  const e = {
    id: w.nextId++,
    kind,
    x,
    z,
    y: groundAt(w, x, z, def.radius),
    group: null,
    yaw,
    hp: def.hp * diff.enemyHp,
    state: def.peaceful ? 'calm' : 'idle',
    walk: 0,
    phase: 0,
    attackT: -1,
    cd: 0,
    struck: false,
    flash: 0,
    dead: 0,
    lungeT: -1,
    lungeCd: 0,
    lungeHit: false,
    lastX: null,
    lastZ: null,
    lost: 0,
    steer: 0,
    stunT: 0,
    chargeT: -1,
    chargeCd: 0,
    channelT: -1,
    supCd: 0,
    revived: 0,
    pulseCd: 2,
    pulseT: -1,
    summonCd: 8,
    shotCd: 2,
  };
  if (def.bell) {
    const rb = bellInit(e, def, e.y);
    e.lift = Math.max(0, def.bell.top - rb.len - def.height / 2 - e.y);
  } // the Root Bell's clapper hangs from the moment it exists
  w.enemies.push(e);
  return e;
}

/**
 * What a player has when a level starts: a cold start gets the map's authored entryLoadout; arriving from the previous map they keep what they carry,
 * FLOORED at that loadout (health, each ammo type, weapons).
 * The floor makes the authored loadout a lower bound on every arrival, so the balance evidence measured from it holds in a campaign run (audit A16),
 * and a player who limps out of one map is never stranded at 1 HP with an empty gun.
 */
export function arrivalInventory(carry, entry) {
  if (!carry) return entry ?? null;
  if (!entry) return carry;
  const ammo = { ...(carry.ammo ?? {}) };
  for (const [k, v] of Object.entries(entry.ammo ?? {})) ammo[k] = Math.max(ammo[k] ?? 0, v);
  const weapons = [...new Set([...(carry.weapons ?? []), ...(entry.weapons ?? [])])].sort((x, y) => ALL_WEAPONS.indexOf(x) - ALL_WEAPONS.indexOf(y));
  return {
    hp: Math.max(carry.hp ?? 0, entry.hp ?? 0),
    armor: Math.max(carry.armor ?? 0, entry.armor ?? 0),
    ammo,
    weapons,
    ...(carry.upgrades ? { upgrades: carry.upgrades } : {}),
    ...(carry.loads ? { loads: carry.loads, loadSel: carry.loadSel ?? {}, loadSeen: carry.loadSeen ?? {} } : {}),
    ...(carry.mods ? { mods: carry.mods } : {}),
  }; // the persistent upgrade tiers ride along: they are never part of a map's authored loadout
}

export function createWorld(map, { seed = 1, difficulty = 'normal', carry = null, ammoScale = null, choices = null } = {}) {
  carry = arrivalInventory(carry, map.entryLoadout ?? null);
  const diff = DIFFICULTY[difficulty];
  if (!diff) throw new Error('unknown difficulty ' + difficulty);
  const w = /** @type {any} */ ({
    ...(ammoScale != null ? { ammoScale } : {}), // robustness testing only: a level whose ammo pickups are scaled (a player who wastes shots)
    // what earlier maps remembered (progress.choices): lazy, a world without any has no field
    ...(choices && Object.keys(choices).length ? { choices: { ...choices } } : {}),
    v: 1,
    mapId: map.id,
    mapVersion: map.version,
    seed,
    difficulty,
    rngState: initialRngState(seed),
    tick: 0,
    time: 0,
    status: 'playing', // playing | dead | complete
    nextId: 1,
    player: {
      x: map.spawn.x,
      z: map.spawn.z,
      y: 0,
      yaw: map.spawn.yaw,
      pitch: 0,
      vx: 0,
      vz: 0,
      bob: 0,
      hazardT: 0,
      fx: null,
      hp: carry?.hp ?? PLAYER.maxHp,
      armor: carry?.armor ?? 0,
      ammo: { ...(carry?.ammo ?? PLAYER.startAmmo) },
      weapons: [...(carry?.weapons ?? ['flare'])],
      weapon: 'flare',
      keys: [],
      cooldown: 0,
      hurt: 0,
      kick: 0,
      switchT: 0,
      ads: 0,
      sprint: 0,
      recover: 0,
      sprinting: false, // ads/sprint are 0..1 blends the view reads; sprinting = sprint active this tick
      charge: 0, // seconds the fire key has been held on a charging weapon (the lamp, the fists); the weapon fires on release
      swingT: -1,
      swingKind: null,
      swingHit: false, // a melee swing in progress (-1 = none): seconds since it began, which move, whether its blow has landed
      guard: 0,
      guarding: false,
      parryW: 0,
      parryCd: 0,
      riposteT: 0,
      brokenT: 0, // guard blend 0..1, the parry window left, the whiff cooldown, the riposte bonus left, the broken-guard lockout
      ...(carry?.mods ? { mods: { ...carry.mods } } : {}), // found mods ride between maps (lazy)
      ...(carry?.loads
        ? { loads: JSON.parse(JSON.stringify(carry.loads)), loadSel: { ...(carry.loadSel ?? {}) }, loadSeen: { ...(carry.loadSeen ?? {}) } }
        : {}), // ammunition loads ride between maps like ammunition (lazy: only a carry that has some)
      meleeWeapon: [...MELEE_ORDER].reverse().find((id) => (carry?.weapons ?? []).includes(id)) ?? 'fists',
      lastWeapon: null, // what key 6 brings up (the heaviest found melee weapon you carry in, else the fists); what Q swaps back to
    },
    enemies: [],
    projectiles: [],
    enemyShots: [],
    pulses: [],
    pickups: [],
    doors: [],
    burns: [], // burns: the flare cannon's burning ground
    sectors: map.sectors.map((s) => {
      const h = s.cycle ? cycleHeight(s, 0) : s.start === 'high' ? s.high : s.low;
      return { id: s.id, h, target: h, speed: s.speed };
    }), // moving floors (lifts, ramps)
    triggerState: Object.fromEntries(map.triggers.map((t) => [t.id, { fired: false }])),
    switchState: Object.fromEntries(map.switches.map((s) => [s.id, { used: false, on: false }])),
    exitLocked: Object.fromEntries(map.exits.map((x) => [x.id, !!x.locked])),
    objective: map.objective ?? null,
    // the campaign's persistent upgrade tiers (progress.js): they set the ammunition and armour CAPS, nothing else; the sim never changes them
    upgrades: sanitizeUpgrades(carry?.upgrades),
    levelStart: {
      hp: carry?.hp ?? PLAYER.maxHp,
      armor: carry?.armor ?? 0,
      ammo: { ...(carry?.ammo ?? PLAYER.startAmmo) },
      weapons: [...(carry?.weapons ?? ['flare'])],
      upgrades: sanitizeUpgrades(carry?.upgrades),
      ...(carry?.mods ? { mods: { ...carry.mods } } : {}),
      ...(carry?.loads
        ? { loads: JSON.parse(JSON.stringify(carry.loads)), loadSel: { ...(carry.loadSel ?? {}) }, loadSeen: { ...(carry.loadSeen ?? {}) } }
        : {}),
    }, // what Retry restores (never the mid-level inventory)
    secretsFound: [],
    messagesSeen: [],
    explored: new Array(map.w * map.h).fill(0),
    stats: { kills: 0, items: 0, secrets: 0, damageTaken: 0, shots: 0, total: map.counts(difficulty) },
    endStats: null,
  });
  hidden(w, 'map', map);
  hidden(w, 'events', []);
  for (const e of map.entities) {
    if (e.type === 'enemy') {
      if (!inSkill(e, difficulty)) {
        w.nextId++; // left out on this difficulty; every other creature keeps its id
        continue;
      }
      const en = spawnEnemy(w, e.kind, e.x, e.z, typeof e.facing === 'number' ? e.facing : Math.PI);
      if (e.group) en.group = e.group;
      if (e.variant) en.variant = e.variant;
      if (e.onBeat) en.onBeat = true;
      if (e.swing) en.swing = true;
      if (e.rings) en.rings = true;
      if (e.spawns) en.spawns = e.spawns;
      if (e.summons) en.summons = e.summons.map(([cx, cz]) => [(cx + 0.5) * map.cell, (cz + 0.5) * map.cell]);
      if (e.hold) holdTarget(en, e);
      else if (e.sight > 0) en.sightR = e.sight;
    } else if (e.type === 'pickup') w.pickups.push({ id: w.nextId++, kind: e.kind, x: e.x, z: e.z, y: floorAt(w, e.x, e.z) });
  }
  w.player.y = groundAt(w, w.player.x, w.player.z, PLAYER.radius);
  if (map.movables?.length) w.phys = spawnPhys(w, map); // props the gravity tool can lift (only a map that lists them has any)
  for (const d of map.doors.values()) {
    const on = d.breath ? (gateOpen(d.breath, 0) ? 1 : 0) : d.startOpen ? 1 : 0;
    w.doors.push({
      cx: d.cx,
      cz: d.cz,
      key: d.key,
      open: on,
      target: on,
      hold: 0,
      secret: !!d.closet || !!d.remote || !!d.startOpen,
      remote: !!d.remote,
      closet: !!d.closet,
      sealed: false,
      ...(d.breath ? { breath: d.breath } : {}),
      ...(d.soundlock ? { soundlock: d.soundlock } : {}),
      ...(d.interlock ? { interlock: d.interlock, closedAt: -99 } : {}),
    });
  }
  for (const s of map.secrets)
    w.doors.push({
      cx: s.panel[0],
      cz: s.panel[1],
      key: null,
      open: 0,
      target: 0,
      hold: 0,
      secret: true,
      secretId: s.id,
      ...(s.open === 'shoot' ? { hidden: 'shoot' } : s.open === 'switch' ? { remote: true } : {}),
    }); // a cracked wall is a wall to Use; a panel a switch opens says "opened elsewhere"
  if (map.emitters.length || map.mirrors.length) w.mirrors = Object.fromEntries(map.mirrors.map((m) => [m.id, m.rot]));
  {
    const ch = makeChimes(map);
    if (ch) w.chimes = ch;
  } // chime state, only where the map has a chime or a tree
  if (map.lantern)
    // the hand lantern: lazy, only a map that carries one has it; Ines's own lamp (taken in C2S02: choices.lamp = 'own') burns without oil and holds
    // a ring back harder
    w.player.lamp = { on: false, oil: map.lantern.oil, max: map.lantern.max ?? LANTERN.max, eternal: !!map.lantern.eternal || choices?.lamp === 'own' };
  if (map.dark) w.lit = false; // ...and only a dark place keeps the 'is the player lit' flag
  if (map.props.some((p) => p.kind === 'resonator')) w.resonators = makeResonators(map);
  if (map.emitters.length) {
    w.beams = { lit: [] };
    updateBeams(w, true);
  } // the beams (beams.js)
  return w;
}

export function drainEvents(w) {
  const e = w.events;
  w.events = [];
  hidden(w, 'events', w.events);
  return e;
}

/** One fixed tick of the whole world. The order is the game's: it must not change. */
export function step(w, cmd) {
  if (w.status !== 'playing') return;
  const diff = DIFFICULTY[w.difficulty],
    dt = TICK;
  w.tick++;
  w.time = w.tick * dt;
  advanceClocks(w, cmd, dt);
  movePlayer(w, cmd, diff, dt);
  selectWeapon(w, cmd, dt);
  useAction(w, cmd);
  weaponInput(w, cmd, dt);
  updateDoors(w, dt);
  updateCreatures(w, diff, dt);
  updateProjectiles(w, dt);
  dryFeed(w, dt);
  updateAmmoDrops(w, dt);
  takePickups(w, diff);
  noticePlace(w);
  updateScripts(w, dt);
  settleTick(w);
}

/** A fresh run of the same level with the SAME seed and difficulty and the inventory the level began with (used by Retry). */
export const restartWorld = (w) => createWorld(w.map, { seed: w.seed, difficulty: w.difficulty, carry: w.levelStart });

/** Inventory carried into the next map / level-start checkpoint. Keys do not carry. */
export const carryOver = (w) => ({
  hp: Math.max(1, w.player.hp),
  armor: w.player.armor,
  ammo: { ...w.player.ammo },
  weapons: [...w.player.weapons],
  upgrades: { ...w.upgrades },
  ...(w.player.mods ? { mods: { ...w.player.mods } } : {}),
  ...(w.player.loads
    ? { loads: JSON.parse(JSON.stringify(w.player.loads)), loadSel: { ...(w.player.loadSel ?? {}) }, loadSeen: { ...(w.player.loadSeen ?? {}) } }
    : {}),
});

export function hashWorld(w) {
  const s = JSON.stringify(w, (k, v) => (typeof v === 'number' ? Math.round(v * 1e5) / 1e5 : v));
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}
