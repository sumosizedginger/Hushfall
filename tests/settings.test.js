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
