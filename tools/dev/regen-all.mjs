// THE ONE EVIDENCE REGENERATION (PT-071, R26 and again at R27): every piece of machine evidence of the build, from one commit, in the order the evidence depends on itself, with a log for each step and a summary at the end.
//   1. the shared browser check (real game, headless Chrome: `npm run browsercheck`; 10+ minutes)
//   2. every map's own real-game run (`browser-map.mjs --all`)
//   3. `verify-map` for every map (node; the long step)
//   4. `npm run validate` and `npm run status`
//   5. the whole test suite (`npm test`, which includes the gates of every map)
// Chrome steps run at idle priority on two cores through tools/dev/low.ps1 and refuse the pointer lock (the tools do), one at a time; the node steps are plain node. A step that fails does not stop the rest (the summary says which failed);
// `--from=<n>` resumes at step n, `--only=<n>` runs one, `--skip-tests` leaves out step 5. Run it from a clean commit: the evidence is stamped with the sources it ran against.
//   node tools/dev/regen-all.mjs <logDir> [--from=N] [--only=N] [--skip-tests] [--maps=ID,ID]
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '../..'), args = process.argv.slice(2), logDir = path.resolve(args.find((a) => !a.startsWith('--')) ?? 'regen-logs'); fs.mkdirSync(logDir, { recursive: true });
const flag = (n) => args.find((a) => a.startsWith('--' + n + '='))?.split('=')[1], from = Number(flag('from') ?? 1), only = flag('only') ? Number(flag('only')) : null;
const MAPS = flag('maps') ? flag('maps').split(',') : fs.readdirSync(path.join(root, 'maps')).filter((f) => f.endsWith('.json')).map((f) => f.replace('.json', '')).sort();
const low = (log, script, ...a) => spawnSync('powershell', ['-NoProfile', '-File', path.join(root, 'tools/dev/low.ps1'), log, path.join(root, script), ...a], { cwd: root, encoding: 'utf8' });
const node = (log, ...a) => { const r = spawnSync(process.execPath, a, { cwd: root, encoding: 'utf8', maxBuffer: 1 << 28 }); fs.writeFileSync(log, (r.stdout ?? '') + (r.stderr ?? '')); return r; };
const commit = spawnSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: root, encoding: 'utf8' }).stdout.trim(), dirty = spawnSync('git', ['status', '--short'], { cwd: root, encoding: 'utf8' }).stdout.trim();
const summary = [`commit ${commit}${dirty ? ' (DIRTY: ' + dirty.split('\n').length + ' changed files)' : ''}`]; const t0 = Date.now(), stamp = () => `${((Date.now() - t0) / 60000).toFixed(1)} min`;
const want = (n) => (only ? only === n : n >= from);
let failed = false;
const succeeded = (r) => r.status === 0 && !r.error && !r.signal;
const outcome = (ok) => { if (!ok) failed = true; return ok ? 'OK' : 'FAILED'; };
const readLog = (file) => fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
const childFailure = (r) => r.error?.message ?? (r.signal ? `signal ${r.signal}` : `exit ${r.status}`);

if (want(1)) {
  const r = low(path.join(logDir, '1-browsercheck.log'), 'tools/dev/browser-check.mjs');
  let ok = false, line = childFailure(r);
  // A failed child may have left yesterday's green JSON behind. Never describe that as this run's result.
  if (succeeded(r)) try {
    const j = JSON.parse(fs.readFileSync(path.join(root, 'validation', 'browser-check.json'), 'utf8'));
    ok = Array.isArray(j.checks) && j.checks.length > 0 && j.checks.every((c) => c.ok === true) && Array.isArray(j.errors) && j.errors.length === 0;
    line = `${j.checks.filter((c) => c.ok).length} of ${j.checks.length} checks passed, ${(j.errors ?? []).length} page errors`;
  } catch (e) { line = `evidence unreadable: ${e.message}`; }
  summary.push(`1 browser check [${stamp()}]: ${outcome(ok)}; ${line}`);
}
if (want(2)) {
  const log = path.join(logDir, '2-browser-maps.log'), r = low(log, 'tools/dev/browser-map.mjs', '--all');
  const expected = fs.readdirSync(path.join(root, 'maps')).filter((f) => f.endsWith('.json')).map((f) => f.replace('.json', ''));
  const rows = readLog(log).split('\n').map((l) => l.match(/^(\S+): (\d+)\/(\d+) real-game checks passed/)).filter(Boolean);
  const seen = new Set(rows.map((m) => m[1])), bad = rows.filter((m) => Number(m[2]) === 0 || Number(m[2]) !== Number(m[3]));
  const complete = rows.length === expected.length && seen.size === expected.length && expected.every((id) => seen.has(id));
  summary.push(`2 real-game runs [${stamp()}]: ${outcome(succeeded(r) && complete && !bad.length)}; ${seen.size}/${expected.length} maps, ${bad.length} with a failed check${!succeeded(r) ? '; ' + childFailure(r) : ''}`);
}
if (want(3)) {
  fs.mkdirSync(path.join(logDir, 'verify'), { recursive: true }); const failed = [];
  for (const id of MAPS) { const r = node(path.join(logDir, 'verify', id + '.log'), path.join(root, 'tools/verify-map.mjs'), id); const t = fs.readFileSync(path.join(logDir, 'verify', id + '.log'), 'utf8'); const fails = t.split('\n').filter((l) => l.startsWith('FAIL')), ok = succeeded(r) && !fails.length; if (!ok) failed.push(`${id} (${childFailure(r)}; ${fails.length} FAIL: ${fails.slice(0, 2).map((l) => l.slice(5, 70)).join(' | ')})`); process.stdout.write(`verify ${id} ${ok ? 'ok' : 'FAIL'} [${stamp()}]\n`); }
  summary.push(`3 verify-map [${stamp()}]: ${outcome(!failed.length)}; ${MAPS.length} maps, ${failed.length} failed${failed.length ? ':\n     ' + failed.join('\n     ') : ''}`);
}
if (want(4)) { const v = node(path.join(logDir, '4-validate.log'), path.join(root, 'tools/validate.mjs')), s = node(path.join(logDir, '4-status.log'), path.join(root, 'tools/validate.mjs'), '--status'); summary.push(`4 validate [${stamp()}]: ${outcome(succeeded(v) && succeeded(s))}; validate ${childFailure(v)}, status ${childFailure(s)}; status: ${fs.readFileSync(path.join(logDir, '4-status.log'), 'utf8').trim().split('\n').slice(-3).join(' / ')}`); }
if (want(5) && !args.includes('--skip-tests')) { const r = spawnSync(process.execPath, ['--test', 'tests/*.test.js'], { cwd: root, encoding: 'utf8', maxBuffer: 1 << 29, shell: false }); const t = (r.stdout ?? '') + (r.stderr ?? ''); fs.writeFileSync(path.join(logDir, '5-tests.log'), t); const pass = (t.match(/# pass (\d+)/) ?? t.match(/ℹ pass (\d+)/) ?? [0, '?'])[1], fail = (t.match(/# fail (\d+)/) ?? t.match(/ℹ fail (\d+)/) ?? [0, '?'])[1]; summary.push(`5 tests [${stamp()}]: ${outcome(succeeded(r) && Number(pass) > 0 && fail === '0')}; ${pass} pass, ${fail} fail; ${childFailure(r)}`); }
fs.writeFileSync(path.join(logDir, 'SUMMARY.txt'), summary.join('\n') + '\n'); console.log(summary.join('\n'));
process.exitCode = failed ? 1 : 0;
