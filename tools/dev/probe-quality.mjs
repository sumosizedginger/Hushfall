// THE QUALITY GOVERNOR IN THE REAL PAGE (PT-071, R21): the page runs in real time on a map while Chrome's CPU is throttled (Emulation.setCPUThrottlingRate) to imitate a weaker machine; the probe reads the frame times and the width the
// governor chose, second by second. Pass: unthrottled (on a real graphics card) it keeps the player's width; throttled it steps down within the first seconds and the frame times improve. ONE headless-Chrome job: run it through tools/dev/low.ps1.
//   GPU=1 node tools/dev/probe-quality.mjs <outDir> <ID> [<ID>...]      THROTTLE=6 (default 6), SECONDS=40, WIDTH=640 (the player's choice)
import { createServer } from 'vite';
import puppeteer from 'puppeteer';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '../..');
const args = process.argv.slice(2), out = path.resolve(args[0] ?? path.join(root, 'review/probe-quality')), ids = args.slice(1).length ? args.slice(1) : ['C1E1M01'];
const THROTTLE = +(process.env.THROTTLE ?? 6), SECONDS = +(process.env.SECONDS ?? 40), WIDTH = +(process.env.WIDTH ?? 640);
fs.mkdirSync(out, { recursive: true });
const results = { when: new Date().toISOString(), throttle: THROTTLE, seconds: SECONDS, choice: WIDTH, maps: {}, errors: [] };
const server = await createServer({ root, logLevel: 'error', server: { port: 5900 + (process.pid % 90), strictPort: false } }); await server.listen();
const browser = await puppeteer.launch({ headless: true, protocolTimeout: 0, args: [...(process.env.GPU ? ['--ignore-gpu-blocklist', '--enable-gpu', '--use-angle=d3d11'] : ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])] });
const page = await browser.newPage(); await page.setViewport({ width: 960, height: 540 });
await page.evaluateOnNewDocument(() => { window.__lockCalls = 0; Element.prototype.requestPointerLock = function () { window.__lockCalls++; return Promise.reject(new DOMException('refused by the probe', 'NotAllowedError')); }; });
page.on('pageerror', (e) => results.errors.push('pageerror: ' + String(e).slice(0, 300))); page.on('console', (m) => { if (m.type() === 'error') results.errors.push('console: ' + m.text().slice(0, 300)); });
await page.goto(`http://localhost:${server.config.server.port}/`, { waitUntil: 'domcontentloaded', timeout: 0 });
await page.waitForFunction('window.__GAME_TEST__ && window.__GAME_TEST__.ready', { timeout: 240000 });
const client = await page.createCDPSession();
const pct = (a, p) => { if (!a.length) return 0; const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(s.length * p))]; };
results.renderer = await page.evaluate(() => { const c = document.createElement('canvas'), gl = c.getContext('webgl2') || c.getContext('webgl'), e = gl && gl.getExtension('WEBGL_debug_renderer_info'); return e ? gl.getParameter(e.UNMASKED_RENDERER_WEBGL) : 'unknown'; });

for (const id of ids) {
  const row = results.maps[id] = {};
  for (const [label, rate] of [['unthrottled', 1], ['throttled', THROTTLE]]) {
    await client.send('Emulation.setCPUThrottlingRate', { rate });
    await page.evaluate((mapId, width) => {
      const t = window.__GAME_TEST__; t.setSetting?.('internalWidth', width); t.newGame('normal', 1, { mapId, realtime: true }); t.tick(2); const w = t.view().world; w.player.hp = 1e6;
      window.__frames = []; if (!window.__rafOn) { window.__rafOn = true; let last = performance.now(); const loop = (now) => { window.__frames.push(now - last); last = now; requestAnimationFrame(loop); }; requestAnimationFrame(loop); }
      t.press('forward'); window.__turn = setInterval(() => t.addYaw(0.02 * Math.sin(performance.now() / 900)), 50);
    }, id, WIDTH);
    const timeline = [];
    for (let s = 0; s < SECONDS; s += 2) {
      await new Promise((r) => setTimeout(r, 2000));
      const snap = await page.evaluate(() => { const f = window.__frames.splice(0); return { gov: window.__GAME_TEST__.governorProbe(), frames: f }; });
      timeline.push({ t: s + 2, width: snap.gov.width, p95: +pct(snap.frames, 0.95).toFixed(1), median: +pct(snap.frames, 0.5).toFixed(1), n: snap.frames.length });
    }
    await page.evaluate(() => { clearInterval(window.__turn); window.__GAME_TEST__.release?.('forward'); });
    row[label] = { timeline, finalWidth: timeline.at(-1).width, firstP95: timeline[0].p95, lastP95: timeline.at(-1).p95 };
    console.log(id, label, 'width', timeline.map((x) => x.width).join('>'), '| p95 ms', timeline.map((x) => x.p95).join(' '));
  }
}
await client.send('Emulation.setCPUThrottlingRate', { rate: 1 });
results.lockCalls = await page.evaluate('window.__lockCalls'); console.log('pointer-lock requests:', results.lockCalls, 'errors:', results.errors.length);
fs.writeFileSync(path.join(out, 'quality.json'), JSON.stringify(results, null, 1));
await browser.close(); await server.close(); process.exit(results.lockCalls === 0 ? 0 : 1);
