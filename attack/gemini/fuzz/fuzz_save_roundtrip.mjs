// GEMINI ATTACK FUZZER: Save/Load Mid-Level Roundtrip & Continuation Invariants
import fs from 'node:fs';
import { createWorld, step, hashWorld } from '../../../src/engine/world.js';
import { makeSave, loadWorld, parseSave } from '../../../src/engine/save.js';
import { parseMap } from '../../../src/engine/mapformat.js';

console.log('=== GEMINI FUZZER: Save/Load Mid-Level Continuation Probe ===');

const map = parseMap(JSON.parse(fs.readFileSync('maps/C1E1M01.json', 'utf8')));
const loader = (id) => map;

function scriptedCmd(tick) {
  const p = Math.floor(tick / 30) % 5;
  return {
    move: [p === 1 ? 1 : p === 2 ? -1 : 0, p < 3 ? 1 : 0],
    yaw: p === 0 ? 0.02 : p === 3 ? -0.04 : 0,
    pitch: 0,
    fire: tick % 60 === 0,
    aim: tick % 90 === 0,
    sprint: tick % 45 === 0,
    use: tick % 120 === 0,
    weapon: null,
  };
}

// 1. Continuous Run for 600 ticks
const straight = createWorld(map, { seed: 99, difficulty: 'normal' });
for (let t = 0; t < 600; t++) step(straight, scriptedCmd(t));
const straightHash = hashWorld(straight);

// 2. Interrupted Run: Step to 300, Save, Load, Step to 600
const interrupted = createWorld(map, { seed: 99, difficulty: 'normal' });
for (let t = 0; t < 300; t++) step(interrupted, scriptedCmd(t));

const saveObj = makeSave(interrupted, 'mid-level', { now: 500 });
const parsed = parseSave(JSON.stringify(saveObj));
if (!parsed.ok) {
  console.error('Failed to parse save:', parsed);
  process.exit(1);
}

const loaded = loadWorld(parsed.save, loader);
if (!loaded.ok) {
  console.error('Failed to load world:', loaded);
  process.exit(1);
}

for (let t = 300; t < 600; t++) step(loaded.world, scriptedCmd(t));
const resumedHash = hashWorld(loaded.world);

console.log('Continuous hash at 600 ticks:', straightHash);
console.log('Resumed hash at 600 ticks:   ', resumedHash);
if (straightHash === resumedHash) {
  console.log('PASS: Save/load continuation preserves bit-for-bit determinism!');
} else {
  console.error('FAIL: Determinism broken across mid-level save/load!');
}
