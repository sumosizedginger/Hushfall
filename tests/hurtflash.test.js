// PT-047 V1: the hurt flash follows the size of the hit (it used to be 1.0 for every hit). The curve and decay are pure (src/render/hurtflash.js); the second half runs a REAL GameView with a stand-in renderer
// and checks what reaches the post pass: a `hurt` event sets the view's own flash, the sim's `p.hurt` no longer draws anything, and the flash fades back to 0 by itself.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { flashFor, decayFor, HurtFlash, FLASH } from '../src/render/hurtflash.js';
import { parseMap } from '../src/engine/mapformat.js';
import { createWorld } from '../src/engine/world.js';
import { GameView } from '../src/render/view.js';
import { TICK } from '../src/engine/defs.js';
import { texProxy, stubRenderer } from './stubs.js';
import { ROOT } from './helpers.js';

test('the curve: a scratch barely tints the screen, a heavy blow is nearly full, and it only ever grows with the hit', () => {
  assert.equal(flashFor(0), 0, 'a hit armour absorbed does not flash'); assert.equal(flashFor(-3), 0); assert.equal(flashFor(NaN), 0);
  assert.ok(flashFor(2) <= 0.2, '2 hp: ' + flashFor(2).toFixed(3)); assert.ok(flashFor(8) <= 0.35, '8 hp: ' + flashFor(8).toFixed(3)); assert.ok(flashFor(30) >= 0.9, '30 hp: ' + flashFor(30).toFixed(3));
  let prev = 0; for (let a = 0.5; a <= 80; a += 0.5) { const v = flashFor(a); assert.ok(v >= prev - 1e-12 && v <= 1, 'monotonic and within 0..1 at ' + a); prev = v; }
  assert.ok(Math.abs(flashFor(1000) - (FLASH.floor + FLASH.span)) < 1e-12, 'it tops out below a full red screen');
});
test('a small hit fades faster than a large one, and every flash decays to exactly 0', () => {
  assert.ok(decayFor(2) > decayFor(30), 'scratch ' + decayFor(2).toFixed(2) + '/s, slam ' + decayFor(30).toFixed(2) + '/s');
  for (const a of [1, 8, 30, 60]) { const f = new HurtFlash(); f.hit(a); let t = 0; while (f.step(1 / 60) > 0) { t += 1 / 60; assert.ok(t < 2, a + ' hp: still showing after 2 s'); } assert.equal(f.value, 0); }
  const small = new HurtFlash(); small.hit(2); let ts = 0; while (small.step(1 / 60) > 0) ts += 1 / 60; assert.ok(ts < 0.15, 'a 2 hp scratch is gone in ' + ts.toFixed(2) + ' s');
});
test('a smaller hit never lowers or shortens a bigger flash that is still showing; a bigger one takes over', () => {
  const f = new HurtFlash(); f.hit(30); f.step(0.1); const big = f.value; f.hit(2); assert.equal(f.value, big, 'a scratch during a slam changes nothing');
  f.hit(40); assert.ok(f.value > big, 'a bigger blow replaces it'); const g = new HurtFlash(); g.hit(5); g.step(0.05); g.hit(12); assert.equal(g.value, flashFor(12), 'and sets its own peak and decay');
  assert.equal(new HurtFlash().step(0.5), 0); const h = new HurtFlash(); h.hit(10); const v = h.value; h.step(0); h.step(-1); assert.equal(h.value, v, 'no time, no change');
});

test('the real view: a hurt event sets the post pass from the hit\'s size, the sim\'s p.hurt draws nothing, and the flash fades by itself', () => {
  const map = parseMap(JSON.parse(fs.readFileSync(path.join(ROOT, 'maps', 'C1E1M01.json'), 'utf8'))), w = createWorld(map, { seed: 1 });
  const view = new GameView(stubRenderer(), texProxy(), map, w); view.setSize(640, 360, 640); view.setLook({ outline: true, paint: true, fov: 70, brightness: 1 });
  try {
    const dmg = () => view.post.uniforms.uDamage.value, frame = () => { view.beforeStep(w); view.render(w, 0, TICK); };
    w.player.hurt = 1; frame(); assert.equal(dmg(), 0, 'the sim\'s p.hurt alone does not draw a flash');
    view.handleEvents([{ type: 'hurt', amount: 2 }]); frame(); assert.ok(dmg() > 0 && dmg() <= 0.2, 'a 2 hp hit: ' + dmg().toFixed(3));
    for (let i = 0; i < 60; i++) frame(); assert.equal(dmg(), 0, 'and it is gone after a second without another hit');
    view.handleEvents([{ type: 'hurt', amount: 30 }]); frame(); assert.ok(dmg() >= 0.85, 'a 30 hp hit: ' + dmg().toFixed(3));
    for (let i = 0; i < 120; i++) frame(); assert.equal(dmg(), 0, 'every flash ends');
    view.handleEvents([{ type: 'hurt', amount: 0 }]); frame(); assert.equal(dmg(), 0, 'a hit fully absorbed by armour does not flash');
  } finally { view.dispose(); }
});
