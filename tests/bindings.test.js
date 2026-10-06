import test from 'node:test';
import assert from 'node:assert/strict';
import { applyRebind, prettyCode, defaultBindings, ACTION_LABELS, RESERVED, legendText } from '../src/game/bindings.js';
import { ACTIONS, InputState, DEFAULT_BINDINGS } from '../src/engine/input.js';
import { sanitizeSettings, defaultSettings, SETTINGS_VERSION } from '../src/game/settings.js';

test('every action has a label and every default binding has a readable name', () => {
  for (const a of ACTIONS) assert.ok(ACTION_LABELS[a], 'label for ' + a);
  for (const codes of Object.values(DEFAULT_BINDINGS)) for (const c of codes) assert.ok(prettyCode(c) && prettyCode(c) !== '—', 'name for ' + c);
  assert.equal(prettyCode('KeyW'), 'W'); assert.equal(prettyCode('Digit2'), '2'); assert.equal(prettyCode('Mouse2'), 'Mouse R'); assert.equal(prettyCode(undefined), '—');
});

test('rebinding sets the chosen slot and leaves the other slot alone', () => {
  const b = defaultBindings();                                   // use: ['KeyE', 'Space']
  const r = applyRebind(b, 'use', 0, 'KeyF'); assert.ok(r.ok); assert.deepEqual(r.bindings.use, ['KeyF', 'Space']);
  const r2 = applyRebind(b, 'use', 1, 'KeyG'); assert.deepEqual(r2.bindings.use, ['KeyE', 'KeyG']);
  assert.deepEqual(b.use, ['KeyE', 'Space'], 'input is not mutated');
});

test('a key already used elsewhere is taken from that action, and the displaced actions are reported', () => {
  const r = applyRebind(defaultBindings(), 'fire', 0, 'KeyE');           // E was Use
  assert.ok(r.ok); assert.deepEqual(r.displaced, ['use']); assert.deepEqual(r.bindings.use, ['Space']); assert.equal(r.bindings.fire[0], 'KeyE');
  const both = applyRebind(defaultBindings(), 'sprint', 0, 'Space'); assert.deepEqual(both.bindings.use, ['KeyE']);
});

test('Escape cannot be assigned, unknown actions and bad slots are refused, Pause cannot be left unbound', () => {
  assert.ok(RESERVED.has('Escape')); assert.equal(applyRebind(defaultBindings(), 'use', 0, 'Escape').ok, false);
  assert.equal(applyRebind(defaultBindings(), 'teleport', 0, 'KeyQ').ok, false); assert.equal(applyRebind(defaultBindings(), 'use', 5, 'KeyQ').ok, false); assert.equal(applyRebind(defaultBindings(), 'use', 0, '').ok, false);
  const b = defaultBindings(); b.pause = ['KeyP'];
  const r = applyRebind(b, 'use', 0, 'KeyP'); assert.equal(r.ok, false); assert.match(r.reason, /Pause needs/); assert.deepEqual(r.bindings.pause, ['KeyP'], 'unchanged');
  const ok = applyRebind(defaultBindings(), 'use', 0, 'KeyP'); assert.ok(ok.ok, 'fine while pause still has Escape'); assert.deepEqual(ok.bindings.pause, ['Escape']);
});

test('a rebind takes effect in the input layer: the new key acts, the old key does not', () => {
  const i = new InputState(); const r = applyRebind(i.bindings, 'use', 0, 'KeyF'); i.setBindings(r.bindings);
  i.keyDown('KeyF'); assert.equal(i.sample().use, true); i.keyUp('KeyF');
  i.keyDown('KeyE'); assert.equal(i.sample().use, false, 'E no longer opens doors'); i.keyUp('KeyE');
  i.keyDown('Space'); assert.equal(i.sample().use, true, 'the second slot still works');
});

test('remapped bindings persist through settings sanitising; reset restores the defaults', () => {
  const s = defaultSettings(); s.bindings = applyRebind(s.bindings, 'use', 0, 'KeyF').bindings;
  const r = sanitizeSettings(JSON.parse(JSON.stringify({ ...s, version: SETTINGS_VERSION })));
  assert.deepEqual(r.settings.bindings.use, ['KeyF', 'Space']); assert.deepEqual(r.notes, []);
  assert.deepEqual(defaultBindings(), DEFAULT_BINDINGS);
});

test('the controls legend is built from the CURRENT bindings, and default Fire avoids Ctrl (browser shortcuts)', () => {
  const b = defaultBindings(); assert.match(legendText(b), /Move WASD/); assert.match(legendText(b), /Fire Mouse L/); assert.match(legendText(b), /Aim Mouse R/);
  assert.ok(!b.fire.includes('ControlLeft') && ACTIONS.includes('weapon3') && ACTIONS.includes('weapon4') && !ACTIONS.includes('weapon5'), 'no Ctrl fire; one weapon action per weapon slot (four weapons, four slots)');
  b.fire = ['KeyJ']; b.use = ['KeyR']; assert.match(legendText(b), /Fire J/); assert.match(legendText(b), /Use R/);
});
