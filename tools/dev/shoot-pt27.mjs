// REAL-GAME stills for Episode 3, Batch B (PT-027), in ONE headless-Chrome job (the owner's mouse stops reaching the screen while my Chrome jobs run: idle priority, two cores, one job: tools/dev/low.ps1):
//   mortar   the Bell-breaker mortar in the Range's mortar yard: hip, in the sights with the landing ring, a shell in the air, the blast
//   breath   the Range's breath yard: the breathing gate open, closing, shut, opening; the spore bed dormant, swelling, blooming, fading
//   maps     the vantage points of C1E3M02 and C1E3M03 (maps-src/<ID>.views.json), the gates and beds on their own clock
//   node tools/dev/shoot-pt27.mjs [outDir] [mortar,breath,maps]       -> <outDir>/*.png (default review/pt-027/stills)
import { savePng } from './savepng.mjs';
import { createServer } from 'vite';
import puppeteer from 'puppeteer';
import fs from 'node:fs';
import path from 'node:path';
const root = path.resolve(import.meta.dirname, '../..'), out = path.resolve(process.argv[2] ?? path.join(root, 'review/pt-027/stills')), want = new Set((process.argv[3] ?? 'mortar,breath,maps').split(','));
fs.mkdirSync(out, { recursive: true });
const server = await createServer({ root, logLevel: 'error', server: { port: 5267, strictPort: true } }); await server.listen();
const browser = await puppeteer.launch({ headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage(); await page.setViewport({ width: 1280, height: 720 });
const errors = []; page.on('pageerror', (e) => errors.push(String(e))); page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
await page.goto('http://localhost:5267/', { waitUntil: 'domcontentloaded', timeout: 0 });
await page.waitForFunction('window.__GAME_TEST__ && window.__GAME_TEST__.ready', { timeout: 120000 });
await page.waitForFunction("[...document.querySelectorAll('#dev-map option')].some((o) => o.value === 'RANGE')", { timeout: 60000 });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const T = (code) => page.evaluate(`(() => { const t = window.__GAME_TEST__; ${code.includes(';') ? code + ';' : 'return ' + code + ';'} })()`);
const shot = async (name) => { await T('t.clearOverlays(); t.render(0.02)'); await sleep(350); await T('t.render(0.02)'); await savePng(page, path.join(out, name + '.png')); console.log('shot', name); };
const face = (px, pz, tx, tz) => Math.atan2(-(tx - px), -(tz - pz));
const YAW = { east: -Math.PI / 2, west: Math.PI / 2, north: 0, south: Math.PI };
const timeNow = async () => (await T('t.state()')).tick / 60;
/** run the sim until the clock reads `sec` seconds (modulo nothing: the clock only goes forward, newGame resets it) */
const toTime = async (sec) => { const n = Math.round((sec - (await timeNow())) * 60); if (n > 0) await T(`t.tick(${n})`); else console.log('already past', sec); };
const R = { errors };
const KIT = "weapons: ['flare', 'scattergun', 'rivet', 'harpoon', 'arc', 'carbine', 'linethrower', 'mortar'], ammo: { flare: 12, shell: 12, rivet: 60, bolt: 8, cell: 30, round: 60, rocket: 12 }";

if (want.has('mortar') || want.has('breath')) { await T("t.newGame('normal', 3, { mapId: 'RANGE' })"); await T('t.clearOverlays()'); await T('t.tick(10)'); }
if (want.has('mortar')) {
  // the third range's mortar yard: x 48..59 cells, a ledge from x = 54 with singers on it (sponges), crates in front
  await T(`t.setup_player({ ${KIT}, weapon: 'mortar', switchT: 0, cooldown: 0 })`);
  const px = 49.5 * 2, pz = 36.5 * 2, tx = 57 * 2, tz = 36 * 2; await T(`t.setup_teleport(${px}, ${pz}, ${face(px, pz, tx, tz)})`); await T('t.setup_player({ pitch: 0.06 })'); await T('t.tick(60)');
  await shot('mortar-hip-ring');
  await T("t.press('aim')"); await T('t.tick(25)'); await shot('mortar-ads-ring');
  await T("t.press('fire')"); await T('t.tick(2)'); await T("t.release('fire')"); await T('t.tick(4)'); await shot('mortar-fire-flash');
  await T('t.tick(22)'); await shot('mortar-shell-in-flight');
  await T('t.tick(40)'); await shot('mortar-blast');
  await T('t.tick(20)'); await T("t.release('aim')"); await shot('mortar-after');
  // a flat floor shot to see the ring on open ground: aim at the floor 14 m ahead in the second range
  await T(`t.setup_teleport(${30 * 2}, ${48 * 2}, ${YAW.north})`); await T('t.setup_player({ pitch: -0.12, weapon: "mortar", switchT: 0 })'); await T('t.tick(30)'); await shot('mortar-ring-floor');
}
if (want.has('breath')) {
  // the breath yard: the partition at z = 44 cells with a gate at x = 53 (period 8, open 4 s); the spore bed x 50..57, z 47..49 (blooms 3 s of every 8, glows from 6.8 s)
  await T("t.newGame('normal', 3, { mapId: 'RANGE' })"); await T('t.clearOverlays()'); await T('t.tick(5)');
  const gx = 53.5 * 2, gz = 42.4 * 2; await T(`t.setup_teleport(${gx}, ${gz}, ${YAW.south})`); await T('t.setup_player({ pitch: 0.02, weapon: "flare", switchT: 0 })');
  for (const [name, sec] of [['gate-open', 2.0], ['gate-closing', 4.25], ['gate-shut', 5.5], ['gate-opening', 8.3]]) { await toTime(sec); await shot('breath-' + name); }
  const sx = 49.5 * 2, sz = 51.0 * 2, bx = 54 * 2, bz = 48 * 2; await T(`t.setup_teleport(${sx}, ${sz}, ${face(sx, sz, bx, bz)})`); await T('t.setup_player({ pitch: -0.08, hp: 100 })');
  await T("t.newGame('normal', 3, { mapId: 'RANGE' })"); await T(`t.setup_teleport(${sx}, ${sz}, ${face(sx, sz, bx, bz)})`); await T('t.setup_player({ pitch: -0.08, weapon: "flare", switchT: 0 })'); await T('t.clearOverlays()');
  for (const [name, sec] of [['bloom', 1.0], ['fading', 3.4], ['dormant', 5.0], ['swelling', 7.4], ['bloom-again', 9.0]]) { await toTime(sec); await shot('spores-' + name); }
}
if (want.has('maps')) {
  let opened = false;
  for (const id of ['C1E3M02', 'C1E3M03']) {
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
