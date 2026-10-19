// THE SQUEEZE (PT-052, the structural exemplars of workstream B): take whole columns (or rows) OUT of a finished map so a long, thin level gets shorter without being redrawn. A map source says
//   MAP.squeeze = { axis: 'x', cuts: [[a, b], ...] }          cut columns a .. b-1 (cells, in the AUTHORING frame: the frame the source is written in), ascending and not touching
// and the compiler applies it LAST, to the compiled map: every layer loses those columns, every coordinate to the east of a cut moves west by its width, a coordinate inside a cut lands on the cut's edge. Everything the
// source does (shaping, the roster, the encounter kit, the lane file) stays in the authoring frame; only the shipped JSON is narrower. Tools that read the SHIPPED map (lane-cells, mapview, the audit) speak the shipped
// frame: `toSource` / `toShipped` convert, and `lane-of.mjs` writes the lane file in the authoring frame for a squeezed map.
//   node tools/mapkit/squeeze.mjs scan <ID> [axis]            the map compiled WITHOUT its squeeze, then every column / row scored: what is in it (an object, a message, a switch), whether a slope runs ALONG the axis through it,
//                                                              and what it costs to remove (how many cells differ from the next column): the runs of cheap, free columns are where a cut belongs
//   node tools/mapkit/squeeze.mjs routes <ID>                 rewrite routes/<ID>.*.route.json for the squeeze the source names (the first run keeps the originals in maps-src/squeeze-orig/ and every later run starts from them)
// Node only.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { FLOOR_SKINS } from '../../src/engine/defs.js';

const root = path.resolve(import.meta.dirname, '../..'), FLOORS = new Set(Object.keys(FLOOR_SKINS)), isFloor = (c) => FLOORS.has(c) || c === 'D' || c === 'S';
/** how many columns of the cuts lie west of u (a continuous count: u inside a cut counts the part before it) */
export const removedBefore = (u, cuts) => cuts.reduce((n, [a, b]) => n + Math.max(0, Math.min(u, b) - a), 0);
export const toShipped = (u, cuts) => u - removedBefore(u, cuts);
/** the inverse for a cell that survived: shipped column -> authoring column */
export const toSource = (n, cuts) => { let u = n; for (const [a, b] of cuts) if (u >= a) u += b - a; return u; };
export const checkCuts = (cuts, limit) => { let prev = -1; for (const [a, b] of cuts) { if (!(Number.isInteger(a) && Number.isInteger(b) && a > prev && b > a && b <= limit)) throw new Error(`squeeze: cuts must be ascending, not touching and inside the map: [${a}, ${b}) after ${prev} (limit ${limit})`); prev = b; } };

const NOT_CELLS = new Set(['quality', 'par', 'entryLoadout', 'atmosphere', 'intro', 'outro', 'objective', 'lantern', 'lampHolds', 'keyLabels']);          // top-level fields that hold numbers which are not cells
const PAIR = new Set(['at', 'to', 'panel', 'front', 'open', 'target', 'spot', 'entry', 'center', 'origin', 'interlock', 'close']);
const LIST = new Set(['cells', 'path', 'stops', 'spots', 'points', 'seals', 'and']);
const RECT = new Set(['rect']);
const isNum = (v) => typeof v === 'number';
const isPair = (v) => Array.isArray(v) && v.length === 2 && v.every(isNum);

/** remap a map definition's coordinates and cut its layers; `map` is the COMPILED map (grid / heights / ceilings / fx as arrays of strings). Returns { map, warnings }. */
export function squeezeOne(map, spec) {
  const axis = spec.axis === 'z' ? 1 : 0, cuts = spec.cuts, H = map.grid.length, W = map.grid[0].length;
  checkCuts(cuts, axis ? H : W);
  const R = (u) => toShipped(u, cuts), seen = new Map();
  const pair = (p) => { const q = p.slice(); q[axis] = R(q[axis]); return q; };
  const rect = (r) => { const q = r.slice(); q[axis] = R(q[axis]); q[axis + 2] = R(q[axis + 2]); return q; };
  const cutRows = (rows) => (axis === 0 ? rows.map((row) => { let s = '', i = 0; for (const [a, b] of cuts) { s += row.slice(i, a); i = b; } return s + row.slice(i); }) : (() => { const out = []; let i = 0; for (const [a, b] of cuts) { out.push(...rows.slice(i, a)); i = b; } return out.concat(rows.slice(i)); })());
  const isLayer = (v) => Array.isArray(v) && v.length === H && v.every((r) => typeof r === 'string' && r.length === W);
  const walk = (v, key, path) => {
    if (Array.isArray(v)) {
      if (PAIR.has(key) && isPair(v)) return pair(v);
      if (RECT.has(key) && v.length === 4 && v.every(isNum)) return rect(v);
      if (LIST.has(key) && v.every(isPair)) return v.map(pair);
      if (isPair(v) && key && !PAIR.has(key) && !NOT_CELLS.has(path.split('.')[0]) && v.every((n) => Number.isInteger(n) && n >= 0 && n < Math.max(W, H))) seen.set(path, v.join(','));         // a pair of cell-like numbers under a key this tool does not know: reported, never moved
      return v.map((x, i) => walk(x, key, path + '[' + i + ']'));
    }
    if (v && typeof v === 'object') { const o = {}; for (const [k, x] of Object.entries(v)) o[k] = walk(x, k, path + '.' + k); return o; }
    return v;
  };
  const out = {};
  for (const [k, v] of Object.entries(map)) out[k] = isLayer(v) ? cutRows(v) : k === 'drops' && v?.keep ? { ...v, keep: v.keep.map((q) => (q.length === 4 ? rect(q) : pair(q))) } : walk(v, k, k);
  const warnings = [...new Set([...seen.keys()].map((p) => p.replace(/\[\d+\]/g, '[]')))];
  return { map: out, warnings };
}

/** a drops.keep list (cells [x, z] and rectangles [x0, z0, x1, z1]) in the shipped frame */
function keepOne(keep, spec) {
  const axis = spec.axis === 'z' ? 1 : 0, R = (u) => toShipped(u, spec.cuts);
  return keep.map((k) => { const q = k.slice(); q[axis] = R(q[axis]); if (q.length === 4) q[axis + 2] = R(q[axis + 2]); return q; });
}

/** the same remap for a canonical route (a list of ops with `at` pairs) */
function routeOne(route, spec) {
  const axis = spec.axis === 'z' ? 1 : 0;
  return route.map((op) => (isPair(op.at) ? { ...op, at: Object.assign(op.at.slice(), { [axis]: toShipped(op.at[axis], spec.cuts) }) } : { ...op }));
}


// ---- a map may be squeezed on BOTH axes: `MAP.squeeze` is one spec or a list of them, applied in order (a column set, then a row set) ----------------------------------------------------------------------------------------------------------------------------
/** one spec or a list of specs -> a list */
export const specList = (sq) => (Array.isArray(sq) ? sq : sq ? [sq] : []);
export function squeezeMap(map, sq) { let m = map; const warnings = []; for (const spec of specList(sq)) { const r = squeezeOne(m, spec); m = r.map; warnings.push(...r.warnings); } return { map: m, warnings: [...new Set(warnings)] }; }
export function squeezeKeep(keep, sq) { return specList(sq).reduce((k, spec) => keepOne(k, spec), keep); }
export function squeezeRoute(route, sq) { return specList(sq).reduce((r, spec) => routeOne(r, spec), route); }
/** a cell [x, z] of the SHIPPED map -> the cell it has in the authoring frame (the specs undone in the opposite order) */
export function cellToSource(cell, sq) { const p = cell.slice(); for (const spec of specList(sq).slice().reverse()) { const ax = spec.axis === 'z' ? 1 : 0; p[ax] = toSource(p[ax], spec.cuts); } return p; }
/** a cell [x, z] of the authoring frame -> the shipped map (a cell inside a cut lands on its edge) */
export function cellToShipped(cell, sq) { const p = cell.slice(); for (const spec of specList(sq)) { const ax = spec.axis === 'z' ? 1 : 0; p[ax] = toShipped(p[ax], spec.cuts); } return p; }
// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
// the command line
async function sourceOf(id) { return (await import(pathToFileURL(path.join(root, 'maps-src', id + '.level.mjs')).href)).default; }

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [cmd, id, ax] = process.argv.slice(2);
  if (cmd === 'scan' && id) {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'sq-')), run = spawnSync(process.execPath, [path.join(root, 'tools/mapkit/compile.mjs'), id], { cwd: root, env: { ...process.env, SQUEEZE: 'off', MAP_OUT: tmp }, encoding: 'utf8' });          // a child process: compile.mjs imports this file
    if (run.status !== 0) { console.error((run.stderr || run.stdout).slice(0, 600)); process.exit(1); }
    const map = JSON.parse(fs.readFileSync(path.join(tmp, id + '.json'), 'utf8')); fs.rmSync(tmp, { recursive: true, force: true });
    const want = +(process.argv.find((a) => a.startsWith('--want='))?.split('=')[1] ?? 0), keepOut = (process.argv.find((a) => a.startsWith('--avoid='))?.split('=')[1] ?? '').split(';').filter(Boolean).map((r) => r.split('-').map(Number));
    const axis = ax === 'z' ? 1 : 0, H = map.grid.length, W = map.grid[0].length, N = axis ? H : W, O = axis ? W : H, ch = (c, o) => (axis ? map.grid[c][o] : map.grid[o][c]), ht = (c, o) => ((axis ? map.heights?.[c]?.[o] : map.heights?.[o]?.[c]) ?? '0');
    const used = new Array(N).fill(''), mark = (u, what) => { const c = Math.round(u); if (c >= 0 && c < N && !used[c].includes(what)) used[c] += (used[c] ? ' ' : '') + what; };
    // what makes a column un-cuttable: a creature, a pickup, a prop, a switch, the exit, the start, a door, a secret panel or its cells. Messages and triggers only have a CENTRE that moves with the map: they never block.
    for (const e of map.entities) if (isPair(e.at)) { mark(e.at[axis], e.type === 'enemy' ? 'E' : e.type === 'switch' ? 'SW' : e.type === 'exit' ? 'EXIT' : e.type === 'player' ? 'START' : e.type === 'prop' ? 'p' : 'k'); if (e.type === 'switch' || e.type === 'exit') { mark(e.at[axis] - 1, 'wall'); mark(e.at[axis] + 1, 'wall'); } }          // a lever or an exit is set in a wall: the wall behind it must stay a wall
    for (const d of map.doors ?? []) for (let k = -1; k <= 1; k++) mark(d.at[axis] + k, 'door'); for (const s of map.secrets ?? []) { for (let k = -1; k <= 1; k++) mark(s.panel[axis] + k, 'secret'); for (const c of s.cells) for (let k = -1; k <= 1; k++) mark(c[axis] + k, 'secret'); } for (const c of map.closets ?? []) for (let k = -1; k <= 1; k++) mark(c.at[axis] + k, 'closet');
    for (const [a, b] of keepOut) for (let c = a; c <= b; c++) mark(c, 'avoid');
    for (const v of map.vents ?? []) { mark(v.at[axis], 'vent'); mark(v.to[axis], 'vent'); }
    const jump = (c) => { let n = 0; for (let o = 0; o < O; o++) { if (ch(c - 1, o) !== ch(c + 1, o)) n++; else if (ht(c - 1, o) !== ht(c + 1, o)) n++; } return n; };
    const stepAcross = (c) => { for (let o = 0; o < O; o++) if (isFloor(ch(c - 1, o)) && isFloor(ch(c + 1, o)) && ht(c - 1, o) !== ht(c + 1, o)) return true; return false; };          // a stair or a ramp runs ALONG the axis through this column: taking it out makes a taller step (the step rule is 0.6 m)
    const blocked = (c) => c < 3 || c >= N - 3 || used[c] !== '' || stepAcross(c), rows = [];
    for (let c = 0; c < N; c++) rows.push({ c, used: used[c], jump: c > 0 && c < N - 1 ? jump(c) : 0 });
    if (want > 0) {                                   // pick `want` columns spread evenly: in each window the free column whose two neighbours already look most alike
      const picks = [], span = N / want;
      for (let k = 0; k < want; k++) { const lo = Math.max(3, Math.floor(k * span)), hi = Math.min(N - 4, Math.floor((k + 1) * span) - 1); let best = null; for (let c = lo; c <= hi; c++) if (!blocked(c) && (best === null || rows[c].jump < rows[best].jump)) best = c; if (best !== null) picks.push(best); }
      const cuts = []; for (const c of picks) { const last = cuts[cuts.length - 1]; if (last && last[1] === c) last[1] = c + 1; else cuts.push([c, c + 1]); }
      console.log(`${id}: ${picks.length} of ${want} columns picked (${W} -> ${W - picks.length} wide); cuts = ${JSON.stringify(cuts)}`);
      console.log('mean jump of the picks: ' + (picks.reduce((s, c) => s + rows[c].jump, 0) / Math.max(1, picks.length)).toFixed(1) + ' cells that differ across each cut (of ' + O + ' rows)');
    } else {
      const free = rows.map((r) => !blocked(r.c)); let runs = [], i = 0; while (i < N) { if (!free[i]) { i++; continue; } let j = i; while (j < N && free[j]) j++; runs.push({ a: i, b: j, cost: Math.round(rows.slice(i, j).reduce((s, r) => s + r.jump, 0) / (j - i)) }); i = j; }
      console.log(`${id}: ${W} x ${H}, axis ${axis ? 'z' : 'x'}; ${free.filter(Boolean).length} free columns in ${runs.length} runs (a..b exclusive, mean jump):`); console.log('  ' + runs.map((r) => `[${r.a},${r.b}) ${r.cost}`).join('   '));
    }
  } else if (cmd === 'routes' && id) {
    const lv = await sourceOf(id), spec = lv.squeeze; if (!specList(spec).length) { console.error(id + ' has no squeeze'); process.exit(1); }
    const orig = path.join(root, 'maps-src', 'squeeze-orig'); fs.mkdirSync(orig, { recursive: true });
    for (const f of fs.readdirSync(path.join(root, 'routes')).filter((q) => q.startsWith(id + '.') && q.endsWith('.route.json'))) {
      const keep = path.join(orig, f); if (!fs.existsSync(keep)) fs.copyFileSync(path.join(root, 'routes', f), keep);
      const route = JSON.parse(fs.readFileSync(keep, 'utf8')); fs.writeFileSync(path.join(root, 'routes', f), JSON.stringify(squeezeRoute(route, spec))); console.log('wrote routes/' + f);
    }
    const vf = path.join(root, 'maps-src', id + '.views.json');                                           // the vantage tour of shoot-map.mjs: x / z in cells
    if (fs.existsSync(vf)) { const keep = path.join(orig, id + '.views.json'); if (!fs.existsSync(keep)) fs.copyFileSync(vf, keep);
      fs.writeFileSync(vf, JSON.stringify(JSON.parse(fs.readFileSync(keep, 'utf8')).map((v) => (typeof v.x === 'number' && typeof v.z === 'number' ? (([x, z]) => ({ ...v, x, z }))(cellToShipped([v.x, v.z], spec)) : v)), null, 1)); console.log('wrote maps-src/' + id + '.views.json'); }
  } else { console.error('usage: squeeze.mjs scan <ID> [x|z]  |  routes <ID>'); process.exit(2); }
}
