// Round 1 of the outside audit (Codex 7): check-dist checked what index.html names but not what a stylesheet or a script names, so a linked stylesheet with a url() to a missing image passed with no problems.
// These build small dist folders in the temp directory (and remove them) and hold the check to: a good folder is clean, and each kind of dangling reference is found.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { checkDist } from '../tools/dev/check-dist.mjs';

function dist(files) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hushfall-dist-test-'));
  for (const [name, text] of Object.entries(files)) { const p = path.join(dir, name); fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, text); }
  return dir;
}
const problemsOf = (files) => { const dir = dist(files); try { return checkDist(dir).problems; } finally { fs.rmSync(dir, { recursive: true, force: true }); } };
const index = '<!doctype html><link rel="stylesheet" href="./assets/style.css"><script type="module" src="./assets/app.js"></script>';

test('a folder whose stylesheet and script name only files that exist is clean', () => {
  assert.deepEqual(problemsOf({ 'index.html': index, 'assets/style.css': 'body { background: url(./bg.png); } i { background: url("bg.png") } b { background: url(data:image/png;base64,AAAA) }', 'assets/bg.png': 'x', 'assets/app.js': 'const a = "assets/bg.png"; const b = "./bg.png"; const t = "image/png";' }), []);
});

test('a stylesheet url() to a missing image is a problem (the audit\'s own case), quoted or not, and so is one in index.html\'s own style', () => {
  const css = problemsOf({ 'index.html': index, 'assets/style.css': 'body { background: url(./missing.png); }', 'assets/app.js': '' });
  assert.equal(css.length, 1); assert.match(css[0], /assets\/style\.css names \.\/missing\.png, which is not in dist/);
  assert.equal(problemsOf({ 'index.html': index, 'assets/style.css': 'a { background: url("nope.webp?v=3#x") }', 'assets/app.js': '' }).length, 1, 'quoted, with a query and a fragment');
  const inline = problemsOf({ 'index.html': index.replace('<link', '<style>.x{background:url(assets/gone.svg)}</style><link'), 'assets/style.css': '', 'assets/app.js': '' });
  assert.equal(inline.length, 1); assert.match(inline[0], /index\.html names assets\/gone\.svg/);
});

test('a stylesheet that names an outside address or an absolute path is a problem (it would break under a sub-folder URL)', () => {
  const p = problemsOf({ 'index.html': index, 'assets/style.css': 'a { background: url(https://example.com/x.png) } b { background: url(/assets/y.png) }', 'assets/app.js': '' });
  assert.equal(p.length, 2); assert.ok(p.some((s) => /outside address/.test(s)) && p.some((s) => /absolute path/.test(s)));
});

test('a script that names a media file which is not in dist is a problem, and a MIME type or a name without an extension is not', () => {
  const p = problemsOf({ 'index.html': index, 'assets/style.css': '', 'assets/app.js': 'load("assets/lost-Ab12.png"); const mime = "image/png"; const k = "png";' });
  assert.equal(p.length, 1); assert.match(p[0], /assets\/app\.js names the file assets\/lost-Ab12\.png, which is not in dist/);
});
