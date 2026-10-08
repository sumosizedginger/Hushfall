// Look at a baked atlas that has transparency (the marks, PT-021): composite it over a flat backdrop and scale it up. Node only (pngjs).
//   node tools/dev/atlas-view.mjs <in.png> <out.png> [wall|dark|grey] [scale]
import fs from 'node:fs';
import { PNG } from 'pngjs';
const [, , inp, out, bg, scale] = process.argv, k = Number(scale || 3);
const src = PNG.sync.read(fs.readFileSync(inp)), o = new PNG({ width: src.width * k, height: src.height * k });
const B = bg === 'wall' ? [150, 140, 120] : bg === 'dark' ? [60, 60, 66] : [128, 128, 128];
for (let y = 0; y < o.height; y++) for (let x = 0; x < o.width; x++) { const i = (Math.floor(y / k) * src.width + Math.floor(x / k)) * 4, a = src.data[i + 3] / 255, j = (y * o.width + x) * 4; for (let c = 0; c < 3; c++) o.data[j + c] = Math.round(src.data[i + c] * a + B[c] * (1 - a)); o.data[j + 3] = 255; }
fs.writeFileSync(out, PNG.sync.write(o));
