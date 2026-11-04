// Can a creature be seen against the place it stands in, map by map (PT-083 R2)? The real game: a creature of the map's own roster seven metres off, one frame with it and one without, and the difference
// is its outline: the mean brightness of its pixels against a ring of what is behind it. One headless-Chrome job; the pointer lock is refused and counted.
//   GPU=1 powershell -File tools/dev/low.ps1 <log> tools/dev/probe-contrast.mjs <out.json> [ID ...]
import { createServer } from 'vite';
import puppeteer from 'puppeteer';
import fs from 'node:fs';
import path from 'node:path';
import { PNG } from 'pngjs';
import { parseMap } from '../../src/engine/mapformat.js';
import { ENEMIES } from '../../src/engine/defs.js';

const root = path.resolve(import.meta.dirname, '../..'),
  [outFile, ...named] = process.argv.slice(2);
if (!outFile) {
  console.error('usage: probe-contrast.mjs <out.json> [ID ...]');
  process.exit(2);
}
const ids = named.length
  ? named
  : fs
      .readdirSync(path.join(root, 'maps'))
      .filter((f) => /M\d\d\.json$/.test(f))
      .map((f) => f.replace('.json', ''));
const server = await createServer({ root, logLevel: 'error', server: { port: 5900 + (process.pid % 90), strictPort: false } });
await server.listen();
const browser = await puppeteer.launch({
  headless: true,
  args: process.env.GPU
    ? ['--ignore-gpu-blocklist', '--enable-gpu', '--use-angle=d3d11']
    : ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});
const page = await browser.newPage();
await page.evaluateOnNewDocument(() => {
  navigator.getGamepads = () => [null, null, null, null];
  window.__lockAsks = 0;
  Element.prototype.requestPointerLock = function () {
    window.__lockAsks++;
    return Promise.reject(new DOMException('refused by the tool', 'NotAllowedError'));
  };
});
await page.setViewport({ width: 960, height: 540 });
await page.goto(`http://localhost:${server.config.server.port}/`, { waitUntil: 'domcontentloaded', timeout: 0 });
await page.waitForFunction('window.__GAME_TEST__ && window.__GAME_TEST__.ready', { timeout: 180000 });
await page.evaluate("window.__GAME_TEST__.setSetting('autoQuality', false)");
const T = (code) => page.evaluate(`(() => { const t = window.__GAME_TEST__; return ${code}; })()`);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const lum = (d, i) => 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
const shot = async () => PNG.sync.read(Buffer.from(await page.screenshot({ type: 'png' })));
const rows = [];
try {
  for (const id of ids) {
    const map = parseMap(JSON.parse(fs.readFileSync(path.join(root, 'maps', id + '.json'), 'utf8'))),
      S = map.cell;
    const e0 = map.entities.find(
      (e) => e.type === 'enemy' && !e.skill && !ENEMIES[e.kind]?.boss && !ENEMIES[e.kind]?.node && !ENEMIES[e.kind]?.peaceful && !e.hold,
    );
    if (!e0) continue;
    await T(`t.newGame('normal', 3, { mapId: '${id}' })`);
    await sleep(300);
    // a standing place seven metres off, with a clear line to it
    let at = null;
    for (const a of [0, 0.8, 1.6, 2.4, 3.2, 4, 4.8, 5.6]) {
      const x = e0.x + Math.sin(a) * 7,
        z = e0.z + Math.cos(a) * 7;
      let clear = true;
      for (let k = 0; k <= 14; k++) {
        const px = e0.x + (Math.sin(a) * 7 * k) / 14,
          pz = e0.z + (Math.cos(a) * 7 * k) / 14,
          kind = map.kind(Math.floor(px / S), Math.floor(pz / S));
        if (kind !== 'floor' && kind !== 'outdoor') clear = false;
      }
      if (clear) {
        at = [x, z, Math.atan2(x - e0.x, z - e0.z)];
        break;
      }
    }
    if (!at) continue;
    await T(`(t.clearOverlays(), t.setup_teleport(${at[0]}, ${at[1]}, ${at[2]}), t.setup_player({ hp: 100, hurt: 0, pitch: 0 }), t.render(0.02), 1)`);
    await sleep(150);
    await T(`(t.setup_player({ weapons: ['fists'], weapon: 'fists' }), t.render(0.02), 1)`);
    await sleep(60);
    const withIt = await shot();
    await T(`(t.setup_clearEnemies(), t.render(0.02), 1)`);
    await sleep(120);
    const without = await shot();
    const W = withIt.width,
      H = withIt.height,
      mask = new Uint8Array(W * H);
    let n = 0,
      sum = 0;
    for (let y = 0; y < H * 0.82; y++)
      for (let x = 0; x < W; x++) {
        const i = (y * W + x) * 4,
          d =
            Math.abs(withIt.data[i] - without.data[i]) +
            Math.abs(withIt.data[i + 1] - without.data[i + 1]) +
            Math.abs(withIt.data[i + 2] - without.data[i + 2]);
        if (d > 24) {
          mask[y * W + x] = 1;
          n++;
          sum += lum(withIt.data, i);
        }
      }
    if (n < 30) {
      rows.push({ id, look: map.atmosphere?.look ?? 'harbour', kind: e0.kind, n, dL: null });
      console.log(id, 'no creature in frame');
      continue;
    }
    let rn = 0,
      rs = 0;
    const R = 8;
    for (let y = R; y < H * 0.82 - R; y += 2)
      for (let x = R; x < W - R; x += 2) {
        if (mask[y * W + x]) continue;
        if (mask[y * W + x - R] || mask[y * W + x + R] || mask[(y - R) * W + x] || mask[(y + R) * W + x]) {
          rs += lum(without.data, (y * W + x) * 4);
          rn++;
        }
      }
    const dL = Math.round(sum / n - rs / Math.max(1, rn));
    rows.push({ id, look: map.atmosphere?.look ?? 'harbour', kind: e0.kind, n, creature: Math.round(sum / n), behind: Math.round(rs / Math.max(1, rn)), dL });
    console.log(id, e0.kind, 'creature', Math.round(sum / n), 'behind', Math.round(rs / Math.max(1, rn)), 'dL', dL);
  }
  const asks = await page.evaluate('window.__lockAsks');
  console.log('pointer-lock requests:', asks);
} finally {
  fs.writeFileSync(path.resolve(outFile), JSON.stringify(rows, null, 1));
  await browser.close();
  await server.close();
}
