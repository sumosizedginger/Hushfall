// Audio contract tests that need no browser: every gameplay event is audible, sounds exist, panning is sane.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { soundsForEvent, panFor, SILENT_EVENTS } from '../src/audio/events.js';
import { SFX, seededRandom } from '../src/audio/synth.js';
import { runRoute } from '../src/engine/harness.js';
import { PICKUPS } from '../src/engine/defs.js';
import { loadMap, route, ROOT } from './helpers.js';

const emitted = () => [...new Set([...fs.readFileSync(path.join(ROOT, 'src/engine/world.js'), 'utf8').matchAll(/emit\(w, '([a-z_]+)'/g)].map((m) => m[1]))];

test('every event type the sim can emit has a sound (or is explicitly listed as silent)', () => {
  const types = emitted(); assert.ok(types.length >= 15, 'found the emit sites: ' + types.length);
  for (const type of types) {
    const s = soundsForEvent({ type, kind: 'tollbearer', weapon: 'flare', x: 1, z: 2 });
    assert.ok(s.length > 0 || type in SILENT_EVENTS, `event '${type}' makes no sound and is not declared silent`);
  }
});

test('every sound id the mapping can produce exists as a synth recipe', () => {
  const events = [
    ...emitted().map((type) => ({ type, kind: 'tollbearer', weapon: 'flare', x: 1, z: 2 })), ...emitted().map((type) => ({ type, kind: 'gaunt', weapon: 'scattergun', x: 1, z: 2 })),
    ...Object.keys(PICKUPS).map((kind) => ({ type: 'pickup', kind })), { type: 'weapon_pickup' }, { type: 'enemy_lunge', kind: 'gaunt', x: 1, z: 2 }, { type: 'impact', x: 1, z: 2 }, { type: 'weapon_switch' },
  ];
  for (const e of events) for (const s of soundsForEvent(e)) assert.equal(typeof SFX[s.id], 'function', `missing recipe '${s.id}' for event ${e.type}`);
});

test('events that happen somewhere in the world are positional; player-local ones are not', () => {
  for (const type of ['explode', 'door_open', 'door_close', 'door_locked', 'enemy_alert', 'enemy_windup', 'enemy_strike', 'enemy_hit', 'enemy_died']) {
    const s = soundsForEvent({ type, kind: 'tollbearer', x: 10, z: 20 });
    assert.ok(s.every((x) => Array.isArray(x.pos) && x.pos[0] === 10 && x.pos[1] === 20), type + ' should carry a position');
  }
  for (const type of ['hurt', 'pickup', 'dry', 'secret', 'level_complete', 'player_died']) assert.ok(soundsForEvent({ type, kind: 'health_small', amount: 12 }).every((x) => !x.pos), type + ' is player-local');
});

test('a real route only emits event types the audio layer knows about', () => {
  const r = runRoute(loadMap(), route('C1E1M01.secret'), { seed: 1 });
  const types = new Set(r.events.map((e) => e.type));
  for (const t of types) assert.ok(soundsForEvent(r.events.find((e) => e.type === t)).length > 0 || t in SILENT_EVENTS, 'unheard event in a real route: ' + t);
  for (const must of ['fire', 'explode', 'pickup', 'door_open', 'secret', 'enemy_died', 'level_complete']) assert.ok(types.has(must), 'route should exercise ' + must);
});

test('hurt volume scales with damage; pickups map by type', () => {
  const small = soundsForEvent({ type: 'hurt', amount: 5 })[0].gain, big = soundsForEvent({ type: 'hurt', amount: 40 })[0].gain;
  assert.ok(big > small && big <= 1);
  assert.equal(soundsForEvent({ type: 'pickup', kind: 'key_brass' })[0].id, 'pickup_key');
  assert.equal(soundsForEvent({ type: 'pickup', kind: 'armor_vest' })[0].id, 'pickup_armor');
  assert.equal(soundsForEvent({ type: 'pickup', kind: 'ammo_flare' })[0].id, 'pickup_ammo');
});

test('panning: a source to the listener\'s right pans right, left pans left, ahead is centred', () => {
  const yaw = -Math.PI / 2;                                  // facing +x (east); right-hand side is +z (south) in this sim
  assert.ok(panFor(0, 0, yaw, 0, 5) > 0.95, 'source to the right');
  assert.ok(panFor(0, 0, yaw, 0, -5) < -0.95, 'source to the left');
  assert.ok(Math.abs(panFor(0, 0, yaw, 9, 0)) < 1e-9, 'source dead ahead');
  const yaw2 = 0;                                            // facing -z (north): right is +x
  assert.ok(panFor(0, 0, yaw2, 5, 0) > 0.95);
});

test('recipes are individually deterministic given a seed (offline reproducibility)', () => {
  const a = seededRandom(7), b = seededRandom(7), c = seededRandom(8);
  const A = [a(), a(), a()], B = [b(), b(), b()], C = [c(), c(), c()];
  assert.deepEqual(A, B); assert.notDeepEqual(A, C); assert.ok(A.every((v) => v >= 0 && v < 1));
});
