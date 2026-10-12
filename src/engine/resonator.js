// PT-037, Campaign 2 Act A (design/CAMPAIGN2.md E2): RESONATORS, the standing forks of the Tuning Fork Fields. A `resonator` prop hears every noise the sim makes (world.js `noise()`: gunfire, a landed blow, a blast) inside
// `RESONATOR.hear` x the noise's radius, so a loud gun sets one off from far away and a quiet one (the arc lamp 14 m, a blow 9 m) only from close by. A fork that has heard rings `RESONATOR.delay` s later: a ring of sound goes out
// from it (an ordinary tone pulse: it stings a player it crosses for a few points, passes under one standing a metre higher, and stone stops it), every sleeper within `RESONATOR.lure` of the FORK wakes whether or not it can see
// anyone (that is the lure: the noise you made here is called out over there), every civilian near it runs, and a fork within `RESONATOR.chain` metres of it hears the ring and rings in its turn when the ring arrives: a row of forks
// rings down the row. After it rings a fork is deaf for `RESONATOR.cooldown` s. The state is `w.resonators` ([{ id, x, z, at, cdUntil, ringT }]), made at creation ONLY for a map that has a resonator prop, so every other world is
// byte for byte what it was; no random stream is read.
import { RESONATOR, DIFFICULTY, ENEMIES } from './defs.js';
import { groundAt } from './terrain.js';
import { wakeEnemy, emit } from './world.js';
import { frighten } from './folk.js';

/** the resonators of a map (props of kind `resonator`), as world state */
export const makeResonators = (map) => map.props.filter((p) => p.kind === 'resonator').map((p, i) => ({ id: i, x: p.x, z: p.z, at: null, cdUntil: 0, ringT: -1 }));

/** world.js `noise()` calls this: every fork within earshot of (x, z) will ring in a moment */
export function resonatorsHear(w, x, z, radius) {
  for (const r of w.resonators) if (r.at === null && w.time >= r.cdUntil && Math.hypot(r.x - x, r.z - z) < radius * RESONATOR.hear) r.at = w.time + RESONATOR.delay;
}

/** each tick: the forks whose moment has come ring */
export function updateResonators(w) {
  for (const r of w.resonators) if (r.at !== null && w.time >= r.at) ring(w, r);
}

function ring(w, r) {
  const P = RESONATOR.pulse, diff = DIFFICULTY[w.difficulty];
  r.at = null; r.cdUntil = w.time + RESONATOR.cooldown; r.ringT = w.time;
  emit(w, 'resonator_ring', { id: r.id, x: r.x, z: r.z });
  w.pulses.push({ id: w.nextId++, x: r.x, z: r.z, y: groundAt(w, r.x, r.z, 0.3), r: 0.6, speed: P.speed, dmg: Math.max(1, Math.round(P.damage * diff.enemyDamage)), width: P.width, maxR: P.maxR, hit: false });
  for (const e of w.enemies) {
    if (Math.hypot(e.x - r.x, e.z - r.z) > RESONATOR.lure) continue;
    if (e.state === 'idle' && !ENEMIES[e.kind].node) wakeEnemy(w, e, false);                             // the call goes out: it wakes without seeing a thing
    else if (ENEMIES[e.kind].peaceful && (e.state === 'calm' || e.state === 'flee')) frighten(w, e, r.x, r.z);
  }
  for (const o of w.resonators) {
    if (o === r || o.at !== null || w.time < o.cdUntil) continue;
    const d = Math.hypot(o.x - r.x, o.z - r.z); if (d <= RESONATOR.chain) o.at = w.time + d / P.speed + RESONATOR.delay;      // the ring reaches it, and it answers
  }
}
