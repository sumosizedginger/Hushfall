// The floor courses (src/render/floorcourses.js): drawn only, so what is held is that every strip lies on a plain built floor of its own skin, at its
// own height, never on water, a moving floor or a current, and that the big built floors of the campaign carry them.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { parseMap } from '../src/engine/mapformat.js';
import { FLOOR_SKINS } from '../src/engine/defs.js';
import { floorCourses, COURSE } from '../src/render/floorcourses.js';

const root = path.resolve(import.meta.dirname, '..');
const ids = fs
  .readdirSync(path.join(root, 'maps'))
  .filter((f) => f.endsWith('.json'))
  .map((f) => f.slice(0, -5));

test('every strip lies inside a plain built floor cell of its skin, just over its floor', () => {
  let laid = 0;
  for (const id of ids) {
    const m = parseMap(JSON.parse(fs.readFileSync(path.join(root, 'maps', id + '.json'), 'utf8'))),
      S = m.cell;
    for (const r of floorCourses(m)) {
      laid++;
      assert.ok(r.x1 > r.x0 && r.z1 > r.z0, id + ' empty strip');
      // test the strip's middle and corners pulled in a hair: each lies on a cell of the strip's skin, plain floor, at the strip's height
      for (const [fx, fz] of [
        [0.5, 0.5],
        [0.01, 0.01],
        [0.99, 0.99],
      ]) {
        const x = r.x0 + (r.x1 - r.x0) * fx,
          z = r.z0 + (r.z1 - r.z0) * fz,
          cx = Math.floor(x / S),
          cz = Math.floor(z / S),
          k = m.kind(cx, cz);
        assert.ok(k === 'floor' || k === 'outdoor', id + ' strip off the floor at ' + cx + ',' + cz + ' (' + k + ')');
        assert.equal(m.skin(cx, cz), r.skin, id + ' strip on another skin at ' + cx + ',' + cz);
        assert.equal(m.sectorAt(cx, cz), -1, id + ' strip on a moving floor');
        const y = m.floor(cx, cz);
        assert.ok(r.y > y && r.y - y < 0.012, id + ' strip not just over its floor at ' + cx + ',' + cz);
        assert.ok(!COURSE.natural.includes(FLOOR_SKINS[r.skin].tex), id + ' courses on natural rock');
      }
    }
  }
  assert.ok(laid > 5000, 'the campaign lays its courses (' + laid + ')');
});
