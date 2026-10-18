// Writes routes/<ID>.secret.route.json: the map's main route with a detour into each named secret room (PT-052, R2): walk to the floor cell in front of the panel, use the panel, step inside (where the secret is counted), come back.
// A map that has a secret needs such a route (tests/maps.test.js: only the secret route finds the secret, and every message is delivered by the main or the secret route). The detour goes in after the main route's own `goto` that is nearest the panel, so the bot
// walks the shortest way there and back. A route written by hand is never overwritten unless --force.
//   node tools/dev/add-secret-route.mjs <ID> <secretId> [<secretId> ...] [--force]
import fs from 'node:fs';
import path from 'node:path';
import { parseMap } from '../../src/engine/mapformat.js';

const root = path.resolve(import.meta.dirname, '../..');
const args = process.argv.slice(2), force = args.includes('--force'), [id, ...ids] = args.filter((a) => !a.startsWith('--'));
if (!id || !ids.length) { console.error('usage: add-secret-route.mjs <ID> <secretId>... [--force]'); process.exit(2); }
const out = path.join(root, 'routes', id + '.secret.route.json');
if (fs.existsSync(out) && !force) { console.error(out + ' exists (use --force to replace it)'); process.exit(1); }
const map = parseMap(JSON.parse(fs.readFileSync(path.join(root, 'maps', id + '.json'), 'utf8')));
const ops = JSON.parse(fs.readFileSync(path.join(root, 'routes', id + '.main.route.json'), 'utf8'));
for (const sid of ids) {
  const s = map.secrets.find((q) => q.id === sid); if (!s) throw new Error('no secret ' + sid);
  const [px, pz] = s.panel, inRoom = new Set(s.cells.map((c) => c.join(',')));
  const front = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dz]) => [px + dx, pz + dz]).find(([x, z]) => ['floor', 'outdoor'].includes(map.kind(x, z)) && !inRoom.has(x + ',' + z));
  if (!front) throw new Error('no floor cell in front of the panel of ' + sid);
  let best = -1, bd = 1e9; ops.forEach((o, i) => { if (o.op === 'goto') { const d = Math.hypot(o.at[0] - front[0], o.at[1] - front[1]); if (d < bd) { bd = d; best = i; } } });
  ops.splice(best + 1, 0, { op: 'goto', at: front }, { op: 'use', at: [px, pz] }, { op: 'goto', at: s.cells[0] }, { op: 'goto', at: front });
  console.log(`${id}: secret '${sid}' panel ${px},${pz} from ${front}, detour after op ${best} (${bd.toFixed(1)} cells from the route)`);
}
fs.writeFileSync(out, JSON.stringify(ops));
console.log('wrote ' + path.relative(root, out) + ' (' + ops.length + ' ops)');
