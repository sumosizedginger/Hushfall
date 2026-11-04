// Doors a player can walk round without opening anything (src/engine/doorways.js). Node only, read-only.
// Usage: node tools/dev/door-bypass.mjs [--dir=<dir>] [--path] [--json] [ID ...] (default: every map in maps/; exit code 1 if any door is bypassed)
import fs from 'node:fs';
import path from 'node:path';
import { parseMap } from '../../src/engine/mapformat.js';
import { doorBypasses, fakeLocks } from '../../src/engine/doorways.js';

const args = process.argv.slice(2),
  dirArg = args.find((a) => a.startsWith('--dir=')),
  showPath = args.includes('--path'),
  json = args.includes('--json');
const dir = dirArg ? path.resolve(dirArg.slice(6)) : path.resolve(import.meta.dirname, '../../maps');
const ids = args.filter((a) => !a.startsWith('--')),
  all = ids.length
    ? ids
    : fs
        .readdirSync(dir)
        .filter((f) => f.endsWith('.json'))
        .map((f) => f.replace('.json', ''))
        .sort();
let bad = 0,
  doors = 0;
const rows = [];
for (const id of all) {
  const src = JSON.parse(fs.readFileSync(path.join(dir, id + '.json'), 'utf8'));
  const parsed = parseMap(src),
    r = doorBypasses(parsed);
  const fakes = fakeLocks(parsed).filter((f) => !r.some((q) => q.at.join() === f.at.join()));
  doors += (src.doors || []).length;
  if (r.length) bad++;
  rows.push({ id, doors: (src.doors || []).length, bypassed: r, fakes });
  bad += fakes.length && !r.length ? 1 : 0;
  if (json) continue;
  console.log(id.padEnd(9), `${r.length} of ${(src.doors || []).length} doors can be walked round, ${fakes.length} locks round through plain doors`);
  for (const d of fakes) console.log(`    ${d.at.join(',').padEnd(7)} LOCK ${d.key ? d.key + ' key' : 'lever'} ${d.cells} cells round through plain doors: ${d.path.filter((c) => parsed.kind(c[0], c[1]) === 'door').map((c) => c.join(',')).join(' ')}`);
  for (const d of r) {
    const kind = d.key ? `${d.key} key` : d.remote ? 'lever' : 'plain';
    console.log(`    ${d.at.join(',').padEnd(7)} ${kind.padEnd(11)} ${String(d.cells).padStart(3)} cells round${d.both ? '' : ' (one way only)'}`);
    if (showPath) console.log('      ' + d.path.map((c) => c.join(',')).join(' '));
  }
}
if (json) console.log(JSON.stringify(rows));
else console.log(`\n${rows.reduce((n, r) => n + r.bypassed.length, 0)} of ${doors} doors on ${bad} of ${all.length} maps`);
process.exit(bad ? 1 : 0);
