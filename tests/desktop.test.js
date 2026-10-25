// FREEZE F18, the desktop wrapper (tools/desktop, a prototype outside the web build): the one piece of it that decides what the page may read, and the security posture of its window. The wrapper's own smoke run (a hidden Electron window that loads the built game
// and waits for the title screen) is `cd tools/desktop && npm run smoke` and needs an Electron install and a build; this holds what node can.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { ROOT } from './helpers.js';

const require = createRequire(import.meta.url), { resolveAppPath, typeOf } = require('../tools/desktop/appfiles.cjs');
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'desk-')), outside = fs.mkdtempSync(path.join(os.tmpdir(), 'desk-out-'));
fs.mkdirSync(path.join(root, 'assets', 'baked'), { recursive: true }); fs.writeFileSync(path.join(root, 'index.html'), '<html></html>'); fs.writeFileSync(path.join(root, 'assets', 'app.js'), 'x'); fs.writeFileSync(path.join(root, 'assets', 'baked', 'a b.png'), 'x'); fs.writeFileSync(path.join(root, '.secret'), 'x'); fs.writeFileSync(path.join(outside, 'loot.txt'), 'x');

test('the root and the plain files resolve; a missing file, a folder and a query or hash are handled', () => {
  assert.equal(resolveAppPath(root, '/'), path.join(root, 'index.html')); assert.equal(resolveAppPath(root, ''), path.join(root, 'index.html')); assert.equal(resolveAppPath(root, '/index.html?x=1#y'), path.join(root, 'index.html'));
  assert.equal(resolveAppPath(root, '/assets/app.js'), path.join(root, 'assets', 'app.js')); assert.equal(resolveAppPath(root, '/assets/baked/a%20b.png'), path.join(root, 'assets', 'baked', 'a b.png'));
  assert.equal(resolveAppPath(root, '/nope.js'), null); assert.equal(resolveAppPath(root, '/assets'), null, 'a folder is not a file'); assert.equal(resolveAppPath(root, '/assets/'), null);
});

test('nothing outside the folder, no dot file, no backslash, no null byte, no bad escape', () => {
  const loot = path.relative(root, path.join(outside, 'loot.txt')).split(path.sep).join('/');
  for (const bad of ['/../' + loot, '/assets/../../' + loot, '/%2e%2e/' + loot, '/..%2f..%2f' + loot, '/assets/%2e%2e/%2e%2e/' + loot, '/./index.html', '/.secret', '/assets/.hidden', '/assets\\app.js', '/index.html\0.png', '/%E0%A4%A', '/%00']) assert.equal(resolveAppPath(root, bad), null, JSON.stringify(bad));
  assert.equal(resolveAppPath(root, '/assets/../index.html'), null, 'even a harmless dot-dot is refused: the page never needs one');
});

test('content types: the ones a game build holds, and a safe default', () => {
  assert.equal(typeOf('x/index.html'), 'text/html; charset=utf-8'); assert.equal(typeOf('a.js'), 'text/javascript; charset=utf-8'); assert.equal(typeOf('a.PNG'), 'image/png'); assert.equal(typeOf('a.wav'), 'audio/wav'); assert.equal(typeOf('a.unknown'), 'application/octet-stream');
});

test('the window keeps the page as it ships: no Node in the page, a sandbox, no new windows, no navigation off its own scheme, only pointer lock and fullscreen allowed', () => {
  const main = fs.readFileSync(path.join(ROOT, 'tools/desktop/main.cjs'), 'utf8');
  for (const flag of ['contextIsolation: true', 'nodeIntegration: false', 'sandbox: true', 'webSecurity: true']) assert.ok(main.includes(flag), flag);
  assert.match(main, /setWindowOpenHandler[\s\S]*?action: 'deny'/); assert.match(main, /will-navigate[\s\S]*?preventDefault/); assert.match(main, /permission === 'pointerLock' \|\| permission === 'fullscreen'/);
  assert.ok(!/nodeIntegration: true|contextIsolation: false|webSecurity: false|allowRunningInsecureContent/.test(main), 'no weakening flag');
  assert.match(main, /show: !SMOKE/, 'the smoke run opens nothing on the screen');
});

test('the wrapper is its own package, outside the game\'s: Electron is pinned there and nowhere else', () => {
  const own = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools/desktop/package.json'), 'utf8')), game = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
  assert.match(own.devDependencies.electron, /^\d+\.\d+\.\d+$/, 'an exact version'); assert.equal(own.private, true);
  assert.ok(!JSON.stringify(game).includes('electron'), 'the game\'s package does not know about it'); assert.ok(fs.existsSync(path.join(ROOT, 'tools/desktop/package-lock.json')), 'a lockfile is kept');
  assert.ok(fs.existsSync(path.join(ROOT, 'tools/desktop/README.md')));
});
