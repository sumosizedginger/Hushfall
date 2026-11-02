// PT-081 (the fun check, standard 7: secrets of more than one kind): a secret panel opens to Use (the old kind), to a SHOT (a cracked
// wall: a pellet, a bolt or a blast reaches it; Use treats it as a wall) or to a SWITCH somewhere else (Use says "opened elsewhere").
// Tiny hand-made maps; a map that names no `open` is exactly what it was.
import test from 'node:test';
import assert from 'node:assert/strict';
import { parseMap, validateMap } from '../src/engine/mapformat.js';
import { createWorld, step, drainEvents, useTarget } from '../src/engine/world.js';
import { runRoute } from '../src/engine/harness.js';

const idle = (o = {}) => ({ move: [0, 0], yaw: 0, pitch: 0, fire: false, aim: false, sprint: false, use: false, weapon: null, weaponStep: 0, ...o });
const run = (w, ticks, cmd = idle) => { const ev = []; for (let i = 0; i < ticks; i++) { step(w, typeof cmd === 'function' ? cmd(i) : cmd); ev.push(...drainEvents(w)); } return ev; };
const EAST = -Math.PI / 2;
/** a hall; the wall at x 6 has a secret panel at (6,2) into a closet (7..8, 2); the exit is behind the closet; a lever on the north wall at (3,1) */
const secretMap = (open, extra = {}) => ({
  format: 1, id: 'TS', version: 1, name: 'Secrets', ceilingHeight: 4, doors: [],
  grid: ['##########', '#.....#..#', '#.....S..#', '#.....#..#', '##########'],
  secrets: [{ id: 's1', panel: [6, 2], cells: [[8, 2]], ...(open ? { open } : {}) }],
  entities: [{ type: 'player', at: [4, 2], facing: 'east' }, { type: 'exit', at: [8, 1] }, ...(extra.entities ?? [])],
  ...extra.top,
});
const lever = { type: 'switch', id: 'lever', at: [3, 1], wall: 'north', do: [{ open: [6, 2] }] };

test('a panel with no `open` is the old secret: Use opens it', () => {
  const w = createWorld(parseMap(secretMap()), { seed: 1, difficulty: 'normal' });
  w.player.x = 5.5 * w.map.cell; w.player.yaw = EAST; assert.ok(useTarget(w)?.secret, 'Use finds the panel'); run(w, 2, idle({ use: true }));
  assert.equal(w.doors.find((d) => d.secret).target, 1);
  assert.equal(w.map.hasCracks, false);
});

test('a CRACKED wall: Use treats it as a wall; a shot opens it', () => {
  const w = createWorld(parseMap(secretMap('shoot')), { seed: 1, difficulty: 'normal' }), d = w.doors.find((q) => q.secret);
  assert.equal(w.map.hasCracks, true); assert.equal(d.hidden, 'shoot');
  w.player.x = 5.5 * w.map.cell; w.player.yaw = EAST;
  assert.equal(useTarget(w), null, 'no Use prompt on a cracked wall');
  run(w, 4, idle({ use: true })); assert.equal(d.target, 0, 'Use does nothing');
  const ev = run(w, 90, (i) => idle({ fire: i % 20 < 2 }));
  assert.equal(d.target, 1, 'the shot opened it'); assert.ok(ev.some((e) => e.type === 'door_open' && e.cracked), 'the event says it cracked');
});

test('a panel a SWITCH opens: Use says it is opened elsewhere; the lever opens it; a map whose switch does not open it is refused', () => {
  const src = secretMap('switch', { entities: [lever] }), w = createWorld(parseMap(src), { seed: 1, difficulty: 'normal' }), d = w.doors.find((q) => q.secret);
  assert.ok(validateMap(src).ok, JSON.stringify(validateMap(src).errors));
  w.player.x = 5.5 * w.map.cell; w.player.yaw = EAST;
  const ev = run(w, 4, idle({ use: true })); assert.equal(d.target, 0); assert.ok(ev.some((e) => e.type === 'door_remote'), 'Use: opened elsewhere');
  const bad = secretMap('switch'), errs = JSON.stringify(validateMap(bad)); assert.match(errs, /opens by a switch but no action opens/);
  assert.match(JSON.stringify(validateMap(secretMap('kick'))), /open must be use, shoot or switch/);
});

test('the route bot shoots a cracked wall open (op crack) and walks through to the exit', () => {
  const map = parseMap(secretMap('shoot')), r = runRoute(map, [{ op: 'crack', at: [6, 2] }, { op: 'goto', at: [8, 2] }, { op: 'goto', at: [8, 1] }], { difficulty: 'normal', seed: 1 });
  assert.equal(r.result, 'complete', r.failure); assert.equal(r.world.stats.secrets, 1, 'the secret was found');
});
