// FREEZE F16, the store frames of the Map tab (design/store/SHOTS.md): the real game on the machine's own graphics card; a map played by its canonical route bot to about two thirds of its route, the Journal opened with the map key and its MAP tab clicked
// (the full-screen automap behind a thin bar), then the Items and the Objectives pages of the same Journal. Appearance only.
//   GPU=1 VW=1920 VH=1080 WIDTH=800 powershell -File D:/Doom/tools/dev/low.ps1 <log> D:/Doom/tools/dev/store-map.mjs <outDir> [mapId ...]
// One job at a time, idle priority, two cores; the pointer lock is refused before any page script runs and the count is printed (it must be 0). Writes <outDir>/images/*.png.
import { savePng } from './savepng.mjs';
import { createServer } from 'vite';
import puppeteer from 'puppeteer';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '../..'), [outArg, ...ids0] = process.argv.slice(2);
if (!outArg) { console.error('usage: store-map.mjs <outDir> [mapId ...]'); process.exit(2); }
const out = path.resolve(outArg), imgDir = path.join(out, 'images'); fs.mkdirSync(imgDir, { recursive: true });
const ids = ids0.length ? ids0 : ['C1E3M04', 'C2M18', 'C1E4M07', 'C2M10'];
const port = 5600 + (process.pid % 90), server = await createServer({ root, logLevel: 'error', server: { port, strictPort: false } }); await server.listen();
const browser = await puppeteer.launch({ headless: true, args: process.env.GPU ? ['--ignore-gpu-blocklist', '--enable-gpu', '--use-angle=d3d11'] : ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage();
await page.evaluateOnNewDocument(() => { navigator.getGamepads = () => [null, null, null, null]; window.__lockAsks = 0; Element.prototype.requestPointerLock = function () { window.__lockAsks++; return Promise.reject(new DOMException('refused by the tool', 'NotAllowedError')); }; });
await page.setViewport({ width: Number(process.env.VW) || 1920, height: Number(process.env.VH) || 1080 });
const errors = []; page.on('pageerror', (e) => errors.push('pageerror: ' + e)); page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text().slice(0, 300)); });
await page.goto(`http://localhost:${server.config.server.port}/`, { waitUntil: 'domcontentloaded', timeout: 0 });
await page.waitForFunction('window.__GAME_TEST__ && window.__GAME_TEST__.ready', { timeout: 180000 });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
await page.evaluate(`window.__GAME_TEST__.setSetting('autoQuality', false); window.__GAME_TEST__.setSetting('internalWidth', ${Number(process.env.WIDTH) || 800})`);
const T = (code) => page.evaluate(`(() => { const t = window.__GAME_TEST__; ${code.includes(';') ? code + ';' : 'return ' + code + ';'} })()`);
try {
  for (const id of ids) {
    await T(`t.newGame('easy', 3, { mapId: '${id}' })`); await sleep(500); await T('t.clearOverlays()');
    const ops = (await T(`t.startBot('${id}.main')`)).ops; let s = await T('t.stepBot(1)'), cap = 0;          // (the state of a bot step carries `op`, the plain state does not)
    while (s.mode === 'playing' && !s.done && !s.failed && s.op / ops < 0.68 && cap++ < 3000) { const near = Math.min(...s.enemies.filter((e) => e.state !== 'dead' && e.state !== 'idle').map((e) => Math.hypot(e.x - s.player.x, e.z - s.player.z)), 99); s = await T(`t.stepBot(${near < 10 ? 6 : 30})`); }
    if (s.mode !== 'playing') { console.log(id, 'the run ended early:', s.mode); continue; }
    await T("t.press('map'); t.tick(1); t.release('map')"); await sleep(400);
    for (const [tab, tag] of [['map', 'map_tab'], ['items', 'journal_items'], ['objectives', 'journal_objectives']]) {
      await page.click('#btn-journal-' + tab); await sleep(450); const f = `${id}__${tag}.png`; await savePng(page, path.join(imgDir, f)); console.log('shot', f, 'op', s.op, 'of', ops);
    }
    if ((await T('t.state()')).mode === 'paused') await T('t.resume()');
  }
} finally { const asks = await page.evaluate('window.__lockAsks'); console.log(JSON.stringify({ errors, pointerLockAsks: asks })); await browser.close(); await server.close(); }
