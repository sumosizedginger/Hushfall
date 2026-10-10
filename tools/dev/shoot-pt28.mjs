// REAL-GAME stills for Episode 3, Batch C (PT-028), in ONE headless-Chrome job (the owner's mouse stops reaching the screen while my Chrome jobs run: idle priority, two cores, one job: tools/dev/low.ps1):
//   elites   the Bulwark Shell (plate toward you, its back, shut and open mid-bash) and the Weeping Mother (front, three-quarter, the tell, a tear in the air, the pool, the sacs swelling, two Gaunts at her feet) in the Range's elite yard
//   maps     the vantage points of C1E3M04 and C1E3S01 (maps-src/<ID>.views.json)
//   node tools/dev/shoot-pt28.mjs [outDir] [elites,maps]       -> <outDir>/*.png (default review/pt-028/stills)
import { savePng } from './savepng.mjs';
import { createServer } from 'vite';
import puppeteer from 'puppeteer';
import fs from 'node:fs';
import path from 'node:path';
const root = path.resolve(import.meta.dirname, '../..'), out = path.resolve(process.argv[2] ?? path.join(root, 'review/pt-028/stills')), want = new Set((process.argv[3] ?? 'elites,maps').split(','));
fs.mkdirSync(out, { recursive: true });
const server = await createServer({ root, logLevel: 'error', server: { port: 5269, strictPort: true } }); await server.listen();
const browser = await puppeteer.launch({ headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage(); await page.setViewport({ width: 1280, height: 720 });
const errors = []; page.on('pageerror', (e) => errors.push(String(e))); page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
await page.goto('http://localhost:5269/', { waitUntil: 'domcontentloaded', timeout: 0 });
await page.waitForFunction('window.__GAME_TEST__ && window.__GAME_TEST__.ready', { timeout: 120000 });
await page.waitForFunction("[...document.querySelectorAll('#dev-map option')].some((o) => o.value === 'RANGE')", { timeout: 60000 });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const T = (code) => page.evaluate(`(() => { const t = window.__GAME_TEST__; ${code.includes(';') ? code + ';' : 'return ' + code + ';'} })()`);
const shot = async (name) => { await T('t.setup_player({ hurt: 0 }); t.clearOverlays(); t.render(0.02)'); await sleep(350); await T('t.render(0.02)'); await savePng(page, path.join(out, name + '.png')); console.log('shot', name); };
const face = (px, pz, tx, tz) => Math.atan2(-(tx - px), -(tz - pz));
const YAW = { east: -Math.PI / 2, west: Math.PI / 2, north: 0, south: Math.PI };
const R = { errors };

if (want.has('elites')) {
  await T("t.newGame('normal', 3, { mapId: 'RANGE' })"); await T('t.clearOverlays()'); await T('t.tick(10)');
  const at = async (cx, cz, tx, tz, pitch = 0.04) => { const px = cx * 2, pz = cz * 2; await T(`t.setup_teleport(${px}, ${pz}, ${face(px, pz, tx * 2, tz * 2)}); t.setup_player({ pitch: ${pitch}, hp: 100 })`); await T('t.tick(3)'); };
  // the sponges in the elite yard (z 58 / 59): a Bulwark showing its plate, one showing its back, a Mother
  await at(6.5, 60.5, 6.5, 58.5, 0.12); await shot('bulwark-front');
  await at(12.5, 60.5, 12.5, 58.5, 0.12); await shot('bulwark-back');
  await at(8.5, 61, 6.5, 58.5, 0.14); await shot('bulwark-three-quarter');
  await at(20.5, 62.2, 20.5, 59.5, 0.3); await shot('mother-front');
  await at(22.5, 62.2, 20.5, 59.5, 0.3); await shot('mother-three-quarter');
  // a free Bulwark in the open floor of the yard (cells 26..32, 57..70 are clear): shut, then mid-bash (the carapace open), the lurch, dead
  const bid = await T("t.setup_spawnEnemy('bulwark', 60, 134, Math.PI, 'idle')");
  await T(`t.setup_teleport(60, 129, ${face(60, 129, 60, 134)}); t.setup_player({ pitch: 0.12, hp: 100 })`); await T('t.tick(2)'); await shot('bulwark-shut');
  await T(`t.setup_enemy(${bid}, { state: 'chase', attackT: 0.5 })`); await T('t.render(0.5)'); await T('t.render(0.5)'); await shot('bulwark-open');
  await T(`t.setup_enemy(${bid}, { attackT: 0.9 })`); await T('t.render(0.5)'); await T('t.render(0.5)'); await shot('bulwark-lurch');
  await T(`t.setup_enemy(${bid}, { state: 'dead', hp: 0, attackT: -1 })`); await T('for (let i = 0; i < 70; i++) t.tick(1)'); await shot('bulwark-dead');
  // a live Mother: the tell, a tear in the air, the pool, the sacs swelling, two Gaunts at her feet
  await T("t.newGame('normal', 3, { mapId: 'RANGE' })"); await T('t.clearOverlays()'); await T('t.tick(10)');
  const mid = await T("t.setup_spawnEnemy('weeping', 60, 134, Math.PI, 'chase')"); await T(`t.setup_teleport(59, 121, ${face(59, 121, 60, 134)}); t.setup_player({ pitch: 0.12, hp: 100000 })`); await T('t.tick(1)'); await T(`t.setup_enemy(${mid}, { shotCd: 0.1, summonCd: 99 })`);
  await T('for (let i = 0; i < 300; i++) { t.tick(1); if (t.eliteProbe().mothers[0].pulseT > 0.5) break; }'); await shot('mother-tell');
  await T('for (let i = 0; i < 300; i++) { t.tick(1); if (t.eliteProbe().simTears > 0) break; } for (let i = 0; i < 40; i++) t.tick(1);'); await shot('mother-tear-in-the-air');
  await T('for (let i = 0; i < 400; i++) { t.tick(1); if (t.eliteProbe().simPools.length > 0) break; } for (let i = 0; i < 20; i++) t.tick(1);'); await shot('mother-pool');
  await T(`t.setup_teleport(59, 112, ${face(59, 112, 60, 134)})`); await T('t.tick(2)'); await shot('mother-pool-from-afar');
  await T(`t.setup_enemy(${mid}, { shotCd: 99, summonCd: 0.1 })`); await T('for (let i = 0; i < 240; i++) { t.tick(1); if (t.eliteProbe().mothers[0].broodT > 1.5) break; }'); await shot('mother-brood-swell');
  await T('t.tick(50)'); await shot('mother-brood-born');
}
if (want.has('maps')) {
  let opened = false;
  for (const id of ['C1E3M04', 'C1E3S01']) {
    const views = JSON.parse(fs.readFileSync(path.join(root, 'maps-src', id + '.views.json'), 'utf8'));
    await T(`t.newGame('normal', 3, { mapId: '${id}' })`); await T('t.clearOverlays()'); opened = false;
    for (const v of views) {
      if (v.open && !opened) { await T('t.setup_openDoors()'); opened = true; }
      const yaw = typeof v.yaw === 'string' ? YAW[v.yaw] : v.yaw;
      await T(`t.setup_teleport(${v.x * 2}, ${v.z * 2}, ${yaw}); t.setup_player({ pitch: ${v.pitch ?? 0}, hp: 100, hurt: 0 })`);
      if (v.wake) await T('t.setup_wakeAll()'); if (v.ticks) await T(`t.tick(${v.ticks})`); else await T('t.tick(2)');
      await shot(`${id}-${v.name}`);
    }
  }
}
console.log(JSON.stringify(R, null, 1));
await browser.close(); await server.close(); process.exit(errors.length ? 1 : 0);
