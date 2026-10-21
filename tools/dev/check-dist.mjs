// THE BUILD CHECK (PT-058, M3 of the commercial workstream): is `dist/` (npm run build) a folder that can be zipped and uploaded to a web host as it stands (itch.io takes a zip with index.html at its root)? Node only; run `npm run build` first.
//   node tools/dev/check-dist.mjs [--json]
// It checks: index.html is at the root; every script, stylesheet, image and font the pages name is a RELATIVE path that exists in dist (a leading slash or http(s) is a failure: the game would break under a sub-folder URL); no JavaScript carries the dev test hook (`__GAME_TEST__`),
// a dev map (`maps-dev`), or a localhost address; nothing in dist is a source map; and it reports the size by kind (a web upload wants a few tens of MB, not hundreds).
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '../..'), dist = path.join(root, 'dist');
export function checkDist(dir = dist) {
  const problems = [], files = [];
  const walk = (d) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) walk(p); else files.push(p); } };
  if (!fs.existsSync(dir)) return { problems: ['dist/ does not exist: run npm run build'], files: [], bytes: 0, byKind: {} };
  walk(dir);
  const rel = (p) => path.relative(dir, p).replace(/\\/g, '/'), index = path.join(dir, 'index.html');
  if (!fs.existsSync(index)) problems.push('dist/index.html is missing');
  else {
    const html = fs.readFileSync(index, 'utf8'); const refs = [...html.matchAll(/\b(?:src|href)\s*=\s*["']([^"'#?]+)/g)].map((m) => m[1]).filter((u) => !u.startsWith('data:') && !u.startsWith('mailto:'));
    for (const u of refs) { if (/^(https?:)?\/\//.test(u)) problems.push(`index.html names an outside address: ${u}`); else if (u.startsWith('/')) problems.push(`index.html names an absolute path: ${u}`); else if (!fs.existsSync(path.join(dir, u))) problems.push(`index.html names ${u}, which is not in dist`); }
  }
  // (round 1, Codex 7: a stylesheet naming a missing image passed with zero problems) a url() in a stylesheet, in index.html's own style, and a media file named by a string in a script, must all exist in dist
  const cssUrls = (text, base, where) => { for (const m of text.matchAll(/url\(\s*(['"]?)([^'")]+)\1\s*\)/g)) { const u = m[2].trim(); if (u.startsWith('data:') || u.startsWith('#')) continue; const clean = u.split(/[?#]/)[0];
    if (/^(https?:)?\/\//.test(u)) problems.push(`${where} names an outside address: ${u}`); else if (u.startsWith('/')) problems.push(`${where} names an absolute path: ${u}`); else if (!fs.existsSync(path.resolve(base, clean))) problems.push(`${where} names ${u}, which is not in dist`); } };
  if (fs.existsSync(index)) cssUrls(fs.readFileSync(index, 'utf8'), dir, 'index.html');
  const MEDIA = /["'`]((?:\.{1,2}\/)?(?:[\w.-]+\/)*[\w.-]+\.(?:png|jpe?g|gif|webp|svg|woff2?|ttf|otf|mp3|ogg|wav))["'`]/g;
  const byKind = {}; let bytes = 0;
  for (const f of files) {
    const ext = path.extname(f).slice(1) || 'other', n = fs.statSync(f).size; byKind[ext] = (byKind[ext] ?? 0) + n; bytes += n;
    if (ext === 'map') problems.push(`a source map is in dist: ${rel(f)}`);
    if (ext === 'css') cssUrls(fs.readFileSync(f, 'utf8'), path.dirname(f), rel(f));
    if (ext === 'js') for (const m of fs.readFileSync(f, 'utf8').matchAll(MEDIA)) { const u = m[1]; if (!fs.existsSync(path.resolve(path.dirname(f), u)) && !fs.existsSync(path.resolve(dir, u))) problems.push(`${rel(f)} names the file ${u}, which is not in dist`); }
    if (ext === 'js' || ext === 'html' || ext === 'css') { const s = fs.readFileSync(f, 'utf8'); for (const [re, what] of [[/__GAME_TEST__/, 'the dev test hook'], [/maps-dev/, 'a dev map path'], [/localhost:\d+/, 'a localhost address']]) if (re.test(s)) problems.push(`${rel(f)} carries ${what}`); }
  }
  return { problems, files: files.map(rel), bytes, byKind };
}
if (process.argv[1]?.endsWith('check-dist.mjs')) {
  const r = checkDist();
  if (process.argv.includes('--json')) console.log(JSON.stringify(r, null, 1));
  else { const mb = (n) => (n / 1048576).toFixed(1) + ' MB'; console.log(`dist: ${r.files.length} files, ${mb(r.bytes)} (${Object.entries(r.byKind).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${mb(v)}`).join(', ')})`); console.log(r.problems.length ? r.problems.map((p) => 'FAIL ' + p).join('\n') : 'build check: OK'); }
  process.exit(r.problems.length ? 1 : 0);
}
