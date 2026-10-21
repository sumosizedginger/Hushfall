// Round 1 of the outside audit, found by the retaken C2M24 scene frame: during a story scene the objective box showed its bronze edge and its last line under the top letterbox bar, because `body.in-cine` hid some of the game's overlays and not all.
// A browser decides what it looks like; this holds the rule to the page: every overlay the page positions over the game is hidden during a scene unless it is named here as an exception with the reason.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from './helpers.js';

const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8').replace(/\r\n/g, '\n');
const fixed = [...html.matchAll(/(?:^|\n)#([a-z-]+)\{position:fixed/g)].map((m) => m[1]);
const hidden = new Set([...html.matchAll(/body\.in-cine #([a-z-]+)/g)].map((m) => m[1]));
const EXEMPT = {
  cine: 'the scene itself',
  card: 'the arrival title card: hiding it would replay its animation after a scene that starts in its first seconds',
  automap: 'drawn only while the map is open, and a scene starts with it closed',
  wheel: 'the weapon wheel is cancelled when a scene starts',
  'range-hud': 'the dev range\'s readout, never in a shipped map',
};

test('every overlay the page fixes over the game is hidden during a story scene, or is named as an exception with its reason', () => {
  assert.ok(fixed.length >= 15, 'the page has its overlays: ' + fixed.join(', '));
  const open = fixed.filter((id) => !hidden.has(id) && !(id in EXEMPT));
  assert.deepEqual(open, [], 'these overlays would show over a scene: ' + open.join(', '));
  for (const id of Object.keys(EXEMPT)) assert.ok(fixed.includes(id), 'the exception ' + id + ' is still an overlay (remove it from the list if the element is gone)');
  for (const id of ['objective', 'captions', 'tips', 'boss', 'hint', 'use-hint', 'charge']) assert.ok(hidden.has(id), id);
});

test('the screens rule and the scene rule agree on the strip: both hide the message strip, toasts and pickup card', () => {
  for (const id of ['comms', 'toasts', 'pickup-card']) assert.ok(hidden.has(id), id + ' hidden in a scene');
  const screens = html.match(/body:is\(\[data-screen=journal\][^)]*\) :is\(([^)]+)\)\{display:none!important\}/);
  assert.ok(screens, 'the full-panel screens rule is there');
  for (const id of ['#comms', '#toasts', '#pickup-card']) assert.ok(screens[1].split(',').includes(id), id + ' hidden under the full-panel screens');
});
