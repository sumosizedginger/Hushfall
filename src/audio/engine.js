// AudioEngine: owns the WebAudio graph and turns sim state + drained events into sound. It only READS the world.
// Browsers keep an AudioContext suspended until a user gesture: unlock() is called from real input events and is idempotent.
import { SFX, seededRandom } from './synth.js';
import { soundsForEvent } from './events.js';
import { Music } from './music.js';
import { Ambience } from './ambience.js';
import { PLAYER } from '../engine/defs.js';

const clamp = (x, a, b) => Math.min(b, Math.max(a, x));

export class AudioEngine {
  constructor(settings) {
    this.settings = settings; this.ctx = null; this.unsupported = false; this.rand = seededRandom(20260929);
    this.stats = { played: 0, dropped: 0, log: [] };
    this.tension = 0; this.muffled = false; this.dead = false; this.lastStep = 0; this.nextCreak = 6; this.nextBeat = 0; this.bellTimers = new Map(); this.clock = 0;
  }
  /** 'locked' (no context yet) | 'suspended' | 'running' | 'closed' | 'unsupported' */
  get state() { return this.ctx ? this.ctx.state : this.unsupported ? 'unsupported' : 'locked'; }

  unlock() {
    if (!this.ctx) {
      const AC = globalThis.AudioContext || globalThis.webkitAudioContext;
      if (!AC) { this.unsupported = true; return false; }
      try { this.ctx = new AC({ latencyHint: 'interactive' }); } catch { this.unsupported = true; return false; }
      this._build();
    }
    if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
    return true;
  }

  _build() {
    const c = this.ctx;
    this.master = c.createGain();
    const comp = c.createDynamicsCompressor(); comp.threshold.value = -14; comp.knee.value = 10; comp.ratio.value = 5; comp.attack.value = 0.003; comp.release.value = 0.2;
    this.master.connect(comp); comp.connect(c.destination);
    this.sfxBus = c.createGain(); this.sfxBus.connect(this.master);
    this.musicLP = c.createBiquadFilter(); this.musicLP.type = 'lowpass'; this.musicLP.frequency.value = 18000; this.musicBus = c.createGain(); this.musicLP.connect(this.musicBus); this.musicBus.connect(this.master);
    this.ambBus = c.createGain(); this.ambBus.connect(this.master);
    // shared reverb: a synthetic decaying-noise impulse; sends are tiny outdoors, larger indoors
    const len = Math.floor(c.sampleRate * 1.7), imp = c.createBuffer(2, len, c.sampleRate);
    for (let ch = 0; ch < 2; ch++) { const d = imp.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (this.rand() * 2 - 1) * Math.pow(1 - i / len, 3); }
    this.reverb = c.createConvolver(); this.reverb.buffer = imp; this.reverbSend = c.createGain(); this.reverbSend.gain.value = 0.25; this.reverbWet = c.createGain(); this.reverbWet.gain.value = 0.5;
    this.reverbSend.connect(this.reverb); this.reverb.connect(this.reverbWet); this.reverbWet.connect(this.master);
    this.music = new Music(c, this.musicLP); this.ambience = new Ambience(c, this.ambBus);
    this.applySettings(this.settings);
  }

  applySettings(s) {
    this.settings = s; if (!this.ctx) return;
    const t = this.ctx.currentTime, v = clamp(s.masterVolume, 0, 1);
    this.master.gain.setTargetAtTime(v * v * 1.1, t, 0.05);                     // squared: perceptually even slider
    this.sfxBus.gain.setTargetAtTime(clamp(s.sfxVolume, 0, 1), t, 0.05);
    this.ambBus.gain.setTargetAtTime(clamp(s.sfxVolume, 0, 1), t, 0.05);
    this.musicBus.gain.setTargetAtTime(clamp(s.musicVolume, 0, 1) * 0.55, t, 0.05);
  }

  /** play a recipe; pos = [x, z] world metres for positional playback */
  play(id, { pos, gain = 1, delay = 0 } = {}) {
    const fn = SFX[id]; if (!fn) return false;
    if (!this.ctx || this.ctx.state !== 'running') { this.stats.dropped++; return false; }
    const c = this.ctx, t = c.currentTime + 0.005 + delay;
    const g = c.createGain(); g.gain.value = gain; let head = g;
    if (pos) {
      const p = c.createPanner(); p.panningModel = 'equalpower'; p.distanceModel = 'inverse'; p.refDistance = 3; p.rolloffFactor = 1.1; p.maxDistance = 70;
      p.positionX.value = pos[0]; p.positionY.value = 1.2; p.positionZ.value = pos[1]; g.connect(p); head = p; p.connect(this.sfxBus); p.connect(this.reverbSend);
    } else { g.connect(this.sfxBus); g.connect(this.reverbSend); }
    const dur = fn(c, g, t, { r: this.rand });
    this.stats.played++; this.stats.log.push({ id, pos: pos ? [+pos[0].toFixed(1), +pos[1].toFixed(1)] : null, dur: +dur.toFixed(2) }); if (this.stats.log.length > 200) this.stats.log.shift();
    void head; return true;
  }

  handleEvents(events) {
    for (const e of events) {
      for (const s of soundsForEvent(e)) this.play(s.id, { pos: s.pos, gain: s.gain, delay: s.delay });
      if (e.type === 'player_died') { this.dead = true; this._applyMuffle(); }
    }
  }

  _applyMuffle() { if (!this.ctx) return; const t = this.ctx.currentTime, m = this.muffled || this.dead; this.musicLP.frequency.setTargetAtTime(m ? 420 : 18000, t, 0.25); this.ambBus.gain.setTargetAtTime(clamp(this.settings.sfxVolume, 0, 1) * (m ? 0.35 : 1), t, 0.25); }
  setMuffled(b) { this.muffled = b; this._applyMuffle(); }
  newLevel() { this.dead = false; this.tension = 0; this.bellTimers.clear(); this._applyMuffle(); }

  /** per-frame: listener, footsteps, ambience mix, tension-driven music, enemy bells, low-health heartbeat */
  update(world, dt, map) {
    if (!this.ctx || this.ctx.state !== 'running') return;
    this.clock += dt; const c = this.ctx, p = world?.player;
    this.music.tick();
    if (!p) { this.ambience.update({ interior: 1, hush: 0.3, level: 0.6 }); this.music.setIntensity(0); return; }
    const L = c.listener, fx = -Math.sin(p.yaw), fz = -Math.cos(p.yaw);
    if (L.positionX) { L.positionX.value = p.x; L.positionY.value = PLAYER.eye; L.positionZ.value = p.z; L.forwardX.value = fx; L.forwardY.value = 0; L.forwardZ.value = fz; L.upX.value = 0; L.upY.value = 1; L.upZ.value = 0; }
    else { L.setPosition(p.x, PLAYER.eye, p.z); L.setOrientation(fx, 0, fz, 0, 1, 0); }
    const interior = map.isInterior(p.x, p.z);
    this.reverbSend.gain.setTargetAtTime(interior ? 0.28 : 0.1, c.currentTime, 0.4);
    // footsteps: one per head-bob cycle, when actually moving
    const speed = Math.hypot(p.vx, p.vz), stepIdx = Math.floor(p.bob / Math.PI);
    if (stepIdx !== this.lastStep) { if (speed > 1.2 && world.status === 'playing') this.play(interior ? 'step_plank' : 'step_outdoor', { gain: p.sprinting ? 1.15 : 0.8 }); this.lastStep = stepIdx; }
    // nearest alien growth (pods) and awake enemies
    let hush = 0; for (const pr of map.props) if (pr.kind === 'pod') hush = Math.max(hush, clamp(1 - Math.hypot(pr.x - p.x, pr.z - p.z) / 9, 0, 1));
    let awake = 0;
    for (const e of world.enemies) {
      if (e.state !== 'chase') { this.bellTimers.delete(e.id); continue; }
      const d = Math.hypot(e.x - p.x, e.z - p.z); if (d < 26) awake += 1 - d / 40;
      let t = this.bellTimers.get(e.id); if (t === undefined) t = this.clock + this.rand() * 2;
      if (this.clock >= t && d < 30) { this.play('toll_soft', { pos: [e.x, e.z] }); t = this.clock + 2.5 + this.rand() * 3.5; }
      this.bellTimers.set(e.id, t);
    }
    const target = clamp(awake / 3, 0, 1);
    this.tension += (target - this.tension) * clamp(dt * (target > this.tension ? 1.2 : 0.35), 0, 1);      // rises fast, falls slowly
    this.music.setIntensity(world.status === 'playing' ? this.tension : 0);
    this.ambience.update({ interior: interior ? 1 : 0, hush, level: 1 });
    if (interior && this.clock > this.nextCreak) { this.play('creak', { pos: [p.x + (this.rand() - 0.5) * 20, p.z + (this.rand() - 0.5) * 20], gain: 0.8 }); this.nextCreak = this.clock + 9 + this.rand() * 14; }
    if (p.hp > 0 && p.hp < 30 && world.status === 'playing' && this.clock > this.nextBeat) { this.play('heartbeat', { gain: 0.9 * (1 - p.hp / 30) + 0.2 }); this.nextBeat = this.clock + 0.55 + p.hp / 60; }
  }

  dispose() { try { this.ctx?.close(); } catch { /* already closed */ } this.ctx = null; }
}
