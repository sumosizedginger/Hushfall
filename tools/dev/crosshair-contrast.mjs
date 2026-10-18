// How well does the crosshair stand out from the picture behind it? (PT-048 / V2; pngjs only, NO browser.) The owner: "the hallow circle is hard to see". The measure, per gameplay frame of the look-audit baseline (1280x720, the crosshair at 640,360):
//   background = the median luma of a ring of pixels just outside the reticle;  reticle = the mean luma of the reticle's own pixels;  contrast = |reticle - background|, in luma of 255.
// OLD   = the 7 px hollow teal ring (opacity .75): measured on the REAL pixels of the baseline frames, which already contain it (this reproduces the audit's "median 17.8, under 10 in a third of the frames").
// NEW   = the cross of four ticks round a dot (index.html #cross at its defaults: near white #f4f1e8, opacity .95, 1 px black outline), drawn SYNTHETICALLY over each frame's real pixels with the same geometry the CSS gives at 1280x720
//         (vh = 7.2 px: thickness 2, tick 6.48, gap 3.02, dot 2). `fill` = the white pixels alone; `best` = the better of the white and its dark outline (what an eye gets on a bright or a dark ground).
//   node tools/dev/crosshair-contrast.mjs [imagesDir] [indexJsonl] [--out=file.json] [--k=1] [--min=40]
import fs from 'node:fs';
import path from 'node:path';
import { PNG } from 'pngjs';

const args = process.argv.slice(2), flags = Object.fromEntries(args.filter((a) => a.startsWith('--')).map((a) => a.slice(2).split('=')));
const pos = args.filter((a) => !a.startsWith('--')), dir = pos[0] ?? 'review/self-audit/images', indexFile = pos[1] ?? path.join(path.dirname(dir), 'index.jsonl');
const K = Number(flags.k ?? 1), MIN = Number(flags.min ?? 40), W = 1280, H = 720, CX = 640, CY = 360, VH = H / 100;
const luma = (r, g, b) => 0.299 * r + 0.587 * g + 0.114 * b;
const median = (a) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[s.length >> 1] : 0; };

// geometry in px from the CSS of index.html (#cross): thickness, tick length, gap, dot
const th = Math.max(2, 0.28 * VH * K), tick = Math.max(6, 0.9 * VH * K), gap = Math.max(3, 0.42 * VH * K), ext = gap + tick, dot = th;
const rects = [[-th / 2, -ext, th / 2, -ext + tick], [-th / 2, ext - tick, th / 2, ext], [-ext, -th / 2, -ext + tick, th / 2], [ext - tick, -th / 2, ext, th / 2]];     // the four ticks, relative to the centre
const inFill = (x, y) => rects.some(([a, b, c, d]) => x >= a && x <= c && y >= b && y <= d) || x * x + y * y <= (dot / 2) ** 2;
const inOutline = (x, y) => { for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (inFill(x - dx, y - dy)) return true; return false; };
/** coverage 0..1 of a shape in the pixel whose top-left is (px, py), by 4x4 supersampling; coordinates relative to the centre */
const cover = (shape, px, py) => { let n = 0; for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) if (shape(px - CX + (i + 0.5) / 4, py - CY + (j + 0.5) / 4)) n++; return n / 16; };
const R = Math.ceil(ext) + 2;
const fillPx = [], outPx = [];
for (let py = CY - R; py < CY + R; py++) for (let px = CX - R; px < CX + R; px++) { const f = cover(inFill, px, py), o = cover(inOutline, px, py); if (f >= 0.5) fillPx.push([px, py, f]); else if (o >= 0.5 && f < 0.25) outPx.push([px, py, o]); }
const ring = [], band = [Math.ceil(ext) + 2, Math.ceil(ext) + 6];
for (let py = CY - band[1]; py <= CY + band[1]; py++) for (let px = CX - band[1]; px <= CX + band[1]; px++) { const d = Math.max(Math.abs(px - CX), Math.abs(py - CY)); if (d >= band[0] && d <= band[1]) ring.push([px, py]); }
// the old ring: 9 px box (7 + 2 border) centred about (CX+0.5, CY+0.5), 1 px wide, radius about 4
const oldRing = []; for (let py = CY - 6; py <= CY + 6; py++) for (let px = CX - 6; px <= CX + 6; px++) { const d = Math.hypot(px + 0.5 - (CX + 0.5), py + 0.5 - (CY + 0.5)); if (d >= 3.3 && d <= 4.9) oldRing.push([px, py]); }
const oldBg = []; for (let py = CY - 14; py <= CY + 14; py++) for (let px = CX - 14; px <= CX + 14; px++) { const d = Math.hypot(px - CX, py - CY); if (d >= 7.5 && d <= 12) oldBg.push([px, py]); }

const SKIP_TAG = /^(arrival_card|automap|complete_screen|complete_quay|epilogue|cutoff|title|pause|record|death_screen)/;
const meta = new Map(); if (fs.existsSync(indexFile)) for (const l of fs.readFileSync(indexFile, 'utf8').split('\n')) { if (!l.trim()) continue; try { const o = JSON.parse(l); if (o.file) meta.set(o.file, o); } catch { /* skip */ } }
const files = fs.readdirSync(dir).filter((f) => f.endsWith('.png') && !/^(UI|RANGE)__/.test(f) && !SKIP_TAG.test(meta.get(f)?.tag ?? '') && meta.get(f)?.tag).sort();
const FILL = luma(0xf4, 0xf1, 0xe8), OP = 0.95, res = [];
for (const f of files) {
  const img = PNG.sync.read(fs.readFileSync(path.join(dir, f))); if (img.width !== W || img.height !== H) continue;
  const L = (x, y) => { const i = (y * W + x) * 4; return luma(img.data[i], img.data[i + 1], img.data[i + 2]); };
  const bg = median(ring.map(([x, y]) => L(x, y)));
  const fillMean = fillPx.reduce((s, [x, y, c]) => s + L(x, y) * (1 - OP * c) + FILL * OP * c, 0) / fillPx.length;
  const outMean = outPx.reduce((s, [x, y, c]) => s + L(x, y) * (1 - OP * c), 0) / outPx.length;
  const oldBgL = median(oldBg.map(([x, y]) => L(x, y))), oldMean = oldRing.reduce((s, [x, y]) => s + L(x, y), 0) / oldRing.length;
  const cFill = Math.abs(fillMean - bg), cOut = Math.abs(outMean - bg);
  res.push({ file: f, tag: meta.get(f).tag, map: meta.get(f).map, bg: +bg.toFixed(1), old: +Math.abs(oldMean - oldBgL).toFixed(1), fill: +cFill.toFixed(1), best: +Math.max(cFill, cOut).toFixed(1) });
}
const stat = (k) => { const v = res.map((r) => r[k]); return { median: +median(v).toFixed(1), under10: +(v.filter((x) => x < 10).length / v.length * 100).toFixed(0), under20: +(v.filter((x) => x < 20).length / v.length * 100).toFixed(0), atLeastMin: +(v.filter((x) => x >= MIN).length / v.length * 100).toFixed(0) }; };
const out = { frames: res.length, size: { thickness: +th.toFixed(2), tick: +tick.toFixed(2), gap: +gap.toFixed(2), halfExtent: +ext.toFixed(2), k: K }, min: MIN, old: stat('old'), newFill: stat('fill'), newBest: stat('best') };
console.log(`frames measured: ${out.frames} (gameplay frames of ${dir})  reticle half-extent ${out.size.halfExtent} px at k=${K}`);
for (const [name, s] of [['OLD hollow ring (real pixels)', out.old], ['NEW cross+dot, white pixels only', out.newFill], ['NEW cross+dot, white or its dark outline', out.newBest]]) console.log(`  ${name.padEnd(42)} median ${String(s.median).padStart(5)}   under 10: ${String(s.under10).padStart(3)}%   under 20: ${String(s.under20).padStart(3)}%   >= ${MIN}: ${String(s.atLeastMin).padStart(3)}%`);
const worst = [...res].sort((a, b) => a.best - b.best).slice(0, 5); console.log('weakest frames for the new reticle (best contrast):', worst.map((r) => `${r.map}/${r.tag} bg ${r.bg} -> ${r.best}`).join('; '));
if (flags.out) fs.writeFileSync(flags.out, JSON.stringify({ ...out, rows: res }, null, 1));
process.exitCode = out.newBest.atLeastMin >= 90 ? 0 : 1;
