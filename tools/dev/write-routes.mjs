// Write the routes of a map from the `waypoints` a map source exports (PT-039, Act B: the maps place their enemies by polar rules, so the routes are written by the same rules).
//   node tools/dev/write-routes.mjs <ID>      reads maps-src/<ID>.level.mjs `export const waypoints = { main: [...], secret: [...] }` and writes routes/<ID>.<name>.route.json
// An entry is [x, z] (a goto followed by a kill), [x, z, 0] (a goto only) or a route op object (written as it is: { op: 'switch', id }, { op: 'use', at }, { op: 'lamp', on: false }, ...).
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const root = path.resolve(import.meta.dirname, '../..'), id = process.argv[2];
if (!id) { console.error('usage: node tools/dev/write-routes.mjs <ID>'); process.exit(2); }
const mod = await import(pathToFileURL(path.join(root, 'maps-src', id + '.level.mjs')).href);
if (!mod.waypoints) { console.error(id + ' exports no waypoints'); process.exit(2); }
for (const [name, list] of Object.entries(mod.waypoints)) {
  const ops = [];
  for (const w of list) {
    if (Array.isArray(w)) { ops.push({ op: 'goto', at: [w[0], w[1]] }); if (w[2] !== 0) ops.push({ op: 'kill' }); } else ops.push(w);
  }
  fs.writeFileSync(path.join(root, 'routes', `${id}.${name}.route.json`), JSON.stringify(ops));
  console.log(`wrote routes/${id}.${name}.route.json (${ops.length} ops)`);
}
