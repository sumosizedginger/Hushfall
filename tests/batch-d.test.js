// PT-029: Episode 3, Batch D: Resonance Loom (timing platforms, sound-lock doors, the Acolyte) and The Choir Loft (suppression in numbers, cover to cover). What only these two maps have; the generic gates (viability, lint, traps, the space contract)
// already hold every shipped map to what it says (tests/shipped.test.js, maps.test.js, maplint.test.js, traps.test.js). The mechanics' own rules are in tests/platforms.test.js and tests/acolyte.test.js.
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadMapFile, loadRouteFile, runRoute } from '../src/engine/harness.js';
import { createWorld, step, drainEvents } from '../src/engine/world.js';
import { platformState } from '../src/engine/platforms.js';
import { findTraps } from '../src/engine/traps.js';
import { shippedMap, shippedSrc } from './helpers.js';

const idle = (o = {}) => ({ move: [0, 0], yaw: 0, pitch: 0, fire: false, aim: false, sprint: false, use: false, weapon: null, weaponStep: 0, ...o });

test('Resonance Loom: four timing platforms across a toxic pit, each a little behind the one before so a person can walk the chain; two sound-lock doors and a lever door; stairs out of the pit', () => {
  const src = shippedSrc('C1E3M05'), map = shippedMap('C1E3M05'), sec = map.sectors.filter((s) => s.cycle); assert.equal(sec.length, 4);
  assert.ok(src.doors.filter((d) => d.soundlock).length === 2 && src.doors.filter((d) => d.remote).length === 1, 'two locks that listen, one door a lever opens');
  for (let i = 0; i + 1 < sec.length; i++) {                                         // consecutive platforms are both standing at the top for long enough to cross one and step onto the next
    let best = 0, run = 0; for (let t = 0; t < 30; t += 1 / 30) { const both = platformState(sec[i], t).phase === 'high' && platformState(sec[i + 1], t).phase === 'high'; run = both ? run + 1 / 30 : 0; best = Math.max(best, run); }
    assert.ok(best >= 4, `platforms ${i + 1} and ${i + 2} stand together for ${best.toFixed(1)} s`);
  }
  assert.ok(sec.every((s) => s.cells.length === 12 && s.high - s.low === 2), 'each platform is 3 x 4 cells and rises 2 m');
  assert.equal(map.fx(28, 40), null, 'no toxic under the platforms'); let toxic = 0; for (let z = 20; z <= 37; z++) for (let x = 23; x <= 34; x++) if (map.fx(x, z) === 'x') toxic++; assert.ok(toxic > 100, 'and a pit full of it: ' + toxic);
  assert.equal(findTraps(map).traps, 0, 'a fall is a burn and a walk, never a trap');
});

test('Resonance Loom: the first lock listens (a noisy kill by the door keeps it shut for four quiet seconds), and both routes complete on every difficulty', () => {
  const map = shippedMap('C1E3M05'), w = createWorld(map, { seed: 1, difficulty: 'normal' }), door = w.doors.find((d) => d.soundlock && d.cx === 12);
  Object.assign(w.player, { x: 11 * 2 + 1, z: 28 * 2 + 1, yaw: -Math.PI / 2, pitch: 0 }); for (const e of w.enemies) e.state = 'dead';
  for (let i = 0; i < 2; i++) step(w, idle({ fire: true })); step(w, idle());
  let ev = []; for (let i = 0; i < 4; i++) { step(w, idle({ use: true })); ev.push(...drainEvents(w)); } assert.ok(ev.some((e) => e.type === 'door_listen'), 'it listens'); assert.equal(door.target, 0);
  for (let i = 0; i < 60 * 4.2; i++) step(w, idle()); for (let i = 0; i < 4; i++) step(w, idle({ use: true })); assert.equal(door.target, 1, 'and opens once it has heard nothing for four seconds');
  for (const difficulty of ['easy', 'normal', 'hard']) { const r = runRoute(loadMapFile('maps/C1E3M05.json'), loadRouteFile('routes/C1E3M05.main.route.json'), { seed: 1, difficulty }); assert.equal(r.result, 'complete', difficulty + ' ' + r.failure); }
  const s = runRoute(loadMapFile('maps/C1E3M05.json'), loadRouteFile('routes/C1E3M05.secret.route.json'), { seed: 1, difficulty: 'normal' }); assert.equal(s.result, 'complete'); assert.equal(s.world.stats.secrets, 1);
});

test('The Choir Loft: a wedge of eight rising tiers, roofed below and open above, pews for cover with the aisle left open, one Acolyte and three singers, the tuned in rows; the way up is a lever and a door', () => {
  const src = shippedSrc('C1E3M06'), map = shippedMap('C1E3M06'), ents = src.entities;
  assert.equal(src.quality.scaleClass, 'MIXED'); assert.ok(map.floor(18, 24) < map.floor(36, 24) && map.floor(36, 24) < map.floor(58, 24) && map.floor(58, 24) >= 3, 'the floor climbs: ' + [18, 36, 58].map((x) => map.floor(x, 24)));
  assert.equal(map.kind(20, 24), 'floor', 'the lower tiers are roofed'); assert.equal(map.kind(50, 24), 'outdoor', 'the upper tiers are open to the dusk');
  const width = (x) => { let n = 0; for (let z = 0; z < map.h; z++) if (map.kind(x, z) !== 'wall') n++; return n; }; assert.ok(width(60) > 3 * width(15), `a wedge: ${width(15)} cells across at the foot, ${width(60)} at the top`);
  const pews = src.entities.filter((e) => e.type === 'prop' && e.kind === 'pew'); assert.ok(pews.length >= 20, pews.length + ' pews'); assert.ok(pews.every((e) => Math.abs(e.at[1] - 24) >= 2), 'the aisle (z 23..25) is open');
  assert.equal(ents.filter((e) => e.type === 'enemy' && e.kind === 'acolyte').length, 1); assert.ok(ents.filter((e) => e.type === 'enemy' && e.kind === 'chorister').length === 3 && ents.filter((e) => e.type === 'enemy' && e.kind === 'tollbearer').length >= 6);
  assert.deepEqual(src.drops.keep, [[36, 24, 40, 24]]); assert.equal(src.doors.filter((d) => d.remote).length, 1);
});

test('The Choir Loft: both routes complete on every difficulty (the secret one fetches the niche behind the pew-back), nobody can be trapped', () => {
  for (const difficulty of ['easy', 'normal', 'hard']) { const r = runRoute(loadMapFile('maps/C1E3M06.json'), loadRouteFile('routes/C1E3M06.main.route.json'), { seed: 1, difficulty }); assert.equal(r.result, 'complete', difficulty + ' ' + r.failure); }
  const s = runRoute(loadMapFile('maps/C1E3M06.json'), loadRouteFile('routes/C1E3M06.secret.route.json'), { seed: 1, difficulty: 'normal' }); assert.equal(s.result, 'complete'); assert.equal(s.world.stats.secrets, 1);
  assert.equal(findTraps(shippedMap('C1E3M06')).traps, 0);
});
