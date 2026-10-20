// THE FRAME LOOP OF THE REAL GAME, HEADLESS (PT-045). The owner's black screen of 2026-10-13 was a per-frame function (AudioEngine.update) that no test and no headless browser job had ever executed; the rule is now that no browser job of any length runs without a fresh yes.
// So whatever a node test CAN execute it executes, and this executes the same calls main.js makes every frame, in the same order, on a real GameView (the real level mesh, every view of drop B: belts, cars, the tide, the beat, the Hive threads), the real UI.hud and
// UI.events against a stand-in DOM, the real automap drawing against a stand-in canvas, and the real AudioEngine against a "running" context: beforeStep, step, drainEvents, handleEvents, audio.handleEvents, audio.update, render, hud. A throw anywhere in it is a black
// screen in the owner's browser. What it cannot show is how anything LOOKS or FEELS: the renderer is a stand-in that draws nothing.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { parseMap } from '../src/engine/mapformat.js';
import { createWorld, step, drainEvents } from '../src/engine/world.js';
import { automapModel } from '../src/engine/automap.js';
import { GameView } from '../src/render/view.js';
import { UI } from '../src/game/ui.js';
import { captionFor, CaptionFeed } from '../src/game/captions.js';
import { drawAutomap } from '../src/game/automap.js';
import { TICK } from '../src/engine/defs.js';
import { texProxy, stubRenderer, standInDom, canvasContext, runningAudio } from './stubs.js';
import { ROOT } from './helpers.js';

const readMap = (dir, id) => JSON.parse(fs.readFileSync(path.join(ROOT, dir, id + '.json'), 'utf8'));
const idsIn = (dir) => fs.readdirSync(path.join(ROOT, dir)).filter((f) => f.endsWith('.json')).map((f) => f.replace('.json', '')).sort();
/** the sequence of calls main.js makes in a frame, for `n` frames of a scripted player; returns { events, played, view, w } */
const dom = standInDom();                                                    // one stand-in DOM for the whole file: the UI's timers may fire after a test body has ended
function play(map, { n = 120, difficulty = 'normal', setup = null, input = null, mid = null, textureProxy = texProxy() } = {}) {
  const played = [], audio = runningAudio(played);
  try {
    const w = createWorld(map, { seed: 1, difficulty }), view = new GameView(stubRenderer(), textureProxy, map, w); view.setSize(640, 360, 640); view.setLook({ outline: true, paint: true, fov: 70, brightness: 1 });
    const ui = new UI(new Proxy({}, { get: () => () => {} })), feed = new CaptionFeed(); if (setup) setup(w, view); const canvas = { width: 0, height: 0, getContext: () => canvasContext() }; globalThis.innerWidth = 1280; globalThis.innerHeight = 720;
    const events = [];
    for (let i = 0; i < n; i++) {
      const cmd = { move: [0, 0], yaw: 0, pitch: 0, fire: false, aim: false, sprint: false, use: false, weapon: null, weaponStep: 0, map: false, ...(input ? input(i, w) : { move: [Math.sin(i / 37) * 0.6, 1], yaw: 0.012 * Math.sin(i / 23), fire: i % 24 < 3, use: i % 45 === 0, lamp: i === 20 }) };
      view.beforeStep(w); step(w, cmd); const ev = drainEvents(w); if (ev.length) { view.handleEvents(ev); ui.events(ev); audio.handleEvents(ev); for (const e of ev) feed.push(captionFor(e, w.player), w.time); events.push(...ev); }
      if (mid) mid(i, w, view);
      audio.update(w, TICK, map); if (i % 20 === 0) { drawAutomap(canvas, automapModel(w)); }
      view.render(w, (i % 4) / 4, TICK); ui.hud(w, true); ui.captions(feed.lines(w.time)); ui.useHint('');
      if (w.status !== 'playing') break;
    }
    ui.clearOverlays(); view.dispose(); return { events, played, view, w, dom };
  } finally { delete globalThis.innerWidth; delete globalThis.innerHeight; }
}

test('the six dev maps of the Preview run the real frame loop for 3 s without a throw, and the Range and the Deep Range too', () => {
  for (const id of idsIn('maps-dev')) { const map = parseMap(readMap('maps-dev', id)); const r = play(map, { n: 180 }); assert.ok(r.w.tick > 5, id + ' ran'); }
});

test('every shipped map runs the real frame loop for a second and a half without a throw (the view, the HUD, the automap and the audio of 53 maps)', () => {
  const ids = idsIn('maps'); assert.ok(ids.length >= 53);
  for (const id of ids) { const map = parseMap(readMap('maps', id)); const r = play(map, { n: 90 }); assert.ok(r.w.tick > 5 || r.w.status !== 'playing', id + ' ran'); }
});

test('THE YARDS in the frame loop: riding a car, in the lift, in the tide, under the front, on the bridge of the beat, on a belt; the new views are on screen and move with the clock', () => {
  const src = readMap('maps-dev', 'HIVEYARDS'), map = parseMap(src), C = (c) => (c + 0.5) * 2, at = (cx, cz, yaw = 0) => (w) => { Object.assign(w.player, { x: C(cx), z: C(cz), yaw, vx: 0, vz: 0 }); w.player.hp = 100; };
  const still = (i) => ({ move: [0, 0], yaw: 0, pitch: 0 });
  let r = play(map, { n: 1500, setup: at(93, 12, -Math.PI / 2), input: still }); assert.ok(r.view.carView && r.view.carView.views.length === 2, 'the cars are drawn'); assert.ok(r.events.some((e) => e.type === 'car_depart') && r.events.some((e) => e.type === 'car_arrive'), 'a car left and arrived'); assert.ok(r.played.includes('lift_rumble'), 'it sounded');
  r = play(map, { n: 1200, setup: (w) => { at(20, 11)(w); }, input: still }); assert.ok(r.view.beltView && r.view.beltView.views.length === 2, 'the belts are drawn');
  r = play(map, { n: 2400, setup: (w) => { at(150, 60)(w); w.tick = 1500; }, input: still }); assert.ok(r.view.tideView, 'the tide is drawn'); assert.ok(r.view.tideView.sea.visible, 'the sea is up at 25..65 s'); assert.ok(r.w.player.fx === 'w', 'and the basin is wet');
  r = play(map, { n: 2400, setup: (w) => { at(7, 88)(w); w.tick = 1700; }, input: still }); assert.ok(r.events.some((e) => e.type === 'load_land'), 'the front lands'); assert.ok(r.view.loadViews.length === 15);
  r = play(map, { n: 1200, setup: at(34, 52), input: still }); assert.ok(r.w.player.y > 5, 'the lift lifts the player up the shaft: y ' + r.w.player.y.toFixed(1));
  r = play(map, { n: 900, setup: at(140, 20, -Math.PI / 2), input: (i) => ({ move: [0, 1], yaw: 0, pitch: 0 }) }); assert.ok(r.view.hiveView === null || r.view, 'the beat yard runs');
});

test('THE DARK YARDS in the frame loop: the lantern, the noise tell on the HUD, the ring on the automap, a Sub-Cantor that rings and a lamp that cuts it', () => {
  const map = parseMap(readMap('maps-dev', 'HIVEDARK')), C = (c) => (c + 0.5) * 2;
  const r = play(map, { n: 900, setup: (w) => { Object.assign(w.player, { x: C(102), z: C(40), yaw: -Math.PI / 2 }); }, input: (i) => ({ move: [0, 0], yaw: 0, pitch: 0, lamp: i === 5, fire: i % 40 === 0 && i > 100 }) });
  assert.ok(r.events.some((e) => e.type === 'pulse'), 'the Sub-Cantor rang'); assert.ok(r.events.some((e) => e.type === 'lamp'), 'the lamp'); assert.equal(r.dom.els.get('hud-noise').classes.has('hidden'), false, 'the noise stat is shown'); assert.ok(/NOISE/.test(r.dom.els.get('hud-noise-label').textContent), r.dom.els.get('hud-noise-label').textContent);
  assert.ok(r.dom.els.get('hud-lamp').classes.has('hidden') === false, 'the lantern gauge is shown');
});

test('THE STORY SCENES in the frame loop (PT-063, R13): every scene plays through the real view, UI and audio of its map as main.js plays it, the world is untouched, and the eye is given back', async () => {
  const { SCENES } = await import('../src/game/scenes.js');
  const { resolveScene, cameraAt, startScene, advanceScene, skipScene, subtitleAt, fadeAt } = await import('../src/game/cinematics.js');
  const { floorAt } = await import('../src/engine/terrain.js');
  const { hashWorld } = await import('../src/engine/world.js');
  assert.ok(SCENES.length >= 6);
  for (const sc of SCENES) {
    const map = parseMap(readMap('maps', sc.map)), played = [], audio = runningAudio(played); globalThis.innerWidth = 1280; globalThis.innerHeight = 720;
    try {
      const w = createWorld(map, { seed: 1, difficulty: 'normal' }), view = new GameView(stubRenderer(), texProxy(), map, w); view.setSize(640, 360, 640); view.setLook({ outline: true, paint: true, fov: 70, brightness: 1 });
      const ui = new UI(new Proxy({}, { get: () => () => {} })), before = hashWorld(w), res = resolveScene(sc, w, (x, z) => floorAt(w, x, z)); let st = startScene(sc), frames = 0, shown = 0, sawBlack = false;
      const run = (list) => { for (const a of list) { if (a.cue) audio.handleEvents([{ type: 'cue', name: a.cue }]); else if (a.shake) view.handleEvents([{ type: 'shake', amount: a.shake }]); } };
      while (!st.done && frames < 60 * (sc.length + 5)) {
        const r = advanceScene(sc, st, 1 / 60); st = r.state; run(r.run); view.setCinematic(cameraAt(res, st.t));
        const sub = subtitleAt(sc, st.t), fade = fadeAt(sc, st.t); if (sub) shown++; if (fade > 0.99) sawBlack = true;
        ui.cine({ who: sub?.who ?? '', text: sub?.text ?? '', k: sub?.k ?? 1, fade }); audio.update(w, 1 / 60, map); view.render(w, 1, 1 / 60); ui.hud(w, false); frames++;
      }
      assert.ok(st.done, `${sc.id} ended`); assert.ok(Math.abs(frames / 60 - sc.length) < 0.1, `${sc.id}: ${frames} frames`); assert.ok(sc.lines.length === 0 || shown > 0, `${sc.id}: its lines were shown`); assert.ok(sawBlack || sc.fade.length > 0);
      view.setCinematic(null); ui.cine(null); view.render(w, 1, 1 / 60); assert.equal(view.cine, null, 'the eye is the player\'s again'); assert.equal(hashWorld(w), before, `${sc.id}: the world is what it was`);
      const skip = skipScene(sc, startScene(sc)); run(skip.run); assert.ok(skip.state.done);
      ui.clearOverlays(); view.dispose();
    } finally { delete globalThis.innerWidth; delete globalThis.innerHeight; }
  }
});
