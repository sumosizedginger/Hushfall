// TIMING PLATFORMS (PT-029, Episode 3 Batch D, the Resonance Loom): a moving floor (a map `sectors` entry) with a `cycle: { period, hold, phase }` rises and falls on a clock that is a PURE function of `w.time`, exactly like the
// breathing gates and spore beds (breath.js): nothing is stored, a save resumes on the beat, the bots and the replays need nothing. In every period of `period` s it stands at `high` for `hold` s, sinks to `low` (at the sector's own
// `speed`), waits at `low`, and rises again; `phase` shifts it in time, so two platforms can be out of step.
//   high ->(hold)-> descends ->(move)-> low ->(dwell)-> rises ->(move)-> high ...     dwell = period - hold - 2 * move, move = (high - low) / speed
// Pure and deterministic: no DOM, no state.

export const moveTime = (def) => (def.high - def.low) / (def.speed ?? 1.2);
export const lowDwell = (def) => def.cycle.period - def.cycle.hold - 2 * moveTime(def);

/** where the platform is at time t: { h, phase: 'high' | 'down' | 'low' | 'up', left } (left = seconds until that phase ends) */
export function platformState(def, t) {
  const C = def.cycle, mv = moveTime(def), sp = def.speed ?? 1.2, dw = lowDwell(def);
  let u = (((t + (C.phase ?? 0)) % C.period) + C.period) % C.period;
  if (u < C.hold) return { h: def.high, phase: 'high', left: C.hold - u };
  u -= C.hold; if (u < mv) return { h: def.high - u * sp, phase: 'down', left: mv - u };
  u -= mv; if (u < dw) return { h: def.low, phase: 'low', left: dw - u };
  u -= dw; return { h: Math.min(def.high, def.low + u * sp), phase: 'up', left: mv - u };
}
export const cycleHeight = (def, t) => platformState(def, t).h;
/** is the platform standing at `level` ('high' | 'low') with at least `min` seconds of that left? (what a person waits for before stepping on) */
export function platformReady(def, t, level, min = 0) { const s = platformState(def, t); return s.phase === level && s.left >= min; }
/** the seconds from t until the platform next stands at `level` with at least `min` seconds left (0 = now); useful for a route's wait and for the tests */
export function waitFor(def, t, level, min = 0, step = 1 / 60) { for (let k = 0; k < Math.ceil(def.cycle.period / step) + 2; k++) if (platformReady(def, t + k * step, level, min)) return k * step; return Infinity; }
