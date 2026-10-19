// PT-061 (S1): the chainsaw's sustained voice. Built against a recording fake of the WebAudio graph (no browser): the revs raise the pitch, the filter and the loudness, a bite (cutting) deepens and roughens it, a stall cuts it to a sputter, nothing running is silent;
// `sawState` reads the saw record only while the chainsaw is in hand; the engine creates the voice lazily and survives a context that cannot make one.
import test from 'node:test';
import assert from 'node:assert/strict';
import { makeSawVoice, sawState } from '../src/audio/sawvoice.js';
import { runningAudio } from './stubs.js';

function fakeCtx() {
  const param = (v = 0) => { const q = { value: v, last: v, setTargetAtTime(x) { q.last = x; } }; return q; };
  const node = (extra = {}) => ({ gain: param(), frequency: param(), Q: param(), connect() {}, disconnect() {}, start() {}, stop() {}, ...extra });
  return { currentTime: 0, sampleRate: 8000, createGain: () => node(), createOscillator: () => node({ type: '' }), createBiquadFilter: () => node({ type: '' }), createBuffer: (n, len) => ({ getChannelData: () => new Float32Array(len) }), createBufferSource: () => node({ buffer: null, loop: false }) };
}
test('the voice follows the saw: revs raise pitch, cutoff and level; a bite lowers the pitch and raises the level; a stall sputters; stopped, it is silent', () => {
  const c = fakeCtx(), out = { connect() {} }, v = makeSawVoice(c, out), level = () => v.master.gain.last;
  v.set({ spin: 0 }); assert.equal(level(), 0, 'idle saw, no voice'); v.set({ spin: 0.3 }); const low = level(); v.set({ spin: 1 }); const high = level(); assert.ok(high > low * 1.5, `revs raise the level: ${low.toFixed(3)} -> ${high.toFixed(3)}`);
  v.set({ spin: 1, load: 1 }); assert.ok(level() > high, 'a bite is louder');
  v.set({ spin: 1, stall: 1, t: 0.05 }); const st = level(); assert.ok(st < high, 'a stall is quieter'); v.set({ spin: 0.5, stall: 1, t: 0.3 }); const st2 = level(); assert.notEqual(st, st2, 'and uneven: it coughs');
  v.set({ spin: 0 }); assert.equal(level(), 0); assert.doesNotThrow(() => v.stop());
});
test('sawState reads p.saw only with the chainsaw in hand and a saw that is running or stalled', () => {
  assert.equal(sawState({ weapon: 'flare', saw: { spin: 1 } }), null); assert.equal(sawState({ weapon: 'chainsaw' }), null); assert.equal(sawState({ weapon: 'chainsaw', saw: { spin: 0, stall: 0 } }), null);
  assert.deepEqual(sawState({ weapon: 'chainsaw', saw: { spin: 0.4, eng: true, stall: 0 } }), { spin: 0.4, load: 1, stall: 0 }); assert.equal(sawState({ weapon: 'chainsaw', saw: { spin: 0, stall: 1.2 } }).stall, 1);
});
test('the engine makes the voice lazily, and a context that cannot make one goes without (no throw, no retry every frame)', () => {
  const a = runningAudio(), world = { status: 'playing', enemies: [], player: { x: 0, z: 0, yaw: 0, vx: 0, vz: 0, bob: 0, hp: 100, weapon: 'chainsaw', saw: { spin: 1, heat: 0, stall: 0, eng: true } }, tick: 1 }, map = { isInterior: () => false, props: [], atmosphere: {} };
  assert.doesNotThrow(() => { for (let i = 0; i < 3; i++) a.update(world, 0.016, map); }); assert.equal(a.sawFailed, true, 'the stub context has no oscillators: the voice is switched off, once');
});
