// Pure scheduling for in-world transmissions and notes, so the ordering rules can be tested in Node with a fake clock.
// Rules: FIFO, one at a time, each shown for max(4 s, 55 ms per character), a short gap between messages,
// and nothing is shown while the level title card is up. Nothing is ever dropped or overwritten.

export const MIN_MS = 4000, PER_CHAR_MS = 55, GAP_MS = 500;
export const durationFor = (text) => Math.max(MIN_MS, text.length * PER_CHAR_MS);

export class CommsQueue {
  constructor() { this.q = []; this.current = null; this.until = 0; this.blockedUntil = 0; }
  /** the level title card is on screen until `t` (ms clock): nothing may be shown before then */
  blockUntil(t) { this.blockedUntil = Math.max(this.blockedUntil, t); }
  push(msg) { this.q.push(msg); }
  clear() { this.q.length = 0; this.current = null; this.until = 0; this.blockedUntil = 0; }
  get pending() { return this.q.length; }
  /** something is on screen or waiting its turn */
  get busy() { return !!this.current || this.q.length > 0; }
  /** the wall clock ran on for `ms` while the strip was hidden (a story scene): what was on screen and what was waiting keep all their time (round 1, Codex 4) */
  shift(ms) { if (ms > 0) { this.until += ms; this.blockedUntil += ms; } }
  /** Advance to time `now`. Returns {show: msg|null, hide: bool}: `show` = display this message now; `hide` = the current one has run its time. */
  update(now) {
    const out = { show: null, hide: false };
    if (this.current && now >= this.until) { this.current = null; out.hide = true; this.until += GAP_MS; }             // display time over; the gap starts here
    if (!this.current && this.q.length && now >= this.blockedUntil && now >= this.until) {
      this.current = this.q.shift(); this.until = now + durationFor(this.current.text); out.show = this.current;
    }
    return out;
  }
}

/** The last words of a campaign finish before its epilogue begins (outside audit round 1, Codex 4: C2M30 says nine things in about 25 seconds of walking and the queue needs about a minute to say them, so the radio reunion at the door was still waiting when the exit fired).
 *  Only a finale holds, only while something is on screen or waiting, for at most FINALE_HOLD_S seconds, and a press of Enter, Space, Esc, A or B ends it at once. Pure: `held` is the seconds already waited; the answer carries the new count. */
export const FINALE_HOLD_S = 60;
export function holdForComms({ finale, busy, held = 0, dt = 0, skip = false }) {
  if (!finale || !busy || skip) return { hold: false, held: 0 };
  const h = held + dt;
  return h >= FINALE_HOLD_S ? { hold: false, held: 0 } : { hold: true, held: h };
}
