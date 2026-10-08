// PT-021 step 1: the place's look. Every map names a look from the table; the default look is exactly the light every map had before; the baked vertex shading (shading.js) is bounded, deterministic and continuous; a lamp never
// switches on or off in one frame (lightbudget.js); the shaded level mesh carries the shading and an unshaded look leaves the mesh exactly as it was.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import * as THREE from 'three';
import { LOOKS, lookOf } from '../src/engine/defs.js';
import { parseMap, validateMap } from '../src/engine/mapformat.js';
import { noise2, patchFactor, wallRows, cornerAO } from '../src/render/shading.js';
import { lightWeights } from '../src/render/lightbudget.js';
import { buildLevel } from '../src/render/levelmesh.js';
import { ROOT, shippedMap } from './helpers.js';

const shippedIds = fs.readdirSync(path.join(ROOT, 'maps')).filter((f) => f.endsWith('.json')).map((f) => f.replace('.json', ''));

test('every shipped map names a look from the table (the critique: every map was lit alike); the looks are not all the same', () => {
  const used = new Set();
  for (const id of shippedIds) { const j = JSON.parse(fs.readFileSync(path.join(ROOT, 'maps', id + '.json'), 'utf8')); assert.ok(j.atmosphere?.look, id + ' names a look'); assert.ok(LOOKS[j.atmosphere.look], id + ': ' + j.atmosphere.look); used.add(j.atmosphere.look); }
  assert.ok(used.size >= 9, 'at least nine different looks across the maps: ' + [...used].join(' '));
});

test('a look is well formed, and the default is the light every map had before the pass', () => {
  for (const [name, L] of Object.entries(LOOKS)) {
    assert.equal(L.hemi.length, 3, name); assert.ok(L.hemi[2] > 0 && L.sun[1] >= 0 && L.lamp > 0 && L.exposure > 0, name);
    assert.equal(L.sun[2].length, 3, name); assert.ok(L.sun[2][1] > 0, name + ': the sun is above the horizon');
    for (const k of ['shadow', 'light']) { assert.equal(L.grade[k].length, 3, name); assert.ok(L.grade[k].every((v) => v > 0.5 && v < 1.5), name + ' grade ' + k); }
    assert.ok(L.grade.sat >= 0 && L.grade.sat <= 1.5, name); for (const k of ['foot', 'ao', 'patch']) assert.ok(L.shade[k] >= 0 && L.shade[k] <= 0.8, name + ' shade ' + k);
  }
  const d = LOOKS.harbour; assert.deepEqual([d.hemi, d.sun], [[0x9fb4d0, 0x3a2a40, 2.4], [0xd8b0e0, 1.3, [-8, 14, -6]]]); assert.deepEqual(d.shade, { foot: 0, ao: 0, patch: 0 });
  assert.equal(lookOf({}), LOOKS.harbour); assert.equal(lookOf({ look: 'nope' }), LOOKS.harbour); assert.equal(lookOf(undefined), LOOKS.harbour);
  const bright = (L) => L.hemi[2] + L.sun[1], dark = ['cellar', 'signal', 'moon'].map((n) => bright(LOOKS[n])), light = ['salt', 'rime'].map((n) => bright(LOOKS[n]));
  assert.ok(Math.max(...dark) < Math.min(...light), 'the cellar, the signal house and the night are darker than the salt works and the rime vault');
});

test('the validator accepts a known look and rejects an unknown one', () => {
  const src = { ...JSON.parse(fs.readFileSync(path.join(ROOT, 'maps', 'C1E1M04.json'), 'utf8')) };
  assert.equal(validateMap(src).ok, true);
  assert.equal(validateMap({ ...src, atmosphere: { ...src.atmosphere, look: 'sunny' } }).ok, false);
  assert.ok(validateMap({ ...src, atmosphere: { ...src.atmosphere, look: 'sunny' } }).errors.some((e) => /atmosphere\.look/.test(e)));
});

test('shading: the noise is in [0,1], deterministic and continuous; the patch factor is bounded by its amplitude and averages about one', () => {
  let sum = 0, n = 0, maxStep = 0, prev = noise2(0, 0.5, 3);
  for (let i = 1; i <= 2000; i++) { const x = i * 0.01, v = noise2(x, 0.5, 3); assert.ok(v >= 0 && v <= 1); maxStep = Math.max(maxStep, Math.abs(v - prev)); prev = v; }
  assert.ok(maxStep < 0.05, 'continuous: ' + maxStep); assert.equal(noise2(3.3, 7.1, 5), noise2(3.3, 7.1, 5)); assert.notEqual(noise2(3.3, 7.1, 5), noise2(3.3, 7.1, 6));
  for (let i = 0; i < 4000; i++) { const v = patchFactor(i * 0.7, i * 0.31, 0.1, 3); assert.ok(v > 0.8 && v < 1.2, String(v)); sum += v; n++; }
  assert.ok(Math.abs(sum / n - 1) < 0.04, 'mean ' + sum / n); assert.equal(patchFactor(4, 5, 0, 3), 1, 'amplitude 0 is off');
});

test('shading: a wall is darkest at its foot and a little dark at its head; a short face and foot 0 are left alone; the corner occlusion counts wall cells', () => {
  const r = wallRows(0, 3.2, 0.4); assert.equal(r[0][0], 0); assert.equal(r.at(-1)[0], 3.2); assert.ok(r.every((v, i) => i === 0 || v[0] > r[i - 1][0]), 'rows go up');
  assert.ok(Math.abs(r[0][1] - 0.6) < 1e-9, 'the foot is 1 - foot'); assert.ok(r[1][1] > r[0][1] && r[2][1] === 1 && r[3][1] < 1 && r[3][1] > r[0][1]);
  assert.deepEqual(wallRows(0, 3.2, 0), [[0, 1], [3.2, 1]]); assert.deepEqual(wallRows(0, 0.3, 0.4), [[0, 1], [0.3, 1]]);
  const grid = ['#####', '#...#', '#...#', '#...#', '#####'], kind = (x, z) => (grid[z]?.[x] ?? '#') === '#' ? 'wall' : 'floor';
  assert.equal(cornerAO(kind, 2, 2, 0.5), 1, 'open floor'); assert.ok(Math.abs(cornerAO(kind, 2, 1, 0.5) - (1 - 0.5 * 2 / 3)) < 1e-9, 'along a wall'); assert.ok(Math.abs(cornerAO(kind, 1, 1, 0.5) - 0.5) < 1e-9, 'an inside corner is the darkest'); assert.equal(cornerAO(kind, 1, 1, 0), 1);
});

test('lamps: exactly the budget are on, no weight is outside 0..1, and moving the eye never makes a lamp jump', () => {
  const lamps = [[3, 1], [10, -4], [14, 6], [22, 0], [-8, 9], [30, 3], [5, 17], [12, 12], [-15, -6], [40, 8], [18, -14], [26, 20]];
  let prev = null, worst = 0;
  for (let step = 0; step <= 2000; step++) {
    const ex = -20 + step * 0.03, w = lightWeights(lamps.map(([x, z]) => (x - ex) ** 2 + z ** 2), 6, 3);
    assert.equal(w.on.filter(Boolean).length, 6, 'a constant count of lights on'); assert.ok(w.w.every((v) => v >= 0 && v <= 1)); assert.ok(w.w.every((v, i) => w.on[i] || v === 0), 'a lamp that is off has no weight');
    if (prev) for (let i = 0; i < lamps.length; i++) worst = Math.max(worst, Math.abs(w.w[i] - prev[i]));
    prev = w.w;
  }
  assert.ok(worst < 0.06, 'the largest change in one 3 cm step: ' + worst);
  assert.deepEqual(lightWeights([4, 9], 6, 3).w, [1, 1], 'fewer lamps than the budget: all full');
});

test('a shaded look bakes brightness into the level mesh; the default look leaves every vertex white', () => {
  const tex = new Proxy({}, { get: (o, k) => (o[k] ??= new THREE.Texture()) });
  const shade = (id) => { const lv = buildLevel(shippedMap(id), tex); let min = 1, max = 0, n = 0; lv.group.traverse((o) => { const c = o.isMesh && o.geometry.getAttribute('color'); if (c && o.material.vertexColors && o.material.map) for (let i = 0; i < c.count; i++) { min = Math.min(min, c.getX(i)); max = Math.max(max, c.getX(i)); n++; } }); return { min, max, n }; };
  const cellar = shade('C1E1M04'); assert.ok(cellar.n > 1000 && cellar.min < 0.62 && cellar.max > 0.99, JSON.stringify(cellar));
  const src = JSON.parse(fs.readFileSync(path.join(ROOT, 'maps', 'C1E1M04.json'), 'utf8')); src.atmosphere = { ...src.atmosphere, look: 'harbour' };
  const lv = buildLevel(parseMap(src), tex); let dim = 0; lv.group.traverse((o) => { const c = o.isMesh && o.geometry.getAttribute('color'); if (c && o.material.vertexColors && o.material.map) for (let i = 0; i < c.count; i++) if (c.getX(i) !== 1) dim++; });
  assert.equal(dim, 0, 'the default look is unshaded');
});
