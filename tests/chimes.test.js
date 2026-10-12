// PT-038 (Campaign 2 Act B, design/ACTB.md E6): CHIMES. A chime is a note on a plinth (Use or a shot strikes it); a phrase is the last notes struck, in order, within a window; the tree plays the next round's phrase.
// Sim only (the glyphs, the lit fruit and the pitches are held by the render and audio tests). The "solver": the bot replays the phrases the tree plays through the real sim and the gate opens; a wrong order does not.
import test from 'node:test';
import assert from 'node:assert/strict';
import { parseMap, validateMap } from '../src/engine/mapformat.js';
import { createWorld, step, drainEvents, hashWorld } from '../src/engine/world.js';
import { runRoute } from '../src/engine/harness.js';
import { CHIME } from '../src/engine/defs.js';

const idle = (o = {}) => ({ move: [0, 0], yaw: 0, pitch: 0, fire: false, aim: false, sprint: false, use: false, weapon: null, weaponStep: 0, map: false, ...o });
const run = (w, n, cmd = () => idle()) => { const ev = []; for (let i = 0; i < n; i++) { step(w, cmd(i)); ev.push(...drainEvents(w)); } return ev; };
const R1 = [0, 2, 1], R2 = [3, 1, 4, 0], R3 = [2, 4, 0, 3, 1];
/** a hall 40 cells long and 7 wide: the tree at cell 8 and five chimes (notes 0 to 4, ids c0 to c4) in a row at cells 12 to 20, the exit locked until the third round is played */
const src = ({ chimes, props } = {}) => ({ format: 1, id: 'CH', version: 1, name: 'Chimes', cellSize: 2, grid: ['#'.repeat(40), ...Array.from({ length: 7 }, () => '#' + '.'.repeat(38) + '#'), '#'.repeat(40)], doors: [], secrets: [],
  messages: [{ id: 'one', at: [3, 4], radius: 0.1, text: 'one' }, { id: 'two', at: [3, 4], radius: 0.1, text: 'two' }],
  chimes: chimes ?? [{ id: 'r1', phrase: R1, window: 6 }, { id: 'r2', phrase: R2, window: 6 }, { id: 'r3', phrase: R3, window: 6 }],
  entities: [{ type: 'player', at: [10, 4], facing: 'east' }, { type: 'exit', at: [38, 4], locked: true }, { type: 'prop', kind: 'chimetree', id: 'tree', at: [8, 4], plays: ['r1', 'r2', 'r3'] },
    ...[0, 1, 2, 3, 4].map((n) => ({ type: 'prop', kind: 'chime', id: 'c' + n, note: n, at: [12 + 2 * n, 4] })), ...(props ?? [])],
  triggers: [{ id: 't1', when: 'seq:r1', do: [{ message: 'one' }] }, { id: 't2', when: 'seq:r2', do: [{ message: 'two' }] }, { id: 't3', when: ['seq:r1', 'seq:r2', 'seq:r3'], do: [{ exit: { set: 'unlock' } }] }] });
const world = (o) => createWorld(parseMap(src(o)), { seed: 1, difficulty: 'normal' });
const chime = (w, id) => w.map.props.find((p) => p.id === id);
/** put the player beside a chime (or the tree), facing it, and press Use once */
function strike(w, id) { const pr = chime(w, id); w.player.x = pr.x - 1.1; w.player.z = pr.z; w.player.yaw = Math.PI / 2 * -1; const ev = run(w, 1, () => idle({ use: true })); run(w, 1); return ev; }

test('the format: phrases, chime notes, the tree\'s rounds and the seq: condition are all checked', () => {
  assert.equal(validateMap(src()).ok, true, JSON.stringify(validateMap(src()).errors));
  const bad = (f) => { const s = src(); f(s); return validateMap(s).ok; };
  assert.equal(bad((s) => { s.chimes[0].phrase = [1]; }), false, 'a phrase of one note is not a phrase'); assert.equal(bad((s) => { s.chimes[0].phrase = [0, 9]; }), false); assert.equal(bad((s) => { s.chimes[0].window = 0; }), false);
  assert.equal(bad((s) => { s.chimes.push({ id: 'r1', phrase: [0, 1], window: 5 }); }), false, 'a duplicate id'); assert.equal(bad((s) => { s.entities.find((e) => e.id === 'c0').note = 7; }), false);
  assert.equal(bad((s) => { s.entities.find((e) => e.kind === 'chimetree').plays = ['nope']; }), false); assert.equal(bad((s) => { s.triggers[0].when = 'seq:nope'; }), false);
  assert.equal(bad((s) => { delete s.entities.find((e) => e.id === 'c1').id; }), false, 'a chime needs an id'); assert.equal(bad((s) => { s.entities = s.entities.filter((e) => e.kind !== 'chime'); }), false, 'chimes without a chime');
  const plain = createWorld(parseMap({ ...src(), chimes: undefined, entities: src().entities.filter((e) => e.kind !== 'chime' && e.kind !== 'chimetree').map((e) => (e.type === 'exit' ? { ...e, locked: false } : e)), triggers: [] }), { seed: 1 }); assert.equal('chimes' in plain, false, 'a world without chimes has no chime state');
});

test('Use on a chime strikes it: the note sounds as an event with its note and the count goes up', () => {
  const w = world(), ev = strike(w, 'c3'); const n = ev.filter((e) => e.type === 'chime_note');
  assert.equal(n.length, 1); assert.deepEqual([n[0].id, n[0].note, n[0].who], ['c3', 3, 'player']); assert.equal(w.chimes.struck.c3, 1);
});

test('a phrase is the last notes struck, in order, each within the window: right order matches, wrong order, a late note and a different note do not; a mistake can be followed by the answer', () => {
  const w = world(); const hit = (ids, gap = 1.0) => { for (const id of ids) { strike(w, id); run(w, Math.round(gap * 60)); } };
  hit(['c0', 'c2']); assert.equal(w.chimes.matched.r1, undefined, 'two notes are not three'); hit(['c1']); assert.notEqual(w.chimes.matched.r1, undefined, 'c0 c2 c1 is the first round');
  const v = world(); for (const id of ['c1', 'c2', 'c0']) { strike(v, id); run(v, 60); } assert.equal(v.chimes.matched.r1, undefined, 'the wrong order');
  const late = world(); strike(late, 'c0'); run(late, 60 * 8); strike(late, 'c2'); run(late, 60); strike(late, 'c1'); assert.equal(late.chimes.matched.r1, undefined, 'eight seconds between two notes is beyond the six-second window');
  const retry = world(); hit2(retry, ['c4', 'c4', 'c0', 'c2', 'c1']); assert.notEqual(retry.chimes.matched.r1, undefined, 'a wrong note first and then the right three: it is the LAST notes that count');
  function hit2(q, ids) { for (const id of ids) { strike(q, id); run(q, 60); } }
});

test('a hitscan shot that stops on a chime strikes it, once a volley', () => {
  const w = world(); w.player.weapons = ['flare', 'scattergun']; w.player.weapon = 'scattergun'; w.player.ammo.shell = 20; const pr = chime(w, 'c2'); w.player.x = pr.x - 5; w.player.z = pr.z; w.player.yaw = -Math.PI / 2; w.player.pitch = -0.06; w.player.hp = 1e9;
  w.player.switchT = 0; const ev = run(w, 40, (i) => idle({ fire: i < 2 })); assert.equal(ev.filter((e) => e.type === 'chime_note' && e.id === 'c2').length, 1, 'one shot, one ring, however many pellets stop on it'); assert.ok(w.chimes.struck.c2 >= 1);
});

test('the tree plays the next unsolved round, one note every beat, from itself, and the notes it plays are not the player\'s', () => {
  const w = world(); w.player.x = chime(w, 'tree').x - 1.5; w.player.z = chime(w, 'tree').z; w.player.yaw = -Math.PI / 2;
  strike(w, 'c4'); run(w, 30); const ev = run(w, 1, () => idle({ use: true, move: [0, 0] })); w.player.x = chime(w, 'tree').x - 1.6; w.player.z = chime(w, 'tree').z; w.player.yaw = -Math.PI / 2;
  const ev2 = [...ev, ...(() => { const e = run(w, 1, () => idle({ use: true })); return e; })(), ...run(w, 60 * 4)];
  const played = ev2.filter((e) => e.type === 'chime_note' && e.who === 'tree'); assert.deepEqual(played.map((e) => e.note), R1, 'the first round');
  assert.equal(w.chimes.recent.length, 0, 'what was struck before is forgotten when the tree plays'); assert.equal(ev2.filter((e) => e.type === 'chime_played').length, 1); assert.equal(w.chimes.matched.r1, undefined, 'the tree\'s notes never solve a round');
  const gaps = played.map((e) => e.tick).map((t, i, a) => (i ? (t - a[i - 1]) / 60 : null)).slice(1); assert.ok(gaps.every((g) => Math.abs(g - CHIME.beat) < 0.05), 'a note every ' + CHIME.beat + ' s: ' + gaps);
});

test('the rounds in order: solving one makes the tree play the next; all solved, it plays the last again; the trigger fires its action once and the exit unlocks at the third', () => {
  const w = world(); const tree = () => { const pr = chime(w, 'tree'); w.player.x = pr.x - 1.5; w.player.z = pr.z; w.player.yaw = -Math.PI / 2; return run(w, 1, () => idle({ use: true })).concat(run(w, 60 * 5)); };
  const answer = (notes) => { for (const n of notes) { strike(w, 'c' + n); run(w, 50); } };
  assert.deepEqual(tree().filter((e) => e.who === 'tree').map((e) => e.note), R1); answer(R1); assert.equal(w.triggerState.t1.fired, true); assert.equal(w.exitLocked.x ?? true, w.exitLocked.x ?? true);
  assert.deepEqual(tree().filter((e) => e.who === 'tree').map((e) => e.note), R2, 'round two'); answer(R2); assert.equal(w.triggerState.t2.fired, true);
  assert.deepEqual(tree().filter((e) => e.who === 'tree').map((e) => e.note), R3, 'round three'); assert.equal(Object.values(w.exitLocked).every(Boolean), true, 'still locked'); answer(R3); assert.equal(w.triggerState.t3.fired, true); assert.equal(Object.values(w.exitLocked).some(Boolean), false, 'open');
  assert.deepEqual(tree().filter((e) => e.who === 'tree').map((e) => e.note), R3, 'all solved: the last round again');
});

test('the solver: the bot hears each round and answers it through the real input layer, and the exit opens; a wrong answer leaves it locked', () => {
  const map = parseMap(src()), ops = [{ op: 'chime', id: 'tree' }, ...R1.map((n) => ({ op: 'chime', id: 'c' + n })), { op: 'chime', id: 'tree' }, ...R2.map((n) => ({ op: 'chime', id: 'c' + n })), { op: 'chime', id: 'tree' }, ...R3.map((n) => ({ op: 'chime', id: 'c' + n })), { op: 'goto', at: [38, 4] }];
  const r = runRoute(map, ops); assert.equal(r.result, 'complete', JSON.stringify(r.failed ?? r.result)); assert.deepEqual(Object.keys(r.world.chimes.matched).sort(), ['r1', 'r2', 'r3']);
  const wrong = ops.slice(); wrong.splice(3, 1, { op: 'chime', id: 'c4' }); const r2 = runRoute(map, wrong); assert.notEqual(r2.result, 'complete', 'a wrong note in round one: the gate stays shut');
});

test('a world with chimes is deterministic and saves whole', () => {
  const a = world(), b = world(); for (const q of [a, b]) { strike(q, 'tree'); run(q, 60 * 3); for (const n of R1) { strike(q, 'c' + n); run(q, 40); } }
  assert.equal(hashWorld(a), hashWorld(b)); assert.ok(a.chimes.matched.r1 != null);
});
