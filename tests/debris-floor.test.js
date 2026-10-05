// Debris lands on the terrain under it (heights, moving floors), not on world y = 0. Over a raised floor the old `position.y < 0` cleanup let chips fall through the floor.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createWorld } from '../src/engine/world.js';
import { parseMap } from '../src/engine/mapformat.js';
import { debrisFloor, spawnGround } from '../src/render/debris.js';

const COLS = 14, ROWS = 8;
// west half flat, east half 3 m up (char '6'), with a lift (cells 2-3 x 2-3) on the flat side and a wall column at x = 7
const map = () => parseMap({ format: 1, id: 'DB', version: 1, name: 'Debris', ceilingHeight: 8,
  grid: Array.from({ length: ROWS }, (_, z) => Array.from({ length: COLS }, (_, x) => (z === 0 || z === ROWS - 1 || x === 0 || x === COLS - 1 || (x === 7 && z !== 3) ? '#' : '.')).join('')),
  heights: Array.from({ length: ROWS }, () => '.'.repeat(8) + '6'.repeat(COLS - 8)), doors: [],
  sectors: [{ id: 'lift', cells: [[2, 2], [3, 2], [2, 3], [3, 3]], low: 0, high: 1, speed: 1 }],
  entities: [{ type: 'player', at: [1, 1] }, { type: 'exit', at: [12, 6] }, { type: 'switch', id: 'lv', at: [1, 6], wall: 'south', do: [{ sector: { id: 'lift', to: 'high' } }] }] });
const world = () => createWorld(map(), { seed: 1 });
const c = (w, cx, cz) => [(cx + 0.5) * w.map.cell, (cz + 0.5) * w.map.cell];

test('over a raised floor debris stops at that floor (3 m), not at world zero; over flat ground it still stops at 0', () => {
  const w = world(), [rx, rz] = c(w, 10, 4), [fx, fz] = c(w, 4, 4);
  assert.equal(debrisFloor(w, rx, rz, 0), 3, 'raised floor'); assert.equal(debrisFloor(w, fx, fz, 0), 0, 'flat floor');
});
test('debris over a moving floor lands on the floor at its CURRENT height', () => {
  const w = world(), [x, z] = c(w, 2, 2); assert.equal(debrisFloor(w, x, z, 0), 0); w.sectors[0].h = 0.75; assert.equal(debrisFloor(w, x, z, 0), 0.75);
});
test('an impact on a wall starts inside the wall cell: the debris lands on the room it came from, not on the wall cell\'s own (zero) floor', () => {
  const w = world(), [wx, wz] = c(w, 7, 4);                                      // the wall column, one step into it from the raised side
  const spawn = spawnGround(w, wx + 0.8, wz); assert.equal(spawn, 3, 'the open neighbour is 3 m up');
  assert.equal(debrisFloor(w, wx + 0.8, wz, spawn), 3, 'still inside the wall cell: lands on the raised room');
  assert.equal(debrisFloor(w, ...c(w, 10, 4), spawn), 3, 'then on the terrain under it');
});
test('flat maps (no heights, no sectors) are untouched: the floor is 0 everywhere', () => {
  const flat = parseMap({ format: 1, id: 'F', version: 1, name: 'Flat', ceilingHeight: 4, grid: ['######', '#....#', '######'], doors: [], entities: [{ type: 'player', at: [1, 1] }, { type: 'exit', at: [4, 1] }] });
  const w = createWorld(flat, { seed: 1 }); assert.equal(debrisFloor(w, 4, 3, 0), 0); assert.equal(spawnGround(w, 4, 3), 0);
});
