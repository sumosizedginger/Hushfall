// PT-052, the structural exemplars: THE SQUEEZE (tools/mapkit/squeeze.mjs) takes whole columns out of a finished map. These tests hold the arithmetic (the two conversions are inverses), the transform on a small made-up map (layers cut, every
// coordinate east of a cut moved, rects and lists and the drops list too, a pair of numbers under a key the tool does not know is REPORTED), the routes, and the one real squeezed map, Glass Steppe: the shipped JSON is exactly what the
// squeeze makes of the unsqueezed compile, and both of its routes still reach the exit on every difficulty.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { toShipped, toSource, removedBefore, squeezeMap, squeezeRoute, squeezeKeep, checkCuts } from '../tools/mapkit/squeeze.mjs';
import { loadMapFile, loadRouteFile, runRouteEither } from '../src/engine/harness.js';
import { ROOT } from './helpers.js';

test('the two conversions: a column that survives goes shipped and comes back; a column inside a cut lands on its edge; the count is continuous', () => {
  const cuts = [[3, 5], [10, 11], [20, 26]];
  for (let u = 0; u < 40; u++) { const inCut = cuts.some(([a, b]) => u >= a && u < b); if (!inCut) assert.equal(toSource(toShipped(u, cuts), cuts), u, 'round trip ' + u); }
  assert.equal(toShipped(2, cuts), 2); assert.equal(toShipped(5, cuts), 3); assert.equal(toShipped(4, cuts), 3, 'inside a cut: the edge'); assert.equal(toShipped(11, cuts), 8); assert.equal(toShipped(26, cuts), 17); assert.equal(removedBefore(26, cuts), 9);
  assert.equal(toShipped(7.5, cuts), 5.5, 'half cells move too');
  assert.throws(() => checkCuts([[5, 7], [6, 9]], 20), /ascending/); assert.throws(() => checkCuts([[5, 7], [7, 9]], 20), /ascending/, 'touching cuts are one cut'); assert.throws(() => checkCuts([[5, 40]], 20), /inside the map/);
});

const tiny = () => ({
  format: 1, id: 'T', name: 'Tiny', grid: ['##########', '#........#', '#........#', '##########'], heights: ['0000000000', '0000000000', '0000000000', '0000000000'], ceilings: ['0000000000', '0000000000', '0000000000', '0000000000'],
  doors: [{ at: [6, 1] }], secrets: [{ id: 's', panel: [8, 1], cells: [[7, 1], [7, 2]] }], triggers: [{ id: 't', when: 'enter', at: [7, 2], radius: 2, do: [{ open: [6, 1] }, { spawn: { kind: 'gaunt', at: [8, 2], group: 'g' } }] }],
  entities: [{ type: 'player', at: [1, 1] }, { type: 'enemy', kind: 'gaunt', at: [8, 2], facing: 1 }, { type: 'exit', at: [8, 1], dest: 'next' }], messages: [{ id: 'm', at: [5.5, 1.5], radius: 2, text: 'x' }], scenery: [{ kind: 'spire', at: [20, -30] }],
  quality: { enemies: [1, 3] }, par: { time: 60 }, drops: { scale: 1, keep: [[7, 1], [6, 1, 8, 2]] }, entryLoadout: { hp: 100, armor: 0, ammo: { flare: 3 }, weapons: ['flare'] }, regions: [{ rect: [4, 1, 9, 2] }],
});

test('the transform: every layer loses the columns, every coordinate east of a cut moves west, a rect keeps both ends in step, the drops list follows, non-cell number pairs stay', () => {
  const spec = { axis: 'x', cuts: [[2, 4]] }, { map, warnings } = squeezeMap(tiny(), spec);
  assert.deepEqual(map.grid, ['########', '#......#', '#......#', '########']); assert.ok(map.heights.every((r) => r.length === 8) && map.ceilings.every((r) => r.length === 8));
  assert.deepEqual(map.doors[0].at, [4, 1]); assert.deepEqual(map.secrets[0], { id: 's', panel: [6, 1], cells: [[5, 1], [5, 2]] }); assert.deepEqual(map.triggers[0].at, [5, 2]); assert.deepEqual(map.triggers[0].do[0].open, [4, 1]); assert.deepEqual(map.triggers[0].do[1].spawn.at, [6, 2]);
  assert.deepEqual(map.entities.map((e) => e.at), [[1, 1], [6, 2], [6, 1]]); assert.equal(map.entities[1].facing, 1, 'a facing is not a cell'); assert.deepEqual(map.messages[0].at, [3.5, 1.5]); assert.deepEqual(map.scenery[0].at, [18, -30]);
  assert.deepEqual(map.quality.enemies, [1, 3], 'a number pair that is not a cell'); assert.deepEqual(map.par, { time: 60 }); assert.deepEqual(map.drops.keep, [[5, 1], [4, 1, 6, 2]]); assert.deepEqual(map.regions[0].rect, [2, 1, 7, 2]);
  assert.deepEqual(warnings, [], 'nothing unknown here');
  // the z axis: rows go
  const z = squeezeMap(tiny(), { axis: 'z', cuts: [[1, 2]] }).map; assert.equal(z.grid.length, 3); assert.deepEqual(z.entities[1].at, [8, 1]); assert.deepEqual(z.doors[0].at, [6, 1], 'a row inside the cut lands on its edge');
});

test('a pair of cell-like numbers under a key the tool does not know is reported, never moved silently', () => {
  const m = tiny(); m.entities[1].lair = [8, 2]; const { map, warnings } = squeezeMap(m, { axis: 'x', cuts: [[2, 4]] });
  assert.deepEqual(map.entities[1].lair, [8, 2], 'not moved'); assert.ok(warnings.some((w) => /lair/.test(w)), warnings.join('|'));
});

test('a route and a drops list: the same remap', () => {
  const spec = { axis: 'x', cuts: [[5, 7], [15, 17]] };
  assert.deepEqual(squeezeRoute([{ op: 'goto', at: [14, 35] }, { op: 'kill' }, { op: 'goto', at: [22, 35] }, { op: 'switch', id: 'r' }], spec), [{ op: 'goto', at: [12, 35] }, { op: 'kill' }, { op: 'goto', at: [18, 35] }, { op: 'switch', id: 'r' }]);
  assert.deepEqual(squeezeKeep([[20, 3], [10, 1, 30, 9]], spec), [[16, 3], [8, 1, 26, 9]]);
});

test('Glass Steppe, the first squeezed map: the shipped JSON is what the squeeze makes of the unsqueezed compile, and both routes reach the exit on all three difficulties', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sqt-'));
  try {
    const run = spawnSync(process.execPath, [path.join(ROOT, 'tools/mapkit/compile.mjs'), 'C2M02'], { cwd: ROOT, env: { ...process.env, SQUEEZE: 'off', MAP_OUT: dir }, encoding: 'utf8' }); assert.equal(run.status, 0, (run.stderr || run.stdout).slice(0, 300));
    const lv = (await import(pathToFileURL(path.join(ROOT, 'maps-src', 'C2M02.level.mjs')).href)).default, spec = lv.squeeze; assert.ok(spec && spec.cuts.length > 20, 'the source names its cuts');
    const wide = JSON.parse(fs.readFileSync(path.join(dir, 'C2M02.json'), 'utf8')), shipped = JSON.parse(fs.readFileSync(path.join(ROOT, 'maps', 'C2M02.json'), 'utf8'));
    assert.equal(wide.grid[0].length, 132); assert.equal(shipped.grid[0].length, 132 - spec.cuts.reduce((n, [a, b]) => n + b - a, 0));
    const again = squeezeMap(wide, spec); assert.deepEqual(again.warnings, []); assert.deepEqual(JSON.parse(JSON.stringify(again.map)), shipped, 'the committed map is the squeeze of the drawing');
    const map = loadMapFile(path.join(ROOT, 'maps', 'C2M02.json'));
    for (const name of ['main', 'secret']) for (const difficulty of ['easy', 'normal', 'hard']) { const r = runRouteEither(map, loadRouteFile(path.join(ROOT, 'routes', `C2M02.${name}.route.json`)), { seed: 1, difficulty }); assert.equal(r.result, 'complete', `${name} ${difficulty}: ${r.failure}`); }
    // the routes are the originals under the same cuts (the originals are kept beside the lane files)
    const orig = JSON.parse(fs.readFileSync(path.join(ROOT, 'maps-src', 'squeeze-orig', 'C2M02.main.route.json'), 'utf8')); assert.deepEqual(squeezeRoute(orig, spec), JSON.parse(fs.readFileSync(path.join(ROOT, 'routes', 'C2M02.main.route.json'), 'utf8')));
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
