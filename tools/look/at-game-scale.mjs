// Do the designs survive the game's resolution? Takes the to-scale lineup (100 px per metre) and box-downsamples it to what the renderer actually draws: internal width 480 px, vertical FOV 70 degrees at
// 16:9 gives about 193/d pixels per metre at distance d (32 px/m at 6 m, 16 px/m at 12 m), then shows it nearest-neighbour at 3x like the game's upscale. Output: review/look-bible/at-game-scale.png
//   node tools/look/at-game-scale.mjs [lineup.png]      (default review/look-bible/lineup_paint.png)
import fs from 'node:fs';
import path from 'node:path';
import { PNG } from 'pngjs';

const dir = path.resolve(import.meta.dirname, '../../review/look-bible');
const src = PNG.sync.read(fs.readFileSync(process.argv[2] ?? path.join(dir, 'lineup_paint.png')));
const PXM = 100, DISTANCES = [6, 12], UP = 3, PAD = 6;
const pxPerM = (d) => 480 / (2 * d * Math.tan(35 * Math.PI / 180) * (16 / 9));       // horizontal: 480 px across the horizontal field of view at distance d
const rows = DISTANCES.map((d) => {
  const k = pxPerM(d) / PXM, w = Math.max(1, Math.round(src.width * k)), h = Math.max(1, Math.round(src.height * k)), out = new Uint8Array(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const sx0 = Math.floor(x / k), sx1 = Math.max(sx0 + 1, Math.floor((x + 1) / k)), sy0 = Math.floor(y / k), sy1 = Math.max(sy0 + 1, Math.floor((y + 1) / k));
    let r = 0, g = 0, b = 0, c = 0;
    for (let sy = sy0; sy < sy1 && sy < src.height; sy++) for (let sx = sx0; sx < sx1 && sx < src.width; sx++) { const p = (sy * src.width + sx) * 4; r += src.data[p]; g += src.data[p + 1]; b += src.data[p + 2]; c++; }
    const q = (y * w + x) * 4; out[q] = r / c; out[q + 1] = g / c; out[q + 2] = b / c; out[q + 3] = 255;
  }
  return { d, w, h, out, ppm: pxPerM(d) };
});
const W = Math.max(...rows.map((r) => r.w)) * UP + 2 * PAD, H = rows.reduce((s, r) => s + r.h * UP + PAD, PAD);
const sheet = new PNG({ width: W, height: H }); for (let i = 0; i < sheet.data.length; i += 4) { sheet.data[i] = 14; sheet.data[i + 1] = 14; sheet.data[i + 2] = 16; sheet.data[i + 3] = 255; }
let y0 = PAD;
for (const r of rows) {
  for (let y = 0; y < r.h * UP; y++) for (let x = 0; x < r.w * UP; x++) { const s = (Math.floor(y / UP) * r.w + Math.floor(x / UP)) * 4, q = ((y0 + y) * W + PAD + x) * 4; sheet.data[q] = r.out[s]; sheet.data[q + 1] = r.out[s + 1]; sheet.data[q + 2] = r.out[s + 2]; sheet.data[q + 3] = 255; }
  console.log(`at ${r.d} m: ${r.ppm.toFixed(1)} px per metre; a 2.25 m creature is ${(2.25 * r.ppm).toFixed(0)} px tall; a 15 cm part is ${(0.15 * r.ppm).toFixed(1)} px wide`);
  y0 += r.h * UP + PAD;
}
fs.writeFileSync(path.join(dir, 'at-game-scale.png'), PNG.sync.write(sheet)); console.log('wrote review/look-bible/at-game-scale.png (top: 6 m, bottom: 12 m, nearest-neighbour 3x)');
