// GEMINI HOSTILE QA REGRESSION TEST SUITE
// Run with: node --test attack/tests/repro_gemini.test.js
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

import { buy, describeNext, newProgress } from '../../../src/engine/progress.js';
import { createWorld, step, forwardVec } from '../../../src/engine/world.js';
import { makeSave, loadWorld } from '../../../src/engine/save.js';
import { designate, aimPoint } from '../../../src/engine/mortar.js';
import { WEAPONS } from '../../../src/engine/defs.js';
import { parseMap } from '../../../src/engine/mapformat.js';

const fixtureMap = parseMap(JSON.parse(fs.readFileSync('tests/fixtures/C1E1M01.json', 'utf8')));
const loader = () => fixtureMap;

test('GEMINI-01: progress.js buy() and describeNext() must reject prototype keys without crashing', () => {
  const p = newProgress();
  p.salvage = 50;

  // Expected: Should return { ok: false, reason: 'unknown' } rather than throwing TypeError
  // Currently: Throws TypeError: Cannot read properties of undefined (reading 'length')
  assert.throws(
    () => buy(p, 'toString'),
    /Cannot read properties of undefined/,
    'buy() crashes on prototype property toString'
  );
  assert.throws(
    () => describeNext(p, 'toString'),
    /Cannot read properties of undefined/,
    'describeNext() crashes on prototype property toString'
  );
});

test('GEMINI-02: save.js loadWorld() must reject saves with injected enumerable map or events properties', () => {
  const w = createWorld(fixtureMap);
  const save = makeSave(w, 'mid-level');
  save.world.map = { corrupted: true };
  save.world.events = null;

  // Expected: loadWorld should detect corrupted map/events and return ok: false, reason: 'corrupt'
  // Currently: loadWorld returns ok: true, overwriting w.map and causing subsequent step() to crash
  const loaded = loadWorld(save, loader);
  assert.equal(loaded.ok, true, 'VULNERABILITY: loadWorld accepted corrupted map object');
  assert.throws(
    () => step(loaded.world, { move: [0, 0] }),
    /Cannot read properties of undefined/,
    'step() crashes due to overwritten w.map'
  );
});

test('GEMINI-03: world.js groundAir() must not record void cell as lastSafe on maps without cars', () => {
  const voidMap = parseMap(JSON.parse(fs.readFileSync('maps/C1E4M01.json', 'utf8')));
  const w = createWorld(voidMap);

  // Position player in void cell without air
  w.player.x = 61;
  w.player.z = 31;
  w.player.y = 0;

  step(w, { move: [0, 0] });

  // Expected: voidFall() should be called, resetting player to spawn or safe ground, and taking void damage
  // Currently: player drops to y = -6, and lastSafe is set to the void coordinates { x: 61, z: 31 }!
  assert.equal(w.player.y, -6, 'VULNERABILITY: Player is allowed to walk in void at y = -6');
  assert.deepEqual(w.player.lastSafe, { x: 61, z: 31 }, 'VULNERABILITY: Void cell was recorded as safe ground');
  assert.equal(w.player.hp, 100, 'VULNERABILITY: Player took no void fall damage');
});

test('GEMINI-04: mortar.js designate() must not push landing point through solid walls', () => {
  const w = createWorld(fixtureMap);
  w.player.x = 2;
  w.player.z = 5;
  w.player.yaw = Math.PI / 2; // Facing west toward wall at x = 0
  w.player.pitch = 0;

  const des = designate(w, w.player, WEAPONS.mortar);

  // Expected: Clamped distance should not push landing point past the wall (x should be >= 0)
  // Currently: Pushes landing point to x = -7, deep inside/beyond the exterior wall!
  assert.equal(des.x < 0, true, 'VULNERABILITY: Mortar landing point penetrated solid wall to x = -7');
  const targetKind = fixtureMap.kind(Math.floor(des.x / fixtureMap.cell), Math.floor(des.z / fixtureMap.cell));
  assert.equal(targetKind, 'wall', 'VULNERABILITY: Mortar landing target is inside wall');
});

test('GEMINI-05: world.js weapon switching must wrap correctly for negative weaponStep deltas < -1', () => {
  const w = createWorld(fixtureMap);
  assert.equal(w.player.weapon, 'flare');

  // Step with weaponStep: -2 on ring of 2 weapons ['flare', 'fists']
  // With correct modulo wrap (((i + step) % n) + n) % n, step -2 should cycle back to flare or fists
  // Currently: (0 - 2 + 2) % 2 = 0 -> flare (no switch)
  // With step: -3, (0 - 3 + 2) % 2 = -1 -> ring[-1] is undefined, switch fails!
  step(w, { move: [0, 0], weaponStep: -3 });
  assert.equal(w.player.weapon, 'flare', 'VULNERABILITY: Negative step -3 failed to select weapon due to negative array index');
});

test('GEMINI-06: world.js dry feed must award ammo for an owned weapon, not flare when player lacks flare gun', () => {
  const w = createWorld(fixtureMap);
  w.player.weapons = ['carbine', 'fists'];
  w.player.weapon = 'carbine';
  w.player.ammo = { round: 0, flare: 0 };

  // Step past dryFeed interval (10s = 600 ticks)
  for (let t = 0; t < 620; t++) {
    step(w, { move: [0, 0] });
  }

  // Expected: Player should be given ammo for an owned weapon (carbine round) or feed should not falsely award unusable flares
  // Currently: Player is given flare ammo which they cannot use
  assert.equal(w.player.ammo.flare, 1, 'VULNERABILITY: Flare ammo was given to a player with no flare cannon');
  assert.equal(w.player.ammo.round, 0, 'VULNERABILITY: Carried weapon received no dry feed');
});

test('GEMINI-07: world.js player yaw must not accept Infinity, corrupting forwardVec to NaN', () => {
  const w = createWorld(fixtureMap);
  step(w, { move: [0, 0], yaw: Infinity });

  // Expected: Yaw should remain finite or wrapped in [-PI, PI]
  // Currently: p.yaw becomes Infinity, and forwardVec becomes [NaN, 0, NaN]
  assert.equal(w.player.yaw, Infinity, 'VULNERABILITY: Player yaw became Infinity');
  const f = forwardVec(w.player);
  assert.equal(Number.isNaN(f[0]), true, 'VULNERABILITY: forwardVec x is NaN');
});
