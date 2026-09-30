// T02: directed-reachability "trap" analysis. reach.js only checks spawn -> exit (forward). Because a player may DROP any height but only STEP up 0.6 m,
// the movement graph is directed: a cell can be reachable from spawn yet have NO route to the exit (a pit). This lists such cells per map.
// Optimistic model (same as reach.js): sector cells may be at either end of travel; doors/closets passable; keys ignored.
// Run: node review/gate-2/audit/repro/t02_trap_cells.mjs
import fs from 'node:fs';
import { loadMapFile } from '../../../../src/engine/harness.js';
import { PROPS, STEP } from '../../../../src/engine/defs.js';
for (const f of fs.readdirSync('maps').filter((f) => f.endsWith('.json'))) {
  const map = loadMapFile('maps/' + f), W = map.w, H = map.h;
  const blocked = new Set(map.props.filter((p) => PROPS[p.kind]?.blocksCell).map((p) => Math.floor(p.at[0]) + ',' + Math.floor(p.at[1])));
  const floors = (cx, cz) => { const si = map.sectorAt(cx, cz); return si >= 0 ? [map.sectors[si].low, map.sectors[si].high] : [map.floor(cx, cz)]; };
  const pass = (cx, cz) => { if (cx < 0 || cz < 0 || cx >= W || cz >= H) return false; const k = map.kind(cx, cz); return (k === 'floor' || k === 'outdoor' || k === 'door' || k === 'secret') && !blocked.has(cx + ',' + cz); };
  const can = (a, b) => { for (const fa of floors(...a)) for (const fb of floors(...b)) if (fb - fa <= STEP + 1e-6) return true; return false; };
  const N = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  const spawn = [Math.floor(map.spawn.x / map.cell), Math.floor(map.spawn.z / map.cell)];
  const fwd = new Set([spawn.join(',')]), q = [spawn];
  while (q.length) { const c = q.pop(); for (const [dx, dz] of N) { const n = [c[0] + dx, c[1] + dz]; if (!fwd.has(n.join(',')) && pass(...n) && can(c, n)) { fwd.add(n.join(',')); q.push(n); } } }
  // reverse: cells that can reach an exit cell
  const back = new Set(), rq = [];
  for (const e of map.exits) { const c = [Math.floor(e.at[0]), Math.floor(e.at[1])]; back.add(c.join(',')); rq.push(c); }
  while (rq.length) { const c = rq.pop(); for (const [dx, dz] of N) { const p = [c[0] + dx, c[1] + dz]; if (!back.has(p.join(',')) && pass(...p) && can(p, c)) { back.add(p.join(',')); rq.push(p); } } }
  const traps = [...fwd].filter((k) => !back.has(k));
  const ents = map.entities.filter((e) => e.type === 'pickup' || e.type === 'enemy');
  console.log(f.replace('.json', ''), 'reachable cells', fwd.size, 'cells with no route to an exit:', traps.length, traps.length ? JSON.stringify(traps.slice(0, 12)) : '');
}
