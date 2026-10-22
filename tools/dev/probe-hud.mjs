// THE HUD PROBE (FREEZE F2 and F3, round 1: Grok's "the lantern's oil count sits on the weapon bar" and "the corner map is a dark box"; Gemini's and Codex's "the labels are small at 1080p"): the in-game HUD with EVERYTHING switched on, in the real page.
// Silent Roots (C2M26) has the lantern and the noise tell; the player is given all the guns, all three keys, a load and the unread-log badge. At each window size: does any HUD element run past the window or onto another, how large is its text,
// and what does the corner map look like. One headless-Chrome job (run it through tools/dev/low.ps1 with absolute paths; the pointer lock is refused before any page script runs and the count is printed: it must be 0).
//   node tools/dev/probe-hud.mjs <outDir> [mapId]        writes <outDir>/hud.json and <outDir>/hud-<w>x<h>.png (the bottom strip), corner-<w>x<h>.png (the top right) and full-<w>x<h>.png for the two sizes named in FULL
import { createServer } from 'vite';
import puppeteer from 'puppeteer';
import fs from 'node:fs';
import path from 'node:path';
import { WEAPONS } from '../../src/engine/defs.js';

const root = path.resolve(import.meta.dirname, '../..'), outDir = path.resolve(process.argv[2] ?? 'hud-probe'), mapId = process.argv[3] ?? 'C2M26';
const SIZES = [[1024, 600], [1024, 768], [1280, 720], [1366, 768], [1600, 900], [1920, 1080], [2560, 1440]], FULL = new Set(['1280x720', '1920x1080']);
fs.mkdirSync(outDir, { recursive: true });
const server = await createServer({ root, logLevel: 'error', server: { port: 5700 + (process.pid % 90), strictPort: false } }); await server.listen();
const port = server.config.server.port;
const browser = await puppeteer.launch({ headless: true, args: process.env.GPU ? [] : ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage();
await page.evaluateOnNewDocument(() => { window.__lockCalls = 0; navigator.getGamepads = () => [null, null, null, null]; Element.prototype.requestPointerLock = function () { window.__lockCalls++; return Promise.reject(new DOMException('refused by the tool', 'NotAllowedError')); }; });
const errors = []; page.on('pageerror', (e) => errors.push('pageerror: ' + e)); page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text().slice(0, 200)); });
await page.setViewport({ width: 1280, height: 720 });
await page.goto(`http://localhost:${port}/`, { waitUntil: 'domcontentloaded', timeout: 0 });
await page.waitForFunction('window.__GAME_TEST__ && window.__GAME_TEST__.ready', { timeout: 180000 });
await page.evaluate((id, weapons) => {
  const t = window.__GAME_TEST__; t.newGame('normal', 1, { mapId: id });
  t.setup_player({ weapons, keys: ['brass', 'iron', 'bell'], loads: { flare: { slag: 4, rime: 2 } }, lamp: { oil: 148, max: 300, on: true } });
  t.tick(2);
}, mapId, Object.keys(WEAPONS));
const result = { map: mapId, sizes: {}, errors, lockCalls: 0 };
for (const [w, h] of SIZES) {
  await page.setViewport({ width: w, height: h });
  await page.evaluate(() => { window.__GAME_TEST__.tick(2); const n = document.getElementById('hud-log'); if (n) { n.classList.remove('hidden'); document.getElementById('hud-log-n').textContent = '3'; } });
  const m = await page.evaluate(() => {
    const hud = document.getElementById('hud'), vis = (el) => el.getClientRects().length > 0 && getComputedStyle(el).visibility !== 'hidden';
    const rect = (el) => { const r = el.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height, r: r.right, b: r.bottom }; };
    const items = [...hud.children].filter(vis).map((el) => ({ id: el.id || el.className, ...rect(el), font: parseFloat(getComputedStyle(el.querySelector('small') ?? el).fontSize) }));
    const spans = [...document.querySelectorAll('#hud-weapons span')].map((el) => ({ id: 'slot ' + el.textContent.trim().slice(0, 12), ...rect(el), font: parseFloat(getComputedStyle(el).fontSize) }));
    const all = [...items, ...spans], problems = [], W = innerWidth, H = innerHeight;
    for (const a of all) { if (a.r > W + 1 || a.x < -1) problems.push(`${a.id} runs past the window (${a.x.toFixed(0)}..${a.r.toFixed(0)} of ${W})`); if (a.b > H + 1) problems.push(`${a.id} runs below the window`); }
    for (let i = 0; i < items.length; i++) for (let j = i + 1; j < items.length; j++) { const a = items[i], b = items[j], ox = Math.min(a.r, b.r) - Math.max(a.x, b.x), oy = Math.min(a.b, b.b) - Math.max(a.y, b.y); if (ox > 2 && oy > 2) problems.push(`${a.id} overlaps ${b.id} by ${ox.toFixed(0)} x ${oy.toFixed(0)} px`); }
    const mini = document.getElementById('minimap'), mr = mini && mini.getClientRects().length ? rect(mini) : null;
    return { window: [W, H], hudHeight: hud.getBoundingClientRect().height, hudRows: new Set(items.map((i) => Math.round(i.y / 4))).size, items: items.map((i) => ({ id: i.id, x: Math.round(i.x), w: Math.round(i.w), font: i.font })), slotCount: spans.length, minFont: Math.min(...all.map((a) => a.font)), problems, minimap: mr };
  });
  result.sizes[`${w}x${h}`] = m;
  await page.screenshot({ path: path.join(outDir, `hud-${w}x${h}.png`), clip: { x: 0, y: Math.max(0, h - Math.ceil(m.hudHeight) - 30), width: w, height: Math.min(h, Math.ceil(m.hudHeight) + 30) } });
  await page.screenshot({ path: path.join(outDir, `corner-${w}x${h}.png`), clip: { x: Math.max(0, w - 360), y: 0, width: Math.min(w, 360), height: Math.min(h, 300) } });
  if (FULL.has(`${w}x${h}`)) await page.screenshot({ path: path.join(outDir, `full-${w}x${h}.png`) });
}
result.lockCalls = await page.evaluate(() => window.__lockCalls);
fs.writeFileSync(path.join(outDir, 'hud.json'), JSON.stringify(result, null, 1));
for (const [k, v] of Object.entries(result.sizes)) console.log(k.padEnd(10), 'rows', v.hudRows, 'slots', v.slotCount, 'min font', v.minFont, v.problems.length ? 'PROBLEMS: ' + v.problems.join(' | ') : 'clean');
console.log('pointer-lock requests:', result.lockCalls, '| errors:', errors.length ? errors.join(' | ') : 'none');
await browser.close(); await server.close();
