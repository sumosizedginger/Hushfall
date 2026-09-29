// HUSHFALL runtime: state machine (title / playing / paused / dying / ending) around the headless engine + Three.js view.
import * as THREE from 'three';
import { loadAll, titleArtUrl } from '../render/textures.js';
import { GameView } from '../render/view.js';
import { createWorld, step, drainEvents } from '../engine/world.js';
import { InputState } from '../engine/input.js';
import { FixedLoop } from '../engine/loop.js';
import { parseMap } from '../engine/mapformat.js';
import { makeSave, loadWorld, SaveStore } from '../engine/save.js';
import { TICK, VIEW } from '../engine/defs.js';
import { UI } from './ui.js';
import { AudioEngine } from '../audio/engine.js';
import { automapModel } from '../engine/automap.js';
import { drawAutomap } from './automap.js';
import { loadSettings, saveSettings } from './settings.js';
import { applyRebind, defaultBindings, prettyCode } from './bindings.js';

const canvas = document.getElementById('c'), mapCanvas = document.getElementById('automap');
const MAPS = {};
for (const src of Object.values(import.meta.glob('../../maps/*.json', { eager: true, import: 'default' }))) { const m = parseMap(src); MAPS[m.id] = m; }   // validates at load

const memory = new Map();
const storage = (() => { try { localStorage.setItem('_hf', '1'); localStorage.removeItem('_hf'); return localStorage; } catch { return { getItem: (k) => memory.get(k) ?? null, setItem: (k, v) => memory.set(k, v), removeItem: (k) => memory.delete(k) }; } })();
const store = new SaveStore(storage);
const { settings, notes: settingsNotes } = loadSettings(storage);

const audio = new AudioEngine(settings);
// browsers keep audio locked until a gesture: every real key/pointer press tries to unlock (idempotent, cheap once running)
for (const evt of ['pointerdown', 'keydown']) addEventListener(evt, () => audio.unlock(), { capture: true });
document.addEventListener('click', (e) => { if (e.target.closest?.('button')) audio.play('ui_click'); });

const renderer = new THREE.WebGLRenderer({ canvas, antialias: false });
renderer.setPixelRatio(1); renderer.autoClear = false;
const tex = await loadAll();
document.getElementById('title-art').src = titleArtUrl();

const g = {
  mode: 'title', world: null, view: null, loop: null, mapId: 'C1E1M01', difficulty: 'normal', seed: 1, timer: 0,
  input: new InputState(settings.bindings), settings, locked: false, lockFailed: false,
  events: [],                       // every event this session (dev/test hook reads and clears it)
  capture: null, mapOpen: false, manual: false, frameTimes: [], last: performance.now(),
};

const ui = new UI({
  newGame: (d) => startLevel({ difficulty: d, seed: 1 + Math.floor(Math.random() * 1e6) }),
  continueGame: () => { const r = loadFirstSave(); if (!r) ui.show('title', { canContinue: canContinue(), note: 'No usable save.' }); },
  resume: () => resume(), quickSave: () => quickSave(), quickLoad: () => quickLoad(),
  restartLevel: () => startLevel({ mapId: g.mapId, difficulty: g.difficulty, seed: g.seed, carry: g.world?.levelStart ?? null }),      // the world remembers what the level began with (also after a load)
  quitToTitle: () => quitToTitle(),
  beginRebind: (action, slot) => { g.capture = { action, slot }; ui.syncBindings(g.input.bindings, g.capture, 'Press a key, mouse button or wheel. Esc cancels.'); },
  resetBindings: () => { g.capture = null; commitBindings(defaultBindings(), 'Controls reset to default.'); },
  setSetting: (k, v) => { settings[k] = v; saveSettings(storage, settings); if (k === 'aimToggle') g.input.setToggle('aim', v); if (k === 'sprintToggle') g.input.setToggle('sprint', v); if (k === 'masterVolume' || k === 'sfxVolume' || k === 'musicVolume') audio.applySettings(settings); if (k === 'internalWidth') resize(); if ((k === 'outline' || k === 'paint' || k === 'fov' || k === 'brightness') && g.view) g.view.setLook(settings); },
});
g.input.setToggle('aim', settings.aimToggle); g.input.setToggle('sprint', settings.sprintToggle);
function commitBindings(b, note = '') { g.input.setBindings(b); settings.bindings = JSON.parse(JSON.stringify(g.input.bindings)); saveSettings(storage, settings); ui.syncBindings(settings.bindings, null, note); }
/** a device event while the remap screen is waiting: assign it (or cancel) */
function captureCode(code) {
  const { action, slot } = g.capture; g.capture = null;
  if (code === 'Escape') return ui.syncBindings(g.input.bindings, null, 'Cancelled.');
  const r = applyRebind(g.input.bindings, action, slot, code);
  if (!r.ok) return ui.syncBindings(g.input.bindings, null, r.reason + '.');
  commitBindings(r.bindings, r.displaced.length ? `${prettyCode(code)} taken from: ${r.displaced.join(', ')}.` : `${prettyCode(code)} assigned.`);
}
ui.syncSettings(settings); ui.syncBindings(settings.bindings);

const canContinue = () => ['quick', 'auto'].some((s) => store.read(s).ok);
function loadFirstSave() {
  for (const slot of ['quick', 'auto']) { const r = store.read(slot); if (r.ok) return applySave(r.save, slot); }
  return null;
}
function applySave(save, slot) {
  const r = loadWorld(save, (id) => MAPS[id]);
  if (!r.ok) { ui.show(g.mode === 'paused' ? 'pause' : 'title', { canContinue: canContinue(), note: `Could not load ${slot}: ${r.reason} ${r.detail}` }); return false; }
  startLevel({ world: r.world, note: r.degraded }); return true;
}

function resize() { if (g.view) g.view.setSize(innerWidth, innerHeight, settings.internalWidth); else renderer.setSize(innerWidth, innerHeight, false); }
addEventListener('resize', resize);

function startLevel({ mapId = g.mapId, difficulty = g.difficulty, seed = g.seed, carry = null, world = null, note = '' } = {}) {
  g.view?.dispose();
  const map = MAPS[world ? world.mapId : mapId];
  g.world = world || createWorld(map, { seed, difficulty, carry });
  g.mapId = g.world.mapId; g.difficulty = g.world.difficulty; g.seed = g.world.seed;
  g.view = new GameView(renderer, tex, map, g.world); resize(); g.view.setLook(settings);
  g.loop = new FixedLoop(stepOnce); g.input.releaseAll(); g.timer = 0; g.mapOpen = false;
  if (!world) store.write('auto', makeSave(g.world, 'level-start', { now: Date.now() }));
  g.mode = 'playing'; ui.show(null); ui.clearOverlays(); if (note) ui.toast(note);
  if (!world) ui.card(map.intro);                                            // title card only on a fresh run, not when resuming a save
  audio.newLevel();
  requestLock();
}
function quitToTitle() {
  g.mapOpen = false; g.view?.dispose(); g.view = null; g.world = null; g.mode = 'title'; document.exitPointerLock?.();
  renderer.setRenderTarget(null); renderer.clear(); audio.newLevel(); ui.show('title', { canContinue: canContinue() });
}
function pause() { if (g.mode !== 'playing') return; audio.setMuffled(true); g.mode = 'paused'; g.input.releaseAll(); document.exitPointerLock?.(); ui.show('pause'); }
function resume() { if (g.mode !== 'paused') return; audio.setMuffled(false); g.mode = 'playing'; ui.show(null); requestLock(); }
function quickSave() { if (!g.world) return; try { store.write('quick', makeSave(g.world, 'mid-level', { now: Date.now() })); ui.show('pause', { note: 'Saved.' }); } catch (e) { ui.show('pause', { note: 'Save failed: ' + e.message }); } }
function quickLoad() { const r = store.read('quick'); if (!r.ok) return ui.show(g.mode === 'paused' ? 'pause' : g.mode === 'dying' || g.mode === 'dead' ? 'dead' : 'title', { note: `No quick save (${r.reason}).`, canContinue: canContinue() }); applySave(r.save, 'quick'); }
function requestLock() { if (g.lockFailed) return; try { const p = canvas.requestPointerLock?.(); p?.catch?.(() => { g.lockFailed = true; ui.setPointerHint('pointer lock unavailable: drag to look'); }); } catch { g.lockFailed = true; } }

/** One fixed simulation tick. Everything (keyboard, mouse, bot, test hook) reaches the sim through g.input. */
function stepOnce() {
  if (g.mode !== 'playing') return;
  const cmd = g.input.sample();
  if (cmd.pause) { pause(); return; }
  if (cmd.map) g.mapOpen = !g.mapOpen;                                            // UI-only toggle: the sim keeps running under the map
  g.view.beforeStep(g.world); step(g.world, cmd);
  const ev = drainEvents(g.world); if (ev.length) { g.view.handleEvents(ev); ui.events(ev); audio.handleEvents(ev); g.events.push(...ev); }
  if (g.world.status === 'dead') { g.mode = 'dying'; g.timer = 1.4; g.input.releaseAll(); document.exitPointerLock?.(); }
  else if (g.world.status === 'complete') { g.mode = 'ending'; g.timer = 0.9; g.input.releaseAll(); document.exitPointerLock?.(); }
}

// ---- devices ---------------------------------------------------------------
document.addEventListener('pointerlockchange', () => { g.locked = document.pointerLockElement === canvas; if (!g.locked && g.mode === 'playing') pause(); });
document.addEventListener('pointerlockerror', () => { g.lockFailed = true; ui.setPointerHint('pointer lock unavailable: drag to look'); });
let dragging = false;
canvas.addEventListener('mousedown', (e) => {
  if (g.mode !== 'playing') return;
  if (!g.locked && !g.lockFailed) { requestLock(); return; }
  dragging = true; g.input.keyDown('Mouse' + e.button);
});
addEventListener('mouseup', (e) => { dragging = false; g.input.keyUp('Mouse' + e.button); });
document.addEventListener('mousedown', (e) => { if (g.capture && !e.target.closest?.('button.bind')) { e.preventDefault(); captureCode('Mouse' + e.button); } }, true);
document.addEventListener('wheel', (e) => { if (g.capture) { e.preventDefault(); captureCode(e.deltaY < 0 ? 'WheelUp' : 'WheelDown'); } }, { passive: false, capture: true });
canvas.addEventListener('wheel', (e) => { if (g.mode !== 'playing') return; const code = e.deltaY < 0 ? 'WheelUp' : 'WheelDown'; g.input.keyDown(code); g.input.keyUp(code); e.preventDefault(); }, { passive: false });   // wheel = weapon cycle (tap-latched)
canvas.addEventListener('contextmenu', (e) => e.preventDefault());                       // right button is Aim
// sensitivity follows the zoom: at full ADS the same hand movement turns the view by the same on-screen amount
const adsSensScale = () => { const a = g.world?.player.ads ?? 0, r = Math.tan(VIEW.adsFov * Math.PI / 360) / Math.tan(VIEW.fov * Math.PI / 360); return 1 + (r - 1) * a; };           // the zoom RATIO is constant, so this holds at any base FOV
addEventListener('mousemove', (e) => { if (g.mode === 'playing' && (g.locked || (g.lockFailed && dragging))) g.input.addMouse(e.movementX, e.movementY, 0.0022 * settings.sensitivity * adsSensScale()); });
addEventListener('keydown', (e) => {
  if (g.capture) { e.preventDefault(); e.stopPropagation(); if (!e.repeat) captureCode(e.code); return; }
  if (e.repeat) return;
  if (g.mode === 'paused' && (e.code === 'Escape' || e.code === 'KeyP')) { resume(); return; }
  if (g.mode === 'dead' && (e.code === 'Enter' || e.code === 'Space')) { ui.h.restartLevel(); return; }
  if (g.mode === 'complete' && (e.code === 'Enter' || e.code === 'Space')) { quitToTitle(); return; }
  if (g.mode === 'playing') { g.input.keyDown(e.code); if (g.input.byCode.has(e.code)) e.preventDefault(); }
});
addEventListener('keyup', (e) => g.input.keyUp(e.code));
addEventListener('blur', () => pause());
document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });

// ---- frame loop --------------------------------------------------------------
function frame(now) {
  const dt = Math.min(0.1, (now - g.last) / 1000); g.last = now;
  g.frameTimes.push(dt * 1000); if (g.frameTimes.length > 900) g.frameTimes.shift();
  let alpha = 0;
  if (g.mode === 'playing') alpha = g.manual ? 1 : g.loop.advance(dt).alpha;            // g.manual: the dev test hook owns the clock
  else if (g.mode === 'dying') { g.timer -= dt; if (g.timer <= 0) { g.mode = 'dead'; ui.show('dead'); } }
  else if (g.mode === 'ending') { g.timer -= dt; if (g.timer <= 0) { g.mode = 'complete'; ui.show('complete', { stats: g.world.endStats, par: MAPS[g.mapId].par?.time, difficulty: g.difficulty, mapName: MAPS[g.mapId].name, outro: MAPS[g.mapId].outro }); } }
  audio.update(g.mode === 'playing' || g.mode === 'dying' ? g.world : null, dt, MAPS[g.mapId]);
  const showMap = g.mapOpen && g.world && (g.mode === 'playing' || g.mode === 'dying'); mapCanvas.classList.toggle('hidden', !showMap); if (showMap) drawAutomap(mapCanvas, automapModel(g.world));
  if (g.view && g.world) { g.view.render(g.world, g.mode === 'playing' ? alpha : 1, dt); ui.hud(g.world, g.mode !== 'title'); } else ui.hud(null, false);
  requestAnimationFrame(frame);
}
resize(); ui.show('title', { canContinue: canContinue(), note: settingsNotes.join(' ') });
requestAnimationFrame(frame);

if (import.meta.env.DEV) import('./testhook.js').then((m) => m.installTestHook({ g, MAPS, audio, store, startLevel, stepOnce, pause, resume, quickSave, quickLoad, renderer, ui, TICK }));
