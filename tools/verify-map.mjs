// Produces machine evidence for a map: validation/maps/<ID>.json. Status is NOT written here; `npm run validate` derives it.
// Usage: node tools/verify-map.mjs C1E1M01
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { textSha, engineSha, routesSha, sourceShas, staleSets, describeStale } from './textsha.mjs';
import { execSync } from 'node:child_process';
import { validateMap, parseMap } from '../src/engine/mapformat.js';
import { analyseReach } from '../src/engine/reach.js';
import { runRoute } from '../src/engine/harness.js';
import { evaluateViability, viabilityChecks, levelFacts, qualityChecks } from '../src/engine/viability.js';

const root = path.resolve(import.meta.dirname, '..');
const id = process.argv[2]; if (!id) { console.error('usage: verify-map.mjs <MAP_ID>'); process.exit(2); }
const mapFile = path.join(root, 'maps', id + '.json'), src = JSON.parse(fs.readFileSync(mapFile, 'utf8'));
const sha = (f) => textSha(f);
const sh = (c) => { try { return execSync(c, { cwd: root, stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim(); } catch { return null; } };

const v = validateMap(src);
const dirtySource = !!sh("git status --porcelain -- . ':!review' ':!validation'");           // evidence/screenshot churn does not make the SOURCE dirty
const evidence = { mapId: id, mapVersion: src.version, generatedBy: 'tools/verify-map.mjs', codeVersion: sh('git rev-parse --short HEAD') ?? 'uncommitted', dirtyTree: !!sh('git status --porcelain'), dirtySource: false, mapSha: sha(mapFile), assetVersion: sourceShas(root).assets ?? null };           // assetVersion = hash of every baked atlas + the manifest; validate.mjs compares it, so re-baked art invalidates the evidence
evidence.engineSha = engineSha(root); evidence.sources = sourceShas(root); evidence.routesSha = routesSha(root, id); evidence.loads = v.ok; evidence.validationErrors = v.errors;
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
  if (main) evidence.canonicalRoute = { sha: sha(path.join(root, main.file)), file: main.file, difficulty: 'normal', seed: 1, reachedExit: main.result === 'complete', ticks: main.ticks, finalHash: main.finalHash, proves: 'one valid tested path; not balance, fun, or full exploration' };
  evidence.counts = map.counts();
  // ---- viability + quality (shared with tests/maps.test.js through src/engine/viability.js): the level must not be beatable by ignoring it, a perfect fighter must still bleed,
  //      and the map's own `quality` contract (enemy count, bot time, mechanics, skins) must hold
  const mainRoute = JSON.parse(fs.readFileSync(path.join(root, 'routes', id + '.main.route.json'), 'utf8')), viability = evaluateViability(map, mainRoute);
  for (const c of viabilityChecks(viability, src.par?.time, { safe: !!src.quality?.safe })) add(c.name, c.ok, c.detail);
  const facts = levelFacts(map); evidence.facts = facts;
  for (const c of qualityChecks(map, src.quality, facts, viability.normal.fighter.seconds)) add(c.name, c.ok, c.detail);
  evidence.viability = viability;
}
// real-game evidence = (1) the shared browser check (about CODE: input, UI, saves, flows, GPU leaks, Episode 1 fixtures) fresh against this code and passing, and
// (2) THIS map's own file validation/browser/<ID>.json (every route played in the real game == the Node sim, the HUD, the render-truth census), fresh against this map, its routes and this code.
const bc = path.join(root, 'validation/browser-check.json'), pf = path.join(root, 'validation/browser', id + '.json');
let shared = null, own = null;
if (fs.existsSync(bc)) {
  const b = shared = JSON.parse(fs.readFileSync(bc, 'utf8'));
  add('the shared browser check passed', b.checks.every((c) => c.ok), `${b.checks.filter((c) => c.ok).length}/${b.checks.length}`);
  const stale = staleSets(root, b.sources, 'browser');
  add('the shared browser check was generated by THIS engine/render/game/audio/asset code (render-affecting changes invalidate it)', stale.length === 0, stale.length ? describeStale(stale) : 'source hashes match');
} else add('a shared browser check exists', false, 'run npm run browsercheck');
if (fs.existsSync(pf)) {
  const e = own = JSON.parse(fs.readFileSync(pf, 'utf8')), stale = staleSets(root, e.sources, 'browserMap'), thisRoutes = routesSha(root, id);
  add(`this map's real-game evidence ran on THIS map file (sha matches)`, e.mapSha === sha(mapFile), `validation/browser/${id}.json: ${e.mapSha ?? 'missing'} vs ${sha(mapFile)}`);
  add(`this map's real-game evidence ran on THIS map's route files`, e.routesSha === thisRoutes, `${e.routesSha ?? 'missing'} vs ${thisRoutes ?? 'no routes'}`);
  add(`this map's real-game evidence was generated by THIS engine/render/game/audio/asset code`, stale.length === 0, stale.length ? describeStale(stale) : 'source hashes match');
  add(`every route of this map plays in the real game and agrees with the Node sim, and its render-truth census passed`, e.checks.length > 0 && e.checks.every((c) => c.ok) && Object.keys(e.routes ?? {}).length > 0, `${e.checks.filter((c) => c.ok).length}/${e.checks.length} checks, routes: ${Object.keys(e.routes ?? {}).join(', ') || 'none'}`);
} else add(`this map has real-game evidence`, false, `run: node tools/dev/browser-map.mjs ${id}`);
evidence.browser = shared && own ? { file: `validation/browser/${id}.json`, when: own.when, commit: own.commit ?? null, mapSha: own.mapSha, routesSha: own.routesSha, passed: own.checks.filter((c) => c.ok).length, total: own.checks.length, allPassed: own.checks.every((c) => c.ok), shared: { file: 'validation/browser-check.json', when: shared.when, commit: shared.commit ?? null, passed: shared.checks.filter((c) => c.ok).length, total: shared.checks.length } } : null;
automated.pass = automated.checks.every((c) => c.ok);
evidence.automated = automated;
evidence.humanReview = null;
// blockers come from the audit's judgement file, never from this script: any open BLOCKER for this map is recorded, and stops AGENT_VERIFIED from ever becoming COMPLETE
const kd = ['review/gate-1/known-defects.json', 'review/gate-2/known-defects.json'].flatMap((f) => (fs.existsSync(path.join(root, f)) ? JSON.parse(fs.readFileSync(path.join(root, f), 'utf8')).defects || [] : []));
evidence.knownBlockers = kd.filter((d) => d.severity === 'BLOCKER' && d.status !== 'fixed' && (!d.map || d.map === id)).map((d) => d.title);
evidence.notes = `Generated: map v${src.version}, ${evidence.counts?.enemies ?? '?'} enemies, ${evidence.counts?.items ?? '?'} items, ${evidence.counts?.secrets ?? '?'} secret(s). Automated evidence only (bot through the real input layer + headless Chrome); no human review, no real-GPU performance, no listening test.`;
evidence.dirtySource = dirtySource;
fs.mkdirSync(path.join(root, 'validation/maps'), { recursive: true });
fs.writeFileSync(path.join(root, 'validation/maps', id + '.json'), JSON.stringify(evidence, null, 2) + '\n');
for (const c of automated.checks) console.log(c.ok ? 'PASS' : 'FAIL', c.name, c.detail && !c.ok ? c.detail : '');
console.log(`evidence written: validation/maps/${id}.json  (automated.pass=${automated.pass})`);
process.exit(automated.pass ? 0 : 1);
