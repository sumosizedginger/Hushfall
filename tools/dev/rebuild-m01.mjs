// PT-052, R2 (the Director's Plan): Marrow Quay (C1E1M01) has no map source (see tools/dev/reshape-m01.mjs: its JSON IS the source), so the roster pass's one change to it is made on the JSON, once, by this script: the first scripted ambush of the game, a drop-in of two
// Gaunts as the player crosses the open yard (the middle of the route), built with the same encounter kit as every other map (tools/mapkit/encounters.mjs) through a thin stand-in for the Level it reads (floor characters, the cells already holding something).
// It refuses to run twice. After it: `node tools/verify-map.mjs C1E1M01` and `node tools/dev/director-audit.mjs --laws C1E1M01`.
import fs from 'node:fs';
import path from 'node:path';
import { Encounters } from '../mapkit/encounters.mjs';

const file = path.resolve(import.meta.dirname, '../../maps/C1E1M01.json'), pretty = (m) => JSON.stringify(m, null, 1).replace(/\[\s+(-?[\d.]+),\s+(-?[\d.]+)\s+\]/g, '[$1, $2]');
const map = JSON.parse(fs.readFileSync(file, 'utf8'));
if ((map.triggers ?? []).some((t) => String(t.id).startsWith('amb-'))) { console.log('C1E1M01 already has its ambush: nothing to do'); process.exit(0); }
const H = map.grid.length, W = map.grid[0].length, ob = Array.from({ length: H }, () => Array(W).fill('.'));
for (const e of map.entities) if (e.at) ob[e.at[1]][e.at[0]] = 'x';
const ht = Array.from({ length: H }, () => Array(W).fill(0));
if (map.heights) for (let z = 0; z < H; z++) for (let x = 0; x < W; x++) { const c = map.heights[z][x]; ht[z][x] = c === '.' ? 0 : c >= '0' && c <= '9' ? +c : c >= 'a' && c <= 'z' ? c.charCodeAt(0) - 87 : 0; }
const L = { w: W, h: H, get: (x, z) => map.grid[z]?.[x], ob, ht };
const E = new Encounters(L);
E.dropIn({ at: [25, 22], radius: 2, cells: E.around([25, 22], { n: 2, min: 6, max: 10 }), kind: 'g' });
E.apply(map);
fs.writeFileSync(file, pretty(map));
console.log('C1E1M01: added', JSON.stringify(E.triggers[0].do.filter((a) => a.spawn).map((a) => a.spawn.at)), 'as a drop-in at 25,22');
