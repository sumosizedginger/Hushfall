// PT-037, Campaign 2 Act A (design/CAMPAIGN2.md E1): THE QUIET FOLK. A peaceful creature (`ENEMIES.<kind>.peaceful`, today the Vael civilian) is an ordinary entry of `w.enemies`, so every weapon already hits it,
// but its states are 'calm' and 'flee', never 'idle' or 'chase': nothing that wakes sleepers, counts the awake or lets the others call for help touches it. It never attacks. Calm: it stands near its post, now and then
// walks a few metres to another place, and turns to look at the player. Frightened (a shot, a blast or a blow heard inside the noise's radius, or a hit taken): it runs from where the sound came, round walls, for
// FOLK.fearT s after the last one, then settles where it ended up. No random stream is read (a small hash of its id and the clock stands in), so a world without folk is byte for byte what it was, and one with folk
// is deterministic. The damage side (an innocent is not a kill) lives in world.js `damageEnemy`.
import { ENEMIES, FOLK, NOISE } from './defs.js';
import { tryMove, moveClear, hasLOS, emit } from './world.js';

const TAU = Math.PI * 2;
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
const hash01 = (a, b) => { const s = Math.sin(a * 12.9898 + b * 78.233) * 43758.5453; return s - Math.floor(s); };

/** a shot, a blast or a blow was noticed at (fx, fz): run from it, for FOLK.fearT s from now */
export function frighten(w, e, fx, fz) {
  if (e.state === 'dead') return;
  if (e.state !== 'flee') emit(w, 'folk_fear', { id: e.id, kind: e.kind, x: e.x, z: e.z });
  e.state = 'flee'; e.fearT = FOLK.fearT; e.fearX = fx; e.fearZ = fz;
}

/** world.js `noise()` calls this for each folk it passes: does this one hear it? */
export function folkHears(w, e, x, z, radius) {
  const d = Math.hypot(e.x - x, e.z - z);
  if (d < radius * FOLK.hear && (d < NOISE.closeRange || hasLOS(w, x, z, e.x, e.z))) frighten(w, e, x, z);
}

/** one tick of a live peaceful creature */
export function folkStep(w, e, def, dt) {
  e.homeX ??= e.x; e.homeZ ??= e.z;
  const turnTo = (a, rate) => { const d = wrap(a - e.yaw); e.yaw += Math.max(-rate * dt, Math.min(rate * dt, d)); return Math.abs(d); };
  if (e.state === 'flee') {
    e.fearT -= dt;
    if (e.fearT <= 0) { e.state = 'calm'; e.homeX = e.x; e.homeZ = e.z; e.goX = undefined; return; }          // it settles where it ended up
    const away = Math.atan2(e.x - e.fearX, e.z - e.fearZ), clear = (a) => moveClear(w, e.x, e.z, e.x + Math.sin(a) * 1.4, e.z + Math.cos(a) * 1.4, def.radius);
    let best = null;
    if (e.fleeA !== undefined && Math.abs(wrap(e.fleeA - away)) < 1.7 && clear(e.fleeA)) best = e.fleeA;           // keep a heading that still works (no dithering at a wall)
    else for (const off of [0, 0.5, -0.5, 1.0, -1.0, 1.6, -1.6, 2.3, -2.3]) if (clear(away + off)) { best = away + off; break; }       // straight away first, then round the obstacle, last of all back past it
    if (best === null) { e.walk = Math.max(0, e.walk - dt * 3); return; }                                          // cornered: it crouches where it is
    e.fleeA = best;
    const off = turnTo(best, def.turnRate * 1.6);
    if (off < 0.8) tryMove(w, e, Math.sin(e.yaw) * def.speed * dt, Math.cos(e.yaw) * def.speed * dt, def.radius);
    e.walk = Math.min(1, e.walk + dt * 4); e.phase += dt * def.gait * 1.3;
    return;
  }
  const p = w.player, bucket = Math.floor((w.time + e.id * 0.37) / FOLK.wanderEvery);
  if (e.wanderB !== bucket) {                                                                                    // every few seconds: stay, or pick a place a few metres from the post
    e.wanderB = bucket;
    if (hash01(e.id, bucket) > 0.35) { const a = hash01(bucket, e.id + 5) * TAU, r = FOLK.wanderR * (0.3 + 0.7 * hash01(e.id + 9, bucket)); e.goX = e.homeX + Math.sin(a) * r; e.goZ = e.homeZ + Math.cos(a) * r; }
    else e.goX = undefined;
  }
  if (e.goX !== undefined) {
    const dx = e.goX - e.x, dz = e.goZ - e.z, d = Math.hypot(dx, dz), a = Math.atan2(dx, dz);
    if (d < 0.2 || !moveClear(w, e.x, e.z, e.x + Math.sin(a) * Math.min(d, 0.9), e.z + Math.cos(a) * Math.min(d, 0.9), def.radius)) e.goX = undefined;
    else { const off = turnTo(a, def.turnRate); if (off < 0.6) tryMove(w, e, Math.sin(e.yaw) * FOLK.calmSpeed * dt, Math.cos(e.yaw) * FOLK.calmSpeed * dt, def.radius); e.walk = Math.min(0.4, e.walk + dt * 2); e.phase += dt * def.gait * 0.45; return; }
  }
  e.walk = Math.max(0, e.walk - dt * 3);
  const dp = Math.hypot(p.x - e.x, p.z - e.z);
  if (p.hp > 0 && dp < FOLK.look && hasLOS(w, e.x, e.z, p.x, p.z)) turnTo(Math.atan2(p.x - e.x, p.z - e.z), def.turnRate * 0.5);          // it watches you
}
