// The last input of the game (2026-11-18, design/ENDING_REVIEW.md): at the Gate the door's breath puts the lamp out, the player lights it again, and
// while it is held lit the door tries to ring three times, each weaker; held ten seconds, it goes quiet, something answers with one note, and it
// opens. Put out, the count starts again.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { loadMapFile, runRoute } from '../src/engine/harness.js';
import { step } from '../src/engine/world.js';
import { conditionMet } from '../src/engine/script.js';

test('the Gate puts the lamp out, then rings three times while it is held lit, then answers and opens', () => {
  const map = loadMapFile('maps/C2M30.json'),
    route = JSON.parse(fs.readFileSync('routes/C2M30.main.route.json', 'utf8')),
    seen = [];
  const r = runRoute(map, route, {
    seed: 1,
    difficulty: 'normal',
    stepper: (w, c) => {
      step(w, c);
      for (const e of w.events) if (['trigger', 'lamp_out', 'exit_unlock'].includes(e.type)) seen.push({ t: w.time, what: e.id ?? e.type });
    },
  });
  assert.equal(r.result, 'complete');
  const at = (what) => seen.find((s) => s.what === what)?.t;
  assert.ok(at('lamp_out') >= at('gate-arrive'), 'the door breathes the lamp out on arrival');
  const rings = ['ring1', 'ring2', 'ring3', 'door'].map(at);
  assert.ok(rings.every((t) => t > at('lamp_out')), 'and every ring comes after it is lit again');
  for (let i = 1; i < rings.length; i++) assert.ok(rings[i] - rings[i - 1] >= 2.4, 'the rings come a few seconds apart, not at once');
});

test('lampheld counts from the moment the lamp was lit and is false while it is out', () => {
  const w = { time: 20, player: { lamp: { on: true, since: 15 } } };
  assert.equal(conditionMet(w, { when: 'lampheld:4' }), true);
  assert.equal(conditionMet(w, { when: 'lampheld:6' }), false);
  w.player.lamp.on = false;
  assert.equal(conditionMet(w, { when: 'lampheld:1' }), false);
});
