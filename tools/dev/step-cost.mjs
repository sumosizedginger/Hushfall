// What the SIMULATION's step costs per tick, alone (PT-083 P1). tools/dev/sim-cost.mjs times the whole tick, the route bot's own path searches included, which no player pays for. This runs the route three
// times in one process and reports the last two: the code is warmed up by then, as it is a minute into any real level. Node only, one core; run it on a quiet machine.
//   node tools/dev/step-cost.mjs [--difficulty=hard] [--limit=4] <ID ...|--all>
import fs from 'node:fs';
import path from 'node:path';
import { loadMapFile, loadRouteFile, runRoute } from '../../src/engine/harness.js';
import { step } from '../../src/engine/world.js';

const root = path.resolve(import.meta.dirname, '../..'),
  args = process.argv.slice(2),
  opt = (n, d) => args.find((a) => a.startsWith('--' + n + '='))?.split('=')[1] ?? d,
  difficulty = opt('difficulty', 'hard'),
  limit = Number(opt('limit', 4));
const ids = args.includes('--all')
  ? fs
      .readdirSync(path.join(root, 'maps'))
      .filter((f) => f.endsWith('.json'))
      .map((f) => f.slice(0, -5))
  : args.filter((a) => !a.startsWith('--'));
let over = 0;
for (const id of ids) {
  const map = loadMapFile(path.join(root, 'maps', id + '.json')),
    route = loadRouteFile(path.join(root, 'routes', id + '.main.route.json'));
  let worst = 0,
    worstAt = 0,
    sum = 0,
    n = 0,
    above = 0;
  for (let pass = 0; pass < 3; pass++) {
    let tick = 0;
    runRoute(map, route, {
      seed: 1,
      difficulty,
      stepper: (w, cmd) => {
        const t0 = performance.now();
        step(w, cmd);
        const d = performance.now() - t0;
        tick++;
        if (pass === 0) return;
        sum += d;
        n++;
        if (d > limit) above++;
        if (d > worst) {
          worst = d;
          worstAt = tick;
        }
      },
    });
  }
  if (worst > limit) over++;
  console.log(`${id.padEnd(8)} mean ${(sum / n).toFixed(3)} ms, worst ${worst.toFixed(1)} ms at tick ${worstAt}, ${above} of ${n} over ${limit} ms`);
}
console.log(`${over} of ${ids.length} maps have a tick over ${limit} ms`);
