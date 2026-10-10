// PT-030: an overlay of the silhouette of one creature against others (red = the first only, blue = the other only, purple = both) with their IoU: node tools/dev/sil-overlay.mjs <out.png> <yaw> <kind> <other> [other ...]
import fs from 'node:fs';
import { PNG } from 'pngjs';
import { silhouette, iou, SIL } from './sil-lib.mjs';
// usage: node silpng.mjs out.png yaw a b [c ...]   (the first is drawn red, the second blue, overlap purple; more are drawn as extra panels vs the first)
const [out, yawS, ...kinds] = process.argv.slice(2), yaw = Number(yawS), { W, H } = SIL, panels = kinds.slice(1);
const A = silhouette(kinds[0], yaw), png = new PNG({ width: W * panels.length, height: H });
panels.forEach((k, p) => {
  const B = silhouette(k, yaw);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const a = A[y * W + x], b = B[y * W + x], o = (y * W * panels.length + p * W + x) * 4;
    const c = a && b ? [150, 60, 200] : a ? [220, 60, 60] : b ? [60, 90, 220] : [236, 232, 220];
    png.data[o] = c[0]; png.data[o + 1] = c[1]; png.data[o + 2] = c[2]; png.data[o + 3] = 255;
  }
  console.log(kinds[0], 'vs', k, 'yaw', yaw, iou(A, B).toFixed(2));
});
fs.writeFileSync(out, PNG.sync.write(png));
