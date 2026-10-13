// THE HIVE BEAT (PT-043; design/ACTC.md section 2): the one clock of Act C. A pure function of the tick, like breath.js / platforms.js / loads.js, so a save, a replay and a bot need nothing stored and a world that never asks
// is byte for byte what it was. A beat is HIVE.beat seconds (90 ticks), a bar is HIVE.bar beats.
import { HIVE, TICK } from './defs.js';

/** ticks in one beat (90 at the shipped numbers) */
export const BEAT_TICKS = Math.round(HIVE.beat / TICK);
/** the number of the beat a tick belongs to (0 for ticks 0..89) */
export const beatNo = (tick) => Math.floor(tick / BEAT_TICKS);
/** is this tick the first of a beat (the tick a beat is struck on)? Tick 0 is not: the world has not begun. */
export const isBeatTick = (tick) => tick > 0 && tick % BEAT_TICKS === 0;
/** 0..1 through the beat the clock is in, from a time in seconds (the view's: it reads `w.time`, then eases between ticks) */
export const beatPhase = (time) => { const x = time / HIVE.beat; return x - Math.floor(x + 1e-9); };
/** which beat of its bar (0..HIVE.bar - 1) a beat number is */
export const barBeat = (n) => ((n % HIVE.bar) + HIVE.bar) % HIVE.bar;
/** the swell of a Hive light: it rises quickly on the beat and falls away (render only; below 1 Hz) */
export const beatGlow = (time) => { const p = beatPhase(time); return p < 0.12 ? p / 0.12 : Math.exp(-(p - 0.12) * 3.2); };
/** may a creature start an attack this tick? Only an `onBeat` creature is held to the beat. */
export const beatOk = (w, e) => !e.onBeat || isBeatTick(w.tick);
/** is a beat number one on which a clocked thing happens: `at` of every `every`? */
export const onBeatOf = (n, every, at) => ((n % every) + every) % every === at;
/** is the Hive's beat felt where the player stands? A dev map's look zones may say `beat` (true or false) room by room; otherwise it is the map's `atmosphere.beat` */
export function zoneBeat(map, x, z, w = null) {
  if (w?.beatOff) return false;                                                                       // the Hive Cantor is dead
  const zs = map.lookZones, own = !!map.atmosphere?.beat; if (!zs) return own;
  const cx = Math.floor(x / map.cell), cz = Math.floor(z / map.cell);
  for (const q of zs) if (cx >= q.rect[0] && cx <= q.rect[2] && cz >= q.rect[1] && cz <= q.rect[3]) return q.beat ?? own;
  return own;
}
