// PT-021, rooms that are not boxes: the shaping kit (tools/mapkit/shape.mjs) is safe by construction. A bay is cut only out of solid wall and never touches another room, a door, a panel or the map's edge; a corner is cut only where
// nothing stands and no route walks; what cannot be done is skipped, not half done. And every authored mark of a shipped map sits where it says: a wall mark on a wall, a floor mark on floor that is not wet.
import test from 'node:test';
import assert from 'node:assert/strict';
import { Level } from '../tools/mapkit/builder.mjs';
import { Shape } from '../tools/mapkit/shape.mjs';
import { shippedMap } from './helpers.js';
import fs from 'node:fs';
import path from 'node:path';

// room A (x 2..13, z 3..12), a wall one cell thick east of it, room B (x 15..20, z 3..12) beyond; solid rock north and south; a door at (14, 8) joining them
const level = () => { const L = new Level(24, 20); L.room([2, 3, 13, 12], { floor: 'f', wall: 'W' }); L.room([15, 3, 20, 12], { floor: 't', wall: 'P' }); L.door(14, 8); L.put(5, 4, 't'); return L; };
const cells = (L, ch) => { let n = 0; for (const row of L.g) for (const c of row) if (c === ch) n++; return n; };

test('a bay is cut out of solid wall: floor where it was wall, the room unchanged, one wall left between the bay and the rock', () => {
  const L = level(), S = new Shape(L), before = cells(L, 'f');
  assert.equal(S.bay(7, 2, 'n', { w: 3, d: 1, heart: true }), true);
  for (const [x, z] of [[6, 2], [7, 2], [8, 2], [7, 1]]) assert.equal(L.get(x, z), 'f', `${x},${z} is floor`);
  assert.equal(L.get(7, 0), '#', 'solid rock behind the heart'); assert.equal(L.get(5, 2), 'W', 'the wall either side stays'); assert.equal(cells(L, 'f'), before + 4, 'three cells and a heart');
  assert.equal(S.report.bays, 1); assert.equal(S.bayLog[0].deep[0], 7);
});

test('a bay refuses: the map edge, a cell that is not wall, a touch on another room, a door, a switch wall, an even width', () => {
  const L = level(), S = new Shape(L, { keep: [[4, 2]] });
  assert.equal(S.bay(7, 2, 'n', { w: 3, d: 1, heart: true }), true);
  assert.equal(S.bay(7, 2, 'n', { w: 3 }), false, 'cut twice: the cells are floor now');
  assert.equal(S.bay(14, 6, 'e', { w: 3, d: 1 }), false, 'the wall between A and B: the bay would touch B (or the door)');
  assert.equal(S.bay(14, 8, 'e', { w: 1, d: 1 }), false, 'a door is not wall');
  assert.equal(S.bay(4, 2, 'n', { w: 3, d: 1 }), false, 'the wall a switch is set in stays');
  assert.equal(S.bay(1, 7, 'w', { w: 3, d: 1 }), true, 'the west wall has solid rock behind it');
  assert.equal(S.bay(10, 2, 'n', { w: 2, d: 1 }), false, 'even width');
  const tight = new Shape(L); assert.equal(tight.bay(7, 13, 's', { w: 3, d: 8 }), false, 'too close to the edge of the map');
  assert.ok(S.report.skipped.length >= 4);
});

test('bays along a wall are spaced and centred, and the ones that cannot be cut are skipped, not forced', () => {
  const L = level(), S = new Shape(L); S.bays('n', 2, 3, 12, { w: 3, gap: 2, d: 1 });
  assert.equal(S.report.bays, 2, 'ten cells hold two bays of three with a gap of two'); const xs = S.bayLog.map((b) => b.x); assert.deepEqual(xs, [5, 10]);
  const S2 = new Shape(level()); S2.bays('e', 14, 4, 11, { w: 3, gap: 1, d: 1 }); assert.equal(S2.report.bays, 0, 'every one of them would touch room B or the door');
});

test('a corner is cut only where nothing stands in or beside it and nobody walks there, and falls back to a smaller cut', () => {
  const L = level(), S = new Shape(L); L.ob[4][5] = '.'; L.put(9, 9, 't');
  S.chamfer([2, 3, 13, 12], 'nw', 3); for (const [x, z] of [[2, 3], [3, 3], [4, 3], [2, 4], [3, 4], [2, 5]]) assert.equal(L.get(x, z), 'W', `${x},${z} is cut`); assert.equal(L.get(5, 3), 'f', 'the cut is a triangle of six'); assert.equal(S.report.corners, 1);
  const L0 = level(), S0 = new Shape(L0); S0.chamfer([2, 3, 13, 12], 'nw', 3);
  assert.equal(L0.get(4, 3), 'f', 'a Tollbearer at (5, 4) is beside (4, 3): the cut falls back from six cells to three'); assert.equal(L0.get(3, 3), 'W'); assert.equal(L0.get(2, 4), 'W'); assert.equal(L0.get(3, 4), 'f');
  const L1 = level(); L1.ob[4][5] = '.'; L1.put(3, 3, 't'); const S1 = new Shape(L1); S1.chamfer([2, 3, 13, 12], 'nw', 3); assert.equal(L1.get(2, 3), 'f', 'an object at (3,3) is beside every size of cut: none'); assert.equal(S1.report.corners, 0);
  const L2 = level(); L2.ob[4][5] = '.'; L2.put(2, 3, 't'); const S2 = new Shape(L2); S2.chamfer([2, 3, 13, 12], 'nw', 3);
  assert.equal(L2.get(2, 3), 'f', 'an object in the corner: no cut at any size'); assert.equal(S2.report.corners, 0);
  const L3 = level(), lane = new Set(['3,4']), S3 = new Shape(L3, { lane }); L3.ob[4][5] = '.'; S3.chamfer([2, 3, 13, 12], 'nw se', 2); assert.equal(L3.get(2, 3), 'f', 'someone walks within a cell of the corner'); assert.ok(['W', 'P'].includes(L3.get(13, 12)), 'the other corner is cut'); assert.equal(S3.report.corners, 1);
});

test('props go only on free floor, never on the lane, and a prop sits in every bay it was asked for', () => {
  const L = level(), S = new Shape(L, { lane: new Set(['7,2']) }); S.bay(7, 2, 'n', { w: 3, d: 1 }); S.bay(11, 2, 'n', { w: 3, d: 1 }); S.dressBays('lamp');
  assert.equal(S.dressing().length, 1, 'the bay whose heart is on the lane gets none'); assert.deepEqual(S.dressing()[0], { type: 'prop', kind: 'lamp', at: [11, 2] });
  S.dress('crate', [[5, 4], [6, 4]]); assert.equal(S.dressing().length, 2, 'not on the Tollbearer at (5, 4)');
});

test('every authored mark of a shipped map sits where it says: wall marks on a wall, floor marks on dry floor', () => {
  const bad = [], root = path.resolve(import.meta.dirname, '..'), ids = fs.readdirSync(path.join(root, 'maps')).filter((f) => f.endsWith('.json')).map((f) => f.replace('.json', '')); let n = 0;
  const DIRS = { north: [0, -1], south: [0, 1], west: [-1, 0], east: [1, 0] };
  for (const id of ids) {
    const m = shippedMap(id);
    for (const [i, d] of (m.decals ?? []).entries()) {
      const cx = Math.floor(d.at[0]), cz = Math.floor(d.at[1]), tag = `${id} decal #${i} (${d.kind} @${d.at})`; n++;
      if (['wall', 'door', 'secret', 'water'].includes(m.kind(cx, cz))) bad.push(`${tag}: stands on ${m.kind(cx, cz)}`);
      if (d.wall) { if (m.kind(cx + DIRS[d.wall][0], cz + DIRS[d.wall][1]) !== 'wall') bad.push(`${tag}: no wall on its ${d.wall} side`); } else if (m.fx(cx, cz) === 'w') bad.push(`${tag}: in wading water`);
    }
  }
  assert.deepEqual(bad, [], 'marks out of place: ' + bad.join(' | ')); assert.ok(n >= 40, 'the maps carry their marks: ' + n);
});
