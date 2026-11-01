// PT-078, SMOOTHED ENEMY MOTION (the owner, 2026-10-31: "is there a way to smooth out the enemy actions? ... the bell monster in red that swings ... seems stiff"). tools/dev/pose-pops.mjs measured 2,622 frame-to-frame
// snaps on six real levels (an arm turning 141 degrees in one frame at the end of every Tollbearer swing, creatures spun a full turn across the -pi / pi seam, the Acolyte's wheel thrown round at random); after the
// fix, none. This holds: no creature's joint jumps more than half a radian in a frame through a fight's inputs; a blow still lands fast and on the sim's damage tick; motion slower than the threshold is untouched;
// a cut (the same instant twice) is never blended; and the view turns a creature the short way round.
import test from 'node:test';
import assert from 'node:assert/strict';
import { FACTORIES } from '../src/render/models_choir.js';
import { inertializer, MOTION } from '../src/render/choir_kit.js';
import { ENEMIES, TICK } from '../src/engine/defs.js';
import { GameView } from '../src/render/view.js';
import { createWorld } from '../src/engine/world.js';
import { texProxy, stubRenderer } from './stubs.js';
import { shippedMap } from './helpers.js';
import * as THREE from 'three';

const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
const joints = (v) => Object.entries(v.J).filter(([, o]) => o?.isObject3D && !o.isMesh);

test('no creature jumps: every kind through a fight (walk in and out, a full blow and its end, a lunge, a brain act that sets walking at once, a death) turns no joint more than 0.5 rad in one frame', () => {
  const tex = texProxy(), bad = [];
  for (const kind of Object.keys(FACTORIES)) {
    const def = ENEMIES[kind], v = FACTORIES[kind](tex, {}), last = new Map(); let t = 0, phase = 0, walk = 0;
    const pose = (o) => { t += TICK; v.pose({ flash: 0, awake: true, t, walk, phase, attack: 0, lunge: 0, dead: 0, ...(o.attack > 0 && def.attack ? { strike: def.attack.windup, dur: def.attack.duration } : {}), ...o });
      for (const [n, j] of joints(v)) for (const ax of ['x', 'y', 'z']) { const k = n + ax, was = last.get(k), now = j.rotation[ax]; last.set(k, now); if (was != null && Math.abs(wrap(now - was)) > 0.5) bad.push(`${kind}.${n}.${ax} ${Math.abs(wrap(now - was)).toFixed(2)}`); } };
    for (let i = 0; i < 60; i++) { walk = Math.min(1, walk + TICK * 5); phase += TICK * (def.gait ?? 6); pose({}); }
    for (let i = 0; i < 30; i++) { walk = Math.max(0, walk - TICK * 4); phase += TICK * (def.gait ?? 6) * walk; pose({}); }
    const dur = def.attack?.duration ?? 1; for (let i = 0; i <= Math.round(dur / TICK); i++) pose({ attack: Math.max(0.001, (i * TICK) / dur) }); for (let i = 0; i < 20; i++) pose({});
    if (def.lunge) { for (let i = 0; i < Math.round(def.lunge.windup / TICK); i++) pose({ lunge: -((i * TICK) / def.lunge.windup) }); for (let i = 0; i < 20; i++) pose({ lunge: 1 }); for (let i = 0; i < 20; i++) pose({}); }
    walk = 1; phase += 1.3; for (let i = 0; i < 12; i++) { phase += TICK * (def.gait ?? 6) * 1.6; pose({}); }
    for (let i = 0; i < 30; i++) { walk = Math.max(0, walk - TICK * 4); pose({}); }
    for (let i = 0; i < 60; i++) pose({ dead: Math.min(1, i / 40) });
  }
  assert.deepEqual(bad, []);
});

test('the Tollbearer\'s blow is still FAST and lands on the sim\'s damage tick, then the arm goes back to rest (it used to rise again and drop in one frame)', () => {
  const A = ENEMIES.tollbearer.attack, v = FACTORIES.tollbearer(texProxy(), {}), n = Math.round(A.duration / TICK), arm = [];
  for (let i = 0; i <= n; i++) { v.pose({ t: (i + 1) * TICK, walk: 0, phase: 0, attack: Math.max(0.001, (i * TICK) / A.duration), lunge: 0, dead: 0, flash: 0, awake: true, strike: A.windup, dur: A.duration }); arm.push(v.J.armB.rotation.x); }
  const top = arm.indexOf(Math.min(...arm)), at = Math.round(A.windup * n);
  assert.ok(arm[top] < -2.3, 'the arm is raised overhead before the blow'); assert.ok(top < at, 'and it is up before the damage');
  const fastest = Math.max(...arm.slice(1).map((x, i) => Math.abs(x - arm[i]))); assert.ok(fastest > 0.25 && fastest < MOTION.rot, `the slam is fast (${fastest.toFixed(2)} rad a frame) but under the smoothing's threshold, so nothing softens it`);
  assert.ok(arm[at - 6] < -1.2 && arm[at + 4] > -0.4, `the arm passes the middle of its fall at the damage tick (${arm[at - 6].toFixed(2)} -> ${arm[at + 4].toFixed(2)})`);
  assert.ok(Math.abs(arm[n]) < 0.15, `and ends at rest (${arm[n].toFixed(2)})`);
});

test('the smoothing leaves slow motion alone, blends a jump over MOTION.blend, and never blends a cut (the same instant twice)', () => {
  const j = new THREE.Group(), J = { j }, step = inertializer(J); let t = 0;
  j.rotation.x = 0; step(t);
  for (let i = 0; i < 10; i++) { t += TICK; j.rotation.x += 0.2; step(t); assert.ok(Math.abs(j.rotation.x - 0.2 * (i + 1)) < 1e-12, 'slow motion is exactly the pose'); }
  t += TICK; j.rotation.x = 3; step(t); assert.ok(Math.abs(j.rotation.x - 2) < 1e-9, 'a jump: what is shown stays where it was');
  for (let k = 0; k < Math.ceil(MOTION.blend / TICK) + 1; k++) { t += TICK; j.rotation.x = 3; step(t); }
  assert.equal(j.rotation.x, 3, 'and arrives within MOTION.blend');
  j.rotation.x = -1; step(t); assert.equal(j.rotation.x, -1, 'a cut is shown as posed');
});

test('the view turns a creature the SHORT way round: across the -pi / pi seam it never faces backwards between two ticks', () => {
  const map = shippedMap('C1E1M02'), w = createWorld(map, { seed: 1, difficulty: 'normal' }), view = new GameView(stubRenderer(), texProxy(), map, w); view.setSize(640, 360, 640);
  const e = w.enemies.find((x) => !ENEMIES[x.kind].boss); e.state = 'chase'; e.yaw = 3.1;
  view.beforeStep(w); view.render(w, 1, TICK); e.yaw = -3.1; view.render(w, 0.5, TICK / 2);
  const y = view.enemyViews.get(e.id).root.rotation.y; assert.ok(Math.abs(wrap(y - Math.PI)) < 0.1, `half-way between 3.1 and -3.1 is pi, not 0 (got ${y.toFixed(2)})`);
});
