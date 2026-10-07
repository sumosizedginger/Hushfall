// Can the player SEE the creature against the level? Takes the close-up stills of tools/look/shoot-rigs.mjs (close, in the real post pass) and the same frames with nobody in them (empty), finds the creature's
// pixels (the frame differs from the empty frame), and compares its mean luminance with the ring of background pixels around it. Prints dL (creature minus background, 0..255 scale) and the ratio.
// Old (shipped, old_<kind>) and new rigs are both measured, in the same light, so the numbers are a fair A/B; a negative dL = darker than what is behind it, a small |dL| = it hides.
//   node tools/look/readability.mjs <closeDir> <emptyDir> kind kind ...
import fs from 'node:fs';
import path from 'node:path';
import { PNG } from 'pngjs';

const [closeDir, emptyDir, ...kinds] = process.argv.slice(2);
const read = (d, n) => PNG.sync.read(fs.readFileSync(path.join(d, n)));
const lum = (p, i) => 0.299 * p.data[i] + 0.587 * p.data[i + 1] + 0.114 * p.data[i + 2];
const BIG = new Set(['cantor', 'graftmother', 'wardengraft']);
function measure(frame, empty) {
  const W = frame.width, H = frame.height, m = new Uint8Array(W * H);
  for (let i = 0; i < W * H; i++) { const d = Math.abs(frame.data[i * 4] - empty.data[i * 4]) + Math.abs(frame.data[i * 4 + 1] - empty.data[i * 4 + 1]) + Math.abs(frame.data[i * 4 + 2] - empty.data[i * 4 + 2]); m[i] = d > 40 ? 1 : 0; }
  // the creature's inked outline is part of what the player sees: keep everything that changed, but drop speckle (needs 3 changed neighbours in a 5x5 window)
  const keep = new Uint8Array(W * H); let n = 0;
  for (let y = 2; y < H - 2; y++) for (let x = 2; x < W - 2; x++) { if (!m[y * W + x]) continue; let c = 0; for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) c += m[(y + dy) * W + x + dx]; if (c >= 6) { keep[y * W + x] = 1; n++; } }
  const ring = new Uint8Array(W * H), R = 14;
  for (let y = R; y < H - R; y++) for (let x = R; x < W - R; x++) { if (keep[y * W + x]) continue; let near = false; for (let dy = -R; dy <= R && !near; dy += 2) for (let dx = -R; dx <= R; dx += 2) if (keep[(y + dy) * W + x + dx]) { near = true; break; } if (near) ring[y * W + x] = 1; }
  let lc = 0, lb = 0, nc = 0, nb = 0;
  for (let i = 0; i < W * H; i++) { if (keep[i]) { lc += lum(frame, i * 4); nc++; } if (ring[i]) { lb += lum(empty, i * 4); nb++; } }
  return { px: nc, lc: lc / Math.max(1, nc), lb: lb / Math.max(1, nb) };
}
console.log('kind            creature px   L creature   L behind   dL     ratio');
for (const k of kinds) {
  const base = k.replace(/^old_/, ''), emptyName = base === 'gill' ? 'empty-gill.png' : BIG.has(base) ? 'empty-6.08.png' : 'empty-3.2.png';
  const r = measure(read(closeDir, `close-${k}.png`), read(emptyDir, emptyName));
  console.log(`${k.padEnd(15)} ${String(r.px).padStart(8)}      ${r.lc.toFixed(0).padStart(6)}      ${r.lb.toFixed(0).padStart(6)}   ${(r.lc - r.lb).toFixed(0).padStart(5)}   ${(r.lc / Math.max(1, r.lb)).toFixed(2)}`);
}
