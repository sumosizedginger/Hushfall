// HUSHFALL runtime: state machine (title / playing / paused / dying / ending) around the headless engine + Three.js view.
import * as THREE from 'three';
import { loadAll, titleArtUrl } from '../render/textures.js';
import { GameView } from '../render/view.js';
import { createWorld, step, drainEvents, carryOver } from '../engine/world.js';
import { InputState } from '../engine/input.js';
import { FixedLoop } from '../engine/loop.js';
import { parseMap } from '../engine/mapformat.js';
import { makeSave, loadWorld, SaveStore } from '../engine/save.js';
import { TICK, VIEW } from '../engine/defs.js';
import { UI } from './ui.js';
import { loadSettings, saveSettings } from './settings.js';

const canvas = document.getElementById('c');
const MAPS = {};
for (const src of Object.values(import.meta.glob('../../maps/*.json', { eager: true, import: 'default' }))) { const m = parseMap(src); MAPS[m.id] = m; }   // validates at load

const memory = new Map();
const storage = (() => { try { localStorage.setItem('_hf', '1'); localStorage.removeItem('_hf'); return localStorage; } catch { return { getItem: (k) => memory.get(k) ?? null, setItem: (k, v) => memory.set(k, v), removeItem: (k) => memory.delete(k) }; } })();
const store = new SaveStore(storage);
const { settings, notes: settingsNotes } = loadSettings(storage);

const renderer = new THREE.WebGLRenderer({ canvas, antialias: false });
renderer.setPixelRatio(1); renderer.autoClear = false;
const tex = await loadAll();
document.getElementById('title-art').src = titleArtUrl();

const g = {
  mode: 'title', world: null, view: null, loop: null, mapId: 'C1E1M01', difficulty: 'normal', seed: 1, startCarry: null, timer: 0,
  input: new InputState(settings.bindings), settings, locked: false, lockFailed: false,
  events: [],                       // every event this session (dev/test hook reads and clears it)
  manual: false, frameTimes: [], last: performance.now(),
};

const ui = new UI({
  newGame: (d) => startLevel({ difficulty: d, seed: 1 + Math.floor(Math.random() * 1e6) }),
  continueGame: () => { const r = loadFirstSave(); if (!r) ui.show('title', { canContinue: canContinue(), note: 'No usable save.' }); },
  resume: () => resume(), quickSave: () => quickSave(), quickLoad: () => quickLoad(),
  restartLevel: () => startLevel({ mapId: g.mapId, difficulty: g.difficulty, seed: g.seed, carry: g.startCarry }),
  quitToTitle: () => quitToTitle(),
  setSetting: (k, v) => { settings[k] = v; saveSettings(storage, settings); if (k === 'aimToggle') g.input.setToggle('aim', v); if (k === 'sprintToggle') g.input.setToggle('sprint', v); if (k === 'internalWidth') resize(); if ((k === 'outline' || k === 'paint') && g.view) g.view.setLook(settings); },
});
g.input.setToggle('aim', settings.aimToggle); g.input.setToggle('sprint', settings.sprintToggle);
ui.syncSettings(settings); ui.syncBindings(settings.bindings);

const canContinue = () => ['quick', 'auto'].some((s) => store.read(s).ok);
function loadFirstSave() {
  for (const slot of ['quick', 'auto']) { const r = store.read(slot); if (r.ok) return applySave(r.save, slot); }
  return null;
}
function applySave(save, slot) {
  const r = loadWorld(save, (id) => MAPS[id]);
  if (!r.ok) { ui.show(g.mode === 'paused' ? 'pause' : 'title', { canContinue: canContinue(), note: `Could not load ${slot}: ${r.reason} ${r.detail}` }); return false; }
  startLevel({ world: r.world, carry: save.carry, note: r.degraded }); return true;
}

function resize() { if (g.view) g.view.setSize(innerWidth, innerHeight, settings.internalWidth); else renderer.setSize(innerWidth, innerHeight, false); }
addEventListener('resize', resize);

function startLevel({ mapId = g.mapId, difficulty = g.difficulty, seed = g.seed, carry = null, world = null, note = '' } = {}) {
  g.view?.dispose();
  const map = MAPS[world ? world.mapId : mapId];
  g.world = world || createWorld(map, { seed, difficulty, carry });
  g.mapId = g.world.mapId; g.difficulty = g.world.difficulty; g.seed = g.world.seed;
  g.startCarry = carry || (world ? g.startCarry : carryOver(g.world));
  g.view = new GameView(renderer, tex, map, g.world); resize(); g.view.setLook(settings);
  g.loop = new FixedLoop(stepOnce); g.input.releaseAll(); g.timer = 0;
  if (!world) store.write('auto', makeSave(g.world, 'level-start', { now: Date.now() }));
  g.mode = 'playing'; ui.show(null); if (note) ui.toast(note);
  requestLock();
}
function quitToTitle() {
  g.view?.dispose(); g.view = null; g.world = null; g.mode = 'title'; document.exitPointerLock?.();
  renderer.setRenderTarget(null); renderer.clear(); ui.show('title', { canContinue: canContinue() });
}
function pause() { if (g.mode !== 'playing') return; g.mode = 'paused'; g.input.releaseAll(); document.exitPointerLock?.(); ui.show('pause'); }
function resume() { if (g.mode !== 'paused') return; g.mode = 'playing'; ui.show(null); requestLock(); }
function quickSave() { if (!g.world) return; try { store.write('quick', makeSave(g.world, 'mid-level', { now: Date.now() })); ui.show('pause', { note: 'Saved.' }); } catch (e) { ui.show('pause', { note: 'Save failed: ' + e.message }); } }
function quickLoad() { const r = store.read('quick'); if (!r.ok) return ui.show(g.mode === 'paused' ? 'pause' : g.mode === 'dying' || g.mode === 'dead' ? 'dead' : 'title', { note: `No quick save (${r.reason}).`, canContinue: canContinue() }); applySave(r.save, 'quick'); }
function requestLock() { if (g.lockFailed) return; try { const p = canvas.requestPointerLock?.(); p?.catch?.(() => { g.lockFailed = true; ui.setPointerHint('pointer lock unavailable: drag to look'); }); } catch { g.lockFailed = true; } }

/** One fixed simulation tick. Everything (keyboard, mouse, bot, test hook) reaches the sim through g.input. */
function stepOnce() {
  if (g.mode !== 'playing') return;
  const cmd = g.input.sample();
  if (cmd.pause) { pause(); return; }
  g.view.beforeStep(g.world); step(g.world, cmd);
  const ev = drainEvents(g.world); if (ev.length) { g.view.handleEvents(ev); ui.events(ev); g.events.push(...ev); }
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
canvas.addEventListener('contextmenu', (e) => e.preventDefault());                       // right button is Aim
// sensitivity follows the zoom: at full ADS the same hand movement turns the view by the same on-screen amount
const adsSensScale = () => { const a = g.world?.player.ads ?? 0, r = Math.tan(VIEW.adsFov * Math.PI / 360) / Math.tan(VIEW.fov * Math.PI / 360); return 1 + (r - 1) * a; };
addEventListener('mousemove', (e) => { if (g.mode === 'playing' && (g.locked || (g.lockFailed && dragging))) g.input.addMouse(e.movementX, e.movementY, 0.0022 * settings.sensitivity * adsSensScale()); });
addEventListener('keydown', (e) => {
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
  else if (g.mode === 'ending') { g.timer -= dt; if (g.timer <= 0) { g.mode = 'complete'; ui.show('complete', { stats: g.world.endStats, par: MAPS[g.mapId].par?.time, difficulty: g.difficulty, mapName: MAPS[g.mapId].name }); } }
  if (g.view && g.world) { g.view.render(g.world, g.mode === 'playing' ? alpha : 1, dt); ui.hud(g.world, g.mode !== 'title'); } else ui.hud(null, false);
  requestAnimationFrame(frame);
}
resize(); ui.show('title', { canContinue: canContinue(), note: settingsNotes.join(' ') });
requestAnimationFrame(frame);

if (import.meta.env.DEV) import('./testhook.js').then((m) => m.installTestHook({ g, MAPS, store, startLevel, stepOnce, pause, resume, quickSave, quickLoad, renderer, ui, TICK }));
