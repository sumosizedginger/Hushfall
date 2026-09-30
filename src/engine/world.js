// Headless, deterministic simulation. Fixed 1/60 s ticks, seeded RNG, plain-data state (JSON-serialisable).
// Nothing here touches DOM/Three/time/Math.random. The renderer reads state and drains events.
import { TICK, DIFFICULTY, PLAYER, AMMO_MAX, WEAPONS, WEAPON_ORDER, ENEMIES, PICKUPS, PROPS, DOOR, NOISE, STEP, FX } from './defs.js';
import { nextRandom, initialRngState } from './rng.js';
import { updateExplored, EXPLORE_EVERY_TICKS } from './automap.js';
import { cellFloor, floorAt, groundAt, tooHigh, ceilingAt, fxAt, fxSpeed } from './terrain.js';
import { navWaypoint } from './nav.js';
import { updateSectors, updateTriggers, activateSwitch } from './script.js';

const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const rand = (w) => nextRandom(w);
const hidden = (o, k, v) => Object.defineProperty(o, k, { value: v, enumerable: false, writable: true, configurable: true });

/** the one place an enemy record is built (createWorld and tests both use it) */
export function spawnEnemy(w, kind, x, z, yaw = Math.PI) {
  const def = ENEMIES[kind], diff = DIFFICULTY[w.difficulty];
  const e = { id: w.nextId++, kind, x, z, y: groundAt(w, x, z, def.radius), group: null, yaw, hp: def.hp * diff.enemyHp, state: 'idle', walk: 0, phase: 0, attackT: -1, cd: 0, struck: false, flash: 0, dead: 0, lungeT: -1, lungeCd: 0, lungeHit: false, lastX: null, lastZ: null, lost: 0, steer: 0 };
  w.enemies.push(e); return e;
}

export function createWorld(map, { seed = 1, difficulty = 'normal', carry = null } = {}) {
  const diff = DIFFICULTY[difficulty];
  if (!diff) throw new Error('unknown difficulty ' + difficulty);
  const w = {
    v: 1, mapId: map.id, mapVersion: map.version, seed, difficulty, rngState: initialRngState(seed), tick: 0, time: 0,
    status: 'playing',                       // playing | dead | complete
    nextId: 1,
    player: {
      x: map.spawn.x, z: map.spawn.z, y: 0, yaw: map.spawn.yaw, pitch: 0, vx: 0, vz: 0, bob: 0, hazardT: 0, fx: null,
      hp: carry?.hp ?? PLAYER.maxHp, armor: carry?.armor ?? 0,
      ammo: { ...(carry?.ammo ?? PLAYER.startAmmo) }, weapons: [...(carry?.weapons ?? ['flare'])], weapon: 'flare',
      keys: [], cooldown: 0, hurt: 0, kick: 0, switchT: 0,
      ads: 0, sprint: 0, recover: 0, sprinting: false,      // ads/sprint are 0..1 blends the view reads; sprinting = sprint active this tick
    },
    enemies: [], projectiles: [], enemyShots: [], pickups: [], doors: [],
    sectors: map.sectors.map((s) => { const h = s.start === 'high' ? s.high : s.low; return { id: s.id, h, target: h, speed: s.speed }; }),      // moving floors (lifts, ramps)
    triggerState: Object.fromEntries(map.triggers.map((t) => [t.id, { fired: false }])), switchState: Object.fromEntries(map.switches.map((s) => [s.id, { used: false, on: false }])),
    exitLocked: Object.fromEntries(map.exits.map((x) => [x.id, !!x.locked])), objective: map.objective ?? null,
    levelStart: { hp: carry?.hp ?? PLAYER.maxHp, armor: carry?.armor ?? 0, ammo: { ...(carry?.ammo ?? PLAYER.startAmmo) }, weapons: [...(carry?.weapons ?? ['flare'])] },      // what Retry restores (never the mid-level inventory)
    secretsFound: [], messagesSeen: [], explored: new Array(map.w * map.h).fill(0),
    stats: { kills: 0, items: 0, secrets: 0, damageTaken: 0, shots: 0, total: map.counts() },
    endStats: null,
  };
  hidden(w, 'map', map); hidden(w, 'events', []);
  for (const e of map.entities) {
    if (e.type === 'enemy') { const en = spawnEnemy(w, e.kind, e.x, e.z, typeof e.facing === 'number' ? e.facing : Math.PI); if (e.group) en.group = e.group; }
    else if (e.type === 'pickup') w.pickups.push({ id: w.nextId++, kind: e.kind, x: e.x, z: e.z, y: floorAt(w, e.x, e.z) });
  }
  w.player.y = groundAt(w, w.player.x, w.player.z, PLAYER.radius);
  for (const d of map.doors.values()) w.doors.push({ cx: d.cx, cz: d.cz, key: d.key, open: 0, target: 0, hold: 0, secret: !!d.closet, remote: !!d.remote, closet: !!d.closet, sealed: false });
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
  const S = w.map.cell;
  for (let cz = Math.floor((z - r) / S); cz <= Math.floor((z + r) / S); cz++) for (let cx = Math.floor((x - r) / S); cx <= Math.floor((x + r) / S); cx++) {
    if (!blocksMove(w, cx, cz)) continue;
    const nx = clamp(x, cx * S, (cx + 1) * S), nz = clamp(z, cz * S, (cz + 1) * S);
    if ((x - nx) ** 2 + (z - nz) ** 2 < r * r) return true;
  }
  if (self && tooHigh(w, self, x, z, r)) return true;                                    // a ledge more than a step above the mover's feet
  for (const p of w.map.props) { const pr = PROPS[p.kind].radius; if (pr > 0 && (x - p.x) ** 2 + (z - p.z) ** 2 < (r + pr) ** 2) return true; }
  if (self) {
    for (const e of w.enemies) if (e !== self && e.state !== 'dead' && (x - e.x) ** 2 + (z - e.z) ** 2 < (r + ENEMIES[e.kind].radius) ** 2) return true;
    if (self !== w.player && (x - w.player.x) ** 2 + (z - w.player.z) ** 2 < (r + PLAYER.radius) ** 2) return true;
  }
  return false;
}
/** Chase movement with cheap obstacle avoidance: go straight if free, otherwise try angled headings, remembering the side that worked. */
function chaseStep(w, e, def, dt) {
  const spd = def.speed * dt * fxSpeed(fxAt(w, e.x, e.z)), s = e.steer || (e.id % 2 ? 0.7 : -0.7);
  for (const off of [0, s, -s, 2 * s, -2 * s, 2.4 * s, -2.4 * s]) {                       // wide angles last: head-on against a round collider only a near-tangential step is free
    const a = e.yaw + off, sx = Math.sin(a) * spd, sz = Math.cos(a) * spd;
    if (!blockedCircle(w, e.x + sx, e.z + sz, def.radius, e)) { e.x += sx; e.z += sz; e.y = groundAt(w, e.x, e.z, def.radius); if (off !== 0) e.steer = off; else if (e.steer) e.steer = 0; return true; }
  }
  return false;
}
function tryMove(w, o, dx, dz, r) { if (!blockedCircle(w, o.x + dx, o.z, r, o)) o.x += dx; if (!blockedCircle(w, o.x, o.z + dz, r, o)) o.z += dz; o.y = groundAt(w, o.x, o.z, r); }
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
function damageEnemy(w, e, dmg) {
  e.hp -= dmg; e.flash = 1;
  if (e.state === 'idle' && e.hp > 0) wakeEnemy(w, e, true);                                       // being shot wakes you, whether or not you can see the shooter
  if (e.hp <= 0 && e.state !== 'dead') { e.state = 'dead'; e.attackT = -1; e.lungeT = -1; w.stats.kills++; emit(w, 'enemy_died', { id: e.id, kind: e.kind, x: e.x, z: e.z }); return true; }
  return false;
}

function explode(w, x, y, z, ownerIsPlayer, def) {
  emit(w, 'explode', { x, y, z }); noise(w, x, z, NOISE.explosion);
  for (const e of w.enemies) {
    if (e.state === 'dead') continue;
    const d = Math.hypot(x - e.x, y - (e.y + 1.0), z - e.z);
    if (d < def.splash) {
      const killed = damageEnemy(w, e, def.splashDamage * (1 - d / def.splash) + def.direct);
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
      for (const e of w.enemies) { const d = ENEMIES[e.kind]; if (e.state !== 'dead' && Math.hypot(x - e.x, z - e.z) < d.radius + 0.05 && y > e.y && y < e.y + d.height) { target = e; break; } }
    }
    if (target) {
      const fall = dist <= def.falloffStart ? 1 : 1 - (1 - def.falloffMin) * Math.min(1, (dist - def.falloffStart) / (def.range - def.falloffStart));
      const killed = damageEnemy(w, target, def.damage * fall);
      if (!killed) hits.set(target.id, target);
      const k = push.get(target.id) || { e: target, x: 0, z: 0 }; k.x += f[0] * def.knock * fall; k.z += f[2] * def.knock * fall; push.set(target.id, k);      // applied after the volley: pellets are simultaneous
    } else if (stop && impacts < 3 && i % 3 === 0) { emit(w, 'impact', { x, y, z }); impacts++; }
  }
  for (const k of push.values()) tryMove(w, k.e, k.x, k.z, ENEMIES[k.e.kind].radius);
  for (const e of hits.values()) if (e.state !== 'dead') emit(w, 'enemy_hit', { id: e.id, kind: e.kind, x: e.x, z: e.z });
}

function fireWeapon(w) {
  const p = w.player, def = WEAPONS[p.weapon];
  if ((p.ammo[def.ammo] || 0) <= 0) { p.cooldown = 0.4; emit(w, 'dry'); return; }
  p.ammo[def.ammo]--; p.cooldown = def.cooldown; p.kick = def.kick ?? 0.06; w.stats.shots++;
  // accuracy: hip spread grows with movement; aiming tightens it. RNG draws happen in a fixed order so replays are deterministic.
  const moveFrac = Math.min(1, Math.hypot(p.vx, p.vz) / PLAYER.speed), sp = def.spread;
  const heat = p.heat || 0, cone = ((sp.hip * (1 + sp.moveFactor * moveFrac)) * (1 - p.ads) + sp.ads * p.ads) * (1 + heat * (def.heatCone || 0));
  if (def.heatPerShot) p.heat = Math.min(1, heat + def.heatPerShot);                                     // holding the trigger blooms the pattern
  if (def.kind === 'hitscan') fireHitscan(w, def, cone);
  else {
    const f = forwardVec({ yaw: p.yaw + (rand(w) * 2 - 1) * cone, pitch: p.pitch + (rand(w) * 2 - 1) * cone }), r = [Math.cos(p.yaw), 0, -Math.sin(p.yaw)];
    // the weapon is held right and low at the hip; at the sights it is centred, so the shot leaves along the crosshair
    const mRight = def.muzzle.right * (1 - p.ads), mDown = def.muzzle.down * (1 - 0.7 * p.ads);
    const pos = [p.x + f[0] * def.muzzle.fwd + r[0] * mRight, p.y + PLAYER.eye + f[1] * def.muzzle.fwd - mDown, p.z + f[2] * def.muzzle.fwd + r[2] * mRight];
    w.projectiles.push({ id: w.nextId++, weapon: p.weapon, x: pos[0], y: pos[1], z: pos[2], vx: f[0] * def.speed, vy: f[1] * def.speed, vz: f[2] * def.speed, life: 4 });
  }
  emit(w, 'fire', { weapon: p.weapon }); noise(w, p.x, p.z, NOISE[p.weapon] ?? 22);
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
    if (d < PLAYER.useReach && Math.abs(sw.fy - p.y) < 1.5 && (dx * fx + dz * fz) / (d || 1) > 0.55 && d < bd) { bd = d; best = sw; }
  }
  return best ? { switchId: best.id, used: !!w.switchState[best.id]?.used, once: best.once, secret: false, target: 0, open: 0, key: null, remote: false, sealed: false } : null;
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
  const R = def.ranged, p = w.player, ox = e.x + Math.sin(e.yaw) * 0.6, oy = e.y + 1.5, oz = e.z + Math.cos(e.yaw) * 0.6;
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

function updateEnemy(w, e, diff, dt) {
  const p = w.player, def = ENEMIES[e.kind]; e.flash = Math.max(0, e.flash - dt * 4);
  if (e.state === 'dead') { e.dead = Math.min(1, e.dead + dt / 0.9); e.walk *= 0.9; return; }
  e.y = groundAt(w, e.x, e.z, def.radius);
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
  if (!sees || !stepClear(w, e.x, e.z, tx, tz)) { const wp = navWaypoint(w, e.x, e.z, tx, tz); if (wp && wp.dist > 0) { ax = wp.x; az = wp.z; } }
  let dy = Math.atan2(ax - e.x, az - e.z) - e.yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy));
  const dashing = def.lunge && (e.lungeT ?? -1) >= def.lunge.windup;                 // a dash keeps its heading: that is what makes it dodgeable
  if (e.attackT < 0 && !dashing) e.yaw += clamp(dy, -def.turnRate * dt, def.turnRate * dt);
  e.cd = Math.max(0, e.cd - dt);
  if (def.lunge) {
    const L = def.lunge; e.lungeCd = Math.max(0, (e.lungeCd || 0) - dt);
    if ((e.lungeT ?? -1) >= 0) {
      e.lungeT += dt;
      if (e.lungeT < L.windup) e.walk *= 0.8;                                        // crouch: the readable tell
      else if (e.lungeT < L.windup + L.duration) {
        const hit = () => { if (!e.lungeHit) { e.lungeHit = true; hurtPlayer(w, Math.round(def.attack.damage * diff.enemyDamage)); emit(w, 'enemy_strike', { id: e.id, kind: e.kind, x: e.x, z: e.z }); } };
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
      else { if (dist < def.attack.reach && dyv < 1.6) hurtPlayer(w, Math.round(def.attack.damage * diff.enemyDamage)); emit(w, 'enemy_strike', { id: e.id, kind: e.kind, x: e.x, z: e.z }); }
    }
    if (e.attackT >= def.attack.duration) { e.attackT = -1; e.cd = def.attack.cooldown * diff.reaction; e.struck = false; }
  } else if (R && sees && e.cd <= 0 && dist <= R.maxRange && dist >= R.minRange) {
    e.attackT = 0; e.struck = false; emit(w, 'enemy_windup', { id: e.id, kind: e.kind, x: e.x, z: e.z });
  } else if ((sees ? !(dist <= engage && dyv < 1.6) : tdist > 1.2)) {
    chaseStep(w, e, def, dt);
    e.walk = Math.min(1, e.walk + dt * 3); e.phase += dt * (def.gait ?? 5.2);
  } else {
    e.walk = Math.max(0, e.walk - dt * 3);
    if (sees && dist <= def.attack.range + 0.1 && dyv < 1.6 && e.cd <= 0) { e.attackT = 0; e.struck = false; emit(w, 'enemy_windup', { id: e.id, kind: e.kind, x: e.x, z: e.z }); }
  }
}

// ---------------------------------------------------------------- step
export function step(w, cmd) {
  if (w.status !== 'playing') return;
  const p = w.player, diff = DIFFICULTY[w.difficulty], dt = TICK, map = w.map;
  w.tick++; w.time = w.tick * dt;
  updateSectors(w, dt); p.y = groundAt(w, p.x, p.z, PLAYER.radius);                       // moving floors carry whoever stands on them

  // look + move
  p.yaw += cmd.yaw || 0; p.pitch = clamp(p.pitch + (cmd.pitch || 0), -1.3, 1.3);
  let sx = clamp(cmd.move?.[0] || 0, -1, 1), sf = clamp(cmd.move?.[1] || 0, -1, 1);
  const len = Math.hypot(sx, sf); if (len > 1) { sx /= len; sf /= len; }
  const fx = -Math.sin(p.yaw), fz = -Math.cos(p.yaw), rx = Math.cos(p.yaw), rz = -Math.sin(p.yaw), a = Math.min(1, dt * PLAYER.accel);
  // stance: aim wins over sprint; sprint needs forward input; a dead-on-arrival sprint (no forward) is not a sprint
  const aimHeld = !!cmd.aim, wasSprinting = p.sprinting;
  p.sprinting = !!cmd.sprint && sf >= PLAYER.sprintMinForward && !aimHeld;
  if (wasSprinting && !p.sprinting) p.recover = PLAYER.sprintRecover;
  p.recover = Math.max(0, p.recover - dt);
  p.ads = clamp(p.ads + (aimHeld ? 1 : -1) * dt / PLAYER.adsTime, 0, 1);
  p.sprint = clamp(p.sprint + (p.sprinting ? 1 : -1) * dt / PLAYER.sprintBlendTime, 0, 1);
  const fxc = fxAt(w, p.x, p.z), speed = PLAYER.speed * fxSpeed(fxc) * (1 - (1 - PLAYER.adsMoveMult) * p.ads), fwdSpeed = speed * (p.sprinting ? PLAYER.sprintMult : 1);
  p.vx += ((fx * sf * fwdSpeed + rx * sx * speed) - p.vx) * a; p.vz += ((fz * sf * fwdSpeed + rz * sx * speed) - p.vz) * a;
  tryMove(w, p, p.vx * dt, p.vz * dt, PLAYER.radius);
  if (fxc !== p.fx) { if (fxc) emit(w, 'wade', { kind: fxc }); p.fx = fxc; }
  if (fxc && FX[fxc].dps) { p.hazardT = (p.hazardT || 0) + dt; if (p.hazardT >= 0.5) { p.hazardT -= 0.5; hurtPlayer(w, Math.round(FX[fxc].dps * 0.5 * diff.enemyDamage)); } } else p.hazardT = 0;
  p.bob += Math.hypot(p.vx, p.vz) * dt * 1.9;
  if (p.heat > 0) p.heat = Math.max(0, p.heat - dt * (WEAPONS[p.weapon].heatDecay || 1.4));
  p.cooldown = Math.max(0, p.cooldown - dt); p.hurt = Math.max(0, p.hurt - dt * 1.2); p.kick = Math.max(0, p.kick - dt * 0.4);
  // weapon selection: slot key, or cycle through owned weapons (mouse wheel). Switching costs the new weapon's switchTime.
  p.switchT = Math.max(0, (p.switchT || 0) - dt);
  let want = null;
  if (cmd.weapon != null) want = WEAPON_ORDER[cmd.weapon];
  else if (cmd.weaponStep) { const owned = WEAPON_ORDER.filter((id) => p.weapons.includes(id)), i = owned.indexOf(p.weapon); if (owned.length) want = owned[(i + cmd.weaponStep + owned.length) % owned.length]; }
  if (want && want !== p.weapon && p.weapons.includes(want)) { p.weapon = want; p.switchT = WEAPONS[want].switchTime; emit(w, 'weapon_switch', { weapon: want }); }

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

  // fire
  if (cmd.fire && p.cooldown <= 0 && p.switchT <= 0 && !p.sprinting && p.recover <= 0) fireWeapon(w);          // no firing mid-switch or from the sprint pose

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

  // enemies + their shots
  for (const e of w.enemies) updateEnemy(w, e, diff, dt);
  updateEnemyShots(w, diff, dt);

  // projectiles (substepped so fast flares cannot tunnel through walls)
  for (let i = w.projectiles.length - 1; i >= 0; i--) {
    const q = w.projectiles[i], def = WEAPONS[q.weapon ?? 'flare']; q.life -= dt; q.vy -= def.gravity * dt;      // projectiles keep their own weapon stats after you switch away
    const speed = Math.hypot(q.vx, q.vy, q.vz), n = Math.ceil(speed * dt / 0.25); let hit = q.life <= 0;
    for (let k = 0; k < n && !hit; k++) {
      q.x += q.vx * dt / n; q.y += q.vy * dt / n; q.z += q.vz * dt / n;
      const cx = Math.floor(q.x / map.cell), cz = Math.floor(q.z / map.cell);
      if (q.y < floorAt(w, q.x, q.z) + 0.05 || q.y > ceilingAt(w, q.x, q.z) || cellSolid(w, cx, cz)) hit = true;
      for (const pr of map.props) if (PROPS[pr.kind].radius > 0 && Math.hypot(q.x - pr.x, q.z - pr.z) < PROPS[pr.kind].radius && q.y < floorAt(w, pr.x, pr.z) + 1.3) hit = true;
      for (const e of w.enemies) if (e.state !== 'dead' && Math.hypot(q.x - e.x, q.z - e.z) < 0.5 && q.y > e.y && q.y < e.y + ENEMIES[e.kind].height) hit = true;
    }
    if (hit) { w.projectiles.splice(i, 1); explode(w, q.x, q.y, q.z, true, def); }
  }

  // pickups
  for (let i = w.pickups.length - 1; i >= 0; i--) {
    const it = w.pickups[i], def = PICKUPS[it.kind];
    if (Math.hypot(p.x - it.x, p.z - it.z) > 0.9 || Math.abs((it.y ?? 0) - p.y) > 1.0) continue;
    let took = false;
    if (def.type === 'health' && p.hp < PLAYER.maxHp) { p.hp = Math.min(PLAYER.maxHp, p.hp + def.amount); took = true; }
    else if (def.type === 'armor' && p.armor < PLAYER.maxArmor) { p.armor = Math.min(PLAYER.maxArmor, p.armor + def.amount); took = true; }
    else if (def.type === 'ammo' && (p.ammo[def.ammo] || 0) < AMMO_MAX[def.ammo]) { p.ammo[def.ammo] = Math.min(AMMO_MAX[def.ammo], (p.ammo[def.ammo] || 0) + Math.round(def.amount * diff.ammoPickup)); took = true; }
    else if (def.type === 'key' && !p.keys.includes(def.key)) { p.keys.push(def.key); took = true; }
    else if (def.type === 'weapon' && (!p.weapons.includes(def.weapon) || (p.ammo[def.ammo] || 0) < AMMO_MAX[def.ammo])) {
      if (!p.weapons.includes(def.weapon)) { p.weapons.push(def.weapon); p.weapons.sort((a, b) => WEAPON_ORDER.indexOf(a) - WEAPON_ORDER.indexOf(b)); p.weapon = def.weapon; p.switchT = WEAPONS[def.weapon].switchTime; }
      p.ammo[def.ammo] = Math.min(AMMO_MAX[def.ammo], (p.ammo[def.ammo] || 0) + Math.round(def.amount * diff.ammoPickup)); took = true;
    }
    if (took) { w.pickups.splice(i, 1); if (def.type !== 'key') w.stats.items++; emit(w, def.type === 'weapon' ? 'weapon_pickup' : 'pickup', { kind: it.kind }); }
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
export const carryOver = (w) => ({ hp: Math.max(1, w.player.hp), armor: w.player.armor, ammo: { ...w.player.ammo }, weapons: [...w.player.weapons] });

export function hashWorld(w) {
  const s = JSON.stringify(w, (k, v) => (typeof v === 'number' ? Math.round(v * 1e5) / 1e5 : v));
  let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h.toString(16).padStart(8, '0');
}
