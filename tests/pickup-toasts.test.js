// The pickup toast shows what the pickup really grants: the amounts come from PICKUPS, so the two cannot drift (the rivet toast said +30, the pickup gave 40).
import test from 'node:test';
import assert from 'node:assert/strict';
import { PICKUPS } from '../src/engine/defs.js';
import { pickupToast, PICKUP_NAMES } from '../src/game/toasts.js';
import { createWorld, step } from '../src/engine/world.js';
import { loadMap } from './helpers.js';

test('every non-key, non-weapon pickup toast states exactly the amount PICKUPS grants', () => {
  for (const [kind, def] of Object.entries(PICKUPS)) {
    if (def.type === 'key' || def.type === 'weapon') continue;
    assert.ok(PICKUP_NAMES[kind], `${kind} has a toast name`); assert.equal(pickupToast(kind), `${PICKUP_NAMES[kind]} (+${def.amount})`);
  }
});
test('the rivet toast says +40, the amount the rivet pickup really adds in the sim', () => {
  assert.equal(pickupToast('ammo_rivet'), 'Rivets (+40)');
  const w = createWorld(loadMap(), { seed: 1 }); w.enemies.length = 0; w.player.weapons = ['flare', 'rivet']; w.player.ammo.rivet = 0;
  w.pickups.push({ id: 9001, kind: 'ammo_rivet', x: w.player.x, z: w.player.z }); step(w, { move: [0, 0], yaw: 0, pitch: 0, fire: false, aim: false, sprint: false, use: false, weapon: null, weaponStep: 0 });
  assert.equal(w.player.ammo.rivet, PICKUPS.ammo_rivet.amount, 'the sim grants the amount the toast states');
});
test('keys and unknown kinds show only their name', () => { assert.equal(pickupToast('key_brass'), 'Brass key'); assert.equal(pickupToast('mystery'), 'Picked up mystery'); });
