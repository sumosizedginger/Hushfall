// Map format v1: ASCII grid for geometry + entity list for everything else. Pure data, no DOM/Three.
// validateMap() never throws; it returns every problem it can find so authors can fix a map in one pass.
import { CELL, DEFAULT_CEILING, ENEMIES, PICKUPS, PROPS, KEYS, FACING, SCENERY } from './defs.js';

export const MAP_FORMAT = 1;
// One char per cell. Several chars can share a kind: they differ only in how they are drawn (skins).
//   walls:   # bulkhead (slate)   B warm brick
//   floors:  . interior planks    : cobble (open air)    p pier planks (open air)
//   water:   ~ blocks walking, but not sight or projectiles
//   D door   S secret panel (drawn as wall until opened)
const TILES = { '#': 'wall', B: 'wall', '.': 'floor', ':': 'outdoor', p: 'outdoor', '~': 'water', D: 'door', S: 'secret' };
const WALL_CHARS = new Set(['#', 'B']), WALKABLE_CHARS = new Set(['.', ':', 'p']);

export class MapError extends Error {
  constructor(errors) { super('Invalid map: ' + errors.join('; ')); this.errors = errors; }
}

export class MapData {
  constructor(src) {
    this.id = src.id; this.version = src.version; this.name = src.name;
    this.cell = src.cellSize ?? CELL; this.ceiling = src.ceilingHeight ?? DEFAULT_CEILING;
    this.tiles = src.grid.map((r) => [...r]);
    this.h = this.tiles.length; this.w = this.tiles[0].length;
    this.doors = new Map((src.doors || []).map((d) => [d.at.join(','), { cx: d.at[0], cz: d.at[1], key: d.key ?? null }]));
    this.secrets = (src.secrets || []).map((s) => ({ id: s.id, panel: s.panel, cells: s.cells }));
    this.entities = (src.entities || []).map((e) => ({ ...e, x: (e.at[0] + 0.5) * this.cell, z: (e.at[1] + 0.5) * this.cell }));
    this.spawn = (() => { const e = this.entities.find((x) => x.type === 'player'); return { x: e.x, z: e.z, yaw: typeof e.facing === 'number' ? e.facing : FACING[e.facing ?? 'east'] }; })();
    this.exits = this.entities.filter((e) => e.type === 'exit');
    this.props = this.entities.filter((e) => e.type === 'prop');
    this.par = src.par ?? null;
    this.scenery = (src.scenery || []).map((s) => ({ ...s, x: (s.at[0] + 0.5) * this.cell, z: (s.at[1] + 0.5) * this.cell }));
    this.atmosphere = { fog: '#2a2244', fogDensity: 0.028, ...(src.atmosphere || {}) };
  }
  tile(cx, cz) { return (cx < 0 || cz < 0 || cx >= this.w || cz >= this.h) ? '#' : this.tiles[cz][cx]; }
  kind(cx, cz) { return TILES[this.tile(cx, cz)]; }
  /** solid for geometry purposes, ignoring door/secret state */
  isWall(cx, cz) { return this.kind(cx, cz) === 'wall'; }
  isOutdoor(cx, cz) { return this.kind(cx, cz) === 'outdoor'; }
  isWater(cx, cz) { return this.kind(cx, cz) === 'water'; }
  /** the raw tile char, for choosing a skin when drawing */
  skin(cx, cz) { return this.tile(cx, cz); }
  /** interior = has a ceiling */
  isInterior(x, z) { const cx = Math.floor(x / this.cell), cz = Math.floor(z / this.cell); const k = this.kind(cx, cz); return k === 'floor' || k === 'door' || k === 'secret'; }
  doorAt(cx, cz) { return this.doors.get(cx + ',' + cz) || null; }
  /** door/secret slab runs along 'x' when the wall line is east-west */
  doorAxis(cx, cz) { return this.isWall(cx - 1, cz) && this.isWall(cx + 1, cz) ? 'x' : 'z'; }
  counts() {
    return { enemies: this.entities.filter((e) => e.type === 'enemy').length, items: this.entities.filter((e) => e.type === 'pickup' && !PICKUPS[e.kind]?.key).length, secrets: this.secrets.length };
  }
}

export function validateMap(src) {
  const errors = [];
  const err = (m) => errors.push(m);
  if (!src || typeof src !== 'object') return { ok: false, errors: ['map is not an object'] };
  if (src.format !== MAP_FORMAT) err(`unsupported format ${src.format} (expected ${MAP_FORMAT})`);
  for (const f of ['id', 'name']) if (typeof src[f] !== 'string' || !src[f]) err(`missing ${f}`);
  if (!Number.isInteger(src.version) || src.version < 1) err('version must be a positive integer');
  if (!Array.isArray(src.grid) || !src.grid.length) { err('grid missing'); return { ok: false, errors }; }
  const w = src.grid[0].length, h = src.grid.length;
  src.grid.forEach((r, i) => { if (typeof r !== 'string' || r.length !== w) err(`grid row ${i} has length ${r?.length}, expected ${w}`); });
  if (errors.length) return { ok: false, errors };
  const tile = (cx, cz) => (cx < 0 || cz < 0 || cx >= w || cz >= h) ? '#' : src.grid[cz][cx];
  for (let cz = 0; cz < h; cz++) for (let cx = 0; cx < w; cx++) {
    const c = tile(cx, cz);
    if (!(c in TILES)) err(`unknown tile '${c}' at ${cx},${cz}`);
    const edge = cx === 0 || cz === 0 || cx === w - 1 || cz === h - 1;
    if (edge && !WALL_CHARS.has(c) && c !== '~') err(`map edge at ${cx},${cz} is not a wall or water (level would leak)`);
  }
  const walkable = (c) => WALKABLE_CHARS.has(c);
  const wallc = (c) => WALL_CHARS.has(c);
  // leaks: an outdoor cell may only touch walls or outdoor/floor cells (no void), already ensured by the edge check
  const doors = src.doors || [];
  const doorKeys = new Set();
  for (const d of doors) {
    if (!Array.isArray(d.at) || tile(d.at[0], d.at[1]) !== 'D') { err(`doors entry ${JSON.stringify(d.at)} is not on a 'D' tile`); continue; }
    doorKeys.add(d.at.join(','));
    if (d.key != null && !KEYS[d.key]) err(`door ${d.at} needs unknown key '${d.key}'`);
  }
  for (let cz = 0; cz < h; cz++) for (let cx = 0; cx < w; cx++) {
    const c = tile(cx, cz);
    if (c === 'D' && !doorKeys.has(cx + ',' + cz)) err(`'D' tile at ${cx},${cz} has no doors entry`);
    if (c === 'D' || c === 'S') {
      const ew = wallc(tile(cx - 1, cz)) && wallc(tile(cx + 1, cz)), ns = wallc(tile(cx, cz - 1)) && wallc(tile(cx, cz + 1));
      const passEW = walkable(tile(cx - 1, cz)) || walkable(tile(cx + 1, cz)), passNS = walkable(tile(cx, cz - 1)) || walkable(tile(cx, cz + 1));
      if (!((ew && passNS) || (ns && passEW))) err(`door/secret at ${cx},${cz} is not set in a straight wall line`);
    }
  }
  const secretCells = new Set();
  for (const s of src.secrets || []) {
    if (!s.id) err('secret without id');
    if (!s.panel || tile(...s.panel) !== 'S') err(`secret '${s.id}' panel must be on an 'S' tile`);
    if (!Array.isArray(s.cells) || !s.cells.length) err(`secret '${s.id}' has no cells`);
    for (const c of s.cells || []) { if (!walkable(tile(c[0], c[1]))) err(`secret '${s.id}' cell ${c} is not walkable`); secretCells.add(c.join(',')); }
  }
  for (let cz = 0; cz < h; cz++) for (let cx = 0; cx < w; cx++) if (tile(cx, cz) === 'S' && !(src.secrets || []).some((s) => s.panel[0] === cx && s.panel[1] === cz)) err(`'S' tile at ${cx},${cz} is not the panel of any secret`);
  const ents = src.entities || [];
  const players = ents.filter((e) => e.type === 'player');
  if (players.length !== 1) err(`expected exactly 1 player entity, found ${players.length}`);
  if (!ents.some((e) => e.type === 'exit')) err('no exit entity');
  const keyPickups = new Set();
  ents.forEach((e, i) => {
    const tag = `entity #${i} (${e.type}${e.kind ? ':' + e.kind : ''})`;
    if (!Array.isArray(e.at) || e.at.length !== 2 || !e.at.every(Number.isFinite)) return err(`${tag} has bad 'at'`);
    const c = tile(Math.floor(e.at[0]), Math.floor(e.at[1]));
    if (!walkable(c)) err(`${tag} at ${e.at} is not on a floor/outdoor tile`);
    if (e.type === 'enemy' && !ENEMIES[e.kind]) err(`${tag}: unknown enemy kind`);
    else if (e.type === 'pickup') { if (!PICKUPS[e.kind]) err(`${tag}: unknown pickup kind`); else if (PICKUPS[e.kind].key) keyPickups.add(PICKUPS[e.kind].key); }
    else if (e.type === 'prop' && !PROPS[e.kind]) err(`${tag}: unknown prop kind`);
    else if (!['player', 'enemy', 'pickup', 'prop', 'exit'].includes(e.type)) err(`${tag}: unknown entity type`);
    if (e.type === 'player' && e.facing != null && typeof e.facing !== 'number' && !(e.facing in FACING)) err(`${tag}: bad facing`);
  });
  for (const [i, s] of (src.scenery || []).entries()) {
    if (!SCENERY[s.kind]) err(`scenery #${i}: unknown kind '${s.kind}'`);
    if (!Array.isArray(s.at) || s.at.length !== 2 || !s.at.every(Number.isFinite)) err(`scenery #${i} has bad 'at'`);
  }
  for (const d of doors) if (d.key && !keyPickups.has(d.key)) err(`door ${d.at} needs '${d.key}' but no such key pickup exists`);
  return errors.length ? { ok: false, errors } : { ok: true, errors: [] };
}

export function parseMap(src) {
  const v = validateMap(src);
  if (!v.ok) throw new MapError(v.errors);
  return new MapData(src);
}
