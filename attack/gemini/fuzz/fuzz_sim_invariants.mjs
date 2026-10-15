// GEMINI ATTACK FUZZER: Simulation Invariants, Bounds & Determinism Fuzzer
import fs from 'node:fs';
import { createWorld, step, drainEvents, hashWorld, carryOver } from '../../../src/engine/world.js';
import { makeSave, loadWorld, parseSave } from '../../../src/engine/save.js';
import { parseMap } from '../../../src/engine/mapformat.js';
import { InputState, ACTIONS } from '../../../src/engine/input.js';

console.log('=== GEMINI FUZZER: Simulation Invariants & Determinism ===');

const mapFiles = ['maps/C1E1M01.json', 'maps/C1E2M01.json', 'maps/C1E3M01.json', 'maps/C1E4M01.json', 'maps/C2M01.json'];
const maps = mapFiles.map(f => parseMap(JSON.parse(fs.readFileSync(f, 'utf8'))));

function randomRng(seed) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

let invariantFailures = 0;
let determinismFailures = 0;

for (const map of maps) {
  console.log(`Fuzzing map: ${map.id}...`);
  const rng = randomRng(12345);
  
  // Create 2 worlds with identical seeds to test bit-for-bit determinism
  const w1 = createWorld(map, { seed: 42, difficulty: 'normal' });
  const w2 = createWorld(map, { seed: 42, difficulty: 'normal' });
  
  for (let t = 0; t < 300; t++) {
    // Generate random input command
    const cmd = {
      move: [rng() * 2 - 1, rng() * 2 - 1],
      yaw: (rng() * 2 - 1) * 0.1,
      pitch: (rng() * 2 - 1) * 0.05,
      fire: rng() < 0.2,
      aim: rng() < 0.2,
      sprint: rng() < 0.3,
      use: rng() < 0.05,
      melee: rng() < 0.1,
      weapon: rng() < 0.05 ? Math.floor(rng() * 10) : null,
      weaponStep: rng() < 0.1 ? (rng() < 0.5 ? 1 : -1) : 0,
    };
    
    step(w1, cmd);
    step(w2, cmd);
    drainEvents(w1);
    drainEvents(w2);
    
    // Check Invariants on w1
    const p = w1.player;
    if (!Number.isFinite(p.x) || !Number.isFinite(p.z) || !Number.isFinite(p.y)) {
      console.error(`[INVARIANT] Tick ${t} ${map.id}: Player pos not finite: ${p.x}, ${p.y}, ${p.z}`);
      invariantFailures++;
    }
    if (!Number.isFinite(p.yaw) || !Number.isFinite(p.pitch)) {
      console.error(`[INVARIANT] Tick ${t} ${map.id}: Player yaw/pitch not finite: ${p.yaw}, ${p.pitch}`);
      invariantFailures++;
    }
    if (!Number.isFinite(p.hp) || p.hp < 0) {
      if (p.hp < 0) {
        // Player should be clamped to 0 when dead
        console.error(`[INVARIANT] Tick ${t} ${map.id}: Player hp negative: ${p.hp}`);
        invariantFailures++;
      }
    }
    
    for (const e of w1.enemies) {
      if (!Number.isFinite(e.x) || !Number.isFinite(e.z) || !Number.isFinite(e.y) || !Number.isFinite(e.hp)) {
        console.error(`[INVARIANT] Tick ${t} ${map.id}: Enemy ${e.id} state not finite`);
        invariantFailures++;
      }
    }
    
    // Check Determinism
    const h1 = hashWorld(w1);
    const h2 = hashWorld(w2);
    if (h1 !== h2) {
      console.error(`[DETERMINISM] Hash mismatch at tick ${t} on ${map.id}: ${h1} vs ${h2}`);
      determinismFailures++;
      break;
    }
  }
}

console.log(`=== Invariants check finished. Failures: ${invariantFailures}, Determinism Failures: ${determinismFailures} ===`);
