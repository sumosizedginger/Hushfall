// FREEZE F8, where the heavy ammunition crates lie (tools/dev/place-crates.mjs): one in the secret room of the densest fight of every episode and act, and one in the cache of every secret map. The crate itself is held by tests/ammo-crate.test.js; this holds the placement:
// exactly thirteen crates in the whole campaign, each on a floor cell, none in the public part of a map (the compiler would have dropped it), the dressing beside it where there is one, and every other map without one.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { FLOOR_SKINS } from '../src/engine/defs.js';
import { ROOT } from './helpers.js';

const WITH = { C1E1M05: 'C1E1M05', C1E2M02: 1, C1E3M03: 1, C1E4M06: 1, C2M05: 1, C2M10: 1, C2M18: 1, C2M27: 1, C1E1S01: 1, C1E2S01: 1, C1E3S01: 1, C1E4S01: 1, C2S01: 1 };
const maps = fs.readdirSync(path.join(ROOT, 'maps')).filter((f) => f.endsWith('.json')).map((f) => JSON.parse(fs.readFileSync(path.join(ROOT, 'maps', f), 'utf8')));
const crates = (m) => m.entities.filter((e) => e.type === 'pickup' && e.kind === 'ammo_crate');

test('thirteen crates in the campaign: one in each of eight main maps\' secret rooms and one in each of five secret maps; no other map has one', () => {
  const found = maps.filter((m) => crates(m).length).map((m) => m.id).sort();
  assert.deepEqual(found, Object.keys(WITH).sort()); for (const m of maps) assert.ok(crates(m).length <= 1, m.id + ' has more than one');
});

test('each crate lies on a floor cell on its own, inside the secret room where the map has one, and in a secret map within a few cells of its first ammunition box', () => {
  for (const m of maps) for (const c of crates(m)) {
    const [x, z] = c.at; assert.ok(Object.hasOwn(FLOOR_SKINS, m.grid[z][x]), `${m.id}: the crate is on a floor cell`);
    assert.equal(m.entities.filter((e) => e.at && e.at.join() === c.at.join()).length, 1, `${m.id}: nothing else on its cell`);
    if (m.secrets.length) assert.ok(m.secrets.some((s) => s.cells.some(([a, b]) => a === x && b === z)), `${m.id}: inside the secret room`);
    else { const box = m.entities.find((e) => e.type === 'pickup' && /^ammo_/.test(e.kind) && e.kind !== 'ammo_crate'); assert.ok(box && Math.hypot(box.at[0] - x, box.at[1] - z) <= 8, `${m.id}: beside the cache`); }
  }
});

test('a main map gets its new pickups in pairs where its secret has a second free cell (the crate and a 15-hit-point dressing), so the id parity that fixes the steering side of a creature the map spawns does not move; two maps have a lone crate because their secret has no second cell, and their main routes were proved unmoved by the route fingerprints', () => {
  const lone = [], paired = [];
  for (const m of maps) { const c = crates(m)[0]; if (!c || !m.secrets.length) continue; const near = m.entities.filter((e) => e.type === 'pickup' && e.kind === 'health_small' && m.secrets.some((s) => s.cells.some(([a, b]) => a === e.at[0] && b === e.at[1]))); (near.length ? paired : lone).push(m.id); }
  assert.deepEqual(lone.sort(), ['C1E1M05', 'C2M27'], 'the two secrets with no second free cell'); assert.deepEqual(paired.sort(), ['C1E2M02', 'C1E3M03', 'C1E4M06', 'C2M05', 'C2M10', 'C2M18']);
});
