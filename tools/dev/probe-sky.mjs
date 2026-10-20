// THE SKY IN MOTION (PT-063, V11 of the visual plan): "ten frames 0.1 s apart in C2M09 and C2M14 (the flecks). If the flecks shimmer between frames they are noise: remove or lock them; if they drift, keep them." One headless-Chrome job (run it through tools/dev/low.ps1 with ABSOLUTE
// paths): the level is started, the eye is turned up, and ten frames are rendered 0.1 s of game time apart through the hook (`t.render(0.1)`), each captured; node then compares consecutive frames over the top of the picture (the sky, or the roof where there is one):
//   mean absolute difference per pixel, and the best SHIFT (dx, dy up to 8 px) that makes frame k+1 match frame k: a drifting sky matches well at a non-zero shift, a shimmering one matches badly at every shift (its correlation stays low).
//   node tools/dev/probe-sky.mjs <outDir> [ID,...]    (default C2M09,C2M14)      THE MOUSE: the pointer lock is refused before any page script runs and the count is printed; it must be 0.
import { savePng } from './savepng.mjs';
import { createServer } from 'vite';
import puppeteer from 'puppeteer';
import { PNG } from 'pngjs';
import fs from 'node:fs';
import path from 'node:path';
const root = path.resolve(import.meta.dirname, '../..'), out = path.resolve(process.argv[2] ?? path.join(root, 'review/pt-063-sky')), ids = (process.argv[3] ?? 'C2M09,C2M14').split(',');
fs.mkdirSync(out, { recursive: true });
const port = 5283, server = await createServer({ root, logLevel: 'error', server: { port, strictPort: true } }); await server.listen();
const browser = await puppeteer.launch({ headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage();
await page.evaluateOnNewDocument(() => { navigator.getGamepads = () => [null, null, null, null]; window.__lockCalls = 0; Element.prototype.requestPointerLock = function () { window.__lockCalls++; return Promise.reject(new DOMException('refused by the probe', 'NotAllowedError')); }; });
await page.setViewport({ width: 960, height: 540 });
const errors = []; page.on('pageerror', (e) => errors.push(String(e)));
await page.goto(`http://localhost:${port}/`, { waitUntil: 'domcontentloaded', timeout: 0 });
await page.waitForFunction('window.__GAME_TEST__ && window.__GAME_TEST__.ready', { timeout: 120000 });
const T = (code) => page.evaluate(`(() => { const t = window.__GAME_TEST__; ${code.includes(';') ? code + ';' : 'return ' + code + ';'} })()`);
const R = { maps: {}, errors };
const luma = (png, x, y) => { const i = (y * png.width + x) * 4; return 0.299 * png.data[i] + 0.587 * png.data[i + 1] + 0.114 * png.data[i + 2]; };
function compare(a, b, box) {                                                                       // mean |a - b| at shift 0, and the shift of the best match
  const [x0, y0, w, h] = box; let best = { dx: 0, dy: 0, err: Infinity }, zero = 0;
  for (let dy = -8; dy <= 8; dy++) for (let dx = -8; dx <= 8; dx++) {
    let e = 0, n = 0; for (let y = y0 + 8; y < y0 + h - 8; y += 2) for (let x = x0 + 8; x < x0 + w - 8; x += 2) { e += Math.abs(luma(a, x, y) - luma(b, x + dx, y + dy)); n++; }
    e /= n; if (dx === 0 && dy === 0) zero = e; if (e < best.err) best = { dx, dy, err: e };
  }
  return { zero: +zero.toFixed(2), best: +best.err.toFixed(2), shift: [best.dx, best.dy] };
}
for (const id of ids) {
  await T(`t.newGame('normal', 3, { mapId: '${id}' })`); await T('t.clearOverlays()'); await T('t.setup_player({ hp: 100000, pitch: 0.95 })'); await T('t.tick(3)'); await T('t.skip_cinematic()'); await T('t.setup_player({ pitch: 0.95 })');          // (an arrival scene may have started on the first tick: skip it)
  const frames = [];
  for (let i = 0; i < 10; i++) { await T('t.render(0.1)'); const f = path.join(out, `${id}-${String(i).padStart(2, '0')}.png`); await savePng(page, f); frames.push(PNG.sync.read(fs.readFileSync(f))); }
  const box = [0, 0, frames[0].width, Math.floor(frames[0].height * 0.4)], pairs = []; for (let i = 0; i + 1 < frames.length; i++) pairs.push(compare(frames[i], frames[i + 1], box));
  const mean = (k) => +(pairs.reduce((s, p) => s + p[k], 0) / pairs.length).toFixed(2), shifts = pairs.map((p) => p.shift.join(','));
  R.maps[id] = { pairs, meanZeroShiftError: mean('zero'), meanBestError: mean('best'), shifts, verdict: mean('zero') < 2 ? 'still (nothing moves)' : mean('best') < 0.6 * mean('zero') ? 'DRIFT (a shift matches it far better than none)' : 'SHIMMER (no shift matches: it changes in place)' };
  console.log(id, R.maps[id].verdict, 'zero-shift error', mean('zero'), 'best-shift error', mean('best'), 'shifts', shifts.join(' '));
}
R.lockCalls = await page.evaluate('window.__lockCalls'); console.log('pointer-lock requests:', R.lockCalls, errors.length ? 'errors ' + errors.join(' | ') : '');
fs.writeFileSync(path.join(out, 'sky.json'), JSON.stringify(R, null, 1));
await browser.close(); await server.close(); process.exit(R.lockCalls === 0 && !errors.length ? 0 : 1);
