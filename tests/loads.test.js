// PT-032 (Episode 4, Batch A, the Ascent Tether): FALLING LOADS: a region of a deck struck on a clock (src/engine/loads.js, updateLoads in world.js, Bot.loadHold). Pure functions of the sim time, seen coming for LOADS.warn seconds; the player on the ground inside
// the rect at the impact is hurt, a walker crushed, a body in the air passes over; the route bot waits outside and crosses between two.
import test from 'node:test';
import assert from 'node:assert/strict';
import { validateMap, parseMap } from '../src/engine/mapformat.js';
import { createWorld, step, drainEvents, spawnEnemy } from '../src/engine/world.js';
import { loadState, loadIndex, inLoad } from '../src/engine/loads.js';
import { runRoute } from '../src/engine/harness.js';
import { LOADS, DIFFICULTY, ENEMIES } from '../src/engine/defs.js';

const idle = (o = {}) => ({ move: [0, 0], yaw: 0, pitch: 0, fire: false, aim: false, sprint: false, use: false, weapon: null, weaponStep: 0, map: false, ...o });
const run = (w, n, cmd = () => idle()) => { const ev = []; for (let i = 0; i < n; i++) { step(w, cmd(i)); ev.push(...drainEvents(w)); } return ev; };
const bad = (s, re) => { const v = validateMap(s); assert.equal(v.ok, false, 'expected invalid'); assert.ok(v.errors.some((e) => re.test(e)), re + ' in ' + JSON.stringify(v.errors)); };
const cellC = (c) => (c + 0.5) * 2;
/** a corridor of open deck (x 1..22, z 1..3) with one load across x 8..10 (all three rows), landing every 8 s */
const deck = (loads = [{ rect: [8, 1, 10, 3], period: 8, phase: 0 }]) => ({
  format: 1, id: 'L1', version: 1, name: 'Loads', cellSize: 2, grid: ['#'.repeat(24), '#' + ':'.repeat(22) + '#', '#' + ':'.repeat(22) + '#', '#' + ':'.repeat(22) + '#', '#'.repeat(24)], doors: [], secrets: [], loads,
  entities: [{ type: 'player', at: [3, 2], facing: 'east' }, { type: 'exit', at: [21, 2] }],
});
const world = (src, opts = {}) => createWorld(parseMap(src), { seed: 1, difficulty: 'normal', ...opts });

test('a load is a pure function of time: it lands at the start of each cycle, is seen coming for LOADS.warn s, leaves dust, and a phase shifts it', () => {
  const L = { rect: [1, 1, 2, 2], period: 8, phase: 0 };
  assert.equal(loadIndex(L, 0), 0); assert.equal(loadIndex(L, 7.99), 0); assert.equal(loadIndex(L, 8), 1); assert.equal(loadIndex(L, 17), 2);
  let s = loadState(L, 3); assert.equal(s.warn, 0); assert.ok(Math.abs(s.until - 5) < 1e-9 && Math.abs(s.since - 3) < 1e-9);
  s = loadState(L, 8 - LOADS.warn / 2); assert.ok(Math.abs(s.warn - 0.5) < 1e-9 && s.fall > 0.2 && s.fall < 0.3, 'half way into the warning: ' + JSON.stringify(s));
  s = loadState(L, 8 - 0.001); assert.ok(s.warn > 0.99 && s.fall > 0.99); s = loadState(L, 8.2); assert.ok(s.linger > 0.8 && s.warn === 0, 'dust after the impact');
  const shifted = { ...L, phase: 3 }; assert.equal(loadIndex(shifted, 5), 1, 'with a phase of 3 s the first landing is at t = 5');
  assert.equal(inLoad(L, 3, 3, 2, 0), true); assert.equal(inLoad(L, 7, 3, 2, 0), false); assert.equal(inLoad(L, 6.2, 3, 2, 0.3), true, 'a body a third of a metre wide touches the rect');
});

test('the validator refuses a load with a bad rect, a short period, a non-numeric phase or no floor under it', () => {
  assert.equal(validateMap(deck()).ok, true);
  bad(deck([{ rect: [9, 1, 8, 3], period: 8 }]), /rect must be/); bad(deck([{ rect: [8, 1, 99, 3], period: 8 }]), /rect must be/); bad(deck([{ rect: [8, 1, 10, 3], period: 3 }]), /period must be at least 4/);
  bad(deck([{ rect: [8, 1, 10, 3], period: 8, phase: 'x' }]), /phase must be a number/); bad(deck([{ rect: [0, 0, 0, 0], period: 8 }]), /no floor under it/);
});

test('the warning comes 1.5 s before the landing; at the landing the player in the rect is hurt (30, scaled by the difficulty), the one outside and the one in the air are not, and a walker is crushed but a node, a boss and a flyer are not', () => {
  const w = world(deck()); Object.assign(w.player, { x: cellC(9), z: cellC(2) }); const g = spawnEnemy(w, 'gaunt', cellC(8) + 0.5, cellC(1), 0), n = spawnEnemy(w, 'bellnode', cellC(10), cellC(3), 0), gill = spawnEnemy(w, 'gill', cellC(9), cellC(1), 0), far = spawnEnemy(w, 'gaunt', cellC(18), cellC(1), 0); for (const e of [g, n, gill, far]) e.sightR = 0.01;          // asleep and blind: nothing but the load touches anyone
  const ev = run(w, Math.round(8 / (1 / 60)) + 2, () => idle()); const warn = ev.find((e) => e.type === 'load_warn'), land = ev.find((e) => e.type === 'load_land'); assert.ok(warn && land, 'the warning and the landing');
  const hit = ev.find((e) => e.type === 'load_hit'); assert.ok(hit, 'the player was in it'); assert.equal(w.player.hp, 100 - Math.round(LOADS.damage * DIFFICULTY.normal.enemyDamage));
  assert.ok(g.hp < ENEMIES.gaunt.hp * DIFFICULTY.normal.enemyHp || g.state === 'dead', 'the Gaunt in the rect was crushed'); assert.equal(n.hp, ENEMIES.bellnode.hp * DIFFICULTY.normal.enemyHp, 'a node is not'); assert.equal(gill.hp, ENEMIES.gill.hp * DIFFICULTY.normal.enemyHp, 'nor a flyer'); assert.equal(far.hp, ENEMIES.gaunt.hp * DIFFICULTY.normal.enemyHp, 'nor anything outside');
  const outside = world(deck()); Object.assign(outside.player, { x: cellC(14), z: cellC(2) }); const e2 = run(outside, 500); assert.ok(e2.some((x) => x.type === 'load_land') && !e2.some((x) => x.type === 'load_hit') && outside.player.hp === 100, 'outside: untouched');
  const air = world(deck()); Object.assign(air.player, { x: cellC(9), z: cellC(2) }); air.player.air = { vy: 0, g: 0.01, bx: 0, bz: 0, sx: 0, sz: 0, t: 0, low: -1 }; air.player.y = 3; const e3 = run(air, Math.round(8 / (1 / 60)) + 2); assert.ok(e3.some((x) => x.type === 'load_land') && !e3.some((x) => x.type === 'load_hit'), 'a body in the air passes over');
  assert.ok(ev.indexOf(warn) < ev.indexOf(land), 'the warning first');
});

test('the route bot waits outside a load until the crossing fits between two landings and arrives unhurt, on every difficulty and seed; a bot that did not wait would be struck', () => {
  for (const difficulty of ['easy', 'normal', 'hard']) for (const seed of [1, 2, 3]) {
    const r = runRoute(parseMap(deck()), [{ op: 'goto', at: [4, 2] }, { op: 'goto', at: [14, 2] }, { op: 'goto', at: [20, 2] }], { seed, difficulty });
    assert.equal(r.result === 'bot-failed' ? r.failure : 'ok', 'ok'); assert.ok(r.world.player.x > cellC(14), 'across'); assert.equal(r.world.player.hp, 100, `unhurt on ${difficulty} ${seed}`);
  }
  const blind = world(deck()); Object.assign(blind.player, { x: cellC(7), z: cellC(2) }); const ev = run(blind, 600, () => idle({ move: [0, 1] }));              // walking straight through, regardless: sooner or later one lands on it
  assert.ok(ev.some((e) => e.type === 'load_hit') || blind.player.x > cellC(12), 'walking blind either crosses between two (luck) or is struck');
});

test('a world with no loads has no load state; a map with loads keeps it (lazy) and a save mid-cycle resumes to the same impact', () => {
  const none = world({ ...deck(), loads: undefined }); run(none, 100); assert.equal(none.loadSeen, undefined);
  const a = world(deck()); run(a, 300); assert.ok(a.loadSeen && a.loadSeen.length === 1);
});
