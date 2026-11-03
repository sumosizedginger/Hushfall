// PT-083 phase 1: the mouse moves the view in the frame the hand moves, the shot goes where the view is, and every camera motion answers to the comfort settings.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { InputState } from '../src/engine/input.js';
import { FixedLoop } from '../src/engine/loop.js';
import { TICK, PLAYER } from '../src/engine/defs.js';
import { createWorld, step, drainEvents } from '../src/engine/world.js';
import { parseMap } from '../src/engine/mapformat.js';
import { GameView, comfortFor } from '../src/render/view.js';
import { askLock } from '../src/game/lockpolicy.js';
import { sanitizeSettings, defaultSettings, fovAcross, fovLabel } from '../src/game/settings.js';
import { texProxy, stubRenderer } from './stubs.js';
import { ROOT } from './helpers.js';

const quay = () => parseMap(JSON.parse(fs.readFileSync(path.join(ROOT, 'maps', 'C1E1M01.json'), 'utf8')));
const cmdOf = (over = {}) => ({ move: [0, 0], yaw: 0, pitch: 0, fire: false, aim: false, sprint: false, use: false, weapon: null, weaponStep: 0, map: false, ...over });
function viewOf(look = {}) { const map = quay(), w = createWorld(map, { seed: 1, difficulty: 'normal' }), view = new GameView(stubRenderer(), texProxy(), map, w); view.setSize(640, 360, 640); view.setLook({ outline: true, paint: true, fov: 70, brightness: 1, ...look }); return { w, view }; }

test('C1: a mouse movement with no tick turns the camera by exactly that amount in the same frame', () => {
  const { w, view } = viewOf(), input = new InputState();
  view.beforeStep(w); step(w, cmdOf()); view.render(w, 0.5, TICK, input.pendingLook(0.5));
  const before = { y: view.cam.rotation.y, x: view.cam.rotation.x };
  input.addMouse(100, -50, 0.002);                                            // no tick runs
  view.render(w, 0.5, 0, input.pendingLook(0.5));
  assert.ok(Math.abs(view.cam.rotation.y - before.y - (-0.2)) < 1e-9, 'yaw follows the hand now');
  assert.ok(Math.abs(view.cam.rotation.x - before.x - 0.1) < 1e-9, 'pitch follows the hand now');
});

test('C1: the view does not jump when the tick takes the look over, and the sim holds the same angle the camera showed', () => {
  const { w, view } = viewOf(), input = new InputState();
  input.addMouse(73, 0, 0.002); view.render(w, 0.9, 0, input.pendingLook(0.9)); const shown = view.cam.rotation.y;
  view.beforeStep(w); step(w, input.sample());                               // the tick the shot would be fired in
  assert.ok(Math.abs(w.player.yaw - shown) < 1e-9, 'the sim faces where the camera was drawn');
  view.render(w, 0.05, 0, input.pendingLook(0.05));
  assert.ok(Math.abs(view.cam.rotation.y - shown) < 1e-9, 'no jump across the tick');
});

test('C1: the held turn keys stay smooth between ticks and land exactly on the tick', () => {
  const input = new InputState(); input.press('turnLeft');
  const half = input.pendingLook(0.5).yaw, full = input.pendingLook(1).yaw, cmd = input.sample();
  assert.ok(half > 0 && Math.abs(half * 2 - full) < 1e-12); assert.ok(Math.abs(full - cmd.yaw) < 1e-12);
});

test('C1: a pending look cannot tilt the view past what the sim allows', () => {
  const { w, view } = viewOf(); w.player.pitch = 1.29;
  view.render(w, 0, 0, { yaw: 0, pitch: 5 }); assert.ok(view.cam.rotation.x <= 1.3 + 1e-9 + Math.abs(w.player.kick));
});

test('C2: raw mouse is asked for first, a browser that cannot gets the plain lock, a refused re-lock is reported', async () => {
  const calls = []; let denied = 0;
  const say = (r) => ({ requestPointerLock(o) { calls.push(o ?? null); return r(o); } });
  askLock(say(() => undefined), true, () => denied++); assert.deepEqual(calls.splice(0), [{ unadjustedMovement: true }], 'an old browser that returns nothing is left alone');
  askLock(say((o) => (o ? Promise.reject(Object.assign(new Error('x'), { name: 'NotSupportedError' })) : undefined)), true, () => denied++);
  await new Promise((r) => setTimeout(r)); assert.deepEqual(calls.splice(0), [{ unadjustedMovement: true }, null], 'no raw mode here: the plain lock'); assert.equal(denied, 0);
  askLock(say(() => Promise.reject(Object.assign(new Error('x'), { name: 'SecurityError' }))), true, () => denied++);
  await new Promise((r) => setTimeout(r)); assert.equal(calls.length, 1); assert.equal(denied, 1, 'too soon after Esc: reported, not retried');
  calls.length = 0; askLock(say(() => undefined), false, () => denied++); assert.deepEqual(calls, [null], 'the setting off: the plain lock');
});

test('C3: the new mouse settings are kept, repaired and given defaults on an older settings file', () => {
  const d = defaultSettings(); assert.equal(d.rawMouse, true); assert.equal(d.mouseInvertY, false); assert.equal(d.adsSens, 1); assert.equal(d.headBob, 'full');
  const old = { ...d }; delete old.rawMouse; delete old.adsSens; delete old.headBob; delete old.mouseInvertY;
  const a = sanitizeSettings(old).settings; assert.equal(a.rawMouse, true); assert.equal(a.adsSens, 1); assert.equal(a.headBob, 'full'); assert.equal(a.mouseInvertY, false);
  const b = sanitizeSettings({ ...d, adsSens: 99, headBob: 'wobble', mouseInvertY: true, rawMouse: false }).settings; assert.equal(b.adsSens, 1.6); assert.equal(b.headBob, 'full'); assert.equal(b.mouseInvertY, true); assert.equal(b.rawMouse, false);
});

test('C4: the field of view is told as what it is: 70 tall is about 102 across at 16:9', () => {
  assert.equal(fovAcross(70, 16 / 9), 102); assert.ok(fovAcross(70, 21 / 9) > fovAcross(70, 16 / 9)); assert.ok(/70° tall, 102° across/.test(fovLabel(70, 16 / 9)));
});

test('C5: with reduced motion nothing moves the camera but the player: no bob, no widening of the view, a still roll', () => {
  const { w, view } = viewOf({ reducedMotion: true }), ys = new Set(), fovs = new Set();
  for (let i = 0; i < 150; i++) {
    view.beforeStep(w); step(w, cmdOf({ move: [0, 1], sprint: true })); view.handleEvents(drainEvents(w)); view.render(w, 0.5, TICK);
    if (i > 30) { ys.add(Math.round((view.cam.position.y - view.eyeBase) * 1e4)); fovs.add(Math.round(view.cam.fov * 100)); }
  }
  assert.ok(Math.hypot(w.player.vx, w.player.vz) > PLAYER.speed, 'the player is sprinting'); assert.equal(ys.size, 1, 'the eye stays at one height over the floor'); assert.equal(fovs.size, 1, 'the view does not widen');
  view.dispose();
});

test('C5: the head-bob setting scales the bob and only the bob', () => {
  const range = (headBob) => { const { w, view } = viewOf({ headBob }); let lo = 9, hi = -9; for (let i = 0; i < 150; i++) { view.beforeStep(w); step(w, cmdOf({ move: [0, 1] })); drainEvents(w); view.render(w, 0.5, TICK); if (i > 30) { const y = view.cam.position.y - view.eyeBase; lo = Math.min(lo, y); hi = Math.max(hi, y); } } view.dispose(); return hi - lo; };
  const full = range('full'), gentle = range('gentle'), off = range('off'); assert.ok(full > 0.02, 'it bobs: ' + full); assert.ok(Math.abs(gentle - full / 2) < 0.01, 'gentle is half'); assert.ok(off < 1e-6, 'off is still');
  assert.deepEqual(comfortFor({ reducedMotion: true, headBob: 'full' }).bob, 0, 'reduced motion wins');
});

test('C6: a click that lands between two ticks fires on the next tick, at any frame rate from 30 to 240', () => {
  for (const hz of [30, 60, 75, 120, 144, 240]) {
    const input = new InputState(); let fired = 0, ticks = 0; const loop = new FixedLoop(() => { ticks++; if (input.sample().fire) fired++; });
    for (let i = 0; i < 12; i++) loop.advance(1 / hz);
    const at = ticks; input.press('fire'); input.release('fire');            // down and up inside one frame
    for (let i = 0; i < Math.ceil(hz / 15); i++) loop.advance(1 / hz);
    assert.equal(fired, 1, hz + ' Hz: the tap fires once'); assert.ok(ticks > at, hz + ' Hz: a tick ran');
  }
});
