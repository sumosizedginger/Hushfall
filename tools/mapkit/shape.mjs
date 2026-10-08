// Shaping kit (PT-021, "rooms that are not boxes"): operations on a `Level` that give a plain rectangle of a room a shape (bays and apses broken into its walls, cut corners, pilasters, a stepped end), SAFE BY CONSTRUCTION:
//   - a bay is cut only out of solid wall, never closer than one cell to the map's edge, and never so deep that it touches another room, a door, a closet panel or a secret (every neighbour of every carved cell, the mouth apart, must be wall);
//   - a corner or a pilaster is built only on open floor cells with no object in or beside them, no door, no panel and no change of height, never in a cell that a route walks, and never where a sight line from the route to a creature crosses (a wall there changes who sees whom: it wakes a sleeper, it aims a shot);
//   - an operation that cannot be done safely is SKIPPED and written to `report.skipped` (nothing is half done), so a map's source can ask for more than it will get and still be correct.
// Floor, height and ceiling of a bay are those of the room cell it opens from (no water, no residue: a bay is dry). Only the geometry layer changes: the objects, the routes and the sim do not move (`tools/dev/route-fingerprint.mjs` proves it).
//   const S = new Shape(L, { lane, keep, foes });  lane: optional Set of 'x,z' the TRAFFIC of the routes, the player's and every creature's (tools/dev/lane-of.mjs), kept clear of anything solid; foes: [[x, z]] creatures a trigger spawns; keep: [[x, z], ...] wall cells that must stay wall (the wall a switch is set in)
//   S.bay(x, z, 'n', { w: 3, d: 1, heart: true })   a bay out of the wall at (x, z) (the first wall cell beyond the room) towards 'n' (z - 1), 's', 'e' or 'w'; heart: one more cell, one wide, behind the middle; round: the two outer corners of a deep bay stay wall
//   S.bays(side, along, from, to, { w, gap, d, heart, skip })   bays spaced along a wall: `along` is the wall cell row (side n/s) or column (side e/w), from/to the range of the other axis
//   S.chamfer(rect, 'nw ne sw se', n = 2, skin)     cut the corners of the room rect [x0, z0, x1, z1] (n = 1: one cell; n = 2: a three-cell diagonal; n = 3: six)
//   S.nibs(side, along, from, to, every, { skin, start })  pilasters: one wall cell jutting from the wall into the room every `every` cells
//   S.report                                         { bays, corners, nibs, skipped: [reasons] }
import fs from 'node:fs';
import path from 'node:path';
import { FLOOR_SKINS, WALL_SKINS } from '../../src/engine/defs.js';

const DIR = { n: [0, -1], s: [0, 1], e: [1, 0], w: [-1, 0] };
const isFloor = (c) => c in FLOOR_SKINS, isWall = (c) => c in WALL_SKINS;

export class Shape {
  constructor(L, { lane = null, margin = 1, keep = [], foes = [], foeSymbols = 'tgbxwKGYZ' } = {}) { this.L = L; this.lane = lane; this.margin = margin; this.foeCells = foes; this.foeSymbols = foeSymbols; this.keep = new Set(keep.map(([x, z]) => x + ',' + z)); this.report = { bays: 0, corners: 0, nibs: 0, skipped: [] }; this.bayLog = []; this.ops = 0; this.maxOps = process.env.SHAPE_MAX ? Number(process.env.SHAPE_MAX) : Infinity; }
  /** SHAPE_MAX=<n> applies only the first n operations (a bisect aid: which one moved a route?) */
  #go(what) { if (this.ops >= this.maxOps) { this.#skip(what, 'beyond SHAPE_MAX'); return false; } this.ops++; if (process.env.SHAPE_TRACE) console.log('shape op', this.ops, what); return true; }
  #g(x, z) { return this.L.get(x, z); }
  #inside(x, z) { return x >= this.margin && z >= this.margin && x < this.L.w - this.margin && z < this.L.h - this.margin; }
  #skip(what, why) { this.report.skipped.push(`${what}: ${why}`); return false; }
  #obj(x, z) { return (this.L.ob[z]?.[x] ?? '.') !== '.'; }
  /** an object in the cell or in any of its eight neighbours: a pickup, a prop or a creature needs room to be reached (a wall beside it changes how the bot, and a player, can come at it) */
  #objNear(x, z) { for (let oz = -1; oz <= 1; oz++) for (let ox = -1; ox <= 1; ox++) if (this.#obj(x + ox, z + oz)) return true; return false; }
  /** the cells that lie on a clear sight line between two cells of the traffic (every cell the player or a creature stood in while the routes were played, plus the objects layer's creatures and `foes`): a wall built there
   *  changes who sees whom, which wakes sleepers and aims shots. Rays are thick (three parallel lines a third of a cell apart), the way a creature's eye and a player's radius are. Worked out once, from the room as it is when the
   *  first corner is asked for. */
  #inSight(x, z) {
    if (!this.sight) {
      this.sight = new Set(); const pts = new Map(), add = (px, pz) => pts.set(px + ',' + pz, [px, pz]);
      for (const [fx, fz] of this.foeCells) add(fx, fz);
      for (let zz = 0; zz < this.L.h; zz++) for (let xx = 0; xx < this.L.w; xx++) if (this.foeSymbols.includes(this.L.ob[zz][xx])) add(xx, zz);
      if (this.lane) for (const k of this.lane) { const [lx, lz] = k.split(',').map(Number); add(lx, lz); }
      const P = [...pts.values()];
      for (let i = 0; i < P.length; i++) for (let j = i + 1; j < P.length; j++) {
        const ax = P[i][0] + 0.5, az = P[i][1] + 0.5, bx = P[j][0] + 0.5, bz = P[j][1] + 0.5, len = Math.hypot(bx - ax, bz - az); if (len > 28) continue;
        const nx = -(bz - az) / (len || 1), nz = (bx - ax) / (len || 1), n = Math.ceil(len * 4);
        for (const off of [-0.33, 0, 0.33]) {
          const cells = []; let clear = true;
          for (let k = 0; k <= n; k++) { const cx = Math.floor(ax + (bx - ax) * k / n + nx * off), cz = Math.floor(az + (bz - az) * k / n + nz * off); if (isWall(this.#g(cx, cz) ?? '#')) { clear = false; break; } cells.push(cx + ',' + cz); }
          if (clear) for (const c of cells) this.sight.add(c);
        }
      }
    }
    return this.sight.has(x + ',' + z);
  }
  #lane(x, z, pad = 0) { if (!this.lane) return false; for (let dz = -pad; dz <= pad; dz++) for (let dx = -pad; dx <= pad; dx++) if (this.lane.has((x + dx) + ',' + (z + dz))) return true; return false; }

  /** a bay at the wall cell (x, z), opening towards the room that lies on the opposite side of `dir` (dir = the way the bay digs: 'n' digs towards -z, so the room is to its south) */
  bay(x, z, dir, { w = 3, d = 1, heart = false, round = false, skin = null, floor = null } = {}) {
    const [dx, dz] = DIR[dir], ax = Math.abs(dz), az = Math.abs(dx), tag = `bay ${dir} @${x},${z}`;     // (ax, az): the direction along the wall
    const half = (w - 1) / 2; if (!Number.isInteger(half)) return this.#skip(tag, 'w must be odd');
    const cells = [];                                                                                            // the carved cells, row i = depth i (0 = the wall cell the bay opens from)
    for (let i = 0; i < d; i++) for (let k = -half; k <= half; k++) { if (round && d >= 2 && i === d - 1 && Math.abs(k) === half) continue; cells.push([x + dx * i + ax * k, z + dz * i + az * k]); }
    if (heart) for (let k = 0; k < 1; k++) cells.push([x + dx * d, z + dz * d]);
    const set = new Set(cells.map(([a, b]) => a + ',' + b));
    for (const [cx, cz] of cells) { if (!this.#inside(cx, cz)) return this.#skip(tag, 'too close to the edge'); if (!isWall(this.#g(cx, cz))) return this.#skip(tag, `cell ${cx},${cz} is not solid wall (${this.#g(cx, cz)})`); if (this.keep.has(cx + ',' + cz)) return this.#skip(tag, `the wall at ${cx},${cz} carries a switch`); }
    const room = [];                                                                                            // the room cells the mouth opens on: one step back from the depth-0 row
    for (let k = -half; k <= half; k++) room.push([x - dx + ax * k, z - dz + az * k]);
    for (const [rx, rz] of room) if (!isFloor(this.#g(rx, rz))) return this.#skip(tag, `the room cell ${rx},${rz} is not floor (${this.#g(rx, rz)})`);
    for (const [cx, cz] of cells) for (let oz = -1; oz <= 1; oz++) for (let ox = -1; ox <= 1; ox++) {
      const nx = cx + ox, nz = cz + oz; if (set.has(nx + ',' + nz) || (nx - x) * dx + (nz - z) * dz === -1) continue;                 // the room's own edge row is the mouth
      if (!isWall(this.#g(nx, nz))) return this.#skip(tag, `touches ${this.#g(nx, nz)} at ${nx},${nz}`);
    }
    if (!this.#go(tag)) return false;
    const src = room[half], fl = floor ?? this.#g(src[0], src[1]), sk = skin;
    for (const [cx, cz] of cells) {
      this.L.g[cz][cx] = fl; this.L.ht[cz][cx] = this.L.ht[src[1]][src[0]]; this.L.ce[cz][cx] = this.L.ce[src[1]][src[0]]; this.L.fxl[cz][cx] = '.';
    }
    if (sk) for (const [cx, cz] of cells) for (let oz = -1; oz <= 1; oz++) for (let ox = -1; ox <= 1; ox++) { const nx = cx + ox, nz = cz + oz; if (!set.has(nx + ',' + nz) && (nx - x) * dx + (nz - z) * dz !== -1 && isWall(this.#g(nx, nz))) this.L.g[nz][nx] = sk; }
    this.report.bays++; this.bayLog.push({ dir, x, z, w, d, heart, cells, deep: [x + dx * (d - 1 + (heart ? 1 : 0)), z + dz * (d - 1 + (heart ? 1 : 0))], mouth: room[half] }); return true;
  }

  /** bays along a wall, centred and evenly spaced: side 'n' = the wall is north of the room (a row, `along` = z of its first wall cell), 's' south, 'e' east, 'w' west (a column, `along` = x); from..to is the range along it. heart: true | 'alt' (every other one) */
  bays(side, along, from, to, { w = 3, gap = 2, d = 1, heart = false, round = false, skin = null, floor = null, skip = [] } = {}) {
    const vertical = side === 'e' || side === 'w', len = to - from + 1, n = Math.floor((len + gap) / (w + gap)); if (n < 1) return;
    const off = Math.floor((len - (n * w + (n - 1) * gap)) / 2);
    for (let i = 0; i < n; i++) {
      const t = from + off + i * (w + gap) + (w - 1) / 2; if (skip.includes(t)) continue;
      const x = vertical ? along : t, z = vertical ? t : along; this.bay(x, z, side, { w, d, heart: heart === 'alt' ? i % 2 === 0 : heart, round, skin, floor });
    }
  }

  /** a whole room: bays on the named sides (inset from the corners) and its corners cut. rect = the room's floor [x0, z0, x1, z1]; sides = { n: {w, gap, d, heart...}, s: ..., e: ..., w: ... } */
  hall(rect, { sides = {}, corners = 'nw ne sw se', cut = 2, inset = 2, skin = null } = {}) {
    const [x0, z0, x1, z1] = rect;
    for (const [side, o] of Object.entries(sides)) {
      const along = side === 'n' ? z0 - 1 : side === 's' ? z1 + 1 : side === 'w' ? x0 - 1 : x1 + 1, horizontal = side === 'n' || side === 's';
      this.bays(side, along, horizontal ? x0 + inset : z0 + inset, horizontal ? x1 - inset : z1 - inset, o);
    }
    if (corners && cut) this.chamfer(rect, corners, cut, skin);
  }

  /** dressing: props set down in cells that are open floor with nothing on them and not on the lane; `dressing()` is the entity list to append to the map's entities (after every other entity, so no id shifts) */
  dress(kind, cells, { tint = null } = {}) {
    this.props ??= [];
    for (const [x, z] of cells) {
      if (!isFloor(this.#g(x, z)) || this.#obj(x, z) || this.#lane(x, z, 1) || this.props.some((p) => p.at[0] === x && p.at[1] === z)) { this.#skip(`dress ${kind} @${x},${z}`, 'not free floor'); continue; }
      if (!this.#go(`dress ${kind} @${x},${z}`)) continue;
      this.props.push({ type: 'prop', kind, at: [x, z], ...(tint ? { tint } : {}) });
    }
  }
  /** a prop in the heart (the deepest middle cell) of every bay cut since `from` (index into bayLog; S.bayLog.length before a batch of bays marks it) */
  dressBays(kind, from = 0, { tint = null, at = 'deep' } = {}) { this.dress(kind, this.bayLog.slice(from).map((b) => (at === 'mouth' ? b.mouth : b.deep)), { tint }); }
  dressing() { return this.props ?? []; }

  /** cut the corners of a room rectangle; a corner that cannot be cut at size n is tried at n - 1, down to one cell */
  chamfer(rect, corners = 'nw ne sw se', n = 2, skin = null) {
    const [x0, z0, x1, z1] = rect, want = corners.split(/\s+/).filter(Boolean);
    for (const c of want) {
      const sx = c.includes('w') ? 1 : -1, sz = c.includes('n') ? 1 : -1, ox = sx === 1 ? x0 : x1, oz = sz === 1 ? z0 : z1, tag = `corner ${c} of ${rect}`; let done = false, why = '';
      for (let k = n; k >= 1 && !done; k--) {
        const cells = []; for (let j = 0; j < k; j++) for (let i = 0; i < k - j; i++) cells.push([ox + sx * i, oz + sz * j]);
        why = ''; for (const [cx, cz] of cells) { const g = this.#g(cx, cz); if (!isFloor(g)) why = `${cx},${cz} is ${g}`; else if (this.#objNear(cx, cz)) why = `an object at or beside ${cx},${cz}`; else if (this.#lane(cx, cz, 1)) why = `a creature or the player walks beside ${cx},${cz}`; else if (this.#inSight(cx, cz)) why = `a sight line from the route to a creature crosses ${cx},${cz}`; else if (this.L.ht[cz][cx] !== this.L.ht[oz][ox]) why = 'a change of height'; if (why) break; }
        if (why) continue;
        let sk = skin; if (!sk) for (const [dx, dz] of [[sx, 0], [0, sz], [-sx, 0], [0, -sz]]) { const g = this.#g(ox - dx, oz - dz); if (isWall(g)) { sk = g; break; } }
        if (!sk) { why = 'no wall skin to borrow'; continue; }
        if (!this.#go(tag)) { why = 'beyond SHAPE_MAX'; break; }
        for (const [cx, cz] of cells) { this.L.g[cz][cx] = sk; this.L.fxl[cz][cx] = '.'; } this.report.corners++; done = true;
      }
      if (!done) this.#skip(tag, why);
    }
  }

  /** pilasters along a wall: a wall cell jutting into the room every `every` cells, where there is nothing in or beside the way */
  nibs(side, along, from, to, every = 6, { skin = null, start = 0 } = {}) {
    const [dx, dz] = DIR[side], vertical = side === 'e' || side === 'w';
    for (let t = from + start; t <= to; t += every) {
      const wx = vertical ? along : t, wz = vertical ? t : along, rx = wx - dx, rz = wz - dz, tag = `nib ${side} @${rx},${rz}`;
      if (!isWall(this.#g(wx, wz)) || !isFloor(this.#g(rx, rz))) { this.#skip(tag, 'no wall behind or no floor in front'); continue; }
      let bad = false; for (let oz = -1; oz <= 1 && !bad; oz++) for (let ox = -1; ox <= 1; ox++) { const nx = rx + ox, nz = rz + oz; if (this.#obj(nx, nz)) { bad = true; break; } const g = this.#g(nx, nz); if (!isFloor(g) && !isWall(g)) { bad = true; break; } }
      if (bad || this.#lane(rx, rz, 1)) { this.#skip(tag, 'an object, a door or the route is beside it'); continue; }
      if (!this.#go(tag)) continue;
      const sk = skin ?? this.#g(wx, wz); this.L.g[rz][rx] = sk; this.L.fxl[rz][rx] = '.'; this.report.nibs++;
    }
  }

  summary() { return `${this.report.bays} bays, ${this.report.corners} corners cut, ${this.report.nibs} pilasters` + (this.report.skipped.length ? `; skipped ${this.report.skipped.length}` : ''); }
}


/** the cells the canonical routes of a map walk (maps-src/lanes/<ID>.json, from tools/dev/lane-of.mjs), or null when there is no file */
export function laneOf(id) {
  const f = path.resolve(import.meta.dirname, '../../maps-src/lanes', id + '.json');
  return fs.existsSync(f) ? new Set(JSON.parse(fs.readFileSync(f, 'utf8'))) : null;
}
