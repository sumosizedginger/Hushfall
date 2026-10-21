// Read-only verification driver. The caller applies idle priority and two-core affinity.
// Stream output so long map tests remain inspectable; record whether their inputs changed.
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const out = 'review/codex-audit/retry'; fs.mkdirSync(out, { recursive: true });
function inputs() {
  const files = [];
  const walk = (dir) => { for (const e of fs.readdirSync(dir, { withFileTypes: true })) { const f = path.join(dir, e.name); if (e.isDirectory()) walk(f); else files.push(f); } };
  for (const dir of ['src', 'tests', 'tools', 'assets', 'maps', 'maps-src', 'maps-dev', 'routes', 'design']) walk(dir);
  files.push(...fs.readdirSync('.').filter((f) => /\.(md|json|html|js)$/.test(f) && f !== 'PRODUCTION_LOG.md'));
  return Object.fromEntries(files.sort().map((f) => [f.replaceAll('\\', '/'), crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex')]));
}
const before = inputs(), changes = new Set(), results = [];
const head = spawnSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).stdout?.trim();
const started = new Date().toISOString();
const scan = () => { const now = inputs(); for (const f of new Set([...Object.keys(before), ...Object.keys(now)])) if (before[f] !== now[f]) changes.add(f); return now; };
const save = () => fs.writeFileSync(`${out}/verification.json`, JSON.stringify({ started, head, inputFiles: Object.keys(before).length, changedInputs: [...changes], results }, null, 2) + '\n');
const timer = setInterval(() => { scan(); save(); }, 30000); save();
async function run(command, name) {
  console.log('START ' + command);
  const log = fs.createWriteStream(`${out}/${name}.log`), start = performance.now();
  const result = await new Promise((resolve) => {
    const child = spawn('cmd.exe', ['/d', '/s', '/c', command], { windowsHide: true });
    child.stdout.pipe(log, { end: false }); child.stderr.pipe(log, { end: false });
    child.on('error', (e) => resolve({ exit: null, error: e.message }));
    child.on('close', (exit, signal) => resolve({ exit, signal }));
  });
  await new Promise((resolve) => log.end(resolve));
  results.push({ command, ...result, seconds: (performance.now() - start) / 1000 });
  scan(); save(); console.log(`END ${command}: exit ${result.exit}, ${results.at(-1).seconds.toFixed(1)} s`);
  return result.exit;
}
try {
  const verify = await run('npm run verify', 'verify');
  if (verify !== 0) await run('npm run build', 'build');
  await run('npm run licences', 'licences');
  await run('npm run check-dist', 'check-dist');
} finally { clearInterval(timer); scan(); save(); }
console.log('Changed inputs: ' + changes.size);
process.exitCode = results.some((r) => r.exit !== 0) ? 1 : changes.size ? 2 : 0;
