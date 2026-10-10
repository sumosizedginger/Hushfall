// THE BEAM TRACER (PT-033, Episode 4 Batch B, design/EPISODE4.md E3): light that runs the cell grid. PURE: it reads a map and the turning state of its mirrors (and which doors are open) and returns what is lit; the sim keeps the state
// (`w.mirrors`, lazy: only a map with an emitter has any) and the view draws the lines. A beam is light, not a weapon: it hurts nobody and blocks nothing; it is the game's first puzzle (the Mirror Array) and the Gate Warden's sweep reuses the same mirrors.
//
//   emitter  { id, at: [x, z], dir: 'n' | 'e' | 's' | 'w' }   sends a beam out of its cell, in `dir`
//   mirror   { id, at: [x, z], rot: 0..3 }                       a ONE-SIDED mirror on a plinth; Use turns it a quarter step clockwise. rot 0 faces NW (the '/' mirror seen from the north-west), 1 NE ('\'), 2 SE ('/'), 3 SW ('\').
//                                                                  A beam that arrives on its face turns; one that arrives on its back ends there (the plinth's black).
//   receiver { id, at: [x, z] }                                  is LIT while a beam enters its cell (from any side); a trigger `when: 'lit:<id>'` fires on it
//
// A beam stops at a wall, a door or a secret panel that is shut (open < 0.85), a prop that fills its cell (a pillar, a crate: PROPS blocksCell), the edge of the grid, another emitter, a receiver, a mirror's back, or after MAX_STEPS cells
// (a loop). It passes over open air, the void and water.
import { PROPS } from './defs.js';

export const BEAM = { height: 1.35, maxSteps: 260 };
export const DIRS = { n: [0, -1], e: [1, 0], s: [0, 1], w: [-1, 0] };
/** by rotation: the direction a beam is travelling -> the direction it leaves the mirror (absent: it arrives on the back and ends) */
export const REFLECT = [{ s: 'w', e: 'n' }, { s: 'e', w: 'n' }, { n: 'e', w: 's' }, { n: 'w', e: 's' }];
export const FACING = ['NW', 'NE', 'SE', 'SW'];

/** the beams of a map: lit receivers, the polylines to draw (cell-centre coordinates, in cells), and every cell a beam crosses.
 *  rots: { [mirrorId]: 0..3 } (a mirror not listed keeps its map rotation); doorOpen(cx, cz): is the door or panel there open? (default: shut) */
export function traceBeams(map, rots = {}, doorOpen = () => false) {
  const out = { lit: [], lines: [], cells: new Set(), dead: [] };
  if (!map.emitters?.length) return out;
  const mirrorAt = new Map(map.mirrors.map((m) => [m.at.join(','), m])), recvAt = new Map(map.receivers.map((r) => [r.at.join(','), r])), emitAt = new Set(map.emitters.map((e) => e.at.join(',')));
  const solidProp = new Set(map.props.filter((p) => PROPS[p.kind]?.blocksCell && p.kind !== 'mirror' && p.kind !== 'emitter' && p.kind !== 'receiver').map((p) => Math.floor(p.at[0]) + ',' + Math.floor(p.at[1])));
  const lit = new Set();
  for (const e of map.emitters) {
    let [x, z] = e.at, dir = e.dir; const pts = [[x + 0.5, z + 0.5]], seen = new Set(); let end = null;
    for (let step = 0; step < BEAM.maxSteps; step++) {
      const [dx, dz] = DIRS[dir], nx = x + dx, nz = z + dz, key = nx + ',' + nz;
      if (nx < 0 || nz < 0 || nx >= map.w || nz >= map.h) { end = [x + 0.5 + dx * 0.5, z + 0.5 + dz * 0.5]; break; }
      const kind = map.kind(nx, nz);
      if (kind === 'wall' || ((kind === 'door' || kind === 'secret') && !doorOpen(nx, nz)) || solidProp.has(key) || emitAt.has(key)) { end = [x + 0.5 + dx * 0.5, z + 0.5 + dz * 0.5]; break; }
      out.cells.add(key);
      const m = mirrorAt.get(key);
      if (m) {
        const nd = REFLECT[(((rots[m.id] ?? m.rot) % 4) + 4) % 4][dir];
        if (!nd) { end = [nx + 0.5, nz + 0.5]; out.dead.push(m.id); break; }                                                 // the back of a mirror
        pts.push([nx + 0.5, nz + 0.5]); x = nx; z = nz; dir = nd;
        const sk = key + dir; if (seen.has(sk)) { end = null; break; } seen.add(sk);
        continue;
      }
      const r = recvAt.get(key);
      if (r) { lit.add(r.id); end = [nx + 0.5, nz + 0.5]; break; }
      x = nx; z = nz;
    }
    if (end) pts.push(end); else pts.push([x + 0.5, z + 0.5]);
    out.lines.push({ emitter: e.id, pts });
  }
  out.lit = [...lit].sort();
  return out;
}
/** the next rotation of a mirror (a quarter step clockwise) */
export const nextRot = (rot) => (rot + 1) % 4;
/** is `id` lit in this trace? */
export const isLit = (trace, id) => trace.lit.includes(id);
