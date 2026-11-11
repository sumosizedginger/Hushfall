// THE CORNER MAP IS NEVER EMPTY (Session 2 of design/OPUS_HANDOFF.md, item G5): on a fresh level the walls round the player are drawn as a dim
// outline from the map data, and a goal with a known spot outside the window gets a tick on the border in its direction. Shell side only.
import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { minimapView, drawMinimap, nearbyCells, objectiveTarget, MINIMAP } from '../src/game/minimap.js';
import { createWorld } from '../src/engine/world.js';
import { automapModel, EXPLORE_RADIUS_CELLS } from '../src/engine/automap.js';
import { loadMapFile } from '../src/engine/harness.js';
import { ROOT } from './helpers.js';

/** a stand-in 2D context that records each lineTo with the stroke style in force, and every path's points */
function recorder() {
  const lines = [],
    paths = [];
  let cur = [];
  const ctx = {
    strokeStyle: '',
    fillStyle: '',
    lineWidth: 1,
    beginPath: () => (cur = []),
    moveTo: (x, y) => cur.push([x, y]),
    lineTo: (x, y) => {
      cur.push([x, y]);
      lines.push(ctx.strokeStyle);
    },
    closePath: () => paths.push({ pts: cur.slice(), fill: ctx.fillStyle }),
    clearRect() {},
    fillRect() {},
    strokeRect() {},
    stroke() {},
    fill() {},
    arc() {},
  };
  return { ctx, lines, paths };
}

test('a fresh level: nothing explored, yet the walls within the explore radius are drawn in the dim line', () => {
  const w = createWorld(loadMapFile(path.join(ROOT, 'maps', 'C1E1M01.json')), { seed: 1, difficulty: 'normal' }),
    model = automapModel(w);
  assert.ok(model.cells.length < MINIMAP.sparse, 'the corner map starts (nearly) empty: ' + model.cells.length);
  model.near = nearbyCells(w.map, w.player);
  assert.equal(model.near.length, (2 * EXPLORE_RADIUS_CELLS + 1) ** 2);
  const v = minimapView(model, MINIMAP.sizes.small.r);
  assert.ok(v.near.length > 0);
  const { ctx, lines } = recorder();
  drawMinimap({ width: 0, height: 0, getContext: () => ctx }, model, 'small');
  const dim = lines.filter((s) => s.startsWith('rgba(212,228,223')).length;
  assert.ok(dim > 0, 'dim wall lines drawn: ' + dim);
  // a well-explored window draws no hint
  const full = { ...model, cells: model.near.map((c) => ({ cx: c.cx, cz: c.cz, kind: c.kind })).concat(model.near.map((c) => ({ cx: c.cx + 11, cz: c.cz, kind: c.kind }))) };
  assert.equal(minimapView(full, MINIMAP.sizes.small.r).near.length, 0, 'enough explored: no hint');
});

test('nearbyCells never shows a secret and treats off the map as wall', () => {
  const kinds = { '1,1': 'secret', '2,1': 'floor' },
    map = { w: 3, h: 3, cell: 2, kind: (cx, cz) => kinds[cx + ',' + cz] ?? 'wall' },
    near = nearbyCells(map, { x: 3, z: 3 }, 2);
  assert.equal(near.find((c) => c.cx === 1 && c.cz === 1).kind, 'wall');
  assert.equal(near.find((c) => c.cx === 2 && c.cz === 1).kind, 'floor');
  assert.equal(near.find((c) => c.cx === -1 && c.cz === 0).kind, 'wall');
});

test('a seen exit far to the east puts a tick on the east edge; one inside the window, or none at all, puts no tick', () => {
  const S = 2,
    r = MINIMAP.sizes.small.r,
    s = MINIMAP.sizes.small.s,
    size = (2 * r + 1) * s,
    model = { w: 200, h: 200, cell: S, cells: [], doors: [], exits: [{ x: 61 + 60 * S, z: 61, locked: false }], switches: [], player: { x: 61, z: 61, yaw: 0 } };
  model.target = objectiveTarget(model);
  assert.deepEqual(model.target, { x: 61 + 60 * S, z: 61 });
  const v = minimapView(model, r);
  assert.ok(v.tick && v.tick.fx > r && Math.abs(v.tick.fz) < 1e-9, 'the tick points east');
  const { ctx, paths } = recorder();
  drawMinimap({ width: 0, height: 0, getContext: () => ctx }, model, 'small');
  const wedge = paths.at(-1);
  assert.ok(wedge.pts[0][0] >= size - 2, 'the tick sits on the east edge: x ' + wedge.pts[0][0] + ' of ' + size);
  assert.ok(Math.abs(wedge.pts[0][1] - size / 2) < s, 'level with the player');
  assert.equal(minimapView({ ...model, target: { x: 65, z: 61 } }, r).tick, null, 'inside the window: the exit itself is drawn, no tick');
  assert.equal(objectiveTarget({ ...model, exits: [] }), null, 'no known spot: nothing');
  assert.equal(minimapView({ ...model, target: null }, r).tick, null);
});
