// Evidence freshness (the dependency model in tools/textsha.mjs) and the status claims of review bundles. The audit of PT-001 found that the previous gate hashed only
// src/engine, so a render change left "AGENT_VERIFIED" evidence standing, and that a committed bundle could say "9 AGENT_VERIFIED" while the derived status was 0.
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { ROOT } from './helpers.js';
import { sourceShas, routesSha, textSha, setSha, staleSets } from '../tools/textsha.mjs';

const VALIDATOR = process.env.HF_VALIDATOR ?? path.join(ROOT, 'tools/validate.mjs');          // HF_VALIDATOR lets the suite be pointed at an OLD validator to prove it fails there
const run = (root, ...args) => spawnSync(process.execPath, [VALIDATOR, ...args], { env: { ...process.env, HUSHFALL_ROOT: root }, encoding: 'utf8' });
const put = (dir, rel, body) => { fs.mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true }); fs.writeFileSync(path.join(dir, rel), body); };
const status = (dir, id = 'C1E1M01') => JSON.parse(fs.readFileSync(path.join(dir, 'validation/campaign.json'), 'utf8')).perMap[id];

const shared = (dir, over = {}) => put(dir, 'validation/browser-check.json', JSON.stringify({ sources: sourceShas(dir), checks: [{ name: 'game starts', ok: true }], ...over }));
const browserOf = (dir, id, over = {}) => put(dir, `validation/browser/${id}.json`, JSON.stringify({ mapId: id, sources: sourceShas(dir), mapSha: textSha(path.join(dir, 'maps', id + '.json')), routesSha: routesSha(dir, id), routes: { main: { ok: true, agree: true } }, checks: [{ name: 'real-game route: completes in the browser', ok: true }, { name: 'render truth: the census passed on this map', ok: true }], ...over }));

/** a project root with every source set and, for each id, a map with fully valid evidence (so the baseline status is AGENT_VERIFIED) */
function project({ ids = ['C1E1M01'] } = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hf-fresh-'));
  put(dir, 'CAMPAIGN_MANIFEST.json', fs.readFileSync(path.join(ROOT, 'CAMPAIGN_MANIFEST.json'), 'utf8'));
  put(dir, 'src/engine/world.js', '// engine'); put(dir, 'src/render/view.js', '// render'); put(dir, 'src/game/ui.js', '// game'); put(dir, 'src/audio/synth.js', '// audio');
  put(dir, 'assets/baked/atlas.png', Buffer.from([137, 80, 78, 71, 1, 2, 3])); put(dir, 'assets/baked/manifest.json', '{"assets":{}}');
  for (const id of ids) { put(dir, `maps/${id}.json`, `{"map":"${id}"}`); put(dir, `routes/${id}.main.route.json`, '[]'); }
  put(dir, 'routes/C1E1M01.secret.route.json', '[{"op":"wait"}]');
  const src = sourceShas(dir); shared(dir);
  for (const id of ids) {
    browserOf(dir, id);
    put(dir, `validation/maps/${id}.json`, JSON.stringify({ mapId: id, loads: true, mapSha: textSha(path.join(dir, 'maps', id + '.json')), engineSha: src.engine, assetVersion: src.assets, routesSha: routesSha(dir, id),
      browser: { file: `validation/browser/${id}.json` }, automated: { pass: true }, canonicalRoute: { file: `routes/${id}.main.route.json`, sha: textSha(path.join(dir, `routes/${id}.main.route.json`)), reachedExit: true } }));
  }
  return dir;
}

test('baseline: a project whose evidence matches every source set is AGENT_VERIFIED', () => {
  const dir = project(); const r = run(dir); assert.equal(r.status, 0, r.stdout + r.stderr); assert.equal(status(dir), 'AGENT_VERIFIED');
});

test('a RENDER change makes the evidence stale (the old gate hashed only src/engine and kept it AGENT_VERIFIED)', () => {
  const dir = project(); put(dir, 'src/render/view.js', '// render, changed'); run(dir); assert.equal(status(dir), 'IMPLEMENTED');
});
test('a GAME-SHELL change (UI, test hook, index.html) makes the browser evidence stale', () => {
  for (const [rel, body] of [['src/game/ui.js', '// game, changed'], ['index.html', '<html></html>']]) {
    const dir = project();
    if (rel === 'index.html') { put(dir, rel, '<html>a</html>'); shared(dir); browserOf(dir, 'C1E1M01'); run(dir); assert.equal(status(dir), 'AGENT_VERIFIED', 'recorded with index.html present'); }
    put(dir, rel, body); run(dir); assert.equal(status(dir), 'IMPLEMENTED', rel);
  }
});
test('an AUDIO-code change makes the browser evidence stale (the browser check drives the live audio engine)', () => {
  const dir = project(); put(dir, 'src/audio/synth.js', '// audio, changed'); run(dir); assert.equal(status(dir), 'IMPLEMENTED');
});
test('a BAKED-ASSET change makes the evidence stale: re-baked art, or a replaced atlas with an untouched manifest (assetVersion is validated, not decoration)', () => {
  let dir = project(); put(dir, 'assets/baked/atlas.png', Buffer.from([137, 80, 78, 71, 9, 9, 9])); run(dir); assert.equal(status(dir), 'IMPLEMENTED', 'png bytes changed');
  dir = project(); put(dir, 'assets/baked/manifest.json', '{"assets":{"x":1}}'); run(dir); assert.equal(status(dir), 'IMPLEMENTED', 'manifest changed');
});
test('a MAP change makes the evidence stale', () => {
  const dir = project(); put(dir, 'maps/C1E1M01.json', '{"map":2}'); run(dir); assert.equal(status(dir), 'IMPLEMENTED');
});
test('a change to ANY route of the map makes the evidence stale, not only the canonical one (secret route here)', () => {
  const dir = project(); put(dir, 'routes/C1E1M01.secret.route.json', '[{"op":"wait"},{"op":"use"}]'); run(dir); assert.equal(status(dir), 'IMPLEMENTED');
});
test('evidence that records no route hash, or real-game evidence (shared or per map) that records no source hashes, is stale (missing = unknown = stale)', () => {
  let dir = project(); const f = path.join(dir, 'validation/maps/C1E1M01.json'), ev = JSON.parse(fs.readFileSync(f, 'utf8')); delete ev.routesSha; fs.writeFileSync(f, JSON.stringify(ev)); run(dir); assert.equal(status(dir), 'IMPLEMENTED', 'no routesSha');
  dir = project(); const b = path.join(dir, 'validation/browser-check.json'), bj = JSON.parse(fs.readFileSync(b, 'utf8')); delete bj.sources; fs.writeFileSync(b, JSON.stringify(bj)); run(dir); assert.equal(status(dir), 'IMPLEMENTED', 'no shared browser sources');
  dir = project(); const p = path.join(dir, 'validation/browser/C1E1M01.json'), pj = JSON.parse(fs.readFileSync(p, 'utf8')); delete pj.sources; fs.writeFileSync(p, JSON.stringify(pj)); run(dir); assert.equal(status(dir), 'IMPLEMENTED', 'no per-map browser sources');
});
test('a map needs ITS OWN real-game evidence that passed: none, failing, or no routes played cannot support AGENT_VERIFIED, and a failing shared check cannot either', () => {
  let dir = project(); fs.rmSync(path.join(dir, 'validation/browser/C1E1M01.json')); run(dir); assert.equal(status(dir), 'IMPLEMENTED', 'no validation/browser/<ID>.json');
  dir = project(); browserOf(dir, 'C1E1M01', { checks: [{ name: 'render truth: awake', ok: false }] }); run(dir); assert.equal(status(dir), 'IMPLEMENTED', 'a per-map check failed');
  dir = project(); browserOf(dir, 'C1E1M01', { routes: {} }); run(dir); assert.equal(status(dir), 'IMPLEMENTED', 'no route was played in the real game');
  dir = project(); shared(dir, { checks: [{ name: 'pause menu fits', ok: false }] }); run(dir); assert.equal(status(dir), 'IMPLEMENTED', 'the shared browser check failed');
});
test('GATE 3 (R3/R4): a changed or NEW map invalidates only itself; changed shared code invalidates every map', () => {
  let dir = project({ ids: ['C1E1M01', 'C1E1M02'] }); let r = run(dir); assert.equal(r.status, 0, r.stdout + r.stderr); assert.equal(status(dir, 'C1E1M01'), 'AGENT_VERIFIED'); assert.equal(status(dir, 'C1E1M02'), 'AGENT_VERIFIED');
  put(dir, 'maps/C1E1M02.json', '{"map":"edited"}'); run(dir); assert.equal(status(dir, 'C1E1M01'), 'AGENT_VERIFIED', 'the other map is untouched'); assert.equal(status(dir, 'C1E1M02'), 'IMPLEMENTED', 'the edited map is stale');
  put(dir, 'routes/C1E1M02.main.route.json', '[{"op":"wait"}]'); run(dir); assert.equal(status(dir, 'C1E1M01'), 'AGENT_VERIFIED', 'a route change elsewhere does not touch this map');
  dir = project({ ids: ['C1E1M01'] }); put(dir, 'maps/C1E1M02.json', '{"map":"new"}'); put(dir, 'routes/C1E1M02.main.route.json', '[]'); run(dir); assert.equal(status(dir, 'C1E1M01'), 'AGENT_VERIFIED', 'adding a map (even one with no evidence yet) does not stale the existing ones'); assert.equal(status(dir, 'C1E1M02'), 'PLANNED', 'a map with no evidence file is PLANNED');
  dir = project({ ids: ['C1E1M01', 'C1E1M02'] }); put(dir, 'src/render/view.js', '// render, changed'); run(dir); assert.equal(status(dir, 'C1E1M01'), 'IMPLEMENTED'); assert.equal(status(dir, 'C1E1M02'), 'IMPLEMENTED', 'shared code invalidates every map');
});
test('text hashing folds CRLF (a Windows checkout does not stale everything) but source sets still see real edits; sets absent from a root are skipped', () => {
  const a = project(), b = project(), lf = ['// render', '// more', ''].join('\n'), crlf = ['// render', '// more', ''].join('\r\n');
  put(a, 'src/render/view.js', lf); put(b, 'src/render/view.js', crlf);
  assert.equal(setSha(a, 'render'), setSha(b, 'render'), 'LF and CRLF hash the same');
  put(b, 'src/render/view.js', crlf.replace('render', 'render!')); assert.notEqual(setSha(a, 'render'), setSha(b, 'render'), 'a real edit is seen');
  const bare = fs.mkdtempSync(path.join(os.tmpdir(), 'hf-bare-')); assert.deepEqual(sourceShas(bare), {}, 'an empty root has no sets'); assert.deepEqual(staleSets(bare, undefined, 'browser'), [], 'and nothing to be stale against');
});

// ---- bundles -----------------------------------------------------------------------------------------------------------------------
const bundle = (dir, claim, name = 'gate-2') => {
  put(dir, `review/${name}/build-info.json`, JSON.stringify({ status: claim }));
  put(dir, `review/${name}/maps.json`, JSON.stringify({ maps: [{ id: 'C1E1M01', status: claim.AGENT_VERIFIED ? 'AGENT_VERIFIED' : 'IMPLEMENTED' }] }));
  put(dir, `review/${name}/README.md`, `# bundle\nDerived campaign status: PLANNED ${claim.PLANNED} / IMPLEMENTED ${claim.IMPLEMENTED} / AGENT_VERIFIED ${claim.AGENT_VERIFIED} / COMPLETE ${claim.COMPLETE} of 68.\n| C1E1M01 | Marrow Quay | ${claim.AGENT_VERIFIED ? 'AGENT_VERIFIED' : 'IMPLEMENTED'} | 16 |\n`);
};
test('a bundle that claims AGENT_VERIFIED while the derived status is lower fails validation, and says what the evidence supports', () => {
  const dir = project(); put(dir, 'src/render/view.js', '// render, changed'); bundle(dir, { PLANNED: 67, IMPLEMENTED: 0, AGENT_VERIFIED: 1, COMPLETE: 0 });
  const r = run(dir); assert.equal(r.status, 1, r.stdout + r.stderr); const out = r.stdout + r.stderr;
  assert.match(out, /review\/gate-2\/build-info\.json claims 1 AGENT_VERIFIED, derived evidence says 0/); assert.match(out, /maps\.json: C1E1M01 claims AGENT_VERIFIED, derived evidence says IMPLEMENTED/);
  assert.match(out, /README\.md claims 1 AGENT_VERIFIED, derived evidence says 0/); assert.match(out, /table says C1E1M01 is AGENT_VERIFIED, derived evidence says IMPLEMENTED/);
});
test('a bundle that matches the derived status passes; --no-bundles (used by the bundle tools while they rewrite it) skips the comparison', () => {
  const ok = project(); bundle(ok, { PLANNED: 67, IMPLEMENTED: 0, AGENT_VERIFIED: 1, COMPLETE: 0 }); const r = run(ok); assert.equal(r.status, 0, r.stdout + r.stderr);
  const bad = project(); put(bad, 'src/render/view.js', '// changed'); bundle(bad, { PLANNED: 67, IMPLEMENTED: 0, AGENT_VERIFIED: 1, COMPLETE: 0 }); assert.equal(run(bad, '--no-bundles').status, 0);
});
test('a historical bundle is exempt only if it says so in its README; an unmarked stale one is an error', () => {
  const dir = project(); bundle(dir, { PLANNED: 50, IMPLEMENTED: 9, AGENT_VERIFIED: 9, COMPLETE: 0 }, 'gate-1');
  put(dir, 'review/gate-1/build-info.json', JSON.stringify({ status: { PLANNED: 50, IMPLEMENTED: 9, AGENT_VERIFIED: 9, COMPLETE: 0 }, historical: { supersededBy: 'review/gate-2' } }));
  let r = run(dir); assert.equal(r.status, 1); assert.match(r.stdout + r.stderr, /says historical but its README has no "Historical snapshot" banner/);
  put(dir, 'review/gate-1/README.md', '> **Historical snapshot (Gate 1).**\nPLANNED 50 / IMPLEMENTED 9 / AGENT_VERIFIED 9 / COMPLETE 0'); r = run(dir); assert.equal(r.status, 0, r.stdout + r.stderr);
});
