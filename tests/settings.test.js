import test from 'node:test';
import assert from 'node:assert/strict';
import { defaultSettings, sanitizeSettings, loadSettings, saveSettings, SETTINGS_VERSION } from '../src/game/settings.js';

const mem = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };

test('settings round-trip through storage', () => {
  const st = mem(), s = defaultSettings(); s.sensitivity = 1.7; s.internalWidth = 640; s.outline = false;
  assert.equal(saveSettings(st, s), true);
  const r = loadSettings(st); assert.deepEqual(r.notes, []); assert.equal(r.settings.sensitivity, 1.7); assert.equal(r.settings.internalWidth, 640); assert.equal(r.settings.outline, false);
});

test('missing, corrupt or foreign-version settings fall back to defaults with a note', () => {
  assert.deepEqual(loadSettings(mem()).settings, defaultSettings());
  const st = mem(); st.setItem('hushfall.settings', '{oops'); const r = loadSettings(st);
  assert.deepEqual(r.settings, defaultSettings()); assert.match(r.notes[0], /unreadable/);
  const old = sanitizeSettings({ version: SETTINGS_VERSION + 5 }); assert.match(old.notes[0], /not supported/);
  assert.deepEqual(loadSettings(null).settings, defaultSettings(), 'no storage at all');
});

test('out-of-range and malformed fields are repaired individually', () => {
  const r = sanitizeSettings({ version: SETTINGS_VERSION, sensitivity: 99, masterVolume: -3, internalWidth: 777, outline: 'no', bindings: { forward: 'KeyW' } });
  assert.equal(r.settings.sensitivity, 4); assert.equal(r.settings.masterVolume, 0); assert.equal(r.settings.internalWidth, 480);
  assert.deepEqual(r.settings.bindings, defaultSettings().bindings); assert.ok(r.notes.some((n) => /bindings/.test(n)));
});

test('fov and brightness are clamped and default sensibly (older settings files gain them)', () => {
  const d = defaultSettings(); assert.equal(d.fov, 70); assert.equal(d.brightness, 1);
  const r = sanitizeSettings({ version: SETTINGS_VERSION, fov: 500, brightness: -2 }); assert.equal(r.settings.fov, 105); assert.equal(r.settings.brightness, 0.6);
  const old = sanitizeSettings({ version: SETTINGS_VERSION, sensitivity: 1.2 }); assert.equal(old.settings.fov, 70); assert.equal(old.settings.brightness, 1); assert.equal(old.settings.sensitivity, 1.2);
});

test('a failing storage (quota / private mode) does not throw', () => {
  const bad = { getItem: () => { throw new Error('denied'); }, setItem: () => { throw new Error('quota'); } };
  assert.equal(saveSettings(bad, defaultSettings()), false);
  assert.match(loadSettings(bad).notes[0], /unreadable/);
});

test('PT-013: settings saved before the weapon wheel, the controller and melee still load; the new actions come with their default keys unless the player gave those keys away', () => {
  const old = defaultSettings(); delete old.wheelSlow; delete old.wheelToggle; delete old.gamepad; delete old.padBindings; for (const a of ['weapon6', 'weaponLast', 'melee']) delete old.bindings[a];
  const r = sanitizeSettings(JSON.parse(JSON.stringify(old))); assert.deepEqual(r.notes, []); assert.equal(r.settings.wheelSlow, true, 'the wheel slows time unless turned off'); assert.equal(r.settings.wheelToggle, false);
  assert.deepEqual([r.settings.bindings.melee, r.settings.bindings.weaponLast, r.settings.bindings.weapon6], [['KeyV'], ['KeyQ'], ['Digit6']]); assert.equal(r.settings.gamepad.enabled, true); assert.equal(r.settings.gamepad.glyphs, 'auto'); assert.equal(r.settings.padBindings.fire[0], 'Pad7');
  const taken = JSON.parse(JSON.stringify(old)); taken.bindings.use = ['KeyQ', 'Space']; taken.bindings.fire = ['Mouse0', 'KeyV'];
  const t = sanitizeSettings(taken).settings.bindings; assert.deepEqual(t.use, ['KeyQ', 'Space']); assert.deepEqual(t.weaponLast, [], 'Q was the player\'s Use key: the new action does not steal it'); assert.deepEqual(t.melee, [], 'V was theirs too');
  const seen = new Map(); for (const [a, codes] of Object.entries(t)) for (const c of codes) { assert.ok(!seen.has(c), `${c}: ${seen.get(c)} and ${a}`); seen.set(c, a); }
});
test('PT-013: the controller settings are clamped and repaired field by field; the defaults give no two actions the same key', () => {
  const r = sanitizeSettings({ version: SETTINGS_VERSION, wheelSlow: false, wheelToggle: true, gamepad: { lookRate: 99, deadzone: -1, curve: 0, invertY: true, assist: 5, vibration: false, glyphs: 'nintendo', enabled: false }, padBindings: { fire: ['Pad99'], use: ['Pad2'] } }).settings;
  assert.deepEqual([r.wheelSlow, r.wheelToggle], [false, true]); assert.deepEqual(r.gamepad, { enabled: false, lookRate: 8, deadzone: 0.05, curve: 1, invertY: true, assist: 1, vibration: false, glyphs: 'auto' }); assert.deepEqual(r.padBindings.fire, ['Pad7']); assert.deepEqual(r.padBindings.use, ['Pad2']);
  const d = defaultSettings(), seen = new Map(); for (const [a, codes] of Object.entries(d.bindings)) for (const c of codes) { assert.ok(!seen.has(c), `default key ${c} is on both ${seen.get(c)} and ${a}`); seen.set(c, a); }
  assert.deepEqual([d.bindings.melee, d.bindings.weaponLast, d.bindings.weapon6], [['KeyV'], ['KeyQ'], ['Digit6']]);
});
