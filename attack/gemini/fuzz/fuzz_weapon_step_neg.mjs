// GEMINI ATTACK FUZZER: Weapon Step Negative Wrap-Around Underflow
import fs from 'node:fs';
import { createWorld, step } from '../../../src/engine/world.js';
import { parseMap } from '../../../src/engine/mapformat.js';

console.log('=== GEMINI FUZZER: Negative Weapon Step Wrap-Around Probe ===');

const map = parseMap(JSON.parse(fs.readFileSync('tests/fixtures/C1E1M01.json', 'utf8')));

// Test various negative weaponStep deltas
for (const stepDelta of [-1, -2, -3, -4, -5, -10]) {
  const w = createWorld(map);
  const initialWeapon = w.player.weapon;
  step(w, { move: [0, 0], weaponStep: stepDelta });
  const changed = w.player.weapon !== initialWeapon;
  console.log(`weaponStep: ${stepDelta} | Initial: ${initialWeapon} -> Current: ${w.player.weapon} | Switched: ${changed}`);
}
