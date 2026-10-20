// The repo layout rule (AGENTS.md "Repo hygiene", PT-050 and T2): the root holds the project documents, the package files, the pages and the named folders, pictures and audio never enter git
// outside assets/baked, and every file an npm script runs exists. A new top-level file or folder is added to ROOT_ALLOWED here AND to the "Persistent files" list in AGENTS.md.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const ROOT = path.resolve(import.meta.dirname, '..');
const ROOT_ALLOWED = new Set([
  '.claude', '.gitignore',
  'AGENTS.md', 'ARCHITECTURE.md', 'ART_BIBLE.md', 'CAMPAIGN_MANIFEST.json', 'CLAUDE.md', 'GAME_VISION.md', 'LICENSE', 'PLAYTEST_NOTES.md', 'PRODUCTION_LOG.md', 'TESTING.md', 'THIRD_PARTY_NOTICES.md',
  'package.json', 'package-lock.json', 'index.html', 'pad.html', 'vite.config.js',
  'assets', 'attack', 'design', 'maps', 'maps-dev', 'maps-src', 'review', 'routes', 'src', 'tests', 'tools', 'validation',
]);

let tracked = null;
try { tracked = execFileSync('git', ['ls-files', '-z'], { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }).split('\0').filter(Boolean); } catch { /* no git here: the git-based tests skip */ }

test('the root of the repository holds only what AGENTS.md names', { skip: !tracked && 'no git' }, () => {
  const top = [...new Set(tracked.map((f) => f.split('/')[0]))].sort();
  assert.deepEqual(top.filter((t) => !ROOT_ALLOWED.has(t)), [], 'a tracked top-level entry that the layout rule does not allow: move it (or archive it to D:/Doom_archive and list it in design/ARCHIVE_INDEX.md), or add it to ROOT_ALLOWED and to AGENTS.md "Persistent files"');
});

test('pictures and audio are never tracked outside assets/baked (review stills stay on disk, git-ignored)', { skip: !tracked && 'no git' }, () => {
  const bad = tracked.filter((f) => /\.(png|jpe?g|gif|webp|wav|mp3|ogg)$/i.test(f) && !f.startsWith('assets/baked/'));
  assert.deepEqual(bad, [], 'a picture or sound is tracked outside assets/baked: `git rm --cached` it (a document that must show one picture uses `git add -f` for that single file and is listed here)');
});

test('retired things stay retired: the look demo and the archived one-off still jobs are not in the tree', () => {
  for (const f of ['look.html', 'src/look', 'tools/dev/shoot-look.mjs']) assert.equal(fs.existsSync(path.join(ROOT, f)), false, `${f} was archived in T2 (D:/Doom_archive/2026-10-20)`);
  const stale = fs.readdirSync(path.join(ROOT, 'tools/dev')).filter((f) => /^shoot-pt\d+\.mjs$/.test(f));
  assert.deepEqual(stale, [], 'one-off still jobs were folded away in T2: use shoot-map / shoot-rigs / audit-capture / probe-* instead');
});

test('every file an npm script runs exists', () => {
  const scripts = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8')).scripts;
  const missing = [];
  for (const [name, cmd] of Object.entries(scripts)) for (const m of cmd.matchAll(/\b(?:node|vite)\s+(?:--[\w-]+\s+)*"?((?:tools|tests|src)\/[\w./-]+\.(?:mjs|js))/g)) if (!fs.existsSync(path.join(ROOT, m[1]))) missing.push(`${name}: ${m[1]}`);
  assert.deepEqual(missing, []);
});
