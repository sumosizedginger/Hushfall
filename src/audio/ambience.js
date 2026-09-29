// Bed sound: room tone inside, wind and water outside, and the Hush (a faint beating pair) that swells near pods.
// Everything is a continuous node graph; update() only moves gain targets, so it is cheap and click-free.
import { noiseBuffer } from './synth.js';

export class Ambience {
  constructor(ctx, out) {
    this.ctx = ctx; this.out = out;
    const loop = (filter, gain) => { const s = ctx.createBufferSource(); s.buffer = noiseBuffer(ctx); s.loop = true; s.connect(filter); filter.connect(gain); gain.connect(out); s.start(0, Math.random() * 1.5); return s; };
    const f = (type, freq, q = 0.7) => { const n = ctx.createBiquadFilter(); n.type = type; n.frequency.value = freq; n.Q.value = q; return n; };
    const lfo = (freq, depth, target) => { const o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.value = freq; g.gain.value = depth; o.connect(g); g.connect(target); o.start(); };
    // interior: brown-ish rumble + 55 Hz mains hum + a slow-moving 82 Hz undertone
    this.roomGain = ctx.createGain(); this.roomGain.gain.value = 0;
    const rumble = ctx.createGain(); rumble.gain.value = 0.9; loop(f('lowpass', 210), rumble); rumble.disconnect(); rumble.connect(this.roomGain);
    const hum = ctx.createOscillator(), hg = ctx.createGain(); hum.frequency.value = 55; hg.gain.value = 0.05; hum.connect(hg); hg.connect(this.roomGain); hum.start();
    const under = ctx.createOscillator(), ug = ctx.createGain(); under.frequency.value = 82.4; ug.gain.value = 0.03; lfo(0.09, 0.03, ug.gain); under.connect(ug); ug.connect(this.roomGain); under.start();
    this.roomGain.connect(out);
    // exterior: wind (band-passed noise, moving) + water lap (low noise with a slow swell)
    this.windGain = ctx.createGain(); this.windGain.gain.value = 0;
    const wf = f('bandpass', 520, 0.6); lfo(0.11, 260, wf.frequency); const wg = ctx.createGain(); wg.gain.value = 0.6; lfo(0.17, 0.25, wg.gain); loop(wf, wg); wg.disconnect(); wg.connect(this.windGain);
    const lf = f('lowpass', 420, 0.5), lgn = ctx.createGain(); lgn.gain.value = 0.35; lfo(0.23, 0.3, lgn.gain); loop(lf, lgn); lgn.disconnect(); lgn.connect(this.windGain);
    this.windGain.connect(out);
    // the Hush: two sines a few Hz apart => slow beating; level tracks proximity to alien growth
    this.hushGain = ctx.createGain(); this.hushGain.gain.value = 0;
    for (const fr of [440, 443.5, 660.5]) { const o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.value = fr; g.gain.value = 0.35; o.connect(g); g.connect(this.hushGain); o.start(); }
    this.hushGain.connect(out);
  }
  /** interior: 0..1 blend, hush: 0..1 proximity, level: overall scale */
  update({ interior = 1, hush = 0, level = 1 }) {
    const t = this.ctx.currentTime;
    this.roomGain.gain.setTargetAtTime(0.16 * interior * level, t, 0.6);
    this.windGain.gain.setTargetAtTime(0.13 * (1 - interior) * level, t, 0.6);
    this.hushGain.gain.setTargetAtTime(0.035 * hush * level, t, 0.8);
  }
}
