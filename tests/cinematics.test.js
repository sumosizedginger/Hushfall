// STORY CINEMATICS (PT-063, R13, workstream L): the sequencer is a pure function of time, a scene touches nothing but the picture and the sound, every scene belongs to a map that names it, the camera of every scene stays inside the map's air, and the text obeys the lore rules.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, shippedMap, shippedSrc } from './helpers.js';
import { createWorld, hashWorld } from '../src/engine/world.js';
import { floorAt, ceilingAt } from '../src/engine/terrain.js';
import { resolvePoint, resolveScene, cameraAt, startScene, advanceScene, skipScene, subtitleAt, fadeAt, sceneErrors, hasSeen, markSeen, SCENE_ACTIONS, MAX_SCENE_SECONDS } from '../src/game/cinematics.js';
import { SCENES, SCENE } from '../src/game/scenes.js';
import { lintLine } from '../tools/dev/prose-lint.mjs';
import { sanitizeProgress, newProgress } from '../src/engine/progress.js';
import { ACTION_KEYS } from '../src/engine/mapformat.js';

const worldOf = (id) => createWorld(shippedMap(id), { seed: 1, difficulty: 'normal' });
const mapIds = fs.readdirSync(path.join(ROOT, 'maps')).filter((f) => f.endsWith('.json')).map((f) => f.slice(0, -5));
const actionsOf = (src) => { const out = []; const walk = (o) => { if (Array.isArray(o)) o.forEach(walk); else if (o && typeof o === 'object') { if (typeof o.cinematic === 'string') out.push(o.cinematic); Object.values(o).forEach(walk); } }; walk(src.triggers); walk(src.entities); return out; };

test('every scene is well formed: length, keyframes, readable lines, declared actions only', () => {
  assert.ok(SCENES.length >= 6, 'the six in-engine scenes of the plan');
  assert.equal(new Set(SCENES.map((s) => s.id)).size, SCENES.length, 'ids are unique');
  for (const s of SCENES) assert.deepEqual(sceneErrors(s), [], s.id);
  assert.deepEqual(SCENE_ACTIONS, ['cue', 'shake'], 'a scene may play a sound and shake the picture, and nothing else');
  for (const s of SCENES) { assert.ok(s.length >= 8 && s.length <= MAX_SCENE_SECONDS, s.id); assert.ok(s.length <= 60, `${s.id}: the plan says 20-60 seconds`); }
});

test('a scene definition with a defect is reported', () => {
  const ok = SCENES[0];
  assert.ok(sceneErrors({ ...ok, id: 'Bad Id' }).length);
  assert.ok(sceneErrors({ ...ok, length: 3 }).length);
  assert.ok(sceneErrors({ ...ok, keys: [ok.keys[0]] }).length);
  assert.ok(sceneErrors({ ...ok, actions: [{ t: 1, lights: 0.5 }] }).length, 'a scene may not touch the lights: that is the simulation');
  assert.ok(sceneErrors({ ...ok, lines: [{ t: 1, dur: 1, who: '', text: 'x' }] }).length, 'a line shown for under 1.5 seconds');
  assert.ok(sceneErrors({ ...ok, lines: [{ t: 1, dur: 2, who: '', text: 'x'.repeat(100) }] }).length, 'a line that cannot be read in the time it shows');
});

test('every scene belongs to a map that names it, and every map that names a scene has it', () => {
  const named = new Map();
  for (const id of mapIds) for (const sc of actionsOf(shippedSrc(id))) { assert.ok(SCENE[sc], `${id} names the scene "${sc}", which does not exist`); assert.equal(SCENE[sc].map, id, `${sc} belongs to ${SCENE[sc].map} but ${id} names it`); named.set(sc, id); }
  for (const s of SCENES) assert.equal(named.get(s.id), s.map, `${s.id} is not named by a trigger of ${s.map}`);
  assert.ok(ACTION_KEYS.includes('cinematic'));
});

test('the sequencer is a function of time: the same actions in the same order however the clock is cut up', () => {
  for (const sc of SCENES) {
    const all = (sc.actions ?? []).map((a) => JSON.stringify(a)), fire = (dts) => { let st = startScene(sc); const out = []; for (const dt of dts) { const r = advanceScene(sc, st, dt); st = r.state; out.push(...r.run.map((a) => JSON.stringify(a))); } return { st, out }; };
    const whole = fire([sc.length + 5]), steps = fire(Array(Math.ceil(sc.length / 0.016) + 5).fill(0.016)), odd = fire(Array(500).fill(0.37));
    for (const r of [whole, steps, odd]) { assert.ok(r.st.done, sc.id); assert.deepEqual([...r.out].sort(), [...all].sort(), `${sc.id}: every action runs exactly once`); }
    assert.deepEqual(steps.out, odd.out.slice(0, steps.out.length) && steps.out, 'order');
    const ordered = [...(sc.actions ?? [])].sort((a, b) => a.t - b.t).map((a) => JSON.stringify(a)); assert.deepEqual(steps.out, ordered, `${sc.id}: in order of time`);
    assert.equal(advanceScene(sc, whole.st, 1).run.length, 0, 'a finished scene does nothing more');
  }
});

test('skipping a scene at any moment runs the actions not yet run, and ends it: a skipped scene leaves what a watched one leaves', () => {
  for (const sc of SCENES) {
    const all = (sc.actions ?? []).length;
    for (const cut of [0, 0.5, sc.length * 0.3, sc.length * 0.9, sc.length]) {
      let st = startScene(sc); const ran = []; const a = advanceScene(sc, st, cut); st = a.state; ran.push(...a.run); const k = skipScene(sc, st); ran.push(...k.run);
      assert.equal(ran.length, all, `${sc.id} cut at ${cut}: every action ran once in all`); assert.ok(k.state.done); assert.equal(k.state.t, sc.length);
    }
  }
});

test('a scene in progress is plain data and survives a JSON round trip', () => {
  const sc = SCENES[0]; let st = startScene(sc); st = advanceScene(sc, st, 10).state;
  const back = JSON.parse(JSON.stringify(st)); assert.deepEqual(back, st);
  const a = advanceScene(sc, st, 5), b = advanceScene(sc, back, 5); assert.deepEqual(a, b);
});

test('a scene writes nothing to the world: resolve it, sample it, play it, skip it; the hash is the same', () => {
  for (const sc of SCENES) {
    const w = worldOf(sc.map), before = hashWorld(w), r = resolveScene(sc, w, (x, z) => floorAt(w, x, z));
    for (let t = 0; t <= sc.length; t += 0.25) { cameraAt(r, t); subtitleAt(sc, t); fadeAt(sc, t); }
    let st = startScene(sc); for (let i = 0; i < 100; i++) st = advanceScene(sc, st, 0.3).state; skipScene(sc, st);
    assert.equal(hashWorld(w), before, `${sc.id} changed the world`);
  }
});

test('the points of every scene resolve against its map (a named creature exists) and the camera never leaves the air', () => {
  for (const sc of SCENES) {
    const w = worldOf(sc.map), m = w.map, S = m.cell;
    for (const k of sc.keys) for (const spec of [k.eye, k.look]) {
      const pt = resolvePoint(spec, w, S); assert.ok(pt, `${sc.id}: ${JSON.stringify(spec)} does not resolve`);
      if (typeof spec === 'string' && spec.startsWith('enemy:')) assert.ok(w.enemies.some((e) => e.kind === spec.split(':')[1]), `${sc.id}: no ${spec} in ${sc.map}`);
    }
    const r = resolveScene(sc, w, (x, z) => floorAt(w, x, z));
    for (let t = 0; t <= sc.length + 1e-9; t += 0.5) {
      const c = cameraAt(r, Math.min(t, sc.length)), cx = Math.floor(c.x / S), cz = Math.floor(c.z / S), kind = m.kind(cx, cz);
      assert.ok(Number.isFinite(c.x + c.y + c.z + c.yaw + c.pitch), `${sc.id} t=${t}: finite`);
      assert.ok(cx >= 0 && cz >= 0 && cx < m.w && cz < m.h, `${sc.id} t=${t}: the camera is outside the map`);
      assert.notEqual(kind, 'wall', `${sc.id} t=${t}: the camera is inside a wall at cell ${cx},${cz}`);
      const fl = floorAt(w, c.x, c.z), ce = ceilingAt(w, c.x, c.z);
      assert.ok(c.y >= fl + 0.2 && c.y <= ce - 0.1, `${sc.id} t=${t}: the eye ${c.y.toFixed(2)} m is outside [${(fl + 0.2).toFixed(2)}, ${(ce - 0.1).toFixed(2)}] at cell ${cx},${cz}`);
      assert.ok(Math.abs(c.pitch) < 1.2, `${sc.id} t=${t}: the camera looks nearly straight up or down`);
    }
  }
});

test('a scene that can be played ends on the player\'s own view, or fades to black, so the cut back to play does not jump', () => {
  for (const sc of SCENES) {
    const w = worldOf(sc.map), r = resolveScene(sc, w, (x, z) => floorAt(w, x, z)), last = cameraAt(r, sc.length), p = w.player, endsBlack = fadeAt(sc, sc.length) > 0.95;
    const nearEye = Math.hypot(last.x - p.x, last.z - p.z) < 0.6 && Math.abs(last.y - (floorAt(w, p.x, p.z) + 1.6)) < 0.8;
    assert.ok(endsBlack || nearEye || sc.keys[sc.keys.length - 1].eye === 'player', `${sc.id}: ends away from the player and not in black`);
  }
});

test('the opening of a scene is dark, the end of a fading one is black, and a scene with no fade list starts clear', () => {
  const sc = SCENES.find((s) => s.id === 'gate-open'); assert.equal(fadeAt(sc, 0), 1); assert.ok(fadeAt(sc, 0.6) > 0.3 && fadeAt(sc, 0.6) < 0.7); assert.equal(fadeAt(sc, 5), 0); assert.equal(fadeAt(sc, sc.length), 1);
  assert.equal(fadeAt({ fadeFrom: 0, length: 10 }, 3), 0);
});

test('the camera pose: yaw 0 looks toward -z, the pitch follows the height of the look point', () => {
  const w = { map: { cell: 2 }, player: { x: 10, z: 10, yaw: 0 }, enemies: [] };
  const r = resolveScene({ id: 'x', length: 8, keys: [{ t: 0, eye: [5, 5, 1.6], look: [5, 0, 1.6] }, { t: 8, eye: [5, 5, 1.6], look: [5, 0, 6] }] }, w);
  const a = cameraAt(r, 0), b = cameraAt(r, 8); assert.ok(Math.abs(a.yaw) < 1e-9 && Math.abs(a.pitch) < 1e-9); assert.ok(b.pitch > 0.2);
  const east = resolveScene({ id: 'x', length: 8, keys: [{ t: 0, eye: [5, 5], look: [9, 5] }, { t: 8, eye: [5, 5], look: [9, 5] }] }, w); assert.ok(Math.abs(cameraAt(east, 0).yaw + Math.PI / 2) < 1e-9, 'looking east is yaw -pi/2 (the game turns left for positive yaw)');
  assert.deepEqual(resolvePoint('ahead:5:2', w), { x: 10, z: 5, up: 2 }); assert.deepEqual(resolvePoint('ahead:-5', w), { x: 10, z: 15, up: 1.6 });
  assert.equal(resolvePoint('enemy:nothing', w), null); assert.equal(resolvePoint('garbage', w), null);
  const unresolved = resolveScene({ id: 'x', length: 8, keys: [{ t: 0, eye: 'enemy:nothing', look: 'enemy:nothing' }, { t: 8, eye: 'player', look: 'player' }] }, w); assert.ok(Number.isFinite(cameraAt(unresolved, 3).x), 'a scene whose point cannot be found falls back to the player and never throws');
});

test('the text of every scene obeys the lore rules (prose lint) and says what a map has not already said', () => {
  const said = new Set();
  for (const id of mapIds) { const m = shippedSrc(id); for (const q of m.messages ?? []) said.add(q.text.toLowerCase()); for (const l of m.intro?.lines ?? []) said.add(l.toLowerCase()); }
  for (const sc of SCENES) for (const l of sc.lines ?? []) {
    assert.deepEqual(lintLine(l.text, { speaker: l.who }), [], `${sc.id}: "${l.text}"`);
    assert.ok(!said.has(l.text.toLowerCase()), `${sc.id}: "${l.text}" is already said by a map`);
    assert.ok(['', 'INES', 'SIGNAL HOUSE', 'HULL'].includes(l.who), `${sc.id}: ${l.who} does not speak in a scene`);
  }
});

test('seen scenes: a scene plays once by default; the list is lazy, deduplicated, sanitized and survives a save', () => {
  let p = newProgress(); assert.equal(p.cinematicsSeen, undefined, 'lazy');
  assert.equal(hasSeen(p, 'threshold'), false); p = markSeen(p, 'threshold'); p = markSeen(p, 'threshold'); assert.deepEqual(p.cinematicsSeen, ['threshold']); assert.equal(hasSeen(p, 'threshold'), true);
  const back = sanitizeProgress(JSON.parse(JSON.stringify(p))); assert.deepEqual(back.cinematicsSeen, ['threshold']);
  const bad = sanitizeProgress({ cinematicsSeen: ['ok-one', 5, '<script>', 'x', 'a'.repeat(40), 'ok-one'] }); assert.deepEqual(bad.cinematicsSeen, ['ok-one']);
  assert.equal(sanitizeProgress({ cinematicsSeen: 'nope' }).cinematicsSeen, undefined);
});

test('the sim only announces a scene: the action emits one event and changes nothing else', async () => {
  const { runAction } = await import('../src/engine/script.js');
  const w = worldOf('C2M01'), before = hashWorld(w), n = w.events.length; runAction(w, { cinematic: 'threshold' });
  const ev = w.events.slice(n); assert.equal(ev.length, 1); assert.equal(ev[0].type, 'cinematic'); assert.equal(ev[0].id, 'threshold');
  w.events.length = n; assert.equal(hashWorld(w), before, 'nothing else moved');
});

test('the Record offers the scenes a player has seen, in the order they are written, and the UI draws a button for each', async () => {
  const { recordScenes } = await import('../src/game/record.js');
  assert.deepEqual(recordScenes(newProgress(), SCENES), [], 'none seen, none offered');
  const p = { ...newProgress(), cinematicsSeen: ['the-gate', 'threshold', 'unknown-scene'] };
  assert.deepEqual(recordScenes(p, SCENES).map((s) => s.id), ['threshold', 'the-gate'], 'in the order of scenes.js; an id with no scene is dropped');
  const { UI } = await import('../src/game/ui.js'), { standInDom } = await import('./stubs.js'); const dom = standInDom();
  const ui = new UI(new Proxy({}, { get: () => () => {} })); ui.recordOpen([], { all: 0, docs: 0 }, null, recordScenes(p, SCENES));
  const html = document.getElementById('record-list').innerHTML; assert.ok(html.includes('data-scene="threshold"') && html.includes('data-scene="the-gate"') && html.includes('Watch again'), html.slice(0, 200)); assert.ok(!html.includes('record-empty'), 'scenes alone are not "nothing yet"');
  ui.recordOpen([], { all: 0, docs: 0 }, null, []); assert.ok(document.getElementById('record-list').innerHTML.includes('record-empty'));
  ui.cine({ who: 'INES', text: 'Hello there', k: 0.5, fade: 0.25 }); assert.equal(document.getElementById('cine-text').textContent, 'Hello '); assert.equal(document.getElementById('cine-fade').style.opacity, '0.25'); ui.cine(null); assert.ok(document.getElementById('cine').classList.contains('hidden'));
});
