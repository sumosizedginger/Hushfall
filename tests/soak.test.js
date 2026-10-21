// PT-071 (R21 stability): a world played restlessly for a long time keeps no collection that grows without bound. The long version is `node tools/dev/soak.mjs` (60000 ticks on four maps was clean on 2026-10-20);
// this is the cheap one that holds it in the suite.
import test from 'node:test';
import assert from 'node:assert/strict';
import { soak } from '../tools/dev/soak.mjs';

test('three maps, nine thousand ticks of an immortal, restless player in a fight that never ends: nothing the world keeps keeps growing, and no step is slow', () => {
  for (const id of ['C1E1M01', 'C1E3M04', 'C2M21']) {
    const r = soak(id, 9000); assert.deepEqual(r.growth, {}, `${id}: ${JSON.stringify(r.growth)}`); assert.ok(r.slowestStepMs < 60, `${id}: the slowest step took ${r.slowestStepMs} ms`);
  }
});
