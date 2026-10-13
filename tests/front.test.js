// PT-045 (drop B): THE COLLAPSE FRONT. Falling loads (src/engine/loads.js) with a SCHEDULE: `start` (the time of the first impact), `count` (impacts, then no more), `loop` (the whole schedule restarts, so a yard can be run again), and `tremor` (the view shakes as it
// begins to fall). A strip of a front is one such load whose `start` is later the further along the front it lies. A load with none of them is the old endless cycle (tests/loads.test.js holds that).
import test from 'node:test';
import assert from 'node:assert/strict';
import { validateMap, parseMap } from '../src/engine/mapformat.js';
import { createWorld, step, drainEvents } from '../src/engine/world.js';
import { loadState, loadIndex } from '../src/engine/loads.js';
import { LOADS, DIFFICULTY } from '../src/engine/defs.js';

const idle = (o = {}) => ({ move: [0, 0], yaw: 0, pitch: 0, fire: false, aim: false, sprint: false, use: false, weapon: null, weaponStep: 0, map: false, ...o });
const bad = (s, re) => { const v = validateMap(s); assert.equal(v.ok, false, 'expected invalid'); assert.ok(v.errors.some((e) => re.test(e)), re + ' in ' + JSON.stringify(v.errors)); };
const near = (a, b, e = 1e-6) => Math.abs(a - b) < e;
/** a corridor of open deck (x 1..38, z 1..3) with strips of a front: strip k covers x 4k+2..4k+5 and lands at 8 + 4k s */
const deck = (loads) => ({ format: 1, id: 'F1', version: 1, name: 'Front', cellSize: 2, grid: ['#'.repeat(40), '#' + ':'.repeat(38) + '#', '#' + ':'.repeat(38) + '#', '#' + ':'.repeat(38) + '#', '#'.repeat(40)], doors: [], secrets: [], loads,
  entities: [{ type: 'player', at: [1, 2], facing: 'east' }, { type: 'exit', at: [38, 2] }] });
const strips = (over = {}) => Array.from({ length: 8 }, (_, k) => ({ rect: [4 * k + 2, 1, 4 * k + 5, 3], period: 6, start: 8 + 4 * k, ...over }));
const world = (src) => createWorld(parseMap(src), { seed: 1, difficulty: 'normal' });

test('a scheduled load: nothing before `start`, a warning LOADS.warn s ahead of the first impact, then an impact every period; `count` ends it; the index only ever rises', () => {
  const L = { rect: [0, 0, 1, 1], period: 6, phase: 0, start: 10, count: 3 };
  assert.equal(loadIndex(L, 0), 0); assert.equal(loadIndex(L, 9.99), 0); assert.equal(loadIndex(L, 10), 1); assert.equal(loadIndex(L, 15.99), 1); assert.equal(loadIndex(L, 16), 2); assert.equal(loadIndex(L, 22), 3); assert.equal(loadIndex(L, 28), 3, 'the third is the last');
  assert.equal(loadState(L, 3).warn, 0, 'quiet long before the start'); assert.ok(near(loadState(L, 10 - LOADS.warn / 2).warn, 0.5), 'half way into the warning'); assert.equal(loadState(L, 10 - LOADS.warn / 2).since, Infinity);
  assert.ok(loadState(L, 10.2).linger > 0.8 && loadState(L, 10.2).warn === 0, 'dust after the first'); assert.ok(near(loadState(L, 13).until, 3) && near(loadState(L, 13).since, 3));
  assert.equal(loadState(L, 40).warn, 0); assert.equal(loadState(L, 40).until, Infinity, 'after the last impact there is no next');
  let prev = -1; for (let t = 0; t < 80; t += 0.25) { const i = loadIndex({ ...L, loop: 30 }, t); assert.ok(i >= prev, 'the index never falls: ' + prev + ' -> ' + i + ' at ' + t); prev = i; }
});

test('a looping schedule restarts: the warning for the first impact of the next loop comes before the wrap, and the index jumps up at the wrap', () => {
  const L = { rect: [0, 0, 1, 1], period: 6, phase: 0, start: 10, count: 2, loop: 40 };
  assert.equal(loadIndex(L, 39.99), 2); assert.equal(loadIndex(L, 40), 2, 'the wrap is not a landing'); assert.equal(loadIndex(L, 49.99), 2); assert.equal(loadIndex(L, 50), 3, 'the first impact of the second loop'); assert.equal(loadIndex(L, 56), 4);
  assert.equal(loadState(L, 20).warn, 0); assert.ok(near(loadState(L, 20).until, 30), 'between the last impact and the wrap the next one is the first of the next loop: ' + loadState(L, 20).until);
  assert.ok(near(loadState(L, 39.5).until, 10.5), 'ten seconds after the wrap'); const w = loadState(L, 49.5); assert.ok(near(w.until, 0.5) && near(w.warn, 1 - 0.5 / LOADS.warn), 'in the new loop the first warning comes again: ' + JSON.stringify(w));
});

test('the validator: start >= 0, count 1 to 999, a loop longer than the last impact, no phase on a scheduled load, a tremor in (0, 3]', () => {
  assert.equal(validateMap(deck(strips())).ok, true, JSON.stringify(validateMap(deck(strips())).errors));
  const one = (o) => deck([{ rect: [4, 1, 7, 3], period: 6, ...o }]);
  bad(one({ start: -1 }), /start must be a time/); bad(one({ start: 'x' }), /start must be a time/); bad(one({ count: 0 }), /count must be a whole number/); bad(one({ count: 2.5 }), /count must be a whole number/);
  bad(one({ start: 10, count: 3, loop: 20 }), /loop must be longer/); bad(one({ start: 5, phase: 2 }), /uses start, not phase/); bad(one({ tremor: 5 }), /tremor must be in/); assert.equal(validateMap(one({ start: 10, count: 3, loop: 40, tremor: 1 })).ok, true);
});

test('in the world: a front sweeps the corridor, each strip lands at its own time and hurts only the player standing in it; the one ahead of the front is untouched; tremor shakes the view as a strip begins to fall', () => {
  const src = deck(strips({ tremor: 1 })), w = world(src), S = 2, ev = []; const hit = (t) => ev.filter((e) => e.type === 'load_hit' && Math.abs(e.t - t) < 0.05);
  Object.assign(w.player, { x: 11 * S, z: 2 * S + 1, hp: 100 });                    // x cell 11 lies in strip 2 (cells 10..13), which lands at 16 s
  while (w.time < 15.9) { step(w, idle()); for (const e of drainEvents(w)) ev.push({ ...e, t: w.time }); }
  assert.equal(w.player.hp, 100, 'strips 0 and 1 fell behind and ahead of the player: nothing yet'); const lands = ev.filter((e) => e.type === 'load_land').map((e) => e.i); assert.deepEqual(lands, [0, 1, 0], 'strips 0 (8 s) and 1 (12 s) have landed, and strip 0 again at 14 s: behind the front is a kill zone');
  const warns = ev.filter((e) => e.type === 'load_warn').map((e) => e.i); assert.ok(warns.includes(2), 'the warning for strip 2 has come'); assert.ok(ev.some((e) => e.type === 'shake' && e.amount === 1) && ev.some((e) => e.type === 'tremor'), 'the view shakes and the rumble sounds as a strip begins to fall');
  while (w.time < 16.2) { step(w, idle()); for (const e of drainEvents(w)) ev.push({ ...e, t: w.time }); }
  assert.ok(ev.some((e) => e.type === 'load_hit'), 'strip 2 landed on the player'); assert.equal(w.player.hp, 100 - Math.round(LOADS.damage * DIFFICULTY.normal.enemyDamage), 'hurt by one landing');
  Object.assign(w.player, { x: 33 * S }); const hp = w.player.hp; while (w.time < 20.5) { step(w, idle()); drainEvents(w); } assert.equal(w.player.hp, hp, 'ahead of the front (strip 7 is not due until 36 s) the player is not hurt');
});

test('a looping front lands again in every loop: once a loop, at `start` s into each', () => {
  const src = deck([{ rect: [4, 1, 7, 3], period: 6, start: 6, count: 1, loop: 30 }]), w = world(src), lands = [];
  while (w.time < 65) { step(w, idle()); for (const e of drainEvents(w)) if (e.type === 'load_land') lands.push(Math.round(w.time)); }
  assert.deepEqual(lands, [6, 36], 'at 6 s and at 36 s (the third is at 66 s, not reached)');
});
