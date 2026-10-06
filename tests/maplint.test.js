// PT-007: a map must not READ as indoors in the open. The lint (tools/maplint.mjs) is pinned on small synthetic maps and on every shipped map (the pilot shipped with two floating ceiling slabs and six
// floating lamps: the bots and the census could not see it, the owner did).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { parseMap } from '../src/engine/mapformat.js';
import { mapLintChecks } from '../tools/maplint.mjs';
import { ROOT } from './helpers.js';

// 24 x 9: an open-air plain (`:` outdoor cobble) with a walled room (`.` interior planks, walls `B`) and, optionally, a bridge of `g` (grate: an INDOOR skin) or `p` (planks: outdoor) across the middle
const grid = (bridge) => {
  const rows = Array.from({ length: 9 }, (_, z) => (z === 0 || z === 8 ? 'B'.repeat(24) : 'B' + ':'.repeat(22) + 'B'));
  const set = (x, z, c) => { rows[z] = rows[z].slice(0, x) + c + rows[z].slice(x + 1); };
  for (let z = 2; z <= 6; z++) for (let x = 2; x <= 6; x++) set(x, z, (x === 2 || x === 6 || z === 2 || z === 6) ? 'B' : '.');   // a 3 x 3 room with walls all round
  set(6, 4, 'D');                                                                                                          // and a door out onto the plain
  if (bridge) for (let z = 3; z <= 5; z++) for (let x = 12; x <= 14; x++) set(x, z, bridge);
  return rows;
};
const mk = (bridge, objects = []) => parseMap({ format: 1, id: 'LINT', version: 1, name: 'lint', ceilingHeight: 4, grid: grid(bridge), doors: [{ at: [6, 4] }],
  entities: [{ type: 'player', at: [9, 4] }, { type: 'exit', at: [20, 4] }, ...objects] });
const verdict = (map) => Object.fromEntries(mapLintChecks(map).map((c) => [c.name.includes('roofed') ? 'roofs' : 'props', c]));

test('a walled room with a door onto open ground passes; an INDOOR-skin bridge across open ground (a floating ceiling slab) fails and says where', () => {
  assert.equal(verdict(mk(null)).roofs.ok, true, 'a room with walls is fine');
  assert.equal(verdict(mk('p')).roofs.ok, true, 'an outdoor plank bridge has no roof');
  const bad = verdict(mk('g')).roofs; assert.equal(bad.ok, false, 'a grate bridge grows a ceiling slab'); assert.match(bad.detail, /9 roofed cells near 12,3 have 0 wall edges/);
});

test('a ceiling-hung prop (lamp, pod, cradle) must stand under a roof; a lamppost may stand in the open', () => {
  const lamp = (x, z, kind = 'lamp') => ({ type: 'prop', kind, at: [x, z] });
  assert.equal(verdict(mk(null, [lamp(4, 4)])).props.ok, true, 'a lamp inside the room');
  for (const kind of ['lamp', 'pod', 'cradle']) { const r = verdict(mk(null, [lamp(18, 4, kind)])).props; assert.equal(r.ok, false, kind + ' in open air floats'); assert.match(r.detail, new RegExp(kind + '@18,4')); }
  assert.equal(verdict(mk(null, [lamp(18, 4, 'lamppost')])).props.ok, true, 'a lamppost stands on the ground');
});

test('every SHIPPED map passes the placement lint (Episode 1 always did; the pilot after PT-007)', () => {
  const bad = [];
  for (const f of fs.readdirSync(path.join(ROOT, 'maps')).filter((x) => x.endsWith('.json'))) {
    const map = parseMap(JSON.parse(fs.readFileSync(path.join(ROOT, 'maps', f), 'utf8')));
    for (const c of mapLintChecks(map)) if (!c.ok) bad.push(`${f}: ${c.name} -> ${c.detail}`);
  }
  assert.deepEqual(bad, []);
});

import { Level } from '../tools/mapkit/builder.mjs';
test('the level builder reports a put() that silently replaces an earlier object (a Sexton hidden under a lamp, PT-007); the same character twice is not a replacement', () => {
  const L = new Level(6, 6); L.put(1, 1, 't'); L.put(1, 1, 'm'); L.put(2, 2, 'c'); L.put(2, 2, 'c'); L.put(3, 3, 'h');
  assert.deepEqual(L.layers().placementWarnings, ["1,1: 't' replaced by 'm'"]);
});

import { feelChecks, contractChecks } from '../tools/maplint.mjs';
// the contract on made-up numbers (the pipeline passes mapFeel(src)); a good source first, then one thing wrong at a time
const GOOD = { id: 'C1E9M01', objective: 'Cross the yard', secrets: [{ id: 'cache' }], triggers: [{ id: 't', do: [{ objective: 'Pull the lever' }] }],
  entities: [{ type: 'switch', do: [{ open: [1, 1] }, { objective: 'The gate is open' }] }],
  quality: { scaleClass: 'MIXED', introduces: 'a gate that only a switch in a side building opens' } };
const FEEL = { roofedPct: 55, sightP90: 18, ceiling: 4.2 };
const fails = (src, feel = FEEL) => contractChecks(src, feel).filter((c) => !c.ok).map((c) => c.name.replace('feel: ', '').slice(0, 40));
test('the space contract: a map outside Episode 1 declares a scale class the measured grid matches, names what it introduces, has three beats and a secret, and keeps its walls at 4.2 m or less', () => {
  assert.deepEqual(fails(GOOD), [], 'a good map passes every check');
  assert.equal(fails({ ...GOOD, quality: { ...GOOD.quality, scaleClass: 'COMPRESSION' } }).length, 1, 'a 55% roofed map is not COMPRESSION (needs 80%)');
  assert.equal(fails({ ...GOOD, quality: { ...GOOD.quality, scaleClass: 'SET-PIECE', reason: 'the crossing is the whole point of the map' } }).length, 1, 'nor a SET-PIECE (an open arena is under 40% roofed)');
  assert.equal(fails({ ...GOOD, quality: { ...GOOD.quality, scaleClass: 'SET-PIECE' } }, { ...FEEL, roofedPct: 10 }).length, 1, 'a set-piece must say why the player crosses open ground');
  assert.deepEqual(fails({ ...GOOD, quality: { ...GOOD.quality, scaleClass: 'SET-PIECE', reason: 'the crossing is the whole point of the map' } }, { ...FEEL, roofedPct: 10, sightP90: 50 }), [], 'a set-piece may have long sightlines');
  assert.equal(fails(GOOD, { ...FEEL, sightP90: 31 }).length, 1, 'MIXED allows a 30 m sightline, not 31');
  assert.equal(fails({ ...GOOD, quality: { scaleClass: 'MIXED' } }).length, 1, 'every map names what it introduces');
  assert.equal(fails({ ...GOOD, quality: undefined }).length, 2, 'no quality block: no class and no introduction');
  assert.equal(fails(GOOD, { ...FEEL, ceiling: 6 }).length, 1, 'a 6 m wall needs a named reason');
  assert.deepEqual(fails({ ...GOOD, quality: { ...GOOD.quality, tallReason: 'the nave of the grafting hall' } }, { ...FEEL, ceiling: 6 }), []);
  assert.equal(fails({ ...GOOD, triggers: [] }).length, 1, 'two objectives are not three beats');
  assert.equal(fails({ ...GOOD, secrets: [] }).length, 1, 'a main map hides a secret');
  assert.deepEqual(fails({ ...GOOD, id: 'C1E9S01', secrets: [] }), [], 'a secret map needs none');
  assert.deepEqual(feelChecks({ ...GOOD, id: 'C1E1M05' }), [], 'Episode 1 was approved before the contract and is grandfathered');
});

test('every shipped map passes the space contract (the pilot declares MIXED and is measured as MIXED)', () => {
  const bad = [];
  for (const f of fs.readdirSync(path.join(ROOT, 'maps')).filter((x) => x.endsWith('.json'))) for (const c of feelChecks(JSON.parse(fs.readFileSync(path.join(ROOT, 'maps', f), 'utf8')))) if (!c.ok) bad.push(f + ': ' + c.name + ' -> ' + c.detail);
  assert.deepEqual(bad, []);
});
