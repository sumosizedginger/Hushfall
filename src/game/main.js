// HUSHFALL runtime: state machine (title / playing / paused / dying / ending) around the headless engine + Three.js view.
import * as THREE from 'three';
import { loadAll, titleArtUrl, endingArtUrl, endingArt2Url, coldTowerUrl } from '../render/textures.js';
import { GameView } from '../render/view.js';
import { createWorld, step, drainEvents, useTarget, carryOver } from '../engine/world.js';
import { lockBusy } from '../engine/airlock.js';
import { automated } from './lockpolicy.js';
import CAMPAIGN from '../../CAMPAIGN_MANIFEST.json';
import { nextMapId, mapName } from './campaign.js';
import { InputState } from '../engine/input.js';
import { FixedLoop } from '../engine/loop.js';
import { parseMap } from '../engine/mapformat.js';
import { makeSave, loadWorld, SaveStore, storeSave } from '../engine/save.js';
import { TICK, VIEW, KEYS, WEAPONS, MELEE_ORDER } from '../engine/defs.js';
import { newProgress, sanitizeProgress, earn, buy, buyMod } from '../engine/progress.js';
import { UI } from './ui.js';
import { holdForComms } from './commsqueue.js';
import { AudioEngine } from '../audio/engine.js';
import { automapModel } from '../engine/automap.js';
import { drawAutomap } from './automap.js';
import { loadSettings, saveSettings } from './settings.js';
import { applyRebind, defaultBindings, prettyCode, legendText } from './bindings.js';
import { RADIO_SOUND } from '../audio/events.js';
import { PadDevice, snapshotOf, padGlyph, padLegend, assistScale, rumbleFor, applyPadRebind, defaultPadBindings } from './gamepad.js';
import { Wheel, WHEEL_SLOTS, easeScale, timeScaleFor, wheelModel, wheelSvg } from './wheel.js';
import { pickNext, navDir, NavRepeat } from './padmenu.js';
import { RangeMeter } from './rangemeter.js';
import { ENDINGS, COLD_OPEN, endingFor, tally, startSequence, stepSequence, pressSequence, skipSequence, viewSequence } from './ending.js';
import { recordAdd, recordAtAdd, foundAdd, attemptReset, recordView, recordCounts, recordScenes } from './record.js';
import { guardedFrame, makeReport, appendReport, reportText, loadErrors, saveErrors } from './errorlog.js';
import { journalLog, openTab, objectivesPage, itemsPage, tabAfter, journalPadStep, JOURNAL_TABS } from './journal.js';
import { seenKinds, bestiaryPage } from './bestiary.js';
import { captionFor, CaptionFeed } from './captions.js';
import { firstRunLine } from './firstrun.js';
import { QualityGovernor } from './quality.js';
import { creditsLines, creditsHeight, creditsState } from './credits.js';
import { loadLog, saveLog, clearLog, addLevel, addSurvey, exportText, describe, FrameHistogram } from './playlog.js';
import { drawMinimap, MINIMAP } from './minimap.js';
import { floorAt } from '../engine/terrain.js';
import { resolveScene, cameraAt, startScene, advanceScene, skipScene, subtitleAt, fadeAt, hasSeen, markSeen } from './cinematics.js';
import { SCENE, SCENES } from './scenes.js';

const canvas = document.getElementById('c'), mapCanvas = document.getElementById('automap'), miniCanvas = document.getElementById('minimap');
const MAPS = {};
for (const src of Object.values(import.meta.glob('../../maps/*.json', { eager: true, import: 'default' }))) { const m = parseMap(src); MAPS[m.id] = m; }   // validates at load
// PT-016: the dev-only weapons range lives in maps-dev/, never in maps/ (it is not a campaign map and no validation, status or test counts it); loaded only by the dev server
const devMapsReady = import.meta.env.DEV ? Promise.all(Object.values(import.meta.glob('../../maps-dev/*.json', { import: 'default' })).map((load) => load().then((src) => { const m = parseMap(src); MAPS[m.id] = m; }))) : Promise.resolve();
const rangeMeter = new RangeMeter(), rangeEl = document.getElementById('range-hud');

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
document.getElementById('title-art').src = titleArtUrl(); document.getElementById('ending-art').src = endingArtUrl();

const FIRST_MAP = 'C1E1M01';                                    // a new game always starts here (audit A17: it used to re-enter the last map played)
const g = {
  playlog: loadLog(storage), hist: new FrameHistogram(), attempt: 0, attemptLogged: true, survey: null, governor: new QualityGovernor(settings.internalWidth), captions: new CaptionFeed(), mode: 'title', world: null, view: null, loop: null, mapId: FIRST_MAP, difficulty: 'normal', seed: 1, timer: 0,
  progress: newProgress(),          // the campaign run's salvage, upgrade tiers and per-map records (engine/progress.js); saved with every save, reset by a new game
  input: new InputState(settings.bindings), settings, locked: false, lockFailed: false,
  events: [],                       // every event this session (dev/test hook reads and clears it)
  capture: null, mapOpen: false, unread: new Set(), journalTab: 'map', objectives: [], miniN: 0, miniModel: null, manual: false, frameTimes: [], last: performance.now(),
};

g.pad = new PadDevice(settings.padBindings, settings.gamepad); g.wheel = new Wheel(); g.timeScale = 1; g.padActive = false; g.gp = null; g.padWasConnected = false; g.padSprint = false; g.padSprintEngaged = false; g.padSprintHeld = false; g.capturePad = null; g.wheelMuffled = false;       // the controller and the weapon wheel (gamepad.js, wheel.js)

const ui = new UI({
  newGame: (d) => { g.progress = newProgress(); const go = () => startLevel({ difficulty: d, seed: 1 + Math.floor(Math.random() * 1e6) }); if (!settings.coldOpenSeen && settings.cinematics !== 'off') startColdOpen(go); else go(); },          // PT-063: the cold open plays before the first level of a new game, once
  buyUpgrade: (track) => buyUpgrade(track),
  buyMod: (id) => buyModTier(id),
  continueGame: () => { const r = loadFirstSave(); if (!r) ui.show('title', { canContinue: canContinue(), note: 'No usable save.' }); },
  crashToTitle: () => { ui.hideCrash(); ui.show('title', { canContinue: canContinue(), note: '' }); },
  journalTab: (tab) => { g.journalTab = JOURNAL_TABS.includes(tab) ? tab : 'map'; ui.journalShowTab(g.journalTab); },
  resume: () => resume(), quickSave: () => quickSave(), quickLoad: () => quickLoad(),
  playRadio: () => audio.play(RADIO_SOUND),
  restartLevel: () => { if (g.mode === 'playing' || g.mode === 'paused') logAttempt('restart'); startLevel({ mapId: g.mapId, difficulty: g.difficulty, seed: g.seed, carry: g.world?.levelStart ?? null }); },      // the world remembers what the level began with (also after a load)
  quitToTitle: () => quitToTitle(),
  nextLevel: () => nextLevel(),
  epiloguePress: () => epiloguePress(),
  openCredits: () => openCredits(), closeCredits: () => closeCredits(),
  openRecord: (from) => openRecord(from), closeRecord: () => closeRecord(), replayScene: (id) => replayScene(id),
  beginRebind: (action, slot) => { g.capture = { action, slot }; ui.syncBindings(g.input.bindings, g.capture, 'Press a key, mouse button or wheel. Esc cancels.'); },
  resetBindings: () => { g.capture = null; commitBindings(defaultBindings(), 'Controls reset to default.'); },
  setPadSetting: (k, v) => { settings.gamepad[k] = v; saveSettings(storage, settings); g.pad.setSettings(settings.gamepad); if (k === 'glyphs') refreshLegends(); },
  resetPadBindings: () => { g.capturePad = null; commitPadBindings(defaultPadBindings(), 'Controller buttons reset to default.'); },
  beginPadRebind: (action) => { g.capture = null; g.capturePad = { action }; ui.syncPadBindings(settings.padBindings, action, g.pad.family, 'Press a button on the pad. Esc cancels.'); },
  playlogExport: () => { const blob = new Blob([exportText(g.playlog)], { type: 'application/json' }), a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'hushfall-playlog.json'; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 1000); },
  playlogCopy: () => { navigator.clipboard?.writeText(exportText(g.playlog)).then(() => ui.playlogNote('Copied. ' + describe(g.playlog)), () => ui.playlogNote('Could not copy: use Export instead.')); },
  playlogClear: () => { clearLog(storage); g.playlog = loadLog(storage); logMeta(); ui.playlogNote('Cleared. ' + describe(g.playlog)); },
  surveyAnswer: (k, v) => { g.survey ??= { answers: {}, note: '' }; g.survey.answers[k] = v; commitSurvey(); ui.survey(true, g.survey.answers, g.survey.note); },
  surveyNote: (t) => { g.survey ??= { answers: {}, note: '' }; g.survey.note = t; commitSurvey(); },
  setSetting: (k, v) => { settings[k] = v; saveSettings(storage, settings); if (k === 'aimToggle') g.input.setToggle('aim', v); if (k === 'sprintToggle') g.input.setToggle('sprint', v); if (k === 'masterVolume' || k === 'sfxVolume' || k === 'musicVolume') audio.applySettings(settings); if (k === 'internalWidth') { g.governor.reset(v); resize(); } if (k === 'autoQuality') resize(); if (k === 'crosshair') ui.applyCrosshair(v); if (k === 'textSize' || k === 'reducedMotion') applyComfort(); if (k === 'captions' && !v) g.captions.clear(); if (k === 'playLog') { if (v) logMeta(); ui.playlogNote(describe(g.playlog)); } if (k === 'minimap') { ui.setMinimap(v); g.miniModel = null; } if ((k === 'outline' || k === 'paint' || k === 'fov' || k === 'brightness' || k === 'reducedMotion') && g.view) g.view.setLook(settings); },
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
applyComfort(); ui.syncSettings(settings); ui.syncCrosshair(settings.crosshair); ui.syncBindings(settings.bindings); ui.syncPadBindings(settings.padBindings, null, g.pad.family);

/** PT-071 R20: the text size and the reduced-motion class of the page (the view reads reducedMotion through setLook) */
function applyComfort() { const c = document.body?.classList; if (!c?.toggle) return; c.toggle('ui-large', settings.textSize === 'large'); c.toggle('ui-larger', settings.textSize === 'larger'); c.toggle('reduced-motion', !!settings.reducedMotion); }

/** PT-071 R24: one finished attempt at a map goes into the play log, if the player turned the log on (never twice for one attempt) */
function logAttempt(outcome) {
  if (!settings.playLog || !g.world || g.attemptLogged) return; g.attemptLogged = true; const w = g.world, p = w.player, st = w.stats ?? {};
  g.playlog = addLevel(g.playlog, { map: g.mapId, difficulty: g.difficulty, outcome, seconds: w.time, kills: st.kills, damageTaken: st.damageTaken, secrets: st.secrets, items: st.items, deathAt: outcome === 'dead' ? [Math.floor(p.x / w.map.cell), Math.floor(p.z / w.map.cell)] : null, frames: g.hist.stats(renderWidth()), attempt: g.attempt });
  saveLog(storage, g.playlog); ui.playlogNote(describe(g.playlog));
}
function logMeta() { try { const gl = renderer.getContext?.(), x = gl?.getExtension?.('WEBGL_debug_renderer_info'); const ua = (navigator.userAgent || '').match(/(Edg|Chrome|Firefox|Version)\/(\d+)/); g.playlog.renderer = String((x && gl.getParameter(x.UNMASKED_RENDERER_WEBGL)) || '').slice(0, 80); g.playlog.browser = ua ? (ua[1] === 'Version' ? 'Safari' : ua[1] === 'Edg' ? 'Edge' : ua[1]) + ' ' + ua[2] : ''; g.playlog.day = new Date().toISOString().slice(0, 10); } catch { /* the log works without it */ } }
function commitSurvey() { if (!g.survey) return; g.playlog = addSurvey(g.playlog, g.mapId, g.attempt, g.survey.answers, g.survey.note); saveLog(storage, g.playlog); ui.playlogNote(describe(g.playlog)); }
logMeta(); ui.playlogNote(describe(g.playlog));
addEventListener('pagehide', () => { if (g.mode === 'playing' || g.mode === 'paused') logAttempt('quit'); });      // closing the tab in the middle of a map is the commonest way to stop: it is an attempt too

const canContinue = () => ['quick', 'auto'].some((s) => store.read(s).ok);
const hasQuick = () => store.read('quick').ok;
/** Continue: the NEWEST readable slot wins (quick-save and auto-save both exist; the auto-save is rewritten at every level entry, so an old F5 must not shadow it, audit A18); a corrupt one falls through to the next */
function loadFirstSave() {
  const slots = ['quick', 'auto'].map((slot) => [slot, store.read(slot)]).filter(([, r]) => r.ok).sort((a, b) => (b[1].save.savedAt ?? 0) - (a[1].save.savedAt ?? 0));
  for (const [slot, r] of slots) if (applySave(r.save, slot)) return true;
  return null;
}
// ---- the Record (PT-037, record.js): every message received, replayed from the pause menu and the title ----
/** the progress the title's Record shows: the newest readable save's (what Continue would load), else whatever this session holds */
const titleProgress = () => {
  const slots = ['quick', 'auto'].map((slot) => store.read(slot)).filter((r) => r.ok).sort((a, b) => (b.save.savedAt ?? 0) - (a.save.savedAt ?? 0));
  return slots.length ? sanitizeProgress(slots[0].save.progress) : g.progress;
};
function openRecord(from) {
  g.recordFrom = from === 'title' ? 'title' : 'pause';
  const view = recordView(CAMPAIGN, MAPS, g.recordFrom === 'title' ? titleProgress() : g.progress);
  ui.show('record', { view, counts: recordCounts(view), current: g.recordFrom === 'pause' ? g.mapId : null, scenes: g.recordFrom === 'title' ? [...(settings.coldOpenSeen ? [{ id: 'cold-open', title: 'Port Marrow', map: null }] : []), ...recordScenes(titleProgress(), SCENES)] : [] });
}
/** PT-071 R25: the credits roll, from the title: a screen on the wall clock (the roll's own pace), nothing in the world moves */
function openCredits() { if (g.mode !== 'title') return; g.credits = { t: 0, h: creditsHeight(creditsLines()) }; ui.show('credits'); }
function closeCredits() { if (ui.screen !== 'credits') return; g.credits = null; ui.show('title', { canContinue: canContinue() }); }
function stepCredits(dt) { const c = g.credits; if (!c) return; c.t += dt; const st = creditsState(c.t, globalThis.innerHeight || 600, c.h); ui.creditsFrame(st.offset); if (st.done) closeCredits(); }
function closeRecord() {
  if (ui.screen !== 'record') return;
  if (g.recordFrom === 'title') ui.show('title', { canContinue: canContinue() }); else ui.show('pause', { canLoad: hasQuick() });
}
/** a message just reached the player: remember it in the run's progress (the range is no part of the campaign) */
function recordMessages(ev) { if (g.world?.map.range) return; for (const e of ev) { if (e.type === 'message') { g.progress = recordAdd(g.progress, g.mapId, e.id); { const p = g.world.player, S = g.world.map.cell; g.progress = recordAtAdd(g.progress, g.mapId, e.id, g.world.time, Math.floor(p.x / S), Math.floor(p.z / S)); } g.unread.add(e.id); ui.setUnread(g.unread.size); }
    else if (e.type === 'pickup' || e.type === 'weapon_pickup') { const p = g.world.player, S = g.world.map.cell; g.progress = foundAdd(g.progress, g.mapId, e.kind, g.world.time, Math.floor(p.x / S), Math.floor(p.z / S)); } else if (e.type === 'objective') { g.objectives.push(e.text); if (g.objectives.length > 60) g.objectives.shift(); } else if (e.type === 'choice') g.progress = { ...g.progress, choices: { ...(g.progress.choices ?? {}), [e.id]: e.value } }; } }        // PT-039: a choice the player made is kept in the progress at once (the next map's world starts with it)
function applySave(save, slot) {
  let r; try { r = loadWorld(save, (id) => MAPS[id]); } catch (e) { r = { ok: false, reason: 'corrupt', detail: String(e.message ?? e) }; }         // a broken save must never take the shell down (audit A08)
  if (!r.ok) { ui.show(g.mode === 'paused' ? 'pause' : 'title', { canContinue: canContinue(), note: `Could not load ${slot}: ${r.reason} ${r.detail}` }); return false; }
  g.progress = sanitizeProgress(save.progress);                             // the salvage, upgrades and records the save was made with
  startLevel({ world: r.world, note: r.degraded }); g.loadedSlot = slot; g.sinceLoad = 0; return true;
}

const renderWidth = () => (settings.autoQuality !== false ? g.governor.width : settings.internalWidth);                 // PT-071 R21: the width the quality governor says (the player's own choice until the frames run slow)
function resize() { if (g.view) g.view.setSize(innerWidth, innerHeight, renderWidth()); else renderer.setSize(innerWidth, innerHeight, false); }
addEventListener('resize', resize);

function startLevel({ mapId = FIRST_MAP, difficulty = g.difficulty, seed = g.seed, carry = null, world = null, note = '' } = {}) {
  g.cine = null; ui.cine(null);                                                                                        // PT-063: a level never starts under the overlay of a story scene that was playing
  g.loadedSlot = null; g.sinceLoad = 0; g.unread = new Set(); ui.setUnread(0);                                           // (applySave sets them again after this: a save that breaks the game in its first three seconds is set aside, PT-050 H1)
  g.view?.dispose();
  const map = MAPS[world ? world.mapId : mapId];
  g.world = world || createWorld(map, { seed, difficulty, carry, choices: g.progress?.choices ?? null });
  g.mapId = g.world.mapId; if (!world) g.progress = attemptReset(g.progress, g.mapId); g.difficulty = g.world.difficulty; g.seed = g.world.seed; g.objectives = g.world.objective ? [g.world.objective] : []; g.miniModel = null;
  g.view = new GameView(renderer, tex, map, g.world); resize(); g.view.setLook(settings);
  g.loop = new FixedLoop(stepOnce); g.input.releaseAll(); g.timer = 0; g.mapOpen = false; g.padSprint = g.padSprintHeld = false; cancelWheel();
  rangeMeter.reset(); g.devScale = 1;
  let saveNote = '';
  if (!world && !map.range) {                                                                                     // (the range never overwrites the campaign's Continue; a loaded world is already on disk)
    const err = storeSave(store, 'auto', () => makeSave(g.world, 'level-start', { now: Date.now(), progress: g.progress }));
    if (err) saveNote = 'Progress could not be saved: ' + err;                                                    // a full store used to throw here, after the old view was disposed and before play began
  }
  g.attempt++; g.attemptLogged = false; g.hist.reset(); g.survey = null;                                         // PT-071 R24: a new attempt for the play log
  g.mode = 'playing'; ui.show(null); ui.clearOverlays(); if (note) ui.toast(note); if (saveNote) ui.toast(saveNote);
  if (!world) {
    ui.card(map.intro); const first = !settings.firstRunSeen, legend = g.padActive ? padLegend(settings.padBindings, g.pad.family) : legendText(g.input.bindings);        // PT-071 R20: a new profile also gets one line about the objective and the Journal
    ui.tip(first ? legend + '\n' + firstRunLine({ bindings: g.input.bindings, padBindings: settings.padBindings, family: g.pad.family, pad: g.padActive }) : legend, 6800, first ? 17000 : 11000);
    if (first) { settings.firstRunSeen = true; saveSettings(storage, settings); }
  }      // title card and controls reminder only on a fresh run, not when resuming a save
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
  return { nextName: g.nextId ? mapName(CAMPAIGN, g.nextId) : null, stats: g.world.endStats, par: m.par?.time, difficulty: g.difficulty, mapName: m.name, outro: m.outro, hasNext: !!g.nextId, campaignEnd: !!endingFor(CAMPAIGN, g.mapId, g.world?.endStats?.dest),
    survey: settings.playLog ? { answers: g.survey?.answers ?? {}, note: g.survey?.note ?? '' } : null, rank: e.result.rank, score: e.result.score, gain: e.gain, record: e.record, progress: g.progress, lockerNote: g.lockerNote || '', mods: Object.keys(g.world?.player?.mods ?? {}) };
}
/** write the NEXT level's start as the auto-save, with the progress as it stands: closing the game on the intermission loses neither the salvage nor a purchase (Continue enters the next level) */
function commitProgress() {
  if (!g.nextId || !g.world) return;
  try { const w = createWorld(MAPS[g.nextId], { seed: g.seed + 1, difficulty: g.difficulty, carry: nextCarry(), choices: g.progress?.choices ?? null }); store.write('auto', makeSave(w, 'level-start', { now: Date.now(), progress: g.progress })); }
  catch (e) { g.lockerNote = 'Progress could not be saved: ' + e.message; }
}
function buyModTier(id) {                                                                                   // PT-057: tier two of a mod you carry, bought with salvage at the Locker
  if (g.mode !== 'complete' || !g.lastEarn) return;
  const r = buyMod(g.progress, id, Object.keys(g.world?.player?.mods ?? {}));
  g.lockerNote = r.ok ? '' : r.reason === 'salvage' ? 'Not enough salvage.' : r.reason === 'bought' ? 'Already bought.' : '';
  if (r.ok) { g.progress = r.progress; commitProgress(); }
  ui.show('complete', completeData());
}
function buyUpgrade(track) {
  if (g.mode !== 'complete' || !g.lastEarn) return;
  const r = buy(g.progress, track);
  g.lockerNote = r.ok ? '' : r.reason === 'salvage' ? 'Not enough salvage.' : r.reason === 'maxed' ? 'Already fully upgraded.' : '';
  if (r.ok) { g.progress = r.progress; commitProgress(); }
  ui.show('complete', completeData());
}
/** PT-036, the end of a campaign: the finale's exit shows the epilogue (cards typed over the Gate's picture, then the tally of the whole campaign), THEN the intermission (rank, Locker, next map) as for any map.
 *  The records are already written when it starts (earn + commitProgress ran at the exit), so closing the game here loses nothing. */
/** the exit of a campaign's last map waits (at most FINALE_HOLD_S) while the strip is still saying something; any other map's exit never waits. Enter, Space, Esc, A or B ends the wait (g.holdSkip). */
function finaleHolds(dt) {
  const r = holdForComms({ finale: !!endingFor(CAMPAIGN, g.mapId, g.world.endStats?.dest), busy: ui.comq.busy, held: g.commsHold, dt, skip: g.holdSkip });
  g.commsHold = r.held; if (!r.hold) g.holdSkip = false; return r.hold;
}
function startEpilogue(ending) {
  g.input.releaseAll(); g.ending = { def: ending, seq: startSequence(), tallied: false }; g.mode = 'epilogue';
  g.artKey = null; ui.show('ending', { ending }); syncEpilogue(); audio.play(ending.coldOpen ? 'bell_strike' : 'gate_chord');          // PT-043: each campaign's own picture (syncEpilogue sets it, a card may name its own: PT-063)
}
/** show what the sequence says now: the card being typed, or (once the last card has been read) the tally */
function syncEpilogue() {
  const e = g.ending; if (!e) return;
  const v = viewSequence(e.seq, e.def.cards);
  { const key = (!v.tally && e.def.cards[v.index]?.art) || e.def.art || (e.def.campaign === 2 ? 'ending2' : 'ending1'); if (key !== g.artKey) { g.artKey = key; document.getElementById('ending-art').src = key === 'tower' ? coldTowerUrl() : key === 'title' ? titleArtUrl() : key === 'ending2' ? endingArt2Url() : endingArtUrl(); } }          // PT-063: the picture behind the card
  if (v.tally && e.def.coldOpen) { finishColdOpen(); return; }                                                                                   // PT-063: the cold open has no tally: on to the level, or back to the title for a replay
  if (v.tally && e.def.dev) { g.ending = null; quitToTitle(); return; }                              // PT-043: a dev map's draft epilogue ends at the title, with no tally of a campaign nobody finished
  if (v.tally) { if (!e.tallied) { e.tallied = true; ui.endingTally(tally(CAMPAIGN, g.progress, e.def.campaign), e.def); } } else ui.endingView(v);
}
/** Enter, Space, a click or the pad's A: finish the card, go on, or (in the tally) leave for the intermission */
function epiloguePress() {
  const e = g.ending; if (g.mode !== 'epilogue' || !e) return;
  if (e.tallied) { if (ui.canAct()) finishEpilogue(); return; }
  e.seq = pressSequence(e.seq, e.def.cards); syncEpilogue();
}
const epilogueSkip = () => { const e = g.ending; if (g.mode !== 'epilogue' || !e || e.tallied) return; e.seq = skipSequence(e.seq, e.def.cards); syncEpilogue(); };
/** PT-063 (R13): the cold open, as the epilogue's machinery (cards typed over a picture) with a different end: `then` runs when the last card has been read or Esc has skipped it */
function startColdOpen(then) { g.coldThen = then; startEpilogue({ campaign: 1, ...COLD_OPEN }); }
function finishColdOpen() {
  const then = g.coldThen; g.coldThen = null; g.ending = null; g.artKey = null;
  if (!settings.coldOpenSeen) { settings.coldOpenSeen = true; saveSettings(storage, settings); }
  if (then) then(); else quitToTitle();
}
function finishEpilogue() { g.ending = null; g.mode = 'complete'; ui.show('complete', completeData()); }
/** PT-063 (R13, workstream L): A STORY SCENE. The world stands still (no tick is stepped while one plays), the view's eye is the scene's camera (cinematics.js `cameraAt`), the HUD is gone, and the WALL clock runs the sequencer: the simulation is never slowed or sped for a scene.
 *  A scene plays the first time by default (`settings.cinematics`: once | always | off; `progress.cinematicsSeen`), Esc / Enter / Space / the pad's A or B skips it, and a skip runs the actions that had not run, so a skipped scene and a watched one leave the same world. */
function startCinematic(id, replay = false, after = null) {
  const scene = SCENE[id], w = g.world; if (!scene || !w || scene.map !== g.mapId || w.map.range) return;
  const how = settings.cinematics ?? 'once'; if (!replay && (how === 'off' || (how === 'once' && hasSeen(g.progress, id)))) return;
  cancelWheel(); g.input.releaseAll(); g.mode = 'cinematic'; g.mapOpen = false;
  g.cine = { scene, resolved: resolveScene(scene, w, (x, z) => floorAt(w, x, z)), st: startScene(scene), replay, after }; syncCinematic();
}
/** the camera, the subtitle and the black for the scene's clock now */
function syncCinematic() {
  const c = g.cine; if (!c || !g.view) return; g.view.setCinematic(cameraAt(c.resolved, c.st.t));
  const sub = subtitleAt(c.scene, c.st.t); ui.cine({ who: sub?.who ?? '', text: sub?.text ?? '', k: sub?.k ?? 1, fade: fadeAt(c.scene, c.st.t) });
}
function runSceneActions(list) { for (const a of list) { if (a.cue) audio.handleEvents([{ type: 'cue', name: a.cue }]); else if (a.shake) g.view?.handleEvents([{ type: 'shake', amount: a.shake }]); } }
function stepCinematic(dt) { const c = g.cine; if (!c) return; const r = advanceScene(c.scene, c.st, dt); c.st = r.state; runSceneActions(r.run); if (c.st.done) endCinematic(); else syncCinematic(); }
function skipCinematic() { const c = g.cine; if (g.mode !== 'cinematic' || !c) return; const r = skipScene(c.scene, c.st); c.st = r.state; runSceneActions(r.run); endCinematic(); }
/** PT-063: watch a scene again from the Record (the title only: no game is in hand there). It builds a world of the scene's map that nothing writes to, plays the scene on it, and goes back to the title; no save, no record and no setting changes. */
function replayScene(id) {
  if (id === 'cold-open') { if (g.mode === 'title' && settings.coldOpenSeen) startColdOpen(() => quitToTitle()); return; }                                       // the cold open is not a world: the epilogue's cards over the title picture, then the title again
  const sc = SCENE[id], map = sc && MAPS[sc.map]; if (g.mode !== 'title' || !sc || !map || !hasSeen(titleProgress(), id)) return;
  const keep = { difficulty: g.difficulty, seed: g.seed, progress: g.progress };
  startLevel({ world: createWorld(map, { seed: 1, difficulty: 'normal', choices: null }) }); startCinematic(id, true, 'title');
  if (g.cine) g.cine.keep = keep; else { quitToTitle(); Object.assign(g, { difficulty: keep.difficulty, seed: keep.seed, progress: keep.progress }); }
}
function endCinematic() {
  const c = g.cine; g.cine = null; g.view?.setCinematic(null); ui.cine(null); if (!c) return;
  if (!c.replay) { g.progress = markSeen(g.progress, c.scene.id); commitProgress(); }
  if (c.after === 'title') { quitToTitle(); if (c.keep) Object.assign(g, { difficulty: c.keep.difficulty, seed: c.keep.seed, progress: c.keep.progress }); return; }
  g.mode = 'playing'; requestLock();
}
function quitToTitle() {
  if (g.mode === 'playing' || g.mode === 'paused') logAttempt('quit');
  cancelWheel(); g.mapOpen = false; g.ending = null; g.cine = null; ui.cine(null); g.view?.dispose(); g.view = null; g.world = null; g.mode = 'title'; document.exitPointerLock?.();
  renderer.setRenderTarget(null); renderer.clear(); audio.newLevel(); ui.show('title', { canContinue: canContinue() });
}
function pause() { if (g.mode !== 'playing') return; cancelWheel(); audio.setMuffled(true); g.mode = 'paused'; g.input.releaseAll(); document.exitPointerLock?.(); ui.show('pause', { canLoad: hasQuick() }); }
/** PT-049 U2: Tab opens the Journal and PAUSES (no clock change for text, decided 2026-10-15): it opens on the Log when a message has not been read, otherwise on the Map; what was unread has now been put in front of the player */
function openJournal() {
  if (g.mode !== 'playing' || !g.world) return;
  cancelWheel(); audio.setMuffled(true); g.mode = 'paused'; g.input.releaseAll(); document.exitPointerLock?.();
  const log = journalLog({ maps: MAPS, progress: g.progress, mapId: g.mapId, unread: g.unread, seen: g.world.messagesSeen, manifest: CAMPAIGN }); g.journalTab = openTab(log.newCount); g.journalPins = log.pins;          // PT-054: the Log by level, with a pin on the Map page for every line said on this one
  ui.show('journal', { log, objectives: objectivesPage({ current: g.world.objective, history: g.objectives }), items: itemsPage({ player: g.world.player, upgrades: g.world.upgrades ?? g.progress.upgrades, found: g.progress.found?.[g.mapId] ?? [], map: MAPS[g.mapId] }), bestiary: bestiaryPage(g.progress.bestiary), mapName: MAPS[g.mapId]?.name ?? g.mapId, tab: g.journalTab }); g.unread = new Set(); ui.setUnread(0);
}
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
  if (g.lockFailed) return;
  if (automated()) { g.lockFailed = true; return; }                          // PT-050: a script-driven browser never asks for the pointer lock (it can hide and confine the real cursor; see lockpolicy.js)
  g.lockClick = fromClick;
  try { const p = canvas.requestPointerLock?.(); p?.catch?.(lockDenied); } catch { lockDenied(); }
}

/** One fixed simulation tick. Everything (keyboard, mouse, bot, test hook) reaches the sim through g.input. */
function stepOnce() {
  if (g.mode !== 'playing') return;
  { const wantToggle = settings.aimToggle && WEAPONS[g.world.player.weapon]?.kind !== 'melee'; if (g.aimToggleOn !== wantToggle) { g.input.setToggle('aim', wantToggle); g.aimToggleOn = wantToggle; } }      // with a melee weapon in hand Aim is the GUARD, and a guard is always a HOLD, whatever the aim-toggle setting says
  const cmd = g.input.sample();
  if (cmd.pause) { pause(); return; }
  if (cmd.map) { if (settings.journalPause !== false) { openJournal(); return; } g.mapOpen = !g.mapOpen; }                                            // UI-only toggle: the sim keeps running under the map
  try { g.view.beforeStep(g.world); step(g.world, cmd); }
  catch (e) {                                                                      // a corrupt world must end the session with a reason, not freeze the loop (audit R13)
    console.error(e); const aside = quarantineLoaded(); g.input.releaseAll(); document.exitPointerLock?.(); g.mode = 'title'; g.world = null; g.view?.dispose(); g.view = null; ui.show('title', { canContinue: canContinue(), note: 'The simulation stopped (' + String(e.message ?? e).slice(0, 80) + '). The save or level state was damaged.' + (aside ? ' The "' + aside + '" save was set aside; Continue will use the next one.' : '') }); return;
  }
  g.sinceLoad = (g.sinceLoad ?? 0) + 1;
  if (g.world.tick % 30 === 0 && !g.world.map.range) { const met = seenKinds(g.progress.bestiary, g.world.enemies); if (met.length && met !== g.progress.bestiary) g.progress = { ...g.progress, bestiary: met }; }          // PT-052 U3b: the Bestiary fills when a creature is first met
  const ev = drainEvents(g.world); if (ev.length) { if (g.world.map.range) rangeMeter.events(ev); g.view.handleEvents(ev); ui.events(ev); recordMessages(ev); audio.handleEvents(ev); rumbleEvents(ev); if (settings.captions) for (const e of ev) g.captions.push(captionFor(e, g.world.player), g.world.time); if (import.meta.env.DEV) { g.events.push(...ev); if (g.events.length > 4000) g.events.splice(0, g.events.length - 4000); } }
  if (g.world.status === 'dead') { cancelWheel(); g.mode = 'dying'; g.timer = 1.4; g.input.releaseAll(); document.exitPointerLock?.(); }
  else if (g.world.status === 'complete') { cancelWheel(); g.mode = 'ending'; g.timer = 0.9; g.commsHold = 0; g.holdSkip = false; g.input.releaseAll(); document.exitPointerLock?.(); }
  else { const sc = ev.find((e) => e.type === 'cinematic'); if (sc) startCinematic(sc.id); }                                                            // PT-063 (R13): a map's trigger named a story scene
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
  if (ui.screen === 'credits') { if (e.code === 'Escape' || e.code === 'Enter' || e.code === 'Space') { e.preventDefault(); closeCredits(); } return; }
  if (ui.screen === 'record') { if (e.code === 'Escape' || (g.mode === 'paused' && (g.input.bindings.pause || []).includes(e.code))) { e.preventDefault(); closeRecord(); } return; }          // the Record is read, not played: Esc (or the pause key) goes back to where it was opened from
  if (ui.screen === 'journal' && g.mode === 'paused' && (e.code === 'ArrowRight' || e.code === 'ArrowLeft')) { e.preventDefault(); ui.h.journalTab(tabAfter(g.journalTab, e.code === 'ArrowRight' ? 1 : -1)); return; }          // PT-052 U3: left and right turn the Journal's pages
  if (ui.screen === 'journal' && g.mode === 'paused' && (g.input.bindings.map || []).includes(e.code)) { e.preventDefault(); resume(); return; }          // the map key (Tab) that opened the Journal closes it; Esc and the pause key already do (next line)
  if (g.mode === 'paused' && (e.code === 'Escape' || (g.input.bindings.pause || []).includes(e.code))) { resume(); return; }         // any key bound to Pause also resumes
  if (g.mode === 'dead' && (e.code === 'Enter' || e.code === 'Space') && ui.canAct()) { ui.h.restartLevel(); return; }
  if (g.mode === 'ending' && (e.code === 'Escape' || e.code === 'Enter' || e.code === 'Space')) g.holdSkip = true;                  // ends the finale's wait for the last transmission (finaleHolds)
  if (g.mode === 'cinematic') { e.preventDefault(); if (e.code === 'Escape' || e.code === 'Enter' || e.code === 'Space') skipCinematic(); return; }                  // a story scene: any of the three skips it
  if (g.mode === 'epilogue') { if (e.code === 'Escape') { e.preventDefault(); epilogueSkip(); } else if ((e.code === 'Enter' || e.code === 'Space') && ui.canAct()) { e.preventDefault(); epiloguePress(); } return; }
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
  if (g.mode === 'ending' && (out.pressed.includes('Pad0') || out.pressed.includes('Pad1'))) g.holdSkip = true;                      // A or B ends the finale's wait for the last transmission (finaleHolds)
  if (g.mode === 'cinematic') { if (out.pressed.includes('Pad0') || out.pressed.includes('Pad1')) skipCinematic(); return; }
  if (g.mode === 'epilogue') { if (out.pressed.includes('Pad0') && ui.canAct()) epiloguePress(); else if (out.pressed.includes('Pad1')) epilogueSkip(); return; }        // the epilogue is one screen with one answer: A goes on, B skips
  if (ui.screen === 'credits') { if (out.pressed.includes('Pad0') || out.pressed.includes('Pad1')) closeCredits(); return; }
  if (ui.screen === 'record') {                                                                       // the Record (PT-037): up and down scroll it, A or B goes back
    const d = navRepeat.update(navDir(g.pad.down, out.move), dt), list = document.getElementById('record-list');
    if (list && d === 'up') list.scrollTop -= 90; else if (list && d === 'down') list.scrollTop += 90;
    if (out.pressed.includes('Pad0') || out.pressed.includes('Pad1')) closeRecord();
    return;
  }
  if (ui.screen === 'journal' && g.mode === 'paused') { const step = journalPadStep(out.pressed, settings.padBindings); if (step) { ui.h.journalTab(tabAfter(g.journalTab, step)); return; } }          // the bumpers turn the Journal's pages
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
  if (a === 'sprint' && !settings.sprintToggle) { g.padSprint = !g.padSprint; g.padSprintEngaged = Math.hypot(g.input.analog[0], g.input.analog[1]) > 0.25; return; }                // a click of the stick cannot be held while steering it: on a pad sprint is a toggle that ends when you let go of the stick
  g.input.press(a);
}
function padRelease(a) { if (a === 'weaponLast') return lastWeaponUp(); if (a === 'sprint' && !settings.sprintToggle) return; g.input.release(a); }
function pollPad(dt) {
  if (import.meta.env.DEV && g.manual) { g.input.setAnalog(0, 0); return; }                      // the dev test hook owns the clock: a controller that happens to be plugged into the machine (a stick at rest is never exactly zero) must not steer a bot or a still (found 2026-10-10: every real-game route stalled, the same commits that had passed)
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
  const moving = Math.hypot(out.move[0], out.move[1]) > 0.25; if (g.padSprint) { if (moving) g.padSprintEngaged = true; else if (g.padSprintEngaged) g.padSprint = false; }            // armed by the click, kept while the stick is still neutral, ended by letting go of it after it has been pushed
  const wantSprint = g.padSprint && moving;
  if (wantSprint && !g.padSprintHeld) { g.input.press('sprint'); g.padSprintHeld = true; } else if (!wantSprint && g.padSprintHeld) { g.input.release('sprint'); g.padSprintHeld = false; }
}
let lastRumble = 0;
function rumbleEvents(ev) {
  if (!g.padActive || !settings.gamepad.vibration || !g.gp?.vibrationActuator) return;
  for (const e of ev) { const r = rumbleFor(e); if (!r) continue; const t = performance.now(); if (r.ms < 60 && t - lastRumble < 70) continue; lastRumble = t; try { g.gp.vibrationActuator.playEffect('dual-rumble', { startDelay: 0, duration: r.ms, weakMagnitude: r.weak, strongMagnitude: r.strong }); } catch { /* not every pad can */ } }
}

// ---- frame loop --------------------------------------------------------------
/** a throw anywhere in a frame (errorlog.js guardedFrame): log it, put the game back on the title and say so plainly. A save that broke the game within its first three seconds of play is set aside, so Continue does not load it again (PT-050 H1). */
function crash(e, n) {
  console.error(e);
  const report = makeReport(e, { mode: g.mode, map: g.mapId, tick: g.world?.tick, difficulty: g.difficulty, seed: g.seed, repeats: n, slot: g.loadedSlot ?? '' });
  const list = appendReport(loadErrors(storage), report); saveErrors(storage, list);
  const aside = quarantineLoaded();
  try { g.input.releaseAll(); document.exitPointerLock?.(); cancelWheel(); } catch { /* best effort */ }
  g.mode = 'title'; g.world = null; try { g.view?.dispose(); } catch { /* best effort */ } g.view = null;
  ui.showCrash({ message: report.message, text: reportText(list.slice(-1)), halted: n >= 3, aside });
}
/** the save this session was loaded from, if it broke the game before it had proved itself (about three seconds of play): set aside as `<slot>.bad` and cleared, so the older one is used next */
function quarantineLoaded() {
  const slot = g.loadedSlot; if (!slot || (g.sinceLoad ?? 0) >= 180) return ''; g.loadedSlot = null;
  try { return store.quarantine(slot) ? slot : ''; } catch { return ''; }
}
function frameBody(now) {
  const raw = (now - g.last) / 1000, dt = Math.min(0.1, raw); g.last = now;                  // dt is clamped for the simulation's sake; the RECORDED frame time is not (a hitch must be visible in the stats)
  g.frameTimes.push(raw * 1000); if (g.frameTimes.length > 900) g.frameTimes.shift(); if (g.mode === 'playing') g.hist.add(raw * 1000);
  if (g.mode === 'playing' && g.view && settings.autoQuality !== false) { if (g.governor.sample(raw * 1000, raw)) resize(); } else g.governor.forget();                    // PT-071 R21: only frames of real play count
  pollPad(dt);
  let alpha = 0;
  if (g.mode === 'playing') {
    if (g.wheel.tick(now)) g.input.release('fire');                                   // the wheel opened (the last-weapon key has been held): stop shooting
    const open = g.wheel.open, target = open ? timeScaleFor(g.difficulty, settings.wheelSlow) : 1; g.timeScale = easeScale(g.timeScale, target, raw);        // Easy: frozen, Normal: 15%, Hard: 5% (owner decision D7); the clock the simulation is fed, never the simulation
    if (open !== g.wheelMuffled) { g.wheelMuffled = open; audio.setMuffled(open); }
    alpha = g.manual ? 1 : g.loop.advance(dt * g.timeScale * (g.devScale ?? 1)).alpha;                     // (g.devScale: the range's slow motion, F8: the real game, the real renderer, slowed, to watch a swing)
  }            // g.manual: the dev test hook owns the clock
  else if (g.mode === 'dying') { g.timer -= dt; if (g.timer <= 0) { logAttempt('dead'); g.mode = 'dead'; ui.show('dead', { canLoad: hasQuick() }); } }
  else if (g.mode === 'ending') {
    g.timer -= dt;
    if (g.timer <= 0 && (MAPS[g.mapId].range || MAPS[g.mapId].dev)) { const de = MAPS[g.mapId].devEnding; if (de && ENDINGS[de.ending] && g.world.endStats?.dest === de.dest) startEpilogue({ campaign: de.ending, ...ENDINGS[de.ending], dev: true }); else quitToTitle(); }      // the dev range has no scoring, salvage or next map: its exit just goes back to the title (PT-043: a dev map may show a draft epilogue first)
    else if (g.timer <= 0 && finaleHolds(dt)) { /* a campaign's last transmission is still being said: it finishes before the epilogue (round 1, Codex 4) */ }
    else if (g.timer <= 0) {
      g.nextId = nextMapId(CAMPAIGN, g.mapId, g.world.endStats?.dest, (id) => !!MAPS[id]);
      g.lastEarn = earn(g.progress, g.mapId, g.world.endStats, MAPS[g.mapId].par?.time); g.progress = g.lastEarn.progress; g.lockerNote = '';       // the rank, the salvage it pays (only the improvement over this map's best), the record
      commitProgress(); logAttempt('complete');
      const ending = endingFor(CAMPAIGN, g.mapId, g.world.endStats?.dest);                // a campaign's last map: the epilogue first (PT-036)
      if (ending) startEpilogue(ending); else { g.mode = 'complete'; ui.show('complete', completeData()); }
    }
  }
  else if (g.mode === 'epilogue' && g.ending) { g.ending.seq = stepSequence(g.ending.seq, g.ending.def.cards, dt); syncEpilogue(); }
  else if (g.mode === 'title' && ui.screen === 'credits') stepCredits(raw > 0.25 ? 0 : dt);
  else if (g.mode === 'cinematic') { if (!g.manual) stepCinematic(raw > 0.25 ? 0 : dt); }                                  // (g.manual: the dev test hook owns the clock)                                                       // (a long hitch, a background tab: the scene waits, it does not leap)
  audio.update(g.mode === 'playing' || g.mode === 'dying' || g.mode === 'cinematic' ? g.world : null, dt, MAPS[g.mapId]);
  const showMap = g.world && ((g.mapOpen && (g.mode === 'playing' || g.mode === 'dying')) || (ui.screen === 'journal' && g.journalTab === 'map')); mapCanvas.classList.toggle('hidden', !showMap); if (showMap) { const mdl = automapModel(g.world); if (ui.screen === 'journal' && g.journalPins?.length) mdl.pins = g.journalPins; drawAutomap(mapCanvas, mdl); }
  { const mm = settings.minimap ?? 'small'; miniCanvas.classList.toggle('hidden', !!showMap || g.mode === 'cinematic'); if (!showMap && g.world && g.mode === 'playing' && mm !== 'off') { if (!g.miniModel || g.miniN++ % MINIMAP.every === 0) { g.miniModel = automapModel(g.world); drawMinimap(miniCanvas, g.miniModel, mm); } } else g.miniModel = null; }          // PT-052 U4: the corner map, redrawn every few frames from the same model as the big one
  if (g.view && g.world) { g.view.render(g.world, g.mode === 'playing' ? alpha : 1, dt); ui.hud(g.world, g.mode !== 'title' && g.mode !== 'cinematic'); ui.captions(settings.captions && g.mode === 'playing' ? g.captions.lines(g.world.time) : []); } else { ui.hud(null, false); ui.captions([]); }
  updateWheelUI(); ui.useHint(g.mode === 'playing' && g.world ? doorPrompt(g.world) : ''); rangePanel();
}
/** the weapons range's readout (PT-016): shown only while a range map is being played */
function rangePanel() {
  const w = g.world, on = !!(w && w.map.range && g.mode === 'playing' && rangeEl); rangeEl?.classList.toggle('hidden', !on); if (!on) return;
  rangeMeter.update(w); rangeEl.textContent = rangeMeter.lines(w).join('\n') + `\nTIME ${Math.round((g.devScale ?? 1) * 100)}%   (F8: 100 / 50 / 25 / 10)`;
}
/** what pressing Use would do right now, as text ('' = nothing): a closed door says how to open it, a locked one says what it needs. Secret panels never advertise themselves. */
function doorPrompt(w) {
  const t = useTarget(w); if (t?.mirrorId) return `[${g.padActive ? padGlyph(settings.padBindings.use?.[0], g.pad.family) : prettyCode(g.input.bindings.use?.[0])}] turn the mirror`;
  if (t?.chimeProp) return `[${g.padActive ? padGlyph(settings.padBindings.use?.[0], g.pad.family) : prettyCode(g.input.bindings.use?.[0])}] ${t.chimeProp.kind === 'chime' ? 'strike the chime' : 'hear the tree'}`;          // PT-038: a chime or the tree
  if (t?.interlock && t.target === 0 && t.open <= 0.05 && lockBusy(w, t)) return t.want ? 'The airlock is cycling: it opens by itself' : `[${g.padActive ? padGlyph(settings.padBindings.use?.[0], g.pad.family) : prettyCode(g.input.bindings.use?.[0])}] the airlock is cycling: it opens by itself when the air has settled`;
  if (t?.breath && !t.secret) return t.open > 0.05 ? '' : 'It opens when the ship breathes in';
  if (t?.soundlock && !t.secret && t.target !== 1 && t.open <= 0.05 && w.noise && w.time - w.noise.t < t.soundlock.quiet) return 'The lock is listening: be quiet';
  if (!t || t.secret || t.target === 1 || t.open > 0.05) return '';
  if (t.key && !w.player.keys.includes(t.key)) return `Locked: needs the ${KEYS[t.key]?.name.toLowerCase() || 'key'}`;
  return `[${g.padActive ? padGlyph(settings.padBindings.use?.[0], g.pad.family) : prettyCode(g.input.bindings.use?.[0])}] open`;
}
resize(); ui.show('title', { canContinue: canContinue(), note: settingsNotes.join(' ') });
const frame = guardedFrame({ body: frameBody, schedule: (f) => requestAnimationFrame(f), onCrash: crash }).frame;      // the next frame is scheduled BEFORE the body runs: no throw can end the page loop (errorlog.js)
requestAnimationFrame(frame);

if (import.meta.env.DEV) {                                                 // dev-only title-screen level picker (index.html #dev-levels): any map, any difficulty, no need to play Episode 1 first
  const box = document.getElementById('dev-levels'), sel = document.getElementById('dev-map'), diff = document.getElementById('dev-diff'), go = document.getElementById('dev-go');
  if (box && sel && diff && go) {
    devMapsReady.then(() => { sel.innerHTML = Object.keys(MAPS).sort((a, b) => (MAPS[b].range ? 1 : 0) - (MAPS[a].range ? 1 : 0) || a.localeCompare(b)).map((id) => `<option value="${id}">${id} ${MAPS[id].name ?? ''}</option>`).join(''); box.classList.remove('hidden'); });      // the range first
    go.onclick = () => { g.progress = sanitizeProgress({ salvage: Number(document.getElementById('dev-salvage')?.value) || 0 }); startLevel({ mapId: sel.value, difficulty: diff.value, seed: 1 + Math.floor(Math.random() * 1e6) }); };      // a dev run starts with the salvage typed in the box (to try the Locker without playing ten maps)
  }
}
if (import.meta.env.DEV) addEventListener('keydown', (e) => { if (e.code === 'F8' && g.world?.map.range) { e.preventDefault(); const steps = [1, 0.5, 0.25, 0.1], i = steps.indexOf(g.devScale ?? 1); g.devScale = steps[(i + 1) % steps.length]; } });      // the range's slow motion (PT-020): watch a swing at a tenth of its speed in the real game
if (import.meta.env.DEV) import('./testhook.js').then((m) => m.installTestHook({ g, MAPS, audio, store, startLevel, stepOnce, pause, resume, quickSave, quickLoad, renderer, ui, TICK, startEpilogue, epiloguePress, epilogueSkip, syncEpilogue, finishEpilogue, openRecord, closeRecord, startCinematic, stepCinematic, skipCinematic }));
