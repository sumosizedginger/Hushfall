// PT-008: tools/dev/map-feel.mjs measures how enclosed a map is (roofed share, sightlines, enemy density, alien props). Pinned on a small synthetic map and run over every shipped map.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { mapFeel } from '../tools/dev/map-feel.mjs';
import { ROOT } from './helpers.js';

// 20 x 9: a walled 3 x 3 room of interior planks `.` (roofed) with a door onto an open-air plain of cobble `:`
const rows = Array.from({ length: 9 }, (_, z) => (z === 0 || z === 8 ? 'B'.repeat(20) : 'B' + ':'.repeat(18) + 'B'));
const set = (x, z, c) => { rows[z] = rows[z].slice(0, x) + c + rows[z].slice(x + 1); };
for (let z = 2; z <= 6; z++) for (let x = 2; x <= 6; x++) set(x, z, (x === 2 || x === 6 || z === 2 || z === 6) ? 'B' : '.');
set(6, 4, 'D');
const src = { format: 1, id: 'FEEL', version: 1, name: 'feel', ceilingHeight: 5, grid: rows, doors: [{ at: [6, 4] }],
  entities: [{ type: 'player', at: [10, 4] }, { type: 'enemy', kind: 'tollbearer', at: [15, 4] }, { type: 'prop', kind: 'pod', at: [4, 4] }, { type: 'exit', at: [17, 4] }] };

test('the roofed share counts interior floor and doors, never the open plain; density, first-enemy distance and alien props are read from the entities', () => {
  const r = mapFeel(src);
  assert.equal(r.ceiling, 5);
  // the plain is 18 x 7 = 126 cells, the 5 x 5 room block takes 25 of them, leaving 101 open cells; the room adds 3 x 3 = 9 interior cells and one door cell: 111 walkable, 10 roofed = 9%
  assert.equal(r.walkable, 111); assert.equal(r.roofedPct, 9);
  assert.equal(r.enemies, 1); assert.equal(r.first, 5); assert.equal(r.aliens, 1);
  assert.equal(r.density, Math.round(1000 / r.walkable));
  assert.ok(r.sightP90 >= r.sightMedian);
});

test('every shipped map can be measured; the roofed share is a percentage and the sightlines are positive', () => {
  for (const f of fs.readdirSync(path.join(ROOT, 'maps')).filter((x) => x.endsWith('.json'))) {
    const r = mapFeel(JSON.parse(fs.readFileSync(path.join(ROOT, 'maps', f), 'utf8')));
    assert.ok(r.roofedPct >= 0 && r.roofedPct <= 100 && r.sightMedian > 0 && r.walkable > 0, f);
  }
});
