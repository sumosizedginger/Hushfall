// Enemy navigation: a breadth-first distance field over the cell grid, computed FROM the target cell outward, so every enemy that wants to
// reach that target can just walk downhill. Respects walls, closed doors, water, cell-blocking props and ledges (an actor can step UP at most
// STEP, and drop any distance). Cached on the world (non-enumerable: derived data, never saved) and refreshed when the target cell changes
// or when a door or moving floor changes state. Pure and deterministic: a function of world state only.
import { PROPS, STEP } from './defs.js';
import { cellSolid } from './world.js';
import { DOOR } from './defs.js';
import { cellFloor } from './terrain.js';

const NB = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
const MAX_FIELDS = 4;
/** everything a distance field depends on besides the target: which doors are passable and where each moving floor is. A field is valid exactly while this is unchanged, so it never depends on cache history (audit A07: resume == uninterrupted). */
function navVersion(w) {
  let v = ''; for (const d of w.doors) v += d.open < DOOR.passableAt ? '0' : '1';
  for (const s of w.sectors) v += '|' + s.h; return v;
}

function blockedCells(m) {
  if (!m._navBlocked) { const s = new Set(); for (const p of m.props) if (PROPS[p.kind]?.blocksCell) s.add(Math.floor(p.at[0]) + ',' + Math.floor(p.at[1])); Object.defineProperty(m, '_navBlocked', { value: s, enumerable: false }); }
  return m._navBlocked;
}
/** can an actor stand in this cell at all right now (ignores actors)? */
export function walkableCell(w, cx, cz) {
  const m = w.map;
  if (cx < 0 || cz < 0 || cx >= m.w || cz >= m.h) return false;
  const k = m.kind(cx, cz);
  if (k === 'wall' || k === 'water') return false;
  if (cellSolid(w, cx, cz)) return false;
  return !blockedCells(m).has(cx + ',' + cz);
}

function buildField(w, tcx, tcz) {
  const m = w.map, W = m.w, dist = new Int32Array(W * m.h).fill(-1), q = new Int32Array(W * m.h);
  let head = 0, tail = 0; dist[tcz * W + tcx] = 0; q[tail++] = tcz * W + tcx;
  while (head < tail) {
    const i = q[head++], cx = i % W, cz = (i / W) | 0, fa = cellFloor(w, cx, cz);
    for (const [dx, dz] of NB) {
      const nx = cx + dx, nz = cz + dz; if (!walkableCell(w, nx, nz)) continue;
      const j = nz * W + nx; if (dist[j] >= 0) continue;
      if (fa - cellFloor(w, nx, nz) > STEP + 1e-6) continue;                                  // the neighbour would have to step UP from n to here: too high
      if (dx && dz && !(walkableCell(w, cx + dx, cz) && walkableCell(w, cx, cz + dz))) continue;   // no cutting corners
      dist[j] = dist[i] + 1; q[tail++] = j;
    }
  }
  return dist;
}

function fieldFor(w, tcx, tcz) {
  let nav = w._nav; if (!nav) { nav = { fields: new Map() }; Object.defineProperty(w, '_nav', { value: nav, enumerable: false, writable: true, configurable: true }); }
  const key = tcx + ',' + tcz, f = nav.fields.get(key), ver = navVersion(w);
  if (f && f.ver === ver) return f.dist;
  const dist = buildField(w, tcx, tcz); nav.fields.delete(key); nav.fields.set(key, { ver, dist });
  while (nav.fields.size > MAX_FIELDS) nav.fields.delete(nav.fields.keys().next().value);
  return dist;
}

/** The centre of the neighbouring cell an actor at (x,z) should walk to, to get to (tx,tz); null if there is no route (or it is already there). */
export function navWaypoint(w, x, z, tx, tz) {
  const m = w.map, S = m.cell, W = m.w, ecx = Math.floor(x / S), ecz = Math.floor(z / S), tcx = Math.floor(tx / S), tcz = Math.floor(tz / S);
  if (ecx === tcx && ecz === tcz) return { x: tx, z: tz, dist: 0 };
  const dist = fieldFor(w, tcx, tcz); let here = dist[ecz * W + ecx];
  if (here < 0) {                                                                           // standing in a cell the field could not reach (e.g. on a door edge): take the best reachable neighbour
    let best = null, bd = 1e9;
    for (const [dx, dz] of NB) { const nx = ecx + dx, nz = ecz + dz; if (nx < 0 || nz < 0 || nx >= W || nz >= m.h) continue; const d = dist[nz * W + nx]; if (d >= 0 && d < bd) { bd = d; best = [nx, nz]; } }
    return best ? { x: (best[0] + 0.5) * S, z: (best[1] + 0.5) * S, dist: bd } : null;
  }
  let best = null, bd = here;
  for (const [dx, dz] of NB) {
    const nx = ecx + dx, nz = ecz + dz; if (nx < 0 || nz < 0 || nx >= W || nz >= m.h) continue;
    const d = dist[nz * W + nx]; if (d < 0 || d >= bd) continue;
    if (dx && dz && !(walkableCell(w, ecx + dx, ecz) && walkableCell(w, ecx, ecz + dz))) continue;
    bd = d; best = [nx, nz];
  }
  return best ? { x: (best[0] + 0.5) * S, z: (best[1] + 0.5) * S, dist: bd } : null;
}
/** cells of walking distance from (x,z) to the target, or -1 if unreachable (used by the linter and tests) */
export function walkDistance(w, x, z, tx, tz) {
  const m = w.map, S = m.cell, d = fieldFor(w, Math.floor(tx / S), Math.floor(tz / S))[Math.floor(z / S) * m.w + Math.floor(x / S)];
  return d;
}
