// What every system of the simulation stands on: small helpers, the event queue, solid cells, moving a body, line of sight.
// Part of the deterministic simulation (world.js holds the order of a tick): nothing here touches DOM, Three, the clock or Math.random.
import { beltAtCell, beltPush } from './belts.js';
import { carDeckY } from './cars.js';
import { DOOR, ENEMIES, FLOW, FX, PLAYER, PROPS, STEP, WEAPONS } from './defs.js';
import { physBlocks } from './gravity.js';
import { nextRandom } from './rng.js';
import { floorAt, fxAt, fxSpeed, groundAt, tooHigh } from './terrain.js';
import { moveMult } from './weapons.js';
import * as DM from './dmath.js';

export const clamp = (x, a, b) => Math.min(b, Math.max(a, x));

export const rand = (w) => nextRandom(w);

export const lerp = (a, b, t) => a + (b - a) * t;

export const isMelee = (id) => WEAPONS[id]?.kind === 'melee';

export const owns = (p, id) => id === 'fists' || p.weapons.includes(id); // fists are always owned

export const hidden = (o, k, v) => Object.defineProperty(o, k, { value: v, enumerable: false, writable: true, configurable: true });

export const emit = (w, type, data = {}) => w.events.push({ type, tick: w.tick, ...data });

// ---------------------------------------------------------------- collision
export const doorAtCell = (w, cx, cz) => w.doors.find((d) => d.cx === cx && d.cz === cz);

export function cellSolid(w, cx, cz) {
  const m = w.map,
    k = m.kind(cx, cz);
  if (k === 'wall') return true;
  if (k === 'door' || k === 'secret') {
    const d = doorAtCell(w, cx, cz);
    return !d || d.open < DOOR.passableAt;
  }
  return false;
}

/** blocks walking: walls, closed doors, and water. (Sight and projectiles use cellSolid, so they pass over water.) */
function blocksMove(w, cx, cz, air = false) {
  return cellSolid(w, cx, cz) || w.map.kind(cx, cz) === 'water' || (!air && w.map.hasVoid && w.map.kind(cx, cz) === 'void');
}

/** `self` = the moving entity (player or enemy): living enemies and the player then block it, so nothing walks through anyone. */
export function blockedCircle(w, x, z, r, self = null) {
  const S = w.map.cell,
    fly = !!(self && self.kind && ENEMIES[self.kind]?.flying),
    air = !!(self && self.air); // a flyer (Drone-Gill) is stopped by walls and closed doors only: not by water, ledges or props
  for (let cz = Math.floor((z - r) / S); cz <= Math.floor((z + r) / S); cz++)
    for (let cx = Math.floor((x - r) / S); cx <= Math.floor((x + r) / S); cx++) {
      if (!(fly ? cellSolid(w, cx, cz) : blocksMove(w, cx, cz, air))) continue;
      const nx = clamp(x, cx * S, (cx + 1) * S),
        nz = clamp(z, cz * S, (cz + 1) * S);
      if ((x - nx) ** 2 + (z - nz) ** 2 < r * r) {
        if (
          w.map.cars.length &&
          self === w.player &&
          w.map.kind(cx, cz) === 'void' &&
          !(Math.floor(x / S) === cx && Math.floor(z / S) === cz && carDeckY(w.map, w.time, x, z) === -Infinity)
        )
          continue;
        return true;
        // (in a map with cars the void blocks the player's CENTRE and not the whole body: a body may overhang an edge, so a deck that leaves a dock can
        // never strand it inside a rule it no longer satisfies; the centre may be over a void cell only where a deck covers it)
      }
    }
  if (self && !fly && tooHigh(w, self, x, z, r)) return true; // a ledge more than a step above the mover's feet
  const over = air && self.y > groundAt(w, x, z, r) + 2.2; // a body in the air above the height of a prop or a creature passes over it
  if (!fly && !over)
    for (const p of w.map.props) {
      const pr = PROPS[p.kind].radius;
      if (pr > 0 && (x - p.x) ** 2 + (z - p.z) ** 2 < (r + pr) ** 2) return true;
    }
  if (!fly && w.phys && physBlocks(w, x, z, r, self)) return true; // a movable prop that has come to rest is as solid as a static one
  if (self) {
    for (const e of w.enemies)
      if (
        e !== self &&
        e.state !== 'dead' &&
        (x - e.x) ** 2 + (z - e.z) ** 2 < (r + ENEMIES[e.kind].radius) ** 2 &&
        !(air && (self.y > (e.y ?? 0) + ENEMIES[e.kind].height + (ENEMIES[e.kind].hover ?? 0) || self.y + 1.7 < (e.y ?? 0)))
      )
        return true;
    if (self !== w.player && (x - w.player.x) ** 2 + (z - w.player.z) ** 2 < (r + PLAYER.radius) ** 2) return true;
  }
  return false;
}

/** Chase movement with cheap obstacle avoidance: go straight if free, otherwise try angled headings, remembering the side that worked. */
export function chaseStep(w, e, def, dt) {
  const spd = def.speed * dt * fxSpeed(fxAt(w, e.x, e.z)) * moveMult(e),
    s = e.steer || (e.id % 2 ? 0.7 : -0.7);
  for (const off of [0, s, -s, 2 * s, -2 * s, 2.4 * s, -2.4 * s]) {
    // wide angles last: head-on against a round collider only a near-tangential step is free
    const a = e.yaw + off,
      sx = DM.sin(a) * spd,
      sz = DM.cos(a) * spd;
    if (!blockedCircle(w, e.x + sx, e.z + sz, def.radius, e)) {
      e.x += sx;
      e.z += sz;
      e.y = groundAt(w, e.x, e.z, def.radius);
      if (off !== 0) e.steer = off;
      else if (e.steer) e.steer = 0;
      return true;
    }
  }
  return false;
}

/**
 * move with axis-sliding collision, in steps of at most 0.25 m: a displacement larger than a wall is thick (the Warden's 3 m knockback) must stop AT
 * the wall, not test only where it would land (audit A03)
 */
export function tryMove(w, o, dx, dz, r) {
  const n = Math.min(64, Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dz)) / 0.25))),
    sx = dx / n,
    sz = dz / n; // at most 64 sub-steps (16 m a tick; play uses 1 to 3): a speed of 1e9 in a damaged save was 66 million sub-steps, a frozen tab
  for (let i = 0; i < n; i++) {
    let moved = false;
    if (!blockedCircle(w, o.x + sx, o.z, r, o)) {
      o.x += sx;
      moved = true;
    }
    if (!blockedCircle(w, o.x, o.z + sz, r, o)) {
      o.z += sz;
      moved = true;
    }
    if (!moved) break;
  }
  o.y = groundAt(w, o.x, o.z, r);
}

/* * wading water or a current: what the arc lamp conducts through */
export function inWater(w, x, z) {
  const c = fxAt(w, x, z);
  return c === 'w' || !!(c && FX[c]?.water && !(w.map.belts.length && beltAtCell(w.map, Math.floor(x / w.map.cell), Math.floor(z / w.map.cell))));
} // (a conveyor is a machine, not water:)

/* * a flowing floor pushes whoever stands on it, FLOW.push m/s, on top of their own movement */
export function flowPush(w, o, r, dt) {
  const c = fxAt(w, o.x, o.z),
    f = c && FX[c]?.flow;
  if (!f) return;
  if (w.map.belts.length) {
    const b = beltPush(w.map, o.x, o.z, w.time);
    if (b) {
      if (b.k) tryMove(w, o, f[0] * b.speed * b.k * dt, f[1] * b.speed * b.k * dt, r);
      return;
    }
  } // a clocked belt pushes by its own speed, signed by its clock, and not at all while it stands still
  tryMove(w, o, f[0] * FLOW.push * dt, f[1] * FLOW.push * dt, r);
}

export function hasLOS(w, x0, z0, x1, z1) {
  const S = w.map.cell,
    d = Math.hypot(x1 - x0, z1 - z0),
    n = Math.ceil(d / 0.4),
    flat = w.map.flat && w.map.sectors.length === 0;
  const ya = flat ? 0 : floorAt(w, x0, z0) + 1.4,
    yb = flat ? 0 : floorAt(w, x1, z1) + 1.4; // eye line from head to head; a ledge above it blocks the view, a step below it does not
  for (let i = 1; i < n; i++) {
    const t = i / n,
      x = x0 + (x1 - x0) * t,
      z = z0 + (z1 - z0) * t;
    if (cellSolid(w, Math.floor(x / S), Math.floor(z / S))) return false;
    if (!flat && floorAt(w, x, z) > ya + (yb - ya) * t - 0.1) return false;
    // pillars and stacked crates hide what is behind them
    for (const p of w.map.props) if (PROPS[p.kind].blocksSight && (x - p.x) ** 2 + (z - p.z) ** 2 < PROPS[p.kind].radius ** 2) return false;
  }
  return true;
}

/** is the player inside the arc in front of enemy `e` (cos of the half-angle)? The enemy's facing is its yaw: forward = (sin yaw, cos yaw) */
export function inFront(e, p, cos) {
  const dx = p.x - e.x,
    dz = p.z - e.z,
    d = Math.hypot(dx, dz);
  return d < 1e-6 || (DM.sin(e.yaw) * dx + DM.cos(e.yaw) * dz) / d >= cos;
}

export const forwardVec = (p) => [-DM.sin(p.yaw) * DM.cos(p.pitch), DM.sin(p.pitch), -DM.cos(p.yaw) * DM.cos(p.pitch)];

/** can a body of radius r walk the straight line from (x0,z0) to (x1,z1) past walls, closed doors and solid props? (actors are ignored: they move) */
export function moveClear(w, x0, z0, x1, z1, r) {
  const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, z1 - z0) / 0.45));
  for (let i = 1; i <= n; i++) if (blockedCircle(w, x0 + ((x1 - x0) * i) / n, z0 + ((z1 - z0) * i) / n, r * 0.9)) return false;
  return true;
}

/** can an actor walk in a straight line from (x0,z0) to (x1,z1) without meeting a ledge more than a step high? (always true on flat maps) */
export function stepClear(w, x0, z0, x1, z1) {
  if (w.map.flat && w.map.sectors.length === 0) return true;
  const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, z1 - z0) / 0.5));
  let prev = floorAt(w, x0, z0);
  for (let i = 1; i <= n; i++) {
    const f = floorAt(w, x0 + ((x1 - x0) * i) / n, z0 + ((z1 - z0) * i) / n);
    if (f - prev > STEP + 1e-6) return false;
    prev = f;
  }
  return true;
}

/** step away from the player (Sextons and the Cantor keep their distance) */
/* * one step toward a point (the Mender goes to the ones it tends), round whatever is in the way as the others do; false if it could not move */
export function stepToward(w, e, def, dt, x, z) {
  const spd = def.speed * dt * fxSpeed(fxAt(w, e.x, e.z)) * moveMult(e),
    to = DM.atan2(x - e.x, z - e.z);
  for (const off of [0, 0.7, -0.7, 1.4, -1.4]) {
    const a = to + off,
      sx = DM.sin(a) * spd,
      sz = DM.cos(a) * spd;
    if (!blockedCircle(w, e.x + sx, e.z + sz, def.radius, e)) {
      e.x += sx;
      e.z += sz;
      e.y = groundAt(w, e.x, e.z, def.radius);
      e.yaw = a;
      return true;
    }
  }
  return false;
}
