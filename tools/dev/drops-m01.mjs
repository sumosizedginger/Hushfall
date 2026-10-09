// Marrow Quay (C1E1M01) has no source (tools/dev/reshape-m01.mjs is the record of its one-time transform), so PT-025's "ammunition from the dead" is applied to its JSON the way the compiler applies it to the others:
// every ammunition box in the public part of the map (reachable from the spawn with every secret panel shut) is removed, the ones in its secrets stay, and the map says `drops: { scale: 1 }`. Idempotent. Usage: node tools/dev/drops-m01.mjs
import fs from 'node:fs';
import path from 'node:path';
import { parseMap } from '../../src/engine/mapformat.js';
import { findTraps } from '../../src/engine/traps.js';

const file = path.resolve(import.meta.dirname, '../../maps/C1E1M01.json'), src = JSON.parse(fs.readFileSync(file, 'utf8'));
const pub = findTraps(parseMap(src), { secrets: false }), before = src.entities.length;
src.entities = src.entities.filter((e) => !(e.type === 'pickup' && /^ammo_/.test(e.kind) && pub.reach.has(pub.key(Math.floor(e.at[0]), Math.floor(e.at[1])))));
src.drops = { scale: 1.5 };          // the tutorial map: only flares and shells, and a first fight with nothing in hand: a fatter supply than the others
fs.writeFileSync(file, JSON.stringify(src, null, 1).replace(/\[\s+(-?[\d.]+),\s+(-?[\d.]+)\s+\]/g, '[$1, $2]'));
console.log(`C1E1M01: ${before - src.entities.length} ammunition boxes removed from the public part, ${src.entities.filter((e) => e.type === 'pickup' && /^ammo_/.test(e.kind)).length} kept (in the secret), drops on (scale 1.5)`);
