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
const bc = path.join(root, 'validation/browser-check.json');
if (fs.existsSync(bc)) {
  const b = JSON.parse(fs.readFileSync(bc, 'utf8')), thisMap = sha(mapFile);
  evidence.browser = { file: 'validation/browser-check.json', when: b.when, env: b.env, mapSha: b.mapShas?.[id] ?? (id === 'C1E1M01' ? b.mapSha : null), commit: b.commit ?? null, passed: b.checks.filter((c) => c.ok).length, total: b.checks.length, allPassed: b.checks.every((c) => c.ok) };
  const bsha = b.mapShas?.[id] ?? (id === 'C1E1M01' ? b.mapSha : undefined);
  add('the browser check ran on THIS map file (sha matches)', bsha === thisMap, `browser-check sha for ${id}: ${bsha ?? 'missing'} vs ${thisMap}`);
  add('latest browser check passed', evidence.browser.allPassed, `${evidence.browser.passed}/${evidence.browser.total}`);
  const stale = staleSets(root, b.sources, 'browser');
  add('the browser check was generated by THIS engine/render/game/audio/asset code (render-affecting changes invalidate it)', stale.length === 0, stale.length ? describeStale(stale) : 'source hashes match');
  const rt = b.checks.filter((c) => c.name.startsWith('render truth'));
  add('the browser check includes the render-truth census (enemies drawn on the floor the sim stands them on) and it passed', rt.length >= 7 && rt.every((c) => c.ok), `${rt.filter((c) => c.ok).length}/${rt.length} render-truth checks`);
} else add('a browser check exists', false, 'run npm run browsercheck');
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
