// PT-082: the hand-drawn plan (tools/mapkit/sketch.mjs): a picture in characters becomes tiles, heights and lids; marks stand on the floor beside them and say where things go; a stray character fails loudly.
import test from 'node:test';
import assert from 'node:assert/strict';
import { Level } from '../tools/mapkit/builder.mjs';
import { sketch } from '../tools/mapkit/sketch.mjs';

const PLAN = `
#####
#..T#
#,,,#
#####
`;
const legend = { '#': { t: '$' }, '.': { t: '-', h: 0 }, ',': { t: '.', h: 4, lid: 9 } };

test('a plan sets tiles, heights and lids; a mark takes the floor beside it and is found by its character', () => {
  const L = new Level(5, 4, { fill: '!' }), S = sketch(L, PLAN, legend, { marks: 'T' });
  assert.equal(L.g[1][1], '-'); assert.equal(L.g[2][2], '.'); assert.equal(L.ht[2][2], 4); assert.equal(L.g[0][0], '$');
  assert.deepEqual(S.one('T'), [3, 1]); assert.equal(L.g[1][3], '-', 'the mark stands on the floor to its left'); assert.equal(L.ht[1][3], 0);
  assert.deepEqual(S.cells(','), [[1, 2], [2, 2], [3, 2]]); assert.equal(S.w, 5); assert.equal(S.h, 4);
});

test('a character that is neither in the legend nor a mark, a mark with no floor beside it, or a single mark found twice, fails', () => {
  assert.throws(() => sketch(new Level(5, 4), PLAN.replace('T', 'Q'), legend, { marks: 'T' }), /'Q'/);
  assert.throws(() => sketch(new Level(3, 3), '\n###\n#T#\n###\n', { '#': { t: '$' } }, { marks: 'T' }), /no floor/);
  const S = sketch(new Level(5, 4), PLAN.replace('..T', 'T.T'), legend, { marks: 'T' }); assert.throws(() => S.one('T'), /2 times/);
});
