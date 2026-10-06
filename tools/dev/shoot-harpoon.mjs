// Visual check of the Harpoon rifle (weapon 4) on C1E2M02: hip, sights (the long zoom), muzzle flash with the streak, the cycled action, a bolt left in a wall, the pickups, and a piercing shot through two bodies.
// Appearance evidence only (the sim half is tests/harpoon.test.js). Writes review/engine-skeleton/harpoon-*.png
import { savePng } from './savepng.mjs';
import { createServer } from 'vite';
import puppeteer from 'puppeteer';
import fs from 'node:fs';
import path from 'node:path';
const root = path.resolve(import.meta.dirname, '../..');
const out = path.join(root, 'review/engine-skeleton');
fs.mkdirSync(out, { recursive: true });
const server = await createServer({ root, logLevel: 'error', server: { port: 5241, strictPort: true } });
await server.listen();
const browser = await puppeteer.launch({ headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 720 });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e))); page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
await page.goto('http://localhost:5241/', { waitUntil: 'domcontentloaded', timeout: 0 });
await page.waitForFunction('window.__GAME_TEST__ && window.__GAME_TEST__.ready', { timeout: 120000 });
const T = (code) => page.evaluate(`(() => { const t = window.__GAME_TEST__; ${code.includes(';') ? code + ';' : 'return ' + code + ';'} })()`);
const shot = async (n) => { await T('t.clearOverlays(); t.render(0.02)'); await savePng(page, path.join(out, 'harpoon-' + n + '.png')); console.log('shot', n); };
const EAST = -Math.PI / 2;
await T("t.newGame('normal', 3, { mapId: 'C1E2M02' })"); await T('t.clearOverlays()');
await T("t.setup_clearEnemies(); t.setup_player({ weapons: ['flare', 'scattergun', 'rivet', 'harpoon'], weapon: 'harpoon', ammo: { flare: 8, shell: 12, rivet: 60, bolt: 12 }, hp: 100000 }); t.setup_teleport(96, 51, " + EAST + ")");
const far = await T("t.setup_spawnEnemy('bellhand', 118, 51, Math.PI / 2, 'idle')");
await T('t.tick(40)'); await shot('hip');
await T("t.press('aim')"); await T('t.tick(30)'); await shot('ads');
await T("t.press('fire')"); await T('t.tick(2)'); await T("t.release('fire')"); await shot('flash');
await T('t.tick(40)'); await shot('cycled');
const st = await T('t.state()'); console.log('after one bolt at a Bellhand 22 m away:', JSON.stringify({ ammo: st.player.ammo, alive: st.enemies?.filter((e) => e.state !== 'dead').map((e) => ({ id: e.id, state: e.state, hp: Math.round(e.hp) })) }));
await T("t.release('aim')"); await T('t.tick(20)');
// a bolt left in a wall: the settling tank is 6 m south of the lane
await T("t.setup_teleport(96, 51, " + Math.PI + "); t.setup_clearEnemies()"); await T("t.press('aim')"); await T('t.tick(25)');
await T("t.press('fire')"); await T('t.tick(2)'); await T("t.release('fire')"); await T("t.release('aim')"); await T('t.tick(30)');
await T("t.setup_teleport(94.6, 52.4, " + (Math.PI + 0.55) + "); t.setup_player({ pitch: 0.02 })"); await T('t.tick(2)'); await shot('wall');
// two bodies on one line
await T("t.setup_clearEnemies(); t.setup_teleport(96, 51, " + EAST + "); t.setup_player({ pitch: 0, bolt: 0, ammo: { flare: 8, shell: 12, rivet: 60, bolt: 12 } })");
const a = await T("t.setup_spawnEnemy('feeder', 106, 51, Math.PI / 2, 'idle')"), b = await T("t.setup_spawnEnemy('feeder', 110, 51, Math.PI / 2, 'idle')");
await T('t.tick(90)'); await T("t.press('aim')"); await T('t.tick(25)'); { const pre = await T('t.state()'); console.log('pre', JSON.stringify(pre.enemies.filter((e) => e.id === a || e.id === b).map((e) => ({ id: e.id, x: e.x, z: e.z, y: e.y, st: e.state })))); } await T("t.press('fire')"); await T('t.tick(2)'); await T("t.release('fire')"); await T("t.release('aim')");
const st2 = await T('t.state()'); console.log('two cradle feeders (100 hp, they cannot move) on one line, one bolt: bolts left', st2.player.ammo.bolt, 'cooldown', st2.player.cooldown, 'weapon', st2.player.weapon, 'ads', st2.player.ads, 'pos', st2.player.x, st2.player.z, 'yaw', st2.player.yaw, JSON.stringify(st2.enemies?.filter((e) => e.state !== 'dead' || e.id === a || e.id === b).map((e) => ({ id: e.id, state: e.state, hp: Math.round(e.hp) })).filter((e) => e.id === a || e.id === b)));
await T('t.tick(12)'); await shot('pierce');
// pickups
await T("t.setup_clearEnemies(); t.setup_addPickup('weapon_harpoon', 99, 51.6); t.setup_addPickup('ammo_bolt', 98.6, 53); t.setup_teleport(95.5, 52, " + EAST + "); t.setup_player({ weapon: 'flare', pitch: -0.18 })");
await T('t.tick(4)'); await shot('pickups');
console.log(JSON.stringify({ errors, hud: await page.$eval('#hud-weapons', (e) => e.textContent), label: await page.$eval('#hud-ammo-label', (e) => e.textContent) }));
await browser.close(); await server.close();
process.exit(errors.length ? 1 : 0);
