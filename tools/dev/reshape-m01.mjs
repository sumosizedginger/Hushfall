// PT-021, rooms that are not boxes, for Marrow Quay (C1E1M01). This map was authored as JSON (there is no maps-src source), so the reshape is a ONE-TIME transform of maps/C1E1M01.json, kept here as the record of what
// was done. Its buildings stand in the water with one-cell walls, so a bay has nothing to be dug into: the water beside a wall is first built up into a thick wall ("bulk"), then the bays are cut out of it. The harbourmaster's
// house gets an apse on each side, the east hall a row of bays in its north wall, and the corners of the hall's three zones are cut. Only geometry and a few props change; `route-fingerprint.mjs` proves the routes do not.
//   node tools/dev/reshape-m01.mjs [--dry]    (MAP_OUT=<dir> writes there instead of maps/)
import fs from 'node:fs';
import path from 'node:path';
import { Level } from '../mapkit/builder.mjs';
import { Shape, laneOf } from '../mapkit/shape.mjs';
import { validateMap } from '../../src/engine/mapformat.js';

const root = path.resolve(import.meta.dirname, '../..'), file = process.env.M01_SRC ? path.resolve(process.env.M01_SRC) : path.join(root, 'maps/C1E1M01.json'), outDir = process.env.MAP_OUT ? path.resolve(process.env.MAP_OUT) : path.join(root, 'maps');
const map = JSON.parse(fs.readFileSync(file, 'utf8')), H = map.grid.length, W = map.grid[0].length;
if (map.grid[4][14] === 'B') { console.log('C1E1M01 is already reshaped'); process.exit(0); }
const L = new Level(W, H);
for (let z = 0; z < H; z++) for (let x = 0; x < W; x++) L.g[z][x] = map.grid[z][x];
for (const e of map.entities) { const x = Math.floor(e.at[0]), z = Math.floor(e.at[1]); if (L.ob[z]?.[x] !== undefined) L.ob[z][x] = '?'; }
const S = new Shape(L, { lane: laneOf('C1E1M01'), foes: map.entities.filter((e) => e.type === 'enemy').map((e) => [Math.floor(e.at[0]), Math.floor(e.at[1])]) });

/** build up the water in `r` into wall `c`, only if every cell of it is water and none is on the map's edge ring */
const bulk = (r, c = 'B') => { for (let z = r[1]; z <= r[3]; z++) for (let x = r[0]; x <= r[2]; x++) if (L.get(x, z) !== '~' || x < 1 || z < 1 || x >= W - 1 || z >= H - 1) return false; L.rect(r, c); return true; };

// the harbourmaster's house [18,3,27,7]: an apse on its west side and on its east side (pavilions)
if (bulk([14, 3, 16, 7])) S.bay(17, 5, 'w', { w: 3, d: 2, heart: true });
if (bulk([29, 3, 31, 7])) S.bay(28, 5, 'e', { w: 3, d: 2, heart: true });
S.chamfer([18, 3, 27, 7], 'nw ne sw se', 2);
// the east hall [34,8,45,27]: bays in its north wall (the gallery), under a thickened north side
if (bulk([35, 4, 44, 6])) S.bays('n', 7, 35, 44, { w: 3, gap: 1, d: 2, heart: 'alt' });
S.chamfer([34, 8, 45, 12], 'nw ne', 2); S.chamfer([34, 14, 45, 20], 'nw sw se', 2); S.chamfer([34, 22, 45, 27], 'nw sw se ne', 2);
S.chamfer([6, 20, 10, 24], 'ne se', 1);
S.dressBays('lantern');

// the marks (render only): someone was dragged to the harbourmaster's door; the net loft's wall weeps
const decals = [{ kind: 'smear', at: [22, 10], rot: 1.5708, size: 2.6, h: 1.0 }, { kind: 'bloodpool', at: [22, 9], size: 1.2 }, { kind: 'damp', at: [9, 20], wall: 'north', y: 1.5, size: 1.6 }];
const out = { ...map, grid: L.layers().geometry, entities: [...map.entities, ...S.dressing()], decals };
const v = validateMap(out); if (!v.ok) { console.error('FAIL', v.errors.slice(0, 20).join('\n')); process.exit(1); }
console.log('C1E1M01 shape:', S.summary()); if (process.env.SHAPE_REPORT) console.log(S.report.skipped.join('\n'));
const pretty = (m) => JSON.stringify(m, null, 1).replace(/\[\s+(-?[\d.]+),\s+(-?[\d.]+)\s+\]/g, '[$1, $2]');
if (!process.argv.includes('--dry')) { fs.mkdirSync(outDir, { recursive: true }); fs.writeFileSync(path.join(outDir, 'C1E1M01.json'), pretty(out)); console.log('wrote', path.join(outDir, 'C1E1M01.json')); }
