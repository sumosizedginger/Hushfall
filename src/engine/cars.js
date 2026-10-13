// CARS (PT-045, drop B, E8b; design/ACTC.md section 3: the one risky piece of the act, felt in the Hive yards before C2M20 depends on it): a rectangular floor that rides a CLOSED polyline on a pure clock and dwells at its stops.
// A map's `cars: [{ id, size: [w, d] cells, path: [[x, z, y?], ...], stops?: [vertex indices], speed?, dwell?, phase?, y? }]`; a path point is the CENTRE of the car in cell coordinates (10.5, 7.5 is the middle of cell 10,7; y is the deck height in metres,
// the car's `y` if a point has none). A run from one stop to the next follows the vertices between them and eases in and out (smoothstep over arc length, so it never jerks); it waits `dwell` s at every stop. Pure functions of the sim clock (`w.time`),
// like breath.js, platforms.js, loads.js, belts.js and tide.js: a save, a replay and the route bots need nothing stored. A map with no `cars` has `map.cars === []` and never reaches any of this.
// The sim (world.js, terrain.js): a car is a floor patch (terrain asks the cars after the cells), the player whose feet were on the deck at the previous tick is moved by the deck's delta, the void under a car is walkable for the player and for nobody else, and a player
// left over the void is a miss (the existing void rule: hurt, back on `p.lastSafe`, never killed). Creatures never board a car. Reach and the trap lint count a car as a ride between its stops (`carLinks`).
import { CARS } from './defs.js';

const smooth = (t) => t * t * (3 - 2 * t);
const wrap = (a, m) => ((a % m) + m) % m;

/** a car from its map entry: the legs between its stops, each with its polyline (cell coords), its arc lengths in metres, its length, and when in the cycle it dwells and runs */
export function makeCar(c, cell) {
  const path = c.path.map((q) => [q[0], q[1], q[2] ?? c.y ?? 0]), n = path.length, stops = (c.stops ?? path.map((_, i) => i)).slice().sort((a, b) => a - b);
  const speed = c.speed ?? CARS.speed, dwell = c.dwell ?? CARS.dwell, legs = []; let t = 0;
  for (let i = 0; i < stops.length; i++) {
    const a = stops[i], b = stops[(i + 1) % stops.length], pts = [path[a]]; let k = a;
    do { k = (k + 1) % n; pts.push(path[k]); } while (k !== b);
    const cum = [0]; for (let j = 1; j < pts.length; j++) cum.push(cum[j - 1] + Math.hypot((pts[j][0] - pts[j - 1][0]) * cell, (pts[j][1] - pts[j - 1][1]) * cell));
    const len = cum[cum.length - 1], run = len > 0 ? 1.5 * len / speed : 0;                  // (smoothstep peaks at 1.5 x the average)
    legs.push({ from: a, to: b, pts, cum, len, dwell, run, t0: t, tRun: t + dwell, t1: t + dwell + run }); t += dwell + run;
  }
  return { id: c.id, size: [c.size[0], c.size[1]], path, stops, speed, dwell, phase: c.phase ?? 0, legs, cycle: t, cell, _t: NaN, _st: null };
}

/** the car at time t: { x, z, y } the CENTRE of the deck in metres and its height, `moving`, `stop` (the path vertex it waits at, or null on a run), `to` (the vertex it is heading for or will head for), `until` (s to the end of the dwell or of the run), `warn` 0..1 (in the last
 *  CARS.warn s of a dwell: the rim blinks), `leg` */
export function carState(car, t) {
  if (car._t === t) return car._st;
  const c = wrap(t + car.phase, car.cycle), cell = car.cell; let li = car.legs.findIndex((l) => c < l.t1); if (li < 0) li = car.legs.length - 1;
  const leg = car.legs[li]; let st;
  if (c < leg.tRun) { const p = leg.pts[0], until = leg.tRun - c; st = { x: p[0] * cell, z: p[1] * cell, y: p[2], moving: false, stop: leg.from, to: leg.to, until, warn: until < CARS.warn ? 1 - until / CARS.warn : 0, leg: li }; }
  else {
    const tau = leg.run > 0 ? Math.min(1, (c - leg.tRun) / leg.run) : 1, s = leg.len * smooth(tau); let j = 1; while (j < leg.cum.length - 1 && leg.cum[j] < s) j++;
    const a = leg.pts[j - 1], b = leg.pts[j], seg = leg.cum[j] - leg.cum[j - 1], f = seg > 0 ? Math.min(1, Math.max(0, (s - leg.cum[j - 1]) / seg)) : 1;
    st = { x: (a[0] + (b[0] - a[0]) * f) * cell, z: (a[1] + (b[1] - a[1]) * f) * cell, y: a[2] + (b[2] - a[2]) * f, moving: true, stop: null, to: leg.to, until: leg.t1 - c, warn: 0, leg: li };
  }
  car._t = t; car._st = st; return st;
}
/** the deck as a rectangle in metres [x0, z0, x1, z1] */
export function carRect(car, st) { const hw = car.size[0] * car.cell / 2, hd = car.size[1] * car.cell / 2; return [st.x - hw, st.z - hd, st.x + hw, st.z + hd]; }
/** is the point (x, z) metres over the deck? (`slack` widens the deck, metres) */
export function carCovers(car, st, x, z, slack = 0) { const r = carRect(car, st); return x >= r[0] - slack && x <= r[2] + slack && z >= r[1] - slack && z <= r[3] + slack; }
/** the highest deck over the point at time t (metres), or -Infinity when no car is there */
export function carDeckY(map, t, x, z) { let y = -Infinity; for (const car of map.cars) { const st = carState(car, t); if (st.y > y && carCovers(car, st, x, z)) y = st.y; } return y; }
/** the car whose deck the point is over at time t, with its state, or null */
export function carAt(map, t, x, z) { for (const car of map.cars) { const st = carState(car, t); if (carCovers(car, st, x, z)) return { car, st }; } return null; }

/** the cells a rider can step from onto the car (or off it onto) at a stop: the walkable cells under the deck, and those that touch it, whose floor is within a step of the deck's height. `stepMax` = STEP (passed in: this module imports nothing from the sim) */
export function boardingCells(map, car, vertex, stepMax) {
  const p = car.path[vertex], hw = car.size[0] / 2, hd = car.size[1] / 2, x0 = Math.floor(p[0] - hw) - 1, x1 = Math.floor(p[0] + hw) + 1, z0 = Math.floor(p[1] - hd) - 1, z1 = Math.floor(p[1] + hd) + 1, out = [];
  for (let cz = z0; cz <= z1; cz++) for (let cx = x0; cx <= x1; cx++) { const k = map.kind(cx, cz); if ((k === 'floor' || k === 'outdoor') && Math.abs(map.floor(cx, cz) - p[2]) <= stepMax + 1e-6) out.push([cx, cz]); }
  return out;
}
/** for reach and the trap lint: per car, the boarding cells of every stop; a rider can get from any stop to any other (the loop comes round), so all of them are linked */
export function carLinks(map, stepMax) { return map.cars.map((car) => car.stops.map((v) => boardingCells(map, car, v, stepMax))); }
