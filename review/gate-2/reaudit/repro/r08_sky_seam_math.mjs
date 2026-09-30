// R08: numerically replay src/render/textures.js makeSeamless() (canvas-free) on the three baked skies and re-measure the horizontal wrap-edge jump.
// Before (audit A12) the wrap-edge difference was 12-18x an ordinary neighbouring-column difference. After the cross-fade it should be ~1x.
// Run from repo root: node review/gate-2/reaudit/repro/r08_sky_seam_math.mjs
import fs from 'node:fs';
import { PNG } from 'pngjs';
for (const name of ['sky_dusk', 'sky_night', 'sky_overcast']) {
  const png = PNG.sync.read(fs.readFileSync(`assets/baked/${name}.png`)), W = png.width, H = png.height, a = png.data;
  const B = Math.round(W * 0.125), W2 = W - B, out = new Uint8ClampedArray(W2 * H * 4);
  for (let y = 0; y < H; y++) for (let x = 0; x < W2; x++) for (let c = 0; c < 4; c++) { const o = a[(y * W + x) * 4 + c]; out[(y * W2 + x) * 4 + c] = x >= B ? o : Math.round(a[(y * W + W2 + x) * 4 + c] * (1 - x / B) + o * (x / B)); }   // verbatim from makeSeamless
  const measure = (buf, w) => { const px = (x, y) => { const i = (y * w + x) * 4; return (buf[i] + buf[i + 1] + buf[i + 2]) / 3; }; let wrap = 0, norm = 0; for (let y = 0; y < H; y++) { wrap += Math.abs(px(w - 1, y) - px(0, y)); for (let x = 0; x < w - 1; x++) norm += Math.abs(px(x, y) - px(x + 1, y)) / (w - 1); } return { wrap: +(wrap / H).toFixed(2), norm: +(norm / H).toFixed(2), ratio: +((wrap / H) / Math.max(0.5, norm / H)).toFixed(2) }; };
  const before = measure(a, W), after = measure(out, W2);
  // the blend region's own smoothness: mean neighbouring-column difference inside the cross-fade zone vs outside it
  const zone = (buf, w, x0, x1) => { let s = 0, n = 0; for (let y = 0; y < H; y++) for (let x = x0; x < x1 - 1; x++) { const i = (y * w + x) * 4, j = i + 4; s += Math.abs(buf[i] - buf[j]); n++; } return +(s / n).toFixed(2); };
  console.log(name.padEnd(13), `${W}x${H} -> ${W2}x${H}`, 'before wrap/norm/ratio', JSON.stringify(before), 'after', JSON.stringify(after), '| neighbour diff inside cross-fade zone', zone(out, W2, 0, B), 'outside', zone(out, W2, B, W2));
}
