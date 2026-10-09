// Cells a player can WALK or FALL into from which no exit can be reached any more (PT-024: the Pump Cathedral's east side, a one-cell trench and six bays at floor level behind the 4 m catwalk: step off the back of the
// catwalk and there was no way up). Pure: a parsed map in, plain data out. The rules are the sim's (terrain.js): an actor steps UP at most STEP metres and drops any distance, walls and deep water block, and a door, a panel
// and a moving floor are optimistic exactly as reach.js is (a lever, a key or a lift can be worked, so a sector counts at either of its heights). A trap is a cell of the set reachable from the spawn that is NOT in the set of
// cells that reach an exit. Used by `tools/dev/trap-cells.mjs`, by the map lint (and so by verify-map) and by tests/traps.test.js.
import { STEP, PROPS } from './defs.js';

/** `props`: 'static' also treats the cell of every static prop that blocks its cell (a crate, a stall, a pillar) as a wall; 'all' adds the movable props (a player without the tuning-fork cannot move them) */
export function findTraps(map, { props = null } = {}) {
  const W = map.w, H = map.h, key = (x, z) => z * W + x;
  const sectorH = new Map(); for (const s of map.sectors) for (const [x, z] of s.cells) sectorH.set(key(x, z), [s.low ?? 0, s.high ?? 0]);
  const heights = (x, z) => sectorH.get(key(x, z)) ?? [map.floor(x, z)];
  const blocked = new Set();
  if (props) for (const e of map.entities) if (e.type === 'prop' && ((!e.movable && PROPS[e.kind]?.blocksCell) || (props === 'all' && e.movable))) blocked.add(key(Math.floor(e.at[0]), Math.floor(e.at[1])));
  const passable = (x, z) => { if (x < 0 || z < 0 || x >= W || z >= H || blocked.has(key(x, z))) return false; const k = map.kind(x, z); return k === 'floor' || k === 'outdoor' || k === 'door' || k === 'secret'; };
  const canStep = (ax, az, bx, bz) => { for (const ha of heights(ax, az)) for (const hb of heights(bx, bz)) if (hb - ha <= STEP + 1e-6) return true; return false; };
  const out = new Map(), inn = new Map();                                                       // directed edges: a cell -> the cells it can move to
  const add = (a, b) => { (out.get(a) ?? out.set(a, []).get(a)).push(b); (inn.get(b) ?? inn.set(b, []).get(b)).push(a); };
  for (let z = 0; z < H; z++) for (let x = 0; x < W; x++) {
    if (!passable(x, z)) continue;
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
      const nx = x + dx, nz = z + dz; if (!passable(nx, nz) || !canStep(x, z, nx, nz)) continue;
      if (dx && dz && (!passable(x + dx, z) || !passable(x, z + dz))) continue;                       // a diagonal needs both of its neighbours: the body is wider than a corner
      add(key(x, z), key(nx, nz));
    }
  }
  const bfs = (starts, edges) => { const seen = new Set(starts), q = [...starts]; while (q.length) { const c = q.pop(); for (const n of edges.get(c) ?? []) if (!seen.has(n)) { seen.add(n); q.push(n); } } return seen; };
  const start = key(Math.floor(map.spawn.x / map.cell), Math.floor(map.spawn.z / map.cell)), reach = bfs([start], out);
  const toExit = bfs(map.exits.map((e) => key(Math.floor(e.at[0]), Math.floor(e.at[1]))), inn);
  const trapped = [...reach].filter((c) => !toExit.has(c)), left = new Set(trapped), groups = [];
  for (const c of trapped) {                                                                       // connected pockets, for a readable report
    if (!left.has(c)) continue; const cells = [], q = [c]; left.delete(c);
    while (q.length) { const a = q.pop(); cells.push(a); const ax = a % W, az = (a - ax) / W; for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const b = key(ax + dx, az + dz); if (left.has(b)) { left.delete(b); q.push(b); } } }
    const xs = cells.map((a) => a % W), zs = cells.map((a) => Math.floor(a / W));
    const rim = []; for (const a of cells) for (const f of inn.get(a) ?? []) if (toExit.has(f)) rim.push(f);          // where a player comes in from: a ledge he can still return from
    groups.push({ cells: cells.length, x: [Math.min(...xs), Math.max(...xs)], z: [Math.min(...zs), Math.max(...zs)], floor: map.floor(xs[0], zs[0]), from: [...new Set(rim)].slice(0, 3).map((a) => `${a % W},${Math.floor(a / W)}`) });
  }
  return { traps: trapped.length, groups, reachable: reach.size, exits: map.exits.length };
}
