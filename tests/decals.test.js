// PT-021 step 2: marks that stay. The placement is pure (a sim event in, specs out), the layer is one mesh with rings that recycle, a map may list its own marks, and a cradle holds a person.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { parseMap, validateMap } from '../src/engine/mapformat.js';
import { DECALS } from '../src/engine/defs.js';
import { floorSpot, rayWall, impactSpot, decalsForEvent, decalsAtLoad } from '../src/render/decalplace.js';
import { DecalLayer } from '../src/render/decals.js';
import { makeCradle } from '../src/render/models_g2.js';

// a 12 x 7 cell hall (2 m cells, world 24 x 14), the east end a pool of water; the player starts at (2, 3)
const GRID = ['############', '#..........#', '#..........#', '#..........#', '#..........#', '#..........#', '############'];
const FX = ['............', '.........ww.', '.........ww.', '............', '............', '............', '............'];
const base = (extra = {}) => ({ format: 1, id: 'D1', version: 1, name: 'Marks', grid: GRID, fx: FX, doors: [], secrets: [], entities: [{ type: 'player', at: [2, 3], facing: 'east' }, { type: 'exit', at: [5, 5] }], ...extra });
const map = (extra) => parseMap(base(extra));
const seq = (...v) => { let i = 0; return () => v[i++ % v.length]; };

test('floorSpot: on the floor a hair above it; nothing in a wall, in water, or on a moving floor', () => {
  const m = map(); const s = floorSpot(m, 8, 6); assert.ok(s && Math.abs(s.pos[1] - (m.floor(4, 3) + 0.014)) < 1e-9 && s.n[1] === 1);
  assert.equal(floorSpot(m, 1, 1), null, 'a wall cell'); assert.equal(floorSpot(m, 21, 3), null, 'wading water');
});

test('rayWall: the first wall a ray meets, its face normal pointing back, and nothing beyond the reach', () => {
  const m = map(); const h = rayWall(m, 8, 6, 1, 0, 30);
  assert.ok(h && Math.abs(h.x - 22) < 1e-6 && Math.abs(h.z - 6) < 1e-6 && h.nx === -1 && h.nz === 0 && Math.abs(h.d - 14) < 1e-6, JSON.stringify(h));
  const up = rayWall(m, 8, 6, 0, -1, 30); assert.ok(up && Math.abs(up.z - 2) < 1e-6 && up.nz === 1 && up.nx === 0);
  assert.equal(rayWall(m, 8, 6, 1, 0, 5), null, 'too far'); assert.equal(rayWall(m, 1, 1, 1, 0, 30), null, 'starting inside a wall');
  const diag = rayWall(m, 8, 6, Math.SQRT1_2, Math.SQRT1_2, 30); assert.ok(diag && (diag.nx === -1 || diag.nz === -1));
});

test('impactSpot: the face of the wall the shot stopped in, or the floor if it stopped low in the open', () => {
  const m = map(); const w = impactSpot(m, 22.6, 1.4, 6);        // inside the east wall cell (x 22..24)
  assert.ok(w && Math.abs(w.pos[0] - 22) < 1e-6 && w.n[0] === -1 && w.pos[1] > 0 && w.pos[1] < m.ceilingAt(10, 3), JSON.stringify(w));
  const f = impactSpot(m, 8, 0.1, 6); assert.ok(f && f.n[1] === 1); assert.equal(impactSpot(m, 8, 2, 6), null, 'high in open air');
  const hi = impactSpot(m, 22.6, 99, 6); assert.ok(hi.pos[1] <= m.ceilingAt(10, 3), 'clamped under the ceiling');
});

test('an enemy hit throws spatter on the floor and on the wall BEHIND it, and not into the water', () => {
  const m = map(), ctx = (r) => ({ map: m, ex: 4, ez: 6, rnd: r, kindAt: () => 'tollbearer' });
  const out = decalsForEvent({ type: 'enemy_hit', kind: 'tollbearer', id: 1, x: 18, z: 6 }, ctx(() => 0.3));
  const floor = out.find((d) => d.n[1] === 1), wall = out.find((d) => d.n[1] === 0);
  assert.ok(floor && floor.ring === 'splat' && DECALS.kinds.blood.includes(floor.cell), 'a blood splat on the floor'); assert.ok(wall && wall.n[0] === -1 && Math.abs(wall.pos[0] - 22) < 1e-6, 'on the far wall, facing the room');
  const gill = decalsForEvent({ type: 'enemy_hit', kind: 'gill', id: 2, x: 18, z: 6 }, ctx(() => 0.3)); assert.ok(gill.every((d) => DECALS.kinds.ichor.includes(d.cell)), 'a Vael bleeds ichor');
  const wet = decalsForEvent({ type: 'enemy_hit', kind: 'tollbearer', id: 1, x: 21, z: 4 }, ctx(() => 0.3)); assert.ok(wet.every((d) => d.n[1] !== 1), 'no splat on the water at x 21, z 4');
  const melee = decalsForEvent({ type: 'melee_hit', kind: 'axe', x: 18, z: 6, killed: false }, { ...ctx(() => 0.3), kindAt: () => 'gill' }); assert.ok(melee.length && melee.every((d) => DECALS.kinds.ichor.includes(d.cell)), 'a melee hit finds the creature by where it stands');
});

test('a death leaves a spreading pool and a smear along the line from the shooter, and a splat behind', () => {
  const m = map(), r = seq(0.5, 0.5, 0.2, 0.5, 0.5, 0.5);
  const out = decalsForEvent({ type: 'enemy_died', kind: 'tollbearer', id: 1, x: 16, z: 6 }, { map: m, ex: 4, ez: 6, rnd: r });
  const pool = out.find((d) => d.cell === DECALS.kinds.bloodpool[0]), smear = out.find((d) => d.cell === DECALS.kinds.smear[0]);
  assert.ok(pool && pool.ring === 'mark' && pool.grow > 0 && pool.w > 1.2, 'a pool that spreads'); assert.ok(smear && Math.abs(smear.rot) < 1e-9 && smear.pos[0] > 16, 'a smear running away from the shooter (+x)');
  assert.ok(smear.tint[0] > smear.tint[1], 'the smear is tinted red for a human');
  const ichor = decalsForEvent({ type: 'enemy_died', kind: 'feeder', id: 3, x: 16, z: 6 }, { map: m, ex: 4, ez: 6, rnd: seq(0.5, 0.5, 0.5, 0.5) }); assert.ok(ichor.some((d) => d.cell === DECALS.kinds.ichorpool[0]) && ichor.find((d) => d.cell === 12).tint[1] > ichor.find((d) => d.cell === 12).tint[0], 'a Vael dies into ichor');
});

test('a bullet leaves a pock, a blast leaves a scorch on the floor and up to two walls, and nothing else leaves anything', () => {
  const m = map(), ctx = { map: m, ex: 4, ez: 6, rnd: seq(0.5, 0.3, 0.7) };
  const pock = decalsForEvent({ type: 'impact', x: 22.6, y: 1.4, z: 6 }, ctx); assert.equal(pock.length, 1); assert.equal(pock[0].ring, 'pock'); assert.equal(pock[0].cell, 3); assert.ok(pock[0].w < 0.3);
  assert.equal(decalsForEvent({ type: 'impact', x: 8, y: 2, z: 6 }, ctx).length, 0, 'a shot that stopped in the air');
  const boom = decalsForEvent({ type: 'explode', x: 20.5, y: 0.5, z: 6 }, ctx); assert.ok(boom.some((d) => d.cell === 10 && d.n[1] === 1 && d.w > 3), 'the scorch'); assert.ok(boom.filter((d) => d.cell === 11).length >= 1 && boom.filter((d) => d.cell === 11).length <= 2);
  for (const t of ['fire', 'swing', 'enemy_alert', 'door_open', 'pickup', 'hurt']) assert.deepEqual(decalsForEvent({ type: t, x: 8, z: 6 }, ctx), [], t);
});

test('a map may list its own marks; a drip stain sits under every cradle; both are validated', () => {
  const m = map({ decals: [{ kind: 'blood', at: [5, 3], size: 1.6 }, { kind: 'scrape', at: [6, 2], wall: 'north', y: 1.2, size: 1.1 }, { kind: 'smear', at: [4, 4], rot: 1, tone: 'ichor' }], entities: base().entities.concat([{ type: 'prop', kind: 'cradle', at: [8, 4] }]) });
  const out = decalsAtLoad(m, () => 0.4);
  const floor = out.find((d) => d.cell === 1 && d.n[1] === 1), wall = out.find((d) => d.cell === 13), smear = out.find((d) => d.cell === 12), drip = out.find((d) => d.cell === 7);
  assert.ok(floor && Math.abs(floor.pos[0] - 11) < 1e-9 && Math.abs(floor.pos[2] - 7) < 1e-9 && floor.w === 1.6, 'the centre of cell (5, 3)'); assert.ok(wall && wall.n[2] === 1 && Math.abs(wall.pos[2] - 4) < 1e-9 && Math.abs(wall.pos[0] - 13) < 1e-9 && Math.abs(wall.pos[1] - 1.2) < 1e-9, JSON.stringify(wall));
  assert.ok(smear && smear.tint[1] > smear.tint[0], 'the author chose ichor'); assert.ok(drip && Math.abs(drip.pos[0] - 17) < 1e-9 && Math.abs(drip.pos[2] - 9) < 1e-9, 'a drip under the cradle in cell (8, 4)');
  assert.deepEqual(decalsAtLoad(map(), () => 0.4), [], 'no marks unless the map has some');
  const bad = (decals, re) => { const v = validateMap(base({ decals })); assert.equal(v.ok, false); assert.ok(v.errors.some((e) => re.test(e)), JSON.stringify(v.errors)); };
  assert.equal(validateMap(base({ decals: [{ kind: 'blood', at: [5, 3] }] })).ok, true);
  bad([{ kind: 'gore', at: [5, 3] }], /kind must be one of/); bad([{ kind: 'blood', at: [99, 3] }], /inside the grid/); bad([{ kind: 'blood', at: [5, 3], wall: 'up' }], /wall must be/); bad([{ kind: 'blood', at: [5, 3], size: 9 }], /size must be/);
  bad([{ kind: 'blood', at: [5, 3], y: 9 }], /y must be/); bad([{ kind: 'blood', at: [5, 3], ring: 'x' }], /ring must be/); bad(Array.from({ length: 65 }, () => ({ kind: 'blood', at: [5, 3] })), /at most 64/);
});

test('the layer is one mesh: a floor mark lies flat a hair above the floor, a wall mark stands off the wall, a ring recycles its oldest, a pool spreads', () => {
  const layer = new DecalLayer(new THREE.Texture()), M = layer.mesh;
  assert.ok(M.isMesh && M.material.transparent && M.material.depthWrite === false && M.material.vertexColors, 'blended, no depth write, vertex-coloured');
  const fl = layer.add({ ring: 'splat', cell: 1, pos: [8, 0.014, 6], n: [0, 1, 0], w: 1, h: 1, rot: 0, tint: [1, 1, 1], a: 0.9, grow: 0 });
  const p = layer.geometry.getAttribute('position'); const ys = [0, 1, 2, 3].map((i) => p.getY(fl * 4 + i)); assert.ok(ys.every((y) => Math.abs(y - ys[0]) < 1e-9 && y > 0.014 && y < 0.03), 'flat: ' + ys);
  const xs = [0, 1, 2, 3].map((i) => p.getX(fl * 4 + i)); assert.ok(Math.abs(Math.max(...xs) - Math.min(...xs) - 1) < 1e-9, 'one metre wide');
  const wl = layer.add({ ring: 'splat', cell: 0, pos: [22, 1.2, 6], n: [-1, 0, 0], w: 1, h: 1, rot: 0, tint: [1, 1, 1], a: 0.9, grow: 0 });
  const wx = [0, 1, 2, 3].map((i) => p.getX(wl * 4 + i)), wz = [0, 1, 2, 3].map((i) => p.getZ(wl * 4 + i)), wy = [0, 1, 2, 3].map((i) => p.getY(wl * 4 + i));
  assert.ok(wx.every((x) => x < 22 && x > 21.97), 'off the wall toward the room'); assert.ok(Math.max(...wz) - Math.min(...wz) > 0.99 && Math.max(...wy) - Math.min(...wy) > 0.99, 'a metre along and a metre up');
  const uv = layer.geometry.getAttribute('uv'); const cellU = [0, 1, 2, 3].map((i) => uv.getX(fl * 4 + i)); assert.ok(Math.min(...cellU) >= 0.25 && Math.max(...cellU) <= 0.5, 'cell 1 is the second column');
  const cap = DECALS.rings.pock; for (let i = 0; i < cap + 10; i++) layer.add({ ring: 'pock', cell: 3, pos: [i * 0.01, 1, 6], n: [-1, 0, 0], w: 0.2, h: 0.2, rot: 0, tint: [1, 1, 1], a: 1, grow: 0 });
  assert.equal(layer.stats().pock, cap, 'a full ring stays full'); assert.equal(layer.stats().splat, 2, 'the pocks did not take the splats\' slots');
  const pool = layer.add({ ring: 'mark', cell: 8, pos: [8, 0.014, 6], n: [0, 1, 0], w: 2, h: 2, rot: 0, tint: [1, 1, 1], a: 0.95, grow: 2 });
  const ext = () => { const xs2 = [0, 1, 2, 3].map((i) => p.getX(pool * 4 + i)); return Math.max(...xs2) - Math.min(...xs2); }, a0 = ext(); layer.update(1); const a1 = ext(); layer.update(2); const a2 = ext();
  assert.ok(a0 < a1 && a1 < a2 + 1e-9 && Math.abs(a2 - 2) < 1e-9 && a0 < 0.7, `spreads: ${a0} ${a1} ${a2}`);
  assert.throws(() => layer.add({ ring: 'nope', cell: 0, pos: [0, 0, 0], n: [0, 1, 0], w: 1, h: 1, rot: 0, tint: [1, 1, 1], a: 1, grow: 0 }), /unknown decal ring/);
});

test('a cradle holds a person: a head, arms, legs and boots in a cocoon, about a person tall, hanging from y = 0', () => {
  const { group } = makeCradle(null), box = new THREE.Box3().setFromObject(group); let n = 0; group.traverse((o) => { if (o.isMesh) n++; });
  assert.ok(n >= 24, 'a figure, not a capsule and a ball: ' + n + ' meshes'); assert.ok(box.max.y <= 0.001 && box.min.y < -3.0 && box.min.y > -3.8, 'hangs from the ceiling: ' + box.min.y + ' .. ' + box.max.y);
  let cocoon = false, boots = 0; group.traverse((o) => { if (o.isMesh && o.material.transparent && o.material.opacity < 0.4) cocoon = true; if (o.isMesh && o.geometry.type === 'BoxGeometry' && Math.abs(o.position.y + 2.72) < 0.01) boots++; });
  assert.ok(cocoon, 'a translucent cocoon'); assert.equal(boots, 2, 'two boots');
  const shell = (() => { let s; group.traverse((o) => { if (o.isMesh && o.geometry.type === 'SphereGeometry' && o.scale.y > 1) s = o; }); return s; })(); assert.ok(shell && shell.scale.y * 2 > 1.8 && shell.scale.y * 2 < 2.4, 'the cocoon is person-sized');
});
