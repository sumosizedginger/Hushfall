// GEMINI ATTACK FUZZER: Gamepad NaN / Zero Division Look Angle Corruption
import { deadzone, stickLook, PadDevice, PAD_SETTINGS } from '../../../src/game/gamepad.js';
import { InputState } from '../../../src/engine/input.js';
import { createWorld, step } from '../../../src/engine/world.js';
import { parseMap } from '../../../src/engine/mapformat.js';
import fs from 'node:fs';

console.log('=== GEMINI FUZZER: Gamepad NaN & Division by Zero Probe ===');

// Test 1: deadzone with NaN inputs
const dzNaN = deadzone(NaN, 0, 0.18);
console.log('deadzone(NaN, 0, 0.18):', dzNaN);

// Test 2: deadzone with dz = 1.0 (division by zero)
const dzDivZero = deadzone(0.5, 0.5, 1.0);
console.log('deadzone(0.5, 0.5, 1.0):', dzDivZero);

// Test 3: stickLook with NaN axes
const lookNaN = stickLook(NaN, 0, 1 / 60, PAD_SETTINGS, 1);
console.log('stickLook(NaN, 0):', lookNaN);

// Test 4: Impact on InputState and World Simulation
const input = new InputState();
input.addYaw(lookNaN[0]);
input.addPitch(lookNaN[1]);
const cmd = input.sample();
console.log('Sampled InputState cmd with NaN look:', cmd);

const map = parseMap(JSON.parse(fs.readFileSync('tests/fixtures/C1E1M01.json', 'utf8')));
const w = createWorld(map);
console.log('Before step: yaw =', w.player.yaw, 'pitch =', w.player.pitch);
step(w, cmd);
console.log('After step with NaN look: yaw =', w.player.yaw, 'pitch =', w.player.pitch);

console.log('=== Fuzzer Complete ===');
