// mulberry32 with an explicit, serialisable state (a single uint32). All gameplay randomness must go through this.
export function nextRandom(state) {
  let s = (state.rngState = (state.rngState + 0x6d2b79f5) >>> 0);
  let t = Math.imul(s ^ (s >>> 15), s | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
export const initialRngState = (seed) => (seed >>> 0) ^ 0x9e3779b9;
