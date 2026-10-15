// GROKS. Counts Web Audio nodes AudioEngine.play and Music create, and whether anything disconnects or keeps them.
// A fake context. No browser, no heap size. Writes attack/groks/fuzz/out/leak-audio.json.
import { AudioEngine } from '../../../src/audio/engine.js';
import { Music } from '../../../src/audio/music.js';
import { writeOut } from './harness.mjs';

const counts = {};
const bump = (k) => { counts[k] = (counts[k] || 0) + 1; };
const nodes = [];

function param() {
  return {
    value: 0,
    setValueAtTime() {},
    linearRampToValueAtTime() {},
    exponentialRampToValueAtTime() {},
    setTargetAtTime() {},
    cancelScheduledValues() {},
  };
}

function makeNode(kind) {
  bump(kind);
  const n = {
    __grokNode: true,
    kind,
    stopped: false,
    started: false,
    gain: param(),
    frequency: param(),
    detune: param(),
    Q: param(),
    delayTime: param(),
    positionX: param(),
    positionY: param(),
    positionZ: param(),
    threshold: param(),
    knee: param(),
    ratio: param(),
    attack: param(),
    release: param(),
    connect() { bump('connect'); return n; },
    disconnect() { bump('disconnect'); return n; },
    start() { n.started = true; bump('start'); },
    stop() { n.stopped = true; bump('stop'); },
  };
  nodes.push(n);
  return n;
}

const ctx = {
  state: 'running',
  sampleRate: 44100,
  currentTime: 1,
  destination: makeNode('destination'),
  listener: {
    positionX: param(), positionY: param(), positionZ: param(),
    forwardX: param(), forwardY: param(), forwardZ: param(),
    upX: param(), upY: param(), upZ: param(),
  },
  createGain: () => makeNode('gain'),
  createOscillator: () => makeNode('osc'),
  createPanner: () => makeNode('panner'),
  createBiquadFilter: () => makeNode('filter'),
  createBufferSource: () => makeNode('bufferSource'),
  createConvolver: () => makeNode('convolver'),
  createDelay: () => makeNode('delay'),
  createDynamicsCompressor: () => makeNode('compressor'),
  createBuffer(ch, len) {
    bump('buffer');
    const data = new Float32Array(len);
    return { length: len, numberOfChannels: ch, getChannelData: () => data, duration: len / 44100 };
  },
};

function snapshot() {
  return { ...counts, nodes: nodes.length };
}
function delta(a, b) {
  const out = {};
  for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) {
    if (k === 'nodes') continue;
    out[k] = (b[k] || 0) - (a[k] || 0);
  }
  out.nodes = b.nodes - a.nodes;
  return out;
}

/** true if `root` still points at a node this script created, other than the buses we handed it */
function retainsNodes(root, allow) {
  const seen = new Set();
  const stack = [root];
  const found = [];
  while (stack.length) {
    const o = stack.pop();
    if (!o || typeof o !== 'object') continue;
    if (seen.has(o)) continue;
    seen.add(o);
    if (o === ctx) continue;
    if (o.__grokNode && !allow.has(o)) found.push(o.kind);
    if (o instanceof Map) { for (const v of o.values()) stack.push(v); continue; }
    for (const k of Object.keys(o)) stack.push(o[k]);
  }
  return found;
}

const settings = { masterVolume: 1, sfxVolume: 1, musicVolume: 1 };
const eng = new AudioEngine(settings);
const sfxBus = makeNode('bus');
const reverbSend = makeNode('bus');
eng.ctx = ctx;
eng.sfxBus = sfxBus;
eng.reverbSend = reverbSend;
eng.rand = () => 0.37;
const allow = new Set([sfxBus, reverbSend]);

const beforePlay = snapshot();
const N = 200;
let played = 0, dropped = 0;
for (let i = 0; i < N; i++) {
  if (eng.play('flare_fire')) played++; else dropped++;
  if (eng.play('toll_soft', { pos: [i, 3] })) played++; else dropped++;
  if (eng.play('saw_rev')) played++; else dropped++;
}
const afterPlay = snapshot();
const playDelta = delta(beforePlay, afterPlay);
const unstoppedSources = nodes.filter((n) => (n.kind === 'osc' || n.kind === 'bufferSource') && n.started && !n.stopped).length;
const retained = retainsNodes(eng, allow);

// The score, separate from play(): persistent drones in the constructor, then 20 s of combat notes.
const beforeMusic = snapshot();
const musicOut = makeNode('bus');
allow.add(musicOut);
const music = new Music(ctx, musicOut);
const afterCtor = snapshot();
music.setIntensity(1);
for (let t = 0; t < 20; t += 0.3) { ctx.currentTime = 1 + t; music.tick(0.3); }
const afterMusic = snapshot();
const noteNodes = nodes.slice(afterCtor.nodes); // nodes created by tick(), not the constructor
const hatSources = noteNodes.filter((n) => n.kind === 'bufferSource');
const musicRetained = retainsNodes(music, allow);

const report = {
  plays: { requested: N * 3, played, dropped, perKind: playDelta },
  disconnectsDuringPlay: playDelta.disconnect || 0,
  engineRetainsShotNodes: retained,
  shotSourcesLeftRunning: unstoppedSources,
  statsLog: eng.stats.log.length,
  music: {
    ctor: delta(beforeMusic, afterCtor),
    twentySecondsAtFullIntensity: delta(afterCtor, afterMusic),
    hatBufferSources: hatSources.length,
    hatSourcesStopped: hatSources.filter((n) => n.stopped).length,
    musicObjectRetainsNoteNodes: musicRetained.filter((k) => k !== 'bus' && k !== 'destination'),
  },
};

writeOut('leak-audio.json', report);
console.log(JSON.stringify(report, null, 2));
