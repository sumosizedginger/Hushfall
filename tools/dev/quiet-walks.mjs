// PT-081 (design/FUN_CHECK.md, standard 6): node tools/dev/quiet-walks.mjs <ID> ... prints where the longest walk with nothing awake within 25 m on each map's main route (normal, seed 1): start cell, end cell, a few cells along it
import path from 'node:path';
const ROOT = path.resolve(import.meta.dirname, '../..');
const { loadMapFile, loadRouteFile, runRoute } = await import('../../src/engine/harness.js');
const { ENEMIES, TICK } = await import('../../src/engine/defs.js');
for (const id of process.argv.slice(2)) {
  const map = loadMapFile(path.join(ROOT, 'maps', id + '.json')), c = map.cell; let px = null, pz = null, run = 0, best = 0, path0 = [], bestPath = [];
  runRoute(map, loadRouteFile(path.join(ROOT, 'routes', id + '.main.route.json')), { seed: 1, difficulty: 'normal', onTick: (w, t) => {
    const p = w.player, dm = px == null ? 0 : Math.hypot(p.x - px, p.z - pz); px = p.x; pz = p.z; let f = false;
    for (const e of w.enemies) { if (e.state === 'idle' || e.state === 'dead') continue; const d = ENEMIES[e.kind]; if (d?.peaceful || d?.node) continue; if (Math.hypot(e.x - p.x, e.z - p.z) < 25) { f = true; break; } }
    if (f) { run = 0; path0 = []; } else { run += dm; if (t % 30 === 0) path0.push([Math.floor(p.x / c), Math.floor(p.z / c), Math.round(t * TICK)]); if (run > best) { best = run; bestPath = path0.slice(); } }
  } });
  const step = Math.max(1, Math.floor(bestPath.length / 8));
  console.log(id, Math.round(best) + ' m:', bestPath.filter((_, i) => i % step === 0 || i === bestPath.length - 1).map(([x, z, s]) => `${x},${z}@${s}s`).join(' '));
}
