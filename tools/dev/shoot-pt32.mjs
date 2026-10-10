// REAL-GAME stills for Episode 4, Batch A (PT-032), in ONE headless-Chrome job (idle priority, two cores: tools/dev/low.ps1):
//   air     the Range's sky yard: the plate, the launch, three moments of the flight (looking ahead, looking down at the open sky), the landing, a miss and the set-back
//   loads   the Range's loads yard: calm, the warning at 7 s, the impact, the wreck, a Gaunt crushed
//   maps    the vantage points of C1E4M01 and C1E4M02 once they exist (maps-src/<ID>.views.json)
//   node tools/dev/shoot-pt32.mjs [outDir] [air,loads,maps]       -> <outDir>/*.png (default review/pt-032/stills)
import { savePng } from './savepng.mjs';
import { createServer } from 'vite';
import puppeteer from 'puppeteer';
import fs from 'node:fs';
import path from 'node:path';
const root = path.resolve(import.meta.dirname, '../..'), out = path.resolve(process.argv[2] ?? path.join(root, 'review/pt-032/stills')), want = new Set((process.argv[3] ?? 'air,loads').split(','));
fs.mkdirSync(out, { recursive: true });
const server = await createServer({ root, logLevel: 'error', server: { port: 5272, strictPort: true } }); await server.listen();
const browser = await puppeteer.launch({ headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage(); await page.evaluateOnNewDocument(() => { navigator.getGamepads = () => [null, null, null, null]; }); await page.setViewport({ width: 1280, height: 720 });
const errors = []; page.on('pageerror', (e) => errors.push(String(e))); page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
await page.goto('http://localhost:5272/', { waitUntil: 'domcontentloaded', timeout: 0 });
await page.waitForFunction('window.__GAME_TEST__ && window.__GAME_TEST__.ready', { timeout: 120000 });
await page.waitForFunction("[...document.querySelectorAll('#dev-map option')].some((o) => o.value === 'RANGE')", { timeout: 60000 });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const T = (code) => page.evaluate(`(() => { const t = window.__GAME_TEST__; ${code.includes(';') ? code + ';' : 'return ' + code + ';'} })()`);
const shot = async (name) => { await T('t.setup_player({ hurt: 0 }); t.clearOverlays(); t.render(0.02)'); await sleep(350); await T('t.render(0.02)'); await savePng(page, path.join(out, name + '.png')); console.log('shot', name); };
const YAW = { east: -Math.PI / 2, west: Math.PI / 2, north: 0, south: Math.PI };
const R = { errors, probes: {} };
const at = async (cx, cz, yaw, pitch = 0) => { await T(`t.setup_teleport(${cx * 2 + 1}, ${cz * 2 + 1}, ${typeof yaw === 'string' ? YAW[yaw] : yaw}); t.setup_player({ pitch: ${pitch}, hp: 100000 })`); };

if (want.has('air')) {
  await T("t.newGame('normal', 3, { mapId: 'RANGE' })"); await T('t.setup_clearEnemies(); t.clearOverlays()'); await T('t.tick(5)');
  await at(9, 98, 'east', 0.05); await T('t.tick(2)'); await shot('air-plate-approach');
  await at(11, 98, 'east', 0.05); await T('t.tick(2)'); await shot('air-plate-close');
  await at(12, 98, 'east', 0.1); await T('t.tick(30)'); await shot('air-launch-0.5s'); R.probes.a = await T('t.airProbe()');
  await T('t.tick(60)'); await T('t.setup_player({ pitch: 0.05 })'); await shot('air-flight-1.5s-ahead'); R.probes.b = await T('t.airProbe()');
  await T('t.setup_player({ pitch: -0.9 })'); await shot('air-flight-looking-down'); R.probes.c = await T('t.airProbe()');
  await T('t.setup_player({ pitch: 0.05 })'); await T('t.tick(60 * 1.6)'); await shot('air-flight-3s-descending'); R.probes.d = await T('t.airProbe()');
  await T('t.tick(60 * 1.2)'); await shot('air-landed'); R.probes.e = await T('t.airProbe()');
  // a miss: steer back the whole flight
  await T("t.newGame('normal', 3, { mapId: 'RANGE' })"); await T('t.setup_clearEnemies(); t.clearOverlays()'); await at(12, 98, 'east', 0.1); await T('t.tick(2)'); await T("t.press('back')"); await T('t.tick(60 * 3.4)'); await shot('air-miss-falling'); R.probes.f = await T('t.airProbe()');
  await T('t.tick(60 * 0.6)'); await T("t.release('back')"); await T('t.tick(10)'); await shot('air-miss-set-back'); R.probes.g = await T('t.airProbe()');
}
if (want.has('loads')) {
  await T("t.newGame('normal', 3, { mapId: 'RANGE' })"); await T('t.setup_clearEnemies(); t.clearOverlays()');
  await at(53, 100, 'north', 0.1); await T('t.tick(60 * 4)'); await shot('loads-calm');
  await T('t.tick(60 * 3.1)'); await shot('loads-warning-7.1s'); R.probes.h = await T('t.airProbe()');
  await T('t.tick(60 * 0.7)'); await shot('loads-warning-7.8s-glow');
  await T('t.tick(60 * 0.4)'); await shot('loads-impact-8.2s'); await T('t.tick(60 * 0.1)'); await shot('loads-wreck-8.3s'); R.probes.i = await T('t.airProbe()');
  // a walker crushed: a Gaunt standing in the next rect when it lands (t 12)
  await T("t.setup_spawnEnemy('gaunt', 108, 207, 0, 'idle')"); await T('t.setup_enemy(t.state().enemies[t.state().enemies.length - 1].id, { sightR: 0.01 })'); await T('t.tick(60 * 2.6)'); await shot('loads-second-warning'); await T('t.tick(60 * 1.2)'); await shot('loads-second-impact'); R.probes.j = await T('t.state().enemies.slice(-1)[0]');
}
if (want.has('maps')) {
  let opened = false;
  for (const id of ['C1E4M01', 'C1E4M02']) {
    const vp = path.join(root, 'maps-src', id + '.views.json'); if (!fs.existsSync(vp)) continue;
    const views = JSON.parse(fs.readFileSync(vp, 'utf8'));
    await T(`t.newGame('normal', 3, { mapId: '${id}' })`); await T('t.clearOverlays()'); opened = false;
    for (const v of views) {
      if (v.open && !opened) { await T('t.setup_openDoors()'); opened = true; }
      const yaw = typeof v.yaw === 'string' ? YAW[v.yaw] : v.yaw;
      await T(`t.setup_teleport(${v.x * 2}, ${v.z * 2}, ${yaw}); t.setup_player({ pitch: ${v.pitch ?? 0}, hp: 100000, hurt: 0 })`);
      if (v.wake) await T('t.setup_wakeAll()'); if (v.ticks) await T(`t.tick(${v.ticks})`); else await T('t.tick(2)');
      await shot(`${id}-${v.name}`);
    }
  }
}
console.log(JSON.stringify(R, null, 1));
await browser.close(); await server.close(); process.exit(errors.length ? 1 : 0);
