// A FAKE PS5 pad driven through the REAL page (PT-013): no controller was available when the controller code was written, so this installs a stand-in `navigator.getGamepads` (the browser's standard layout, a DualSense
// id) and plays it: menu focus with the D-pad, A to confirm, the stick moving and turning the player, R2 firing, L3 sprint as a toggle, R3 melee, Triangle tap = last weapon, Triangle hold = the wheel (time scale), rumble
// calls, pause when the pad unplugs. It proves the WIRING in main.js runs without an error and does what the plan says; it does not prove the real pad's numbering (open /pad.html with the PS5 for that).
//   node tools/dev/probe-pad.mjs   (one Chrome job, idle priority while the machine-load rule stands)
import { createServer } from 'vite';
import puppeteer from 'puppeteer';
import path from 'node:path';
const root = path.resolve(import.meta.dirname, '../..');
const server = await createServer({ root, logLevel: 'error', server: { port: 5253, strictPort: true } }); await server.listen();
const browser = await puppeteer.launch({ headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage(); await page.setViewport({ width: 1280, height: 720 });
const errors = []; page.on('pageerror', (e) => errors.push(String(e))); page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
await page.evaluateOnNewDocument(() => {
  const pad = { id: 'Wireless Controller (STANDARD GAMEPAD Vendor: 054c Product: 0ce6)', index: 0, connected: false, mapping: 'standard', timestamp: 0, buttons: Array.from({ length: 18 }, () => ({ pressed: false, value: 0 })), axes: [0, 0, 0, 0], vibrationActuator: { playEffect: (type, p) => { (window.__rumble ||= []).push([type, p.strongMagnitude, p.weakMagnitude, p.duration]); return Promise.resolve('complete'); } } };
  window.__pad = pad; navigator.getGamepads = () => (pad.connected ? [pad] : [null]);
  window.__press = (i, v = 1) => { pad.buttons[i] = { pressed: v >= 0.5, value: v }; }; window.__release = (i) => { pad.buttons[i] = { pressed: false, value: 0 }; };
});
await page.goto('http://localhost:5253/', { waitUntil: 'domcontentloaded', timeout: 0 });
await page.waitForFunction('window.__GAME_TEST__ && window.__GAME_TEST__.ready', { timeout: 120000 });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const T = (code) => page.evaluate(`(() => { const t = window.__GAME_TEST__; ${code.includes(';') ? code + ';' : 'return ' + code + ';'} })()`);
const tap = async (i, ms = 150) => { await page.evaluate((n) => window.__press(n), i); await sleep(ms); await page.evaluate((n) => window.__release(n), i); await sleep(120); };
const R = {};
// -- the title screen: connect the pad, push the D-pad down, confirm with Cross
await page.evaluate(() => { window.__pad.connected = true; window.dispatchEvent(new Event('gamepadconnected')); }); await sleep(400);
R.legendTitle = await page.$eval('#legend-title', (e) => e.textContent);
await tap(13); await tap(13); R.focusAfterDpad = await page.evaluate(() => document.activeElement?.id || document.activeElement?.tagName);
await tap(0, 200); await sleep(2500); R.modeAfterCross = (await T('t.state()')).mode;
// -- in the game, real time
await T("t.newGame('normal', 3, { mapId: 'C1E2M02', realtime: true })"); await T('t.clearOverlays()'); await T("t.setup_clearEnemies(); t.setup_player({ weapons: ['flare', 'scattergun', 'rivet', 'harpoon', 'arc', 'axe'], weapon: 'flare', ammo: { flare: 20, shell: 20, rivet: 100, bolt: 8, cell: 60 }, hp: 100000, switchT: 0 }); t.setup_teleport(96, 51, " + (-Math.PI / 2) + ")");
await sleep(500);
const st0 = (await T('t.state()')).player; await page.evaluate(() => { window.__pad.axes = [0, -1, 0, 0]; }); await sleep(900); const st1 = (await T('t.state()')).player; await page.evaluate(() => { window.__pad.axes = [0, 0, 0, 0]; });
R.stickMoves = Math.hypot(st1.x - st0.x, st1.z - st0.z) > 2; R.moveDist = +Math.hypot(st1.x - st0.x, st1.z - st0.z).toFixed(2);
const y0 = (await T('t.state()')).player.yaw; await page.evaluate(() => { window.__pad.axes = [0, 0, 1, 0]; }); await sleep(500); await page.evaluate(() => { window.__pad.axes = [0, 0, 0, 0]; }); R.stickTurns = (await T('t.state()')).player.yaw < y0 - 0.3;
const shells0 = (await T('t.state()')).player.ammo.flare; await page.evaluate(() => window.__press(7, 0.9)); await sleep(300); await page.evaluate(() => window.__release(7)); await sleep(200); R.r2Fires = (await T('t.state()')).player.ammo.flare < shells0;
R.rumbleCalls = await page.evaluate(() => (window.__rumble || []).length);
await tap(10, 120); await page.evaluate(() => { window.__pad.axes = [0, -1, 0, 0]; }); await sleep(500); R.l3Sprints = (await T('t.state()')).player.sprinting; await page.evaluate(() => { window.__pad.axes = [0, 0, 0, 0]; }); await sleep(300); R.sprintEnds = !(await T('t.state()')).player.sprinting;
await tap(11, 100); await sleep(300); R.r3SwingEvents = (await T('t.drainEvents()')).filter((e) => e.type === 'swing').length;
await tap(5, 120); await sleep(250); R.weaponAfterR1 = (await T('t.state()')).player.weapon;
await tap(3, 100); await sleep(250); R.weaponAfterTriangleTap = (await T('t.state()')).player.weapon;
await page.evaluate(() => window.__press(3)); await sleep(500); R.wheelWhileHeld = await T('t.wheel()'); await page.evaluate(() => { window.__pad.axes = [0, 0, 0, -1]; }); await sleep(250); R.wheelSel = (await T('t.wheel()')).sel; await page.evaluate(() => { window.__pad.axes = [0, 0, 0, 0]; window.__release(3); }); await sleep(400); R.wheelAfter = await T('t.wheel()');
R.weaponAfterWheel = (await T('t.state()')).player.weapon;
// -- unplugging pauses
await page.evaluate(() => { window.__pad.connected = false; window.dispatchEvent(new Event('gamepaddisconnected')); }); await sleep(500); R.modeAfterUnplug = (await T('t.state()')).mode;
console.log(JSON.stringify(R, null, 1)); console.log(JSON.stringify({ errors }));
await browser.close(); await server.close(); process.exit(errors.length ? 1 : 0);
