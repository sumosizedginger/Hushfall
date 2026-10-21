// Round 1 of the outside audit (Codex 6): evidence freshness hashed the runtime source and the baked assets but not package-lock.json, so a three.js bump could leave every real-game run looking fresh.
// The lockfile is now part of the `render` set. A fixture root with no lockfile is unaffected (a set skips a file that is not there).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { setSha, sourceShas, SOURCE_SETS, DEPENDS } from '../tools/textsha.mjs';

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
