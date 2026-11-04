// tools/dev/level-pass.mjs over every main map, in parallel at idle priority (PT-083). Run it from a checkout nobody is editing.
//   node tools/dev/level-pass-all.mjs [--jobs=10] [ID ...]
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
        .filter((f) => f.endsWith('.json') && /M\d\d/.test(f))
        .map((f) => f.replace('.json', ''))
        .sort();
const queue = [...ids];
let bad = 0;
const one = (id) =>
  new Promise((resolve) => {
    const child = spawn(process.execPath, ['tools/dev/level-pass.mjs', id], { cwd: root, stdio: ['ignore', 'pipe', 'pipe'] });
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
await Promise.all(
  Array.from({ length: jobs }, async () => {
    while (queue.length) {
      const r = await one(queue.shift());
      if (r.code) bad++;
      console.log(r.out.trim() || `${r.id}: no output (exit ${r.code})`);
    }
  }),
);
console.log(bad ? `${bad} of ${ids.length} failed` : `all ${ids.length} passed`);
