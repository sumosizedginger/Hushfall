// PT-037 (Campaign 2 Act A, E2): RESONATORS, the standing forks of the Tuning Fork Fields. They hear noise, ring a moment later, send out a stinging ring of sound, wake every sleeper near THEM (not near you), scare the civilians
// and call the forks beside them: a row of forks rings down the row. A quiet gun is heard from much less far than a loud one. A world without a fork carries no resonator state at all.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from './helpers.js';
import { parseMap, validateMap } from '../src/engine/mapformat.js';
import { createWorld, step, drainEvents, noise } from '../src/engine/world.js';
import { RESONATOR, NOISE, DIFFICULTY, PROPS } from '../src/engine/defs.js';

const idle = (o = {}) => ({ move: [0, 0], yaw: 0, pitch: 0, fire: false, aim: false, sprint: false, use: false, weapon: null, weaponStep: 0, map: false, ...o });
const run = (w, n) => { const ev = []; for (let i = 0; i < n; i++) { step(w, idle()); ev.push(...drainEvents(w)); } return ev; };
const forkAt = (cx) => ({ type: 'prop', kind: 'resonator', at: [cx, 3] });
/** a hall 44 cells long; forks at cells 10, 13 and 16 (6 m apart); a wall across it at cell 20; the player at cell 5 */
const hall = (entities = [], walls = true) => ({ format: 1, id: 'R1', version: 1, name: 'Forks', cellSize: 2,
  grid: ['#'.repeat(44), ...Array.from({ length: 5 }, () => '#' + '.'.repeat(18) + (walls ? '#' : '.') + '.'.repeat(23) + '#'), '#'.repeat(44)], doors: [], secrets: [],
  entities: [{ type: 'player', at: [5, 3], facing: 'east' }, { type: 'exit', at: [42, 3] }, forkAt(10), forkAt(13), forkAt(16), ...entities] });
const world = (entities, walls) => createWorld(parseMap(hall(entities, walls)), { seed: 1, difficulty: 'normal' });
const rings = (ev) => ev.filter((e) => e.type === 'resonator_ring').map((e) => e.id);

test('a resonator is a prop the format accepts, and a world that has none has no resonator state', () => {
  assert.ok(PROPS.resonator); assert.equal(validateMap(hall()).ok, true);
  const w = world(); assert.equal(w.resonators.length, 3); assert.ok(w.resonators.every((r) => r.at === null && r.cdUntil === 0));
  const plain = createWorld(parseMap({ ...hall(), entities: hall().entities.filter((e) => e.kind !== 'resonator') }), { seed: 1, difficulty: 'normal' });
  assert.equal('resonators' in plain, false, 'lazy: only a map with a fork has the state');
});

test('a loud shot is heard from far, a quiet one only from close: the arc lamp is 14 m, so 8.4 m', () => {
  const w = world(); const x = w.resonators[0].x, z = w.resonators[0].z;
  noise(w, x - 10, z, NOISE.arc); assert.equal(w.resonators[0].at, null, 'the arc lamp is not heard at 10 m');
  noise(w, x - 8, z, NOISE.arc); assert.notEqual(w.resonators[0].at, null, 'but is at 8 m');
  const v = world(); noise(v, x - 12.5, z, NOISE.flare); assert.notEqual(v.resonators[0].at, null, 'a flare cannon (22 m) is heard at 12.5 m (13.2)');
  const u = world(); noise(u, x - 14, z, NOISE.flare); assert.equal(u.resonators[0].at, null);
});

test('a fork rings a moment after it hears: an event, a ring of sound that stings once, and then it is deaf for a while', () => {
  const w = world(), r = w.resonators[0]; Object.assign(w.player, { x: r.x - 3, z: r.z }); const hp = w.player.hp;
  noise(w, w.player.x, w.player.z, NOISE.arc); drainEvents(w);
  const ev = run(w, Math.round(RESONATOR.delay * 60) + 2); assert.deepEqual(rings(ev), [0], 'fork 0 rings; the others only when the ring reaches them');
  assert.equal(w.pulses.length, 1); assert.equal(w.pulses[0].dmg, Math.round(RESONATOR.pulse.damage * DIFFICULTY.normal.enemyDamage));
  run(w, 90); assert.ok(w.player.hp < hp, 'the ring crossed the player three metres away and stung once'); assert.equal(hp - w.player.hp, w.pulses[0]?.dmg ?? Math.round(RESONATOR.pulse.damage * DIFFICULTY.normal.enemyDamage), 'exactly once');
  noise(w, r.x - 3, r.z, NOISE.arc); assert.equal(r.at, null, 'deaf while it rings down'); run(w, RESONATOR.cooldown * 60); noise(w, r.x - 3, r.z, NOISE.arc); assert.notEqual(r.at, null, 'and hears again after the cooldown');
});

test('a row of forks rings down the row, each when the ring from the last reaches it, and the last one wakes a sleeper the shooter could never have woken', () => {
  const sleeper = { type: 'enemy', kind: 'tollbearer', at: [24, 3] };                       // 16 m from the last fork, behind a wall, 38 m from the player
  const w = world([sleeper]), s = w.enemies[0]; assert.equal(s.state, 'idle');
  noise(w, w.player.x, w.player.z, NOISE.rivet);
  const order = [], t = [];
  for (let i = 0; i < 60 * 4; i++) { step(w, idle()); for (const e of drainEvents(w)) if (e.type === 'resonator_ring') { order.push(e.id); t.push(+(w.time).toFixed(2)); } if (s.state !== 'idle' && !t.woke) t.woke = +(w.time).toFixed(2); }
  assert.deepEqual(order, [0, 1, 2], `ringing down the row at ${t.join(', ')} s`); assert.ok(t[1] > t[0] + 0.5 && t[2] > t[1] + 0.5, 'the ring takes time to cross six metres');
  assert.ok(s.state !== 'idle', 'the sleeper woke'); assert.ok(Math.abs(t.woke - t[2]) < 0.05, `...exactly when the last fork rang (${t.woke} vs ${t[2]})`);
});

test('nothing wakes a sleeper that is beyond every fork: the lure reaches 18 m from a fork and no further', () => {
  const far = { type: 'enemy', kind: 'tollbearer', at: [30, 3] };                          // 28 m from the last fork (x 33), behind the wall at cell 20 and out of every gun's range
  const w = world([far]); noise(w, w.player.x, w.player.z, NOISE.rivet); run(w, 60 * 5); assert.equal(w.enemies[0].state, 'idle');
});

test('a civilian near a ringing fork runs from it', () => {
  const w = world([{ type: 'enemy', kind: 'vaelfolk', at: [12, 4] }]), f = w.enemies[0]; assert.equal(f.state, 'calm');
  noise(w, w.player.x, w.player.z, NOISE.rivet); run(w, 20); assert.ok(f.state === 'flee' || f.state === 'calm'); run(w, 60);
  assert.ok(w.resonators.some((r) => r.ringT > 0)); assert.equal(f.state, 'flee');
});

test('the same shot gives the same ringing every time and no random number is read', () => {
  const a = world(), b = world(), plain = createWorld(parseMap({ ...hall(), entities: hall().entities.filter((e) => e.kind !== 'resonator') }), { seed: 1, difficulty: 'normal' });
  for (const w of [a, b, plain]) { noise(w, w.player.x, w.player.z, NOISE.rivet); run(w, 240); }
  assert.equal(JSON.stringify(a.resonators), JSON.stringify(b.resonators)); assert.equal(a.rngState, plain.rngState);
});

test('the renderer builds the fork and the shell hears it: a prop model, a sound, a mapping', () => {
  const lm = fs.readFileSync(path.join(ROOT, 'src/render/levelmesh.js'), 'utf8'), ev = fs.readFileSync(path.join(ROOT, 'src/audio/events.js'), 'utf8'), sy = fs.readFileSync(path.join(ROOT, 'src/audio/synth.js'), 'utf8');
  assert.match(lm, /kind === 'resonator'/); assert.match(ev, /case 'resonator_ring'/); assert.match(sy, /resonator_ring\(c, out, t, o\)/);
});
