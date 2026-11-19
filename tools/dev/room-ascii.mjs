// One room of a shipped map as text, for planning a redraw: the grid's own characters, objects over them (@ spawn, E enemy, P pickup, o prop,
// D door, > exit), and the height layer beside it. Node only.
//   node tools/dev/room-ascii.mjs <ID> <x0> <z0> <x1> <z1>
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '../..'),
  [id, ...r] = process.argv.slice(2),
  [x0, z0, x1, z1] = r.map(Number);
const m = JSON.parse(fs.readFileSync(path.join(root, 'maps', id + '.json'), 'utf8'));
const over = new Map();
const mark = (at, c) => over.set(Math.floor(at[0]) + ',' + Math.floor(at[1]), c);
for (const e of m.entities ?? []) mark(e.at, e.type === 'player' ? '@' : e.type === 'enemy' ? 'E' : e.type === 'pickup' ? 'P' : e.type === 'exit' ? '>' : e.type === 'prop' ? 'o' : '?');
for (const d of m.doors ?? []) if (d.at) mark(d.at, 'D');
const head = '    ' + Array.from({ length: x1 - x0 + 1 }, (_, i) => String((x0 + i) % 10)).join('');
console.log(head + '   ' + head.trim());
for (let z = z0; z <= z1; z++) {
  let g = '',
    h = '';
  for (let x = x0; x <= x1; x++) {
    g += over.get(x + ',' + z) ?? m.grid[z]?.[x] ?? ' ';
    h += m.heights?.[z]?.[x] ?? '.';
  }
  console.log(String(z).padStart(3) + ' ' + g + '   ' + h);
}
for (const e of (m.entities ?? []).filter((e) => e.at[0] >= x0 && e.at[0] <= x1 + 1 && e.at[1] >= z0 && e.at[1] <= z1 + 1 && e.type !== 'player'))
  console.log('  ', e.type, e.kind ?? '', e.at.join(','));
