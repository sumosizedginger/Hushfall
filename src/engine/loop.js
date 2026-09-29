// Fixed-timestep accumulator: simulation advances in TICK steps regardless of render frame rate.
import { TICK } from './defs.js';

export class FixedLoop {
  constructor(stepFn, { tick = TICK, maxStepsPerFrame = 6 } = {}) { this.stepFn = stepFn; this.tick = tick; this.max = maxStepsPerFrame; this.acc = 0; this.dropped = 0; }
  /** Feed elapsed wall time; returns {steps, alpha} where alpha is the render interpolation fraction. */
  advance(dt) {
    this.acc += Math.min(dt, 0.25);
    let steps = 0;
    while (this.acc >= this.tick - 1e-9) {
      if (steps >= this.max) { this.dropped += Math.floor(this.acc / this.tick); this.acc %= this.tick; break; }   // spiral-of-death guard
      this.stepFn(); this.acc -= this.tick; steps++;
    }
    return { steps, alpha: Math.max(0, this.acc) / this.tick };
  }
}
