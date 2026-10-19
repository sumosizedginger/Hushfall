// What a distance field of the enemy navigation costs, per map (PT-054, the Glass Steppe stutter: every time a creature's target moves into a new cell the whole map is flood-filled from it, and a big open map is a big flood).
// Builds a field for ~60 different target cells spread over the map and prints the mean milliseconds per field. Node only, one core.
//   node tools/dev/nav-bench.mjs <ID> ...        (shipped maps; MAP_DIR=<dir> reads them elsewhere)
// and the cost of HUNTERS: thirty creatures that have lost sight of the player, each steering for its own last-seen cell, asking for a waypoint on every tick for sixty ticks (the case that made the old four-field cache rebuild a field on nearly every call):
//   node tools/dev/nav-bench.mjs --hunters=30 <ID> ...
import path from 'node:path';
import { loadMapFile } from '../../src/engine/harness.js';
import { createWorld } from '../../src/engine/world.js';
import { walkDistance, navWaypoint } from '../../src/engine/nav.js';

const root = path.resolve(import.meta.dirname, '../..'), dir = process.env.MAP_DIR ? path.resolve(process.env.MAP_DIR) : path.join(root, 'maps');
const hunters = +(process.argv.find((a) => a.startsWith('--hunters='))?.split('=')[1] ?? 0);
for (const id of process.argv.slice(2).filter((a) => !a.startsWith('--'))) {
  const m = loadMapFile(path.join(dir, id + '.json')), w = createWorld(m, { seed: 1, difficulty: 'normal' }), S = m.cell; let n = 0;
  const run = (count) => { let k = 0; for (let z = 4; z < m.h - 4 && k < count; z += 3) for (let x = 4; x < m.w - 4 && k < count; x += 5) { if (m.kind(x, z) === 'wall') continue; walkDistance(w, 8, 8, (x + 0.5) * S, (z + 0.5) * S); k++; } return k; };
  run(8);                                                                                      // warm the JIT
  const t0 = performance.now(); n = run(60); const ms = (performance.now() - t0) / Math.max(1, n);
  if (hunters) {
    const cells = []; for (let z = 3; z < m.h - 3; z++) for (let x = 3; x < m.w - 3; x++) if (m.kind(x, z) !== 'wall') cells.push([x, z]);
    const pick = (k) => cells[(k * 2654435761 >>> 0) % cells.length], hs = Array.from({ length: hunters }, (_, k) => ({ from: pick(k + 1), to: pick(k + 101) }));
    const t1 = performance.now(); for (let tick = 0; tick < 60; tick++) for (const h of hs) navWaypoint(w, (h.from[0] + 0.5) * S, (h.from[1] + 0.5) * S, (h.to[0] + 0.5) * S, (h.to[1] + 0.5) * S);
    console.log(id.padEnd(9), hunters, 'hunters, 60 ticks:', ((performance.now() - t1) / 60).toFixed(2), 'ms per tick'); continue;
  }
  console.log(id.padEnd(9), String(m.w * m.h).padStart(6), 'cells', String(n).padStart(3), 'fields   mean', ms.toFixed(2).padStart(7), 'ms per distance field');
}
