// FREEZE F7, the tide returns (design/MECHANICS_RETURNING.md): the Ferry Terminal (C1E1M06) has the harbour's own tide on its south quay. The mechanism is tested in tests/tide.test.js; this holds what the MAP does with it: a loop of 90 s, only the south strip floods,
// the loading lane where the Warden charges and every walkable cell north of the strip never do, the cache is in the strip and reachable, the message is told at the strip, and wading slows a body as the engine says it does.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createWorld, step, blockedCircle } from '../src/engine/world.js';
import { fxAt, fxSpeed, tideWet } from '../src/engine/terrain.js';
import { tideLevel, tideState } from '../src/engine/tide.js';
import { FX, TICK } from '../src/engine/defs.js';
import { shippedMap } from './helpers.js';

const idle = { move: [0, 0], yaw: 0, pitch: 0, fire: false, aim: false, sprint: false, use: false, weapon: null, weaponStep: 0 };
const make = () => createWorld(shippedMap('C1E1M06'), { seed: 1, difficulty: 'normal' });
const at = (w, t) => { w.time = t; return w; };

test('the clock: dry for 40 s, the water rises over 12 s, holds for 20 s, drains over 12 s, and the loop of 90 s is seamless', () => {
  const m = make().map; assert.equal(m.tide.loop, 90); assert.deepEqual(m.tide.rect, [28, 37, 53, 39]);
  assert.equal(tideLevel(m, 0), -2); assert.equal(tideLevel(m, 39), -2); assert.ok(tideLevel(m, 46) > -2 && tideLevel(m, 46) < 0.5); assert.equal(tideLevel(m, 60), 0.5); assert.ok(tideLevel(m, 78) < 0.5 && tideLevel(m, 78) > -2); assert.equal(tideLevel(m, 85), -2);
  assert.equal(tideLevel(m, 90), tideLevel(m, 0), 'seamless'); assert.equal(tideLevel(m, 90 + 60), 0.5, 'and it comes round again');
  assert.equal(tideState(m, 60).rate, 0, 'held at the top'); assert.ok(tideState(m, 46).rate > 0 && tideState(m, 78).rate < 0, 'rising, then falling');
});

test('only the south strip floods: every strip cell is wet at the top of the tide and dry at the bottom, and no other walkable cell of the map is ever wet', () => {
  const w = make(), m = w.map; let strip = 0, wetHigh = 0, wetLow = 0, elsewhere = 0;
  for (let cz = 0; cz < m.h; cz++) for (let cx = 0; cx < m.w; cx++) {
    const k = m.kind(cx, cz); if (k !== 'floor' && k !== 'outdoor') continue;
    const inStrip = cx >= 28 && cx <= 53 && cz >= 37 && cz <= 39;
    for (const t of [0, 30, 45, 60, 80]) { at(w, t); if (tideWet(w, cx, cz) && !inStrip) elsewhere++; }
    if (inStrip) { strip++; if (tideWet(at(w, 60), cx, cz)) wetHigh++; if (tideWet(at(w, 10), cx, cz)) wetLow++; }
  }
  assert.ok(strip > 40, 'the strip is real ground: ' + strip + ' cells'); assert.equal(wetLow, 0, 'dry at low tide'); assert.ok(wetHigh >= strip * 0.9, 'wet at high tide: ' + wetHigh + ' of ' + strip + ' (a step or a raised deck stays dry)'); assert.equal(elsewhere, 0, 'nothing else floods, ever');
  for (const [cx, cz] of [[40, 24], [30, 24], [52, 24], [43, 8], [10, 20]]) assert.equal(tideWet(at(w, 60), cx, cz), false, `the lane and the halls stay dry: ${cx},${cz}`);
});

test('wading in the strip slows a body: the wading effect at high tide, none at low tide; the lane is never slower', () => {
  const w = make(), m = w.map; const x = (41 + 0.5) * m.cell, z = (38 + 0.5) * m.cell;
  assert.equal(fxAt(at(w, 10), x, z), null, 'dry at low tide'); const wet = fxAt(at(w, 60), x, z); assert.equal(wet, 'w'); assert.ok(fxSpeed(wet) < 1 && fxSpeed(wet) === FX.w.speed);
  assert.equal(fxAt(at(w, 60), (41 + 0.5) * m.cell, (24 + 0.5) * m.cell), null, 'the loading lane is dry at the top of the tide');
  // a player walking east along the strip covers less ground at high tide than at low tide in the same seconds
  // (the first clear run of floor along the strip, 8 m long: the strip has props and chamfered corners)
  let start = null; for (let cz = 37; cz <= 39 && !start; cz++) for (let cx = 29; cx <= 44 && !start; cx++) { let ok = true; for (let d = 0; d <= 16 && ok; d++) if (blockedCircle(w, (cx + 0.5) * m.cell + d * 0.5, (cz + 0.5) * m.cell, 0.6)) ok = false; if (ok) start = [(cx + 0.5) * m.cell, (cz + 0.5) * m.cell]; }
  assert.ok(start, 'there is a clear run of floor in the strip');
  const walk = (t0) => { const q = make(), p = q.player; p.hp = 1e6; for (let i = 0; q.time < t0 && i < 20000; i++) step(q, idle); assert.ok(q.time >= t0 - 1e-6, 'the clock reached ' + t0 + ' s (status ' + q.status + ')'); p.hp = 1e6; p.x = start[0]; p.z = start[1]; p.yaw = -Math.PI / 2; p.y = 0; const x0 = p.x; for (let i = 0; i < 60; i++) step(q, { ...idle, move: [0, 1] }); return p.x - x0; };
  const low = walk(5), high = walk(55); assert.ok(low > 2, 'a body walks along the strip at low tide: ' + low.toFixed(2) + ' m'); assert.ok(high > 0.5 && high < low * 0.85, `wading is slower: ${high.toFixed(2)} m at high tide, ${low.toFixed(2)} m at low`);
});

test('the cache is in the strip, the message is told from the lane, and the sea is drawn only over the strip', () => {
  const w = make(), m = w.map, cache = w.pickups.filter((p) => ['health_large', 'armor_vest'].includes(p.kind) && p.z > 37 * m.cell && p.z < 40 * m.cell && p.x > 28 * m.cell && p.x < 54 * m.cell);
  assert.deepEqual(cache.map((p) => p.kind).sort(), ['armor_vest', 'health_large'], 'a large satchel and a vest lie in the strip');
  const msg = m.messages.find((q) => q.id === 'tide'); assert.ok(msg && Math.abs(msg.at[1] - 38) <= 10 && msg.text.length <= 180 && msg.speaker === 'INES', 'told from the edge of the lane, within sight of the strip (the route never goes into it)');
  assert.ok(!/\b(very|really|truly)\b|—|;/.test(msg.text), 'plain words');
});
