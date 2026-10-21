import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { sourceShas } from '../../tools/textsha.mjs';

function inventory(dir) {
  const files = [];
  const walk = (p) => { for (const e of fs.readdirSync(p, { withFileTypes: true })) { const f = path.join(p, e.name); if (e.isDirectory()) walk(f); else files.push(f); } };
  walk(dir); files.sort(); const hash = crypto.createHash('sha256'); let bytes = 0;
  for (const file of files) { const b = fs.readFileSync(file); bytes += b.length; hash.update(path.relative(dir, file).replaceAll('\\', '/')); hash.update(b); }
  return { files: files.length, bytes, sha256: hash.digest('hex') };
}
const before = inventory('dist'), started = performance.now();
const r = spawnSync('cmd.exe', ['/d', '/s', '/c', 'npm run build'], { encoding: 'utf8', maxBuffer: 1 << 26 });
fs.writeFileSync('review/codex-audit/build.log', (r.stdout ?? '') + (r.stderr ?? ''));
const after = inventory('dist'), sources = sourceShas(process.cwd());
const stamped = JSON.parse(fs.readFileSync('validation/browser-check.json', 'utf8')).sources;
const result = { exit: r.status, seconds: (performance.now() - started) / 1000, before, after, identical: before.sha256 === after.sha256, sourceHashesMatchBrowserEvidence: JSON.stringify(sources) === JSON.stringify(stamped) };
fs.writeFileSync('review/codex-audit/build-comparison.json', JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify(result, null, 2)); process.exitCode = r.status;
