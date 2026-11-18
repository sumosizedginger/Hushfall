// How much of the corner map is something (the outside playtest of 2026-11-18: "the minimap is mostly black"). Node only: the route bot plays a map
// and every 10 s of play the corner map's window (minimap.js, the 'small' size) is counted: the share that is explored floor, explored wall, the
// dim outline of nearby walls (G5), and nothing at all. Prints the median per map and over all.
//   node tools/dev/minimap-fill.mjs [ID ...]      (no ID: every main map)
import fs from 'node:fs';
import path from 'node:path';
import { parseMap } from '../../src/engine/mapformat.js';
import { runRoute } from '../../src/engine/harness.js';
import { automapModel } from '../../src/engine/automap.js';
import { MINIMAP, minimapView, nearbyCells } from '../../src/game/minimap.js';

const root = path.resolve(import.meta.dirname, '../..');
const ids = process.argv.slice(2).length
  ? process.argv.slice(2)
  : fs
      .readdirSync(path.join(root, 'maps'))
      .filter((f) => /^C\d(E\dM\d\d|M\d\d)\.json$/.test(f))
      .map((f) => f.replace('.json', ''));
const med = (a) => (a.length ? [...a].sort((x, y) => x - y)[a.length >> 1] : 0);
const r = +(process.env.R ?? MINIMAP.sizes.small.r),
  N = (2 * r + 1) ** 2;
const all = { floor: [], wall: [], hint: [], empty: [] };
for (const id of ids) {
  const map = parseMap(JSON.parse(fs.readFileSync(path.join(root, 'maps', id + '.json'), 'utf8')));
  const rp = path.join(root, 'routes', id + '.main.route.json');
  if (!fs.existsSync(rp)) continue;
  const route = JSON.parse(fs.readFileSync(rp, 'utf8'));
  const per = { floor: [], wall: [], hint: [], empty: [] };
  runRoute(map, route, {
    onTick: (w, t) => {
      if (t % 600) return;
      const m = automapModel(w);
      m.near = nearbyCells(w.map, w.player);
      const v = minimapView(m, r);
      const floor = v.cells.filter((c) => c.kind !== 'wall').length,
        wall = v.cells.length - floor,
        hint = v.near.filter((c) => !c.seen && c.kind !== 'wall').length;
      for (const [k, n] of Object.entries({ floor, wall, hint, empty: N - floor - wall - hint })) per[k].push(n / N);
    },
  });
  const row = Object.fromEntries(Object.entries(per).map(([k, a]) => [k, med(a)]));
  for (const k of Object.keys(all)) all[k].push(row[k]);
  console.log(id.padEnd(9), Object.entries(row).map(([k, x]) => k + ' ' + (100 * x).toFixed(0) + '%').join('  '));
}
console.log('MEDIAN   ', Object.entries(all).map(([k, a]) => k + ' ' + (100 * med(a)).toFixed(0) + '%').join('  '));
