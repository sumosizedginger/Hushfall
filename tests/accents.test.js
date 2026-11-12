// G3 room accents (Session 12 of design/OPUS_HANDOFF.md): tools/mapkit/accents.mjs floorBorder lays a second floor skin round a room's edge, only
// on cells of the room's own skin, only to a skin of the same surface family (so the simulation and its events cannot move), and a seed on a pillar
// steps to the nearest floor cell.
import test from 'node:test';
import assert from 'node:assert/strict';
import { Level } from '../tools/mapkit/builder.mjs';
import { floorBorder } from '../tools/mapkit/accents.mjs';

const room = () => {
  const L = new Level(7, 6);
  for (let z = 1; z <= 4; z++) for (let x = 1; x <= 5; x++) L.g[z][x] = 'f';
  L.g[2][3] = 'I'; // a pillar in the middle
  return L;
};

test('the band: every cell of the room that touches a non-floor cell, and nothing else', () => {
  const L = room(),
    n = floorBorder(L, [[2, 2]], 'f', 't');
  const rows = L.g.map((r) => r.join(''));
  // the cells round the pillar touch it, so they are band too; only (2,3) and (4,3) are inside
  assert.deepEqual(rows, ['#######', '#ttttt#', '#ttItt#', '#tftft#', '#ttttt#', '#######']);
  assert.equal(n, rows.join('').split('t').length - 1);
});

test('a skin of another surface family is refused, and so is a seed with no floor near it', () => {
  assert.throws(() => floorBorder(room(), [[2, 2]], 'f', 'g'), /different surface families/);
  assert.throws(() => floorBorder(room(), [[2, 2]], 'f', 'Q'), /must both be floor skins/);
  assert.throws(() => floorBorder(room(), [[2, 2]], 'f', 's'), /different kinds/, "slate is 'outdoor': it would open the sky");
  const L = new Level(9, 9);
  assert.throws(() => floorBorder(L, [[4, 4]], 'f', 't'), /no 'f' within three cells/);
});

test('a seed on a pillar stands for its room', () => {
  const L = room();
  assert.ok(floorBorder(L, [[3, 2]], 'f', 't') > 0);
});
