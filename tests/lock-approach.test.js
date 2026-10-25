// FREEZE F7, the airlock and the vacuum return (design/MECHANICS_RETURNING.md): the Gatekeeper's Approach (C1E4M06) has a service lock in the east wall of the steps (the fourth rank): a door, a one-cell chamber, a second door that never stands open with the first,
// a closet with a hull hatch that stands open to the dark (so the closet is in vacuum), a switch on the closet's wall that shuts the hatch, and a satchel and a vest. The mechanism is tested in tests/airlock.test.js and Cold Dock's tests; this holds what the MAP does
// with it: the pieces are where the source says, the annex is sealed in solid wall, the lock refuses both doors at once, the closet hurts until the switch is thrown, and the third route (`lock`) plays the whole sequence and gets out alive.
import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { loadMapFile, loadRouteFile, runRoute, runRouteEither } from '../src/engine/harness.js';
import { createWorld, step, drainEvents, doorAtCell } from '../src/engine/world.js';
import { runActions } from '../src/engine/script.js';
import { inVacuum, lockBusy } from '../src/engine/airlock.js';
import { shippedSrc, ROOT } from './helpers.js';

const src = shippedSrc('C1E4M06'), map = () => loadMapFile(path.join(ROOT, 'maps/C1E4M06.json')), route = (n) => loadRouteFile(path.join(ROOT, 'routes/C1E4M06.' + n + '.route.json'));
const idle = (o = {}) => ({ move: [0, 0], yaw: 0, pitch: 0, fire: false, aim: false, sprint: false, use: false, weapon: null, weaponStep: 0, map: false, ...o });
const run = (w, n, cmd = () => idle()) => { const ev = []; for (let i = 0; i < n; i++) { step(w, cmd(i)); ev.push(...drainEvents(w)); } return ev; };
const world = () => { const w = createWorld(map(), { seed: 1, difficulty: 'normal' }); w.player.hp = 1e6; return w; };
const cellC = (c) => (c + 0.5) * 2;
const D1 = [58, 49], D2 = [60, 49], HATCH = [63, 49];

test('the pieces: two doors that name each other, a hatch that starts open, two regions of vacuum, a switch that closes the hatch, and the dark beyond it', () => {
  const door = (c) => src.doors.find((d) => d.at.join() === c.join());
  assert.deepEqual(door(D1).interlock, D2); assert.deepEqual(door(D2).interlock, D1); assert.equal(door(HATCH).open, true); assert.equal(door(HATCH).remote, true);
  assert.equal(src.vacuum.length, 2); assert.deepEqual(src.vacuum[0], { rect: [61, 48, 62, 50], seals: [HATCH] }); assert.deepEqual(src.vacuum[1].and, [D2]);
  const sw = src.entities.find((e) => e.type === 'switch' && e.id === 'hatch'); assert.ok(sw && sw.do.some((a) => a.close && a.close.join() === HATCH.join()), 'the switch shuts the hatch');
  for (let x = 64; x <= 65; x++) for (let z = 48; z <= 50; z++) assert.equal(src.grid[z][x], '_', `the dark beyond the hatch at ${x},${z}`);
});

test('the annex is cut into solid wall: its doors, chamber and closet are ringed by wall except where it meets the steps, and its floor is the rank\'s', () => {
  const m = map(), cells = [D1, [59, 49], D2, [61, 48], [62, 48], [61, 49], [62, 49], [61, 50], [62, 50], HATCH, [64, 48], [64, 49], [64, 50], [65, 48], [65, 49], [65, 50]], inside = (x, z) => cells.some(([a, b]) => a === x && b === z);
  for (const [x, z] of cells) for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) { const nx = x + dx, nz = z + dz; if (inside(nx, nz) || nx <= 57) continue; assert.equal(m.kind(nx, nz), 'wall', `sealed: ${nx},${nz}`); }
  assert.equal(m.floor(57, 49), 3, 'the steps\' floor'); for (const [x, z] of [[59, 49], [61, 48], [62, 50]]) assert.equal(m.floor(x, z), 3, 'the annex floor is the rank\'s floor');
});

test('the lock: the second door is refused while the first is open; the chamber keeps its air until the second opens; the closet is in vacuum while the hatch stands open', () => {
  const w = world(), d1 = doorAtCell(w, ...D1), d2 = doorAtCell(w, ...D2), put = (cx, cz, yaw) => Object.assign(w.player, { x: cellC(cx), z: cellC(cz), yaw, y: 3 });
  assert.equal(inVacuum(w, cellC(61), cellC(49)), true, 'the closet is in vacuum from the start'); assert.equal(inVacuum(w, cellC(59), cellC(49)), false, 'the chamber holds its air while the inner door of the dark is shut');
  put(57, 49, -Math.PI / 2); let ev = run(w, 3, (i) => idle({ use: i === 0 })); assert.ok(ev.some((e) => e.type === 'door_open' && e.cx === D1[0]), 'the first door opens'); assert.equal(d1.target, 1);
  put(59, 49, -Math.PI / 2); ev = run(w, 3, (i) => idle({ use: i === 0 })); assert.ok(ev.some((e) => e.type === 'door_cycling'), 'the second is refused'); assert.equal(lockBusy(w, d2), true); assert.equal(d2.target, 0, 'and it stays shut');
});

test('the closet hurts while the hatch is open and stops hurting the moment the switch shuts it', () => {
  const w = world(); const hp0 = () => w.player.hp;
  Object.assign(w.player, { x: cellC(61), z: cellC(49), y: 3 }); w.player.hp = 100; const before = hp0(); run(w, 120); const hurt = before - hp0(); assert.ok(hurt >= 3, `two seconds in the closet cost ${hurt} hit points`);
  const sw = w.map.switches.find((s) => s.id === 'hatch'); runActions(w, sw.do); run(w, 90); assert.equal(doorAtCell(w, ...HATCH).target, 0, 'the hatch is shut'); assert.equal(inVacuum(w, cellC(61), cellC(49)), false);
  w.player.hp = 100; run(w, 180); assert.equal(w.player.hp, 100, 'no damage once the air is back');
});

test('the lock route plays the whole sequence (door, chamber, door, switch, cache, back out) and reaches the exit on every difficulty; the main and secret routes never go near it', () => {
  const m = map(), lock = route('lock'), main = route('main');
  assert.ok(lock.some((o) => o.op === 'switch' && o.id === 'hatch') && lock.filter((o) => o.op === 'use').length >= 3);
  for (const difficulty of ['easy', 'normal', 'hard']) { const r = runRouteEither(m, lock, { seed: 2, difficulty }); assert.equal(r.result, 'complete', `${difficulty}: ${r.result} ${r.failure ?? ''}`); }
  const a = runRouteEither(m, lock, { seed: 2, difficulty: 'normal' }), b = runRouteEither(m, main, { seed: 2, difficulty: 'normal' });
  assert.equal(a.world.stats.items - b.world.stats.items, 2, 'the satchel and the vest'); assert.ok(a.world.player.armor >= 50, 'the vest'); assert.ok(a.ticks > b.ticks + 600, 'the lock\'s cycles cost time: ' + a.ticks + ' against ' + b.ticks);
  for (const name of ['main', 'secret']) { let seen = 0; runRoute(m, route(name), { seed: 2, difficulty: 'easy', onTick: (w) => { const cx = Math.floor(w.player.x / w.map.cell), cz = Math.floor(w.player.z / w.map.cell); if (cx >= 58 && cx <= 65 && cz >= 48 && cz <= 50) seen++; } }); assert.equal(seen, 0, `${name} never enters the annex`); }
});

test('the lock is told from the steps in plain words, heard by the main route as it passes the steps', () => {
  const msg = src.messages.find((q) => q.id === 'lock'); assert.ok(msg && msg.speaker === 'HULL' && msg.text.length <= 190);
  assert.ok(!/\b(very|really|truly)\b|—|;/.test(msg.text), 'plain words'); assert.ok(!src.messages.some((q) => q.id === 'air'), 'no message that only the optional route can deliver');
  const r = runRouteEither(map(), route('main'), { seed: 2, difficulty: 'easy' }); assert.ok(r.world.messagesSeen.includes('lock'), 'the main route hears it as it passes the steps');
});
