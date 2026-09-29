import fs from 'node:fs';
import path from 'node:path';
import { parseMap } from '../src/engine/mapformat.js';

export const ROOT = path.resolve(import.meta.dirname, '..');
export const mapSrc = (id = 'C1E1M01') => JSON.parse(fs.readFileSync(path.join(ROOT, 'maps', id + '.json'), 'utf8'));
export const loadMap = (id = 'C1E1M01') => parseMap(mapSrc(id));
export const route = (name) => JSON.parse(fs.readFileSync(path.join(ROOT, 'routes', name + '.route.json'), 'utf8'));
export const mapLoader = (id) => (id === 'C1E1M01' ? loadMap(id) : null);
/** replace a grid cell in a map source (tests mutate copies, never the file) */
export const setTile = (src, cx, cz, ch) => { const r = [...src.grid[cz]]; r[cx] = ch; src.grid[cz] = r.join(''); return src; };
