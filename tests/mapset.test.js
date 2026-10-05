// Gate 3 (R1/R2): the maps that exist are DISCOVERED (no tool carries a list of ids), and `npm run map:new` scaffolds a map that compiles and is honestly unfinished.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';
import { ROOT } from './helpers.js';
import { listMaps, pickMaps, MAP_ID } from '../tools/mapset.mjs';
import { compile } from '../tools/mapkit/compile.mjs';

const MAP_TOOL = path.join(ROOT, 'tools/map.mjs');
const scratch = () => { const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hf-map-')); fs.copyFileSync(path.join(ROOT, 'CAMPAIGN_MANIFEST.json'), path.join(dir, 'CAMPAIGN_MANIFEST.json')); fs.mkdirSync(path.join(dir, 'tools/mapkit'), { recursive: true }); fs.copyFileSync(path.join(ROOT, 'tools/mapkit/builder.mjs'), path.join(dir, 'tools/mapkit/builder.mjs')); fs.mkdirSync(path.join(dir, 'src/engine'), { recursive: true }); fs.copyFileSync(path.join(ROOT, 'src/engine/defs.js'), path.join(dir, 'src/engine/defs.js')); return dir; };         // the builder derives its floor characters from the skin table in defs.js
const mapTool = (dir, ...args) => spawnSync(process.execPath, [MAP_TOOL, ...args], { env: { ...process.env, HUSHFALL_ROOT: dir }, encoding: 'utf8' });

test('map ids: campaign-1 episode maps, secrets and campaign-2 maps are recognised; anything else is not', () => {
  for (const id of ['C1E1M01', 'C1E2S01', 'C1E4M08', 'C2M30', 'C2S02']) assert.ok(MAP_ID.test(id), id);
  for (const id of ['C1E1M1', 'c1e1m01', 'C1E1X01', 'maps', 'C3E1M01x']) assert.ok(!MAP_ID.test(id), id);
});

test('listMaps discovers every shipped map and its routes from the repository, with kind and episode from the manifest', () => {
  const maps = listMaps(ROOT), by = Object.fromEntries(maps.map((m) => [m.id, m]));
  for (const id of ['C1E1M01', 'C1E1M02', 'C1E1M03', 'C1E1M04', 'C1E1M05', 'C1E1M06', 'C1E1M07', 'C1E1M08', 'C1E1S01']) assert.ok(by[id], id + ' is discovered');
  assert.deepEqual(by.C1E1M01.routes, ['main', 'secret']); assert.deepEqual(by.C1E1M03.routes, ['main']);
  assert.equal(by.C1E1S01.kind, 'secret'); assert.equal(by.C1E1M08.kind, 'main'); assert.equal(by.C1E1M02.episode, 1); assert.equal(by.C1E1M02.name, 'Customs Hall');
  assert.ok(by.C1E1M02.hasSource && by.C1E1M02.hasViews, 'a map with maps-src files says so'); assert.ok(!by.C1E1M01.hasSource, 'M01 is a hand-written JSON (Gate 1)');
  assert.deepEqual(maps.map((m) => m.id), [...maps.map((m) => m.id)].sort(), 'sorted');
});

test('pickMaps: explicit ids, --all, and a typo is an error (never silently checks nothing)', () => {
  assert.deepEqual(pickMaps(ROOT, ['C1E1M03', '--port', '5000']).map((m) => m.id), ['C1E1M03']);
  assert.ok(pickMaps(ROOT, ['--all']).length >= 9);
  assert.throws(() => pickMaps(ROOT, ['C1E9M99']), /no such map in maps\//);
});

test('map:new scaffolds source, views, a route stub and a brief from the manifest; it compiles; it never overwrites; it refuses a slot the manifest does not have', () => {
  const dir = scratch(); let r = mapTool(dir, 'new', 'C1E2M02'); assert.equal(r.status, 0, r.stdout + r.stderr);
  const src = path.join(dir, 'maps-src/C1E2M02.level.mjs');
  for (const f of ['maps-src/C1E2M02.level.mjs', 'maps-src/C1E2M02.views.json', 'routes/C1E2M02.main.route.json', 'design/EPISODE2.md']) assert.ok(fs.existsSync(path.join(dir, f)), f);
  const text = fs.readFileSync(src, 'utf8'); assert.match(text, /EVAPORATION PANS/); assert.match(text, /Open salt flats with hazard channels/, 'the header carries the manifest thesis'); assert.match(fs.readFileSync(path.join(dir, 'design/EPISODE2.md'), 'utf8'), /Hunting parties working the pans/, 'the brief carries the narrative purpose');
  return import(pathToFileURL(src).href).then((mod) => {
    const { map, errors } = compile(mod.default); assert.deepEqual(errors, [], 'the scaffold is a valid map'); assert.equal(map.id, 'C1E2M02');
    assert.equal(map.entities.filter((e) => e.type === 'enemy').length, 0, 'and honestly empty: the gates, not the scaffold, say it is unfinished');
    r = mapTool(dir, 'new', 'C1E2M02'); assert.equal(r.status, 2); assert.match(r.stderr, /refusing to overwrite/);
    r = mapTool(dir, 'new', 'C1E9M99'); assert.equal(r.status, 2); assert.match(r.stderr, /not in CAMPAIGN_MANIFEST/);
    r = mapTool(dir, 'new', 'nonsense'); assert.equal(r.status, 2);
  });
});
