// PT-033 (Episode 4, Batch B): THE MIRROR ARRAY (C1E4M04), the game's first real puzzle, and the QUIET ROOM (C1E4S01). The beam tracer itself is in tests/beams.test.js; these hold the SHIPPED array to what it says: solvable by a search over every turn of every
// mirror (with the screen doors latching as their receivers light), NOT solved at the start, not a handful of turns, two ways out (the exit and the secret), two mirrors that matter to nothing, and its routes finishing.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { parseMap } from '../src/engine/mapformat.js';
import { traceBeams } from '../src/engine/beams.js';
import { loadMapFile, loadRouteFile, runRoute } from '../src/engine/harness.js';
import { ROOT } from './helpers.js';
import path from 'node:path';

const src = JSON.parse(fs.readFileSync(path.join(ROOT, 'maps/C1E4M04.json'), 'utf8')), map = parseMap(src);
const DOORS = { r1: [44, 28], r2: [52, 36], r3: [44, 44] };                                  // the receiver that opens each screen door (the triggers say the same)
const drum = map.mirrors.filter((m) => m.id !== 'm0'), ids = drum.map((m) => m.id);
const trace = (rots, latched) => traceBeams(map, rots, (cx, cz) => [...latched].some((k) => DOORS[k][0] === cx && DOORS[k][1] === cz));
const enc = (rots, latched) => ids.map((i) => rots[i]).join('') + '|' + [...latched].sort().join(',');

/** shortest number of quarter turns to light `goal` (a receiver id), with doors latching as their receivers light; null if it cannot be done */
function solve(goal, start = Object.fromEntries(drum.map((m) => [m.id, m.rot]))) {
  const first = { rots: start, latched: new Set() }, q = [{ ...first, d: 0 }], seen = new Set([enc(first.rots, first.latched)]);
  const settle = (rots, latched) => { const l = new Set(latched); for (;;) { const t = trace(rots, l); let grew = false; for (const r of t.lit) if (DOORS[r] && !l.has(r)) { l.add(r); grew = true; } if (!grew) return { l, lit: t.lit }; } };
  while (q.length) {
    const s = q.shift(); const here = settle(s.rots, s.latched); if (here.lit.includes(goal)) return s.d;
    for (const id of ids) { const rots = { ...s.rots, [id]: (s.rots[id] + 1) % 4 }, { l } = settle(rots, here.l), k = enc(rots, l); if (!seen.has(k)) { seen.add(k); q.push({ rots, latched: l, d: s.d + 1 }); } }
  }
  return null;
}

test('the array is not solved when you arrive, and every receiver of the drum is dark', () => {
  const t = trace(Object.fromEntries(drum.map((m) => [m.id, m.rot])), new Set());
  assert.deepEqual(t.lit.filter((r) => r !== 'r0'), [], 'nothing is lit at the start');
});
test('the array is solvable, for the exit and for the secret, and it is not a few turns', () => {
  const exit = solve('rx'), secret = solve('rs');
  assert.ok(exit != null && secret != null, `solvable: exit ${exit}, secret ${secret}`);
  assert.ok(exit >= 12, `the exit needs at least twelve quarter turns (${exit})`); assert.ok(secret >= exit - 2 && secret <= exit + 4, `the secret is about as far as the exit (${secret} against ${exit})`);
  console.log('M04: exit in', exit, 'turns, secret in', secret);
});
test('the order is the trick: the doors cannot be skipped (without latching the screen receivers the exit is out of reach)', () => {
  // with every door shut for good, no state of the mirrors lights the exit receiver
  const states = []; const rec = (i, rots) => { if (i === ids.length) { states.push({ ...rots }); return; } for (let r = 0; r < 4; r++) rec(i + 1, { ...rots, [ids[i]]: r }); }; rec(0, {});
  for (const s of states) { const t = traceBeams(map, s, () => false); assert.ok(!t.lit.includes('rx') && !t.lit.includes('r2') && !t.lit.includes('r3'), 'a shut screen door stops the light'); }
});
test('two mirrors do nothing: no turn of the decoys changes what is lit, in any state of the others, with the doors open or shut', () => {
  const real = drum.filter((m) => !['xa', 'xb'].includes(m.id)).map((m) => m.id);
  for (let a = 0; a < 4 ** real.length; a++) {
    const rots = Object.fromEntries(real.map((id, i) => [id, Math.floor(a / 4 ** i) % 4]));
    for (const doors of [new Set(), new Set(['r1', 'r2', 'r3'])]) { const base = trace({ ...rots, xa: 0, xb: 0 }, doors).lit.join(); for (let x = 0; x < 16; x++) assert.equal(trace({ ...rots, xa: x % 4, xb: Math.floor(x / 4) }, doors).lit.join(), base); }
  }
});
test('the antechamber teaches in one turn, and its door is the first thing that opens', () => {
  const t0 = traceBeams(map, {}, () => false); assert.ok(!t0.lit.includes('r0'));
  assert.ok(traceBeams(map, { m0: 3 }, () => false).lit.includes('r0'));
  assert.ok(src.triggers.some((t) => t.when === 'lit:r0' && t.do.some((a) => a.open?.join() === '25,32')));
});
test('the routes: the exit route reaches the exit, the secret route reaches the SECRET exit, on every difficulty', () => {
  for (const [name, dest] of [['main', 'next'], ['secret', 'secret']]) for (const difficulty of ['easy', 'normal', 'hard']) {
    const r = runRoute(loadMapFile('maps/C1E4M04.json'), loadRouteFile(`routes/C1E4M04.${name}.route.json`), { seed: 1, difficulty });
    assert.equal(r.result, 'complete', `${name} ${difficulty}: ${r.failure}`); assert.equal(r.world.endStats?.dest, dest, `${name} ends at the ${dest} exit`);
  }
});
test('the quiet room is silent, safe and short (S01)', () => {
  const s = JSON.parse(fs.readFileSync(path.join(ROOT, 'maps/C1E4S01.json'), 'utf8'));
  assert.equal(s.atmosphere.silence, true); assert.equal(s.entities.filter((e) => e.type === 'enemy').length, 0); assert.ok(s.entities.some((e) => e.type === 'pickup'), 'a cache');
  const r = runRoute(loadMapFile('maps/C1E4S01.json'), loadRouteFile('routes/C1E4S01.main.route.json'), { seed: 1, difficulty: 'normal' }); assert.equal(r.result, 'complete');
});
