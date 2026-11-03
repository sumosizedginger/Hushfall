// PT-081: a theme of the smart music (src/audio/score.js) rendered OFFLINE in node to a WAV, from the same score data the game plays: two calm
// phrases, the fight noticed (2 bars), fighting (8 bars),
// overwhelmed (8 bars), the room cleared, the tune back. The instruments are the score's own spectra; the envelopes, drums, bell and room are close
// to music.js but not the same code (WebAudio is not
// in node): it is for the owner's ears before a play, not a measurement. Node only.
//   node tools/dev/score-preview.mjs <theme> <out.wav>
import fs from 'node:fs';
import { THEMES, VOICES, SPECTRA, NOTE, calmPhrase, battleBeat, battleBar, stinger, beatSeconds } from '../../src/audio/score.js';

const [theme = 'harbour', out = theme + '.wav'] = process.argv.slice(2),
  T = THEMES[theme];
if (!T) {
  console.error('no theme ' + theme);
  process.exit(2);
}
const SR = 44100,
  cb = beatSeconds(T.calm),
  bb = beatSeconds(T.battle),
  meter = T.battle.meter;
const calmLen = (i) => calmPhrase(theme, i).beats * cb,
  plan = [];
let t = 0.5;
for (const i of [0, 1]) {
  plan.push(['calm', i, t]);
  t += calmLen(i);
}
const b0 = t;
for (let bar = 0; bar < 18; bar++) plan.push(['bar', bar, b0 + bar * meter * bb, bar < 2 ? 1 : bar < 10 ? 2 : 3]);
const clear = b0 + 18 * meter * bb;
plan.push(['clear', 0, clear]);
plan.push(['calm', 0, clear + 3.6]);
const LEN = clear + 3.6 + calmLen(0) + 3,
  N = Math.ceil(LEN * SR),
  L = new Float64Array(N),
  R = new Float64Array(N);
let seed = 7;
const rnd = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296,
  TAU = Math.PI * 2;
const pan = (p = 0) => [Math.cos(((p + 1) * Math.PI) / 4), Math.sin(((p + 1) * Math.PI) / 4)],
  add = (i, s, [gl, gr]) => {
    if (i >= 0 && i < N) {
      L[i] += s * gl;
      R[i] += s * gr;
    }
  };
const tables = new Map();
const table = (voice, f) => {
  const k = voice + f.toFixed(2);
  if (tables.has(k)) return tables.get(k);
  const spec = SPECTRA[VOICES[voice].spectrum ?? voice],
    n = 2048,
    tb = new Float64Array(n);
  let pk = 0;
  for (let h = 1; h * f < 6000; h++) {
    const a = spec(h * f, h);
    for (let i = 0; i < n; i++) tb[i] += a * Math.sin((TAU * h * i) / n);
  }
  for (const x of tb) pk = Math.max(pk, Math.abs(x));
  for (let i = 0; i < n; i++) tb[i] /= pk || 1;
  tables.set(k, tb);
  return tb;
};
function note(ev, t0, beat) {
  const V = VOICES[ev.voice],
    f = ev.f,
    dur = Math.max(0.05, (ev.dur ?? 1) * beat),
    att = Math.min(V.att, dur / 2),
    rel = ev.rel ?? V.rel,
    tb = table(ev.voice, f),
    g = pan(ev.pan),
    drive = V.bus === 'drive' ? 2.2 : 0;
  let ph = rnd() * 2048;
  for (let i = Math.floor(t0 * SR); i < Math.min(N, Math.floor((t0 + dur + rel) * SR)); i++) {
    const tt = i / SR - t0,
      gl = ev.glide > 20 ? (ev.glide / f) ** Math.exp(-tt / 0.04) : 1,
      vib = ev.vib ? 2 ** ((ev.vib * Math.min(1, tt / 0.6) * Math.sin(TAU * 5.2 * tt)) / 1200) : 1;
    ph = (ph + (f * gl * vib * 2048) / SR) % 2048;
    const j = Math.floor(ph);
    let s = tb[j] + (tb[(j + 1) % 2048] - tb[j]) * (ph - j);
    if (drive) s = Math.tanh(s * drive) / Math.tanh(drive);
    const env = Math.min(1, tt / att) * (tt < dur ? 1 : Math.max(0, 1 - (tt - dur) / rel));
    add(i, s * env * ev.gain, g);
  }
}
const BELL = [
  [0.5, 7, 0.5],
  [1, 5, 1],
  [1.191, 4.2, 0.8],
  [1.505, 3.6, 0.55],
  [2, 3.2, 0.7],
  [2.514, 2.4, 0.35],
  [2.662, 2.1, 0.3],
  [3.011, 1.7, 0.22],
  [4.03, 1.3, 0.15],
];
function drum(ev, t0) {
  const g = pan(ev.pan),
    k = ev.voice;
  let ph = 0,
    b1 = 0,
    b2 = 0;
  const len = { kick: 0.5, boom: 2.6, snare: 0.3, hat: 0.06, tomH: 0.5, tomL: 0.6, anvil: 0.7, crash: 2.8, bell: 7 }[k] ?? 0.5;
  for (let i = Math.floor(t0 * SR); i < Math.min(N, Math.floor((t0 + len) * SR)); i++) {
    const tt = i / SR - t0,
      x = rnd() * 2 - 1;
    let s = 0;
    if (k === 'kick') {
      ph += (TAU * (45 + 95 * Math.exp(-tt / 0.035))) / SR;
      s = Math.sin(ph) * Math.exp(-tt / 0.16);
    } else if (k === 'boom') {
      ph += (TAU * (30 + 40 * Math.exp(-tt / 0.25))) / SR;
      s = Math.tanh(1.8 * Math.sin(ph)) * Math.exp(-tt / 0.7) * 1.6;
    } else if (k === 'snare') {
      b1 += 0.55 * (x - b1);
      b2 += 0.12 * (b1 - b2);
      ph += (TAU * 185) / SR;
      s = (b1 - b2) * 1.4 * Math.exp(-tt / 0.09) + Math.sin(ph) * 0.5 * Math.exp(-tt / 0.05);
    } else if (k === 'hat') {
      b1 += 0.95 * (x - b1);
      s = (x - b1) * Math.exp(-tt / 0.018);
    } else if (k === 'tomH' || k === 'tomL') {
      const b = k === 'tomL' ? 72 : 108;
      ph += (TAU * (b + b * 0.6 * Math.exp(-tt / 0.06))) / SR;
      s = Math.sin(ph) * Math.exp(-tt / 0.22);
    } else if (k === 'anvil') {
      for (const [r, a, d] of [
        [1, 1, 0.35],
        [2.76, 0.6, 0.18],
        [5.4, 0.35, 0.09],
        [8.9, 0.2, 0.05],
      ])
        s += a * Math.sin(TAU * 1180 * r * tt) * Math.exp(-tt / d);
      s *= 0.5;
    } else if (k === 'crash') {
      b1 += 0.9 * (x - b1);
      b2 += 0.5 * (b1 - b2);
      s = (b1 - b2) * Math.exp(-tt / 0.8);
    } else if (k === 'bell') {
      for (const [r, d, a] of BELL) s += a * 0.3 * Math.exp((-6.91 * tt) / d) * Math.sin(TAU * ev.f * r * tt);
    }
    add(i, s * ev.gain, g);
  }
}
const play = (ev, t0, beat) => (VOICES[ev.voice] ? note(ev, t0, beat) : drum(ev, t0));
let lastF = 0;
for (const [k, i, t0, lv] of plan) {
  if (k === 'calm') {
    for (const ev of calmPhrase(theme, i).events) play(ev, t0 + ev.at * cb, cb);
  } else if (k === 'clear') {
    for (const ev of stinger(theme, 'clear')) play(ev, t0 + ev.at * bb, bb);
  } else {
    if (i === 0) for (const ev of stinger(theme, 'start')) play(ev, t0, bb);
    if (i === 2) for (const ev of stinger(theme, 'up2')) play(ev, t0, bb);
    if (i === 10) for (const ev of stinger(theme, 'up3')) play(ev, t0, bb);
    for (let q = 0; q < meter; q++) for (const ev of battleBeat(theme, i, q, lv)) play(ev, t0 + (q + ev.at) * bb, bb);
    const r = battleBar(theme, i, lv, lastF);
    lastF = r.lastF;
    for (const ev of r.events) play(ev, t0 + ev.at * bb, bb);
  }
}
// a stone room (a small Schroeder reverb), a soft limiter, the fight at about -18 dBFS
const verb = (x, sp) => {
  const cs = [1116, 1188, 1277, 1356, 1422, 1491].map((d) => ({ b: new Float64Array(d + sp), i: 0, f: 0 })),
    aps = [556, 441, 341].map((d) => ({ b: new Float64Array(d + sp), i: 0 })),
    o = new Float64Array(N);
  for (let n = 0; n < N; n++) {
    let s = 0;
    for (const c of cs) {
      const y = c.b[c.i];
      c.f = y * 0.7 + c.f * 0.3;
      c.b[c.i] = x[n] * 0.015 + c.f * 0.84;
      c.i = (c.i + 1) % c.b.length;
      s += y;
    }
    for (const a of aps) {
      const bo = a.b[a.i];
      a.b[a.i] = s + bo * 0.5;
      s = bo - s;
      a.i = (a.i + 1) % a.b.length;
    }
    o[n] = s;
  }
  return o;
};
const wl = verb(L, 0),
  wr = verb(R, 23);
for (let n = 0; n < N; n++) {
  L[n] += wl[n] * 2;
  R[n] += wr[n] * 2;
}
let ss = 0,
  c = 0;
for (let n = Math.floor((b0 + 2 * meter * bb) * SR); n < Math.floor((b0 + 10 * meter * bb) * SR); n++) {
  ss += L[n] ** 2 + R[n] ** 2;
  c += 2;
}
const gain = 0.126 / Math.sqrt(ss / c),
  lim = (y) => {
    const a = Math.abs(y);
    return a < 0.7 ? y : Math.sign(y) * (0.7 + 0.29 * Math.tanh((a - 0.7) / 0.29));
  },
  buf = Buffer.alloc(44 + N * 4);
buf.write('RIFF', 0);
buf.writeUInt32LE(36 + N * 4, 4);
buf.write('WAVEfmt ', 8);
buf.writeUInt32LE(16, 16);
buf.writeUInt16LE(1, 20);
buf.writeUInt16LE(2, 22);
buf.writeUInt32LE(SR, 24);
buf.writeUInt32LE(SR * 4, 28);
buf.writeUInt16LE(4, 32);
buf.writeUInt16LE(16, 34);
buf.write('data', 36);
buf.writeUInt32LE(N * 4, 40);
for (let n = 0; n < N; n++) {
  const f = Math.min(1, (N - n) / (SR * 1.5));
  buf.writeInt16LE(Math.round(lim(L[n] * gain) * f * 32767), 44 + n * 4);
  buf.writeInt16LE(Math.round(lim(R[n] * gain) * f * 32767), 46 + n * 4);
}
fs.writeFileSync(out, buf);
console.log(
  `wrote ${out}: ${LEN.toFixed(0)} s. calm 0 to ${b0.toFixed(0)} s, noticed ${b0.toFixed(0)}, fighting ${(b0 + 2 * meter * bb).toFixed(0)}, overwhelmed ${(b0 + 10 * meter * bb).toFixed(0)}, cleared ${clear.toFixed(0)}, the tune back ${(clear + 3.6).toFixed(0)}`,
);
