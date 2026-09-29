// Fast visual iteration on weapon stances (hip / ADS / sprint / mid-blend). Writes review/engine-skeleton/stance-*.png.
import { createServer } from 'vite';
import puppeteer from 'puppeteer';
import fs from 'node:fs';
import path from 'node:path';
const root = path.resolve(import.meta.dirname, '../..');
const out = path.join(root, 'review/engine-skeleton');
fs.mkdirSync(out, { recursive: true });
const server = await createServer({ root, logLevel: 'error', server: { port: 5220, strictPort: true } });
await server.listen();
const browser = await puppeteer.launch({ headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 720 });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e))); page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
await page.goto('http://localhost:5220/', { waitUntil: 'domcontentloaded', timeout: 0 });
await page.waitForFunction('window.__GAME_TEST__ && window.__GAME_TEST__.ready', { timeout: 120000 });
// runs a single expression (returning its value) or a ';'-separated statement list (returning nothing). A second statement after `return` would never execute.
const T = (code) => page.evaluate(`(() => { const t = window.__GAME_TEST__; ${code.includes(';') ? code + ';' : 'return ' + code + ';'} })()`);
await T("t.newGame('normal', 3)"); await T('t.setup_clearEnemies(); t.setup_teleport(4, 18, -Math.PI / 2)');
const shot = (n) => page.screenshot({ path: path.join(out, 'stance-' + n + '.png') });
await T('t.tick(20)'); await shot('hip');
await T("t.press('aim')"); await T('t.tick(30)'); await shot('ads'); await T("t.release('aim')"); await T('t.tick(30)');
await T("t.press('forward'); t.press('sprint')"); await T('t.tick(30)'); await shot('sprint');
await T("t.release('forward'); t.release('sprint')"); await T('t.tick(3)'); await shot('recover');
console.log(JSON.stringify({ errors, state: await T('t.state().fov') }));
await browser.close(); await server.close();
process.exit(errors.length ? 1 : 0);
