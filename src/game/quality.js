// PT-071 (R21, performance): the automatic quality fallback designed in design/PERFORMANCE_PLAN.md. If the 95th-percentile frame time over the last few seconds stays over `slowMs`, the internal render width steps down one rung
// (never more than `maxRungsBelow` under the player's own choice); after `upAfter` quiet seconds it steps back up. The simulation runs on a fixed step and never reads the frame rate, so this changes only what is drawn.
// Pure: it is fed frame times and says a width; the shell does the resizing.
import { RESOLUTIONS } from './settings.js';

export const QUALITY = { slowMs: 20, fastMs: 14, window: 240, minSamples: 120, every: 30, downCooldown: 3, upAfter: 30, maxRungsBelow: 2, ignoreOverMs: 250 };

export class QualityGovernor {
  constructor(base = 480, opts = {}) { this.o = { ...QUALITY, ...opts }; this.reset(base); }
  /** the player's chosen width (or a new one): start again from it */
  reset(base) { const i = RESOLUTIONS.indexOf(base); this.base = i >= 0 ? i : RESOLUTIONS.indexOf(480); this.rung = this.base; this.samples = []; this.since = 0; this.quiet = 0; this.n = 0; this.p95 = 0; }
  get width() { return RESOLUTIONS[this.rung]; }
  /** after a map change or a long pause the old samples say nothing about the new picture */
  forget() { this.samples = []; this.n = 0; this.quiet = 0; }
  /** one frame: its real duration in ms and in s. Returns the new width when it changes, else null. Frames over ignoreOverMs (a hidden tab, a pause, a load) are not samples. */
  sample(ms, sec) {
    const o = this.o; this.since += sec; if (!(ms > 0) || ms > o.ignoreOverMs) return null;
    this.samples.push(ms); if (this.samples.length > o.window) this.samples.shift(); this.quiet += sec;
    if (++this.n % o.every !== 0 || this.samples.length < o.minSamples) return null;
    const sorted = [...this.samples].sort((a, b) => a - b); this.p95 = sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95))];
    if (this.p95 >= o.fastMs) this.quiet = 0;                                       // the stretch of quiet frames is broken
    const floor = Math.max(0, this.base - o.maxRungsBelow);
    if (this.p95 > o.slowMs && this.rung > floor && this.since >= o.downCooldown) return this.move(-1);
    if (this.p95 < o.fastMs && this.quiet >= o.upAfter && this.rung < this.base && this.since >= o.upAfter) return this.move(1);
    return null;
  }
  move(d) { this.rung += d; this.since = 0; this.quiet = 0; this.samples = []; this.n = 0; return this.width; }
}
