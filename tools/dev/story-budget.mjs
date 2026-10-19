// THE STORY BUDGET (PT-061, R13): how many lines of text each map's MAIN route makes the player read, and who says them (the spine's rule: on the main path at most four lines a map, INES and SIGNAL HOUSE and the plates that are part of the room; the rest is optional depth). Plays every main route once (normal, seed 1) and counts the `message` events.
//   node tools/dev/story-budget.mjs [--over=4] [ID ...]      read-only, node only
import fs from 'node:fs';
import path from 'node:path';
import { loadMapFile, loadRouteFile, runRoute } from '../../src/engine/harness.js';

const root = path.resolve(import.meta.dirname, '../..'), args = process.argv.slice(2), over = +(args.find((a) => a.startsWith('--over='))?.slice(7) ?? 0), ids0 = args.filter((a) => /^C\d/.test(a));
const ids = ids0.length ? ids0 : fs.readdirSync(path.join(root, 'maps')).filter((f) => f.endsWith('.json')).map((f) => f.slice(0, -5)).sort();
let total = 0, maps = 0; const rows = [];
for (const id of ids) {
  const rf = path.join(root, 'routes', id + '.main.route.json'); if (!fs.existsSync(rf)) continue;
  const map = loadMapFile(path.join(root, 'maps', id + '.json')), got = [];
  const r = runRoute(map, loadRouteFile(rf), { seed: 1, difficulty: 'normal', onTick: (w) => { for (const m of w.messagesSeen) if (!got.includes(m)) got.push(m); } });
  const by = {}; for (const mid of got) { const m = map.messages.find((q) => q.id === mid); const sp = m?.speaker ?? '?'; by[sp] = (by[sp] ?? 0) + 1; }
  rows.push({ id, n: got.length, by, result: r.result }); total += got.length; maps++;
}
for (const r of rows) if (r.n > over) console.log(`${r.id.padEnd(8)} ${String(r.n).padStart(2)} ${JSON.stringify(r.by)}${r.result !== 'complete' ? ' (' + r.result + ')' : ''}`);
console.log(`${maps} maps, ${total} lines on the main routes, mean ${(total / maps).toFixed(1)}; ${rows.filter((r) => r.n > 4).length} maps over four`);
