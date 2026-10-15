import { createServer } from 'vite';
import puppeteer from 'puppeteer';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(import.meta.dirname, '../..');
const outDir = path.join(root, 'gemini-playthrough/images');
fs.mkdirSync(outDir, { recursive: true });

const server = await createServer({
  root,
  logLevel: 'error',
  server: { port: 5388, strictPort: true }
});
await server.listen();
const port = server.config.server.port;
console.log(`Vite server listening on http://localhost:${port}/`);

const browser = await puppeteer.launch({
  headless: true,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist']
});
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 720 });

const errors = [];
page.on('pageerror', (e) => errors.push('pageerror: ' + e));
page.on('console', (m) => {
  if (m.type() === 'error') errors.push('console: ' + m.text());
});

await page.goto(`http://localhost:${port}/`, { waitUntil: 'domcontentloaded', timeout: 0 });
await page.waitForFunction('window.__GAME_TEST__ && window.__GAME_TEST__.ready', { timeout: 120000 });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const T = (code) => page.evaluate(`(() => { const t = window.__GAME_TEST__; ${code.includes(';') ? code + ';' : 'return ' + code + ';'} })()`);

async function shot(filename) {
  await T('t.clearOverlays(); t.render(0.02)');
  await sleep(100);
  const buf = await page.screenshot({ type: 'png' });
  const p = path.join(outDir, filename);
  fs.writeFileSync(p, buf);
  console.log(`Saved screenshot: ${filename}`);
}

const report = {
  weaponFeel: {},
  controls: {},
  maps: {},
  errors: []
};

try {
  console.log('--- Step 1: Global Menus ---');
  await shot('001__TITLE__title_screen.png');

  // Open settings
  await page.evaluate(() => {
    const devBtn = document.getElementById('dev-start');
    const settingsBtn = document.getElementById('menu-settings') || document.querySelector('[data-menu="settings"]');
  });

  // Start RANGE map
  console.log('--- Step 2: Testing Range & Controls ---');
  await T("t.newGame('normal', 3, { mapId: 'RANGE' })");
  await T('t.clearOverlays()');
  await T('t.tick(20)');
  await shot('010__RANGE__spawn.png');

  // Test turn lag
  await T('t.tick(60)');
  await page.evaluate(() => {
    const v = window.__GAME_TEST__.view();
    v.lastLook[0] -= 0.15;
    window.__GAME_TEST__.render(0.016);
  });
  const turnLag = await page.evaluate(() => window.__GAME_TEST__.view().lag.x);
  report.controls.turnLag = turnLag;
  console.log(`Turn lag: ${turnLag}`);

  // Test sprint vs walk speed
  const p0 = (await T('t.state()')).player;
  await T("t.press('forward')");
  await T('t.tick(30)');
  const pWalk = (await T('t.state()')).player;
  await T("t.press('sprint')");
  await T('t.tick(30)');
  const pSprint = (await T('t.state()')).player;
  await T("t.release('forward'); t.release('sprint')");
  const walkSpeed = Math.hypot(pWalk.x - p0.x, pWalk.z - p0.z) / 0.5;
  const sprintSpeed = Math.hypot(pSprint.x - pWalk.x, pSprint.z - pWalk.z) / 0.5;
  report.controls.walkSpeedMps = +walkSpeed.toFixed(2);
  report.controls.sprintSpeedMps = +sprintSpeed.toFixed(2);
  report.controls.sprintMultiplier = +(sprintSpeed / walkSpeed).toFixed(2);
  console.log(`Walk: ${walkSpeed.toFixed(2)} m/s, Sprint: ${sprintSpeed.toFixed(2)} m/s (ratio: ${(sprintSpeed / walkSpeed).toFixed(2)})`);

  // Weapon stances & test firing
  const testWeapons = ['scattergun', 'flare', 'rivet', 'harpoon', 'arc', 'carbine', 'linethrower', 'fork', 'axe', 'fists'];
  let wIdx = 20;
  for (const w of testWeapons) {
    await T(`t.setup_player({ weapon: '${w}', switchT: 0 })`);
    await T('t.tick(30)');
    await shot(`0${wIdx}__RANGE__weapon_${w}_hip.png`);
    wIdx++;

    // ADS test
    await T("t.press('aim')");
    await T('t.tick(15)');
    const adsFov = await page.evaluate(() => window.__GAME_TEST__.view()?.cam.fov);
    await shot(`0${wIdx}__RANGE__weapon_${w}_ads.png`);
    wIdx++;
    await T("t.release('aim')");
    await T('t.tick(15)');

    // Fire recoil test
    const camPitch0 = await page.evaluate(() => window.__GAME_TEST__.view()?.cam.rotation.x);
    await T("t.press('fire')");
    await T('t.tick(2)');
    const camPitchFired = await page.evaluate(() => window.__GAME_TEST__.view()?.cam.rotation.x);
    await T('t.tick(10)');
    await T("t.release('fire')");
    await T('t.tick(20)');
    report.weaponFeel[w] = {
      adsFov,
      recoilPitchDelta: +(camPitchFired - camPitch0).toFixed(4)
    };
  }

  // Melee hit-stop freeze test against sponge
  await T("t.setup_teleport(11, 14.9, 0); t.setup_player({ weapon: 'axe', switchT: 0, hp: 100000 })");
  await T('t.tick(40)');
  await shot('040__RANGE__sponge_target.png');
  await T("t.press('fire')");
  let freezeSeen = 0;
  for (let i = 0; i < 35; i++) {
    await T('t.tick(1)');
    const fz = await page.evaluate(() => window.__GAME_TEST__.view()?.vm.freeze ?? 0);
    if (fz > 0) freezeSeen = Math.max(freezeSeen, fz);
  }
  await T("t.release('fire')");
  report.weaponFeel.axeMeleeFreezeSeconds = freezeSeen;
  console.log(`Axe melee hit freeze: ${freezeSeen}s`);

  // Crowd target flare & arc
  await T("t.setup_teleport(72, 32, -Math.PI / 2); t.setup_player({ weapon: 'flare', switchT: 0 })");
  await T("t.press('fire')");
  await T('t.tick(5)');
  await T("t.release('fire')");
  await T('t.tick(25)');
  await shot('045__RANGE__crowd_flare_burn.png');

  // Step 3: C1E1M01 Marrow Quay Real-Game Playthrough
  console.log('--- Step 3: C1E1M01 Marrow Quay ---');
  await T("t.newGame('normal', 3, { mapId: 'C1E1M01' })");
  await T('t.clearOverlays()');
  await T('t.tick(10)');
  await shot('050__C1E1M01__spawn_pier.png');

  // Start canonical route
  await T("t.startBot('C1E1M01.main')");
  // Step bot 300 ticks (~5 sec in)
  await T('t.stepBot(300)');
  await shot('051__C1E1M01__first_corridor.png');

  // Step bot to first combat encounter
  await T('t.stepBot(500)');
  await shot('052__C1E1M01__combat_tollbearer.png');

  // Step bot into plaza
  await T('t.stepBot(900)');
  await shot('053__C1E1M01__plaza_vista.png');

  // Tab automap
  await page.evaluate(() => {
    const am = document.getElementById('automap');
    if (am) am.classList.remove('hidden');
  });
  await shot('054__C1E1M01__automap.png');
  await page.evaluate(() => {
    const am = document.getElementById('automap');
    if (am) am.classList.add('hidden');
  });

  // Step bot further
  await T('t.stepBot(1200)');
  await shot('055__C1E1M01__warehouse_combat.png');

  // Step bot near exit
  await T('t.stepBot(1200)');
  await shot('056__C1E1M01__exit_dock_gate.png');

  // Step bot to completion
  let botRes = await T('t.stepBot(1500)');
  console.log(`C1E1M01 bot finished: done=${botRes.done}, failed=${botRes.failed}, ticks=${botRes.tick}`);
  report.maps['C1E1M01'] = {
    ticks: botRes.tick,
    hp: botRes.player?.hp,
    stats: botRes.stats,
    secretsFound: botRes.secretsFound
  };

  // Step 4: C1E1M02 Customs Hall
  console.log('--- Step 4: C1E1M02 Customs Hall ---');
  await T("t.newGame('normal', 3, { mapId: 'C1E1M02' })");
  await T('t.clearOverlays()');
  await T('t.tick(10)');
  await shot('060__C1E1M02__spawn_hall.png');
  await T("t.startBot('C1E1M02.main')");
  await T('t.stepBot(800)');
  await shot('061__C1E1M02__doors_and_locks.png');
  await T('t.stepBot(1500)');
  await shot('062__C1E1M02__indoor_firefight.png');
  botRes = await T('t.stepBot(2500)');
  console.log(`C1E1M02 bot finished: done=${botRes.done}`);
  report.maps['C1E1M02'] = { ticks: botRes.tick, hp: botRes.player?.hp, stats: botRes.stats };

  // Step 5: C1E1M08 Bell Tower of St. Orrin (Boss)
  console.log('--- Step 5: C1E1M08 Bell Tower ---');
  await T("t.newGame('normal', 3, { mapId: 'C1E1M08' })");
  await T('t.clearOverlays()');
  await T('t.tick(10)');
  await shot('070__C1E1M08__spawn_approach.png');
  await T("t.startBot('C1E1M08.main')");
  await T('t.stepBot(1200)');
  await shot('071__C1E1M08__boss_arena.png');
  await T('t.stepBot(1500)');
  await shot('072__C1E1M08__boss_cantor_shield.png');
  botRes = await T('t.stepBot(2500)');
  console.log(`C1E1M08 bot finished: done=${botRes.done}`);
  report.maps['C1E1M08'] = { ticks: botRes.tick, hp: botRes.player?.hp, stats: botRes.stats };

  // Step 6: C1E2M05 The Cradle Annex (Atmosphere & Horror)
  console.log('--- Step 6: C1E2M05 The Cradle Annex ---');
  await T("t.newGame('normal', 3, { mapId: 'C1E2M05' })");
  await T('t.clearOverlays()');
  await T('t.tick(10)');
  await shot('080__C1E2M05__cradle_spawn.png');
  await T("t.startBot('C1E2M05.main')");
  await T('t.stepBot(600)');
  await shot('081__C1E2M05__cradles_and_pods.png');
  await T('t.stepBot(800)');
  await shot('082__C1E2M05__flesh_growth.png');
  botRes = await T('t.stepBot(1500)');
  console.log(`C1E2M05 bot finished: done=${botRes.done}`);
  report.maps['C1E2M05'] = { ticks: botRes.tick, hp: botRes.player?.hp, stats: botRes.stats };

  // Step 7: C2M02 Glass Steppe (Vast terrain)
  console.log('--- Step 7: C2M02 Glass Steppe ---');
  await T("t.newGame('normal', 3, { mapId: 'C2M02' })");
  await T('t.clearOverlays()');
  await T('t.tick(10)');
  await shot('090__C2M02__vast_steppe_spawn.png');
  await T("t.startBot('C2M02.main')");
  await T('t.stepBot(1500)');
  await shot('091__C2M02__open_expanse_combat.png');
  await T('t.stepBot(2000)');
  await shot('092__C2M02__distant_structures.png');
  botRes = await T('t.stepBot(3500)');
  console.log(`C2M02 bot finished: done=${botRes.done}`);
  report.maps['C2M02'] = { ticks: botRes.tick, hp: botRes.player?.hp, stats: botRes.stats };

  // Step 8: C2M30 The Unrung Gate (Ending & Lantern)
  console.log('--- Step 8: C2M30 The Unrung Gate ---');
  await T("t.newGame('normal', 3, { mapId: 'C2M30' })");
  await T('t.clearOverlays()');
  await T('t.tick(10)');
  await shot('100__C2M30__gate_approach.png');
  await T("t.startBot('C2M30.main')");
  await T('t.stepBot(400)');
  await shot('101__C2M30__lit_lantern_walk.png');
  await T('t.stepBot(600)');
  await shot('102__C2M30__the_unrung_gate.png');
  botRes = await T('t.stepBot(1000)');
  console.log(`C2M30 bot finished: done=${botRes.done}`);
  report.maps['C2M30'] = { ticks: botRes.tick, status: botRes.status };

  report.errors = errors;
  fs.writeFileSync(path.join(root, 'gemini-playthrough/play_report.json'), JSON.stringify(report, null, 2));
  console.log('PLAYTHROUGH RUN COMPLETE! Report written to gemini-playthrough/play_report.json');

} catch (err) {
  console.error('Playthrough encountered error:', err);
} finally {
  await browser.close();
  await server.close();
}
