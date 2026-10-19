// Tries roster plans on a map WITHOUT touching maps/ (PT-052, R2): for each plan the map source is compiled into a scratch folder with the plan swapped in (`reroster` reads ROSTER_ID / ROSTER_PLAN), then the viability gates of verify-map are run on it
// (a passive runner must not get through, the perfect fighter must complete on 3 of 3 seeds on easy and normal and 2 of 3 on hard, damage must rise, the ammunition slack) and the Director's laws are read from its numbers. About half a minute a plan. Node only.
//   node tools/dev/tune-roster.mjs <ID> '<plan json>' ['<plan json>' ...]
//   plan = [{ "from": "t", "to": "b", "n": 3, "pick": "range" }, ...]      (the plan the map source passes to reroster, see tools/mapkit/roster.mjs)
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { loadMapFile, runRouteEither } from '../../src/engine/harness.js';
import { evaluateViability, viabilityChecks, levelFacts, qualityChecks } from '../../src/engine/viability.js';
import { auditMap, laws } from './director-audit.mjs';

const root = path.resolve(import.meta.dirname, '../..');
const [id, ...plans] = process.argv.slice(2);
if (!id || !plans.length) { console.error('usage: tune-roster.mjs <ID> <plan json> [...]'); process.exit(2); }
const mainRoute = JSON.parse(fs.readFileSync(path.join(root, 'routes', id + '.main.route.json'), 'utf8'));
for (const [i, planText] of plans.entries()) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tune-')), t0 = Date.now();
  const r = spawnSync(process.execPath, [path.join(root, 'tools/mapkit/compile.mjs'), id], { cwd: root, env: { ...process.env, MAP_OUT: dir, ROSTER_ID: id, ROSTER_PLAN: planText }, encoding: 'utf8' });
  if (r.status !== 0) { console.log(`plan ${i + 1}: COMPILE FAILED ${(r.stderr || r.stdout).slice(0, 200)}`); continue; }
  const file = path.join(dir, id + '.json'), src = JSON.parse(fs.readFileSync(file, 'utf8')), map = loadMapFile(file);
  const v = evaluateViability(map, mainRoute), checks = viabilityChecks(v, src.par?.time, { safe: !!src.quality?.safe }), facts = levelFacts(map);
  for (const c of qualityChecks(map, src.quality, facts, v.normal.fighter.seconds)) checks.push(c);
  for (const rf of fs.readdirSync(path.join(root, 'routes')).filter((q) => q.startsWith(id + '.') && q.endsWith('.route.json'))) for (const d of ['easy', 'normal', 'hard']) for (const seed of d === 'hard' ? [1, 2] : [1]) { const rr = runRouteEither(map, JSON.parse(fs.readFileSync(path.join(root, 'routes', rf), 'utf8')), { seed, difficulty: d }); checks.push({ name: `route ${rf.replace('.route.json', '')} on ${d}${d === 'hard' ? ' seed ' + seed : ''} reaches the exit`, ok: rr.result === 'complete', detail: rr.failure || rr.result }); }          // hard on two seeds: tests/placement-pt023.test.js plays every route on hard seed 2          // every route of the map, as verify-map plays them
  const bad = checks.filter((c) => !c.ok).map((c) => c.name.replace(/^viability /, '').slice(0, 70) + (c.detail ? ' (' + String(c.detail).slice(0, 30) + ')' : ''));
  const row = auditMap(src), k = {}; for (const e of src.entities) if (e.type === 'enemy') k[e.kind] = (k[e.kind] ?? 0) + 1;
  console.log(`plan ${i + 1}: ${planText}\n   ${JSON.stringify(k)}  top ${row.topShare}%  shoot ${row.rangedShare}%   laws: ${laws(row).join('; ') || 'met'}\n   gates: ${bad.length ? 'FAIL ' + bad.join(' | ') : 'all pass'}   (${Math.round((Date.now() - t0) / 1000)} s)`);
  fs.rmSync(dir, { recursive: true, force: true });
}
