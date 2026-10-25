// Where could a POCKET be cut into the solid wall of a finished map, with a clear apron of floor in front of it that nobody walks on? (FREEZE F7, the platform and lock returns.) A pocket is a W wide, D deep block of wall cells with a ring of wall round its sides and back
// (so cutting it opens nothing to a neighbouring room), and its mouth is a row of W plain floor cells of one height; the APRON is the A rows of floor in front of the mouth (where a timing platform or a lock's chamber goes), all outside the traffic of the routes
// (maps-src/lanes/<ID>.json, the AUTHORING frame) by `lane` cells, with no entity on or beside it, no floor effect, a roof high enough for a 2 m rise. Reads the map compiled WITHOUT its squeeze. Node only.
//   node tools/dev/pocket-sites.mjs <ID> [--w=3] [--d=2] [--a=3] [--lane=2] [--lift=2] [--top=12]
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { parseMap } from '../../src/engine/mapformat.js';
import { FLOOR_SKINS } from '../../src/engine/defs.js';

const root = path.resolve(import.meta.dirname, '../..'), args = process.argv.slice(2), id = args.find((a) => /^C\d/.test(a)), opt = (n, d) => +(args.find((a) => a.startsWith('--' + n + '='))?.split('=')[1] ?? d);
if (!id) { console.error('usage: pocket-sites.mjs <ID> [--w=3] [--d=2] [--a=3] [--lane=2] [--lift=2] [--top=12]'); process.exit(2); }
const W = opt('w', 3), D = opt('d', 2), A = opt('a', 3), LANE = opt('lane', 2), LIFT = opt('lift', 2), TOP = opt('top', 12);
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ps-')), r = spawnSync(process.execPath, [path.join(root, 'tools/mapkit/compile.mjs'), id], { cwd: root, env: { ...process.env, SQUEEZE: 'off', MAP_OUT: dir }, encoding: 'utf8' });
const file = fs.existsSync(path.join(dir, id + '.json')) ? path.join(dir, id + '.json') : path.join(root, 'maps', id + '.json'); if (r.status !== 0) console.error('(compile failed, reading maps/ as it is)');
const src = JSON.parse(fs.readFileSync(file, 'utf8')), m = parseMap(src); fs.rmSync(dir, { recursive: true, force: true });
const lane = JSON.parse(fs.readFileSync(path.join(root, 'maps-src', 'lanes', id + '.json'), 'utf8')).map((k) => k.split(',').map(Number)), occupied = [];
for (const e of src.entities) if (e.at) occupied.push(e.at); for (const s of src.secrets ?? []) for (const c of s.cells) occupied.push(c); for (const s of src.sectors ?? []) for (const c of s.cells) occupied.push(c); for (const d of src.doors ?? []) occupied.push(d.at);
for (const t of src.triggers ?? []) if (t.at) occupied.push(t.at);
const near = (x, z, set, rad) => set.some(([a, b]) => Math.abs(a - x) <= rad && Math.abs(b - z) <= rad), laneDist = (x, z) => { let best = 99; for (const [a, b] of lane) best = Math.min(best, Math.max(Math.abs(a - x), Math.abs(b - z))); return best; };
const plain = (x, z) => m.kind(x, z) === 'floor' && Object.hasOwn(FLOOR_SKINS, m.tile(x, z)) && !m.fx(x, z) && m.sectorAt(x, z) < 0;
const half = (W - 1) / 2, out = [];
for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
  const px = -dz, pz = dx;                                                                                                                  // across the mouth
  for (let z0 = 1; z0 < m.h - 1; z0++) for (let x0 = 1; x0 < m.w - 1; x0++) {
    const c = (j, i) => [x0 + dx * j + px * i, z0 + dz * j + pz * i];                                                                       // j along the wall's normal (into the wall), i across
    let ok = true, h0 = null;
    for (let k = 0; k < A && ok; k++) for (let i = -half; i <= half && ok; i++) { const [x, z] = c(-k, i); if (!plain(x, z)) { ok = false; break; } const h = m.floor(x, z); if (h0 == null) h0 = h; if (h !== h0) ok = false; if (m.ceilingAt(x, z) < h0 + LIFT + 2.6) ok = false; if (near(x, z, occupied, 1)) ok = false; }
    if (!ok) continue;
    for (let j = 1; j <= D + 1 && ok; j++) for (let i = -half - 1; i <= half + 1 && ok; i++) { const [x, z] = c(j, i); if (m.kind(x, z) !== 'wall') ok = false; }                          // the pocket, its sides and its back are all wall
    if (!ok) continue;
    let ld = 99; for (let k = 0; k < A; k++) for (let i = -half; i <= half; i++) { const [x, z] = c(-k, i); ld = Math.min(ld, laneDist(x, z)); } if (ld < LANE) continue;
    out.push({ mouth: c(0, 0), d: [dx, dz], lane: ld, height: h0, apron: [c(-(A - 1), -half), c(0, half)], pocket: [c(1, -half), c(D, half)] });
  }
}
out.sort((a, b) => a.lane - b.lane); console.log(`${id}: ${out.length} sites (pocket ${W} x ${D}, apron ${W} x ${A}, off the lane by ${LANE}+, a ${LIFT} m rise under the roof); nearest the traffic first:`);
for (const s of out.slice(0, TOP)) console.log(`  mouth [${s.mouth}] into ${s.d[0] ? (s.d[0] > 0 ? 'east' : 'west') : (s.d[1] > 0 ? 'south' : 'north')}, ${s.lane} off the lane, floor ${s.height} m, apron ${JSON.stringify(s.apron)}, pocket ${JSON.stringify(s.pocket)}`);
