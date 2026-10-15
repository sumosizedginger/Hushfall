// GEMINI ATTACK FUZZER: Save Object.assign Hidden Property Overwrite
import fs from 'node:fs';
import { createWorld, step } from '../../../src/engine/world.js';
import { makeSave, loadWorld } from '../../../src/engine/save.js';
import { parseMap } from '../../../src/engine/mapformat.js';

console.log('=== GEMINI FUZZER: Save Game Hidden Property Corruption Probe ===');

const map = parseMap(JSON.parse(fs.readFileSync('tests/fixtures/C1E1M01.json', 'utf8')));
const loader = (id) => map;
const w = createWorld(map);

// Test 1: Inject 'map' into save.world
const saveWithMap = makeSave(w, 'mid-level');
saveWithMap.world.map = { malicious: true };
const loadedMap = loadWorld(saveWithMap, loader);
console.log('Corrupted save.world.map loadWorld result:', loadedMap.ok);
try {
  step(loadedMap.world, { move: [0, 0] });
  console.log('Unexpected: Step succeeded');
} catch (err) {
  console.log('CONFIRMED CRASH from map overwrite:', err.message);
}

// Test 2: Inject 'events' into save.world
const saveWithEvents = makeSave(w, 'mid-level');
saveWithEvents.world.events = 'corrupted_string_not_array';
const loadedEvents = loadWorld(saveWithEvents, loader);
console.log('Corrupted save.world.events loadWorld result:', loadedEvents.ok);
try {
  step(loadedEvents.world, { move: [0, 0], fire: true });
  console.log('Unexpected: Step succeeded');
} catch (err) {
  console.log('CONFIRMED CRASH from events overwrite:', err.message);
}
