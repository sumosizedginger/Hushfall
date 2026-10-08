// Canonical asset baker driver: serves tools/baker with vite, runs it in headless Chrome, saves PNGs.
// Usage: node tools/bake.mjs [assetId ...]      BAKE_PREVIEW=<dir> writes the PNGs there and touches neither assets/baked nor the manifest (recipe iteration: PT-021)
import { createServer } from 'vite';
import puppeteer from 'puppeteer';
import { PNG } from 'pngjs';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const root = path.resolve(import.meta.dirname, '..');
const PREVIEW = process.env.BAKE_PREVIEW ? path.resolve(process.env.BAKE_PREVIEW) : null, outDir = PREVIEW ?? path.join(root, 'assets', 'baked');
fs.mkdirSync(outDir, { recursive: true });
const want = process.argv.slice(2);

const server = await createServer({ root: path.join(root, 'tools/baker'), logLevel: 'error', server: { port: Number(process.env.BAKE_PORT || 5199), strictPort: true, fs: { allow: [root] } } });
await server.listen();
const browser = await puppeteer.launch({ headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const errors = [];
async function job(id, bg) {
  const page = await browser.newPage();
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  // domcontentloaded: the bake runs synchronously in a module script and can outlast the load event
  await page.goto(`http://localhost:${process.env.BAKE_PORT || 5199}/?asset=${id}&bg=${encodeURIComponent(bg)}`, { waitUntil: 'domcontentloaded', timeout: 0 });
  await page.waitForFunction('window.__BAKE_DONE__ === true || window.__BAKE_ERROR__', { timeout: 300000 });
  const err = await page.evaluate('window.__BAKE_ERROR__');
  if (err) throw new Error(err);
  const res = await page.evaluate('window.__BAKE_RESULT__');
  env = await page.evaluate('window.__BAKE_ENV__');
  await page.close();
  return res;
}
let env;
const recipeIds = (await import('./baker/all.js')).recipes;
const ids = want.length ? want : Object.keys(recipeIds);
const results = [];
for (const id of ids) {
  if (recipeIds[id].transparent) { results.push(await job(id, '#000000')); results.push(await job(id, '#ffffff')); }
  else results.push(await job(id, '#000000'));
}
if (errors.length) { console.error('BAKE ERRORS', errors); await browser.close(); await server.close(); process.exit(1); }

const decode = (r) => PNG.sync.read(Buffer.from(r.dataUrl.split(',')[1], 'base64'));
// difference matting: over-black = a*C, over-white = a*C + (1-a)  =>  a = 1 - (W-B), C = B/a
// Optional alpha hardening (recipe.alphaCurve = [lo, hi]) turns washy brush coverage into solid bodies with crisp edges.
const smooth = (lo, hi, x) => { const t = Math.min(1, Math.max(0, (x - lo) / (hi - lo))); return t * t * (3 - 2 * t); };
function matte(black, white, curve) {
  const out = new PNG({ width: black.width, height: black.height });
  for (let i = 0; i < black.data.length; i += 4) {
    const d = [0, 1, 2].map((k) => (white.data[i + k] - black.data[i + k]) / 255);
    const a0 = Math.min(1, Math.max(0, 1 - (d[0] + d[1] + d[2]) / 3));
    const a = curve ? smooth(curve[0], curve[1], a0) : a0;
    out.data[i + 3] = Math.round(a * 255);
    for (let k = 0; k < 3; k++) out.data[i + k] = a0 > 0.004 && a > 0 ? Math.min(255, Math.round(black.data[i + k] / a0)) : 0; // colour un-premultiplied with the TRUE coverage
  }
  return out;
}

const mp = path.join(outDir, 'manifest.json');
const prev = fs.existsSync(mp) ? JSON.parse(fs.readFileSync(mp, 'utf8')) : { assets: {} };
const manifest = { generatedBy: 'tools/bake.mjs', env, assets: prev.assets };
const byId = new Map();
for (const r of results) { if (!byId.has(r.id)) byId.set(r.id, []); byId.get(r.id).push(r); }
for (const [id, rs] of byId) {
  const r = rs[0];
  const buf = r.transparent
    ? PNG.sync.write(matte(decode(rs.find((x) => x.bg === '#000000')), decode(rs.find((x) => x.bg === '#ffffff')), recipeIds[id].alphaCurve))
    : Buffer.from(r.dataUrl.split(',')[1], 'base64');
  fs.writeFileSync(path.join(outDir, id + '.png'), buf);
  manifest.assets[id] = { seed: r.seed, width: r.width, height: r.height, transparent: r.transparent, sha256: crypto.createHash('sha256').update(buf).digest('hex'), bytes: buf.length };
  console.log('baked', id, r.width + 'x' + r.height, 'seed', r.seed, r.transparent ? '(matted alpha)' : '');
}
if (!PREVIEW) fs.writeFileSync(mp, JSON.stringify(manifest, null, 2));
await browser.close();
await server.close();
