// The player: harm, the lamp, vacuum, being thrown through the air, walking, the weapon keys, the Use key.
// Part of the deterministic simulation (world.js holds the order of a tick): nothing here touches DOM, Three, the clock or Math.random.
import { inVacuum, lockBusy } from './airlock.js';
import { cycleLoad } from './ammoloads.js';
import { carCovers, carDeckY, carState } from './cars.js';
import { chimeTarget, playTree, strikeChime } from './chimes.js';
import { trimCorpses } from './corpses.js';
import {
  AMMO_MAX,
  CARS,
  CORPSES,
  DOOR,
  ENEMIES,
  FX,
  GRAFT,
  GUARD,
  LANTERN,
  LOCK,
  LOWG,
  MELEE_ORDER,
  PITCH_LIMIT,
  PLAYER,
  SLOT_KEYS,
  TICK,
  VACUUM,
  WEAPONS,
} from './defs.js';
import { patchAt } from './enemies.js';
import { turnMirror } from './place.js';
import { activateSwitch, updateSectors } from './script.js';
import { blockedCircle, clamp, doorAtCell, emit, flowPush, isMelee, owns, tryMove } from './simcore.js';
import { ceilingAt, floorAt, fxAt, fxSpeed, groundAt } from './terrain.js';
import * as DM from './dmath.js';

// ---------------------------------------------------------------- damage
/*
 * a body in a region of vacuum takes VACUUM.dps a second (the difficulty scales it, as a toxic bed's); `p.vac` is lazy state that only a map with
 * vacuum has
 */
function vacuumStep(w, dt, diff) {
  const p = w.player,
    on = inVacuum(w, p.x, p.z);
  if (on) {
    p.vacT = (p.vacT || 0) + dt;
    if (p.vacT >= VACUUM.tick) {
      p.vacT -= VACUUM.tick;
      p.vacAcc = (p.vacAcc || 0) + VACUUM.dps * VACUUM.tick * diff.enemyDamage;
      const whole = Math.floor(p.vacAcc);
      p.vacAcc -= whole;
      hurtPlayer(w, whole, null, 'hazard:vacuum');
    }
  } else p.vacT = 0; // fractions carry over: Easy and Hard feel it too
  if (on !== !!p.vac) {
    p.vac = on;
    emit(w, on ? 'vacuum_enter' : 'vacuum_leave', {});
  }
}

/**
 * `from` (optional) = where the blow came from, { x, z } in metres: it rides on the `hurt` event as fx / fz so the view can point at it (look polish
 * 10). Event payload only: the sim's state is the same.
 * `src` (the stats database) = WHO or WHAT did it, a `sources` id: 'enemy:<kind>', 'hazard:<name>', 'self:own_blast'; when it is not given it comes
 * from `from` (a creature, or a shot or ring that carries its shooter's `src`). Also payload only, with the hit points left.
 */
// a floor that hurts, as a source of the stats (the pool is the Weeping Mother's tear)
const FX_SRC = { x: 'hazard:toxic', h: 'hazard:embers', s: 'hazard:spores', p: 'enemy:weeping' };

const srcOf = (from) => (from?.kind && ENEMIES[from.kind] ? 'enemy:' + from.kind : typeof from?.src === 'string' ? from.src : 'other:unknown');

export function hurtPlayer(w, dmg, from = null, src = null) {
  const p = w.player;
  if (p.hp <= 0 || dmg <= 0) return;
  const absorbed = Math.min(p.armor, Math.floor(dmg * PLAYER.armorAbsorb));
  p.armor -= absorbed;
  const real = dmg - absorbed;
  p.hp -= real;
  p.hurt = 1;
  w.stats.damageTaken += real;
  emit(w, 'hurt', from ? { amount: real, fx: from.x, fz: from.z, src: src ?? srcOf(from), hp: p.hp } : { amount: real, src: src ?? 'other:unknown', hp: p.hp });
}

/*
 * how far a creature notices the player: its own range, except in a dark place, where it is `sightDark` unless the player is lit; the Hush-driven
 * kinds ignore the light
 */
export function sightIn(w, def) {
  if (!w.map.dark || def.hush) return def.sight;
  return Math.min(def.sight, w.lit ? LANTERN.sightLit : LANTERN.sightDark);
}

/**
 * is the player lit this tick: the lantern is lit, or a lit prop (a lantern, a lamp) is within `LANTERN.radius` of them (computed once a tick in a
 * dark place, never elsewhere)
 */
function playerLit(w) {
  const p = w.player;
  if (p.lamp?.on) return true;
  for (const q of w.map.props) if (LANTERN.lightProps.includes(q.kind) && Math.hypot(q.x - p.x, q.z - p.z) < LANTERN.radius) return true;
  return false;
}

/** the lantern's own clock (lazy: only where the map has one): the toggle, the burn, the cough when the oil is gone */
function updateLamp(w, cmd, dt) {
  const p = w.player,
    L = p.lamp;
  if (!L) return;
  if (cmd.lamp && p.hp > 0) {
    if (L.on) {
      L.on = false;
      emit(w, 'lamp', { on: false });
    } else if (L.oil > 0 || L.eternal) {
      L.on = true;
      L.since = w.time; // how long it has been held lit (a trigger's lampheld:N)
      emit(w, 'lamp', { on: true });
    } else emit(w, 'lamp_dry', {});
  }
  if (L.on && !L.eternal) {
    L.oil = Math.max(0, L.oil - LANTERN.burn * dt);
    if (L.oil <= 0) {
      L.on = false;
      emit(w, 'lamp_out', {});
    }
  }
}

/**
 * A MELEE strike on the player (a swing, a Gaunt's lunge, a Warden's charge): the guard answers it. Returns 'hit' | 'block' | 'broken' | 'parry'.
 * With a melee weapon in hand and the guard up, and the attacker in front: a guard raised no more than GUARD.window s ago PARRIES (no damage, the
 * attacker is staggered, the next melee hit is doubled);
 * a guard held longer BLOCKS (most of the damage is stopped); a heavy blow breaks the block. Ranged toll-shots never come through here.
 */
export function strikePlayer(w, e, dmg, heavy = false) {
  const p = w.player;
  if (p.guarding && p.hp > 0 && dmg > 0) {
    const dx = e.x - p.x,
      dz = e.z - p.z,
      d = Math.hypot(dx, dz) || 1;
    if ((dx * -DM.sin(p.yaw) + dz * -DM.cos(p.yaw)) / d > GUARD.cos) {
      if (p.parryW > 0) {
        const def = ENEMIES[e.kind],
          poise = def.poise ?? 1;
        e.stunT = Math.max(e.stunT || 0, def.boss ? 0.5 : GUARD.parryStun / (poise >= 3 ? 2 : 1));
        e.attackT = -1;
        e.chargeT = -1;
        e.lungeT = -1;
        e.lungeHit = false;
        e.struck = false;
        e.cd = Math.max(e.cd || 0, 0.4);
        p.riposteT = GUARD.riposteT;
        p.parryCd = 0;
        emit(w, 'parry', { x: e.x, z: e.z, id: e.id });
        return 'parry';
      }
      if (heavy) {
        p.brokenT = GUARD.brokenT;
        p.guarding = false;
        p.guard = 0;
        emit(w, 'guard_break', { x: e.x, z: e.z });
        hurtPlayer(w, dmg, e);
        return 'broken';
      }
      emit(w, 'block', { x: e.x, z: e.z });
      hurtPlayer(w, Math.max(1, Math.round(dmg * GUARD.block)), e);
      return 'block';
    }
  }
  hurtPlayer(w, dmg, e);
  graftPlayer(w, e);
  return 'hit';
}

/*
 * a Zealot's lance that lands GRAFTS: `p.graftT` is lazy state, set only here; it slows the walk (the speed line in updatePlayer) and counts down
 * with the clock
 */
function graftPlayer(w, e) {
  const g = ENEMIES[e.kind].graft,
    p = w.player;
  if (!g || p.hp <= 0) return;
  if (!(p.graftT > 0)) emit(w, 'graft', { x: p.x, z: p.z });
  p.graftT = g.time;
}

/**
 * The door or secret panel that Use would act on right now (first one along the view ray within reach), or null. The UI reads this for its prompt.
 */
export function useTarget(w) {
  const p = w.player,
    map = w.map,
    fx = -DM.sin(p.yaw),
    fz = -DM.cos(p.yaw);
  for (let s = 0.3; s <= PLAYER.useReach; s += 0.25) {
    const cx = Math.floor((p.x + fx * s) / map.cell),
      cz = Math.floor((p.z + fz * s) / map.cell),
      k = map.kind(cx, cz);
    if (k === 'door' || k === 'secret') {
      const d = doorAtCell(w, cx, cz);
      if (d?.closet || d?.hidden) break;
      return d;
    } // a closet panel is a wall to the player (and so is a cracked wall:)
    if (k === 'wall') break;
  }
  {
    const ch = chimeTarget(w);
    if (ch) return { chimeProp: ch, secret: false, target: 0, open: 0, key: null, remote: false, sealed: false };
  } // a chime or the tree
  // mirrors: the nearest one within reach that the player is facing
  if (map.mirrors.length) {
    let bm = null,
      bdm = 1e9;
    for (const m of map.mirrors) {
      const mx = (m.at[0] + 0.5) * map.cell,
        mz = (m.at[1] + 0.5) * map.cell,
        dx = mx - p.x,
        dz = mz - p.z,
        d = Math.hypot(dx, dz);
      if (d < PLAYER.useReach + 0.7 && Math.abs(floorAt(w, mx, mz) - p.y) < 1.5 && (dx * fx + dz * fz) / (d || 1) > 0.7 && d < bdm) {
        bdm = d;
        bm = m;
      }
    }
    if (bm) return { mirrorId: bm.id, rot: w.mirrors[bm.id], secret: false, target: 0, open: 0, key: null, remote: false, sealed: false };
  }
  // wall switches: the nearest one within reach that the player is facing
  let best = null,
    bd = 1e9;
  for (const sw of map.switches) {
    const dx = sw.px - p.x,
      dz = sw.pz - p.z,
      d = Math.hypot(dx, dz);
    if (d < PLAYER.useReach && Math.abs(floorAt(w, sw.x, sw.z) - p.y) < 1.5 && (dx * fx + dz * fz) / (d || 1) > 0.55 && d < bd) {
      bd = d;
      best = sw;
    }
  }
  return best
    ? { switchId: best.id, used: !!w.switchState[best.id]?.used, once: best.once, secret: false, target: 0, open: 0, key: null, remote: false, sealed: false }
    : null;
}

// the air state and the launch vents
/**
 * throw the player from a plate to its landing cell: an arc exact for the per-tick integrator (vy -= g dt; y += vy dt lands on y1 after n ticks, as
 * lobTear does)
 */
function launchFrom(w, p, v) {
  const S = w.map.cell,
    x1 = (v.to[0] + 0.5) * S,
    z1 = (v.to[1] + 0.5) * S,
    n = Math.max(1, Math.round(v.time / TICK)),
    tt = n * TICK,
    g = v.g ?? LOWG.g;
  const y1 = groundAt(w, x1, z1, PLAYER.radius),
    vy = (y1 - p.y) / tt + 0.5 * g * (tt + TICK);
  p.air = { vy, g, bx: (x1 - p.x) / tt, bz: (z1 - p.z) / tt, sx: 0, sz: 0, t: 0, low: Math.min(p.y, y1) - 0.4 };
  p.ventCd = LOWG.ventCooldown;
  p.vx = p.air.bx;
  p.vz = p.air.bz;
  emit(w, 'vent_launch', { x: p.x, z: p.z });
}

/*
 * H-E1: what the last-resort feed hands out: flares (the cannon every player starts with and keeps), and only if a player somehow has no cannon, the
 * ammunition of the first gun they do carry (Gemini-06: flares for a gun nobody holds were no feed at all)
 */
function dryFeedType(p) {
  if (p.weapons.includes('flare')) return 'flare';
  for (const id of SLOT_KEYS) {
    const a = WEAPONS[id]?.ammo;
    if (a && p.weapons.includes(id)) return a;
  }
  return 'flare';
}

/**
 * on the ground in a map with vents or open sky: a plate under the feet fires, and the last solid place stood on is remembered (the void sets the
 * player back there)
 */
function groundAir(w, p, dt) {
  p.ventCd = Math.max(0, (p.ventCd ?? 0) - dt);
  const m = w.map,
    cx = Math.floor(p.x / m.cell),
    cz = Math.floor(p.z / m.cell);
  if (m.ventCells.has(cx + ',' + cz)) {
    if (p.ventCd <= 0) {
      const v = m.vents.find((q) => q.at[0] === cx && q.at[1] === cz);
      if (v) launchFrom(w, p, v);
    }
    return;
  }
  if (m.hasVoid) {
    if (m.kind(cx, cz) === 'void') {
      if (carDeckY(m, w.time, p.x, p.z, 0.05) === -Infinity) voidFall(w, p);
      return;
      // over the void on a car's deck is riding (nothing to go back to mid-air); over the void with no deck under the feet is a miss. on a map WITHOUT
      // cars too (carDeckY is -Infinity there): a body on the ground over open sky is put back, never remembered as "the last solid place" (1,740
      // random vent flights never reached this state; only a teleport or the 14 s timeout below could)
    }
    p.lastSafe = { x: p.x, z: p.z };
  }
}

/**
 * the nearest place the player can stand to `s` (FREEZE F5, round 1, Gemini 7): the cell they last stood on can have a door, a prop or a creature in
 * it by the time the void sets them back. `s` itself when it is free, so a landing nobody blocks is exactly what it was; otherwise the first free
 * spot on rings of 0.5 m up to 4 m, on ground within a step of the old one and not over the void; `s` again when there is none (the old behaviour)
 */
function landingNear(w, s) {
  const r = PLAYER.radius,
    m = w.map,
    y0 = groundAt(w, s.x, s.z, r);
  const free = (x, z) => {
    if (m.hasVoid && m.kind(Math.floor(x / m.cell), Math.floor(z / m.cell)) === 'void') return false;
    if (blockedCircle(w, x, z, r)) return false;
    for (const e of w.enemies) if (e.state !== 'dead' && (x - e.x) ** 2 + (z - e.z) ** 2 < (r + ENEMIES[e.kind].radius) ** 2) return false;
    return true;
  };
  if (free(s.x, s.z)) return s;
  for (let ring = 1; ring <= 8; ring++)
    for (let k = 0; k < 16; k++) {
      const a = (k / 16) * Math.PI * 2,
        x = s.x + DM.cos(a) * ring * 0.5,
        z = s.z + DM.sin(a) * ring * 0.5;
      if (free(x, z) && Math.abs(groundAt(w, x, z, r) - y0) <= 0.6) return { x, z };
    }
  return s;
}

/** open sky took the player: hurt, back on the last solid ground (or the nearest free spot to it), not killed */
function voidFall(w, p) {
  const s = landingNear(w, p.lastSafe ?? { x: w.map.spawn.x, z: w.map.spawn.z });
  delete p.air;
  p.x = s.x;
  p.z = s.z;
  p.vx = 0;
  p.vz = 0;
  p.y = groundAt(w, p.x, p.z, PLAYER.radius);
  p.ventCd = LOWG.setBackCooldown;
  emit(w, 'void_fall', { x: p.x, z: p.z });
  hurtPlayer(w, LOWG.voidDamage, null, 'hazard:fall');
}

/** one tick of a body in low gravity: the launch velocity plus steering, the arc, a ceiling, the landing (or the void) */
function airMove(w, p, sx, sf, fx, fz, rx, rz, dt) {
  const A = p.air,
    m = w.map,
    steer = PLAYER.speed * LOWG.steer,
    k = Math.min(1, dt * PLAYER.accel * LOWG.steer);
  A.t += dt;
  p.ventCd = Math.max(0, (p.ventCd ?? 0) - dt);
  A.sx += ((fx * sf + rx * sx) * steer - A.sx) * k;
  A.sz += ((fz * sf + rz * sx) * steer - A.sz) * k;
  p.vx = A.bx + A.sx;
  p.vz = A.bz + A.sz;
  const y0 = p.y;
  // (walls and ledges higher than the body stop it; tryMove puts p.y on the ground: the height below is the body's own)
  tryMove(w, p, p.vx * dt, p.vz * dt, PLAYER.radius);
  const over =
    // (a deck of a car under the body is a landing, not a miss:)
    m.hasVoid && m.kind(Math.floor(p.x / m.cell), Math.floor(p.z / m.cell)) === 'void' && !(m.cars.length && carDeckY(m, w.time, p.x, p.z) > -Infinity);
  A.vy -= (over && A.vy < 0 && y0 < A.low ? LOWG.voidFallG : A.g) * dt;
  let y = y0 + A.vy * dt;
  const roof = ceilingAt(w, p.x, p.z) - PLAYER.eye - 0.3;
  if (A.vy > 0 && y > roof) {
    y = Math.max(y0, roof);
    A.vy = 0;
  }
  const ground = groundAt(w, p.x, p.z, PLAYER.radius);
  if (over && y <= ground + 0.05) {
    p.y = y;
    return voidFall(w, p);
  }
  if (!over && A.vy <= 0 && y <= ground + 1e-9) {
    const speed = Math.abs(A.vy);
    p.y = ground;
    delete p.air;
    p.vx *= 0.35;
    p.vz *= 0.35;
    emit(w, 'air_land', { x: p.x, z: p.z, speed });
    return;
  }
  p.y = y;
  if (A.t > LOWG.maxAir) {
    if (over) return voidFall(w, p);
    p.y = ground;
    delete p.air;
  } // a body that has not come down in 14 s is put down (a ceiling, a wedge) - unless it is over open sky, where that is a miss
}

/*
 * a Use on an airlock door that is still cycling is not thrown away. `want` is set by that press: the OTHER door is told to shut now (unless somebody
 * stands in it), and this one opens by itself the moment the air has settled (airlock.js `lockBusy`). Walking more than LOCK.giveUp metres away
 * forgets it. Lazy: only a lock door that was pressed while busy ever has it, and the route bot never presses a busy door.
 */
/*
 * a rider whose feet were on a car's deck at the previous tick is carried by the deck's motion since (the car is a pure function of the clock;
 * creatures never board)
 */
function carryRider(w, p, dt) {
  for (const car of w.map.cars) {
    const a = carState(car, w.time - dt),
      b = carState(car, w.time);
    if (!carCovers(car, a, p.x, p.z, 0.05) || Math.abs(p.y - a.y) > CARS.board) continue;
    const dx = b.x - a.x,
      dz = b.z - a.z;
    if (dx || dz) tryMove(w, p, dx, dz, PLAYER.radius);
    return;
  }
}

export function lockQueued(w, d) {
  const pr = w.doors.find((q) => q.cx === d.interlock[0] && q.cz === d.interlock[1]),
    p = w.player,
    cell = w.map.cell,
    cxw = (d.cx + 0.5) * cell,
    czw = (d.cz + 0.5) * cell;
  if (!pr || d.target === 1 || Math.hypot(p.x - cxw, p.z - czw) > LOCK.giveUp) {
    d.want = false;
    return;
  }
  const px = (pr.cx + 0.5) * cell,
    pz = (pr.cz + 0.5) * cell;
  if (
    pr.target === 1 &&
    pr.open >= 1 &&
    ![p, ...w.enemies.filter((e) => e.state !== 'dead')].some((o) => Math.hypot(o.x - px, o.z - pz) < DOOR.autoCloseClearance)
  ) {
    pr.target = 0;
    emit(w, 'door_close', { cx: pr.cx, cz: pr.cz, x: px, z: pz });
  }
  if (!lockBusy(w, d)) {
    d.want = false;
    d.target = 1;
    d.hold = 0;
    emit(w, 'door_open', { cx: d.cx, cz: d.cz, secret: d.secret, x: cxw, z: czw });
  }
}

// ---------------------------------------------------------------- step
/** the clocks of the tick, the keys that act at once, and what carries the player before anything else moves */
export function advanceClocks(w, cmd, dt) {
  const p = w.player,
    map = w.map;
  if (w.tick % CORPSES.every === 0) trimCorpses(w); // H-L4: the born corpses beyond the cap leave (nothing changes for a run that has fewer)
  if (p.suppT > 0) p.suppT = Math.max(0, p.suppT - dt);
  if (p.graftT > 0) p.graftT = Math.max(0, p.graftT - dt);
  if (cmd.load && p.hp > 0 && p.switchT <= 0) {
    const r = cycleLoad(p, p.weapon);
    emit(w, r ? 'load_cycle' : 'load_none', r ?? { gun: p.weapon });
  } // the key that turns the gun to its next load
  if (p.lamp) updateLamp(w, cmd, dt);
  if (map.dark) w.lit = playerLit(w);
  if (map.cars.length && !p.air) carryRider(w, p, dt); // a car carries what stands on it, before anything else moves
  updateSectors(w, dt);
  if (!p.air) p.y = groundAt(w, p.x, p.z, PLAYER.radius); // moving floors carry whoever stands on them (a body in the air keeps its own height)
  if (w.sectors.length) for (const it of w.pickups) it.y = floorAt(w, it.x, it.z); // ...and whatever lies on them (audit A22)
}

/** look, stance (sights, guard, sprint) and walking: everything that decides where the player is this tick */
export function movePlayer(w, cmd, diff, dt) {
  const p = w.player,
    map = w.map;
  // look + move
  p.yaw += Number.isFinite(cmd.yaw) ? cmd.yaw : 0;
  // H-I2: an infinite look value (a broken device) would make the view vector NaN for good
  p.pitch = clamp(p.pitch + (cmd.pitch || 0), -PITCH_LIMIT, PITCH_LIMIT);
  let sx = clamp(cmd.move?.[0] || 0, -1, 1),
    sf = clamp(cmd.move?.[1] || 0, -1, 1);
  const len = Math.hypot(sx, sf);
  if (len > 1) {
    sx /= len;
    sf /= len;
  }
  const fx = -DM.sin(p.yaw),
    fz = -DM.cos(p.yaw),
    rx = DM.cos(p.yaw),
    rz = -DM.sin(p.yaw),
    a = Math.min(1, dt * PLAYER.accel);
  // stance: aim wins over sprint; sprint needs forward input; a dead-on-arrival sprint (no forward) is not a sprint
  const melee = isMelee(p.weapon),
    tool = WEAPONS[p.weapon]?.kind === 'tool',
    aimHeld = !!cmd.aim && !melee && !tool && p.swingT < 0,
    wasSprinting = p.sprinting; // with a melee weapon in hand the Aim key is the GUARD (below), not the sights; a swing drops the sights
  p.brokenT = Math.max(0, p.brokenT - dt);
  p.riposteT = Math.max(0, p.riposteT - dt);
  p.parryCd = Math.max(0, p.parryCd - dt);
  // not while the weapon is still coming up
  const guardHeld = melee && !WEAPONS[p.weapon].noGuard && !!cmd.aim && p.swingT < 0 && p.brokenT <= 0 && p.switchT <= 0 && p.hp > 0;
  if (guardHeld && !p.guarding) {
    p.parryW = p.parryCd <= 0 ? GUARD.window : 0;
    if (p.parryW > 0) p.parryCd = GUARD.window + GUARD.whiffCd;
    emit(w, 'guard_up', {});
  } else if (guardHeld) p.parryW = Math.max(0, p.parryW - dt);
  else p.parryW = 0;
  p.guarding = guardHeld;
  p.guard = clamp(p.guard + ((guardHeld ? 1 : -1) * dt) / GUARD.raise, 0, 1);
  // (the tuning-fork's beam is Aim too: holding it ends a sprint, as the sights do, or a held Shift would silence the beam)
  p.sprinting = !!cmd.sprint && sf >= PLAYER.sprintMinForward && !aimHeld && !guardHeld && !(tool && cmd.aim) && p.swingT < 0;
  if (wasSprinting && !p.sprinting) p.recover = PLAYER.sprintRecover;
  p.recover = Math.max(0, p.recover - dt);
  p.ads = clamp(p.ads + ((aimHeld ? 1 : -1) * dt) / PLAYER.adsTime, 0, 1);
  p.sprint = clamp(p.sprint + ((p.sprinting ? 1 : -1) * dt) / PLAYER.sprintBlendTime, 0, 1);
  const fxc = fxAt(w, p.x, p.z) ?? (w.patches?.length ? patchAt(w, p.x, p.z) : null),
    speed =
      PLAYER.speed *
      fxSpeed(fxc) *
      (1 - (1 - PLAYER.adsMoveMult) * p.ads) *
      (1 - 0.3 * p.guard) *
      (p.graftT > 0 ? 1 - GRAFT.slow : 1) *
      (p.saw && WEAPONS[p.weapon].saw ? 1 - WEAPONS[p.weapon].saw.slow * p.saw.spin : 1),
    fwdSpeed = speed * (p.sprinting ? PLAYER.sprintMult : 1);
  if (p.air)
    airMove(w, p, sx, sf, fx, fz, rx, rz, dt); // a vent has thrown the player: low gravity, a little steering
  else {
    const ag = fxc && FX[fxc].grip != null ? a * FX[fxc].grip : a; // a drift floor has almost no grip (FX.d): the same pull, a tenth of the rate
    p.vx += (fx * sf * fwdSpeed + rx * sx * speed - p.vx) * ag;
    p.vz += (fz * sf * fwdSpeed + rz * sx * speed - p.vz) * ag;
    tryMove(w, p, p.vx * dt, p.vz * dt, PLAYER.radius);
    if (w.map.hasCurrent) flowPush(w, p, PLAYER.radius, dt); // the current carries you
    if (w.map.vents.length || w.map.hasVoid) groundAir(w, p, dt);
  }
  if (fxc !== p.fx) {
    if (fxc) emit(w, 'wade', { kind: fxc });
    p.fx = fxc;
  }
  if (fxc && FX[fxc].dps) {
    p.hazardT = (p.hazardT || 0) + dt;
    if (p.hazardT >= 0.5) {
      p.hazardT -= 0.5;
      hurtPlayer(w, Math.round(FX[fxc].dps * 0.5 * diff.enemyDamage), null, FX_SRC[fxc] ?? 'hazard:floor');
    }
  } else p.hazardT = 0;
  if (map.vacuum.length) vacuumStep(w, dt, diff); // vacuum (airlock.js)
  if (!p.air) p.bob += Math.hypot(p.vx, p.vz) * dt * 1.9;
  if (p.heat > 0) p.heat = Math.max(0, p.heat - dt * (WEAPONS[p.weapon].heatDecay || 1.4));
  p.cooldown = Math.max(0, p.cooldown - dt);
  p.hurt = Math.max(0, p.hurt - dt * 1.2);
  p.kick = Math.max(0, p.kick - dt * 0.4);
}

/** the weapon keys and the wheel */
export function selectWeapon(w, cmd, dt) {
  const p = w.player;
  // weapon selection: slot key, or cycle through owned weapons (mouse wheel). Switching costs the new weapon's switchTime.
  p.switchT = Math.max(0, (p.switchT || 0) - dt);
  // key 6 is the melee slot (pressing it again cycles the melee weapons you carry); Q goes back to the last weapon; the wheel / next / previous step
  // through the guns and the melee slot
  const meleeOwned = MELEE_ORDER.filter((id) => owns(p, id)),
    curMelee = isMelee(p.weapon) ? p.weapon : owns(p, p.meleeWeapon) ? p.meleeWeapon : 'fists';
  let want = null;
  const slotKey = cmd.weapon != null ? SLOT_KEYS[cmd.weapon] : null; // keys 1-5 the first guns, 6 the melee slot, 7-9 the later guns
  if (slotKey === 'melee') want = isMelee(p.weapon) ? meleeOwned[(meleeOwned.indexOf(p.weapon) + 1) % meleeOwned.length] : curMelee;
  else if (slotKey) want = slotKey;
  else if (cmd.weaponLast) want = p.lastWeapon;
  else if (cmd.weaponStep) {
    const ring = SLOT_KEYS.filter((id) => id === 'melee' || p.weapons.includes(id)).map((id) => (id === 'melee' ? curMelee : id)),
      i = ring.indexOf(isMelee(p.weapon) ? curMelee : p.weapon),
      n = ring.length,
      st = Math.trunc(Number(cmd.weaponStep)) || 0;
    if (n) want = ring[(((i + st) % n) + n) % n];
  } // H-I1: a true modulo (a step below -1 gave a negative index); the input layer only makes -1, 0 and 1
  if (want && want !== p.weapon && owns(p, want) && (p.swingT < 0 || p.swingHit)) {
    p.lastWeapon = p.weapon;
    p.weapon = want;
    if (isMelee(want)) p.meleeWeapon = want;
    p.switchT = WEAPONS[want].switchTime;
    p.charge = 0;
    p.swingT = -1;
    p.queuedT = 0;
    emit(w, 'weapon_switch', { weapon: want });
  }
}

/** the Use key */
export function useAction(w, cmd) {
  const p = w.player,
    map = w.map;
  // use: first door/secret panel along the view ray
  if (cmd.use) {
    const hit = useTarget(w);
    if (hit?.chimeProp) {
      if (hit.chimeProp.kind === 'chime') strikeChime(w, hit.chimeProp, emit);
      else playTree(w, hit.chimeProp, emit);
    } else if (hit?.mirrorId) turnMirror(w, hit.mirrorId);
    else if (hit?.switchId)
      activateSwitch(
        w,
        map.switches.find((s) => s.id === hit.switchId),
      );
    else if (hit) {
      if (
        hit.soundlock &&
        w.time - (w.noise?.t ?? -99) < hit.soundlock.quiet &&
        Math.hypot(w.noise.x - (hit.cx + 0.5) * map.cell, w.noise.z - (hit.cz + 0.5) * map.cell) < hit.soundlock.radius
      )
        // the lock is listening: it will not open to Use until it has heard nothing for `quiet` s
        emit(w, 'door_listen', { cx: hit.cx, cz: hit.cz, x: (hit.cx + 0.5) * map.cell, z: (hit.cz + 0.5) * map.cell });
      else if (hit.breath)
        // it opens when the ship breathes in, whatever you do
        emit(w, 'door_breath', { cx: hit.cx, cz: hit.cz, x: (hit.cx + 0.5) * map.cell, z: (hit.cz + 0.5) * map.cell });
      else if (hit.sealed || hit.remote)
        // opened elsewhere (a switch, or an event)
        emit(w, 'door_remote', { cx: hit.cx, cz: hit.cz, x: (hit.cx + 0.5) * map.cell, z: (hit.cz + 0.5) * map.cell });
      else if (hit.key && !p.keys.includes(hit.key))
        emit(w, 'door_locked', { key: hit.key, cx: hit.cx, cz: hit.cz, x: (hit.cx + 0.5) * map.cell, z: (hit.cz + 0.5) * map.cell });
      else if (hit.interlock && hit.target === 0 && lockBusy(w, hit)) {
        hit.want = true;
        emit(w, 'door_cycling', { cx: hit.cx, cz: hit.cz, x: (hit.cx + 0.5) * map.cell, z: (hit.cz + 0.5) * map.cell });
        // the other door of the airlock is open or the air is still moving; the press is KEPT: the other door shuts now and this one opens by itself
        // when the air has settled (the door loop below)
      } else if (hit.target === 0) {
        hit.target = 1;
        hit.hold = 0;
        emit(w, 'door_open', { cx: hit.cx, cz: hit.cz, secret: hit.secret, x: (hit.cx + 0.5) * map.cell, z: (hit.cz + 0.5) * map.cell });
      }
    }
  }
}

/** the safety net for a player with nothing left to fire */
export function dryFeed(w, dt) {
  const p = w.player;
  // last-resort feed: a player with no ammunition of ANY kind (for a gun they carry: bolts picked up before the rifle do not count) is never left
  // with nothing: the flare cannon's feed drops one flare after a few seconds (and again each time it is spent).
  // gave everybody fists, and the first version of this batch removed the feed ("fists mean you are never empty"). It is back, as a safety net: fists
  // cannot hurt a plated Warden from the front (a bash does a third of its damage through the plate), so a player who ran dry in front of one could
  // be soft-locked, and the robustness gate (a strafing fighter with 25% less ammunition pickups must finish C1E1M06) failed without it.
  if (
    p.hp > 0 &&
    !Object.keys(AMMO_MAX).some((k) => (p.ammo[k] || 0) > 0 && Object.entries(WEAPONS).some(([id, wd]) => wd.ammo === k && p.weapons.includes(id)))
  ) {
    p.feedT = (p.feedT ?? 0) + dt;
    if (p.feedT >= PLAYER.dryFeed.every) {
      p.feedT = 0;
      {
        const k = dryFeedType(p);
        p.ammo[k] = (p.ammo[k] || 0) + PLAYER.dryFeed.amount;
      }
      emit(w, 'dry_feed', { x: p.x, z: p.z });
    }
  } else if (p.feedT) p.feedT = 0;
}
