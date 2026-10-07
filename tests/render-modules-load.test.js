// Every render module must at least LOAD. On 2026-10-07 a duplicate `const` in view.js ("Identifier 'wp' has already been declared") stopped the whole game on its loading screen, and nothing in the
// suite imported view.js, so 380 tests passed over a game that did not start. This imports each module of src/render (textures.js is Vite-only: import.meta.glob) the way the browser does.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const dir = path.resolve(import.meta.dirname, '../src/render');
const VITE_ONLY = new Set(['textures.js']);

test('every module in src/render loads (a syntax error or a duplicate declaration would stop the game on its loading screen)', async () => {
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.js') && !VITE_ONLY.has(f)).sort(), bad = [];
  assert.ok(files.includes('view.js') && files.includes('models_choir.js') && files.includes('weapon-pose.js'), 'the render modules are where the test expects them');
  for (const f of files) { try { await import(pathToFileURL(path.join(dir, f)).href); } catch (e) { bad.push(`${f}: ${e.message}`); } }
  assert.equal(bad.length, 0, bad.join(' | '));
});

test('GameView is exported and constructible as a class (the game builds one per level)', async () => {
  const { GameView } = await import(pathToFileURL(path.join(dir, 'view.js')).href);
  assert.equal(typeof GameView, 'function'); assert.ok(GameView.prototype.update || Object.getOwnPropertyNames(GameView.prototype).length > 3, 'GameView has methods');
});
