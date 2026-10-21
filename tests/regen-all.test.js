import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { ROOT } from './helpers.js';

function run(scenario, flags = []) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hushfall-regen-'));
  try {
    const result = spawnSync(process.execPath, ['--import', './tests/fixtures/regen-spawn.mjs', './tools/dev/regen-all.mjs', dir, '--maps=C1E1M01', ...flags], {
      cwd: ROOT, encoding: 'utf8', env: { ...process.env, HUSHFALL_REGEN_SCENARIO: scenario }, timeout: 15000,
    });
    assert.ifError(result.error);
    return { ...result, summary: fs.existsSync(path.join(dir, 'SUMMARY.txt')) ? fs.readFileSync(path.join(dir, 'SUMMARY.txt'), 'utf8') : '' };
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
}

for (const step of [1, 2, 3, 4, 5, 'status']) test(`regeneration propagates step ${step} failure and still runs later steps`, () => {
  const r = run(`fail-${step}`);
  assert.equal(r.status, 1, r.stdout + r.stderr);
  assert.match(r.summary, /FAILED/);
  assert.match(r.summary, /5 tests/, 'remaining steps still run');
});

for (const scenario of ['signal-browser', 'missing-browser-log', 'incomplete-browser-maps', 'test-fail-count', 'malformed-browser-evidence', 'empty-browser-checks', 'failed-browser-check', 'browser-page-error', 'duplicate-browser-maps', 'failed-browser-map', 'missing-test-totals', 'verify-fail-line']) test(`regeneration fails closed: ${scenario}`, () => {
  const r = run(scenario);
  assert.equal(r.status, 1, r.stdout + r.stderr);
  assert.match(r.summary, /FAILED/);
  assert.match(r.summary, /5 tests/);
  if (scenario === 'signal-browser') assert.doesNotMatch(r.summary, /1 of 1 checks passed/, 'old green evidence must not mask a failed run');
});

test('successful regeneration and a selected successful step return success', () => {
  for (const flags of [[], ['--only=4'], ['--from=4', '--skip-tests']]) {
    const r = run('success', flags);
    assert.equal(r.status, 0, r.stderr);
    assert.doesNotMatch(r.summary, /FAILED/);
    assert.match(r.summary, /4 validate/);
  }
});

test('the low-priority launcher propagates the actual child exit code', { skip: process.platform !== 'win32' }, () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hushfall-low-'));
  try {
    const script = path.join(dir, 'fail.mjs'); fs.writeFileSync(script, 'process.exit(7);\n');
    const r = spawnSync('powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', path.join(ROOT, 'tools/dev/low.ps1'), path.join(dir, 'child.log'), script], { cwd: ROOT, encoding: 'utf8', timeout: 15000 });
    assert.ifError(r.error); assert.equal(r.status, 7, r.stdout + r.stderr);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
