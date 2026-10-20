// CLIP STATISTICS (PT-065, V12 of the visual plan): the plan's acceptance for the tone shoulder (V4) was written in "top-band share" (luma 230 or more), which cannot tell a bright pixel that still carries detail from a FLAT WHITE one: a shoulder moves the point where the picture clips, not the number of bright pixels.
// This measures the thing the shoulder is for: for every exit frame (the lit chamber, where the baseline clipped), the share of the 3D picture at luma 252 or more (flat white), 240 or more and the number of distinct grey levels above 200 (how much detail the highlights keep).
//   node tools/dev/clipstats.mjs <dirA> <dirB> [tag]      two image folders (the baseline and the new capture); frames are matched by map and tag (default tag: exit)
import fs from 'node:fs';
import path from 'node:path';
import { PNG } from 'pngjs';
const [dirA, dirB, tag = 'exit'] = process.argv.slice(2);
const files = (d) => fs.readdirSync(d).filter((f) => f.endsWith(`__${tag}.png`) || new RegExp(`__\d+__${tag}\.png$`).test(f));
const measure = (file) => {
  const p = PNG.sync.read(fs.readFileSync(file)), h3 = Math.floor(p.height * 0.82), hist = new Uint32Array(256); let n = 0;
  for (let y = 0; y < h3; y++) for (let x = 0; x < p.width; x++) { const i = (y * p.width + x) * 4, l = Math.round(0.299 * p.data[i] + 0.587 * p.data[i + 1] + 0.114 * p.data[i + 2]); hist[l]++; n++; }
  const share = (lo) => { let c = 0; for (let l = lo; l < 256; l++) c += hist[l]; return +(100 * c / n).toFixed(2); };
  let levels = 0; for (let l = 200; l < 256; l++) if (hist[l] > n * 0.0005) levels++;
  return { top230: share(230), clip252: share(252), clip240: share(240), levelsAbove200: levels };
};
const byMap = (d) => Object.fromEntries(files(d).map((f) => [f.split('__')[0], path.join(d, f)]));
const A = byMap(dirA), B = byMap(dirB), maps = Object.keys(B).filter((m) => A[m]).sort(), sum = { a: {}, b: {} };
console.log('map       baseline 230/252/levels   new 230/252/levels');
for (const m of maps) {
  const a = measure(A[m]), b = measure(B[m]); console.log(`${m.padEnd(8)}  ${String(a.top230).padStart(6)} ${String(a.clip252).padStart(6)} ${String(a.levelsAbove200).padStart(3)}      ${String(b.top230).padStart(6)} ${String(b.clip252).padStart(6)} ${String(b.levelsAbove200).padStart(3)}`);
  for (const k of Object.keys(a)) { sum.a[k] = (sum.a[k] ?? 0) + a[k]; sum.b[k] = (sum.b[k] ?? 0) + b[k]; }
}
const avg = (o) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, +(v / maps.length).toFixed(2)]));
console.log(`MEAN over ${maps.length} ${tag} frames: baseline ${JSON.stringify(avg(sum.a))}  new ${JSON.stringify(avg(sum.b))}`);
