// FREEZE F12 (round 1, Grok 3, 4, 5 and Gemini 5): five render-side allocations that are gone without changing what is drawn. Each is held to what it drew BEFORE, by a check that does not depend on how the code is written:
//   the lamp budget (lightbudget.js) against its old implementation, the Warden's beam (beamfx.js) by the geometry of its bars, the Hive Cantor's threads (hivefx.js) by where each thread starts and ends, and the shockwave pool (view.js).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import * as THREE from 'three';
import { lightWeights } from '../src/render/lightbudget.js';
import { GameView } from '../src/render/view.js';
import { createWorld, step } from '../src/engine/world.js';
import { loadMapFile } from '../src/engine/harness.js';
import { ENEMIES } from '../src/engine/defs.js';
import { texProxy, stubRenderer, canvasContext } from './stubs.js';
import { ROOT } from './helpers.js';

const shipped = (id) => loadMapFile(path.join(ROOT, 'maps', id + '.json'));
const prevDoc = globalThis.document;
const canvasDoc = () => { globalThis.document = { createElement: () => ({ width: 0, height: 0, getContext: () => canvasContext(), style: {} }) }; };
const view = (id) => { const map = shipped(id), w = createWorld(map, { seed: 1, difficulty: 'normal' }), v = new GameView(stubRenderer(), texProxy(), map, w); v.setSize(640, 360, 640); v.setLook({ outline: true, paint: true, fov: 70, brightness: 1 }); return { w, v, map }; };

/** the lamp budget exactly as it was written before the scratch buffers (lightbudget.js, PT-021) */
function lightWeightsOld(d2s, budget, fade) {
  const order = d2s.map((d, i) => i).sort((a, b) => d2s[a] - d2s[b]), on = new Array(d2s.length).fill(false);
  order.forEach((idx, rank) => { if (rank < budget) on[idx] = true; });
  const cut = order.length > budget ? Math.sqrt(d2s[order[budget]]) : Infinity;
  const w = d2s.map((d2, i) => { if (!on[i]) return 0; if (cut === Infinity) return 1; const k = Math.min(1, Math.max(0, (cut - Math.sqrt(d2)) / fade)); return k * k * (3 - 2 * k); });
  return { on, w };
}

test('the lamp budget gives the same answer with and without scratch buffers, over many random rooms, and a scratch survives a change in the number of lamps', () => {
  let seed = 12345; const rnd = () => (seed = (Math.imul(seed, 1103515245) + 12345) >>> 0) / 4294967296;
  const scratch = {};
  for (let t = 0; t < 400; t++) {
    const n = Math.floor(rnd() * 24), d2s = Array.from({ length: n }, () => (rnd() < 0.15 ? Math.floor(rnd() * 5) * 4 : rnd() * 900)), budget = 1 + Math.floor(rnd() * 10), fade = 0.5 + rnd() * 5;
    const ref = lightWeightsOld(d2s, budget, fade), plain = lightWeights(d2s, budget, fade), reused = lightWeights(d2s, budget, fade, scratch);
    assert.deepEqual(plain.on, ref.on); assert.deepEqual(plain.w, ref.w); assert.deepEqual(reused.on, ref.on, 'on, case ' + t); assert.deepEqual(reused.w, ref.w, 'w, case ' + t);
    assert.equal(reused.on, scratch.on, 'the scratch arrays are the ones returned');
  }
});

test('the Warden\'s beam draws the bars it drew before: out of the eye down to the beam, then level through every bounce, one halo and one core a segment', () => {
  canvasDoc();
  try {
    const { w, v } = view('C1E4M08'), e = w.enemies.find((q) => q.kind === 'gatewarden'), S = ENEMIES.gatewarden.sweep; assert.ok(e && S && v.sweepView, 'the Gate Warden map has a sweep and its view');
    const pts = [[e.x, e.z], [e.x + 12, e.z + 5], [e.x + 12, e.z + 20]]; e.sweepT = 0.5; e.sweepLine = { pts, beam: true };
    v.render(w, 1, 1 / 60);
    const eyeY = (e.y ?? 0) + 3.8, bars = v.sweepView.group.children.filter((m) => m.visible).map((m) => ({ mid: m.position.clone(), len: m.scale.z }));
    const P = (i, y = S.beamY) => new THREE.Vector3(pts[i][0], y, pts[i][1]), k = Math.min(1, 6 / (Math.hypot(pts[1][0] - pts[0][0], pts[1][1] - pts[0][1]) || 1)), M = new THREE.Vector3(pts[0][0] + (pts[1][0] - pts[0][0]) * k, S.beamY, pts[0][1] + (pts[1][1] - pts[0][1]) * k), E = P(0, eyeY);
    const want = [[E, M], [E, M], [M, P(1)], [M, P(1)], [M, P(1)], [P(1), P(2)], [P(1), P(2)], [P(1), P(2)]];
    assert.equal(bars.length, want.length, 'two bars out of the eye, three for the first leg, three for the second');
    want.forEach(([a, b], i) => { assert.ok(bars[i].mid.distanceTo(a.clone().add(b).multiplyScalar(0.5)) < 1e-6, 'bar ' + i + ' midpoint'); assert.ok(Math.abs(bars[i].len - a.distanceTo(b)) < 1e-6, 'bar ' + i + ' length'); });
    v.render(w, 1, 1 / 60); assert.equal(v.sweepView.group.children.filter((m) => m.visible).length, want.length, 'a second frame draws the same bars (nothing leaks from the scratch points)');
    v.dispose();
  } finally { globalThis.document = prevDoc; }
});

test('the Hive Cantor\'s threads run from a fingertip of the conductor to every living singer, and none to a dead one', () => {
  canvasDoc();
  try {
    const { w, v } = view('C2M24'), cant = w.enemies.find((q) => ENEMIES[q.kind].unison), grp = ENEMIES[cant.kind].unison.group; assert.ok(cant && v.hiveView, 'the Hive Cantor and its view exist');
    for (let i = 0; i < 10; i++) step(w, { move: [0, 0], yaw: 0, pitch: 0, fire: false, aim: false, sprint: false, use: false, weapon: null, weaponStep: 0 });
    v.render(w, 1, 1 / 60);
    const rv = v.enemyViews.get(cant.id); rv.root.updateMatrixWorld(true);
    const tips = []; for (const s of ['A', 'B']) for (let f = 0; f < 5; f++) { const j = rv.J['tip' + s + f]; if (j) tips.push(j.getWorldPosition(new THREE.Vector3())); }
    const singers = () => w.enemies.filter((q) => q.group === grp && q.state !== 'dead'), UP = new THREE.Vector3(0, 1, 0);
    const threads = () => v.hiveView.group.children.filter((m) => m.visible && m.isMesh && m.geometry.type === 'CylinderGeometry' && m.scale.x < 0.1 && m.scale.y > 0.3);
    const check = () => {
      const ts = threads(), live = singers(); assert.ok(live.length > 0 && tips.length > 0, 'singers and fingertips: ' + live.length + ', ' + tips.length);
      assert.equal(ts.length, live.length, 'one thread to each living singer');
      for (const m of ts) {
        const dir = UP.clone().applyQuaternion(m.quaternion), a = m.position.clone().addScaledVector(dir, -m.scale.y / 2), b = m.position.clone().addScaledVector(dir, m.scale.y / 2);
        assert.ok(tips.some((t) => t.distanceTo(a) < 1e-4), 'a thread starts at a fingertip of the conductor');
        assert.ok(live.some((o) => Math.hypot(o.x - b.x, (o.y ?? 0) + 1.5 - b.y, o.z - b.z) < 1e-4), 'and ends over a living singer');
      }
    };
    check();
    const victim = singers()[0]; victim.state = 'dead'; v.render(w, 1, 1 / 60); assert.equal(threads().length, singers().length, 'a singer\'s death snaps its thread');
    v.dispose();
  } finally { globalThis.document = prevDoc; }
});

test('the per-frame code of the three views allocates no vectors, and a finished shockwave goes back to a pool instead of a material being cloned and disposed each time', () => {
  const src = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
  const body = (s, from, to) => s.slice(s.indexOf(from), s.indexOf(to, s.indexOf(from)));
  assert.ok(!/new THREE\.Vector3/.test(body(src('src/render/beamfx.js'), 'function update(w, time) {', 'return { group, update')), 'the sweep view: no new vector in update');
  assert.ok(!/new THREE\.Vector3|getWorldPosition\(new/.test(body(src('src/render/hivefx.js'), 'function update(w, enemyViews, time) {', '// ---- the Root Bell')), 'the hive threads: no new vector in the thread loop');
  const view = src('src/render/view.js'); assert.ok(!/const wp = new THREE\.Vector3\(\)/.test(view), 'the lamp loop has a scratch vector');
  assert.ok(view.includes('this.shockFree.pop()') && view.includes('this.shockFree.push(sh.m)') && !/sh\.m\.material\.dispose\(\)/.test(view), 'the shockwave pool');
  canvasDoc();
  try {
    const { w, v } = view_('C1E1M01'); v.addShock(1.4); assert.equal(v.shocks.length, 1); const first = v.shocks[0].m;
    for (let i = 0; i < 40; i++) v.render(w, 1, 1 / 60); assert.equal(v.shocks.length, 0, 'the wave ended'); assert.equal(v.shockFree.length, 1, 'and went to the pool');
    v.addShock(1.4); assert.strictEqual(v.shocks[0].m, first, 'the next punt reuses it'); assert.equal(first.material.opacity, 0.8, 'at full strength');
    let disposed = 0; first.material.dispose = () => { disposed++; }; v.dispose(); assert.equal(disposed >= 1, true, 'dispose() frees the material of a pooled or live shockwave');
  } finally { globalThis.document = prevDoc; }
});
const view_ = view;
