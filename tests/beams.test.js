// PT-033 (Episode 4, Batch B): THE BEAM TRACER (src/engine/beams.js): light that runs the cell grid, one-sided mirrors turned a quarter step by Use, receivers that fire triggers. Hand-made halls; the shipped Mirror Array
// has its own tests (tests/batch-b.test.js).
import test from 'node:test';
import assert from 'node:assert/strict';
import { validateMap, parseMap } from '../src/engine/mapformat.js';
import { createWorld, step, drainEvents, useTarget, hashWorld } from '../src/engine/world.js';
import { makeSave, parseSave, loadWorld } from '../src/engine/save.js';
import { traceBeams, REFLECT, DIRS } from '../src/engine/beams.js';

const idle = (o = {}) => ({ move: [0, 0], yaw: 0, pitch: 0, fire: false, aim: false, sprint: false, use: false, weapon: null, weaponStep: 0, map: false, ...o });
const run = (w, n, cmd = () => idle()) => { const ev = []; for (let i = 0; i < n; i++) { step(w, cmd(i)); ev.push(...drainEvents(w)); } return ev; };
const bad = (s, re) => { const v = validateMap(s); assert.equal(v.ok, false, 'expected invalid'); assert.ok(v.errors.some((e) => re.test(e)), re + ' in ' + JSON.stringify(v.errors)); };

/** a hall of 13 x 9 cells, walls round; `props` are the beam furniture, `extra` more entities, `grid` may be edited */
const hall = ({ props = [], extra = [], triggers = null, edit = null } = {}) => {
  const g = Array.from({ length: 9 }, (_, z) => Array.from({ length: 13 }, (_, x) => (x === 0 || z === 0 || x === 12 || z === 8 ? '#' : '.')));
  if (edit) edit(g);
  return { format: 1, id: 'B1', version: 1, name: 'Beams', cellSize: 2, grid: g.map((r) => r.join('')), doors: [], secrets: [], ...(triggers ? { triggers } : {}),
    entities: [{ type: 'player', at: [1, 7], facing: 'north' }, { type: 'exit', at: [11, 7] }, ...props, ...extra] };
};
const E = (id, x, z, dir = 'e') => ({ type: 'prop', kind: 'emitter', id, at: [x, z], dir });
const M = (id, x, z, rot) => ({ type: 'prop', kind: 'mirror', id, at: [x, z], rot });
const R = (id, x, z) => ({ type: 'prop', kind: 'receiver', id, at: [x, z] });
const trace = (src, rots, open) => traceBeams(parseMap(src), rots, open);

test('a beam runs straight to the wall, lights nothing, and is drawn from the emitter to the wall', () => {
  const t = trace(hall({ props: [E('e1', 2, 4)] }));
  assert.deepEqual(t.lit, []); assert.equal(t.lines.length, 1);
  const [a, b] = [t.lines[0].pts[0], t.lines[0].pts.at(-1)]; assert.deepEqual(a, [2.5, 4.5]); assert.deepEqual(b, [11.5 + 0.5, 4.5], 'it ends on the face of the wall at x 12');
});
test('a receiver in the line is lit, and a pillar between puts it out', () => {
  assert.deepEqual(trace(hall({ props: [E('e1', 2, 4), R('r1', 9, 4)] })).lit, ['r1']);
  assert.deepEqual(trace(hall({ props: [E('e1', 2, 4), R('r1', 9, 4), { type: 'prop', kind: 'pillar', at: [6, 4] }] })).lit, [], 'a prop that fills its cell stops light');
});
test('the mirrors: each of the four rotations turns the beams that arrive on its face and swallows the ones that arrive on its back', () => {
  const want = [];                                                                   // rot -> [travelling dir -> leaving dir], from the table, and the geometry written out by hand
  assert.deepEqual(REFLECT[0], { s: 'w', e: 'n' }); assert.deepEqual(REFLECT[1], { s: 'e', w: 'n' }); assert.deepEqual(REFLECT[2], { n: 'e', w: 's' }); assert.deepEqual(REFLECT[3], { n: 'w', e: 's' });
  void want;
  // an emitter from the west (travelling east) onto a mirror at (6,4): only rot 0 (-> north) and rot 3 (-> south) take it; rot 1 and rot 2 are seen from behind
  const probe = (rot) => trace(hall({ props: [E('e1', 2, 4), M('m1', 6, 4, rot), R('north', 6, 1), R('south', 6, 7)] })).lit;
  assert.deepEqual(probe(0), ['north']); assert.deepEqual(probe(3), ['south']); assert.deepEqual(probe(1), []); assert.deepEqual(probe(2), []);
  // an emitter from the north (travelling south) onto a mirror at (6,4): rot 0 -> west, rot 1 -> east
  const probeS = (rot) => trace(hall({ props: [E('e1', 6, 1, 's'), M('m1', 6, 4, rot), R('west', 2, 4), R('east', 10, 4)] })).lit;
  assert.deepEqual(probeS(0), ['west']); assert.deepEqual(probeS(1), ['east']); assert.deepEqual(probeS(2), []); assert.deepEqual(probeS(3), []);
  // a `rots` override beats the map's own rotation
  assert.deepEqual(trace(hall({ props: [E('e1', 2, 4), M('m1', 6, 4, 1), R('north', 6, 1), R('south', 6, 7)] }), { m1: 3 }).lit, ['south']);
});
test('a chain of mirrors: the path bends twice and the order of the turns matters', () => {
  const props = [E('e1', 2, 6), M('m1', 6, 6, 0), M('m2', 6, 2, 1), R('r1', 10, 2)];   // east to (6,6): rot 0 -> north; north to (6,2): rot 1 is 'NE' (s->e, w->n): a beam travelling north arrives on the back
  assert.deepEqual(trace(hall({ props })).lit, [], 'the second mirror is the wrong way round');
  const p2 = [E('e1', 2, 6), M('m1', 6, 6, 0), M('m2', 6, 2, 2), R('r1', 10, 2)];       // rot 2 (SE): n->e
  assert.deepEqual(trace(hall({ props: p2 })).lit, ['r1']);
});
test('a loop of four mirrors does not run for ever', () => {
  const props = [E('e1', 4, 2, 'e'), M('a', 8, 2, 3), M('b', 8, 6, 2), M('c', 4, 6, 1), M('d', 4, 2, 0)];
  const t = trace(hall({ props: props.filter((p) => p.id !== 'd') })); assert.ok(t.lines[0].pts.length < 20);
  const loop = trace(hall({ props: [E('e1', 3, 2, 'e'), M('a', 8, 2, 3), M('b', 8, 6, 2), M('c', 4, 6, 1), M('d', 4, 3, 0)] })); assert.ok(loop.lines[0].pts.length < 40, 'it ends (a loop is cut at the first repeat)');
});
test('a shut door stops a beam and an open one lets it by', () => {
  const src = hall({ props: [E('e1', 2, 4), R('r1', 10, 4)], edit: (g) => { for (let z = 1; z <= 7; z++) g[z][6] = z === 4 ? 'D' : '#'; } });
  src.doors = [{ at: [6, 4] }];
  assert.deepEqual(trace(src, {}, () => false).lit, []); assert.deepEqual(trace(src, {}, (cx, cz) => cx === 6 && cz === 4).lit, ['r1']);
});
test('the sim: Use turns the mirror in front of you, the receiver lights, the trigger fires, the beams follow the doors', () => {
  const src = hall({ props: [E('e1', 2, 4), M('m1', 6, 4, 1), R('r1', 6, 7)], triggers: [{ id: 'lit-r1', when: 'lit:r1', do: [{ objective: 'The light found its way' }] }] });
  const w = createWorld(parseMap(src), { seed: 1, difficulty: 'normal' });
  assert.ok(w.mirrors && w.beams, 'a map with an emitter has the state'); assert.deepEqual(w.beams.lit, []); assert.equal(w.mirrors.m1, 1);
  Object.assign(w.player, { x: 11.0, z: 9.0, yaw: -Math.PI / 2 });            // stand west of the mirror, looking east at it
  assert.equal(useTarget(w)?.mirrorId, 'm1', 'the mirror is the use target');
  let ev = run(w, 3, (i) => idle({ use: i === 0 })); const turns = ev.filter((e) => e.type === 'mirror_turn'); assert.equal(turns.length, 1); assert.equal(w.mirrors.m1, 2);
  assert.deepEqual(w.beams.lit, [], 'rot 2 (SE) takes a beam travelling north or west, not east');
  ev = run(w, 3, (i) => idle({ use: i === 0 })); assert.equal(w.mirrors.m1, 3);                                                                       // SW: east -> south: onto the receiver
  assert.deepEqual(w.beams.lit, ['r1']); assert.ok(ev.some((e) => e.type === 'receiver_lit' && e.id === 'r1')); run(w, 2); assert.equal(w.objective, 'The light found its way', 'the trigger fired');
  ev = run(w, 3, (i) => idle({ use: i === 0 })); assert.equal(w.mirrors.m1, 0); assert.deepEqual(w.beams.lit, []); assert.ok(ev.some((e) => e.type === 'receiver_dark'));
});
test('a world with no emitter has no beam state at all', () => {
  const w = createWorld(parseMap(hall({})), { seed: 1, difficulty: 'normal' }); assert.equal(w.mirrors, undefined); assert.equal(w.beams, undefined);
  const before = hashWorld(w); run(w, 30); assert.notEqual(before, undefined);
});
test('the mirrors survive a save and a load', () => {
  const src = hall({ props: [E('e1', 2, 4), M('m1', 6, 4, 1), R('r1', 6, 7)] }), map = parseMap(src);
  const w = createWorld(map, { seed: 1, difficulty: 'normal' }); w.mirrors.m1 = 3; run(w, 2);
  const parsed = parseSave(JSON.stringify(makeSave(w, 'mid-level', { now: 5 }))); assert.equal(parsed.ok, true);
  const loaded = loadWorld(parsed.save, () => parseMap(src)); assert.equal(loaded.ok, true); assert.equal(loaded.world.mirrors.m1, 3); assert.deepEqual(loaded.world.beams.lit, ['r1']);
});
test('validation: a beam prop needs an id, a mirror a rotation of 0 to 3, an emitter a direction, a trigger a receiver that exists', () => {
  bad(hall({ props: [{ type: 'prop', kind: 'mirror', at: [4, 4] }] }), /needs an id/);
  bad(hall({ props: [M('m1', 4, 4, 5)] }), /rot must be/);
  bad(hall({ props: [E('e1', 4, 4, 'x')] }), /dir must be/);
  bad(hall({ props: [M('m1', 4, 4, 0), M('m1', 6, 4, 0)] }), /duplicate beam id/);
  bad(hall({ props: [E('e1', 2, 4)], triggers: [{ id: 't', when: 'lit:nope', do: [{ objective: 'x' }] }] }), /unknown receiver/);
  assert.equal(validateMap(hall({ props: [E('e1', 2, 4), R('r1', 9, 4)], triggers: [{ id: 't', when: 'lit:r1', do: [{ objective: 'x' }] }] })).ok, true);
});
void DIRS;
