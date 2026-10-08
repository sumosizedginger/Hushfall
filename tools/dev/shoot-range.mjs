// REAL-GAME stills and probes of the dev-only weapons range (PT-016, maps-dev/RANGE.json): the spawn, every area, a flare into the crowd, the lamp through the water, the readout text, the pen lever. Appearance + wiring evidence only
// (the sim half is tests/range.test.js). Writes review/range/*.png and prints the readout lines and any console error (exit 1 if there are any). One headless-Chrome job: run it at idle priority on two cores while the machine-load rule stands (AGENTS.md).
//   node tools/dev/shoot-range.mjs [outDir]
import { savePng } from './savepng.mjs';
import { createServer } from 'vite';
import puppeteer from 'puppeteer';
import fs from 'node:fs';
import path from 'node:path';
const root = path.resolve(import.meta.dirname, '../..');
const out = path.resolve(process.argv[2] ?? path.join(root, 'review/range'));
fs.mkdirSync(out, { recursive: true });
const server = await createServer({ root, logLevel: 'error', server: { port: 5252, strictPort: true } });
await server.listen();
const browser = await puppeteer.launch({ headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 720 });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e))); page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
await page.goto('http://localhost:5252/', { waitUntil: 'domcontentloaded', timeout: 0 });
await page.waitForFunction('window.__GAME_TEST__ && window.__GAME_TEST__.ready', { timeout: 120000 });
await page.waitForFunction("[...document.querySelectorAll('#dev-map option')].some((o) => o.value === 'RANGE')", { timeout: 60000 });          // the dev maps load after the page does
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const T = (code) => page.evaluate(`(() => { const t = window.__GAME_TEST__; ${code.includes(';') ? code + ';' : 'return ' + code + ';'} })()`);
const panel = () => page.$eval('#range-hud', (e) => (e.classList.contains('hidden') ? '(hidden)' : e.textContent));
const shot = async (n) => { await T('t.clearOverlays(); t.render(0.02)'); await sleep(450); await T('t.render(0.02)'); await savePng(page, path.join(out, n + '.png')); console.log('shot', n, '|', (await panel()).replace(/\n/g, ' | ')); };
// the player's yaw looking at (x, z) from where it stands (the player's forward is (-sin yaw, -cos yaw))
const face = (px, pz, tx, tz) => Math.atan2(-(tx - px), -(tz - pz));
const go = async (x, z, tx, tz, weapon = null) => { await T(`t.setup_teleport(${x}, ${z}, ${face(x, z, tx, tz)})`); if (weapon) await T(`t.setup_player({ weapon: '${weapon}', switchT: 0 })`); await T('t.tick(20)'); };
const R = {};
await T("t.newGame('normal', 3, { mapId: 'RANGE' })"); await T('t.clearOverlays()'); await T('t.tick(10)');
R.state = await T('t.state()'); R.weapons = R.state.player.weapons; R.mode = R.state.mode;
await shot('range-spawn');
await go(31, 30, 31, 13); await shot('range-sponges');
await go(23, 34, 23, 27); await shot('range-swingers');                                                                  // a Warden and a Gaunt on their posts, the closest only just noticing you
await go(11, 28.6, 11, 27); await T('t.tick(120)'); await shot('range-swinger-close');                               // a Tollbearer faces you and swings (the readout counts what it did)
await go(27, 47, 27, 39); await shot('range-fixed');                                                                  // the south row from the front
await go(72, 32, 72, 24, 'flare'); await T("t.press('fire')"); await T('t.tick(3)'); await T("t.release('fire')"); await T('t.tick(25)'); await shot('range-crowd-flare');
await go(72, 54, 73, 45, 'arc'); await T("t.press('fire')"); await T('t.tick(80)'); await T("t.release('fire')"); await T('t.tick(4)'); await shot('range-water-arc');
await go(87, 33, 88, 21, 'arc'); await shot('range-vael');
await go(84, 36, 93, 33); await shot('range-pen-door');
R.errors = errors;
console.log(JSON.stringify(R, null, 1));
await browser.close(); await server.close(); process.exit(errors.length ? 1 : 0);
