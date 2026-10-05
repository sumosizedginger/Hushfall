// REGRESSION PROTECTION for the grounding fix (PT-001 / PT-002; REPAIR_PLAN.md WP2). The census proves every enemy is drawn on the sim's ground; these two things were never asserted:
//   1. the drawn FLOOR surface is where the sim says the floor is (every shipped map, every walkable cell, plus each moving floor at both ends of its travel);
//   2. pickups stand on the sim's ground and none stands on a moving floor (the sim sets a pickup's y once; a deck that carries it would leave it floating or buried).
// The level mesh is built in Node with stub textures (geometry only) and ray-cast straight down from just above the sim's floor: the first opaque upward-facing surface hit must BE the floor.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import * as THREE from 'three';
import { buildLevel } from '../src/render/levelmesh.js';
import { parseMap } from '../src/engine/mapformat.js';
import { createWorld, step } from '../src/engine/world.js';
import { floorAt, groundAt } from '../src/engine/terrain.js';
import { PROPS } from '../src/engine/defs.js';
import { ROOT } from './helpers.js';

const TOL = 0.02;                                                              // metres: flat quads at a cell's floor height; nothing else is expected between the sim and the mesh
const ids = fs.readdirSync(path.join(ROOT, 'maps')).filter((f) => f.endsWith('.json')).map((f) => f.replace('.json', '')).sort();
const load = (id) => parseMap(JSON.parse(fs.readFileSync(path.join(ROOT, 'maps', id + '.json'), 'utf8')));
const stubTex = () => new Proxy({}, { get: () => new THREE.Texture() });
const OFFSETS = [[0, 0], [0.6, 0.6], [-0.6, 0.6], [0.6, -0.6], [-0.6, -0.6]];  // metres from a cell centre (a cell is 2 m)

/** the first opaque, upward-facing surface below (x, fromY, z) in the level's static meshes, or null */
function surfaceBelow(root, x, fromY, z) {
  const rc = new THREE.Raycaster(new THREE.Vector3(x, fromY, z), new THREE.Vector3(0, -1, 0), 0, 60);
  for (const h of rc.intersectObject(root, true)) {
    const m = h.object.material; if (m?.transparent || m?.visible === false) continue;
    if (h.face && h.face.normal.clone().transformDirection(h.object.matrixWorld).y > 0.5) return h.point.y;
  }
  return null;
}
const nearProp = (map, x, z) => map.props.some((p) => Math.hypot(p.x - x, p.z - z) < (PROPS[p.kind]?.radius ?? 0) + 1.0) || [...map.doors.values()].some((d) =>Math.abs((d.cx + 0.5) * map.cell - x) < 2.2 && Math.abs((d.cz + 0.5) * map.cell - z) < 2.2);

/** every walkable, non-sector cell: the drawn floor under each sample vs the sim's floor; returns { n, bad[] } */
function judgeStatic(map, lv, w, shift = 0) {
  lv.group.updateMatrixWorld(true); const bad = []; let n = 0;
  for (let cz = 0; cz < map.h; cz++) for (let cx = 0; cx < map.w; cx++) {
    const k = map.kind(cx, cz); if (k === 'wall' || k === 'water' || map.sectorAt(cx, cz) >= 0) continue;
    for (const [ox, oz] of OFFSETS) {
      const x = (cx + 0.5) * map.cell + ox, z = (cz + 0.5) * map.cell + oz; if (nearProp(map, x, z)) continue;
      const sim = floorAt(w, x, z), drawn = surfaceBelow(lv.group, x, sim + 0.6, z); n++;
      if (drawn === null || Math.abs(drawn - shift - sim) > TOL) bad.push(`${map.id} cell ${cx},${cz}: sim floor ${sim.toFixed(2)}, drawn ${drawn === null ? 'none' : (drawn - shift).toFixed(2)}`);
    }
  }
  return { n, bad };
}

test('the drawn floor is where the sim says it is: every walkable cell of every shipped map (5 samples per cell), within 2 cm', () => {
  let total = 0; const bad = [];
  for (const id of ids) { const map = load(id), w = createWorld(map, { seed: 1 }), lv = buildLevel(map, stubTex()), r = judgeStatic(map, lv, w); total += r.n; bad.push(...r.bad); }
  assert.ok(total > 5000, `the check must actually sample the maps (${total} samples)`);
  assert.equal(bad.length, 0, `${bad.length} of ${total} samples disagree, e.g. ${bad.slice(0, 4).join(' | ')}`);
});

test('moving floors: the drawn deck sits at the sim\'s height at both ends of its travel (M05 car 2 m / 4 m, M06 ramp 0.5 m / 4 m)', () => {
  let decks = 0; const bad = [];
  for (const id of ids) {
    const map = load(id); if (!map.sectors.length) continue;
    const w = createWorld(map, { seed: 1 }), lv = buildLevel(map, stubTex());
    map.sectors.forEach((sd, i) => {
      for (const h of [sd.low, sd.high]) {
        w.sectors[i].h = h; lv.sectorViews[i].position.y = h;                    // exactly what GameView does each frame (view.js: v.position.y = s.h)
        lv.group.updateMatrixWorld(true);
        for (const [cx, cz] of sd.cells) {
          const x = (cx + 0.5) * map.cell, z = (cz + 0.5) * map.cell, sim = floorAt(w, x, z), drawn = surfaceBelow(lv.group, x, sim + 0.6, z); decks++;
          if (drawn === null || Math.abs(drawn - sim) > TOL) bad.push(`${id} ${sd.id} at ${h} m, cell ${cx},${cz}: sim ${sim.toFixed(2)}, drawn ${drawn === null ? 'none' : drawn.toFixed(2)}`);
        }
      }
    });
  }
  assert.ok(decks >= 30, `moving floors were sampled (${decks})`);
  assert.equal(bad.length, 0, bad.slice(0, 4).join(' | '));
});

test('the floor check can fail: a level mesh lifted 0.2 m is caught (mutation; a flat map, the raised gallery and the funicular hill)', () => {
  for (const id of ['C1E1M01', 'C1E1M02', 'C1E1M05']) {
    const map = load(id), w = createWorld(map, { seed: 1 }), lv = buildLevel(map, stubTex()); lv.group.position.y = 0.2;
    const r = judgeStatic(map, lv, w, 0);
    assert.ok(r.bad.length > r.n * 0.9, `${id}: a floor drawn 0.2 m too high must be reported (${r.bad.length} of ${r.n})`);
  }
});

test('pickups stand on the sim ground, and a pickup on a moving floor rides it (the sim re-seats pickups every tick, audit A22)', () => {
  let n = 0; const bad = [];
  for (const id of ids) {
    const map = load(id), w = createWorld(map, { seed: 1 });
    for (const it of w.pickups) { n++; const g = groundAt(w, it.x, it.z, 0.3); if (Math.abs((it.y ?? 0) - g) > TOL) bad.push(`${id} pickup ${it.id} (${it.kind}): y ${(it.y ?? 0).toFixed(2)}, ground ${g.toFixed(2)}`); }
  }
  assert.ok(n > 300, `pickups were checked (${n})`);
  assert.equal(bad.length, 0, bad.slice(0, 4).join(' | '));
  // M05's funicular car with a pickup added on it: it must follow the car up
  const src = JSON.parse(fs.readFileSync(path.join(ROOT, 'maps', 'C1E1M05.json'), 'utf8')), car = src.sectors[0], [cx, cz] = car.cells[0];
  src.entities.push({ type: 'pickup', kind: 'health_small', at: [cx, cz] });
  const map = parseMap(src), w = createWorld(map, { seed: 1 }), it = w.pickups.find((p) => Math.floor(p.x / map.cell) === cx && Math.floor(p.z / map.cell) === cz);
  assert.ok(it, 'the test pickup exists'); assert.ok(Math.abs(it.y - car.low) < TOL, 'it starts on the low car');
  w.sectors[0].h = car.high; w.sectors[0].target = car.high; step(w, { move: [0, 0], yaw: 0, pitch: 0, fire: false, aim: false, sprint: false, use: false, weapon: null, weaponStep: 0 });
  assert.ok(Math.abs(it.y - car.high) < TOL, `the pickup rides the car up: y ${it.y}, deck ${car.high}`);
});
