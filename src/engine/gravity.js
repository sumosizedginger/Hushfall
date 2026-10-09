// PT-022 (owner go 2026-10-08): THE GRAVITY TOOL and the movable props it works on. Pure functions of the world, called from world.js only when a map has movable props (`w.phys`) or the player holds the fork; no shipped map has either,
// so the campaign's simulation never reaches this file. Plain data in the world, no RNG, no clock: the sim stays deterministic.
//   w.phys    [{ id, kind, x, y (the BASE), z, vx, vy, vz, home: [x, z], held, hits, hitIds, gone, goneT, rest }]   (only on a map that lists `movable` props)
//   p.grav    { prop: id | null, pull: enemy id | null, blocked: s, beam: [x, y, z], beamT: tick }       (made when the fork is first used; beam / beamT: where the tractor beam ended last, for the view)
//   w.shoves  [{ id, vx, vz, t, k }]                                       (a creature a punt is carrying: the speed fades over GRAV.punt.time; made on the first punt)
import { PLAYER, ENEMIES, PHYS, PHYS_RULES as R, PROPS, NOISE, GRAV } from './defs.js';
import { floorAt, ceilingAt } from './terrain.js';
import { hitCylinder } from './hitvolume.js';
import { emit, damageEnemy, tryMove, cellSolid, rayClear, hitEffects, noise, wakeEnemy, forwardVec } from './world.js';

const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const eyeOf = (p) => [p.x, p.y + PLAYER.eye, p.z];
const angleBetween = (a, b) => Math.acos(clamp(a[0] * b[0] + a[1] * b[1] + a[2] * b[2], -1, 1));

/** the world's movable props: made once, from the map's `movable` props (an empty list, or none, on a map without any) */
export function spawnPhys(w, map) {
  return map.movables.map((e, i) => ({ id: 'p' + i, kind: e.kind, x: e.x, y: floorAt(w, e.x, e.z), z: e.z, vx: 0, vy: 0, vz: 0, home: [e.x, e.z], held: false, hits: 0, hitIds: [], gone: false, goneT: 0, rest: 0 }));
}

/** a wall, a closed door, a static prop or a ledge more than a step high under a circle of radius r at (x, z) whose base is y */
function blockedAt(w, x, z, r, y) {
  const S = w.map.cell;
  for (let cz = Math.floor((z - r) / S); cz <= Math.floor((z + r) / S); cz++) for (let cx = Math.floor((x - r) / S); cx <= Math.floor((x + r) / S); cx++) {
    if (!cellSolid(w, cx, cz)) continue;
    const nx = clamp(x, cx * S, (cx + 1) * S), nz = clamp(z, cz * S, (cz + 1) * S);
    if ((x - nx) ** 2 + (z - nz) ** 2 < r * r) return true;
  }
  for (const p of w.map.props) { const pr = PROPS[p.kind].radius; if (pr > 0 && (x - p.x) ** 2 + (z - p.z) ** 2 < (r + pr) ** 2 && y < floorAt(w, p.x, p.z) + 1.3) return true; }
  return floorAt(w, x, z) > y + 0.6;
}

/** the movable prop a point is inside (shots, rockets and enemy shots stop on it), or null; a held prop is not in the way */
export function physAt(w, x, y, z) {
  const list = w.phys; if (!list) return null;
  for (const q of list) { if (q.gone || q.held) continue; const d = PHYS[q.kind]; if ((x - q.x) ** 2 + (z - q.z) ** 2 < d.r * d.r && y >= q.y && y <= q.y + d.h) return q; }
  return null;
}
/** does a walker of radius r at (x, z) bump a movable prop? A walker already inside one may move out (a prop that lands on you does not trap you). */
export function physBlocks(w, x, z, r, self) {
  for (const q of w.phys) {
    if (q.gone || q.held) continue; const d = PHYS[q.kind], lim = (r + d.r) ** 2, d2 = (x - q.x) ** 2 + (z - q.z) ** 2;
    if (d2 >= lim) continue; if (q.y > floorAt(w, q.x, q.z) + 1.9) continue;                      // one flying overhead
    if (self && (self.x - q.x) ** 2 + (self.z - q.z) ** 2 < lim && d2 >= (self.x - q.x) ** 2 + (self.z - q.z) ** 2) continue;
    return true;
  }
  return false;
}

/** a prop is gone: a held one is let go of first; the Range brings it back (rangePlayer) */
function breakProp(w, q) {
  q.gone = true; q.goneT = 0; q.held = false; q.vx = q.vy = q.vz = 0;
  const p = w.player; if (p.grav?.prop === q.id) p.grav.prop = null;
  emit(w, 'phys_break', { id: q.id, kind: q.kind, x: q.x, y: q.y + PHYS[q.kind].h / 2, z: q.z });
}
/** a blast pushes the props near it (a rocket or a flare burst): away from the burst, a little up; a prop sent fast enough hurts what it meets */
export function blastProps(w, x, y, z, def) {
  if (!w.phys) return;
  for (const q of w.phys) {
    if (q.gone || q.held) continue; const h = PHYS[q.kind].h, d = Math.hypot(x - q.x, y - (q.y + h / 2), z - q.z); if (d >= def.splash) continue;
    const k = (def.knock ?? 0.8) * 4.5 * (1 - d / def.splash), nx = (q.x - x) / (d || 1), nz = (q.z - z) / (d || 1);
    q.vx += nx * k; q.vz += nz * k; q.vy += 2 + k * 0.25; q.hits = 0; q.hitIds = [];
  }
}

// ---------------------------------------------------------------------------------------------------- the props
/** every tick: gravity, the floor, the walls, and what a fast prop does to whoever it meets */
export function updatePhys(w, dt) {
  const list = w.phys; if (!list) return;
  for (const q of list) {
    if (q.gone || q.held) continue;
    const def = PHYS[q.kind], fl0 = floorAt(w, q.x, q.z);
    if (q.y <= fl0 + 1e-4 && Math.hypot(q.vx, q.vz) < 0.05 && q.vy <= 0) { q.vx = q.vz = q.vy = 0; q.rest++; if (q.rest > 6 && q.hits) { q.hits = 0; q.hitIds = []; } continue; }          // lying still: nothing to do
    q.rest = 0; q.vy -= R.gravity * dt;
    const sp = Math.hypot(q.vx, q.vy, q.vz), n = Math.max(1, Math.ceil(sp * dt / 0.2)); let wall = 0;
    for (let k = 0; k < n; k++) {
      const dx = q.vx * dt / n, dz = q.vz * dt / n;
      if (dx) { if (!blockedAt(w, q.x + dx, q.z, def.r, q.y)) q.x += dx; else { wall = Math.max(wall, Math.abs(q.vx)); q.vx *= -R.bounce; } }
      if (dz) { if (!blockedAt(w, q.x, q.z + dz, def.r, q.y)) q.z += dz; else { wall = Math.max(wall, Math.abs(q.vz)); q.vz *= -R.bounce; } }
      q.y += q.vy * dt / n;
      const fl = floorAt(w, q.x, q.z); if (q.y <= fl) { q.y = fl; if (q.vy < 0) q.vy = q.vy < -2.5 ? -q.vy * R.bounce : 0; }
      const cl = ceilingAt(w, q.x, q.z); if (q.y + def.h > cl) { q.y = cl - def.h; if (q.vy > 0) q.vy = -q.vy * 0.3; }
      if (hitBodies(w, q, def)) break;
    }
    if (q.gone) continue;
    if (q.y <= floorAt(w, q.x, q.z) + 1e-3) { const f = Math.exp(-R.friction * dt); q.vx *= f; q.vz *= f; }                       // sliding on the floor
    if (wall >= R.breakSpeed) breakProp(w, q);                                                                                  // thrown hard into a wall: it comes apart
  }
}
/** a fast prop against the creatures: damage by speed (plate does not turn a blunt blow), a shove, a flinch; it takes `hits` bodies before it breaks. Returns true when it broke. */
function hitBodies(w, q, def) {
  const sp = Math.hypot(q.vx, q.vy, q.vz); if (sp < R.hitSpeed) return false;
  for (const e of w.enemies) {
    if (e.state === 'dead' || q.hitIds.includes(e.id)) continue;
    const c = hitCylinder(e); if (!(q.y < c.y1 && q.y + def.h > c.y0) || (q.x - c.x) ** 2 + (q.z - c.z) ** 2 >= (def.r + c.r) ** 2) continue;
    q.hitIds.push(e.id); q.hits++;
    const dmg = def.dmg * Math.min(1.4, sp / R.throwRef), dx = c.x - q.x, dz = c.z - q.z, d = Math.hypot(dx, dz) || 1, ed = ENEMIES[e.kind];
    const killed = damageEnemy(w, e, dmg, { pierceArmor: true });
    if (!killed) { tryMove(w, e, dx / d * 0.9, dz / d * 0.9, ed.radius); hitEffects(w, e, { flinch: 0.5, stun: 0.8 }); emit(w, 'enemy_hit', { id: e.id, kind: e.kind, x: e.x, z: e.z }); }
    emit(w, 'phys_hit', { id: q.id, kind: q.kind, x: q.x, y: q.y + def.h / 2, z: q.z, killed, speed: sp }); noise(w, q.x, q.z, 12);
    q.vx *= 0.3; q.vz *= 0.3; q.vy = Math.max(q.vy, 2);
    if (q.hits >= def.hits) { breakProp(w, q); return true; }
  }
  return false;
}

// ---------------------------------------------------------------------------------------------------- the tool
/** where a held prop belongs: `hold.dist` m along the view (nearer if a wall is in the way), a little under eye height; { x, y (the BASE), z } */
function holdPoint(w, G, def) {
  const p = w.player, f = forwardVec(p), e = eyeOf(p); let d = G.hold.dist;
  for (let s = 0.4; s <= G.hold.dist + 0.4; s += 0.25) { const x = e[0] + f[0] * s, y = e[1] + f[1] * s, z = e[2] + f[2] * s; if (y < floorAt(w, x, z) + 0.05 || y > ceilingAt(w, x, z) || cellSolid(w, Math.floor(x / w.map.cell), Math.floor(z / w.map.cell)) || blockedAt(w, x, z, 0.1, y - 0.3)) { d = Math.max(1.2, s - 0.6); break; } }
  const x = e[0] + f[0] * d, z = e[2] + f[2] * d, cy = e[1] + f[1] * d + G.hold.up;
  return { x, z, y: Math.max(floorAt(w, x, z), cy - def.h / 2) };
}
/** move a prop toward a point at most `speed` m/s, sliding along walls; the velocity it ends up with is what it keeps when let go */
function drive(w, q, T, speed, dt) {
  const def = PHYS[q.kind], ox = q.x, oy = q.y, oz = q.z, dx = T.x - q.x, dy = T.y - q.y, dz = T.z - q.z, d = Math.hypot(dx, dy, dz) || 1, s = Math.min(d, speed * dt), k = s / d;
  if (!blockedAt(w, q.x + dx * k, q.z, def.r, q.y)) q.x += dx * k; if (!blockedAt(w, q.x, q.z + dz * k, def.r, q.y)) q.z += dz * k; q.y = Math.max(floorAt(w, q.x, q.z), q.y + dy * k);
  q.vx = clamp((q.x - ox) / dt, -9, 9); q.vy = clamp((q.y - oy) / dt, -9, 9); q.vz = clamp((q.z - oz) / dt, -9, 9);
  return s > 0.002 && Math.hypot(q.x - ox, q.z - oz) < s * 0.25;                                      // true: it was asked to move and could not (blocked)
}
const releaseProp = (w, q) => { q.held = false; q.rest = 0; q.hits = 0; q.hitIds = []; const p = w.player; if (p.grav) p.grav.prop = null; };

/** the target of the beam: the movable prop (then, failing that, the creature) nearest the middle of the view, inside the cone and the reach, with a clear line */
function pickProp(w, G, p) {
  if (!w.phys) return null; const e = eyeOf(p), f = forwardVec(p); let best = null, ba = 9;
  for (const q of w.phys) {
    if (q.gone || q.held) continue; const def = PHYS[q.kind], c = [q.x, q.y + def.h / 2, q.z], v = [c[0] - e[0], c[1] - e[1], c[2] - e[2]], d = Math.hypot(...v); if (d > G.reach || d < 0.4) continue;
    const ang = angleBetween(f, [v[0] / d, v[1] / d, v[2] / d]) - Math.atan2(def.r, d); if (ang > G.cone || ang >= ba || !rayClear(w, e[0], e[1], e[2], c[0], c[1], c[2], true)) continue;
    best = q; ba = ang;
  }
  return best;
}
function pickCreature(w, G, p) {
  const e = eyeOf(p), f = forwardVec(p); let best = null, ba = 9;
  for (const en of w.enemies) {
    const ed = ENEMIES[en.kind]; if (en.state === 'dead' || ed.node || ed.boss || (ed.poise ?? 1) >= G.pull.maxPoise) continue;
    const c = hitCylinder(en), mid = [c.x, (c.y0 + c.y1) / 2, c.z], v = [mid[0] - e[0], mid[1] - e[1], mid[2] - e[2]], d = Math.hypot(...v); if (d > G.reach || d < 0.4) continue;
    const ang = angleBetween(f, [v[0] / d, v[1] / d, v[2] / d]) - Math.atan2(c.r, d); if (ang > G.cone || ang >= ba || !rayClear(w, e[0], e[1], e[2], mid[0], mid[1], mid[2])) continue;
    best = en; ba = ang;
  }
  return best;
}

/** what the beam would take if aim were held now: 'prop' | 'creature' | null (the HUD's crosshair reads it; nothing is changed) */
export function gravTarget(w) {
  const G = GRAV, p = w.player; if (!w.enemies || p.hp <= 0) return null;
  if (p.grav?.prop != null) return 'held';
  if (pickProp(w, G, p)) return 'prop'; return pickCreature(w, G, p) ? 'creature' : null;
}
/** called every tick while the fork is in hand (world.js step, in place of firing) */
export function gravInput(w, cmd, def, canAct, dt) {
  const G = def.grav, p = w.player, st = (p.grav ??= { prop: null, pull: null, blocked: 0 });
  const held = st.prop != null ? w.phys?.find((q) => q.id === st.prop && q.held) : null;
  if (p.hp <= 0 || p.switchT > 0 || p.sprinting) { if (held) releaseProp(w, held); st.pull = null; return; }
  if (held) {
    if (!cmd.aim) { releaseProp(w, held); emit(w, 'grav_drop', { id: held.id }); return; }
    if (cmd.fire && p.cooldown <= 0) { throwProp(w, G, held); return; }
    const T = holdPoint(w, G, PHYS[held.kind]), stuck = drive(w, held, T, G.hold.follow, dt);
    st.blocked = stuck ? st.blocked + dt : 0; st.beam = [held.x, held.y + PHYS[held.kind].h / 2, held.z]; st.beamT = w.tick;
    if (st.blocked > G.hold.blocked || Math.hypot(held.x - T.x, held.z - T.z) > G.hold.max) { releaseProp(w, held); emit(w, 'grav_drop', { id: held.id }); }
    return;
  }
  st.prop = null; st.blocked = 0;
  if (cmd.aim && p.cooldown <= 0) tractor(w, G, p, st, dt); else if (st.pull != null) { const e = w.enemies.find((o) => o.id === st.pull); if (e) e.stunT = Math.max(e.stunT || 0, G.pull.linger); st.pull = null; }
  if (cmd.fire && canAct && !st.pull) punt(w, G);
}
/** the beam: a prop is drawn to the hold point and caught; failing that a creature is dragged in */
function tractor(w, G, p, st, dt) {
  let q = pickProp(w, G, p);
  if (q) {
    const T = holdPoint(w, G, PHYS[q.kind]); drive(w, q, T, 6 + 4 * Math.min(1, Math.hypot(q.x - T.x, q.z - T.z) / 3), dt);
    if (Math.hypot(q.x - T.x, q.y - T.y, q.z - T.z) < 0.5) { q.held = true; q.vx = q.vy = q.vz = 0; q.hits = 0; q.hitIds = []; st.prop = q.id; emit(w, 'grav_grab', { id: q.id, kind: q.kind, x: q.x, y: q.y, z: q.z }); }
    st.beam = [q.x, q.y + PHYS[q.kind].h / 2, q.z]; st.beamT = w.tick;
    return;
  }
  let e = st.pull != null ? w.enemies.find((o) => o.id === st.pull && o.state !== 'dead') : null;
  if (e && Math.hypot(e.x - p.x, e.z - p.z) > G.reach * 1.25) e = null;
  if (!e) e = pickCreature(w, G, p);
  if (!e) { st.pull = null; return; }
  if (e.state === 'idle') wakeEnemy(w, e, true);
  st.pull = e.id; const ed = ENEMIES[e.kind], dx = p.x - e.x, dz = p.z - e.z, d = Math.hypot(dx, dz) || 1;
  e.attackT = -1; e.lungeT = -1; e.chargeT = -1;
  if (d > G.pull.stop) { const s = Math.min(G.pull.speed * dt, d - G.pull.stop); tryMove(w, e, dx / d * s, dz / d * s, ed.radius); e.stunT = Math.max(e.stunT || 0, 0.25); st.beam = [e.x, e.y + ed.height * 0.5, e.z]; st.beamT = w.tick; }
  else { e.stunT = Math.max(e.stunT || 0, G.pull.stun); st.pull = null; emit(w, 'grav_catch', { id: e.id, x: e.x, z: e.z }); p.cooldown = Math.max(p.cooldown, 0.3); }
}
function throwProp(w, G, q) {
  const p = w.player, f = forwardVec(p), T = G.throw;
  releaseProp(w, q); q.vx = f[0] * T.speed + p.vx * 0.4; q.vy = f[1] * T.speed; q.vz = f[2] * T.speed + p.vz * 0.4; p.cooldown = T.cooldown; p.kick = 0.05;
  emit(w, 'grav_throw', { id: q.id, kind: q.kind, x: q.x, y: q.y + PHYS[q.kind].h / 2, z: q.z }); noise(w, p.x, p.z, NOISE.fork);
}
/** the punt: the shock goes out along the view. It turns toll-shots back, launches props and shoves creatures; with nothing in front of it, it only rings. */
function punt(w, G) {
  const p = w.player, P = G.punt, C = G.catch, f = forwardVec(p), e = eyeOf(p); let did = false;
  for (const q of w.enemyShots) {                                                                      // 1. a toll-shot in the cone goes back, faster, against the creatures
    if (q.reflected) continue; const v = [q.x - e[0], q.y - e[1], q.z - e[2]], d = Math.hypot(...v); if (d > C.reach || d < 0.2 || angleBetween(f, [v[0] / d, v[1] / d, v[2] / d]) > C.cone) continue;
    const sp = Math.hypot(q.vx, q.vy, q.vz) * C.speed; q.vx = f[0] * sp; q.vy = f[1] * sp; q.vz = f[2] * sp; q.reflected = true; q.dmg = Math.round(q.dmg * C.dmg); q.life = 4; did = true; emit(w, 'shot_reflect', { x: q.x, y: q.y, z: q.z });
  }
  for (const q of w.phys ?? []) {                                                                       // 2. a prop in the cone is launched
    if (q.gone || q.held) continue; const def = PHYS[q.kind], c = [q.x, q.y + def.h / 2, q.z], v = [c[0] - e[0], c[1] - e[1], c[2] - e[2]], d = Math.hypot(...v); if (d > P.reach || d < 0.3) continue;
    if (angleBetween(f, [v[0] / d, v[1] / d, v[2] / d]) - Math.atan2(def.r, d) > P.cone || !rayClear(w, e[0], e[1], e[2], c[0], c[1], c[2], true)) continue;
    q.vx = f[0] * P.props; q.vz = f[2] * P.props; q.vy = f[1] * P.props + P.lift; q.hits = 0; q.hitIds = []; did = true; emit(w, 'grav_punt_prop', { id: q.id, kind: q.kind, x: q.x, y: c[1], z: q.z });
  }
  const shoves = (w.shoves ??= []);
  for (const en of w.enemies) {                                                                         // 3. a creature in the cone is carried
    const ed = ENEMIES[en.kind]; if (en.state === 'dead' || ed.node || ed.boss) continue;
    const c = hitCylinder(en), mid = [c.x, (c.y0 + c.y1) / 2, c.z], v = [mid[0] - e[0], mid[1] - e[1], mid[2] - e[2]], d = Math.hypot(...v); if (d > P.reach || d < 0.2) continue;
    if (angleBetween(f, [v[0] / d, v[1] / d, v[2] / d]) - Math.atan2(c.r, d) > P.cone || !rayClear(w, e[0], e[1], e[2], mid[0], mid[1], mid[2])) continue;
    const elite = (ed.poise ?? 1) >= 3, k = (1 - P.falloff * d / P.reach) * (elite ? P.elite : 1), h = Math.hypot(f[0], f[2]) || 1;
    if (en.state === 'idle') wakeEnemy(w, en, true);
    en.attackT = -1; en.lungeT = -1; en.chargeT = -1; en.stunT = Math.max(en.stunT || 0, elite ? P.stun * 0.4 : P.stun);
    const old = shoves.findIndex((s) => s.id === en.id); if (old >= 0) shoves.splice(old, 1);
    shoves.push({ id: en.id, vx: f[0] / h * P.push * k, vz: f[2] / h * P.push * k, t: P.time, k: elite ? 0 : 1 }); did = true;
  }
  p.cooldown = did ? P.cooldown : P.miss; p.kick = did ? 0.07 : 0.02;
  emit(w, 'grav_punt', { hit: did, x: p.x, z: p.z }); noise(w, p.x, p.z, NOISE.fork);
}

/** the creatures a punt is carrying: a speed that fades; a wall, a prop or another body stops one and it is struck (`impact` x how fast it still was), and the body it ran into is struck for half and carried on */
export function updateShoves(w, dt) {
  const list = w.shoves; if (!list?.length) return; const P = GRAV.punt;
  for (let i = 0; i < list.length; i++) {
    const s = list[i], e = w.enemies.find((o) => o.id === s.id);
    if (!e || e.state === 'dead') { list.splice(i--, 1); continue; }
    const f = Math.max(0, s.t / P.time); s.t -= dt;
    if (s.t <= -dt) { list.splice(i--, 1); continue; }
    const ed = ENEMIES[e.kind], dx = s.vx * f * dt, dz = s.vz * f * dt, ix = e.x, iz = e.z, want = Math.hypot(dx, dz);
    tryMove(w, e, dx, dz, ed.radius);
    if (want > 1e-4 && Math.hypot(e.x - ix, e.z - iz) < want * 0.4) {
      if (s.k > 0) {
        let other = null, od = 1e9; for (const o of w.enemies) { if (o === e || o.state === 'dead') continue; const d = Math.hypot(o.x - e.x, o.z - e.z) - ENEMIES[o.kind].radius - ed.radius; if (d < 0.35 && d < od && ((o.x - e.x) * dx + (o.z - e.z) * dz) > 0) { other = o; od = d; } }
        const dmg = P.impact * Math.max(0.35, f), killed = damageEnemy(w, e, dmg, { pierceArmor: true });
        emit(w, 'shove_impact', { id: e.id, kind: e.kind, x: e.x, y: e.y + ed.height * 0.5, z: e.z, killed, body: !!other });
        if (!killed) { e.stunT = Math.max(e.stunT || 0, P.stun); emit(w, 'enemy_hit', { id: e.id, kind: e.kind, x: e.x, z: e.z }); }
        if (other && !ENEMIES[other.kind].boss && !ENEMIES[other.kind].node) {
          const k2 = damageEnemy(w, other, dmg * 0.5, { pierceArmor: true }); if (!k2) { other.stunT = Math.max(other.stunT || 0, P.stun * 0.7); emit(w, 'enemy_hit', { id: other.id, kind: other.kind, x: other.x, z: other.z }); if (!list.some((o) => o.id === other.id)) list.push({ id: other.id, vx: s.vx * f * 0.5, vz: s.vz * f * 0.5, t: P.time * 0.6, k: 0 }); }
        }
      }
      list.splice(i--, 1);
    }
  }
}
/** the Range only: a broken prop comes back at its home after a pause, and one left far from home for a long time goes back (nothing else would ever bring it) */
export function rangePhys(w, dt) {
  const list = w.phys; if (!list) return;
  for (const q of list) {
    if (q.gone) { q.goneT += dt; if (q.goneT >= R.respawnAfter) { Object.assign(q, { gone: false, goneT: 0, x: q.home[0], z: q.home[1], y: floorAt(w, q.home[0], q.home[1]), vx: 0, vy: 0, vz: 0, held: false, hits: 0, hitIds: [], rest: 0 }); emit(w, 'phys_respawn', { id: q.id, x: q.x, z: q.z }); } continue; }
    if (q.held) { q.stray = 0; continue; }
    if (Math.hypot(q.x - q.home[0], q.z - q.home[1]) > 2) { q.stray = (q.stray ?? 0) + dt; if (q.stray >= R.strayAfter && q.rest > 30) { Object.assign(q, { x: q.home[0], z: q.home[1], y: floorAt(w, q.home[0], q.home[1]), vx: 0, vy: 0, vz: 0, stray: 0, hits: 0, hitIds: [] }); emit(w, 'phys_respawn', { id: q.id, x: q.x, z: q.z }); } } else q.stray = 0;
  }
}
/** the fork is put away: let go of whatever it holds and stop pulling */
export function gravDrop(w) {
  const st = w.player.grav; if (!st) return;
  const q = st.prop != null ? w.phys?.find((o) => o.id === st.prop) : null; if (q?.held) releaseProp(w, q);
  if (st.pull != null) { const e = w.enemies.find((o) => o.id === st.pull); if (e) e.stunT = Math.max(e.stunT || 0, GRAV.pull.linger); }
  st.prop = null; st.pull = null; st.blocked = 0;
}
