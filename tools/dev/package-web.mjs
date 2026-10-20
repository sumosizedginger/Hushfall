// THE WEB PACKAGE (PT-071, R23): build, check the build, and zip it for an itch.io-style upload (index.html at the root of the zip, no external requests). Output goes OUTSIDE the repository (builds are never committed).
//   node tools/dev/package-web.mjs [--out=<dir>] [--no-build]      default out: ../Doom_release   (or `npm run package`)
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { zipNames } from './zip-names.mjs';

const root = path.resolve(import.meta.dirname, '../..'), args = process.argv.slice(2);
const out = path.resolve(args.find((a) => a.startsWith('--out='))?.slice(6) ?? path.join(root, '..', 'Doom_release'));
const run = (cmd, a, o = {}) => spawnSync(cmd, a, { cwd: root, encoding: 'utf8', shell: process.platform === 'win32' && cmd === 'npm', ...o });
const fail = (m) => { console.error('package: ' + m); process.exit(1); };

if (!args.includes('--no-build')) { const b = run('npm', ['run', 'build']); if (b.status !== 0) fail('the build failed:\n' + (b.stdout + b.stderr).slice(-600)); }
const chk = run(process.execPath, ['tools/dev/check-dist.mjs']); if (chk.status !== 0) fail('the build check failed:\n' + (chk.stdout + chk.stderr).slice(-800));

const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')), head = run('git', ['rev-parse', '--short', 'HEAD']).stdout.trim() || 'nogit';
const files = []; (function walk(d) { for (const e of fs.readdirSync(d, { withFileTypes: true })) e.isDirectory() ? walk(path.join(d, e.name)) : files.push(path.join(d, e.name)); })(path.join(root, 'dist'));
const bytes = files.reduce((n, f) => n + fs.statSync(f).size, 0);
if (files.length > 1000) fail(`${files.length} files: itch.io allows 1000 in an HTML5 upload`); if (bytes > 200 * 1048576) fail('over the 200 MB an HTML5 upload may hold');
fs.mkdirSync(out, { recursive: true });
const zip = path.join(out, `hushfall-web-${pkg.version}-${head}.zip`); fs.rmSync(zip, { force: true });
const q = (s) => s.replace(/'/g, "''");
const z = process.platform === 'win32'
  ? run('pwsh', ['-NoProfile', '-Command', `Add-Type -AssemblyName System.IO.Compression.FileSystem; [IO.Compression.ZipFile]::CreateFromDirectory('${q(path.join(root, 'dist'))}', '${q(zip)}', [IO.Compression.CompressionLevel]::Optimal, $false)`])   // .NET 8 writes entry names with forward slashes (Windows PowerShell's Compress-Archive wrote backslashes)
  : run('zip', ['-r', '-q', zip, '.'], { cwd: path.join(root, 'dist') });
if (z.status !== 0 || !fs.existsSync(zip)) fail('the zip failed:\n' + (z.stdout + z.stderr).slice(-400));
const names = zipNames(zip);
if (!names.includes('index.html')) fail('index.html is not at the root of the zip');
if (names.some((n) => n.includes(String.fromCharCode(92)))) fail('an entry name has a backslash: it would not unpack on other systems');
if (names.length < files.length) fail(`the zip holds ${names.length} entries for ${files.length} files`);
console.log(`package: ${path.basename(zip)}  ${files.length} files, ${(bytes / 1048576).toFixed(1)} MB unpacked, ${(fs.statSync(zip).size / 1048576).toFixed(1)} MB zipped  -> ${out}`);
