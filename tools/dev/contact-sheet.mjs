// Contact sheet of PNG frames (pngjs only; no browser). Used for the look assessment.
//   node tools/dev/contact-sheet.mjs <out.png> <cols> <cellW> <cellH> [--crop x,y,w,h] <a.png> <b.png> ...
// Each frame is optionally cropped (full-resolution pixels), then box-downsampled to fit its cell (aspect kept, centred on a dark ground). No labels: order is the argument order.
import fs from 'node:fs';
import { PNG } from 'pngjs';

const a = process.argv.slice(2);
const out = a.shift(), cols = +a.shift(), cw = +a.shift(), ch = +a.shift();
let crop = null; if (a[0] === '--crop') { a.shift(); const [x, y, w, h] = a.shift().split(',').map(Number); crop = { x, y, w, h }; }
const files = a;
const rows = Math.ceil(files.length / cols), gap = 4;
const sheet = new PNG({ width: cols * cw + (cols + 1) * gap, height: rows * ch + (rows + 1) * gap });
for (let i = 0; i < sheet.data.length; i += 4) { sheet.data[i] = 14; sheet.data[i + 1] = 14; sheet.data[i + 2] = 16; sheet.data[i + 3] = 255; }
files.forEach((f, n) => {
  const png = PNG.sync.read(fs.readFileSync(f));
  const c = crop ?? { x: 0, y: 0, w: png.width, h: png.height };
  const k = Math.min(cw / c.w, ch / c.h), tw = Math.max(1, Math.floor(c.w * k)), th = Math.max(1, Math.floor(c.h * k));
  const ox = gap + (n % cols) * (cw + gap) + Math.floor((cw - tw) / 2), oy = gap + Math.floor(n / cols) * (ch + gap) + Math.floor((ch - th) / 2);
  for (let y = 0; y < th; y++) for (let x = 0; x < tw; x++) {
    const sx0 = c.x + Math.floor(x / k), sx1 = Math.max(sx0 + 1, c.x + Math.floor((x + 1) / k)), sy0 = c.y + Math.floor(y / k), sy1 = Math.max(sy0 + 1, c.y + Math.floor((y + 1) / k));
    let r = 0, g = 0, b = 0, cnt = 0;
    for (let sy = sy0; sy < sy1 && sy < png.height; sy++) for (let sx = sx0; sx < sx1 && sx < png.width; sx++) { const p = (sy * png.width + sx) * 4; r += png.data[p]; g += png.data[p + 1]; b += png.data[p + 2]; cnt++; }
    const q = ((oy + y) * sheet.width + ox + x) * 4; sheet.data[q] = r / cnt; sheet.data[q + 1] = g / cnt; sheet.data[q + 2] = b / cnt; sheet.data[q + 3] = 255;
  }
});
fs.writeFileSync(out, PNG.sync.write(sheet));
console.log('wrote', out, sheet.width + 'x' + sheet.height, files.length, 'frames');
