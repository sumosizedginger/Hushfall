// PT-045 (drop B, E13: THE TALLER FORMAT; design/ACTD.md section 2): the height alphabet gains A-Z (units 36..61, up to 30.5 m) so the Root Bell Descent's shaft can drop 30 m instead of 17. The one change of the campaign that reaches the
// map FORMAT, so the proof is two-fold: every shipped and dev map parses to exactly the heights the old alphabet gave (this file), and every canonical route plays to the same numbers (`route-fingerprint.mjs check`).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { validateMap, parseMap, hval, HEIGHT_MAX_UNITS } from '../src/engine/mapformat.js';
import { hchar } from '../tools/mapkit/builder.mjs';
import { createWorld, step, drainEvents } from '../src/engine/world.js';
import { HEIGHT_UNIT } from '../src/engine/defs.js';
import { ROOT } from './helpers.js';

const idle = (o = {}) => ({ move: [0, 0], yaw: 0, pitch: 0, fire: false, aim: false, sprint: false, use: false, weapon: null, weaponStep: 0, map: false, ...o });
const oldHval = (c) => (c === '.' || c == null ? 0 : /[0-9]/.test(c) ? Number(c) : /[a-z]/.test(c) ? c.charCodeAt(0) - 87 : NaN);

test('the alphabet: every unit 0 to 61 has one character, hchar and hval are inverses, and 62 is refused', () => {
  assert.equal(HEIGHT_MAX_UNITS, 61); assert.equal(61 * HEIGHT_UNIT, 30.5);
  const seen = new Set();
  for (let n = 0; n <= 61; n++) { const c = hchar(n); assert.equal(hval(c), n, 'unit ' + n + ' as ' + c); if (n > 0) { assert.ok(!seen.has(c), 'duplicate ' + c); seen.add(c); } }
  assert.equal(hchar(35), 'z'); assert.equal(hchar(36), 'A'); assert.equal(hchar(61), 'Z'); assert.equal(hval('A'), 36); assert.equal(hval('Z'), 61);
  assert.throws(() => hchar(62), /above the format/);
  assert.ok(Number.isNaN(hval('{')) && Number.isNaN(hval('-')) && Number.isNaN(hval('é')), 'a character outside the alphabet is still not a height');
});

test('nothing old moved: every cell of every shipped and dev map reads the same height and ceiling under the new alphabet as under the old', () => {
  let cells = 0, maps = 0;
  for (const dir of ['maps', 'maps-dev']) for (const f of fs.readdirSync(path.join(ROOT, dir)).filter((n) => n.endsWith('.json'))) {
    const src = JSON.parse(fs.readFileSync(path.join(ROOT, dir, f), 'utf8')); maps++;
    for (const layer of [src.heights, src.ceilings]) if (layer) for (const row of layer) for (const c of row) { cells++; if (dir === 'maps-dev' && /[A-Z]/.test(c)) continue; assert.equal(hval(c), oldHval(c), f + ': ' + c); }      // (a dev map of drop B may use the capitals: they are the whole point of the format; no shipped map does)
  }
  assert.ok(maps >= 55 && cells > 5e5, 'it read ' + maps + ' maps, ' + cells + ' cells');
});

/** a 14 x 14 open yard: a ledge 30.5 m up in the north-west quarter ('Z'), a floor at 0 everywhere else, a 31 m ceiling over the yard */
const shaft = (extra = {}) => {
  const W = 14, H = 14, grid = [], heights = [];
  for (let z = 0; z < H; z++) { let g = '', h = ''; for (let x = 0; x < W; x++) { const edge = x === 0 || z === 0 || x === W - 1 || z === H - 1; g += edge ? '#' : ':'; h += !edge && x <= 5 && z <= 5 ? 'Z' : '.'; } grid.push(g); heights.push(h); }
  return { format: 1, id: 'T1', version: 1, name: 'Tall', cellSize: 2, grid, heights, doors: [], secrets: [], entities: [{ type: 'player', at: [3, 3], facing: 'east' }, { type: 'exit', at: [11, 11] }], ...extra };
};

test('a map may use the capitals: the validator accepts them, the parser reads 30.5 m, and a ceiling of Z is 30.5 m', () => {
  const v = validateMap(shaft()); assert.equal(v.ok, true, JSON.stringify(v.errors));
  const m = parseMap(shaft()); assert.equal(m.floor(3, 3), 30.5); assert.equal(m.floor(9, 9), 0); assert.equal(m.floor(5, 5), 30.5); assert.equal(m.floor(6, 5), 0);
  const c = shaft({ ceilings: Array.from({ length: 14 }, () => 'Z'.repeat(14)) }); assert.equal(validateMap(c).ok, true); assert.equal(parseMap(c).ceilingAt(8, 8), 30.5);
  const bad = shaft({ heights: shaft().heights.map((r) => r.replace('Z', '{')) }); const vb = validateMap(bad); assert.equal(vb.ok, false); assert.ok(vb.errors.some((e) => /invalid char/.test(e)));
});

test('a 30 m drop is a dive, not a wall: the player on the high ledge walks off the edge and stands on the floor below; walking back up the same edge is refused (a step is 0.6 m)', () => {
  const w = createWorld(parseMap(shaft()), { seed: 1, difficulty: 'normal' }); assert.equal(w.map.floor(3, 3), 30.5);
  step(w, idle()); assert.ok(Math.abs(w.player.y - 30.5) < 1e-6, 'the player starts on the ledge: y ' + w.player.y);
  // walk east (forward is -sin/-cos of yaw: yaw -PI/2 faces +x) until off the ledge
  w.player.yaw = -Math.PI / 2; let n = 0; while (w.player.x < 16 && n++ < 600) step(w, idle({ move: [0, 1] })); drainEvents(w);
  assert.ok(w.player.x >= 16, 'walked off the ledge: x ' + w.player.x); assert.ok(Math.abs(w.player.y) < 1e-6, 'and stands on the floor 30 m below: y ' + w.player.y); assert.equal(w.status, 'playing');
  w.player.yaw = Math.PI / 2; for (let i = 0; i < 300; i++) step(w, idle({ move: [0, 1] }));
  assert.ok(w.player.x > 11.5 && Math.abs(w.player.y) < 1e-6, 'the 30 m wall is a wall: x ' + w.player.x + ' y ' + w.player.y);
});
