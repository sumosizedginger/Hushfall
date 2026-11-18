// The corner map reads as rooms, not a black square (the outside playtest of 2026-11-18): the walls round every explored floor cell are drawn
// (engine/automap.js `shell`, drawing only), and the window is close enough that what you have seen fills a fair part of it.
// tools/dev/minimap-fill.mjs measures it over all 68 maps (median share of the window that is explored floor: 18% before, 33% after; the closer window did most of it, the shell adds the outline the line-of-sight test misses).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { parseMap } from '../src/engine/mapformat.js';
import { runRoute } from '../src/engine/harness.js';
import { automapModel } from '../src/engine/automap.js';
import { MINIMAP, minimapView } from '../src/game/minimap.js';

const load = (id) => [parseMap(JSON.parse(fs.readFileSync(`maps/${id}.json`, 'utf8'))), JSON.parse(fs.readFileSync(`routes/${id}.main.route.json`, 'utf8'))];

test('the shell: walls beside explored floor, never explored themselves, never a secret given away', () => {
  const [map, route] = load('C1E2M03');
  let model = null,
    world = null;
  runRoute(map, route, {
    maxTicks: 60 * 40,
    onTick: (w, t) => {
      if (t === 60 * 40) {
        model = automapModel(w);
        world = w;
      }
    },
  });
  assert.ok(model.shell.length > 10, 'a shell was drawn');
  const seen = new Set(model.cells.map((c) => c.cx + ',' + c.cz));
  for (const c of model.shell) {
    assert.ok(!seen.has(c.cx + ',' + c.cz));
    assert.equal(c.kind, 'wall');
    assert.ok(['wall', 'secret'].includes(world.map.kind(c.cx, c.cz)));
  }
  assert.equal(model.exploredCount, model.cells.length, 'the shell is not counted as explored');
});

test('the corner window: what was seen fills at least a quarter of it a minute in', () => {
  const [map, route] = load('C1E1M01');
  let share = 0;
  runRoute(map, route, {
    maxTicks: 3600,
    onTick: (w, t) => {
      if (t !== 3600) return;
      const { r } = MINIMAP.sizes.small,
        v = minimapView(automapModel(w), r);
      share = v.cells.length / (2 * r + 1) ** 2;
    },
  });
  assert.ok(share >= 0.25, `the corner map is ${(share * 100).toFixed(0)}% filled`);
});
