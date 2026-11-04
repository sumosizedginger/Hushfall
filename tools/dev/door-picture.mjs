// A door a player can walk round, drawn: the plan round the door and the way round, and the narrowest places that way could be closed. Node only.
// Usage: node tools/dev/door-picture.mjs <ID> [x,z ...] (default: every bypassed door of the map). D the door, * the way round, ? the narrowest gap, o another door
import fs from 'node:fs';
import path from 'node:path';
import { parseMap } from '../../src/engine/mapformat.js';
import { doorBypasses, fakeLocks } from '../../src/engine/doorways.js';

const [id, ...want] = process.argv.slice(2);
const src = JSON.parse(fs.readFileSync(path.resolve(import.meta.dirname, '../../maps', id + '.json'), 'utf8'));
const map = parseMap(src);
const bad = (process.env.LOCKS ? fakeLocks(map) : doorBypasses(map)).filter((d) => !want.length || want.includes(d.at.join(',')));
// a cell's width across the way round: how many open cells in the line at right angles to the step
const open = (x, z) => x >= 0 && z >= 0 && x < map.w && z < map.h && ['floor', 'outdoor'].includes(map.kind(x, z));
const span = (x, z, dx, dz) => {
  let n = 1;
  for (let a = x + dx, b = z + dz; open(a, b); a += dx, b += dz) n++;
  for (let a = x - dx, b = z - dz; open(a, b); a -= dx, b -= dz) n++;
  return n;
};
for (const d of bad) {
  const narrow = [];
  for (let i = 1; i < d.path.length; i++) {
    const [x, z] = d.path[i],
      [px, pz] = d.path[i - 1],
      sx = x - px,
      sz = z - pz;
    if (sx && sz) continue;
    const w = span(x, z, sz ? 1 : 0, sx ? 1 : 0);
    if (w <= 4) narrow.push({ at: [x, z], w, along: sx ? 'x' : 'z' });
  }
  const min = Math.min(...narrow.map((n) => n.w), 99);
  const gaps = narrow.filter((n) => n.w === min);
  const xs = d.path.map((c) => c[0]),
    zs = d.path.map((c) => c[1]);
  const x0 = Math.max(0, Math.min(...xs) - 3),
    x1 = Math.min(map.w - 1, Math.max(...xs) + 3),
    z0 = Math.max(0, Math.min(...zs) - 3),
    z1 = Math.min(map.h - 1, Math.max(...zs) + 3);
  const onPath = new Set(d.path.map((c) => c.join(','))),
    onGap = new Set(gaps.map((g) => g.at.join(',')));
  console.log(`\n${id} door ${d.at} ${d.key ? d.key + ' key' : d.remote ? 'lever' : 'plain'}: ${d.cells} cells round. Narrowest ${min} wide at ${gaps.map((g) => g.at.join(',')).join(' ')}`);
  console.log('     ' + Array.from({ length: x1 - x0 + 1 }, (_, i) => ((x0 + i) % 10 === 0 ? String(((x0 + i) / 10) % 10) : ' ')).join(''));
  for (let z = z0; z <= z1; z++) {
    let row = '';
    for (let x = x0; x <= x1; x++) {
      const k = map.kind(x, z),
        c = x + ',' + z;
      row += c === d.at.join(',') ? 'D' : onGap.has(c) ? '?' : onPath.has(c) ? '*' : k === 'door' ? 'o' : k === 'secret' ? 's' : k === 'floor' || k === 'outdoor' ? '.' : k === 'water' ? '~' : k === 'void' ? '_' : '#';
    }
    console.log(String(z).padStart(3) + '  ' + row);
  }
}
