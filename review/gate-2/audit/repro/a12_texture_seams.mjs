// A12: seam check of the baked textures. ART_BIBLE.md says the Gate 2 set is "all opaque and tiling". For each texture, compare the mean absolute colour difference
// across the wrap edge (last column vs first column, last row vs first row) with the mean difference between ordinary neighbouring columns/rows.
// A ratio far above ~1 means a visible seam when the texture repeats (walls, floors) or wraps round the sky dome.
// Run: node review/gate-2/audit/repro/a12_texture_seams.mjs
import fs from 'node:fs';
import { PNG } from 'pngjs';
const dir = 'assets/baked/', files = fs.readdirSync(dir).filter((f) => f.endsWith('.png'));
const rows = [];
for (const f of files) {
  const png = PNG.sync.read(fs.readFileSync(dir + f)), { width: W, height: H, data } = png;
  const px = (x, y) => { const i = (y * W + x) * 4; return [data[i], data[i + 1], data[i + 2]]; };
  const d = (a, b) => (Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2])) / 3;
  let wrapX = 0, normX = 0, wrapY = 0, normY = 0;
  for (let y = 0; y < H; y++) { wrapX += d(px(W - 1, y), px(0, y)); for (let x = 0; x < W - 1; x++) normX += d(px(x, y), px(x + 1, y)) / (W - 1); }
  for (let x = 0; x < W; x++) { wrapY += d(px(x, H - 1), px(x, 0)); for (let y = 0; y < H - 1; y++) normY += d(px(x, y), px(x, y + 1)) / (H - 1); }
  rows.push({ f, W, H, seamX: +(wrapX / H).toFixed(1), normX: +(normX / H).toFixed(1), ratioX: +((wrapX / H) / Math.max(0.5, normX / H)).toFixed(2), seamY: +(wrapY / W).toFixed(1), normY: +(normY / W).toFixed(1), ratioY: +((wrapY / W) / Math.max(0.5, normY / W)).toFixed(2) });
}
rows.sort((a, b) => Math.max(b.ratioX, b.ratioY) - Math.max(a.ratioX, a.ratioY));
console.log('file'.padEnd(28), 'size'.padEnd(9), 'wrapX/normX ratio', ' wrapY/normY ratio');
for (const r of rows) console.log(r.f.padEnd(28), (r.W + 'x' + r.H).padEnd(9), String(r.ratioX).padEnd(18), r.ratioY, r.ratioX > 3 || r.ratioY > 3 ? '  <== large wrap-edge jump (matters for skies, which wrap round the dome and floors/walls that tile; atlases, ui art and the vertically-clamped plaster wall are not meant to tile)' : '');
