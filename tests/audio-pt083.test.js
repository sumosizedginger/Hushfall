// PT-083 phase 4: rooms for every look, footsteps for every floor, the mix gives way when something has to be heard, and no sound of the guns passes full scale.
import test from 'node:test';
import assert from 'node:assert/strict';
import { LOOKS } from '../src/engine/defs.js';
import { ROOMS, ROOM_OF_LOOK, roomFor, impulse, STEP_OF_FAMILY, DUCKS } from '../src/audio/rooms.js';
import { SURFACE_FAMILIES } from '../src/engine/surfaces.js';
import { soundsForEvent } from '../src/audio/events.js';
import { SFX, seededRandom } from '../src/audio/synth.js';
import { AudioEngine } from '../src/audio/engine.js';

test('A2: every look of the game has a family of room, every room builds, a room with more damping is darker and a longer one lasts longer', () => {
  for (const k of Object.keys(LOOKS)) assert.ok(ROOMS[ROOM_OF_LOOK[k]], k + ' has no room');
  for (const k of Object.keys(ROOM_OF_LOOK)) assert.ok(LOOKS[k], k + ' is not a look');
  assert.equal(roomFor('deep', false), 'open', 'under the sky every place is open');
  assert.equal(roomFor('deep', true), 'cave');
  const rms = (a, from, to) => {
    let s = 0;
    for (let i = from; i < to; i++) s += a[i] * a[i];
    return Math.sqrt(s / (to - from));
  };
  const SR = 8000;
  for (const r of Object.keys(ROOMS)) {
    const [L, R] = impulse(seededRandom(3), SR, r);
    assert.equal(L.length, Math.floor(SR * ROOMS[r].secs));
    assert.ok(L.every(Number.isFinite) && R.every(Number.isFinite), r);
    assert.ok(rms(L, 0, 400) > rms(L, L.length - 400, L.length) * 5, r + ' decays');
    assert.ok(Math.max(...L.subarray(0, 4000).map(Math.abs)) <= 1.5, r + ' stays bounded');
    assert.notDeepEqual(L.slice(0, 200), R.slice(0, 200), r + ' is stereo');
  }
  // how rough the tail is for how loud it is: a damped tail is smooth
  const hf = (x) => {
    let d = 0,
      m = 0;
    for (let i = Math.floor(x.length * 0.3); i < x.length * 0.6; i++) {
      d += Math.abs(x[i] - x[i - 1]);
      m += Math.abs(x[i]);
    }
    return d / m;
  };
  const [hull] = impulse(seededRandom(3), SR, 'hull'),
    [cave] = impulse(seededRandom(3), SR, 'cave');
  assert.ok(hf(hull) > hf(cave), 'iron rings brighter than rock');
});

test('A4: every floor family has its footstep, and every impact and small sound has a recipe', () => {
  for (const f of SURFACE_FAMILIES) assert.ok(SFX[STEP_OF_FAMILY[f]], f + ' step');
  for (const surface of [...SURFACE_FAMILIES, undefined]) {
    const [s] = soundsForEvent({ type: 'impact', x: 1, z: 1, surface });
    assert.ok(SFX[s.id], 'impact on ' + surface + ': ' + s.id);
  }
  for (const id of ['case_drop', 'sprint_breath', 'land_thud', 'dry_click', 'hit_tick', 'kill_tick']) assert.ok(SFX[id], id);
  assert.equal(soundsForEvent({ type: 'impact', surface: 'metal' })[0].id, 'impact_metal');
  assert.equal(soundsForEvent({ type: 'impact', surface: 'stone' })[0].id, 'impact');
});

/** a stand-in AudioContext that records what is built, and refuses what a browser would refuse */
function strictContext() {
  const param = (v = 0) => ({
    value: v,
    setValueAtTime() {},
    setTargetAtTime() {},
    linearRampToValueAtTime() {},
    exponentialRampToValueAtTime(x) {
      assert.ok(x > 0, 'an exponential ramp to zero');
    },
    cancelScheduledValues() {},
  });
  const node = (extra = {}) => ({ connect() {}, disconnect() {}, start() {}, stop() {}, ...extra });
  const built = [];
  const c = {
    sampleRate: 8000,
    currentTime: 0,
    state: 'running',
    built,
    listener: {},
    destination: {},
    createGain: () => node({ gain: param(1) }),
    createOscillator: () => node({ frequency: param(), detune: param(), type: 'sine' }),
    createBiquadFilter: () => node({ frequency: param(), Q: param(), gain: param(), type: 'lowpass' }),
    createBufferSource: () => node({ buffer: null, loop: false, playbackRate: param(1) }),
    createBuffer: (ch, len, sr) => ({ numberOfChannels: ch, length: len, sampleRate: sr, getChannelData: () => new Float32Array(len), copyToChannel() {} }),
    createWaveShaper: () => {
      const w = node({ curve: null });
      built.push(w);
      return w;
    },
    createPanner: () => node({ positionX: param(), positionY: param(), positionZ: param() }),
    createDynamicsCompressor: () => node({ threshold: param(), knee: param(), ratio: param(), attack: param(), release: param() }),
    createConvolver: () => node({ buffer: null }),
    createStereoPanner: () => node({ pan: param() }),
    createPeriodicWave: () => ({}),
  };
  return c;
}

test('A1: every gun sound runs on a real graph; the heavy guns go through a soft clip that never passes full scale', () => {
  const c = strictContext(),
    out = c.createGain();
  for (const id of ['flare_fire', 'scatter_fire', 'rivet_fire', 'harpoon_fire', 'arc_fire', 'carbine_fire', 'rocket_fire', 'mortar_fire']) {
    const d = SFX[id](c, out, 0, { r: seededRandom(1) });
    assert.ok(d > 0.05 && d < 3, id + ' has a length');
  }
  assert.ok(c.built.length >= 6, 'the guns are driven');
  for (const w of c.built) {
    assert.ok(w.curve[0] >= -1 - 1e-6 && w.curve[w.curve.length - 1] <= 1 + 1e-6, 'bounded');
    assert.ok(Math.abs(w.curve[Math.floor(w.curve.length / 2)]) < 0.01, 'silence stays silence');
  }
});

test('A3: the graph has a limiter and a ducking stage; a blast, a hurt, a windup and a message make the music give way, and it comes back', () => {
  const c = strictContext(),
    a = new AudioEngine({ sfxVolume: 1, musicVolume: 1, masterVolume: 1 });
  a.ctx = c;
  a._build();
  assert.ok(a.musicDuck, 'the stage is there');
  for (const k of Object.keys(DUCKS)) assert.ok(DUCKS[k].k < 1 && DUCKS[k].s > 0, k);
  const calls = [];
  a.musicDuck.gain.setTargetAtTime = (v, t) => calls.push([v, t]);
  a.handleEvents([{ type: 'explode', x: 1, y: 1, z: 1, r: 3 }]);
  assert.equal(calls[0][0], DUCKS.explode.k, 'it steps back');
  assert.equal(calls[1][0], 1, 'and returns');
  for (const type of ['hurt', 'enemy_windup', 'message']) {
    calls.length = 0;
    a.handleEvents([{ type, amount: 5, kind: 'tollbearer', text: 'x', id: 'm' }]);
    assert.ok(calls.length >= 2, type);
  }
});

test('A2: walking between kinds of room changes the impulse, builds each only once, and the send follows', () => {
  const c = strictContext(),
    a = new AudioEngine({ sfxVolume: 1, musicVolume: 1, masterVolume: 1 });
  a.ctx = c;
  a._build();
  const town = a.reverb.buffer;
  assert.ok(town, 'a room from the start');
  a.setRoom('cave');
  const cave = a.reverb.buffer;
  assert.notEqual(cave, town);
  a.setRoom('town');
  assert.equal(a.reverb.buffer, town, 'kept, not rebuilt');
  assert.equal(a.roomBuffers.size, 2);
});

test('A4: a dry gun clicks, but not every tick of a held trigger', () => {
  const c = strictContext(),
    a = new AudioEngine({ sfxVolume: 1, musicVolume: 1, masterVolume: 1 });
  a.ctx = c;
  a._build();
  a.clock = 1;
  assert.equal(a.play('dry_click'), true);
  assert.equal(a.play('dry_click'), false);
  a.clock = 1.3;
  assert.equal(a.play('dry_click'), true);
  assert.equal(soundsForEvent({ type: 'dry' })[0].id, 'dry_click');
});
