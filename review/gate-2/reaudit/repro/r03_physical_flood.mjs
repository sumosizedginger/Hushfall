// R03: an independent, physics-level reachability probe. Instead of the bot's 4-connected cell BFS it flood-fills the map with the SIM's OWN collision (blockedCircle: player radius,
// props, ledges via tooHigh, water, closed doors) on a 0.25 m lattice with 8-neighbour moves, starting from the spawn in the start state (sectors at their start height, keyed and
// remote doors and closets CLOSED, ordinary doors and secret panels usable = open). Keys found in the flooded region open their doors (closure, like reach.js). It reports:
//   - which exits the walker can reach without any switch/sector/trigger help (a locked exit is reported separately: it stays shut regardless)
//   - which CELLS are reached physically but not by a plain 4-connected cell BFS with the same start state and key closure (a squeeze / diagonal path the cell-based checks cannot see = a possible way round a gate); reach.js itself reports no unreachable content on any shipped map, so the comparison is made cell by cell
// Enemies are treated as absent (they can be killed). Run from repo root: node review/gate-2/reaudit/repro/r03_physical_flood.mjs [mapId ...]
import fs from 'node:fs';
import { loadMapFile } from '../../../../src/engine/harness.js';
import { createWorld, blockedCircle } from '../../../../src/engine/world.js';
import { groundAt } from '../../../../src/engine/terrain.js';
import { analyseReach } from '../../../../src/engine/reach.js';
import { PICKUPS, PLAYER, PROPS, STEP } from '../../../../src/engine/defs.js';
import { cellFloor } from '../../../../src/engine/terrain.js';

const ids = process.argv.slice(2).length ? process.argv.slice(2) : fs.readdirSync('maps').filter((f) => f.endsWith('.json')).map((f) => f.replace('.json', ''));
const STEP_M = 0.25, R = PLAYER.radius;
for (const id of ids) {
  const map = loadMapFile(`maps/${id}.json`), w = createWorld(map, { seed: 1, difficulty: 'normal' });
  for (const e of w.enemies) e.state = 'dead'; w.player.x = -500; w.player.z = -500;
  for (const d of w.doors) { const md = map.doorAt(d.cx, d.cz); if (d.secretId || (md && !md.key && !md.remote && !md.closet)) d.open = 1; }   // usable doors / panels
  const keys = new Set(); let region;
  const W = Math.ceil(map.w * map.cell / STEP_M), H = Math.ceil(map.h * map.cell / STEP_M);
  const flood = () => {
    for (const d of w.doors) { const md = map.doorAt(d.cx, d.cz); if (md?.key && keys.has(md.key)) d.open = 1; }
    const seen = new Uint8Array(W * H), sx = Math.floor(map.spawn.x / STEP_M), sz = Math.floor(map.spawn.z / STEP_M), q = [sx + sz * W]; seen[sx + sz * W] = 1;
    while (q.length) {
      const c = q.pop(), ix = c % W, iz = (c - ix) / W, x = (ix + 0.5) * STEP_M, z = (iz + 0.5) * STEP_M, self = { y: groundAt(w, x, z, R) };
      for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
        const nx = ix + dx, nz = iz + dz; if (nx < 0 || nz < 0 || nx >= W || nz >= H || seen[nx + nz * W]) continue;
        if (blockedCircle(w, (nx + 0.5) * STEP_M, (nz + 0.5) * STEP_M, R, self)) continue;
        seen[nx + nz * W] = 1; q.push(nx + nz * W);
      }
    }
    return seen;
  };
  let changed = true;
  while (changed) {
    changed = false; region = flood();
    for (const e of map.entities) if (e.type === 'pickup' && PICKUPS[e.kind].key && !keys.has(PICKUPS[e.kind].key) && region[Math.floor(e.z / STEP_M) * W + Math.floor(e.x / STEP_M)]) { keys.add(PICKUPS[e.kind].key); changed = true; }
  }
  const reachedPt = (x, z, rad) => { for (let dz = -rad; dz <= rad; dz += STEP_M) for (let dx = -rad; dx <= rad; dx += STEP_M) if (Math.hypot(dx, dz) <= rad && region[Math.floor((z + dz) / STEP_M) * W + Math.floor((x + dx) / STEP_M)]) return true; return false; };
  // plain cell BFS, same start state, keys found by the same closure
  const blockedProp = new Set(map.props.filter((p) => PROPS[p.kind]?.blocksCell).map((p) => Math.floor(p.at[0]) + ',' + Math.floor(p.at[1])));
  const cellOpen = (cx, cz) => { const k = map.kind(cx, cz); if (blockedProp.has(cx + ',' + cz)) return false; if (k === 'floor' || k === 'outdoor') return true; if (k === 'secret') { const d = w.doors.find((q) => q.cx === cx && q.cz === cz); return !!d && (d.open >= 1 || (d.secretId != null)); } if (k === 'door') { const d = w.doors.find((q) => q.cx === cx && q.cz === cz); return !!d && d.open >= 1; } return false; };
  const bfs = () => { const seenC = new Set(), q = [[Math.floor(map.spawn.x / map.cell), Math.floor(map.spawn.z / map.cell)]]; seenC.add(q[0].join(',')); while (q.length) { const [cx, cz] = q.pop(); for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = cx + dx, nz = cz + dz, k = nx + ',' + nz; if (!seenC.has(k) && cellOpen(nx, nz) && cellFloor(w, nx, nz) - cellFloor(w, cx, cz) <= STEP + 1e-6) { seenC.add(k); q.push([nx, nz]); } } } return seenC; };
  const cellRegion = bfs();
  const physCells = new Set(); for (let iz = 0; iz < H; iz++) for (let ix = 0; ix < W; ix++) if (region[ix + iz * W]) physCells.add(Math.floor((ix + 0.5) * STEP_M / map.cell) + ',' + Math.floor((iz + 0.5) * STEP_M / map.cell));
  const propCellsOnly = [...physCells].filter((c) => !cellRegion.has(c) && blockedProp.has(c)).length;   // the player can stand in the free corner of a cell that holds a crate/table: not a way round anything
  const onlyPhys = [...physCells].filter((c) => !cellRegion.has(c) && !blockedProp.has(c) && map.kind(...c.split(',').map(Number)) !== 'wall' && map.kind(...c.split(',').map(Number)) !== 'door' && map.kind(...c.split(',').map(Number)) !== 'secret');
  const ar = analyseReach(map), reachJsUnreach = new Set(ar.unreachable.map((u) => u.type + ':' + (u.kind ?? '') + ':' + u.at.join(',')));
  const exits = map.exits.map((x) => `${x.id}${x.locked ? '(locked)' : ''}${x.dest === 'secret' ? '(secret)' : ''}=${reachedPt(x.x, x.z, 1.2) ? 'REACHED' : 'no'}`);
  const extra = map.entities.filter((e) => e.type === 'pickup' && reachJsUnreach.has('pickup:' + e.kind + ':' + e.at.join(',')) && region[Math.floor(e.z / STEP_M) * W + Math.floor(e.x / STEP_M)]).map((e) => e.kind + '@' + e.at.join(','));
  let cells = 0; for (let i = 0; i < region.length; i++) cells += region[i];
  console.log(id.padEnd(9), 'keys found physically:', [...keys].join(',') || '-', '| exits:', exits.join(' '), '| region', (cells * STEP_M * STEP_M).toFixed(0) + ' m2', '| cells reached physically but not by a cell BFS (excluding', propCellsOnly, 'cells that merely hold a blocking prop):', onlyPhys.length ? onlyPhys.length + ' e.g. ' + onlyPhys.slice(0, 8).join(' ') : 'none');
}
