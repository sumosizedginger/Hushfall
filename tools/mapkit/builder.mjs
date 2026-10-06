// Level builder: draw rooms, halls, stairs and doors with calls instead of typing every cell, then read the layers back as ASCII for the compiler.
// All coordinates are cell coordinates (x = column, z = row), rectangles are inclusive [x0,z0,x1,z1]. Later calls overwrite earlier ones.
import { FLOOR_SKINS } from '../../src/engine/defs.js';
const FLOOR_CHARS = Object.keys(FLOOR_SKINS).join('');                      // every floor skin the engine knows: a new skin needs no edit here
const hchar = (n) => (n <= 0 ? '.' : n < 10 ? String(n) : String.fromCharCode(87 + n));

export class Level {
  constructor(w, h, { fill = '#' } = {}) {
    this.w = w; this.h = h; this.g = Array.from({ length: h }, () => Array(w).fill(fill));
    this.ht = Array.from({ length: h }, () => Array(w).fill(0)); this.ce = Array.from({ length: h }, () => Array(w).fill('.')); this.fxl = Array.from({ length: h }, () => Array(w).fill('.'));
    this.ob = Array.from({ length: h }, () => Array(w).fill('.')); this.doorKeys = {}; this.remoteDoors = []; this.overwrites = []; this.usedHeights = false; this.usedCeil = false; this.usedFx = false;
  }
  #in(x, z) { return x >= 0 && z >= 0 && x < this.w && z < this.h; }
  #each(r, f) { for (let z = r[1]; z <= r[3]; z++) for (let x = r[0]; x <= r[2]; x++) if (this.#in(x, z)) f(x, z); }
  /** set the geometry char over a rectangle */
  rect(r, c) { this.#each(r, (x, z) => { this.g[z][x] = c; }); return this; }
  /** carve a room: `floor` inside the rectangle, and every solid cell touching it (the ring) takes the `wall` skin. Optional floor height (0.5 m units). */
  room(r, { floor = '.', wall = '#', height = null } = {}) {
    this.#each([r[0] - 1, r[1] - 1, r[2] + 1, r[3] + 1], (x, z) => { const inside = x >= r[0] && x <= r[2] && z >= r[1] && z <= r[3]; if (inside) this.g[z][x] = floor; else if (!this.#floorLike(this.g[z][x]) && this.g[z][x] !== 'D' && this.g[z][x] !== 'X' && this.g[z][x] !== 'S' && this.g[z][x] !== '~') this.g[z][x] = wall; });
    if (height != null) this.height(r, height); return this;
  }
  #floorLike(c) { return FLOOR_CHARS.includes(c); }
  /** put a wall skin on a rectangle (solid blocks: pillars, counters, partitions) */
  wall(r, c = '#') { return this.rect(r, c); }
  /** floor height (0.5 m units) over a rectangle */
  height(r, n) { this.usedHeights = true; this.#each(r, (x, z) => { this.ht[z][x] = n; }); return this; }
  /** a ramp/stair: heights step from `from` to `to` (0.5 m units) along an axis across the rectangle, one unit per cell (or per `per` cells) */
  stairs(r, axis, from, to, per = 1) {
    this.usedHeights = true; const len = axis === 'x' ? r[2] - r[0] + 1 : r[3] - r[1] + 1, dir = to >= from ? 1 : -1;
    this.#each(r, (x, z) => { const i = axis === 'x' ? x - r[0] : z - r[1]; this.ht[z][x] = from + dir * Math.min(Math.abs(to - from), Math.floor(i / per)); });
    return this;
  }
  /** absolute ceiling (metres) over a rectangle (interior cells); '.' elsewhere = floor + the map's ceilingHeight */
  ceiling(r, metres) { this.usedCeil = true; const c = hchar(Math.round(metres / 0.5)); this.#each(r, (x, z) => { this.ce[z][x] = c; }); return this; }
  /** a floor effect over a rectangle: 'w' wading water, 'x' toxic residue, '.' clears */
  fx(r, c) { this.usedFx = true; this.#each(r, (x, z) => { this.fxl[z][x] = c; }); return this; }
  door(x, z, { key = null, remote = false } = {}) { this.g[z][x] = 'D'; if (key) this.doorKeys[x + ',' + z] = key; if (remote) this.remoteDoors.push(x + ',' + z); return this; }
  closet(x, z) { this.g[z][x] = 'X'; return this; }
  secretPanel(x, z) { this.g[z][x] = 'S'; return this; }
  /** place object symbols: put(x,z,'t') or putAll('t', [[x,z],...]) */
  put(x, z, c) { if (this.#in(x, z)) { const prev = this.ob[z][x]; if (prev !== '.' && prev !== c) this.overwrites.push(`${x},${z}: '${prev}' replaced by '${c}'`); this.ob[z][x] = c; } return this; }       // one character per cell: a later put silently replaces an earlier one, so it is recorded
  putAll(c, pts) { for (const [x, z] of pts) this.put(x, z, c); return this; }
  /** scatter a symbol along a line of cells (inclusive), every `step` cells */
  line(c, [x0, z0], [x1, z1], step = 1) { const n = Math.max(Math.abs(x1 - x0), Math.abs(z1 - z0)); for (let i = 0; i <= n; i += step) this.put(Math.round(x0 + (x1 - x0) * i / Math.max(1, n)), Math.round(z0 + (z1 - z0) * i / Math.max(1, n)), c); return this; }
  get(x, z) { return this.g[z]?.[x]; }
  layers() {
    // doors, closet panels and secret panels sit on level ground: take the height of the first floor cell beside them
    for (let z = 0; z < this.h; z++) for (let x = 0; x < this.w; x++) if ('DXS'.includes(this.g[z][x])) for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (this.#floorLike(this.g[z + dz]?.[x + dx] ?? '#')) { this.ht[z][x] = this.ht[z + dz][x + dx]; break; }
    const rows = (a, f = (v) => v) => a.map((r) => r.map(f).join(''));
    return { geometry: rows(this.g), heights: this.usedHeights ? rows(this.ht, hchar) : undefined, ceilings: this.usedCeil ? rows(this.ce) : undefined, fx: this.usedFx ? rows(this.fxl) : undefined, objects: rows(this.ob), doorKeys: this.doorKeys, remoteDoors: this.remoteDoors, placementWarnings: this.overwrites };
  }
}
export { hchar };
