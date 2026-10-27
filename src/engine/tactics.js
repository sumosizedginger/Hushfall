// ENEMY ACTIONS (2026-10-26; the owner, after the look polish: "enemy actions is part of what we are testing"). The ordinary creatures were a straight line at the player: every melee creature walked the
// same line and queued behind the first, every shooter fired the moment it could, all at once. Three ideas that shooters have used for a long time, kept small and deterministic:
//   * THE FAN: melee creatures that see the player and are closing in spread across the FRONT of the player instead of queueing on one line (a slot each, in the order they already stand, so
//     nobody crosses anybody; never behind the player: being surrounded by what you cannot see is not a fight, it is a tax).
//   * TURNS: only TACTICS.tokens[difficulty] creatures of each sort (melee, ranged) may START an attack at once; the rest keep closing, keep their slot, side-step. A crowd's damage comes in
//     readable beats. Nobody is starved: every attack ends in a cooldown, and the turn passes to whoever is ready.
//   * MOVEMENT BETWEEN ACTS: a walking shooter side-steps after each shot; a Gaunt backs off after its lunge (`lunge.back`); a creature that loses the player goes to where it last saw them and
//     LOOKS ROUND (`search`) before it gives up.
// The bosses, the nodes, the Hive Cantor, the Root Bell, the peaceful folk, the support / snipe / heal creatures and Range targets keep their own code (`ordinary` says who takes part).
// Pure helpers over plain data; the per-tick frame lives on a NON-enumerable property of the world (`w._tac`), so it is never saved or hashed. New per-creature fields are lazy: a creature that
// never fanned, waited, shuffled, backed off or searched has none of them.
import { ENEMIES } from './defs.js';

export const TACTICS = Object.freeze({
  tokens: { easy: { melee: 2, ranged: 2 }, normal: { melee: 2, ranged: 3 }, hard: { melee: 3, ranged: 3 } },        // (the first numbers, 2 / 3 / 4 of each, killed the perfect bot on Hard on six maps: a fan lets more blows land than a queue did; PT-076: four shots at once on Hard, from shooters that now run across between shots and ring for help, was a volley of seventy hit points in a second)
  fan: { reach: 10, gap: 0.55, arc: 1.0, near: 1.6, lean: 0.6, k: 1.5, look: 4, flee: 2 },  // within `reach` m; slots `gap` rad apart within `arc` rad of the group's bearing; within `near` m of its attack range a creature goes straight in; it LEANS at most `lean` rad off the line to the player (so it keeps 82% of its closing speed); a player moving away from the group faster than `flee` m/s is chased straight (a fan is for someone who stands and fights)
  shuffle: { t: [0.3, 0.6], speed: 0.6, chance: 0.5 },                     // a walking shooter's side-step after a shot (on `chance` of them): seconds (range), share of its speed (a longer, faster step made the flares miss and the ammunition gates fail)
  search: { t: 2.6, sweep: 1.0, rate: 2.4 },                                 // seconds of looking round at the last place it saw the player, how far it turns each way (rad), how fast
});

/** does this creature take part in the fan and the turns (the ordinary roster: not a boss, a node, a spawner, the Hive's conductor, the clapper, the folk, the support / snipe / heal kinds, or a Range target) */
export function ordinary(e) {
  const d = ENEMIES[e.kind];
  return !!d && !e.hold && !d.boss && !d.node && !d.spawner && !d.feeds && !d.hive && !d.bell && !d.peaceful && !d.support && !d.snipe && !d.heal && d.speed > 0;
}
const isRanged = (e) => !!ENEMIES[e.kind].ranged;
/** an attack in progress, of either sort: a swing or a shot's windup, a lunge, a charge */
const attacking = (e) => e.attackT >= 0 || (e.lungeT ?? -1) >= 0 || (e.chargeT ?? -1) >= 0 || e.actK === 'lurch';          // (PT-076: a Tollbearer's lurch is an attack and holds a turn: in a wave, four surging at once was a wall)

/**
 * The frame for this tick, made once (the first creature that asks): who is attacking now (the tokens in use), and the fan's slot bearing for every melee creature that is closing in.
 * Kept on `w._tac` (not enumerable).
 */
export function tacticsFrame(w) {
  if (w._tac && w._tac.tick === w.tick) return w._tac;
  const p = w.player, F = TACTICS.fan, used = { melee: 0, ranged: 0 }, slots = new Map(), closing = [];
  for (const e of w.enemies) {
    if (e.state === 'dead' || e.state === 'idle' || !ordinary(e)) continue;
    if (attacking(e)) { used[isRanged(e) && e.attackT >= 0 ? 'ranged' : 'melee']++; continue; }
    if (isRanged(e) || e.lost !== 0 || ENEMIES[e.kind].lunge) continue;                                                         // only a melee creature that saw the player last tick closes in a fan (a pouncer, the Gaunt, the Zealot, comes straight)
    const d = Math.hypot(e.x - p.x, e.z - p.z); if (d > F.reach || d < (ENEMIES[e.kind].attack.range + F.near)) continue;
    closing.push({ e, a: Math.atan2(e.x - p.x, e.z - p.z) });
  }
  if (closing.length > 1) {
    let sx = 0, sz = 0; for (const c of closing) { sx += Math.sin(c.a); sz += Math.cos(c.a); }
    const mid = Math.atan2(sx, sz), rel = (a) => Math.atan2(Math.sin(a - mid), Math.cos(a - mid));
    const away = -((p.vx || 0) * Math.sin(mid) + (p.vz || 0) * Math.cos(mid));                                                // a player running from the group is chased, not fanned round (strafing across it is not running)
    if (away > F.flee) { const tac = { tick: w.tick, used, slots }; Object.defineProperty(w, '_tac', { value: tac, enumerable: false, writable: true, configurable: true }); return tac; }
    closing.sort((m, n) => rel(m.a) - rel(n.a) || m.e.id - n.e.id);
    const n = closing.length, gap = Math.min(F.gap, (2 * F.arc) / Math.max(1, n - 1));
    closing.forEach((c, i) => slots.set(c.e.id, mid + (i - (n - 1) / 2) * gap));
  }
  const tac = { tick: w.tick, used, slots };
  Object.defineProperty(w, '_tac', { value: tac, enumerable: false, writable: true, configurable: true });
  return tac;
}

/** may creature `e` START an attack of sort `kind` ('melee' | 'ranged') now? Grants the token (the count goes up for the rest of the tick). A creature that is not ordinary always may. */
export function takeTurn(w, e, kind) {
  if (!ordinary(e)) return true;
  const tac = tacticsFrame(w), cap = (TACTICS.tokens[w.difficulty] ?? TACTICS.tokens.normal)[kind];
  if (tac.used[kind] >= cap) return false;
  tac.used[kind]++; return true;
}

/** the point a closing melee creature heads for: `fan.look` m along the line to the player turned toward its slot by at most `fan.lean` rad (it keeps closing while it drifts round into its
 *  slot: the first version aimed AT the slot and a creature walking round a player who keeps moving never caught them); null = straight at the player (alone, too near, too far, or not closing) */
export function fanPoint(w, e) {
  const s = tacticsFrame(w).slots.get(e.id); if (s == null) return null;
  const F = TACTICS.fan, p = w.player, b = Math.atan2(e.x - p.x, e.z - p.z), diff = Math.atan2(Math.sin(s - b), Math.cos(s - b));
  const h = b + Math.PI - Math.max(-F.lean, Math.min(F.lean, diff * F.k)), L = Math.min(Math.hypot(e.x - p.x, e.z - p.z), F.look);          // heading b + pi is straight at the player; turning it by -x moves the bearing up
  return { x: e.x + Math.sin(h) * L, z: e.z + Math.cos(h) * L };
}
