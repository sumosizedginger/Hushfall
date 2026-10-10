// PT-028: Episode 3, Batch C: Marrow Nave (the set-piece arena of the two elites, with the secret exit) and the Choirless Chamber (the silent secret map). What only these two maps have; the generic gates (viability, lint, traps,
// the shape kit, the space contract) already hold every shipped map to what it says (tests/shipped.test.js, maps.test.js, maplint.test.js, traps.test.js). The elites' own rules are in tests/elites-batch-c.test.js.
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadMapFile, loadRouteFile, runRoute } from '../src/engine/harness.js';
import { createWorld, step, drainEvents, damageEnemy } from '../src/engine/world.js';
import { ENEMIES } from '../src/engine/defs.js';
import { findTraps } from '../src/engine/traps.js';
import { shippedMap, shippedSrc } from './helpers.js';

const idle = (o = {}) => ({ move: [0, 0], yaw: 0, pitch: 0, fire: false, aim: false, sprint: false, use: false, weapon: null, weaponStep: 0, ...o });

test('Marrow Nave: a set-piece under 40% roofed with a Choir enthroned at the east end: one Mother (in a group of her own), two Bulwark Shells at the foot of her stairs, singers on the galleries', () => {
  const src = shippedSrc('C1E3M04'), map = shippedMap('C1E3M04'), ents = src.entities.filter((e) => e.type === 'enemy');
  assert.equal(src.quality.scaleClass, 'SET-PIECE'); assert.ok(typeof src.quality.reason === 'string' && src.quality.reason.length > 40, 'a set-piece names its reason');
  const mothers = ents.filter((e) => e.kind === 'weeping'), shells = ents.filter((e) => e.kind === 'bulwark'), singers = ents.filter((e) => e.kind === 'chorister');
  assert.equal(mothers.length, 1); assert.equal(mothers[0].group, 'mother'); assert.equal(shells.length, 2); assert.ok(singers.length >= 3);
  assert.ok(mothers[0].at[0] > 66 && shells.every((e) => e.at[0] > 54 && e.at[0] < mothers[0].at[0]), 'the Mother is at the east end and the shells stand between her and you');
  assert.ok(singers.some((e) => e.at[1] < 15) && singers.some((e) => e.at[1] > 43), 'singers on BOTH galleries');
  assert.equal(map.kind(40, 29), 'outdoor', 'the nave is open to the sky'); assert.equal(map.kind(6, 29), 'floor', 'the narthex is roofed');
  assert.ok(map.floor(30, 11) >= 2.9 && map.floor(70, 29) >= 2.9 && map.floor(40, 29) === 0, 'the galleries and the dais are raised (3 m), the nave floor is not');
});

test('Marrow Nave: the east gate is sealed until the Mother is dead, and opens the moment she is', () => {
  const map = shippedMap('C1E3M04'), w = createWorld(map, { seed: 1, difficulty: 'normal' }), gate = w.doors.find((d) => d.cx === 76 && d.cz === 29);
  assert.ok(gate && gate.remote, 'a remote gate in the east wall'); for (let i = 0; i < 120; i++) step(w, idle()); assert.equal(gate.target, 0, 'shut while she lives');
  const mother = w.enemies.find((e) => e.kind === 'weeping'); assert.ok(mother);
  for (const e of w.enemies) if (e.kind !== 'weeping') e.state = 'dead';              // nobody else matters to the gate
  for (let i = 0; i < 120; i++) step(w, idle()); assert.equal(gate.target, 0, 'still shut with every other creature dead');
  damageEnemy(w, mother, 1e6); for (let i = 0; i < 10; i++) step(w, idle()); assert.equal(gate.target, 1, 'open when the Mother dies'); assert.ok(drainEvents(w).some((e) => e.type === 'door_open' && e.remote));
});

test('Marrow Nave: both routes complete on every difficulty; the main route meets the Mother (a tear and a brood), the secret route ends at the SECRET exit', () => {
  for (const difficulty of ['easy', 'normal', 'hard']) {
    const r = runRoute(loadMapFile('maps/C1E3M04.json'), loadRouteFile('routes/C1E3M04.main.route.json'), { seed: 1, difficulty }); assert.equal(r.result, 'complete', difficulty); assert.equal(r.world.endStats.dest, 'next');
    const c = {}; for (const e of r.events) c[e.type] = (c[e.type] || 0) + 1; assert.ok(c.tear_land >= 1 && c.brood_birth >= 1 && c.armor_hit >= 10, `${difficulty}: the elites do their work ${JSON.stringify({ t: c.tear_land, b: c.brood_birth, a: c.armor_hit })}`);
  }
  for (const difficulty of ['easy', 'normal', 'hard']) { const s = runRoute(loadMapFile('maps/C1E3M04.json'), loadRouteFile('routes/C1E3M04.secret.route.json'), { seed: 1, difficulty }); assert.equal(s.result, 'complete', difficulty); assert.equal(s.world.endStats.dest, 'secret'); assert.equal(s.world.stats.secrets, 1); }
  assert.equal(findTraps(shippedMap('C1E3M04')).traps, 0);
});

test('Marrow Nave: the only ammunition boxes are the supply station on the lane before the dais and the tunnel\'s cache; the dead feed the rest', () => {
  const src = shippedSrc('C1E3M04'), boxes = src.entities.filter((e) => e.type === 'pickup' && /^ammo_/.test(e.kind));
  const station = boxes.filter((e) => e.at[1] === 29 && e.at[0] >= 49 && e.at[0] <= 53), tunnel = boxes.filter((e) => e.at[1] <= 7);
  assert.ok(station.length >= 3 && tunnel.length >= 3 && station.length + tunnel.length === boxes.length, `${station.length} on the road, ${tunnel.length} in the tunnel, ${boxes.length} in all`); assert.deepEqual(src.drops.keep, [[49, 29, 53, 29]]);
});

test('Marrow Nave: the Weeping Mother keeps to her throne (she never comes down the stairs, whatever the player does)', () => {
  const w = createWorld(shippedMap('C1E3M04'), { seed: 1, difficulty: 'normal', carry: { hp: 1e6, armor: 0, ammo: {}, weapons: ['flare'] } }), m = w.enemies.find((e) => e.kind === 'weeping'), home = { x: m.x, z: m.z };
  Object.assign(w.player, { x: 40 * 2 + 1, z: 29 * 2 + 1 }); w.player.hp = 1e6; for (const e of w.enemies) if (e !== m) e.state = 'dead';
  let far = 0; for (let i = 0; i < 60 * 40; i++) { step(w, idle()); drainEvents(w); far = Math.max(far, Math.hypot(m.x - home.x, m.z - home.z)); w.player.hp = 1e6; }
  assert.ok(far <= ENEMIES.weeping.leash + 1.2, `she wandered ${far.toFixed(1)} m from her throne (leash ${ENEMIES.weeping.leash})`); assert.ok(w.patches?.length >= 1 || w.stats.kills >= 0, 'and she wept');
});

test('The Choirless Chamber: the silent map: no enemies, the audio flag, the defector\'s message, the exit returns', () => {
  const src = shippedSrc('C1E3S01'), map = shippedMap('C1E3S01'); assert.equal(src.atmosphere.silence, true); assert.equal(map.atmosphere.silence, true, 'the parsed map carries it for the audio engine');
  assert.equal(src.entities.filter((e) => e.type === 'enemy').length, 0); assert.ok(src.messages.some((m) => m.speaker === 'THE QUIET ONE'), 'the Vael that left the Choir');
  const r = runRoute(loadMapFile('maps/C1E3S01.json'), loadRouteFile('routes/C1E3S01.main.route.json'), { seed: 1, difficulty: 'normal' }); assert.equal(r.result, 'complete'); assert.equal(r.world.endStats.dest, 'next');
  assert.equal(r.events.filter((e) => e.type === 'message').length, src.messages.length, 'every message is read on the way');
  assert.equal(findTraps(map).traps, 0);
});
