// FREEZE F2 and F3 (round 1: Grok's "the oil count sits on the weapon bar" and "the corner map is a dark box", Gemini's and Codex's "the labels are small at 1080p"). tools/dev/probe-hud.mjs (a real-page job) found the real fault: with the lantern,
// the noise tell, a load, ten guns, three keys and the log badge all on, the HUD ran off the right edge of a 1280 or 1366 wide window (the kills panel and the keys were cut off); it was clean from 1600 up. The fix is CSS, so a browser decides what it
// looks like (the probe: clean at seven sizes from 1024 x 600 to 2560 x 1440); this holds the rules that make it so, and the corner map's drawing, which node can run.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { drawMinimap, MINIMAP } from '../src/game/minimap.js';
import { ROOT } from './helpers.js';

const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8').replace(/\r\n/g, '\n');
const rule = (sel) => { const i = html.indexOf('\n' + sel + '{'); assert.ok(i >= 0, sel + ' has a rule'); return html.slice(i + 1, html.indexOf('}', i) + 1); };

test('the HUD wraps instead of running off the window, the weapon strip wraps inside its own width, and the small print grows with the window\'s height', () => {
  assert.match(rule('#hud'), /flex-wrap:wrap/); assert.match(rule('#hud'), /gap:6px 18px/);
  assert.match(rule('#hud-weapons'), /flex-wrap:wrap/); assert.match(rule('#hud-weapons'), /max-width:100%/);
  assert.match(html, /#hud-weapons span\{[^}]*font-size:clamp\(11px,1\.3vh,15px\)/);
  assert.match(rule('#hud .stat small'), /font-size:clamp\(10px,1\.2vh,14px\)/); assert.match(rule('#hud .stat small'), /text-shadow:[^}]*var\(--ink\)/, 'a dark outline: the held lantern sits behind the labels');
  assert.match(rule('#hud .stat b'), /font-size:clamp\(30px,3\.2vh,40px\)/);
  // the floors of those clamps are the old sizes: a small window looks exactly as it did
  assert.ok(/clamp\(10px,/.test(rule('#hud .stat small')) && /clamp\(11px,/.test(html.match(/#hud-weapons span\{[^}]*\}/)[0]));
});

test('the corner map grows with the window and the toast column keeps clear of it, in both sizes', () => {
  assert.match(html, /#minimap\{[^}]*width:clamp\(148px,16\.5vh,240px\)/); assert.match(html, /body\[data-minimap=large\] #minimap\{width:clamp\(222px,24vh,340px\)\}/);
  assert.match(html, /body\[data-minimap=small\] #toasts\{top:calc\(clamp\(148px,16\.5vh,240px\) \+ 32px\)\}/); assert.match(html, /body\[data-minimap=large\] #toasts\{top:calc\(clamp\(222px,24vh,340px\) \+ 36px\)\}/);
  assert.equal((2 * MINIMAP.sizes.small.r + 1) * MINIMAP.sizes.small.s, 148, 'the small map is 148 px in its own pixels: the clamp starts at its natural size'); assert.equal((2 * MINIMAP.sizes.large.r + 1) * MINIMAP.sizes.large.s, 222);
});

test('the corner map draws a faint dot grid on unexplored ground, brighter floor than before, and nothing on a cell that is explored', () => {
  const calls = [], ctx = new Proxy({}, { get: (o, k) => (k in o ? o[k] : (...a) => { calls.push([k, a, o.fillStyle]); }), set: (o, k, v) => { o[k] = v; return true; } });
  const canvas = { width: 0, height: 0, getContext: () => ctx };
  const model = { cell: 2, player: { x: 20, z: 20, yaw: 0 }, cells: [{ cx: 10, cz: 10, kind: 'floor' }, { cx: 11, cz: 10, kind: 'floor' }, { cx: 12, cz: 10, kind: 'wall' }], doors: [], exits: [], switches: [] };
  assert.equal(drawMinimap(canvas, model, 'small'), true); assert.equal(canvas.width, 148);
  const dots = calls.filter(([k, a, fs]) => k === 'fillRect' && a[2] === 1 && a[3] === 1 && /rgba\(150,185,180/.test(String(fs)));
  assert.ok(dots.length > 150 && dots.length < 37 * 37 / 3, 'a quarter of the unexplored cells carry a dot: ' + dots.length);
  const explored = new Set(model.cells.map((c) => (c.cx - 10 + 18) + ',' + (c.cz - 10 + 18))); // cell offsets from the player's cell (10, 10)
  for (const [, a] of dots) assert.ok(!explored.has(Math.floor(a[0] / 4) + ',' + Math.floor(a[1] / 4)), 'no dot on an explored cell');
  const floor = calls.find(([k, , fs]) => k === 'fillRect' && String(fs).toLowerCase() === '#587a82'); assert.ok(floor, 'explored floor is drawn in the brighter colour');
  assert.equal(drawMinimap(canvas, model, 'off'), false, 'off draws nothing');
});
