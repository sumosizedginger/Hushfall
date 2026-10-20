// THE FLOOR MARKS (PT-063, V6b of the visual plan: "floors are flat"): what a floor is made of decides the marks it carries. Pure and deterministic; render only (the sim never reads it); one extra mesh of at most FLOORMARKS.cap quads.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import * as THREE from 'three';
import { ROOT, shippedMap } from './helpers.js';
import { FLOOR_SKINS } from '../src/engine/defs.js';
import { FLOORMARKS, MARK, MARK_LOOK, FLOOR_FAMILY, FAMILY_MARKS, familyOf, floorMarks, markableCells } from '../src/render/floorscatter.js';
import { DecalLayer } from '../src/render/decals.js';

const ids = fs.readdirSync(path.join(ROOT, 'maps')).filter((f) => f.endsWith('.json')).map((f) => f.slice(0, -5)).sort();

test('every floor texture the game has belongs to a family (nothing falls through to the default), and every family names only marks that exist', () => {
  const texes = [...new Set(Object.values(FLOOR_SKINS).map((f) => f.tex))];
  for (const t of texes) assert.ok(FLOOR_FAMILY[t], `${t} has no family`);
  for (const t of Object.keys(FLOOR_FAMILY)) assert.ok(texes.includes(t), `${t} is in the family table but is no floor`);
  for (const [fam, def] of Object.entries(FAMILY_MARKS)) { assert.ok(Object.keys(def.w).length >= 4, fam); for (const [k, v] of Object.entries(def.w)) { assert.ok(k in MARK, `${fam}: ${k}`); assert.ok(v > 0); } assert.equal(def.tint.length, 3); }
  assert.equal(new Set(Object.values(MARK)).size, 16, 'sixteen cells, all different'); for (const [k, i] of Object.entries(MARK)) { assert.ok(i >= 0 && i < 16); assert.ok(MARK_LOOK[k], k); const L = MARK_LOOK[k]; assert.ok(L.size[0] > 0.5 && L.size[1] <= 3.8 && L.a[1] <= 1); }
  assert.equal(familyOf('floor_planks_a'), 'wood'); assert.equal(familyOf('floor_grate_a'), 'metal'); assert.equal(familyOf('nonsense'), 'stone');
});

test('the marks of a map are deterministic, bounded, and never where a mark would lie: not in a wall, in water, on a moving floor or a current, and puddles only under open sky', () => {
  for (const id of ['C1E1M01', 'C1E2M06', 'C2M02', 'C2M28', 'C1E4M07']) {
    const m = shippedMap(id), a = floorMarks(m, id), b = floorMarks(m, id);
    assert.deepEqual(a, b, `${id}: the same map gives the same marks`); assert.ok(a.length > 20 && a.length <= FLOORMARKS.cap, `${id}: ${a.length} marks`);
    const ok = new Set(markableCells(m).map(([x, z]) => x + ',' + z)), S = m.cell;
    for (const s of a) {
      const cx = Math.floor(s.pos[0] / S), cz = Math.floor(s.pos[2] / S);
      assert.ok(ok.has(cx + ',' + cz) || [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dz]) => ok.has((cx + dx) + ',' + (cz + dz))), `${id}: a mark outside any markable cell at ${cx},${cz}`);
      assert.equal(s.ring, FLOORMARKS.ring); assert.deepEqual(s.n, [0, 1, 0]); assert.ok(s.cell >= 0 && s.cell < 16 && s.a > 0 && s.a <= 1 && s.w > 0.5);
      if (MARK_LOOK[s.mark].sky) { const k = m.kind(Math.floor(s.pos[0] / S), Math.floor(s.pos[2] / S)); assert.equal(k, 'outdoor', `${id}: a ${s.mark} under a roof`); }
    }
    assert.notDeepEqual(a, floorMarks(m, id + 'x'), `${id}: another seed scatters differently`);
  }
});

test('what a floor is made of decides its marks: a plank floor carries seams, a plate floor rust, a silt floor dust and prints; every shipped map has marks', () => {
  const count = (id) => { const by = {}; for (const s of floorMarks(shippedMap(id), id)) by[s.mark] = (by[s.mark] ?? 0) + 1; return by; };
  const wood = count('C1E1M03'), metal = count('C1E4M03');
  assert.ok((wood.seams ?? 0) > 3, 'plank floors have seams: ' + JSON.stringify(wood)); assert.ok(!('rust' in wood) || (wood.rust ?? 0) < (wood.seams ?? 0), 'and rust is not their thing');
  assert.ok(Object.keys(metal).length >= 3, JSON.stringify(metal));
  for (const id of ids) { const n = floorMarks(shippedMap(id), id).length; assert.ok(n > 0 && n <= FLOORMARKS.cap, `${id}: ${n}`); }
});

test('the marks are denser along walls than in the open', () => {
  const m = shippedMap('C1E2M06'), marks = floorMarks(m, 'C1E2M06'), S = m.cell, near = (x, z) => [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dz]) => m.kind(Math.floor(x / S) + dx, Math.floor(z / S) + dz) === 'wall');
  const cells = markableCells(m), wallCells = cells.filter(([x, z]) => near((x + 0.5) * S, (z + 0.5) * S)).length, openCells = cells.length - wallCells;
  const nearMarks = marks.filter((s) => near(s.pos[0], s.pos[2])).length, openMarks = marks.length - nearMarks;
  assert.ok(wallCells > 30 && openCells > 30); assert.ok(nearMarks / wallCells > 1.4 * (openMarks / openCells), `along walls ${(nearMarks / wallCells).toFixed(3)} a cell, in the open ${(openMarks / openCells).toFixed(3)}`);
});

test('a DecalLayer takes the floor marks in a ring of their own, the event marks keep theirs, and a map may keep its floors clean', () => {
  const tex = new THREE.DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1), L = new DecalLayer(tex, { rings: { [FLOORMARKS.ring]: FLOORMARKS.cap }, emissive: 0x141414, order: 0.5 });
  const marks = floorMarks(shippedMap('C1E1M03'), 'C1E1M03'); L.addAll(marks); assert.equal(L.stats()[FLOORMARKS.ring], Math.min(marks.length, FLOORMARKS.cap)); assert.equal(L.mesh.renderOrder, 0.5);
  const E = new DecalLayer(tex); assert.deepEqual(Object.keys(E.rings), ['pock', 'splat', 'mark'], 'the event marks are unchanged'); assert.equal(E.mesh.renderOrder, 1);
  assert.throws(() => E.add({ ring: 'floor', cell: 0, pos: [0, 0, 0], n: [0, 1, 0], w: 1, h: 1, rot: 0, tint: [1, 1, 1], a: 1, grow: 0 }), /unknown decal ring/);
  const src = JSON.parse(fs.readFileSync(path.join(ROOT, 'maps/C1E1M03.json'), 'utf8')); assert.equal(shippedMap('C1E1M03').noFloorMarks, false); src.floorMarks = false;
  const { parseMap } = awaitless(); assert.equal(parseMap(src).noFloorMarks, true);
});
function awaitless() { return { parseMap: (src) => parseMapSync(src) }; }
import { parseMap as parseMapSync } from '../src/engine/mapformat.js';

test('the atlas is baked and the shell loads it', () => {
  assert.ok(fs.existsSync(path.join(ROOT, 'assets/baked/decals_floor_atlas.png')), 'bake it: node tools/bake.mjs decals_floor_atlas');
  assert.match(fs.readFileSync(path.join(ROOT, 'src/render/textures.js'), 'utf8'), /decals_floor_atlas/);
  assert.match(fs.readFileSync(path.join(ROOT, 'src/render/view.js'), 'utf8'), /floorMarks\(map\)/);
});
