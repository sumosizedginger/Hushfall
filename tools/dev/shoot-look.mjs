// Capture deterministic look-demo screenshots via the dev-only window.__LOOK__ hook.
// Usage: node tools/dev/shoot-look.mjs [outDir]   (writes review/look-demo/*.png by default)
import { createServer } from 'vite';
import puppeteer from 'puppeteer';
import fs from 'node:fs';
import path from 'node:path';
const root = path.resolve(import.meta.dirname, '../..');
const out = path.resolve(process.argv[2] || path.join(root, 'review/look-demo'));
fs.mkdirSync(out, { recursive: true });
const server = await createServer({ root, logLevel: 'error', server: { port: 5200, strictPort: true } });
await server.listen();
const browser = await puppeteer.launch({ headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 720 });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
await page.goto('http://localhost:5200/look.html', { waitUntil: 'domcontentloaded', timeout: 0 });
await Promise.race([page.waitForFunction('window.__LOOK__ && window.__LOOK__.ready', { timeout: 120000 }), new Promise((_, rej) => { const t = setInterval(() => { if (errors.length) { clearInterval(t); rej(new Error('page error: ' + errors[0])); } }, 250); })]);
await page.evaluate('__LOOK__.hud(false)'); await page.evaluate("document.getElementById('hud').style.display='none';document.getElementById('msg').style.display='none';document.getElementById('cross').style.display='none'");
const shot = async (name) => { await page.screenshot({ path: path.join(out, name + '.png') }); console.log('shot', name); };
const L = (code) => page.evaluate(code);
for (const v of ['hall', 'enemy', 'closeup', 'quay', 'pod']) { await L(`__LOOK__.setView('${v}'); __LOOK__.advance(0.5)`); await shot(v); }
// combat sequence: aim at the lead enemy, capture muzzle flash, flight, impact, aftermath, corpse
await L("__LOOK__.setView('enemy'); __LOOK__.advance(0.3); __LOOK__.aimAt(0); __LOOK__.fire(); __LOOK__.advance(0.03)"); await shot('fire-muzzle');
await L('__LOOK__.advance(0.07)'); await shot('fire-flight');
for (let i = 0; i < 60; i++) { if (await L('__LOOK__.advance(0.02), __LOOK__.state().booms')) break; }
await shot('fire-impact');
await L('__LOOK__.advance(0.2)'); await shot('fire-aftermath');
await L('__LOOK__.advance(1.2)'); await shot('fire-dead');
await L("__LOOK__.setView('closeup'); __LOOK__.advance(4)"); await shot('enemy-attack');
await L("__LOOK__.setView('hall'); __LOOK__.set('uPaint',0); __LOOK__.set('uOutline',0); __LOOK__.advance(0.1)"); await shot('compare-raw');
console.log(JSON.stringify({ errors, state: await L('__LOOK__.state()') }));
await browser.close(); await server.close();
process.exit(errors.length ? 1 : 0);
