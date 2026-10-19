// Enemy navigation: a breadth-first distance field over the cell grid, computed FROM the target cell outward, so every enemy that wants to
// reach that target can just walk downhill. Respects walls, closed doors, water, cell-blocking props and ledges (an actor can step UP at most
// STEP, and drop any distance). Cached on the world (non-enumerable: derived data, never saved) and refreshed when the target cell changes
// or when a door or moving floor changes state. Pure and deterministic: a function of world state only.
// PT-054 (the owner's report: Glass Steppe stutters): a field is a flood of the whole map, and the cache held four of them, so a dozen creatures that had lost sight of the player (each hunts a DIFFERENT last-seen cell) rebuilt a field on nearly every tick;
// and every cell of every flood paid for strings, a Set lookup and a door search. Now the walkability of the map is a typed grid (the static part once per map, the doors once per door state), the floor height is looked up lazily into a typed array,
// the flood runs on integers, and the cache holds MAX_FIELDS fields. The distances are exactly the ones the old code made (tests/nav-fast.test.js plays the old code against the new on every shipped map).
import { PROPS, STEP } from './defs.js';
import { cellSolid } from './world.js';
import { DOOR } from './defs.js';
import { cellFloor } from './terrain.js';

const QUANT = 0.25;   // metres: a moving floor is treated as standing at the nearest quarter metre, so a field is rebuilt a few times per metre of travel, not every tick (audit R09)
const q = (h) => Math.round(h / QUANT) * QUANT;
/** floor height as the navigation field sees it: moving floors quantised, static floors exact */
function navFloor(w, cx, cz) { const m = w.map; if (m.sectors.length) { const si = m.sectorAt(cx, cz); if (si >= 0 && w.sectors?.[si]) return m.sectors[si].cycle ? q(m.sectors[si].high) : q(w.sectors[si].h); } return cellFloor(w, cx, cz); }      // (PT-029: a timing platform counts at its high stop:

const NBX = [1, -1, 0, 0, 1, 1, -1, -1], NBZ = [0, 0, 1, -1, 1, -1, 1, -1];          // orthogonal neighbours first, then the diagonals (the order is part of the result: navWaypoint breaks ties by it)
const MAX_FIELDS = 128;                                                               // fields kept per world: one per distinct target cell (the player's, and every hunter's last-seen spot: the biggest stand has 81 creatures); a field is W x H x 4 bytes. Least recently USED goes first: a FIFO that is one short of the number of hunters rebuilds every field on every pass (PT-054, measured: 37 fps instead of 60 with 58 hunters and 48 places)
/** everything a distance field depends on besides the target: which doors are passable and where each moving floor is. A field is valid exactly while this is unchanged, so it never depends on cache history (audit A07: resume == uninterrupted). */
function navVersion(w) {
  let v = ''; for (const d of w.doors) v += d.breath || d.open >= DOOR.passableAt ? '1' : '0';
  w.sectors.forEach((s, i) => { if (!w.map.sectors[i].cycle) v += '|' + q(s.h); }); return v;
}

/** the part of walkability that never changes in a map: 0 = never (wall, water, open sky, a prop that blocks its cell), 1 = always, 2 = a door or a secret panel (decided by the doors' state) */
function baseGrid(m) {
  if (!m._navBase) {
    const W = m.w, H = m.h, base = new Uint8Array(W * H), blocked = new Set();
    for (const p of m.props) if (PROPS[p.kind]?.blocksCell) { const px = Math.floor(p.at[0]), pz = Math.floor(p.at[1]); if (px >= 0 && pz >= 0 && px < W && pz < H) blocked.add(pz * W + px); }
    for (let z = 0; z < H; z++) for (let x = 0; x < W; x++) {
      const k = m.kind(x, z); if (k === 'wall' || k === 'water' || k === 'void' || blocked.has(z * W + x)) continue;
      base[z * W + x] = k === 'door' || k === 'secret' ? 2 : 1;
    }
    Object.defineProperty(m, '_navBase', { value: base, enumerable: false });
  }
  return m._navBase;
}
/** a door or secret cell, right now: shut doors are walls; a breathing gate is a way through for the field (PT-027: a creature waits at it while it is shut) */
function doorWalkable(w, cx, cz) {
  const k = w.map.kind(cx, cz);
  return !(cellSolid(w, cx, cz) && !((k === 'door') && w.doors.find((d) => d.cx === cx && d.cz === cz)?.breath));
}
/** can an actor stand in this cell at all right now (ignores actors)? */
export function walkableCell(w, cx, cz) {
  const m = w.map;
  if (cx < 0 || cz < 0 || cx >= m.w || cz >= m.h) return false;
  const b = baseGrid(m)[cz * m.w + cx];
  return b === 1 || (b === 2 && doorWalkable(w, cx, cz));
}

function navOf(w) {
  let nav = w._nav; if (!nav) { nav = { fields: new Map(), grid: null }; Object.defineProperty(w, '_nav', { value: nav, enumerable: false, writable: true, configurable: true }); }
  return nav;
}
/** the walkability of every cell for the current door state, and a lazily filled grid of navigation floors (NaN = not looked up yet) */
function gridFor(w, ver) {
  const nav = navOf(w); if (nav.grid && nav.grid.ver === ver) return nav.grid;
  const m = w.map, W = m.w, N = W * m.h, base = baseGrid(m), ok = new Uint8Array(N);
  for (let i = 0; i < N; i++) { const b = base[i]; if (b === 1) ok[i] = 1; else if (b === 2 && doorWalkable(w, i % W, (i / W) | 0)) ok[i] = 1; }
  return (nav.grid = { ver, ok, fl: new Float64Array(N).fill(NaN) });
}

function buildField(w, tcx, tcz, grid) {
  const m = w.map, W = m.w, H = m.h, N = W * H, dist = new Int32Array(N).fill(-1), queue = new Int32Array(N), ok = grid.ok, fl = grid.fl, step = STEP + 1e-6;
  let head = 0, tail = 0; dist[tcz * W + tcx] = 0; queue[tail++] = tcz * W + tcx;
  while (head < tail) {
    const i = queue[head++], cx = i % W, cz = (i / W) | 0; let fa = fl[i]; if (fa !== fa) fa = fl[i] = navFloor(w, cx, cz);
    for (let n = 0; n < 8; n++) {
      const nx = cx + NBX[n], nz = cz + NBZ[n]; if (nx < 0 || nz < 0 || nx >= W || nz >= H) continue;
      const j = nz * W + nx; if (!ok[j] || dist[j] >= 0) continue;
      let fb = fl[j]; if (fb !== fb) fb = fl[j] = navFloor(w, nx, nz);
      if (fa - fb > step) continue;                                                       // the neighbour would have to step UP from n to here: too high
      if (n >= 4 && !(ok[cz * W + nx] && ok[nz * W + cx])) continue;                      // no cutting corners
      dist[j] = dist[i] + 1; queue[tail++] = j;
    }
  }
  return dist;
}

/** the distance field to a target cell (Int32Array, -1 = unreachable): the same array while nothing it depends on has changed */
export function distanceField(w, tcx, tcz) { return fieldFor(w, tcx, tcz); }
function fieldFor(w, tcx, tcz) {
  const nav = navOf(w), key = tcx + ',' + tcz, f = nav.fields.get(key), ver = navVersion(w);
  if (f && f.ver === ver) { nav.fields.delete(key); nav.fields.set(key, f); return f.dist; }                // a hit is the newest use
  const dist = buildField(w, tcx, tcz, gridFor(w, ver)); nav.fields.delete(key); nav.fields.set(key, { ver, dist });
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
    for (let n = 0; n < 8; n++) { const nx = ecx + NBX[n], nz = ecz + NBZ[n]; if (nx < 0 || nz < 0 || nx >= W || nz >= m.h) continue; const d = dist[nz * W + nx]; if (d >= 0 && d < bd) { bd = d; best = [nx, nz]; } }
    return best ? { x: (best[0] + 0.5) * S, z: (best[1] + 0.5) * S, dist: bd } : null;
  }
  let best = null, bd = here;
  for (let n = 0; n < 8; n++) {
    const dx = NBX[n], dz = NBZ[n], nx = ecx + dx, nz = ecz + dz; if (nx < 0 || nz < 0 || nx >= W || nz >= m.h) continue;
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
