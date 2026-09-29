// Headless, deterministic simulation. Fixed 1/60 s ticks, seeded RNG, plain-data state (JSON-serialisable).
// Nothing here touches DOM/Three/time/Math.random. The renderer reads state and drains events.
import { TICK, DIFFICULTY, PLAYER, AMMO_MAX, WEAPONS, ENEMIES, PICKUPS, PROPS, DOOR } from './defs.js';
import { nextRandom, initialRngState } from './rng.js';

const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const rand = (w) => nextRandom(w);
const hidden = (o, k, v) => Object.defineProperty(o, k, { value: v, enumerable: false, writable: true, configurable: true });

export function createWorld(map, { seed = 1, difficulty = 'normal', carry = null } = {}) {
  const diff = DIFFICULTY[difficulty];
  if (!diff) throw new Error('unknown difficulty ' + difficulty);
  const w = {
    v: 1, mapId: map.id, mapVersion: map.version, seed, difficulty, rngState: initialRngState(seed), tick: 0, time: 0,
    status: 'playing',                       // playing | dead | complete
    nextId: 1,
    player: {
      x: map.spawn.x, z: map.spawn.z, yaw: map.spawn.yaw, pitch: 0, vx: 0, vz: 0, bob: 0,
      hp: carry?.hp ?? PLAYER.maxHp, armor: carry?.armor ?? 0,
      ammo: { ...(carry?.ammo ?? PLAYER.startAmmo) }, weapons: [...(carry?.weapons ?? ['flare'])], weapon: 'flare',
      keys: [], cooldown: 0, hurt: 0, kick: 0,
    },
    enemies: [], projectiles: [], pickups: [], doors: [],
    secretsFound: [],
    stats: { kills: 0, items: 0, secrets: 0, damageTaken: 0, shots: 0, total: map.counts() },
    endStats: null,
  };
  hidden(w, 'map', map); hidden(w, 'events', []);
  for (const e of map.entities) {
    if (e.type === 'enemy') {
      const def = ENEMIES[e.kind];
      w.enemies.push({ id: w.nextId++, kind: e.kind, x: e.x, z: e.z, yaw: typeof e.facing === 'number' ? e.facing : Math.PI, hp: def.hp * diff.enemyHp, state: 'idle', walk: 0, phase: 0, attackT: -1, cd: 0, struck: false, flash: 0, dead: 0 });
    } else if (e.type === 'pickup') w.pickups.push({ id: w.nextId++, kind: e.kind, x: e.x, z: e.z });
  }
  for (const d of map.doors.values()) w.doors.push({ cx: d.cx, cz: d.cz, key: d.key, open: 0, target: 0, hold: 0, secret: false });
  for (const s of map.secrets) w.doors.push({ cx: s.panel[0], cz: s.panel[1], key: null, open: 0, target: 0, hold: 0, secret: true, secretId: s.id });
  return w;
}

export function drainEvents(w) { const e = w.events; w.events = []; hidden(w, 'events', w.events); return e; }
const emit = (w, type, data = {}) => w.events.push({ type, tick: w.tick, ...data });

// ---------------------------------------------------------------- collision
const doorAtCell = (w, cx, cz) => w.doors.find((d) => d.cx === cx && d.cz === cz);
function cellSolid(w, cx, cz) {
  const m = w.map, k = m.kind(cx, cz);
  if (k === 'wall') return true;
  if (k === 'door' || k === 'secret') { const d = doorAtCell(w, cx, cz); return !d || d.open < DOOR.passableAt; }
  return false;
}
export function blockedCircle(w, x, z, r) {
  const S = w.map.cell;
  for (let cz = Math.floor((z - r) / S); cz <= Math.floor((z + r) / S); cz++) for (let cx = Math.floor((x - r) / S); cx <= Math.floor((x + r) / S); cx++) {
    if (!cellSolid(w, cx, cz)) continue;
    const nx = clamp(x, cx * S, (cx + 1) * S), nz = clamp(z, cz * S, (cz + 1) * S);
    if ((x - nx) ** 2 + (z - nz) ** 2 < r * r) return true;
  }
  for (const p of w.map.props) { const pr = PROPS[p.kind].radius; if (pr > 0 && (x - p.x) ** 2 + (z - p.z) ** 2 < (r + pr) ** 2) return true; }
  return false;
}
function tryMove(w, o, dx, dz, r) { if (!blockedCircle(w, o.x + dx, o.z, r)) o.x += dx; if (!blockedCircle(w, o.x, o.z + dz, r)) o.z += dz; }
export function hasLOS(w, x0, z0, x1, z1) {
  const S = w.map.cell, d = Math.hypot(x1 - x0, z1 - z0), n = Math.ceil(d / 0.4);
  for (let i = 1; i < n; i++) { const t = i / n; if (cellSolid(w, Math.floor((x0 + (x1 - x0) * t) / S), Math.floor((z0 + (z1 - z0) * t) / S))) return false; }
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

function explode(w, x, y, z, ownerIsPlayer) {
  const def = WEAPONS[w.player.weapon];
  emit(w, 'explode', { x, y, z });
  for (const e of w.enemies) {
    if (e.state === 'dead') continue;
    const d = Math.hypot(x - e.x, y - 1.0, z - e.z);
    if (d < def.splash) {
      e.hp -= def.splashDamage * (1 - d / def.splash) + def.direct; e.flash = 1;
      const k = 0.8 * (1 - d / def.splash), nx = (e.x - x) / (d || 1), nz = (e.z - z) / (d || 1); tryMove(w, e, nx * k, nz * k, ENEMIES[e.kind].radius);
      if (e.hp <= 0) { e.state = 'dead'; e.attackT = -1; w.stats.kills++; emit(w, 'enemy_died', { id: e.id, kind: e.kind }); } else emit(w, 'enemy_hit', { id: e.id });
    }
  }
  const p = w.player, d = Math.hypot(x - p.x, y - PLAYER.eye, z - p.z);
  if (ownerIsPlayer && d < def.splash * 0.65) hurtPlayer(w, Math.round(def.splashDamage * def.selfDamage * (1 - d / (def.splash * 0.65))));
}

// ---------------------------------------------------------------- step
export function step(w, cmd) {
  if (w.status !== 'playing') return;
  const p = w.player, diff = DIFFICULTY[w.difficulty], dt = TICK, map = w.map;
  w.tick++; w.time = w.tick * dt;

  // look + move
  p.yaw += cmd.yaw || 0; p.pitch = clamp(p.pitch + (cmd.pitch || 0), -1.3, 1.3);
  let sx = clamp(cmd.move?.[0] || 0, -1, 1), sf = clamp(cmd.move?.[1] || 0, -1, 1);
  const len = Math.hypot(sx, sf); if (len > 1) { sx /= len; sf /= len; }
  const fx = -Math.sin(p.yaw), fz = -Math.cos(p.yaw), rx = Math.cos(p.yaw), rz = -Math.sin(p.yaw), a = Math.min(1, dt * PLAYER.accel);
  p.vx += ((fx * sf + rx * sx) * PLAYER.speed - p.vx) * a; p.vz += ((fz * sf + rz * sx) * PLAYER.speed - p.vz) * a;
  tryMove(w, p, p.vx * dt, p.vz * dt, PLAYER.radius);
  p.bob += Math.hypot(p.vx, p.vz) * dt * 1.9;
  p.cooldown = Math.max(0, p.cooldown - dt); p.hurt = Math.max(0, p.hurt - dt * 1.2); p.kick = Math.max(0, p.kick - dt * 0.4);
  if (cmd.weapon != null && p.weapons[cmd.weapon]) p.weapon = p.weapons[cmd.weapon];

  // use: first door/secret panel along the view ray
  if (cmd.use) {
    let hit = null;
    for (let s = 0.3; s <= PLAYER.useReach && !hit; s += 0.25) {
      const cx = Math.floor((p.x + fx * s) / map.cell), cz = Math.floor((p.z + fz * s) / map.cell), k = map.kind(cx, cz);
      if (k === 'door' || k === 'secret') hit = doorAtCell(w, cx, cz);
      else if (k === 'wall') break;
    }
    if (hit) {
      if (hit.key && !p.keys.includes(hit.key)) emit(w, 'door_locked', { key: hit.key, cx: hit.cx, cz: hit.cz });
      else if (hit.target === 0) { hit.target = 1; hit.hold = 0; emit(w, 'door_open', { cx: hit.cx, cz: hit.cz, secret: hit.secret }); }
    }
  }

  // fire
  if (cmd.fire && p.cooldown <= 0) {
    const def = WEAPONS[p.weapon];
    if ((p.ammo[def.ammo] || 0) <= 0) { p.cooldown = 0.4; emit(w, 'dry'); }
    else {
      p.ammo[def.ammo]--; p.cooldown = def.cooldown; p.kick = 0.06; w.stats.shots++;
      const f = forwardVec(p), r = [Math.cos(p.yaw), 0, -Math.sin(p.yaw)];
      const pos = [p.x + f[0] * def.muzzle.fwd + r[0] * def.muzzle.right, PLAYER.eye + f[1] * def.muzzle.fwd - def.muzzle.down, p.z + f[2] * def.muzzle.fwd + r[2] * def.muzzle.right];
      w.projectiles.push({ id: w.nextId++, x: pos[0], y: pos[1], z: pos[2], vx: f[0] * def.speed, vy: f[1] * def.speed, vz: f[2] * def.speed, life: 4 });
      emit(w, 'fire', { weapon: p.weapon });
    }
  }

  // doors
  for (const d of w.doors) {
    if (d.target === 1 && d.open < 1) { d.open = Math.min(1, d.open + dt * DOOR.speed); }
    else if (d.target === 1 && d.open >= 1 && !d.secret) {
      const cxw = (d.cx + 0.5) * map.cell, czw = (d.cz + 0.5) * map.cell;
      const occupied = [p, ...w.enemies.filter((e) => e.state !== 'dead')].some((o) => Math.hypot(o.x - cxw, o.z - czw) < DOOR.autoCloseClearance);
      d.hold = occupied ? 0 : d.hold + dt;
      if (d.hold >= DOOR.holdOpen) { d.target = 0; emit(w, 'door_close', { cx: d.cx, cz: d.cz }); }
    } else if (d.target === 0 && d.open > 0) d.open = Math.max(0, d.open - dt * DOOR.speed);
  }

  // enemies
  for (const e of w.enemies) {
    const def = ENEMIES[e.kind]; e.flash = Math.max(0, e.flash - dt * 4);
    if (e.state === 'dead') { e.dead = Math.min(1, e.dead + dt / 0.9); e.walk *= 0.9; continue; }
    const dx = p.x - e.x, dz = p.z - e.z, dist = Math.hypot(dx, dz);
    const sees = dist < def.sight && p.hp > 0 && hasLOS(w, e.x, e.z, p.x, p.z);
    if (e.state === 'idle') { if (sees) { e.state = 'chase'; emit(w, 'enemy_alert', { id: e.id }); } else continue; }
    let dy = Math.atan2(dx, dz) - e.yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy));
    if (sees && e.attackT < 0) e.yaw += clamp(dy, -def.turnRate * dt, def.turnRate * dt);
    e.cd = Math.max(0, e.cd - dt);
    if (e.attackT >= 0) {
      e.attackT += dt; e.walk *= 0.85;
      if (!e.struck && e.attackT >= def.attack.duration * def.attack.windup) {
        e.struck = true;
        if (dist < def.attack.reach) hurtPlayer(w, Math.round(def.attack.damage * diff.enemyDamage));
        emit(w, 'enemy_strike', { id: e.id });
      }
      if (e.attackT >= def.attack.duration) { e.attackT = -1; e.cd = def.attack.cooldown * diff.reaction; e.struck = false; }
    } else if (sees && dist > def.attack.range) {
      tryMove(w, e, Math.sin(e.yaw) * def.speed * dt, Math.cos(e.yaw) * def.speed * dt, def.radius);
      e.walk = Math.min(1, e.walk + dt * 3); e.phase += dt * 5.2;
    } else {
      e.walk = Math.max(0, e.walk - dt * 3);
      if (sees && dist <= def.attack.range + 0.1 && e.cd <= 0) { e.attackT = 0; e.struck = false; emit(w, 'enemy_windup', { id: e.id }); }
    }
  }

  // projectiles (substepped so fast flares cannot tunnel through walls)
  for (let i = w.projectiles.length - 1; i >= 0; i--) {
    const q = w.projectiles[i], def = WEAPONS[p.weapon]; q.life -= dt; q.vy -= def.gravity * dt;
    const speed = Math.hypot(q.vx, q.vy, q.vz), n = Math.ceil(speed * dt / 0.25); let hit = q.life <= 0;
    for (let k = 0; k < n && !hit; k++) {
      q.x += q.vx * dt / n; q.y += q.vy * dt / n; q.z += q.vz * dt / n;
      const cx = Math.floor(q.x / map.cell), cz = Math.floor(q.z / map.cell);
      if (q.y < 0.05 || (map.isInterior(q.x, q.z) && q.y > map.ceiling) || cellSolid(w, cx, cz)) hit = true;
      for (const pr of map.props) if (PROPS[pr.kind].radius > 0 && Math.hypot(q.x - pr.x, q.z - pr.z) < PROPS[pr.kind].radius && q.y < 1.3) hit = true;
      for (const e of w.enemies) if (e.state !== 'dead' && Math.hypot(q.x - e.x, q.z - e.z) < 0.5 && q.y > 0 && q.y < ENEMIES[e.kind].height) hit = true;
    }
    if (hit) { w.projectiles.splice(i, 1); explode(w, q.x, q.y, q.z, true); }
  }

  // pickups
  for (let i = w.pickups.length - 1; i >= 0; i--) {
    const it = w.pickups[i], def = PICKUPS[it.kind];
    if (Math.hypot(p.x - it.x, p.z - it.z) > 0.9) continue;
    let took = false;
    if (def.type === 'health' && p.hp < PLAYER.maxHp) { p.hp = Math.min(PLAYER.maxHp, p.hp + def.amount); took = true; }
    else if (def.type === 'armor' && p.armor < PLAYER.maxArmor) { p.armor = Math.min(PLAYER.maxArmor, p.armor + def.amount); took = true; }
    else if (def.type === 'ammo' && (p.ammo[def.ammo] || 0) < AMMO_MAX[def.ammo]) { p.ammo[def.ammo] = Math.min(AMMO_MAX[def.ammo], (p.ammo[def.ammo] || 0) + Math.round(def.amount * diff.ammoPickup)); took = true; }
    else if (def.type === 'key' && !p.keys.includes(def.key)) { p.keys.push(def.key); took = true; }
    if (took) { w.pickups.splice(i, 1); if (def.type !== 'key') w.stats.items++; emit(w, 'pickup', { kind: it.kind }); }
  }

  // secrets: found when the player stands in one of the secret's cells
  const pcx = Math.floor(p.x / map.cell), pcz = Math.floor(p.z / map.cell);
  for (const s of map.secrets) if (!w.secretsFound.includes(s.id) && s.cells.some(([cx, cz]) => cx === pcx && cz === pcz)) { w.secretsFound.push(s.id); w.stats.secrets++; emit(w, 'secret', { id: s.id }); }

  // resolution order matters: damage is settled first, so a player who dies this tick cannot also exit
  if (p.hp <= 0) { p.hp = 0; w.status = 'dead'; emit(w, 'player_died'); }
  else if (map.exits.some((x) => Math.hypot(p.x - x.x, p.z - x.z) < 1.4)) {
    w.status = 'complete'; w.endStats = { time: w.time, kills: w.stats.kills, items: w.stats.items, secrets: w.stats.secrets, total: w.stats.total, damageTaken: w.stats.damageTaken };
    emit(w, 'level_complete');
  }
}

/** Inventory carried into the next map / level-start checkpoint. Keys do not carry. */
export const carryOver = (w) => ({ hp: Math.max(1, w.player.hp), armor: w.player.armor, ammo: { ...w.player.ammo }, weapons: [...w.player.weapons] });

export function hashWorld(w) {
  const s = JSON.stringify(w, (k, v) => (typeof v === 'number' ? Math.round(v * 1e5) / 1e5 : v));
  let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h.toString(16).padStart(8, '0');
}
