// PT-054 (Glass Steppe stutters): the enemy navigation's distance field was rebuilt on nearly every tick on a big open map (the cache held four fields; a dozen hunters have a dozen targets) and each rebuild paid for strings and a Set lookup per cell.
// The fast version (typed walkability grid, lazy floor heights, an integer flood, forty-eight cached fields) has to make EXACTLY the distances the old code made, or every creature in the game walks differently. This file keeps the old code (as it was on 2026-10-19,
// word for word in logic) and plays it against the new on every shipped map and the dev maps that have sectors, doors that breathe or cars, for twelve targets each, in the shut and the open state of every door and with the moving floors moved.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { parseMap } from '../src/engine/mapformat.js';
import { createWorld, cellSolid } from '../src/engine/world.js';
import { cellFloor } from '../src/engine/terrain.js';
import { distanceField, walkableCell } from '../src/engine/nav.js';
import { PROPS, STEP, DOOR } from '../src/engine/defs.js';
import { ROOT } from './helpers.js';

// ---- the OLD implementation, kept as the reference -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
const QUANT = 0.25, q = (h) => Math.round(h / QUANT) * QUANT, NB = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
function refNavFloor(w, cx, cz) { const m = w.map; if (m.sectors.length) { const si = m.sectorAt(cx, cz); if (si >= 0 && w.sectors?.[si]) return m.sectors[si].cycle ? q(m.sectors[si].high) : q(w.sectors[si].h); } return cellFloor(w, cx, cz); }
const refBlocked = (m) => { if (!m.__refBlocked) { const s = new Set(); for (const p of m.props) if (PROPS[p.kind]?.blocksCell) s.add(Math.floor(p.at[0]) + ',' + Math.floor(p.at[1])); m.__refBlocked = s; } return m.__refBlocked; };
function refWalkable(w, cx, cz) {
  const m = w.map; if (cx < 0 || cz < 0 || cx >= m.w || cz >= m.h) return false;
  const k = m.kind(cx, cz); if (k === 'wall' || k === 'water' || k === 'void') return false;
  if (cellSolid(w, cx, cz) && !((k === 'door') && w.doors.find((d) => d.cx === cx && d.cz === cz)?.breath)) return false;
  return !refBlocked(m).has(cx + ',' + cz);
}
function refField(w, tcx, tcz) {
  const m = w.map, W = m.w, dist = new Int32Array(W * m.h).fill(-1), qu = new Int32Array(W * m.h); let head = 0, tail = 0; dist[tcz * W + tcx] = 0; qu[tail++] = tcz * W + tcx;
  while (head < tail) {
    const i = qu[head++], cx = i % W, cz = (i / W) | 0, fa = refNavFloor(w, cx, cz);
    for (const [dx, dz] of NB) {
      const nx = cx + dx, nz = cz + dz; if (!refWalkable(w, nx, nz)) continue; const j = nz * W + nx; if (dist[j] >= 0) continue;
      if (fa - refNavFloor(w, nx, nz) > STEP + 1e-6) continue; if (dx && dz && !(refWalkable(w, cx + dx, cz) && refWalkable(w, cx, cz + dz))) continue;
      dist[j] = dist[i] + 1; qu[tail++] = j;
    }
  }
  return dist;
}
// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

const read = (dir, id) => parseMap(JSON.parse(fs.readFileSync(path.join(ROOT, dir, id + '.json'), 'utf8')));
const idsIn = (dir) => fs.readdirSync(path.join(ROOT, dir)).filter((f) => f.endsWith('.json') && !f.startsWith('PERF_')).map((f) => f.replace('.json', '')).sort();
/** twelve target cells spread over the map's floor, the same every time: the player's start, the exits' neighbourhoods, and a stride through the walkable cells */
function targets(w, n = 12) {
  const m = w.map, cells = []; for (let z = 0; z < m.h; z++) for (let x = 0; x < m.w; x++) if (walkableCell(w, x, z)) cells.push([x, z]);
  const out = [[Math.floor(w.player.x / m.cell), Math.floor(w.player.z / m.cell)]]; for (let k = 1; k < n && cells.length; k++) out.push(cells[Math.floor((k * cells.length) / n)]); return out;
}
const same = (w, label) => { for (const [tx, tz] of targets(w)) { const a = refField(w, tx, tz), b = distanceField(w, tx, tz); assert.equal(b.length, a.length); for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) assert.fail(`${label}: target ${tx},${tz} cell ${i % w.map.w},${(i / w.map.w) | 0}: old ${a[i]} new ${b[i]}`); } };

test('every shipped map: the fast distance field is the old one, cell for cell, for twelve targets (doors as they start)', () => {
  const ids = idsIn('maps'); assert.ok(ids.length >= 60);
  for (const id of ids) same(createWorld(read('maps', id), { seed: 1, difficulty: 'normal' }), id);
});

test('doors open and shut, breathing gates, moving floors moved: the fields follow the state exactly as the old ones did (every shipped map with a door or a sector, and the dev maps with cars and sectors)', () => {
  const maps = [...idsIn('maps').map((id) => ['maps', id]), ...['RANGE', 'HIVEYARDS', 'HIVE'].filter((id) => fs.existsSync(path.join(ROOT, 'maps-dev', id + '.json'))).map((id) => ['maps-dev', id])];
  let checked = 0;
  for (const [dir, id] of maps) {
    const m = read(dir, id), w = createWorld(m, { seed: 1, difficulty: 'normal' }); if (!w.doors.length && !w.sectors.length) continue; checked++;
    for (const d of w.doors) { d.open = 1; d.target = 1; } same(w, id + ' (all doors open)');
    w.doors.forEach((d, i) => { d.open = i % 2 ? 1 : 0; d.target = d.open; }); same(w, id + ' (every other door open)');
    w.sectors.forEach((s, i) => { s.h += 0.5 * (i + 1); }); same(w, id + ' (floors moved)');
    for (const d of w.doors) { d.open = 0; d.target = 0; } same(w, id + ' (all doors shut)');
  }
  assert.ok(checked >= 20, 'maps with doors or sectors: ' + checked);
});

test('the cache keeps the fields of many hunters at once: twenty targets, asked again in another order, are the very same arrays (nothing is rebuilt)', () => {
  const w = createWorld(read('maps', 'C2M02'), { seed: 1, difficulty: 'normal' }), ts = targets(w, 20), first = ts.map(([x, z]) => distanceField(w, x, z));
  for (let k = ts.length - 1; k >= 0; k--) assert.strictEqual(distanceField(w, ts[k][0], ts[k][1]), first[k], 'target ' + ts[k] + ' was still cached');
  for (const d of w.doors) { d.open = d.open >= DOOR.passableAt ? 0 : 1; d.target = d.open; }          // a door changed state: every cached field is stale and is rebuilt on the next ask
  if (w.doors.length) assert.notStrictEqual(distanceField(w, ts[0][0], ts[0][1]), first[0], 'a door changed: the field is rebuilt');
});

test('walkableCell: the same answer as before for every cell of five maps, doors shut and open', () => {
  for (const id of ['C1E1M03', 'C1E3M02', 'C1E4M03', 'C2M02', 'C2M28']) {
    const w = createWorld(read('maps', id), { seed: 1, difficulty: 'normal' });
    for (const open of [0, 1]) { for (const d of w.doors) { d.open = open; d.target = open; } for (let z = -1; z <= w.map.h; z++) for (let x = -1; x <= w.map.w; x++) assert.equal(walkableCell(w, x, z), refWalkable(w, x, z), `${id} ${x},${z} doors ${open}`); }
  }
});
