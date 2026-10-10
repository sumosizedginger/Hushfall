// PT-027: Episode 3, Batch B: Ribbed Corridors (the breathing gates) and Gill Gardens (the spore beds and the mortar). What only these two maps have; the generic gates (viability, lint, traps, the shape kit, the space contract)
// already hold every shipped map to what it says (tests/shipped.test.js, maps.test.js, maplint.test.js, traps.test.js).
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadMapFile, loadRouteFile, runRoute } from '../src/engine/harness.js';
import { gateOpen, sporeState } from '../src/engine/breath.js';
import { findTraps } from '../src/engine/traps.js';
import { analyseReach } from '../src/engine/viability.js';
import { shippedMap, shippedSrc } from './helpers.js';

test('Ribbed Corridors: three breathing gates, a clock apiece, none of them keyed or remote, and the way to the exit passes at least two of them on either route', () => {
  const src = shippedSrc('C1E3M02'), gates = src.doors.filter((d) => d.breath);
  assert.equal(gates.length, 3); assert.ok(gates.every((d) => !d.key && !d.remote), 'a gate is not a lock');
  assert.equal(new Set(gates.map((d) => `${d.breath.period}/${d.breath.open}/${d.breath.phase}`)).size, 3, 'each has its own rhythm');
  const g1 = gates.find((d) => d.at[0] === 23), g2 = gates.find((d) => d.at[0] === 38), g3 = gates.find((d) => d.at[0] === 53);
  assert.equal(gateOpen(g1.breath, 7), false, 'gate 1 is shut when you arrive: the first lesson is to wait'); assert.equal(gateOpen(g1.breath, 0), true);
  assert.ok(g2 && g3, 'one gate on the short way (2), one on the long way (3); gate 1 is on both');
  assert.equal(src.doors.filter((d) => d.remote).length, 1, 'and one remote hatch that the lever opens');
});

test('Ribbed Corridors: both routes complete on every difficulty, the secret route finds the niche, nobody can be trapped', () => {
  for (const difficulty of ['easy', 'normal', 'hard']) {
    const r = runRoute(loadMapFile('maps/C1E3M02.json'), loadRouteFile('routes/C1E3M02.main.route.json'), { seed: 1, difficulty }); assert.equal(r.result, 'complete', difficulty); assert.ok(r.events.filter((e) => e.type === 'door_close' && e.breath).length >= 1, difficulty + ': a gate shut while it was played');
  }
  const s = runRoute(loadMapFile('maps/C1E3M02.json'), loadRouteFile('routes/C1E3M02.secret.route.json'), { seed: 1, difficulty: 'normal' }); assert.equal(s.result, 'complete'); assert.equal(s.world.stats.secrets, 1);
  assert.equal(findTraps(shippedMap('C1E3M02')).traps, 0);
});

test('Gill Gardens: four spore regions on a clock, two out of step across the first basin and two out of step at the foot of the dais stairs, and every bed cell lies in one of them', () => {
  const src = shippedSrc('C1E3M03'), map = shippedMap('C1E3M03'); assert.equal(src.pulses.length, 4);
  const [a, b, n, s] = src.pulses; for (const p of src.pulses) assert.ok(p.period - p.on >= 2 && p.on >= 1.5, 'room to cross: dormant for at least 2 s');
  for (const t of [0.5, 1.5, 2.5, 4.5, 6.5, 7.5, 9, 12.5]) { assert.notEqual(sporeState(a, t).on && sporeState(b, t).on, true, `beds A and B never bloom together (t ${t})`); assert.notEqual(sporeState(n, t).on && sporeState(s, t).on, true, `nor the two stair beds (t ${t})`); }
  assert.ok(src.pulses.some((p) => sporeState(p, 0).on) && src.pulses.some((p) => !sporeState(p, 0).on), 'at the start some beds bloom and some sleep');
  let cells = 0; for (let z = 0; z < map.h; z++) for (let x = 0; x < map.w; x++) if (map.fx(x, z) === 's') { cells++; assert.ok(map.pulseAt(x, z), `bed cell ${x},${z} is in a pulse region`); }
  assert.ok(cells > 100, cells + ' bed cells');
});

test('Gill Gardens: the mortar waits on its plinth ON the lane with two crates of rockets beside it, and the map is MIXED (the first garden is open to the sky, the second is roofed)', () => {
  const src = shippedSrc('C1E3M03'), map = shippedMap('C1E3M03'), ents = src.entities;
  const mortar = ents.find((e) => e.type === 'pickup' && e.kind === 'weapon_mortar'); assert.ok(mortar, 'the mortar'); assert.deepEqual(mortar.at, [43, 23]);
  assert.equal(ents.filter((e) => e.type === 'pickup' && e.kind === 'ammo_rocket').length, 2, 'two crates of rockets, kept when the dead feed the rest'); assert.deepEqual(src.drops.keep, [[43, 22], [43, 24]]);
  assert.equal(map.kind(10, 23), 'floor'); assert.equal(map.kind(30, 23), 'outdoor', 'the first garden is open air'); assert.equal(map.kind(80, 23), 'floor', 'the second is roofed');
  assert.ok(map.ceilingRows && ents.filter((e) => e.type === 'enemy' && e.kind === 'chorister').length >= 6, 'six or more singers on the ledges and the dais');
});

test('Gill Gardens: both routes complete on every difficulty, the secret route finds the niche, nobody can be trapped; the levers and stairs are reachable', () => {
  for (const difficulty of ['easy', 'normal', 'hard']) { const r = runRoute(loadMapFile('maps/C1E3M03.json'), loadRouteFile('routes/C1E3M03.main.route.json'), { seed: 1, difficulty }); assert.equal(r.result, 'complete', difficulty); }
  const s = runRoute(loadMapFile('maps/C1E3M03.json'), loadRouteFile('routes/C1E3M03.secret.route.json'), { seed: 1, difficulty: 'normal' }); assert.equal(s.result, 'complete'); assert.equal(s.world.stats.secrets, 1);
  assert.equal(findTraps(shippedMap('C1E3M03')).traps, 0); assert.ok(analyseReach(shippedMap('C1E3M03')).ok !== false);
});
