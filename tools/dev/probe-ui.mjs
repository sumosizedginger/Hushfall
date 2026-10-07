// A quick probe of the HUD while the lamp charges (PT-013): is the charge bar on, how wide, where; then three stills (all drawn, no core, no lamp light) into the directory given as the first argument.
//   node tools/dev/probe-ui.mjs <outDir>   (one Chrome job, idle priority). Made to find out what drew a blob in the first real-game stills: it was the dead Tollbearer of the previous scene, not the lamp.
import { createServer } from 'vite';
import puppeteer from 'puppeteer';
import path from 'node:path';
const root = path.resolve(import.meta.dirname, '../..');
const server = await createServer({ root, logLevel: 'error', server: { port: 5252, strictPort: true } }); await server.listen();
const browser = await puppeteer.launch({ headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage(); await page.setViewport({ width: 1280, height: 720 });
const errors = []; page.on('pageerror', (e) => errors.push(String(e))); page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
await page.goto('http://localhost:5252/', { waitUntil: 'domcontentloaded', timeout: 0 });
await page.waitForFunction('window.__GAME_TEST__ && window.__GAME_TEST__.ready', { timeout: 120000 });
const T = (code) => page.evaluate(`(() => { const t = window.__GAME_TEST__; ${code.includes(';') ? code + ';' : 'return ' + code + ';'} })()`);
await T("t.newGame('normal', 3, { mapId: 'C1E2M02' })"); await T('t.clearOverlays()');
await T("t.setup_clearEnemies(); t.setup_player({ weapons: ['flare', 'arc'], weapon: 'arc', ammo: { flare: 8, cell: 80 }, hp: 100000, switchT: 0 })");
await T("t.press('fire')"); await T('t.tick(50)'); await new Promise((r) => setTimeout(r, 600));
console.log(JSON.stringify(await page.evaluate(() => { const b = document.getElementById('charge'), r = b.getBoundingClientRect(), s = getComputedStyle(b); return { cls: b.className, opacity: s.opacity, display: s.display, rect: [r.x, r.y, r.width, r.height].map(Math.round), fill: b.firstElementChild.style.width, cross: document.getElementById('cross').getBoundingClientRect().toJSON(), screen: document.body.dataset.screen, stance: document.body.dataset.stance }; })), 'charge', (await T('t.state()')).player);

const { savePng } = await import('./savepng.mjs');
await page.evaluate(() => { const v = window.__GAME_TEST__.view(); window.__keep = { l: v.lampLight.intensity }; });
const shot = async (n) => { await T('t.render(0.02)'); await new Promise((r) => setTimeout(r, 300)); await savePng(page, process.argv[2] + '/probe-' + n + '.png'); };
await shot('charging');
await page.evaluate(() => { const v = window.__GAME_TEST__.view(); v.rigs.arc.core.visible = false; });
await shot('nocore');
await page.evaluate(() => { const v = window.__GAME_TEST__.view(); v.rigs.arc.core.visible = true; v.lampLight.visible = false; v.scene.remove(v.lampLight); });
await shot('nolamplight');
console.log(JSON.stringify({ errors })); await browser.close(); await server.close();
