// The player's weapons: damage and what a hit does, blasts, shots, the arc, swings, the fire key.
// Part of the deterministic simulation (world.js holds the order of a tick): nothing here touches DOM, Three, the clock or Math.random.
import { surfaceAt } from './surfaces.js';
import { activeLoad, applyLoadHit, loadedDef, spendLoad } from './ammoloads.js';
import { strikeChime } from './chimes.js';
import { AMMO_LOADS, BASH, ENEMIES, FX, GUARD, NOISE, PLAYER, PROPS, SUPPRESS, TICK, WEAPONS, DIFFICULTY } from './defs.js';
import { maybeDrop } from './drops.js';
import { noise, wakeEnemy, wardOf } from './enemies.js';
import { frighten } from './folk.js';
import { blastProps, gravDrop, gravInput, physAt, updatePhys, updateShoves } from './gravity.js';
import { hitCylinder, insideFuse, insideHit } from './hitvolume.js';
import { modDef, modTier } from './mods.js';
import { designate as mortarShot } from './mortar.js';
import { unisonMult } from './phases.js';
import { hurtPlayer } from './player.js';
import { sawStep } from './saw.js';
import { cellSolid, clamp, doorAtCell, emit, forwardVec, hidden, inWater, isMelee, lerp, rand, tryMove } from './simcore.js';
import { ceilingAt, floorAt, fxAt } from './terrain.js';
import * as DM from './dmath.js';

/** apply damage to an enemy; returns true if this killed it (and emits the death). Callers emit enemy_hit for survivors. */
export function damageEnemy(w, e, dmg, opts = {}) {
  const def = ENEMIES[e.kind];
  let plated = false; // did the plate turn this blow? (the penetrator load doubles what a plated creature takes)
  if (def.armor && !opts.splash && !opts.pierceArmor && !(def.armor.opens && e.attackT >= 0)) {
    // (a Bulwark Shell's carapace is open while it bashes,) plate on the front arc: only the shooter's side counts, splash and a harpoon bolt ignore
    // it
    if ((e.stunT || 0) > 0) dmg *= def.armor.stunMult ?? 1;
    else {
      const tx = w.player.x - e.x,
        tz = w.player.z - e.z,
        tl = Math.hypot(tx, tz) || 1;
      if ((DM.sin(e.yaw) * tx + DM.cos(e.yaw) * tz) / tl > def.armor.cos) {
        dmg *= def.armor.front;
        plated = true;
        emit(w, 'armor_hit', { id: e.id, x: e.x, z: e.z });
      }
    }
  }
  if (!def.ward && !def.node && !def.boss) {
    const A = wardOf(w, e);
    if (A) {
      dmg *= ENEMIES.acolyte.ward.reduce;
      emit(w, 'ward_hit', { id: e.id, x: e.x, z: e.z });
    }
  } // an awake Acolyte's ward
  if (def.shield && w.enemies.some((n) => ENEMIES[n.kind].node && n.state !== 'dead')) {
    dmg *= def.shield.reduce;
    emit(w, 'shield_hit', { id: e.id, x: e.x, z: e.z });
    // a staggered Cantor with its shield down takes more // the Cantor sings through its ring
  } else if (def.boss && (e.stunT || 0) > 0) dmg *= 1.5;
  if (def.unison) {
    const u = unisonMult(w, def);
    if (u < 1) {
      dmg *= u;
      if (u < 0.5) emit(w, 'shield_hit', { id: e.id, x: e.x, z: e.z });
    }
  } // the Hive Cantor takes a twentieth until its choir has fallen
  if (def.bell && e.rb?.last) dmg *= def.bell.exposed;
  if (opts.load) {
    const Q = opts.load;
    if (Q.plate && def.armor && (plated || opts.pierceArmor)) dmg *= Q.plate;
    if (Q.nodeMult && def.node) dmg *= Q.nodeMult;
  } // a load's own effect on the blow
  if (e.brittle && !opts.burn) {
    if (e.brittleTick == null) e.brittleTick = w.tick;
    if (e.brittleTick === w.tick) dmg *= e.brittle;
    else {
      e.brittle = 0;
      e.brittleTick = null;
    }
    // a chilled creature takes the next BLOW harder, once (every pellet of that volley: they land on one tick) // the Root Bell's heart is open in the
    // Last Note
  }
  if ((e.channelT ?? -1) >= 0 && dmg > 0 && !opts.burn) {
    e.channelT = -1;
    e.supCd = Math.max(e.supCd || 0, 1.8);
  } // hurting a channelling Sexton breaks the rite, and it needs a moment to start again
  const wasAlive = e.state !== 'dead';
  e.hp -= dmg;
  e.flash = 1;
  if (e.hold) e.hurtT = 0;
  const by = opts.by,
    // the player's blow, by gun and by attack number (event payload only)
    dealt = by && wasAlive && dmg > 0 ? { id: e.id, kind: e.kind, weapon: by.weapon ?? null, atk: by.atk ?? null, amount: Math.round(dmg * 100) / 100 } : null;
  if (def.peaceful && e.hp > 0) frighten(w, e, w.player.x, w.player.z); // hurt, it runs (from the one who did it)
  // being shot wakes you, whether or not you can see the shooter (a creature set alight wakes alone: it does not call its neighbours, the burst that
  // lit it already made its noise)
  if (e.state === 'idle' && e.hp > 0 && !def.node) wakeEnemy(w, e, !opts.burn, !!opts.burn);
  if (e.hp <= 0 && e.state !== 'dead') {
    e.state = 'dead';
    e.attackT = -1;
    e.lungeT = -1;
    e.chargeT = -1;
    e.channelT = -1;
    if (def.peaceful) {
      w.stats.innocents = (w.stats.innocents ?? 0) + 1;
      if (dealt) emit(w, 'dmg', { ...dealt, killed: true });
      emit(w, 'enemy_died', { id: e.id, kind: e.kind, x: e.x, z: e.z, folk: true, weapon: by?.weapon ?? null });
      emit(w, 'innocent', { id: e.id, kind: e.kind, x: e.x, z: e.z });
      return true;
    } // an innocent is not a kill, and leaves nothing
    w.stats.kills++;
    if (dealt) emit(w, 'dmg', { ...dealt, killed: true });
    emit(w, 'enemy_died', {
      id: e.id,
      kind: e.kind,
      x: e.x,
      z: e.z,
      weapon: by?.weapon ?? null,
      over: Math.round((-e.hp / (def.hp * DIFFICULTY[w.difficulty].enemyHp)) * 100) / 100,
    });
    maybeDrop(w, e);
    if (def.node) {
      emit(w, 'node_severed', { id: e.id, kind: e.kind, x: e.x, z: e.z });
      for (const c of w.enemies)
        if (!def.spawner && ENEMIES[c.kind].boss && (ENEMIES[c.kind].shield || ENEMIES[c.kind].echoReeds) && c.state !== 'dead') {
          c.stunT = ENEMIES[c.kind].stagger ?? 2;
          c.pulseT = -1;
          c.pulseCd = Math.max(c.pulseCd, 2.5);
        }
    }
    return true;
  }
  if (dealt) emit(w, 'dmg', { ...dealt, killed: false });
  return false;
}

// what a hit DOES to a creature that survives it ----------------------------------------------------------------------------------------------------
/** slow an enemy: k = the share of its speed taken away, t seconds; a stronger or longer slow wins, they do not stack */
function setSlow(e, k, t) {
  // diminishing returns: a creature that has just shaken a slow off cannot be slowed again at once (a held trigger keeps one slow going for at most
  // SLOW_MAX s, then it steadies for SLOW_IMMUNE s)
  if ((e.slowImm || 0) > 0) return;
  const cur = (e.slowT || 0) > 0 ? e.slowK || 0 : 0;
  e.slowK = Math.max(cur, k);
  e.slowT = Math.max(e.slowT || 0, t);
}

export const SLOW_MAX = 1.0,
  SLOW_IMMUNE = 0.9;

/** the speed multiplier a flinch or a rivet's slow leaves an enemy with */
export const moveMult = (e) => ((e.slowT || 0) > 0 ? 1 - (e.slowK || 0) : 1) * ((e.chillT || 0) > 0 ? 1 - (e.chillK ?? 0.4) : 1);

/**
 * `h` is a weapon's `hit` block or a melee move. flinch: a short stumble (`flinchK`, default 50%, slower) that is shorter for the heavy (÷ poise);
 * slow/slowT: the rivets; interrupt: inside that many metres the hit breaks the windup of the blow it lands on;
 * cancelLunge: it breaks a Gaunt's lunge windup; stun: a stagger (the elites take half, the bosses none). Bosses and nodes shrug off interrupts
 * (poise 3 and above).
 */
export function hitEffects(w, e, h, dist = 99) {
  if (!h || e.state === 'dead') return;
  const def = ENEMIES[e.kind],
    poise = def.poise ?? 1;
  if (h.flinch && !def.node) setSlow(e, h.flinchK ?? 0.5, Math.min(0.6, h.flinch / poise));
  if (h.slow && !def.node) setSlow(e, h.slow, h.slowT ?? 1);
  if (poise < 3 && !def.node) {
    if (h.interrupt && dist < h.interrupt && e.attackT >= 0 && !e.struck && (e.intCd || 0) <= 0) {
      e.attackT = -1;
      e.cd = Math.max(e.cd || 0, 0.5);
      e.intCd = 1.8;
    } // ...and it cannot be broken again for a moment: close range is strong, not a lock
    if (h.cancelLunge && def.lunge && (e.lungeT ?? -1) >= 0 && e.lungeT < def.lunge.windup && (e.intCd || 0) <= 0) {
      e.lungeT = -1;
      e.lungeHit = false;
      e.lungeCd = def.lunge.cooldown * 0.5;
      e.intCd = 1.8;
    }
  }
  if (h.stun && !def.node && poise < 8) e.stunT = Math.max(e.stunT || 0, h.stun / (poise >= 3 ? 2 : 1));
}

/*
 * the statuses a load leaves: a creature alight burns (and is put out by water), a chilled one thaws. Runs only once a load has hit something
 * (`w.loadFx`).
 */
export function loadFxStep(w, dt) {
  for (const e of w.enemies) {
    if (e.state === 'dead') {
      e.ignT = 0;
      e.chillT = 0;
      continue;
    }
    if (e.brittleTick != null && e.brittleTick < w.tick) {
      e.brittle = 0;
      e.brittleTick = null;
    } // the blow that used the brittleness is over: it is gone
    if ((e.ignT || 0) > 0) {
      const c = fxAt(w, e.x, e.z);
      if (c === 'w' || FX[c]?.water) {
        e.ignT = 0;
        emit(w, 'load_hit', { id: e.id, kind: e.kind, x: e.x, z: e.z, fx: 'quench' });
      } else {
        e.ignT -= dt;
        damageEnemy(w, e, (e.ignDps || 0) * dt, { burn: true });
        if (e.ignT <= 0) {
          e.ignT = 0;
          e.ignDps = 0;
        }
      }
    }
    if ((e.bleedT || 0) > 0) {
      e.bleedT -= dt;
      damageEnemy(w, e, (e.bleedDps || 0) * dt, { burn: true });
      if (e.bleedT <= 0) {
        e.bleedT = 0;
        e.bleedDps = 0;
      }
    } // the barbed bolt's wound
    if ((e.chillT || 0) > 0) {
      e.chillT -= dt;
      if (e.chillT <= 0) {
        e.chillT = 0;
        e.brittle = 0;
        e.brittleTick = null;
      }
    }
  }
}

/*
 * a load's mark on a creature that survived the shot (slag lights it unless it stands in water, rime chills it); the event tells the view and the
 * sound which
 */
function loadHitEffect(w, e, id) {
  const c = fxAt(w, e.x, e.z),
    fx = applyLoadHit(e, id, c === 'w' || !!FX[c]?.water);
  if (!fx) return;
  w.loadFx = true;
  emit(w, 'load_hit', { id: e.id, kind: e.kind, x: e.x, z: e.z, fx });
}

/** burning ground (the flare cannon): a patch of fire that burns the enemies standing in it for a few seconds. Plain data in w.burns. */
function ignite(w, x, y, z, B) {
  const gy = floorAt(w, x, z);
  if (y - gy > 1.6) return; // a flare that burst high on a wall leaves no fire on the floor far below
  // (not w.nextId: the ids of real entities steer their pathing, and a patch of fire must not shift them)
  w.burns.push({ id: 'b' + w.tick + '_' + w.burns.length, x, z, y: gy, r: B.r, t: B.t, max: B.t, dps: B.dps, ...(B.frost ? { frost: true } : {}) });
  while (w.burns.length > (B.max ?? 8)) w.burns.shift();
  emit(w, 'burn', { x, y: gy, z, r: B.r, t: B.t, ...(B.frost ? { frost: true } : {}) });
}

export function updateBurns(w, dt) {
  for (let i = w.burns.length - 1; i >= 0; i--) {
    const b = w.burns[i];
    b.t -= dt;
    if (b.t <= 0) {
      w.burns.splice(i, 1);
      continue;
    }
    for (const e of w.enemies) {
      if (e.state === 'dead') continue;
      const d = ENEMIES[e.kind];
      if (d.node || d.flying) continue;
      if (Math.hypot(e.x - b.x, e.z - b.z) < b.r + 0.2 && Math.abs((e.y ?? 0) - b.y) < 1.0) {
        if (b.frost) {
          e.chillT = Math.max(e.chillT || 0, 0.8);
          e.chillK = AMMO_LOADS.rime.chill.slow;
          e.ignT = 0;
          w.loadFx = true;
        } // a rime flare's ground chills whoever stands in it and puts their fire out
        else damageEnemy(w, e, b.dps * dt, { burn: true });
      }
    }
  }
}

/* * a cracked wall (a secret whose panel opens to a SHOT) gives way to a pellet, a bolt or a blast that reaches it */
function crackCell(w, cx, cz) {
  const d = doorAtCell(w, cx, cz);
  if (d?.hidden === 'shoot' && d.target === 0) openCrack(w, d);
}

function openCrack(w, d) {
  const c = w.map.cell;
  d.target = 1;
  d.hold = 0;
  emit(w, 'door_open', { cx: d.cx, cz: d.cz, secret: true, cracked: true, x: (d.cx + 0.5) * c, z: (d.cz + 0.5) * c });
}

function explode(w, x, y, z, ownerIsPlayer, def, struck = null, by = null) {
  emit(w, 'explode', { x, y, z, r: def.splash });
  noise(w, x, z, NOISE.explosion);
  if (w.map.hasCracks)
    for (const d of w.doors)
      if (d.hidden === 'shoot' && d.target === 0 && Math.hypot((d.cx + 0.5) * w.map.cell - x, (d.cz + 0.5) * w.map.cell - z) < def.splash + w.map.cell * 0.5)
        openCrack(w, d);
  if (def.burn) ignite(w, x, y, z, def.burn);
  for (const e of w.enemies) {
    if (e.state === 'dead') continue;
    const ed = ENEMIES[e.kind],
      base = e.y + (e.lift ?? (ed.hover ?? 0) * (1 - Math.min(1, e.dead ?? 0))),
      lo = ed.hover || e.lift != null ? 0.3 : 1.0,
      body = ed.height,
      // measured from the blast's own height on the body (1 m up, or higher on a tall one): a flare on the Cantor's head is not 3 m from it
      d = Math.hypot(x - e.x, y - (base + Math.min(Math.max(y - base, lo), Math.max(lo, body - 1.0))), z - e.z);
    if (d < def.splash) {
      let dmg = def.splashDamage * (1 - d / def.splash) + def.direct;
      if (e === struck && def.directHit) dmg += def.directHit;
      if (ed.node && def.nodeMult) dmg *= def.nodeMult; // the rocket's direct hit, and a bell node takes the blast twice over
      const killed = damageEnemy(w, e, dmg, def.load ? { splash: true, load: AMMO_LOADS[def.load], by } : { splash: true, by });
      if (def.load && !killed) loadHitEffect(w, e, def.load);
      const k = (def.knock ?? 0.8) * (1 - d / def.splash),
        nx = (e.x - x) / (d || 1),
        nz = (e.z - z) / (d || 1);
      tryMove(w, e, nx * k, nz * k, ENEMIES[e.kind].radius);
      if (!killed) emit(w, 'enemy_hit', { id: e.id, kind: e.kind, x: e.x, z: e.z });
    }
  }
  if (w.phys) blastProps(w, x, y, z, def);
  const p = w.player,
    d = Math.hypot(x - p.x, y - (p.y + PLAYER.eye), z - p.z);
  if (ownerIsPlayer && d < def.splash * 0.65)
    hurtPlayer(w, Math.round(def.splashDamage * def.selfDamage * (1 - d / (def.splash * 0.65))), { x, z }, 'self:own_blast');
}

// -------------------------------------------- weapons
/** Scatter def.pellets rays from the eye. Pellets stop at walls, closed doors, solid props, and the first enemy they touch. */
function fireHitscan(w, def, cone) {
  const p = w.player,
    map = w.map,
    hits = new Map(),
    push = new Map(),
    heads = new Set(),
    struckChimes = new Set();
  let impacts = 0;
  for (let i = 0; i < def.pellets; i++) {
    const f = forwardVec({ yaw: p.yaw + (rand(w) * 2 - 1) * cone, pitch: p.pitch + (rand(w) * 2 - 1) * cone });
    let x = p.x,
      y = p.y + PLAYER.eye,
      z = p.z,
      target = /** @type {any} */ (null),
      stop = false,
      dist = 0;
    const march = (skipE) => {
      target = null;
      for (dist += 0.25; dist <= def.range && !target && !stop; dist += 0.25) {
        x += f[0] * 0.25;
        y += f[1] * 0.25;
        z += f[2] * 0.25;
        if (y < floorAt(w, x, z) + 0.02 || y > ceilingAt(w, x, z) || cellSolid(w, Math.floor(x / map.cell), Math.floor(z / map.cell))) {
          stop = true;
          if (map.hasCracks) crackCell(w, Math.floor(x / map.cell), Math.floor(z / map.cell));
          break;
        }
        for (const pr of map.props)
          if (PROPS[pr.kind].radius > 0 && Math.hypot(x - pr.x, z - pr.z) < PROPS[pr.kind].radius && y < floorAt(w, pr.x, pr.z) + 1.3) {
            stop = true;
            if (pr.kind === 'chime' && w.chimes && !struckChimes.has(pr)) struckChimes.add(pr);
          }
        if (!stop && w.phys && physAt(w, x, y, z)) stop = true;
        if (stop) break;
        for (const e of w.enemies)
          if (e.state !== 'dead' && e !== skipE && insideHit(e, x, y, z, 0.05)) {
            target = e;
            break;
          }
      }
    };
    march(null);
    for (let through = 0, first = true; target && through <= (def.through ?? 0); through++, first = false) {
      const fall = dist <= def.falloffStart ? 1 : 1 - (1 - def.falloffMin) * Math.min(1, (dist - def.falloffStart) / (def.range - def.falloffStart));
      let mult = first ? 1 : AMMO_LOADS[def.load].throughMult;
      if (def.head && !ENEMIES[target.kind].node) {
        const c = hitCylinder(target);
        if (y >= c.y0 + (c.y1 - c.y0) * def.head.from) mult = def.head.mult;
      } // the carbine: a round in the top of the body
      const killed = damageEnemy(
        w,
        target,
        def.damage * fall * mult,
        def.load ? { load: AMMO_LOADS[def.load], by: { weapon: p.weapon, atk: p.atk } } : { by: { weapon: p.weapon, atk: p.atk } },
      );
      if (mult > 1) {
        heads.add(target);
        emit(w, 'headshot', { id: target.id, x: target.x, y, z: target.z, killed });
      }
      if (!killed) hits.set(target.id, target);
      const k = push.get(target.id) || { e: target, x: 0, z: 0 };
      k.x += f[0] * def.knock * fall;
      k.z += f[2] * def.knock * fall;
      push.set(target.id, k); // applied after the volley: pellets are simultaneous
      if (through < (def.through ?? 0)) {
        const t0 = target;
        march(t0);
        if (!target) break;
      } // the penetrator goes on through one more body
    }
    if (!target && stop && impacts < 3 && i % 3 === 0) {
      emit(w, 'impact', { x, y, z, surface: surfaceAt(w.map, x, y, z) });
      impacts++;
    }
  }
  for (const pr of struckChimes) strikeChime(w, pr, emit); // a shot that stopped on a chime struck it (once a volley)
  // how far it was when it was hit: before the knockback carries it away
  const range0 = new Map([...hits.values()].map((e) => [e, Math.hypot(e.x - p.x, e.z - p.z)]));
  for (const k of push.values()) tryMove(w, k.e, k.x, k.z, ENEMIES[k.e.kind].radius);
  for (const e of hits.values())
    if (e.state !== 'dead') {
      if (def.load) loadHitEffect(w, e, def.load);
      hitEffects(w, e, def.hit, range0.get(e));
      if (heads.has(e)) hitEffects(w, e, { flinch: def.head.flinch });
      emit(w, 'enemy_hit', { id: e.id, kind: e.kind, x: e.x, z: e.z });
    }
}

/**
 * The harpoon bolt: one ray from the eye, it stops at walls, closed doors and solid props, and goes THROUGH bodies: up to 1 + def.pierce of them, the
 * later ones for def.pierceDamage of the damage.
 * Emits 'bolt' (the line it travelled, for the view's streak and the bolt left in the wall) and, on a wall, an 'impact'.
 */
function fireBolt(w, def, cone) {
  const p = w.player,
    map = w.map,
    hit = [],
    f = forwardVec({ yaw: p.yaw + (rand(w) * 2 - 1) * cone, pitch: p.pitch + (rand(w) * 2 - 1) * cone });
  const x0 = p.x,
    y0 = p.y + PLAYER.eye,
    z0 = p.z;
  let x = x0,
    y = y0,
    z = z0,
    stop = false,
    dist = 0;
  for (dist = 0.25; dist <= def.range && !stop && hit.length <= def.pierce; dist += 0.25) {
    x += f[0] * 0.25;
    y += f[1] * 0.25;
    z += f[2] * 0.25;
    if (y < floorAt(w, x, z) + 0.02 || y > ceilingAt(w, x, z) || cellSolid(w, Math.floor(x / map.cell), Math.floor(z / map.cell))) {
      stop = true;
      if (map.hasCracks) crackCell(w, Math.floor(x / map.cell), Math.floor(z / map.cell));
      break;
    }
    for (const pr of map.props)
      if (PROPS[pr.kind].radius > 0 && Math.hypot(x - pr.x, z - pr.z) < PROPS[pr.kind].radius && y < floorAt(w, pr.x, pr.z) + 1.3) stop = true;
    if (!stop && w.phys && physAt(w, x, y, z)) stop = true;
    if (stop) break;
    for (const e of w.enemies)
      if (e.state !== 'dead' && !hit.includes(e) && insideHit(e, x, y, z, 0.05)) {
        hit.push(e);
        break;
      }
  }
  const survivors = [];
  hit.forEach((e, i) => {
    const mult = i === 0 ? 1 : def.pierceDamage;
    if (
      !damageEnemy(
        w,
        e,
        def.damage * mult,
        def.load
          ? { pierceArmor: def.pierceArmor, load: AMMO_LOADS[def.load], by: { weapon: p.weapon, atk: p.atk } }
          : { pierceArmor: def.pierceArmor, by: { weapon: p.weapon, atk: p.atk } },
      )
    )
      survivors.push(e);
    tryMove(w, e, f[0] * def.knock * mult, f[2] * def.knock * mult, ENEMIES[e.kind].radius);
  });
  if (stop) emit(w, 'impact', { x, y, z, surface: surfaceAt(w.map, x, y, z) });
  emit(w, 'bolt', { x0, y0, z0, x1: x, y1: y, z1: z, stuck: stop });
  const pin = def.hit?.pin;
  for (const e of survivors)
    if (e.state !== 'dead') {
      if (def.load) loadHitEffect(w, e, def.load);
      hitEffects(w, e, def.hit, Math.hypot(e.x - x0, e.z - z0));
      const ed = ENEMIES[e.kind];
      if (def.barbed) {
        // the barbed bolt pins a lunging or charging creature, staggers a Bulwark, and (tier two) the wound bleeds
        const B = def.barbed;
        if (!ed.boss && !ed.node && ((e.lungeT ?? -1) >= 0 || (e.chargeT ?? -1) >= 0)) {
          e.stunT = Math.max(e.stunT || 0, B.pin);
          e.attackT = -1;
          e.lungeT = -1;
          e.chargeT = -1;
          emit(w, 'pin', { id: e.id, x: e.x, z: e.z });
        } else if (ed.armor?.opens !== undefined && !ed.boss) {
          e.stunT = Math.max(e.stunT || 0, B.pin);
          e.attackT = -1;
          emit(w, 'pin', { id: e.id, x: e.x, z: e.z });
        }
        if (B.bleed) {
          e.bleedT = Math.max(e.bleedT || 0, B.bleed.t);
          e.bleedDps = B.bleed.dps;
          w.loadFx = true;
        }
      }
      if (pin && !ed.boss && !ed.node && !ed.armor && (ed.poise ?? 1) < 3) {
        // a wall close behind it: the bolt nails it there
        let walled = false;
        for (let s = 0.4; s <= pin.wall && !walled; s += 0.25) {
          const qx = e.x + f[0] * s,
            qz = e.z + f[2] * s;
          walled =
            cellSolid(w, Math.floor(qx / map.cell), Math.floor(qz / map.cell)) ||
            map.props.some((pr) => PROPS[pr.kind].radius > 0 && Math.hypot(qx - pr.x, qz - pr.z) < PROPS[pr.kind].radius);
        }
        if (walled) {
          e.stunT = Math.max(e.stunT || 0, pin.t);
          e.attackT = -1;
          e.lungeT = -1;
          e.chargeT = -1;
          emit(w, 'pin', { id: e.id, x: e.x, z: e.z });
        }
      }
      emit(w, 'enemy_hit', { id: e.id, kind: e.kind, x: e.x, z: e.z });
    }
}

/**
 * is the straight line between two points free of walls, closed doors, solid props, floor and ceiling? (the arc's line of sight: a body behind a
 * corner is not a target)
 */
export function rayClear(w, x0, y0, z0, x1, y1, z1, skipPhys = false) {
  const map = w.map,
    dx = x1 - x0,
    dy = y1 - y0,
    dz = z1 - z0,
    n = Math.max(1, Math.ceil(Math.hypot(dx, dy, dz) / 0.25));
  for (let i = 1; i < n; i++) {
    const t = i / n,
      x = x0 + dx * t,
      y = y0 + dy * t,
      z = z0 + dz * t;
    if (y < floorAt(w, x, z) + 0.02 || y > ceilingAt(w, x, z) || cellSolid(w, Math.floor(x / map.cell), Math.floor(z / map.cell))) return false;
    for (const pr of map.props)
      if (PROPS[pr.kind].radius > 0 && Math.hypot(x - pr.x, z - pr.z) < PROPS[pr.kind].radius && y < floorAt(w, pr.x, pr.z) + 1.3) return false;
    if (!skipPhys && w.phys && physAt(w, x, y, z)) return false;
  }
  return true;
}

/** the point on a body the arc strikes: its torso, 60% of the way up the drawn volume (a flyer's included) */
const arcPoint = (e) => {
  const c = hitCylinder(e);
  return [c.x, c.y0 + (c.y1 - c.y0) * 0.6, c.z];
};

/**
 * The charge-arc lamp: lock onto the best body inside a cone around the view ray (the sights narrow it), then jump the arc from body to body. `f`
 * (0..1) is how far it was charged: 0 is the short tap arc;
 * more is a longer, harder, wider-forking bolt (WEAPONS.arc.charge). A body standing in water conducts to the others in the same water; a Drone-Gill
 * is stunned, a bell node takes extra (WEAPONS.arc.vael).
 * Emits 'arc' (the paths it travelled, for the view) and 'enemy_hit'.
 */
function fireArc(w, def, f = 0) {
  const p = w.player,
    C = def.charge,
    W = def.water,
    V = def.vael,
    ex = p.x,
    ey = p.y + PLAYER.eye,
    ez = p.z,
    dir = forwardVec(p);
  const base = lerp(def.damage, C.damage, f),
    range = lerp(def.range, C.range, f),
    chain = def.chain + Math.round(f * (C.chain - def.chain)),
    fall = lerp(def.chainFalloff, C.chainFalloff, f),
    jump = lerp(def.jump, C.jump, f);
  const cone = (def.lock.hip * (1 - p.ads) + def.lock.ads * p.ads) * (1 + 0.5 * f),
    forks = f > 0.3 ? C.forks : 1;
  const cands = [];
  for (const e of w.enemies) {
    if (e.state === 'dead' || ENEMIES[e.kind].peaceful) continue;
    const [tx, ty, tz] = arcPoint(e),
      dx = tx - ex,
      dy = ty - ey,
      dz = tz - ez,
      d = Math.hypot(dx, dy, dz);
    if (d > range || d < 0.3) continue;
    const ang = DM.acos(Math.min(1, Math.max(-1, (dx * dir[0] + dy * dir[1] + dz * dir[2]) / d))),
      slack = DM.atan2(hitCylinder(e).r, d); // a wide body is easier to lock than a thin one at the same distance
    if (ang - slack > cone || !rayClear(w, ex, ey, ez, tx, ty, tz)) continue;
    cands.push({ e, pt: [tx, ty, tz], score: ang + d * 0.004 });
  }
  cands.sort((a, b) => a.score - b.score);
  // the first branch takes the best body; a second branch needs a body in a clearly different direction (a fork, not two strikes down the same line),
  // and nothing is struck twice
  const starts = cands.slice(0, 1);
  if (forks > 1 && cands.length > 1) {
    const dirTo = (c) => {
        const dx = c.pt[0] - ex,
          dy = c.pt[1] - ey,
          dz = c.pt[2] - ez,
          l = Math.hypot(dx, dy, dz) || 1;
        return [dx / l, dy / l, dz / l];
      },
      d0 = dirTo(cands[0]);
    const second = cands.slice(1).find((c) => {
      const d = dirTo(c);
      return DM.acos(Math.min(1, Math.max(-1, d0[0] * d[0] + d0[1] * d[1] + d0[2] * d[2]))) > 0.06;
    });
    if (second) starts.push(second);
  }
  const paths = [],
    hit = new Set(starts.map((s) => s.e)),
    struck = [];
  for (const start of starts) {
    const path = [];
    let cur = start,
      dmg = base;
    for (let j = 0; j <= chain && cur; j++) {
      path.push(cur.pt);
      hit.add(cur.e);
      struck.push([cur.e, dmg]);
      dmg *= fall;
      /** @type {any} */
      let next = null,
        nd = jump;
      for (const e of w.enemies) {
        if (e.state === 'dead' || hit.has(e) || ENEMIES[e.kind].peaceful) continue;
        const pt = arcPoint(e),
          d = Math.hypot(pt[0] - cur.pt[0], pt[1] - cur.pt[1], pt[2] - cur.pt[2]);
        if (d < nd && rayClear(w, cur.pt[0], cur.pt[1], cur.pt[2], pt[0], pt[1], pt[2])) {
          nd = d;
          next = { e, pt };
        }
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
      if (conducted >= W.max) break;
      if (o.state === 'dead' || hit.has(o) || ENEMIES[o.kind].flying || !inWater(w, o.x, o.z) || Math.hypot(o.x - e.x, o.z - e.z) > W.r) continue;
      hit.add(o);
      struck.push([o, base * W.mult]);
      paths.push([arcPoint(e), arcPoint(o)]);
      conducted++;
    }
  }
  let end = null;
  if (!cands.length) {
    let x = ex,
      y = ey,
      z = ez;
    for (let s = 0.25; s <= range; s += 0.25) {
      const nx = ex + dir[0] * s,
        ny = ey + dir[1] * s,
        nz = ez + dir[2] * s;
      if (!rayClear(w, x, y, z, nx, ny, nz)) break;
      x = nx;
      y = ny;
      z = nz;
    }
    end = [x, y, z];
  } // a miss still crackles, out to the wall or the end of its reach
  emit(w, 'arc', { x0: ex, y0: ey, z0: ez, pts: paths[0] ?? [], paths, end, charge: f });
  for (const [e, dmg0] of struck) {
    const ed = ENEMIES[e.kind];
    let dmg = dmg0;
    if (ed.node) dmg *= V.nodeMult;
    if (V.kinds.includes(e.kind)) e.stunT = Math.max(e.stunT || 0, V.stun);
    if (!damageEnemy(w, e, dmg, { by: { weapon: p.weapon, atk: p.atk } })) {
      hitEffects(w, e, def.hit);
      emit(w, 'enemy_hit', { id: e.id, kind: e.kind, x: e.x, z: e.z });
    }
  }
}

// melee
// --------------------
/** the numbers of a swing by its name: 'bash' (key V), 'jab' / 'heavy' (the fists) or a found weapon's id */
/* * the weapon a swing is made with, for the stats (the fists' jab and heavy are the fists, the quick bash is the bash) */
export const swingWeapon = (k) => (k === 'jab' || k === 'heavy' ? 'fists' : k);

const swingDef = (k) => (k === 'bash' ? BASH : k === 'jab' ? WEAPONS.fists.swing : k === 'heavy' ? WEAPONS.fists.charge.heavy : WEAPONS[k]?.swing);

function startSwing(w, kind) {
  const p = w.player,
    S = swingDef(kind);
  if (!S || p.swingT >= 0) return false;
  p.atk = (p.atk ?? 0) + 1;
  p.swingAtk = p.atk; // every swing is an attack with a number, like a shot
  p.swingT = 0;
  p.swingKind = kind;
  p.swingHit = false;
  p.cooldown = Math.max(p.cooldown, S.windup + S.recover);
  p.charge = 0;
  p.sprinting = false;
  p.recover = 0; // a swing drops the sights and the sprint
  emit(w, 'swing', { kind, heavy: kind === 'heavy', atk: p.atk, weapon: swingWeapon(kind) });
  return true;
}

function updateSwing(w, dt) {
  const p = w.player;
  if (p.swingT < 0) return;
  const S = swingDef(p.swingKind);
  if (!S) {
    p.swingT = -1;
    return;
  }
  p.swingT += dt;
  if (!p.swingHit && p.swingT >= S.windup) {
    p.swingHit = true;
    resolveSwing(w, S);
  }
  if (p.swingT >= S.windup + S.recover) p.swingT = -1;
}

/** the blow lands: every body (the best-aligned one, or all of them for a cleave) inside reach and arc, with a clear line, takes it */
function resolveSwing(w, S) {
  const p = w.player,
    fx = -DM.sin(p.yaw),
    fz = -DM.cos(p.yaw),
    ey = p.y + PLAYER.eye,
    found = [];
  for (const e of w.enemies) {
    if (e.state === 'dead') continue;
    const c = hitCylinder(e),
      dx = c.x - p.x,
      dz = c.z - p.z,
      d = Math.hypot(dx, dz);
    if (d - c.r > S.reach || c.y1 < p.y + 0.15 || c.y0 > ey + 0.4) continue;
    const ang = DM.acos(clamp((dx * fx + dz * fz) / (d || 1), -1, 1)),
      slack = DM.atan2(c.r, Math.max(d, 0.01));
    if (d > 0.05 && ang - slack > S.arc / 2) continue;
    if (!rayClear(w, p.x, ey - 0.3, p.z, c.x, clamp(ey - 0.4, c.y0 + 0.2, c.y1 - 0.2), c.z)) continue;
    found.push({ e, d, ux: dx / (d || 1), uz: dz / (d || 1), rank: ang * 2 + d * 0.05 });
  }
  found.sort((a, b) => a.rank - b.rank);
  let landed = false;
  const ripo = (p.riposteT || 0) > 0;
  for (const { e, d, ux, uz } of S.cleave ? found : found.slice(0, 1)) {
    const def = ENEMIES[e.kind],
      poise = Math.max(1, def.poise ?? 1);
    let dmg = S.damage;
    if (ripo) dmg *= GUARD.riposteMult;
    if (S.backstab) {
      const tx = p.x - e.x,
        tz = p.z - e.z,
        tl = Math.hypot(tx, tz) || 1;
      if (e.state === 'idle' || (DM.sin(e.yaw) * tx + DM.cos(e.yaw) * tz) / tl < -0.2) dmg *= S.backstab;
    } // asleep, or turned away
    landed = true;
    const killed = damageEnemy(w, e, dmg, { melee: true, pierceArmor: !!S.ignorePlate, by: { weapon: swingWeapon(p.swingKind), atk: p.swingAtk ?? null } });
    if (!killed) {
      if (S.knock) tryMove(w, e, (ux * S.knock) / poise, (uz * S.knock) / poise, def.radius);
      if (S.pull && poise < 3) {
        const pl = Math.min(S.pull, Math.max(0, d - (def.hitRadius ?? def.radius) - PLAYER.radius - 0.4));
        if (pl > 0) tryMove(w, e, -ux * pl, -uz * pl, def.radius);
      }
      hitEffects(w, e, S, d);
      emit(w, 'enemy_hit', { id: e.id, kind: e.kind, x: e.x, z: e.z });
    }
    emit(w, 'melee_hit', { x: e.x, z: e.z, kind: p.swingKind, killed, riposte: ripo });
  }
  if (landed) {
    if (ripo) p.riposteT = 0;
    noise(w, p.x, p.z, NOISE.melee);
  }
}

/**
 * a charging weapon (the lamp, the fists): the fire key charges it, RELEASING fires it. A tap (released before it counts as a charge) is the light
 * attack; a tap that lands during a cooldown is kept for a moment, not lost.
 */
function chargeInput(w, cmd, def, canAct) {
  const p = w.player,
    C = def.charge;
  if (p.sprinting || p.switchT > 0 || p.swingT >= 0) {
    p.charge = 0;
    p.queuedT = 0;
    return;
  }
  const release = (c) => {
    if (def.kind === 'melee') startSwing(w, c >= C.max - 0.05 ? 'heavy' : 'jab');
    else fireWeapon(w, c);
  };
  if ((p.queuedT || 0) > 0) {
    p.queuedT -= TICK;
    if (canAct) {
      p.queuedT = 0;
      release(p.queuedC || 0);
    }
    return;
  }
  if (cmd.fire) {
    const before = p.charge || 0;
    p.charge = Math.min(C.max, before + TICK);
    if (before < C.min && p.charge >= C.min) emit(w, 'charge_start', { weapon: p.weapon });
    if (before < C.max && p.charge >= C.max) emit(w, 'charge_full', { weapon: p.weapon });
  } else if ((p.charge || 0) > 0) {
    const c = p.charge;
    p.charge = 0;
    if (canAct) release(c);
    else {
      p.queuedT = 0.15;
      p.queuedC = c;
    }
  }
}

function fireWeapon(w, charge = 0) {
  const p = w.player,
    def0 = WEAPONS[p.weapon],
    // the gun as a mod leaves it
    def = p.mods ? modDef(def0, p.weapon, p, { tier: (id) => modTier(w, id), ammo: p.ammo[def0.ammo], spin: p.spinT }) : def0;
  if (def.kind === 'melee') {
    startSwing(w, p.weapon === 'fists' ? 'jab' : p.weapon);
    return;
  }
  const ldId = p.loadSel ? activeLoad(p, p.weapon) : null; // a selected load with enough in it is fired INSTEAD of the standard ammunition
  if (!ldId && (p.ammo[def.ammo] || 0) < (def.cost ?? 1)) {
    p.cooldown = 0.4;
    emit(w, 'dry');
    return;
  }
  // the lamp: 0 = the tap arc (one cell); a charge spends more cells for a bigger bolt, as many as are left
  let cf = 0,
    cost = def.cost ?? 1;
  if (def.kind === 'arc' && def.charge) {
    const C = def.charge;
    cf = charge < C.min ? 0 : Math.min(1, (charge - C.min) / (C.max - C.min));
    cost = cf === 0 ? 1 : 1 + Math.round(cf * (C.cells - 1));
    const have = p.ammo[def.ammo];
    if (cost > have) {
      cf = (cf * (have - 1)) / Math.max(1, cost - 1);
      cost = have;
    }
  }
  if (ldId) {
    if (spendLoad(p, p.weapon, ldId)) emit(w, 'load_empty', { gun: p.weapon, load: ldId });
  } else p.ammo[def.ammo] -= cost;
  const fdef = ldId ? loadedDef(def, p.weapon, ldId) : def;
  p.cooldown = def.cooldown + cf * (def.charge?.recover ?? 0);
  p.kick = (def.kick ?? 0.06) * (1 + 6 * cf);
  w.stats.shots++;
  p.atk = (p.atk ?? 0) + 1; // (every shot has a number, carried by a flare or a rocket to where it lands)
  // accuracy: hip spread grows with movement; aiming tightens it. RNG draws happen in a fixed order so replays are deterministic.
  const moveFrac = Math.min(1, Math.hypot(p.vx, p.vz) / PLAYER.speed),
    sp = def.spread;
  const heat = p.heat || 0,
    cone =
      (sp.hip * (1 + sp.moveFactor * moveFrac) * (1 - p.ads) + sp.ads * p.ads) *
      (1 + heat * (def.heatCone || 0)) *
      (1 + SUPPRESS.cone * Math.min(1, (p.suppT || 0) / SUPPRESS.time));
  if (def.heatPerShot) p.heat = Math.min(1, heat + def.heatPerShot); // holding the trigger blooms the pattern
  if (def.kind === 'arc') fireArc(w, def, cf);
  else if (def.kind === 'hitscan') (def.pierce != null ? fireBolt : fireHitscan)(w, fdef, cone);
  else if (def.designate) {
    // the mortar throws the shell TO the point the crosshair rests on (the landing, not the aim, is what the unsteady hand scatters)
    const f = forwardVec(p),
      r = [DM.cos(p.yaw), 0, -DM.sin(p.yaw)],
      mRight = def.muzzle.right * (1 - p.ads),
      mDown = def.muzzle.down * (1 - 0.7 * p.ads),
      jitter = [(rand(w) * 2 - 1) * cone, (rand(w) * 2 - 1) * cone];
    const from = [p.x + f[0] * def.muzzle.fwd + r[0] * mRight, p.y + PLAYER.eye + f[1] * def.muzzle.fwd - mDown, p.z + f[2] * def.muzzle.fwd + r[2] * mRight],
      s = mortarShot(w, p, def, f, from, jitter);
    w.projectiles.push({
      id: w.nextId++,
      weapon: p.weapon,
      x: from[0],
      y: from[1],
      z: from[2],
      vx: s.vx,
      vy: s.vy,
      vz: s.vz,
      g: s.g,
      life: s.T + 1.5,
      atk: p.atk,
    });
  } else {
    const f = forwardVec({ yaw: p.yaw + (rand(w) * 2 - 1) * cone, pitch: p.pitch + (rand(w) * 2 - 1) * cone }),
      r = [DM.cos(p.yaw), 0, -DM.sin(p.yaw)];
    // the weapon is held right and low at the hip; at the sights it is centred, so the shot leaves along the crosshair
    const mRight = def.muzzle.right * (1 - p.ads),
      mDown = def.muzzle.down * (1 - 0.7 * p.ads);
    const pos = [p.x + f[0] * def.muzzle.fwd + r[0] * mRight, p.y + PLAYER.eye + f[1] * def.muzzle.fwd - mDown, p.z + f[2] * def.muzzle.fwd + r[2] * mRight];
    w.projectiles.push({
      id: w.nextId++,
      weapon: p.weapon,
      x: pos[0],
      y: pos[1],
      z: pos[2],
      vx: f[0] * def.speed,
      vy: f[1] * def.speed,
      vz: f[2] * def.speed,
      life: 4,
      atk: p.atk,
      ...(ldId ? { load: ldId } : {}),
    });
  }
  emit(w, 'fire', { weapon: p.weapon, atk: p.atk, charge: cf, ...(ldId ? { load: ldId } : {}), ...(def.mod ? { mod: def.mod } : {}) });
  noise(w, p.x, p.z, (NOISE[p.weapon] ?? 22) * (1 + 0.6 * cf)); // (a modded shot says which mod: the double barrel is heard twice)
  hidden(w, '_fireTick', w.tick); // the creatures read it later in this same tick (a dodge); never saved, never hashed
}

/** swings, the quick bash, the fire key and the held tools */
export function weaponInput(w, cmd, dt) {
  const p = w.player;
  // swings in progress, the quick bash (V), the fire key. A charging weapon (the lamp, the fists) charges while the key is held and fires on release.
  updateSwing(w, dt);
  if (cmd.melee && p.swingT < 0 && p.switchT <= 0 && p.hp > 0) {
    if (isMelee(p.weapon)) {
      if (p.cooldown <= 0) startSwing(w, p.weapon === 'fists' ? 'jab' : p.weapon);
    } else startSwing(w, 'bash');
  }
  // the rivet driver's spin-up climbs while the trigger is held and runs down when it is let go
  if (p.mods?.spinup) p.spinT = cmd.fire && p.weapon === 'rivet' ? Math.min(2, (p.spinT || 0) + dt) : Math.max(0, (p.spinT || 0) - 2.5 * dt);
  // no firing mid-switch, mid-swing or from the sprint pose
  const canAct = p.cooldown <= 0 && p.switchT <= 0 && !p.sprinting && p.recover <= 0 && p.swingT < 0;
  const wdef = WEAPONS[p.weapon];
  if (p.saw && !wdef.saw) {
    p.saw.spin = 0;
    p.saw.eng = false;
  } // a saw put away stops running
  if (p.grav && !wdef.grav) gravDrop(w); // a fork put away lets go of what it holds
  if (wdef.saw)
    sawStep(w, cmd, wdef, dt); // the chainsaw (hold to rev and cut, saw.js)
  else if (wdef.grav)
    gravInput(w, cmd, wdef, canAct, dt); // the tuning-fork (gravity.js)
  else if (wdef.charge) chargeInput(w, cmd, wdef, canAct);
  else if (cmd.fire && canAct) fireWeapon(w);

  updateShoves(w, dt);
  updatePhys(w, dt); // creatures a punt is carrying, and the movable props (both do nothing unless there are some)
}

/** the player's flying shots */
export function updateProjectiles(w, dt) {
  const p = w.player,
    map = w.map;
  // projectiles (substepped so fast flares cannot tunnel through walls)
  for (let i = w.projectiles.length - 1; i >= 0; i--) {
    const q = w.projectiles[i],
      def = WEAPONS[q.weapon ?? 'flare'];
    q.life -= dt;
    q.vy -= (q.g ?? def.gravity) * dt; // projectiles keep their own weapon stats after you switch away
    const speed = Math.hypot(q.vx, q.vy, q.vz),
      n = Math.ceil((speed * dt) / 0.25);
    let hit = q.life <= 0,
      struck = null;
    for (let k = 0; k < n && !hit; k++) {
      q.x += (q.vx * dt) / n;
      q.y += (q.vy * dt) / n;
      q.z += (q.vz * dt) / n;
      const cx = Math.floor(q.x / map.cell),
        cz = Math.floor(q.z / map.cell);
      if (q.y < floorAt(w, q.x, q.z) + 0.05 || q.y > ceilingAt(w, q.x, q.z) || cellSolid(w, cx, cz)) hit = true;
      for (const pr of map.props)
        if (PROPS[pr.kind].radius > 0 && Math.hypot(q.x - pr.x, q.z - pr.z) < PROPS[pr.kind].radius && q.y < floorAt(w, pr.x, pr.z) + 1.3) hit = true;
      if (w.phys && physAt(w, q.x, q.y, q.z)) hit = true;
      for (const e of w.enemies)
        if (e.state !== 'dead' && insideFuse(e, q.x, q.y, q.z)) {
          hit = true;
          struck ??= e;
        }
    }
    if (hit) {
      w.projectiles.splice(i, 1);
      const sd = q.load ? loadedDef(def, q.weapon, q.load) : def;
      explode(w, q.x, q.y, q.z, true, p.mods ? modDef(sd, q.weapon, p, { tier: (id) => modTier(w, id) }) : sd, struck, {
        weapon: q.weapon ?? 'flare',
        atk: q.atk ?? null,
      });
    }
  }
}
