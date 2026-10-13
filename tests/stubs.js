// Stand-ins that let a node test run the REAL frame loop of the game (the one in src/game/main.js) with no browser and no GPU: a renderer that draws nothing, textures that are only objects, a DOM whose elements remember what is written to them, a canvas
// whose 2D context counts its calls, and an AudioEngine whose context is "running". Written after the owner's black screen of 2026-10-13 (a per-frame function nobody had executed: headless Chrome never reached it) and for the rule that no browser job runs
// without a fresh yes: what a node test CAN execute, it executes. What it cannot is how anything LOOKS.
import * as THREE from 'three';
import { AudioEngine } from '../src/audio/engine.js';

class FakeTexture extends THREE.Texture { constructor() { super(); this.image = { width: 64, height: 64 }; } toJSON() { return { uuid: this.uuid, name: this.name }; } clone() { const t = new FakeTexture(); t.repeat.copy(this.repeat); return t; } }
/** every texture name is a plain texture object (created on first use) */
export const texProxy = () => new Proxy({}, { get: (o, k) => (typeof k === 'string' ? (o[k] ??= new FakeTexture()) : undefined) });
/** a renderer that does nothing and never says no */
export const stubRenderer = () => { const noop = () => {}; return new Proxy({}, { get: (o, k) => (k in o ? o[k] : k === 'capabilities' ? { maxAnisotropy: 1 } : k === 'domElement' ? { width: 640, height: 360 } : k === 'info' ? { render: {}, memory: {} } : k === 'getSize' ? (v) => v?.set?.(640, 360) : k === 'getPixelRatio' ? () => 1 : k === 'getRenderTarget' ? () => null : noop), set: (o, k, v) => { o[k] = v; return true; } }); };

/** a DOM in which every id is one element that remembers its text, classes and styles; any other call on an element is a no-op that returns an element. `globalThis.document` is set; call the returned `restore()` when done. */
export function standInDom() {
  const els = new Map(); let make;
  const wrap = (el) => new Proxy(el, { get: (o, k) => (k in o ? o[k] : typeof k === 'symbol' || k === 'then' ? undefined : (...a) => wrap(make('x'))), set: (o, k, v) => { o[k] = v; return true; } });
  make = (id) => { const classes = new Set(); const el = { id, textContent: '', innerHTML: '', value: '', checked: false, disabled: false, hidden: false, style: {}, dataset: {}, classes, children: [],
    classList: { toggle(c, on) { const want = on === undefined ? !classes.has(c) : !!on; want ? classes.add(c) : classes.delete(c); return want; }, add(...c) { c.forEach((x) => classes.add(x)); }, remove(...c) { c.forEach((x) => classes.delete(x)); }, contains: (c) => classes.has(c) },
    appendChild(c) { el.children.push(c); return c; }, append(...c) { el.children.push(...c); }, replaceChildren() { el.children.length = 0; }, querySelector: () => null, querySelectorAll: () => [], closest: () => null, addEventListener() {}, removeEventListener() {}, getContext: () => canvasContext() };
    Object.defineProperty(el, 'parentElement', { get() { return (el._p ??= wrap(make(id + '^'))); } }); Object.defineProperty(el, 'firstElementChild', { get() { return (el._c ??= wrap(make(id + '>'))); } }); return el; };
  const prev = globalThis.document, doc = { getElementById: (id) => { if (!els.has(id)) els.set(id, wrap(make(id))); return els.get(id); }, querySelectorAll: () => [], querySelector: () => null, body: wrap(make('body')), createElement: () => wrap(make('x')), addEventListener() {} };
  globalThis.document = doc; return { els, restore: () => { if (prev === undefined) delete globalThis.document; else globalThis.document = prev; } };
}
/** a 2D canvas context that counts the calls made on it */
export function canvasContext() { const calls = new Map(); return new Proxy({}, { get: (o, k) => (k === 'calls' ? calls : k in o ? o[k] : (...a) => { calls.set(k, (calls.get(k) ?? 0) + 1); }), set: (o, k, v) => { o[k] = v; return true; } }); }

/** an AudioEngine whose context is "running" (what a real click leaves behind), with `play` recording the ids it was asked for into `played` */
export function runningAudio(played = []) {
  const a = new AudioEngine({ sfxVolume: 1, musicVolume: 1 }), params = new Proxy({}, { get: () => ({ value: 0, setTargetAtTime() {} }) });
  a.ctx = { state: 'running', currentTime: 0, listener: { positionX: { value: 0 }, positionY: { value: 0 }, positionZ: { value: 0 }, forwardX: { value: 0 }, forwardY: { value: 0 }, forwardZ: { value: 0 }, upX: { value: 0 }, upY: { value: 0 }, upZ: { value: 0 }, setPosition() {}, setOrientation() {} }, destination: {}, createGain: () => ({ gain: params.gain, connect() {} }) };
  const bus = () => ({ gain: { value: 0, setTargetAtTime() {}, setValueAtTime() {}, linearRampToValueAtTime() {} }, frequency: { value: 0, setTargetAtTime() {} }, connect() {} });
  a.master = bus(); a.sfxBus = bus(); a.ambBus = bus(); a.musicBus = bus(); a.musicLP = bus(); a.reverbWet = bus(); a.reverbSend = bus();
  a.music = { tick() {}, setIntensity() {} }; a.ambience = { update() {} }; a.settings = { sfxVolume: 1, musicVolume: 1, masterVolume: 1 }; a.play = (id) => { played.push(id); return true; };
  return a;
}
