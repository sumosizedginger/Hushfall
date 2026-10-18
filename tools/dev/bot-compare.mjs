// Does the strafing bot (`weave`, src/engine/bot.js) survive where the stand-still bot dies? (PT-052: the Director's Plan, P2 "Bot v2", first half.) For every map with combat the main route is played on normal and hard, seeds 1 and 2, by the old fighter (stands still and shoots)
// and by the weaving fighter (strafes in half-second runs while it trades with a shooter), and the completions and the damage are compared. Node only, one core, about a quarter of an hour for all maps.
//   node tools/dev/bot-compare.mjs [ID ...] [--out=file.json]
import fs from 'node:fs';
import path from 'node:path';
import { loadMapFile, loadRouteFile, runRoute } from '../../src/engine/harness.js';

const root = path.resolve(import.meta.dirname, '../..'), args = process.argv.slice(2), out = args.find((a) => a.startsWith('--out='))?.slice(6);
const all = fs.readdirSync(path.join(root, 'maps')).filter((f) => f.endsWith('.json')).map((f) => f.replace('.json', '')).sort(), ids = args.filter((a) => /^C\d/.test(a)).length ? args.filter((a) => /^C\d/.test(a)) : all;
const rows = [];
for (const id of ids) {
  const rf = path.join(root, 'routes', id + '.main.route.json'); if (!fs.existsSync(rf)) continue;
  const map = loadMapFile(path.join(root, 'maps', id + '.json')), route = loadRouteFile(rf); if (!map.counts().enemies) continue;
  const row = { id }; for (const mode of ['stand', 'weave']) for (const difficulty of ['normal', 'hard']) { let done = 0, dmg = 0; for (const seed of [1, 2]) { const r = runRoute(map, route, { seed, difficulty, weave: mode === 'weave' }); if (r.result === 'complete') done++; dmg += 100 - Math.max(0, r.world.player.hp); } row[mode + '_' + difficulty] = { done, dmg: Math.round(dmg / 2) }; }
  rows.push(row); console.log(id, JSON.stringify(row));
}
const sum = (k) => rows.reduce((a, r) => a + r[k].done, 0), n = rows.length * 2;
console.log(`\nmaps ${rows.length}; completions of ${n} runs: stand normal ${sum('stand_normal')}, weave normal ${sum('weave_normal')}, stand hard ${sum('stand_hard')}, weave hard ${sum('weave_hard')}`);
if (out) fs.writeFileSync(out, JSON.stringify(rows, null, 1));
