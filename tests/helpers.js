import fs from 'node:fs';
import path from 'node:path';
import { parseMap } from '../src/engine/mapformat.js';

export const ROOT = path.resolve(import.meta.dirname, '..');
// Engine tests run on FROZEN FIXTURES (tests/fixtures): the original hall-and-quay test layout and its routes.
// They stay stable while the shipped level in maps/ is redesigned. Tests of the shipped level use the shipped* helpers.
export const mapSrc = (id = 'C1E1M01') => JSON.parse(fs.readFileSync(path.join(ROOT, 'tests/fixtures', id + '.json'), 'utf8'));
export const loadMap = (id = 'C1E1M01') => parseMap(mapSrc(id));
export const route = (name) => JSON.parse(fs.readFileSync(path.join(ROOT, 'tests/fixtures', name + '.route.json'), 'utf8'));
export const mapLoader = (id) => (id === 'C1E1M01' ? loadMap(id) : null);
/** replace a grid cell in a map source (tests mutate copies, never the file) */
export const setTile = (src, cx, cz, ch) => { const r = [...src.grid[cz]]; r[cx] = ch; src.grid[cz] = r.join(''); return src; };

// the level that actually ships
export const shippedSrc = (id = 'C1E1M01') => JSON.parse(fs.readFileSync(path.join(ROOT, 'maps', id + '.json'), 'utf8'));
export const shippedMap = (id = 'C1E1M01') => parseMap(shippedSrc(id));
export const shippedRoute = (name) => JSON.parse(fs.readFileSync(path.join(ROOT, 'routes', name + '.route.json'), 'utf8'));
