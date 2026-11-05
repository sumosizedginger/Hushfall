import { createRequire } from 'node:module';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { parseMap } from '../src/engine/mapformat.js';

export const ROOT = path.resolve(import.meta.dirname, '..');
const TEMP_DIRS = new Set();
/** a scratch folder that is gone when the test file ends (PT-086: tests that kept their mkdtemp folders left over 4,000 of them in the owner's Temp on a full C drive) */
export function tempDir(prefix) {
  if (!TEMP_DIRS.size)
    process.on('exit', () => {
      for (const dir of TEMP_DIRS) fs.rmSync(dir, { recursive: true, force: true });
    });
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  TEMP_DIRS.add(dir);
  return dir;
}
const acorn = createRequire(path.join(ROOT, 'package.json'))('acorn');
// Engine tests run on FROZEN FIXTURES (tests/fixtures): the original hall-and-quay test layout and its routes.
// They stay stable while the shipped level in maps/ is redesigned. Tests of the shipped level use the shipped* helpers.
export const mapSrc = (id = 'C1E1M01') => JSON.parse(fs.readFileSync(path.join(ROOT, 'tests/fixtures', id + '.json'), 'utf8'));
export const loadMap = (id = 'C1E1M01') => parseMap(mapSrc(id));
export const route = (name) => JSON.parse(fs.readFileSync(path.join(ROOT, 'tests/fixtures', name + '.route.json'), 'utf8'));
export const mapLoader = (id) => (id === 'C1E1M01' ? loadMap(id) : null);
/** replace a grid cell in a map source (tests mutate copies, never the file) */
export const setTile = (src, cx, cz, ch) => {
  const r = [...src.grid[cz]];
  r[cx] = ch;
  src.grid[cz] = r.join('');
  return src;
};

// the level that actually ships
export const shippedSrc = (id = 'C1E1M01') => JSON.parse(fs.readFileSync(path.join(ROOT, 'maps', id + '.json'), 'utf8'));
export const shippedMap = (id = 'C1E1M01') => parseMap(shippedSrc(id));
export const shippedRoute = (name) => JSON.parse(fs.readFileSync(path.join(ROOT, 'routes', name + '.route.json'), 'utf8'));
/** a source file as one line: no comments, one space between tokens, no trailing commas: for a test that checks how the shell is wired, whatever the formatter did with the lines */
export const flatSource = (rel) => {
  const text = fs.readFileSync(path.join(ROOT, rel), 'utf8'),
    comments = [];
  acorn.parse(text, { ecmaVersion: 'latest', sourceType: 'module', onComment: comments });
  let out = '',
    at = 0;
  for (const c of comments) {
    out += text.slice(at, c.start) + ' ';
    at = c.end;
  }
  out += text.slice(at);
  return out
    .replace(/\s+/g, ' ')
    .replace(/,\s*([)}\]])/g, ' $1')
    .replace(/\(\s+/g, '(')
    .replace(/\s+\)/g, ')')
    .replace(/\s+\./g, '.');
};
