// Who hurt the player, from the sim's own `hurt` events (each carries `src`: the creature and its attack, or a hazard): the route bot plays a map's
// main route and the damage is summed by source and by the cell it was taken in. Sharper than dbg-route.mjs, which guesses from who stood nearest.
// Node only, deterministic.
//   node tools/dev/hurt-by.mjs <ID> [easy|normal|hard] [seed ...]
import fs from 'node:fs';
import path from 'node:path';
import { loadMapFile, runRouteEither } from '../../src/engine/harness.js';

const root = path.resolve(import.meta.dirname, '../..'),
  [id, difficulty = 'normal', ...seedArgs] = process.argv.slice(2);
if (!id) {
  console.error('usage: hurt-by.mjs <ID> [difficulty] [seed ...]');
  process.exit(2);
}
const map = loadMapFile(process.env.MAP_FILE ?? path.join(root, 'maps', id + '.json')), // MAP_FILE: another build of the map
  route = JSON.parse(fs.readFileSync(path.join(root, 'routes', id + '.main.route.json'), 'utf8')),
  seeds = seedArgs.length ? seedArgs.map(Number) : [1, 2, 3];
for (const seed of seeds) {
  const r = runRouteEither(map, route, { seed, difficulty }),
    by = {},
    big = [];
  for (const e of r.events)
    if (e.type === 'hurt') {
      by[e.src] = (by[e.src] ?? 0) + e.amount;
      if (e.amount >= 15) big.push(`${e.src} ${e.amount}`);
    }
  const total = Object.values(by).reduce((a, b) => a + b, 0);
  console.log(
    `${id} ${difficulty} seed ${seed}: ${r.result} (${r.policy}), ${total} damage, end hp ${Math.round(r.world.player.hp)}\n  ` +
      Object.entries(by)
        .sort((a, b) => b[1] - a[1])
        .map(([k, v]) => `${k} ${v}`)
        .join(', ') +
      (big.length ? `\n  big hits: ${big.join(', ')}` : ''),
  );
}
