// THE MUSIC. Two scores share one class:
// * a THEMED score: a place's tune (`score.js`) in a calm version and a battle version of the same tune,
//    following the fight's level (`intensity.js`): the change into a fight waits for the calm tune's next beat, a level UP comes on
//    the next beat, a level DOWN only on the next bar, the room cleared ends on a bar with a held chord and the bell and the tune
//    comes back. Every note is one PeriodicWave (the instrument's spectrum at that pitch), drums are oscillators and noise.
//  * the older GENERATIVE score (a drone, sparse bells, a combat pulse; `intensity` 0..1) for every place that has no theme yet.
// Scheduled against audio time with a short look-ahead; after a stall (a background tab) what was missed is skipped, never played at once.
import { seededRandom } from './synth.js';
import { THEMES, VOICES, harmonics, calmPhrase, battleBeat, battleBar, stinger, beatSeconds } from './score.js';

const EPS = 0.0001;
// the generative score: D phrygian, the b2 (Eb) is the dread note
const SCALE = [293.66, 311.13, 349.23, 392.0, 440.0, 466.16, 523.25, 587.33];
const ROOTS = [73.42, 58.27, 49.0, 65.41, 73.42, 77.78]; // D2 Bb1 G1 C2 D2 Eb2
const BPM = 96,
  BEAT = 60 / BPM;
/** the themed score's level against the older one's: the themed battle sits about where the old combat layer did */
export const THEMED_GAIN = 0.6,
  REVERB_WET = 0.35,
  DRIVE = 2.2;
const fin = (x, d = 0) => (Number.isFinite(x) ? x : d);

export class Music {
  constructor(ctx, out, { seed = 5 } = {}) {
    this.ctx = ctx;
    this.out = out;
    this.r = seededRandom(seed);
    this.intensity = 0;
    this.chord = 0;
    this.nextChord = 0;
    this.nextBell = 0;
    this.nextBeat = 0;
    this.beatN = 0;
    this.started = false;
    this.theme = null;
    this.want = 0;
    this.cur = 0;
    this.mode = 'calm';
    this.live = [];
    this.queue = [];
    this.waves = new Map();
    this.pendingKill = false;
  }

  // ------------------------------------------------------------------------------------------------ choosing what plays
  /** a theme's name from score.js, or null for the generative score */
  setTheme(name) {
    const want = name && THEMES[name] ? name : null;
    if (want === this.theme) return;
    this._cutAll(this.ctx.currentTime + 0.02);
    this.theme = want;
    this.tStarted = false;
    this.queue = [];
    this.cur = 0;
    this.mode = 'calm';
    if (this.legacy) {
      const t = this.ctx.currentTime;
      this.padGain.gain.setTargetAtTime(want ? 0 : 0.075, t, 0.8);
      this.hush.gain.setTargetAtTime(want ? 0 : 0.012 + 0.03 * this.intensity, t, 0.8);
    }
  }
  /** a new level: the themed score starts from its calm tune again */
  restart() {
    this._cutAll(this.ctx.currentTime + 0.02);
    this.tStarted = false;
    this.queue = [];
    this.cur = 0;
    this.want = 0;
    this.mode = 'calm';
    this.pendingKill = false;
  }
  /** the fight's level, 0..3 (intensity.js) */
  setLevel(level) {
    this.want = Math.max(0, Math.min(3, Math.round(fin(level))));
  }
  /** a big one died: a bell on the next beat of the fight */
  kill() {
    if (this.theme && this.mode === 'battle') this.pendingKill = true;
  }
  /** the generative score's tension, 0..1 */
  setIntensity(v) {
    this.intensity = Math.max(0, Math.min(1, fin(v)));
    if (this.legacy && !this.theme) this.hush.gain.setTargetAtTime(0.012 + 0.03 * this.intensity, this.ctx.currentTime, 1.5);
  }

  /** advance the schedule up to `lookahead` seconds ahead of the audio clock */
  tick(lookahead = 0.3) {
    if (this.theme) this._themedTick(lookahead);
    else this._legacyTick(lookahead);
  }

  // ------------------------------------------------------------------------------------------------ the themed score
  _buses() {
    if (this.tOut) return;
    const c = this.ctx;
    this.tOut = c.createGain();
    this.tOut.gain.value = THEMED_GAIN;
    this.tOut.connect(this.out);
    this.clean = c.createGain();
    this.clean.connect(this.tOut);
    const shaper = c.createWaveShaper(),
      n = 1024,
      curve = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const x = (i / (n - 1)) * 2 - 1;
      curve[i] = Math.tanh(x * DRIVE) / Math.tanh(DRIVE);
    }
    shaper.curve = curve;
    this.drive = c.createGain();
    this.drive.connect(shaper);
    shaper.connect(this.tOut);
    const len = Math.floor(c.sampleRate * 2.6),
      imp = c.createBuffer(2, len, c.sampleRate); // a stone room: decaying noise, darker as it fades
    for (let ch = 0; ch < 2; ch++) {
      const d = imp.getChannelData(ch);
      let lp = 0;
      for (let i = 0; i < len; i++) {
        const k = 0.25 + 0.7 * (1 - i / len);
        lp += k * (this.r() * 2 - 1 - lp);
        d[i] = lp * Math.pow(1 - i / len, 2.2);
      }
    }
    this.verb = c.createConvolver();
    this.verb.buffer = imp;
    this.verbWet = c.createGain();
    this.verbWet.gain.value = REVERB_WET;
    this.verb.connect(this.verbWet);
    this.verbWet.connect(this.tOut);
    this.clean.connect(this.verb);
    shaper.connect(this.verb);
    const nl = c.sampleRate,
      nb = c.createBuffer(1, nl, c.sampleRate),
      nd = nb.getChannelData(0);
    for (let i = 0; i < nl; i++) nd[i] = this.r() * 2 - 1;
    this.noiseBuf = nb;
  }
  _wave(voice, f) {
    const key = voice + ':' + f.toFixed(2);
    let w = this.waves.get(key);
    if (!w) {
      const im = harmonics(voice, f),
        re = new Float32Array(im.length);
      w = this.ctx.createPeriodicWave(re, im);
      this.waves.set(key, w);
    }
    return w;
  }
  _dest(ev, bus) {
    const c = this.ctx,
      pan = fin(ev.pan);
    if (!pan || !c.createStereoPanner) return bus;
    const p = c.createStereoPanner();
    p.pan.value = Math.max(-1, Math.min(1, pan));
    p.connect(bus);
    return p;
  }
  /** play one event at absolute time t0 (`beat` seconds a beat); `section` marks notes that can be cut when the music changes */
  _play(ev, t0, beat, section) {
    if (!(t0 >= this.ctx.currentTime - 0.02)) return;
    if (VOICES[ev.voice]) return this._note(ev, t0, beat, section);
    if (ev.voice === 'bell') return this._bell(ev, t0);
    return this._drum(ev, t0);
  }
  _note(ev, t0, beat, section) {
    const c = this.ctx,
      V = VOICES[ev.voice],
      f = fin(ev.f);
    if (!(f > 20)) return;
    const dur = Math.max(0.05, fin(ev.dur, 1) * beat),
      att = Math.min(V.att, dur * 0.5),
      rel = fin(ev.rel, V.rel),
      gain = Math.max(0, fin(ev.gain)),
      end = t0 + dur + rel;
    const osc = c.createOscillator();
    osc.setPeriodicWave(this._wave(ev.voice, f));
    if (ev.glide > 20) {
      osc.frequency.setValueAtTime(ev.glide, t0);
      osc.frequency.setTargetAtTime(f, t0, 0.04);
    } else osc.frequency.setValueAtTime(f, t0);
    const g = c.createGain();
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(gain, t0 + att);
    g.gain.setValueAtTime(gain, t0 + dur);
    g.gain.linearRampToValueAtTime(0, end);
    osc.connect(g);
    g.connect(this._dest(ev, V.bus === 'drive' ? this.drive : this.clean));
    let lfo = null;
    if (ev.vib > 0) {
      lfo = c.createOscillator();
      lfo.frequency.value = 5.2;
      const lg = c.createGain();
      lg.gain.setValueAtTime(0, t0);
      lg.gain.linearRampToValueAtTime(ev.vib, t0 + Math.min(0.6, dur));
      lfo.connect(lg);
      lg.connect(osc.detune);
      lfo.start(t0);
      lfo.stop(end + 0.05);
    }
    osc.start(t0);
    osc.stop(end + 0.05);
    this.live.push({ g, osc, lfo, end, section });
  }
  _bell(ev, t0) {
    const c = this.ctx,
      f = fin(ev.f),
      out = c.createGain();
    if (!(f > 20)) return;
    out.gain.value = Math.max(0, fin(ev.gain));
    out.connect(this._dest(ev, this.clean));
    for (const [r, d, a] of [
      [0.5, 7, 0.5],
      [1, 5, 1],
      [1.191, 4.2, 0.8],
      [1.505, 3.6, 0.55],
      [2, 3.2, 0.7],
      [2.514, 2.4, 0.35],
      [2.662, 2.1, 0.3],
      [3.011, 1.7, 0.22],
      [4.03, 1.3, 0.15],
    ]) {
      const o = c.createOscillator(),
        g = c.createGain();
      o.frequency.value = f * r;
      g.gain.setValueAtTime(a * 0.3, t0);
      g.gain.exponentialRampToValueAtTime(a * 0.0003, t0 + d);
      o.connect(g);
      g.connect(out);
      o.start(t0);
      o.stop(t0 + d + 0.02);
    }
    this._noise(t0, 0.03, 0.4, out, 'highpass', 2500);
  }
  _noise(t0, len, gain, dest, type, freq, tau = len / 4) {
    const c = this.ctx,
      s = c.createBufferSource(),
      g = c.createGain();
    s.buffer = this.noiseBuf;
    let head = s;
    if (type) {
      const fl = c.createBiquadFilter();
      fl.type = type;
      fl.frequency.value = freq;
      s.connect(fl);
      head = fl;
    }
    g.gain.setValueAtTime(gain, t0);
    g.gain.setTargetAtTime(0, t0, tau);
    head.connect(g);
    g.connect(dest);
    s.start(t0, this.r() * 0.5);
    s.stop(t0 + len);
  }
  _sweep(t0, from, to, tau, gain, decay, len, dest) {
    const c = this.ctx,
      o = c.createOscillator(),
      g = c.createGain();
    o.frequency.setValueAtTime(from, t0);
    o.frequency.setTargetAtTime(to, t0, tau);
    g.gain.setValueAtTime(gain, t0);
    g.gain.setTargetAtTime(0, t0, decay);
    o.connect(g);
    g.connect(dest);
    o.start(t0);
    o.stop(t0 + len);
  }
  _drum(ev, t0) {
    const gain = Math.max(0, fin(ev.gain)),
      dest = this._dest(ev, this.clean);
    switch (ev.voice) {
      case 'kick':
        this._sweep(t0, 140, 45, 0.035, gain, 0.16, 0.6, dest);
        this._noise(t0, 0.02, gain * 0.25, dest, null, 0, 0.004);
        break;
      case 'boom':
        this._sweep(t0, 70, 30, 0.25, gain * 1.6, 0.7, 2.6, this._dest(ev, this.drive));
        break;
      case 'snare':
        this._noise(t0, 0.3, gain * 1.4, dest, 'bandpass', 1800, 0.09);
        this._sweep(t0, 185, 185, 1, gain * 0.5, 0.05, 0.25, dest);
        break;
      case 'hat':
        this._noise(t0, 0.06, gain, dest, 'highpass', 7000, 0.018);
        break;
      case 'tomH':
      case 'tomL': {
        const b = ev.voice === 'tomL' ? 72 : 108;
        this._sweep(t0, b * 1.6, b, 0.06, gain, 0.22, 0.7, dest);
        break;
      }
      case 'anvil':
        for (const [r, a, d] of [
          [1, 1, 0.35],
          [2.76, 0.6, 0.18],
          [5.4, 0.35, 0.09],
          [8.9, 0.2, 0.05],
        ])
          this._sweep(t0, 1180 * r, 1180 * r, 1, gain * a * 0.5, d, d * 5, dest);
        break;
      case 'crash':
        this._noise(t0, 2.8, gain, dest, 'highpass', 3000, 0.8);
        break;
      default:
        break;
    }
  }
  /** fade every note of `section` (or all) still sounding at time t */
  _cut(section, t) {
    for (const v of this.live) {
      if (section && v.section !== section) continue;
      if (v.end <= t) continue;
      try {
        v.g.gain.cancelScheduledValues(t);
        v.g.gain.setTargetAtTime(0, t, 0.05);
        v.osc.stop(t + 0.4);
        v.lfo?.stop(t + 0.4);
      } catch {
        /* already stopped */
      }
      v.end = t;
    }
  }
  _cutAll(t) {
    this._cut(null, t);
    this.live = [];
  }

  _themedTick(lookahead) {
    const c = this.ctx,
      now = c.currentTime,
      horizon = now + lookahead,
      T = THEMES[this.theme];
    this._buses();
    if (!this.tStarted) {
      this.tStarted = true;
      this.mode = 'calm';
      this.phraseAt = now + 1.0;
      this.phraseI = 0;
      this.queue = [];
      this.cur = 0;
    }
    this.live = this.live.filter((v) => v.end > now - 0.5);
    const cb = beatSeconds(T.calm),
      bb = beatSeconds(T.battle);
    if (this.mode === 'calm' && this.want >= 1) {
      // into the fight: on the calm tune's next beat
      const ts = this.phraseAt > now ? now + 0.05 : this.phraseAt + Math.ceil((now + 0.05 - this.phraseAt) / cb) * cb;
      if (ts < horizon) {
        this._cut('calm', ts);
        this.queue = [];
        this.mode = 'battle';
        this.bStart = ts;
        this.nextBeatAt = ts;
        this.bBeat = 0;
        this.cur = 1;
        this.leadF = 0;
        this.pendingKill = false;
        for (const e of stinger(this.theme, 'start')) this._play(e, ts, bb, 'battle');
      }
    }
    if (this.mode === 'calm') {
      for (;;) {
        while (this.queue.length && this.queue[0].t < horizon) {
          const q = this.queue.shift();
          if (q.t >= now - 0.05) this._play(q.ev, q.t, cb, 'calm');
        }
        if (this.queue.length || this.phraseAt >= horizon) break;
        if (this.phraseAt < now - 0.05) this.phraseAt = now + 0.1; // after a stall: start the next phrase now, never catch up
        const { events, beats } = calmPhrase(this.theme, this.phraseI++);
        this.queue = events.map((ev) => ({ t: this.phraseAt + ev.at * cb, ev })).sort((a, b) => a.t - b.t);
        this.phraseAt += beats * cb;
      }
      return;
    }
    // battle
    const meter = T.battle.meter;
    if (this.nextBeatAt < now - bb) {
      const n = Math.ceil((now - this.bStart) / bb);
      this.nextBeatAt = this.bStart + n * bb;
      this.bBeat = n;
    }
    while (this.nextBeatAt < horizon) {
      const t = this.nextBeatAt,
        q = this.bBeat % meter,
        bar = Math.floor(this.bBeat / meter);
      let lv = this.cur;
      if (this.want > lv) {
        if (this.want >= 2 && lv < 2) this._stinger('up2', t, bb);
        if (this.want === 3) this._stinger('up3', t, bb);
        lv = this.want;
      } else if (this.want < lv && q === 0) lv = this.want;
      if (lv === 0) {
        this._stinger('clear', t, bb);
        this._cut('battle', t + 0.02);
        this.mode = 'calm';
        this.phraseAt = t + 3.6;
        this.phraseI = 0;
        this.queue = [];
        this.cur = 0;
        return;
      }
      if (this.pendingKill) {
        this._stinger('kill', t, bb);
        this.pendingKill = false;
      }
      this.cur = lv;
      for (const e of battleBeat(this.theme, bar, q, lv)) this._play(e, t + e.at * bb, bb, 'battle');
      if (q === 0) {
        const { events, lastF } = battleBar(this.theme, bar, lv, this.leadF);
        this.leadF = lastF;
        for (const e of events) this._play(e, t + e.at * bb, bb, 'battle');
      }
      this.nextBeatAt += bb;
      this.bBeat++;
    }
  }
  _stinger(kind, t, beat) {
    for (const e of stinger(this.theme, kind)) this._play(e, t + e.at * beat, beat, kind === 'clear' ? 'clear' : 'battle');
  }

  // ------------------------------------------------------------------------------------------------ the generative score (no theme)
  _legacyBuild() {
    if (this.legacy) return;
    this.legacy = true;
    const ctx = this.ctx,
      out = this.out;
    // drone: two detuned saws under a slowly breathing lowpass
    this.filter = ctx.createBiquadFilter();
    this.filter.type = 'lowpass';
    this.filter.frequency.value = 240;
    this.filter.Q.value = 2;
    const lfo = ctx.createOscillator(),
      lg = ctx.createGain();
    lfo.frequency.value = 0.07;
    lg.gain.value = 90;
    lfo.connect(lg);
    lg.connect(this.filter.frequency);
    lfo.start();
    this.padGain = ctx.createGain();
    this.padGain.gain.value = 0.075;
    this.a = ctx.createOscillator();
    this.b = ctx.createOscillator();
    this.a.type = this.b.type = 'sawtooth';
    this.b.detune.value = 9;
    this.a.frequency.value = ROOTS[0];
    this.b.frequency.value = ROOTS[0] * 1.5;
    this.a.connect(this.filter);
    this.b.connect(this.filter);
    this.filter.connect(this.padGain);
    this.padGain.connect(out);
    this.a.start();
    this.b.start();
    // the Hush: a quiet beating pair high above everything
    this.hush = ctx.createGain();
    this.hush.gain.value = 0.012 + 0.03 * this.intensity;
    this.hush.connect(out);
    for (const f of [880, 883.2]) {
      const o = ctx.createOscillator();
      o.frequency.value = f;
      const g = ctx.createGain();
      g.gain.value = 0.5;
      o.connect(g);
      g.connect(this.hush);
      o.start();
    }
    // feedback delay gives the bells a room to ring in
    this.delay = ctx.createDelay(1);
    this.delay.delayTime.value = BEAT * 0.75;
    const fb = ctx.createGain();
    fb.gain.value = 0.38;
    const dl = ctx.createBiquadFilter();
    dl.type = 'lowpass';
    dl.frequency.value = 2200;
    this.delay.connect(dl);
    dl.connect(fb);
    fb.connect(this.delay);
    dl.connect(out);
  }
  _lbell(t, f, gain) {
    const c = this.ctx,
      o = c.createOscillator(),
      m = c.createOscillator(),
      mg = c.createGain(),
      g = c.createGain();
    o.frequency.value = f;
    m.frequency.value = f * 3.5;
    mg.gain.setValueAtTime(f * 2, t);
    mg.gain.exponentialRampToValueAtTime(1, t + 1.6);
    m.connect(mg);
    mg.connect(o.frequency);
    g.gain.setValueAtTime(EPS, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.004);
    g.gain.exponentialRampToValueAtTime(EPS, t + 2.6);
    o.connect(g);
    g.connect(this.out);
    g.connect(this.delay);
    o.start(t);
    m.start(t);
    o.stop(t + 2.7);
    m.stop(t + 2.7);
  }
  _kick(t, gain) {
    const c = this.ctx,
      o = c.createOscillator(),
      g = c.createGain();
    o.frequency.setValueAtTime(110, t);
    o.frequency.exponentialRampToValueAtTime(38, t + 0.18);
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(EPS, t + 0.22);
    o.connect(g);
    g.connect(this.out);
    o.start(t);
    o.stop(t + 0.25);
  }
  _bass(t, f, gain) {
    const c = this.ctx,
      o = c.createOscillator(),
      lp = c.createBiquadFilter(),
      g = c.createGain();
    o.type = 'sawtooth';
    o.frequency.value = f;
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(600, t);
    lp.frequency.exponentialRampToValueAtTime(120, t + 0.2);
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(EPS, t + 0.22);
    o.connect(lp);
    lp.connect(g);
    g.connect(this.out);
    o.start(t);
    o.stop(t + 0.25);
  }
  _hat(t, gain) {
    const c = this.ctx,
      len = Math.floor(c.sampleRate * 0.05),
      buf = c.createBuffer(1, len, c.sampleRate),
      d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (this.r() * 2 - 1) * (1 - i / len);
    const s = c.createBufferSource(),
      hp = c.createBiquadFilter(),
      g = c.createGain();
    s.buffer = buf;
    hp.type = 'highpass';
    hp.frequency.value = 6000;
    g.gain.value = gain;
    s.connect(hp);
    hp.connect(g);
    g.connect(this.out);
    s.start(t);
  }
  _legacyTick(lookahead) {
    this._legacyBuild();
    const c = this.ctx,
      now = c.currentTime,
      horizon = now + lookahead;
    if (!this.started) {
      this.started = true;
      this.nextChord = now + 6;
      this.nextBell = now + 1.5;
      this.nextBeat = Math.ceil(now / BEAT) * BEAT;
    }
    // After a stall (background tab, long frame) the schedule is in the past: WebAudio would play every missed bell at once. Skip what was missed
    // instead of catching up.
    this.nextChord = Math.max(this.nextChord, now);
    this.nextBell = Math.max(this.nextBell, now);
    this.nextBeat = Math.max(this.nextBeat, Math.ceil(now / BEAT) * BEAT);
    if (this.nextChord < horizon) {
      // slow harmonic movement
      this.chord = (this.chord + 1) % ROOTS.length;
      const r = ROOTS[this.chord];
      this.a.frequency.setTargetAtTime(r, this.nextChord, 1.5);
      this.b.frequency.setTargetAtTime(r * 1.5, this.nextChord, 1.5);
      this.nextChord += 10 + this.r() * 8;
    }
    while (this.nextBell < horizon) {
      // sparse Bell motif; denser under tension
      const n = SCALE[Math.floor(this.r() * SCALE.length)] * (this.r() < 0.3 ? 0.5 : 1);
      this._lbell(this.nextBell, n, 0.05 + 0.03 * this.intensity);
      if (this.r() < 0.35) this._lbell(this.nextBell + BEAT * 1.5, n * 1.5, 0.03);
      this.nextBell += 4 - 2.2 * this.intensity + this.r() * (5 - 3 * this.intensity);
    }
    while (this.nextBeat < horizon) {
      // combat pulse only when tense; keeps the grid so it locks in cleanly
      const t = this.nextBeat,
        I = this.intensity;
      if (I > 0.08 && t >= now - 0.05) {
        this._kick(t, (this.beatN % 2 === 0 ? 0.75 : 0.35) * I);
        this._hat(t + BEAT / 2, 0.09 * I);
        const bassNote = ROOTS[this.chord] * (this.beatN % 8 === 6 ? 1.2 : 1);
        this._bass(t, bassNote * 2, 0.17 * I);
      }
      this.beatN++;
      this.nextBeat += BEAT / 1;
    }
  }
}

/** Offline render for QA: `seconds` of score. With a theme (the default, 'harbour') `intensity` 0 is the calm tune and anything above
 *  is the fight at level round(intensity x 3) at least 1; `theme: null` renders the generative score at that intensity. */
export async function renderMusic({ seconds = 12, intensity = 0.8, rate = 44100, theme = 'harbour' } = {}) {
  const ctx = new OfflineAudioContext(1, Math.ceil(seconds * rate), rate),
    out = ctx.createGain();
  out.gain.value = 0.5;
  out.connect(ctx.destination);
  const m = new Music(ctx, out);
  m.setTheme(theme);
  m.setIntensity(intensity);
  m.setLevel(intensity > 0 ? Math.max(1, Math.round(intensity * 3)) : 0);
  // OfflineAudioContext time does not advance until rendering, so schedule the whole span up front
  m.started = false;
  m.tick(seconds);
  const buf = await ctx.startRendering();
  return { rate, samples: buf.getChannelData(0) };
}
