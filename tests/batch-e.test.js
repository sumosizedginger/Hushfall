// PT-030: Episode 3, Batch E: The Spore Foundry (spawner denial: four Brood Vats on a ring round a furnace, the exit locked until they are dead) and The Cantor's Throat (the Grand Cantor behind four reeds). What only these two maps have; the generic gates
// (viability, lint, traps, the space contract) already hold every shipped map to what it says (tests/shipped.test.js, maps.test.js, maplint.test.js, traps.test.js). The creatures' own rules are in tests/batch-e-creatures.test.js.
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadMapFile, loadRouteFile, runRoute } from '../src/engine/harness.js';
import { createWorld, step, drainEvents, damageEnemy } from '../src/engine/world.js';
import { ENEMIES } from '../src/engine/defs.js';
import { findTraps } from '../src/engine/traps.js';
import { shippedMap, shippedSrc } from './helpers.js';

const idle = (o = {}) => ({ move: [0, 0], yaw: 0, pitch: 0, fire: false, aim: false, sprint: false, use: false, weapon: null, weaponStep: 0, ...o });
const complete = (id, name, difficulty = 'normal', seed = 1) => runRoute(loadMapFile(`maps/${id}.json`), loadRouteFile(`routes/${id}.${name}.route.json`), { seed, difficulty });

test('Spore Foundry: four brood vats stand on a ring round a solid furnace, each at the end of a toxic trough; the exit is locked and the map says what to do about it', () => {
  const src = shippedSrc('C1E3M07'), map = shippedMap('C1E3M07'), vats = src.entities.filter((e) => e.type === 'enemy' && e.kind === 'vat');
  assert.equal(vats.length, 4); assert.ok(vats.every((v) => v.group === 'vats'), 'one group: the trigger that opens the exit counts them');
  assert.ok(src.entities.some((e) => e.type === 'exit' && e.locked), 'the exit starts locked'); assert.ok(src.triggers.some((t) => t.when === 'dead:vats' && t.do.some((a) => a.exit?.set === 'unlock')), 'and the vats\' death unlocks it');
  assert.ok(vats.some((v) => v.spawns) && vats.some((v) => !v.spawns), 'some vats name their brood, one uses the default kinds');
  assert.equal(map.kind(34, 28), 'wall', 'the furnace is a solid core'); assert.equal(map.fx(27, 24) === 'x' || map.fx(28, 24) === 'x' || map.fx(29, 25) === 'x', true, 'toxic troughs run from it');
  assert.equal(src.quality.scaleClass, 'COMPRESSION'); assert.equal(src.atmosphere.look, 'foundry'); assert.deepEqual(src.drops.keep, [[23, 26, 24, 30]]);
  assert.equal(findTraps(map).traps, 0);
});

test('Spore Foundry: killing the four vats fires the trigger and unlocks the exit (and not before); the vats birth while they live', () => {
  const map = shippedMap('C1E3M07'), w = createWorld(map, { seed: 1, difficulty: 'normal' }), vats = w.enemies.filter((e) => e.kind === 'vat');
  assert.equal(vats.length, 4); assert.ok(Object.values(w.exitLocked).every(Boolean), 'locked'); const p = w.player; Object.assign(p, { x: 24 * 2 + 1, z: 31 * 2 + 1 }); p.hp = 1e9;
  let births = 0; for (let i = 0; i < 60 * 12; i++) { step(w, idle()); births += drainEvents(w).filter((e) => e.type === 'vat_birth').length; }
  assert.ok(births >= 1, 'a vat in sight of the player births'); const sw = vats[3]; assert.notEqual(sw.state, 'idle', 'the south-west vat woke on sight');
  for (const v of vats.slice(0, 3)) damageEnemy(w, v, 1e6); step(w, idle()); assert.ok(Object.values(w.exitLocked).every(Boolean), 'three of four: still locked');
  damageEnemy(w, vats[3], 1e6); const ev = []; for (let i = 0; i < 3; i++) { step(w, idle()); ev.push(...drainEvents(w)); } assert.ok(Object.values(w.exitLocked).every((x) => !x), 'unlocked'); assert.ok(ev.some((e) => e.type === 'exit_unlock'));
});

test('Spore Foundry: both routes complete on every difficulty; the secret one finds the cellar', () => {
  for (const difficulty of ['easy', 'normal', 'hard']) { const r = complete('C1E3M07', 'main', difficulty); assert.equal(r.result, 'complete', difficulty + ' ' + r.failure); }
  const s = complete('C1E3M07', 'secret'); assert.equal(s.result, 'complete'); assert.equal(s.world.stats.secrets, 1);
});

test('Cantor\'s Throat: a gullet, four ribs that shut off the width in turn, a bell with a baffle across its mouth and a ring of pillars; the Grand Cantor stands behind four reeds, the exit is locked', () => {
  const src = shippedSrc('C1E3M08'), map = shippedMap('C1E3M08'), ents = src.entities;
  assert.equal(ents.filter((e) => e.type === 'enemy' && e.kind === 'reed').length, 4); assert.equal(ents.filter((e) => e.type === 'enemy' && e.kind === 'grandcantor').length, 1);
  assert.ok(ents.find((e) => e.kind === 'grandcantor').summons.length >= 4, 'alcoves to call singers from'); assert.ok(ents.some((e) => e.type === 'exit' && e.locked));
  for (const x of [30, 35, 40, 44]) { let walls = 0; for (let z = 16; z <= 40; z++) if (map.kind(x, z) === 'wall') walls++; assert.ok(walls >= 18, `rib at x ${x}: ${walls} wall cells in its column`); }
  assert.ok(map.kind(48, 28) === 'wall' && map.kind(49, 28) === 'wall', 'the baffle'); assert.equal(map.kind(57, 28), 'floor');
  assert.ok(ents.filter((e) => e.type === 'prop' && e.kind === 'pillar').length >= 8, 'pillars: cover from the double ring');
  assert.equal(src.atmosphere.look, 'throat'); assert.equal(src.quality.scaleClass, 'COMPRESSION');
  assert.deepEqual(src.drops.keep, [[0, 0, 999, 999]], 'a boss map keeps every box'); assert.equal(findTraps(map).traps, 0);
});

test('Cantor\'s Throat: the reeds\' death fires the shield trigger, the boss\'s death unlocks the exit; the boss is shielded and staggered as the Cantor\'s defs say', () => {
  const map = shippedMap('C1E3M08'), w = createWorld(map, { seed: 1, difficulty: 'normal' }), reeds = w.enemies.filter((e) => e.kind === 'reed'), boss = w.enemies.find((e) => e.kind === 'grandcantor');
  assert.equal(reeds.length, 4); assert.ok(Object.values(w.exitLocked).every(Boolean)); w.player.hp = 1e9;
  const before = boss.hp; damageEnemy(w, boss, 100); assert.ok(Math.abs((before - boss.hp) - 100 * ENEMIES.grandcantor.shield.reduce) < 1e-6, 'shielded while the reeds stand');
  const ev = []; for (const r of reeds) damageEnemy(w, r, 1e6); for (let i = 0; i < 3; i++) { step(w, idle()); ev.push(...drainEvents(w)); }
  assert.ok(ev.some((e) => e.type === 'trigger' && e.id === 'shield-down'), 'the shield-down trigger'); assert.ok(Object.values(w.exitLocked).every(Boolean), 'the exit is still locked');
  boss.stunT = 0; const b2 = boss.hp; damageEnemy(w, boss, 100); assert.equal(b2 - boss.hp, 100, 'the whole blow once the reeds are gone');
  damageEnemy(w, boss, 1e6); const ev2 = []; for (let i = 0; i < 3; i++) { step(w, idle()); ev2.push(...drainEvents(w)); } assert.ok(Object.values(w.exitLocked).every((x) => !x), 'the boss\'s death unlocks the exit');
});

test('Cantor\'s Throat: both routes complete on every difficulty (the secret one fetches the cellar of caught breath)', () => {
  for (const difficulty of ['easy', 'normal', 'hard']) { const r = complete('C1E3M08', 'main', difficulty); assert.equal(r.result, 'complete', difficulty + ' ' + r.failure); assert.ok(r.world.enemies.filter((e) => e.kind === 'grandcantor').every((e) => e.state === 'dead'), 'the boss is dead'); }
  const s = complete('C1E3M08', 'secret'); assert.equal(s.result, 'complete'); assert.equal(s.world.stats.secrets, 1);
});
