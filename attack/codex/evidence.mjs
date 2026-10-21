// Regenerate evidence for the current working-tree source, with a source-change guard.
// The launcher supplies idle priority, two-core affinity and a process-scoped PowerShell policy.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawn, spawnSync } from 'node:child_process';
import { sourceShas, staleSets } from '../../tools/textsha.mjs';

const out = path.resolve('review/codex-audit/evidence'); fs.mkdirSync(out, { recursive: true });
function inputs() {
  const files = [];
  const walk = (dir) => { for (const e of fs.readdirSync(dir, { withFileTypes: true })) { const file = path.join(dir, e.name); if (e.isDirectory()) walk(file); else files.push(file); } };
  for (const dir of ['src', 'assets', 'maps', 'routes', 'tools']) walk(dir);
  files.push('index.html', 'vite.config.js', 'package.json', 'package-lock.json');
  return Object.fromEntries(files.sort().map((f) => [f.replaceAll('\\', '/'), crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex')]));
}
const before = inputs(), sources = sourceShas(process.cwd()), started = new Date().toISOString();
const git = (...args) => spawnSync('git', args, { encoding: 'utf8' }).stdout?.trim();
const metadata = { started, head: git('rev-parse', 'HEAD'), workingTree: git('status', '--short'), sources, changedInputs: [], result: null,
  priorFullSuite: JSON.parse(fs.readFileSync('review/codex-audit/retry/verification.json', 'utf8')),
  audioStale: staleSets(process.cwd(), JSON.parse(fs.readFileSync('validation/audio.json', 'utf8')).sources, 'audio') };
const save = () => fs.writeFileSync(path.join(out, 'run.json'), JSON.stringify(metadata, null, 2) + '\n');
save();
if (metadata.audioStale.length) throw new Error('Audio needs its own QA regeneration; do not silently skip it.');
const log = fs.createWriteStream(path.join(out, 'driver.log'));
const child = spawn(process.execPath, ['tools/dev/regen-all.mjs', out, '--skip-tests'], { windowsHide: true });
child.stdout.pipe(log, { end: false }); child.stderr.pipe(log, { end: false });
let stopped = false;
function scan() {
  const now = inputs(); metadata.changedInputs = [...new Set([...Object.keys(before), ...Object.keys(now)])].filter((f) => before[f] !== now[f]);
  if (metadata.changedInputs.length && !stopped) {
    stopped = true; console.error('Stopping own evidence process tree: inputs changed: ' + metadata.changedInputs.join(', '));
    spawnSync('taskkill.exe', ['/PID', String(child.pid), '/T', '/F'], { encoding: 'utf8' });
  }
  save();
}
const timer = setInterval(scan, 30000);
const result = await new Promise((resolve) => { child.on('error', (e) => resolve({ exit: null, error: e.message })); child.on('close', (exit, signal) => resolve({ exit, signal })); });
clearInterval(timer); scan(); await new Promise((resolve) => log.end(resolve));
metadata.result = { ...result, finished: new Date().toISOString() }; save();
console.log(JSON.stringify(metadata.result));
process.exitCode = result.exit !== 0 || stopped ? 1 : 0;
