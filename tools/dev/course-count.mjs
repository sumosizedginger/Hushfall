// How much of each shipped map's floor the floor courses lay (src/render/floorcourses.js): fields, kerb and joint strips. Node only.
//   node tools/dev/course-count.mjs [ID...]
import fs from 'node:fs';
import path from 'node:path';
import { parseMap } from '../../src/engine/mapformat.js';
import { floorCourses } from '../../src/render/floorcourses.js';

const root = path.resolve(import.meta.dirname, '../..');
const ids = process.argv.slice(2).length
  ? process.argv.slice(2)
  : fs
      .readdirSync(path.join(root, 'maps'))
      .filter((f) => f.endsWith('.json'))
      .map((f) => f.slice(0, -5));
let total = 0,
  none = [];
for (const id of ids) {
  const m = parseMap(JSON.parse(fs.readFileSync(path.join(root, 'maps', id + '.json'), 'utf8')));
  const r = floorCourses(m),
    k = r.filter((s) => s.part === 'kerb').length;
  total += r.length;
  if (!r.length) none.push(id);
  console.log(id.padEnd(10), 'kerb', String(k).padStart(5), 'joint', String(r.length - k).padStart(5));
}
console.log('strips', total, 'maps with none', none.length, none.join(' '));
