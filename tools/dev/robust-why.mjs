// Why does the ROBUSTNESS gate fail (viability.js: the strafing fighter on Normal with aim error 0.03 rad, or with ammunition pickups worth 25%
// less)? Plays that run on a map and prints the damage by source, where and when the player died or got stuck, and the ammunition left.
// `MAP_FILE=<json>` plays another build of the map (a scratch compile). Node only.
//   node tools/dev/robust-why.mjs <ID> [ammo|aim] [seed]
import fs from 'node:fs';
import path from 'node:path';
import { loadMapFile, runRoute } from '../../src/engine/harness.js';
import { step } from '../../src/engine/world.js';

const root = path.resolve(import.meta.dirname, '../..'),
  [id, which = 'ammo', seedS = '1'] = process.argv.slice(2);
const map = loadMapFile(process.env.MAP_FILE ?? path.join(root, 'maps', id + '.json')),
  route = JSON.parse(fs.readFileSync(path.join(root, 'routes', id + '.main.route.json'), 'utf8'));
const by = {},
  marks = [];
const r = runRoute(map, route, {
  seed: Number(seedS),
  difficulty: 'normal',
  weave: true,
  ...(which === 'aim' ? { tremor: 0.03 } : { ammoScale: 0.75 }),
  stepper: (w, cmd) => {
    step(w, cmd);
    for (const e of w.events) if (e.type === 'hurt') by[e.src] = (by[e.src] ?? 0) + e.amount;
    if (w.tick % 600 === 0) {
      const p = w.player;
      marks.push(`${(w.time | 0)}s hp ${p.hp | 0} cell ${(p.x / map.cell).toFixed(0)},${(p.z / map.cell).toFixed(0)} ammo ${JSON.stringify(p.ammo)}`);
    }
  },
});
console.log(id, which, 'seed', seedS, r.result, r.failure ?? '', 'damage', r.world.stats.damageTaken);
console.log(' ', Object.entries(by).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v}`).join(', '));
for (const m of marks) console.log('  ' + m);
