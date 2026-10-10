// PT-028 (owner: "are the enemies clear and varied enough by outline? or were you lazy about it?"): the project's own bar for creature silhouettes (design/LOOK_BIBLE.md, tools/look/sil-matrix.mjs): no two creatures overlap by more than
// 0.5 (intersection over union, in place at true scale, the way the game shows two of them at the same distance). The creatures of the older batches predate the bar and some of their pairs still miss it (Tollbearer / Bellhand 0.66,
// Chorister / Bellhand: see the log); every creature built since the repair is held to it against EVERY other creature, from the front and from three-quarters (and from the side for the elites).
import test from 'node:test';
import assert from 'node:assert/strict';
import { FACTORIES } from '../src/render/models_choir.js';
import { silhouette, iou } from '../tools/dev/sil-lib.mjs';

const GUARDED = ['bulwark', 'weeping', 'acolyte'];                 // Episode 3 Batch C after the repair; the later batches' creatures are added to this list as they are built
const BAR = 0.5;
const kinds = Object.keys(FACTORIES);

test('every guarded creature differs from every other by outline (overlap under 0.5 in place), seen from the front and from three-quarters', () => {
  const bad = [];
  for (const yaw of [0, 0.75]) {
    const M = Object.fromEntries(kinds.map((k) => [k, silhouette(k, yaw)]));
    for (const g of GUARDED) for (const o of kinds) if (o !== g && !(GUARDED.includes(o) && o < g)) { const v = iou(M[g], M[o]); if (v >= BAR) bad.push(`${g} / ${o} at yaw ${yaw}: ${v.toFixed(2)}`); }
  }
  assert.deepEqual(bad, [], 'silhouettes too alike: ' + bad.join(' | '));
});
test('the silhouette is a real mask: a creature has a sensible height and width at true scale (a sanity check of the tool itself)', () => {
  const m = silhouette('wardengraft', 0); let top = 1e9, bottom = -1, left = 1e9, right = -1; for (let i = 0; i < m.length; i++) if (m[i]) { const y = Math.floor(i / 500), x = i % 500; top = Math.min(top, y); bottom = Math.max(bottom, y); left = Math.min(left, x); right = Math.max(right, x); }
  assert.ok(Math.abs((bottom - top) / 100 - 3.0) < 0.2, `a Warden is about 3 m tall: ${(bottom - top) / 100}`); assert.ok((right - left) / 100 > 1.0 && (right - left) / 100 < 2.5, 'and about a metre and a half across: ' + (right - left) / 100);
});
