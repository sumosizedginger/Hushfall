// PT-050 H1 (HARDENING H-V1, Gemini-03 "CRITICAL: groundAir skips voidFall on void maps without cars and records the void as lastSafe, a permanent softlock"). The honest finding: the SCRIPT teleports the player onto a void cell with no air state, which no walk (the void blocks walking), no
// vent flight and no save can do. 1,740 random vent flights (every vent of every map with vents over open sky, random steering for 15 s) ended 93 times in the void and never once with the player grounded over it. But two code paths could in principle leave a body
// grounded over open sky: a body already on the ground there (what the script made), and the 14 s timeout of the air state, which put a body "down" wherever it was. Both are now a miss (hurt, back on the last solid place), as they already were on a map with cars.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { parseMap } from '../src/engine/mapformat.js';
import { createWorld, step, drainEvents } from '../src/engine/world.js';
import { groundAt } from '../src/engine/terrain.js';
import { LOWG, PLAYER } from '../src/engine/defs.js';
import { ROOT } from './helpers.js';

const idle = { move: [0, 0], yaw: 0, pitch: 0, fire: false, aim: false, sprint: false, use: false, weapon: null, weaponStep: 0 };
const load = (id) => parseMap(JSON.parse(fs.readFileSync(path.join(ROOT, 'maps', id + '.json'), 'utf8')));
const firstVoid = (map) => { for (let cz = 0; cz < map.h; cz++) for (let cx = 0; cx < map.w; cx++) if (map.kind(cx, cz) === 'void') return [cx, cz]; return null; };
const overVoid = (map, p) => map.kind(Math.floor(p.x / map.cell), Math.floor(p.z / map.cell)) === 'void';
const MAPS = ['C1E4M02', 'C1E4M07', 'C2M25'];                                   // void, vents, no cars (C1E4M01 has void and no vents)

test('a body standing on the ground over open sky on a map WITHOUT cars is put back, not remembered as safe ground (Gemini\'s state, made by teleport)', () => {
  for (const id of [...MAPS, 'C1E4M01']) {
    const map = load(id); if (!map.hasVoid) continue; assert.equal(map.cars.length, 0, id + ' has no cars'); const [vx, vz] = firstVoid(map), w = createWorld(map); const p = w.player;
    const safe = { x: p.x, z: p.z }; p.lastSafe = { ...safe }; p.x = (vx + 0.5) * map.cell; p.z = (vz + 0.5) * map.cell; p.y = 0; delete p.air; const hp = p.hp;
    step(w, idle); const ev = drainEvents(w);
    assert.ok(ev.some((e) => e.type === 'void_fall'), id + ': a miss, not a softlock'); assert.equal(overVoid(map, p), false, id + ': back on solid ground'); assert.deepEqual({ x: p.x, z: p.z }, safe, id + ': on the last solid place'); assert.ok(p.hp < hp && p.hp > 0 && hp - p.hp <= LOWG.voidDamage, id + ': hurt (armour takes its share), never killed by it: ' + hp + ' -> ' + p.hp);
    for (let i = 0; i < 90; i++) { step(w, idle); assert.equal(overVoid(map, p), false); }
  }
});
test('the 14 second timeout of the air state over open sky is a miss, not "put down" over the void', () => {
  const map = load('C1E4M02'), [vx, vz] = firstVoid(map), w = createWorld(map), p = w.player; const safe = { x: p.x, z: p.z }; p.lastSafe = { ...safe };
  p.x = (vx + 0.5) * map.cell; p.z = (vz + 0.5) * map.cell; p.y = groundAt(w, safe.x, safe.z, PLAYER.radius) + 1;
  p.air = { vy: 0, g: 0, bx: 0, bz: 0, sx: 0, sz: 0, t: LOWG.maxAir + 1, low: -99 };                      // hanging in the air over the void with no gravity and no way down: the wedge the timeout exists for
  step(w, idle); assert.ok(drainEvents(w).some((e) => e.type === 'void_fall'), 'a void fall'); assert.equal(p.air, undefined); assert.equal(overVoid(map, p), false); assert.deepEqual({ x: p.x, z: p.z }, safe);
  const w2 = createWorld(map), q = w2.player; q.x = safe.x; q.z = safe.z; q.y = groundAt(w2, q.x, q.z, PLAYER.radius) + 1; q.air = { vy: 0, g: 0, bx: 0, bz: 0, sx: 0, sz: 0, t: LOWG.maxAir + 1, low: -99 };
  step(w2, idle); assert.equal(q.air, undefined, 'over solid ground the timeout still just puts the body down'); assert.equal(drainEvents(w2).some((e) => e.type === 'void_fall'), false);
});
test('real play: every vent of every map with vents over open sky, fired 12 times each with random steering for 15 s: the player is NEVER on the ground over the void', () => {
  let rng = 4242; const rnd = () => ((rng = (rng * 1664525 + 1013904223) >>> 0) / 4294967296), pick = () => [-1, 0, 1][Math.floor(rnd() * 3)];
  let flights = 0, falls = 0;
  for (const id of fs.readdirSync(path.join(ROOT, 'maps')).filter((f) => f.endsWith('.json')).map((f) => f.slice(0, -5)).sort()) {
    const map = load(id); if (!map.hasVoid || !map.vents.length) continue;
    for (const v of map.vents) for (let trial = 0; trial < 12; trial++) {
      const w = createWorld(map, { seed: 1 + trial }), p = w.player; w.enemies.length = 0;
      p.x = (v.at[0] + 0.5) * map.cell; p.z = (v.at[1] + 0.5) * map.cell; p.y = groundAt(w, p.x, p.z, PLAYER.radius); p.lastSafe = { x: p.x, z: p.z }; flights++; let mv = [0, 0], yaw = 0;
      for (let t = 0; t < 900 && p.hp > 0; t++) {
        if (t % 20 === 0) { mv = [pick(), pick()]; yaw = (rnd() - 0.5) * 0.1; }
        step(w, { ...idle, move: mv, yaw, sprint: rnd() < 0.2 }); for (const e of drainEvents(w)) if (e.type === 'void_fall') falls++;
        assert.ok(p.air || !overVoid(map, p), `${id} vent ${v.at} trial ${trial} tick ${t}: on the ground over the void`);
      }
    }
  }
  assert.ok(flights >= 100 && falls > 5, `flights ${flights}, void falls ${falls}: both happen`);
});
