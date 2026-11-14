// design/VISUAL_AWE_PLAN.md, session A5: light shafts where a roofed room opens onto the sun. They are found from the grid and the sun's direction,
// they stop at walls, they only add light (additive, no depth written), and they fade to nothing at the floor.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import * as THREE from 'three';
import { SHAFTS, findOpenings, buildShafts } from '../src/render/shafts.js';
import { LOOKS, lookOf } from '../src/engine/defs.js';
import { parseMap } from '../src/engine/mapformat.js';
import { ROOT } from './helpers.js';

// a room (R) west of a yard (o), walls (#) round both: the opening is the whole shared edge
const grid = ['#######', '#RRRoo#', '#RRRoo#', '#######'],
  toy = (ceil = 3) => ({
    w: 7,
    h: 4,
    cell: 2,
    dark: false,
    spawn: { x: 3, z: 3 },
    kind: (cx, cz) => ({ '#': 'wall', R: 'floor', o: 'outdoor' })[grid[cz]?.[cx] ?? '#'],
    floor: () => 0,
    ceilingAt: () => ceil,
  });

test('a sun in the east shines through an east-facing opening and not when it stands in the west or overhead', () => {
  const east = findOpenings(toy(), [10, 8, 0]); // the sun stands east: its light travels west, into the room
  assert.equal(east.length, 2, 'the two cells of the room that touch the yard');
  for (const o of east) {
    assert.deepEqual([o.dx, o.dz], [-1, 0]);
    assert.equal(o.cx, 3);
    assert.ok(o.len > 0.8 && o.len <= SHAFTS.maxLen);
    assert.ok(o.len <= 6 + 1e-9, 'the light stops at the room`s far wall (three cells of 2 m)');
  }
  assert.equal(findOpenings(toy(), [-10, 8, 0]).length, 0, 'a sun behind the room sends nothing in');
  assert.equal(findOpenings(toy(), [0.2, 10, 0]).length, 0, 'a sun overhead barely enters');
  assert.equal(findOpenings(toy(), [10, 0.5, 0]).length, 0, 'a sun on the horizon is not drawn');
});

test('a lower sun reaches further across the floor, up to the limit', () => {
  const hi = findOpenings(toy(), [10, 14, 0])[0],
    lo = findOpenings(toy(), [10, 6, 0])[0];
  assert.ok(lo.len > hi.len);
});

test('the mesh only adds light, writes no depth, and is dark where it meets the floor', () => {
  const m = buildShafts(toy(), { sun: [0xffcc88, 1.5, [10, 8, 0]] });
  assert.ok(m && m.userData.shafts === 2);
  assert.equal(m.material.blending, THREE.AdditiveBlending);
  assert.equal(m.material.depthWrite, false);
  const pos = m.geometry.getAttribute('position'),
    col = m.geometry.getAttribute('color');
  let low = 0;
  for (let i = 0; i < pos.count; i++) {
    const k = Math.max(col.getX(i), col.getY(i), col.getZ(i));
    assert.ok(k <= SHAFTS.strength + 1e-9);
    if (pos.getY(i) < 0.2) {
      assert.equal(k, 0, 'nothing at the floor');
      low++;
    }
  }
  assert.ok(low > 0);
  assert.equal(buildShafts({ ...toy(), dark: true }, { sun: [0xffffff, 1, [10, 8, 0]] }), null, 'a dark (lantern) map has none');
});

test('every shipped map builds its shafts without a bad number, and never more than the cap', () => {
  let withShafts = 0;
  for (const f of fs.readdirSync(path.join(ROOT, 'maps')).filter((x) => x.endsWith('.json'))) {
    const map = parseMap(JSON.parse(fs.readFileSync(path.join(ROOT, 'maps', f), 'utf8'))),
      m = buildShafts(map, lookOf(map.atmosphere));
    if (!m) continue;
    withShafts++;
    assert.ok(m.userData.shafts <= SHAFTS.cap, f);
    const pos = m.geometry.getAttribute('position');
    for (let i = 0; i < pos.count; i++) assert.ok(Number.isFinite(pos.getX(i)) && Number.isFinite(pos.getY(i)) && Number.isFinite(pos.getZ(i)), f);
  }
  assert.ok(withShafts >= 10, 'maps with at least one shaft: ' + withShafts);
  assert.ok(LOOKS.harbour.sun[2].length === 3);
});
