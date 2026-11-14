// design/VISUAL_AWE_PLAN.md, session A6: a skyline for every level. Every piece stands outside the playable grid (it can never touch play or hide a
// creature), the plan is the same every time, a map with scenery of its own or no open sky is left alone, and from each map's hero view at least
// one piece stands inside the picture.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import * as THREE from 'three';
import { SKYLINE, FAMILIES, SKYLINE_KINDS, familyOf, skylinePlan, makeSkylinePiece } from '../src/render/skyline.js';
import { hasOpenSky } from '../src/render/sunshadow.js';
import { HERO, forward } from '../tools/dev/hero-views.mjs';
import { parseMap } from '../src/engine/mapformat.js';
import { ROOT } from './helpers.js';

const MAPS = fs
    .readdirSync(path.join(ROOT, 'maps'))
    .filter((f) => f.endsWith('.json'))
    .map((f) => parseMap(JSON.parse(fs.readFileSync(path.join(ROOT, 'maps', f), 'utf8')))),
  VIEWS = JSON.parse(fs.readFileSync(path.join(ROOT, 'maps-src', 'hero-views.json'), 'utf8'));

test('every family names kinds the kit can build, and every kind builds a piece of about the height asked for, standing on the ground', () => {
  for (const [name, F] of Object.entries(FAMILIES)) for (const k of F.kinds) assert.ok(SKYLINE_KINDS.includes(k), `${name}: ${k}`);
  for (const family of Object.keys(FAMILIES))
    for (const kind of FAMILIES[family].kinds) {
      const g = makeSkylinePiece({ kind, family, x: 0, z: 0, h: 24, yaw: 0, seed: 7 }),
        b = new THREE.Box3().setFromObject(g);
      assert.ok(b.max.y > 24 * 0.45 && b.max.y < 24 * 2.2, `${kind}: ${b.max.y.toFixed(1)} m tall for 24 asked`);
      assert.ok(b.min.y <= 0.01, `${kind} reaches the ground`);
      for (const v of [b.min.x, b.max.x, b.min.z, b.max.z]) assert.ok(Number.isFinite(v));
    }
});

test('a map id names its family', () => {
  assert.equal(familyOf('C1E1M03'), 'harbour');
  assert.equal(familyOf('C1E2M04'), 'works');
  assert.equal(familyOf('C1E3S01'), 'ship');
  assert.equal(familyOf('C1E4M08'), 'gate');
  assert.equal(familyOf('C2M02'), 'shore');
  assert.equal(familyOf('C2M12'), 'deep');
  assert.equal(familyOf('C2M24'), 'hive');
  assert.equal(familyOf('C2M28'), 'root');
});

test('every piece of every shipped map stands outside the playable grid, whole, and the plan is the same every time', () => {
  let planned = 0;
  for (const map of MAPS) {
    const plan = skylinePlan(map);
    assert.deepEqual(skylinePlan(map), plan, map.id + ': the same twice');
    if (map.dark || !hasOpenSky(map) || map.scenery.length >= SKYLINE.authored) {
      assert.equal(plan.length, 0, map.id + ' is left alone');
      continue;
    }
    planned++;
    assert.equal(plan.length, SKYLINE.slots, map.id);
    const W = map.w * map.cell,
      D = map.h * map.cell;
    for (const p of plan) {
      const b = new THREE.Box3().setFromObject(makeSkylinePiece(p));
      // the whole piece, footing and all, lies outside the grid's rectangle
      const outside = b.max.x < 0 || b.min.x > W || b.max.z < 0 || b.min.z > D;
      assert.ok(outside, `${map.id} ${p.kind} at ${p.x.toFixed(0)},${p.z.toFixed(0)} overlaps the grid`);
      assert.ok(p.h >= SKYLINE.minH && p.h <= SKYLINE.maxH * SKYLINE.landmark + 1e-9);
    }
  }
  assert.ok(planned >= 25, 'maps given a skyline: ' + planned);
});

test('from every such map`s hero view, at least one piece stands inside the picture`s width', () => {
  const bad = [];
  for (const map of MAPS) {
    const plan = skylinePlan(map),
      v = VIEWS[map.id];
    if (!plan.length || !v) continue;
    const [fx, fz] = forward(v.yaw),
      ex = v.x * map.cell,
      ez = v.z * map.cell;
    const seen = plan.some((p) => {
      const dx = p.x - ex,
        dz = p.z - ez,
        d = Math.hypot(dx, dz);
      return (dx * fx + dz * fz) / d > Math.cos(HERO.cone / 2);
    });
    if (!seen) bad.push(map.id);
  }
  assert.deepEqual(bad, []);
});
