// Visual check of the Charge-arc lamp (weapon 5): hip, sights, the arc jumping along a clump of bodies, the glow it throws in a dark hall (lamp off vs on, same spot), and the pickups.
// Appearance evidence only (the sim half is tests/arc.test.js). Writes review/engine-skeleton/arc-*.png
import { savePng } from './savepng.mjs';
import { createServer } from 'vite';
import puppeteer from 'puppeteer';
import fs from 'node:fs';
import path from 'node:path';
const root = path.resolve(import.meta.dirname, '../..');
const out = path.join(root, 'review/engine-skeleton');
fs.mkdirSync(out, { recursive: true });
const server = await createServer({ root, logLevel: 'error', server: { port: 5244, strictPort: true } });
await server.listen();
const browser = await puppeteer.launch({ headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 720 });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e))); page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
await page.goto('http://localhost:5244/', { waitUntil: 'domcontentloaded', timeout: 0 });
await page.waitForFunction('window.__GAME_TEST__ && window.__GAME_TEST__.ready', { timeout: 120000 });
const T = (code) => page.evaluate(`(() => { const t = window.__GAME_TEST__; ${code.includes(';') ? code + ';' : 'return ' + code + ';'} })()`);
const shot = async (n) => { await T('t.clearOverlays(); t.render(0.02)'); await savePng(page, path.join(out, 'arc-' + n + '.png')); console.log('shot', n); };
const EAST = -Math.PI / 2, KIT = "weapons: ['flare', 'scattergun', 'rivet', 'harpoon', 'arc'], weapon: 'arc', ammo: { flare: 8, shell: 12, rivet: 60, bolt: 8, cell: 80 }, hp: 100000";
await T("t.newGame('normal', 3, { mapId: 'C1E2M02' })"); await T('t.clearOverlays()');
await T("t.setup_clearEnemies(); t.setup_player({ " + KIT + " }); t.setup_teleport(96, 51, " + EAST + ")");
await T('t.setup_arcLife(0.9)'); await T('t.tick(40)'); await shot('hip');
await T("t.press('aim')"); await T('t.tick(25)'); await shot('ads'); await T("t.release('aim')"); await T('t.tick(20)');
// four immobile bodies in a line: the arc locks the first (10 m) and jumps down the line
const ids = []; for (const dx of [10, 13, 16, 19]) ids.push(await T("t.setup_spawnEnemy('feeder', " + (96 + dx) + ", 51, Math.PI / 2, 'idle')"));
await T("t.press('fire')"); await T('t.tick(3)'); await shot('chain'); await T("t.release('fire')");
const st = await T('t.state()'); console.log('four feeders after one burst, hp:', JSON.stringify(st.enemies.filter((e) => ids.includes(e.id)).map((e) => Math.round(e.hp))), 'cells', st.player.ammo.cell, 'arc effects', JSON.stringify(await T('t.boltProbe()')));
// a miss crackles into the air
await T("t.setup_clearEnemies(); t.setup_player({ pitch: 0.12 })"); await T('t.tick(30)'); await T("t.press('fire')"); await T('t.tick(2)'); await T("t.release('fire')"); await shot('miss');
// the glow in the dark: the Slurry Undercroft, same spot, lamp stowed and then in hand and firing
await T("t.newGame('normal', 3, { mapId: 'C1E2M07' })"); await T('t.clearOverlays(); t.setup_arcLife(0.9)');
await T("t.setup_clearEnemies(); t.setup_player({ " + KIT + ", weapon: 'flare', pitch: 0 }); t.setup_teleport(54, 33, " + EAST + ")"); await T('t.tick(40)'); await shot('dark-lamp-off');
await T("t.press('weapon5')"); await T('t.tick(2)'); await T("t.release('weapon5')"); await T('t.tick(40)'); await shot('dark-lamp-held');
await T("t.press('fire')"); await T('t.tick(2)'); await shot('dark-lamp-firing'); await T("t.release('fire')");
// pickups
await T("t.newGame('normal', 3, { mapId: 'C1E2M02' })"); await T('t.clearOverlays()');
await T("t.setup_clearEnemies(); t.setup_addPickup('weapon_arc', 99, 51.6); t.setup_addPickup('ammo_cell', 98.6, 53); t.setup_teleport(95.5, 52, " + EAST + "); t.setup_player({ weapon: 'flare', pitch: -0.18, hp: 100000 })"); await T('t.tick(4)'); await shot('pickups');
console.log(JSON.stringify({ errors, hud: await page.$eval('#hud-weapons', (e) => e.textContent), label: await page.$eval('#hud-ammo-label', (e) => e.textContent) }));
await browser.close(); await server.close();
process.exit(errors.length ? 1 : 0);
