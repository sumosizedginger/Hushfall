// THE KEY ART (PT-071, R23): the title screen IS the key art (the painted harbour, the lamp and the bell tower, the name), so it is photographed from the page itself and never composed by hand: the name and the tagline are whatever
// the page says, so when the owner changes the name this is run again. The menu is hidden (it is a menu, not a picture) and the crops are the page's own pixels at the sizes a store asks for. One headless-Chrome job
// (tools/dev/low.ps1, absolute paths; the pointer lock is refused and counted).
//   node tools/dev/store-title.mjs <outDir>      key-art-1920x1080.png, banner-1280x320.png, capsule-630x500.png (itch.io's cover), square-512.png
import { createServer } from 'vite';
import puppeteer from 'puppeteer';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '../..'), out = path.resolve(process.argv[2] ?? 'store-title'); fs.mkdirSync(out, { recursive: true });
const server = await createServer({ root, logLevel: 'error', server: { port: 5800 + (process.pid % 90), strictPort: false } }); await server.listen();
const browser = await puppeteer.launch({ headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage();
await page.evaluateOnNewDocument(() => { window.__lockCalls = 0; navigator.getGamepads = () => [null, null, null, null]; Element.prototype.requestPointerLock = function () { window.__lockCalls++; return Promise.reject(new DOMException('refused by the tool', 'NotAllowedError')); }; });
await page.setViewport({ width: 1920, height: 1080 });
await page.goto(`http://localhost:${server.config.server.port}/`, { waitUntil: 'domcontentloaded', timeout: 0 });
await page.waitForFunction('window.__GAME_TEST__ && window.__GAME_TEST__.ready', { timeout: 180000 });
const prepare = (logo) => page.evaluate((logo) => {
  window.__GAME_TEST__.showScreen('title', { canContinue: false });
  for (const el of document.querySelectorAll('#screen-title .panel > *')) { const keep = el.tagName === 'H1' || (logo === 'full' && el.classList.contains('sub') && el.id !== 'difficulty-note'); el.style.visibility = keep ? 'visible' : 'hidden'; }
  const h1 = document.querySelector('#screen-title h1'); if (h1) { if (logo === 'capsule') { h1.style.cssText = 'position:fixed;left:880px;top:780px;margin:0;font-size:104px;text-shadow:0 0 18px #000,0 0 6px #000,3px 3px 0 #000;z-index:9'; } else h1.style.cssText = ''; }
  for (const id of ['dev-levels', 'title-note']) { const e = document.getElementById(id); if (e) e.style.display = 'none'; }
  const hint = document.querySelector('#screen-title .panel .hint, #screen-title #controls-hint'); if (hint) hint.style.display = 'none';
}, logo);
const shot = async (name, clip, w, h, logo) => {
  const dsf = Math.min(w / clip.width, h / clip.height);
  await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: dsf }); await prepare(logo); await new Promise((r) => setTimeout(r, 900));
  await page.screenshot({ path: path.join(out, name), clip }); console.log('wrote', name, `${w}x${h}`);
};
await shot('key-art-1920x1080.png', { x: 0, y: 0, width: 1920, height: 1080 }, 1920, 1080, 'full');
await shot('banner-1280x320.png', { x: 60, y: 170, width: 1800, height: 450 }, 1280, 320, 'full');
await shot('capsule-630x500.png', { x: 860, y: 140, width: 1000, height: 794 }, 630, 500, 'capsule');
await shot('square-512.png', { x: 1000, y: 140, width: 830, height: 830 }, 512, 512, 'capsule-none');
console.log('pointer-lock requests', await page.evaluate(() => window.__lockCalls));
await browser.close(); await server.close();
