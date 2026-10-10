// REAL-GAME stills for Episode 3, Batches D and E (PT-029, PT-030), in ONE headless-Chrome job (the owner's mouse stops reaching the screen while my Chrome jobs run: idle priority, two cores, one job: tools/dev/low.ps1):
//   creatures  the Cantor Acolyte, the Brood Vat (shut, swelling, birthing, dead), the Reed (still, struck, dead) and the Grand Cantor (front, three-quarter, rearing for its pulse, the slam, the two rings, dead) in the Range
//   maps       the vantage points of C1E3M05, C1E3M06, C1E3M07 and C1E3M08 (maps-src/<ID>.views.json)
//   node tools/dev/shoot-pt29.mjs [outDir] [creatures,maps]       -> <outDir>/*.png (default review/pt-029/stills)
import { savePng } from './savepng.mjs';
import { createServer } from 'vite';
import puppeteer from 'puppeteer';
import fs from 'node:fs';
import path from 'node:path';
const root = path.resolve(import.meta.dirname, '../..'), out = path.resolve(process.argv[2] ?? path.join(root, 'review/pt-029/stills')), want = new Set((process.argv[3] ?? 'creatures,maps').split(','));
fs.mkdirSync(out, { recursive: true });
const server = await createServer({ root, logLevel: 'error', server: { port: 5270, strictPort: true } }); await server.listen();
const browser = await puppeteer.launch({ headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage(); await page.setViewport({ width: 1280, height: 720 });
const errors = []; page.on('pageerror', (e) => errors.push(String(e))); page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
await page.goto('http://localhost:5270/', { waitUntil: 'domcontentloaded', timeout: 0 });
await page.waitForFunction('window.__GAME_TEST__ && window.__GAME_TEST__.ready', { timeout: 120000 });
await page.waitForFunction("[...document.querySelectorAll('#dev-map option')].some((o) => o.value === 'RANGE')", { timeout: 60000 });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const T = (code) => page.evaluate(`(() => { const t = window.__GAME_TEST__; ${code.includes(';') ? code + ';' : 'return ' + code + ';'} })()`);
const shot = async (name) => { await T('t.setup_player({ hurt: 0 }); t.clearOverlays(); t.render(0.02)'); await sleep(350); await T('t.render(0.02)'); await savePng(page, path.join(out, name + '.png')); console.log('shot', name); };
const face = (px, pz, tx, tz) => Math.atan2(-(tx - px), -(tz - pz));
const YAW = { east: -Math.PI / 2, west: Math.PI / 2, north: 0, south: Math.PI };
const R = { errors, probes: {} };
const look = async (px, pz, tx, tz, pitch = 0.1) => { await T(`t.setup_teleport(${px}, ${pz}, ${face(px, pz, tx, tz) - 0.16}); t.setup_player({ pitch: ${pitch}, hp: 100000 })`); await T('t.tick(2)'); };      // the target a little left of the crosshair: the gun is on the right

if (want.has('creatures')) {
  // the creatures stand in the open floor of the Marrow Nave (C1E3M04: no boss there, so no shield beams across the picture; x 76 to 104 m, z 58 m is level floor)
  const fresh = async () => { await T("t.newGame('normal', 3, { mapId: 'C1E3M04' })"); await T('t.setup_clearEnemies(); t.clearOverlays(); t.setup_openDoors()'); await T('t.tick(5)'); };
  await fresh();
  const spawn = (kind, x, state = 'idle') => T(`t.setup_spawnEnemy('${kind}', ${x}, 116 / 2, Math.PI / 2, '${state}')`);
  // the Cantor Acolyte
  const aid = await spawn('acolyte', 100); await look(86, 58, 100, 58, 0.18); await shot('acolyte-front'); await look(88, 54, 100, 58, 0.18); await shot('acolyte-three-quarter');
  await T(`t.setup_enemy(${aid}, { state: 'chase', hp: 100000, pulseCd: 99, pulseT: 0.9 })`); await look(86, 58, 100, 58, 0.18); await T(`t.setup_enemy(${aid}, { pulseT: 0.9 })`); await T('t.render(0.02)'); await shot('acolyte-singing');
  // the Brood Vat
  await fresh(); const vid = await spawn('vat', 100); await look(86, 58, 100, 58, 0.34); await shot('vat-front'); await look(90, 52, 100, 58, 0.3); await shot('vat-three-quarter');
  await T(`t.setup_enemy(${vid}, { state: 'chase', vatT: 1.0, summonCd: 5 })`); await look(86, 58, 100, 58, 0.34); await T(`t.setup_enemy(${vid}, { vatT: 1.0 })`); await T('t.render(0.02)'); await shot('vat-swelling'); R.probes.swell = await T('t.foundryProbe()');
  await T(`t.setup_enemy(${vid}, { vatT: -1, summonCd: 0 })`); await T('for (let i = 0; i < 400; i++) { t.tick(1); if (t.foundryProbe().born > 0) break; } for (let i = 0; i < 40; i++) t.tick(1)'); await look(86, 58, 100, 58, 0.26); await shot('vat-birth'); R.probes.birth = await T('t.foundryProbe()');
  await T(`t.setup_enemy(${vid}, { state: 'dead', hp: 0 })`); await T('for (let i = 0; i < 70; i++) t.tick(1)'); await shot('vat-dead');
  // the Reed
  await fresh(); const rid = await spawn('reed', 100); await look(88, 58, 100, 58, 0.3); await shot('reed-front'); await look(91, 52, 100, 58, 0.28); await shot('reed-three-quarter');
  await T(`t.setup_enemy(${rid}, { flash: 1 })`); await T('t.render(0.01)'); await shot('reed-struck');
  await T(`t.setup_enemy(${rid}, { state: 'dead', hp: 0, flash: 0 })`); await T('for (let i = 0; i < 70; i++) t.tick(1)'); await shot('reed-dead');
  // the Grand Cantor, asleep: from the front, the three-quarter, the side, the back
  await fresh(); const gid = await spawn('grandcantor', 104); await look(78, 58, 104, 58, 0.22); await shot('grand-front'); await look(84, 46, 104, 58, 0.2); await shot('grand-three-quarter'); await look(104, 40, 104, 58, 0.16); await shot('grand-side');
  await look(130, 58, 104, 58, 0.2); await shot('grand-back');
  // its pulse: the horn rears; the slam; then with a reed beside it (shielded), and the double ring
  await T(`t.setup_enemy(${gid}, { state: 'chase', hp: 900 })`); await look(80, 58, 104, 58, 0.26); await T(`t.setup_enemy(${gid}, { pulseT: 1.15 })`); await T('t.render(0.02)'); await shot('grand-rearing');
  await T(`t.setup_enemy(${gid}, { pulseT: -1, attackT: 1.15 })`); await T('t.render(0.02)'); await shot('grand-slam'); await T(`t.setup_enemy(${gid}, { attackT: -1 })`);
  await T("t.setup_spawnEnemy('reed', 96, 66, Math.PI / 2, 'idle')"); await T('t.render(0.02)'); await shot('grand-shielded');
  await T('t.setup_killNodes()'); await T(`t.setup_enemy(${gid}, { pulseCd: 0, shotCd: 99, summonCd: 99 })`); await look(78, 58, 104, 58, 0.2);
  await T('for (let i = 0; i < 600; i++) { t.tick(1); if (t.foundryProbe().pulses > 0) break; }'); await T('t.tick(5)'); await shot('grand-first-ring');
  await T('for (let i = 0; i < 90; i++) { t.tick(1); if (t.foundryProbe().pulses > 1) break; }'); await T('t.tick(10)'); await shot('grand-two-rings'); R.probes.rings = await T('t.foundryProbe()');
  await T(`t.setup_enemy(${gid}, { state: 'dead', hp: 0 })`); await T('for (let i = 0; i < 90; i++) t.tick(1)'); await look(80, 58, 104, 58, 0.2); await shot('grand-dead');
}
if (want.has('maps')) {
  let opened = false;
  for (const id of ['C1E3M05', 'C1E3M06', 'C1E3M07', 'C1E3M08']) {
    const views = JSON.parse(fs.readFileSync(path.join(root, 'maps-src', id + '.views.json'), 'utf8'));
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
