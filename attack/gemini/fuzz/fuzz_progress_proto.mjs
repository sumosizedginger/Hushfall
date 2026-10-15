// GEMINI ATTACK FUZZER: Progress & Economy Prototype Pollution & Type Safety
import assert from 'node:assert/strict';
import { buy, describeNext, earn, newProgress, sanitizeProgress, TRACKS } from '../../../src/engine/progress.js';

console.log('=== GEMINI FUZZER: Progress & Economy Vulnerability Probe ===');

// Test 1: buy() with prototype properties
const protoKeys = ['__proto__', 'toString', 'valueOf', 'constructor', 'hasOwnProperty', 'isPrototypeOf'];
for (const key of protoKeys) {
  try {
    const p = newProgress();
    p.salvage = 100;
    const res = buy(p, key);
    console.log(`buy(p, "${key}") returned:`, res);
  } catch (err) {
    console.error(`CRASH in buy(p, "${key}"):`, err.message);
  }
}

// Test 2: describeNext() with prototype properties
for (const key of protoKeys) {
  try {
    const p = newProgress();
    const res = describeNext(p, key);
    console.log(`describeNext(p, "${key}") returned:`, res);
  } catch (err) {
    console.error(`CRASH in describeNext(p, "${key}"):`, err.message);
  }
}

console.log('=== Fuzzer Complete ===');
