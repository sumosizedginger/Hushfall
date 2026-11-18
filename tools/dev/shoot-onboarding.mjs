// The first minutes of a new game, as a stranger sees them (the outside playtest of 2026-11-18): a fresh profile starts Marrow Quay; frames of the
// title card, the controls card, the card after the first shot, and every lesson (hints.js) the route bot meets on its way, with the text and the
// world time of each. ONE headless-Chrome job (the owner's named yes); the pointer lock is refused and counted (must be 0).
//   GPU=1 powershell -File tools/dev/low.ps1 <log> tools/dev/shoot-onboarding.mjs <outDir> [mapId]
import { createServer } from 'vite';
import puppeteer from 'puppeteer';
import fs from 'node:fs';
import path from 'node:path';
import { refuseLock, reportLock } from './lockguard.mjs';

const root = path.resolve(import.meta.dirname, '../..'),
  [outDir, mapId = 'C1E1M01'] = process.argv.slice(2);
if (!outDir) {
  console.error('usage: shoot-onboarding.mjs <outDir> [mapId]');
  process.exit(2);
}
fs.mkdirSync(outDir, { recursive: true });
const server = await createServer({ root, logLevel: 'error', server: { port: 5700 + (process.pid % 30), strictPort: false } });
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
await page.setViewport({ width: 1600, height: 900 });
await page.goto(`http://localhost:${server.config.server.port}/`, { waitUntil: 'domcontentloaded', timeout: 0 });
await page.waitForFunction('window.__GAME_TEST__ && window.__GAME_TEST__.ready', { timeout: 180000 });
await page.evaluate("window.__GAME_TEST__.setSetting('autoQuality', false)");
const T = (code) => page.evaluate(`(() => { const t = window.__GAME_TEST__; return ${code}; })()`);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const shot = async (name) => {
  await T('(t.render(0.016), 1)');
  await page.screenshot({ path: path.join(outDir, name + '.png'), type: 'png' });
};
const shown = (id) => page.evaluate((id) => {
  const el = document.getElementById(id);
  return el && !el.classList.contains('hidden') && getComputedStyle(el).display !== 'none' ? el.textContent : null;
}, id);
const log = [];
// a fresh profile: no first run seen, no hint seen
await T(`(t.setSetting('firstRunSeen', false), t.setSetting('hintsSeen', {}), 1)`);
await T(`t.newGame('normal', 1, { mapId: '${mapId}' })`);
// the sim waits (manual) while the cards play in real time
for (const [ms, name] of [
  [1500, '01-title'],
  [3600, '02-title-late'],
  [1600, '03-controls'],
]) {
  await sleep(ms);
  await shot(name);
  log.push({ frame: name, objective: await shown('objective'), card: (await shown('controls-card'))?.slice(0, 80) ?? null });
}
// the first shot hides the card
await T("(t.press('fire'), t.tick(6), t.release('fire'), t.tick(2), 1)");
await sleep(200);
await shot('04-after-first-shot');
log.push({ frame: '04-after-first-shot', card: await shown('controls-card') });
// the route, at about real speed, catching every lesson
await T(`t.startBot('${mapId}.main')`);
let last = null,
  n = 0;
for (let i = 0; i < 400; i++) {
  const s = await T('t.stepBot(30)');
  const tip = await shown('tips');
  if (tip && tip !== last) {
    last = tip;
    n++;
    const time = +((await T('t.state().tick')) / 60).toFixed(1);
    await shot(`1${String(n).padStart(2, '0')}-lesson`);
    log.push({ frame: `1${String(n).padStart(2, '0')}-lesson`, time, tip });
  }
  if (s.done || s.failed || s.mode !== 'playing') {
    log.push({ end: s.done ? 'done' : s.failed ? 'failed ' + s.failed : s.mode });
    break;
  }
  await sleep(480);
}
fs.writeFileSync(path.join(outDir, 'onboarding.json'), JSON.stringify(log, null, 1));
for (const l of log) console.log(JSON.stringify(l));
await reportLock(page);
console.log('errors', JSON.stringify(errors.slice(0, 5)));
await browser.close();
await server.close();
process.exit(errors.length ? 1 : 0);
