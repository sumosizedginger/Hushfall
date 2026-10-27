// THE BRAIN (PT-076; the owner, 2026-10-26, after playing the enemy actions of PT-075: "the enemies seem to move and fight the exact same as before", "even on easy this is not hard", "I just want to give
// our enemies a better brain"). Measured first: the fan and the turns of tactics.js act only when two or more creatures fight you at once, which was 2% of the fighting time, and the side-step was half
// a metre. Most fights are one or two creatures, so every behaviour here acts on ONE creature and is big enough to see:
//   * DODGE: a creature you shoot at (or hold in your sights) dashes sideways out of the line, after a short reaction; never in the middle of its own blow.
//   * STRAFE: a walking shooter RUNS across after each shot, two to three metres, turned toward where it runs.
//   * LURCH: a Tollbearer that sees you a few metres off groans, then surges at you at more than twice its shamble.
//   * CIRCLE: a Gaunt out of pouncing range runs round you before it closes, so the pounce comes from the side.
//   * COWER: a badly hurt Gaunt, Bellhand or Gill may turn and run for a moment, then come back.
//   * CALL: a Bellhand that sees you rings for help (a readable windup: kill it first or the room wakes).
// Which creature does what is data: `ENEMIES[kind].brain` (defs.js). Pure: the world's own functions come in through `ctx` (as reposition.js). Lazy fields on the creature: `actK` (the act under way:
// 'dodge' | 'strafe' | 'lurch' | 'circle' | 'cower' | 'call'), `actT`, `actYaw`, `actDir`, and the cooldowns `dodgeCd`, `lurchCd`, `circCd`, `aimT`, and once-a-life flags `cowered`, `called`.
// A creature with no `brain` never gets any of them, so a world without one is byte-for-byte what it was.
import { ENEMIES } from './defs.js';
import { ordinary } from './tactics.js';

export const BRAIN = Object.freeze({
  diff: { easy: { chance: 0.6, cd: 1.4 }, normal: { chance: 1, cd: 1 }, hard: { chance: 1, cd: 0.95 } },          // per difficulty: the chances are multiplied by `chance`, the cooldowns by `cd` (Hard is harder by its creatures' hit points and blows; a brain sharper than Normal's killed the route bot on eight maps)
  dodge: { t: 0.34, k: 2.6, cap: 6.5, react: [0.06, 0.18], cd: [2.4, 3.6], aim: 0.55, ads: 0.7, cone: 0.7 },          // the dash: seconds, share of its speed (but at most `cap` m/s); the reaction before it; the cooldown; held `aim` s in the sights (aiming down them past `ads`) also makes it move; `cone` m round its body counts as aimed at
  strafe: { dist: [2.0, 3.4], k: 1.45, maxT: 2.2, turn: 1.6 },                                                       // a shooter's run across after a shot: metres (range), share of its speed, the longest it may take, how much faster than usual it turns into the run
  lurch: { min: 3.6, max: 8, windup: 0.42, t: 1.0, k: 2.2, turn: 2, recover: 0.7, cd: [6, 9], first: [2, 5] },          // a Tollbearer's surge: between `min` and `max` m, a groan of `windup` s, then `t` s at `k` x its speed, turning `turn` x its rate; it lands OFF BALANCE and cannot swing for `recover` s (your window: a surge straight into a blow killed the strafing bot on six maps); cooldown; the first one waits `first` s after it wakes
  circle: { min: 6.5, max: 11, r: 6.8, t: [0.9, 1.7], k: 1.0, cd: [4.5, 7], first: [0, 1.2], still: 3 },            // a Gaunt's run round you: between `min` and `max` m, at radius `r`, for `t` s, at `k` x its speed; cooldown; only round a player moving slower than `still` m/s (one who runs is chased: a circling Gaunt let a player who ran past every fight through)
  cower: { below: 0.35, chance: 0.5, t: [1.4, 2.2], k: 1.15, turn: 1.6 },                                             // under `below` of its hit points (one roll a life), it runs for `t` s
  call: { windup: 0.85, radius: 16, most: 3 },                                                                        // a Bellhand's ring for help: the windup (hurt it and it fails), how far it is heard along the floor, how many come (the nearest; waking a whole room was the biggest single cause of the route bot's deaths)
});

const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a)), clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));
const span = (r, [a, b]) => a + r() * (b - a);
/** does creature `e` have this part of the brain, and is it one of the ordinary roster (bosses, nodes, range targets keep their own code) */
export const has = (e, part) => !!ENEMIES[e.kind].brain?.[part] && ordinary(e);
const busy = (e) => e.attackT >= 0 || (e.lungeT ?? -1) >= 0 || (e.chargeT ?? -1) >= 0;
const end = (e) => { delete e.actK; delete e.actT; delete e.actYaw; delete e.actDir; };

/** turn toward heading `a` at `rate` rad/s and move along the facing as far round as it has turned (an arc, not a pivot); true if it moved */
function arcRun(ctx, a, k, rate) {
  const { e, def, dt, moveAt } = ctx, off = wrap(a - e.yaw);
  e.yaw = wrap(e.yaw + clamp(off, -rate * dt, rate * dt));
  const c = Math.max(0, Math.cos(wrap(a - e.yaw))), go = c > 0.2 && moveAt(e.yaw, k * c);
  e.walk = go ? Math.min(1, e.walk + dt * 5) : Math.max(0, e.walk - dt * 4); if (go) e.phase += dt * def.gait * (0.6 + 0.4 * c * Math.min(1.6, k));
  return go;
}
/** face the player at `rate` x the creature's turn rate */
function facePlayer(ctx, rate = 1) { const { e, def, dt, p } = ctx, to = Math.atan2(p.x - e.x, p.z - e.z), off = wrap(to - e.yaw), r = def.turnRate * rate * dt; e.yaw = wrap(e.yaw + clamp(off, -r, r)); }
/** a side of the line to the player that is open for a metre and a half, the random one first; null if both are walled */
function openSide(ctx) {
  const { e, p, rand, headingOpen } = ctx, b = Math.atan2(p.x - e.x, p.z - e.z), first = rand() < 0.5 ? 1 : -1;
  for (const s of [first, -first]) { const a = b + s * Math.PI / 2; if (headingOpen(a)) return { a, s }; }
  return null;
}

/** is the creature in the player's sights: in front of the eye and within its hit radius plus `cone` m of the line of the crosshair (on the ground plan) */
export function inSights(p, e, cone) {
  const fx = -Math.sin(p.yaw), fz = -Math.cos(p.yaw), dx = e.x - p.x, dz = e.z - p.z, along = fx * dx + fz * dz;
  if (along <= 0) return false;
  const d = ENEMIES[e.kind]; return Math.abs(fx * dz - fz * dx) < (d.hitRadius ?? d.radius) + cone;
}

/** after a ranged attack: a creature with `brain.strafe` runs across (returns true if it started) */
export function startStrafe(ctx) {
  const { e, def, rand } = ctx, S = BRAIN.strafe; if (!has(e, 'strafe') || e.actK) return false;
  const side = openSide(ctx); if (!side) return false;
  e.actK = 'strafe'; e.actYaw = side.a; e.actDir = side.s; e.actT = Math.min(S.maxT, span(rand, S.dist) / (def.speed * S.k)); return true;
}

/**
 * One tick of the brain, before the creature's ordinary rules. Returns true when it took the tick (the ordinary rules are skipped this tick).
 * ctx: { w, e, def, dt, sees, dist, p, rand, fired (the player fired this tick), hpMax, emit (the world's own event function, called with the world first), moveAt(a, k) -> moved?, headingOpen(a), freeHeading(prefer) -> heading | null,
 *        clearTo(x, z) -> a straight walk is clear, callable(radius) -> someone would hear a call, call(radius, most) -> how many it woke, takeTurn(kind) -> may it start an attack (tactics.js) }
 */
export function brainStep(ctx) {
  const { w, e, def, dt, sees, dist, p, rand, emit } = ctx, B = def.brain, D = BRAIN.diff[w.difficulty] ?? BRAIN.diff.normal;
  if (!B || !ordinary(e)) return false;
  for (const k of ['dodgeCd', 'lurchCd', 'circCd']) if (e[k] > 0) e[k] = Math.max(0, e[k] - dt);
  if (busy(e)) { if (e.actK && e.actK !== 'dodge') end(e); return false; }                                              // its own blow, lunge or charge comes first (a dodge already decided waits for it)

  // an act under way
  if (e.actK) {
    e.actT -= dt;
    if (e.actK === 'dodge') {
      const Dg = BRAIN.dodge;
      if (e.actT > Dg.t) return false;                                                                                     // the reaction: it has not moved yet
      if (e.actT <= 0) { end(e); return false; }
      facePlayer(ctx, 1.5); const go = ctx.moveAt(e.actYaw, Math.min(Dg.k, Dg.cap / def.speed));
      if (!go) { end(e); return false; }
      e.walk = 1; e.phase += dt * def.gait * 1.6; return true;
    }
    if (e.actK === 'strafe') {
      if (e.actT <= 0) { end(e); return false; }
      if (!ctx.headingOpen(e.actYaw)) { end(e); return false; }
      arcRun(ctx, e.actYaw, BRAIN.strafe.k, def.turnRate * BRAIN.strafe.turn); return true;
    }
    if (e.actK === 'cower') {
      if (e.actT <= 0) { end(e); return false; }
      if (!ctx.headingOpen(e.actYaw)) { const h = ctx.freeHeading(e.actYaw); if (h == null) { end(e); return false; } e.actYaw = h; }
      arcRun(ctx, e.actYaw, BRAIN.cower.k, def.turnRate * BRAIN.cower.turn); return true;
    }
    if (e.actK === 'lurch') {
      const L = BRAIN.lurch, stop = () => { const surged = e.actT <= L.t; end(e); if (surged) e.cd = Math.max(e.cd || 0, L.recover); return false; };          // a surge ends off balance
      if (!sees || e.actT <= 0) return stop();
      if (e.actT > L.t) { if (dist <= def.attack.range + 0.1) { end(e); return false; } facePlayer(ctx, 1.5); e.walk *= 0.8; return true; }          // the groan: it plants itself and leans in (a player who comes within reach meanwhile gets the swing instead: a runner slipped past a planted Tollbearer)
      if (dist <= def.attack.range + 0.1) return stop();                                                                    // there: the ordinary rules swing, once it has its balance
      facePlayer(ctx, L.turn); const go = ctx.moveAt(e.yaw, L.k);
      if (!go) return stop();
      e.walk = 1; e.phase += dt * def.gait * 1.8; return true;
    }
    if (e.actK === 'circle') {
      const C = BRAIN.circle;
      if (!sees || e.actT <= 0 || dist > C.max + 2 || Math.hypot(p.vx || 0, p.vz || 0) > C.still + 1) { end(e); e.circCd = span(rand, C.cd) * D.cd; return false; }
      const b = Math.atan2(e.x - p.x, e.z - p.z), h = b + e.actDir * (Math.PI / 2 + clamp((dist - C.r) * 0.3, -0.5, 0.5));          // round the player, leaning in or out toward the radius
      if (!ctx.headingOpen(h)) { e.actDir = -e.actDir; if (!ctx.headingOpen(b + e.actDir * Math.PI / 2)) { end(e); e.circCd = span(rand, C.cd) * D.cd; return false; } return true; }
      arcRun(ctx, h, C.k, def.turnRate); return true;
    }
    if (e.actK === 'call') {
      if (e.flash > 0.9) { end(e); return false; }                                                                         // hurt while it rings: the call fails
      facePlayer(ctx); e.walk *= 0.85;
      if (e.actT <= 0) { const n = ctx.call(BRAIN.call.radius, BRAIN.call.most);emit(w, 'enemy_call', { id: e.id, kind: e.kind, x: e.x, z: e.z, woke: n }); end(e); }
      return true;
    }
    end(e); return false;
  }

  // what starts one (a creature BORN in the fight, a Mother's brood, a vat's, a boss's summons, rushes: it never circles or cowers; chasing those runners kept the route bot off the Weeping Mother for a minute)
  const born = !!e.summoned;
  if (B.cower && !born && !e.cowered && e.hp > 0 && e.hp < ctx.hpMax * BRAIN.cower.below) {
    e.cowered = true;
    if (rand() < BRAIN.cower.chance * D.chance) { const h = ctx.freeHeading(null); if (h != null) { e.actK = 'cower'; e.actYaw = h; e.actT = span(rand, BRAIN.cower.t); emit(w, 'enemy_cower', { id: e.id, kind: e.kind, x: e.x, z: e.z }); return true; } }
  }
  if (!sees) return false;
  if (B.call && !e.called) {
    e.called = true;
    if (ctx.callable(BRAIN.call.radius)) { e.actK = 'call'; e.actT = BRAIN.call.windup; emit(w, 'enemy_call_windup', { id: e.id, kind: e.kind, x: e.x, z: e.z }); return true; }
  }
  if (B.dodge && !(e.dodgeCd > 0) && inSights(p, e, BRAIN.dodge.cone)) {
    const Dg = BRAIN.dodge; let threat = ctx.fired;
    if (!threat && (p.ads || 0) > Dg.ads) { e.aimT = (e.aimT || 0) + dt; if (e.aimT >= Dg.aim) { threat = true; e.aimT = 0; } }
    if (threat) {
      e.dodgeCd = span(rand, Dg.cd) * D.cd;
      if (rand() < B.dodge * D.chance) { const side = openSide(ctx); if (side) { e.actK = 'dodge'; e.actYaw = side.a; e.actDir = side.s; e.actT = span(rand, Dg.react) + Dg.t; emit(w, 'enemy_dodge', { id: e.id, kind: e.kind, x: e.x, z: e.z }); return false; } }
    }
  } else if (e.aimT) delete e.aimT;
  if (B.lurch) {
    const L = BRAIN.lurch;
    if (e.lurchCd === undefined) e.lurchCd = span(rand, L.first);
    if (e.lurchCd <= 0 && dist >= L.min && dist <= L.max && ctx.clearTo(p.x, p.z) && ctx.takeTurn('melee')) { e.lurchCd = span(rand, L.cd) * D.cd; e.actK = 'lurch'; e.actT = L.windup + L.t; emit(w, 'enemy_lurch', { id: e.id, kind: e.kind, x: e.x, z: e.z }); return true; }          // (a lurch is an attack: it takes one of the turns of tactics.js)
  }
  if (B.circle && !born) {
    const C = BRAIN.circle;
    if (e.circCd === undefined) e.circCd = span(rand, C.first);
    if (e.circCd <= 0 && dist >= C.min && dist <= C.max && Math.hypot(p.vx || 0, p.vz || 0) < C.still) { e.actK = 'circle'; e.actDir = rand() < 0.5 ? -1 : 1; e.actT = span(rand, C.t); return false; }
  }
  return false;
}
