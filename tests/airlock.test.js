// PT-033 (Episode 4, Batch C): AIRLOCKS AND VACUUM (src/engine/airlock.js; design/EPISODE4.md E2). A hub, a lock (two doors that refuse to be open together and for LOCK.cycle s after one shuts), a bay in vacuum while its hull door is open to the dark,
// the hull door shut by a script (`close`), the screen frost / audio events. Hand-made corridors; the shipped Cold Dock has its own tests (tests/batch-c.test.js).
import test from 'node:test';
import assert from 'node:assert/strict';
import { validateMap, parseMap } from '../src/engine/mapformat.js';
import { createWorld, step, drainEvents, useTarget, doorAtCell } from '../src/engine/world.js';
import { runActions } from '../src/engine/script.js';
import { lockBusy, inVacuum } from '../src/engine/airlock.js';
import { LOCK, VACUUM, TICK } from '../src/engine/defs.js';

const idle = (o = {}) => ({ move: [0, 0], yaw: 0, pitch: 0, fire: false, aim: false, sprint: false, use: false, weapon: null, weaponStep: 0, map: false, ...o });
const run = (w, n, cmd = () => idle()) => { const ev = []; for (let i = 0; i < n; i++) { step(w, cmd(i)); ev.push(...drainEvents(w)); } return ev; };
const bad = (s, re) => { const v = validateMap(s); assert.equal(v.ok, false, 'expected invalid'); assert.ok(v.errors.some((e) => re.test(e)), re + ' in ' + JSON.stringify(v.errors)); };

/** a corridor on row 2: the hub (x 1..4), lock door D1 (5), the chamber (6, 7), lock door D2 (8), the bay (9..14), the hull door H (15, open from the start), a sill of open air (16) */
const dock = ({ d1 = { interlock: [8, 2] }, d2 = { interlock: [5, 2] }, vacuum = undefined } = {}) => {
  const row = (z) => (z === 2 ? '#.....' + 'DD'.slice(0, 0) : '#######');
  const g = ['#'.repeat(19), '#'.repeat(19), '#....D..D......D::#', '#'.repeat(19)];
  void row;
  return { format: 1, id: 'C1', version: 1, name: 'Dock', cellSize: 2, grid: g, secrets: [],
    doors: [{ at: [5, 2], ...d1 }, { at: [8, 2], ...d2 }, { at: [15, 2], remote: true, open: true }],
    vacuum: vacuum ?? [{ rect: [9, 2, 14, 2], seals: [[15, 2]] }, { rect: [6, 2, 7, 2], seals: [[15, 2]], and: [[8, 2]] }],
    entities: [{ type: 'player', at: [2, 2], facing: 'east' }, { type: 'exit', at: [16, 2] }] };
};
const world = (src, o = {}) => createWorld(parseMap(src), { seed: 1, difficulty: 'normal', ...o });
const cellC = (c) => (c + 0.5) * 2;
const at = (w, cx, yaw = -Math.PI / 2) => Object.assign(w.player, { x: cellC(cx), z: cellC(2), yaw });

test('a hull door that starts open is open, and the bay behind a lock is in vacuum while it is', () => {
  const w = world(dock()); const h = doorAtCell(w, 15, 2); assert.equal(h.open, 1); assert.equal(h.target, 1);
  assert.equal(inVacuum(w, cellC(11), cellC(2)), true, 'the bay is in vacuum'); assert.equal(inVacuum(w, cellC(2), cellC(2)), false, 'the hub is not');
  assert.equal(inVacuum(w, cellC(6), cellC(2)), false, 'the lock chamber keeps its air while its outer door is shut');
  run(w, 5); assert.equal(h.open, 1, 'nothing closes a hull door by itself');
});
test('an airlock: the second door is refused while the first is open and for LOCK.cycle seconds after it has shut', () => {
  const w = world(dock()); const d1 = doorAtCell(w, 5, 2), d2 = doorAtCell(w, 8, 2);
  at(w, 4); let ev = run(w, 2, (i) => idle({ use: i === 0 })); assert.ok(ev.some((e) => e.type === 'door_open'), 'the first door opens'); assert.equal(d1.target, 1);
  at(w, 7, -Math.PI / 2); ev = run(w, 2, (i) => idle({ use: i === 0 })); assert.ok(ev.some((e) => e.type === 'door_cycling'), 'the second is refused'); assert.equal(d2.target, 0);
  assert.equal(useTarget(w)?.interlock?.join(), '5,2'); assert.equal(lockBusy(w, d2), true);
  // let the first shut (nobody in it, holdOpen seconds), then the equalising time
  Object.assign(w.player, { x: cellC(7) }); let shut = []; for (let i = 0; i < Math.ceil(9 / TICK) && !shut.some((e) => e.type === 'door_close'); i++) { step(w, idle()); shut.push(...drainEvents(w)); } assert.ok(shut.some((e) => e.type === 'door_close'), 'the first door shut'); for (let i = 0; i < 40 && d1.open > 0; i++) { step(w, idle()); drainEvents(w); } assert.equal(d1.open, 0);
  at(w, 7); ev = run(w, 2, (i) => idle({ use: i === 0 })); assert.ok(ev.some((e) => e.type === 'door_cycling'), 'still cycling: the air is moving (it has not been LOCK.cycle seconds since it shut)'); assert.equal(d2.target, 0);
  at(w, 7); ev = run(w, Math.ceil((LOCK.cycle + 0.2) / TICK)); assert.ok(ev.some((e) => e.type === 'door_open' && e.cx === 8), 'cycled: the second opens BY ITSELF (the press while it cycled was kept)'); assert.equal(d2.target, 1);
  // and now the first is refused (the second is open), and the chamber is in vacuum
  at(w, 4); ev = run(w, 2, (i) => idle({ use: i === 0 })); assert.ok(ev.some((e) => e.type === 'door_cycling'), 'the first is refused now'); assert.equal(inVacuum(w, cellC(6), cellC(2)), true);
});
test('a Use while the lock is cycling is kept (owner 2026-10-10, "the lock won\'t open"): the first door shuts at once, the second opens by itself when the air has settled, no second press needed', () => {
  const w = world(dock()); const d1 = doorAtCell(w, 5, 2), d2 = doorAtCell(w, 8, 2);
  at(w, 4); run(w, 2, (i) => idle({ use: i === 0 })); assert.equal(d1.target, 1);
  Object.assign(w.player, { x: cellC(7), z: cellC(2), yaw: -Math.PI / 2 }); const t0 = w.time;                                              // in the chamber, at the far door, the first door still open behind
  let ev = run(w, 2, (i) => idle({ use: i === 0 })); assert.ok(ev.some((e) => e.type === 'door_cycling'), 'told it is cycling'); assert.equal(d2.want, true, 'and the press is kept');
  ev = run(w, 40); assert.ok(ev.some((e) => e.type === 'door_close' && e.cx === 5), 'the first door is shut NOW, not after its LOCK.hold'); assert.ok(w.time - t0 < LOCK.hold, 'well inside the time it would have waited by itself');
  ev = run(w, Math.ceil((LOCK.cycle + 1) / TICK)); const opened = ev.find((e) => e.type === 'door_open' && e.cx === 8); assert.ok(opened, 'the second door opened by itself'); assert.equal(d2.want, false); assert.equal(d1.target, 0, 'and the first stayed shut');
  assert.ok(opened.tick * TICK - t0 >= LOCK.cycle, 'but not before the air had settled (LOCK.cycle after the first shut)');
});
test('a queued door forgets the press when you walk off, and waits while a body stands in the other doorway', () => {
  const w = world(dock()); const d1 = doorAtCell(w, 5, 2), d2 = doorAtCell(w, 8, 2);
  at(w, 4); run(w, 2, (i) => idle({ use: i === 0 })); Object.assign(w.player, { x: cellC(7), z: cellC(2), yaw: -Math.PI / 2 }); run(w, 2, (i) => idle({ use: i === 0 })); assert.equal(d2.want, true);
  Object.assign(w.player, { x: cellC(7) + 2 * LOCK.giveUp }); run(w, 2); assert.equal(d2.want, false, 'forgotten: the player is far from the door');
  // a creature standing in the first doorway holds it open, so the queue waits: the lock never opens both doors at once
  const src2 = dock(); src2.entities.push({ type: 'enemy', kind: 'gaunt', at: [1, 2] }); const w2 = world(src2); const e1 = doorAtCell(w2, 5, 2), e2 = doorAtCell(w2, 8, 2), gaunt = w2.enemies[0]; at(w2, 4); run(w2, 2, (i) => idle({ use: i === 0 }));
  const hold = () => { Object.assign(gaunt, { x: cellC(5), z: cellC(2), state: 'idle', hp: 1000 }); Object.assign(w2.player, { x: cellC(7), z: cellC(2), hp: 100000 }); };
  hold(); w2.player.yaw = -Math.PI / 2; run(w2, 2, (i) => { hold(); return idle({ use: i === 0 }); }); run(w2, 60 * 8, () => { hold(); return idle(); });
  assert.equal(e1.target, 1, 'held open by the body in it'); assert.equal(e2.target, 0, 'so the second door waits (never both open)');
});
test('vacuum hurts the player a second at a time (scaled by the difficulty), never a creature; it says so on entering and leaving; shutting the hull door ends it', () => {
  const w = world(dock()); Object.assign(w.player, { x: cellC(11), z: cellC(2), hp: 100 }); const hp0 = w.player.hp;
  let ev = run(w, Math.round(2 / TICK)); assert.ok(ev.some((e) => e.type === 'vacuum_enter'), 'it says so'); const lost = hp0 - w.player.hp;
  assert.ok(Math.abs(lost - 2 * VACUUM.dps) <= VACUUM.dps * VACUUM.tick + 1, `about ${2 * VACUUM.dps} in two seconds (${lost})`);
  runActions(w, [{ close: [15, 2] }]); const open0 = doorAtCell(w, 15, 2); ev = run(w, 140); assert.equal(open0.open, 0, 'the hull door is shut'); assert.ok(ev.some((e) => e.type === 'vacuum_leave'), 'and says that the air is back'); const hp1 = w.player.hp;
  run(w, 60); assert.equal(w.player.hp, hp1, 'no more damage'); assert.equal(inVacuum(w, cellC(11), cellC(2)), false);
  const lossIn = (difficulty) => { const q = world(dock(), { difficulty }); Object.assign(q.player, { x: cellC(11), z: cellC(2), hp: 100 }); run(q, Math.round(8 / TICK)); return 100 - q.player.hp; };
  const easy = lossIn('easy'), normal = lossIn('normal'), hard = lossIn('hard'); assert.ok(easy < normal && normal < hard, `harder is worse (${easy} < ${normal} < ${hard} over eight seconds)`);
});
test('a world with no vacuum has no vacuum state and no lock state on its doors', () => {
  const src = dock(); src.vacuum = undefined; src.doors = [{ at: [5, 2] }, { at: [8, 2] }, { at: [15, 2] }]; delete src.vacuum;
  const w = world(src); assert.equal(w.player.vac, undefined); assert.equal(doorAtCell(w, 5, 2).interlock, undefined); run(w, 30); assert.equal(w.player.vac, undefined);
});
test('validation: a lock needs a partner that names it back, a hull door must be remote, a vacuum region needs doors', () => {
  bad(dock({ d2: {} }), /must name it back/); bad(dock({ d1: { interlock: [9, 9] } }), /must be the cell of another door/);
  bad(dock({ d1: { interlock: [8, 2], remote: true } }), /opened by Use/);
  const s = dock(); s.doors[2] = { at: [15, 2], open: true }; bad(s, /must be a remote door/);
  bad(dock({ vacuum: [{ rect: [9, 2, 14, 2], seals: [[2, 2]] }] }), /seals must list door cells/); bad(dock({ vacuum: [{ rect: [9, 2, 30, 2], seals: [[15, 2]] }] }), /rect must be/);
  assert.equal(validateMap(dock()).ok, true);
});
