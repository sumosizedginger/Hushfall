// PT-071 (R20): first run and accessibility. The difficulty copy comes from the game's own numbers, the first-run line names the keys the player has, the new settings are validated, reduced motion reaches the view, and the shell wires it all.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { DIFFICULTY } from '../src/engine/defs.js';
import { difficultyCopy, difficultyNote } from '../src/game/difficulty.js';
import { firstRunLine } from '../src/game/firstrun.js';
import { defaultSettings, sanitizeSettings } from '../src/game/settings.js';
import { DEFAULT_BINDINGS } from '../src/engine/input.js';
import { defaultPadBindings } from '../src/game/gamepad.js';
import { loadMapFile } from '../src/engine/harness.js';
import { createWorld } from '../src/engine/world.js';
import { GameView } from '../src/render/view.js';
import { texProxy, stubRenderer } from './stubs.js';

const ROOT = path.resolve(import.meta.dirname, '..');
const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');

test('the difficulty copy is derived from DIFFICULTY: every number in it is the game\'s own', () => {
  for (const key of Object.keys(DIFFICULTY)) {
    const c = difficultyCopy(key), d = DIFFICULTY[key], text = c.facts.join(' ');
    assert.equal(c.name, d.name);
    assert.ok(text.includes(`${Math.round(d.enemyDamage * 100)}% of the standard damage`) && text.includes(`${Math.round(d.enemyHp * 100)}% of the standard health`) && text.includes(`${Math.round(d.ammoPickup * 100)}% of the standard amount`), `${key}: ${text}`);
    assert.ok(c.line.length > 20 && c.line.length < 120);
  }
  assert.match(difficultyCopy('easy').facts[2], /wait 30% longer between attacks/); assert.match(difficultyCopy('hard').facts[2], /wait 15% less between attacks/); assert.match(difficultyCopy('normal').facts[2], /the standard time between attacks/);
  assert.equal(difficultyCopy('nightmare'), null);
  assert.match(difficultyNote(null), /Pick a difficulty/); assert.match(difficultyNote('hard'), /^<b>Hard\.<\/b>/);
});

test('the first-run line names the keys (or the pad\'s buttons) the player has, and follows a rebind', () => {
  const kb = firstRunLine({ bindings: DEFAULT_BINDINGS, pad: false });
  assert.match(kb, /^The line at the top is what to do next\. Tab opens the Journal/); assert.match(kb, /Escape pauses\.|P pauses\.|Esc pauses\./);
  const moved = firstRunLine({ bindings: { ...DEFAULT_BINDINGS, map: ['KeyJ'] }, pad: false }); assert.match(moved, /J opens the Journal/);
  const pad = firstRunLine({ padBindings: defaultPadBindings(), family: 'ps', pad: true }); assert.ok(!/Tab|Escape/.test(pad) && pad.length < 260, pad);
});

test('the new settings: defaults off, bad values repaired, good values kept, an older save gets the defaults', () => {
  const d = defaultSettings(); assert.equal(d.textSize, 'normal'); assert.equal(d.reducedMotion, false); assert.equal(d.captions, false); assert.equal(d.firstRunSeen, false);
  const ok = sanitizeSettings({ ...d, textSize: 'larger', reducedMotion: true, captions: true, firstRunSeen: true }).settings; assert.deepEqual([ok.textSize, ok.reducedMotion, ok.captions, ok.firstRunSeen], ['larger', true, true, true]);
  const bad = sanitizeSettings({ ...d, textSize: 'huge', reducedMotion: 'yes', captions: 1, firstRunSeen: 'true' }).settings; assert.deepEqual([bad.textSize, bad.reducedMotion, bad.captions, bad.firstRunSeen], ['normal', false, false, false]);
  const old = { ...d }; delete old.textSize; delete old.captions; delete old.reducedMotion; delete old.firstRunSeen; const s = sanitizeSettings(old).settings; assert.deepEqual([s.textSize, s.reducedMotion, s.captions], ['normal', false, false]);
});

test('reduced motion reaches the view: no camera shake, a gentler hurt flash and muzzle light; the default is untouched', () => {
  const map = loadMapFile(path.join(ROOT, 'maps/C1E1M01.json')), w = createWorld(map, { seed: 1, difficulty: 'normal' }), view = new GameView(stubRenderer(), texProxy(), map, w);
  assert.deepEqual(view.comfort, { shake: 1, hurt: 1, muzzle: 1 }, 'a fresh view is the game as it was');
  view.setLook({ outline: true, paint: true, fov: 70, brightness: 1, reducedMotion: true }); assert.deepEqual(view.comfort, { shake: 0, hurt: 0.35, muzzle: 0.4 });
  view.setLook({ outline: true, paint: true, fov: 70, brightness: 1 }); assert.deepEqual(view.comfort, { shake: 1, hurt: 1, muzzle: 1 }, 'switching it off restores everything');
});

test('the shell wires it: the controls, the captions element, the key letters, the text-size classes, the first-run tip once', () => {
  const html = read('index.html'), ui = read('src/game/ui.js'), main = read('src/game/main.js');
  for (const id of ['set-textsize', 'set-reducedmotion', 'set-captions', 'captions', 'difficulty-note']) assert.ok(html.includes(`id="${id}"`), id);
  assert.ok(html.includes('body.ui-large') && html.includes('body.ui-larger') && html.includes('#hud-keys i::after'));
  assert.ok(ui.includes("setSetting('textSize'") && ui.includes("setSetting('reducedMotion'") && ui.includes("setSetting('captions'") && ui.includes('captions(lines)') && ui.includes('data-k='));
  assert.ok(main.includes('captionFor(e, g.world.player)') && main.includes('function applyComfort()') && main.includes('firstRunLine(') && main.includes('settings.firstRunSeen = true'));
});
