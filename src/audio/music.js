// Generative score: a drone, sparse Bell motifs and a combat pulse layer that follows tension. Scheduled against audio time
// with a short look-ahead; the only inputs are `intensity` (0..1) and a seeded RNG, so it is reproducible and testable offline.
import { seededRandom } from './synth.js';

const EPS = 0.0001;
// D phrygian: the b2 (Eb) is the dread note
const SCALE = [293.66, 311.13, 349.23, 392.0, 440.0, 466.16, 523.25, 587.33];
const ROOTS = [73.42, 58.27, 49.0, 65.41, 73.42, 77.78];                 // D2 Bb1 G1 C2 D2 Eb2
const BPM = 96, BEAT = 60 / BPM;

export class Music {
  constructor(ctx, out, { seed = 5 } = {}) {
    this.ctx = ctx; this.out = out; this.r = seededRandom(seed);
    this.intensity = 0; this.chord = 0; this.nextChord = 0; this.nextBell = 0; this.nextBeat = 0; this.beatN = 0; this.started = false;
    // drone: two detuned saws under a slowly breathing lowpass
    this.filter = ctx.createBiquadFilter(); this.filter.type = 'lowpass'; this.filter.frequency.value = 240; this.filter.Q.value = 2;
    const lfo = ctx.createOscillator(), lg = ctx.createGain(); lfo.frequency.value = 0.07; lg.gain.value = 90; lfo.connect(lg); lg.connect(this.filter.frequency); lfo.start();
    this.padGain = ctx.createGain(); this.padGain.gain.value = 0.075;
    this.a = ctx.createOscillator(); this.b = ctx.createOscillator(); this.a.type = this.b.type = 'sawtooth'; this.b.detune.value = 9;
    this.a.frequency.value = ROOTS[0]; this.b.frequency.value = ROOTS[0] * 1.5;
    this.a.connect(this.filter); this.b.connect(this.filter); this.filter.connect(this.padGain); this.padGain.connect(out); this.a.start(); this.b.start();
    // the Hush: a quiet beating pair high above everything
    this.hush = ctx.createGain(); this.hush.gain.value = 0.0; this.hush.connect(out);
    for (const f of [880, 883.2]) { const o = ctx.createOscillator(); o.frequency.value = f; const g = ctx.createGain(); g.gain.value = 0.5; o.connect(g); g.connect(this.hush); o.start(); }
    // feedback delay gives the bells a room to ring in
    this.delay = ctx.createDelay(1); this.delay.delayTime.value = BEAT * 0.75; const fb = ctx.createGain(); fb.gain.value = 0.38;
    const dl = ctx.createBiquadFilter(); dl.type = 'lowpass'; dl.frequency.value = 2200;
    this.delay.connect(dl); dl.connect(fb); fb.connect(this.delay); dl.connect(out);
  }
  setIntensity(v) { this.intensity = Math.max(0, Math.min(1, v)); this.hush.gain.setTargetAtTime(0.012 + 0.03 * this.intensity, this.ctx.currentTime, 1.5); }

  _bell(t, f, gain) {
    const c = this.ctx, o = c.createOscillator(), m = c.createOscillator(), mg = c.createGain(), g = c.createGain();
    o.frequency.value = f; m.frequency.value = f * 3.5; mg.gain.setValueAtTime(f * 2, t); mg.gain.exponentialRampToValueAtTime(1, t + 1.6);
    m.connect(mg); mg.connect(o.frequency); g.gain.setValueAtTime(EPS, t); g.gain.exponentialRampToValueAtTime(gain, t + 0.004); g.gain.exponentialRampToValueAtTime(EPS, t + 2.6);
    o.connect(g); g.connect(this.out); g.connect(this.delay); o.start(t); m.start(t); o.stop(t + 2.7); m.stop(t + 2.7);
  }
  _kick(t, gain) { const c = this.ctx, o = c.createOscillator(), g = c.createGain(); o.frequency.setValueAtTime(110, t); o.frequency.exponentialRampToValueAtTime(38, t + 0.18); g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(EPS, t + 0.22); o.connect(g); g.connect(this.out); o.start(t); o.stop(t + 0.25); }
  _bass(t, f, gain) { const c = this.ctx, o = c.createOscillator(), lp = c.createBiquadFilter(), g = c.createGain(); o.type = 'sawtooth'; o.frequency.value = f; lp.type = 'lowpass'; lp.frequency.setValueAtTime(600, t); lp.frequency.exponentialRampToValueAtTime(120, t + 0.2); g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(EPS, t + 0.22); o.connect(lp); lp.connect(g); g.connect(this.out); o.start(t); o.stop(t + 0.25); }
  _hat(t, gain) {
    const c = this.ctx, len = Math.floor(c.sampleRate * 0.05), buf = c.createBuffer(1, len, c.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (this.r() * 2 - 1) * (1 - i / len);
    const s = c.createBufferSource(), hp = c.createBiquadFilter(), g = c.createGain(); s.buffer = buf; hp.type = 'highpass'; hp.frequency.value = 6000; g.gain.value = gain; s.connect(hp); hp.connect(g); g.connect(this.out); s.start(t);
  }

  /** advance the schedule up to `lookahead` seconds ahead of the audio clock */
  tick(lookahead = 0.3) {
    const c = this.ctx, now = c.currentTime, horizon = now + lookahead;
    if (!this.started) { this.started = true; this.nextChord = now + 6; this.nextBell = now + 1.5; this.nextBeat = Math.ceil(now / BEAT) * BEAT; }
    // After a stall (background tab, long frame) the schedule is in the past: WebAudio would play every missed bell at once. Skip what was missed instead of catching up.
    this.nextChord = Math.max(this.nextChord, now); this.nextBell = Math.max(this.nextBell, now); this.nextBeat = Math.max(this.nextBeat, Math.ceil(now / BEAT) * BEAT);
    if (this.nextChord < horizon) {                               // slow harmonic movement
      this.chord = (this.chord + 1) % ROOTS.length; const r = ROOTS[this.chord];
      this.a.frequency.setTargetAtTime(r, this.nextChord, 1.5); this.b.frequency.setTargetAtTime(r * 1.5, this.nextChord, 1.5);
      this.nextChord += 10 + this.r() * 8;
    }
    while (this.nextBell < horizon) {                             // sparse Bell motif; denser under tension
      const n = SCALE[Math.floor(this.r() * SCALE.length)] * (this.r() < 0.3 ? 0.5 : 1);
      this._bell(this.nextBell, n, 0.05 + 0.03 * this.intensity);
      if (this.r() < 0.35) this._bell(this.nextBell + BEAT * 1.5, n * 1.5, 0.03);
      this.nextBell += (4 - 2.2 * this.intensity) + this.r() * (5 - 3 * this.intensity);
    }
    while (this.nextBeat < horizon) {                             // combat pulse only when tense; keeps the grid so it locks in cleanly
      const t = this.nextBeat, I = this.intensity;
      if (I > 0.08 && t >= now - 0.05) {
        this._kick(t, (this.beatN % 2 === 0 ? 0.75 : 0.35) * I);
        this._hat(t + BEAT / 2, 0.09 * I);
        const bassNote = ROOTS[this.chord] * (this.beatN % 8 === 6 ? 1.2 : 1);
        this._bass(t, bassNote * 2, 0.17 * I);
      }
      this.beatN++; this.nextBeat += BEAT / 1;
    }
  }
}

/** Offline render for QA: `seconds` of score at fixed intensity. */
export async function renderMusic({ seconds = 12, intensity = 0.8, rate = 44100 } = {}) {
  const ctx = new OfflineAudioContext(1, Math.ceil(seconds * rate), rate), out = ctx.createGain(); out.gain.value = 0.5; out.connect(ctx.destination);
  const m = new Music(ctx, out); m.setIntensity(intensity);
  // OfflineAudioContext time does not advance until rendering, so schedule the whole span up front
  m.started = false; m.tick(seconds);
  const buf = await ctx.startRendering();
  return { rate, samples: buf.getChannelData(0) };
}
