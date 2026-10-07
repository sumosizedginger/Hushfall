// Procedural sound design. Every recipe is (ctx, out, t, o) => duration and runs on any BaseAudioContext (real-time or Offline),
// so the same code is played in-game and rendered for measurement. No samples, no external audio: oscillators, filtered noise, FM bells.
// o.r() is a [0,1) random source supplied by the caller (seeded offline, engine-seeded live) for per-play variation.
const EPS = 0.0001;

// ------------------------------------------------------------------ toolkit
const noiseBuffers = new WeakMap();
export function noiseBuffer(ctx) {
  let b = noiseBuffers.get(ctx);
  if (!b) {
    const len = Math.floor(ctx.sampleRate * 2);
    b = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = b.getChannelData(0); let s = 0x1234abcd;
    for (let i = 0; i < len; i++) { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; d[i] = (s / 4294967296) * 2 - 1; }
    noiseBuffers.set(ctx, b);
  }
  return b;
}
/** attack to `peak` then exponential decay over `d` seconds */
function env(g, t, a, peak, d) {
  g.gain.setValueAtTime(EPS, t);
  g.gain.exponentialRampToValueAtTime(Math.max(peak, EPS), t + Math.max(a, 0.001));
  g.gain.exponentialRampToValueAtTime(EPS, t + a + d);
}
function tone(ctx, out, t, { type = 'sine', f0, f1 = f0, a = 0.004, d = 0.2, gain = 0.3, detune = 0, lp = 0, vib = 0 }) {
  const o = ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(f0, t);
  if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t + a + d);
  o.detune.value = detune;
  let node = o;
  if (lp) { const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = lp; o.connect(f); node = f; }
  if (vib) { const l = ctx.createOscillator(); l.frequency.value = 6.5; const lg = ctx.createGain(); lg.gain.value = vib; l.connect(lg); lg.connect(o.frequency); l.start(t); l.stop(t + a + d + 0.05); }
  const g = ctx.createGain(); env(g, t, a, gain, d); node.connect(g); g.connect(out);
  o.start(t); o.stop(t + a + d + 0.05);
}
function noise(ctx, out, t, { dur = 0.2, a = 0.002, gain = 0.3, type = 'lowpass', f0 = 2000, f1 = f0, q = 0.7, off = 0 }) {
  const s = ctx.createBufferSource(); s.buffer = noiseBuffer(ctx); s.loop = true;
  const f = ctx.createBiquadFilter(); f.type = type; f.Q.value = q; f.frequency.setValueAtTime(f0, t);
  if (f1 !== f0) f.frequency.exponentialRampToValueAtTime(f1, t + dur);
  const g = ctx.createGain(); env(g, t, a, gain, dur);
  s.connect(f); f.connect(g); g.connect(out); s.start(t, off % 1.5); s.stop(t + a + dur + 0.05);
}
/** two-operator FM bell: bronze, inharmonic, long decay. The Vael Bells and the pickup chimes are made of this. */
function bell(ctx, out, t, freq, { decay = 1.4, gain = 0.25, ratio = 3.5, index = 2.2, a = 0.003 } = {}) {
  const c = ctx.createOscillator(), m = ctx.createOscillator(), mg = ctx.createGain();
  c.frequency.value = freq; m.frequency.value = freq * ratio;
  mg.gain.setValueAtTime(freq * index, t); mg.gain.exponentialRampToValueAtTime(EPS + 1, t + decay * 0.7);
  m.connect(mg); mg.connect(c.frequency);
  const g = ctx.createGain(); env(g, t, a, gain, decay); c.connect(g); g.connect(out);
  c.start(t); m.start(t); c.stop(t + decay + 0.1); m.stop(t + decay + 0.1);
}
const thump = (ctx, out, t, f0, f1, d, gain) => tone(ctx, out, t, { type: 'sine', f0, f1, a: 0.003, d, gain });

// ------------------------------------------------------------------ recipes
export const SFX = {
  // --- weapons ---
  flare_fire(c, out, t, o) {                                    // dull cannon thump, a flash of hiss, a fizzing tail
    thump(c, out, t, 150, 42, 0.28, 0.75);
    noise(c, out, t, { dur: 0.35, gain: 0.5, type: 'bandpass', f0: 1400, f1: 300, q: 0.9, off: o.r() });
    noise(c, out, t + 0.05, { dur: 0.7, a: 0.04, gain: 0.14, type: 'highpass', f0: 3500, f1: 2500, off: o.r() });
    return 0.8;
  },
  flare_boom(c, out, t, o) {
    thump(c, out, t, 78, 26, 0.75, 0.65);
    noise(c, out, t, { dur: 0.95, gain: 0.55, type: 'lowpass', f0: 3200, f1: 140, q: 0.6, off: o.r() });
    for (let i = 0; i < 6; i++) noise(c, out, t + 0.05 + o.r() * 0.6, { dur: 0.05, gain: 0.14, type: 'highpass', f0: 3000 + o.r() * 3000, off: o.r() });   // burning crackle
    return 1.1;
  },
  scatter_fire(c, out, t, o) {                                  // heavy short blast with a metallic ring
    thump(c, out, t, 115, 38, 0.3, 0.65);
    noise(c, out, t, { dur: 0.4, gain: 0.62, type: 'lowpass', f0: 7000, f1: 380, q: 0.5, off: o.r() });
    noise(c, out, t, { dur: 0.12, gain: 0.28, type: 'highpass', f0: 2500, off: o.r() });
    tone(c, out, t + 0.01, { f0: 910, d: 0.18, gain: 0.07 }); tone(c, out, t + 0.01, { f0: 1373, d: 0.14, gain: 0.05 });
    return 0.6;
  },
  pump(c, out, t, o) {                                          // fore-end slide: two clacks and a low thunk
    noise(c, out, t, { dur: 0.05, gain: 0.5, type: 'bandpass', f0: 1800, q: 2, off: o.r() });
    thump(c, out, t + 0.02, 210, 110, 0.1, 0.3);
    noise(c, out, t + 0.17, { dur: 0.06, gain: 0.55, type: 'bandpass', f0: 1500, q: 2, off: o.r() });
    thump(c, out, t + 0.19, 170, 90, 0.1, 0.35);
    return 0.35;
  },
  harpoon_fire(c, out, t, o) {                                  // a long gun: a flat supersonic crack over a deep thump, the line zipping off its reel, a ring from the bolt leaving the steel
    thump(c, out, t, 95, 30, 0.42, 0.55);
    noise(c, out, t, { dur: 0.07, gain: 0.36, type: 'highpass', f0: 2200, off: o.r() });
    noise(c, out, t, { dur: 0.5, gain: 0.28, type: 'lowpass', f0: 5200, f1: 240, q: 0.5, off: o.r() });
    tone(c, out, t, { type: 'triangle', f0: 2600, f1: 420, d: 0.14, gain: 0.12 });
    noise(c, out, t + 0.03, { dur: 0.36, a: 0.02, gain: 0.1, type: 'bandpass', f0: 1200, f1: 3200, q: 3, off: o.r() });
    bell(c, out, t + 0.01, 1180, { decay: 0.5, gain: 0.1, ratio: 3.1, index: 1.4 });
    return 0.85;
  },
  harpoon_cycle(c, out, t, o) {                                 // the action: the carriage slides back, the reel winds in, the next bolt seats with a heavy clack
    noise(c, out, t, { dur: 0.05, gain: 0.45, type: 'bandpass', f0: 1400, q: 2, off: o.r() }); thump(c, out, t + 0.02, 190, 100, 0.1, 0.3);
    noise(c, out, t + 0.1, { dur: 0.22, a: 0.05, gain: 0.14, type: 'bandpass', f0: 700, f1: 1500, q: 3, off: o.r() });
    noise(c, out, t + 0.3, { dur: 0.06, gain: 0.6, type: 'bandpass', f0: 1700, q: 2, off: o.r() }); thump(c, out, t + 0.31, 150, 70, 0.12, 0.4);
    return 0.5;
  },
  arc_fire(c, out, t, o) {                                      // the lamp: a wet electric crackle, a buzz under a snap of noise and a falling zap; short, because it repeats six times a second
    tone(c, out, t, { type: 'sawtooth', f0: 110 + o.r() * 20, d: 0.14, gain: 0.16, lp: 900 });
    noise(c, out, t, { dur: 0.1, gain: 0.42, type: 'bandpass', f0: 3200 + o.r() * 1800, q: 1.5, off: o.r() });
    tone(c, out, t, { type: 'square', f0: 2400 + o.r() * 800, f1: 600, d: 0.09, gain: 0.1, lp: 4200 });
    return 0.18;
  },
  // --- PT-013: the lamp's charge, melee, guard and parry, burning ground, the pinning bolt ---
  arc_bolt(c, out, t, o) {                                      // a charged lamp: the held breath let go. A fat sawtooth crack that falls through the floor, a bright sweep of noise, forking crackle, the bulb's glass ringing
    tone(c, out, t, { type: 'sawtooth', f0: 420 + o.r() * 40, f1: 55, d: 0.42, gain: 0.26, lp: 1400 });
    tone(c, out, t, { type: 'square', f0: 3100, f1: 700, d: 0.16, gain: 0.12, lp: 5200 });
    noise(c, out, t, { dur: 0.34, gain: 0.55, type: 'bandpass', f0: 5200, f1: 700, q: 1.1, off: o.r() });
    thump(c, out, t, 110, 34, 0.38, 0.7);
    for (let i = 0; i < 5; i++) noise(c, out, t + 0.04 + i * 0.045, { dur: 0.03, gain: 0.22, type: 'highpass', f0: 4000 + o.r() * 2500, off: o.r() });
    bell(c, out, t + 0.02, 1760, { decay: 0.55, gain: 0.1, ratio: 2.4, index: 1.1 });
    return 0.7;
  },
  arc_charge(c, out, t, o) {                                    // the lamp charging (about 0.85 s, the length of a charge): a hum climbing, a thin whine over it, a hiss that brightens
    tone(c, out, t, { type: 'sawtooth', f0: 70, f1: 240, a: 0.2, d: 0.7, gain: 0.14, lp: 800, vib: 14 });
    tone(c, out, t, { type: 'sine', f0: 520, f1: 1500, a: 0.25, d: 0.6, gain: 0.07 });
    noise(c, out, t, { dur: 0.85, a: 0.3, gain: 0.12, type: 'bandpass', f0: 1800, f1: 4200, q: 2.5, off: o.r() });
    return 0.95;
  },
  charge_full(c, out, t, o) {                                   // fully charged: a clean ring over a steady buzz, so the player knows to let go
    bell(c, out, t, 1318, { decay: 0.8, gain: 0.16, ratio: 2.01, index: 0.5 });
    tone(c, out, t, { type: 'sawtooth', f0: 240, d: 0.6, gain: 0.08, lp: 700, vib: 16 });
    return 0.9;
  },
  fist_charge(c, out, t, o) {                                   // a fist drawn back: leather and knuckle creak, a low breath
    noise(c, out, t, { dur: 0.4, a: 0.1, gain: 0.22, type: 'bandpass', f0: 500, f1: 900, q: 3, off: o.r() });
    tone(c, out, t, { type: 'sine', f0: 62, f1: 80, a: 0.2, d: 0.3, gain: 0.2 });
    return 0.5;
  },
  swing(c, out, t, o) { noise(c, out, t, { dur: 0.2, a: 0.04, gain: 0.34, type: 'bandpass', f0: 600, f1: 2400, q: 1.2, off: o.r() }); return 0.25; },
  swing_heavy(c, out, t, o) { noise(c, out, t, { dur: 0.34, a: 0.07, gain: 0.46, type: 'bandpass', f0: 300, f1: 1700, q: 1, off: o.r() }); thump(c, out, t + 0.06, 90, 50, 0.2, 0.3); return 0.45; },
  melee_hit(c, out, t, o) { thump(c, out, t, 190, 58, 0.15, 0.85); noise(c, out, t, { dur: 0.1, gain: 0.5, type: 'bandpass', f0: 1100 + o.r() * 400, q: 1.2, off: o.r() }); noise(c, out, t, { dur: 0.04, gain: 0.3, type: 'highpass', f0: 3500, off: o.r() }); return 0.25; },
  melee_hit_heavy(c, out, t, o) { thump(c, out, t, 130, 34, 0.34, 1); noise(c, out, t, { dur: 0.22, gain: 0.6, type: 'lowpass', f0: 3200, f1: 240, off: o.r() }); noise(c, out, t, { dur: 0.05, gain: 0.4, type: 'highpass', f0: 3000, off: o.r() }); bell(c, out, t + 0.01, 420, { decay: 0.3, gain: 0.12, ratio: 3.2, index: 1.2 }); return 0.5; },
  parry(c, out, t, o) {                                         // a clean steel clash: a bright ring and its overtone, a snap, a body under it. The most satisfying sound of the melee set, on purpose: it is the reward for a read.
    bell(c, out, t, 1480, { decay: 0.55, gain: 0.3, ratio: 2.76, index: 1.3 }); bell(c, out, t + 0.005, 2217, { decay: 0.35, gain: 0.16, ratio: 3.1, index: 0.8 });
    noise(c, out, t, { dur: 0.05, gain: 0.55, type: 'highpass', f0: 3800, off: o.r() }); thump(c, out, t, 170, 60, 0.14, 0.7);
    return 0.65;
  },
  guard_up(c, out, t, o) { noise(c, out, t, { dur: 0.09, a: 0.02, gain: 0.26, type: 'bandpass', f0: 700, f1: 1300, q: 1.5, off: o.r() }); tone(c, out, t, { f0: 300, f1: 400, d: 0.05, gain: 0.06 }); return 0.12; },
  block(c, out, t, o) { thump(c, out, t, 150, 70, 0.12, 0.8); noise(c, out, t, { dur: 0.1, gain: 0.4, type: 'bandpass', f0: 900, q: 1.5, off: o.r() }); bell(c, out, t, 620, { decay: 0.18, gain: 0.1, ratio: 2.3, index: 0.8 }); return 0.25; },
  guard_break(c, out, t, o) { thump(c, out, t, 100, 28, 0.45, 1); noise(c, out, t, { dur: 0.4, gain: 0.55, type: 'lowpass', f0: 2600, f1: 200, off: o.r() }); bell(c, out, t, 311, { decay: 0.7, gain: 0.2, ratio: 2.9, index: 2 }); return 0.8; },
  burn_start(c, out, t, o) {                                    // a flare's burst settling into burning ground: the whoomph, then a field of crackle
    noise(c, out, t, { dur: 0.7, a: 0.04, gain: 0.5, type: 'lowpass', f0: 1400, f1: 200, off: o.r() }); thump(c, out, t, 70, 28, 0.5, 0.6);
    for (let i = 0; i < 10; i++) noise(c, out, t + 0.1 + o.r() * 1.1, { dur: 0.04, gain: 0.12, type: 'highpass', f0: 2500 + o.r() * 3000, off: o.r() });
    return 1.4;
  },
  pin_thunk(c, out, t, o) { thump(c, out, t, 140, 40, 0.3, 0.9); noise(c, out, t, { dur: 0.05, gain: 0.5, type: 'highpass', f0: 3000, off: o.r() }); noise(c, out, t, { dur: 0.15, gain: 0.3, type: 'bandpass', f0: 1200, q: 1.5, off: o.r() }); bell(c, out, t, 900, { decay: 0.3, gain: 0.14, ratio: 3.3, index: 1.4 }); return 0.45; },
  dry_click(c, out, t, o) { noise(c, out, t, { dur: 0.03, gain: 0.35, type: 'highpass', f0: 3000, off: o.r() }); tone(c, out, t, { type: 'square', f0: 1700, d: 0.02, gain: 0.05 }); return 0.1; },
  weapon_switch(c, out, t, o) { noise(c, out, t, { dur: 0.12, a: 0.03, gain: 0.25, type: 'bandpass', f0: 900, f1: 1800, q: 1.2, off: o.r() }); thump(c, out, t + 0.1, 200, 130, 0.08, 0.25); return 0.25; },
  impact(c, out, t, o) { noise(c, out, t, { dur: 0.06, gain: 0.3, type: 'bandpass', f0: 2200 + o.r() * 800, q: 1.5, off: o.r() }); tone(c, out, t, { f0: 600 + o.r() * 300, f1: 300, d: 0.05, gain: 0.08 }); return 0.12; },
  // --- player ---
  hurt(c, out, t, o) { thump(c, out, t, 125, 48, 0.2, 0.8); noise(c, out, t, { dur: 0.22, gain: 0.35, type: 'lowpass', f0: 1200, f1: 400, off: o.r() }); return 0.3; },
  player_die(c, out, t, o) { thump(c, out, t, 90, 30, 0.6, 0.9); tone(c, out, t, { type: 'sawtooth', f0: 300, f1: 38, d: 1.5, gain: 0.25, lp: 700 }); noise(c, out, t, { dur: 1.2, a: 0.02, gain: 0.3, type: 'lowpass', f0: 1500, f1: 80, off: o.r() }); return 1.8; },
  step_plank(c, out, t, o) { const v = 0.85 + o.r() * 0.3; noise(c, out, t, { dur: 0.07, gain: 0.3 * v, type: 'lowpass', f0: 650 + o.r() * 200, q: 0.8, off: o.r() }); thump(c, out, t, 95 + o.r() * 20, 58, 0.07, 0.3 * v); return 0.12; },
  step_outdoor(c, out, t, o) { const v = 0.85 + o.r() * 0.3; noise(c, out, t, { dur: 0.09, gain: 0.3 * v, type: 'bandpass', f0: 1000 + o.r() * 300, q: 0.7, off: o.r() }); thump(c, out, t, 80, 50, 0.08, 0.22 * v); return 0.14; },
  // --- pickups ---
  pickup_health(c, out, t) { bell(c, out, t, 660, { decay: 0.5, gain: 0.18, ratio: 2, index: 0.6 }); bell(c, out, t + 0.09, 880, { decay: 0.6, gain: 0.16, ratio: 2, index: 0.6 }); return 0.75; },
  pickup_ammo(c, out, t, o) { noise(c, out, t, { dur: 0.04, gain: 0.5, type: 'bandpass', f0: 2200, q: 3, off: o.r() }); noise(c, out, t + 0.08, { dur: 0.04, gain: 0.5, type: 'bandpass', f0: 1700, q: 3, off: o.r() }); tone(c, out, t + 0.08, { f0: 2400, d: 0.12, gain: 0.05 }); return 0.25; },
  pickup_armor(c, out, t, o) { noise(c, out, t, { dur: 0.3, a: 0.08, gain: 0.3, type: 'bandpass', f0: 900, f1: 500, q: 0.8, off: o.r() }); thump(c, out, t + 0.12, 130, 80, 0.12, 0.3); return 0.45; },
  pickup_key(c, out, t) { bell(c, out, t, 880, { decay: 1.3, gain: 0.22 }); bell(c, out, t + 0.06, 1318, { decay: 1.0, gain: 0.12 }); return 1.5; },
  // --- doors ---
  door_open(c, out, t, o) {
    tone(c, out, t, { type: 'sawtooth', f0: 82, f1: 138, a: 0.1, d: 0.55, gain: 0.16, lp: 520, vib: 6 });
    tone(c, out, t + 0.5, { type: 'sawtooth', f0: 138, f1: 96, a: 0.05, d: 0.35, gain: 0.1, lp: 420, vib: 4 });
    noise(c, out, t, { dur: 0.9, a: 0.1, gain: 0.22, type: 'lowpass', f0: 380, f1: 200, off: o.r() });
    thump(c, out, t + 0.75, 110, 55, 0.14, 0.4);
    return 1.0;
  },
  door_close(c, out, t, o) { noise(c, out, t, { dur: 0.35, gain: 0.25, type: 'lowpass', f0: 420, off: o.r() }); thump(c, out, t + 0.25, 100, 45, 0.18, 0.6); return 0.55; },
  door_locked(c, out, t, o) { thump(c, out, t, 150, 95, 0.09, 0.7); thump(c, out, t + 0.16, 140, 90, 0.09, 0.6); noise(c, out, t + 0.02, { dur: 0.18, gain: 0.25, type: 'bandpass', f0: 1500, q: 2, off: o.r() }); return 0.4; },
  secret(c, out, t) {                                           // the Hush, briefly audible: detuned pairs that beat, plus one high bell
    for (const f of [523.25, 528, 784, 790]) tone(c, out, t, { f0: f, a: 0.35, d: 1.7, gain: 0.07 });
    bell(c, out, t + 0.3, 1046.5, { decay: 1.6, gain: 0.14 });
    return 2.2;
  },
  // --- Tollbearers (bells) ---
  toll_alert(c, out, t, o) { bell(c, out, t, 92 + o.r() * 14, { decay: 2.4, gain: 0.55, ratio: 2.76, index: 1.6 }); tone(c, out, t, { type: 'sawtooth', f0: 170, f1: 88, d: 0.65, gain: 0.16, lp: 420 }); return 2.5; },
  toll_soft(c, out, t, o) { bell(c, out, t, 120 + o.r() * 90, { decay: 1.8, gain: 0.11, ratio: 2.76, index: 1.2 }); return 1.9; },
  // Bellhand: a muted low strike on its own forearm bell (alert), a rising shimmer while it arms (charge), one bright toll when it fires, a dull ring on impact
  bell_alert(c, out, t, o) { bell(c, out, t, 150 + o.r() * 10, { decay: 1.6, gain: 0.5, ratio: 2.4, index: 1.2 }); tone(c, out, t, { type: 'sawtooth', f0: 210, f1: 120, d: 0.4, gain: 0.12, lp: 380 }); return 1.7; },
  bell_charge(c, out, t, o) { tone(c, out, t, { f0: 330, f1: 660, a: 0.35, d: 0.25, gain: 0.16, vib: 6 }); noise(c, out, t, { dur: 0.55, a: 0.3, gain: 0.12, type: 'bandpass', f0: 900, f1: 2600, q: 2, off: o.r() }); return 0.65; },
  toll_shot(c, out, t, o) { bell(c, out, t, 262, { decay: 0.9, gain: 0.5, ratio: 3.1, index: 2.0 }); thump(c, out, t, 120, 60, 0.18, 0.4); return 1; },
  shot_impact(c, out, t, o) { bell(c, out, t, 196, { decay: 0.35, gain: 0.3, ratio: 2.7, index: 1.0 }); noise(c, out, t, { dur: 0.1, gain: 0.2, type: 'bandpass', f0: 1800, q: 1.2, off: o.r() }); return 0.45; },
  rivet_fire(c, out, t, o) { const f = 1500 + o.r() * 700; tone(c, out, t, { type: 'square', f0: f, f1: f * 0.4, d: 0.035, gain: 0.16, lp: 3600 }); noise(c, out, t, { dur: 0.05, gain: 0.34, type: 'bandpass', f0: 2400 + o.r() * 800, q: 1.2, off: o.r() }); thump(c, out, t, 210, 70, 0.06, 0.32); return 0.12; },
  // Gate 2 roster: elites and the boss
  armor_ping(c, out, t, o) { bell(c, out, t, 1850 + o.r() * 300, { decay: 0.28, gain: 0.22, ratio: 2.4, index: 1.2 }); noise(c, out, t, { dur: 0.04, gain: 0.2, type: 'highpass', f0: 4000, off: o.r() }); return 0.35; },
  shield_ping(c, out, t, o) { bell(c, out, t, 1240, { decay: 0.6, gain: 0.2, ratio: 3.8, index: 1.6 }); tone(c, out, t, { f0: 2480, f1: 1900, d: 0.15, gain: 0.08 }); return 0.7; },
  node_sever(c, out, t, o) { bell(c, out, t, 220, { decay: 1.8, gain: 0.36, ratio: 2.7, index: 2 }); bell(c, out, t + 0.06, 330, { decay: 1.4, gain: 0.25, ratio: 3.1, index: 1.8 }); noise(c, out, t, { dur: 0.32, gain: 0.36, type: 'bandpass', f0: 1800, f1: 400, q: 0.8, off: o.r() }); thump(c, out, t, 120, 40, 0.3, 0.7); return 2; },
  warden_crash(c, out, t, o) { thump(c, out, t, 95, 30, 0.55, 0.95); noise(c, out, t, { dur: 0.4, gain: 0.55, type: 'lowpass', f0: 900, f1: 200, q: 0.9, off: o.r() }); bell(c, out, t + 0.02, 140, { decay: 1.1, gain: 0.35, ratio: 2.9, index: 1.8 }); return 1.2; },
  sexton_channel(c, out, t, o) { tone(c, out, t, { type: 'sawtooth', f0: 300, f1: 900, a: 0.9, d: 1.3, gain: 0.12, lp: 2600, vib: 8 }); bell(c, out, t + 0.4, 1180, { decay: 2, gain: 0.15, ratio: 3.5, index: 1.4 }); noise(c, out, t, { dur: 2, a: 1.2, gain: 0.1, type: 'bandpass', f0: 1500, f1: 4000, q: 2, off: o.r() }); return 2.3; },
  revive(c, out, t, o) { bell(c, out, t, 110, { decay: 2.4, gain: 0.5, ratio: 2.6, index: 1.6 }); tone(c, out, t, { f0: 200, f1: 90, d: 0.6, gain: 0.2 }); noise(c, out, t + 0.05, { dur: 0.5, gain: 0.25, type: 'highpass', f0: 2500, off: o.r() }); return 2.5; },
  tone_pulse(c, out, t, o) { tone(c, out, t, { f0: 62, f1: 38, a: 0.05, d: 1.4, gain: 0.75 }); bell(c, out, t, 73.4, { decay: 2.8, gain: 0.55, ratio: 2.5, index: 1.4 }); noise(c, out, t, { dur: 1.1, a: 0.2, gain: 0.25, type: 'lowpass', f0: 240, q: 0.8, off: o.r() }); return 3; },
  pulse_hit(c, out, t, o) { thump(c, out, t, 85, 36, 0.35, 0.85); bell(c, out, t, 196, { decay: 0.9, gain: 0.35, ratio: 3, index: 1.5 }); return 1; },
  warden_roar(c, out, t, o) { tone(c, out, t, { type: 'sawtooth', f0: 92, f1: 66, a: 0.1, d: 0.9, gain: 0.26, lp: 320 }); noise(c, out, t, { dur: 0.8, a: 0.1, gain: 0.3, type: 'bandpass', f0: 420, f1: 260, q: 1.1, off: o.r() }); bell(c, out, t, 70, { decay: 1.6, gain: 0.3, ratio: 2.8, index: 1.6 }); return 1.7; },
  cantor_call(c, out, t, o) { for (const [f, d] of [[73.4, 3.2], [110, 3], [146.8, 2.8], [220, 2.4]]) bell(c, out, t, f, { decay: d, gain: 0.3, ratio: 2.6, index: 1.3 }); tone(c, out, t, { f0: 148, f1: 104, a: 0.2, d: 1.6, gain: 0.16, lp: 500, vib: 4 }); return 3.4; },
  // Gate 2 mechanics: switches, moving floors, wading, alarms, gates
  switch_click(c, out, t, o) { tone(c, out, t, { type: 'square', f0: 1500, f1: 700, d: 0.03, gain: 0.12, lp: 3000 }); thump(c, out, t + 0.03, 180, 70, 0.1, 0.35); noise(c, out, t + 0.05, { dur: 0.05, gain: 0.15, type: 'bandpass', f0: 2500, q: 2, off: o.r() }); return 0.2; },
  switch_dead(c, out, t, o) { thump(c, out, t, 120, 60, 0.08, 0.25); return 0.12; },
  lift_rumble(c, out, t, o) { noise(c, out, t, { dur: 1.4, a: 0.25, gain: 0.32, type: 'lowpass', f0: 260, f1: 140, q: 1.2, off: o.r() }); tone(c, out, t, { type: 'sawtooth', f0: 46, f1: 58, a: 0.2, d: 1.2, gain: 0.13, lp: 160 }); return 1.5; },
  lift_thunk(c, out, t, o) { thump(c, out, t, 90, 34, 0.3, 0.7); noise(c, out, t, { dur: 0.18, gain: 0.3, type: 'lowpass', f0: 900, q: 0.8, off: o.r() }); return 0.4; },
  splash(c, out, t, o) { noise(c, out, t, { dur: 0.28, a: 0.01, gain: 0.3, type: 'bandpass', f0: 1200 + o.r() * 500, f1: 500, q: 0.9, off: o.r() }); noise(c, out, t + 0.05, { dur: 0.2, gain: 0.12, type: 'highpass', f0: 3000, off: o.r() }); return 0.35; },
  alarm_bell(c, out, t, o) { for (let i = 0; i < 4; i++) bell(c, out, t + i * 0.42, 210, { decay: 0.7, gain: 0.32, ratio: 2.9, index: 1.4 }); return 2; },
  gate_unlock(c, out, t, o) { bell(c, out, t, 330, { decay: 1.2, gain: 0.28, ratio: 3.5, index: 1.5 }); bell(c, out, t + 0.16, 495, { decay: 1.4, gain: 0.22, ratio: 3.5, index: 1.5 }); thump(c, out, t, 70, 36, 0.4, 0.5); return 1.7; },
  wheeze_windup(c, out, t, o) { noise(c, out, t, { dur: 0.7, a: 0.15, gain: 0.32, type: 'bandpass', f0: 500, f1: 1500, q: 1.4, off: o.r() }); tone(c, out, t, { f0: 140, f1: 260, a: 0.2, d: 0.5, gain: 0.12 }); return 0.8; },
  strike(c, out, t, o) { noise(c, out, t, { dur: 0.26, gain: 0.55, type: 'bandpass', f0: 900, f1: 320, q: 0.9, off: o.r() }); thump(c, out, t + 0.06, 95, 38, 0.25, 0.85); return 0.4; },
  enemy_hit(c, out, t, o) { thump(c, out, t, 210, 70, 0.13, 0.7); noise(c, out, t, { dur: 0.14, gain: 0.45, type: 'lowpass', f0: 950, off: o.r() }); return 0.25; },
  // --- Vael-grown (Gate 4 batch 2): the Drone-Gill, the Graft-Mother ---
  gill_chirp(c, out, t, o) {                                    // a quick rising warble, twice: wet, high, alien
    for (const [dt, f] of [[0, 1500], [0.13, 1850]]) tone(c, out, t + dt, { type: 'sine', f0: f, f1: f * 1.7, a: 0.008, d: 0.12, gain: 0.2, vib: 55 });
    noise(c, out, t, { dur: 0.3, gain: 0.1, type: 'bandpass', f0: 4200, f1: 5200, q: 2, off: o.r() });
    return 0.5;
  },
  gill_spit(c, out, t, o) {                                     // the sac pops: a wet thump and a short hiss
    thump(c, out, t, 420, 130, 0.12, 0.4); tone(c, out, t, { type: 'triangle', f0: 300, f1: 900, a: 0.004, d: 0.1, gain: 0.14 });
    noise(c, out, t, { dur: 0.25, gain: 0.3, type: 'bandpass', f0: 900, f1: 320, q: 1.2, off: o.r() });
    return 0.4;
  },
  gill_die(c, out, t, o) {                                      // a dropping shriek, then it hits the floor
    tone(c, out, t, { type: 'sawtooth', f0: 1800, f1: 200, a: 0.01, d: 0.5, gain: 0.22, lp: 2400, vib: 30 });
    noise(c, out, t, { dur: 0.5, gain: 0.2, type: 'lowpass', f0: 1400, f1: 220, off: o.r() });
    thump(c, out, t + 0.42, 95, 40, 0.2, 0.45);
    return 0.9;
  },
  mother_roar(c, out, t, o) {                                   // very low and very long: a pod the size of a room breathing out
    tone(c, out, t, { type: 'sawtooth', f0: 58, f1: 38, a: 0.25, d: 1.7, gain: 0.3, lp: 240, vib: 3 });
    tone(c, out, t, { type: 'sine', f0: 29, f1: 24, a: 0.3, d: 1.7, gain: 0.45 });
    noise(c, out, t, { dur: 1.5, a: 0.2, gain: 0.28, type: 'bandpass', f0: 190, f1: 90, q: 0.8, off: o.r() });
    return 2.1;
  },
  mother_spit(c, out, t, o) {                                   // a fan of spores: a deep wet blast
    thump(c, out, t, 170, 55, 0.3, 0.7); noise(c, out, t, { dur: 0.5, gain: 0.4, type: 'bandpass', f0: 700, f1: 200, q: 1.0, off: o.r() });
    tone(c, out, t + 0.02, { type: 'sawtooth', f0: 120, f1: 60, a: 0.01, d: 0.3, gain: 0.18, lp: 500 });
    return 0.7;
  },
  mother_hatch(c, out, t, o) {                                  // a Gill tears out of its sac
    noise(c, out, t, { dur: 0.3, gain: 0.35, type: 'bandpass', f0: 1800, f1: 500, q: 1.4, off: o.r() });
    tone(c, out, t, { f0: 220, f1: 90, a: 0.005, d: 0.25, gain: 0.4 }); tone(c, out, t + 0.12, { type: 'sine', f0: 1400, f1: 2400, a: 0.01, d: 0.12, gain: 0.14, vib: 50 });
    return 0.55;
  },
  mother_die(c, out, t, o) {                                    // the long fall of the whole line: a growl that never finds the floor
    tone(c, out, t, { type: 'sawtooth', f0: 90, f1: 22, a: 0.1, d: 3.2, gain: 0.32, lp: 300, vib: 4 });
    noise(c, out, t, { dur: 2.6, a: 0.1, gain: 0.3, type: 'lowpass', f0: 900, f1: 80, off: o.r() });
    for (const [dt, f] of [[0.3, 130], [1.1, 98], [2.0, 73]]) bell(c, out, t + dt, f, { decay: 1.8, gain: 0.2, ratio: 2.6, index: 1.4 });
    thump(c, out, t + 0.1, 70, 28, 0.9, 0.7);
    return 3.6;
  },
  enemy_die(c, out, t, o) {
    tone(c, out, t, { type: 'sawtooth', f0: 200, f1: 58, a: 0.02, d: 0.85, gain: 0.32, lp: 520, vib: 8 });
    noise(c, out, t, { dur: 0.6, gain: 0.3, type: 'lowpass', f0: 1100, f1: 150, off: o.r() });
    thump(c, out, t + 0.6, 90, 34, 0.25, 0.85);
    bell(c, out, t + 0.05, 78, { decay: 1.6, gain: 0.3, ratio: 2.76, index: 1.4 });
    return 1.5;
  },
  gaunt_screech(c, out, t, o) { tone(c, out, t, { type: 'sawtooth', f0: 700, f1: 1500, a: 0.04, d: 0.42, gain: 0.26, lp: 3200, vib: 40 }); noise(c, out, t, { dur: 0.4, gain: 0.18, type: 'highpass', f0: 2200, off: o.r() }); return 0.5; },
  gaunt_lunge(c, out, t, o) { noise(c, out, t, { dur: 0.32, a: 0.02, gain: 0.5, type: 'bandpass', f0: 1500, f1: 450, q: 0.8, off: o.r() }); tone(c, out, t, { f0: 400, f1: 150, d: 0.25, gain: 0.15 }); return 0.4; },
  creak(c, out, t, o) { tone(c, out, t, { type: 'sawtooth', f0: 58 + o.r() * 20, f1: 84 + o.r() * 30, a: 0.15, d: 0.9, gain: 0.07, lp: 300, vib: 3 }); return 1.2; },
  heartbeat(c, out, t) { thump(c, out, t, 66, 44, 0.14, 0.7); thump(c, out, t + 0.19, 58, 40, 0.16, 0.5); return 0.4; },
  radio(c, out, t, o) {                                         // a transmission: squelch, two beeps, a little static
    noise(c, out, t, { dur: 0.16, gain: 0.32, type: 'bandpass', f0: 2400, q: 0.9, off: o.r() });
    tone(c, out, t + 0.14, { type: 'square', f0: 1046, d: 0.07, gain: 0.05, lp: 2600 }); tone(c, out, t + 0.24, { type: 'square', f0: 784, d: 0.09, gain: 0.05, lp: 2600 });
    noise(c, out, t + 0.36, { dur: 0.22, a: 0.02, gain: 0.08, type: 'highpass', f0: 3200, off: o.r() });
    return 0.6;
  },
  // --- ui / meta ---
  ui_click(c, out, t) { tone(c, out, t, { type: 'square', f0: 920, d: 0.03, gain: 0.09 }); tone(c, out, t + 0.02, { f0: 1380, d: 0.06, gain: 0.09 }); return 0.12; },
  level_complete(c, out, t) { [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => bell(c, out, t + i * 0.16, f, { decay: 1.8, gain: 0.2, ratio: 2, index: 0.8 })); return 3.0; },
};

// ------------------------------------------------------------------ helpers shared with the engine
/** deterministic [0,1) source for offline renders */
/** level a recipe down by `k` (a gain stage in front of its output): the first offline render of the PT-013 sounds measured peaks above full scale for these five (audio QA: arc_bolt 1.03, melee_hit_heavy 1.13, parry 1.28, guard_break 1.05, pin_thunk 1.16), so they are scaled to peak near 0.9 like the rest; melee_hit peaked at 0.994, too close, and is scaled as well */
const scaled = (fn, k) => (c, out, t, o) => { const g = c.createGain(); g.gain.value = k; g.connect(out); return fn(c, g, t, o); };
SFX.arc_bolt = scaled(SFX.arc_bolt, 0.85); SFX.melee_hit = scaled(SFX.melee_hit, 0.88); SFX.melee_hit_heavy = scaled(SFX.melee_hit_heavy, 0.78); SFX.parry = scaled(SFX.parry, 0.68); SFX.guard_break = scaled(SFX.guard_break, 0.84); SFX.pin_thunk = scaled(SFX.pin_thunk, 0.76);
export function seededRandom(seed = 1) { let s = seed >>> 0; return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; }; }

/** Render one recipe on an OfflineAudioContext (browser only). Returns {rate, samples:Float32Array, duration}. */
export async function renderSfx(id, { seconds = 3, rate = 44100, seed = 7 } = {}) {
  const ctx = new OfflineAudioContext(1, Math.ceil(seconds * rate), rate);
  const bus = ctx.createGain(); bus.gain.value = 0.9; bus.connect(ctx.destination);
  const duration = SFX[id](ctx, bus, 0.02, { r: seededRandom(seed) });
  const buf = await ctx.startRendering();
  return { rate, samples: buf.getChannelData(0), duration };
}
