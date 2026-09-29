// Browser/runtime verification of the real game in headless Chrome (SwiftShader software GL) via the dev-only __GAME_TEST__ hook.
// Writes screenshots to review/engine-skeleton/ and a JSON report to validation/browser-check.json. Exit 1 on any failed check.
import { createServer } from 'vite';
import puppeteer from 'puppeteer';
import fs from 'node:fs';
import path from 'node:path';
import { loadMapFile, loadRouteFile, runRoute } from '../../src/engine/harness.js';

const root = path.resolve(import.meta.dirname, '../..');
const shots = path.join(root, 'review/engine-skeleton');
fs.mkdirSync(shots, { recursive: true });
const checks = [], errors = [];
const check = (name, ok, detail = '') => { checks.push({ name, ok: !!ok, detail: String(detail) }); console.log(ok ? 'PASS' : 'FAIL', name, detail); };

const server = await createServer({ root, logLevel: 'error', server: { port: 5210, strictPort: true } });
await server.listen();
const browser = await puppeteer.launch({ headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 720 });
page.on('pageerror', (e) => errors.push('pageerror: ' + e));
page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
// runs a single expression (returning its value) or a ';'-separated statement list (returning nothing). A second statement after `return` would never execute.
const T = (code) => page.evaluate(`(() => { const t = window.__GAME_TEST__; ${code.includes(';') ? code + ';' : 'return ' + code + ';'} })()`);
const shot = (name) => page.screenshot({ path: path.join(shots, name + '.png') });
const text = (id) => page.$eval('#' + id, (e) => e.textContent);
const visible = (id) => page.$eval('#' + id, (e) => !e.classList.contains('hidden'));
try {
  await page.goto('http://localhost:5210/', { waitUntil: 'domcontentloaded', timeout: 0 });
  await page.waitForFunction('window.__GAME_TEST__ && window.__GAME_TEST__.ready', { timeout: 120000 });
  check('title screen shown at startup', await visible('screen-title'));
  await shot('01-title');

  // ---- 0. REAL input path: DOM click -> live rAF loop -> fixed-step sim (no test-hook stepping) -------------------------
  const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
  check('audio is locked until the player makes a gesture (no context at startup)', (await T('t.state().audio.state')) === 'locked');
  await page.click('#btn-normal');
  await sleep(700);
  const audioState = await T('t.state().audio.state');
  check('a real click unlocks audio (context running)', audioState === 'running', audioState);
  const live0 = await T('t.state()');
  check('real click on Normal starts a game and the live loop advances the sim', live0.mode === 'playing' && live0.tick > 10, `mode=${live0.mode} tick=${live0.tick}`);
  await page.keyboard.down('KeyW'); await sleep(1000); await page.keyboard.up('KeyW');
  const live1 = await T('t.state()'); const moved = Math.hypot(live1.player.x - live0.player.x, live1.player.z - live0.player.z);
  check('holding a real W key moves the player (live input)', moved > 1.5, `moved ${moved.toFixed(2)} m`);
  await page.mouse.click(640, 360); await sleep(150); await page.mouse.click(640, 360); await sleep(400);   // first click may request pointer lock
  const live2 = await T('t.state()');
  check('real mouse click fires the flare cannon (ammo consumed)', live2.stats.shots >= 1 && live2.player.ammo.flare < 8, `shots=${live2.stats.shots} ammo=${live2.player.ammo.flare} lockFailed=${live2.lockFailed}`);
  const audioAfterFire = await T('t.state().audio');
  check('firing plays the flare cannon sound through the live audio engine', audioAfterFire.played > 0 && (await T('t.audioLog()')).some((x) => x.id === 'flare_fire'), `played=${audioAfterFire.played} last=${audioAfterFire.last.join(',')}`);
  await shot('01b-live-input');
  await page.keyboard.press('Escape'); await sleep(300);
  const escState = await T('t.state()');
  check('Escape pauses (live)', escState.mode === 'paused' && (await visible('screen-pause')), escState.mode);
  await page.keyboard.press('Escape'); await sleep(200);
  check('Escape again resumes (live)', (await T('t.state()')).mode === 'playing');

  // ---- 0b. sprint + aim-down-sights with REAL input in the live loop ----------------------------------------------------
  const runDist = async (keys) => {
    await T('t.setup_clearEnemies(); t.setup_teleport(4, 18, -Math.PI / 2)'); await sleep(120);
    const s0 = await T('t.state()');
    for (const k of keys) await page.keyboard.down(k);
    await sleep(700);
    for (const k of keys.slice().reverse()) await page.keyboard.up(k);
    const s1 = await T('t.state()'); return { d: Math.hypot(s1.player.x - s0.player.x, s1.player.z - s0.player.z), s1 };
  };
  const walk = await runDist(['KeyW']), sprint = await runDist(['ShiftLeft', 'KeyW']);
  check('holding real Shift+W sprints faster than W alone', sprint.d / walk.d > 1.25, `walk ${walk.d.toFixed(2)} m, sprint ${sprint.d.toFixed(2)} m, ratio ${(sprint.d / walk.d).toFixed(2)}`);
  await T('t.setup_teleport(4, 18, -Math.PI / 2)');
  const shotsBefore = (await T('t.state()')).stats.shots;
  await page.keyboard.down('ShiftLeft'); await page.keyboard.down('KeyW'); await sleep(250);
  await page.mouse.click(640, 360); await sleep(200);
  const midSprint = await T('t.state()');
  await page.keyboard.up('KeyW'); await page.keyboard.up('ShiftLeft');
  check('firing is blocked while sprinting (real click during real sprint)', midSprint.player.sprinting && midSprint.stats.shots === shotsBefore, `sprinting=${midSprint.player.sprinting} shots ${shotsBefore}->${midSprint.stats.shots}`);
  await sleep(400);
  await page.mouse.down({ button: 'right' }); await sleep(500);
  const adsOn = await T('t.state()');
  check('holding the real right mouse button brings the sights up and zooms the view', adsOn.player.ads === 1 && adsOn.fov < 50, `ads=${adsOn.player.ads} fov=${adsOn.fov?.toFixed(1)}`);
  await page.mouse.up({ button: 'right' }); await sleep(500);
  const adsOff = await T('t.state()');
  check('releasing right mouse lowers the sights and restores the field of view', adsOff.player.ads === 0 && adsOff.fov > 69, `ads=${adsOff.player.ads} fov=${adsOff.fov?.toFixed(1)}`);

  // ---- 1. canonical route in the browser vs the same route headless in Node -------------------------------------
  const map = loadMapFile(path.join(root, 'maps/C1E1M01.json')), route = loadRouteFile(path.join(root, 'routes/C1E1M01.main.route.json'));
  const node = runRoute(map, route, { seed: 1, difficulty: 'normal' });
  await T("t.newGame('normal', 1)");
  check('game starts and HUD is visible', !(await page.$eval('#hud', (e) => e.classList.contains('hidden'))) && (await text('hud-hp')) === '100');
  await T("t.startBot('C1E1M01.main')");
  await shot('02-spawn');
  let r, lastOp = -1; const want = new Set([1, 4, 6, 9, 12, 15]);
  const t0 = Date.now();
  for (let i = 0; i < 200; i++) {
    r = await T('t.stepBot(30)');
    if (r.op !== lastOp && want.has(r.op)) { await shot('03-route-op' + String(r.op).padStart(2, '0')); }
    lastOp = r.op;
    if (r.done || r.failed || r.status !== 'playing') break;
  }
  await T('t.render(0.016)');
  check('bot completes the canonical route in the browser', r.status === 'complete' && !r.failed, `status=${r.status} failed=${r.failed} ticks=${r.tick}`);
  check('browser sim == Node sim (tick count)', r.tick === node.ticks, `browser ${r.tick} vs node ${node.ticks}`);
  check('browser sim == Node sim (state hash)', r.hash === node.hash, `browser ${r.hash} vs node ${node.hash}`);
  check('all 8 enemies killed, key held', r.stats.kills === 8 && r.player.keys.includes('brass'));
  const heard = new Set((await T('t.audioLog()')).map((x) => x.id)), all = await T('t.state().audio.played');
  check('the route was audible: many sounds played incl. explosion, key, door, death, footsteps', all > 30 && ['flare_boom', 'pickup_key', 'door_open', 'enemy_die'].every((id) => heard.has(id)), `played=${all} distinct(last40)=${[...heard].join(',')}`);
  await page.waitForFunction("!document.getElementById('screen-complete').classList.contains('hidden')", { timeout: 15000 }).catch(() => {});
  check('intermission screen shows end-level statistics', (await visible('screen-complete')) && /Kills/.test(await text('stat-rows')), (await text('stat-rows')).replace(/\s+/g, ' '));
  await shot('04-intermission');
  console.log('route wall time (SwiftShader):', ((Date.now() - t0) / 1000).toFixed(1) + 's');

  // ---- 2. secret route -------------------------------------------------------------------------------------------
  await T("t.newGame('normal', 1)"); await T("t.startBot('C1E1M01.secret')");
  for (let i = 0; i < 250; i++) { r = await T('t.stepBot(30)'); if (r.done || r.failed || r.status !== 'playing') break; }
  check('secret route: secret found and level completed', r.status === 'complete' && r.stats.secrets === 1, `secrets=${r.stats.secrets}`);

  // ---- 3. save / resume determinism in the browser ----------------------------------------------------------------
  await T("t.newGame('hard', 5)");
  await T("t.press('forward'); t.addYaw(0.4)"); await T('t.tick(240)');
  await T('t.save()');
  await T("t.setup_player({ hp: 55 })");
  await T('t.tick(180)'); const a = await T('t.state()');
  await T('t.load()');
  const loaded = await T('t.state()');
  check('quick load restores the saved state (hp back, tick back)', loaded.player.hp !== 55 && loaded.tick === 240, `tick=${loaded.tick} hp=${loaded.player.hp}`);
  await T("t.press('forward')");                                  // loading releases held keys (correct); a player re-presses
  await T('t.tick(180)'); const b = await T('t.state()');
  check('resumed play equals uninterrupted play except the deliberate hp edit', b.tick === a.tick && Math.abs(b.player.x - a.player.x) < 1e-6 && Math.abs(b.player.z - a.player.z) < 1e-6, `x ${a.player.x.toFixed(3)} vs ${b.player.x.toFixed(3)}`);
  await T('t.pause()'); check('pause shows the pause menu', await visible('screen-pause')); await shot('05-pause');
  await T('t.resume()');

  // ---- 4. death + recovery ------------------------------------------------------------------------------------------
  await T("t.newGame('normal', 2)"); await T("t.setup_player({ hp: 0 })"); await T('t.tick(2)');
  const dead = await T('t.state()');
  check('player death is detected', dead.status === 'dead' && dead.mode === 'dying', `${dead.status}/${dead.mode}`);
  await page.waitForFunction("!document.getElementById('screen-dead').classList.contains('hidden')", { timeout: 15000 }).catch(() => {});
  check('death screen appears', await visible('screen-dead')); await shot('06-death');
  await page.click('#btn-retry');
  const again = await T('t.state()'); check('retry restarts the level with a live player', again.status === 'playing' && again.player.hp > 0 && again.tick === 0);

  // ---- 5. combat visuals + effects ----------------------------------------------------------------------------------
  await T("t.newGame('normal', 3)"); await T('t.tick(30)'); await shot('07-hall');
  await T("t.press('aim')"); await T('t.tick(30)'); await shot('07b-ads'); await T("t.release('aim')"); await T('t.tick(30)');
  await T("t.press('forward'); t.press('sprint')"); await T('t.tick(30)'); await shot('07c-sprint'); await T("t.release('forward'); t.release('sprint')"); await T('t.tick(30)');
  await T("t.setup_teleport(11, 13, -Math.PI / 2)"); await T("t.press('fire')"); await T('t.tick(2)'); await T("t.release('fire')"); await shot('08-fire-muzzle');
  await T('t.tick(20)'); await shot('09-flare-flight'); await T('t.tick(25)'); await shot('10-aftermath');
  await T("t.setup_teleport(48, 8, -Math.PI / 2)"); await T('t.tick(10)'); await shot('11-quay');

  // ---- 6. lifecycle: repeated level transitions must not leak GPU resources --------------------------------------------
  await T("t.newGame('normal', 4)"); await T('t.tick(5)'); const g0 = await T('t.gl()');
  for (let i = 0; i < 12; i++) { await T(`t.newGame('normal', ${10 + i})`); await T('t.tick(3)'); }
  const g1 = await T('t.gl()');
  check('no GPU leak across 12 level restarts (geometries/textures stable)', g1.geometries <= g0.geometries + 2 && g1.textures <= g0.textures + 2, `geometries ${g0.geometries}->${g1.geometries}, textures ${g0.textures}->${g1.textures}, programs ${g0.programs}->${g1.programs}`);

  // ---- 7. real-time frames: fps/frame time (software GL: NOT a valid perf number) --------------------------------------
  await T("t.newGame('normal', 6, { realtime: true })"); await T("t.press('forward')");
  await new Promise((res) => setTimeout(res, 6000));
  const perf = await T('t.perf()'); const gl = await T('t.gl()');
  console.log('perf (SwiftShader, 1280x720):', JSON.stringify(perf), JSON.stringify(gl));
  check('real-time loop runs frames without exceptions', perf.frames > 20, `frames=${perf.frames} avg=${perf.avgMs.toFixed(1)}ms`);
  await T("t.release('forward')");
  fs.writeFileSync(path.join(root, 'validation/browser-check.json'), JSON.stringify({ when: new Date().toISOString(), env: 'headless Chrome 154, SwiftShader software GL, 1280x720', checks, errors, perf, gl, note: 'perf numbers are software-GL and are NOT a performance claim' }, null, 2));
} catch (e) { errors.push('script: ' + (e.stack || e)); }
check('no uncaught exceptions or console errors', errors.length === 0, errors.slice(0, 3).join(' | '));
await browser.close(); await server.close();
const failed = checks.filter((c) => !c.ok);
console.log(`\n${checks.length - failed.length}/${checks.length} checks passed`);
process.exit(failed.length ? 1 : 0);
