// Every route of a map on every difficulty and three seeds, with the standing and the strafing fighter (PT-052, the Level B work): one line per route and difficulty, `c` = completed, `d` = died, `b` = the bot failed, a number is the damage taken, `a/b` = the standing run
// and then the strafing one when the first did not complete; then the director's numbers and laws for the map as it stands in maps/. The quick look before `verify-map` (about ten seconds a map). Node only.
//   node tools/dev/route-matrix.mjs <ID> ...
import fs from 'node:fs';
import path from 'node:path';
import { loadMapFile, loadRouteFile, runRoute } from '../../src/engine/harness.js';
import { auditMap, laws } from './director-audit.mjs';

const root = path.resolve(import.meta.dirname, '../..');
for (const id of process.argv.slice(2)) {
  const file = path.join(root, 'maps', id + '.json'), m = loadMapFile(file);
  for (const rf of fs.readdirSync(path.join(root, 'routes')).filter((f) => f.startsWith(id + '.') && f.endsWith('.route.json'))) {
    const r = loadRouteFile(path.join(root, 'routes', rf));
    for (const diff of ['easy', 'normal', 'hard']) {
      const row = []; for (const seed of [1, 2, 3]) { const a = runRoute(m, r, { seed, difficulty: diff }), b = a.result === 'complete' ? null : runRoute(m, r, { seed, difficulty: diff, weave: 2 }); row.push(`${a.result[0]}${a.world.stats.damageTaken}${b ? '/' + b.result[0] + b.world.stats.damageTaken : ''}`); }
      console.log(`${id} ${rf.replace(id + '.', '').replace('.route.json', '').padEnd(7)} ${diff.padEnd(7)} ${row.join('  ')}`);
    }
  }
  const src = JSON.parse(fs.readFileSync(file, 'utf8')), a = auditMap(src), k = {}; for (const e of src.entities) if (e.type === 'enemy') k[e.kind] = (k[e.kind] ?? 0) + 1;
  console.log(`${id}: ${src.grid[0].length}x${src.grid.length}, ${a.walk} cells, ${a.enemies} creatures (density ${a.density}), top ${a.topKind} ${a.topShare}%, shooters ${a.rangedShare}%, ambushes ${a.ambushes}, secrets ${a.secrets}, loops ${a.loops}, empty rooms ${a.emptyRooms}; laws: ${laws(a).join('; ') || 'met'}`);
}
