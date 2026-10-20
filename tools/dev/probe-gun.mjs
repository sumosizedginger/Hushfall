// THE HELD GUN IN THE PLACE'S LIGHT, MEASURED (PT-065, V3/V12). The arrival frame of every map (the start gun in hand, the card gone), rendered at 1280 x 720 under several values of the weapon light's floor (`WEAPON_LIGHT.floor` in view.js), written as `<ID>__02__arrival.png` plus an index so
// `tools/dev/lumstats.mjs` finds the gun core and the scene in each; the table printed is the gun core's luma against the scene's, and their correlation (the plan asked for 0.8 or more, with the core never under 45 or over 150). One headless-Chrome job under tools/dev/low.ps1 with ABSOLUTE paths.
//   node tools/dev/probe-gun.mjs <outDir> [floor,floor,...] [ID,ID,...]      (default floors 0.35,0.25,0.15; default maps: the 29 of the sign-off capture)
import { savePng } from './savepng.mjs';
import { createServer } from 'vite';
import puppeteer from 'puppeteer';
import { PNG } from 'pngjs';
import fs from 'node:fs';
import path from 'node:path';
const root = path.resolve(import.meta.dirname, '../..'), out = path.resolve(process.argv[2] ?? path.join(root, 'review/gun')), floors = (process.argv[3] ?? '0.35,0.25,0.15').split(',').map(Number);
const ids = (process.argv[4] ?? 'C1E1M01,C1E1M02,C1E1M08,C1E2M05,C2M02,C2M09,C2M10,C2M11,C2M12,C2M13,C2M14,C2M15,C2M16,C2M17,C2M18,C2M19,C2M20,C2M21,C2M22,C2M23,C2M24,C2M25,C2M26,C2M27,C2M28,C2M29,C2M30,C2S01,C2S02').split(',');
fs.mkdirSync(out, { recursive: true });
const port = 5289, server = await createServer({ root, logLevel: 'error', server: { port, strictPort: true } }); await server.listen();
const browser = await puppeteer.launch({ headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage();
await page.evaluateOnNewDocument(() => { navigator.getGamepads = () => [null, null, null, null]; window.__lockCalls = 0; Element.prototype.requestPointerLock = function () { window.__lockCalls++; return Promise.reject(new DOMException('refused by the probe', 'NotAllowedError')); }; });
await page.setViewport({ width: 1280, height: 720 });
await page.goto(`http://localhost:${port}/`, { waitUntil: 'domcontentloaded', timeout: 0 });
await page.waitForFunction('window.__GAME_TEST__ && window.__GAME_TEST__.ready', { timeout: 120000 });
const T = (code) => page.evaluate(`(() => { const t = window.__GAME_TEST__; ${code.includes(';') ? code + ';' : 'return ' + code + ';'} })()`);
const CORE = { x0: 800, y0: 540, x1: 1000, y1: 640 }, luma = (r, g, b) => 0.299 * r + 0.587 * g + 0.114 * b;
const masked = (x, y) => y < 80 || y >= 660 || (y >= 100 && y < 260 && x >= 540 && x < 740) || (x >= 320 && x < 960 && y >= 510 && y < 612) || (x < 540 && y < 112) || (x >= 880 && y < 190);
const measure = (file) => { const p = PNG.sync.read(fs.readFileSync(file)); let cn = 0, cs = 0, n = 0, sum = 0; for (let y = 0; y < 720; y += 2) for (let x = 0; x < 1280; x += 2) { const i = (y * 1280 + x) * 4, l = luma(p.data[i], p.data[i + 1], p.data[i + 2]); if (x >= CORE.x0 && x < CORE.x1 && y >= CORE.y0 && y < CORE.y1) { cn++; cs += l; } else if (!masked(x, y) && !(x >= 980 && x < 1200 && y >= 520 && y < 700)) { n++; sum += l; } } return { core: cs / cn, scene: sum / n }; };
const corr = (a, b) => { const ma = a.reduce((s, v) => s + v, 0) / a.length, mb = b.reduce((s, v) => s + v, 0) / b.length; let sab = 0, sa = 0, sb = 0; for (let i = 0; i < a.length; i++) { sab += (a[i] - ma) * (b[i] - mb); sa += (a[i] - ma) ** 2; sb += (b[i] - mb) ** 2; } return sab / Math.sqrt(sa * sb); };
const R = floors.map((f) => ({ floor: f, rows: [] }));
for (const id of ids) {
  await T(`t.newGame('normal', 3, { mapId: '${id}' })`); await T('t.clearOverlays()'); await T('t.tick(1)'); if ((await T('t.state()')).mode === 'cinematic') await T('t.skip_cinematic()');
  for (const r of R) { await T(`t.setup_weaponLight(${r.floor})`); for (let i = 0; i < 3; i++) await T('t.render(0.02)'); const f = path.join(out, `${id}__${r.floor}.png`); await savePng(page, f); r.rows.push({ id, ...measure(f) }); }
  console.log(id, R.map((r) => `${r.floor}: core ${r.rows.at(-1).core.toFixed(0)} scene ${r.rows.at(-1).scene.toFixed(0)}`).join(' | '));
}
for (const r of R) console.log(`floor ${r.floor}: correlation core/scene ${corr(r.rows.map((x) => x.core), r.rows.map((x) => x.scene)).toFixed(2)}, core range ${Math.min(...r.rows.map((x) => x.core)).toFixed(0)} to ${Math.max(...r.rows.map((x) => x.core)).toFixed(0)}, mean core ${(r.rows.reduce((s, x) => s + x.core, 0) / r.rows.length).toFixed(0)}`);
const lock = await page.evaluate('window.__lockCalls'); console.log('pointer-lock requests:', lock);
fs.writeFileSync(path.join(out, 'gun.json'), JSON.stringify(R, null, 1));
await browser.close(); await server.close(); process.exit(lock === 0 ? 0 : 1);
