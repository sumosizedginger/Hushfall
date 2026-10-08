// PT-015: the Chandlery's only secret (a resin panel in the vault's east wall) went unseen: the owner finished with 6 kills missing and "no sign of a secret". Two causes were possible and the fix covers both: nothing outside the vault
// pointed at its hatch (lanterns and a log entry now do), and the panel's own tell was a 5 cm hairline (see tests/render.test.js for its floor).
import test from 'node:test';
import assert from 'node:assert/strict';
import { createWorld, step, drainEvents } from '../src/engine/world.js';
import { shippedMap } from './helpers.js';

const HATCH = [48, 31];                                                      // the vault's hatch door, in the south wall of the chandler's office
const idle = () => ({ move: [0, 0], yaw: 0, pitch: 0, fire: false, aim: false, sprint: false, use: false, weapon: null, weaponStep: 0, map: false });

test('the Chandlery hatch is flanked by two lanterns, one on each side, in the room the player reaches it from', () => {
  const m = shippedMap('C1E1M04'), lanterns = m.props.filter((p) => p.kind === 'lantern').map((p) => [Math.floor(p.at[0]), Math.floor(p.at[1])]);
  for (const c of [[HATCH[0] - 1, HATCH[1] - 1], [HATCH[0] + 1, HATCH[1] - 1]]) assert.ok(lanterns.some((l) => l[0] === c[0] && l[1] === c[1]), 'a lantern at ' + c);
  assert.ok(m.doors.has(HATCH.join(',')), 'the hatch is a door');
});

test('standing at the hatch in the office the player gets the log entry that names the strongroom and what lies behind its east wall; it fires once', () => {
  const m = shippedMap('C1E1M04'), w = createWorld(m, { seed: 1 }); w.enemies.length = 0;
  const msg = m.messages.find((x) => x.id === 'hatch'); assert.ok(msg, 'a message with the id hatch');
  assert.ok(Math.hypot(msg.at[0] - HATCH[0], msg.at[1] - HATCH[1]) <= 2.5, 'at the hatch');
  assert.match(msg.text, /hatch/i); assert.match(msg.text, /east/i); assert.ok(msg.text.length <= 180);
  w.player.x = (msg.at[0] + 0.5) * m.cell; w.player.z = (msg.at[1] + 0.5) * m.cell;
  const seen = []; for (let i = 0; i < 90; i++) { step(w, idle()); seen.push(...drainEvents(w).filter((e) => e.type === 'message')); }
  assert.deepEqual(seen.map((e) => e.id).filter((id) => id === 'hatch'), ['hatch'], 'once');
});
