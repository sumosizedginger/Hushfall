// PT-047 V1 (the owner, 2026-10-14: the hurt flash is too strong): the red vignette that follows a hit, as a PURE function of the hit's size.
// Before: every hit set the sim's `p.hurt = 1`, so a 2 hp scratch and a 30 hp slam flashed alike (45 measured hits over 25 maps flashed 0.52 to 1.00 for hits of 2 to 8 hp) and the screen went red for most of a second.
// Now the VIEW keeps its own flash, set from the `hurt` event's `amount` and decayed by itself; `p.hurt` stays sim state and nothing reads it for drawing. A hit that armour fully absorbs (amount 0) does not flash.
// The numbers are first guesses, to be judged in play: the peak climbs with the hit (0.12 for the smallest, about 0.97 at 30 hp and up) and a small hit fades faster than a large one.
export const FLASH = Object.freeze({ floor: 0.12, span: 0.85, full: 30, decaySmall: 2.6, decayLarge: 1.2 });

const smooth = (t) => { t = Math.max(0, Math.min(1, t)); return t * t * (3 - 2 * t); };

/** the peak of the flash for a hit of `amount` hit points: 0 for nothing, 0.12 + 0.85 x smoothstep(0, 30, amount) */
export function flashFor(amount) { return amount > 0 ? FLASH.floor + FLASH.span * smooth(amount / FLASH.full) : 0; }

/** how fast that flash fades, per second: 2.6 for a scratch, 1.2 for a heavy blow */
export function decayFor(amount) { return FLASH.decaySmall + (FLASH.decayLarge - FLASH.decaySmall) * smooth(amount / FLASH.full); }

/** the view's flash: `hit(amount)` on a hurt event, `step(dt)` once a frame (returns the value for the post pass) */
export class HurtFlash {
  constructor() { this.value = 0; this.rate = FLASH.decaySmall; }
  /** a smaller hit never cuts short or lowers a larger flash that is still showing; a larger one replaces it */
  hit(amount, scale = 1) { const peak = flashFor(amount) * scale; if (peak > 0 && peak >= this.value) { this.value = peak; this.rate = decayFor(amount); } }          // scale < 1: a blow whose direction is shown (hitdir.js) flushes the edges less
  step(dt) { if (this.value > 0) this.value = Math.max(0, this.value - this.rate * (dt > 0 ? dt : 0)); return this.value; }
}
