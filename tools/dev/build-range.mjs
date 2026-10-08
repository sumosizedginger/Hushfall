// Compile the dev-only weapons range (PT-016): maps-dev/RANGE.level.mjs -> maps-dev/RANGE.json (never maps/: it is not a campaign map and no validation, status or test counts it).
//   node tools/dev/build-range.mjs
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { compile } from '../mapkit/compile.mjs';

const root = path.resolve(import.meta.dirname, '../..'), dir = path.join(root, 'maps-dev');
const lv = (await import(pathToFileURL(path.join(dir, 'RANGE.level.mjs')).href)).default;
const { map, errors } = compile(lv);
if (errors.length) { console.error('FAIL RANGE:\n  ' + errors.slice(0, 40).join('\n  ')); process.exit(1); }
const pretty = (m) => JSON.stringify(m, null, 1).replace(/\[\s+(-?[\d.]+),\s+(-?[\d.]+)\s+\]/g, '[$1, $2]');
fs.writeFileSync(path.join(dir, 'RANGE.json'), pretty(map));
const c = {}; for (const e of map.entities) if (e.type === 'enemy') { const k = (e.hold ?? 'live') + ':' + e.kind; c[k] = (c[k] || 0) + 1; }
console.log(`ok   RANGE ${map.name}: ${map.grid[0].length}x${map.grid.length}, ${map.entities.filter((e) => e.type === 'enemy').length} enemies -> maps-dev/RANGE.json`); console.log(JSON.stringify(c));
