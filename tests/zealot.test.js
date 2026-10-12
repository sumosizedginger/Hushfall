// PT-038 (Campaign 2 Act B, design/ACTB.md): THE ZEALOT. A Songkeeper under arms: a long lance, a lunge, and a hit that GRAFTS (a slow on the player's walk for a few seconds). Sim only; the rig, the atlas and the sounds
// are held by the shared enumerating tests (rig grounding, hit volume, silhouettes, audio).
import test from 'node:test';
import assert from 'node:assert/strict';
import { parseMap } from '../src/engine/mapformat.js';
import { createWorld, step, drainEvents } from '../src/engine/world.js';
import { ENEMIES, GRAFT, TICK } from '../src/engine/defs.js';

const idle = (o = {}) => ({ move: [0, 0], yaw: 0, pitch: 0, fire: false, aim: false, sprint: false, use: false, weapon: null, weaponStep: 0, map: false, ...o });
const run = (w, n, cmd = () => idle()) => { const ev = []; for (let i = 0; i < n; i++) { step(w, cmd(i)); ev.push(...drainEvents(w)); } return ev; };
/** a hall 30 cells long and 5 wide; the player at cell 3 facing east, a zealot at cell `at` */
const hall = (kinds = [['zealot', 8]]) => ({ format: 1, id: 'Z1', version: 1, name: 'Zealot', cellSize: 2, grid: ['#'.repeat(30), ...Array.from({ length: 5 }, () => '#' + '.'.repeat(28) + '#'), '#'.repeat(30)], doors: [], secrets: [], messages: [],
  entities: [{ type: 'player', at: [3, 3], facing: 'east' }, { type: 'exit', at: [28, 3] }, ...kinds.map(([kind, x]) => ({ type: 'enemy', kind, at: [x, 3] }))] });
const world = (kinds, seed = 1, difficulty = 'normal') => createWorld(parseMap(hall(kinds)), { seed, difficulty });
const zealot = (w) => w.enemies.find((e) => e.kind === 'zealot');

test('the Zealot is a lance: its reach is longer than a Tollbearer\'s, it lunges, it is hard to stagger and it grafts', () => {
  const z = ENEMIES.zealot, t = ENEMIES.tollbearer;
  assert.ok(z.attack.reach >= 3.4 && z.attack.reach > t.attack.reach, 'a lance out-reaches an arm'); assert.ok(z.lunge && z.lunge.max > z.lunge.min);
  assert.ok(z.poise >= 2 && z.hp >= 100 && z.hp < ENEMIES.wardengraft.hp, 'tougher than the common creatures, not an elite'); assert.ok(z.graft.time >= 2 && GRAFT.slow > 0.2 && GRAFT.slow < 0.6);
  for (const k of ['hp', 'speed', 'gait', 'radius', 'height', 'sight', 'turnRate']) assert.ok(Number.isFinite(z[k]) && z[k] > 0, k);
});

test('a world with no Zealot never has a graft: the lazy state is absent, and a map with a Gaunt reads no graft event', () => {
  const w = world([['gaunt', 8]]); const ev = run(w, 60 * 12, () => idle());
  assert.equal('graftT' in w.player, false, 'no graftT on a player nobody grafted'); assert.equal(ev.filter((e) => e.type === 'graft').length, 0);
});

test('a lance that lands grafts: one event, a few seconds, the walk is slower while it runs and back to normal after', () => {
  const w = world(); w.player.hp = 1e6; const z = zealot(w); z.state = 'chase'; z.lastX = w.player.x; z.lastZ = w.player.z;
  let ev = [], hit = false; for (let i = 0; i < 60 * 20 && !hit; i++) { step(w, idle()); ev.push(...drainEvents(w)); hit = w.player.graftT > 0; }
  assert.ok(hit, 'the Zealot reached the player and landed a blow'); assert.equal(ev.filter((e) => e.type === 'graft').length, 1, 'one event for one graft'); assert.ok(w.player.graftT > 2.5 && w.player.graftT <= ENEMIES.zealot.graft.time);
  // the same walk with and without the graft (the zealot is put out of the way so it cannot interfere)
  const walk = (grafted) => { const q = createWorld(parseMap(hall([])), { seed: 1, difficulty: 'normal' }); if (grafted) q.player.graftT = 5; const x0 = q.player.x; run(q, 60, () => idle({ move: [0, 1] })); return q.player.x - x0; };
  const free = walk(false), slow = walk(true); assert.ok(free > 3.0, 'walks about ' + free.toFixed(2) + ' m a second'); assert.ok(Math.abs(slow / free - (1 - GRAFT.slow)) < 0.08, `a graft takes ${(100 * GRAFT.slow).toFixed(0)}% off: ${slow.toFixed(2)} / ${free.toFixed(2)}`);
  const ran = createWorld(parseMap(hall([])), { seed: 1, difficulty: 'normal' }); ran.player.graftT = 1; run(ran, Math.round(1.2 / TICK)); assert.equal(ran.player.graftT, 0, 'it runs out');
});

test('a Zealot at the player\'s elbow hurts them and a second blow while grafted does not stack the slow', () => {
  const w = world(); w.player.hp = 1e6; const z = zealot(w); z.state = 'chase'; z.lastX = w.player.x; z.lastZ = w.player.z;
  const hp0 = w.player.hp; run(w, 60 * 25);
  assert.ok(w.player.hp < hp0, 'it fights'); assert.ok((w.player.graftT ?? 0) <= ENEMIES.zealot.graft.time + 1e-9, 'a graft renews to its time, it never adds up');
});

test('the Zealot is deterministic: the same seed gives the same fight', () => {
  const a = world(['zealot', 8].length ? [['zealot', 8], ['tollbearer', 14]] : [], 7), b = world([['zealot', 8], ['tollbearer', 14]], 7);
  for (const q of [a, b]) { q.player.hp = 1e6; for (const e of q.enemies) { e.state = 'chase'; e.lastX = q.player.x; e.lastZ = q.player.z; } run(q, 60 * 15); }
  assert.deepEqual(a.player.hp, b.player.hp); assert.deepEqual(a.player.graftT ?? null, b.player.graftT ?? null); assert.deepEqual(a.enemies.map((e) => [e.x, e.z, e.hp]), b.enemies.map((e) => [e.x, e.z, e.hp]));
});
