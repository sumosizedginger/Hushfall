// Browser/runtime verification of the real game in headless Chrome (SwiftShader software GL) via the dev-only __GAME_TEST__ hook.
// Writes screenshots to review/engine-skeleton/ and a JSON report to validation/browser-check.json. Exit 1 on any failed check.
import { savePng } from './savepng.mjs';
import { createServer } from 'vite';
import puppeteer from 'puppeteer';
import fs from 'node:fs';
import path from 'node:path';
import { loadMapFile, loadRouteFile, runRoute } from '../../src/engine/harness.js';
import { platformState } from '../../src/engine/platforms.js';
import crypto from 'node:crypto';
import { PNG } from 'pngjs';
import { textSha, sourceShas } from '../textsha.mjs';
import { runRenderCensus } from './render-census.mjs';
import { runRouteParity } from './route-parity.mjs';
import { execSync } from 'node:child_process';
const updateBaseline = process.argv.includes('--update-baseline');

const root = path.resolve(import.meta.dirname, '../..');
const shots = path.join(root, 'review/engine-skeleton');
fs.mkdirSync(shots, { recursive: true });
const checks = [], errors = []; let perf = null, gl = null, g2 = null, renderGround = null;
const check = (name, ok, detail = '') => { checks.push({ name, ok: !!ok, detail: String(detail) }); console.log(ok ? 'PASS' : 'FAIL', name, detail); };

const server = await createServer({ root, logLevel: 'error', server: { port: 5210, strictPort: true } });
await server.listen();
const browser = await puppeteer.launch({ headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage();
await page.evaluateOnNewDocument(() => { navigator.getGamepads = () => [null, null, null, null]; });          // a controller plugged into the machine (a DualSense with a stick at rest) steers the page in its real-time sections: this check is about the keyboard and the mouse (tools/dev/probe-pad.mjs installs its own fake pad)
await page.setViewport({ width: 1280, height: 720 });
page.on('pageerror', (e) => errors.push('pageerror: ' + e));
page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
// runs a single expression (returning its value) or a ';'-separated statement list (returning nothing). A second statement after `return` would never execute.
const T = (code) => page.evaluate(`(() => { const t = window.__GAME_TEST__; ${code.includes(';') ? code + ';' : 'return ' + code + ';'} })()`);
const shot = (name) => savePng(page, path.join(shots, name + '.png'));
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
  let live0 = await T('t.state()'); for (let i = 0; i < 20 && !(live0.mode === 'playing' && live0.tick > 10); i++) { await sleep(250); live0 = await T('t.state()'); }          // a loaded machine draws fewer frames a second: wait for the loop instead of reading once
  check('real click on Normal starts a game and the live loop advances the sim', live0.mode === 'playing' && live0.tick > 10, `mode=${live0.mode} tick=${live0.tick}`);
  await sleep(500);
  const cardVisible = await page.$eval('#card', (e) => !e.classList.contains('hidden') && getComputedStyle(e).opacity > 0.3);
  check('a fresh run shows the level title card', cardVisible && (await text('card-title')) === 'MARROW QUAY' && (await text('card-lines')).includes('Hush'), await text('card-title'));
  await shot('00-intro-card');
  // REAL walk down the pier (no teleport): the first two transmissions trigger back to back while the title card is still up; they must queue and show IN ORDER
  await page.keyboard.down('KeyW'); await sleep(2600); await page.keyboard.up('KeyW');
  const seenNow = await T('t.state().messagesSeen');
  check('walking the pier for real triggers pier-start first, then pier-tower (no teleport)', seenNow[0] === 'pier-start' && seenNow.includes('pier-tower'), seenNow.join(','));
  check('transmissions wait behind the title card instead of stacking on it', (await visible('card')) && !(await visible('comms')), 'card visible, comms hidden while the card is up');
  await page.waitForFunction("!document.getElementById('comms').classList.contains('hidden')", { timeout: 12000 }).catch(() => {});
  const first = await text('comms-who') + ': ' + await text('comms-text');
  check('the FIRST transmission shown is the first one triggered (FIFO), with speaker and text', first.startsWith('SIGNAL HOUSE') && first.includes('Calder'), first);
  const radio1 = (await T('t.audioLog()')).filter((x) => x.id === 'radio').length;
  check('the radio blip plays when the message is shown (not before)', radio1 === 1, 'radio plays so far: ' + radio1);
  await shot('00b-transmission');
  await page.waitForFunction("document.getElementById('comms-who').textContent === 'INES'", { timeout: 12000 }).catch(() => {});
  const second = await text('comms-who') + ': ' + await text('comms-text');
  check('the second transmission follows the first, one at a time', second.startsWith('INES') && second.toLowerCase().includes('teal') && (await T('t.audioLog()')).filter((x) => x.id === 'radio').length === 2, second);
  await T('t.setup_clearEnemies()');                 // the Tollbearer at the end of the pier has woken while we walked: stand it down so the next checks are not a fight
  await T('t.setup_teleport(9, 33, -Math.PI / 2)');
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
    await T('t.setup_clearEnemies(); t.setup_teleport(8, 34, -Math.PI / 2)'); await sleep(120);
    const s0 = await T('t.state()');
    for (const k of keys) await page.keyboard.down(k);
    await sleep(700);
    for (const k of keys.slice().reverse()) await page.keyboard.up(k);
    const s1 = await T('t.state()'); return { d: Math.hypot(s1.player.x - s0.player.x, s1.player.z - s0.player.z), s1 };
  };
  const walk = await runDist(['KeyW']), sprint = await runDist(['ShiftLeft', 'KeyW']);
  check('holding real Shift+W sprints faster than W alone', sprint.d / walk.d > 1.25, `walk ${walk.d.toFixed(2)} m, sprint ${sprint.d.toFixed(2)} m, ratio ${(sprint.d / walk.d).toFixed(2)}`);
  await T('t.setup_teleport(8, 34, -Math.PI / 2)');
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

  // ---- 0c. second weapon with REAL input: number key, click, mouse wheel ----------------------------------------------
  await T("t.setup_clearEnemies(); t.setup_player({ weapons: ['flare', 'scattergun'], ammo: { flare: 8, shell: 10 } }); t.setup_teleport(8, 34, -Math.PI / 2)");
  await page.keyboard.press('Digit2'); await sleep(700);
  const sw = await T('t.state()');
  check('real 2 key switches to the scattergun and the HUD follows', sw.player.weapon === 'scattergun' && (await text('hud-ammo-label')) === 'SHELLS' && (await text('hud-ammo')) === '10', `weapon=${sw.player.weapon} label=${await text('hud-ammo-label')} ammo=${await text('hud-ammo')}`);
  await page.mouse.click(640, 360); await sleep(300);
  const fired = await T('t.state()');
  check('real click fires the scattergun (one shell, its own sound)', fired.player.ammo.shell === 9 && (await T('t.audioLog()')).some((x) => x.id === 'scatter_fire'), `shells=${fired.player.ammo.shell}`);
  await sleep(1100); await page.mouse.move(640, 360); await page.mouse.wheel({ deltaY: 100 }); await sleep(700);
  const wheel1 = await T('t.state()');
  await sleep(1100); await page.mouse.wheel({ deltaY: 100 }); await sleep(700);
  const wheel = await T('t.state()');
  check('mouse wheel cycles weapons (the scattergun, then the fists which are always carried, then wraps back to the flare cannon)', wheel1.player.weapon === 'fists' && wheel.player.weapon === 'flare', `${wheel1.player.weapon} then ${wheel.player.weapon}`);

  // ---- 0d. automap with REAL input -------------------------------------------------------------------------------------
  await T("t.setup_clearEnemies(); t.setup_teleport(8, 34, -Math.PI / 2)"); await sleep(500);
  await page.keyboard.press('Tab'); await sleep(400);
  const mapVisible = await page.$eval('#automap', (e) => !e.classList.contains('hidden'));
  const painted = await page.$eval('#automap', (c) => { const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let n = 0; for (let i = 3; i < d.length; i += 16) if (d[i] > 0) n++; return n; });
  const am = await T('t.automap()');
  check('real Tab opens the automap, it paints, and it shows only what has been explored', mapVisible && painted > 1000 && am.exploredCount > 20 && am.exploredCount < 300 && am.kinds.includes('outdoor') && am.kinds.includes('water') && am.exits === 0, `visible=${mapVisible} painted=${painted} explored=${am.exploredCount} exits=${am.exits}`);
  await T('t.clearOverlays()'); await shot('01c-automap');
  await page.keyboard.press('Tab'); await sleep(300);
  check('Tab again closes the automap', (await page.$eval('#automap', (e) => e.classList.contains('hidden'))) && (await T('t.mapOpen()')) === false);

  // ---- 0e. key remapping with REAL input -------------------------------------------------------------------------------
  await page.keyboard.press('Escape'); await sleep(300);
  check('Escape opens the pause menu (live)', (await T('t.state().mode')) === 'paused');
  await page.click('#controls-box summary'); await sleep(150);
  const useSlot = 'button.bind[data-a="use"][data-i="0"]';
  await page.click(useSlot); await sleep(100);
  check('clicking a control slot starts capture', (await page.$eval(useSlot, (e) => e.textContent)) === 'press a key…');
  await page.keyboard.press('KeyG'); await sleep(150);
  const b1 = (await T('t.state().settings.bindings')).use;
  check('pressing a key rebinds Use (persisted in settings)', b1[0] === 'KeyG' && b1[1] === 'Space' && (await text('bind-note')).includes('G assigned'), JSON.stringify(b1) + ' ' + (await text('bind-note')));
  await page.click('button.bind[data-a="fire"][data-i="1"]'); await page.keyboard.press('KeyG'); await sleep(150);
  const st = await T('t.state().settings.bindings');
  check('a conflicting key is taken from the other action and the player is told', st.fire[1] === 'KeyG' && !st.use.includes('KeyG') && (await text('bind-note')).includes('taken from: use'), JSON.stringify({ fire: st.fire, use: st.use }) + ' ' + (await text('bind-note')));
  await page.click(useSlot); await page.keyboard.press('Escape'); await sleep(150);
  check('Escape cancels capture without leaving the pause menu', (await text('bind-note')) === 'Cancelled.' && (await T('t.state().mode')) === 'paused');
  await page.click(useSlot); await page.keyboard.press('KeyG'); await sleep(150);
  await page.reload({ waitUntil: 'domcontentloaded' }); await page.waitForFunction('window.__GAME_TEST__ && window.__GAME_TEST__.ready', { timeout: 120000 });
  const persisted = (await T('t.state().settings.bindings')).use;
  check('remapped controls survive a real page reload', persisted[0] === 'KeyG', JSON.stringify(persisted));
  await T("t.newGame('normal', 1, { realtime: true })"); await sleep(200); await T("t.pause()");
  await page.click('#controls-box summary'); await page.click('#btn-reset-keys'); await sleep(150);
  const reset = await T('t.state().settings.bindings');
  check('reset restores the default controls', reset.use[0] === 'KeyE' && reset.fire[1] === 'KeyF', JSON.stringify({ use: reset.use, fire: reset.fire }));
  await T('t.resume()');

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
  check('every enemy killed, key held', r.stats.kills === r.stats.total.enemies && r.stats.total.enemies > 0 && r.player.keys.includes('brass'), `kills ${r.stats.kills}/${r.stats.total.enemies}`);
  const heard = new Set((await T('t.audioLog(200)')).map((x) => x.id)), all = await T('t.state().audio.played');
  check('the route was audible: many sounds played incl. explosion, key, door, death, footsteps', all > 30 && ['flare_boom', 'pickup_key', 'door_open', 'enemy_die'].every((id) => heard.has(id)), `played=${all} distinct(last40)=${[...heard].join(',')}`);
  await page.waitForFunction("!document.getElementById('screen-complete').classList.contains('hidden')", { timeout: 15000 }).catch(() => {});
  check('intermission screen shows end-level statistics', (await visible('screen-complete')) && /Kills/.test(await text('stat-rows')), (await text('stat-rows')).replace(/\s+/g, ' '));
  await T('t.clearOverlays()'); await shot('04-intermission');
  console.log('route wall time (SwiftShader):', ((Date.now() - t0) / 1000).toFixed(1) + 's');
  // progression (PT-008): the rank this run earned, the Locker, and a purchase that is real (salvage spent, the tier carries into the next level)
  { const rank = await page.$eval('#rank-line .rank', (e) => e.textContent).catch(() => ''), rows = await page.$$eval('#locker button.buy', (b) => b.length).catch(() => -1), st = await T('t.state()');
    check('intermission shows a rank (S/A/B/C) and the Locker with one row per upgrade track', /^[SABC]$/.test(rank) && rows === 2, `rank=${rank} buy buttons=${rows}`);
    check('the earned salvage and a record for this map are in the progress state', st.progress.salvage >= 0 && !!st.progress.records[st.mapId] && st.progress.records[st.mapId].rank === rank, JSON.stringify(st.progress));
    await T('t.setup_progress({ salvage: 50 })'); await page.$eval('#locker button[data-track="ammo"]', (b) => b.click());
    const bought = await T('t.state()');
    check('buying in the Locker spends salvage and raises the tier', bought.progress.upgrades.ammo === 1 && bought.progress.salvage === 47 && /tier 1\/5/.test(await text('locker')), JSON.stringify(bought.progress.upgrades) + ' salvage ' + bought.progress.salvage);
    for (let i = 0; i < 12; i++) { const off = await page.$eval('#locker button[data-track="armor"]', (b) => b.disabled).catch(() => true); if (off) break; await page.$eval('#locker button[data-track="armor"]', (b) => b.click()); }     // spend it all: the button disables when the salvage runs out and disappears at the last tier
    const spent = await T('t.state()'); check('the Locker never spends below zero and stops at the last tier', spent.progress.salvage >= 0 && spent.progress.upgrades.armor <= 5, JSON.stringify(spent.progress)); }
  // Gate 2 campaign flow: the real Next button leads to the next map of the episode, carrying health/ammo/weapons
  const carried = await T('t.state().player');
  await page.$eval('#btn-next', (e) => e.click());
  await page.waitForFunction("window.__GAME_TEST__.state().mapId === 'C1E1M02'", { timeout: 60000 }).catch(() => {});
  const m2 = await T('t.state()');
  check('Gate 2 flow: the intermission Next button loads C1E1M02 and play resumes', m2.mapId === 'C1E1M02' && m2.mode === 'playing', m2.mapId + '/' + m2.mode);
  check('progression: the upgrade bought in the Locker is in effect in the next level, and the salvage carried', m2.upgrades?.ammo === 1 && m2.progress.upgrades.ammo === 1 && m2.progress.salvage >= 0, JSON.stringify({ world: m2.upgrades, progress: m2.progress.upgrades, salvage: m2.progress.salvage }));
  check('Gate 2 flow: the inventory carries over (weapons kept, ammo kept, at full health or better)', carried.weapons.every((wp) => m2.player.weapons.includes(wp)) && m2.player.hp >= Math.min(100, carried.hp) - 1 && m2.player.ammo.flare >= carried.ammo.flare, JSON.stringify({ before: carried.weapons, after: m2.player.weapons, hp: [carried.hp, m2.player.hp] }));
  await T('t.clearOverlays()'); await shot('g2-00-m02-start');
  // the dev-only level picker (title screen): any map starts from it, on the chosen difficulty
  { await page.$eval('#dev-map', (s) => { s.value = 'C1E2M01'; }); await page.$eval('#dev-diff', (s) => { s.value = 'hard'; }); await page.$eval('#dev-go', (b) => b.click());
    await page.waitForFunction("window.__GAME_TEST__.state().mapId === 'C1E2M01'", { timeout: 60000 }).catch(() => {}); const dp = await T('t.state()');
    check('the dev level picker starts any map on the chosen difficulty (C1E2M01 on hard)', dp.mapId === 'C1E2M01' && dp.difficulty === 'hard' && dp.mode === 'playing', dp.mapId + '/' + dp.difficulty + '/' + dp.mode); await T('t.clearOverlays()'); }
  await T("t.newGame('normal', 1, { mapId: 'C1E1M01' })");                       // back to the Gate 1 map: later sections use the current map

  // ---- 2. secret route -------------------------------------------------------------------------------------------
  await T("t.newGame('normal', 1)"); await T("t.startBot('C1E1M01.secret')");
  for (let i = 0; i < 250; i++) { r = await T('t.stepBot(30)'); if (r.done || r.failed || r.status !== 'playing') break; }
  check('secret route: secret found and level completed', r.status === 'complete' && r.stats.secrets === 1, `secrets=${r.stats.secrets}`);

  // ---- 2b. Gate 2: every Episode 1 route, in the real game, against the headless sim -------------------------------------------------
  const G2 = [['C1E1M02', 'main'], ['C1E1M02', 'secret'], ['C1E1M03', 'main'], ['C1E1M04', 'main'], ['C1E1M04', 'secret'], ['C1E1M05', 'main'], ['C1E1M06', 'main'], ['C1E1M07', 'main'], ['C1E1M08', 'main'], ['C1E1S01', 'main']];
  const g2report = {}; let sawBoss = false, sawObjective = false, sawFuse = false, sawShield = false;
  for (const [id, name] of G2) {
    const p = await runRouteParity({ T, root, shot }, id, name, { shots: true, onStep: async () => {
      if (id === 'C1E1M08') { sawBoss = sawBoss || (await visible('boss')); sawShield = sawShield || (await text('boss-note')).includes('SHIELDED'); }
      sawObjective = sawObjective || (await text('objective')).startsWith('OBJECTIVE');
      if (id === 'C1E1M07') sawFuse = sawFuse || (await page.$$eval('#toasts div', (els) => els.some((e) => /fuse/i.test(e.textContent))));
    } });
    check(`Gate 2 real-game route ${id}.${name}: completes in the browser`, p.ok, `status=${p.status} failed=${p.failed} ticks=${p.ticks} wall=${p.wallSeconds}s`);
    check(`Gate 2 real-game route ${id}.${name}: browser sim == Node sim (ticks + state hash)`, p.agree, `browser ${p.ticks}/${p.hash} vs node ${p.nodeTicks}/${p.nodeHash}`);
    g2report[id + '.' + name] = { ok: p.ok, ticks: p.ticks, hash: p.hash, nodeTicks: p.nodeTicks, nodeHash: p.nodeHash, kills: p.kills, secrets: p.secrets };
  }
  check('Gate 2 HUD: the objective line was shown, the boss bar (with the shield note) appeared in the Cantor fight, and a fuse pickup was named as a fuse', sawObjective && sawBoss && sawShield && sawFuse, JSON.stringify({ sawObjective, sawBoss, sawShield, sawFuse }));
  g2 = g2report;
  // ---- 2c. flow (audit A17/A18): New Game always starts at C1E1M01; Continue takes the NEWEST save ------------------------------------
  await T("t.newGame('normal', 1, { mapId: 'C1E1M05' })"); await T('t.clearOverlays()'); await T('t.pause()'); await page.$eval('#btn-quit', (e) => e.click());
  check('Gate 2 flow: Quit to title returns to the title screen', (await T('t.state().mode')) === 'title');
  await page.$eval('#btn-normal', (e) => e.click()); const fresh = await T('t.state()');
  check('Gate 2 flow: New Game after playing another map starts C1E1M01 from tick 0 (not the last map)', fresh.mapId === 'C1E1M01' && fresh.tick < 10 && fresh.mode === 'playing', fresh.mapId + ' tick ' + fresh.tick);
  await page.evaluate(() => localStorage.clear());
  await T("t.newGame('normal', 1, { mapId: 'C1E1M02' })"); await T('t.tick(30)'); await T('t.save()'); await sleep(80);       // t.save() WRITES the quick slot (saveSlot only reads: the audit found the check never wrote it)
  check('Gate 2 flow: the quick save really exists before the second level starts (the check would be vacuous otherwise)', (await T("t.saveSlot('quick').ok")) === true);
  await T("t.newGame('normal', 2, { mapId: 'C1E1M06' })"); await T('t.pause()'); await page.$eval('#btn-quit', (e) => e.click()); await page.$eval('#btn-continue', (e) => e.click());
  const cont = await T('t.state()');
  check('Gate 2 flow: Continue loads the newest save (the auto-save of C1E1M06), not an older quick save of C1E1M02', cont.mapId === 'C1E1M06' && cont.mode === 'playing', cont.mapId + '/' + cont.mode);
  await page.evaluate(() => localStorage.clear());
  await T("t.newGame('normal', 1, { mapId: 'C1E1M01' })");                       // the sections below use the current map: back to the Gate 1 map

  // ---- 2d. RENDER TRUTH (PT-001/PT-002): the sim gate above proves where actors ARE; this proves where they are DRAWN ------------------
  // Every enemy of every shipped map, asleep / awake / in every pose / dying / dead / on moving floors, and the Cantor's body + shield + ring, against the sim's ground.
  const rgShots = path.join(root, 'review/render-ground'); fs.mkdirSync(rgShots, { recursive: true });
  renderGround = await runRenderCensus({ T, root, check, shot: async (name) => { await savePng(page, path.join(rgShots, name + '.png')); return name + '.png'; } });
  // the pickup toast states the amount the pickup really grants (it said +30 for the rivet pickup while the sim gave 40)
  await T("t.newGame('normal', 3, { mapId: 'C1E1M05' })"); await T('t.clearOverlays()');
  { const p = (await T('t.state()')).player; await T("t.setup_player({ weapons: ['flare', 'scattergun', 'rivet'], ammo: { flare: 8, shell: 6, rivet: 0 } })"); await T(`t.setup_addPickup('ammo_rivet', ${p.x}, ${p.z})`); await T('t.tick(3)');
    const st = await T('t.state()'), toast = await text('toasts');
    check('picking up rivets shows the amount really granted (+40) and the sim agrees (40 rivets)', toast.includes('Rivets (+40)') && st.player.ammo.rivet === 40, `toast: "${toast.replace(/\s+/g, ' ').trim()}", rivets ${st.player.ammo.rivet}`); }
  // the harpoon rifle in the live game: the pickup equips it (HUD slot 4, BOLTS, a toast that names it), a shot spends one bolt and the view draws its streak, and the sights zoom much further than the other guns
  await T("t.newGame('normal', 3, { mapId: 'C1E2M02' })"); await T('t.clearOverlays()');                            // the Pans: a 28 m open lane to shoot down (a wall inside a metre leaves no streak)
  { await T("t.setup_clearEnemies(); t.setup_teleport(96, 51, -Math.PI / 2); t.setup_player({ pitch: 0 })"); const p = (await T('t.state()')).player; await T("t.setup_player({ weapons: ['flare'], weapon: 'flare', ammo: { flare: 8, bolt: 0 } })"); await T(`t.setup_addPickup('weapon_harpoon', ${p.x}, ${p.z})`); await T('t.tick(3)'); await sleep(700);                                       // the HUD is drawn by the page's own frame loop: let it run a frame
    const st = await T('t.state()'); let hud = await text('hud-weapons'); for (let k = 0; k < 16 && !/4 RIFLE/.test(hud); k++) { await sleep(250); hud = await text('hud-weapons'); }          // the HUD is drawn by the page's own frame loop: wait for it (the same poll as the mortar's)
    const toast = await text('toasts'), label = await text('hud-ammo-label');
    check('picking up the harpoon rifle equips it: slot 4 on the HUD, BOLTS on the ammo label, a toast that names it, 6 bolts in the sim', st.player.weapon === 'harpoon' && st.player.ammo.bolt === 6 && /4 RIFLE/.test(hud) && /BOLTS/.test(label) && toast.includes('Harpoon rifle'), `weapon ${st.player.weapon}, bolts ${st.player.ammo.bolt}, hud "${hud}", label "${label}", toast "${toast.replace(/\s+/g, ' ').trim().slice(0, 80)}"`);
    await T('t.tick(40)'); const hipFov = (await T('t.boltProbe()')).zoom; await T("t.press('aim')"); await T('t.tick(30)'); await T('t.render(0.02)'); const adsFov = (await T('t.boltProbe()')).zoom;
    await T("t.press('fire')"); await T('t.tick(2)'); await T("t.release('fire')"); await T('t.render(0.02)'); const after = await T('t.state()'), fx = await T('t.boltProbe()'); await T("t.release('aim')");
    check('a harpoon shot in the live game spends one bolt, draws its streak, and the sights zoom to the rifle\'s own field of view (24 degrees against 46 for the other guns)', after.player.ammo.bolt === 5 && fx.streaks + fx.stuck >= 1 && adsFov < hipFov * 0.45, `bolts ${after.player.ammo.bolt}, streaks ${fx.streaks}, stuck ${fx.stuck}, fov hip ${hipFov} -> sights ${adsFov}`); }
  // the charge-arc lamp in the live game: the pickup equips it (HUD slot 5, CELLS, a toast, 30 cells); one burst on a line of three bodies spends one cell, jumps down the line (each is hit, each for less), the view draws the lightning and the lamp lights the level
  await T("t.newGame('normal', 3, { mapId: 'C1E2M02' })"); await T('t.clearOverlays(); t.setup_arcLife(1.0)');
  { await T("t.setup_clearEnemies(); t.setup_teleport(96, 51, -Math.PI / 2); t.setup_player({ pitch: 0 })"); const p = (await T('t.state()')).player; await T("t.setup_player({ weapons: ['flare'], weapon: 'flare', ammo: { flare: 8, cell: 0 } })"); await T(`t.setup_addPickup('weapon_arc', ${p.x}, ${p.z})`); await T('t.tick(3)'); await sleep(700);
    const st = await T('t.state()'); let hud = await text('hud-weapons'); for (let k = 0; k < 16 && !/5 LAMP/.test(hud); k++) { await sleep(250); hud = await text('hud-weapons'); }          // the HUD is drawn by the page's own frame loop: wait for it (the same poll as the mortar's)
    const toast = await text('toasts'), label = await text('hud-ammo-label');
    check('picking up the charge-arc lamp equips it: slot 5 on the HUD, CELLS on the ammo label, a toast that names it, 30 cells in the sim', st.player.weapon === 'arc' && st.player.ammo.cell === 30 && /5 LAMP/.test(hud) && /CELLS/.test(label) && toast.includes('Charge-arc lamp'), `weapon ${st.player.weapon}, cells ${st.player.ammo.cell}, hud "${hud}", label "${label}", toast "${toast.replace(/\s+/g, ' ').trim().slice(0, 80)}"`);
    const ids = []; for (const dx of [8, 11, 14]) ids.push(await T(`t.setup_spawnEnemy('feeder', ${96 + dx}, 51, Math.PI / 2, 'idle')`));
    await T('t.tick(30)'); await T("t.press('fire')"); await T('t.tick(2)'); await T("t.release('fire')"); await T('t.tick(2)'); await T('t.render(0.02)');                // the lamp fires on RELEASE: tick once the key is up
    const after = await T('t.state()'), fx = await T('t.boltProbe()'), hp = after.enemies.filter((e) => ids.includes(e.id)).map((e) => e.hp);
    check('one burst of the lamp in the live game spends one cell, jumps down a line of three bodies (each hit, each for less), draws its lightning and lights the level', after.player.ammo.cell === 29 && hp.length === 3 && hp.every((h) => h < 100) && hp[0] < hp[1] && hp[1] < hp[2] && fx.arcs > 0 && fx.lamp > 3, `cells ${after.player.ammo.cell}, hp ${hp.map((h) => Math.round(h))}, arc segments ${fx.arcs}, lamp light ${fx.lamp.toFixed(1)}`); }
  // ---- Episode 3, Batch B (PT-027): the ship breathes, and the mortar --------------------------------------------------------------------------------------------------------------------------------------------
  // the bell-breaker mortar in the live game: the pickup on its plinth equips it (HUD key 0, ROCKETS, a toast that names it, 6 rockets), a ring is drawn on the ground where the shell will land, one shot spends TWO rockets and puts a shell in the air
  await T("t.newGame('normal', 3, { mapId: 'C1E3M03' })"); await T('t.clearOverlays()');
  { await T("t.setup_clearEnemies(); t.setup_teleport(84, 47, -Math.PI / 2); t.setup_player({ pitch: -0.1 })"); const p = (await T('t.state()')).player; await T("t.setup_player({ weapons: ['flare'], weapon: 'flare', ammo: { flare: 8, rocket: 0 } })"); await T(`t.setup_addPickup('weapon_mortar', ${p.x}, ${p.z})`); await T('t.tick(3)'); await sleep(700);
    const st = await T('t.state()'); let hud = await text('hud-weapons'); for (let k = 0; k < 16 && !/MORTAR/.test(hud); k++) { await sleep(250); hud = await text('hud-weapons'); }          // the HUD is drawn by the page's own frame loop: wait for it
    const toast = await text('toasts'), label = await text('hud-ammo-label');
    check('picking up the mortar equips it: key 0 on the HUD, ROCKETS on the ammo label, a toast that names it, 6 rockets in the sim', st.player.weapon === 'mortar' && st.player.ammo.rocket === 6 && /0 MORTAR/.test(hud) && /ROCKETS/.test(label) && toast.includes('Bell-breaker'), `weapon ${st.player.weapon}, rockets ${st.player.ammo.rocket}, hud "${hud}", label "${label}", toast "${toast.replace(/\s+/g, ' ').trim().slice(0, 80)}"`);
    await T('t.tick(60)'); await T('t.render(0.02)'); const ring = (await T('t.breathProbe()')).ring;
    await T("t.press('fire')"); await T('t.tick(2)'); await T("t.release('fire')"); await T('t.tick(20)'); await T('t.render(0.02)'); const after = await T('t.state()'), fx = await T('t.breathProbe()');
    check('with the mortar in hand a ring is drawn on the ground where the shell will land, and one shot spends two rockets and puts a shell in the air', !!ring?.visible && Math.abs(ring.y) < 0.5 && after.player.ammo.rocket === 4 && fx.shells === 1, `ring ${JSON.stringify(ring)}, rockets ${after.player.ammo.rocket}, shells in the air ${fx.shells}`); }
  // a breathing gate in the live game (Ribbed Corridors, gate 1: open 5.4 s of every 9): the slab the view draws follows the sim's door, it is shut at 7 s, and a shut gate says what it waits for
  await T("t.newGame('normal', 3, { mapId: 'C1E3M02', realtime: true })"); await T('t.setup_clearEnemies(); t.clearOverlays()');
  { await T('t.setup_teleport(40, 50.4, -Math.PI / 2)'); await T('t.render(0.02)'); const gate1 = (pr) => pr.gates.find((x) => x.cx === 23), g0 = gate1(await T('t.breathProbe()')); await T('t.tick(60 * 7)'); await T('t.render(0.02)'); const g1 = gate1(await T('t.breathProbe()')); await T('t.setup_teleport(44.8, 51.0, -Math.PI / 2)'); await sleep(900); const hint = await text('use-hint');
    check('a breathing gate: open at the start, shut by 7 s, the drawn slab follows the sim (up when open, down when shut), and a shut one says it opens when the ship breathes in', g0.open === 1 && Math.abs(g0.y - g0.span) < 0.1 && g1.open === 0 && g1.y < 0.1 && /breathes in/.test(hint), `start ${JSON.stringify(g0)}, at 7 s ${JSON.stringify(g1)}, hint "${hint}"`); }
  // spore beds in the live game (Gill Gardens, bed A: blooms 3 s of every 8): the view swells and blooms it on the clock (bright, mist) and lets it sleep (dim, no mist); standing in it while it blooms burns, and standing in it asleep does not
  await T("t.newGame('normal', 3, { mapId: 'C1E3M03' })"); await T('t.setup_clearEnemies(); t.clearOverlays()');
  { await T('t.setup_teleport(57, 47, -Math.PI / 2); t.setup_player({ hp: 100, pitch: 0 })'); await T('t.tick(60)'); await T('t.render(0.02)'); const on = (await T('t.breathProbe()')).beds[0], hpOn = (await T('t.state()')).player.hp;
    await T('t.tick(60 * 4)'); await T('t.render(0.02)'); const off = (await T('t.breathProbe()')).beds[0], hp1 = (await T('t.state()')).player.hp; await T('t.tick(60)'); const hp2 = (await T('t.state()')).player.hp;
    check('spore beds in the live game: blooming = bright with mist and it burns, dormant = dim, no mist, no damage', on.bed > 0.8 && on.mistVisible && hpOn < 100 && off.bed < 0.3 && !off.mistVisible && hp2 === hp1, `bloom ${JSON.stringify(on)} hp ${hpOn}; asleep ${JSON.stringify(off)} hp ${hp1} -> ${hp2}`); }
  // ---- Episode 3, Batch C (PT-028): the two elites in the live game -----------------------------------------------------------------------------------------------------------------------------------------
  // the Weeping Mother weeps: after her tell a tear is in the air (the view draws one for the sim's one), it lands on the place the player stood, and the pool is drawn there, flat on the floor, for as long as it lasts
  await T("t.newGame('normal', 3, { mapId: 'C1E3M04' })"); await T('t.setup_clearEnemies(); t.clearOverlays()');
  { await T('t.setup_teleport(88, 58, -Math.PI / 2); t.setup_player({ pitch: 0, hp: 100000 })'); const id = await T("t.setup_spawnEnemy('weeping', 112, 58, Math.PI / 2, 'chase')"); await T('t.tick(1)'); await T(`t.setup_enemy(${id}, { shotCd: 0.2, summonCd: 99 })`);
    const air = JSON.parse(await T("for (let i = 0; i < 480; i++) { t.tick(1); if (t.eliteProbe().simTears > 0) { t.render(0.02); return JSON.stringify(t.eliteProbe()); } } return 'null';"));
    await T('t.tick(60 * 3)'); await T('t.render(0.02)'); const down = await T('t.eliteProbe()'), pl = down.pools[0], sp0 = down.simPools[0];
    check('the Weeping Mother weeps in the live game: a tear is drawn in the air while the sim has one, then a pool, flat on the floor, at the place the sim put it', !!air && air.tears === air.simTears && air.simTears >= 1 && down.pools.length === 1 && down.simPools.length === 1 && Math.abs(pl.x - sp0.x) < 0.01 && Math.abs(pl.z - sp0.z) < 0.01 && pl.opacity > 0.3 && Math.abs(pl.scale - sp0.r) < 0.4 && pl.y < 0.3, `in the air ${JSON.stringify(air && { v: air.tears, s: air.simTears })}, pools ${JSON.stringify(down.pools)}, sim ${JSON.stringify(down.simPools)}`); }
  // she broods: the sac swells (the view reads the sim's swell), and two Gaunts are standing beside her when it ends
  { await T("t.newGame('normal', 3, { mapId: 'C1E3M04' })"); await T('t.setup_clearEnemies(); t.clearOverlays()'); await T('t.setup_teleport(88, 58, -Math.PI / 2); t.setup_player({ pitch: 0, hp: 100000 })'); const id = await T("t.setup_spawnEnemy('weeping', 112, 58, Math.PI / 2, 'chase')"); await T('t.tick(1)'); await T(`t.setup_enemy(${id}, { shotCd: 99, summonCd: 0.1 })`);
    const swell = JSON.parse(await T("for (let i = 0; i < 240; i++) { t.tick(1); if (t.eliteProbe().mothers[0].broodT > 1.2) { t.render(0.02); return JSON.stringify(t.eliteProbe()); } } return 'null';"));
    await T('t.tick(60)'); const st = await T('t.state()'), kids = st.enemies.filter((e) => e.id !== id && e.state !== 'dead');
    check('the Weeping Mother broods in the live game: her sacs swell on the view while the sim swells, then two Gaunts stand beside her', !!swell && swell.mothers[0].sac > 1.1 && kids.length === 2, `sac scale ${swell?.mothers[0].sac}, gaunts ${kids.length}`); }
  // the Bulwark Shell's carapace: shut while it walks, open in the pose for as long as the sim has it bashing (its lip swings out and up)
  { await T("t.newGame('normal', 3, { mapId: 'C1E3M04' })"); await T('t.setup_clearEnemies(); t.clearOverlays()'); await T('t.setup_teleport(88, 58, -Math.PI / 2); t.setup_player({ pitch: 0, hp: 100000 })'); const id = await T("t.setup_spawnEnemy('bulwark', 96, 58, Math.PI / 2, 'idle')");
    await T('t.render(0.02)'); const shut = (await T('t.eliteProbe()')).shells[0]; await T(`t.setup_enemy(${id}, { state: 'chase', attackT: 0.5 })`); await T('t.render(0.5)'); await T('t.render(0.5)'); const open = (await T('t.eliteProbe()')).shells[0];
    check('the Bulwark Shell\'s carapace is drawn shut while it walks and open while the sim has it bashing (hinge angle follows attackT)', Math.abs(shut.hinge) < 0.15 && open.hinge < -0.6, `shut hinge ${shut.hinge}, open hinge ${open.hinge}`); }
  // ---- Episode 3, Batch D (PT-029): timing platforms, the listening lock, the Acolyte's ward ---------------------------------------------------------------------------------------------------------------
  // the platforms of the Resonance Loom: the slab the view draws is where the sim's floor is, and the sim's floor is where the clock (platforms.js) puts it, at five moments; and they do move
  await T("t.newGame('normal', 3, { mapId: 'C1E3M05' })"); await T('t.setup_clearEnemies(); t.clearOverlays()');
  { const defs = loadMapFile('maps/C1E3M05.json').sectors.filter((s) => s.cycle), rows = []; let worst = 0, last = 0; const hs = new Set();
    for (const secs of [2, 6, 10, 14, 21]) { await T(`t.tick(${60 * (secs - last)})`); last = secs; await T('t.render(0.02)'); const p = await T('t.sectorProbe()'); for (const s of p.sectors) { const d = defs.find((q) => q.id === s.id), want = platformState(d, p.time).h; worst = Math.max(worst, Math.abs(s.y - s.h), Math.abs(s.h - want)); hs.add(s.id + ':' + s.h.toFixed(2)); } rows.push({ t: +p.time.toFixed(2), h: p.sectors.map((s) => +s.h.toFixed(2)) }); }
    check('timing platforms in the live game: the drawn slab = the sim floor = the clock at five moments (within 1 cm), and the platforms rise and fall', defs.length === 4 && worst < 0.01 && hs.size >= 8, `worst ${worst.toFixed(4)} m; ${JSON.stringify(rows)}`); }
  // the sound-lock: after a shot beside it the first door of the Loom says it is listening; after five quiet seconds it does not
  await T("t.newGame('normal', 3, { mapId: 'C1E3M05', realtime: true })"); await T('t.setup_clearEnemies(); t.clearOverlays()');
  { await T('t.setup_teleport(22.4, 57, -Math.PI / 2); t.setup_player({ pitch: 0 })'); await T("t.press('fire')"); await T('t.tick(2)'); await T("t.release('fire')"); await T('t.tick(10)'); await sleep(900); const loud = await text('use-hint');
    await T('t.tick(60 * 6)'); await sleep(900); const quiet = await text('use-hint');
    check('the sound-lock says it is listening after a shot beside it, and not after six quiet seconds', /listening/.test(loud) && !/listening/.test(quiet), `loud "${loud}", quiet "${quiet}"`); }
  // the Acolyte's ward ring: drawn while it is awake and unstaggered, gone when it sleeps or is staggered
  await T("t.newGame('normal', 3, { mapId: 'C1E3M04' })"); await T('t.setup_clearEnemies(); t.clearOverlays()');
  { await T('t.setup_teleport(88, 58, -Math.PI / 2); t.setup_player({ pitch: 0, hp: 100000 })'); const id = await T("t.setup_spawnEnemy('acolyte', 104, 58, Math.PI / 2, 'idle')"); await T('t.render(0.02)'); const asleep = (await T('t.eliteProbe()')).wards;
    await T(`t.setup_enemy(${id}, { state: 'chase', hp: 100000, pulseCd: 99 })`); await T('t.render(0.02)'); const awake = (await T('t.eliteProbe()')).wards;
    await T(`t.setup_enemy(${id}, { stunT: 3 })`); await T('t.render(0.02)'); const stunned = (await T('t.eliteProbe()')).wards;
    check('the Acolyte\'s ward ring is drawn while it is awake and not staggered (0 asleep, 1 awake, 0 staggered)', asleep === 0 && awake === 1 && stunned === 0, `asleep ${asleep}, awake ${awake}, staggered ${stunned}`); }
  // ---- Episode 3, Batch E (PT-030): the Brood Vat and the Grand Cantor -----------------------------------------------------------------------------------------------------------------------------------------
  // a vat swells (the dome the view draws grows with the sim's swell), then is back to rest after its birth, and a creature stands beside it
  // (the vat stands on the ring east of the furnace core: the core is solid and a vat inside it has no room to birth into)
  await T("t.newGame('normal', 3, { mapId: 'C1E3M07' })"); await T('t.setup_clearEnemies(); t.clearOverlays()');
  { await T('t.setup_teleport(88, 57, Math.PI / 2); t.setup_player({ pitch: 0, hp: 100000 })'); const id = await T("t.setup_spawnEnemy('vat', 80, 57, Math.PI, 'chase')"); await T(`t.setup_enemy(${id}, { summonCd: 99 })`); await T('t.tick(1)'); await T('t.render(0.02)'); const mine = (p) => p.vats.find((v) => v.id === id), rest = mine(await T('t.foundryProbe()')).dome;
    await T(`t.setup_enemy(${id}, { vatT: 1.0 })`); await T('t.render(0.02)'); const swollen = mine(await T('t.foundryProbe()')).dome;
    await T(`t.setup_enemy(${id}, { vatT: 1.15, summonCd: 99 })`); await T('t.tick(12)'); await T('t.render(0.02)'); const after = await T('t.foundryProbe()'), born = after.born;
    check('a Brood Vat swells in the live game (the dome the view draws grows with the sim\'s swell), then rests and has birthed a creature', swollen > rest * 1.5 && mine(after).dome < rest * 1.2 && born === 1 && mine(after).brood === 1, `dome rest ${rest.toFixed(2)}, swollen ${swollen.toFixed(2)}, after ${mine(after).dome.toFixed(2)}, born ${born}`); }
  // the Grand Cantor: the horn rears for its pulse, the view draws a ring for each of the sim's two, and the shield stands round it while a reed lives and is gone when none does
  await T("t.newGame('normal', 3, { mapId: 'C1E3M08' })"); await T('t.clearOverlays(); t.setup_openDoors()');
  { await T('t.setup_teleport(104, 56, -Math.PI / 2); t.setup_player({ pitch: 0.1, hp: 100000 })'); await T('t.setup_wakeAll()'); await T('t.tick(2)'); await T('t.render(0.02)'); const rest = (await T('t.foundryProbe()')).grand[0], id = rest.id, sh1 = (await T('t.encounterProbe()')).shield, bpos = (await T('t.state()')).enemies.find((e) => e.id === id);
    await T(`t.setup_enemy(${id}, { pulseT: 1.15 })`); await T('t.render(0.02)'); const rear = (await T('t.foundryProbe()')).grand[0];
    await T(`t.setup_enemy(${id}, { pulseT: -1, pulseCd: 0, shotCd: 99, summonCd: 99 })`); await T('for (let i = 0; i < 600; i++) { t.tick(1); if (t.foundryProbe().pulses > 0) break; }'); await T('for (let i = 0; i < 90; i++) { t.tick(1); if (t.foundryProbe().pulses > 1) break; }'); await T('t.render(0.02)'); const two = await T('t.foundryProbe()');
    await T('t.setup_killNodes()'); await T('t.render(0.02)'); const sh0 = (await T('t.encounterProbe()')).shield;
    check('the Grand Cantor in the live game: the horn rears for its pulse, the view draws a ring for each of the sim\'s two, and its shield is drawn at 3 m while a reed stands and gone when none does', rear.horn < rest.horn - 0.25 && two.pulses === 2 && two.pulseViews === 2 && !!sh1 && Math.abs(sh1.y - ((bpos.y ?? 0) + 3.0)) < 0.5 && sh0 === null, `horn ${rest.horn?.toFixed(2)} -> ${rear.horn?.toFixed(2)}, sim rings ${two.pulses}, drawn ${two.pulseViews}, shield ${JSON.stringify(sh1)}, then ${JSON.stringify(sh0)}`); }
  // ---- Episode 4, Batch A (PT-032): the air state and the falling loads (the Range's sky yard and loads yard) -----------------------------------------------------------------------------------------------------------
  // a vent: stepping on the plate throws the player (the sim's arc), the camera follows the body up and the field of view opens, a landing puts both back
  await T("t.newGame('normal', 3, { mapId: 'RANGE' })"); await T('t.setup_clearEnemies(); t.clearOverlays()');
  { await T('t.tick(2)'); for (let i = 0; i < 40; i++) await T('t.render(0.03)'); const ground = await T('t.airProbe()'); await T('t.setup_teleport(25, 197, -Math.PI / 2); t.setup_player({ pitch: 0, hp: 100000 })');      // (the ground sample is the player where they start, settled: standing ON the plate they are already in the air two ticks later, y 0.11 and the fov 75, which is what the first two runs of this case measured as 'ground')
    await T('t.tick(60)'); for (let i = 0; i < 40; i++) await T('t.render(0.03)'); const flying = await T('t.airProbe()'); await T('t.tick(60 * 5)'); for (let i = 0; i < 40; i++) await T('t.render(0.03)'); const landed = await T('t.airProbe()');      // (the camera and the field of view GLIDE: a single 0.02 s frame moved the fov by 0.6 degrees, so this case could never have passed; a second of frames lets them settle)
    check('a vent in the live game: the plate throws the player, the camera follows the arc (higher than the ground view, tracking the body) and the field of view opens; after the landing both are back', ground.air === false && flying.air && flying.y > 2 && flying.camY > ground.camY + 1.5 && Math.abs(flying.camY - (flying.y + 1.6)) < 1.2 && flying.fov > ground.fov + 2 && !landed.air && Math.abs(landed.y - ground.y) < 0.15 && landed.fov < ground.fov + 0.6 && flying.ventViews === 4,
      `ground y ${ground.y.toFixed(2)} cam ${ground.camY.toFixed(2)} fov ${ground.fov.toFixed(1)}; flying y ${flying.y.toFixed(2)} cam ${flying.camY.toFixed(2)} fov ${flying.fov.toFixed(1)}; landed y ${landed.y.toFixed(2)} cam ${landed.camY.toFixed(2)} fov ${landed.fov.toFixed(1)}; plates drawn ${flying.ventViews}`); }
  // a falling load: the container is drawn dropping out of the dark while the warning runs, with its hazard glow; a wreck squashed on the deck for half a second after the landing; then nothing
  await T("t.newGame('normal', 3, { mapId: 'RANGE' })"); await T('t.setup_clearEnemies(); t.clearOverlays()');
  { await T('t.setup_teleport(107, 202, 0); t.setup_player({ pitch: 0, hp: 100000 })'); await T('t.tick(60 * 5)'); await T('t.render(0.02)'); const calm = (await T('t.airProbe()')).loads[0];
    await T('t.tick(60 * 1.9)'); await T('t.render(0.02)'); const warn = await T('t.airProbe()'); await T('t.tick(78)'); await T('t.render(0.02)'); const after = (await T('t.airProbe()')).loads[0]; await T('t.tick(60 * 2)'); await T('t.render(0.02)'); const gone = (await T('t.airProbe()')).loads[0];
    check('a falling load in the live game: not drawn between landings, drawn dropping with a hazard glow during the warning, a squashed wreck just after the impact, gone a second or two later', !calm.visible && warn.loads[0].visible && warn.loads[0].y > 6 && warn.loads[0].y < 16 && warn.loads[0].glow > 0.12 && after.visible && after.scaleY < 0.9 && !gone.visible && gone.glow === 0, `calm ${JSON.stringify(calm)} warning ${JSON.stringify(warn.loads[0])} after ${JSON.stringify(after)} gone ${JSON.stringify(gone)}`); }
  // debris lands on the terrain under it: an explosion over the M02 gallery (floor 3 m) must not let a chip fall more than a frame's travel below that floor
  await T("t.newGame('normal', 3, { mapId: 'C1E1M02' })"); await T("t.emitView([{ type: 'explode', x: 52.4, y: 3.9, z: 13.6 }, { type: 'impact', x: 52.4, y: 3.6, z: 13.6 }])");
  { let minRel = Infinity, seen = 0; for (let i = 0; i < 40; i++) { await T('t.render(0.016)'); for (const p of await T('t.debrisProbe()')) if (p.floor != null) { seen++; minRel = Math.min(minRel, p.y - p.floor); } }
    check('debris over a raised floor (M02 gallery, 3 m) stops at that floor, not at world zero (no chip sinks more than a frame\'s travel below it)', seen > 20 && minRel > -0.4 && (await T('t.debrisProbe()')).length === 0, `${seen} samples, lowest chip ${minRel.toFixed(3)} m relative to its floor, remaining after 0.64 s: ${(await T('t.debrisProbe()')).length}`); }
  // outlines (PT-006): enemies keep the ORIGINAL ink. The corner ink added for the level traced every box edge of a rig and read as a wireframe. Measured in the real game: the ink INSIDE an enemy's body
  // (the ink mask, its screen box shrunk 20% per side) in the normal picture must not exceed the same frame drawn entirely on the original pass (uClassic) by more than 15% (the wireframe version: +90% on a Tollbearer).
  await T("t.newGame('normal', 3, { mapId: 'C1E1M02' })"); await T('t.clearOverlays(); t.setup_openDoors()');
  { const inkIn = (buf, r) => { const png = PNG.sync.read(buf), w = png.width, h = png.height, dx = 0.2 * (r.x1 - r.x0), dy = 0.2 * (r.y1 - r.y0), x0 = Math.round((r.x0 + dx) * w), x1 = Math.round((r.x1 - dx) * w), y0 = Math.round((r.y0 + dy) * h), y1 = Math.round((r.y1 - dy) * h); let ink = 0, n = 0; for (let y = Math.max(0, y0); y < Math.min(h, y1); y++) for (let x = Math.max(0, x0); x < Math.min(w, x1); x++) { n++; if (png.data[(y * w + x) * 4] > 128) ink++; } return { n, share: n ? ink / n : 0 }; };
    await T('t.setup_teleport(47, 87, -Math.PI / 2); t.setup_player({ pitch: 0, hp: 100000, hurt: 0 })');
    const placed = JSON.parse(await T('const p = t.state().player, b = t.enemyBounds(), used = []; for (const [kind, ahead, side] of [["tollbearer", 4, -1.0], ["bellhand", 7, 1.2]]) { const e = b.find((q) => q.kind === kind && !used.includes(q.id)); if (!e) continue; used.push(e.id); t.setup_enemy(e.id, { x: p.x - Math.sin(p.yaw) * ahead + Math.cos(p.yaw) * side, z: p.z - Math.cos(p.yaw) * ahead - Math.sin(p.yaw) * side, yaw: p.yaw, state: "chase", hp: 100000, attackT: -1, lungeT: -1, lastX: p.x, lastZ: p.z, lost: 0 }); } t.tick(1); for (const id of used) t.setup_enemy(id, { walk: 1, phase: 1.3 }); return JSON.stringify(used.map((id) => ({ id, kind: t.enemyBounds().find((q) => q.id === id).kind })))'));
    const mask = async (classic) => { await T(`t.setup_postClassic(${classic}); t.setup_postDebug(true); t.clearOverlays(); t.render(0.02)`); const b = await page.screenshot(); await T('t.setup_postDebug(false); t.setup_postClassic(false)'); return b; };
    const normal = await mask(false), classic = await mask(true), rows = [];
    for (const p of placed) { const rect = JSON.parse(await T(`JSON.stringify(t.enemyScreenRect(${p.id}))`)); if (!rect) continue; const a = inkIn(normal, rect), c = inkIn(classic, rect); rows.push({ kind: p.kind, n: a.n, normal: +a.share.toFixed(3), classic: +c.share.toFixed(3) }); }
    check('outlines: enemy bodies keep the original ink (ink inside a Tollbearer and a Bellhand is within 15% of the original pass; the corner ink is for the level only)', rows.length === 2 && rows.every((r) => r.n > 400 && r.classic > 0.05 && r.normal <= r.classic * 1.15 + 0.01), JSON.stringify(rows)); }
  await T("t.newGame('normal', 1, { mapId: 'C1E1M01' })");                       // the sections below use the current map

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
  await T('t.pause()'); check('pause shows the pause menu', await visible('screen-pause')); await T('t.clearOverlays()'); await shot('05-pause');
  await T('t.resume()');

  // ---- 4. death + recovery ------------------------------------------------------------------------------------------
  await T("t.newGame('normal', 2)"); await T("t.setup_player({ hp: 0 })"); await T('t.tick(2)');
  const dead = await T('t.state()');
  check('player death is detected', dead.status === 'dead' && dead.mode === 'dying', `${dead.status}/${dead.mode}`);
  await page.waitForFunction("!document.getElementById('screen-dead').classList.contains('hidden')", { timeout: 15000 }).catch(() => {});
  check('death screen appears', await visible('screen-dead')); await T('t.clearOverlays()'); await shot('06-death');
  await page.click('#btn-retry');
  const again = await T('t.state()'); check('retry restarts the level with a live player', again.status === 'playing' && again.player.hp > 0 && again.tick === 0);

  // ---- 5. combat visuals + effects ----------------------------------------------------------------------------------
  await T("t.newGame('normal', 3)"); await T('t.tick(30)'); await shot('07-hall');
  await T("t.press('aim')"); await T('t.tick(30)'); await shot('07b-ads'); await T("t.release('aim')"); await T('t.tick(30)');
  await T("t.press('forward'); t.press('sprint')"); await T('t.tick(30)'); await shot('07c-sprint'); await T("t.release('forward'); t.release('sprint')"); await T('t.tick(30)');
  await T("t.setup_teleport(20, 34, -Math.PI / 2)"); await T("t.press('fire')"); await T('t.tick(2)'); await T("t.release('fire')"); await shot('08-fire-muzzle');
  await T('t.tick(20)'); await shot('09-flare-flight'); await T('t.tick(25)'); await shot('10-aftermath');
  await T("t.setup_teleport(36, 30, -Math.PI / 2 + 0.3)"); await T('t.tick(10)'); await shot('11-plaza');
  // performance budget: draw calls / triangles at three vantage points (counts, not fps; software GL cannot give real timings)
  const budget = {};
  await T("t.newGame('hard', 8)");
  for (const [name, x, z, yaw, awake] of [['pier', 8, 33, -Math.PI / 2], ['plaza', 34, 30, -Math.PI / 2 + 0.35], ['warehouse', 76, 24, -Math.PI / 2 + 0.25], ['plaza-all-awake', 34, 30, -Math.PI / 2 + 0.35, true], ['warehouse-all-awake', 76, 24, -Math.PI / 2 + 0.25, true]]) {
    await T('t.setup_openDoors()'); await T(`t.setup_teleport(${x}, ${z}, ${yaw})`); if (awake) { await T('t.setup_wakeAll(); t.tick(40)'); } budget[name] = await T('t.measureFrame()');
  }
  // Gate 2: the heaviest new vantage points (a stall market, the hill terraces, the open quay, the dark house, the boss chamber), asleep and awake
  for (const [name, id, cx, cz, yaw, awake] of [['m03-market', 'C1E1M03', 20.5, 22.5, -Math.PI / 2], ['m03-market-all-awake', 'C1E1M03', 20.5, 22.5, -Math.PI / 2, true], ['m05-terrace', 'C1E1M05', 30.5, 31.5, -Math.PI / 2], ['m05-terrace-all-awake', 'C1E1M05', 30.5, 31.5, -Math.PI / 2, true], ['m06-quay', 'C1E1M06', 30.5, 23.5, -Math.PI / 2], ['m06-quay-all-awake', 'C1E1M06', 30.5, 23.5, -Math.PI / 2, true], ['m07-atrium', 'C1E1M07', 10.5, 23.5, -Math.PI / 2], ['m08-chamber', 'C1E1M08', 38.5, 35.5, Math.PI / 2], ['m08-chamber-all-awake', 'C1E1M08', 38.5, 35.5, Math.PI / 2, true]]) {
    await T(`t.newGame('hard', 8, { mapId: '${id}' })`); await T('t.setup_openDoors()'); await T(`t.setup_teleport(${cx * 2}, ${cz * 2}, ${yaw})`); if (awake) { await T('t.setup_wakeAll(); t.tick(40)'); } budget[name] = await T('t.measureFrame()');
  }
  await T("t.newGame('normal', 1, { mapId: 'C1E1M01' })");
  const baseFile = path.join(root, 'validation/render-budget-baseline.json');
  if (updateBaseline || !fs.existsSync(baseFile)) fs.writeFileSync(baseFile, JSON.stringify({ note: 'reference counts the budget check compares against (x1.25 allowed). Regenerate deliberately with: npm run browsercheck -- --update-baseline', when: new Date().toISOString(), budget: Object.fromEntries(Object.entries(budget).map(([k, v]) => [k, { calls: v.calls, triangles: v.triangles }])) }, null, 2));
  const base = JSON.parse(fs.readFileSync(baseFile, 'utf8')).budget;
  check('render budget: every vantage (asleep AND all-awake) is within 25% of the recorded baseline for draw calls and triangles', Object.entries(budget).every(([k, b]) => base[k] && b.calls <= base[k].calls * 1.25 && b.triangles <= base[k].triangles * 1.25), JSON.stringify(Object.fromEntries(Object.entries(budget).map(([k, b]) => [k, [b.calls, base[k]?.calls, b.triangles, base[k]?.triangles]]))));
  check('render budget: draw calls and triangles stay modest at the heaviest vantage points', Object.values(budget).every((b) => b.calls > 20 && b.triangles > 1000 && b.triangles < 60000), JSON.stringify(budget));
  // hard ceilings are engineering budgets, not measurements: 350 calls for sleeping enemies, 900 with the whole level awake (every awake rig is ~30 draw calls; the Gate 2 crowds reach ~830 at the market and the quay); UNVERIFIED on a real GPU
  check('render budget ceilings: <= 350 draw calls asleep, <= 900 with every enemy awake (a crowd of 25+ awake rigs in view is the worst case)', Object.entries(budget).every(([k, b]) => b.calls <= (k.includes('awake') ? 900 : 350)), JSON.stringify(Object.fromEntries(Object.entries(budget).map(([k, b]) => [k, b.calls]))));
  fs.writeFileSync(path.join(root, 'validation/render-budget.json'), JSON.stringify({ when: new Date().toISOString(), map: 'C1E1M01 + Gate 2 vantages (m03/m05/m06/m07/m08)', note: 'counts from renderer.info at fixed vantage points; NOT frame timings', budget }, null, 2));

  // ---- 5b. UX: prompts, quick save/load, pause layout at small windows ---------------------------------------------------
  await T("t.newGame('normal', 12, { realtime: true })"); await T('t.setup_clearEnemies(); t.clearOverlays()'); await sleep(200);
  const hintAt = async (x, z, yaw) => { await T(`t.setup_teleport(${x}, ${z}, ${yaw})`); await sleep(350); let h = await text('use-hint'); for (let i = 0; i < 12 && !h; i++) { await sleep(250); h = await text('use-hint'); } return h; };          // the HUD is drawn by the page's own frame loop: on a loaded machine it takes more than 350 ms
  check('looking at a closed door within reach shows how to open it', (await hintAt(15, 36.4, Math.PI)) === '[E] open', await text('use-hint'));
  check('a locked door says what it needs', (await hintAt(79, 54.4, Math.PI)).includes('needs the brass key'), await text('use-hint'));
  await T('t.setup_teleport(13.4, 45, Math.PI / 2)'); await sleep(350);
  check('the secret panel gives NO prompt (it must stay a secret)', !(await visible('use-hint')), 'use-hint hidden facing the panel');
  await T('t.setup_teleport(30, 33, -Math.PI / 2)'); await sleep(300);
  check('no prompt when nothing is in reach', !(await visible('use-hint')));
  await page.evaluate(() => { for (const k of Object.keys(localStorage)) if (k.startsWith('hushfall.save.quick')) localStorage.removeItem(k); });
  await T('t.pause()'); await sleep(150);
  check('Quick load is hidden while no quick save exists (no dead-end button)', (await page.$eval('#btn-load', (e) => getComputedStyle(e).display)) === 'none');
  await page.keyboard.press('Escape'); await sleep(200);
  await page.keyboard.press('F5'); await sleep(300);
  check('F5 quick-saves without opening the pause menu and says so', (await T("t.saveSlot('quick').ok")) === true && (await T('t.state().mode')) === 'playing' && (await text('toasts')).includes('Quick saved'), await text('toasts'));
  await T('t.setup_teleport(30, 33, -Math.PI / 2)'); const xBefore = (await T('t.state().player.x'));
  await T('t.setup_teleport(10, 33, -Math.PI / 2)'); await page.keyboard.press('F9'); await sleep(400);
  check('F9 loads the quick save (position restored)', Math.abs((await T('t.state().player.x')) - xBefore) < 1.5, 'x=' + (await T('t.state().player.x')));
  await T('t.pause()'); await sleep(150);
  check('Quick load appears once a quick save exists', (await page.$eval('#btn-load', (e) => getComputedStyle(e).display)) !== 'none');
  // Retry after a LOAD must restore the inventory the level began with (audit F06): pick up a weapon and spend ammo AFTER loading, then restart from the pause menu
  await T("t.setup_player({ weapons: ['flare', 'scattergun'], ammo: { flare: 1, shell: 9 }, hp: 33 })"); await page.click('#btn-restart'); await sleep(400);
  const afterRetry = await T('t.state().player');
  check('Retry after loading a save restores the level-start inventory (flare cannon only, 8 flares, full health), not the mid-level one', afterRetry.weapons.length === 1 && afterRetry.weapon === 'flare' && afterRetry.ammo.flare === 8 && afterRetry.hp === 100, JSON.stringify({ weapons: afterRetry.weapons, ammo: afterRetry.ammo, hp: afterRetry.hp }));
  await T('t.setup_clearEnemies(); t.clearOverlays()'); await T('t.pause()'); await sleep(150);
  await page.evaluate(() => { document.getElementById('controls-box').open = true; document.getElementById('settings-box').open = true; });
  for (const [w, h] of [[1280, 720], [1280, 600], [800, 600], [1024, 480]]) {
    await page.setViewport({ width: w, height: h }); await sleep(150);
    const r = await page.$eval('#screen-pause .panel', (e) => { const b = e.getBoundingClientRect(); return { top: b.top, bottom: b.bottom, sh: e.scrollHeight, ch: e.clientHeight, ov: getComputedStyle(e).overflowY, ih: innerHeight }; });
    const reach = await page.evaluate(() => { const p = document.querySelector('#screen-pause .panel'); const ok = (id) => { const el = document.getElementById(id); el.scrollIntoView({ block: 'center' }); const b = el.getBoundingClientRect(), pb = p.getBoundingClientRect(); return b.top >= pb.top - 1 && b.bottom <= pb.bottom + 1 && b.height > 0; }; return { resume: ok('btn-resume'), restart: ok('btn-restart'), quit: ok('btn-quit') }; });
    check(`pause menu fits a ${w}x${h} window (panel inside the viewport, scrolls, Resume/Restart/Quit reachable)`, r.top >= 0 && r.bottom <= r.ih + 1 && (r.sh <= r.ch || r.ov === 'auto') && reach.resume && reach.restart && reach.quit, JSON.stringify({ ...r, ...reach }));
    // the control list used to sit in its own 34vh scroller: rows were clipped against the Reset button (a half row at the edge, 350+ px hidden). One scroll region, every row visible, a gap above the button.
    const lay = await page.evaluate(() => { const c = document.getElementById('controls'), btn = document.getElementById('btn-reset-keys'), rows = [...c.children], bb = btn.getBoundingClientRect(), cb = c.getBoundingClientRect(), last = rows[rows.length - 1].getBoundingClientRect();
      return { rows: rows.length, hiddenInList: c.scrollHeight - c.clientHeight, rowsOverlappingButton: rows.filter((x) => { const b = x.getBoundingClientRect(); return b.height > 0 && b.bottom > bb.top && b.top < bb.bottom; }).length, gapToButton: Math.round(bb.top - last.bottom), partialRow: rows.some((x) => { const b = x.getBoundingClientRect(); return b.top < cb.bottom && b.bottom > cb.bottom + 1; }) }; });
    check(`pause menu ${w}x${h}: every control row is visible (no nested scroller), none touches the Reset button, and there is a gap above it`, lay.rows >= 15 && lay.hiddenInList <= 1 && lay.rowsOverlappingButton === 0 && lay.gapToButton >= 6 && !lay.partialRow, JSON.stringify(lay));
    if (w === 800) await shot('05b-pause-800x600');
  }
  await page.setViewport({ width: 1280, height: 720 }); await page.keyboard.press('Escape'); await sleep(200);
  // no WebGL: the player is told, instead of staring at a title screen whose buttons do nothing
  { const b2 = await puppeteer.launch({ headless: true, args: ['--disable-gpu', '--disable-webgl', '--disable-3d-apis', '--disable-software-rasterizer'] }); const p2 = await b2.newPage();
    await p2.goto('http://localhost:5210/', { waitUntil: 'domcontentloaded', timeout: 0 }); await p2.waitForFunction("!document.getElementById('screen-error').classList.contains('hidden')", { timeout: 60000 }).catch(() => {});
    const msg = await p2.$eval('#error-text', (e) => e.textContent).catch(() => ''); check('with WebGL unavailable the game says so on screen (no inert title)', /WebGL/.test(msg), msg.slice(0, 90)); await b2.close(); }

  // ---- Campaign 2, Act A (PT-037): the pieces the node tests cannot see, what the live page draws against the sim -----------------------------------------------------------------------------------------------------------
  const mapJson = (id) => page.evaluate(`fetch('/maps/${id}.json').then((r) => r.json())`);
  // the Record: messages received on three maps are listed by map, in the screen the pause menu opens, found documents counted apart from voices; Back leaves it
  { const ids = {}; let total = 0; for (const id of ['C1E1M01', 'C2M01', 'C2M03']) { ids[id] = (await mapJson(id)).messages.map((m) => m.id); total += ids[id].length; }
    await T("t.newGame('normal', 3, { mapId: 'C2M03' })"); await T('t.clearOverlays()'); await T(`t.setup_progress({ record: ${JSON.stringify(ids)} })`);
    const rec = await T("t.openRecord('pause')"); const closed = await T('t.closeRecord()');
    check('the Record in the live page: the screen opens, lists every message received (51-ish across three maps), by map, with found documents counted apart, and Back leaves it', rec.screen === 'record' && rec.groups === 3 && rec.entries === total && rec.docs >= 1 && closed.screen !== 'record', `screen ${rec.screen}, groups ${rec.groups}, entries ${rec.entries} of ${total}, documents ${rec.docs}, after Back: ${closed.screen}`); }
  // the peaceful Vael: a calm one and a fleeing one standing side by side are DRAWN differently (the frill folds when it is afraid), both have a mesh in the scene, and neither is in a fighting state
  { await T("t.newGame('normal', 3, { mapId: 'C2M03' })"); await T('t.setup_clearEnemies(); t.clearOverlays()'); const p0 = (await T('t.state()')).player;
    const a = await T(`t.setup_spawnEnemy('vaelfolk', ${p0.x - 1.5}, ${p0.z - 3.5}, 0, 'calm')`), b = await T(`t.setup_spawnEnemy('vaelfolk', ${p0.x + 1.5}, ${p0.z - 3.5}, 0, 'calm')`);
    await T(`t.setup_enemy(${b}, { state: 'flee', fearT: 6, fearX: ${p0.x}, fearZ: ${p0.z} })`); await T('t.tick(3)'); for (let i = 0; i < 6; i++) await T('t.render(0.05)');
    const bb = await T('t.enemyBounds()'), ea = bb.find((q) => q.id === a), eb = bb.find((q) => q.id === b), w = (q) => q.max[0] - q.min[0], h = (q) => q.max[1] - q.min[1];
    const drawn = (q) => !!q && [...q.min, ...q.max].every(Number.isFinite) && w(q) > 0.3 && h(q) > 1.5;      // (a first version of this case passed with the frightened one measuring NaN: it had been put to flee with no sound to flee from, a yaw of NaN; a box that is not a real box is a fail)
    check('peaceful Vael in the live game: a calm one and a frightened one are both drawn (a real box, a person tall), and the frightened one is drawn differently (its frill folds); neither is chasing', drawn(ea) && drawn(eb) && ea.state === 'calm' && eb.state === 'flee' && (Math.abs(w(ea) - w(eb)) > 0.05 || Math.abs(h(ea) - h(eb)) > 0.05), `calm ${ea && w(ea).toFixed(2)} x ${ea && h(ea).toFixed(2)} (${ea?.state}), afraid ${eb && w(eb).toFixed(2)} x ${eb && h(eb).toFixed(2)} (${eb?.state})`); }
  // a resonator: a shot beside a fork makes the sim ring it, and the view draws that ring (a pulse the same as the Cantors')
  { await T("t.newGame('normal', 3, { mapId: 'C2M04' })"); await T('t.setup_clearEnemies(); t.clearOverlays()'); const r = (await mapJson('C2M04')).entities.find((e) => e.kind === 'resonator');
    await T(`t.setup_teleport(${(r.at[0] + 0.5) * 2}, ${(r.at[1] + 0.5) * 2 + 3.2}, 0); t.setup_player({ pitch: -0.05, hp: 100000 })`); await T('t.tick(3)'); await T('t.render(0.02)'); const quiet = await T('t.foundryProbe()');
    await T("t.press('fire')"); await T('t.tick(12)'); await T("t.release('fire')"); await T('t.tick(10)'); for (let i = 0; i < 3; i++) await T('t.render(0.05)'); const rung = await T('t.foundryProbe()');
    check('a fork in the live game: nothing is drawn while it stands quiet, a shot beside it makes the sim ring it and the view draws the ring', quiet.pulses === 0 && rung.pulses > 0 && rung.pulseViews > 0, `quiet: sim rings ${quiet.pulses}; after a shot: sim rings ${rung.pulses}, drawn ${rung.pulseViews}`); }
  // current: a player who stands still in the first channel of the aqueduct is carried along it by the sim (east, 2.2 m/s on the cell)
  { await T("t.newGame('normal', 3, { mapId: 'C2M06' })"); await T('t.setup_clearEnemies(); t.clearOverlays()');
    await T('t.setup_teleport(105, 89, 0); t.setup_player({ pitch: -0.3, hp: 100000 })'); const x0 = (await T('t.state()')).player.x; await T('t.tick(60)'); for (let i = 0; i < 3; i++) await T('t.render(0.05)'); const x1 = (await T('t.state()')).player.x;
    check('current in the live game: standing still in the aqueduct\'s first channel carries the player east by more than a metre in a second', x1 - x0 > 1.0, `x ${x0.toFixed(2)} -> ${x1.toFixed(2)}`); }
  // a seed (Bellwright Yard): left alone it warns and cracks on the clock, and the bell-bearer that steps out has a mesh in the scene like every other creature
  { const m7 = await mapJson('C2M07'), crack = m7.triggers.find((t) => t.id === 'crack0'), t0 = Number(crack.when[0].slice(5));
    await T("t.newGame('normal', 3, { mapId: 'C2M07' })"); await T('t.clearOverlays()'); await T('t.setup_player({ hp: 100000 })'); const n0 = (await T('t.state()')).enemies.length;
    await T(`t.tick(${Math.round((t0 + 2) * 60)})`); for (let i = 0; i < 3; i++) await T('t.render(0.05)'); const st = await T('t.state()'), bb = await T('t.enemyBounds()'), fresh = st.enemies.filter((e) => !bb.some((q) => q.id === e.id));
    check('a seed in the live game: left alone it cracks on its clock (one more creature than at the start), and every creature in the sim, the new one too, is drawn', st.enemies.length >= n0 + 1 && fresh.length === 0, `creatures ${n0} -> ${st.enemies.length} at ${t0 + 2} s, without a mesh: ${fresh.length}`); }

  // ---- Campaign 2, Act B (PT-038): the Zealot, the hand lantern and the chimes in the live page (the Deep Range) -----------------------------------------------------------------------------------------------------------
  // the Zealot: drawn, a real box, as tall as the sim says; a lance that lands grafts (the HUD of the sim: the player's graft clock) and the walk is slower
  { await T("t.newGame('normal', 3, { mapId: 'DEEP' })"); await T('t.clearOverlays()'); await T('t.setup_clearEnemies()'); const p0 = (await T('t.state()')).player;
    const z = await T(`t.setup_spawnEnemy('zealot', ${p0.x + 3.2}, ${p0.z}, ${Math.PI / 2}, 'chase')`); await T('t.setup_player({ hp: 100000 })'); await T('t.tick(2)'); for (let i = 0; i < 4; i++) await T('t.render(0.05)');
    const eb = (await T('t.enemyBounds()')).find((q) => q.id === z), hgt = eb && eb.max[1] - eb.min[1], wid = eb && eb.max[0] - eb.min[0];
    check('a Zealot in the live game is drawn: a real box, about as tall as the sim says (2.3 m), and as wide as a person in armour', !!eb && [...eb.min, ...eb.max].every(Number.isFinite) && Math.abs(hgt - 2.3) < 0.35 && wid > 0.8, `height ${hgt?.toFixed?.(2)}, width ${wid?.toFixed?.(2)}`);
    let grafted = false; for (let i = 0; i < 60 && !grafted; i++) { await T('t.tick(10)'); grafted = (await T('t.state()')).player.graftT > 0; }
    check('a Zealot that reaches the player lands its lance and the graft takes (the walk is slowed by the sim)', grafted, `grafted ${grafted}`); }
  // the hand lantern: out, the held lantern and the gauge are there and the light is off; lit, the light fades up and the gauge says so; oil burns
  { await T("t.newGame('normal', 3, { mapId: 'DEEP' })"); await T('t.clearOverlays()'); await T('t.setup_clearEnemies()');
    for (let i = 0; i < 4; i++) await T('t.render(0.05)'); await sleep(400); const out = await T('t.lampProbe()');
    await T("t.press('lamp')"); await T('t.tick(2)'); await T("t.release('lamp')"); await T('t.tick(60)'); for (let i = 0; i < 12; i++) await T('t.render(0.05)'); await sleep(400); const lit = await T('t.lampProbe()');
    check('the hand lantern in the live game: out, its light is off and the gauge shows the oil; lit, the light is on, the gauge says LIT and the oil burns', out.model && out.light.intensity < 0.5 && out.hud.shown && /OIL/.test(out.hud.label) && lit.lamp.on && lit.light.intensity > 8 && /LIT/.test(lit.hud.label) && lit.lamp.oil < out.lamp.oil, `out ${JSON.stringify(out)}; lit ${JSON.stringify(lit)}`); }
  // the chimes: Use on a chime flares its glyph in the drawn scene, the tree plays and a fruit lights, an answered phrase is seen by the sim
  { await T("t.newGame('normal', 3, { mapId: 'DEEP' })"); await T('t.clearOverlays()'); await T('t.setup_clearEnemies()'); const deepMap = await page.evaluate("fetch('/maps-dev/DEEP.json').then((r) => r.json())"), c0 = deepMap.entities.find((e) => e.id === 'c0');
    await T(`t.setup_teleport(${(c0.at[0] + 0.5) * 2 - 1.1}, ${(c0.at[1] + 0.5) * 2}, ${-Math.PI / 2}); t.setup_player({ pitch: -0.15, hp: 100000 })`); await T('t.tick(2)'); for (let i = 0; i < 3; i++) await T('t.render(0.05)'); const quiet = await T('t.chimeProbe()');
    await T("t.press('use')"); await T('t.tick(2)'); await T("t.release('use')"); await T('t.tick(6)'); for (let i = 0; i < 3; i++) await T('t.render(0.05)'); const struck = await T('t.chimeProbe()'), g0 = (p) => p.chimes.find((q) => q.id === 'c0').glow;
    const tree = deepMap.entities.find((e) => e.kind === 'chimetree'); await T(`t.setup_teleport(${(tree.at[0] + 0.5) * 2}, ${(tree.at[1] + 0.5) * 2 + 2.3}, 0); t.setup_player({ pitch: -0.1 })`); await T('t.tick(2)'); await T("t.press('use')"); await T('t.tick(2)'); await T("t.release('use')"); await T('t.tick(50)'); for (let i = 0; i < 3; i++) await T('t.render(0.05)'); const playing = await T('t.chimeProbe()');
    check('chimes in the live game: a struck chime flares (drawn bigger than a quiet one), and the tree playing lights one of its fruit and its light', !!quiet && g0(struck) > g0(quiet) + 0.3 && playing.fruit.some((f) => f.scale > 1.2) && playing.treeLight > 0.5, `glow ${g0(quiet)?.toFixed(2)} -> ${g0(struck)?.toFixed(2)}; fruit ${JSON.stringify(playing.fruit?.map((f) => f.scale.toFixed(2)))}, light ${playing.treeLight?.toFixed?.(1)}`); }

  // ---- Campaign 2, Act B, the batches (PT-039): the Sub-Cantor drawn, a ring that turns back drawn, a Drowned tinted ---------------------------------------------------------------------------------------------------------------------
  { await T("t.newGame('normal', 3, { mapId: 'C2M16' })"); await T('t.clearOverlays()'); await T('t.setup_clearEnemies()'); const p0 = (await T('t.state()')).player;
    const sc = await T(`t.setup_spawnEnemy('subcantor', ${p0.x + 9}, ${p0.z}, ${Math.PI / 2}, 'idle')`); await T('t.setup_player({ hp: 100000 })'); await T('t.tick(2)'); for (let i = 0; i < 4; i++) await T('t.render(0.05)');
    const eb = (await T('t.enemyBounds()')).find((q) => q.id === sc), hgt = eb && eb.max[1] - eb.min[1];
    check('the Sub-Cantor in the live game is drawn: a real box, as tall as the sim says (3.8 m)', !!eb && [...eb.min, ...eb.max].every(Number.isFinite) && Math.abs(hgt - 3.8) < 0.4, `height ${hgt?.toFixed?.(2)}`);
    await T('t.setup_clearEnemies()'); await T(`t.setup_pulse(${p0.x + 9}, ${p0.z}, 12)`); let outView = 0, backSeen = false, backView = 0;
    for (let i = 0; i < 80 && !backSeen; i++) { await T('t.tick(6)'); await T('t.render(0.02)'); const pr = await T('t.pulseProbe()'); outView = Math.max(outView, pr.views); if (pr.pulses.some((q) => q.back)) { backSeen = true; await T('t.render(0.02)'); backView = (await T('t.pulseProbe()')).views; } }
    check('a ring that turns back is drawn going out and coming home (the sim turned it at 12 m; the view holds a ring on both legs)', backSeen && outView >= 1 && backView >= 1, `out ${outView}, turned ${backSeen}, back ${backView}`); }
  { await T("t.newGame('normal', 3, { mapId: 'C2M12' })"); await T('t.clearOverlays()'); await T('t.setup_clearEnemies()'); const p0 = (await T('t.state()')).player;
    const a = await T(`t.setup_spawnEnemy('tollbearer', ${p0.x + 3}, ${p0.z}, 0, 'idle')`), d = await T(`t.setup_spawnEnemy('tollbearer', ${p0.x + 5}, ${p0.z}, 0, 'idle', 'drowned')`); await T('t.tick(2)'); for (let i = 0; i < 3; i++) await T('t.render(0.05)');
    const ca = await T(`t.tintProbe(${a})`), cd = await T(`t.tintProbe(${d})`);
    check('a Drowned wears its kind\'s rig in a tint: the same Tollbearer, a different colour (the variant reaches the view)', ca != null && cd != null && ca !== cd, `plain ${ca?.toString?.(16)}, drowned ${cd?.toString?.(16)}`); }

  // ---- 6. lifecycle: repeated level transitions must not leak GPU resources --------------------------------------------
  await T("t.newGame('normal', 4)"); await T('t.tick(5)'); const g0 = await T('t.gl()');
  for (let i = 0; i < 12; i++) { await T(`t.newGame('normal', ${10 + i})`); await T('t.tick(3)'); }
  const g1 = await T('t.gl()');
  check('no GPU leak across 12 level restarts (geometries/textures stable)', g1.geometries <= g0.geometries + 2 && g1.textures <= g0.textures + 2, `geometries ${g0.geometries}->${g1.geometries}, textures ${g0.textures}->${g1.textures}, programs ${g0.programs}->${g1.programs}`);

  // ---- 7. real-time frames: fps/frame time (software GL: NOT a valid perf number) --------------------------------------
  await T("t.newGame('normal', 6, { realtime: true })"); await T("t.press('forward')");
  await new Promise((res) => setTimeout(res, 6000));
  perf = await T('t.perf()'); gl = await T('t.gl()');
  console.log('perf (SwiftShader, 1280x720):', JSON.stringify(perf), JSON.stringify(gl));
  check('real-time loop runs frames without exceptions', perf.frames > 20, `frames=${perf.frames} avg=${perf.avgMs.toFixed(1)}ms`);
  check('no frame stall of 3 s or more in the real-time sample (frame times are UNCLAMPED; software GL, so not a smoothness claim)', perf.worstMs < 3000, `worst ${perf.worstMs.toFixed(0)} ms, p95 ${perf.p95Ms.toFixed(0)} ms`);
  await T("t.release('forward')");

} catch (e) { errors.push('script: ' + (e.stack || e)); }
check('no uncaught exceptions or console errors', errors.length === 0, errors.slice(0, 3).join(' | '));
{
const sha16 = (f) => textSha(path.join(root, f));
const sh = (c) => { try { return execSync(c, { cwd: root, stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim(); } catch { return null; } };
if (renderGround) fs.writeFileSync(path.join(root, 'validation/render-ground.json'), JSON.stringify({ when: new Date().toISOString(), commit: sh('git rev-parse --short HEAD'), sources: sourceShas(root), checks: checks.filter((c) => c.name.startsWith('render truth')), report: renderGround }, null, 2));
fs.writeFileSync(path.join(root, 'validation/browser-check.json'), JSON.stringify({ when: new Date().toISOString(), commit: sh('git rev-parse --short HEAD'), sources: sourceShas(root), renderGround: renderGround && { band: renderGround.band, totals: renderGround.totals, violationCount: renderGround.violationCount, hitVolume: renderGround.hitVolume, cantor: renderGround.cantor && { problems: renderGround.cantor.problems, body: renderGround.cantor.body, shield: renderGround.cantor.shield, nodes: renderGround.cantor.nodes } }, dirtySource: !!sh("git status --porcelain -- . ':!review' ':!validation'"), mapSha: sha16('maps/C1E1M01.json'), mapShas: Object.fromEntries(['C1E1M01', 'C1E1M02', 'C1E1M03', 'C1E1M04', 'C1E1M05', 'C1E1M06', 'C1E1M07', 'C1E1M08', 'C1E1S01'].map((id) => [id, sha16('maps/' + id + '.json')])), gate2Routes: g2, mapVersion: JSON.parse(fs.readFileSync(path.join(root, 'maps/C1E1M01.json'), 'utf8')).version, env: 'headless Chrome 154, SwiftShader software GL, 1280x720', checks, errors, perf, gl, note: 'perf numbers are software-GL and are NOT a performance claim' }, null, 2));
}
await browser.close(); await server.close();
const failed = checks.filter((c) => !c.ok);
console.log(`\n${checks.length - failed.length}/${checks.length} checks passed`);
process.exit(failed.length ? 1 : 0);
