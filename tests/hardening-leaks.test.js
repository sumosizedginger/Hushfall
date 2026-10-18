// PT-050 H3 (design/HARDENING.md, H-L1 to H-L4): the four leaks the hostile tester found by reading the render and sim code, re-checked against the code first:
//  H-L1 the chime view's five glyph canvases were never disposed                                  -> REAL (a material's dispose never frees its map), fixed
//  H-L2 the tide view's cloned water texture was never disposed                                    -> REAL, fixed (the level mesh's own water texture is shared and stays)
//  H-L3 GameView.dispose() does not dispose the beam view and the sweep view                       -> only half real: the scene sweep already freed their geometry and materials; the views now dispose themselves and GameView calls them
//  H-L4 creatures a vat / mother / summoner bore stay in w.enemies and in the scene for good        -> REAL on a long stall, fixed (trimCorpses): the oldest born corpses beyond a cap leave; a run under the cap is untouched
// What this CANNOT show is a real GPU's memory counter: the browser job reloads a chime, a tide, a beam, a sweep and a vat map and reads renderer.info (tools/dev/probe-session-ab.mjs, a named yes).
import test, { mock } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { createWorld, step, drainEvents, spawnEnemy } from '../src/engine/world.js';
import { loadMapFile } from '../src/engine/harness.js';
import { trimCorpses } from '../src/engine/corpses.js';
import { CORPSES, TICK } from '../src/engine/defs.js';
import { GameView } from '../src/render/view.js';
import { texProxy, stubRenderer, canvasContext } from './stubs.js';
import { ROOT } from './helpers.js';

const idle = (o = {}) => ({ move: [0, 0], yaw: 0, pitch: 0, fire: false, aim: false, sprint: false, use: false, weapon: null, weaponStep: 0, ...o });
const shipped = (id) => loadMapFile(path.join(ROOT, 'maps', id + '.json'));
const bore = (w, n, { dead = true } = {}) => { const out = []; for (let i = 0; i < n; i++) { const e = spawnEnemy(w, 'gaunt', 3 + (i % 5), 3 + Math.floor(i / 5)); e.summoned = true; if (dead) { e.state = 'dead'; e.dead = 1; } out.push(e); } return out; };
const prevDoc = globalThis.document;
const canvasDoc = () => { globalThis.document = { createElement: () => ({ width: 0, height: 0, getContext: () => canvasContext(), style: {} }) }; };
const view = (map, w) => { const v = new GameView(stubRenderer(), texProxy(), map, w); v.setSize(640, 360, 640); v.setLook({ outline: true, paint: true, fov: 70, brightness: 1 }); return v; };

test('trimCorpses keeps the newest born corpses up to the cap, in place, and never touches a mapped body, a living creature or one still falling', () => {
  const w = createWorld(shipped('C1E1M01'), { seed: 1, difficulty: 'normal' }), mapped = w.enemies.length, list = w.enemies;
  const born = bore(w, CORPSES.cap + 16), living = bore(w, 3, { dead: false }), falling = bore(w, 2); for (const e of falling) e.dead = 0.4;      // 'dead' but not finished
  assert.equal(w.enemies.length, mapped + born.length + living.length + falling.length);
  const gone = trimCorpses(w);
  assert.equal(gone, 16, 'exactly the surplus goes'); assert.strictEqual(w.enemies, list, 'the array is trimmed in place (nothing holds a stale copy)');
  const ids = new Set(w.enemies.map((e) => e.id));
  for (const e of born.slice(0, 16)) assert.ok(!ids.has(e.id), 'the oldest born corpses went'); for (const e of born.slice(16)) assert.ok(ids.has(e.id), 'the newest stayed');
  for (const e of [...living, ...falling]) assert.ok(ids.has(e.id), 'alive and still-falling creatures stay');
  assert.equal(w.enemies.length, mapped + CORPSES.cap + living.length + falling.length, 'and every mapped creature (alive or dead) is still there');
  assert.equal(trimCorpses(w), 0, 'a second call finds nothing to do');
});

test('a run under the cap is byte-for-byte untouched: the same objects in the same order', () => {
  const w = createWorld(shipped('C1E1M01'), { seed: 1, difficulty: 'normal' }); bore(w, CORPSES.cap); const before = [...w.enemies];
  assert.equal(trimCorpses(w), 0); assert.deepEqual(w.enemies.map((e) => e.id), before.map((e) => e.id));
  w.tick = CORPSES.every - 1; step(w, idle()); drainEvents(w); assert.equal(w.enemies.length, before.length, 'and the clock check changes nothing either');
});

test('the sim trims on its own clock: over the cap, the corpses leave on the next multiple of CORPSES.every, not before', () => {
  const w = createWorld(shipped('C1E1M01'), { seed: 1, difficulty: 'normal' }), n0 = w.enemies.length; bore(w, CORPSES.cap + 10); w.tick = 0;
  for (let i = 0; i < CORPSES.every - 1; i++) { step(w, idle()); drainEvents(w); } assert.equal(w.enemies.length, n0 + CORPSES.cap + 10, 'nothing yet');
  step(w, idle()); drainEvents(w); assert.equal(w.tick, CORPSES.every); assert.equal(w.enemies.length, n0 + CORPSES.cap, 'the surplus went on the tick');
});

test('a long stall on a vat map stays bounded: 400 creatures born and killed leave at most the cap of corpses behind', () => {
  const w = createWorld(shipped('C1E3M07'), { seed: 1, difficulty: 'normal' }), n0 = w.enemies.length;
  for (let round = 0; round < 8; round++) { w.player.hp = 1e6; for (const e of bore(w, 50, { dead: false })) { e.state = 'dead'; e.dead = 1; } for (let i = 0; i < CORPSES.every; i++) { step(w, idle()); drainEvents(w); } assert.equal(w.status, 'playing', 'the stand-in player is still there'); }
  const corpses = w.enemies.filter((e) => e.summoned && e.state === 'dead').length; assert.ok(corpses <= CORPSES.cap + 2, 'born corpses kept: ' + corpses); assert.ok(w.enemies.length < n0 + 100, 'the world did not grow with every birth: ' + w.enemies.length);
});

test('the scene frees the rig of a creature the sim dropped, and its view entry goes', () => {
  canvasDoc(); try {
    const map = shipped('C1E1M01'), w = createWorld(map, { seed: 1, difficulty: 'normal' }), v = view(map, w); const born = bore(w, CORPSES.cap + 6, { dead: false }); step(w, idle()); drainEvents(w); v.render(w, 0, TICK);
    for (const e of born) { e.state = 'dead'; e.dead = 1; } const doomed = born.slice(0, 6).map((e) => v.enemyViews.get(e.id)).filter(Boolean); assert.equal(doomed.length, 6, 'the views existed');
    let freed = 0; for (const d of doomed) d.root.traverse((o) => { if (o.isMesh && o.geometry) { const real = o.geometry.dispose.bind(o.geometry); o.geometry.dispose = () => { freed++; real(); }; } });
    trimCorpses(w); step(w, idle()); drainEvents(w); v.render(w, 0, TICK);
    for (const e of born.slice(0, 6)) assert.ok(!v.enemyViews.has(e.id), 'its view entry is gone'); for (const e of born.slice(6)) assert.ok(v.enemyViews.has(e.id), 'the others still draw'); assert.ok(freed > 0, 'its geometry was disposed: ' + freed);
    v.dispose();
  } finally { globalThis.document = prevDoc; }
});

test('GameView.dispose() frees the textures the chime view and the tide view own, and calls the beam and sweep views', () => {
  canvasDoc(); try {
    const chime = shipped('C2M14'), wc = createWorld(chime, { seed: 1, difficulty: 'normal' }), vc = view(chime, wc); assert.ok(vc.chimeView, 'C2M14 has chimes'); assert.equal(vc.chimeView.textures.length, 5);
    const hits = []; vc.chimeView.textures.forEach((t, i) => { t.dispose = () => hits.push(i); }); vc.dispose(); assert.deepEqual(hits.sort(), [0, 1, 2, 3, 4], 'all five glyph canvases were disposed');

    const tide = shipped('C2M28'), wt = createWorld(tide, { seed: 1, difficulty: 'normal' }), tex = texProxy(), vt = new GameView(stubRenderer(), tex, tide, wt); vt.setSize(640, 360, 640); assert.ok(vt.tideView, 'C2M28 has a tide');
    let own = 0, shared = 0; vt.tideView.tex.dispose = () => { own++; }; const base = tex.water_dusk; if (base) base.dispose = () => { shared++; }; vt.dispose(); assert.equal(own, 1, 'the clone is freed'); assert.equal(shared, 0, 'the level mesh\'s shared water texture is not');

    const beam = shipped('C1E4M04'), wb = createWorld(beam, { seed: 1, difficulty: 'normal' }), vb = view(beam, wb); assert.ok(vb.beamView, 'C1E4M04 has emitters'); let b = 0; const bd = vb.beamView.dispose; vb.beamView.dispose = () => { b++; bd(); }; vb.dispose(); assert.equal(b, 1, 'the beam view is disposed');

    const gate = shipped('C1E4M08'), wg = createWorld(gate, { seed: 1, difficulty: 'normal' }), vg = view(gate, wg); assert.ok(vg.sweepView, 'C1E4M08 has the Warden\'s sweep'); let s = 0; const sd = vg.sweepView.dispose; vg.sweepView.dispose = () => { s++; sd(); }; vg.dispose(); assert.equal(s, 1, 'the sweep view is disposed');
  } finally { globalThis.document = prevDoc; }
});

test('the pointer-lock policy: a script-driven browser never asks for the lock, a person\'s does, and the hook sets it off BEFORE a level starts', async () => {
  const { automated } = await import('../src/game/lockpolicy.js'); const fs = await import('node:fs');
  assert.equal(automated({ webdriver: true }), true); assert.equal(automated({ webdriver: false }), false); assert.equal(automated({}), false); assert.equal(automated(undefined), false);
  const main = fs.readFileSync(path.join(ROOT, 'src/game/main.js'), 'utf8'), hook = fs.readFileSync(path.join(ROOT, 'src/game/testhook.js'), 'utf8');
  assert.match(main, /function requestLock\(fromClick = false\) \{\s*if \(g\.lockFailed\) return;\s*if \(automated\(\)\) \{ g\.lockFailed = true; return; \}/, 'requestLock refuses in an automated browser before it touches the canvas');
  assert.ok(hook.indexOf('g.lockFailed = true; app.startLevel') > 0, 'the hook switches the lock off before startLevel (it used to switch it off after, so every automated level start asked once)');
  mock.reset();
});
