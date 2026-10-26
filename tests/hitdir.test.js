// LOOK POLISH 10: where a blow came from. The sim's `hurt` event carries the source (fx, fz) for a blow that has one; the view's HitMarkers (src/render/hitdir.js) turn it into a glow on the edge of the picture on
// that side, scaled by the hit, merged with other blows from the same side, fading in about a second; post.js draws it only in a band along the edge.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { bearing, HitMarkers, HITDIR } from '../src/render/hitdir.js';
import { HurtFlash, flashFor } from '../src/render/hurtflash.js';
import { loadMapFile, loadRouteFile, runRoute } from '../src/engine/harness.js';
import { ROOT } from './helpers.js';

const v4 = () => ({ x: 0, y: 0, z: 0, w: 0, set(a, b, c, d) { this.x = a; this.y = b; this.z = c; this.w = d; return this; } });
const near = (a, b, e = 1e-9) => Math.abs(a - b) < e;

test('the bearing: ahead, to the right, behind and to the left of a viewer, whichever way it faces', () => {
  for (const yaw of [0, 0.7, -2.1, Math.PI]) {
    const f = [-Math.sin(yaw), -Math.cos(yaw)], r = [Math.cos(yaw), -Math.sin(yaw)];
    const at = (dx, dz) => bearing(0, 0, yaw, dx, dz);
    const ahead = at(f[0] * 5, f[1] * 5), right = at(r[0] * 5, r[1] * 5), behind = at(-f[0] * 5, -f[1] * 5), left = at(-r[0] * 5, -r[1] * 5);
    assert.ok(near(ahead.c, 1) && near(ahead.s, 0), 'ahead'); assert.ok(near(right.s, 1) && near(right.c, 0), 'right'); assert.ok(near(behind.c, -1), 'behind'); assert.ok(near(left.s, -1), 'left');
  }
});

test('a blow makes one marker scaled by its size; blows from the same side merge and refresh; at most four show', () => {
  const m = new HitMarkers();
  m.hit(0, -10, 4, 0, 0, 0); m.hit(1, -10, 20, 0, 0, 0); assert.equal(m.list.length, 1, 'two blows from straight ahead are one glow'); assert.ok(near(m.list[0].k, flashFor(20)), 'the bigger blow wins');
  m.hit(10, 0, 8, 0, 0, 0); m.hit(-10, 0, 8, 0, 0, 0); m.hit(0, 10, 8, 0, 0, 0); assert.equal(m.list.length, 4, 'right, left and behind are three more');
  m.hit(7, 7, 30, 0, 0, 0); assert.equal(m.list.length, HITDIR.max, 'never more than four'); assert.ok(m.list.some((q) => q.k === flashFor(30)), 'the biggest is kept');
  assert.equal(m.hit(0, -10, 0, 0, 0, 0), null, 'a blow the armour took whole shows nothing');
});

test('the marker follows the attacker as the viewer turns, fades over its life, and the uniform is empty when nothing hit', () => {
  const m = new HitMarkers(), out = [v4(), v4(), v4(), v4()];
  m.hit(10, 0, 15, 0, 0, 0);                                                        // from the right (facing -z, +x is right)
  m.write(0, 0, 0, out); assert.ok(near(out[0].x, 1) && near(out[0].y, 0, 1e-9), 'right edge'); const s0 = out[0].z;
  m.write(0, 0, -Math.PI / 2, out); assert.ok(near(out[0].y, 1, 1e-9), 'turned to face it: now the top edge, straight ahead');
  m.step(HITDIR.life / 2); m.write(0, 0, 0, out); assert.ok(out[0].z < s0 && out[0].z > 0, 'fading'); m.step(HITDIR.life); m.write(0, 0, 0, out); assert.equal(out[0].z, 0, 'gone'); assert.equal(m.list.length, 0);
  assert.ok(HITDIR.width0 + HITDIR.widthK * flashFor(30) > HITDIR.width0 + HITDIR.widthK * flashFor(3), 'a heavy blow is a wider glow than a scratch');
});

test('a blow with a direction flushes the edges less than one without (a toxic floor keeps the full flush)', () => {
  const a = new HurtFlash(), b = new HurtFlash(); a.hit(20); b.hit(20, 0.45); assert.ok(near(b.value, a.value * 0.45));
});

test('the post pass draws the glow only in a band along the edge, red, capped, and the view feeds it every frame', () => {
  const post = fs.readFileSync(path.join(ROOT, 'src/render/post.js'), 'utf8'), view = fs.readFileSync(path.join(ROOT, 'src/render/view.js'), 'utf8');
  assert.match(post, /uniform vec4 uHit\[4\]/); assert.match(post, /band = 1\.0 - smoothstep\(0\.0, 0\.11, edgeD\)/); assert.match(post, /clamp\(hitA \* band, 0\.0, 0\.85\)/);
  assert.match(view, /this\.hitMarks\.write\(/); assert.match(view, /this\.hurtFlash\.hit\(e\.amount, dir \? 0\.45 : 1\)/);
});

test('in the sim: blows from creatures carry where they came from, near the creature or the shot; the sim is otherwise unchanged (the route fingerprints)', () => {
  const m = loadMapFile(path.join(ROOT, 'maps/C1E1M02.json')), r = runRoute(m, loadRouteFile(path.join(ROOT, 'routes/C1E1M02.main.route.json')), { seed: 1, difficulty: 'hard' });
  const hurts = r.events.filter((e) => e.type === 'hurt'); assert.ok(hurts.length > 5, hurts.length + ' blows');
  const dir = hurts.filter((e) => Number.isFinite(e.fx) && Number.isFinite(e.fz)); assert.ok(dir.length >= hurts.length * 0.8, `${dir.length} of ${hurts.length} carry a source`);
});
