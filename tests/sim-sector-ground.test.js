// Moving floors carry whoever stands on them: an enemy's e.y must equal groundAt() every tick in EVERY state. updateEnemy used to return early for
// dead, staggered and node enemies BEFORE it refreshed e.y, so a corpse (or a Warden that crashed into a wall and lay stunned) on the funicular car
// kept the height it had when the floor started to move: the renderer, which draws e.y, then showed it floating or sunk in the car.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createWorld, step, spawnEnemy } from '../src/engine/world.js';
import { groundAt } from '../src/engine/terrain.js';
import { ENEMIES } from '../src/engine/defs.js';
import { parseMap } from '../src/engine/mapformat.js';

const idleCmd = { move: [0, 0], yaw: 0, pitch: 0, fire: false, aim: false, sprint: false, use: false, weapon: null, weaponStep: 0 };
// the player is walled off on the west; the east room holds a 2x2-cell lift (cells 8-9 x 3-4) that travels 0 -> 2 m
const GRID = ['##############', '#...#........#', '#...#........#', '#...#........#', '#...#........#', '#...#........#', '##############'];
const map = () => parseMap({ format: 1, id: 'SG', version: 1, name: 'Sector ground', ceilingHeight: 6, grid: GRID, doors: [], sectors: [{ id: 'lift', cells: [[8, 3], [9, 3], [8, 4], [9, 4]], low: 0, high: 2, speed: 1.5 }],
  entities: [{ type: 'player', at: [1, 1] }, { type: 'exit', at: [11, 1] }, { type: 'switch', id: 'lever', at: [1, 5], wall: 'south', do: [{ sector: { id: 'lift', to: 'high' } }] }] });
const centre = (m, cx, cz) => [(cx + 0.5) * m.cell, (cz + 0.5) * m.cell];

function scene(startHigh = false) {
  const m = map(), w = createWorld(m, { seed: 1 }); w.enemies.length = 0; if (startHigh) { w.sectors[0].h = 2; w.sectors[0].target = 2; } const put = (kind, cx, cz) => { const [x, z] = centre(m, cx, cz); return spawnEnemy(w, kind, x, z, 0); };
  const idle = put('tollbearer', 8, 3), stunned = put('wardengraft', 9, 3), dead = put('tollbearer', 8, 4), node = put('bellnode', 9, 4);
  stunned.state = 'chase'; stunned.stunT = 1e6; dead.state = 'dead'; dead.hp = 0; dead.dead = 1;
  return { w, m, enemies: { idle, stunned, dead, node } };
}

test('every enemy state keeps e.y equal to groundAt() while the floor under it moves (idle, staggered, dead, ring node)', () => {
  const { w, enemies } = scene(), bad = []; w.sectors[0].target = 2;
  for (let i = 0; i < 200 && Math.abs(w.sectors[0].h - 2) > 1e-9; i++) {
    step(w, idleCmd);
    for (const [name, e] of Object.entries(enemies)) { const g = groundAt(w, e.x, e.z, ENEMIES[e.kind].radius); if (Math.abs(e.y - g) > 1e-9) bad.push(`tick ${w.tick} ${name}: e.y ${e.y.toFixed(3)} but the floor under it is ${g.toFixed(3)}`); }
  }
  assert.ok(Math.abs(w.sectors[0].h - 2) < 1e-9, 'the lift reached the top');
  assert.equal(bad.length, 0, `${bad.length} stale heights, e.g. ${bad.slice(0, 3).join(' | ')}`);
  for (const [name, e] of Object.entries(enemies)) assert.ok(Math.abs(e.y - 2) < 1e-9, `${name} ends on the raised lift (y ${e.y})`);
});

test('and back down: from the raised lift, a corpse and a stunned enemy follow it to the bottom (a corpse that never updates would stay at 2 m)', () => {
  const { w, enemies } = scene(true); for (const e of Object.values(enemies)) assert.ok(Math.abs(e.y - 2) < 1e-9, 'they start on the raised lift');
  w.sectors[0].target = 0; for (let i = 0; i < 200; i++) step(w, idleCmd);
  assert.ok(Math.abs(w.sectors[0].h) < 1e-9, 'the lift reached the bottom');
  for (const [name, e] of Object.entries(enemies)) assert.ok(Math.abs(e.y) < 1e-9, `${name} is back at the bottom (y ${e.y})`);
});
