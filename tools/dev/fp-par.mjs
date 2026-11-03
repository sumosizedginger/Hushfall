// Route identity in parallel (PT-083): route-fingerprint.mjs split over several node processes at idle priority, so the whole game can be proved
// unchanged in minutes.
//   node tools/dev/fp-par.mjs save|check <file.json> [--jobs=8] [ID ...]
// save merges the parts into <file.json>; check compares against it and lists what differs (exit 1 if anything does).
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';

const root = path.resolve(import.meta.dirname, '../..');
const args = process.argv.slice(2),
  mode = args[0],
  file = args[1];
if (!['save', 'check'].includes(mode) || !file) {
  console.error('usage: fp-par.mjs save|check <file.json> [--jobs=8] [ID ...]');
  process.exit(2);
}
const jobs = Number(args.find((a) => a.startsWith('--jobs='))?.slice(7) ?? 8);
const named = args.slice(2).filter((a) => !a.startsWith('--'));
const ids = named.length
  ? named
  : fs
      .readdirSync(path.join(root, 'maps'))
      .filter((f) => f.endsWith('.json'))
      .map((f) => f.replace('.json', ''))
      .sort();
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'hushfall-fp-'));
const groups = Array.from({ length: Math.min(jobs, ids.length) }, () => []);
ids.forEach((id, i) => groups[i % groups.length].push(id));

const run = (group, k) =>
  new Promise((resolve) => {
    const part = path.join(tmp, `part-${k}.json`);
    const child = spawn(process.execPath, ['tools/dev/route-fingerprint.mjs', 'save', part, ...group], { cwd: root, stdio: 'ignore', env: process.env });
    try {
      os.setPriority(child.pid, os.constants.priority.PRIORITY_LOW);
    } catch {
      /* the priority is a courtesy */
    }
    child.on('exit', (code) => resolve({ part, code }));
  });

const parts = await Promise.all(groups.map(run));
const failed = parts.filter((p) => p.code !== 0);
if (failed.length) {
  console.error(`${failed.length} worker(s) failed`);
  process.exit(2);
}
const now = {};
for (const p of parts) Object.assign(now, JSON.parse(fs.readFileSync(p.part, 'utf8')));
fs.rmSync(tmp, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });

if (mode === 'save') {
  const sorted = Object.fromEntries(Object.entries(now).sort(([a], [b]) => a.localeCompare(b)));
  fs.writeFileSync(file, JSON.stringify(sorted, null, 1));
  console.log('saved', Object.keys(now).length, 'runs ->', file);
  process.exit(0);
}
const base = JSON.parse(fs.readFileSync(file, 'utf8'));
let bad = 0,
  same = 0;
for (const [k, v] of Object.entries(now)) {
  if (!base[k]) {
    console.log('NEW (not in the baseline)', k);
    continue;
  }
  if (JSON.stringify(base[k]) === JSON.stringify(v)) {
    same++;
    continue;
  }
  bad++;
  console.log('DIFFERS', k, '\n   was', JSON.stringify(base[k]), '\n   now', JSON.stringify(v));
}
console.log(bad ? `${bad} run(s) differ, ${same} identical` : `all ${same} runs identical to the baseline`);
process.exit(bad ? 1 : 0);
