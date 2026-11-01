// A contact sheet WITH NAMES (pngjs only; no browser): each frame is fitted into its cell (aspect kept, optionally cropped first) and its label is written under it in a built-in 5 x 7 pixel font, so a sheet
// says which creature or weapon is which (contact-sheet.mjs has no text). A title runs across the top. Made for the owner's "art assets to refine" sheets (2026-10-31).
//   node tools/dev/label-sheet.mjs <out.png> <cols> <cellW> <cellH> [--crop=x,y,w,h] [--title="TEXT"] <label=path> <label=path> ...
import fs from 'node:fs';
import { PNG } from 'pngjs';

const FONT = {          // 5 x 7, each row a 5-bit number (MSB left)
  A: [14, 17, 17, 31, 17, 17, 17], B: [30, 17, 17, 30, 17, 17, 30], C: [14, 17, 16, 16, 16, 17, 14], D: [30, 17, 17, 17, 17, 17, 30], E: [31, 16, 16, 30, 16, 16, 31], F: [31, 16, 16, 30, 16, 16, 16],
  G: [14, 17, 16, 23, 17, 17, 15], H: [17, 17, 17, 31, 17, 17, 17], I: [14, 4, 4, 4, 4, 4, 14], J: [7, 2, 2, 2, 2, 18, 12], K: [17, 18, 20, 24, 20, 18, 17], L: [16, 16, 16, 16, 16, 16, 31],
  M: [17, 27, 21, 21, 17, 17, 17], N: [17, 17, 25, 21, 19, 17, 17], O: [14, 17, 17, 17, 17, 17, 14], P: [30, 17, 17, 30, 16, 16, 16], Q: [14, 17, 17, 17, 21, 18, 13], R: [30, 17, 17, 30, 20, 18, 17],
  S: [15, 16, 16, 14, 1, 1, 30], T: [31, 4, 4, 4, 4, 4, 4], U: [17, 17, 17, 17, 17, 17, 14], V: [17, 17, 17, 17, 17, 10, 4], W: [17, 17, 17, 21, 21, 21, 10], X: [17, 17, 10, 4, 10, 17, 17],
  Y: [17, 17, 10, 4, 4, 4, 4], Z: [31, 1, 2, 4, 8, 16, 31],
  0: [14, 17, 19, 21, 25, 17, 14], 1: [4, 12, 4, 4, 4, 4, 14], 2: [14, 17, 1, 2, 4, 8, 31], 3: [30, 1, 1, 14, 1, 1, 30], 4: [2, 6, 10, 18, 31, 2, 2], 5: [31, 16, 30, 1, 1, 17, 14],
  6: [6, 8, 16, 30, 17, 17, 14], 7: [31, 1, 2, 4, 8, 8, 8], 8: [14, 17, 17, 14, 17, 17, 14], 9: [14, 17, 17, 15, 1, 2, 12],
  ' ': [0, 0, 0, 0, 0, 0, 0], '-': [0, 0, 0, 14, 0, 0, 0], '.': [0, 0, 0, 0, 0, 12, 12], ',': [0, 0, 0, 0, 12, 4, 8], ':': [0, 12, 12, 0, 12, 12, 0], '(': [2, 4, 8, 8, 8, 4, 2], ')': [8, 4, 2, 2, 2, 4, 8],
  '/': [1, 1, 2, 4, 8, 16, 16], "'": [4, 4, 8, 0, 0, 0, 0], '&': [12, 18, 20, 8, 21, 18, 13], '+': [0, 4, 4, 31, 4, 4, 0], '=': [0, 0, 31, 0, 31, 0, 0], '_': [0, 0, 0, 0, 0, 0, 31], '#': [10, 10, 31, 10, 31, 10, 10],
};
/** write `text` at (x, y) in the sheet, `s` pixels per font pixel */
function text(png, x, y, str, s, rgb) {
  let cx = x;
  for (const ch of String(str).toUpperCase()) {
    const g = FONT[ch] ?? FONT[' '];
    for (let r = 0; r < 7; r++) for (let c = 0; c < 5; c++) if (g[r] & (16 >> c)) for (let dy = 0; dy < s; dy++) for (let dx = 0; dx < s; dx++) {
      const px = cx + c * s + dx, py = y + r * s + dy; if (px < 0 || py < 0 || px >= png.width || py >= png.height) continue;
      const i = (py * png.width + px) * 4; png.data[i] = rgb[0]; png.data[i + 1] = rgb[1]; png.data[i + 2] = rgb[2]; png.data[i + 3] = 255;
    }
    cx += 6 * s;
  }
}
const textW = (str, s) => String(str).length * 6 * s;

const a = process.argv.slice(2), out = a.shift(), cols = +a.shift(), cw = +a.shift(), ch = +a.shift();
let crop = null, title = '';
const items = [];
for (const x of a) {
  if (x.startsWith('--crop=')) { const [cx, cy, w, h] = x.slice(7).split(',').map(Number); crop = { x: cx, y: cy, w, h }; continue; }
  if (x.startsWith('--title=')) { title = x.slice(8); continue; }
  const k = x.indexOf('='); items.push({ label: x.slice(0, k), path: x.slice(k + 1) });
}
const gap = 6, cap = 26, head = title ? 44 : 0, rows = Math.ceil(items.length / cols);
const sheet = new PNG({ width: cols * cw + (cols + 1) * gap, height: head + rows * (ch + cap) + (rows + 1) * gap });
for (let i = 0; i < sheet.data.length; i += 4) { sheet.data[i] = 17; sheet.data[i + 1] = 19; sheet.data[i + 2] = 24; sheet.data[i + 3] = 255; }
if (title) text(sheet, gap + 4, 12, title, 3, [224, 196, 140]);
items.forEach(({ label, path }, n) => {
  const col = n % cols, row = Math.floor(n / cols), X = gap + col * (cw + gap), Y = head + gap + row * (ch + cap + gap);
  if (fs.existsSync(path)) {
    const src = PNG.sync.read(fs.readFileSync(path)), c = crop ?? { x: 0, y: 0, w: src.width, h: src.height }, k = Math.min(cw / c.w, ch / c.h), w = Math.floor(c.w * k), h = Math.floor(c.h * k), ox = X + Math.floor((cw - w) / 2), oy = Y + Math.floor((ch - h) / 2);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {                                         // box filter: the mean of the source pixels under each target pixel
      const sx0 = c.x + Math.floor(x / k), sx1 = Math.max(sx0 + 1, c.x + Math.floor((x + 1) / k)), sy0 = c.y + Math.floor(y / k), sy1 = Math.max(sy0 + 1, c.y + Math.floor((y + 1) / k));
      let r = 0, g = 0, b = 0, m = 0;
      for (let sy = sy0; sy < Math.min(sy1, src.height); sy++) for (let sx = sx0; sx < Math.min(sx1, src.width); sx++) { const j = (sy * src.width + sx) * 4, al = src.data[j + 3] / 255; r += src.data[j] * al + 17 * (1 - al); g += src.data[j + 1] * al + 19 * (1 - al); b += src.data[j + 2] * al + 24 * (1 - al); m++; }
      const o = ((oy + y) * sheet.width + ox + x) * 4; sheet.data[o] = r / m; sheet.data[o + 1] = g / m; sheet.data[o + 2] = b / m; sheet.data[o + 3] = 255;
    }
  } else text(sheet, X + 8, Y + ch / 2, 'MISSING', 2, [200, 80, 60]);
  const s = textW(label, 2) > cw - 8 ? 1 : 2; text(sheet, X + Math.max(2, Math.floor((cw - textW(label, s)) / 2)), Y + ch + 6, label, s, [210, 220, 216]);
});
fs.writeFileSync(out, PNG.sync.write(sheet));
console.log('wrote', out, sheet.width + 'x' + sheet.height, items.length, 'frames');
