// THE TIDE (PT-045, drop B, E12; design/ACTD.md section 2: used by the Last Tide, C2M28): the water level of the whole map as a pure function of the sim clock, like breath.js, platforms.js, loads.js and belts.js, so a save, a replay and a route bot need
// nothing stored. A map's `tide: { levels: [[t, h], ...], loop? }` is a polyline in time: the level (metres) is linear between the points, holds the first point's before the start and the last point's after the end; with `loop` the clock wraps. A walkable cell
// whose floor is under the level is WET (terrain.js fxAt returns the wading effect 'w'), and the view draws a sea at that height. A map with no `tide` has `map.tide === null` and never reaches any of this.

/** the water level in metres at time t (-Infinity for a map with no tide: nothing is ever under it) */
export function tideLevel(map, t) {
  const T = map.tide; if (!T) return -Infinity;
  const L = T.levels, tt = T.loop ? ((t % T.loop) + T.loop) % T.loop : t;
  if (tt <= L[0][0]) return L[0][1];
  for (let i = 1; i < L.length; i++) if (tt <= L[i][0]) { const [t0, h0] = L[i - 1], [t1, h1] = L[i]; return h0 + (h1 - h0) * (tt - t0) / (t1 - t0); }
  return L[L.length - 1][1];
}
/** the level and how it is moving: `rate` in m/s (positive = rising), `next` the seconds until the rate changes (Infinity once it holds for good) */
export function tideState(map, t) {
  const T = map.tide; if (!T) return { level: -Infinity, rate: 0, next: Infinity };
  const L = T.levels, tt = T.loop ? ((t % T.loop) + T.loop) % T.loop : t, level = tideLevel(map, t);
  if (tt >= L[L.length - 1][0]) return { level, rate: 0, next: T.loop ? T.loop - tt : Infinity };
  for (let i = 1; i < L.length; i++) if (tt < L[i][0]) { const [t0, h0] = L[i - 1], [t1, h1] = L[i]; return { level, rate: (h1 - h0) / (t1 - t0), next: t1 - tt }; }
  return { level, rate: 0, next: Infinity };
}
