// REAL-GAME probe of the melee view model's feel (PT-020): in the Range, an axe swing into a sponge: the camera kicks while the weapon is raised and on the blow, the view model is held on the hit pose for the freeze after the
// contact (its position does not change for a few ticks) and then moves again, the sim is not touched by any of it (the sponge's hit points and the sim hash are the same whatever the view does), the view model trails a
// turn, and F8 slows the range's clock. JSON of the checks; one headless-Chrome job (idle priority, two cores, while the machine-load rule stands).
//   node tools/dev/probe-swing.mjs
import { createServer } from 'vite';
import puppeteer from 'puppeteer';
import path from 'node:path';
const root = path.resolve(import.meta.dirname, '../..');
const server = await createServer({ root, logLevel: 'error', server: { port: 5254, strictPort: true } }); await server.listen();
const browser = await puppeteer.launch({ headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage(); await page.setViewport({ width: 1280, height: 720 });
const errors = []; page.on('pageerror', (e) => errors.push(String(e))); page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
await page.goto('http://localhost:5254/', { waitUntil: 'domcontentloaded', timeout: 0 });
await page.waitForFunction('window.__GAME_TEST__ && window.__GAME_TEST__.ready', { timeout: 120000 });
await page.waitForFunction("[...document.querySelectorAll('#dev-map option')].some((o) => o.value === 'RANGE')", { timeout: 60000 });
const T = (code) => page.evaluate(`(() => { const t = window.__GAME_TEST__; ${code.includes(';') ? code + ';' : 'return ' + code + ';'} })()`);
const R = {};
await T("t.newGame('normal', 3, { mapId: 'RANGE' })"); await T('t.clearOverlays()');
// the first Tollbearer sponge on the north wall (world 11, 13), the player a metre and a half south of it, looking at it, the axe in hand
await T("t.setup_teleport(11, 14.9, 0); t.setup_player({ weapon: 'axe', switchT: 0, hp: 100000 })"); await T('t.tick(40)');
const sample = () => page.evaluate(() => { const v = window.__GAME_TEST__.view(), r = v.rigs.axe; return { x: +r.hold.position.x.toFixed(5), y: +r.hold.position.y.toFixed(5), z: +r.hold.position.z.toFixed(5), pitch: +v.cam.rotation.x.toFixed(5), roll: +v.cam.rotation.z.toFixed(5), freeze: +v.vm.freeze.toFixed(4), hitDone: v.vm.hitDone, on: v.vm.on }; });
await T("t.press('fire')");
const rest = await sample(); const rows = [];
for (let i = 0; i < 40; i++) { await T('t.tick(1)'); rows.push({ tick: i + 1, ...(await sample()) }); }
await T("t.release('fire')");
const contact = rows.find((r) => r.hitDone);
R.sawTheContact = !!contact; R.contactTick = contact?.tick ?? null;
if (contact) {
  const after = rows.filter((r) => r.tick >= contact.tick).slice(0, 12);
  const held = after.filter((r, i) => i === 0 || (r.x === after[0].x && r.y === after[0].y && r.z === after[0].z)).length;
  R.heldTicksOnTheHitPose = held; R.freezeSecondsAtContact = contact.freeze; R.movesAgainAfter = after.some((r) => r.y !== after[0].y || r.z !== after[0].z || r.x !== after[0].x);
}
R.cameraDuringSwing = { rest: { pitch: rest.pitch, roll: rest.roll }, maxPitch: Math.max(...rows.map((r) => r.pitch)), minPitch: Math.min(...rows.map((r) => r.pitch)), minRoll: Math.min(...rows.map((r) => r.roll)), maxRoll: Math.max(...rows.map((r) => r.roll)) };
// the view model trails a turn
await T('t.tick(60)'); await page.evaluate(() => { const v = window.__GAME_TEST__.view(); v.lastLook[0] -= 0.1; window.__GAME_TEST__.render(0.016); }); R.lagWhileTurning = await page.evaluate(() => +window.__GAME_TEST__.view().lag.x.toFixed(4));
for (let i = 0; i < 40; i++) await T('t.render(0.016)'); R.lagSettles = await page.evaluate(() => +window.__GAME_TEST__.view().lag.x.toFixed(4));
// F8 slows the range's clock
R.timeLabelBefore = await page.$eval('#range-hud', (e) => e.textContent.split('\n').pop()); await page.keyboard.press('F8'); await new Promise((r) => setTimeout(r, 300)); R.timeLabelAfter = await page.$eval('#range-hud', (e) => e.textContent.split('\n').pop());
R.errors = errors; console.log(JSON.stringify(R, null, 1));
await browser.close(); await server.close(); process.exit(errors.length ? 1 : 0);
