// Level tour: screenshots of Marrow Quay from its key vantage points (appearance evidence, not correctness).
// Writes review/level-c1e1m01/*.png
import { savePng } from './savepng.mjs';
import { createServer } from 'vite';
import puppeteer from 'puppeteer';
import fs from 'node:fs';
import path from 'node:path';
const root = path.resolve(import.meta.dirname, '../..');
const out = process.env.SHOOT_OUT ? path.resolve(process.env.SHOOT_OUT) : path.join(root, 'review/level-c1e1m01');      // SHOOT_OUT=<dir>: a before / after set that must not overwrite the tracked stills
fs.mkdirSync(out, { recursive: true });
const server = await createServer({ root, logLevel: 'error', server: { port: 5250, strictPort: true } });
await server.listen();
const browser = await puppeteer.launch({ headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 720 });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e))); page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
await page.goto('http://localhost:5250/', { waitUntil: 'domcontentloaded', timeout: 0 });
await page.waitForFunction('window.__GAME_TEST__ && window.__GAME_TEST__.ready', { timeout: 120000 });
const T = (code) => page.evaluate(`(() => { const t = window.__GAME_TEST__; ${code.includes(';') ? code + ';' : 'return ' + code + ';'} })()`);
await T("t.newGame('normal', 3)"); await T('t.clearOverlays()');            // the title card and queued transmissions must not cover the frame: these are meant to show what a player sees
const yawTo = (x, z, tx, tz) => Math.atan2(-(tx - x), -(tz - z));
const VIEWS = [
  ['01-pier-start', 8, 33, -Math.PI / 2, 0.0],
  ['02-tower', 20, 34, yawTo(20, 34, 89, -7), 0.42],
  ['03-boats', 16, 33.5, yawTo(16, 33.5, 13, 27.4), -0.08],
  ['04-plaza', 34, 30, -Math.PI / 2 + 0.35, 0.0],
  ['05-stalls', 40, 40, Math.PI, -0.04],
  ['06-shed-door', 44, 24, 0, 0.0],
  ['12a-secret-tell', 13.2, 45, Math.PI / 2, 0.0, false],          // the hut wall before the secret is opened: a hairline of light at the seam
  ['07-shed-inside', 44, 15, 0, -0.02, true],
  ['08-hut', 15, 41, Math.PI, -0.05, true],
  ['09-warehouse-entry', 68, 35, -Math.PI / 2, 0.0, true],
  ['10-warehouse-pods', 76, 24, -Math.PI / 2 + 0.25, 0.0, true],
  ['11-dock-gate', 79, 59.5, Math.PI, -0.03, true],
  ['12b-net-loft', 5.6, 45, -Math.PI / 2, 0.0, true],              // standing INSIDE the loft (x 4-8 m), looking out through the opened panel
  ['13-pier-water', 12, 31.5, Math.PI + 0.5, -0.32],
];
let opened = false;
for (const [name, x, z, yaw, pitch, open] of VIEWS) {
  if (open && !opened) { await T('t.setup_openDoors()'); opened = true; }
  await T(`t.setup_teleport(${x}, ${z}, ${yaw}); t.setup_player({ pitch: ${pitch}, hp: 100, hurt: 0 })`); await T('t.clearOverlays(); t.render(0.02)');
  await savePng(page, path.join(out, name + '.png')); console.log('shot', name);
}
console.log(JSON.stringify({ errors }));
await browser.close(); await server.close();
process.exit(errors.length ? 1 : 0);
