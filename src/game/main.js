// HUSHFALL runtime: state machine (title / playing / paused / dying / ending) around the headless engine + Three.js view.
import * as THREE from 'three';
import { loadAll, titleArtUrl } from '../render/textures.js';
import { GameView } from '../render/view.js';
import { createWorld, step, drainEvents, useTarget, carryOver } from '../engine/world.js';
import CAMPAIGN from '../../CAMPAIGN_MANIFEST.json';
import { nextMapId, mapName } from './campaign.js';
import { InputState } from '../engine/input.js';
import { FixedLoop } from '../engine/loop.js';
import { parseMap } from '../engine/mapformat.js';
import { makeSave, loadWorld, SaveStore } from '../engine/save.js';
import { TICK, VIEW, KEYS, WEAPONS, MELEE_ORDER } from '../engine/defs.js';
import { newProgress, sanitizeProgress, earn, buy } from '../engine/progress.js';
import { UI } from './ui.js';
import { AudioEngine } from '../audio/engine.js';
import { automapModel } from '../engine/automap.js';
import { drawAutomap } from './automap.js';
import { loadSettings, saveSettings } from './settings.js';
import { applyRebind, defaultBindings, prettyCode, legendText } from './bindings.js';
import { RADIO_SOUND } from '../audio/events.js';
import { PadDevice, snapshotOf, padGlyph, padLegend, assistScale, rumbleFor, applyPadRebind, defaultPadBindings } from './gamepad.js';
import { Wheel, WHEEL_SLOTS, easeScale, timeScaleFor, wheelModel, wheelSvg } from './wheel.js';
import { pickNext, navDir, NavRepeat } from './padmenu.js';

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

/** a failure the player must be told about (instead of a title screen whose buttons do nothing) */
function fatal(msg) {
  for (const el of document.querySelectorAll('.screen')) el.classList.add('hidden');
  document.getElementById('error-text').textContent = msg; document.getElementById('screen-error').classList.remove('hidden');
}
let renderer;
try { renderer = new THREE.WebGLRenderer({ canvas, antialias: false }); } catch (err) { fatal('WebGL is not available in this browser, so HUSHFALL cannot draw. Try a current Chrome, Edge or Firefox with hardware acceleration on. (' + err.message + ')'); throw err; }
renderer.setPixelRatio(1); renderer.autoClear = false;
canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); g.mode = 'title'; document.exitPointerLock?.(); fatal('The graphics context was lost (a GPU reset or driver hiccup). Reload the page to continue: a quick save is not affected.'); });
const tex = await loadAll().catch((err) => { fatal('Could not load the painted textures: ' + err.message); throw err; });
document.getElementById('title-art').src = titleArtUrl();

const FIRST_MAP = 'C1E1M01';                                    // a new game always starts here (audit A17: it used to re-enter the last map played)
const g = {
  mode: 'title', world: null, view: null, loop: null, mapId: FIRST_MAP, difficulty: 'normal', seed: 1, timer: 0,
  progress: newProgress(),          // the campaign run's salvage, upgrade tiers and per-map records (engine/progress.js); saved with every save, reset by a new game
  input: new InputState(settings.bindings), settings, locked: false, lockFailed: false,
  events: [],                       // every event this session (dev/test hook reads and clears it)
  capture: null, mapOpen: false, manual: false, frameTimes: [], last: performance.now(),
};

g.pad = new PadDevice(settings.padBindings, settings.gamepad); g.wheel = new Wheel(); g.timeScale = 1; g.padActive = false; g.gp = null; g.padWasConnected = false; g.padSprint = false; g.padSprintHeld = false; g.capturePad = null; g.wheelMuffled = false;       // the controller and the weapon wheel (gamepad.js, wheel.js)

const ui = new UI({
  newGame: (d) => { g.progress = newProgress(); startLevel({ difficulty: d, seed: 1 + Math.floor(Math.random() * 1e6) }); },
  buyUpgrade: (track) => buyUpgrade(track),
  continueGame: () => { const r = loadFirstSave(); if (!r) ui.show('title', { canContinue: canContinue(), note: 'No usable save.' }); },
  resume: () => resume(), quickSave: () => quickSave(), quickLoad: () => quickLoad(),
  playRadio: () => audio.play(RADIO_SOUND),
  restartLevel: () => startLevel({ mapId: g.mapId, difficulty: g.difficulty, seed: g.seed, carry: g.world?.levelStart ?? null }),      // the world remembers what the level began with (also after a load)
  quitToTitle: () => quitToTitle(),
  nextLevel: () => nextLevel(),
  beginRebind: (action, slot) => { g.capture = { action, slot }; ui.syncBindings(g.input.bindings, g.capture, 'Press a key, mouse button or wheel. Esc cancels.'); },
  resetBindings: () => { g.capture = null; commitBindings(defaultBindings(), 'Controls reset to default.'); },
  setPadSetting: (k, v) => { settings.gamepad[k] = v; saveSettings(storage, settings); g.pad.setSettings(settings.gamepad); if (k === 'glyphs') refreshLegends(); },
  resetPadBindings: () => { g.capturePad = null; commitPadBindings(defaultPadBindings(), 'Controller buttons reset to default.'); },
  beginPadRebind: (action) => { g.capture = null; g.capturePad = { action }; ui.syncPadBindings(settings.padBindings, action, g.pad.family, 'Press a button on the pad. Esc cancels.'); },
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
ui.syncSettings(settings); ui.syncBindings(settings.bindings); ui.syncPadBindings(settings.padBindings, null, g.pad.family);

const canContinue = () => ['quick', 'auto'].some((s) => store.read(s).ok);
const hasQuick = () => store.read('quick').ok;
/** Continue: the NEWEST readable slot wins (quick-save and auto-save both exist; the auto-save is rewritten at every level entry, so an old F5 must not shadow it, audit A18); a corrupt one falls through to the next */
function loadFirstSave() {
  const slots = ['quick', 'auto'].map((slot) => [slot, store.read(slot)]).filter(([, r]) => r.ok).sort((a, b) => (b[1].save.savedAt ?? 0) - (a[1].save.savedAt ?? 0));
  for (const [slot, r] of slots) if (applySave(r.save, slot)) return true;
  return null;
}
function applySave(save, slot) {
  let r; try { r = loadWorld(save, (id) => MAPS[id]); } catch (e) { r = { ok: false, reason: 'corrupt', detail: String(e.message ?? e) }; }         // a broken save must never take the shell down (audit A08)
  if (!r.ok) { ui.show(g.mode === 'paused' ? 'pause' : 'title', { canContinue: canContinue(), note: `Could not load ${slot}: ${r.reason} ${r.detail}` }); return false; }
  g.progress = sanitizeProgress(save.progress);                             // the salvage, upgrades and records the save was made with
  startLevel({ world: r.world, note: r.degraded }); return true;
}

function resize() { if (g.view) g.view.setSize(innerWidth, innerHeight, settings.internalWidth); else renderer.setSize(innerWidth, innerHeight, false); }
addEventListener('resize', resize);

function startLevel({ mapId = FIRST_MAP, difficulty = g.difficulty, seed = g.seed, carry = null, world = null, note = '' } = {}) {
  g.view?.dispose();
  const map = MAPS[world ? world.mapId : mapId];
  g.world = world || createWorld(map, { seed, difficulty, carry });
  g.mapId = g.world.mapId; g.difficulty = g.world.difficulty; g.seed = g.world.seed;
  g.view = new GameView(renderer, tex, map, g.world); resize(); g.view.setLook(settings);
  g.loop = new FixedLoop(stepOnce); g.input.releaseAll(); g.timer = 0; g.mapOpen = false; g.padSprint = g.padSprintHeld = false; cancelWheel();
  if (!world) store.write('auto', makeSave(g.world, 'level-start', { now: Date.now(), progress: g.progress }));
  g.mode = 'playing'; ui.show(null); ui.clearOverlays(); if (note) ui.toast(note);
  if (!world) { ui.card(map.intro); ui.tip(g.padActive ? padLegend(settings.padBindings, g.pad.family) : legendText(g.input.bindings), 6800, 11000); }      // title card and controls reminder only on a fresh run, not when resuming a save
  audio.newLevel();
  requestLock();
}
/** the level after the one just finished (a secret exit goes to the secret map; a secret map returns to the main route), carrying the inventory over */
function nextLevel() {
  const id = g.nextId; if (!id) return quitToTitle();
  startLevel({ mapId: id, difficulty: g.difficulty, seed: g.seed + 1, carry: nextCarry() });
}
/** the inventory the next level starts with: what the player holds, with the upgrade tiers as bought in the Locker */
const nextCarry = () => ({ ...carryOver(g.world), upgrades: { ...g.progress.upgrades } });
/** the intermission screen's data: the stats, the rank this run earned, the salvage it paid, the Locker */
function completeData() {
  const m = MAPS[g.mapId], e = g.lastEarn;
  return { nextName: g.nextId ? mapName(CAMPAIGN, g.nextId) : null, stats: g.world.endStats, par: m.par?.time, difficulty: g.difficulty, mapName: m.name, outro: m.outro, hasNext: !!g.nextId,
    rank: e.result.rank, score: e.result.score, gain: e.gain, record: e.record, progress: g.progress, lockerNote: g.lockerNote || '' };
}
/** write the NEXT level's start as the auto-save, with the progress as it stands: closing the game on the intermission loses neither the salvage nor a purchase (Continue enters the next level) */
function commitProgress() {
  if (!g.nextId || !g.world) return;
  try { const w = createWorld(MAPS[g.nextId], { seed: g.seed + 1, difficulty: g.difficulty, carry: nextCarry() }); store.write('auto', makeSave(w, 'level-start', { now: Date.now(), progress: g.progress })); }
  catch (e) { g.lockerNote = 'Progress could not be saved: ' + e.message; }
}
function buyUpgrade(track) {
  if (g.mode !== 'complete' || !g.lastEarn) return;
  const r = buy(g.progress, track);
  g.lockerNote = r.ok ? '' : r.reason === 'salvage' ? 'Not enough salvage.' : r.reason === 'maxed' ? 'Already fully upgraded.' : '';
  if (r.ok) { g.progress = r.progress; commitProgress(); }
  ui.show('complete', completeData());
}
function quitToTitle() {
  cancelWheel(); g.mapOpen = false; g.view?.dispose(); g.view = null; g.world = null; g.mode = 'title'; document.exitPointerLock?.();
  renderer.setRenderTarget(null); renderer.clear(); audio.newLevel(); ui.show('title', { canContinue: canContinue() });
}
function pause() { if (g.mode !== 'playing') return; cancelWheel(); audio.setMuffled(true); g.mode = 'paused'; g.input.releaseAll(); document.exitPointerLock?.(); ui.show('pause', { canLoad: hasQuick() }); }
function resume() { if (g.mode !== 'paused') return; audio.setMuffled(false); g.mode = 'playing'; ui.show(null); requestLock(); }
function quickSave() {
  if (!g.world) return;
  const playing = g.mode === 'playing';                                     // F5 during play: save and keep playing, tell the player with a toast
  try { store.write('quick', makeSave(g.world, 'mid-level', { now: Date.now(), progress: g.progress })); if (playing) ui.toast('Quick saved'); else ui.show('pause', { note: 'Saved.', canLoad: true }); }
  catch (e) { if (playing) ui.toast('Save failed: ' + e.message); else ui.show('pause', { note: 'Save failed: ' + e.message, canLoad: hasQuick() }); }
}
function quickLoad() {
  const r = store.read('quick');
  if (!r.ok) { if (g.mode === 'playing') return ui.toast('No quick save yet'); return ui.show(g.mode === 'paused' ? 'pause' : g.mode === 'dying' || g.mode === 'dead' ? 'dead' : 'title', { note: `No quick save (${r.reason}).`, canContinue: canContinue(), canLoad: false }); }
  applySave(r.save, 'quick');
}
function lockDenied() {
  if (g.lockClick) g.lockDenials = (g.lockDenials || 0) + 1;                // browsers refuse a re-lock for ~1 s after Esc: that must not disable the mouse for the whole session
  if ((g.lockDenials || 0) >= 2) { g.lockFailed = true; ui.setPointerHint('Pointer lock is unavailable here: hold a mouse button and drag to look'); }
  else ui.setPointerHint('Click the game to capture the mouse');
}
function requestLock(fromClick = false) {
  if (g.lockFailed) return; g.lockClick = fromClick;
  try { const p = canvas.requestPointerLock?.(); p?.catch?.(lockDenied); } catch { lockDenied(); }
}

/** One fixed simulation tick. Everything (keyboard, mouse, bot, test hook) reaches the sim through g.input. */
function stepOnce() {
  if (g.mode !== 'playing') return;
  { const wantToggle = settings.aimToggle && WEAPONS[g.world.player.weapon]?.kind !== 'melee'; if (g.aimToggleOn !== wantToggle) { g.input.setToggle('aim', wantToggle); g.aimToggleOn = wantToggle; } }      // with a melee weapon in hand Aim is the GUARD, and a guard is always a HOLD, whatever the aim-toggle setting says
  const cmd = g.input.sample();
  if (cmd.pause) { pause(); return; }
  if (cmd.map) g.mapOpen = !g.mapOpen;                                            // UI-only toggle: the sim keeps running under the map
  try { g.view.beforeStep(g.world); step(g.world, cmd); }
  catch (e) {                                                                      // a corrupt world must end the session with a reason, not freeze the loop (audit R13)
    console.error(e); g.input.releaseAll(); document.exitPointerLock?.(); g.mode = 'title'; g.world = null; g.view?.dispose(); g.view = null; ui.show('title', { canContinue: canContinue(), note: 'The simulation stopped (' + String(e.message ?? e).slice(0, 80) + '). The save or level state was damaged.' }); return;
  }
  const ev = drainEvents(g.world); if (ev.length) { g.view.handleEvents(ev); ui.events(ev); audio.handleEvents(ev); rumbleEvents(ev); if (import.meta.env.DEV) { g.events.push(...ev); if (g.events.length > 4000) g.events.splice(0, g.events.length - 4000); } }
  if (g.world.status === 'dead') { cancelWheel(); g.mode = 'dying'; g.timer = 1.4; g.input.releaseAll(); document.exitPointerLock?.(); }
  else if (g.world.status === 'complete') { cancelWheel(); g.mode = 'ending'; g.timer = 0.9; g.input.releaseAll(); document.exitPointerLock?.(); }
}

// ---- devices ---------------------------------------------------------------
document.addEventListener('pointerlockchange', () => { g.locked = document.pointerLockElement === canvas; if (g.locked) { g.lockDenials = 0; ui.setPointerHint(''); } else if (g.mode === 'playing') pause(); });
document.addEventListener('pointerlockerror', lockDenied);
let dragging = false;
canvas.addEventListener('mousedown', (e) => {
  if (g.mode !== 'playing') return;
  if (!g.locked && !g.lockFailed) { requestLock(true); return; }
  if (g.wheel.open) return;                                                  // the wheel owns the mouse while it is open
  g.padActive = false; dragging = true; g.input.keyDown('Mouse' + e.button);
});
addEventListener('mouseup', (e) => { dragging = false; g.input.keyUp('Mouse' + e.button); });
document.addEventListener('mousedown', (e) => { if (g.capture && !e.target.closest?.('button.bind')) { e.preventDefault(); captureCode('Mouse' + e.button); } }, true);
document.addEventListener('wheel', (e) => { if (g.capture) { e.preventDefault(); captureCode(e.deltaY < 0 ? 'WheelUp' : 'WheelDown'); } }, { passive: false, capture: true });
let wheelAcc = 0, wheelAt = 0, wheelStepAt = 0;
canvas.addEventListener('wheel', (e) => {                                   // wheel = weapon cycle (tap-latched). A mouse notch is ~100 units; a trackpad flick is many small events: accumulate, then step once with a short cooldown
  if (g.mode !== 'playing') return; e.preventDefault();
  const now = performance.now(); if (now - wheelAt > 250) wheelAcc = 0; wheelAt = now;
  wheelAcc += e.deltaMode === 1 ? e.deltaY * 40 : e.deltaY;
  if (Math.abs(wheelAcc) < 80) return;
  const code = wheelAcc < 0 ? 'WheelUp' : 'WheelDown'; wheelAcc = 0;
  if (now - wheelStepAt < 160) return; wheelStepAt = now;
  g.input.keyDown(code); g.input.keyUp(code);
}, { passive: false });
canvas.addEventListener('contextmenu', (e) => e.preventDefault());                       // right button is Aim
// sensitivity follows the zoom: at full ADS the same hand movement turns the view by the same on-screen amount
const adsSensScale = () => { const a = g.world?.player.ads ?? 0, r = Math.tan((WEAPONS[g.world?.player.weapon]?.adsFov ?? VIEW.adsFov) * Math.PI / 360) / Math.tan(VIEW.fov * Math.PI / 360); return 1 + (r - 1) * a; };           // the zoom RATIO is constant, so this holds at any base FOV
addEventListener('mousemove', (e) => { if (g.mode === 'playing' && (g.locked || (g.lockFailed && dragging))) { if (g.wheel.open) g.wheel.feed(e.movementX, e.movementY); else { if (e.movementX || e.movementY) g.padActive = false; g.input.addMouse(e.movementX, e.movementY, 0.0022 * settings.sensitivity * adsSensScale()); } } });
addEventListener('keydown', (e) => {
  if (g.capturePad) { e.preventDefault(); e.stopPropagation(); if (e.code === 'Escape') cancelPadCapture('Cancelled.'); return; }
  if (g.capture) { e.preventDefault(); e.stopPropagation(); if (!e.repeat) captureCode(e.code); return; }
  if (e.repeat) return;
  if (g.mode === 'paused' && (e.code === 'Escape' || (g.input.bindings.pause || []).includes(e.code))) { resume(); return; }         // any key bound to Pause also resumes
  if (g.mode === 'dead' && (e.code === 'Enter' || e.code === 'Space') && ui.canAct()) { ui.h.restartLevel(); return; }
  if (g.mode === 'complete' && (e.code === 'Enter' || e.code === 'Space') && ui.canAct()) { ui.h.nextLevel(); return; }
  if (e.code === 'F5' && g.mode === 'playing') { e.preventDefault(); quickSave(); return; }
  if (e.code === 'F9' && (g.mode === 'playing' || g.mode === 'paused')) { e.preventDefault(); quickLoad(); return; }
  if (g.mode === 'playing' && (g.input.bindings.weaponLast || []).includes(e.code)) { e.preventDefault(); g.padActive = false; lastWeaponDown(); return; }          // tap = last weapon, hold = the wheel
  if (g.mode === 'playing') { g.padActive = false; g.input.keyDown(e.code); if (g.input.byCode.has(e.code)) e.preventDefault(); }
});
addEventListener('keyup', (e) => { if ((g.input.bindings.weaponLast || []).includes(e.code)) lastWeaponUp(); g.input.keyUp(e.code); });
addEventListener('blur', () => pause());
addEventListener('gamepadconnected', () => { g.padWasConnected = false; });
addEventListener('gamepaddisconnected', () => { if (g.mode === 'playing' && g.padActive) pause(); });                // the pad you were playing with went away: pause, do not let the game run on without you
document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });

// ---- controller and weapon wheel -------------------------------------------------------------
function refreshLegends() { ui.legends(g.padWasConnected ? padLegend(settings.padBindings, g.pad.family) : ''); ui.syncPadBindings(settings.padBindings, g.capturePad?.action ?? null, g.pad.family); }
function commitPadBindings(b, note = '') { settings.padBindings = b; g.pad.setBindings(b); saveSettings(storage, settings); ui.syncPadBindings(b, null, g.pad.family, note); }
function cancelPadCapture(note) { g.capturePad = null; ui.syncPadBindings(settings.padBindings, null, g.pad.family, note); }
function cancelWheel() { g.wheel.cancel(); if (g.wheelMuffled) { g.wheelMuffled = false; audio.setMuffled(false); } g.timeScale = 1; ui.setWheel(null); }
/** equip the wheel's choice: the same slot action the number keys press (the sim ignores a weapon you do not own); choosing the melee slot while already in it stays put instead of cycling */
function wheelPick(index) {
  const slot = WHEEL_SLOTS[index], p = g.world?.player; if (!slot || !p) return;
  if (slot.id === 'melee' ? WEAPONS[p.weapon]?.kind === 'melee' : p.weapon === slot.id) return;
  g.input.press('weapon' + (slot.slot + 1)); g.input.release('weapon' + (slot.slot + 1));
}
function lastWeaponDown() { if (settings.wheelToggle) { if (g.wheel.open) lastWeaponUp(true); else g.wheel.forceOpen(performance.now()); return; } g.wheel.press(performance.now()); }
function lastWeaponUp(force = false) {
  if (settings.wheelToggle && !force) return;
  const r = g.wheel.release();
  if (r.tap) { if (g.mode === 'playing') { g.input.press('weaponLast'); g.input.release('weaponLast'); } } else wheelPick(r.pick);
}
function updateWheelUI() {
  if (g.mode !== 'playing' || !g.world || !g.wheel.open) { ui.setWheel(null); return; }
  ui.setWheel(wheelSvg(wheelModel(g.world.player, g.wheel.sel, WEAPONS, MELEE_ORDER)), !settings.wheelSlow ? '' : g.difficulty === 'easy' ? 'TIME FROZEN' : 'TIME SLOWED');
}
const navRepeat = new NavRepeat();
const menuItems = () => { const scr = document.querySelector('.screen:not(.hidden)'); return scr ? [...scr.querySelectorAll('button, input, select, summary')].filter((el) => !el.disabled && el.offsetParent !== null) : []; };
/** the pad in a menu: D-pad or left stick moves the focus, A / Cross confirms (fixed, so the menus always work whatever is rebound), B / Circle or the pause button backs out of the pause menu */
function padMenu(out, dt) {
  const d = navRepeat.update(navDir(g.pad.down, out.move), dt), items = menuItems(); if (!items.length) return;
  const cur = items.indexOf(document.activeElement);
  if (cur < 0) { if (d || out.pressed.length) items[0].focus(); return; }
  if (d) {
    const el = items[cur];
    if (el.type === 'range' && (d === 'left' || d === 'right')) { const step = Number(el.step) || 1, v = Number(el.value) + (d === 'right' ? step : -step); el.value = Math.min(Number(el.max), Math.max(Number(el.min), v)); el.dispatchEvent(new Event('input', { bubbles: true })); }
    else { const n = pickNext(items.map((e, i) => { const r = e.getBoundingClientRect(); return { id: i, x: r.x, y: r.y, w: r.width, h: r.height }; }), cur, d); if (n !== cur) { items[n].focus(); items[n].scrollIntoView?.({ block: 'nearest' }); } }
  }
  if (out.pressed.includes('Pad0')) items[cur].click();
  if (g.mode === 'paused' && (out.pressed.includes('Pad1') || (settings.padBindings.pause || []).some((c) => out.pressed.includes(c)))) resume();
}
function padPress(a) {
  if (a === 'weaponLast') return lastWeaponDown();
  if (a === 'sprint' && !settings.sprintToggle) { g.padSprint = !g.padSprint; return; }                // a click of the stick cannot be held while steering it: on a pad sprint is a toggle that ends when you let go of the stick
  g.input.press(a);
}
function padRelease(a) { if (a === 'weaponLast') return lastWeaponUp(); if (a === 'sprint' && !settings.sprintToggle) return; g.input.release(a); }
function pollPad(dt) {
  const list = navigator.getGamepads ? Array.from(navigator.getGamepads()) : [], gp = list.find((x) => x && x.connected && x.mapping === 'standard') ?? list.find((x) => x && x.connected) ?? null; g.gp = gp;
  const playing = g.mode === 'playing', scale = playing ? adsSensScale() * settings.sensitivity * (g.world && !g.wheel.open ? assistScale(g.world, settings.gamepad.assist) : 1) : 1;
  const out = g.pad.poll(snapshotOf(gp), dt, scale);
  if (out.connected !== g.padWasConnected) { g.padWasConnected = out.connected; refreshLegends(); }
  for (const a of out.actions.released) if (playing) padRelease(a);
  if (!out.connected) { if (g.padSprintHeld) { g.input.release('sprint'); g.padSprintHeld = false; } g.padSprint = false; g.input.setAnalog(0, 0); return; }
  if (out.active) g.padActive = true;
  if (g.capturePad) { if (out.pressed.length) { const r = applyPadRebind(settings.padBindings, g.capturePad.action, out.pressed[0]); if (r.ok) { g.capturePad = null; commitPadBindings(r.bindings, r.displaced.length ? padGlyph(out.pressed[0], g.pad.family) + ' taken from: ' + r.displaced.join(', ') + '.' : padGlyph(out.pressed[0], g.pad.family) + ' assigned.'); } else cancelPadCapture(r.reason + '.'); } return; }
  if (!playing) { g.input.setAnalog(0, 0); padMenu(out, dt); return; }
  for (const a of out.actions.pressed) if (!(g.wheel.open && (a === 'fire' || a === 'aim' || a === 'melee'))) padPress(a);           // the wheel owns the triggers while it is open
  g.input.setAnalog(out.move[0], out.move[1]);
  if (g.wheel.open) g.wheel.stick(out.stick[0], out.stick[1]); else if (out.look[0] || out.look[1]) { g.input.addYaw(out.look[0]); g.input.addPitch(out.look[1]); }
  const wantSprint = g.padSprint && Math.hypot(out.move[0], out.move[1]) > 0.25; if (!wantSprint) g.padSprint = false;
  if (wantSprint && !g.padSprintHeld) { g.input.press('sprint'); g.padSprintHeld = true; } else if (!wantSprint && g.padSprintHeld) { g.input.release('sprint'); g.padSprintHeld = false; }
}
let lastRumble = 0;
function rumbleEvents(ev) {
  if (!g.padActive || !settings.gamepad.vibration || !g.gp?.vibrationActuator) return;
  for (const e of ev) { const r = rumbleFor(e); if (!r) continue; const t = performance.now(); if (r.ms < 60 && t - lastRumble < 70) continue; lastRumble = t; try { g.gp.vibrationActuator.playEffect('dual-rumble', { startDelay: 0, duration: r.ms, weakMagnitude: r.weak, strongMagnitude: r.strong }); } catch { /* not every pad can */ } }
}

// ---- frame loop --------------------------------------------------------------
function frame(now) {
  const raw = (now - g.last) / 1000, dt = Math.min(0.1, raw); g.last = now;                  // dt is clamped for the simulation's sake; the RECORDED frame time is not (a hitch must be visible in the stats)
  g.frameTimes.push(raw * 1000); if (g.frameTimes.length > 900) g.frameTimes.shift();
  pollPad(dt);
  let alpha = 0;
  if (g.mode === 'playing') {
    if (g.wheel.tick(now)) g.input.release('fire');                                   // the wheel opened (the last-weapon key has been held): stop shooting
    const open = g.wheel.open, target = open ? timeScaleFor(g.difficulty, settings.wheelSlow) : 1; g.timeScale = easeScale(g.timeScale, target, raw);        // Easy: frozen, Normal: 15%, Hard: 5% (owner decision D7); the clock the simulation is fed, never the simulation
    if (open !== g.wheelMuffled) { g.wheelMuffled = open; audio.setMuffled(open); }
    alpha = g.manual ? 1 : g.loop.advance(dt * g.timeScale).alpha;
  }            // g.manual: the dev test hook owns the clock
  else if (g.mode === 'dying') { g.timer -= dt; if (g.timer <= 0) { g.mode = 'dead'; ui.show('dead', { canLoad: hasQuick() }); } }
  else if (g.mode === 'ending') {
    g.timer -= dt;
    if (g.timer <= 0) {
      g.mode = 'complete'; g.nextId = nextMapId(CAMPAIGN, g.mapId, g.world.endStats?.dest, (id) => !!MAPS[id]);
      g.lastEarn = earn(g.progress, g.mapId, g.world.endStats, MAPS[g.mapId].par?.time); g.progress = g.lastEarn.progress; g.lockerNote = '';       // the rank, the salvage it pays (only the improvement over this map's best), the record
      commitProgress(); ui.show('complete', completeData());
    }
  }
  audio.update(g.mode === 'playing' || g.mode === 'dying' ? g.world : null, dt, MAPS[g.mapId]);
  const showMap = g.mapOpen && g.world && (g.mode === 'playing' || g.mode === 'dying'); mapCanvas.classList.toggle('hidden', !showMap); if (showMap) drawAutomap(mapCanvas, automapModel(g.world));
  if (g.view && g.world) { g.view.render(g.world, g.mode === 'playing' ? alpha : 1, dt); ui.hud(g.world, g.mode !== 'title'); } else ui.hud(null, false);
  updateWheelUI(); ui.useHint(g.mode === 'playing' && g.world ? doorPrompt(g.world) : '');
  requestAnimationFrame(frame);
}
/** what pressing Use would do right now, as text ('' = nothing): a closed door says how to open it, a locked one says what it needs. Secret panels never advertise themselves. */
function doorPrompt(w) {
  const t = useTarget(w); if (!t || t.secret || t.target === 1 || t.open > 0.05) return '';
  if (t.key && !w.player.keys.includes(t.key)) return `Locked: needs the ${KEYS[t.key]?.name.toLowerCase() || 'key'}`;
  return `[${g.padActive ? padGlyph(settings.padBindings.use?.[0], g.pad.family) : prettyCode(g.input.bindings.use?.[0])}] open`;
}
resize(); ui.show('title', { canContinue: canContinue(), note: settingsNotes.join(' ') });
requestAnimationFrame(frame);

if (import.meta.env.DEV) {                                                 // dev-only title-screen level picker (index.html #dev-levels): any map, any difficulty, no need to play Episode 1 first
  const box = document.getElementById('dev-levels'), sel = document.getElementById('dev-map'), diff = document.getElementById('dev-diff'), go = document.getElementById('dev-go');
  if (box && sel && diff && go) {
    sel.innerHTML = Object.keys(MAPS).sort().map((id) => `<option value="${id}">${id} ${MAPS[id].name ?? ''}</option>`).join(''); box.classList.remove('hidden');
    go.onclick = () => { g.progress = sanitizeProgress({ salvage: Number(document.getElementById('dev-salvage')?.value) || 0 }); startLevel({ mapId: sel.value, difficulty: diff.value, seed: 1 + Math.floor(Math.random() * 1e6) }); };      // a dev run starts with the salvage typed in the box (to try the Locker without playing ten maps)
  }
}
if (import.meta.env.DEV) import('./testhook.js').then((m) => m.installTestHook({ g, MAPS, audio, store, startLevel, stepOnce, pause, resume, quickSave, quickLoad, renderer, ui, TICK }));
