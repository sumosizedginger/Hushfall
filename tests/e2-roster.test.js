// Gate 4 batch 2 (Episode 2): the first Vael-grown creatures. The Drone-Gill (a flyer that hovers, ignores props and water, keeps its distance, strafes and spits spores) and the Graft-Mother
// (the boss: shielded by three cradle feeders, spits spores always, hatches Gills from her sacs, slams what reaches her).
import test from 'node:test';
import assert from 'node:assert/strict';
import { parseMap } from '../src/engine/mapformat.js';
import { createWorld, step, drainEvents, spawnEnemy, blockedCircle, damageEnemy } from '../src/engine/world.js';
import { ENEMIES } from '../src/engine/defs.js';
import { insideHit, hitCylinder } from '../src/engine/hitvolume.js';

const idle = (o = {}) => ({ move: [0, 0], yaw: 0, pitch: 0, fire: false, aim: false, sprint: false, use: false, weapon: null, weaponStep: 0, map: false, ...o });
const room = (w = 30, h = 13, extra = {}, ents = []) => parseMap({ format: 1, id: 'E2R', version: 1, name: 'Arena', ceilingHeight: 8, grid: ['#'.repeat(w), ...Array.from({ length: h - 2 }, () => '#' + '.'.repeat(w - 2) + '#'), '#'.repeat(w)], doors: [],
  entities: [{ type: 'player', at: [2, 6], facing: 'east' }, { type: 'exit', at: [w - 3, 6] }, ...ents], ...extra });
const cell = (c) => (c + 0.5) * 2;
const quiet = (m, difficulty = 'normal') => { const w = createWorld(m, { seed: 1, difficulty }); w.enemies.length = 0; w.player.hp = 5000; return w; };
const run = (w, n, cmd = () => idle()) => { const ev = []; for (let i = 0; i < n; i++) { step(w, cmd(i)); ev.push(...drainEvents(w)); } return ev; };
const put = (w, kind, cx, cz, yaw = 0) => spawnEnemy(w, kind, cell(cx), cell(cz), yaw);
const at = (w, cx, cz, yaw = -Math.PI / 2) => { Object.assign(w.player, { x: cell(cx), z: cell(cz), yaw }); };

// ----------------------------------------------------------------------------------------------------------------------- Drone-Gill
test('a Drone-Gill hovers: its hit volume starts `hover` above the floor, so a shot at the floor beneath it misses and one at its body hits; it comes down as it dies', () => {
  const D = ENEMIES.gill, e = { kind: 'gill', x: 10, z: 10, y: 0, yaw: 0, dead: 0 };
  assert.ok(D.flying && D.hover > 0.5, 'a flyer');
  assert.ok(!insideHit(e, 10, 0.3, 10), 'the floor under it is empty air');
  assert.ok(!insideHit(e, 10, D.hover - 0.1, 10), 'just below its lowest tendril');
  assert.ok(insideHit(e, 10, D.hover + D.height / 2, 10), 'its body');
  assert.ok(!insideHit(e, 10, D.hover + D.height + 0.1, 10), 'above its crown');
  const c = hitCylinder({ ...e, y: 3 }); assert.ok(Math.abs(c.y0 - (3 + D.hover)) < 1e-9 && Math.abs(c.y1 - (3 + D.hover + D.height)) < 1e-9, 'it hovers over a raised floor too');
  assert.ok(Math.abs(hitCylinder({ ...e, dead: 1 }).y0) < 1e-9, 'a dead flyer lies on the floor');
});

test('a flyer is stopped by walls but not by props, water or ledges; a walker is stopped by all of them', () => {
  const m = room(30, 13, {}, [{ type: 'prop', kind: 'crate', at: [10, 6] }]), w = quiet(m);
  const g = put(w, 'gill', 6, 6, 0), t = put(w, 'tollbearer', 6, 8, 0), px = cell(10), pz = cell(6);
  assert.ok(m.props.length >= 1, 'the crate is in the map');
  assert.equal(blockedCircle(w, px, pz, ENEMIES.tollbearer.radius, t), true, 'a Tollbearer cannot walk through the crate');
  assert.equal(blockedCircle(w, px, pz, ENEMIES.gill.radius, g), false, 'a Drone-Gill flies over it');
  assert.equal(blockedCircle(w, 0.5, cell(6), ENEMIES.gill.radius, g), true, 'but not through a wall');
});

test('a Gill keeps its distance, circles (strafes) and spits spores that leave from its own height; the same seed gives the same flight', () => {
  const fly = () => { const w = quiet(room()); at(w, 3, 6); const g = put(w, 'gill', 16, 6, Math.PI / 2); g.state = 'chase'; g.hp = 1e6; return { w, g }; };
  const A = fly(), evA = run(A.w, 60 * 8), shots = evA.filter((e) => e.type === 'enemy_shot' && e.kind === 'gill');
  const R = ENEMIES.gill.ranged, d = Math.hypot(A.g.x - A.w.player.x, A.g.z - A.w.player.z);
  assert.ok(shots.length >= 2, 'it spits: ' + shots.length);
  assert.ok(d >= R.minRange - 0.5 && d <= R.maxRange, `it holds its range (${d.toFixed(1)} m)`);
  const B = fly(); run(B.w, 60 * 8); assert.deepEqual([A.g.x, A.g.z, A.g.strafeDir], [B.g.x, B.g.z, B.g.strafeDir], 'deterministic');
  // strafing: it moves sideways while holding range
  const C = fly(); const z0 = C.g.z; let maxSide = 0; for (let i = 0; i < 60 * 6; i++) { step(C.w, idle()); maxSide = Math.max(maxSide, Math.abs(C.g.z - z0)); }
  assert.ok(maxSide > 1.0, 'it circles: moved ' + maxSide.toFixed(2) + ' m off its line');
  // the shot leaves from the creature's muzzle height, not from a human's chest
  const D = fly(); let first = null; for (let i = 0; i < 60 * 8 && !first; i++) { step(D.w, idle()); if (D.w.enemyShots.length) first = { ...D.w.enemyShots[0] }; }
  assert.ok(first && Math.abs(first.y - (D.g.y + R.muzzleY)) < 0.6, `the spore starts near y ${R.muzzleY} (got ${first && first.y.toFixed(2)})`);
});

test('a Drone-Gill is fragile: one scattergun blast at close range kills it', () => {
  const w = quiet(room()); at(w, 6, 6); const g = put(w, 'gill', 9, 6, Math.PI / 2); g.state = 'chase';
  w.player.weapons = ['flare', 'scattergun', 'rivet']; w.player.weapon = 'scattergun'; w.player.ammo.shell = 10; w.player.switchT = 0;
  const hv = ENEMIES.gill.hover + ENEMIES.gill.height / 2; w.player.pitch = Math.atan2(hv - 1.6, g.x - w.player.x);
  for (let i = 0; i < 30; i++) step(w, idle({ aim: true })); const before = g.hp; run(w, 1, () => idle({ aim: true, fire: true })); run(w, 5);
  assert.ok(before - g.hp > 0, 'the shot reached its hovering body'); assert.ok(g.hp < ENEMIES.gill.hp * 0.5 || g.state === 'dead', 'and did real damage: hp ' + g.hp.toFixed(0));
});

// ----------------------------------------------------------------------------------------------------------------------- Graft-Mother
const mother = () => {
  const w = quiet(room(40, 15, {}, [])); at(w, 3, 7);
  const m = put(w, 'graftmother', 30, 7, -Math.PI / 2); m.state = 'chase'; m.summons = [[cell(26), cell(3)], [cell(26), cell(11)]];
  const feeders = [[24, 4], [24, 10], [27, 7]].map(([x, z]) => put(w, 'feeder', x, z, 0)); return { w, m, feeders };
};
test('the Graft-Mother is shielded while any feeder stands; killing the last one drops the shield and staggers her', () => {
  const { w, m, feeders } = mother(); m.hp = 1e6; const d0 = m.hp; damageEnemy(w, m, 100); const shielded = d0 - m.hp;
  assert.ok(Math.abs(shielded - 100 * ENEMIES.graftmother.shield.reduce) < 1e-6, 'a feeder-fed shield takes ' + shielded.toFixed(2));
  for (const f of feeders) damageEnemy(w, f, 1e6); assert.ok(feeders.every((f) => f.state === 'dead')); assert.ok(m.stunT > 0, 'staggered when the ring breaks');
  const d1 = m.hp; damageEnemy(w, m, 100); assert.ok(d1 - m.hp > 90, 'unshielded (and staggered): ' + (d1 - m.hp).toFixed(1));
});
test('the Graft-Mother spits spores from the start, hatches Gills from her sacs, and has no tone pulses', () => {
  const { w, m } = mother(); m.hp = 1e6; w.player.hp = 1e6; const ev = run(w, 60 * 22);
  assert.ok(ev.some((e) => e.type === 'enemy_shot' && e.kind === 'graftmother'), 'a spore fan with the feeders still up');
  const hatched = ev.filter((e) => e.type === 'enemy_spawn' && e.kind === 'gill'); assert.ok(hatched.length >= 2, 'gills hatch: ' + hatched.length);
  assert.ok(!ev.some((e) => e.type === 'pulse'), 'no tone pulses (that is the Cantor)');
  assert.ok(w.enemies.filter((e) => e.kind === 'gill' && e.state !== 'dead').length <= ENEMIES.graftmother.summon.max, 'the brood is capped');
});
test('she holds her ground: the Graft-Mother does not back away like the Cantor', () => {
  const { w, m } = mother(); m.hp = 1e6; at(w, 26, 7); const d0 = Math.hypot(m.x - w.player.x, m.z - w.player.z); run(w, 60 * 3);
  assert.ok(Math.hypot(m.x - w.player.x, m.z - w.player.z) <= d0 + 0.5, 'she does not retreat');
});
