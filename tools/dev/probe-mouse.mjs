// Does the view move in the frame the hand moves (PT-083 C1)? The real page and its real frame loop, real mouse events through the browser's input: a drag (the lock is refused, so the game's fallback for
// a refused lock takes the movement). After every frame the camera's yaw is compared with the sum of the movement so far: it must already hold all of it, whatever the simulation has used. The simulation's
// own angle is measured beside it, to show what the camera used to trail by. One headless-Chrome job.
//   GPU=1 powershell -File tools/dev/low.ps1 <log> tools/dev/probe-mouse.mjs <out.json>
import { createServer } from 'vite';
import puppeteer from 'puppeteer';
import fs from 'node:fs';
import path from 'node:path';
import { refuseLock, reportLock } from './lockguard.mjs';

const root = path.resolve(import.meta.dirname, '../..'),
  outFile = path.resolve(process.argv[2] ?? 'mouse.json');
const server = await createServer({ root, logLevel: 'error', server: { port: 5800 + (process.pid % 90), strictPort: false } });
await server.listen();
const browser = await puppeteer.launch({
  headless: true,
  args: process.env.GPU
    ? ['--ignore-gpu-blocklist', '--enable-gpu', '--use-angle=d3d11']
    : ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});
const page = await browser.newPage();
await refuseLock(page);
await page.setViewport({ width: 1280, height: 720 });
await page.goto(`http://localhost:${server.config.server.port}/`, { waitUntil: 'domcontentloaded', timeout: 0 });
await page.waitForFunction('window.__GAME_TEST__ && window.__GAME_TEST__.ready', { timeout: 180000 });
await page.evaluate(`(() => { const t = window.__GAME_TEST__; t.newGame('normal', 3, { realtime: true, mapId: 'C1E1M01' }); t.clearOverlays(); })()`);
await new Promise((r) => setTimeout(r, 1500));
await page.evaluate(`(() => {
  const t = window.__GAME_TEST__;
  window.__m = { sum: 0, n: 0, rows: [], on: true };
  addEventListener('mousemove', (e) => { window.__m.sum += e.movementX; window.__m.n++; });
  const loop = () => {
    if (!window.__m.on) return;
    setTimeout(() => {
      const c = t.cinematicProbe().cam;
      window.__m.rows.push([performance.now(), c?.yaw ?? null, t.state().player.yaw, window.__m.sum, t.state().tick]);
    });
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
})()`);
await page.mouse.move(640, 360);
await page.mouse.down();
await new Promise((r) => setTimeout(r, 200));
for (let i = 0; i < 180; i++) {
  await page.mouse.move(640 + 200 * Math.sin(i / 14), 360);
  await new Promise((r) => setTimeout(r, 5));
}
await page.mouse.up();
await new Promise((r) => setTimeout(r, 200));
const m = await page.evaluate(`(() => { window.__m.on = false; return window.__m; })()`);
await reportLock(page);
await browser.close();
await server.close();
// radians per pixel, from the whole stroke's two ends
const rows = m.rows.filter((r) => r[1] != null),
  moved = rows.filter((r, i) => i && r[3] !== rows[i - 1][3]);
const y0 = rows[0][1],
  s0 = rows[0][3],
  far = rows.reduce((a, r) => (Math.abs(r[3] - s0) > Math.abs(a[3] - s0) ? r : a), rows[0]),
  per = (far[1] - y0) / (far[3] - s0);
let camErr = 0,
  simErr = 0;
for (const r of moved) {
  camErr = Math.max(camErr, Math.abs(r[1] - (y0 + per * (r[3] - s0))));
  simErr = Math.max(simErr, Math.abs(r[2] - (rows[0][2] + per * (r[3] - s0))));
}
const gaps = rows
  .slice(1)
  .map((r, i) => r[0] - rows[i][0])
  .sort((a, b) => a - b);
const out = {
  frames: rows.length,
  framesWithMovement: moved.length,
  mouseEvents: m.n,
  radiansPerPixel: per,
  medianFrameMs: gaps[gaps.length >> 1],
  worstCameraBehindHandDegrees: (camErr * 180) / Math.PI,
  worstSimulationBehindHandDegrees: (simErr * 180) / Math.PI,
};
fs.writeFileSync(outFile, JSON.stringify(out, null, 1));
console.log(JSON.stringify(out));
