// The look-polish before/after set (2026-10-26, the ten-point visual plan): the same vantages every time, as a player sees them (the real game on the machine's own graphics card, 1920 x 1080, the HUD on), so a change to the look can be judged side by side.
// The vantages are the first, a middle and (for C1E1M02) a third view of each Episode One map's own tour (maps-src/<ID>.views.json), Marrow Quay from its start, one view each of four later places, and the same hall with each of the four guns held most.
//   GPU=1 powershell -File D:/Doom/tools/dev/low.ps1 <log> D:/Doom/tools/dev/polish-shots.mjs <outDir> [WIDTH=480]
// One job at a time, idle priority, two cores; the pointer lock is refused before any page script runs and the count is printed (it must be 0). Writes <outDir>/NN-<map>-<view>.png.
import { savePng } from './savepng.mjs';
import { createServer } from 'vite';
import puppeteer from 'puppeteer';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '../..'), [outArg] = process.argv.slice(2);
if (!outArg) { console.error('usage: polish-shots.mjs <outDir>'); process.exit(2); }
const out = path.resolve(outArg); fs.mkdirSync(out, { recursive: true });
const views = (id) => JSON.parse(fs.readFileSync(path.join(root, 'maps-src', id + '.views.json'), 'utf8'));
const SET = [];
SET.push({ map: 'C1E1M01', name: 'start' }, { map: 'C1E1M01', name: 'start-back', turn: Math.PI });
for (const id of ['C1E1M02', 'C1E1M03', 'C1E1M04', 'C1E1M05', 'C1E1M06', 'C1E1M07', 'C1E1M08', 'C1E1S01']) {
  const v = views(id), pick = id === 'C1E1M02' ? [v[0], v[4], v[5]] : [v[0], v[Math.floor(v.length / 2)]];
  for (const p of pick) if (p) SET.push({ map: id, view: p });
}
for (const id of ['C1E3M04', 'C1E4M07', 'C2M21', 'C2M18']) SET.push({ map: id, view: views(id)[0] });
const hall = views('C1E1M02')[4];
const ONLY = process.env.ONLY ? new RegExp(process.env.ONLY) : null;          // ONLY=<regex> takes only the shots whose name matches (a quick look at one change)
for (const gun of ['flare', 'scattergun', 'rivet', 'harpoon']) SET.push({ map: 'C1E1M02', view: hall, gun, name: 'gun-' + gun });
// look polish 10: blows from a side (right, 0.0 = ahead), [side, ahead, hit points] relative to the player's facing; the view's own handler is fed the event
for (const [name, hits] of [['hit-right-heavy', [[1, 0, 28]]], ['hit-left-scratch', [[-1, 0.2, 4]]], ['hit-behind', [[0, -1, 16]]], ['hit-crowd', [[1, 0.4, 10], [-1, 0.3, 8], [0.2, -1, 14]]]]) SET.push({ map: 'C1E1M02', view: hall, hits, name });

const port = 5800 + (process.pid % 90), server = await createServer({ root, logLevel: 'error', server: { port, strictPort: false } }); await server.listen();
const browser = await puppeteer.launch({ headless: true, args: process.env.GPU ? ['--ignore-gpu-blocklist', '--enable-gpu', '--use-angle=d3d11'] : ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage();
await page.evaluateOnNewDocument(() => { navigator.getGamepads = () => [null, null, null, null]; window.__lockAsks = 0; Element.prototype.requestPointerLock = function () { window.__lockAsks++; return Promise.reject(new DOMException('refused by the tool', 'NotAllowedError')); }; });
await page.setViewport({ width: Number(process.env.VW) || 1920, height: Number(process.env.VH) || 1080 });
const errors = []; page.on('pageerror', (e) => errors.push('pageerror: ' + e)); page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text().slice(0, 300)); });
await page.goto(`http://localhost:${server.config.server.port}/`, { waitUntil: 'domcontentloaded', timeout: 0 });
await page.waitForFunction('window.__GAME_TEST__ && window.__GAME_TEST__.ready', { timeout: 180000 });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
await page.evaluate(`window.__GAME_TEST__.setSetting('autoQuality', false); window.__GAME_TEST__.setSetting('internalWidth', ${Number(process.env.WIDTH) || 480})`);
const T = (code) => page.evaluate(`(() => { const t = window.__GAME_TEST__; ${code.includes(';') ? code + ';' : 'return ' + code + ';'} })()`);
const YAW = { east: -Math.PI / 2, west: Math.PI / 2, north: 0, south: Math.PI };
let n = 0, lastMap = null;
try {
  for (const [i, s] of SET.entries()) {
    const fname = `${String(i + 1).padStart(2, '0')}-${s.map}-${s.name ?? s.view?.name}.png`; if (ONLY && !ONLY.test(fname)) continue;
    if (s.map !== lastMap) { await T(`t.newGame('normal', 3, { mapId: '${s.map}' })`); await sleep(400); lastMap = s.map; }
    await T('t.clearOverlays()');
    const v = s.view;
    if (v) {
      if (v.open) await T('t.setup_openDoors()');
      const yaw = typeof v.yaw === 'string' ? YAW[v.yaw] : v.yaw;
      await T(`t.setup_teleport(${v.x * 2}, ${v.z * 2}, ${yaw}); t.setup_player({ pitch: ${v.pitch ?? 0}, hp: 100, hurt: 0 })`);
      if (v.wake) await T('t.setup_wakeAll()');
      if (v.ticks) { await T(`t.setup_player({ hp: 100000 }); t.tick(${v.ticks})`); await T('t.setup_player({ hp: 100, hurt: 0 })'); }
    } else if (s.turn) { await T(`(() => { const p = t.state().player; t.setup_teleport(p.x, p.z, p.yaw + ${s.turn}); })()`); }
    if (s.gun) await T(`t.setup_player({ weapons: ['flare', 'scattergun', 'rivet', 'harpoon', 'arc', 'fists'], ammo: { flare: 20, shell: 30, rivet: 150, bolt: 12, cell: 60 }, weapon: '${s.gun}', switchT: 0 }); t.tick(40)`);
    if (s.hits) await T(`(() => { const p = t.state().player, r = [Math.cos(p.yaw), -Math.sin(p.yaw)], f = [-Math.sin(p.yaw), -Math.cos(p.yaw)]; t.emitView(${JSON.stringify(s.hits)}.map(([sx, sf, amt]) => ({ type: 'hurt', amount: amt, fx: p.x + (r[0] * sx + f[0] * sf) * 8, fz: p.z + (r[1] * sx + f[1] * sf) * 8 }))); })()`);
    await T(`t.setup_player({ hp: 100, hurt: 0 }); ${s.hits ? '' : 't.clearOverlays(); '}t.render(${s.hits ? 0.12 : 0.02})`); await sleep(120);
    n++; await savePng(page, path.join(out, fname)); console.log('shot', fname);
  }
} finally { const asks = await page.evaluate('window.__lockAsks'); console.log(JSON.stringify({ errors, pointerLockAsks: asks })); await browser.close(); await server.close(); }
