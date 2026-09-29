// Rebuild assets/baked/manifest.json from the PNGs on disk + recipe metadata. Use after parallel bakes (BAKE_PORT), which race on the manifest.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { PNG } from 'pngjs';
import { recipes } from '../baker/all.js';

const dir = path.resolve(import.meta.dirname, '../../assets/baked'), mp = path.join(dir, 'manifest.json');
const prev = fs.existsSync(mp) ? JSON.parse(fs.readFileSync(mp, 'utf8')) : { assets: {} };
const assets = {};
for (const [id, r] of Object.entries(recipes)) {
  const f = path.join(dir, id + '.png'); if (!fs.existsSync(f)) continue;
  const buf = fs.readFileSync(f), img = PNG.sync.read(buf);
  assets[id] = { seed: r.seed, width: img.width, height: img.height, transparent: !!r.transparent, sha256: crypto.createHash('sha256').update(buf).digest('hex'), bytes: buf.length };
}
fs.writeFileSync(mp, JSON.stringify({ generatedBy: 'tools/bake.mjs + tools/dev/refresh-manifest.mjs', env: prev.env, assets }, null, 2));
console.log('manifest:', Object.keys(assets).length, 'assets');
