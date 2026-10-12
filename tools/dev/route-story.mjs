// Which messages of a map are delivered by its routes (the maps test requires every one by the main or the secret route; the secret panel's own message by the secret route only) and which are not: a fast single-map check.
//   node tools/dev/route-story.mjs <ID> [seed]     -> the undelivered message ids (and where they stand), the secrets the main route finds, the secrets the secret route finds
import fs from 'node:fs';
import path from 'node:path';
import { parseMap } from '../../src/engine/mapformat.js';
import { runRoute } from '../../src/engine/harness.js';

const root = path.resolve(import.meta.dirname, '../..'), id = process.argv[2], seed = Number(process.argv[3] ?? 1);
const src = JSON.parse(fs.readFileSync(path.join(root, 'maps', id + '.json'), 'utf8')), map = parseMap(src);
const route = (n) => { const f = path.join(root, 'routes', `${id}.${n}.route.json`); return fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : null; };
const main = route('main'), secret = route('secret');
const a = runRoute(map, main, { seed }), seen = new Set(a.world.messagesSeen), b = secret ? runRoute(map, secret, { seed }) : null;
if (b) for (const m of b.world.messagesSeen) seen.add(m);
const missing = map.messages.filter((m) => !seen.has(m.id));
console.log(`${id}: main ${a.result} ${(a.ticks / 60).toFixed(0)} s, ${a.world.stats.secrets} secret(s); secret route ${b ? b.result + ' ' + (b.ticks / 60).toFixed(0) + ' s, ' + b.world.stats.secrets + ' secret(s)' : 'none'}`);
console.log(missing.length ? 'UNDELIVERED: ' + missing.map((m) => `${m.id}@${m.at.join(',')} r${m.radius ?? 2}`).join('  ') : 'every message is delivered');
process.exit(missing.length ? 1 : 0);
