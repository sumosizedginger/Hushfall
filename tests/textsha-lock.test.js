// Round 1 of the outside audit (Codex 6): evidence freshness hashed the runtime source and the baked assets but not package-lock.json, so a three.js bump could leave every real-game run looking fresh.
// The lockfile is now part of the `render` set. A fixture root with no lockfile is unaffected (a set skips a file that is not there).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { setSha, sourceShas, staleSets, SOURCE_SETS, DEPENDS } from '../tools/textsha.mjs';
import { ROOT } from './helpers.js';

const root = () => { const d = fs.mkdtempSync(path.join(os.tmpdir(), 'hushfall-sha-test-')); fs.mkdirSync(path.join(d, 'src/render'), { recursive: true }); fs.writeFileSync(path.join(d, 'src/render/a.js'), 'export const a = 1;\n'); return d; };

test('the lockfile is in the render set, and so in every piece of evidence that drives the real game', () => {
  assert.ok(SOURCE_SETS.render.files.includes('package-lock.json'));
  for (const kind of ['browser', 'browserMap', 'renderGround']) assert.ok(DEPENDS[kind].includes('render'), kind + ' depends on render');
  assert.ok(!DEPENDS.mapSim.includes('render'), 'the simulation evidence does not (a lockfile change does not stale a verify-map run)');
});

test('changing the lockfile changes the render hash, line endings do not, and a root without a lockfile is unchanged by the rule', () => {
  const d = root();
  try {
    const bare = setSha(d, 'render');
    fs.writeFileSync(path.join(d, 'package-lock.json'), '{"packages":{"node_modules/three":{"version":"0.170.0"}}}\n');
    const v1 = setSha(d, 'render'); assert.notEqual(v1, bare, 'adding a lockfile changes the hash');
    fs.writeFileSync(path.join(d, 'package-lock.json'), '{"packages":{"node_modules/three":{"version":"0.170.0"}}}\r\n');
    assert.equal(setSha(d, 'render'), v1, 'CRLF vs LF does not');
    fs.writeFileSync(path.join(d, 'package-lock.json'), '{"packages":{"node_modules/three":{"version":"0.171.0"}}}\n');
    assert.notEqual(setSha(d, 'render'), v1, 'a three.js bump does');
    assert.deepEqual(Object.keys(sourceShas(d)), ['render'], 'only the sets present are reported');
    fs.rmSync(path.join(d, 'package-lock.json')); assert.equal(setSha(d, 'render'), bare, 'removing it restores the old hash');
  } finally { fs.rmSync(d, { recursive: true, force: true }); }
});

// FREEZE F14 (round 1, Codex 6, the other half): the procedure that MEASURES is part of the evidence. The verifier set (verify-map, the map lint, the map picker, textsha itself) stales the simulation evidence of every map; the probes set
// (the browser check, a map's own real-game run, the route parity, the render census) stales the real-game evidence.
test('the tools that produce the evidence are hashed: a change to the verifier stales the simulation evidence, a change to a probe stales the real-game evidence, and nothing else is touched', () => {
  assert.deepEqual(SOURCE_SETS.verifier.files, ['tools/verify-map.mjs', 'tools/maplint.mjs', 'tools/mapset.mjs', 'tools/textsha.mjs']);
  assert.deepEqual(SOURCE_SETS.probes.files, ['tools/dev/browser-check.mjs', 'tools/dev/browser-map.mjs', 'tools/dev/render-census.mjs', 'tools/dev/route-parity.mjs']);
  assert.ok(DEPENDS.mapSim.includes('verifier') && !DEPENDS.mapSim.includes('probes'));
  for (const k of ['browser', 'browserMap', 'renderGround']) assert.ok(DEPENDS[k].includes('probes') && !DEPENDS[k].includes('verifier'), k);
  assert.ok(!DEPENDS.audio.includes('verifier') && !DEPENDS.audio.includes('probes'));
  for (const f of [...SOURCE_SETS.verifier.files, ...SOURCE_SETS.probes.files]) assert.ok(fs.existsSync(path.join(ROOT, f)), f + ' exists (a set that names a missing file hashes nothing of it)');
  const d = root(); try {
    fs.mkdirSync(path.join(d, 'tools/dev'), { recursive: true }); fs.writeFileSync(path.join(d, 'tools/verify-map.mjs'), '// v1\n'); fs.writeFileSync(path.join(d, 'tools/dev/browser-check.mjs'), '// p1\n');
    const v0 = setSha(d, 'verifier'), p0 = setSha(d, 'probes'), r0 = setSha(d, 'render'); assert.ok(v0 && p0);
    fs.writeFileSync(path.join(d, 'tools/verify-map.mjs'), '// v2\n'); assert.notEqual(setSha(d, 'verifier'), v0); assert.equal(setSha(d, 'probes'), p0); assert.equal(setSha(d, 'render'), r0);
    fs.writeFileSync(path.join(d, 'tools/dev/browser-check.mjs'), '// p2\n'); assert.notEqual(setSha(d, 'probes'), p0);
    assert.equal(staleSets(d, sourceShas(d), 'mapSim').length, 0, 'a fresh stamp is fresh'); const old = { ...sourceShas(d) }; delete old.verifier; assert.deepEqual(staleSets(d, old, 'mapSim').map((x) => x.set), ['verifier'], 'evidence stamped before the set existed is stale');
  } finally { fs.rmSync(d, { recursive: true, force: true }); }
});
