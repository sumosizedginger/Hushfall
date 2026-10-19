// Where could an ammunition-load cache lie? (PT-056, R9): free floor cells that are OFF the traffic of the map's routes (maps-src/lanes/<ID>.json, the AUTHORING frame) by `min`..`max` cells of walking, in a place with some walls round it (a bay, a corner, a dead end),
// best first. Reads the map compiled WITHOUT its squeeze when the source has one, so the cells are the ones a map source speaks. Node only.
//   node tools/dev/load-spots.mjs <ID> [--min=3] [--max=9] [--top=12]
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { FLOOR_SKINS } from '../../src/engine/defs.js';

const root = path.resolve(import.meta.dirname, '../..'), args = process.argv.slice(2), id = args.find((a) => /^C\d/.test(a)), opt = (n, d) => +(args.find((a) => a.startsWith('--' + n + '='))?.split('=')[1] ?? d);
if (!id) { console.error('usage: load-spots.mjs <ID> [--min=3] [--max=9] [--top=12]'); process.exit(2); }
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ls-')), r = spawnSync(process.execPath, [path.join(root, 'tools/mapkit/compile.mjs'), id], { cwd: root, env: { ...process.env, SQUEEZE: 'off', MAP_OUT: dir }, encoding: 'utf8' });
const mapFile = fs.existsSync(path.join(dir, id + '.json')) ? path.join(dir, id + '.json') : path.join(root, 'maps', id + '.json'); if (r.status !== 0) console.error('(compile failed, reading maps/ as it is)');
const map = JSON.parse(fs.readFileSync(mapFile, 'utf8')), W = map.grid[0].length, H = map.grid.length, floor = (x, z) => x >= 0 && z >= 0 && x < W && z < H && (Object.hasOwn(FLOOR_SKINS, map.grid[z][x]) || map.grid[z][x] === 'D');
const lane = new Set(JSON.parse(fs.readFileSync(path.join(root, 'maps-src', 'lanes', id + '.json'), 'utf8'))), occupied = new Set(map.entities.filter((e) => e.at).map((e) => e.at[0] + ',' + e.at[1]));
for (const s of map.sectors ?? []) for (const c of s.cells) occupied.add(c[0] + ',' + c[1]);
const dist = new Map(), q = []; for (const k of lane) { dist.set(k, 0); q.push(k); }
for (let i = 0; i < q.length; i++) { const [x, z] = q[i].split(',').map(Number), d = dist.get(q[i]); for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, nz = z + dz, k = nx + ',' + nz; if (floor(nx, nz) && !dist.has(k)) { dist.set(k, d + 1); q.push(k); } } }
const min = opt('min', 3), max = opt('max', 9), out = [];
for (const [k, d] of dist) { if (d < min || d > max || occupied.has(k)) continue; const [x, z] = k.split(',').map(Number); let walls = 0, open8 = 0; for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) if (a || b) { if (floor(x + a, z + b)) open8++; else walls++; }
  if (map.grid[z][x] === 'D') continue; out.push({ at: [x, z], off: d, walls, open8 }); }
out.sort((a, b) => b.walls - a.walls || a.off - b.off); console.log(`${id}: ${out.length} candidate cells (off the lane by ${min}..${max}); the most enclosed first:`);
for (const c of out.slice(0, opt('top', 12))) console.log(`  [${c.at}]  ${c.off} off the lane, ${c.walls} of 8 neighbours wall`);
fs.rmSync(dir, { recursive: true, force: true });
