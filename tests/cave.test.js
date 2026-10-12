// PT-037 Act B (design/ACTB.md E4): the cave kit. Node only. It is held to what it promises: deterministic for a seed, it only ever carves solid rock, never the map's edge, a passage always arrives and
// is never narrower than two cells, a bowl can be walked down by the sim's own step rule, a cave is not a box, and a chamber with a dome has a lid.
import test from 'node:test';
import assert from 'node:assert/strict';
import { Level } from '../tools/mapkit/builder.mjs';
import { FLOORS } from '../tools/mapkit/c2.mjs';
import { blob, finger, tiers, amphitheatre, smooth, skinWalls, boxiness, rng, ringNoise } from '../tools/mapkit/cave.mjs';

const fresh = (w = 90, h = 70) => new Level(w, h, { fill: '!' });
const snap = (L) => JSON.stringify([L.g, L.ht, L.ce]);
const open = (L, x, z) => FLOORS.has(L.g[z]?.[x]);
/** the cells reachable from `a` over open cells where a step up is at most one unit (0.5 m), as the sim allows (down is free) */
function reach(L, a, maxUp = 1) {
  const seen = new Set([a.join(',')]), q = [a];
  while (q.length) { const [x, z] = q.shift(); for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, nz = z + dz, k = nx + ',' + nz; if (seen.has(k) || !open(L, nx, nz) || L.ht[nz][nx] - L.ht[z][x] > maxUp) continue; seen.add(k); q.push([nx, nz]); } }
  return seen;
}

test('the generator and the ring noise are deterministic and different for different seeds', () => {
  const a = rng(5), b = rng(5), c = rng(6); const xs = Array.from({ length: 5 }, () => a()), ys = Array.from({ length: 5 }, () => b()), zs = Array.from({ length: 5 }, () => c());
  assert.deepEqual(xs, ys); assert.notDeepEqual(xs, zs); assert.ok(xs.every((v) => v >= 0 && v < 1));
  const f = ringNoise(3), g = ringNoise(3); for (const th of [0, 1, 2, 5]) { assert.equal(f(th), g(th)); assert.ok(Math.abs(f(th)) <= 1.0001); }
  assert.ok(Math.abs(ringNoise(3)(0.7) - ringNoise(4)(0.7)) > 1e-9);
});

test('a chamber is a cave and not a box: it wanders, it is deterministic, and with no roughness it is just an ellipse', () => {
  const L1 = fresh(), L2 = fresh(), L3 = fresh(), L0 = fresh();
  const c1 = blob(L1, 45, 35, 14, 10, { seed: 4, rough: 0.25 }); blob(L2, 45, 35, 14, 10, { seed: 4, rough: 0.25 }); blob(L3, 45, 35, 14, 10, { seed: 9, rough: 0.25 });
  const c0 = blob(L0, 45, 35, 14, 10, { rough: 0 });
  assert.equal(snap(L1), snap(L2), 'same arguments, same cave'); assert.notEqual(snap(L1), snap(L3), 'another seed, another cave');
  assert.ok(c1.length > 300, 'a chamber of real size: ' + c1.length); assert.ok(boxiness(c1) < 0.8, 'not a box: fill ' + boxiness(c1).toFixed(2));
  assert.ok(Math.abs(c0.length - Math.PI * 14 * 10) < 40, 'rough 0 is an ellipse: ' + c0.length + ' cells');
  assert.ok(c1.every(([x, z]) => open(L1, x, z)));
});

test('it only carves solid rock: nothing already built (a room, a door, an object) is touched, and never the edge of the map', () => {
  const L = fresh(60, 50); L.room([20, 20, 30, 28], { floor: '.', wall: '#' }); L.g[24][25] = 'D'; L.g[22][22] = 'S';
  const before = L.g.map((r) => r.slice()), changed = [];
  const cells = blob(L, 25, 24, 22, 20, { seed: 2, rough: 0.2, ch: ',' });
  for (let z = 0; z < L.h; z++) for (let x = 0; x < L.w; x++) if (before[z][x] !== '!' && L.g[z][x] !== before[z][x]) changed.push([x, z]);
  assert.deepEqual(changed, [], 'every cell that was not rock is unchanged');
  assert.ok(cells.every(([x, z]) => x >= 1 && z >= 1 && x < L.w - 1 && z < L.h - 1), 'never the outermost ring');
  const edge = blob(L, 2, 2, 8, 8, { seed: 1 }); assert.ok(edge.every(([x, z]) => x >= 1 && z >= 1), 'a chamber at the corner stops at the edge');
  for (let x = 0; x < L.w; x++) { assert.equal(L.g[0][x], '!'); assert.equal(L.g[L.h - 1][x], '!'); }
});

test('a domed chamber has a lid that rises to its middle and a floor height, and an open cavern writes none', () => {
  const L = fresh(), cells = blob(L, 45, 35, 14, 10, { seed: 3, h: 4, lidMid: 30, lidEdge: 14 }), open2 = fresh(); blob(open2, 45, 35, 14, 10, { seed: 3, h: 4 });
  const lid = (X, x, z) => { const ch = X.ce[z][x]; return ch === '.' ? 0 : parseInt(ch, 36); };
  assert.ok(lid(L, 45, 35) > lid(L, 33, 35) && lid(L, 45, 35) >= 28, `middle ${lid(L, 45, 35)} edge ${lid(L, 33, 35)}`);
  assert.ok(cells.every(([x, z]) => L.ht[z][x] === 4 && lid(L, x, z) >= 9 && lid(L, x, z) <= 35), 'height 4, headroom of at least 2.5 m, the format cap of 35');
  assert.ok(open2.ce.every((r) => r.every((c) => c === '.')), 'no lid written for an open cavern');
});

test('a passage arrives, wanders and is never narrower than two cells', () => {
  const L = fresh(), a = [8, 10], b = [80, 55], cells = finger(L, a, b, { seed: 5, width: 3, wobble: 5 });
  assert.ok(cells.length > 200); assert.ok(open(L, 8, 10) && open(L, 80, 55), 'it leaves a and lands on b');
  const R = reach(L, a); assert.ok(R.has(b.join(',')), 'connected from end to end');
  let narrow = 0; for (const [x, z] of cells) { const ox = open(L, x - 1, z) || open(L, x + 1, z), oz = open(L, x, z - 1) || open(L, x, z + 1); if (!(ox && oz)) narrow++; }
  assert.equal(narrow, 0, 'every cell of it has an open neighbour across and along (a width of at least two)');
  const line = (x) => 10 + (55 - 10) * ((x - 8) / 72); let off = 0; for (const [x, z] of cells) off = Math.max(off, Math.abs(z - line(x))); assert.ok(off > 2, 'it wanders about the straight line: ' + off.toFixed(1));
  const L2 = fresh(); finger(L2, a, b, { seed: 5, width: 3, wobble: 5 }); assert.equal(snap(L), snap(L2));
  const thin = fresh(); const t = finger(thin, [5, 5], [40, 5], { width: 1, wobble: 0 }); assert.ok(t.length >= 35 * 2 - 2, 'a width of 1 is made two');
});

test('a bowl goes down to the middle by rings, can be climbed back out by the sim step rule on a ramp, and has cliffs elsewhere', () => {
  const L = fresh(80, 70), T = tiers(L, 40, 35, { rx: 30, rz: 26, rings: 6, rise: 4, top: 24, ramps: 2, rampAt: 0.4, seed: 2 });
  assert.ok(T.cells.length > 1500); assert.equal(T.ring(40, 35), 5, 'the centre is the innermost ring'); assert.ok(T.height(40, 35) <= 4, 'the middle is the lowest');
  const rim = T.cells.filter(([x, z]) => T.ring(x, z) === 0)[0]; assert.equal(T.height(...rim), 24, 'the rim is the top');
  assert.ok(reach(L, [40, 35], 1).has(rim.join(',')), 'from the middle the rim can be climbed back to over steps of one unit (down is free, so UP is the test)');
  const noRamp = fresh(80, 70), T2 = tiers(noRamp, 40, 35, { rx: 30, rz: 26, rings: 6, rise: 4, top: 24, ramps: 0, seed: 2 }), rim2 = T2.cells.filter(([x, z]) => T2.ring(x, z) === 0)[0];
  assert.ok(!reach(noRamp, [40, 35], 1).has(rim2.join(',')), 'without a ramp the rings meet in a cliff: from the middle you cannot climb out');
  assert.ok(boxiness(T.cells) < 0.85);
  assert.throws(() => tiers(fresh(), 40, 35, { rx: 12, rz: 12, rings: 6, rise: 4 }), /steeper than a step/);
});

test('smooth removes one-cell nubs and pits among what a call carved, and touches nothing else', () => {
  const L = fresh(40, 30), cells = blob(L, 20, 15, 9, 7, { seed: 8, rough: 0.35 }), after = smooth(L, cells, 3);
  const sol = (X, x, z) => !FLOORS.has(X.g[z][x]);
  const nubs = (X) => { let n = 0; for (let z = 1; z < X.h - 1; z++) for (let x = 1; x < X.w - 1; x++) if (!sol(X, x, z) && [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(([dx, dz]) => sol(X, x + dx, z + dz)).length >= 3) n++; return n; };
  const raw = fresh(40, 30); blob(raw, 20, 15, 9, 7, { seed: 8, rough: 0.35 });
  assert.ok(nubs(L) <= nubs(raw), `no more nubs than before: ${nubs(raw)} -> ${nubs(L)}`); assert.ok(after.length > 0);
  const outside = fresh(40, 30); outside.room([2, 2, 6, 6]); const keep = outside.g.map((r) => r.slice()), c2 = blob(outside, 25, 20, 8, 6, { seed: 1, rough: 0.3 }); smooth(outside, c2, 3);
  for (let z = 1; z <= 7; z++) for (let x = 1; x <= 7; x++) assert.equal(outside.g[z][x], keep[z][x], 'the room beside it is untouched');
});

test('skinWalls gives the rock that touches the carved floor a wall skin, and only that rock', () => {
  const L = fresh(), cells = blob(L, 45, 35, 12, 9, { seed: 6 }), n = skinWalls(L, '!', '$');
  assert.ok(n > 40); let bad = 0;
  for (let z = 1; z < L.h - 1; z++) for (let x = 1; x < L.w - 1; x++) { const touches = [-1, 0, 1].some((dz) => [-1, 0, 1].some((dx) => open(L, x + dx, z + dz))); if (L.g[z][x] === '$' && !touches) bad++; if (L.g[z][x] === '!' && touches) bad++; }
  assert.equal(bad, 0); assert.ok(cells.length > 0);
});

test('a small cave map built from the kit is connected and is not a box (the kit used the way a map source will)', () => {
  const L = fresh(100, 80);
  const hall = blob(L, 50, 40, 18, 13, { seed: 11, rough: 0.28, h: 2, lidMid: 32, lidEdge: 16 });
  const arm = finger(L, [50, 40], [88, 66], { seed: 12, width: 3, wobble: 4, h: 2, lid: 20 }), arm2 = finger(L, [50, 40], [12, 14], { seed: 13, width: 4, wobble: 5, h: 2, lid: 20 });
  const cells = smooth(L, [...hall, ...arm, ...arm2], 2); skinWalls(L, '!', '$');
  const R = reach(L, [50, 40]); assert.ok(R.has('88,66') && R.has('12,14'), 'both arms reach their ends');
  assert.ok(cells.length > 900); assert.ok(boxiness(cells) < 0.6, 'a cave system is far from a box: ' + boxiness(cells).toFixed(2));
});

test('an amphitheatre has a flat plaza, terraces up to a promenade, a ramp that climbs a unit a cell and cliffs elsewhere; a ramp at two turns is still a ramp (PT-039)', () => {
  const L = fresh(104, 92), A = amphitheatre(L, 58, 50, { rx: 31, rz: 27, steps: 6, rise: 2, bottom: 6, plaza: 0.5, ramps: 2, rampAt: Math.PI, rampWidth: 4, seed: 91, ch: 's' });
  assert.equal(A.top, 18); assert.equal(A.height(58, 50), 6, 'the middle is the plaza floor'); assert.equal(A.step(58, 50), 0);
  const rim = A.cells.filter(([x, z]) => A.step(x, z) === 6 && !A.ramp(x, z))[0]; assert.equal(A.height(...rim), 18, 'the promenade is the top');
  assert.ok(reach(L, [58, 50], 1).has(rim.join(',')), 'the rim can be climbed to from the plaza by the sim step rule (the ramps)');
  assert.ok(boxiness(A.cells) < 0.85);
  const nr = fresh(104, 92), N = amphitheatre(nr, 58, 50, { rx: 31, rz: 27, steps: 6, rise: 2, bottom: 6, plaza: 0.5, ramps: 0, seed: 91, ch: 's' }), r2 = N.cells.filter(([x, z]) => N.step(x, z) === 6)[0];
  assert.ok(!reach(nr, [58, 50], 1).has(r2.join(',')), 'with no ramp the terraces are cliffs');
  const north = A.cells.filter(([x, z]) => z < 30 && A.ramp(x, z)); assert.equal(north.length, 0, 'a ramp at pi and one at 2 pi (the same angle as 0) are two ramps, west and east, and none in the north');
  assert.throws(() => amphitheatre(fresh(), 40, 35, { rx: 12, rz: 12, steps: 8, rise: 2 }), /steeper than a step/);
});
