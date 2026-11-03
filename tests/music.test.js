// PT-081, THE SMART MUSIC: the score (score.js), the fight's level (intensity.js) and the real player (music.js) run against a STRICT
// stand-in AudioContext that throws where a browser would (a non-finite AudioParam value, an exponential ramp to zero or below, a
// start or stop at a bad time). The owner judges how it SOUNDS; these hold what can be held without ears.
import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { NOTE, THEMES, harmonics, calmPhrase, battleBeat, battleBar, stinger, themeFor, beatSeconds } from '../src/audio/score.js';
import { IntensityTracker, dangerOf, weightOf, INTENSITY } from '../src/audio/intensity.js';
import { Music } from '../src/audio/music.js';
import { AudioEngine } from '../src/audio/engine.js';
import { loadMapFile } from '../src/engine/harness.js';
import { createWorld } from '../src/engine/world.js';
import { ROOT } from './helpers.js';

// ---- a strict AudioContext ----
function strictCtx() {
  const log = { starts: [], stops: [], nodes: 0, waves: 0 };
  const ok = (v, what) => {
    if (!Number.isFinite(v)) throw new TypeError(what + ' is not finite: ' + v);
  };
  const param = (v = 0) => ({
    value: v,
    setValueAtTime(x, t) {
      ok(x, 'value');
      ok(t, 'time');
    },
    linearRampToValueAtTime(x, t) {
      ok(x, 'value');
      ok(t, 'time');
    },
    exponentialRampToValueAtTime(x, t) {
      ok(x, 'value');
      ok(t, 'time');
      if (!(x > 0)) throw new RangeError('exponential ramp to ' + x);
    },
    setTargetAtTime(x, t, k) {
      ok(x, 'value');
      ok(t, 'time');
      ok(k, 'constant');
      if (!(k > 0)) throw new RangeError('time constant ' + k);
    },
    cancelScheduledValues(t) {
      ok(t, 'time');
    },
  });
  const node = (extra = {}) => {
    log.nodes++;
    return {
      connect(d) {
        if (!d) throw new TypeError('connect to nothing');
        return d;
      },
      disconnect() {},
      ...extra,
    };
  };
  const src = (kind) => {
    let started = null;
    return node({
      kind,
      frequency: param(440),
      detune: param(0),
      type: 'sine',
      buffer: null,
      setPeriodicWave(w) {
        if (!w?.isWave) throw new TypeError('not a PeriodicWave');
      },
      start(t = 0, off = 0) {
        ok(t, 'start');
        ok(off, 'offset');
        if (started !== null) throw new Error('started twice');
        started = t;
        log.starts.push({ kind, when: t, now: ctx.currentTime });
      },
      stop(t = 0) {
        ok(t, 'stop');
        if (started === null) throw new Error('stop before start');
        log.stops.push(t);
      },
    });
  };
  const ctx = {
    currentTime: 0,
    sampleRate: 48000,
    log,
    state: 'running',
    createOscillator: () => src('osc'),
    createBufferSource: () => src('buf'),
    createGain: () => node({ gain: param(1) }),
    createBiquadFilter: () => node({ frequency: param(350), Q: param(1), type: 'lowpass' }),
    createDelay: () => node({ delayTime: param(0) }),
    createStereoPanner: () => node({ pan: param(0) }),
    createWaveShaper: () => node({ curve: null }),
    createConvolver: () => node({ buffer: null }),
    createBuffer: (ch, n) => {
      ok(n, 'length');
      const d = Array.from({ length: ch }, () => new Float32Array(n));
      return { getChannelData: (i) => d[i] };
    },
    createPeriodicWave: (re, im) => {
      if (re.length !== im.length || re.length < 2) throw new Error('bad periodic wave');
      for (const x of im) ok(x, 'harmonic');
      log.waves++;
      return { isWave: true };
    },
  };
  return ctx;
}

test('the score: notes, spectra and every event of the harbour theme are finite; the levels add layers', () => {
  assert.equal(NOTE('A4'), 440);
  assert.ok(Math.abs(NOTE('D3') - 146.83) < 0.01);
  assert.ok(Math.abs(NOTE('Bb1') - 58.27) < 0.01);
  assert.throws(() => NOTE('H2'));
  for (const v of ['cello', 'harmonium', 'brass', 'choir', 'bass', 'chordBrass']) {
    const im = harmonics(v, 110);
    assert.equal(im[0], 0);
    assert.ok(im.length > 10 && im.every(Number.isFinite), v);
  }
  const T = THEMES.harbour,
    finite = (e) => Number.isFinite(e.at) && (e.f === undefined || e.f > 20) && Number.isFinite(e.gain) && e.gain >= 0;
  for (let i = 0; i < T.calm.phrases.length; i++) {
    const { events, beats } = calmPhrase('harbour', i);
    assert.ok(events.every(finite) && beats > 0);
    assert.ok(events.some((e) => e.voice === 'cello'));
  }
  const count = (lv) => {
    let n = 0;
    for (let bar = 0; bar < 8; bar++) {
      for (let q = 0; q < 4; q++) n += battleBeat('harbour', bar, q, lv).length;
      n += battleBar('harbour', bar, lv).events.length;
    }
    return n;
  };
  assert.equal(count(0), 0, 'level 0 has no battle');
  assert.ok(count(1) > 0 && count(2) > count(1) * 2 && count(3) > count(2), `layers: ${[1, 2, 3].map(count)}`);
  assert.equal(battleBar('harbour', 0, 1).events.length, 0, 'the tune waits for a real fight');
  assert.ok(
    battleBar('harbour', 0, 2).events.some((e) => e.voice === 'brass'),
    'the tune on brass from level 2',
  );
  for (const k of ['start', 'up2', 'up3', 'kill', 'clear']) assert.ok(stinger('harbour', k).every(finite), k);
  assert.ok(
    T.battle.lead.every((bar) => bar.reduce((s, [, b]) => s + b, 0) === T.battle.meter),
    'every bar of the battle tune is exactly one bar long',
  );
  assert.equal(themeFor('C1E1M03'), 'harbour');
  assert.equal(themeFor('RANGE'), null);
  assert.equal(themeFor('C2M10'), 'deep');
  assert.equal(themeFor('C2M04'), 'threshold');
  assert.equal(themeFor('C2M20'), 'hive');
  assert.equal(themeFor('C2M29'), 'root');
  assert.equal(themeFor('C2S01'), 'deep');
  assert.equal(themeFor('C2S02'), 'hive');
  assert.equal(themeFor('C2M10', { atmosphere: { music: 'harbour' } }), 'harbour');
  assert.equal(themeFor('C1E1M03', { atmosphere: { music: false } }), null);
});

const world = (enemies, hp = 100, status = 'playing') => ({
  status,
  player: { x: 0, z: 0, hp },
  enemies: enemies.map(([kind, d, state = 'chase']) => ({ kind, x: d, z: 0, hp: 10, state })),
});
const run = (tr, w, s) => {
  let lv;
  for (let t = 0; t < s; t += 0.05) lv = tr.update(w, 0.05);
  return lv;
};

test("the fight's level: what is after you, how close, how dangerous, how hurt you are; up at once, down slowly", () => {
  assert.equal(weightOf('bellnode'), 0);
  assert.equal(weightOf('vaelfolk'), 0);
  assert.equal(weightOf('cantor'), 0);
  assert.ok(weightOf('bulwark') >= 2.5 && weightOf('gaunt') < 1);
  const L = (w, hurt) => {
    const tr = new IntensityTracker();
    if (hurt) tr.hurt(hurt);
    return tr.update(w, 0.05);
  };
  assert.equal(L(world([])), 0, 'nothing');
  assert.equal(L(world([['tollbearer', 20, 'idle']])), 0, 'asleep: it does not count (no warning of an ambush)');
  assert.equal(L(world([['tollbearer', 20]])), 1, 'one, far off: noticed');
  assert.equal(
    L(
      world([
        ['tollbearer', 6],
        ['tollbearer', 7],
        ['gaunt', 8],
      ]),
    ),
    2,
    'a fight',
  );
  assert.equal(
    L(
      world([
        ['bulwark', 5],
        ['tollbearer', 6],
      ]),
    ),
    3,
    'something big and company',
  );
  assert.equal(L(world([['cantor', 30]])), 3, 'a boss');
  assert.equal(L(world([['tollbearer', 20]]), 40), 2, 'being hurt pushes it up');
  assert.equal(L(world([['tollbearer', 20]], 15)), 2, 'nearly dead pushes it up');
  assert.equal(L(world([], 15)), 0, 'nearly dead with nothing after you is still calm');
  // down slowly, and all the way down when nothing is left
  const tr = new IntensityTracker();
  assert.equal(
    run(
      tr,
      world([
        ['bulwark', 5],
        ['tollbearer', 6],
      ]),
      1,
    ),
    3,
  );
  assert.equal(
    run(
      tr,
      world([
        ['tollbearer', 6],
        ['tollbearer', 7],
        ['gaunt', 8],
      ]),
      INTENSITY.hold - 0.3,
    ),
    3,
    'it holds while the danger has only just dropped',
  );
  assert.equal(
    run(
      tr,
      world([
        ['tollbearer', 6],
        ['tollbearer', 7],
        ['gaunt', 8],
      ]),
      1,
    ),
    2,
    'then one level down',
  );
  assert.equal(run(tr, world([]), INTENSITY.hold + 0.2), 0, 'the room is clear: straight to calm');
  const dead = new IntensityTracker();
  run(
    dead,
    world([
      ['tollbearer', 6],
      ['tollbearer', 7],
      ['gaunt', 8],
    ]),
    1,
  );
  assert.equal(run(dead, world([], 100, 'dead'), 5), 2, 'your death does not play "the room is clear"');
  assert.ok(dangerOf(world([['tollbearer', 39]])).score > 0 && dangerOf(world([['tollbearer', 41]])).score === 0, 'beyond 40 m it does not count');
});

test('the player: calm tune, into the fight on a beat, up on the next beat, down on a bar, the room cleared, the tune back; nothing in the past, a strict context never throws', () => {
  const ctx = strictCtx(),
    m = new Music(ctx, { connect() {} });
  m.setTheme('harbour');
  const script = [
      [0, 0],
      [8, 1],
      [14, 2],
      [24, 3],
      [34, 2],
      [40, 0],
    ],
    levelAt = (t) => script.filter(([at]) => at <= t).pop()[1],
    seen = {};
  for (let t = 0; t < 60; t = +(t + 0.05).toFixed(2)) {
    ctx.currentTime = t;
    m.setLevel(levelAt(t));
    m.tick();
    seen[Math.floor(t)] = { mode: m.mode, cur: m.cur, bStart: m.bStart };
  }
  assert.equal(seen[5].mode, 'calm');
  assert.equal(seen[10].mode, 'battle');
  assert.equal(seen[20].cur, 2);
  assert.equal(seen[30].cur, 3);
  assert.equal(seen[38].cur, 2);
  assert.equal(seen[55].mode, 'calm', 'the tune came back');
  const cb = beatSeconds(THEMES.harbour.calm),
    into = seen[10].bStart;
  assert.ok(into >= 8 && into < 8 + cb + 0.06, 'the fight began within a calm beat of being asked: ' + into);
  const late = ctx.log.starts.filter((s) => s.when < s.now - 0.03);
  assert.equal(late.length, 0, 'nothing started in the past');
  const inWindow = (a, b) => ctx.log.starts.filter((s) => s.when >= a && s.when < b).length;
  assert.ok(inWindow(26, 33) > inWindow(16, 23), `overwhelmed is busier than fighting (${inWindow(26, 33)} vs ${inWindow(16, 23)})`);
  assert.ok(inWindow(48, 58) > 0, 'calm notes after the fight');
  assert.ok(ctx.log.waves < 200, 'PeriodicWaves are cached per instrument and pitch: ' + ctx.log.waves);
  // a stalled tab in the middle of a fight: nothing is caught up
  m.setLevel(2);
  for (let t = 60; t < 70; t = +(t + 0.05).toFixed(2)) {
    ctx.currentTime = t;
    m.tick();
  }
  const before = ctx.log.starts.length;
  ctx.currentTime = 400;
  m.tick();
  assert.ok(
    ctx.log.starts.slice(before).every((s) => s.when >= 400 - 0.03),
    'after a stall nothing is scheduled in the past',
  );
  assert.ok(ctx.log.starts.length - before < 80, 'no burst of catch-up notes: ' + (ctx.log.starts.length - before));
  // back to the generative score and to a theme again: no throw
  assert.doesNotThrow(() => {
    m.setTheme(null);
    ctx.currentTime = 401;
    m.setIntensity(0.5);
    m.tick();
    m.setTheme('harbour');
    m.restart();
    ctx.currentTime = 402;
    m.tick();
  });
});

test('the real audio engine drives the real music on Marrow Quay without throwing, and picks the harbour theme', () => {
  const a = new AudioEngine({ sfxVolume: 1, musicVolume: 1, masterVolume: 1 }),
    ctx = strictCtx(),
    map = loadMapFile(path.join(ROOT, 'maps', 'C1E1M01.json')),
    w = createWorld(map, { difficulty: 'normal', seed: 1 });
  ctx.listener = new Proxy({}, { get: () => ({ value: 0 }) });
  a.ctx = ctx;
  const bus = () => ({ gain: { value: 0, setTargetAtTime() {} }, frequency: { value: 0, setTargetAtTime() {} }, connect() {} });
  a.master = bus();
  a.sfxBus = bus();
  a.ambBus = bus();
  a.musicBus = bus();
  a.musicLP = bus();
  a.reverbSend = bus();
  a.ambience = { update() {} };
  a.play = () => true;
  a.music = new Music(ctx, a.musicLP);
  for (let i = 0; i < 300; i++) {
    ctx.currentTime = i / 60;
    a.update(w, 1 / 60, map);
  }
  assert.equal(a.musicFailed, undefined, 'the music never failed');
  assert.equal(a.music.theme, 'harbour');
  w.enemies.forEach((e, i) => {
    if (i < 4) {
      e.state = 'chase';
      e.x = w.player.x + 3 + i;
      e.z = w.player.z;
    }
  });
  a.handleEvents([
    { type: 'hurt', amount: 30 },
    { type: 'enemy_died', kind: 'bulwark' },
  ]);
  for (let i = 300; i < 900; i++) {
    ctx.currentTime = i / 60;
    a.update(w, 1 / 60, map);
  }
  assert.equal(a.musicFailed, undefined);
  assert.equal(a.music.mode, 'battle');
  assert.ok(a.intensity.level >= 2, "four after you at arm's length is a fight: " + a.intensity.level);
  a.newLevel();
  assert.equal(a.music.mode, 'calm');
});

test('every theme: its calm phrases fill their bars, every battle bar of the tune is one bar long, every event is finite, and the real player plays it against a strict context', () => {
  for (const [name, T] of Object.entries(THEMES)) {
    T.calm.phrases.forEach((P, i) => {
      assert.equal(
        P.mel.reduce((s, [, b]) => s + b, 0),
        P.chords.length * T.calm.meter,
        `${name} calm phrase ${i}`,
      );
      assert.ok(
        calmPhrase(name, i).events.every((e) => Number.isFinite(e.at) && Number.isFinite(e.gain) && (e.f === undefined || e.f > 20)),
        name,
      );
    });
    assert.ok(
      T.battle.lead.every((bar) => bar.reduce((s, [, b]) => s + b, 0) === T.battle.meter),
      name + ' battle bars',
    );
    for (const r of T.battle.roots) assert.ok(T.battle.chords[r], `${name}: a chord for ${r}`);
    const ctx = strictCtx(),
      m = new Music(ctx, { connect() {} });
    m.setTheme(name);
    for (let t = 0; t < 40; t = +(t + 0.05).toFixed(2)) {
      ctx.currentTime = t;
      m.setLevel(t < 6 ? 0 : t < 12 ? 2 : t < 24 ? 3 : 0);
      m.tick();
    }
    assert.equal(m.mode, 'calm', name + ': back to calm');
    assert.ok(ctx.log.starts.length > 100, name + ' played');
  }
  assert.equal(themeFor('C1E2M05'), 'works');
});
