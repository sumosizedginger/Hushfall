// Clean-environment regeneration check: copy sources (no node_modules) to a temp dir, `npm ci`, bake, diff against assets/baked.
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { PNG } from 'pngjs';
const root = path.resolve(import.meta.dirname, '../..');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'hushfall-clean-'));
for (const f of ['package.json', 'package-lock.json']) fs.copyFileSync(path.join(root, f), path.join(tmp, f));
fs.cpSync(path.join(root, 'tools'), path.join(tmp, 'tools'), { recursive: true });
fs.mkdirSync(path.join(tmp, 'assets/baked'), { recursive: true });
execSync('npm ci', { cwd: tmp, stdio: 'inherit' });
execSync('node tools/bake.mjs', { cwd: tmp, stdio: 'inherit' });
const res = {};
for (const f of fs.readdirSync(path.join(tmp, 'assets/baked')).filter((x) => x.endsWith('.png'))) {
  const a = PNG.sync.read(fs.readFileSync(path.join(root, 'assets/baked', f))), b = PNG.sync.read(fs.readFileSync(path.join(tmp, 'assets/baked', f)));
  let n = 0, max = 0; for (let i = 0; i < a.data.length; i++) { const d = Math.abs(a.data[i] - b.data[i]); if (d) { n++; max = Math.max(max, d); } }
  res[f] = { differingBytes: n, totalBytes: a.data.length, fractionDiffering: +(n / a.data.length).toFixed(5), maxChannelDelta: max };
}
console.log(JSON.stringify({ cleanDir: tmp, node: process.version, results: res }, null, 2));
