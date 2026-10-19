// PT-061 (V8): eyes as state. The four colours are four different colours, the mapping follows what the creature is doing, and the view drives every kit creature's own glow material from it (checked on the real view in node).
import test from 'node:test';
import assert from 'node:assert/strict';
import { EYE, eyeColor } from '../src/render/eyes.js';

test('four states, four colours: asleep, awake, hunting, striking; a lunge dash and the strike of an attack are white; a creature that lost you goes back to awake', () => {
  assert.equal(new Set(Object.values(EYE)).size, 4);
  assert.equal(eyeColor({ state: 'idle' }, 0.6, 1), EYE.asleep, 'asleep wins');
  assert.equal(eyeColor({ state: 'chase', lost: 0 }), EYE.hunting); assert.equal(eyeColor({ state: 'chase', lost: 3 }), EYE.awake);
  assert.equal(eyeColor({ state: 'chase', lost: 0 }, 0.6, 0), EYE.striking); assert.equal(eyeColor({ state: 'chase', lost: 0 }, 0.2, 0), EYE.hunting, 'the windup is not the blow'); assert.equal(eyeColor({ state: 'chase', lost: 0 }, 0, 1), EYE.striking); assert.equal(eyeColor({ state: 'chase', lost: 0 }, 0, -0.5), EYE.hunting, 'the crouch is not the dash');
});
