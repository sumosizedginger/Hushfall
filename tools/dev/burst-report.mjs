// SPIKES (step 4 of the 2026-11-18 playtest list): what feels unfair is not the damage a level deals in all but how much of it lands at once, before
// a player can react. For every main map, the route bot plays Normal and Hard (seeds 1 to 3) and this reports the most damage taken inside any 3 s
// window (the BURST), what dealt it (the sim's own `hurt` events), and the level's total. Node only, deterministic.
//   node tools/dev/burst-report.mjs [--json=<out>] [ID ...]
import fs from 'node:fs';
import path from 'node:path';
import { loadMapFile, runRouteEither } from '../../src/engine/harness.js';
import { step } from '../../src/engine/world.js';

const root = path.resolve(import.meta.dirname, '../..'),
  args = process.argv.slice(2),
  jsonOut = args.find((a) => a.startsWith('--json='))?.slice(7),
  named = args.filter((a) => !a.startsWith('--'));
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'CAMPAIGN_MANIFEST.json'), 'utf8')).maps.map((m) => m.id);
const ids = named.length ? named : manifest.filter((id) => fs.existsSync(path.join(root, 'routes', id + '.main.route.json')));
export const WINDOW_S = 3;

/** the worst WINDOW_S-second burst of one run: { burst, srcs, total } */
export function burstOf(map, route, opts) {
  let hits = [],
    seen = null;
  // read the hurt events as each step makes them (the harness drains them before its onTick hook sees them)
  const r = runRouteEither(map, route, {
    ...opts,
    stepper: (w, cmd) => {
      if (w !== seen) {
        seen = w; // the strafing fighter's rerun starts a new world: only the run that is reported counts
        hits = [];
      }
      step(w, cmd);
      for (const e of w.events) if (e.type === 'hurt') hits.push({ t: w.time, a: e.amount, src: e.src });
    },
  });
  let best = 0,
    at = 0,
    j = 0,
    sum = 0;
  for (let i = 0; i < hits.length; i++) {
    sum += hits[i].a;
    while (hits[i].t - hits[j].t > WINDOW_S) sum -= hits[j++].a;
    if (sum > best) {
      best = sum;
      at = i;
    }
  }
  const srcs = {};
  for (const h of hits) if (h.t <= hits[at]?.t && hits[at].t - h.t <= WINDOW_S) srcs[h.src] = (srcs[h.src] ?? 0) + h.a;
  return { burst: best, srcs, total: hits.reduce((a, h) => a + h.a, 0), result: r.result, when: hits[at]?.t ?? 0 };
}

const rows = [];
for (const id of ids) {
  const map = loadMapFile(path.join(root, 'maps', id + '.json')),
    route = JSON.parse(fs.readFileSync(path.join(root, 'routes', id + '.main.route.json'), 'utf8'));
  const row = { id };
  for (const d of ['normal', 'hard']) {
    let worst = null;
    for (const seed of [1, 2, 3]) {
      const b = burstOf(map, route, { seed, difficulty: d });
      if (!worst || b.burst > worst.burst) worst = { ...b, seed };
    }
    row[d] = worst;
  }
  rows.push(row);
  const f = (b) =>
    `${String(b.burst).padStart(3)} in 3 s at ${b.when.toFixed(0)} s (${Object.entries(b.srcs)
      .sort((a, c) => c[1] - a[1])
      .map(([k, v]) => k.replace('enemy:', '') + ' ' + v)
      .join(', ')})`;
  console.log(id.padEnd(8), 'normal', f(row.normal), ' | hard', f(row.hard));
}
if (jsonOut) fs.writeFileSync(jsonOut, JSON.stringify(rows, null, 1));
