// The ten creatures of the look redesign (src/render/models_choir.js, choir_kit.js, choir_cells.js, tools/baker/recipes_choir.js). The shared fairness / grounding / flagging tests run on the grown Tollbearer and the
// other nine (they take their rig table from models_choir.js); this file covers what only these rigs have: the early graft stage of the Tollbearer (Episode 1), the atlas contract between the rigs and the
// baker, lathe winding (the first bells were built inside-out and read as funnels), the draw-call budget of an awake creature, and the sleeping merge.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { FACTORIES, tollbearer } from '../src/render/models_choir.js';
import { makeCreature, KIT } from '../src/render/choir_kit.js';
import { CHOIR_CELLS, CHOIR_KINDS, cellsOf, choirAtlasName } from '../src/render/choir_cells.js';
import { recipesChoir } from '../tools/baker/recipes_choir.js';
import { mergeStatic } from '../src/render/merge.js';
import { ENEMIES, PLAYER } from '../src/engine/defs.js';
import { hitCylinder } from '../src/engine/hitvolume.js';
import { GROUND_BAND, groundVerdict } from '../src/render/ground-contract.js';

const STAND = { t: 1, walk: 0, phase: 0, attack: 0, lunge: 0, dead: 0, flash: 0 };
const worldVerts = (v) => { const out = [], t = new THREE.Vector3(); v.root.updateMatrixWorld(true); v.root.traverse((o) => { const pos = o.isMesh && o.geometry?.attributes?.position; if (!pos) return; for (let i = 0; i < pos.count; i++) { t.fromBufferAttribute(pos, i).applyMatrix4(o.matrixWorld); out.push([t.x, t.y, t.z]); } }); return out; };
const stats = (v) => { let meshes = 0, tris = 0; v.root.traverse((o) => { if (o.isMesh) { meshes++; const g = o.geometry; tris += (g.index ? g.index.count : g.attributes.position.count) / 3; } }); return { meshes, tris }; };

test('the atlas contract: every kind has a cell list of at most 16 distinct names and a baker recipe that paints exactly those', () => {
  assert.deepEqual(Object.keys(FACTORIES).sort(), [...CHOIR_KINDS].sort(), 'a rig for every kind, and only those');
  for (const kind of CHOIR_KINDS) {
    const names = CHOIR_CELLS[kind]; assert.ok(names.length <= 16 && new Set(names).size === names.length, `${kind}: <= 16 distinct cell names`);
    assert.ok(recipesChoir[choirAtlasName(kind)], `${kind}: no baker recipe ${choirAtlasName(kind)}`);
    assert.equal(recipesChoir[choirAtlasName(kind)].width, 256); assert.equal(recipesChoir[choirAtlasName(kind)].height, 256);
  }
});

test('every primitive of every rig wears one cell of ITS OWN atlas (its UV stays inside one 64 px cell, give or take the pole spill of a three.js sphere; none sits on an unpainted cell)', () => {
  KIT.merge = false;                                                                                           // merged parts span several cells by design: inspect the primitives
  try {
    for (const kind of CHOIR_KINDS) {
      const v = FACTORIES[kind](null), n = CHOIR_CELLS[kind].length, bad = [];
      v.root.traverse((o) => {
        if (!o.isMesh || o.material.isMeshBasicMaterial) return;                                               // teal glow and echo shells are flat light, not atlas paint
        const uv = o.geometry.attributes.uv; if (!uv || !uv.count) return; let mu = 0, mv = 0; for (let i = 0; i < uv.count; i++) { mu += uv.getX(i); mv += uv.getY(i); } mu /= uv.count; mv /= uv.count;
        const cx = Math.min(3, Math.floor(mu * 4)), cy = Math.min(3, Math.floor((1 - mv) * 4)), cell = cy * 4 + cx, u0 = cx / 4 - 0.04, u1 = (cx + 1) / 4 + 0.04, v0 = 1 - (cy + 1) / 4 - 0.04, v1 = 1 - cy / 4 + 0.04;
        let out = 0; for (let i = 0; i < uv.count; i++) if (uv.getX(i) < u0 || uv.getX(i) > u1 || uv.getY(i) < v0 || uv.getY(i) > v1) out++;
        if (out) bad.push(`${o.geometry.type}: ${out} of ${uv.count} UVs outside cell ${cell}`); else if (cell >= n) bad.push(`a mesh sits on cell ${cell} but ${kind} paints only ${n}`);
      });
      assert.equal(bad.length, 0, `${kind}: ${bad.slice(0, 3).join(' | ')}`);
    }
  } finally { KIT.merge = true; }
});

test('a lathe written crown-first is built facing OUTWARD (the first bells were inside-out: they read as funnels and showed their far wall)', () => {
  const v = makeCreature(null, (R) => { R.lathe(null, [[0.001, 1], [0.3, 0.9], [0.5, 0.5], [0.6, 0.0]].map(([r, y]) => new THREE.Vector2(r, y)), 12, 0, { name: 'crownFirst' }); R.lathe(null, [[0.6, 0.0], [0.5, 0.5], [0.3, 0.9], [0.001, 1]].map(([r, y]) => new THREE.Vector2(r, y)), 12, 0, { name: 'bottomFirst' }); R.pleat(null, [[0.2, 1], [0.4, 0.4], [0.5, 0]].map(([r, y]) => new THREE.Vector2(r, y)), 12, 5, 0.05, 0, { name: 'pleated' }); }, () => {});
  for (const name of ['crownFirst', 'bottomFirst', 'pleated']) {
    const g = v.J[name].geometry, p = g.attributes.position, nrm = g.attributes.normal; let out = 0, n = 0;
    for (let i = 0; i < p.count; i++) { const r = Math.hypot(p.getX(i), p.getZ(i)); if (r < 0.05) continue; n++; if (nrm.getX(i) * p.getX(i) + nrm.getZ(i) * p.getZ(i) > 0) out++; }
    assert.ok(out / n > 0.95, `${name}: only ${(100 * out / n).toFixed(0)}% of the normals face outward`);
    // the winding must agree with the normals: a triangle's geometric normal points away from the axis too
    let agree = 0, tri = 0; const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), ix = g.index;
    for (let i = 0; i < ix.count; i += 3) { a.fromBufferAttribute(p, ix.getX(i)); b.fromBufferAttribute(p, ix.getX(i + 1)); c.fromBufferAttribute(p, ix.getX(i + 2)); const fn = b.clone().sub(a).cross(c.clone().sub(a)), mid = a.clone().add(b).add(c).divideScalar(3); if (Math.hypot(mid.x, mid.z) < 0.05 || fn.length() < 1e-9) continue; tri++; if (fn.x * mid.x + fn.z * mid.z > 0) agree++; }
    assert.ok(agree / tri > 0.95, `${name}: only ${(100 * agree / tri).toFixed(0)}% of the triangles are wound outward`);
  }
});

test('the Tollbearer\'s EARLY graft (Episode 1) keeps the shipped hit volume: drawn height, 85% width, a shot at the head, the ground band in every pose', () => {
  const def = ENEMIES.tollbearer, e = { kind: 'tollbearer', x: 10, y: 0, z: 10, yaw: -Math.PI / 2 };
  for (const stage of [0, 2]) {
    const v = tollbearer(null, { stage }); v.root.position.set(e.x, e.y, e.z); v.root.rotation.y = e.yaw; v.pose(STAND);
    const vs = worldVerts(v), top = Math.max(...vs.map((q) => q[1])), base = Math.min(...vs.map((q) => q[1])), h = top - base;
    assert.ok(Math.abs(def.height - h) <= 0.10, `stage ${stage}: drawn ${h.toFixed(2)} m vs hit height ${def.height} m`);
    const yEntry = PLAYER.eye + (0.99 * h - PLAYER.eye) * ((6 - (def.radius + 0.05)) / 6); assert.ok(yEntry <= def.height, `stage ${stage}: a pellet at 99% of the drawn head enters at ${yEntry.toFixed(2)} m, above the ${def.height} m hit height`);
    const c = hitCylinder(e), d = vs.map((q) => Math.hypot(q[0] - c.x, q[2] - c.z)).sort((x, y) => x - y), need = d[Math.floor(d.length * 0.85)], have = c.r + 0.05;
    assert.ok(have >= need, `stage ${stage}: the hit cylinder (${have.toFixed(2)}) is narrower than the body needs (${need.toFixed(2)})`); assert.ok(have <= need + 0.15, `stage ${stage}: the hit cylinder (${have.toFixed(2)}) is more than 0.15 m wider than needed (${need.toFixed(2)})`);
    for (const floor of [0, 3]) for (const pose of [{}, { walk: 1, phase: 1.3 }, { attack: 0.3 }, { attack: 0.6 }, { dead: 0.5 }, { dead: 1 }]) {
      const w = tollbearer(null, { stage }); w.root.position.set(0.4, floor, -0.2); w.pose({ ...STAND, ...pose }); w.root.updateMatrixWorld(true);
      const vd = groundVerdict(new THREE.Box3().setFromObject(w.root, true).min.y, floor); assert.ok(vd.ok, `stage ${stage} on ${floor} m, pose ${JSON.stringify(pose)}: ${vd.off.toFixed(3)} m off the ground (band ${GROUND_BAND.buried}/${GROUND_BAND.floating})`);
    }
  }
});

test('draw-call and triangle budget of an AWAKE creature (a mesh is a call): static parts of a joint are merged, the cost stays near the shipped rigs', () => {
  const CEIL = { graftmother: 56 };
  for (const kind of CHOIR_KINDS) {
    const { meshes, tris } = stats(FACTORIES[kind](null));
    assert.ok(meshes <= (CEIL[kind] ?? 32), `${kind}: ${meshes} meshes awake`); assert.ok(tris <= 3200, `${kind}: ${tris} triangles`);
  }
});

test('a SLEEPING creature merges to at most one mesh per material (view.js freezes it with mergeStatic)', () => {
  for (const kind of CHOIR_KINDS) {
    const v = FACTORIES[kind](null); v.pose(STAND); v.root.updateMatrixWorld(true);
    const mats = new Set(); v.root.traverse((o) => { if (o.isMesh) mats.add(o.material); });
    const out = mergeStatic(v.root, { disposeSources: false, cull: true });
    assert.ok(out.length <= mats.size, `${kind}: ${out.length} merged meshes for ${mats.size} materials`);
  }
});
