// Visual check of the second weapon and enemy: scattergun stances/flash/pump/switch, Gaunt poses, new pickups.
// Writes review/engine-skeleton/weapons-*.png
import { createServer } from 'vite';
import puppeteer from 'puppeteer';
import fs from 'node:fs';
import path from 'node:path';
const root = path.resolve(import.meta.dirname, '../..');
const out = path.join(root, 'review/engine-skeleton');
fs.mkdirSync(out, { recursive: true });
const server = await createServer({ root, logLevel: 'error', server: { port: 5240, strictPort: true } });
await server.listen();
const browser = await puppeteer.launch({ headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 720 });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e))); page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
await page.goto('http://localhost:5240/', { waitUntil: 'domcontentloaded', timeout: 0 });
await page.waitForFunction('window.__GAME_TEST__ && window.__GAME_TEST__.ready', { timeout: 120000 });
const T = (code) => page.evaluate(`(() => { const t = window.__GAME_TEST__; ${code.includes(';') ? code + ';' : 'return ' + code + ';'} })()`);
const shot = (n) => page.screenshot({ path: path.join(out, 'weapons-' + n + '.png') });
await T("t.newGame('normal', 3)");
await T("t.setup_clearEnemies(); t.setup_player({ weapons: ['flare', 'scattergun'], weapon: 'scattergun', ammo: { flare: 8, shell: 12 } }); t.setup_teleport(4, 18, -Math.PI / 2)");
await T('t.tick(30)'); await shot('scatter-hip');
await T("t.press('aim')"); await T('t.tick(30)'); await shot('scatter-ads');
await T("t.press('fire')"); await T('t.tick(2)'); await T("t.release('fire')"); await shot('scatter-flash');
await T('t.tick(30)'); await shot('scatter-pump'); await T("t.release('aim')"); await T('t.tick(40)');
await T("t.press('forward'); t.press('sprint')"); await T('t.tick(30)'); await shot('scatter-sprint'); await T("t.release('forward'); t.release('sprint')"); await T('t.tick(30)');
await T('t.setup_teleport(4, 18, -Math.PI / 2); t.press(\'weapon1\')'); await T("t.tick(1); t.release('weapon1')"); await T('t.tick(6)'); await shot('switch-mid');
// enemies side by side: Tollbearer (left) vs Gaunt (right), Gaunt in each pose
await T("t.setup_teleport(4, 12, -Math.PI / 2); t.setup_player({ weapon: 'flare' })"); await T('t.tick(30)');
const tb = await T("t.setup_spawnEnemy('tollbearer', 10.5, 9.8, -Math.PI / 2, 'chase')");
const g1 = await T("t.setup_spawnEnemy('gaunt', 8.6, 12.3, -Math.PI / 2, 'chase')");
await T(`t.setup_enemy(${g1}, { lungeT: 0.15, lungeCd: 9 })`); await T('t.render(0.01)'); await shot('gaunt-crouch');
await T(`t.setup_enemy(${g1}, { lungeT: 0.5, walk: 1 })`); await T('t.render(0.01)'); await shot('gaunt-dash');
await T(`t.setup_enemy(${g1}, { lungeT: -1, walk: 1, phase: 1.2 })`); await T('t.render(0.01)'); await shot('gaunt-run');
await T(`t.setup_enemy(${g1}, { attackT: 0.5, walk: 0 })`); await T('t.render(0.01)'); await shot('gaunt-swipe');
await T(`t.setup_enemy(${g1}, { state: 'dead', dead: 1, attackT: -1 })`); await T('t.render(0.01)'); await shot('gaunt-dead');
// pickups
await T("t.setup_clearEnemies(); t.setup_addPickup('weapon_scattergun', 7, 11.2); t.setup_addPickup('ammo_shell', 6.6, 13); t.setup_addPickup('ammo_flare', 8.4, 13); t.setup_teleport(4, 12, -Math.PI / 2); t.setup_player({ weapon: 'flare' })");
await T('t.tick(4)'); await shot('pickups');
console.log(JSON.stringify({ errors, hud: await page.$eval('#hud-weapons', (e) => e.textContent), label: await page.$eval('#hud-ammo-label', (e) => e.textContent) }));
await browser.close(); await server.close();
process.exit(errors.length ? 1 : 0);
