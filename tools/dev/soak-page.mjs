// THE SOAK IN THE REAL PAGE (PT-083 S4): a player who never dies, on a round of maps, turning, walking, firing and changing guns for as long as asked, in the real frame loop. Every minute: the page's JS heap,
// the renderer's geometries, textures and programs, and the frame time. Anything that keeps growing between the first and the last third of the same map is a leak. tools/dev/soak.mjs is the same question of
// the simulation alone. One headless-Chrome job; the pointer lock is refused and counted.
//   GPU=1 powershell -File tools/dev/low.ps1 <log> tools/dev/soak-page.mjs <out.json> [--minutes=60] [ID ...]
import { createServer } from 'vite';
import puppeteer from 'puppeteer';
import fs from 'node:fs';
import path from 'node:path';
import { refuseLock, reportLock } from './lockguard.mjs';

const root = path.resolve(import.meta.dirname, '../..'),
  args = process.argv.slice(2),
  outFile = path.resolve(args[0] ?? 'soak.json'),
  MINUTES = Number(args.find((a) => a.startsWith('--minutes='))?.slice(10) ?? 60),
  ids = args.slice(1).filter((a) => !a.startsWith('--'));
const MAPS = ids.length ? ids : ['C1E1M01', 'C1E3M04', 'C2M21', 'C2M28'];
const server = await createServer({ root, logLevel: 'error', server: { port: 5950 + (process.pid % 40), strictPort: false } });
await server.listen();
const browser = await puppeteer.launch({
  headless: true,
  args: [
    '--enable-precise-memory-info',
    ...(process.env.GPU
      ? ['--ignore-gpu-blocklist', '--enable-gpu', '--use-angle=d3d11']
      : ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist']),
  ],
});
const page = await browser.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(String(e.message).slice(0, 300)));
await refuseLock(page);
await page.setViewport({ width: 1280, height: 720 });
await page.goto(`http://localhost:${server.config.server.port}/`, { waitUntil: 'domcontentloaded', timeout: 0 });
await page.waitForFunction('window.__GAME_TEST__ && window.__GAME_TEST__.ready', { timeout: 180000 });
await page.evaluate(`(() => {
  window.__f = { n: 0, last: performance.now(), sum: 0, worst: 0 };
  const loop = () => { const n = performance.now(), d = n - window.__f.last; window.__f.last = n; window.__f.n++; window.__f.sum += d; window.__f.worst = Math.max(window.__f.worst, d); requestAnimationFrame(loop); };
  requestAnimationFrame(loop);
})()`);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const start = Date.now(),
  rows = [];
const perMap = (MINUTES * 60000) / MAPS.length;
try {
  for (const id of MAPS) {
    await page.evaluate(`(() => { const t = window.__GAME_TEST__; t.newGame('normal', 3, { realtime: true, mapId: '${id}' }); t.clearOverlays(); })()`);
    const until = Date.now() + perMap;
    let step = 0;
    await sleep(2000);
    while (Date.now() < until) {
      const minuteEnds = Math.min(until, Date.now() + 60000);
      while (Date.now() < minuteEnds) {
        step++;
        await page.evaluate(`(() => {
          const t = window.__GAME_TEST__, s = t.state();
          if (s.status !== 'playing') { t.newGame('normal', ${step}, { realtime: true, mapId: '${id}' }); t.clearOverlays(); return; }
          t.setup_player({ hp: 100, hurt: 0 });
          t.addYaw(${Math.sin(step / 3) * 0.3});
          t.${step % 40 < 30 ? 'press' : 'release'}('forward');
          t.${step % 3 ? 'press' : 'release'}('fire');
          if (${step % 25} === 0) t.press('weaponNext'); else t.release('weaponNext');
        })()`);
        await sleep(400);
      }
      const r = await page.evaluate(`(() => {
        const t = window.__GAME_TEST__, g = t.gl(), f = window.__f, out = { heapMB: Math.round(performance.memory.usedJSHeapSize / 1048576), geometries: g.geometries, textures: g.textures, programs: g.programs, frames: f.n, avgMs: Math.round((f.sum / Math.max(1, f.n)) * 10) / 10, worstMs: Math.round(f.worst), status: t.state().status };
        f.n = 0; f.sum = 0; f.worst = 0;
        return out;
      })()`);
      rows.push({ map: id, minute: Math.round((Date.now() - start) / 60000), ...r });
      console.log(JSON.stringify(rows.at(-1)));
      fs.writeFileSync(outFile, JSON.stringify({ rows, errors }, null, 0));
    }
  }
} finally {
  await reportLock(page);
  await browser.close();
  await server.close();
}
// the verdict, map by map: the first third against the last
const verdict = {};
for (const id of MAPS) {
  const m = rows.filter((r) => r.map === id);
  if (m.length < 3) continue;
  const third = Math.max(1, Math.floor(m.length / 3)),
    mean = (a, k) => a.reduce((s, r) => s + (r[k] ?? 0), 0) / a.length,
    a = m.slice(0, third),
    b = m.slice(-third);
  verdict[id] = Object.fromEntries(
    ['heapMB', 'geometries', 'textures', 'programs', 'avgMs'].map((k) => [k, [Math.round(mean(a, k) * 10) / 10, Math.round(mean(b, k) * 10) / 10]]),
  );
}
fs.writeFileSync(outFile, JSON.stringify({ verdict, errors, rows }, null, 1));
console.log(JSON.stringify({ verdict, errors: errors.length }));
