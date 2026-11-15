// A8 part 2 (2026-11-14): the accent lamps of src/render/accents.js stand where they can be drawn and never where the player walks through a
// post; levelmesh.js turns each into a lamp and a light; the sim's maps do not carry them.
import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import * as THREE from 'three';
import { ACCENTS } from '../src/render/accents.js';
import { LAMP_TINTS } from '../src/render/models.js';
import { buildLevel } from '../src/render/levelmesh.js';
import { loadMapFile } from '../src/engine/harness.js';
import { ROOT } from './helpers.js';

const texProxy = () => new Proxy({}, { get: (o, k) => (o[k] ??= new THREE.Texture()) });

test('accents: every accent lamp is on an open floor cell of its map, not on a prop; a post stands against a wall; its tint exists', () => {
  assert.ok(Object.keys(ACCENTS).length > 0);
  for (const [id, list] of Object.entries(ACCENTS)) {
    const map = loadMapFile(path.join(ROOT, 'maps', id + '.json'));
    for (const a of list) {
      const [cx, cz] = a.at,
        k = map.kind(cx, cz);
      assert.ok(k === 'floor' || k === 'outdoor', id + ' on ' + k);
      assert.ok(!map.props.some((p) => Math.floor(p.at[0]) === cx && Math.floor(p.at[1]) === cz), id + ' on a prop');
      assert.ok(LAMP_TINTS[a.tint], id + ' tint ' + a.tint);
      assert.ok(a.kind === 'lamp' || a.kind === 'lamppost', id);
      if (a.kind === 'lamppost')
        assert.ok([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dz]) => map.kind(cx + dx, cz + dz) === 'wall'), id + ' post not against a wall');
      if (a.kind === 'lamp') assert.ok(map.ceilingAt(cx, cz) - map.floor(cx, cz) <= 4.5, id + ' hangs too high');
      assert.ok(!map.entities.some((e) => e.type === 'prop' && e.kind === a.kind && e.at[0] === cx && e.at[1] === cz), id + ' leaked into the map');
    }
  }
});

test('accents: the level gets one more light per accent, at the accent', () => {
  const id = Object.keys(ACCENTS)[0],
    map = loadMapFile(path.join(ROOT, 'maps', id + '.json')),
    lvl = buildLevel(map, texProxy()),
    a = ACCENTS[id][0],
    x = (a.at[0] + 0.5) * map.cell,
    z = (a.at[1] + 0.5) * map.cell;
  const near = lvl.lights.filter((l) => Math.abs(l.position.x - x) < 0.01 && Math.abs(l.position.z - z) < 0.01);
  assert.equal(near.length, 1, id + ' accent light');
  assert.equal(near[0].color.getHex(), new THREE.Color(LAMP_TINTS[a.tint].light).getHex());
});
