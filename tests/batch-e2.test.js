// PT-033 (Episode 4, Batch E): THE HOLLOW STAIR (C1E4M07: a sixteen-metre climb round a shaft of light, a lever on every landing, four vents across the hollow, the exit behind the top landing opening only when ALL FOUR levers are
// thrown: a list of conditions in one trigger) and GATE WARDEN (C1E4M08: an oval hall under a dome, a dais with the Warden, three seals, three mirrors on plinths, twelve-odd blocks of stone). What only these two maps have; the generic gates
// (viability, lint, traps, the space contract) already hold every shipped map to what it says. The Warden's own rules are in tests/gatewarden.test.js, the list-of-conditions trigger is covered here (and in a synthetic map).
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadMapFile, loadRouteFile, runRoute, runRouteEither } from '../src/engine/harness.js';
import { parseMap, validateMap } from '../src/engine/mapformat.js';
import { createWorld, step, drainEvents, cellSolid, damageEnemy } from '../src/engine/world.js';
import { runAction } from '../src/engine/script.js';
import { traceSweep, sweepStep, distToSegment } from '../src/engine/sweep.js';
import { ENEMIES, TICK } from '../src/engine/defs.js';
import { findTraps } from '../src/engine/traps.js';
import { shippedMap, shippedSrc } from './helpers.js';

const idle = (o = {}) => ({ move: [0, 0], yaw: 0, pitch: 0, fire: false, aim: false, sprint: false, use: false, weapon: null, weaponStep: 0, map: false, ...o });
const run = (w, n) => { const ev = []; for (let i = 0; i < n; i++) { step(w, idle()); ev.push(...drainEvents(w)); } return ev; };
const complete = (id, name, difficulty = 'normal', seed = 1) => runRouteEither(loadMapFile(`maps/${id}.json`), loadRouteFile(`routes/${id}.${name}.route.json`), { seed, difficulty });          // (PT-076: either fighter policy, as verify-map judges a route: with the brain one fixed policy on one seed swings on the dice)
const C = (c) => (c + 0.5) * 2;

test('Hollow Stair: four levers, four vents, a climb of sixteen metres in the open, a locked exit, and the map says what to do', () => {
  const src = shippedSrc('C1E4M07'), map = shippedMap('C1E4M07'), sw = src.entities.filter((e) => e.type === 'switch');
  assert.equal(sw.length, 4); assert.deepEqual(sw.map((s) => s.id).sort(), ['lever-1', 'lever-2', 'lever-3', 'lever-4']);
  assert.ok(src.entities.some((e) => e.type === 'exit' && e.locked), 'the exit starts locked');
  const t = src.triggers.find((q) => Array.isArray(q.when)); assert.ok(t, 'one trigger with a list of conditions'); assert.deepEqual(t.when, ['msg:lever-1', 'msg:lever-2', 'msg:lever-3', 'msg:lever-4']); assert.ok(t.do.some((a) => a.exit?.set === 'unlock'));
  assert.equal(src.vents.length, 4); assert.equal(src.quality.scaleClass, 'SET-PIECE'); assert.equal(src.atmosphere.look, 'stair'); assert.equal(src.atmosphere.sky, 'gate');
  const heights = []; for (let z = 0; z < map.h; z++) for (let x = 0; x < map.w; x++) if (map.kind(x, z) !== 'wall' && map.kind(x, z) !== 'void') heights.push(map.floor(x, z)); assert.equal(Math.max(...heights), 16, 'the top landing is 16 m up'); assert.equal(Math.min(...heights), 0);
  for (const h of [4, 8, 12, 16]) assert.ok(heights.filter((v) => v === h).length > 150, `a landing at ${h} m is a wide terrace`);
  assert.ok(map.hasVoid, 'the shaft is open sky'); assert.equal(findTraps(map).traps, 0);
});

test('Hollow Stair: the exit opens only when all four levers are thrown, in any order (a list of conditions is an AND)', () => {
  const map = shippedMap('C1E4M07'), w = createWorld(map, { seed: 1, difficulty: 'normal' });
  assert.ok(Object.values(w.exitLocked).every(Boolean), 'locked at the start');
  for (const id of ['lever-3', 'lever-1', 'lever-4']) { runAction(w, { message: id }); run(w, 3); assert.ok(Object.values(w.exitLocked).every(Boolean), `still locked after ${id}`); }
  runAction(w, { message: 'lever-2' }); const ev = run(w, 3); assert.ok(Object.values(w.exitLocked).every((x) => !x), 'unlocked by the fourth'); assert.ok(ev.some((e) => e.type === 'exit_unlock'));
});

test('a list of conditions needs two or more of the ordinary kinds and an unknown one is refused', () => {
  const src = JSON.parse(JSON.stringify(shippedSrc('C1E4M07')));
  src.triggers = [{ id: 'x', when: ['msg:lever-1'], do: [{ shake: 1 }] }]; let v = validateMap(src); assert.equal(v.ok, false); assert.ok(v.errors.some((e) => /list of conditions/.test(e)), JSON.stringify(v.errors));
  src.triggers = [{ id: 'x', when: ['msg:lever-1', 'enter'], do: [{ shake: 1 }] }]; v = validateMap(src); assert.equal(v.ok, false);
  src.triggers = [{ id: 'x', when: ['msg:lever-1', 'msg:nope'], do: [{ shake: 1 }] }]; v = validateMap(src); assert.equal(v.ok, false); assert.ok(v.errors.some((e) => /unknown message/.test(e)), JSON.stringify(v.errors));
  src.triggers = [{ id: 'x', when: ['msg:lever-1', 'msg:lever-2'], do: [{ exit: { set: 'unlock' } }] }]; v = validateMap(src); assert.equal(v.ok, true, JSON.stringify(v.errors));
});

test('Hollow Stair: every vent throws a player across the hollow onto its landing, which is on another landing and at another height', () => {
  const map = shippedMap('C1E4M07'), src = shippedSrc('C1E4M07'); assert.equal(validateMap(src).ok, true);
  for (const v of src.vents) {
    const w = createWorld(map, { seed: 1, difficulty: 'normal' }); Object.assign(w.player, { x: C(v.at[0]), z: C(v.at[1]), y: map.floor(v.at[0], v.at[1]), hp: 1e9 });
    run(w, Math.round((v.time + 1.5) / TICK)); const p = w.player;
    assert.ok(Math.hypot(p.x - C(v.to[0]), p.z - C(v.to[1])) < 4.5, `vent ${v.at} lands near ${v.to}: ${(p.x / 2).toFixed(1)}, ${(p.z / 2).toFixed(1)}`);
    assert.ok(Math.abs(map.floor(v.to[0], v.to[1]) - map.floor(v.at[0], v.at[1])) >= 4, 'a different landing'); assert.ok(!p.air, 'on the ground again');
  }
});

test('Hollow Stair: the main and the secret route reach the exit on every difficulty', () => {
  for (const difficulty of ['easy', 'normal', 'hard']) for (const name of ['main', 'secret']) { const r = complete('C1E4M07', name, difficulty); assert.equal(r.result, 'complete', `${name} ${difficulty}: ${r.failure}`); }
});

test('Gate Warden: one Warden, three seals in one group, three mirrors, a locked exit behind the dais, and a dome over the west half only', () => {
  const src = shippedSrc('C1E4M08'), map = shippedMap('C1E4M08'), en = src.entities.filter((e) => e.type === 'enemy');
  assert.equal(en.filter((e) => e.kind === 'gatewarden').length, 1); assert.equal(en.filter((e) => e.kind === 'seal').length, 3); assert.ok(en.filter((e) => e.kind === 'seal').every((e) => e.group === 'seals'));
  assert.ok(en.find((e) => e.kind === 'gatewarden').summons.length >= 4, 'alcoves to call Gills from'); assert.equal(src.entities.filter((e) => e.type === 'prop' && e.kind === 'mirror').length, 3);
  assert.ok(src.entities.some((e) => e.type === 'exit' && e.locked)); assert.ok(src.triggers.some((t) => t.when === 'dead:warden' && t.do.some((a) => a.exit?.set === 'unlock')), 'the Warden\'s death unlocks the exit'); assert.ok(src.triggers.some((t) => t.when === 'dead:seals'));
  assert.equal(src.quality.scaleClass, 'MIXED'); assert.equal(src.atmosphere.look, 'gate'); assert.equal(findTraps(map).traps, 0);
  const warden = en.find((e) => e.kind === 'gatewarden'); assert.equal(map.floor(warden.at[0], warden.at[1]), 3, 'the dais is 3 m up'); assert.equal(map.kind(warden.at[0], warden.at[1]), 'outdoor', 'under the open sky');
  let roofed = 0, open = 0; for (let z = 0; z < map.h; z++) for (let x = 0; x < map.w; x++) { const k = map.kind(x, z); if (k === 'floor') roofed++; else if (k === 'outdoor') open++; } assert.ok(roofed > 0 && open > 0 && roofed / (roofed + open) > 0.4 && roofed / (roofed + open) < 0.8, `${roofed} roofed, ${open} open`);
});

test('Gate Warden: every mirror has a turn that sends the beam through a seal, no two mirrors the same seal, and the mirror starts with its back to the Warden (the beam ends there)', () => {
  const map = shippedMap('C1E4M08'), w = createWorld(map, { seed: 1, difficulty: 'normal' }), e = w.enemies.find((q) => q.kind === 'gatewarden'), seals = w.enemies.filter((q) => q.kind === 'seal');
  const solid = (cx, cz) => cellSolid(w, cx, cz), used = new Set();
  for (const m of map.mirrors) {
    const mx = C(m.at[0]), mz = C(m.at[1]), ang = Math.atan2(mx - e.x, mz - e.z), hits = [];
    for (let rot = 0; rot < 4; rot++) {
      w.mirrors[m.id] = rot; const t = traceSweep(w, e.x, e.z, ang, solid, 64);
      for (const s of seals) for (let i = 1; i + 1 < t.pts.length; i++) if (distToSegment(t.pts, i, s.x, s.z) < 0.7 + ENEMIES.gatewarden.sweep.width) { hits.push([rot, s.id]); break; }
    }
    assert.ok(hits.length >= 1, `mirror ${m.id}: some turn reaches a seal`); assert.ok(!hits.some(([r]) => r === m.rot), `mirror ${m.id}: its starting turn is not a solution`);
    for (const [, id] of hits) used.add(id); w.mirrors[m.id] = m.rot;
  }
  assert.equal(used.size, 3, 'the three mirrors reach the three seals');
});

test('Gate Warden: a sweep through a solved mirror shatters its seal; the shield stands until the last seal is gone and the Warden does not move', () => {
  const map = shippedMap('C1E4M08'), w = createWorld(map, { seed: 1, difficulty: 'normal' }), e = w.enemies.find((q) => q.kind === 'gatewarden'), seals = w.enemies.filter((q) => q.kind === 'seal');
  const def = { ...ENEMIES.gatewarden, sweep: { ...ENEMIES.gatewarden.sweep, arc: 0.4, tell: 0, duration: 1, hitCd: 5 } }, solid = (cx, cz) => cellSolid(w, cx, cz);
  const ev = []; const H = { emit: (ww, type, d) => ev.push({ type, ...d }), hurtPlayer: () => {}, damageEnemy, solid }; w.player.x = 4; w.player.z = 4;
  for (const m of map.mirrors) {
    for (let rot = 0; rot < 4; rot++) {
      const ang = Math.atan2(C(m.at[0]) - e.x, C(m.at[1]) - e.z); w.mirrors[m.id] = rot; const t = traceSweep(w, e.x, e.z, ang, solid, 64), sealHit = seals.find((s) => s.state !== 'dead' && t.pts.some((_, i) => i >= 1 && i + 1 < t.pts.length && distToSegment(t.pts, i, s.x, s.z) < 1.2));
      if (!sealHit) continue; Object.assign(e, { sweepT: 0.001, sweepA0: ang - 0.2, sweepDir: 1 }); for (let i = 0; i < Math.round(1.2 / TICK); i++) { w.time += TICK; sweepStep(w, e, def, { enemyDamage: 1 }, TICK, true, 30, H); if (sealHit.state === 'dead') break; }
      assert.equal(sealHit.state, 'dead', `mirror ${m.id} at turn ${rot} shattered its seal`); e.sweepT = -1; break;
    }
  }
  assert.ok(ev.filter((x) => x.type === 'seal_shatter').length >= 3); assert.ok(seals.every((s) => s.state === 'dead')); const before = e.hp; damageEnemy(w, e, 100, {}); assert.ok(before - e.hp >= 90, 'unshielded once the last seal is gone');
});

test('Gate Warden: the main and the secret route reach the exit on every difficulty it is meant to (the boss is the hard part: hard needs two seeds of three)', () => {
  for (const name of ['main', 'secret']) for (const difficulty of ['easy', 'normal']) { const r = complete('C1E4M08', name, difficulty); assert.equal(r.result, 'complete', `${name} ${difficulty}: ${r.failure}`); }
  let ok = 0; for (const seed of [1, 2, 3]) if (complete('C1E4M08', 'main', 'hard', seed).result === 'complete') ok++; assert.ok(ok >= 2, `hard: ${ok} of 3 seeds`);
});
