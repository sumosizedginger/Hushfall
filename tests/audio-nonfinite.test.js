// Round 1 of the outside audit (Gemini 4): a browser's AudioParam throws a TypeError for NaN or Infinity, and AudioEngine.play wrote a sound's position, gain and delay straight into one. The page's frame guard turns a throw into the
// "something broke" screen, so one sound with a bad number could end a session. This runs the REAL play() against a context whose parameters throw as a browser's do.
import test from 'node:test';
import assert from 'node:assert/strict';
import { AudioEngine } from '../src/audio/engine.js';
import { SFX } from '../src/audio/synth.js';
import { runningAudio } from './stubs.js';

const param = (name, log) => { let v = 0; return { get value() { return v; }, set value(x) { if (!Number.isFinite(x)) throw new TypeError(`Failed to set the 'value' property on 'AudioParam': ${name} is non-finite`); v = x; log.push([name, x]); } };};
function engine() {
  const log = [], a = runningAudio();
  a.play = AudioEngine.prototype.play.bind(a);                                                    // the real one: runningAudio replaces it with a recorder
  a.ctx.createGain = () => ({ gain: param('gain', log), connect() {} });
  a.ctx.createPanner = () => ({ positionX: param('x', log), positionY: param('y', log), positionZ: param('z', log), connect() {}, set panningModel(_) {}, set distanceModel(_) {}, set refDistance(_) {}, set rolloffFactor(_) {}, set maxDistance(_) {} });
  a.rand = () => 0.5; a.clock = 0; a.hushT = 0; a.stats = { played: 0, dropped: 0, log: [] };
  return { a, log };
}

test('a position, a gain or a delay that is not a finite number never throws out of play(), and a good one is still used', () => {
  SFX.__nonfinite_probe = () => 0.1;
  try {
    const { a, log } = engine();
    assert.equal(a.play('__nonfinite_probe', { pos: [3, 4], gain: 0.5 }), true, 'a good call plays, as before');
    assert.deepEqual(log.filter(([n]) => n === 'x' || n === 'z'), [['x', 3], ['z', 4]], 'the position reaches the panner');
    for (const bad of [{ pos: [NaN, 4] }, { pos: [3, Infinity] }, { pos: [undefined, 1] }, { gain: NaN }, { gain: -Infinity }, { delay: NaN }, { pos: [NaN, NaN], gain: NaN, delay: Infinity }]) {
      const e = engine(); assert.doesNotThrow(() => e.a.play('__nonfinite_probe', bad), JSON.stringify(bad));
      assert.equal(e.a.stats.played, 1, 'the sound still played: ' + JSON.stringify(bad));
    }
    const e = engine(); e.a.play('__nonfinite_probe', { pos: [NaN, 4] }); assert.ok(!e.log.some(([n]) => n === 'x' || n === 'z'), 'a position nobody can place is not given to the panner (it plays plain)');
  } finally { delete SFX.__nonfinite_probe; }
});
