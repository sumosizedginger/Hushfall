// Every map's node gates in parallel at idle priority (PT-083): fun-gates.mjs split over several processes. Run it from a checkout nobody is editing: each process reads the source when it starts.
//   node tools/dev/gates-par.mjs [--jobs=10] [--no-strict] [ID ...]     prints one FAIL block per map that fails, then a summary; exit 1 if any does
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';

const root = path.resolve(import.meta.dirname, '../..');
const args = process.argv.slice(2),
  jobs = Number(args.find((a) => a.startsWith('--jobs='))?.slice(7) ?? 10),
  named = args.filter((a) => !a.startsWith('--')),
  ids = named.length
    ? named
    : fs
        .readdirSync(path.join(root, 'maps'))
        .filter((f) => f.endsWith('.json'))
        .map((f) => f.replace('.json', ''))
        .sort(),
  env = { ...process.env, ...(args.includes('--no-strict') ? { NO_STRICT: '1' } : {}) };

const queue = [...ids];
let bad = 0,
  done = 0;
const results = [];
const one = (id) =>
  new Promise((resolve) => {
    const child = spawn(process.execPath, ['tools/dev/fun-gates.mjs', id], { cwd: root, env, stdio: ['ignore', 'pipe', 'pipe'] });
    try {
      os.setPriority(child.pid, os.constants.priority.PRIORITY_LOW);
    } catch {
      /* the priority is a courtesy */
    }
    let out = '';
    child.stdout.on('data', (d) => (out += d));
    child.stderr.on('data', (d) => (out += d));
    child.on('exit', (code) => resolve({ id, code, out }));
  });
const worker = async () => {
  while (queue.length) {
    const r = await one(queue.shift());
    done++;
    results.push(r);
    if (r.code) {
      bad++;
      console.log(`--- ${r.id}\n${r.out.trim()}`);
    }
    if (done % 10 === 0) console.log(`(${done} of ${ids.length}, ${bad} failing so far)`);
  }
};
await Promise.all(Array.from({ length: jobs }, worker));
console.log(bad ? `${bad} of ${ids.length} maps fail` : `all ${ids.length} maps pass every node gate`);
process.exit(bad ? 1 : 0);
