// THE CHAINSAW'S VOICE (PT-061, S1 of the Director's Plan; the owner, 2026-10-14: "the chainsaw's sound ... never heard"): the saw used to be a retriggered one-shot every 0.4 s with no engine under it. This is a SUSTAINED voice: a two-stroke engine made of two slightly detuned
// sawtooth oscillators and a square sub through a low-pass, a chain rattle (filtered noise) and a stroke flutter (an LFO on the gain: a putter at idle that closes into a buzz as the revs rise), driven every frame from the saw's own state (`p.saw`: spin 0..1, heat 0..1, stall, eng = it is cutting something).
//   idle putter at low spin -> a climbing buzz as it revs -> a deeper, louder, rougher bite while it is IN something -> sputter and silence on a stall (a cough, a few uneven strokes). Pure WebAudio, no samples; `makeSawVoice(ctx, out)` runs on any BaseAudioContext (the QA render uses an offline one).
const clamp = (x, a, b) => Math.min(b, Math.max(a, x)), lerp = (a, b, t) => a + (b - a) * t;
export function makeSawVoice(c, out) {
  const master = c.createGain(); master.gain.value = 0; const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 600; lp.Q.value = 1.2; master.connect(out); lp.connect(master);
  const mk = (type, f, g) => { const o = c.createOscillator(); o.type = type; o.frequency.value = f; const gn = c.createGain(); gn.gain.value = g; o.connect(gn); gn.connect(lp); o.start(); return { o, gn }; };
  const a = mk('sawtooth', 60, 0.5), b = mk('sawtooth', 61.5, 0.4), sub = mk('square', 30, 0.25);
  const flutter = c.createGain(); flutter.gain.value = 1; const lfo = c.createOscillator(); lfo.type = 'sine'; lfo.frequency.value = 11; const lfoDepth = c.createGain(); lfoDepth.gain.value = 0; lfo.connect(lfoDepth); lfoDepth.connect(flutter.gain); lfo.start();
  lp.disconnect(master); lp.connect(flutter); flutter.connect(master);
  const nz = c.createBufferSource(); const len = Math.floor(c.sampleRate * 1.5), buf = c.createBuffer(1, len, c.sampleRate), d = buf.getChannelData(0); let s = 0x2468ace; for (let i = 0; i < len; i++) { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; d[i] = (s / 4294967296) * 2 - 1; }
  nz.buffer = buf; nz.loop = true; const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1100; bp.Q.value = 0.9; const ng = c.createGain(); ng.gain.value = 0; nz.connect(bp); bp.connect(ng); ng.connect(master); nz.start();
  let sputter = 0;
  /** state: { spin 0..1, load 0..1 (it is cutting), stall 0..1 (the saw is dead), t (clock seconds) }; `k` the smoothing time constant */
  function set({ spin = 0, load = 0, stall = 0, t = 0, at }, k = 0.06) {
    const now = at ?? c.currentTime, live = spin > 0.02 && !stall;
    const hz = lerp(34, 88, spin) * (1 - 0.16 * load) * (stall ? 0.7 : 1), rough = 0.4 + 0.6 * load;
    a.o.frequency.setTargetAtTime(hz, now, k); b.o.frequency.setTargetAtTime(hz * (1.022 + 0.01 * load), now, k); sub.o.frequency.setTargetAtTime(hz * 0.5, now, k);
    lp.frequency.setTargetAtTime(lerp(380, 2400, spin) + 700 * load, now, k);
    sputter = stall ? (Math.sin(t * 23) > -0.2 ? 1 : 0.15) * (0.4 + 0.3 * Math.sin(t * 7)) : 1;                                      // a stall: a few uneven coughs
    master.gain.setTargetAtTime(live || stall ? (0.05 + 0.13 * spin) * (1 + 0.28 * load) * (stall ? 0.7 * sputter : 1) : 0, now, live ? k : 0.12);
    lfo.frequency.setTargetAtTime(lerp(8, 24, spin), now, k); lfoDepth.gain.setTargetAtTime(live ? lerp(0.55, 0.12, spin) * rough : 0.3, now, k);
    ng.gain.setTargetAtTime(live ? (0.02 + 0.07 * spin + 0.06 * load) : 0, now, k); bp.frequency.setTargetAtTime(900 + 900 * spin + 500 * load, now, k);
  }
  /** fade out and stop. `at` (a scheduled stop, as the offline QA render makes) leaves the graph in place until then; a live stop (no `at`) lets it go after the fade (PT-064: the first version disconnected the master at once, which silenced a scheduled stop in an offline render) */
  function stop(at) { const now = at ?? c.currentTime; master.gain.setTargetAtTime(0, now, 0.05); for (const n of [a.o, b.o, sub.o, lfo, nz]) { try { n.stop(now + 0.4); } catch { /* already stopped */ } } if (at === undefined) setTimeout(() => { try { master.disconnect(); } catch { /* ok */ } }, 600); }
  return { set, stop, master };
}
/** the voice's state from the saw record and the weapon in hand (null = nothing is running) */
export const sawState = (p) => (p.weapon === 'chainsaw' && p.saw && (p.saw.spin > 0 || p.saw.stall > 0) ? { spin: clamp(p.saw.spin, 0, 1), load: p.saw.eng ? 1 : 0, stall: p.saw.stall > 0 ? 1 : 0 } : null);
