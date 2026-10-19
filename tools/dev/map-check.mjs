// The cheap per-map checks of tests/maps.test.js without its slow gates (tests/maps.test.js plays the viability gates of EVERY map when it loads and takes the better part of an hour; `verify-map` runs those gates for one map in under a minute): (1) the main route is deterministic (same seed, same hash and ticks),
// (2) every message is delivered by the main or the secret route, (3) only the secret route finds the map's secrets (the main route finds none; the secret route completes and finds all). Node only.
//   node tools/dev/map-check.mjs <ID> [<ID> ...]            exit code 1 if any check fails
import fs from 'node:fs';
import path from 'node:path';
import { loadMapFile, loadRouteFile, runRouteEither as runRoute } from '../../src/engine/harness.js';          // either fighter policy (PT-052, Bot v2 first half)

const root = path.resolve(import.meta.dirname, '../..');
let bad = 0;
for (const id of process.argv.slice(2)) {
  const map = loadMapFile(path.join(root, 'maps', id + '.json')), mainF = path.join(root, 'routes', id + '.main.route.json'), secF = path.join(root, 'routes', id + '.secret.route.json');
  const main = loadRouteFile(mainF), secret = fs.existsSync(secF) ? loadRouteFile(secF) : null, out = [];
  const a = runRoute(map, main, { seed: 5 }), b = runRoute(map, main, { seed: 5 });
  out.push(['deterministic', a.hash === b.hash && a.ticks === b.ticks, `${a.result} ${a.ticks} ticks`]);
  const seen = new Set(a.world.messagesSeen); let s = null; if (secret) { s = runRoute(map, secret, { seed: 1 }); for (const m of s.world.messagesSeen) seen.add(m); }
  const missing = map.messages.filter((m) => !m.choice).map((m) => m.id).filter((m) => !seen.has(m)); out.push(['every message delivered', missing.length === 0, missing.join(',')]);
  if (map.secrets.length) { const m1 = runRoute(map, main, { seed: 1 }); out.push(['only the secret route finds the secrets', !!secret && m1.world.stats.secrets === 0 && s?.result === 'complete' && s.world.stats.secrets === map.secrets.length, secret ? `main ${m1.world.stats.secrets}, secret route ${s.result} ${s.world.stats.secrets}/${map.secrets.length}${s.failure ? ' ' + s.failure : ''}` : 'no secret route']); }
  for (const [name, ok, detail] of out) { console.log((ok ? 'PASS ' : 'FAIL ') + id + ' ' + name + (detail ? ' [' + detail + ']' : '')); if (!ok) bad++; }
}
process.exit(bad ? 1 : 0);
