// Concept-sheet driver for design/LOOK_BIBLE.md (L0, design only). Serves tools/look with vite, runs each concept in its own headless-Chrome page (p5.brush binds GL state to the first p5 instance per page),
// and writes review/look-bible/<id>.png. It NEVER writes assets/baked or its manifest and never touches src/: nothing here is a game asset, so no evidence goes stale.
//   node tools/look/bake-concepts.mjs [id ...]      (no ids = every concept)
//   LOOK_PORT=5198 by default (the asset baker uses 5199)
import { createServer } from 'vite';
import puppeteer from 'puppeteer';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '../..');
const outDir = path.join(root, 'review', 'look-bible');
fs.mkdirSync(outDir, { recursive: true });
const port = Number(process.env.LOOK_PORT || 5198);
const { recipes } = await import('./recipes_look.js');
const want = process.argv.slice(2), ids = want.length ? want : Object.keys(recipes);
const server = await createServer({ root: path.join(root, 'tools/look'), logLevel: 'error', server: { port, strictPort: true, fs: { allow: [root] } } });
await server.listen();
const browser = await puppeteer.launch({ headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const errors = [];
const TRANSIENT = new Set(['UNKNOWN', 'EBUSY', 'EPERM', 'EACCES']);
const write = async (file, buf) => { for (let i = 1; ; i++) { try { fs.writeFileSync(file, buf); return; } catch (e) { if (!TRANSIENT.has(e.code) || i > 5) throw e; await new Promise((r) => setTimeout(r, 250 * i)); } } };
for (const id of ids) {
  if (!recipes[id]) { errors.push('unknown concept ' + id); continue; }
  const page = await browser.newPage();
  page.on('pageerror', (e) => errors.push(id + ': ' + String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(id + ': ' + m.text()); });
  await page.goto(`http://localhost:${port}/?asset=${id}`, { waitUntil: 'domcontentloaded', timeout: 0 });
  await page.waitForFunction('window.__BAKE_DONE__ === true || window.__BAKE_ERROR__', { timeout: 300000 });
  const err = await page.evaluate('window.__BAKE_ERROR__');
  if (err) errors.push(id + ': ' + err);
  else { const res = await page.evaluate('window.__BAKE_RESULT__'); await write(path.join(outDir, id + '.png'), Buffer.from(res.dataUrl.split(',')[1], 'base64')); console.log('drew', id, res.width + 'x' + res.height); }
  await page.close();
}
await browser.close(); await server.close();
if (errors.length) { console.error('CONCEPT ERRORS', errors); process.exit(1); }
