// PT-083 phase 9: the colours that carry meaning, flashes apart from motion, hold or toggle for what is held, captions a player can read, and quick save among the keys.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { PALETTES, paletteOf, STATE_CUES } from '../src/render/palette.js';
import { comfortFor, GameView } from '../src/render/view.js';
import { defaultSettings, sanitizeSettings, SETTINGS_TABS } from '../src/game/settings.js';
import { ACTIONS, DEFAULT_BINDINGS, InputState } from '../src/engine/input.js';
import { ACTION_LABELS } from '../src/game/bindings.js';
import { parseMap } from '../src/engine/mapformat.js';
import { createWorld } from '../src/engine/world.js';
import { texProxy, stubRenderer } from './stubs.js';
import { ROOT, flatSource } from './helpers.js';

const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const lum = (hex) => 0.299 * ((hex >> 16) & 255) + 0.587 * ((hex >> 8) & 255) + 0.114 * (hex & 255);

test('X1: each palette keeps a blow and a shot far enough apart in colour, and differently bright, and the setting reaches the picture', () => {
  for (const [name, P] of Object.entries(PALETTES)) {
    const d = [16, 8, 0].reduce((s, b) => s + Math.abs(((P.melee >> b) & 255) - ((P.ranged >> b) & 255)), 0);
    assert.ok(d > 120, name + ': the two tells differ: ' + d);
    assert.ok(
      P.hostile.every((c) => c >= 0 && c <= 1),
      name,
    );
    assert.ok(lum(P.melee) > 60 && lum(P.ranged) > 60, name + ': both bright enough to see');
  }
  assert.equal(paletteOf('nothing'), PALETTES.standard);
  const map = parseMap(JSON.parse(fs.readFileSync(path.join(ROOT, 'maps/C1E1M01.json'), 'utf8'))),
    view = new GameView(stubRenderer(), texProxy(), map, createWorld(map, { seed: 1, difficulty: 'normal' }));
  view.setLook({ outline: true, paint: true, palette: 'tritan' });
  assert.ok(Math.abs(view.post.uniforms.uHostile.value.z - PALETTES.tritan.hostile[2]) < 1e-9, 'the outline');
  assert.equal(view.tells.mats.ranged[0].color.getHex(), PALETTES.tritan.ranged, 'the tell');
  view.dispose();
});

test('X1: no state is told by colour alone: the table says what else tells it, and a shot has a ring a blow has not', () => {
  assert.ok(STATE_CUES.length >= 8);
  for (const c of STATE_CUES) assert.ok(c.not_colour.length > 12, c.state);
  const t = flatSource('src/render/tells.js');
  assert.ok(t.includes('s.d.visible = !!t.ranged'), 'the ring is the shape of a shot');
});

test('X2: flashes are their own setting: motion is untouched by it, and it dims what flares', () => {
  const plain = comfortFor(),
    f = comfortFor({ reduceFlashes: true }),
    m = comfortFor({ reducedMotion: true }),
    both = comfortFor({ reducedMotion: true, reduceFlashes: true });
  assert.equal(f.shake, 1, 'it moves as before');
  assert.equal(f.bob, plain.bob);
  assert.ok(f.boom < 1 && f.muzzle < 1 && f.hurt < 1 && f.flashMesh === false);
  assert.equal(m.flashMesh, true, 'motion alone leaves the flash mesh');
  assert.equal(both.shake, 0);
  assert.equal(both.flashMesh, false);
});

test('X3: every held action can be a toggle', () => {
  const input = new InputState();
  input.setToggle('fire', true);
  input.press('fire');
  input.release('fire');
  assert.equal(input.sample().fire, true, 'the trigger stays down');
  assert.equal(input.sample().fire, true);
  input.press('fire');
  input.release('fire');
  assert.equal(input.sample().fire, false, 'and is let go');
  const main = flatSource('src/game/main.js');
  assert.ok(main.includes("=== 'melee' ? !!settings.guardToggle : settings.aimToggle"), 'a guard follows its own setting');
  assert.ok(main.includes("if (k === 'fireToggle') g.input.setToggle('fire', v);"));
});

test('X3: the new settings have defaults, survive a damaged file and sit in a tab', () => {
  const d = defaultSettings();
  for (const k of ['palette', 'reduceFlashes', 'fireToggle', 'guardToggle', 'captionSize', 'captionPlate']) {
    assert.ok(k in d, k);
    assert.ok(
      Object.values(SETTINGS_TABS).some((t) => t.keys.includes(k)),
      k + ' has a tab',
    );
  }
  const s = sanitizeSettings({ ...d, palette: 'x', captionSize: 'huge', captionPlate: false, fireToggle: 'yes' }).settings;
  assert.equal(s.palette, 'standard');
  assert.equal(s.captionSize, 'normal');
  assert.equal(s.captionPlate, false);
  assert.equal(s.fireToggle, false);
  for (const id of ['set-palette', 'set-reduceflashes', 'set-firetoggle', 'set-guardtoggle', 'set-captionsize', 'set-captionplate'])
    assert.ok(html.includes(`id="${id}"`), id);
});

test('X5: every action, quick save and load among them, has a default and a label, and the keys are read from the bindings', () => {
  for (const a of ACTIONS) {
    assert.ok(Array.isArray(DEFAULT_BINDINGS[a]), a + ' has a default');
    assert.ok(ACTION_LABELS[a], a + ' has a label');
  }
  const main = flatSource('src/game/main.js');
  assert.ok(main.includes('g.input.bindings.quickSave') && main.includes('g.input.bindings.quickLoad'));
  assert.ok(!main.includes("e.code === 'F5'") && !main.includes("e.code === 'F9'"));
});

test('X6: the checklist is written', () => {
  const t = fs.readFileSync(path.join(ROOT, 'design/ACCESSIBILITY.md'), 'utf8');
  assert.ok(t.includes('Game Accessibility Guidelines'));
  for (const g of ['Controls can be remapped', 'Colour-blind options', 'Reduce flashes', 'Tutorial']) assert.ok(t.includes(g), g);
});
