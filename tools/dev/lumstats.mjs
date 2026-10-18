// Luminance statistics of captured frames (pngjs only; no browser). The numbers behind "the lit areas clip" and "the held gun is not in the world's light" (design/VISUAL_DIRECTION.md, V0).
//   node tools/dev/lumstats.mjs <imagesDir> [indexJsonl] [--out=<file.json>] [--top=N]
// For every gameplay frame (UI__ and RANGE__ files are skipped) it measures the 3D picture only: the HUD strips and the message plate are masked out.
//   top    = share of pixels at or above luma 230 of 255 (the flat top band: the clip)
//   bottom = share at or below luma 25 (the black)
//   mean   = mean luma of the 3D picture outside the gun rectangle
//   gun    = mean luma of the lower right rectangle where the held gun sits (only meaningful when the frame's weapon is the start gun, `flare`)
// With the capture's index.jsonl the report also lists, per map, the gun luma against the scene luma for the `flare` frames.
import fs from 'node:fs';
import path from 'node:path';
import { PNG } from 'pngjs';

const args = process.argv.slice(2), flags = Object.fromEntries(args.filter((a) => a.startsWith('--')).map((a) => a.slice(2).split('=')));
const pos = args.filter((a) => !a.startsWith('--')); const dir = pos[0], indexFile = pos[1];
if (!dir) { console.error('usage: lumstats.mjs <imagesDir> [index.jsonl] [--out=file.json] [--top=N]'); process.exit(2); }
const meta = new Map();
if (indexFile && fs.existsSync(indexFile)) for (const l of fs.readFileSync(indexFile, 'utf8').split('\n')) { if (!l.trim()) continue; try { const o = JSON.parse(l); if (o.file) meta.set(o.file, o); } catch { /* a malformed line is skipped */ } }

const GUN = { x0: 980, y0: 520, x1: 1200, y1: 700 };
const CORE = { x0: 800, y0: 540, x1: 1000, y1: 640 };      // fully inside the held cannon on the tick-0 frames (no message plate yet): the gun's own pixels, not the background round it
const inGun = (x, y) => x >= GUN.x0 && x < GUN.x1 && y >= GUN.y0 && y < GUN.y1;
const masked = (x, y) => y < 80 || y >= 660 || (y >= 100 && y < 260 && x >= 540 && x < 740) || (x >= 320 && x < 960 && y >= 510 && y < 612) || (x < 540 && y < 112) || (x >= 880 && y < 190);      // (the toast column moved from the top middle to the top right in V2: both places are masked, the baseline frames have the old one)     // HUD strips, the toast column, the message plate, the objective box
const luma = (r, g, b) => 0.299 * r + 0.587 * g + 0.114 * b;

const rows = [];
for (const f of fs.readdirSync(dir).filter((n) => n.endsWith('.png') && !n.startsWith('UI__') && !n.startsWith('RANGE__')).sort()) {
  const png = PNG.sync.read(fs.readFileSync(path.join(dir, f)));
  if (png.width !== 1280 || png.height !== 720) continue;
  let n = 0, top = 0, bot = 0, sum = 0, gn = 0, gsum = 0, cn = 0, cr = 0, cg = 0, cb = 0;
  for (let y = 0; y < 720; y += 2) for (let x = 0; x < 1280; x += 2) {
    const p = (y * 1280 + x) * 4, l = luma(png.data[p], png.data[p + 1], png.data[p + 2]);
    if (x >= CORE.x0 && x < CORE.x1 && y >= CORE.y0 && y < CORE.y1) { cn++; cr += png.data[p]; cg += png.data[p + 1]; cb += png.data[p + 2]; }
    if (inGun(x, y)) { gn++; gsum += l; continue; }
    if (masked(x, y)) continue;
    n++; sum += l; if (l >= 230) top++; if (l <= 25) bot++;
  }
  const m = meta.get(f) ?? {};
  rows.push({ file: f, map: f.split('__')[0], tag: m.tag ?? f.split('__')[2]?.replace('.png', ''), weapon: m.weapon ?? null, top: +(top / n).toFixed(4), bottom: +(bot / n).toFixed(4), mean: +(sum / n).toFixed(1), gun: +(gsum / gn).toFixed(1), core: +(luma(cr / cn, cg / cn, cb / cn)).toFixed(1), coreRgb: [Math.round(cr / cn), Math.round(cg / cn), Math.round(cb / cn)] });
}
const avg = (a) => (a.length ? a.reduce((s, v) => s + v, 0) / a.length : 0);
const byMap = {};
for (const r of rows) (byMap[r.map] ??= []).push(r);
const maps = Object.entries(byMap).map(([map, rs]) => {
  const flare = rs.filter((r) => r.weapon === 'flare' || (r.weapon === null && /arrival|first_sight/.test(r.tag)));
  return { map, frames: rs.length, top: +avg(rs.map((r) => r.top)).toFixed(4), bottom: +avg(rs.map((r) => r.bottom)).toFixed(4), mean: +avg(rs.map((r) => r.mean)).toFixed(1), gunStart: flare.length ? +avg(flare.map((r) => r.gun)).toFixed(1) : null, sceneStart: flare.length ? +avg(flare.map((r) => r.mean)).toFixed(1) : null };
});
const N = Number(flags.top ?? 15);
const worst = [...rows].sort((a, b) => b.top - a.top).slice(0, N);
console.log(`frames ${rows.length}   mean top-band share ${(avg(rows.map((r) => r.top)) * 100).toFixed(1)}%   mean black share ${(avg(rows.map((r) => r.bottom)) * 100).toFixed(1)}%   frames with top share > 20%: ${rows.filter((r) => r.top > 0.2).length}, > 35%: ${rows.filter((r) => r.top > 0.35).length}`);
console.log('\nworst ' + N + ' frames by top-band share:'); for (const r of worst) console.log(`  ${(r.top * 100).toFixed(1).padStart(5)}%  mean ${String(r.mean).padStart(5)}  ${r.file}`);
console.log('\nper map (start frames, the start gun): the gun luma against the scene luma; if the gun were lit by the place the two would move together'); for (const m of maps.filter((m) => m.gunStart != null)) console.log(`  ${m.map.padEnd(8)} scene ${String(m.sceneStart).padStart(5)}   gun ${String(m.gunStart).padStart(5)}   ratio ${(m.gunStart / Math.max(1, m.sceneStart)).toFixed(2)}`);
const arr = rows.filter((r) => r.tag === 'arrival');
if (arr.length) {
  const xs = arr.map((r) => r.mean), ys = arr.map((r) => r.core), mx = avg(xs), my = avg(ys), sx = Math.sqrt(avg(xs.map((v) => (v - mx) ** 2))), sy = Math.sqrt(avg(ys.map((v) => (v - my) ** 2)));
  const corr = sx && sy ? avg(xs.map((v, i) => (v - mx) * (ys[i] - my))) / (sx * sy) : 0;
  console.log('\nthe gun core (its own pixels, tick-0 frames, ' + arr.length + ' maps): luma ' + Math.min(...ys).toFixed(0) + ' to ' + Math.max(...ys).toFixed(0) + ' (sd ' + sy.toFixed(1) + ') while the scene luma runs ' + Math.min(...xs).toFixed(0) + ' to ' + Math.max(...xs).toFixed(0) + ' (sd ' + sx.toFixed(1) + '); correlation of the two ' + corr.toFixed(2) + ' (a gun lit by the place would follow the scene)');
}
if (flags.out) fs.writeFileSync(flags.out, JSON.stringify({ frames: rows, maps }, null, 1));
