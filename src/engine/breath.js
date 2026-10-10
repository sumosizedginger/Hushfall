// THE SHIP BREATHES (PT-027, Episode 3 Batch B): the gates and the spore beds of a Choir Ship run on a clock. Everything here is a pure function of the sim time (`w.time`, seconds), so
// a save, a replay and the route bots need nothing stored and nothing here can drift: the same tick is always the same breath.
//   gate  { period, open, phase }: open for `open` (0..1) of every `period` seconds, the whole cycle shifted by `phase` seconds (a gate is open at the START of its cycle)
//   bed   { period, on, phase }:   a spore region blooms for `on` seconds at the start of each cycle; it swells for BREATH.warn before that and lingers for BREATH.fade after
import { BREATH } from './defs.js';

const cycle = (b, t) => (((t + (b.phase || 0)) % b.period) + b.period) % b.period;

/** is the gate open at time t? */
export const gateOpen = (b, t) => cycle(b, t) < b.open * b.period;
/** how long the gate's CURRENT state will last from time t (seconds) */
export function gateRemaining(b, t) { const c = cycle(b, t), o = b.open * b.period; return c < o ? o - c : b.period - c; }

/** the state of a spore region at time t: `on` (it burns and slows now), `warn` 0..1 (swelling before a bloom), `glow` 0..1 (what the view draws), `until` (seconds to the next change) */
export function sporeState(p, t) {
  const c = cycle(p, t), on = c < p.on, untilOn = on ? 0 : p.period - c;
  const warn = on ? 0 : untilOn < BREATH.warn ? 1 - untilOn / BREATH.warn : 0;
  const since = on ? 0 : c - p.on, tail = !on && since < BREATH.fade ? 1 - since / BREATH.fade : 0;
  return { on, warn, glow: on ? 1 : Math.max(warn * 0.7, tail * 0.7), until: on ? p.on - c : untilOn };
}

/** is the cell (cx, cz) of a spore bed blooming now? A bed cell that lies in no pulse region is always on (a map should not leave one). */
export function sporeOnAt(map, cx, cz, t) { const p = map.pulseAt(cx, cz); return p ? sporeState(p, t).on : true; }
