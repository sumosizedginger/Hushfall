// The polish sweep (PT-083 phase 13): two frames of every map, from places on its main route looking along the road, for a person to look over: seams, floating props, clipping, z-fighting, stretched textures.
// One headless-Chrome job; the pointer lock is refused and counted. Make contact sheets of the result with tools/dev/contact-sheet.mjs.
//   GPU=1 powershell -File tools/dev/low.ps1 <log> tools/dev/sweep-shots.mjs <outDir> [ID ...]
import { createServer } from 'vite';
import puppeteer from 'puppeteer';
import fs from 'node:fs';
import path from 'node:path';
import { refuseLock, reportLock } from './lockguard.mjs';

const root = path.resolve(import.meta.dirname, '../..'),
  [outDir, ...named] = process.argv.slice(2);
if (!outDir) {
  console.error('usage: sweep-shots.mjs <outDir> [ID ...]');
  process.exit(2);
}
fs.mkdirSync(outDir, { recursive: true });
const ids = named.length
  ? named
  : fs
      .readdirSync(path.join(root, 'maps'))
      .filter((f) => f.endsWith('.json'))
      .map((f) => f.slice(0, -5))
      .sort();
const server = await createServer({ root, logLevel: 'error', server: { port: 5620 + (process.pid % 30), strictPort: false } });
await server.listen();
const browser = await puppeteer.launch({
  headless: true,
  args: process.env.GPU
    ? ['--ignore-gpu-blocklist', '--enable-gpu', '--use-angle=d3d11']
    : ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});
const page = await browser.newPage();
await refuseLock(page);
const errors = [];
page.on('pageerror', (e) => errors.push(String(e.message).slice(0, 200)));
await page.setViewport({ width: 1920, height: 1080 });
await page.goto(`http://localhost:${server.config.server.port}/`, { waitUntil: 'domcontentloaded', timeout: 0 });
await page.waitForFunction('window.__GAME_TEST__ && window.__GAME_TEST__.ready', { timeout: 180000 });
await page.evaluate("window.__GAME_TEST__.setSetting('autoQuality', false)");
const T = (code) => page.evaluate(`(() => { const t = window.__GAME_TEST__; return ${code}; })()`);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
for (const id of ids) {
  const file = path.join(root, 'routes', id + '.main.route.json');
  if (!fs.existsSync(file)) continue;
  const ops = JSON.parse(fs.readFileSync(file, 'utf8')).filter((o) => Array.isArray(o.at));
  if (ops.length < 3) continue;
  await T(`t.newGame('normal', 3, { mapId: '${id}' })`);
  await sleep(250);
  const cell = (await T('t.state().map?.cell')) ?? 2;
  for (const [tag, f] of [
    ['a', 0.3],
    ['b', 0.7],
  ]) {
    const i = Math.min(ops.length - 2, Math.floor(ops.length * f)),
      [ax, az] = ops[i].at,
      [bx, bz] = ops[i + 1].at,
      x = (ax + 0.5) * cell,
      z = (az + 0.5) * cell,
      yaw = Math.atan2(-(bx - ax), -(bz - az));
    await T(`(t.clearOverlays(), t.setup_teleport(${x}, ${z}, ${yaw}), t.setup_player({ hp: 100, hurt: 0, pitch: 0 }), t.render(0.02), 1)`);
    await sleep(160);
    await T('(t.render(0.02), 1)');
    await sleep(40);
    await page.screenshot({ path: path.join(outDir, `${id}-${tag}.png`), type: 'png' });
  }
  console.log(id);
}
await reportLock(page);
console.log('errors', JSON.stringify(errors.slice(0, 5)));
await browser.close();
await server.close();
