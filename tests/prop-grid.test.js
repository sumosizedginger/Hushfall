// THE PROP GRID (Session 3 of design/OPUS_HANDOFF.md, item C11): blockedCircle and hasLOS ask only the props near a probe, from a grid built once per
// map. The proof that no answer changed is the route fingerprint (tools/dev/fp-par.mjs, every run identical); this test keeps it held in the suite:
// on the map that was slowest (C2M10, 107 props) the grid's answers equal the old scan of every prop at thousands of seeded probes, and the grid
// never reaches a save.
import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { createWorld, step, drainEvents } from '../src/engine/world.js';
import { blockedCircle, hasLOS, cellSolid } from '../src/engine/simcore.js';
import { floorAt } from '../src/engine/terrain.js';
import { PROPS } from '../src/engine/defs.js';
import { loadMapFile } from '../src/engine/harness.js';
import { makeSave } from '../src/engine/save.js';
import { ROOT } from './helpers.js';

/** the old hasLOS, word for word: every prop tested at every sample */
function hasLOSScan(w, x0, z0, x1, z1) {
  const S = w.map.cell,
    d = Math.hypot(x1 - x0, z1 - z0),
    n = Math.ceil(d / 0.4),
    flat = w.map.flat && w.map.sectors.length === 0;
  const ya = flat ? 0 : floorAt(w, x0, z0) + 1.4,
    yb = flat ? 0 : floorAt(w, x1, z1) + 1.4;
  for (let i = 1; i < n; i++) {
    const t = i / n,
      x = x0 + (x1 - x0) * t,
      z = z0 + (z1 - z0) * t;
    if (cellSolid(w, Math.floor(x / S), Math.floor(z / S))) return false;
    if (!flat && floorAt(w, x, z) > ya + (yb - ya) * t - 0.1) return false;
    for (const p of w.map.props) if (PROPS[p.kind].blocksSight && (x - p.x) ** 2 + (z - p.z) ** 2 < PROPS[p.kind].radius ** 2) return false;
  }
  return true;
}
/** the old prop part of blockedCircle */
const propScan = (w, x, z, r) => w.map.props.some((p) => PROPS[p.kind].radius > 0 && (x - p.x) ** 2 + (z - p.z) ** 2 < (r + PROPS[p.kind].radius) ** 2);

test('on C2M10 the grid answers as the old scan did: line of sight between seeded points, and props blocking a body', () => {
  const w = createWorld(loadMapFile(path.join(ROOT, 'maps', 'C2M10.json')), { seed: 3, difficulty: 'normal' }),
    S = w.map.cell,
    W = w.map.w * S,
    H = w.map.h * S;
  assert.ok(w.map.props.length > 100, 'the map with many props');
  let s = 12345;
  const rnd = () => ((s = (s * 1103515245 + 12345) % 2147483648) / 2147483648);
  let los = 0,
    blocked = 0,
    propHits = 0;
  for (let i = 0; i < 3000; i++) {
    const x0 = rnd() * W,
      z0 = rnd() * H,
      x1 = x0 + (rnd() - 0.5) * 30,
      z1 = z0 + (rnd() - 0.5) * 30;
    const a = hasLOS(w, x0, z0, x1, z1);
    assert.equal(a, hasLOSScan(w, x0, z0, x1, z1), `LOS ${x0},${z0} -> ${x1},${z1}`);
    if (a) los++;
    const r = 0.2 + rnd() * 0.8,
      b = blockedCircle(w, x0, z0, r);
    // with no mover the only things blockedCircle tests besides props are solid cells (walls, doors, water, void): it may be blocked by those,
    // but whenever a prop alone would block, it must say so, and whenever it is free no prop may be touching
    if (propScan(w, x0, z0, r)) {
      propHits++;
      assert.equal(b, true, `a prop blocks ${x0},${z0} r ${r}`);
    }
    if (!b) assert.equal(propScan(w, x0, z0, r), false);
    if (b) blocked++;
  }
  assert.ok(los > 100 && blocked > 100 && propHits > 20, `the probes met all cases: los ${los}, blocked ${blocked}, props ${propHits}`);
});

test('the grid is never part of the map as data, nor of a save', () => {
  const w = createWorld(loadMapFile(path.join(ROOT, 'maps', 'C2M10.json')), { seed: 1, difficulty: 'normal' });
  for (let i = 0; i < 60; i++) {
    step(w, { move: [0, 1], yaw: 0.02, pitch: 0, fire: false, aim: false, sprint: false, use: false, weapon: null, weaponStep: 0 });
    drainEvents(w);
  }
  assert.ok(w.map._propGrid, 'the grid was built');
  assert.ok(!Object.keys(w.map).includes('_propGrid'), 'not enumerable');
  assert.ok(!JSON.stringify(makeSave(w, 'quick')).includes('_propGrid'), 'not in a save');
});
