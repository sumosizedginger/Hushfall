// PT-029 (Episode 3, Batch D, the Resonance Loom): TIMING PLATFORMS (src/engine/platforms.js: a moving floor on a pure clock) and SOUND-LOCK DOORS (a door that listens: it opens to Use only after `quiet` s without noise near it). Every map here is
// a small synthetic corridor (2 m cells) so each assertion is about one mechanic.
import test from 'node:test';
import assert from 'node:assert/strict';
import { validateMap, parseMap } from '../src/engine/mapformat.js';
import { createWorld, step, drainEvents } from '../src/engine/world.js';
import { runRoute } from '../src/engine/harness.js';
import { platformState, platformReady, waitFor, moveTime, lowDwell, cycleHeight } from '../src/engine/platforms.js';

const idle = (o = {}) => ({ move: [0, 0], yaw: 0, pitch: 0, fire: false, aim: false, sprint: false, use: false, weapon: null, weaponStep: 0, map: false, ...o });
const run = (w, n, cmd = () => idle()) => { const ev = []; for (let i = 0; i < n; i++) { step(w, cmd(i)); ev.push(...drainEvents(w)); } return ev; };
const cell = (c) => (c + 0.5) * 2;
const bad = (s, re) => { const v = validateMap(s); assert.equal(v.ok, false, 'expected invalid'); assert.ok(v.errors.some((e) => re.test(e)), re + ' in ' + JSON.stringify(v.errors)); };

/** a corridor: a ledge (2 m up) at x 1..4, two timing platforms at x 5..6 and 7..8, a second ledge at x 9..18, the exit at x 17 */
const loomCorridor = (cycle1 = { period: 12, hold: 7, phase: 0 }, cycle2 = { period: 12, hold: 7, phase: 3 }) => ({
  format: 1, id: 'P1', version: 1, name: 'Platforms', grid: ['#'.repeat(20), '#' + '.'.repeat(18) + '#', '#'.repeat(20)], doors: [], secrets: [],
  heights: ['.'.repeat(20), '.' + '4444' + '0000' + '4'.repeat(10) + '.', '.'.repeat(20)],
  ceilings: ['.'.repeat(20), '.' + '....' + 'aaaa' + '.'.repeat(10) + '.', '.'.repeat(20)],                                  // 5 m over the platforms: 2.4 m of headroom at the top of their travel
  sectors: [{ id: 'p1', cells: [[5, 1], [6, 1]], low: 0, high: 2, speed: 2, cycle: cycle1 }, { id: 'p2', cells: [[7, 1], [8, 1]], low: 0, high: 2, speed: 2, cycle: cycle2 }],
  entities: [{ type: 'player', at: [2, 1], facing: 'east' }, { type: 'exit', at: [17, 1] }],
});
const doorCorridor = (soundlock = { quiet: 4 }) => ({
  format: 1, id: 'L1', version: 1, name: 'Sound lock', grid: ['#'.repeat(16), '#' + '.'.repeat(6) + 'D' + '.'.repeat(7) + '#', '#'.repeat(16)], doors: [{ at: [7, 1], soundlock }], secrets: [],
  entities: [{ type: 'player', at: [3, 1], facing: 'east' }, { type: 'exit', at: [13, 1] }],
});

test('a timing platform is a pure function of time: it holds at the top, sinks, waits at the bottom, rises, and a phase shifts it', () => {
  const def = { low: 0, high: 2, speed: 2, cycle: { period: 12, hold: 7, phase: 0 } };
  assert.equal(moveTime(def), 1); assert.equal(lowDwell(def), 3);
  const at = (t) => platformState(def, t);
  assert.deepEqual([at(0).phase, at(6.9).phase, at(7.5).phase, at(8.5).phase, at(11.5).phase, at(12.2).phase], ['high', 'high', 'down', 'low', 'up', 'high'].map((x, i) => (i === 5 ? 'high' : x)));
  assert.equal(at(3).h, 2); assert.ok(Math.abs(at(7.5).h - 1) < 1e-9, 'half way down'); assert.equal(at(9).h, 0); assert.ok(Math.abs(at(11.5).h - 1) < 1e-9, 'half way up'); assert.equal(at(13).h, at(1).h, 'the same on the next beat');
  assert.equal(platformState({ ...def, cycle: { ...def.cycle, phase: 3 } }, 4).phase, 'down', 'a phase of 3 s is 3 s further on'); assert.equal(cycleHeight(def, 1e6), cycleHeight(def, 1e6 % 12), 'no drift, whatever the time');
  assert.ok(platformReady(def, 1, 'high', 5) && !platformReady(def, 3, 'high', 5), 'ready only while enough of the dwell is left'); assert.ok(Math.abs(waitFor(def, 8, 'high', 2) - 4) < 0.05, 'a person who arrives at 8 s waits until the 12 s beat: ' + waitFor(def, 8, 'high', 2));
});

test('the map format: a cycle needs a real period, hold and wait at the bottom; a cycling platform may not also be driven by a switch or trigger', () => {
  assert.equal(validateMap(loomCorridor()).ok, true);
  bad(loomCorridor({ period: 3, hold: 2 }), /cycle needs/); bad(loomCorridor({ period: 12, hold: 1 }), /cycle needs/); bad(loomCorridor({ period: 10, hold: 7 }), /wait at the bottom/);
  const s = loomCorridor(); s.triggers = [{ id: 'drive', when: 'time:5', do: [{ sector: { id: 'p1', to: 'high' } }] }]; bad(s, /has a cycle/);
  const t = doorCorridor({ quiet: 1 }); bad(t, /soundlock needs/); const u = doorCorridor(); u.doors[0].remote = true; bad(u, /opened by Use/); assert.equal(validateMap(doorCorridor()).ok, true);
});

test('in the sim a platform stands where its clock says on every tick, carries whoever stands on it up and down, and announces its moves', () => {
  const m = parseMap(loomCorridor()), w = createWorld(m, { seed: 1 }), def = m.sectors[0];
  Object.assign(w.player, { x: cell(5.4) / 1, z: cell(1), yaw: 0 }); w.player.x = 5.5 * 2 + 0.2; let maxErr = 0, minY = 9, maxY = -9; const ev = [];
  for (let i = 0; i < 60 * 13; i++) { step(w, idle()); ev.push(...drainEvents(w)); maxErr = Math.max(maxErr, Math.abs(w.sectors[0].h - cycleHeight(def, w.time))); minY = Math.min(minY, w.player.y); maxY = Math.max(maxY, w.player.y); }
  assert.ok(maxErr < 1e-9, 'the platform is where the clock puts it: ' + maxErr); assert.ok(minY < 0.2 && maxY > 1.8, `the player rode it down and up: y ${minY.toFixed(2)}..${maxY.toFixed(2)}`);
  assert.ok(ev.filter((e) => e.type === 'sector_start' && e.id === 'p1').length >= 2 && ev.some((e) => e.type === 'sector_stop' && e.id === 'p1'), 'it announces the start and the end of each move');
});

test('the route bot crosses a pair of out-of-step platforms by waiting for them (waitplatform), and a route that waits for a platform that does not cycle fails clearly', () => {
  const m = parseMap(loomCorridor());
  const route = [{ op: 'goto', at: [4, 1] }, { op: 'waitplatform', id: 'p1', at: 'high', min: 3 }, { op: 'goto', at: [6, 1] }, { op: 'waitplatform', id: 'p2', at: 'high', min: 2 }, { op: 'goto', at: [8, 1] }, { op: 'goto', at: [12, 1] }, { op: 'goto', at: [17, 1] }];
  const r = runRoute(m, route, { seed: 1 }); assert.equal(r.result, 'complete', r.failure);
  // a later start (the platforms are mid-cycle when the bot arrives) is waited out too
  const late = runRoute(parseMap(loomCorridor({ period: 12, hold: 7, phase: 6 }, { period: 12, hold: 7, phase: 9 })), route, { seed: 1 }); assert.equal(late.result, 'complete', late.failure); assert.ok(late.ticks > r.ticks, 'it waited for the beat: ' + late.ticks + ' > ' + r.ticks);
  const nope = runRoute(m, [{ op: 'waitplatform', id: 'nope' }], { seed: 1 }); assert.notEqual(nope.result, 'complete'); assert.match(nope.failure ?? '', /no timing platform/);
});

test('a sound-lock door listens: Use does nothing while a noise is recent, opens once it has been quiet for `quiet` s, and a map without one records no noise at all', () => {
  const m = parseMap(doorCorridor({ quiet: 4 })), w = createWorld(m, { seed: 1, carry: { hp: 100, armor: 0, ammo: { flare: 9 }, weapons: ['flare'] } });
  Object.assign(w.player, { x: cell(6), z: cell(1), yaw: -Math.PI / 2, pitch: 0 }); const door = w.doors[0]; assert.ok(door.soundlock, 'the world door carries it');
  run(w, 30); assert.equal(w.noise, undefined, 'nothing heard yet');
  run(w, 2, () => idle({ fire: true })); assert.ok(w.noise && w.noise.t > 0, 'a shot is noise'); run(w, 1, () => idle({ fire: false }));
  let ev = run(w, 3, () => idle({ use: true })); assert.ok(ev.some((e) => e.type === 'door_listen'), 'the lock says it is listening'); assert.equal(door.target, 0);
  run(w, 60 * 3); ev = run(w, 3, () => idle({ use: true })); assert.equal(door.target, 0, 'three seconds of quiet is not enough'); assert.ok(ev.some((e) => e.type === 'door_listen'));
  run(w, 60 * 1.3); ev = run(w, 3, () => idle({ use: true })); assert.equal(door.target, 1, 'four seconds of quiet: it opens'); assert.ok(ev.some((e) => e.type === 'door_open'));
  const plain = createWorld(parseMap(loomCorridor()), { seed: 1 }); run(plain, 600, () => idle({ fire: true })); assert.equal(plain.noise, undefined, 'a map without a sound-lock door records nothing');
});

test('the route bot waits at a listening lock (no stuck, no firing) and goes through when it opens', () => {
  const m = parseMap(doorCorridor({ quiet: 4 })), route = [{ op: 'goto', at: [6, 1] }, { op: 'use', at: [7, 1] }, { op: 'goto', at: [13, 1] }];
  const r = runRoute(m, route, { seed: 1, onTick: (w, t) => { if (t === 1) w.noise = { t: w.time, x: cell(6), z: cell(1) }; } }); assert.equal(r.result, 'complete', r.failure); assert.ok(r.ticks >= 60 * 4, 'it waited out the lock: ' + r.ticks);
  const quick = runRoute(m, route, { seed: 1 }); assert.equal(quick.result, 'complete'); assert.ok(quick.ticks < 60 * 4, 'with no noise the door opens at once: ' + quick.ticks);
});
