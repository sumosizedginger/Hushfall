// PT-071 (R21, performance): the automatic quality fallback designed in design/PERFORMANCE_PLAN.md. If MOST frames over the last few seconds are slow (the 60th percentile over `slowMs`: more than two in five), the internal render width steps down one rung
// (never more than `maxRungsBelow` under the player's own choice); when frames have been at the display's own rate for `upAfter` seconds it steps back up, and waits longer each time a rung it came up to fails again.
// Pure: it is fed frame times and says a width; the shell does the resizing. The simulation runs on a fixed step and never reads the frame rate, so this changes only what is drawn.
//
// WHY the 60th percentile and not the 95th (measured 2026-10-20, tools/dev/probe-quality.mjs, a real RTX 3060 Ti with the CPU throttled six times on Silent Roots): the page ran at the display's 16.7 ms nearly all the time and had one-window
// bursts of 33 ms from the simulation (a creature wave waking); the first version, with the 95th, stepped down twice for bursts that a smaller picture does not cure and, because `fastMs` was 14 ms (below one 60 Hz frame), never stepped back up.
import { RESOLUTIONS } from './settings.js';

export const QUALITY = { pct: 0.6, slowMs: 22, fastMs: 18.5, window: 240, minSamples: 150, every: 30, downCooldown: 3, upAfter: 30, maxBackoff: 8, maxRungsBelow: 2, ignoreOverMs: 250 };

export class QualityGovernor {
  constructor(base = 480, opts = {}) { this.o = { ...QUALITY, ...opts }; this.reset(base); }
  /** the player's chosen width (or a new one): start again from it */
  reset(base) { const i = RESOLUTIONS.indexOf(base); this.base = i >= 0 ? i : RESOLUTIONS.indexOf(480); this.rung = this.base; this.fails = {}; this.samples = []; this.since = 0; this.quiet = 0; this.n = 0; this.level = 0; }
  get width() { return RESOLUTIONS[this.rung]; }
  /** after a map change or a long pause the old samples say nothing about the new picture */
  forget() { this.samples = []; this.n = 0; this.quiet = 0; }
  /** one frame: its real duration in ms and in s. Returns the new width when it changes, else null. Frames over ignoreOverMs (a hidden tab, a pause, a load) are not samples. */
  sample(ms, sec) {
    const o = this.o; this.since += sec; if (!(ms > 0) || ms > o.ignoreOverMs) return null;
    this.samples.push(ms); if (this.samples.length > o.window) this.samples.shift(); this.quiet += sec;
    if (++this.n % o.every !== 0 || this.samples.length < o.minSamples) return null;
    const sorted = [...this.samples].sort((a, b) => a - b); this.level = sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * o.pct))];
    if (this.level >= o.fastMs) this.quiet = 0;                                       // the stretch of frames at the display's own rate is broken
    const floor = Math.max(0, this.base - o.maxRungsBelow);
    if (this.level > o.slowMs && this.rung > floor && this.since >= o.downCooldown) { this.fails[this.rung] = (this.fails[this.rung] ?? 0) + 1; return this.move(-1); }
    const wait = o.upAfter * Math.min(o.maxBackoff, 2 ** (this.fails[this.rung + 1] ?? 0) / 2);        // the first failure of the rung above asks for upAfter, the next for twice that, and so on
    if (this.level < o.fastMs && this.quiet >= wait && this.rung < this.base && this.since >= wait) return this.move(1);
    return null;
  }
  move(d) { this.rung += d; this.since = 0; this.quiet = 0; this.samples = []; this.n = 0; return this.width; }
}
