// Route identity (PT-021, reshaping the maps): every canonical route of the named maps (default: all) played by the bot on easy / normal / hard, seeds 1-3, headless, and what it ENDED with written down:
// result, ticks, hit points + armour left, kills, ammunition, pickups. A reshaped map (floor added in apses, a corner cut, a nib of wall) must give the SAME numbers: the lane, the fights and the ammunition did not move.
//   node tools/dev/route-fingerprint.mjs save <out.json> [ID ...]          write the fingerprint of the maps as they are now
//   node tools/dev/route-fingerprint.mjs check <baseline.json> [ID ...]    play again and list every route whose numbers differ (exit 1 if any)
// FP_QUICK=1 plays only normal / seed 1 (a fast first look). Node only: no browser. One core; 5 to 15 seconds per run (MAP_DIR=<dir> plays the maps compiled there: a dry run before anything is written to maps/).
import fs from 'node:fs';
import path from 'node:path';
import { loadMapFile, loadRouteFile, runRoute } from '../../src/engine/harness.js';

const root = path.resolve(import.meta.dirname, '../..');
const [, , mode, file, ...ids0] = process.argv;
if (!['save', 'check'].includes(mode) || !file) { console.error('usage: route-fingerprint.mjs save|check <file.json> [ID ...]'); process.exit(2); }
const all = fs.readdirSync(path.join(root, 'maps')).filter((f) => f.endsWith('.json')).map((f) => f.replace('.json', '')).sort(), ids = ids0.length ? ids0 : all;
const routesOf = (id) => fs.readdirSync(path.join(root, 'routes')).filter((f) => f.startsWith(id + '.') && f.endsWith('.route.json')).sort();

const mapsDir = process.env.MAP_DIR ? path.resolve(process.env.MAP_DIR) : path.join(root, 'maps'), out = {};
for (const id of ids) {
  const map = loadMapFile(path.join(mapsDir, id + '.json'));
  for (const rf of routesOf(id)) {
    const route = loadRouteFile(path.join(root, 'routes', rf));
    for (const difficulty of (process.env.FP_QUICK ? ['normal'] : ['easy', 'normal', 'hard'])) for (const seed of (process.env.FP_QUICK ? [1] : [1, 2, 3])) {
      const r = runRoute(map, route, { seed, difficulty }), w = r.world, p = w.player;
      out[`${rf.replace('.route.json', '')}|${difficulty}|${seed}`] = { result: r.result, ticks: r.ticks, hp: Math.round(p.hp * 1000) / 1000, armor: Math.round(p.armor * 1000) / 1000, kills: w.stats.kills, items: w.stats.items, secrets: w.stats.secrets, ammo: p.ammo, weapon: p.weapon };
    }
  }
  console.log('played', id, routesOf(id).length, 'route(s)');
}

if (mode === 'save') { fs.writeFileSync(file, JSON.stringify(out, null, 1)); console.log('saved', Object.keys(out).length, 'runs ->', file); process.exit(0); }
const base = JSON.parse(fs.readFileSync(file, 'utf8')); let bad = 0, same = 0;
for (const [k, v] of Object.entries(out)) {
  if (!base[k]) { console.log('NEW (not in the baseline)', k); continue; }
  if (JSON.stringify(base[k]) === JSON.stringify(v)) { same++; continue; }
  bad++; console.log('DIFFERS', k, '\n   was', JSON.stringify(base[k]), '\n   now', JSON.stringify(v));
}
console.log(bad ? `${bad} run(s) differ, ${same} identical` : `all ${same} runs identical to the baseline`);
process.exit(bad ? 1 : 0);
