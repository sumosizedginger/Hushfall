// FREEZE F5 (round 1, Gemini 7): the void sets the player back on the last solid ground they stood on, and used to do it without asking whether that ground was still free: a creature, a door or a prop could be standing in it.
// The landing is now the nearest free spot (the cell itself when it is free, so a landing nobody blocks is exactly what it was).
import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { createWorld, step, drainEvents, spawnEnemy, blockedCircle } from '../src/engine/world.js';
import { loadMapFile } from '../src/engine/harness.js';
import { ENEMIES, PLAYER, LOWG } from '../src/engine/defs.js';
import { ROOT } from './helpers.js';

const idle = { move: [0, 0], yaw: 0, pitch: 0, fire: false, aim: false, sprint: false, use: false, weapon: null, weaponStep: 0 };
const shipped = (id) => loadMapFile(path.join(ROOT, 'maps', id + '.json'));

/** a world on a map with open sky, the player over a void cell and the last safe ground set to a walkable cell that is NOT beside the void, and the cell the test needs */
function setup(id = 'C1E4M05') {
  const map = shipped(id), w = createWorld(map, { seed: 1, difficulty: 'normal' }), m = w.map, S = m.cell, p = w.player;
  let v = null, safe = null;
  for (let cz = 2; cz < m.h - 2 && !(v && safe); cz++) for (let cx = 2; cx < m.w - 2; cx++) {
    const k = m.kind(cx, cz);
    if (!v && k === 'void') v = [cx, cz];
    if (!safe && k === 'floor' && !blockedCircle(w, (cx + 0.5) * S, (cz + 0.5) * S, 1.2) && [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]].every(([a, b]) => m.kind(cx + a, cz + b) === 'floor')) safe = [cx, cz];
  }
  assert.ok(v && safe, 'the map has open sky and open ground: ' + id);
  const at = (c) => ({ x: (c[0] + 0.5) * S, z: (c[1] + 0.5) * S });
  return { w, p, m, S, at, v, safe };
}
const fall = (t) => { t.p.lastSafe = t.at(t.safe); Object.assign(t.p, { x: t.at(t.v).x, z: t.at(t.v).z, vx: 0, vz: 0 }); delete t.p.air; step(t.w, idle); return drainEvents(t.w).find((e) => e.type === 'void_fall'); };

test('a landing nobody blocks is exactly the last solid ground, as before', () => {
  const t = setup(), hp = t.p.hp, ev = fall(t), s = t.at(t.safe);
  assert.ok(ev, 'the void took the player'); assert.equal(t.p.x, s.x); assert.equal(t.p.z, s.z); assert.equal(t.p.hp, hp - LOWG.voidDamage);
});

test('a creature standing on the last solid ground is not landed on: the player is set down beside it, on the same ground, clear of everything', () => {
  const t = setup(), s = t.at(t.safe), e = spawnEnemy(t.w, 'gaunt', s.x, s.z); e.state = 'idle';
  const ev = fall(t); assert.ok(ev);
  const r = PLAYER.radius + ENEMIES.gaunt.radius, d = Math.hypot(t.p.x - e.x, t.p.z - e.z);
  assert.ok(d >= r - 0.05 || d >= 0.9, 'clear of the creature: ' + d.toFixed(2) + ' m (needs ' + r.toFixed(2) + ')');
  assert.ok(d < 4.2, 'and not far: ' + d.toFixed(2) + ' m');
  assert.equal(blockedCircle(t.w, t.p.x, t.p.z, PLAYER.radius), false, 'not inside a wall, a prop or a door');
  assert.ok(Math.abs(t.p.y - t.w.player.y) < 1e-9);
  assert.notEqual(t.m.kind(Math.floor(t.p.x / t.S), Math.floor(t.p.z / t.S)), 'void', 'not back over the sky');
});

test('the search is deterministic: the same blocked landing gives the same spot twice', () => {
  const run = () => { const t = setup(), s = t.at(t.safe); spawnEnemy(t.w, 'gaunt', s.x, s.z); fall(t); return [t.p.x, t.p.z]; };
  assert.deepEqual(run(), run());
});

test('a dead creature does not block the landing', () => {
  const t = setup(), s = t.at(t.safe), e = spawnEnemy(t.w, 'gaunt', s.x, s.z); e.state = 'dead';
  fall(t); assert.equal(t.p.x, s.x); assert.equal(t.p.z, s.z);
});
