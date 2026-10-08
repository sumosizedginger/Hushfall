// The TRAFFIC of a map: every cell a canonical route's player walks AND every cell a creature stands in while a route is played (easy / normal / hard, seeds 1 and 2, every route, creatures sampled every 5 ticks),
// written to maps-src/lanes/<ID>.json for the shaping kit (tools/mapkit/shape.mjs keeps corners and pilasters away from it and away from every sight line between two cells of it: a wall built where a creature
// walks or where two of them see each other changes what they do). Taken from the map AS IT WAS before any reshape: run it against the committed maps (MAP_DIR=<dir of the old maps>), because a reshaped map
// is not guaranteed to move the same way (that is what `route-fingerprint.mjs` proves).
//   [MAP_DIR=<dir>] node tools/dev/lane-of.mjs [ID ...]        node only, one core
import fs from 'node:fs';
import path from 'node:path';
import { loadMapFile, loadRouteFile, runRoute } from '../../src/engine/harness.js';

const root = path.resolve(import.meta.dirname, '../..'), dir = path.join(root, 'maps-src/lanes'), mapsDir = process.env.MAP_DIR ? path.resolve(process.env.MAP_DIR) : path.join(root, 'maps'); fs.mkdirSync(dir, { recursive: true });
const all = fs.readdirSync(mapsDir).filter((f) => f.endsWith('.json')).map((f) => f.replace('.json', '')).sort(), ids = process.argv.length > 2 ? process.argv.slice(2) : all;
for (const id of ids) {
  const map = loadMapFile(path.join(mapsDir, id + '.json')), cells = new Set(), at = (x, z) => Math.floor(x / map.cell) + ',' + Math.floor(z / map.cell);
  for (const rf of fs.readdirSync(path.join(root, 'routes')).filter((f) => f.startsWith(id + '.') && f.endsWith('.route.json'))) {
    const route = loadRouteFile(path.join(root, 'routes', rf));
    for (const [difficulty, seed] of [['normal', 1], ['easy', 1], ['hard', 2]]) runRoute(map, route, { seed, difficulty, onTick: (w, t) => { cells.add(at(w.player.x, w.player.z)); if (t % 5 === 0) for (const e of w.enemies) if (e.state !== 'dead') cells.add(at(e.x, e.z)); } });
  }
  fs.writeFileSync(path.join(dir, id + '.json'), JSON.stringify([...cells].sort()));
  console.log(id, cells.size, 'cells of traffic');
}
