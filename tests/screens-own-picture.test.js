// Round 1 of the outside audit (Gemini, Grok and Codex all read the same frames): the Journal and the end-of-map panel showed the live message strip, the pickup lines and the last pickup card through their dim.
// The fix is one CSS rule. A browser decides what it looks like (the real-game frames of the regeneration); this holds the rule to the real ids so it cannot name a screen or an element that is not there.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from './helpers.js';

const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8').replace(/\r\n/g, '\n');
const rule = html.match(/body:is\(((?:\[data-screen=[a-z]+\],?)+)\) :is\(([^)]+)\)\{display:none!important\}/);

test('one rule hides the live overlays under a full-panel screen, and every screen and element it names exists', () => {
  assert.ok(rule, 'the rule is in index.html');
  const screens = [...rule[1].matchAll(/data-screen=([a-z]+)/g)].map((m) => m[1]), els = rule[2].split(',').map((s) => s.trim());
  assert.deepEqual(screens.sort(), ['complete', 'credits', 'dead', 'ending', 'journal', 'record']);
  for (const s of screens) assert.ok(html.includes(`id="screen-${s}"`), 'screen-' + s + ' exists');
  for (const e of els) { assert.match(e, /^#[a-z-]+$/, e); assert.ok(html.includes(`id="${e.slice(1)}"`), e + ' exists'); }
  assert.deepEqual(els.sort(), ['#captions', '#comms', '#cross-note', '#pickup-card', '#tips', '#toasts']);
});

test('the pause menu is not in the rule: a menu over the game keeps the strip, and the minimap and crosshair rules above it are untouched', () => {
  assert.ok(!rule[1].includes('pause') && !rule[1].includes('title'));
  assert.ok(html.includes('body:not([data-screen=""]) #cross{display:none}'), 'the crosshair rule is still there');
  assert.ok(html.includes('body:not([data-screen=""]) #minimap{display:none}'), 'the minimap rule is still there');
});
