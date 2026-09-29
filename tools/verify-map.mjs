// Produces machine evidence for a map: validation/maps/<ID>.json. Status is NOT written here; `npm run validate` derives it.
// Usage: node tools/verify-map.mjs C1E1M01
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execSync } from 'node:child_process';
import { validateMap, parseMap } from '../src/engine/mapformat.js';
import { analyseReach } from '../src/engine/reach.js';
import { runRoute } from '../src/engine/harness.js';

const root = path.resolve(import.meta.dirname, '..');
const id = process.argv[2]; if (!id) { console.error('usage: verify-map.mjs <MAP_ID>'); process.exit(2); }
const mapFile = path.join(root, 'maps', id + '.json'), src = JSON.parse(fs.readFileSync(mapFile, 'utf8'));
const sha = (f) => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex').slice(0, 16);
const sh = (c) => { try { return execSync(c, { cwd: root, stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim(); } catch { return null; } };

const v = validateMap(src);
const evidence = { mapId: id, mapVersion: src.version, generatedBy: 'tools/verify-map.mjs', codeVersion: sh('git rev-parse --short HEAD') ?? 'uncommitted', dirtyTree: !!sh('git status --porcelain'), mapSha: sha(mapFile), assetVersion: fs.existsSync(path.join(root, 'assets/baked/manifest.json')) ? sha(path.join(root, 'assets/baked/manifest.json')) : null };
evidence.loads = v.ok; evidence.validationErrors = v.errors;
const automated = { pass: false, checks: [] };
const add = (name, ok, detail = '') => automated.checks.push({ name, ok: !!ok, detail });
if (v.ok) {
  const map = parseMap(src), reach = analyseReach(map);
  add('exit reachable from spawn (keys considered)', reach.exitReachable); add('no unreachable pickups/enemies', reach.unreachable.length === 0, JSON.stringify(reach.unreachable));
  add('all secrets reachable', reach.secretsReachable.every((s) => s.reachable), JSON.stringify(reach.secretsReachable));
  const routes = fs.readdirSync(path.join(root, 'routes')).filter((f) => f.startsWith(id + '.') && f.endsWith('.route.json'));
  evidence.routes = [];
  for (const f of routes) {
    const route = JSON.parse(fs.readFileSync(path.join(root, 'routes', f), 'utf8'));
    for (const difficulty of ['easy', 'normal', 'hard']) {
      const r = runRoute(map, route, { seed: 1, difficulty });
      add(`route ${f} on ${difficulty} reaches the exit`, r.result === 'complete', r.failure || `${(r.ticks / 60).toFixed(1)} s`);
      evidence.routes.push({ file: 'routes/' + f, difficulty, seed: 1, result: r.result, ticks: r.ticks, finalHash: r.hash, kills: r.world.stats.kills, secrets: r.world.stats.secrets, items: r.world.stats.items, damageTaken: r.world.stats.damageTaken });
    }
  }
  const main = evidence.routes.find((r) => r.file.includes('.main.') && r.difficulty === 'normal');
  if (main) evidence.canonicalRoute = { file: main.file, difficulty: 'normal', seed: 1, reachedExit: main.result === 'complete', ticks: main.ticks, finalHash: main.finalHash, expectedEvents: ['door_open', 'pickup:key_brass', 'level_complete'], proves: 'one valid tested path; not balance, fun, or full exploration' };
  evidence.counts = map.counts();
}
const bc = path.join(root, 'validation/browser-check.json');
if (fs.existsSync(bc)) { const b = JSON.parse(fs.readFileSync(bc, 'utf8')); evidence.browser = { file: 'validation/browser-check.json', when: b.when, env: b.env, passed: b.checks.filter((c) => c.ok).length, total: b.checks.length, allPassed: b.checks.every((c) => c.ok) }; add('latest browser check passed', evidence.browser.allPassed, `${evidence.browser.passed}/${evidence.browser.total}`); }
automated.pass = automated.checks.every((c) => c.ok);
evidence.automated = automated;
evidence.humanReview = null;
evidence.knownBlockers = [];
evidence.notes = 'Layout is the engine-skeleton test level, not the polished Gate 1 level. No audio, automap or second weapon yet.';
fs.mkdirSync(path.join(root, 'validation/maps'), { recursive: true });
fs.writeFileSync(path.join(root, 'validation/maps', id + '.json'), JSON.stringify(evidence, null, 2) + '\n');
for (const c of automated.checks) console.log(c.ok ? 'PASS' : 'FAIL', c.name, c.detail && !c.ok ? c.detail : '');
console.log(`evidence written: validation/maps/${id}.json  (automated.pass=${automated.pass})`);
process.exit(automated.pass ? 0 : 1);
