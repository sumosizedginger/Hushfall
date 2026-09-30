// Map format v1: ASCII grid for geometry + entity list for everything else. Pure data, no DOM/Three.
// validateMap() never throws; it returns every problem it can find so authors can fix a map in one pass.
import { CELL, DEFAULT_CEILING, ENEMIES, PICKUPS, PROPS, KEYS, FACING, SCENERY, PLAYER, HEIGHT_UNIT, MIN_HEADROOM, STEP, FX, WALL_SKINS, FLOOR_SKINS } from './defs.js';

export const MAP_FORMAT = 1;
// One char per cell. Several chars can share a kind: they differ only in how they are drawn (skins).
//   walls:   # bulkhead (slate)   B warm brick
//   floors:  . interior planks    : cobble (open air)    p pier planks (open air)
//   water:   ~ blocks walking, but not sight or projectiles
//   D door   S secret panel (drawn as wall until opened)
//   Gate 2 skins: walls W timber, P plaster, C concrete, I iron plate, R Vael resin, T tower stone; floors t tile, g grating, c carpet, f flagstone (indoor), m silt, s slate (outdoor)
//   X = a trigger-only panel (a closet door drawn as wall); listed in `closets`
// Optional layers (same size as `grid`, one char per cell): `heights` (floor height, 0.5 m units: . or 0-9 a-z), `ceilings` (absolute ceiling height in
// 0.5 m units, '.' = floor + ceilingHeight), `fx` (floor effect: w wading water, x toxic residue). Lists: `sectors` (moving floors), `closets`, `triggers`,
// entities of type `switch`. See design/EPISODE1.md and tests/kit.test.js for the exact shapes.
const TILES = { '~': 'water', D: 'door', S: 'secret', X: 'secret' };
for (const c of Object.keys(WALL_SKINS)) TILES[c] = 'wall';
for (const [c, f] of Object.entries(FLOOR_SKINS)) TILES[c] = f.kind;
const WALL_CHARS = new Set(Object.keys(WALL_SKINS)), WALKABLE_CHARS = new Set(Object.keys(FLOOR_SKINS));
const hval = (c) => (c === '.' || c == null ? 0 : /[0-9]/.test(c) ? Number(c) : /[a-z]/.test(c) ? c.charCodeAt(0) - 87 : NaN);
export const ACTION_KEYS = ['open', 'close', 'unlock', 'seal', 'unseal', 'wake', 'spawn', 'sector', 'message', 'exit', 'alert', 'shake', 'objective', 'toggle'];

export class MapError extends Error {
  constructor(errors) { super('Invalid map: ' + errors.join('; ')); this.errors = errors; }
}

export class MapData {
  constructor(src) {
    this.id = src.id; this.version = src.version; this.name = src.name;
    this.cell = src.cellSize ?? CELL; this.ceiling = src.ceilingHeight ?? DEFAULT_CEILING;
    this.tiles = src.grid.map((r) => [...r]);
    this.h = this.tiles.length; this.w = this.tiles[0].length;
    this.doors = new Map([...(src.doors || []).map((d) => [d.at.join(','), { cx: d.at[0], cz: d.at[1], key: d.key ?? null, remote: !!d.remote }]), ...(src.closets || []).map((d) => [d.at.join(','), { cx: d.at[0], cz: d.at[1], key: null, remote: true, closet: true }])]);
    this.heightRows = src.heights || null; this.ceilingRows = src.ceilings || null; this.fxRows = src.fx || null;
    this.flat = !this.heightRows && !this.ceilingRows;                                   // no terrain layers: every floor is y=0 (the Gate 1 fast path)
    this.sectors = (src.sectors || []).map((s) => ({ id: s.id, cells: s.cells, low: s.low, high: s.high, speed: s.speed ?? 1.2, start: s.start ?? 'low' }));
    this.sectorIndex = new Map(); this.sectors.forEach((s, i) => s.cells.forEach(([cx, cz]) => this.sectorIndex.set(cx + ',' + cz, i)));
    this.triggers = (src.triggers || []).map((t) => ({ ...t, x: t.at ? (t.at[0] + 0.5) * this.cell : 0, z: t.at ? (t.at[1] + 0.5) * this.cell : 0, r: (t.radius ?? 1.5) * this.cell }));
    this.groups = [...new Set((src.entities || []).filter((e) => e.group).map((e) => e.group))];
    this.secrets = (src.secrets || []).map((s) => ({ id: s.id, panel: s.panel, cells: s.cells }));
    this.entities = (src.entities || []).map((e) => ({ ...e, x: (e.at[0] + 0.5) * this.cell, z: (e.at[1] + 0.5) * this.cell }));
    this.spawn = (() => { const e = this.entities.find((x) => x.type === 'player'); return { x: e.x, z: e.z, yaw: typeof e.facing === 'number' ? e.facing : FACING[e.facing ?? 'east'] }; })();
    this.exits = this.entities.filter((e) => e.type === 'exit').map((e, i) => ({ id: e.id ?? 'exit' + i, dest: 'next', locked: false, ...e }));
    this.switches = this.entities.filter((e) => e.type === 'switch').map((e) => { const d = { north: [0, -1], south: [0, 1], east: [1, 0], west: [-1, 0] }[e.wall ?? 'north'] || [0, -1]; return { once: true, ...e, wallDir: e.wall ?? 'north', px: e.x + d[0] * (this.cell / 2 - 0.08), pz: e.z + d[1] * (this.cell / 2 - 0.08), fy: this.floor(Math.floor(e.at[0]), Math.floor(e.at[1])) }; });
    this.objective = src.objective ?? null;
    this.props = this.entities.filter((e) => e.type === 'prop');
    this.par = src.par ?? null;
    this.scenery = (src.scenery || []).map((s) => ({ ...s, x: (s.at[0] + 0.5) * this.cell, z: (s.at[1] + 0.5) * this.cell }));
    this.messages = (src.messages || []).map((m) => ({ ...m, x: (m.at[0] + 0.5) * this.cell, z: (m.at[1] + 0.5) * this.cell, r: (m.radius ?? 2) * this.cell }));
    this.intro = src.intro ?? null; this.outro = src.outro ?? null;
    this.atmosphere = { fog: '#2a2244', fogDensity: 0.028, ...(src.atmosphere || {}) };
  }
  tile(cx, cz) { return (cx < 0 || cz < 0 || cx >= this.w || cz >= this.h) ? '#' : this.tiles[cz][cx]; }
  kind(cx, cz) { return TILES[this.tile(cx, cz)]; }
  /** solid for geometry purposes, ignoring door/secret state */
  isWall(cx, cz) { return this.kind(cx, cz) === 'wall'; }
  isOutdoor(cx, cz) { return this.kind(cx, cz) === 'outdoor'; }
  isWater(cx, cz) { return this.kind(cx, cz) === 'water'; }
  /** static floor height of a cell in metres (0 when the map has no `heights` layer) */
  floor(cx, cz) { if (!this.heightRows || cx < 0 || cz < 0 || cx >= this.w || cz >= this.h) return 0; return (hval(this.heightRows[cz][cx]) || 0) * HEIGHT_UNIT; }
  /** ceiling height above sea level of an interior cell: an explicit `ceilings` char, else floor + ceilingHeight */
  ceilingAt(cx, cz) { const c = this.ceilingRows?.[cz]?.[cx]; return c != null && c !== '.' ? hval(c) * HEIGHT_UNIT : this.floor(cx, cz) + this.ceiling; }
  /** the floor effect char at a cell ('w' | 'x' | null) */
  fx(cx, cz) { const c = this.fxRows?.[cz]?.[cx]; return c && c !== '.' && c !== ' ' ? c : null; }
  sectorAt(cx, cz) { return this.sectorIndex.size ? (this.sectorIndex.get(cx + ',' + cz) ?? -1) : -1; }
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
    if (c === 'D' || c === 'S' || c === 'X') {
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
    else if (!['player', 'enemy', 'pickup', 'prop', 'exit', 'switch'].includes(e.type)) err(`${tag}: unknown entity type`);
    if (e.type === 'player' && e.facing != null && typeof e.facing !== 'number' && !(e.facing in FACING)) err(`${tag}: bad facing`);
  });
  // nothing may spawn inside a solid prop (or inside another actor): a body embedded in a collider is stuck or unfair from tick 0
  const cellM = src.cellSize ?? CELL, bodyR = (e) => (e.type === 'enemy' ? ENEMIES[e.kind]?.radius : e.type === 'player' ? PLAYER.radius : e.type === 'pickup' ? 0.25 : e.type === 'exit' ? 0.3 : 0) ?? 0;
  const okAt = ents.filter((e) => Array.isArray(e.at) && e.at.length === 2 && e.at.every(Number.isFinite));
  for (const [i, a] of okAt.entries()) {
    const ar = bodyR(a), pa = PROPS[a.kind]; if (a.type === 'prop' || !ar) continue;
    for (const [j, b] of okAt.entries()) {
      if (i === j) continue; const dist = Math.hypot((a.at[0] - b.at[0]) * cellM, (a.at[1] - b.at[1]) * cellM);
      if (b.type === 'prop') { const pr = PROPS[b.kind]?.radius ?? 0; if (pr > 0 && dist < ar + pr) err(`${a.type}${a.kind ? ':' + a.kind : ''} at ${a.at} overlaps solid prop ${b.kind} at ${b.at}`); }
      else if ((a.type === 'enemy' || a.type === 'player') && (b.type === 'enemy' || b.type === 'player') && j > i && dist < ar + bodyR(b)) err(`${a.type} at ${a.at} overlaps ${b.type} at ${b.at}`);
    }
  }
  for (const [i, s] of (src.scenery || []).entries()) {
    if (!SCENERY[s.kind]) err(`scenery #${i}: unknown kind '${s.kind}'`);
    if (!Array.isArray(s.at) || s.at.length !== 2 || !s.at.every(Number.isFinite)) err(`scenery #${i} has bad 'at'`);
  }
  const msgIds = new Set();
  for (const [i, m] of (src.messages || []).entries()) {
    const tag = `message #${i} (${m.id})`;
    if (!m.id || msgIds.has(m.id)) err(`${tag}: missing or duplicate id`); msgIds.add(m.id);
    if (!Array.isArray(m.at) || m.at.length !== 2 || !m.at.every(Number.isFinite) || m.at[0] < 0 || m.at[1] < 0 || m.at[0] >= w || m.at[1] >= h) err(`${tag}: 'at' must be inside the grid`);
    if (typeof m.text !== 'string' || !m.text.trim()) err(`${tag}: empty text`); else if (m.text.length > 180) err(`${tag}: text too long (${m.text.length} > 180)`);
    if (m.radius != null && !(m.radius > 0 && m.radius <= 8)) err(`${tag}: radius must be in (0, 8] cells`);
  }
  if (src.intro != null && (typeof src.intro.title !== 'string' || !Array.isArray(src.intro.lines))) err('intro needs a title and lines[]');
  for (const d of doors) if (d.key && !keyPickups.has(d.key)) err(`door ${d.at} needs '${d.key}' but no such key pickup exists`);
  validateKit(src, { w, h, tile, walkable, err, ents, msgIds, keyPickups });
  return errors.length ? { ok: false, errors } : { ok: true, errors: [] };
}

/** Gate 2 production-kit validation: terrain layers, sectors, closets, switches, triggers, exits and every action they run. */
function validateKit(src, { w, h, tile, walkable, err, ents, msgIds }) {
  const layer = (name, rows, allowed) => {
    if (rows == null) return false;
    if (!Array.isArray(rows) || rows.length !== h || rows.some((r) => typeof r !== 'string' || r.length !== w)) { err(`layer '${name}' must be ${w} x ${h} like the grid`); return false; }
    for (let cz = 0; cz < h; cz++) for (let cx = 0; cx < w; cx++) if (!allowed(rows[cz][cx])) err(`layer '${name}' has an invalid char '${rows[cz][cx]}' at ${cx},${cz}`);
    return true;
  };
  const hasH = layer('heights', src.heights, (c) => !Number.isNaN(hval(c))), hasC = layer('ceilings', src.ceilings, (c) => !Number.isNaN(hval(c))), hasF = layer('fx', src.fx, (c) => c === '.' || c === ' ' || c in FX);
  const floorOf = (cx, cz) => (hasH ? (hval(src.heights[cz][cx]) || 0) * HEIGHT_UNIT : 0);
  const ceilOf = (cx, cz) => { const c = hasC ? src.ceilings[cz][cx] : '.'; return c !== '.' ? hval(c) * HEIGHT_UNIT : floorOf(cx, cz) + (src.ceilingHeight ?? DEFAULT_CEILING); };
  const interior = (c) => FLOOR_SKINS[c]?.kind === 'floor';
  const sectorOf = new Map(), sectorIds = new Set();
  for (const [i, s] of (src.sectors || []).entries()) {
    const tag = `sector #${i} (${s.id})`;
    if (!s.id || sectorIds.has(s.id)) err(`${tag}: missing or duplicate id`); sectorIds.add(s.id);
    if (!Array.isArray(s.cells) || !s.cells.length) { err(`${tag}: no cells`); continue; }
    if (!(Number.isFinite(s.low) && Number.isFinite(s.high) && s.low < s.high)) err(`${tag}: needs numeric low < high (metres)`);
    if (s.start != null && s.start !== 'low' && s.start !== 'high') err(`${tag}: start must be 'low' or 'high'`);
    if (s.speed != null && !(s.speed > 0)) err(`${tag}: speed must be positive`);
    for (const [cx, cz] of s.cells) {
      if (!walkable(tile(cx, cz))) err(`${tag}: cell ${cx},${cz} is not a floor cell`);
      if (sectorOf.has(cx + ',' + cz)) err(`${tag}: cell ${cx},${cz} is already in another sector`); sectorOf.set(cx + ',' + cz, s.id);
      if (interior(tile(cx, cz)) && ceilOf(cx, cz) - s.high < MIN_HEADROOM) err(`${tag}: cell ${cx},${cz} has no headroom at its high position`);
    }
  }
  for (let cz = 0; cz < h; cz++) for (let cx = 0; cx < w; cx++) {
    const c = tile(cx, cz);
    if (hasF && src.fx[cz][cx] in FX && !walkable(c)) err(`fx '${src.fx[cz][cx]}' at ${cx},${cz} is not on a floor cell`);
    if (walkable(c) && interior(c)) { const room = ceilOf(cx, cz) - floorOf(cx, cz); if (room < MIN_HEADROOM) err(`interior cell ${cx},${cz} has ${room.toFixed(1)} m of headroom (needs ${MIN_HEADROOM})`); }
    if (c === 'D' || c === 'X') for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const n = tile(cx + dx, cz + dz); if (walkable(n) && Math.abs(floorOf(cx + dx, cz + dz) - floorOf(cx, cz)) > 1e-6) err(`door at ${cx},${cz} is not on level ground (neighbour ${cx + dx},${cz + dz} differs)`); }
  }
  const closetCells = new Set();
  for (const c of src.closets || []) { if (!Array.isArray(c.at) || tile(c.at[0], c.at[1]) !== 'X') err(`closets entry ${JSON.stringify(c.at)} is not on an 'X' tile`); else closetCells.add(c.at.join(',')); }
  for (let cz = 0; cz < h; cz++) for (let cx = 0; cx < w; cx++) if (tile(cx, cz) === 'X' && !closetCells.has(cx + ',' + cz)) err(`'X' tile at ${cx},${cz} has no closets entry`);
  const actionsOf = (list) => (Array.isArray(list) ? list : []);
  const groups = new Set(ents.filter((e) => e.group).map((e) => e.group));
  const owners = [...ents.filter((e) => e.type === 'switch').map((e) => ({ tag: `switch '${e.id}'`, do: e.do })), ...(src.triggers || []).map((t) => ({ tag: `trigger '${t.id}'`, do: t.do }))];
  for (const o of owners) for (const a of actionsOf(o.do)) if (a?.spawn?.group) groups.add(a.spawn.group);
  const doorCells = new Set([...(src.doors || []).map((d) => d.at.join(',')), ...closetCells, ...(src.secrets || []).map((s) => s.panel.join(','))]), opened = new Set();
  const checkAction = (tag, a) => {
    if (!a || typeof a !== 'object') return err(`${tag}: action must be an object`);
    const keys = Object.keys(a); if (keys.length !== 1 || !ACTION_KEYS.includes(keys[0])) return err(`${tag}: an action has exactly one of ${ACTION_KEYS.join(', ')} (got ${keys.join(',') || 'nothing'})`);
    const k = keys[0], v = a[k];
    if (['open', 'close', 'unlock', 'seal', 'unseal', 'toggle'].includes(k)) { if (!Array.isArray(v) || v.length !== 2 || !doorCells.has(v.join(','))) err(`${tag}: ${k} needs the [cx,cz] of a door, closet or secret panel (got ${JSON.stringify(v)})`); else if (k === 'open' || k === 'toggle' || k === 'unlock') opened.add(v.join(',')); }
    else if (k === 'wake') { if (!groups.has(v)) err(`${tag}: wake refers to unknown group '${v}'`); }
    else if (k === 'spawn') { if (!v || !ENEMIES[v.kind]) err(`${tag}: spawn needs a known enemy kind`); else if (!Array.isArray(v.at) || !walkable(tile(Math.floor(v.at[0]), Math.floor(v.at[1])))) err(`${tag}: spawn point ${JSON.stringify(v.at)} is not on a floor cell`); }
    else if (k === 'sector') { if (!v || !sectorIds.has(v.id) || !['low', 'high', 'toggle'].includes(v.to)) err(`${tag}: sector needs {id, to: low|high|toggle} for a known sector`); }
    else if (k === 'message') { if (!msgIds.has(v)) err(`${tag}: message '${v}' does not exist`); }
    else if (k === 'exit') { if (!v || !['unlock', 'lock'].includes(v.set)) err(`${tag}: exit needs {set: 'unlock'|'lock', id?}`); }
    else if (k === 'shake') { if (!(v > 0 && v <= 3)) err(`${tag}: shake must be in (0, 3]`); }
    else if (k === 'objective') { if (typeof v !== 'string' || !v.trim() || v.length > 80) err(`${tag}: objective must be 1-80 characters`); }
  };
  const swIds = new Set();
  for (const e of ents) if (e.type === 'switch') {
    const tag = `switch '${e.id}'`;
    if (!e.id || swIds.has(e.id)) err(`${tag}: missing or duplicate id`); swIds.add(e.id);
    const dir = { north: [0, -1], south: [0, 1], east: [1, 0], west: [-1, 0] }[e.wall ?? 'north'];
    if (!dir) err(`${tag}: wall must be north|south|east|west`);
    else if (Array.isArray(e.at) && !WALL_CHARS.has(tile(Math.floor(e.at[0]) + dir[0], Math.floor(e.at[1]) + dir[1]))) err(`${tag}: is not mounted on a wall (the ${e.wall ?? 'north'} neighbour is not a wall)`);
    if (!Array.isArray(e.do) || !e.do.length) err(`${tag}: needs a non-empty do[] list`);
    for (const a of actionsOf(e.do)) checkAction(tag, a);
  }
  const trIds = new Set();
  for (const t of src.triggers || []) {
    const tag = `trigger '${t.id}'`;
    if (!t.id || trIds.has(t.id)) err(`${tag}: missing or duplicate id`); trIds.add(t.id);
    const wn = String(t.when ?? '');
    if (wn === 'enter') { if (!Array.isArray(t.at) || t.at.length !== 2 || !t.at.every(Number.isFinite)) err(`${tag}: 'enter' needs at:[cx,cz]`); }
    else if (wn.startsWith('key:')) { if (!KEYS[wn.slice(4)]) err(`${tag}: unknown key in '${wn}'`); }
    else if (wn.startsWith('dead:')) { if (!groups.has(wn.slice(5))) err(`${tag}: unknown group in '${wn}'`); }
    else if (wn.startsWith('msg:')) { if (!msgIds.has(wn.slice(4))) err(`${tag}: unknown message in '${wn}'`); }
    else if (wn.startsWith('time:')) { if (!(Number(wn.slice(5)) >= 0)) err(`${tag}: bad time in '${wn}'`); }
    else if (wn.startsWith('sector:')) { const [, id, pos] = wn.split(':'); if (!sectorIds.has(id) || !['low', 'high'].includes(pos)) err(`${tag}: bad sector condition '${wn}'`); }
    else if (wn !== 'start') err(`${tag}: 'when' must be enter | start | key:<k> | dead:<group> | msg:<id> | time:<s> | sector:<id>:<low|high> (got '${wn}')`);
    if (!Array.isArray(t.do) || !t.do.length) err(`${tag}: needs a non-empty do[] list`);
    for (const a of actionsOf(t.do)) checkAction(tag, a);
  }
  for (const d of src.doors || []) if (d.remote && !opened.has(d.at.join(','))) err(`remote door ${d.at} is never opened by any switch or trigger`);
  for (const c of closetCells) if (!opened.has(c)) err(`closet ${c} is never opened by any switch or trigger`);
  const exitIds = new Set();
  for (const e of ents) if (e.type === 'exit') {
    if (e.dest != null && e.dest !== 'next' && e.dest !== 'secret') err(`exit at ${e.at}: dest must be 'next' or 'secret'`);
    const id = e.id ?? 'exit'; if (exitIds.has(id)) err(`duplicate exit id '${id}'`); exitIds.add(id);
  }
  const p = ents.find((e) => e.type === 'player');
  if (p && hasF && Array.isArray(p.at) && src.fx[Math.floor(p.at[1])]?.[Math.floor(p.at[0])] in FX) err('the player starts on a floor effect (wading water / toxic residue)');
}

export function parseMap(src) {
  const v = validateMap(src);
  if (!v.ok) throw new MapError(v.errors);
  return new MapData(src);
}
