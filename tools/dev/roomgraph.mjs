// THE ROOM GRAPH of a map (PT-052, R1 of the Director's Plan): the rooms (the same blobs tools/dev/map-shape.mjs calls rooms: open floor with two clear cells all round, grown back out by three cells, at least 40 cells), the corridor pieces between them,
// how they connect, how many independent LOOPS that gives (the cycle rank of the graph: edges - nodes + components), and which rooms have no JOB (nothing in them: no creature, pickup, switch, trigger or message; the start and the exit count as jobs).
// A corridor piece is a connected piece of open floor that belongs to no room; it joins every room it touches. A map that is one big room has no loops by this measure (it has plenty of ways round inside the room): the audit says so.
//   import { roomGraph } from './roomgraph.mjs';   roomGraph(parsedMap) -> { rooms: [{ id, area, at, cx, cz, jobs }], loops, pieces, emptyRooms: [id...] }
import { parseMap } from '../../src/engine/mapformat.js';
import { ENEMIES } from '../../src/engine/defs.js';

export const HOLE_MIN = 20;
export function roomGraph(map) {
  const W = map.w, H = map.h;
  const open = (x, z) => { if (x < 0 || z < 0 || x >= W || z >= H) return false; const k = map.kind(x, z); return k === 'outdoor' || k === 'floor' || k === 'door'; };
  const INF = 1e9, d = Array.from({ length: H }, (_, z) => Array.from({ length: W }, (_, x) => (open(x, z) ? INF : 0)));
  for (let z = 0; z < H; z++) for (let x = 0; x < W; x++) if (d[z][x]) for (const [dx, dz] of [[-1, 0], [0, -1], [-1, -1], [1, -1]]) { const q = d[z + dz]?.[x + dx]; d[z][x] = Math.min(d[z][x], (q === undefined ? 0 : q) + 1); }
  for (let z = H - 1; z >= 0; z--) for (let x = W - 1; x >= 0; x--) if (d[z][x]) for (const [dx, dz] of [[1, 0], [0, 1], [1, 1], [-1, 1]]) { const q = d[z + dz]?.[x + dx]; d[z][x] = Math.min(d[z][x], (q === undefined ? 0 : q) + 1); }
  const lab = Array.from({ length: H }, () => Array(W).fill(-1)); const hearts = []; let n = 0;
  for (let z = 0; z < H; z++) for (let x = 0; x < W; x++) if (d[z][x] >= 3 && lab[z][x] < 0) {
    const id = n++, st = [[x, z]]; lab[z][x] = id; const cells = [];
    while (st.length) { const [cx, cz] = st.pop(); cells.push([cx, cz]); for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) { const nx = cx + dx, nz = cz + dz; if (nx >= 0 && nz >= 0 && nx < W && nz < H && d[nz][nx] >= 3 && lab[nz][nx] < 0) { lab[nz][nx] = id; st.push([nx, nz]); } } }
    hearts.push({ id, cells });
  }
  const own = Array.from({ length: H }, () => Array(W).fill(-1)); let frontier = [];
  for (const r of hearts) for (const [x, z] of r.cells) { own[z][x] = r.id; frontier.push([x, z]); }
  for (let step = 0; step < 3; step++) { const next = []; for (const [x, z] of frontier) for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) { const nx = x + dx, nz = z + dz; if (open(nx, nz) && own[nz][nx] < 0) { own[nz][nx] = own[z][x]; next.push([nx, nz]); } } frontier = next; }
  const stat = new Map(hearts.map((r) => [r.id, { id: r.id, area: 0, x0: W, z0: H, x1: -1, z1: -1, sx: 0, sz: 0, jobs: 0 }]));
  for (let z = 0; z < H; z++) for (let x = 0; x < W; x++) { const o = own[z][x]; if (o >= 0) { const s = stat.get(o); s.area++; s.x0 = Math.min(s.x0, x); s.x1 = Math.max(s.x1, x); s.z0 = Math.min(s.z0, z); s.z1 = Math.max(s.z1, z); s.sx += x; s.sz += z; } }
  const keep = new Set([...stat.values()].filter((s) => s.area >= 40).map((s) => s.id));
  const roomAt = (cx, cz) => { const o = own[cz]?.[cx]; return o != null && o >= 0 && keep.has(o) ? o : -1; };
  // jobs: every thing a room holds
  const bump = (cx, cz) => { const o = roomAt(Math.floor(cx), Math.floor(cz)); if (o >= 0) stat.get(o).jobs++; };
  for (const e of map.entities) {
    if (!e.at) continue; const c = e.at;
    if (e.type === 'enemy') { if (!ENEMIES[e.kind]?.peaceful) bump(c[0], c[1]); } else if (e.type === 'pickup' || e.type === 'switch' || e.type === 'player' || e.type === 'exit') bump(c[0], c[1]);
  }
  for (const m of map.messages ?? []) if (m.at) bump(m.at[0], m.at[1]);
  for (const t of map.triggers ?? []) if (t.at) bump(t.at[0], t.at[1]);
  // corridor pieces: open cells that are in no kept room, connected 4-wise
  const piece = Array.from({ length: H }, () => Array(W).fill(-1)); let pieces = 0;
  const isCorr = (x, z) => open(x, z) && roomAt(x, z) < 0;
  for (let z = 0; z < H; z++) for (let x = 0; x < W; x++) if (isCorr(x, z) && piece[z][x] < 0) { const id = pieces++, st = [[x, z]]; piece[z][x] = id; while (st.length) { const [cx, cz] = st.pop(); for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = cx + dx, nz = cz + dz; if (isCorr(nx, nz) && piece[nz][nx] < 0) { piece[nz][nx] = id; st.push([nx, nz]); } } } }
  // the graph: nodes are rooms ('r<id>') and pieces ('p<id>'); edges: a piece touching a room, two rooms touching
  const nodes = new Set(), edges = new Set(); for (const id of keep) nodes.add('r' + id); for (let p = 0; p < pieces; p++) nodes.add('p' + p);
  const link = (a, b) => { if (a !== b) edges.add(a < b ? a + '|' + b : b + '|' + a); };
  for (let z = 0; z < H; z++) for (let x = 0; x < W; x++) {
    if (!open(x, z)) continue;
    const a = roomAt(x, z) >= 0 ? 'r' + roomAt(x, z) : piece[z][x] >= 0 ? 'p' + piece[z][x] : null; if (!a) continue;
    for (const [dx, dz] of [[1, 0], [0, 1]]) { const nx = x + dx, nz = z + dz; if (!open(nx, nz)) continue; const b = roomAt(nx, nz) >= 0 ? 'r' + roomAt(nx, nz) : piece[nz][nx] >= 0 ? 'p' + piece[nz][nx] : null; if (b) link(a, b); }
  }
  // a piece that touches only one room or none is a dead end, not a node worth counting; the cycle rank counts it correctly either way (a leaf adds one node and one edge)
  const parent = new Map([...nodes].map((k) => [k, k])); const find = (k) => { while (parent.get(k) !== k) { parent.set(k, parent.get(parent.get(k))); k = parent.get(k); } return k; };
  for (const e of edges) { const [a, b] = e.split('|'); parent.set(find(a), find(b)); }
  const comps = new Set([...nodes].map(find)).size, roomLoops = Math.max(0, edges.size - nodes.size + comps);
  // HOLES: blocks of solid (8-connected) that no part of touches the map's border and that cover at least HOLE_MIN cells: each is something you can walk all the way round, which is what a LOOP is for a player
  const solid = (x, z) => !open(x, z), seen = Array.from({ length: H }, () => Array(W).fill(false)), holes = [];
  for (let z = 0; z < H; z++) for (let x = 0; x < W; x++) if (solid(x, z) && !seen[z][x]) { let area = 0, edge = false; const st = [[x, z]]; seen[z][x] = true; while (st.length) { const [cx, cz] = st.pop(); area++; if (cx === 0 || cz === 0 || cx === W - 1 || cz === H - 1) edge = true; for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) { const nx = cx + dx, nz = cz + dz; if (nx >= 0 && nz >= 0 && nx < W && nz < H && solid(nx, nz) && !seen[nz][nx]) { seen[nz][nx] = true; st.push([nx, nz]); } } } if (!edge && area >= HOLE_MIN) holes.push(area); }
  const rooms = [...keep].map((id) => { const s = stat.get(id); return { id, area: s.area, at: [s.x0, s.z0, s.x1, s.z1], cx: Math.round(s.sx / s.area), cz: Math.round(s.sz / s.area), jobs: s.jobs }; });
  return { rooms, loops: holes.length, roomLoops, holes: holes.sort((a, b) => b - a), pieces, components: comps, emptyRooms: rooms.filter((r) => r.jobs === 0).map((r) => r.id) };
}
export const roomGraphOfSource = (src) => roomGraph(parseMap(src));
