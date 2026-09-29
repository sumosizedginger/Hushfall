// Campaign topology + the evidence-derived status model, tested against synthetic fixtures via HUSHFALL_ROOT.
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { ROOT } from './helpers.js';

const run = (root, ...args) => spawnSync(process.execPath, [path.join(ROOT, 'tools/validate.mjs'), ...args], { env: { ...process.env, HUSHFALL_ROOT: root }, encoding: 'utf8' });
function fixture(mutateManifest, evidence = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hf-camp-'));
  const m = JSON.parse(fs.readFileSync(path.join(ROOT, 'CAMPAIGN_MANIFEST.json'), 'utf8'));
  if (mutateManifest) mutateManifest(m);
  fs.writeFileSync(path.join(dir, 'CAMPAIGN_MANIFEST.json'), JSON.stringify(m));
  fs.mkdirSync(path.join(dir, 'validation/maps'), { recursive: true });
  for (const [id, ev] of Object.entries(evidence)) fs.writeFileSync(path.join(dir, 'validation/maps', id + '.json'), JSON.stringify({ mapId: id, ...ev }));
  return dir;
}
const derived = (dir, id) => JSON.parse(fs.readFileSync(path.join(dir, 'validation/campaign.json'), 'utf8')).perMap[id];

test('the real campaign manifest validates: 68 slots, 36 + 32, 62 main, 6 secret', () => {
  const r = run(ROOT); assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /68 slots: C1 36, C2 32, main 62, secret 6/);
});

test('topology negative cases fail validation', () => {
  const cases = [
    [(m) => m.maps.pop(), /expected 68/],
    [(m) => { m.maps[1].id = m.maps[0].id; }, /duplicate map IDs/],
    [(m) => { m.maps.find((x) => x.id === 'C1E1S01').returnsTo = 'C1E1M08'; }, /returns to/],
    [(m) => { m.maps.find((x) => x.id === 'C1E2M04').secretExit = null; }, /does not point back/],
    [(m) => { m.maps.find((x) => x.id === 'C1E1M03').next = 'C1E1M05'; }, /main route visits/],
    [(m) => { m.maps.find((x) => x.id === 'C2S02').kind = 'main'; }, /secret|main/],
  ];
  for (const [mut, re] of cases) { const r = run(fixture(mut)); assert.equal(r.status, 1); assert.match(r.stdout + r.stderr, re); }
});

test('status is derived from evidence, never from the manifest', () => {
  const ok = { loads: true, automated: { pass: true }, canonicalRoute: { file: 'routes/x.json', reachedExit: true } };
  const dir = fixture(null, {
    C1E1M01: ok, C1E1M02: { loads: true }, C1E1M03: { ...ok, humanReview: { approved: true, by: 'sumo', date: '2026-01-01' } },
    C1E1M04: { ...ok, humanReview: { approved: true, by: 'sumo', date: '2026-01-01' }, knownBlockers: ['softlock'] }, C1E1M05: { loads: false },
  });
  fs.mkdirSync(path.join(dir, 'routes'), { recursive: true }); fs.writeFileSync(path.join(dir, 'routes/x.json'), '[]');
  const r = run(dir, '--status'); assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.equal(derived(dir, 'C1E1M01'), 'AGENT_VERIFIED', 'passes + route, no human review');
  assert.equal(derived(dir, 'C1E1M02'), 'IMPLEMENTED', 'loads only');
  assert.equal(derived(dir, 'C1E1M03'), 'COMPLETE', 'human review recorded');
  assert.equal(derived(dir, 'C1E1M04'), 'AGENT_VERIFIED', 'a known blocker prevents COMPLETE');
  assert.equal(derived(dir, 'C1E1M05'), 'PLANNED', 'does not load');
  assert.equal(derived(dir, 'C1E1M06'), 'PLANNED', 'no evidence');
});

test('an evidence route file that does not exist cannot yield AGENT_VERIFIED', () => {
  const dir = fixture(null, { C1E1M01: { loads: true, automated: { pass: true }, canonicalRoute: { file: 'routes/missing.json', reachedExit: true } } });
  run(dir); assert.equal(derived(dir, 'C1E1M01'), 'IMPLEMENTED');
});

test('a manifest that self-promotes a map above its evidence fails validation', () => {
  const r = run(fixture((m) => { m.maps[0].status = 'COMPLETE'; }));
  assert.equal(r.status, 1); assert.match(r.stdout + r.stderr, /manifest claims COMPLETE but evidence supports PLANNED/);
});

test('evidence goes stale when the map file changes after verification', () => {
  const dir = fixture(null, { C1E1M01: { loads: true, mapSha: 'deadbeefdeadbeef', automated: { pass: true }, canonicalRoute: { file: 'routes/x.json', reachedExit: true } } });
  fs.mkdirSync(path.join(dir, 'routes'), { recursive: true }); fs.writeFileSync(path.join(dir, 'routes/x.json'), '[]');
  fs.mkdirSync(path.join(dir, 'maps'), { recursive: true }); fs.writeFileSync(path.join(dir, 'maps/C1E1M01.json'), '{\"different\": true}');
  run(dir); assert.equal(derived(dir, 'C1E1M01'), 'IMPLEMENTED');
});
