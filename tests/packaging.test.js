// PT-071 (R23): the packaging tools. The local server never serves outside dist/, types what it serves and answers the way a static host does;
// the zip reader finds the entries of a real archive; the package tool is wired (npm scripts, the output outside the repository).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { resolveInDist, makeServer } from '../tools/dev/serve-dist.mjs';
import { zipNames } from '../tools/dev/zip-names.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const sep = path.sep;

test('a request path resolves inside dist and never outside it', () => {
  const base = path.join(os.tmpdir(), 'hushfall-dist-x');
  assert.equal(resolveInDist('/', base), path.join(base, 'index.html'));
  assert.equal(resolveInDist('/assets/a.js?v=3#x', base), path.join(base, 'assets', 'a.js'));
  for (const bad of ['/../secret.txt', '/..%2f..%2fsecret.txt', '/a/../../b', '/%00', '/..\\..\\x', '%E0%A4%A']) {
    const r = resolveInDist(bad, base); assert.ok(r === null || r.startsWith(base + sep), bad + ' -> ' + r);
  }
});

test('the local server serves a file with its type, 404s a missing one, refuses a write and a path outside', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hushfall-serve-')); fs.writeFileSync(path.join(dir, 'index.html'), '<!doctype html><title>x</title>'); fs.mkdirSync(path.join(dir, 'assets')); fs.writeFileSync(path.join(dir, 'assets', 'a.js'), 'export {}');
  fs.writeFileSync(path.join(dir, '..', 'hushfall-outside.txt'), 'no');
  const server = makeServer(dir); await new Promise((r) => server.listen(0, '127.0.0.1', r)); const port = server.address().port;
  const get = (p, method = 'GET') => new Promise((res, rej) => { const q = http.request({ host: '127.0.0.1', port, path: p, method }, (r) => { let b = ''; r.on('data', (c) => { b += c; }); r.on('end', () => res({ status: r.statusCode, type: r.headers['content-type'], body: b })); }); q.on('error', rej); q.end(); });
  try {
    const home = await get('/'); assert.equal(home.status, 200); assert.match(home.type, /text\/html/); assert.match(home.body, /<title>x<\/title>/);
    const js = await get('/assets/a.js'); assert.equal(js.status, 200); assert.match(js.type, /javascript/);
    assert.equal((await get('/nope.png')).status, 404);
    assert.equal((await get('/', 'POST')).status, 405);
    assert.ok([403, 404].includes((await get('/..%2fhushfall-outside.txt')).status));
  } finally { await new Promise((r) => server.close(r)); fs.rmSync(dir, { recursive: true, force: true }); fs.rmSync(path.join(dir, '..', 'hushfall-outside.txt'), { force: true }); }
});

/** a stored (uncompressed) zip with the given names: enough for the reader */
function tinyZip(names) {
  const parts = [], cen = []; let off = 0;
  for (const n of names) {
    const name = Buffer.from(n), lh = Buffer.alloc(30); lh.writeUInt32LE(0x04034b50, 0); lh.writeUInt16LE(20, 4); lh.writeUInt16LE(name.length, 26);
    const ch = Buffer.alloc(46); ch.writeUInt32LE(0x02014b50, 0); ch.writeUInt16LE(20, 4); ch.writeUInt16LE(20, 6); ch.writeUInt16LE(name.length, 28); ch.writeUInt32LE(off, 42);
    parts.push(lh, name); cen.push(ch, name); off += 30 + name.length;
  }
  const cd = Buffer.concat(cen), end = Buffer.alloc(22); end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(names.length, 8); end.writeUInt16LE(names.length, 10); end.writeUInt32LE(cd.length, 12); end.writeUInt32LE(off, 16);
  return Buffer.concat([...parts, cd, end]);
}

test('the zip reader lists the entry names of an archive, and nothing for a file that is not one', () => {
  const f = path.join(os.tmpdir(), 'hushfall-tiny-' + process.pid + '.zip'); fs.writeFileSync(f, tinyZip(['index.html', 'assets/a.js', 'assets/b.png']));
  try { assert.deepEqual(zipNames(f), ['index.html', 'assets/a.js', 'assets/b.png']); fs.writeFileSync(f, 'not a zip at all'); assert.deepEqual(zipNames(f), []); } finally { fs.rmSync(f, { force: true }); }
});

test('the package tool is wired: npm scripts, an output outside the repository, the checks it must run', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8')), src = fs.readFileSync(path.join(ROOT, 'tools/dev/package-web.mjs'), 'utf8');
  assert.equal(pkg.scripts.package, 'node tools/dev/package-web.mjs'); assert.equal(pkg.scripts.play, 'node tools/dev/serve-dist.mjs');
  assert.ok(src.includes("path.join(root, '..', 'Doom_release')"), 'the zip goes outside the repository'); assert.ok(src.includes('check-dist.mjs') && src.includes('zipNames(zip)') && src.includes('index.html is not at the root'));
});
