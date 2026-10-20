// THE TONE SHOULDER, MEASURED (PT-065, V4/V12 of the visual plan). The sign-off capture showed the shoulder as first built (k 0.6, pre 0.72) did NOT reduce the lit exit chambers' top-band share (16.1% against 14.6%): the curve keeps `pre * (1 + k)` = 1.15 of slope at black, so it moves the point
// where the picture clips, and the exit chambers' light is far above that point. This job renders the SAME state under several (k, pre) pairs through the real post pass and measures each: for the exit moment of a map (the route bot plays the map to its exit, then the exit is rendered under every curve)
// the share of the 3D picture at luma 230 or more; for the arrival moment of the same maps the mean luma and the black share (the dark pictures must stay dark, the mean within 5%). One headless-Chrome job under tools/dev/low.ps1 with ABSOLUTE paths; the pointer lock is refused before any page script runs.
//   node tools/dev/probe-tone.mjs <outDir> [ID,...] [k:pre,...]
import { savePng } from './savepng.mjs';
import { createServer } from 'vite';
import puppeteer from 'puppeteer';
import { PNG } from 'pngjs';
import fs from 'node:fs';
import path from 'node:path';
const root = path.resolve(import.meta.dirname, '../..'), out = path.resolve(process.argv[2] ?? path.join(root, 'review/tone')), ids = (process.argv[3] ?? 'C2M10,C2M02,C1E1M01,C2M09,C2M28,C2M22,C2M14').split(',');
const curves = (process.argv[4] ?? '0.6:0.72,1.0:0.55,1.5:0.45,2.0:0.38,3.0:0.28').split(',').map((c) => c.split(':').map(Number));
fs.mkdirSync(out, { recursive: true });
const port = 5287, server = await createServer({ root, logLevel: 'error', server: { port, strictPort: true } }); await server.listen();
const browser = await puppeteer.launch({ headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage();
await page.evaluateOnNewDocument(() => { navigator.getGamepads = () => [null, null, null, null]; window.__lockCalls = 0; Element.prototype.requestPointerLock = function () { window.__lockCalls++; return Promise.reject(new DOMException('refused by the probe', 'NotAllowedError')); }; });
await page.setViewport({ width: 960, height: 540 });
await page.goto(`http://localhost:${port}/`, { waitUntil: 'domcontentloaded', timeout: 0 });
await page.waitForFunction('window.__GAME_TEST__ && window.__GAME_TEST__.ready', { timeout: 120000 });
const T = (code) => page.evaluate(`(() => { const t = window.__GAME_TEST__; ${code.includes(';') ? code + ';' : 'return ' + code + ';'} })()`);
const measure = (file) => {
  const p = PNG.sync.read(fs.readFileSync(file)), h3 = Math.floor(p.height * 0.82); let n = 0, top = 0, black = 0, sum = 0;
  for (let y = 0; y < h3; y++) for (let x = 0; x < p.width; x++) { const i = (y * p.width + x) * 4, l = 0.299 * p.data[i] + 0.587 * p.data[i + 1] + 0.114 * p.data[i + 2]; n++; sum += l; if (l >= 230) top++; if (l <= 25) black++; }
  return { top: 100 * top / n, black: 100 * black / n, mean: sum / n };
};
const R = { curves, maps: {} }, acc = curves.map(() => ({ exitTop: 0, arrMean: 0, arrBlack: 0, n: 0 }));
const shootAll = async (id, kind) => { const m = []; for (const [k, pre] of curves) { await T(`t.setup_tone(${k}, ${pre})`); await T('t.render(0)'); const f = path.join(out, `${id}-${kind}-${k}-${pre}.png`); await savePng(page, f); m.push(measure(f)); } return m; };
for (const id of ids) {
  await T(`t.newGame('normal', 3, { mapId: '${id}' })`); await T('t.clearOverlays()'); await T('t.tick(2)'); if ((await T('t.state()')).mode === 'cinematic') await T('t.skip_cinematic()'); await T('t.setup_player({ hp: 100000 })');
  for (let i = 0; i < 3; i++) await T('t.render(0.02)'); const arrival = await shootAll(id, 'arrival');
  await T(`t.startBot('${id}.main')`); let guard = 0;
  while (guard++ < 2000) { const r = await T('t.stepBot(60)'); if (r.mode === 'cinematic') { await T('t.skip_cinematic()'); continue; } if (r.done || r.mode === 'ending' || r.mode === 'complete' || r.failed || r.mode === 'dead' || r.mode === 'dying') break; if (r.mode !== 'playing') break; await T('t.setup_player({ hp: 100000 })'); }
  const exit = await shootAll(id, 'exit'); R.maps[id] = { arrival, exit };
  exit.forEach((e, i) => { acc[i].exitTop += e.top; acc[i].arrMean += arrival[i].mean; acc[i].arrBlack += arrival[i].black; acc[i].n++; });
  console.log(id, 'exit top230 by curve', exit.map((e) => e.top.toFixed(1)).join(' '), '| arrival mean', arrival.map((e) => e.mean.toFixed(1)).join(' '), '| arrival black', arrival.map((e) => e.black.toFixed(1)).join(' '));
}
console.log('curve k:pre   exit top230 (mean)   arrival mean luma   arrival black%');
curves.forEach(([k, pre], i) => console.log(`${k}:${pre}`.padEnd(10), (acc[i].exitTop / acc[i].n).toFixed(1).padStart(8), (acc[i].arrMean / acc[i].n).toFixed(1).padStart(14), (acc[i].arrBlack / acc[i].n).toFixed(1).padStart(14)));
R.lockCalls = await page.evaluate('window.__lockCalls'); console.log('pointer-lock requests:', R.lockCalls);
fs.writeFileSync(path.join(out, 'tone.json'), JSON.stringify({ ...R, summary: curves.map(([k, pre], i) => ({ k, pre, exitTop: acc[i].exitTop / acc[i].n, arrMean: acc[i].arrMean / acc[i].n, arrBlack: acc[i].arrBlack / acc[i].n })) }, null, 1));
await browser.close(); await server.close(); process.exit(R.lockCalls === 0 ? 0 : 1);
