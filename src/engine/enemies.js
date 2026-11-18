// The creatures: waking, moving, attacking, the elites and the bosses, and what they throw.
// Part of the deterministic simulation (world.js holds the order of a tick): nothing here touches DOM, Three, the clock or Math.random.
import { brainStep, startStrafe } from './brain.js';
import { DIFFICULTY, ECHO, ENEMIES, ENEMY_STRIKE, LAMP_HOLDS, NOISE, PLAYER, PROPS, SUPPRESS, TICK } from './defs.js';
import { folkHears, folkStep } from './folk.js';
import { physAt } from './gravity.js';
import { hitCylinder, insideFuse } from './hitvolume.js';
import { beatOk, isBeatTick } from './hive.js';
import { hiveStep } from './hivecantor.js';
import { snipeStep } from './marksman.js';
import { healStep } from './mender.js';
import { distanceField, navWaypoint } from './nav.js';
import { phaseOf } from './phases.js';
import { updateCars, updateLoads, updateSpores } from './place.js';
import { hurtPlayer, sightIn, strikePlayer } from './player.js';
import { holdUpkeep } from './range.js';
import { resonatorsHear, updateResonators } from './resonator.js';
import { bellMotion, bellStep, updateSpikes } from './rootbell.js';
import { blockedCircle, cellSolid, chaseStep, clamp, emit, flowPush, hasLOS, inFront, moveClear, rand, stepClear, stepToward, tryMove } from './simcore.js';
import { sweepStep } from './sweep.js';
import { TACTICS, fanPoint, ordinary, takeTurn } from './tactics.js';
import { ceilingAt, floorAt, fxAt, fxSpeed, groundAt, tooHigh } from './terrain.js';
import { SLOW_IMMUNE, SLOW_MAX, damageEnemy, hitEffects, loadFxStep, moveMult, rayClear, updateBurns } from './weapons.js';
import { spawnEnemy } from './world.js';
import * as DM from './dmath.js';

/** Wake an enemy (idle -> chase) remembering where the player is; enemies near the one that woke are alerted too. */
export function wakeEnemy(w, e, loud, scripted = false) {
  e.state = 'chase';
  e.lost = 0;
  e.lastX = w.player.x;
  e.lastZ = w.player.z;
  if (loud) emit(w, 'enemy_alert', { id: e.id, kind: e.kind, x: e.x, z: e.z });
  if (!scripted)
    for (const o of w.enemies)
      if (o.state === 'idle' && Math.hypot(o.x - e.x, o.z - e.z) < 12 && hasLOS(w, e.x, e.z, o.x, o.z)) {
        o.state = 'chase';
        o.lost = 0;
        o.lastX = w.player.x;
        o.lastZ = w.player.z;
      }
}

/** Loud noise (gunfire, explosion): idle enemies within `radius` wake if nothing solid is between, or if it is very close. */
export function noise(w, x, z, radius) {
  // in a place with an echo a loud noise carries that much further (a quiet one does not)
  if (w.map.echo !== 1 && radius > ECHO.loud) radius *= w.map.echo;
  if (w.resonators) resonatorsHear(w, x, z, radius); // a fork in earshot will ring
  if (w.map.hasSoundlock) w.noise = { t: w.time, x, z }; // a sound-lock door listens (only a map that has one records this)
  for (const e of w.enemies) {
    if (e.state === 'calm' || e.state === 'flee') {
      folkHears(w, e, x, z, radius);
      continue;
    } // a peaceful creature runs from it instead of waking
    if (e.state !== 'idle') continue;
    const d = Math.hypot(e.x - x, e.z - z);
    if (d < radius && (d < NOISE.closeRange || hasLOS(w, x, z, e.x, e.z))) wakeEnemy(w, e, false);
  }
}

/*
 * a Bellhand's call along the floor: the sleeping ordinary creatures within `r` m whose walk to it is at most 1.3 r (a shut door is not walked
 * through), the nearest `most` of them; `wake` = wake them, else only count
 */
function bellCall(w, e, r, wake, most = Infinity) {
  const S = w.map.cell,
    f = distanceField(w, Math.floor(e.x / S), Math.floor(e.z / S)),
    heard = [];
  for (const o of w.enemies) {
    if (o === e || o.state !== 'idle' || !ordinary(o) || Math.hypot(o.x - e.x, o.z - e.z) > r) continue;
    const d = f[Math.floor(o.z / S) * w.map.w + Math.floor(o.x / S)];
    if (d < 0 || d * S > r * 1.3) continue;
    heard.push({ o, d });
  }
  heard.sort((a, b) => a.d - b.d || a.o.id - b.o.id);
  const come = heard.slice(0, most);
  if (wake) for (const { o } of come) wakeEnemy(w, o, false, true);
  return come.length;
}

/* * what the brain may use of the world (brain.js) */
function brainCtx(w, e, def, diff, dt, sees, dist) {
  return {
    w,
    e,
    def,
    dt,
    sees,
    dist,
    p: w.player,
    rand: () => rand(w),
    fired: w._fireTick === w.tick,
    hpMax: def.hp * diff.enemyHp,
    emit,
    moveAt: (a, k) => moveAlong(w, e, def, dt, a, k),
    headingOpen: (a) => !blockedCircle(w, e.x + DM.sin(a) * 1.6, e.z + DM.cos(a) * 1.6, def.radius, e),
    freeHeading: (prefer) => openHeading(w, e, def, prefer),
    clearTo: (x, z) => stepClear(w, e.x, e.z, x, z) && moveClear(w, e.x, e.z, x, z, def.radius),
    callable: (r) => bellCall(w, e, r, false) > 0,
    call: (r, most) => bellCall(w, e, r, true, most),
    takeTurn: (kind) => takeTurn(w, e, kind),
  };
}

// ---------------------------------------------------------------- enemies
function fireEnemyShot(w, e, def, diff, inBurst = false) {
  const R = def.ranged,
    p = w.player,
    ox = e.x + DM.sin(e.yaw) * 0.6,
    oy = e.y + (R.muzzleY ?? 1.5),
    oz = e.z + DM.cos(e.yaw) * 0.6;
  let dx = p.x - ox,
    dy = p.y + R.aimHeight - oy,
    dz = p.z - oz;
  const len = Math.hypot(dx, dy, dz) || 1; // aimed at where the player IS: a strafing player is not hit
  let vx = (dx / len) * R.speed,
    vy = (dy / len) * R.speed,
    vz = (dz / len) * R.speed;
  if (R.burst) {
    const j = R.burst.spread,
      a = (rand(w) * 2 - 1) * j,
      b = (rand(w) * 2 - 1) * j,
      c = DM.cos(a),
      sn = DM.sin(a);
    [vx, vz] = [vx * c - vz * sn, vx * sn + vz * c];
    vy += b * R.speed;
  } // a burst is a little off the line, shot by shot (the seeded RNG: deterministic)
  w.enemyShots.push({
    id: w.nextId++,
    x: ox,
    y: oy,
    z: oz,
    vx,
    vy,
    vz,
    life: 4,
    dmg: Math.round(R.damage * diff.enemyDamage),
    src: 'enemy:' + e.kind,
    ...(R.suppress ? { sup: R.suppress.r } : {}),
  });
  emit(w, 'enemy_shot', { id: e.id, kind: e.kind, x: e.x, z: e.z, burst: inBurst });
  if (R.burst && !inBurst) {
    e.burstLeft = R.burst.count - 1;
    e.burstT = R.burst.gap;
  }
}

function updateEnemyShots(w, diff, dt) {
  const map = w.map,
    p = w.player;
  for (let i = w.enemyShots.length - 1; i >= 0; i--) {
    const q = w.enemyShots[i];
    q.life -= dt;
    let gone = q.life <= 0;
    const n = Math.ceil((Math.hypot(q.vx, q.vy, q.vz) * dt) / 0.25);
    for (let k = 0; k < n && !gone; k++) {
      q.x += (q.vx * dt) / n;
      q.y += (q.vy * dt) / n;
      q.z += (q.vz * dt) / n;
      if (q.y < floorAt(w, q.x, q.z) + 0.05 || q.y > ceilingAt(w, q.x, q.z) || cellSolid(w, Math.floor(q.x / map.cell), Math.floor(q.z / map.cell))) {
        gone = true;
        emit(w, 'shot_impact', { x: q.x, y: q.y, z: q.z });
      }
      for (const pr of map.props)
        if (!gone && PROPS[pr.kind].radius > 0 && Math.hypot(q.x - pr.x, q.z - pr.z) < PROPS[pr.kind].radius && q.y < floorAt(w, pr.x, pr.z) + 1.3) {
          gone = true;
          emit(w, 'shot_impact', { x: q.x, y: q.y, z: q.z });
        }
      if (!gone && w.phys && physAt(w, q.x, q.y, q.z)) {
        gone = true;
        emit(w, 'shot_impact', { x: q.x, y: q.y, z: q.z });
      }
      if (!gone && q.reflected) {
        for (const e of w.enemies)
          if (e.state !== 'dead' && insideFuse(e, q.x, q.y, q.z)) {
            gone = true;
            if (!damageEnemy(w, e, q.dmg, { by: { weapon: 'fork' } })) {
              hitEffects(w, e, { flinch: 0.5 });
              emit(w, 'enemy_hit', { id: e.id, kind: e.kind, x: e.x, y: e.y, z: e.z });
            }
            emit(w, 'shot_impact', { x: q.x, y: q.y, z: q.z });
            break;
          }
      } else if (!gone && p.hp > 0 && Math.hypot(q.x - p.x, q.z - p.z) < 0.55 && q.y > p.y + 0.1 && q.y < p.y + 1.9) {
        gone = true;
        hurtPlayer(w, q.dmg, { x: q.x - q.vx, z: q.z - q.vz }, q.src);
        emit(w, 'shot_impact', { x: q.x, y: q.y, z: q.z });
      }
      if (!gone && q.sup && p.hp > 0 && Math.hypot(q.x - p.x, q.z - p.z) < q.sup && q.y > p.y && q.y < p.y + 2.1) {
        if ((p.suppT || 0) < SUPPRESS.time * 0.5) emit(w, 'suppress', { x: q.x, z: q.z });
        p.suppT = SUPPRESS.time;
      } // whizzing past: the player is suppressed (their guns open up)
    }
    if (gone) w.enemyShots.splice(i, 1);
  }
}

// ---------------------------------------------------------------- elites and the boss
// (a FORK is an instrument, not a node: it holds no shield and it never falls)
const isNode = (n) => ENEMIES[n.kind].node && !n.fork && n.state !== 'dead';

const nodesAlive = (w) => w.enemies.filter(isNode).length;

function retreatStep(w, e, def, dt) {
  const spd = def.speed * dt * fxSpeed(fxAt(w, e.x, e.z)) * moveMult(e),
    away = DM.atan2(e.x - w.player.x, e.z - w.player.z);
  for (const off of [0, 0.7, -0.7, 1.4, -1.4]) {
    const a = away + off,
      sx = DM.sin(a) * spd,
      sz = DM.cos(a) * spd;
    if (!blockedCircle(w, e.x + sx, e.z + sz, def.radius, e)) {
      e.x += sx;
      e.z += sz;
      e.y = groundAt(w, e.x, e.z, def.radius);
      return true;
    }
  }
  return false;
}

/*
 * a heading away from the player that is open for a metre and a half, tried nearest the straight line away first (or round `prefer`); null when the
 * creature is walled in
 */
function openHeading(w, e, def, prefer) {
  const base = prefer ?? DM.atan2(e.x - w.player.x, e.z - w.player.z);
  for (const off of [0, 0.4, -0.4, 0.8, -0.8, 1.1, -1.1]) {
    const a = base + off;
    if (!blockedCircle(w, e.x + DM.sin(a) * 1.6, e.z + DM.cos(a) * 1.6, def.radius, e)) return a;
  }
  return null;
}

function moveAlong(w, e, def, dt, a, k) {
  const spd = def.speed * dt * fxSpeed(fxAt(w, e.x, e.z)) * moveMult(e) * k,
    sx = DM.sin(a) * spd,
    sz = DM.cos(a) * spd;
  if (blockedCircle(w, e.x + sx, e.z + sz, def.radius, e)) return false;
  e.x += sx;
  e.z += sz;
  e.y = groundAt(w, e.x, e.z, def.radius);
  return true;
}

const runCtx = (w, e, def, dt) => ({
  freeHeading: (prefer) => (e.hold ? null : openHeading(w, e, def, prefer)),
  headingOpen: (a) => !blockedCircle(w, e.x + DM.sin(a) * 1.6, e.z + DM.cos(a) * 1.6, def.radius, e),
  moveAt: (a, k) => moveAlong(w, e, def, dt, a, k),
});

/** Warden-Graft: windup -> straight-line charge -> (hit the player | crash into geometry and stagger | give way to another body) */
function chargeStep(w, e, def, diff, dt, sees, dist, dyv) {
  const C = e.chargeC ?? def.charge,
    p = w.player;
  e.chargeCd = Math.max(0, (e.chargeCd || 0) - dt);
  if ((e.chargeT ?? -1) >= 0) {
    e.chargeT += dt;
    if (e.chargeT < C.windup) {
      e.walk *= 0.85;
      return true;
    } // the tell: it stops and lowers its shoulder
    if (e.chargeT < C.windup + C.duration) {
      const step = C.speed * dt,
        nx = DM.sin(e.yaw) * step,
        nz = DM.cos(e.yaw) * step;
      e.walk = 1;
      e.phase += dt * def.gait * 2;
      if (
        !e.chargeHit &&
        Math.hypot(p.x - e.x, p.z - e.z) < def.radius + PLAYER.radius + 0.45 &&
        Math.abs(p.y - e.y) < 1.4 &&
        p.hp > 0 &&
        inFront(e, p, ENEMY_STRIKE.dashCos)
      ) {
        const res = strikePlayer(w, e, Math.round(C.damage * diff.enemyDamage), true);
        emit(w, 'enemy_strike', { id: e.id, kind: e.kind, x: e.x, z: e.z });
        if (res === 'hit' || res === 'broken') tryMove(w, p, DM.sin(e.yaw) * C.knock, DM.cos(e.yaw) * C.knock, PLAYER.radius);
        e.chargeT = -1;
        e.chargeCd = C.cooldown * diff.reaction;
        return true;
      }
      if (blockedCircle(w, e.x + nx, e.z + nz, def.radius) || tooHigh(w, e, e.x + nx, e.z + nz, def.radius)) {
        // walls, doors, props, ledges: it crashes and is stunned
        e.stunT = C.stun;
        e.chargeT = -1;
        e.chargeCd = C.cooldown * diff.reaction;
        emit(w, 'warden_crash', { id: e.id, x: e.x, z: e.z });
        return true;
      }
      if (blockedCircle(w, e.x + nx, e.z + nz, def.radius, e)) {
        e.chargeT = -1;
        e.chargeCd = 1;
        return true;
      } // another body in the way: it gives up the charge
      e.x += nx;
      e.z += nz;
      e.y = groundAt(w, e.x, e.z, def.radius);
      return true;
    }
    e.chargeT = -1;
    e.chargeCd = C.cooldown * diff.reaction;
    return false;
  }
  if (
    sees &&
    e.attackT < 0 &&
    e.chargeCd <= 0 &&
    dist >= C.min &&
    dist <= C.max &&
    dyv < 1.2 &&
    beatOk(w, e) &&
    moveClear(w, e.x, e.z, p.x, p.z, def.radius) &&
    takeTurn(w, e, 'melee')
  ) {
    e.chargeT = 0;
    emit(w, 'enemy_windup', { id: e.id, kind: e.kind, x: e.x, z: e.z });
    return true;
  }
  return false;
}

function reviveEnemy(w, c, S) {
  c.state = 'chase';
  c.hp = ENEMIES[c.kind].hp * DIFFICULTY[w.difficulty].enemyHp * S.reviveHp;
  c.dead = 0;
  c.attackT = -1;
  c.lungeT = -1;
  c.stunT = 0;
  c.revived = (c.revived || 0) + 1;
  c.lost = 0;
  c.lastX = w.player.x;
  c.lastZ = w.player.z;
  w.stats.kills--;
  emit(w, 'enemy_revived', { id: c.id, kind: c.kind, x: c.x, z: c.z });
}

/** Sexton: channel over a corpse to raise it; keep away from the player; hurting it mid-channel breaks the rite (see damageEnemy) */
function supportStep(w, e, def, dt, sees, dist) {
  const S = def.support;
  e.supCd = Math.max(0, (e.supCd || 0) - dt);
  if ((e.channelT ?? -1) >= 0) {
    const c = w.enemies.find((o) => o.id === e.channelTarget);
    if (!c || c.state !== 'dead' || Math.hypot(c.x - e.x, c.z - e.z) > S.range * 1.3) {
      e.channelT = -1;
      return false;
    }
    e.channelT += dt;
    e.walk *= 0.85;
    if (e.channelT >= S.channel) {
      reviveEnemy(w, c, S);
      e.channelT = -1;
      e.supCd = S.cooldown;
    }
    return true;
  }
  if (e.supCd <= 0) {
    let best = null,
      bd = 1e9;
    for (const o of w.enemies)
      if (o.state === 'dead' && o.dead >= 1 && S.kinds.includes(o.kind) && (o.revived || 0) < S.maxRevives) {
        const d = Math.hypot(o.x - e.x, o.z - e.z);
        if (d < S.range && d < bd && hasLOS(w, e.x, e.z, o.x, o.z)) {
          best = o;
          bd = d;
        }
      }
    if (best) {
      e.channelT = 0;
      e.channelTarget = best.id;
      emit(w, 'sexton_channel', { id: e.id, x: e.x, z: e.z, tx: best.x, tz: best.z });
      return true;
    }
  }
  if (sees && dist < S.keepAway) {
    retreatStep(w, e, def, dt);
    e.walk = Math.min(1, e.walk + dt * 3);
    e.phase += dt * def.gait;
    return true;
  }
  if (sees && dist < S.keepAway + 5) {
    e.walk = Math.max(0, e.walk - dt * 3);
    return true;
  } // holds its ground at range, waiting for someone to fall
  return false;
}

/** Cantor: tone pulses (windup -> ring), Gaunt summons, and once the ring is broken, fans of toll-shots. It keeps its distance. */
function bossStep(w, e, def, diff, dt, sees, dist) {
  const p = w.player,
    // angry once its ring is cut, or (a boss that says enrageAt) below that share of its life
    enraged = def.enrageAt ? e.hp < def.enrageAt * def.hp * diff.enemyHp : nodesAlive(w) === 0,
    P = def.pulse;
  e.pulseCd = Math.max(0, (e.pulseCd ?? 0) - dt);
  e.shotCd = Math.max(0, (e.shotCd ?? 0) - dt);
  e.summonCd = Math.max(0, (e.summonCd ?? 0) - dt);
  // LISTENING to a fork (def.listen, the Sub-Cantor): it stands still and makes no sound until the note has died
  if (def.listen && (e.listenUntil ?? -1) > w.time) {
    e.pulseT = -1;
    e.walk *= 0.85;
    return true;
  }
  if (e.echoT > 0) {
    e.echoT -= dt;
    if (e.echoT <= 0) {
      e.echoT = 0;
      w.pulses.push({
        id: w.nextId++,
        x: e.x,
        z: e.z,
        y: e.y,
        r: 0.6,
        speed: P.speed,
        dmg: Math.round(P.damage * diff.enemyDamage),
        width: P.width,
        maxR: P.maxR,
        hit: false,
        src: 'enemy:' + e.kind,
      });
      emit(w, 'pulse', { x: e.x, z: e.z, echo: true });
    }
  } // the second ring of a double pulse (the Grand Cantor)
  // the Gate Warden's sweep
  if (def.sweep && sweepStep(w, e, def, diff, dt, sees, dist, { emit, hurtPlayer, damageEnemy, solid: (cx, cz) => cellSolid(w, cx, cz) })) return true;
  if (P && (e.pulseT ?? -1) >= 0) {
    e.pulseT += dt;
    e.walk *= 0.85;
    if (e.pulseT >= P.windup) {
      w.pulses.push({
        id: w.nextId++,
        x: e.x,
        z: e.z,
        y: e.y,
        r: 0.6,
        speed: P.speed,
        dmg: Math.round(P.damage * diff.enemyDamage),
        width: P.width,
        maxR: P.maxR,
        hit: false,
        src: 'enemy:' + e.kind,
        ...(P.reflect ? { reflectAt: P.reflect } : {}),
      });
      emit(w, 'pulse', { x: e.x, z: e.z });
      e.pulseT = -1;
      e.pulseCd = enraged ? def.enragedPulseCooldown : P.cooldown;
      if (P.echo && (!def.echoReeds || !enraged)) e.echoT = P.echo.gap;
    }
    return true;
  }
  if (P && sees && e.pulseCd <= 0) {
    e.pulseT = 0;
    e.openDmg = 0; // what the player lands in this windup (def.open: enough of it breaks the song)
    emit(w, 'enemy_windup', { id: e.id, kind: e.kind, x: e.x, z: e.z });
    return true;
  }
  if (def.summon && e.summons?.length && sees && e.summonCd <= 0) {
    const S = def.summon;
    if (w.enemies.filter((o) => o.kind === S.kind && o.state !== 'dead').length < S.max)
      for (let i = 0; i < S.count; i++) {
        e.summonN = (e.summonN ?? -1) + 1;
        const [sx, sz] = e.summons[e.summonN % e.summons.length],
          g = spawnEnemy(w, S.kind, sx, sz, DM.atan2(p.x - sx, p.z - sz));
        g.summoned = true;
        w.stats.total.enemies++;
        wakeEnemy(w, g, false, true);
        emit(w, 'enemy_spawn', { id: g.id, kind: g.kind, x: g.x, z: g.z });
      }
    e.summonCd = S.every * (enraged ? 0.7 : 1);
  }
  if ((enraged || def.shots?.always) && def.shots && sees && e.shotCd <= 0 && dist > 4) {
    const Sh = def.shots,
      ox = e.x + DM.sin(e.yaw) * 0.8,
      oz = e.z + DM.cos(e.yaw) * 0.8,
      oy = e.y + (Sh.muzzleY ?? 1.9),
      base = DM.atan2(p.x - ox, p.z - oz);
    for (let i = -Math.floor(Sh.count / 2); i <= Math.floor(Sh.count / 2); i++) {
      const a = base + i * Sh.spread,
        dy = p.y + Sh.aimHeight - oy,
        hz = Math.hypot(p.x - ox, p.z - oz) || 1,
        len = Math.hypot(hz, dy);
      w.enemyShots.push({
        id: w.nextId++,
        x: ox,
        y: oy,
        z: oz,
        vx: ((DM.sin(a) * hz) / len) * Sh.speed,
        vy: (dy / len) * Sh.speed,
        vz: ((DM.cos(a) * hz) / len) * Sh.speed,
        life: 4,
        dmg: Math.round(Sh.damage * diff.enemyDamage),
        src: 'enemy:' + e.kind,
      });
    }
    emit(w, 'enemy_shot', { id: e.id, kind: e.kind, x: e.x, z: e.z });
    e.shotCd = Sh.cooldown;
  }
  if (sees && dist < (def.keepAway ?? 6)) {
    retreatStep(w, e, def, dt);
    e.walk = Math.min(1, e.walk + dt * 3);
    e.phase += dt * def.gait;
    return true;
  }
  if (def.strafe && sees && dist <= (def.keepAway ?? 6) + 5 && strafeStep(w, e, def, dt)) {
    e.walk = Math.min(1, e.walk + dt * 3);
    e.phase += dt * def.gait;
    return true;
  } // a mobile boss circles at its range
  return false;
}

/**
 * a hovering shooter circles the player instead of standing: alternate sideways runs (the direction and length come from the seeded RNG, so the sim
 * stays deterministic)
 */
function strafeStep(w, e, def, dt) {
  const S = def.strafe,
    p = w.player;
  e.strafeT = (e.strafeT ?? 0) - dt;
  if (e.strafeT <= 0) {
    e.strafeDir = rand(w) < 0.5 ? -1 : 1;
    e.strafeT = S.every * (0.6 + rand(w) * 0.8);
  }
  const a = DM.atan2(p.x - e.x, p.z - e.z) + (e.strafeDir * Math.PI) / 2,
    sx = DM.sin(a) * S.speed * dt * moveMult(e),
    sz = DM.cos(a) * S.speed * dt * moveMult(e);
  if (!blockedCircle(w, e.x + sx, e.z + sz, def.radius, e)) {
    e.x += sx;
    e.z += sz;
    e.y = groundAt(w, e.x, e.z, def.radius);
    e.walk = Math.min(1, e.walk + dt * 3);
    e.phase += dt * def.gait;
    return true;
  }
  e.strafeDir = -e.strafeDir;
  return false;
}

// the Cantor Acolyte
/** the awake, unstaggered Acolyte whose ward covers creature `e` (another creature than the one asked about, within ward.r), or null */
export function wardOf(w, e) {
  for (const a of w.enemies) {
    if (a === e || a.kind !== 'acolyte' || a.state === 'dead' || a.state === 'idle' || a.hold === 'inert' || (a.stunT || 0) > 0) continue;
    if (Math.hypot(a.x - e.x, a.z - e.z) < ENEMIES.acolyte.ward.r) return ENEMIES.acolyte.ward;
  }
  return null;
}

/** Acolyte: a tone pulse after a windup (the Cantor's ring, smaller), and it keeps away from the player; returns true when the tick is used up */
function acolyteStep(w, e, def, diff, dt, sees, dist) {
  const P = def.pulse;
  e.pulseCd = Math.max(0, (e.pulseCd ?? 0) - dt);
  if ((e.pulseT ?? -1) >= 0) {
    e.pulseT += dt;
    e.walk *= 0.85;
    if (e.pulseT >= P.windup) {
      w.pulses.push({
        id: w.nextId++,
        x: e.x,
        z: e.z,
        y: e.y,
        r: 0.6,
        speed: P.speed,
        dmg: Math.round(P.damage * diff.enemyDamage),
        width: P.width,
        maxR: P.maxR,
        hit: false,
        src: 'enemy:' + e.kind,
      });
      emit(w, 'pulse', { x: e.x, z: e.z });
      e.pulseT = -1;
      e.pulseCd = P.cooldown;
    }
    return true;
  }
  if (e.attackT >= 0) return false;
  if (sees && e.pulseCd <= 0 && dist > 3 && dist <= P.maxR) {
    e.pulseT = 0;
    emit(w, 'enemy_windup', { id: e.id, kind: e.kind, x: e.x, z: e.z });
    return true;
  }
  if (sees && dist < def.keepAway) {
    retreatStep(w, e, def, dt);
    e.walk = Math.min(1, e.walk + dt * 3);
    e.phase += dt * def.gait;
    return true;
  }
  return false;
}

// the Brood Vat
/**
 * Brood Vat: asleep until it sees the player inside `spawner.range` (or a noise / a map's `wake` wakes it). Awake, it counts `every` s (x the
 * difficulty's reaction), swells its dome for `swell` s (announced: the `vat_swell` event; the view draws the dome bulging)
 * and then `count` creatures drop beside it (`vat_birth`), at most `max` of ITS brood alive; when its brood is full it looks again in two seconds. It
 * never fights and is a node: killing it ends the brood (what is already born stays).
 */
function vatStep(w, e, def, diff, dt) {
  const S = def.spawner ?? def.feeds,
    p = w.player; // a feeder FEEDS the Graft-Mother's brood with the same machinery a vat uses
  if (e.vatT === undefined) {
    e.vatT = -1;
    e.summonCd = S.first;
    e.brood = [];
    e.vatN = 0;
  }
  if (e.state === 'idle') {
    if (p.hp > 0 && Math.hypot(p.x - e.x, p.z - e.z) < S.range && hasLOS(w, e.x, e.z, p.x, p.z)) wakeEnemy(w, e, false, true);
    else return;
  }
  e.summonCd = Math.max(0, e.summonCd - dt);
  if (e.vatT >= 0) {
    e.vatT += dt;
    if (e.vatT >= S.swell) {
      e.vatT = -1;
      e.summonCd = S.every * diff.reaction;
      e.brood = e.brood.filter((id) => w.enemies.some((o) => o.id === id && o.state !== 'dead'));
      const taken = [],
        kinds = e.spawns ?? S.kinds;
      for (let i = 0; i < S.count && e.brood.length < S.max; i++) {
        const kind = kinds[e.vatN++ % kinds.length],
          spot = broodSpot(w, e, kind, taken);
        if (!spot) break;
        taken.push(spot);
        const g = spawnEnemy(w, kind, spot[0], spot[1], DM.atan2(p.x - spot[0], p.z - spot[1]));
        g.summoned = true;
        e.brood.push(g.id);
        w.stats.total.enemies++;
        wakeEnemy(w, g, false, true);
        emit(w, 'enemy_spawn', { id: g.id, kind: g.kind, x: g.x, z: g.z, brood: true, vat: true });
      }
      emit(w, 'vat_birth', { id: e.id, x: e.x, z: e.z });
    }
    return;
  }
  if (e.summonCd <= 0) {
    e.brood = e.brood.filter((id) => w.enemies.some((o) => o.id === id && o.state !== 'dead'));
    if (e.brood.length < S.max) {
      e.vatT = 0;
      emit(w, 'vat_swell', { id: e.id, x: e.x, z: e.z });
    } else e.summonCd = 2;
  }
}

// the Weeping Mother
/** the pool a tear left under a point, or null: the effect char 'p' (FX.p) */
export function patchAt(w, x, z) {
  for (const q of w.patches) if (Math.hypot(x - q.x, z - q.z) < q.r) return 'p';
  return null;
}

/** a free spot on a ring round the mother for a creature of `kind` (toward the player first, then round the ring), or null */
function broodSpot(w, e, kind, taken) {
  const r = ENEMIES[kind].radius,
    toward = DM.atan2(w.player.x - e.x, w.player.z - e.z);
  for (const off of [0.5, -0.5, 1.1, -1.1, 1.7, -1.7, 2.4, -2.4, 3.0])
    for (const d of [2.3, 3.0]) {
      const a = toward + off,
        x = e.x + DM.sin(a) * d,
        z = e.z + DM.cos(a) * d;
      if (
        !blockedCircle(w, x, z, r + 0.05) &&
        !tooHigh(w, e, x, z, r) &&
        moveClear(w, e.x, e.z, x, z, r) &&
        !taken.some(([tx, tz]) => Math.hypot(tx - x, tz - z) < r * 2.2)
      )
        return [x, z];
    }
  return null;
}

/**
 * Weeping Mother: she plants herself `stand` metres from the player and works from there. BROOD: a sac swells (`brood.swell` s, announced, she stops)
 * and `count` creatures drop beside her, at most `max` of her brood alive.
 * TEARS: after a `windup` s tell a slow tear is lobbed to the place the player stands (an arc long enough to see: it lands a flight later) and leaves
 * a pool (`updateTears`). Up close the ordinary swing in updateEnemy takes over.
 * Returns true when the tick is used up.
 */
function motherStep(w, e, def, diff, dt, sees, dist) {
  const B = def.brood,
    T = def.tears,
    p = w.player;
  if (e.broodT === undefined) {
    e.broodT = -1;
    e.shotCd = T.first;
    e.summonCd = B.first;
    e.brood = [];
    e.home = { x: e.x, z: e.z };
  }
  e.shotCd = Math.max(0, (e.shotCd ?? 0) - dt);
  e.summonCd = Math.max(0, (e.summonCd ?? 0) - dt);
  if (e.attackT >= 0) return false; // she is in the middle of a slam: updateEnemy finishes it
  if (e.broodT >= 0) {
    e.broodT += dt;
    e.walk *= 0.85;
    if (e.broodT >= B.swell) {
      e.broodT = -1;
      e.summonCd = B.every;
      e.brood = e.brood.filter((id) => w.enemies.some((o) => o.id === id && o.state !== 'dead'));
      const taken = [];
      for (let i = 0; i < B.count && e.brood.length < B.max; i++) {
        const spot = broodSpot(w, e, B.kind, taken);
        if (!spot) break;
        taken.push(spot);
        const g = spawnEnemy(w, B.kind, spot[0], spot[1], DM.atan2(p.x - spot[0], p.z - spot[1]));
        g.summoned = true;
        e.brood.push(g.id);
        w.stats.total.enemies++;
        wakeEnemy(w, g, false, true);
        emit(w, 'enemy_spawn', { id: g.id, kind: g.kind, x: g.x, z: g.z, brood: true });
      }
      emit(w, 'brood_birth', { id: e.id, x: e.x, z: e.z });
    }
    return true;
  }
  if ((e.pulseT ?? -1) >= 0) {
    // the tear's windup (she draws it up, then throws)
    e.pulseT += dt;
    e.walk *= 0.85;
    if (e.pulseT >= T.windup) {
      e.pulseT = -1;
      e.shotCd = T.every;
      lobTear(w, e, def);
    }
    return true;
  }
  if (!sees) return false;
  if (e.summonCd <= 0) {
    e.brood = e.brood.filter((id) => w.enemies.some((o) => o.id === id && o.state !== 'dead'));
    if (e.brood.length < B.max) {
      e.broodT = 0;
      emit(w, 'brood_swell', { id: e.id, x: e.x, z: e.z });
      return true;
    }
    e.summonCd = 2; // the brood is full: look again in a moment
  }
  if (e.shotCd <= 0 && dist >= T.minRange && dist <= T.maxRange) {
    e.pulseT = 0;
    emit(w, 'tear_windup', { id: e.id, x: e.x, z: e.z });
    return true;
  }
  if (dist <= def.stand && dist > def.attack.range + 0.4) {
    e.walk = Math.max(0, e.walk - dt * 3);
    return true;
  } // planted: she works from here
  if (def.leash && dist > def.attack.range + 0.4 && Math.hypot(e.x - e.home.x, e.z - e.home.z) >= def.leash) {
    e.walk = Math.max(0, e.walk - dt * 3);
    return true;
  } // and a throne is a throne: she goes no further than `leash` m from where she sits
  return false;
}

/**
 * throw a tear to where the player stands: a flight of `speedPerM` s a metre between `minFlight` and `maxFlight`, the arc exact for this integrator
 * (vy from the gravity and the height difference)
 */
function lobTear(w, e, def) {
  const T = def.tears,
    p = w.player,
    ox = e.x + DM.sin(e.yaw) * 0.5,
    oz = e.z + DM.cos(e.yaw) * 0.5,
    oy = e.y + def.height * 0.8,
    tx = p.x,
    tz = p.z,
    ty = floorAt(w, tx, tz) + 0.05;
  const d = Math.hypot(tx - ox, tz - oz),
    flight = clamp(d * T.speedPerM, T.minFlight, T.maxFlight),
    n = Math.max(1, Math.round(flight / TICK)),
    g = T.gravity,
    tt = n * TICK;
  const vy = (ty - oy) / tt + 0.5 * g * (tt + TICK); // the per-tick integrator (vy -= g dt; y += vy dt) lands exactly on ty after n ticks
  (w.tears ?? (w.tears = [])).push({ id: w.nextId++, x: ox, y: oy, z: oz, vx: (tx - ox) / tt, vy, vz: (tz - oz) / tt, g, left: n, r: T.r, life: T.life });
  w.patches ??= [];
  emit(w, 'tear_lob', { id: e.id, x: ox, y: oy, z: oz });
}

/** the tears in flight, and the pools they leave */
function updateTears(w, dt) {
  for (let i = w.tears.length - 1; i >= 0; i--) {
    const q = w.tears[i];
    q.vy -= q.g * dt;
    q.x += q.vx * dt;
    q.y += q.vy * dt;
    q.z += q.vz * dt;
    q.left--;
    const solid = cellSolid(w, Math.floor(q.x / w.map.cell), Math.floor(q.z / w.map.cell));
    if (q.left <= 0 || solid || q.y <= floorAt(w, q.x, q.z) + 0.02) {
      w.tears.splice(i, 1);
      if (solid) continue;
      w.patches.push({ id: w.nextId++, x: q.x, z: q.z, r: q.r, life: q.life, t0: w.time });
      emit(w, 'tear_land', { x: q.x, y: floorAt(w, q.x, q.z), z: q.z, r: q.r });
    }
  }
  for (let i = (w.patches?.length ?? 0) - 1; i >= 0; i--) {
    const q = w.patches[i];
    q.life -= dt;
    if (q.life <= 0) {
      emit(w, 'pool_dry', { x: q.x, z: q.z });
      w.patches.splice(i, 1);
    }
  }
}

/*
 * a map that says `lampHolds` has a lit lantern cut a ring's damage to `plain` (or to `own` with Ines's eternal lamp): the lamp is the counter-tone
 * (Campaign 1's first secret)
 */
function lampHold(w, dmg) {
  const H = w.map.lampHolds,
    L = w.player.lamp;
  return H && L?.on ? Math.round(dmg * (L.eternal ? (H.own ?? LAMP_HOLDS.own) : (H.plain ?? LAMP_HOLDS.plain))) : dmg;
}

/** a ring on the floor from a spec { speed, width, maxR, damage (before the difficulty), reflectAt?, h? } */
function pushPulse(w, diff, x, z, y, S, src = 'other:unknown') {
  w.pulses.push({
    id: w.nextId++,
    x,
    z,
    y,
    r: 0.6,
    speed: S.speed,
    dmg: Math.round(S.damage * diff.enemyDamage),
    width: S.width,
    maxR: S.maxR,
    hit: false,
    src,
    ...(S.reflectAt ? { reflectAt: S.reflectAt } : {}),
    ...(S.h ? { h: S.h } : {}),
  });
}

/*
 * the Resonant: on every beat, a ring whose damage grows with the company it keeps (awake, living, hostile creatures within `ring.near` m); alone it
 * is only a slow brute
 */
function resonantRing(w, e, def, diff) {
  const R = def.ring,
    p = w.player;
  if (Math.hypot(p.x - e.x, p.z - e.z) > R.maxR + 6) return;
  let n = 0;
  for (const o of w.enemies) {
    if (o === e || o.state === 'dead' || o.state === 'idle' || o.state === 'calm' || o.state === 'flee') continue;
    const od = ENEMIES[o.kind];
    if (od.node || od.peaceful) continue;
    if (Math.hypot(o.x - e.x, o.z - e.z) < R.near) n++;
  }
  if (n === 0) return;
  pushPulse(w, diff, e.x, e.z, e.y, { speed: R.speed, width: R.width, maxR: R.maxR, damage: Math.min(R.cap, R.base * (1 + n)) }, 'enemy:' + e.kind);
  emit(w, 'resonant_ring', { id: e.id, x: e.x, z: e.z, n });
}

function updatePulses(w, dt) {
  const p = w.player;
  for (let i = w.pulses.length - 1; i >= 0; i--) {
    const q = w.pulses[i];
    q.r += q.speed * dt;
    if (q.reflectAt && !q.back && q.r >= q.reflectAt) {
      q.back = true;
      q.speed = -Math.abs(q.speed);
      q.hit = false;
      emit(w, 'pulse_back', { x: q.x, z: q.z, r: q.r });
    } // the Sub-Cantor's ring turns at the wall and comes home: it can hurt a second time
    if (!q.hit && p.hp > 0) {
      const d = Math.hypot(p.x - q.x, p.z - q.z);
      if (Math.abs(d - q.r) < q.width / 2 + PLAYER.radius && Math.abs(p.y - q.y) < (q.h ?? 1.0) && hasLOS(w, q.x, q.z, p.x, p.z)) {
        q.hit = true;
        hurtPlayer(w, lampHold(w, q.dmg), q);
        emit(w, 'pulse_hit', { held: w.map.lampHolds && p.lamp?.on ? 1 : 0 });
      } // cover breaks the line; standing a metre above the floor clears the ring
    }
    if (q.back ? q.r <= 0.6 : q.r > q.maxR) w.pulses.splice(i, 1);
  }
}

/**
 * a range target's way back to its post: walk there, then (a 'fixed' one, or one that cannot see you) turn back to its heading. Returns true while it
 * is still moving or turning.
 */
function homeStep(w, e, def, dt, turnHome) {
  const dx = e.post.x - e.x,
    dz = e.post.z - e.z,
    d = Math.hypot(dx, dz),
    turn = def.turnRate * dt,
    face = (to) => {
      const a = DM.atan2(DM.sin(to - e.yaw), DM.cos(to - e.yaw));
      e.yaw += clamp(a, -turn, turn);
      return Math.abs(a) > turn;
    };
  if (d > 0.15) {
    const a = DM.atan2(dx, dz);
    face(a);
    const s = Math.min(d, def.speed * dt * moveMult(e));
    tryMove(w, e, DM.sin(a) * s, DM.cos(a) * s, def.radius);
    e.walk = Math.min(1, e.walk + dt * 3);
    e.phase += dt * (def.gait ?? 5.2);
    return true;
  }
  e.walk = Math.max(0, e.walk - dt * 3);
  return (turnHome || e.hold === 'fixed') && face(e.post.yaw);
}

/*
 * the pulse of a boss on its own, for a range target that says `rings: true`: after its cooldown, when it sees you, a windup, then one ring
 * (`reflect` as the boss's own); nothing else of bossStep. Only a range map can say it.
 */
function ringStep(w, e, def, diff, dt, sees) {
  const P = def.pulse;
  e.pulseCd = Math.max(0, (e.pulseCd ?? 0) - dt);
  if ((e.pulseT ?? -1) >= 0) {
    e.pulseT += dt;
    if (e.pulseT >= P.windup) {
      w.pulses.push({
        id: w.nextId++,
        x: e.x,
        z: e.z,
        y: e.y,
        r: 0.6,
        speed: P.speed,
        dmg: Math.round(P.damage * diff.enemyDamage),
        width: P.width,
        maxR: P.maxR,
        hit: false,
        src: 'enemy:' + e.kind,
        ...(P.reflect ? { reflectAt: P.reflect } : {}),
      });
      emit(w, 'pulse', { x: e.x, z: e.z });
      e.pulseT = -1;
      e.pulseCd = P.cooldown;
    }
  } else if (sees && e.pulseCd <= 0) {
    e.pulseT = 0;
    emit(w, 'enemy_windup', { id: e.id, kind: e.kind, x: e.x, z: e.z });
  }
}

function updateEnemy(w, e, diff, dt) {
  const p = w.player,
    def = ENEMIES[e.kind];
  e.flash = Math.max(0, e.flash - dt * 4);
  if (e.slowT > 0) {
    e.slowT = Math.max(0, e.slowT - dt);
    e.slowAge = (e.slowAge || 0) + dt;
    if (e.slowAge >= SLOW_MAX || e.slowT === 0) {
      e.slowT = 0;
      e.slowAge = 0;
      e.slowImm = SLOW_IMMUNE;
    }
  } else if (e.slowImm > 0) e.slowImm = Math.max(0, e.slowImm - dt);
  if (e.intCd > 0) e.intCd = Math.max(0, e.intCd - dt);
  if (e.hold) holdUpkeep(w, e, dt, emit); // a range target: heal when left alone, stand up again after a kill (range.js)
  // every state rides a moving floor: a corpse, a staggered Warden or a ring node on the funicular car keep standing on it
  e.y = groundAt(w, e.x, e.z, def.radius);
  // the Root Bell's clapper hangs on a pendulum (rootbell.js): its place is a function of the clock
  if (def.bell) bellMotion({ w, e, def, dt, groundAt: (x, z, r) => groundAt(w, x, z, r) });
  if (e.state === 'dead') {
    e.dead = Math.min(1, e.dead + dt / 0.9);
    e.walk *= 0.9;
    return;
  }
  if ((e.stunT || 0) > 0) {
    e.stunT -= dt;
    e.walk *= 0.9;
    e.attackT = -1;
    e.chargeT = -1;
    e.pulseT = -1;
    e.lungeT = -1;
    e.lungeHit = false;
    e.burstLeft = 0;
    if (e.snipeT !== undefined) {
      e.snipeT = -1;
      e.snipeAim = null;
    }
    e.snipeRun = false;
    if (e.broodT !== undefined) e.broodT = -1;
    if (e.echoT > 0) e.echoT = 0;
    return;
  } // staggered: it does nothing
  // a Brood Vat swells and births while it is awake; it never fights
  if ((def.spawner || def.feeds) && e.hold !== 'inert') vatStep(w, e, def, diff, dt);
  if (def.node) return;
  // a walker in a current is carried by it (a sleeper is not: it lies where the map put it)
  if (w.map.hasCurrent && e.state !== 'idle' && !def.flying && !e.hold && def.speed > 0) flowPush(w, e, def.radius, dt);
  if (e.burstLeft > 0) {
    e.burstT -= dt;
    if (e.burstT <= 0) {
      fireEnemyShot(w, e, def, diff, true);
      e.burstLeft--;
      e.burstT = def.ranged.burst.gap;
    }
  } // the rest of a Chorister's burst
  if (e.hold === 'inert') {
    if (e.post && Math.hypot(e.x - e.post.x, e.z - e.post.z) > 0.15 && !w.shoves?.some((q) => q.id === e.id)) homeStep(w, e, def, dt, false);
    else e.walk *= 0.9;
    return;
  } // a target that only takes it (and walks back to its post when a blast, a punt or the beam has moved it)
  if (def.peaceful) {
    folkStep(w, e, def, dt);
    return;
  } // it never fights: it wanders, watches, and runs (folk.js)
  if (def.ring && e.state !== 'idle' && isBeatTick(w.tick)) resonantRing(w, e, def, diff); // the Resonant rings on the beat
  const dx = p.x - e.x,
    dz = p.z - e.z,
    dist = Math.hypot(dx, dz),
    dyv = Math.abs(p.y - e.y); // dyv: an enemy cannot hit someone standing on a ledge two metres above it
  const sees = dist < (e.sightR ?? sightIn(w, def)) && p.hp > 0 && hasLOS(w, e.x, e.z, p.x, p.z);
  if (sees) {
    e.lastX = p.x;
    e.lastZ = p.z;
    e.lost = 0;
    if (e.searchT !== undefined) {
      delete e.searchT;
      delete e.searchYaw;
    }
  }
  // a target that only RINGS (the lamp yard's Sub-Cantor): its pulse, and nothing else of a boss
  if (e.rings && def.pulse) ringStep(w, e, def, diff, dt, sees);
  if (e.hold && !sees && e.attackT < 0 && (e.lungeT ?? -1) < 0 && (e.chargeT ?? -1) < 0) {
    homeStep(w, e, def, dt, true);
    return;
  } // a range target that cannot see you goes back to its post and its heading
  if (e.state === 'idle') {
    if (sees) wakeEnemy(w, e, true);
    else return;
  } else if (!sees) e.lost = (e.lost || 0) + dt;
  // hunt: head for the last place the player was seen; give up after a while (or on arrival) and go back to sleep
  const tx = sees || e.hunt ? p.x : (e.lastX ?? p.x),
    tz = sees || e.hunt ? p.z : (e.lastZ ?? p.z),
    // a `hunt` creature (a wave out of the dock's gates) always knows where you stand and never goes back to sleep
    tdist = Math.hypot(tx - e.x, tz - e.z);
  if (!sees && !e.hunt && !def.boss && !def.bell && !def.hive && e.attackT < 0 && (e.lungeT ?? -1) < 0 && (tdist < 1.2 || e.lost > 8)) { // a boss never sleeps again
    if (e.lost <= 8 && ordinary(e)) {
      // ENEMY ACTIONS: it looks round where it lost you before it gives up (tactics.js `search`)
      const Sr = TACTICS.search;
      if (e.searchT === undefined) {
        e.searchT = Sr.t;
        e.searchYaw = e.yaw;
      }
      e.searchT -= dt;
      e.yaw = e.searchYaw + DM.sin((Sr.t - e.searchT) * Sr.rate) * Sr.sweep;
      e.walk *= 0.9;
      if (e.searchT > 0) return;
    }
    if (e.searchT !== undefined) {
      delete e.searchT;
      delete e.searchYaw;
    }
    e.state = 'idle';
    e.walk = 0;
    return;
  }
  // steering: straight at the target when it is in view and the ground allows it; otherwise follow the distance field around walls, doors and ledges
  let ax = tx,
    az = tz;
  // ENEMY ACTIONS: its slot in the fan across the player's front (tactics.js), when the way there is clear
  const fp = sees && !def.ranged && ordinary(e) ? fanPoint(w, e) : null;
  if (fp && stepClear(w, e.x, e.z, fp.x, fp.z) && moveClear(w, e.x, e.z, fp.x, fp.z, def.radius)) {
    ax = fp.x;
    az = fp.z;
  } else if (!e.hold && (!sees || !stepClear(w, e.x, e.z, tx, tz) || !moveClear(w, e.x, e.z, tx, tz, def.radius))) {
    const wp = navWaypoint(w, e.x, e.z, tx, tz);
    if (wp && wp.dist > 0) {
      ax = wp.x;
      az = wp.z;
    }
  }
  let dy = DM.atan2(ax - e.x, az - e.z) - e.yaw;
  dy = DM.atan2(DM.sin(dy), DM.cos(dy));
  // a dash keeps its heading: that is what makes it dodgeable
  const dashing = (def.lunge && (e.lungeT ?? -1) >= def.lunge.windup) || (def.charge && (e.chargeT ?? -1) >= def.charge.windup);
  if (e.attackT < 0 && !dashing && e.hold !== 'fixed' && !e.snipeRun && !(e.actK && e.actK !== 'dodge'))
    // (a creature running to open the range turns toward its heading, reposition.js; one in the middle of an act of the brain turns its own way,
    // brain.js)
    e.yaw += clamp(dy, -def.turnRate * dt, def.turnRate * dt);
  e.cd = Math.max(0, e.cd - dt);
  // pushed off its post (by its own lunge or charge): back first
  if (e.hold && e.attackT < 0 && (e.lungeT ?? -1) < 0 && (e.chargeT ?? -1) < 0 && homeStep(w, e, def, dt, false)) return;
  if (
    def.bell &&
    !e.hold &&
    bellStep({
      w,
      e,
      def,
      diff,
      dt,
      emit,
      hpScale: diff.enemyHp,
      hurt: (d) => hurtPlayer(w, d, e),
      pulse: (x, z, y, S) => pushPulse(w, diff, x, z, y, S, 'enemy:' + e.kind),
      tryMove: (o, dx, dz, r) => tryMove(w, o, dx, dz, r),
      free: (x, z, r) => !blockedCircle(w, x, z, r, e),
      hitCyl: hitCylinder,
    })
  )
    return; // the clapper (rootbell.js): hung and falling take the tick, on the ground the ordinary code below runs
  if (def.charge && chargeStep(w, e, def, diff, dt, sees, dist, dyv)) return;
  if (def.support && !e.hold && supportStep(w, e, def, dt, sees, dist)) return;
  if (
    def.snipe &&
    (!e.hold || e.hold === 'turn') &&
    snipeStep({
      w,
      e,
      def,
      diff,
      dt,
      sees,
      dist,
      emit,
      hurt: (d) => hurtPlayer(w, d, e),
      rayClear,
      retreat: () => (e.hold ? false : retreatStep(w, e, def, dt)),
      ...runCtx(w, e, def, dt),
    })
  )
    return; // the Marksman's shot
  if (
    def.heal &&
    (!e.hold || e.hold === 'turn') &&
    healStep({
      w,
      e,
      def,
      diff,
      dt,
      sees,
      dist,
      emit,
      ...runCtx(w, e, def, dt),
      retreat: () => (e.hold ? false : retreatStep(w, e, def, dt)),
      toward: (x, z) => (e.hold ? false : stepToward(w, e, def, dt, x, z)),
    })
  )
    return; // the Mender's tether
  if (def.hive && !e.hold) {
    hiveStep({
      w,
      e,
      def,
      diff,
      dt,
      emit,
      phase: phaseOf(w, e, def),
      pulse: (x, z, y, S) => pushPulse(w, diff, x, z, y, S, 'enemy:' + e.kind),
      spawn: (kind, sx, sz) => {
        const p2 = w.player,
          g = spawnEnemy(w, kind, sx, sz, DM.atan2(p2.x - sx, p2.z - sz));
        g.summoned = true;
        w.stats.total.enemies++;
        wakeEnemy(w, g, false, true);
        emit(w, 'enemy_spawn', { id: g.id, kind: g.kind, x: g.x, z: g.z });
        return g;
      },
    });
    return;
  } // the Hive Cantor works on the beat (hivecantor.js)
  if (def.boss && !e.hold && !def.bell && bossStep(w, e, def, diff, dt, sees, dist)) return;
  if (def.brood && !e.hold && motherStep(w, e, def, diff, dt, sees, dist)) return;
  if (def.ward && !e.hold && acolyteStep(w, e, def, diff, dt, sees, dist)) return;
  // the brain (brain.js): a dodge, a run across, a lurch, a circle, a cower, a call
  if (def.brain && !e.hold && brainStep(brainCtx(w, e, def, diff, dt, sees, dist))) return;
  if (def.lunge) {
    const L = def.lunge;
    e.lungeCd = Math.max(0, (e.lungeCd || 0) - dt);
    if ((e.lungeT ?? -1) >= 0) {
      e.lungeT += dt;
      if (e.lungeT < L.windup)
        e.walk *= 0.8; // crouch: the readable tell
      else if (e.lungeT < L.windup + L.duration) {
        const hit = () => {
          if (!e.lungeHit) {
            e.lungeHit = true;
            strikePlayer(w, e, Math.round(def.attack.damage * diff.enemyDamage));
            emit(w, 'enemy_strike', { id: e.id, kind: e.kind, x: e.x, z: e.z });
          }
        };
        tryMove(w, e, DM.sin(e.yaw) * L.speed * dt, DM.cos(e.yaw) * L.speed * dt, def.radius);
        e.walk = 1;
        e.phase += dt * def.gait;
        if (dist < def.attack.reach * 0.7 && dyv < 1.6 && inFront(e, p, ENEMY_STRIKE.dashCos)) hit();
      } else {
        e.lungeT = -1;
        e.lungeCd = L.cooldown * diff.reaction;
        e.lungeHit = false;
        if (L.back && ordinary(e) && (-DM.sin(p.yaw) * (e.x - p.x) - DM.cos(p.yaw) * (e.z - p.z)) / (dist || 1) > 0.5) e.backT = L.back;
        // (ENEMY ACTIONS: a Gaunt hops back after its lunge, `lunge.back` s, but only from a player who FACES it: turn your back or run and it keeps
        // coming)
      }
      return;
    }
    if (e.backT > 0) {
      e.backT = Math.max(0, e.backT - dt);
      if (e.backT === 0) delete e.backT;
      if (retreatStep(w, e, def, dt)) {
        e.walk = Math.min(1, e.walk + dt * 3);
        e.phase += dt * def.gait;
        return;
      }
    }
    if (sees && e.attackT < 0 && e.lungeCd <= 0 && dist >= L.min && dist <= L.max && beatOk(w, e) && takeTurn(w, e, 'melee')) {
      e.lungeT = 0;
      e.lungeHit = false;
      emit(w, 'enemy_lunge', { id: e.id, kind: e.kind, x: e.x, z: e.z });
      return;
    }
  }
  const R = def.ranged,
    engage = R ? R.hold : def.attack.range;
  if (e.attackT >= 0) {
    e.attackT += dt;
    e.walk *= 0.85;
    if (!e.struck && e.attackT >= def.attack.duration * def.attack.windup) {
      e.struck = true;
      if (R && dist >= R.minRange)
        fireEnemyShot(w, e, def, diff); // ranged: toll a shot
      else {
        if (dist < def.attack.reach && dyv < 1.6 && inFront(e, p, ENEMY_STRIKE.cos)) {
          const res = strikePlayer(w, e, Math.round(def.attack.damage * diff.enemyDamage), !!def.boss || def.attack.damage >= 28 || !!def.attack.heavy);
          if (def.attack.knock && (res === 'hit' || res === 'broken'))
            tryMove(w, p, DM.sin(e.yaw) * def.attack.knock, DM.cos(e.yaw) * def.attack.knock, PLAYER.radius);
        }
        emit(w, 'enemy_strike', { id: e.id, kind: e.kind, x: e.x, z: e.z });
      }
    }
    if (e.attackT >= def.attack.duration) {
      e.attackT = -1;
      e.cd = def.attack.cooldown * diff.reaction;
      e.struck = false;
      if (R && !def.strafe && ordinary(e)) {
        if (def.brain?.strafe) {
          if (!e.hold) startStrafe(brainCtx(w, e, def, diff, dt, true, dist));
        } else {
          const Sh = TACTICS.shuffle;
          if (rand(w) < Sh.chance) {
            e.shufT = Sh.t[0] + rand(w) * (Sh.t[1] - Sh.t[0]);
            e.shufDir = rand(w) < 0.5 ? -1 : 1;
          }
        }
      }
    } // (ENEMY ACTIONS: a walking shooter side-steps after a shot; one with a brain RUNS across, brain.js)
  } else if (R && sees && e.cd <= 0 && dist <= R.maxRange && dist >= R.minRange && beatOk(w, e) && takeTurn(w, e, 'ranged')) {
    e.attackT = 0;
    e.struck = false;
    emit(w, 'enemy_windup', { id: e.id, kind: e.kind, x: e.x, z: e.z });
  } else if (!e.hold && (def.flying || def.retreat) && R && sees && dist < (R.keep ?? R.minRange) && retreatStep(w, e, def, dt)) {
    e.walk = Math.min(1, e.walk + dt * 3);
    e.phase += dt * def.gait;
  } else if (!e.hold && (sees ? !(dist <= engage && dyv < 1.6) : tdist > 1.2)) {
    chaseStep(w, e, def, dt);
    e.walk = Math.min(1, e.walk + dt * 3);
    e.phase += dt * (def.gait ?? 5.2);
  } else {
    if (e.shufT > 0) {
      // ENEMY ACTIONS: the side-step after a shot, square to the line to the player
      e.shufT = Math.max(0, e.shufT - dt);
      const a = DM.atan2(p.x - e.x, p.z - e.z) + (e.shufDir * Math.PI) / 2;
      if (moveAlong(w, e, def, dt, a, TACTICS.shuffle.speed)) {
        e.walk = Math.min(1, e.walk + dt * 3);
        e.phase += dt * (def.gait ?? 5.2);
      } else e.shufDir = -e.shufDir;
      if (e.shufT === 0) {
        delete e.shufT;
        delete e.shufDir;
      }
    } else if (e.hold) e.walk = Math.max(0, e.walk - dt * 3);
    else if (def.strafe && sees && !strafeStep(w, e, def, dt)) e.walk = Math.max(0, e.walk - dt * 3);
    else if (!def.strafe || !sees) e.walk = Math.max(0, e.walk - dt * 3);
    if (
      sees &&
      dist <= def.attack.range + 0.1 &&
      dyv < 1.6 &&
      e.cd <= 0 &&
      beatOk(w, e) &&
      (e.hold !== 'turn' || inFront(e, p, ENEMY_STRIKE.cos)) &&
      takeTurn(w, e, 'melee')
    ) {
      e.attackT = 0;
      e.struck = false;
      emit(w, 'enemy_windup', { id: e.id, kind: e.kind, x: e.x, z: e.z });
    } // (a range 'turn' target swings once it faces you, as a creature that walked up to you would; a 'fixed' one swings regardless)
  }
}

/** the timed hazards, then every creature and what it has thrown */
export function updateCreatures(w, diff, dt) {
  const map = w.map;
  if (map.pulses?.length) updateSpores(w);
  if (map.loads?.length) updateLoads(w);
  if (map.cars.length) updateCars(w);

  // enemies + their shots + the fire on the ground
  updateBurns(w, dt);
  if (w.loadFx) loadFxStep(w, dt);
  for (const e of w.enemies) updateEnemy(w, e, diff, dt);
  updateEnemyShots(w, diff, dt);
  updatePulses(w, dt);
  if (w.spikes) updateSpikes({ w, dt, emit, diff, spikes: ENEMIES.rootbell.bell.spikes, hurt: (d) => hurtPlayer(w, d, null, 'enemy:rootbell') });
  if (w.tears) updateTears(w, dt);
  if (w.resonators) updateResonators(w);
}
