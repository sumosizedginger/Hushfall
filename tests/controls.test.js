// Sprint, aim-down-sights, accuracy, toggle mode, and the v1 -> v2 save migration that they required.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createWorld, step, drainEvents, hashWorld } from '../src/engine/world.js';
import { InputState, DEFAULT_BINDINGS } from '../src/engine/input.js';
import { makeSave, parseSave, loadWorld, SAVE_VERSION } from '../src/engine/save.js';
import { PLAYER, WEAPONS } from '../src/engine/defs.js';
import { defaultSettings, sanitizeSettings, SETTINGS_VERSION } from '../src/game/settings.js';
import { loadMap, mapLoader } from './helpers.js';

const idle = () => ({ move: [0, 0], yaw: 0, pitch: 0, fire: false, aim: false, sprint: false, use: false, weapon: null });
/** open floor, facing east, no enemies interfering */
function openWorld(seed = 1) {
  const w = createWorld(loadMap(), { seed });
  for (const e of w.enemies) e.state = 'dead';
  w.player.x = 12; w.player.z = 18; w.player.yaw = -Math.PI / 2;      // hall interior, facing +x
  return w;
}
/** distance covered in `ticks` ticks with the given command */
function travel(cmd, ticks = 60, yaw = -Math.PI / 2) {
  const w = openWorld(); w.player.yaw = yaw; const x0 = w.player.x, z0 = w.player.z;
  for (let i = 0; i < ticks; i++) step(w, { ...idle(), ...cmd });
  return { d: Math.hypot(w.player.x - x0, w.player.z - z0), w };
}

test('walking is faster than before and sprinting is faster still', () => {
  const walk = travel({ move: [0, 1] }, 45), sprint = travel({ move: [0, 1], sprint: true }, 45);
  assert.ok(walk.d > 3.5, 'walk covers ground: ' + walk.d);
  assert.ok(sprint.d / walk.d > 1.35, `sprint/walk = ${(sprint.d / walk.d).toFixed(2)}`);
});

test('sprint only boosts forward motion: strafing, backing up and standing still are not faster', () => {
  const strafe = travel({ move: [1, 0] }, 45), strafeSprint = travel({ move: [1, 0], sprint: true }, 45);
  assert.ok(Math.abs(strafe.d - strafeSprint.d) < 1e-9, 'pure strafe ignores sprint');
  const back = travel({ move: [0, -1] }, 45), backSprint = travel({ move: [0, -1], sprint: true }, 45);
  assert.ok(Math.abs(back.d - backSprint.d) < 1e-9, 'backing up ignores sprint');
  const still = travel({ sprint: true }, 30); assert.ok(still.d < 1e-9); assert.equal(still.w.player.sprinting, false);
});

test('aiming slows movement; aim wins over sprint', () => {
  const walk = travel({ move: [0, 1] }, 60), ads = travel({ move: [0, 1], aim: true }, 60), both = travel({ move: [0, 1], aim: true, sprint: true }, 60);
  assert.ok(ads.d < walk.d * 0.75, `ads ${ads.d.toFixed(2)} vs walk ${walk.d.toFixed(2)}`);
  assert.equal(both.w.player.sprinting, false, 'sprint is cancelled while aiming');
  assert.ok(Math.abs(both.d - ads.d) < 1e-9, 'aim+sprint moves like aim');
});

test('ADS blends up over adsTime and back down when released', () => {
  const w = openWorld(); const ticks = Math.ceil(PLAYER.adsTime * 60);
  for (let i = 0; i < Math.floor(ticks / 2); i++) step(w, { ...idle(), aim: true });
  assert.ok(w.player.ads > 0.3 && w.player.ads < 0.8, 'mid-blend ' + w.player.ads);
  for (let i = 0; i < ticks; i++) step(w, { ...idle(), aim: true });
  assert.equal(w.player.ads, 1);
  for (let i = 0; i < ticks + 2; i++) step(w, idle());
  assert.equal(w.player.ads, 0);
});

test('no firing while sprinting; a short weapon-raise delay after sprint ends', () => {
  const w = openWorld();
  for (let i = 0; i < 30; i++) step(w, { ...idle(), move: [0, 1], sprint: true, fire: true });
  assert.equal(w.stats.shots, 0, 'sprint blocks fire');
  // release sprint but keep firing: must wait out PLAYER.sprintRecover
  let firstShotTick = null;
  for (let i = 0; i < 60 && firstShotTick === null; i++) { step(w, { ...idle(), move: [0, 1], fire: true }); if (w.stats.shots) firstShotTick = i; }
  assert.ok(firstShotTick >= Math.floor(PLAYER.sprintRecover * 60) - 1, 'recovery respected, fired at +' + firstShotTick);
  assert.ok(firstShotTick < 30, 'but not forever');
});

test('accuracy: ADS shots group tightly, hip shots spread, and movement widens the hip cone', () => {
  const spread = (opts) => {
    const angles = [];
    for (let seed = 1; seed <= 40; seed++) {
      const w = openWorld(seed);
      if (opts.aim) for (let i = 0; i < 20; i++) step(w, { ...idle(), aim: true });
      const before = w.projectiles.length;
      step(w, { ...idle(), aim: !!opts.aim, fire: true, move: opts.move || [0, 0] });
      const q = w.projectiles[before]; angles.push(Math.atan2(-q.vx, -q.vz) - w.player.yaw);
    }
    const mean = angles.reduce((a, b) => a + b, 0) / angles.length;
    return Math.sqrt(angles.reduce((a, b) => a + (b - mean) ** 2, 0) / angles.length);
  };
  const hip = spread({}), ads = spread({ aim: true });
  assert.ok(ads < hip * 0.25, `ads sd ${ads.toFixed(4)} vs hip sd ${hip.toFixed(4)}`);
  assert.ok(hip > WEAPONS.flare.spread.hip * 0.3, 'hip fire really does scatter');
});

test('spread is deterministic: same seed => identical projectile; different seeds differ', () => {
  const shot = (seed) => { const w = openWorld(seed); step(w, { ...idle(), fire: true }); return JSON.stringify(w.projectiles[0]); };
  assert.equal(shot(5), shot(5)); assert.notEqual(shot(5), shot(6));
});

test('controls do not break determinism (stance-heavy scripted run hashes identically twice)', () => {
  const run = () => {
    const w = createWorld(loadMap(), { seed: 21 });
    for (let t = 0; t < 900; t++) step(w, { ...idle(), move: [t % 120 < 40 ? 1 : 0, t % 200 < 150 ? 1 : 0], sprint: t % 300 < 120, aim: t % 300 >= 200, fire: t % 45 === 0, yaw: (t % 90 < 30) ? 0.02 : 0 });
    return hashWorld(w);
  };
  assert.equal(run(), run());
});

test('input: sprint/aim have default bindings and reach the command through the device path', () => {
  assert.deepEqual(DEFAULT_BINDINGS.sprint, ['ShiftLeft', 'ShiftRight']); assert.deepEqual(DEFAULT_BINDINGS.aim, ['Mouse2']);
  const i = new InputState(); i.keyDown('ShiftLeft'); i.keyDown('Mouse2');
  const c = i.sample(); assert.equal(c.sprint, true); assert.equal(c.aim, true);
  i.keyUp('ShiftLeft'); i.keyUp('Mouse2'); const c2 = i.sample(); assert.equal(c2.sprint, false); assert.equal(c2.aim, false);
});

test('input: toggle mode latches aim, and toggled sprint ends when forward is released', () => {
  const i = new InputState(); i.setToggle('aim', true); i.setToggle('sprint', true);
  i.keyDown('Mouse2'); i.keyUp('Mouse2'); assert.equal(i.sample().aim, true); assert.equal(i.sample().aim, true, 'stays on');
  i.keyDown('Mouse2'); i.keyUp('Mouse2'); assert.equal(i.sample().aim, false, 'second press turns it off (no ghost tick)');
  i.keyDown('KeyW'); i.keyDown('ShiftLeft'); i.keyUp('ShiftLeft'); assert.equal(i.sample().sprint, true); assert.equal(i.sample().sprint, true);
  i.keyUp('KeyW'); assert.equal(i.sample().sprint, false, 'stopping cancels toggled sprint');
  i.setToggle('aim', false); i.keyDown('Mouse2'); assert.equal(i.sample().aim, true); i.keyUp('Mouse2'); assert.equal(i.sample().aim, false, 'hold mode restored');
});

test('save v1 (before sprint/ADS) migrates to v2 and the world plays on without NaN', () => {
  const w = createWorld(loadMap(), { seed: 3 });
  for (let t = 0; t < 200; t++) step(w, { ...idle(), move: [0, 1] });
  const s = makeSave(w, 'mid-level');
  s.version = 1; for (const k of ['ads', 'sprint', 'recover', 'sprinting']) delete s.world.player[k];      // exactly what a v1 file looked like
  const r = parseSave(JSON.stringify(s)); assert.equal(r.ok, true, r.detail); assert.equal(r.migratedFrom, 1); assert.equal(r.save.version, SAVE_VERSION);
  const loaded = loadWorld(r.save, mapLoader).world;
  assert.equal(loaded.player.ads, 0); assert.equal(loaded.player.sprinting, false);
  for (let t = 0; t < 120; t++) step(loaded, { ...idle(), move: [0, 1], sprint: true });
  assert.ok(Number.isFinite(loaded.player.x) && Number.isFinite(loaded.player.vx) && loaded.player.sprint > 0);
});

test('settings: a settings file from before sprint/aim keeps its custom bindings and gains defaults', () => {
  const old = defaultSettings(); delete old.bindings.sprint; delete old.bindings.aim; old.bindings.forward = ['KeyI'];
  const r = sanitizeSettings({ ...old, version: SETTINGS_VERSION });
  assert.deepEqual(r.settings.bindings.forward, ['KeyI'], 'custom binding preserved');
  assert.deepEqual(r.settings.bindings.sprint, DEFAULT_BINDINGS.sprint); assert.deepEqual(r.settings.bindings.aim, DEFAULT_BINDINGS.aim);
  assert.equal(r.settings.aimToggle, false); assert.equal(r.settings.sprintToggle, false);
  const t = sanitizeSettings({ ...old, version: SETTINGS_VERSION, aimToggle: true, sprintToggle: true }); assert.equal(t.settings.aimToggle, true); assert.equal(t.settings.sprintToggle, true);
});
