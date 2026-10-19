// What the simulation costs per tick over a whole canonical route, per map (PT-054): the route bot plays the map on the given difficulty and every tick's wall time is recorded (the bot's own thinking is inside it, the same for every map).
// Prints the total seconds for the run, the mean, and the 99th percentile and maximum tick in milliseconds. Node only, one core.
//   node tools/dev/sim-cost.mjs [--difficulty=hard] [--seed=1] <ID> ...
import path from 'node:path';
import { loadMapFile, loadRouteFile, runRoute } from '../../src/engine/harness.js';

const root = path.resolve(import.meta.dirname, '../..'), args = process.argv.slice(2), opt = (n, d) => args.find((a) => a.startsWith('--' + n + '='))?.split('=')[1] ?? d;
const difficulty = opt('difficulty', 'hard'), seed = +opt('seed', 1);
for (const id of args.filter((a) => !a.startsWith('--'))) {
  const map = loadMapFile(path.join(root, 'maps', id + '.json')), route = loadRouteFile(path.join(root, 'routes', id + '.main.route.json')), ts = []; let last = performance.now();
  const t0 = performance.now(); const r = runRoute(map, route, { seed, difficulty, onTick: () => { const n = performance.now(); ts.push(n - last); last = n; } }); const total = performance.now() - t0;
  ts.sort((a, b) => a - b); const p = (q) => ts[Math.min(ts.length - 1, Math.floor(ts.length * q))];
  console.log(id.padEnd(9), r.result.padEnd(9), String(r.ticks).padStart(6), 'ticks  total', (total / 1000).toFixed(2).padStart(6), 's  mean', (total / r.ticks).toFixed(3), 'ms  p99', p(0.99).toFixed(2), 'ms  max', ts.at(-1).toFixed(1), 'ms');
}
