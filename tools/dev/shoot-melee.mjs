// Real-game stills for the weapons / melee / controls batch (PT-013): the fists in the sights of nothing (ready, jab, charged punch, guard), a found weapon, a gun bash, a parry, the lamp charging and its bolt, the
// flare's burning ground, the weapon wheel (frozen on Easy, with the clock note), the hit marker. Appearance evidence only (the sim half is tests/identity.test.js and tests/melee.test.js).
// Writes review/pt-013/*.png and prints console errors (exit 1 if any). Run it at idle priority on two cores while the machine-load rule stands (AGENTS.md).
//   node tools/dev/shoot-melee.mjs [outDir]
import { savePng } from './savepng.mjs';
import { createServer } from 'vite';
import puppeteer from 'puppeteer';
import fs from 'node:fs';
import path from 'node:path';
const root = path.resolve(import.meta.dirname, '../..');
const out = path.resolve(process.argv[2] ?? path.join(root, 'review/pt-013'));
fs.mkdirSync(out, { recursive: true });
const server = await createServer({ root, logLevel: 'error', server: { port: 5251, strictPort: true } });
await server.listen();
const browser = await puppeteer.launch({ headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 720 });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e))); page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
await page.goto('http://localhost:5251/', { waitUntil: 'domcontentloaded', timeout: 0 });
await page.waitForFunction('window.__GAME_TEST__ && window.__GAME_TEST__.ready', { timeout: 120000 });
const T = (code) => page.evaluate(`(() => { const t = window.__GAME_TEST__; ${code.includes(';') ? code + ';' : 'return ' + code + ';'} })()`);
const shot = async (n) => { await T('t.clearOverlays(); t.render(0.02)'); await new Promise((r) => setTimeout(r, 450)); await T('t.render(0.02)'); await savePng(page, path.join(out, n + '.png')); console.log('shot', n); };          // (the HUD is drawn by the page's own frame loop: give it a few frames)
const EAST = -Math.PI / 2, KIT = "weapons: ['flare', 'scattergun', 'rivet', 'harpoon', 'arc', 'boathook', 'marlinspike', 'mallet', 'axe'], ammo: { flare: 12, shell: 12, rivet: 60, bolt: 8, cell: 80 }, hp: 100000, switchT: 0";
const tap = async (a, ticks = 2) => { await T(`t.press('${a}')`); await T(`t.tick(${ticks})`); await T(`t.release('${a}')`); };
await T("t.newGame('normal', 3, { mapId: 'C1E2M02' })"); await T('t.clearOverlays()');
await T("t.setup_clearEnemies(); t.setup_player({ " + KIT + ", weapon: 'fists' }); t.setup_teleport(96, 51, " + EAST + ")"); await T('t.tick(30)');
await shot('fists-ready');
const b1 = await T("t.setup_spawnEnemy('tollbearer', 98.6, 51, Math.PI / 2, 'idle')"); await T("t.setup_enemy(" + b1 + ", { hp: 100000, stunT: 1e9 })");
await T("t.press('fire')"); await T('t.tick(2)'); await T("t.release('fire')"); await T('t.tick(3)'); await shot('fists-jab');
await T('t.tick(30)'); await T("t.press('fire')"); await T('t.tick(36)'); await shot('fists-charged'); await T("t.release('fire')"); await T('t.tick(8)'); await shot('fists-heavy');
await T('t.tick(60)'); await T("t.press('aim')"); await T('t.tick(10)'); await shot('fists-guard'); await T("t.release('aim')");
// the four found weapons (PT-017: how they are HELD and how a swing reads): ready, half way through the pull-back, the instant the blow lands (the sim's windup), the guard; the windup in ticks from defs.js
const { WEAPONS: WD } = await import('../../src/engine/defs.js');
for (const id of ['boathook', 'marlinspike', 'mallet', 'axe']) {
  await T("t.setup_player({ weapon: '" + id + "', switchT: 0 })"); await T('t.tick(40)'); await shot(id + '-ready');
  const wt = Math.round(WD[id].swing.windup * 60); await T("t.press('fire')"); await T('t.tick(' + Math.max(1, Math.round(wt * 0.4)) + ')'); await shot(id + '-pull'); await T('t.tick(' + (wt - Math.round(wt * 0.4)) + ')'); await shot(id + '-hit'); await T("t.release('fire')"); await T('t.tick(60)');
  await T("t.press('aim')"); await T('t.tick(14)'); await shot(id + '-guard'); await T("t.release('aim')"); await T('t.tick(20)');
}
await T("t.setup_player({ weapon: 'flare', switchT: 0 })");
await tap('weapon1'); await T('t.tick(30)'); await tap('melee', 1); await T('t.tick(4)'); await shot('flare-bash');
// a parry: a Tollbearer's blow about to land, the guard raised a moment before it (a fresh world each time: bodies of the last scene would lie in this one)
await T("t.newGame('normal', 3, { mapId: 'C1E2M02' })"); await T('t.clearOverlays()'); await T("t.setup_clearEnemies(); t.setup_player({ " + KIT + ", weapon: 'fists' }); t.setup_teleport(96, 51, " + EAST + ")"); await T('t.tick(30)');
const b2 = await T("t.setup_spawnEnemy('tollbearer', 98.0, 51, Math.PI / 2, 'chase')"); await T("t.setup_enemy(" + b2 + ", { hp: 100000, attackT: 0.9, struck: false, cd: 0 })");
await T("t.press('aim')"); await T('t.tick(4)'); await shot('parry'); await T("t.release('aim')");
// the lamp: charging, charged, and the bolt
await T("t.newGame('normal', 3, { mapId: 'C1E2M02' })"); await T('t.clearOverlays()'); await T("t.setup_clearEnemies(); t.setup_player({ " + KIT + ", weapon: 'arc' }); t.setup_teleport(96, 51, " + EAST + ")"); await T('t.setup_arcLife(0.9)'); await T('t.tick(30)');
for (const dx of [8, 11, 14]) { const id = await T("t.setup_spawnEnemy('feeder', " + (96 + dx) + ", 51 + " + (dx % 2 ? 0.5 : -0.5) + ", Math.PI / 2, 'idle')"); void id; }
await T("t.press('fire')"); await T('t.tick(40)'); await shot('lamp-charging'); await T('t.tick(40)'); await shot('lamp-charged'); await T("t.release('fire')"); await T('t.tick(3)'); await shot('lamp-bolt');
// the flare: the burst and the ground that burns, in an empty street (the harbour's first map), flares thrown at the cobbles
await T("t.newGame('normal', 3, { mapId: 'C1E1M01' })"); await T('t.clearOverlays()'); await T("t.setup_clearEnemies(); t.setup_player({ " + KIT + ", weapon: 'flare', pitch: -0.12 })"); await T('t.tick(30)'); await shot('flare-aim');
await T("t.press('fire')"); await T('t.tick(2)'); await T("t.release('fire')"); await T('t.tick(34)'); await shot('flare-burst'); await T('t.tick(50)'); await shot('flare-burning'); await T('t.tick(60)'); await shot('flare-dying');
// the wheel: Easy freezes the clock; hold the last-weapon key for longer than a tap
await T("t.setup_clearEnemies()"); await T('t.newGame("easy", 3, { realtime: true, mapId: "C1E2M02" })'); await T('t.clearOverlays()'); await T("t.setup_player({ " + KIT + ", weapon: 'scattergun' }); t.setup_teleport(96, 51, " + EAST + ")");
await new Promise((r) => setTimeout(r, 400));
await page.keyboard.down('KeyQ'); await new Promise((r) => setTimeout(r, 450));
await T('t.setup_wheelFeed(90, -80)');
await new Promise((r) => setTimeout(r, 300)); await savePng(page, path.join(out, 'wheel-easy.png')); console.log('shot wheel-easy', JSON.stringify(await T('t.wheel()')));
const t0 = (await T('t.state()')).tick; await new Promise((r) => setTimeout(r, 500)); const t1 = (await T('t.state()')).tick; console.log('ticks while the wheel is open on Easy:', t1 - t0);
await page.keyboard.up('KeyQ'); await new Promise((r) => setTimeout(r, 300));
console.log(JSON.stringify({ errors, weapon: (await T('t.state()')).player.weapon, hud: await page.$eval('#hud-weapons', (e) => e.textContent) }));
await browser.close(); await server.close();
process.exit(errors.length ? 1 : 0);
