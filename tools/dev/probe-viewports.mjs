// THE VIEWPORT MATRIX (PT-071, R21 stability): the game's own screens at the window sizes a player has, in the real page: does anything run past the edge (a panel wider than the window, a button below the fold of a screen that cannot scroll),
// and is the canvas the shape of the window. One headless-Chrome job (run it through tools/dev/low.ps1 with absolute paths; the pointer lock is refused before any page script runs and the count is printed: it must be 0).
//   node tools/dev/probe-viewports.mjs <outFile.json>        sizes: 800x600 1024x768 1280x720 1366x768 1600x900 1920x1080 2560x1440 3440x1440, and a portrait tablet 768x1024
import { createServer } from 'vite';
import puppeteer from 'puppeteer';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '../..'), outFile = path.resolve(process.argv[2] ?? 'viewports.json');
const SIZES = [[800, 600], [1024, 768], [1280, 720], [1366, 768], [1600, 900], [1920, 1080], [2560, 1440], [3440, 1440], [768, 1024]];
const SCREENS = ['title', 'pause', 'dead', 'record', 'credits', 'crash'];
const server = await createServer({ root, logLevel: 'error', server: { port: 5600 + (process.pid % 90), strictPort: false } }); await server.listen();
const port = server.config.server.port;
const browser = await puppeteer.launch({ headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage();
await page.evaluateOnNewDocument(() => { window.__lockCalls = 0; navigator.getGamepads = () => [null, null, null, null]; Element.prototype.requestPointerLock = function () { window.__lockCalls++; return Promise.reject(new DOMException('refused by the tool', 'NotAllowedError')); }; });
const errors = []; page.on('pageerror', (e) => errors.push('pageerror: ' + e)); page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text().slice(0, 200)); });
await page.setViewport({ width: 1280, height: 720 });
await page.goto(`http://localhost:${port}/`, { waitUntil: 'domcontentloaded', timeout: 0 });
await page.waitForFunction('window.__GAME_TEST__ && window.__GAME_TEST__.ready', { timeout: 180000 });

const result = { sizes: {}, errors, lockCalls: 0 };
for (const [w, h] of SIZES) {
  await page.setViewport({ width: w, height: h });
  const rows = {};
  for (const name of SCREENS) {
    const r = await page.evaluate(async (screen) => {
      try { window.__GAME_TEST__.showScreen(screen, screen === 'title' ? { canContinue: true } : screen === 'pause' ? { canLoad: true } : screen === 'dead' ? { canLoad: true } : screen === 'crash' ? { text: 'x' } : screen === 'record' ? { view: [], counts: { all: 0, docs: 0 }, current: null, scenes: [] } : {}); } catch (e) { return { error: String(e).slice(0, 120) }; }
      await new Promise((res) => requestAnimationFrame(() => requestAnimationFrame(res)));
      const el = document.getElementById('screen-' + screen); if (!el || el.classList.contains('hidden')) return { hidden: true };
      for (const d of el.querySelectorAll('details')) d.open = true;                                             // the worst case: every fold open
      await new Promise((res) => requestAnimationFrame(() => requestAnimationFrame(res)));
      const W = innerWidth, H = innerHeight, bad = [];
      const scrollable = (n) => { for (let p = n; p && p !== document.body; p = p.parentElement) { const oy = getComputedStyle(p).overflowY; if ((oy === 'auto' || oy === 'scroll') && p.scrollHeight > p.clientHeight) return true; } return false; };
      for (const n of el.querySelectorAll('button, input, select, h1, h2, .panel')) {
        const s = getComputedStyle(n); if (s.display === 'none' || s.visibility === 'hidden' || n.closest('.hidden') || (n.id || '').startsWith('dev-') || n.closest('#dev-levels')) continue;                 // (the level picker is a dev-build feature)
        const b = n.getBoundingClientRect(); if (b.width === 0 || b.height === 0) continue;
        if (b.left < -1 || b.right > W + 1) bad.push(`${n.tagName.toLowerCase()}#${n.id || n.className || ''} runs past the side (${Math.round(b.left)}..${Math.round(b.right)} of ${W})`);
        else if ((b.top < -1 || b.bottom > H + 1) && !scrollable(n)) bad.push(`${n.tagName.toLowerCase()}#${n.id || n.className || ''} is off the bottom or top and nothing scrolls (${Math.round(b.top)}..${Math.round(b.bottom)} of ${H})`);
      }
      return { bad: bad.slice(0, 8), docScrollsSideways: document.documentElement.scrollWidth > W + 1 };
    }, name);
    rows[name] = r;
  }
  const canvas = await page.evaluate(() => { const c = document.querySelector('canvas'); const b = c?.getBoundingClientRect(); return b ? { w: Math.round(b.width), h: Math.round(b.height), cover: b.width >= innerWidth - 1 && b.height >= innerHeight - 1 } : null; });
  result.sizes[`${w}x${h}`] = { screens: rows, canvas };
}
result.lockCalls = await page.evaluate(() => window.__lockCalls);
const problems = []; for (const [size, v] of Object.entries(result.sizes)) { if (v.canvas && !v.canvas.cover) problems.push(`${size}: the canvas does not cover the window (${v.canvas.w}x${v.canvas.h})`); for (const [name, r] of Object.entries(v.screens)) { if (r?.error) problems.push(`${size} ${name}: ${r.error}`); if (r?.docScrollsSideways) problems.push(`${size} ${name}: the page scrolls sideways`); for (const b of r?.bad ?? []) problems.push(`${size} ${name}: ${b}`); } }
result.problems = problems; fs.writeFileSync(outFile, JSON.stringify(result, null, 1));
console.log(`viewport matrix: ${SIZES.length} sizes x ${SCREENS.length} screens, ${problems.length} problem(s), pointer-lock requests ${result.lockCalls}, page errors ${errors.length}`); for (const p of problems.slice(0, 30)) console.log('  ' + p);
await browser.close(); await server.close();
