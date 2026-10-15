// GEMINI HOSTILE QA: MEMORY & RESOURCE LEAK TEST SUITE
// Run with: node --test attack/gemini/tests/leak_gemini.test.js
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';

import { parseMap } from '../../../src/engine/mapformat.js';
import { createWorld, step, spawnEnemy } from '../../../src/engine/world.js';
import { makeBeamView, makeSweepView } from '../../../src/render/beamfx.js';
import { makeTideView } from '../../../src/render/tidefx.js';
import { makeChimeView } from '../../../src/render/chimefx.js';

test('LEAK-01: makeChimeView creates CanvasTextures that lack a dispose method and are never disposed', () => {
  const map = parseMap({
    format: 1, id: 'CHIME1', version: 1, name: 'ChimeTest', cellSize: 2,
    grid: ['#####', '#...#', '#...#', '#...#', '#####'],
    doors: [], secrets: [],
    props: [{ kind: 'chime', at: [2, 2], note: 0, id: 1 }],
    entities: [{ type: 'player', at: [1, 1], facing: 'east' }, { type: 'exit', at: [3, 3] }]
  });

  const cv = makeChimeView(map);
  assert.equal(typeof cv.dispose, 'undefined', 'makeChimeView must provide a dispose() method for its 5 CanvasTextures');
});

test('LEAK-02: makeTideView clones texture but lacks a dispose method to release the cloned GPU texture', () => {
  const tex = { water_dusk: new THREE.Texture() };
  let disposed = false;
  tex.water_dusk.clone = () => {
    const t = new THREE.Texture();
    t.dispose = () => { disposed = true; };
    return t;
  };

  const map = parseMap({
    format: 1, id: 'TIDE1', version: 1, name: 'TideTest', cellSize: 2,
    grid: ['#####', '#...#', '#...#', '#...#', '#####'],
    doors: [], secrets: [], tide: { levels: [[0, -2], [10, 1], [20, -2]], loop: 30 },
    entities: [{ type: 'player', at: [1, 1], facing: 'east' }, { type: 'exit', at: [3, 3] }]
  });

  const tv = makeTideView(map, tex);
  assert.equal(typeof tv.dispose, 'undefined', 'makeTideView must provide a dispose() method');
  assert.equal(disposed, false, 'Cloned tide texture remains undisposed without lifecycle hook');
});

test('LEAK-03: makeBeamView and makeSweepView dispose methods exist but are omitted from GameView.dispose()', () => {
  const sv = makeSweepView();
  assert.equal(typeof sv.dispose, 'function', 'makeSweepView implements dispose()');
});

test('LEAK-04: Brood Vat infinite enemy corpse accumulation in w.enemies array', () => {
  const map = parseMap({
    format: 1, id: 'VAT1', version: 1, name: 'VatTest', cellSize: 2,
    grid: ['#######', '#.....#', '#.....#', '#.....#', '#######'],
    doors: [], secrets: [],
    entities: [
      { type: 'player', at: [1, 1], facing: 'east' },
      { type: 'enemy', kind: 'vat', at: [3, 2] },
      { type: 'exit', at: [5, 2] }
    ]
  });

  const w = createWorld(map);
  const vat = w.enemies.find((e) => e.kind === 'vat');
  assert.ok(vat, 'Brood vat exists');

  // Spawn and kill 20 gaunts
  for (let i = 0; i < 20; i++) {
    const gaunt = spawnEnemy(w, 'gaunt', 3, 2);
    gaunt.state = 'dead';
    gaunt.dead = 1;
  }

  // Dead gaunts remain in w.enemies permanently
  assert.equal(w.enemies.length, 21, 'Every dead gaunt remains in w.enemies array');
});

test('LEAK-05: Headless simulation w.events accumulates linearly if drainEvents() is not called', () => {
  const map = parseMap({
    format: 1, id: 'EVT1', version: 1, name: 'EvtTest', cellSize: 2,
    grid: ['#####', '#...#', '#...#', '#...#', '#####'],
    doors: [], secrets: [],
    entities: [{ type: 'player', at: [1, 1], facing: 'east' }, { type: 'exit', at: [3, 3] }]
  });

  const w = createWorld(map);
  assert.equal(w.events.length, 0);

  // Fire weapon to emit events
  for (let t = 0; t < 60; t++) {
    step(w, { fire: t % 10 === 0, yaw: 0, pitch: 0 });
  }

  assert.ok(w.events.length > 0, `Events array grew to ${w.events.length} elements without automatic cap`);
});
