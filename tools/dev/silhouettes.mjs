// Silhouette test for creatures (pngjs only). Input: the frames written by `shoot-assessment.mjs sil` (sil-bg.png = empty, sil-<kind>.png = one creature on the same spot, same distance, same pose).
// A creature's mask = the pixels that differ from the empty frame. Prints the overlap (intersection over union) of every pair and writes a lineup of the masks (black on white).
//   node tools/dev/silhouettes.mjs <dir> <out.png> kind kind ...
import fs from 'node:fs';
import path from 'node:path';
import { PNG } from 'pngjs';

const [dir, outFile, ...kinds] = process.argv.slice(2);
const read = (n) => PNG.sync.read(fs.readFileSync(path.join(dir, n)));
const bg = read('sil-bg.png'), W = bg.width, H = bg.height;
const THRESH = 70, Y0 = 90, Y1 = 650;   // the paper grain moves between frames: a real difference is large, and the boss bar (top) and HUD (bottom) are outside the window
const mask = (k) => {
  const p = read(`sil-${k}.png`), m = new Uint8Array(W * H);
  for (let y = Y0; y < Y1; y++) for (let x = 0; x < W; x++) { const i = y * W + x; const d = Math.abs(p.data[i * 4] - bg.data[i * 4]) + Math.abs(p.data[i * 4 + 1] - bg.data[i * 4 + 1]) + Math.abs(p.data[i * 4 + 2] - bg.data[i * 4 + 2]); m[i] = d > THRESH ? 1 : 0; }
  // keep the largest blob (closing the grain's pin-holes first), drop the scattered grain
  const near = new Uint8Array(W * H); for (let y = 2; y < H - 2; y++) for (let x = 2; x < W - 2; x++) { let c = 0; for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) c += m[(y + dy) * W + x + dx]; near[y * W + x] = c >= 3 ? 1 : 0; }
  const lab = new Int32Array(W * H); let best = 0, bestN = 0, nl = 0;
  for (let s0 = 0; s0 < W * H; s0++) { if (!near[s0] || lab[s0]) continue; nl++; let n = 0; const st = [s0]; lab[s0] = nl; while (st.length) { const q = st.pop(); n++; const x = q % W, y = (q - x) / W; for (const [ax, ay] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + ax, ny = y + ay; if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue; const r = ny * W + nx; if (near[r] && !lab[r]) { lab[r] = nl; st.push(r); } } } if (n > bestN) { bestN = n; best = nl; } }
  const out = new Uint8Array(W * H); for (let i = 0; i < W * H; i++) out[i] = lab[i] === best && m[i] ? 1 : 0; 
  // opening (drops the thin floor-texture lines at the feet), then closing (fills pin-holes where the creature's colour equals the background)
  const box = (src, r, wantAll) => { const o = new Uint8Array(W * H); for (let y = r; y < H - r; y++) for (let x = r; x < W - r; x++) { let any = 0, all = 1; for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) { const v = src[(y + dy) * W + x + dx]; any |= v; all &= v; } o[y * W + x] = wantAll ? all : any; } return o; };
  return box(box(box(box(out, 2, true), 2, false), 3, false), 3, true);
};
const masks = Object.fromEntries(kinds.map((k) => [k, mask(k)]));
const area = (m) => m.reduce((a, b) => a + b, 0);
const iou = (a, b) => { let i = 0, u = 0; for (let n = 0; n < a.length; n++) { if (a[n] && b[n]) i++; if (a[n] || b[n]) u++; } return u ? i / u : 0; };
// the same figure drawn at its own scale would hide that one is taller: compare in place (same standing spot), and ALSO after cropping to the bounding box and rescaling to the same height (shape only)
const bbox = (m) => { let x0 = W, y0 = H, x1 = 0, y1 = 0; for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (m[y * W + x]) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; } return { x0, y0, x1, y1 }; };
const norm = (m, S = 128) => { const b = bbox(m), w = b.x1 - b.x0 + 1, h = b.y1 - b.y0 + 1, out = new Uint8Array(S * S); for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) { const sx = b.x0 + Math.min(w - 1, Math.floor(x * w / S)), sy = b.y0 + Math.min(h - 1, Math.floor(y * h / S)); out[y * S + x] = m[sy * W + sx]; } return out; };
console.log('mask area (px) and height (px):', kinds.map((k) => { const b = bbox(masks[k]); return `${k} ${area(masks[k])} / ${b.y1 - b.y0 + 1}`; }).join(' | '));
for (const mode of ['in place', 'shape only (each scaled to the same box)']) {
  console.log('\nIoU, ' + mode);
  console.log(''.padEnd(13) + kinds.map((k) => k.slice(0, 7).padEnd(8)).join(''));
  for (const a of kinds) console.log(a.padEnd(13) + kinds.map((b) => (mode === 'in place' ? iou(masks[a], masks[b]) : iou(norm(masks[a]), norm(masks[b]))).toFixed(2).padEnd(8)).join(''));
}
// lineup: each mask cropped to its own box, drawn at the same height, black on white
const S = 220, cell = S + 20, sheet = new PNG({ width: cell * kinds.length + 20, height: S + 40 });
sheet.data.fill(255);
kinds.forEach((k, n) => {
  const b = bbox(masks[k]), w = b.x1 - b.x0 + 1, h = b.y1 - b.y0 + 1, sc = S / Math.max(w, h), tw = Math.floor(w * sc), th = Math.floor(h * sc), ox = 20 + n * cell + Math.floor((S - tw) / 2), oy = 20 + (S - th);
  for (let y = 0; y < th; y++) for (let x = 0; x < tw; x++) if (masks[k][(b.y0 + Math.floor(y / sc)) * W + b.x0 + Math.floor(x / sc)]) { const q = ((oy + y) * sheet.width + ox + x) * 4; sheet.data[q] = sheet.data[q + 1] = sheet.data[q + 2] = 10; }
});
fs.writeFileSync(outFile, PNG.sync.write(sheet)); console.log('\nwrote', outFile);
