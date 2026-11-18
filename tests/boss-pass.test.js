// THE BOSS PASS (step 5 of the 2026-11-18 playtest list: four of seven bosses shared "cut the nodes, then the boss"). The Sub-Cantor is guarded and
// opened by ringing its forks; a boss never falls asleep again once its fight has begun; a boss hall can ask for a thicker floor of marks. (The
// Cantor's open windup is in tests/elites.test.js, the Graft-Mother's plate in tests/e2-roster.test.js.)
import test from 'node:test';
import assert from 'node:assert/strict';
import { parseMap } from '../src/engine/mapformat.js';
import { createWorld, step, drainEvents, spawnEnemy, damageEnemy } from '../src/engine/world.js';
import { ENEMIES } from '../src/engine/defs.js';
import { floorMarks } from '../src/render/floorscatter.js';

const idle = () => ({ move: [0, 0], yaw: 0, pitch: 0, fire: false, aim: false, sprint: false, use: false, weapon: null, weaponStep: 0, map: false });
const room = (w = 40, h = 21, extra = {}) =>
  parseMap({
    format: 1,
    id: 'BOSSPASS',
    version: 1,
    name: 'Arena',
    ceilingHeight: 8,
    grid: ['#'.repeat(w), ...Array.from({ length: h - 2 }, () => '#' + '.'.repeat(w - 2) + '#'), '#'.repeat(w)],
    doors: [],
    entities: [{ type: 'player', at: [2, 10], facing: 'east' }, { type: 'exit', at: [w - 3, 10] }],
    ...extra,
  });
const cell = (c) => (c + 0.5) * 2;
const world = () => {
  const w = createWorld(room(), { seed: 1, difficulty: 'normal' });
  w.enemies.length = 0;
  w.player.hp = 5000;
  return w;
};
const run = (w, n) => {
  const ev = [];
  for (let i = 0; i < n; i++) {
    step(w, idle());
    ev.push(...drainEvents(w));
  }
  return ev;
};

test('the Sub-Cantor is guarded; a blow on a fork rings it, does it no harm, and opens the conductor while it listens; a rung fork rests', () => {
  const w = world(),
    L = ENEMIES.subcantor.listen;
  const c = spawnEnemy(w, 'subcantor', cell(30), cell(10), Math.PI / 2);
  c.state = 'chase';
  c.hp = 1e6;
  const f = spawnEnemy(w, 'bellnode', cell(25), cell(4), 0);
  f.fork = true;
  const hit = () => {
    const h0 = c.hp;
    damageEnemy(w, c, 100);
    return h0 - c.hp;
  };
  assert.ok(Math.abs(hit() - 100 * ENEMIES.subcantor.guard) < 1e-6, 'guarded');
  const fh = f.hp;
  damageEnemy(w, f, 500);
  const ev = drainEvents(w);
  assert.equal(f.hp, fh, 'a fork takes no harm');
  assert.notEqual(f.state, 'dead');
  assert.ok(ev.some((e) => e.type === 'fork_struck'));
  assert.ok(c.listenUntil > w.time, 'it listens');
  assert.ok(Math.abs(hit() - 100 * L.mult) < 1e-6, 'open while it listens');
  c.pulseCd = 0;
  const during = run(w, Math.round(60 * (L.t - 0.5)));
  assert.ok(!during.some((e) => e.type === 'pulse' || e.type === 'enemy_windup'), 'no ring while it listens');
  damageEnemy(w, f, 50);
  assert.ok(!drainEvents(w).some((e) => e.type === 'fork_struck'), 'a fork that has just rung rests');
  run(w, Math.round(60 * (L.rest - L.t + 1)));
  assert.ok(Math.abs(hit() - 100 * ENEMIES.subcantor.guard) < 1e-6, 'guarded again once the note has died');
  damageEnemy(w, f, 50);
  assert.ok(drainEvents(w).some((e) => e.type === 'fork_struck'), 'rested, it rings again');
});

test('a boss never goes back to sleep once its fight has begun, however long it loses sight of the player', () => {
  const w = world();
  for (const kind of ['graftmother', 'cantor', 'subcantor', 'grandcantor']) {
    w.enemies.length = 0;
    const b = spawnEnemy(w, kind, cell(30), cell(10), 0);
    b.state = 'chase';
    b.lost = 0;
    w.player.x = cell(2);
    w.player.z = cell(2);
    // out of sight: the player stands behind the boss's back in a far corner, and the boss is told it lost them long ago
    b.lost = 30;
    run(w, 60 * 3);
    assert.notEqual(b.state, 'idle', `${kind} stays awake`);
  }
});

test('a boss hall can ask for a thicker floor of marks inside a rectangle, and nowhere else', () => {
  const plain = room(60, 41),
    thick = room(60, 41, { atmosphere: { floorMarks: { open: 2.5, rect: [20, 10, 40, 30] } } });
  const inside = (ms) => ms.filter((d) => d.pos[0] / 2 >= 20 && d.pos[0] / 2 <= 41 && d.pos[2] / 2 >= 10 && d.pos[2] / 2 <= 31).length;
  const a = floorMarks(plain, 'X'),
    b = floorMarks(thick, 'X');
  assert.ok(inside(b) > inside(a) * 1.8, `inside the rectangle: ${inside(a)} -> ${inside(b)}`);
  assert.ok(Math.abs(a.length - inside(a) - (b.length - inside(b))) <= Math.max(6, 0.15 * (a.length - inside(a))), 'outside it, about the same');
});
