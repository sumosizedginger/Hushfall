// PT-027: THE SHIP BREATHES (Episode 3, Batch B). Breathing gates (a door entry with `breath`) and spore beds (the floor effect `s` inside a `pulses` region) run on a clock that is a pure function of the sim time
// (src/engine/breath.js). Tiny hand-made maps here; the shipped maps that use them are held by tests/shipped.test.js and the map gates.
import test from 'node:test';
import assert from 'node:assert/strict';
import { gateOpen, gateRemaining, sporeState, sporeOnAt } from '../src/engine/breath.js';
import { parseMap, validateMap } from '../src/engine/mapformat.js';
import { createWorld, step, drainEvents, spawnEnemy, cellSolid, hasLOS, useTarget } from '../src/engine/world.js';
import { navWaypoint } from '../src/engine/nav.js';
import { runRoute } from '../src/engine/harness.js';
import { BREATH, FX, DOOR, PLAYER, TICK } from '../src/engine/defs.js';

const idle = (o = {}) => ({ move: [0, 0], yaw: 0, pitch: 0, fire: false, aim: false, sprint: false, use: false, weapon: null, weaponStep: 0, ...o });
const run = (w, ticks, cmd = idle) => { const ev = []; for (let i = 0; i < ticks; i++) { step(w, typeof cmd === 'function' ? cmd(i) : cmd); ev.push(...drainEvents(w)); } return ev; };
const secs = (s) => Math.round(s / TICK);

/** a hall split by a wall with one breathing gate at (6,2): the player starts in the west half, the exit is in the east half */
const gateMap = (breath = { period: 8, open: 0.5, phase: 0 }, extra = {}) => ({
  format: 1, id: 'T2', version: 1, name: 'Gate', ceilingHeight: 4, secrets: [],
  grid: ['###############', '#.....#.......#', '#.....D.......#', '#.....#.......#', '###############'],
  doors: [{ at: [6, 2], breath }],
  entities: [{ type: 'player', at: [2, 2], facing: 'east' }, { type: 'exit', at: [12, 2] }],
  ...extra,
});
/** an open hall with a spore bed (x 6..8) in the middle, blooming 3 s of every 8 */
const sporeMap = (pulse = { rect: [6, 1, 8, 3], period: 8, on: 3, phase: 0 }) => ({
  format: 1, id: 'T3', version: 1, name: 'Spores', ceilingHeight: 4, secrets: [], doors: [],
  grid: ['###############', '#.............#', '#.............#', '#.............#', '###############'],
  fx: ['...............', '......sss......', '......sss......', '......sss......', '...............'],
  pulses: [pulse],
  entities: [{ type: 'player', at: [2, 2], facing: 'east' }, { type: 'exit', at: [12, 2] }],
});

test('the clock is a pure function of time: a gate is open at the start of its cycle for `open` of the period, shifted by its phase', () => {
  const b = { period: 8, open: 0.5, phase: 0 };
  assert.equal(gateOpen(b, 0), true); assert.equal(gateOpen(b, 3.99), true); assert.equal(gateOpen(b, 4.01), false); assert.equal(gateOpen(b, 7.99), false); assert.equal(gateOpen(b, 8.01), true, 'it repeats');
  assert.equal(gateOpen({ ...b, phase: 4 }, 0), false, 'a phase of half a period flips it'); assert.equal(gateOpen({ ...b, phase: 4 }, 4.5), true);
  assert.ok(Math.abs(gateRemaining(b, 1) - 3) < 1e-9 && Math.abs(gateRemaining(b, 5) - 3) < 1e-9, 'how long the current state has left'); assert.equal(gateOpen(b, -0.5), false, 'a time before zero still lands in the cycle');
});

test('a spore bed swells before it blooms, blooms for `on` seconds and lingers a moment after; nothing but the time decides', () => {
  const p = { period: 8, on: 3, phase: 0 };
  assert.equal(sporeState(p, 0).on, true); assert.equal(sporeState(p, 2.9).on, true); assert.equal(sporeState(p, 3.1).on, false);
  const before = sporeState(p, 8 - BREATH.warn / 2); assert.equal(before.on, false); assert.ok(before.warn > 0.4 && before.warn < 0.6, 'half way through the warning'); assert.equal(sporeState(p, 8 - BREATH.warn - 0.1).warn, 0, 'no warning earlier');
  assert.ok(sporeState(p, 3 + BREATH.fade / 2).glow > 0, 'it lingers'); assert.equal(sporeState(p, 5).glow, 0, 'then it is dark'); assert.equal(sporeState(p, 0).glow, 1);
  assert.deepEqual(sporeState(p, 12.3), sporeState(p, 4.3), 'the same moment of the cycle, the same state');
});

test('map validation: a breathing gate needs a sane clock and no key; a spore bed needs a pulse region and a dormant spell to cross it in', () => {
  const bad = (breath) => validateMap(gateMap(breath)); assert.equal(bad({ period: 8, open: 0.5 }).ok, true);
  assert.equal(bad({ period: 1, open: 0.5 }).ok, false, 'a period under 2 s'); assert.equal(bad({ period: 8, open: 0 }).ok, false); assert.equal(bad({ period: 8, open: 1 }).ok, false); assert.equal(bad({ period: 8, open: 0.1 }).ok, false, 'open under 2 s: nobody can get through');
  assert.equal(bad({ period: 8, open: 0.9 }).ok, false, 'shut under 2 s: it would not be a gate');
  const keyed = gateMap(); keyed.doors[0].key = 'brass'; assert.equal(validateMap(keyed).ok, false, 'a key and a clock do not mix');
  assert.equal(validateMap(sporeMap()).ok, true);
  assert.equal(validateMap(sporeMap({ rect: [6, 1, 8, 3], period: 8, on: 7 })).ok, false, 'a bed that is dormant for under 2 s'); assert.equal(validateMap(sporeMap({ rect: [6, 1, 8, 3], period: 8, on: 1 })).ok, false, 'a bloom under 1.5 s');
  assert.equal(validateMap(sporeMap({ rect: [1, 1, 3, 3], period: 8, on: 3 })).ok, false, 'a bed cell outside every pulse region would be on forever');
  const noPulse = sporeMap(); delete noPulse.pulses; assert.equal(validateMap(noPulse).ok, false);
  assert.ok(FX.s.pulse && FX.s.dps > 0 && FX.s.speed < 1, 'the spore bed burns and slows');
});

test('the gate opens and shuts on its own clock, announces every change, and blocks sight and movement while it is shut', () => {
  const w = createWorld(parseMap(gateMap()), { seed: 1, difficulty: 'normal' }); w.enemies.length = 0; const d = w.doors[0], map = w.map;
  assert.equal(d.open, 1, 'it starts in the state the clock says (open at time 0)'); assert.equal(cellSolid(w, 6, 2), false);
  const ev = run(w, secs(5)); assert.equal(d.target, 0); assert.equal(d.open, 0, 'shut by 5 s (it closes at 4 s and takes two thirds of a second)'); assert.ok(ev.some((e) => e.type === 'door_close' && e.breath === true), 'the closing is announced as a breath');
  assert.equal(cellSolid(w, 6, 2), true, 'a shut gate is a wall'); assert.equal(hasLOS(w, 2.5 * map.cell, 2.5 * map.cell, 10.5 * map.cell, 2.5 * map.cell), false, 'a shut gate blocks sight');
  const ev2 = run(w, secs(4)); assert.equal(d.target, 1); assert.equal(d.open, 1, 'open again by 9 s'); assert.ok(ev2.some((e) => e.type === 'door_open' && e.breath === true));
  assert.equal(hasLOS(w, 2.5 * map.cell, 2.5 * map.cell, 10.5 * map.cell, 2.5 * map.cell), true, 'and an open one lets the eye through');
  assert.ok(DOOR.speed > 0 && Math.abs(secs(4) * TICK - 4) < 0.02);
});

test('it never shuts on anyone standing in it, and the Use key does nothing to it', () => {
  const w = createWorld(parseMap(gateMap()), { seed: 1, difficulty: 'normal' }); w.enemies.length = 0; const d = w.doors[0], map = w.map;
  Object.assign(w.player, { x: 6.5 * map.cell, z: 2.5 * map.cell, yaw: -Math.PI / 2 }); run(w, secs(6)); assert.equal(d.target, 1, 'held open by the player in the doorway, long after the clock said shut'); assert.equal(d.open, 1);
  Object.assign(w.player, { x: 2.5 * map.cell, z: 2.5 * map.cell }); run(w, 2); assert.equal(d.target, 0, 'the moment the player steps out the clock has its way');
  run(w, secs(1)); const t = useTarget(w); Object.assign(w.player, { x: 4.9 * map.cell, z: 2.5 * map.cell, yaw: -Math.PI / 2 }); assert.ok(useTarget(w)?.breath, 'the prompt can say what it is');
  const ev = run(w, 3, idle({ use: true })); assert.ok(ev.some((e) => e.type === 'door_breath'), 'pressing Use only says so'); assert.equal(d.target, 0); assert.equal(w.doors[0].open, 0, 'and the gate stays shut'); void t;
});

test('a creature behind a shut gate still has a way through (the field treats the gate as open), and a gate that is shut keeps it out', () => {
  const w = createWorld(parseMap(gateMap()), { seed: 1, difficulty: 'normal' }); w.enemies.length = 0; const map = w.map;
  run(w, secs(5)); assert.equal(w.doors[0].open, 0);
  const wp = navWaypoint(w, 10.5 * map.cell, 2.5 * map.cell, 2.5 * map.cell, 2.5 * map.cell); assert.ok(wp, 'there is a route'); assert.ok(wp.x < 10.5 * map.cell, 'it heads for the gate');
  const e = spawnEnemy(w, 'tollbearer', 8.5 * map.cell, 2.5 * map.cell, Math.PI / 2); e.state = 'chase'; e.lastX = 2.5 * map.cell; e.lastZ = 2.5 * map.cell; w.player.x = 2.5 * map.cell; w.player.z = 2.5 * map.cell; w.player.hp = 1e9;
  run(w, secs(2)); assert.ok(e.x > 6.9 * map.cell, 'while the gate is shut it queues on the far side of it (x ' + (e.x / map.cell).toFixed(2) + ' cells)');
  run(w, secs(10)); assert.ok(e.x < 6.4 * map.cell, 'when it breathes it comes through (x ' + (e.x / map.cell).toFixed(2) + ' cells)');
});

test('a spore bed hurts and slows only while it blooms; the warning and the bloom are announced once per cycle', () => {
  const w = createWorld(parseMap(sporeMap()), { seed: 1, difficulty: 'normal' }); w.enemies.length = 0; const map = w.map;
  Object.assign(w.player, { x: 7.5 * map.cell, z: 2.5 * map.cell, yaw: 0, hp: 100 }); w.player.hp = 100;
  const ev = run(w, secs(2.0)); const hpBloom = w.player.hp; assert.ok(hpBloom < 100, 'it burns while it blooms: ' + hpBloom); assert.equal(w.player.fx, 's'); assert.ok(ev.filter((e) => e.type === 'wade').every((e) => e.kind === 's'));
  run(w, secs(1.6)); assert.equal(w.player.fx, null, 'dormant: no effect at all'); const hp1 = w.player.hp; run(w, secs(2.5)); assert.equal(w.player.hp, hp1, 'and no damage');
  const ev2 = run(w, secs(3.2)); assert.equal(ev2.filter((e) => e.type === 'spore_warn').length, 1, 'one warning'); assert.equal(ev2.filter((e) => e.type === 'spore_bloom').length, 1, 'one bloom');
  const warn = ev2.find((e) => e.type === 'spore_warn'), bloom = ev2.find((e) => e.type === 'spore_bloom'); assert.ok(bloom.tick - warn.tick >= secs(BREATH.warn) - 2, 'the warning comes ' + BREATH.warn + ' s ahead');
  assert.ok(sporeOnAt(map, 7, 2, 0) && !sporeOnAt(map, 7, 2, 5));
  const slowed = createWorld(parseMap(sporeMap()), { seed: 1, difficulty: 'normal' }); slowed.enemies.length = 0; Object.assign(slowed.player, { x: 6.2 * map.cell, z: 2.5 * map.cell, yaw: -Math.PI / 2 });
  run(slowed, secs(1.0), idle({ move: [0, 1] })); const through = slowed.player.x - 6.2 * map.cell; const free = createWorld(parseMap(sporeMap({ rect: [6, 1, 8, 3], period: 8, on: 3, phase: 4 })), { seed: 1, difficulty: 'normal' }); free.enemies.length = 0; Object.assign(free.player, { x: 6.2 * map.cell, z: 2.5 * map.cell, yaw: -Math.PI / 2 }); run(free, secs(1.0), idle({ move: [0, 1] }));
  assert.ok(through < (free.player.x - 6.2 * map.cell) * 0.9, `slower inside a bloom (${through.toFixed(2)} m against ${(free.player.x - 6.2 * map.cell).toFixed(2)} m)`); void PLAYER;
});

test('the route bot waits at a shut gate and crosses when it is open for long enough, and it waits outside a blooming bed instead of walking into it', () => {
  const route = [{ op: 'goto', at: [12, 2] }];
  const g = parseMap(gateMap({ period: 8, open: 0.5, phase: 4 }));                                        // shut for the first 4 s: the bot arrives at the gate at about 1 s and has to wait
  const rg = runRoute(g, route, { seed: 1, difficulty: 'normal' }); assert.equal(rg.result, 'complete'); assert.ok(rg.world.time > 4, 'it waited for the gate: ' + rg.world.time.toFixed(1) + ' s');
  const sp = parseMap(sporeMap({ rect: [6, 1, 8, 3], period: 12, on: 3, phase: 0 }));                       // blooming at 0..3 s: the bot reaches the bed's edge at about 1 s and must wait it out
  const rs = runRoute(sp, route, { seed: 1, difficulty: 'normal' }); assert.equal(rs.result, 'complete'); assert.equal(rs.world.stats.damageTaken, 0, 'no damage: it waited outside the bloom'); assert.ok(rs.world.time > 3, 'and it did wait: ' + rs.world.time.toFixed(1) + ' s');
});

test('breathing is lazy state: a map without gates or beds is untouched (no `spores` state, doors are ordinary)', () => {
  const w = createWorld(parseMap({ format: 1, id: 'T4', version: 1, name: 'Plain', ceilingHeight: 4, doors: [], secrets: [], grid: ['#####', '#...#', '#####'], entities: [{ type: 'player', at: [1, 1], facing: 'east' }, { type: 'exit', at: [3, 1] }] }), { seed: 1, difficulty: 'normal' });
  run(w, 30); assert.equal(w.spores, undefined); assert.equal(w.doors.length, 0);
  const g = createWorld(parseMap(gateMap()), { seed: 1, difficulty: 'normal' }); assert.equal(g.spores, undefined, 'a gate alone creates no spore state'); assert.ok(g.doors[0].breath);
});
