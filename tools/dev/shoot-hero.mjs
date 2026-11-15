// The hero frame of every map (design/VISUAL_AWE_PLAN.md): one picture a map from maps-src/hero-views.json, doors open, for the before / after sets
// that tools/dev/frame-score.mjs scores. ONE headless-Chrome job (the owner's named yes); the pointer lock is refused and counted (must be 0).
//   GPU=1 powershell -File tools/dev/low.ps1 <log> tools/dev/shoot-hero.mjs <outDir> [ID ...]
import { createServer } from 'vite';
import puppeteer from 'puppeteer';
import fs from 'node:fs';
import path from 'node:path';
import { refuseLock, reportLock } from './lockguard.mjs';

const root = path.resolve(import.meta.dirname, '../..'),
  [outDir, ...named] = process.argv.slice(2);
if (!outDir) {
  console.error('usage: shoot-hero.mjs <outDir> [ID ...]');
  process.exit(2);
}
fs.mkdirSync(outDir, { recursive: true });
// VIEWS=<file>: other views (cells; keys are file names, `map` names the map); DOORS=shut leaves the doors closed
const views = JSON.parse(fs.readFileSync(process.env.VIEWS ? path.resolve(process.env.VIEWS) : path.join(root, 'maps-src', 'hero-views.json'), 'utf8')),
  ids = (named.length ? named : Object.keys(views)).filter((id) => views[id]).sort();
const server = await createServer({ root, logLevel: 'error', server: { port: 5660 + (process.pid % 30), strictPort: false } });
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
// (WIDTH=800: the store's render width, A9 step 6; unset keeps the game's default, as every hero set so far)
if (process.env.WIDTH) await page.evaluate(`window.__GAME_TEST__.setSetting('internalWidth', ${+process.env.WIDTH})`);
const T = (code) => page.evaluate(`(() => { const t = window.__GAME_TEST__; return ${code}; })()`);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
for (const id of ids) {
  const v = views[id];
  await T(`t.newGame('normal', 3, { mapId: '${v.map ?? id}' })`);
  await sleep(250);
  const cell = (await T('t.state().map?.cell')) ?? 2;
  await T(
    `(t.clearOverlays(), ${process.env.DOORS === 'shut' ? '' : 't.setup_openDoors(), '}t.setup_teleport(${v.x * cell}, ${v.z * cell}, ${v.yaw}), t.setup_player({ hp: 100, hurt: 0, pitch: ${v.pitch ?? 0} }), t.render(0.02), 1)`,
  );
  await sleep(160);
  if (v.pre) await T(`(${v.pre}, 1)`); // a view may carry `pre`: page code (with t, the dev hook) run before the frame, for look-dev probes
  await T('(t.clearOverlays(), t.render(0.02), 1)');
  await sleep(40);
  await page.screenshot({ path: path.join(outDir, `${id}.png`), type: 'png' });
  console.log(id);
}
await reportLock(page);
console.log('errors', JSON.stringify(errors.slice(0, 5)));
await browser.close();
await server.close();
process.exit(errors.length ? 1 : 0);
