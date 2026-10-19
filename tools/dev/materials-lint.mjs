// THE ROOM RULE (PT-063, V6c of the visual plan): "one material in one hue" is how a room goes flat. Per ROOM (the blobs of open floor that `map-shape.mjs` calls rooms: five cells wide somewhere, grown back out by three), a room should show at least TWO wall skins, TWO floor skins and ONE accent
// (a prop or a piece of scenery standing in it). This is a REPORT first (like `map-feel`): it enforces nothing, and the rebuilt maps' laws can name it later (design/VISUAL_DIRECTION.md V6).
//   node tools/dev/materials-lint.mjs [--dir=maps] [--json] [--min-area=30] [--worst=12] [ID ...]
// A skin is a tile character: the walls a room's open cells touch (4-neighbours) and the floor characters under its open cells. A floor "effect" layer (the `fx` rows) is not counted as a floor skin. An accent is a prop (`entities` of type 'prop', and `scenery`) whose cell lies in the room.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseMap } from '../../src/engine/mapformat.js';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const args = process.argv.slice(2), flag = (n, d) => args.find((a) => a.startsWith('--' + n + '='))?.slice(n.length + 3) ?? d, dir = flag('dir', 'maps'), minArea = +flag('min-area', 30), worstN = +flag('worst', 12), ids = args.filter((a) => !a.startsWith('--'));

/** the rooms of a parsed map: [{ id, cells: [[x, z]], area }] (same definition as map-shape.mjs: a heart is a cell with two clear cells all round it, grown out by three) */
export function roomsOf(map) {
  const W = map.w, H = map.h, open = (x, z) => { if (x < 0 || z < 0 || x >= W || z >= H) return false; const k = map.kind(x, z); return k === 'outdoor' || k === 'floor' || k === 'door'; };
  const INF = 1e9, d = Array.from({ length: H }, (_, z) => Array.from({ length: W }, (_, x) => (open(x, z) ? INF : 0)));
  const rel = (z, x, list) => { for (const [dx, dz] of list) { const q = d[z + dz]?.[x + dx]; d[z][x] = Math.min(d[z][x], q !== undefined ? q + 1 : 1); } };
  for (let z = 0; z < H; z++) for (let x = 0; x < W; x++) if (d[z][x]) rel(z, x, [[-1, 0], [0, -1], [-1, -1], [1, -1]]);
  for (let z = H - 1; z >= 0; z--) for (let x = W - 1; x >= 0; x--) if (d[z][x]) rel(z, x, [[1, 0], [0, 1], [1, 1], [-1, 1]]);
  const lab = Array.from({ length: H }, () => Array(W).fill(-1)), rooms = []; let n = 0;
  for (let z = 0; z < H; z++) for (let x = 0; x < W; x++) if (d[z][x] >= 3 && lab[z][x] < 0) {
    const id = n++, st = [[x, z]]; lab[z][x] = id; const cells = [];
    while (st.length) { const [cx, cz] = st.pop(); cells.push([cx, cz]); for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) { const nx = cx + dx, nz = cz + dz; if (nx >= 0 && nz >= 0 && nx < W && nz < H && d[nz][nx] >= 3 && lab[nz][nx] < 0) { lab[nz][nx] = id; st.push([nx, nz]); } } }
    rooms.push({ id, cells });
  }
  const own = Array.from({ length: H }, () => Array(W).fill(-1)); let frontier = [];
  for (const r of rooms) for (const [x, z] of r.cells) { own[z][x] = r.id; frontier.push([x, z]); }
  for (let step = 0; step < 3; step++) { const next = []; for (const [x, z] of frontier) for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) { const nx = x + dx, nz = z + dz; if (open(nx, nz) && own[nz][nx] < 0) { own[nz][nx] = own[z][x]; next.push([nx, nz]); } } frontier = next; }
  const cellsBy = rooms.map(() => []); for (let z = 0; z < H; z++) for (let x = 0; x < W; x++) if (own[z][x] >= 0) cellsBy[own[z][x]].push([x, z]);
  return rooms.map((r, i) => ({ id: r.id, cells: cellsBy[i], area: cellsBy[i].length }));
}

/** the skins and accents of every room of one map source: [{ id, area, walls, floors, accents, at: [cx, cz] (the centre), fails: ['walls' | 'floors' | 'accent'] }] */
export function materialsOf(src, minimum = minArea) {
  const map = parseMap(src), rooms = roomsOf(map), accentCells = new Set();
  for (const e of src.entities ?? []) if (e.type === 'prop' && Array.isArray(e.at)) accentCells.add(Math.floor(e.at[0]) + ',' + Math.floor(e.at[1]));
  for (const s of src.scenery ?? []) if (Array.isArray(s.at)) accentCells.add(Math.floor(s.at[0]) + ',' + Math.floor(s.at[1]));
  const out = [];
  for (const r of rooms) {
    if (r.area < minimum) continue; const walls = new Set(), floors = new Set(); let accents = 0, sx = 0, sz = 0;
    for (const [x, z] of r.cells) {
      sx += x; sz += z; if (map.kind(x, z) !== 'door') floors.add(map.tile(x, z));
      for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (map.kind(x + dx, z + dz) === 'wall') walls.add(map.tile(x + dx, z + dz));
      if (accentCells.has(x + ',' + z)) accents++;
    }
    const fails = []; if (walls.size < 2) fails.push('walls'); if (floors.size < 2) fails.push('floors'); if (accents < 1) fails.push('accent');
    out.push({ id: r.id, area: r.area, walls: [...walls].sort().join(''), wallSkins: walls.size, floors: [...floors].sort().join(''), floorSkins: floors.size, accents, at: [Math.round(sx / r.area), Math.round(sz / r.area)], fails });
  }
  return out;
}

if (process.argv[1]?.endsWith('materials-lint.mjs')) {
  const files = fs.readdirSync(path.join(ROOT, dir)).filter((f) => f.endsWith('.json')).map((f) => f.slice(0, -5)).filter((id) => !ids.length || ids.includes(id)).sort(), rows = [], worst = [];
  for (const id of files) {
    const rooms = materialsOf(JSON.parse(fs.readFileSync(path.join(ROOT, dir, id + '.json'), 'utf8'))), n = rooms.length, f = (k) => rooms.filter((r) => r.fails.includes(k)).length;
    rows.push({ id, rooms: n, oneWall: f('walls'), oneFloor: f('floors'), noAccent: f('accent'), clean: rooms.filter((r) => !r.fails.length).length, area: rooms.reduce((s, r) => s + r.area, 0) });
    for (const r of rooms) if (r.fails.length) worst.push({ ...r, map: id, score: r.fails.length * 1000 + r.area });
  }
  if (args.includes('--json')) console.log(JSON.stringify({ rows, worst: worst.sort((a, b) => b.score - a.score).slice(0, 80) }, null, 1));
  else {
    console.log('map        rooms  1-wall  1-floor  no-accent  clean   (rooms of at least ' + minArea + ' cells; a skin is a tile character)');
    for (const r of rows) console.log(`${r.id.padEnd(10)} ${String(r.rooms).padStart(5)} ${String(r.oneWall).padStart(7)} ${String(r.oneFloor).padStart(8)} ${String(r.noAccent).padStart(10)} ${String(r.clean).padStart(6)}`);
    const sum = (k) => rows.reduce((s, r) => s + r[k], 0); console.log(`TOTAL      ${String(sum('rooms')).padStart(5)} ${String(sum('oneWall')).padStart(7)} ${String(sum('oneFloor')).padStart(8)} ${String(sum('noAccent')).padStart(10)} ${String(sum('clean')).padStart(6)}`);
    console.log('\nthe worst rooms (most rules broken, then the largest):'); for (const w of worst.sort((a, b) => b.score - a.score).slice(0, worstN)) console.log(`  ${w.map} room at cell ${w.at.join(',')} (${w.area} cells): walls "${w.walls}" floors "${w.floors}" accents ${w.accents}: ${w.fails.join(', ')}`);
  }
}
