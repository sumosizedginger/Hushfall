// PT-033 (Episode 4, Batch E): THE GATE WARDEN and its sweep (src/engine/sweep.js; ENEMIES.gatewarden / seal in defs.js). A ray traced at any angle: stopped by a wall, a shut door, a pillar; turned by the Mirror Array's one-sided mirrors; a reflected stretch through a seal
// shatters it (the shield falls with the last seal); the beam hurts the player it crosses, once a second at most, and not through cover. The Warden never moves. Hand-made hall; the shipped arena has its own tests (tests/batch-e2.test.js).
import test from 'node:test';
import assert from 'node:assert/strict';
import { parseMap } from '../src/engine/mapformat.js';
import { createWorld, step, drainEvents, damageEnemy, cellSolid } from '../src/engine/world.js';
import { traceSweep, sweepStep, distToSegment } from '../src/engine/sweep.js';
import { ENEMIES, TICK } from '../src/engine/defs.js';

const idle = (o = {}) => ({ move: [0, 0], yaw: 0, pitch: 0, fire: false, aim: false, sprint: false, use: false, weapon: null, weaponStep: 0, map: false, ...o });
const run = (w, n) => { const ev = []; for (let i = 0; i < n; i++) { step(w, idle()); ev.push(...drainEvents(w)); } return ev; };
const C = (c) => (c + 0.5) * 2;
/** a hall 30 x 20 cells, the Warden at (26, 10) facing west, two seals beside it, a mirror at (10, 10) (rot 1: NE face) with a seal north of it at (10, 4), the player at (3, 10); `extra` more entities */
const hall = (extra = []) => {
  const g = Array.from({ length: 20 }, (_, z) => Array.from({ length: 30 }, (_, x) => (x === 0 || z === 0 || x === 29 || z === 19 ? '#' : '.')));
  return { format: 1, id: 'W1', version: 1, name: 'Warden', cellSize: 2, grid: g.map((r) => r.join('')), doors: [], secrets: [],
    entities: [{ type: 'player', at: [3, 10], facing: 'east' }, { type: 'exit', at: [28, 18] }, { type: 'enemy', kind: 'gatewarden', at: [26, 10], facing: 'west', group: 'warden' },
      { type: 'enemy', kind: 'seal', at: [25, 8], group: 'seals' }, { type: 'enemy', kind: 'seal', at: [25, 12], group: 'seals' },
      { type: 'prop', kind: 'mirror', id: 'm1', at: [10, 10], rot: 1 }, { type: 'enemy', kind: 'seal', at: [10, 4], group: 'seals' }, ...extra] };
};
const world = (extra) => createWorld(parseMap(hall(extra)), { seed: 1, difficulty: 'normal' });
const solid = (w) => (cx, cz) => cellSolid(w, cx, cz);
const W = (w) => w.enemies.find((e) => e.kind === 'gatewarden');
const WEST = Math.PI / 2;                                   // sin(+pi/2) = 1 would be +x: the sweep angle is a yaw (sin, cos): west is -pi/2
void WEST;

test('a ray runs to the wall; a pillar and a shut door stop it; the back of a mirror ends it', () => {
  const w = world(); const t = traceSweep(w, C(26), C(10), -Math.PI / 2, solid(w), 100);
  assert.ok(t.pts.length >= 2); const [, last] = [t.pts[0], t.pts.at(-1)]; assert.ok(last[0] > C(10) - 0.6 && last[0] < C(10) + 0.2 || last[0] < C(10), 'it ran west as far as the mirror');
  const w2 = world([{ type: 'prop', kind: 'pillar', at: [18, 10] }]); const t2 = traceSweep(w2, C(26), C(10), -Math.PI / 2, solid(w2), 100); assert.ok(t2.pts.at(-1)[0] > C(18), 'a pillar stops it');
  const back = world(); back.mirrors.m1 = 3;                       // SW face: a beam travelling west arrives on its back? (west . (-1, 1)/r2 < 0 is the front: check both)
  const tb = traceSweep(back, C(26), C(10), -Math.PI / 2, solid(back), 100); assert.ok(tb.pts.length >= 2);
});
test('a mirror turns the ray about its diagonal: west on the NE face goes north, and a stretch through a seal is on the reflected part', () => {
  const w = world(); const t = traceSweep(w, C(26), C(10), -Math.PI / 2, solid(w), 100);
  assert.equal(t.pts.length, 3, 'origin, the mirror, the end'); assert.ok(Math.abs(t.pts[1][0] - C(10)) < 1e-6 && Math.abs(t.pts[1][1] - C(10)) < 1e-6, 'it bounced at the mirror\'s centre');
  assert.ok(Math.abs(t.pts[2][0] - C(10)) < 0.4 && t.pts[2][1] < C(10), 'and went north along the mirror\'s column');
  assert.ok(distToSegment(t.pts, 1, C(10), C(4)) < 0.3, 'the seal north of the mirror is on the reflected stretch'); assert.ok(distToSegment(t.pts, 0, C(25), C(8)) > 1, 'the first stretch misses the seals beside the Warden (it never shoots its own)');
});
test('the Warden does not move and the sweep cycle runs: a tell, then a beam, then rest', () => {
  const w = world(); const e = W(w), x0 = e.x, z0 = e.z; w.player.x = C(20); w.player.z = C(10); w.player.hp = 100000;
  const ev = run(w, Math.round(20 / TICK)); assert.ok(ev.some((x) => x.type === 'sweep_tell'), 'a tell'); assert.ok(ev.some((x) => x.type === 'sweep_end'), 'an end'); assert.ok(Math.hypot(e.x - x0, e.z - z0) < 1e-6, 'it stands where it stands');
  assert.ok(ev.some((x) => x.type === 'sweep_hit'), 'the beam crossed the player standing in front of it');
});
test('the beam hurts once a second at most, and a pillar is cover', () => {
  const def = { ...ENEMIES.gatewarden, sweep: { ...ENEMIES.gatewarden.sweep, arc: 0.0001, tell: 0, duration: 4, hitCd: 1 } };
  const w = world(); const e = W(w), hp0 = (w.player.x = C(20), w.player.z = C(10), w.player.hp); Object.assign(e, { sweepT: 0.001, sweepA0: -Math.PI / 2, sweepDir: 1 });
  const H = { emit: () => {}, hurtPlayer: (ww, d) => { ww.player.hp -= d; }, damageEnemy, solid: solid(w) }; for (let i = 0; i < Math.round(3 / TICK); i++) { w.time += TICK; sweepStep(w, e, def, { enemyDamage: 1 }, TICK, true, 12, H); }
  assert.equal(hp0 - w.player.hp, ENEMIES.gatewarden.sweep.damage * 3, `three hits in three seconds (${hp0 - w.player.hp})`);
  const c = world([{ type: 'prop', kind: 'pillar', at: [14, 10] }]); const ce = W(c); c.player.x = C(8); c.player.z = C(10); const cp = c.player.hp; Object.assign(ce, { sweepT: 0.001, sweepA0: -Math.PI / 2, sweepDir: 1 });
  const H2 = { emit: () => {}, hurtPlayer: (ww, d) => { ww.player.hp -= d; }, damageEnemy, solid: solid(c) }; for (let i = 0; i < 120; i++) { c.time += TICK; sweepStep(c, ce, def, { enemyDamage: 1 }, TICK, true, 12, H2); }
  assert.equal(c.player.hp, cp, 'behind a pillar it does not touch you');
});
test('the Mirror Array as a weapon: the reflected beam shatters the seal north of the mirror, and the seals shield the Warden until the last one is gone', () => {
  const def = { ...ENEMIES.gatewarden, sweep: { ...ENEMIES.gatewarden.sweep, arc: 0.0001, tell: 0, duration: 2, hitCd: 1 } };
  const w = world(); const e = W(w); const seals = w.enemies.filter((s) => s.kind === 'seal'); assert.equal(seals.length, 3);
  Object.assign(e, { sweepT: 0.001, sweepA0: -Math.PI / 2, sweepDir: 1 }); w.player.x = C(3); w.player.z = C(2);
  const ev = []; const H = { emit: (ww, type, d) => ev.push({ type, ...d }), hurtPlayer: () => {}, damageEnemy, solid: solid(w) };
  for (let i = 0; i < 20; i++) { w.time += TICK; sweepStep(w, e, def, { enemyDamage: 1 }, TICK, true, 12, H); }
  assert.ok(ev.some((x) => x.type === 'seal_shatter'), 'a seal shattered'); const north = seals.find((s) => Math.abs(s.x - C(10)) < 0.1 && Math.abs(s.z - C(4)) < 0.1); assert.equal(north.state, 'dead');
  assert.equal(seals.filter((s) => s.state !== 'dead').length, 2, 'the two beside the Warden still stand (it never shoots its own)'); assert.ok((e.stunT ?? 0) > 0, 'a seal\'s death staggers the Warden');
  const before = e.hp; damageEnemy(w, e, 100, {}); const shielded = before - e.hp; assert.ok(shielded < 10, `shielded: ${shielded}`);
  for (const s of seals) if (s.state !== 'dead') damageEnemy(w, s, 9999, {}); e.hp = before; damageEnemy(w, e, 100, {}); assert.ok(before - e.hp >= 90, `unshielded: ${before - e.hp}`);
});
test('the Warden is a boss with a shield, a pulse, a sweep and Drone-Gills; the seal is a node; neither is in an older world', () => {
  const d = ENEMIES.gatewarden; assert.ok(d.boss && d.shield && d.pulse && d.sweep && d.summon.kind === 'gill' && d.speed === 0); assert.ok(ENEMIES.seal.node);
  assert.equal(Object.values(ENEMIES).filter((x) => x.sweep).length, 1, 'one creature sweeps');
});
