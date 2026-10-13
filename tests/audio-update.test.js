// PT-043 regression (the owner, 2026-10-13: every dev level a black screen, "engine.js:92 Cannot read properties of undefined (reading 'x')"): AudioEngine.update runs every frame, with NO world on the title / menus,
// and only when the AudioContext is running (a real click has unlocked it: headless Chrome never reached it, so no browser job could see the crash). A throw there stops the requestAnimationFrame chain: the page goes black.
import test from 'node:test';
import assert from 'node:assert/strict';
import { AudioEngine } from '../src/audio/engine.js';
import { loadMapFile } from '../src/engine/harness.js';
import { createWorld } from '../src/engine/world.js';
import { ROOT } from './helpers.js';
import path from 'node:path';

const running = () => {
  const a = new AudioEngine({ sfxVolume: 1, musicVolume: 1 }), params = new Proxy({}, { get: () => ({ value: 0, setTargetAtTime() {} }) });
  a.ctx = { state: 'running', currentTime: 0, listener: { positionX: { value: 0 }, positionY: { value: 0 }, positionZ: { value: 0 }, forwardX: { value: 0 }, forwardY: { value: 0 }, forwardZ: { value: 0 }, upX: { value: 0 }, upY: { value: 0 }, upZ: { value: 0 } } };
  a.music = { tick() {}, setIntensity() {} }; a.ambience = { update() {} }; a.reverbSend = { gain: params.gain }; a.play = () => true; a.settings = { sfxVolume: 1, musicVolume: 1 };
  return a;
};

test('the per-frame audio update with no world (the title, the menus) does not throw, whatever map id is current', () => {
  const a = running();
  assert.doesNotThrow(() => a.update(null, 0.016, undefined), 'no world and no map');
  assert.doesNotThrow(() => a.update(null, 0.016, { atmosphere: {}, props: [], isInterior: () => true }), 'no world, a map');
  assert.doesNotThrow(() => a.update(undefined, 0.016, undefined));
});

test('the per-frame audio update with a world of a shipped map runs, and a Hive map plays the beat once a beat', () => {
  const a = running(), map = loadMapFile(path.join(ROOT, 'maps-dev', 'HIVEBOSS.json')), w = createWorld(map, { difficulty: 'normal', seed: 1 }), played = [];
  a.play = (id) => { played.push(id); return true; };
  assert.doesNotThrow(() => a.update(w, 0.016, map));
  assert.ok(played.includes('hive_beat'), 'the beat is heard in the Hive Cantor arena');
});
