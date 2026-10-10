// How BOXY a map is, in numbers (the owner, 2026-10-10: "remember to include what makes it not just a square box"). Read-only, deterministic, node only.
//   node tools/dev/map-shape.mjs [--dir=maps] [ID ...]       one row per map
// A ROOM is a blob of open floor that is at least five cells wide somewhere (every cell with two clear cells all round it is its heart; corridors have none), grown back out by three cells (so a bay or a chamfer cut into the wall is part of its room).
//   fill   = room area / the area of its bounding rectangle (1.00 a perfect rectangle, 0.79 an ellipse, 0.75 an L, 0.5 a plus)
//   corners= vertices of the room's outline (a plain box has 4; every door in its wall adds a few); a BOX is fill >= 0.95 AND corners <= 12
//   boxes  = the share of ALL room area in rooms that are boxes, and how many rooms that is
//   levels = the share of walkable cells NOT at the map's commonest floor height, and the number of distinct heights
//   roofs  = the number of distinct room heights (ceiling above the floor) under the roofed part: 1 is a flat lid everywhere
//   void   = open-sky cells (the Episode 4 `_` tile); they count as not walkable here
// The contract a new map is held to is in design/EPISODE4.md ("THE SHAPE CONTRACT"); this tool only measures.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseMap } from '../../src/engine/mapformat.js';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

export function mapShape(src) {
  const map = parseMap(src), W = map.w, H = map.h;
  const open = (x, z) => { if (x < 0 || z < 0 || x >= W || z >= H) return false; const k = map.kind(x, z); return k === 'outdoor' || k === 'floor' || k === 'door'; };
  // chebyshev distance to the nearest closed cell (two passes)
  const INF = 1e9, d = Array.from({ length: H }, (_, z) => Array.from({ length: W }, (_, x) => (open(x, z) ? INF : 0)));
  for (let z = 0; z < H; z++) for (let x = 0; x < W; x++) if (d[z][x]) for (const [dx, dz] of [[-1, 0], [0, -1], [-1, -1], [1, -1]]) { const q = d[z + dz]?.[x + dx]; if (q !== undefined) d[z][x] = Math.min(d[z][x], q + 1); else d[z][x] = Math.min(d[z][x], 1); }
  for (let z = H - 1; z >= 0; z--) for (let x = W - 1; x >= 0; x--) if (d[z][x]) for (const [dx, dz] of [[1, 0], [0, 1], [1, 1], [-1, 1]]) { const q = d[z + dz]?.[x + dx]; if (q !== undefined) d[z][x] = Math.min(d[z][x], q + 1); else d[z][x] = Math.min(d[z][x], 1); }
  // hearts: distance >= 3 (two clear cells all round); components of hearts (8-connected)
  const lab = Array.from({ length: H }, () => Array(W).fill(-1)); let n = 0; const rooms = [];
  for (let z = 0; z < H; z++) for (let x = 0; x < W; x++) if (d[z][x] >= 3 && lab[z][x] < 0) {
    const id = n++, st = [[x, z]]; lab[z][x] = id; const cells = [];
    while (st.length) { const [cx, cz] = st.pop(); cells.push([cx, cz]); for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) { const nx = cx + dx, nz = cz + dz; if (nx >= 0 && nz >= 0 && nx < W && nz < H && d[nz][nx] >= 3 && lab[nz][nx] < 0) { lab[nz][nx] = id; st.push([nx, nz]); } } }
    rooms.push({ id, cells });
  }
  // grow each heart out by two cells over open floor (first come, first served)
  const own = Array.from({ length: H }, () => Array(W).fill(-1)); let frontier = [];
  for (const r of rooms) for (const [x, z] of r.cells) { own[z][x] = r.id; frontier.push([x, z]); }
  for (let step = 0; step < 3; step++) { const next = []; for (const [x, z] of frontier) for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) { const nx = x + dx, nz = z + dz; if (open(nx, nz) && own[nz][nx] < 0) { own[nz][nx] = own[z][x]; next.push([nx, nz]); } } frontier = next; }
  const stats = rooms.map((r) => { let x0 = W, z0 = H, x1 = -1, z1 = -1, a = 0; for (let z = 0; z < H; z++) for (let x = 0; x < W; x++) if (own[z][x] === r.id) { a++; x0 = Math.min(x0, x); x1 = Math.max(x1, x); z0 = Math.min(z0, z); z1 = Math.max(z1, z); } let v = 0; for (let z = z0 - 1; z <= z1; z++) for (let x = x0 - 1; x <= x1; x++) { const q = [[x, z], [x + 1, z], [x, z + 1], [x + 1, z + 1]].map(([a, b]) => (own[b]?.[a] === r.id ? 1 : 0)), c = q[0] + q[1] + q[2] + q[3]; if (c === 1 || c === 3) v++; else if (c === 2 && q[0] === q[3]) v += 2; } return { area: a, box: (x1 - x0 + 1) * (z1 - z0 + 1), fill: a / ((x1 - x0 + 1) * (z1 - z0 + 1)), corners: v, at: [x0, z0, x1, z1] }; }).filter((r) => r.area >= 40);
  const total = stats.reduce((s, r) => s + r.area, 0) || 1, boxy = stats.filter((r) => r.fill >= 0.95 && r.corners <= 12), medCorners = stats.map((r) => r.corners).sort((p, q) => p - q)[stats.length >> 1] ?? 0;
  const heights = {}, roofs = {}; let walk = 0, voids = 0;
  for (let z = 0; z < H; z++) for (let x = 0; x < W; x++) { if (open(x, z)) { walk++; if (map.kind(x, z) !== 'outdoor') { const c = Math.round((map.ceilingAt(x, z) - map.floor(x, z)) * 100) / 100; roofs[c] = (roofs[c] ?? 0) + 1; } const h = Math.round(map.floor(x, z) * 100) / 100; heights[h] = (heights[h] ?? 0) + 1; } else if (map.tile(x, z) === '_') voids++; }
  const modal = Math.max(...Object.values(heights));
  return { id: map.id, size: `${W}x${H}`, rooms: stats.length, medCorners, meanFill: +(stats.reduce((s, r) => s + r.fill * r.area, 0) / total).toFixed(2), boxRooms: boxy.length, boxAreaPct: Math.round(100 * boxy.reduce((s, r) => s + r.area, 0) / total),
    levelsPct: Math.round(100 * (1 - modal / walk)), heights: Object.keys(heights).length, roofs: Object.keys(roofs).length, voidCells: voids };
}

if (import.meta.url === new URL(process.argv[1], 'file://').href || process.argv[1]?.endsWith('map-shape.mjs')) {
  const args = process.argv.slice(2), dirArg = args.find((a) => a.startsWith('--dir=')), dir = path.join(ROOT, dirArg ? dirArg.slice(6) : 'maps'), ids = args.filter((a) => !a.startsWith('--'));
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.json')).map((f) => f.slice(0, -5)).filter((id) => !ids.length || ids.includes(id)).sort();
  console.log('map        size     rooms corners meanFill boxRooms boxArea% levels% heights roofs void');
  for (const id of files) { const s = mapShape(JSON.parse(fs.readFileSync(path.join(dir, id + '.json'), 'utf8'))); console.log(`${s.id.padEnd(10)} ${s.size.padEnd(8)} ${String(s.rooms).padStart(5)} ${String(s.medCorners).padStart(7)} ${String(s.meanFill).padStart(8)} ${String(s.boxRooms).padStart(8)} ${String(s.boxAreaPct).padStart(8)} ${String(s.levelsPct).padStart(7)} ${String(s.heights).padStart(7)} ${String(s.roofs).padStart(5)} ${String(s.voidCells).padStart(4)}`); }
}
