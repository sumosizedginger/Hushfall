// The L0 acceptance test: how alike are the designed silhouettes? Reads the flat silhouette PNGs written by tools/look/bake-concepts.mjs (black on white, 100 px per metre, feet on one row,
// centred), so pixel overlap in place IS true-scale overlap at the same distance, which is how the game shows two creatures. Also reports the SHAPE-only overlap (each cropped and scaled to
// the same height) and how much of each silhouette is a feature thinner than 15 cm (the renderer's legibility rule: erode 7 px then dilate 7 px; what disappears was too thin).
//   node tools/look/sil-matrix.mjs            -> prints the tables, writes review/look-bible/sil-matrix.json
import fs from 'node:fs';
import path from 'node:path';
import { PNG } from 'pngjs';

const dir = path.resolve(import.meta.dirname, '../../review/look-bible');
const KINDS = ['tollbearer', 'tollbearer0', 'gaunt', 'bellhand', 'sexton', 'wardengraft', 'cantor', 'bellnode', 'gill', 'feeder', 'graftmother', 'chorister', 'bulwark', 'weeping'];
const GAME = KINDS.slice(0, 11), TARGET = 0.5;
const load = (k) => { const p = PNG.sync.read(fs.readFileSync(path.join(dir, `sil_${k}.png`))), m = new Uint8Array(p.width * p.height); for (let i = 0; i < m.length; i++) m[i] = p.data[i * 4] < 128 ? 1 : 0; return { m, w: p.width, h: p.height }; };
const M = Object.fromEntries(KINDS.map((k) => [k, load(k)]));
const area = (a) => a.reduce((s, v) => s + v, 0);
const iou = (a, b) => { let i = 0, u = 0; for (let n = 0; n < a.length; n++) { if (a[n] && b[n]) i++; if (a[n] || b[n]) u++; } return u ? i / u : 0; };
const bbox = ({ m, w, h }) => { let x0 = w, y0 = h, x1 = -1, y1 = -1; for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (m[y * w + x]) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; } return { x0, y0, x1, y1 }; };
const NW = 700, NH = 400;
const norm = (s) => { const b = bbox(s), bw = b.x1 - b.x0 + 1, bh = b.y1 - b.y0 + 1, k = NH / bh, tw = Math.max(1, Math.round(bw * k)), out = new Uint8Array(NW * NH), ox = Math.floor((NW - tw) / 2); for (let y = 0; y < NH; y++) for (let x = 0; x < tw; x++) { const sx = b.x0 + Math.min(bw - 1, Math.floor(x / k)), sy = b.y0 + Math.min(bh - 1, Math.floor(y / k)); if (ox + x >= 0 && ox + x < NW) out[y * NW + ox + x] = s.m[sy * s.w + sx]; } return out; };
const N = Object.fromEntries(KINDS.map((k) => [k, norm(M[k])]));
const open = ({ m, w, h }, r) => { const tmp = new Uint8Array(m.length), er = new Uint8Array(m.length), out = new Uint8Array(m.length);
  const pass = (src, dst, horiz, want) => { for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { let v = want ? 1 : 0; for (let d = -r; d <= r; d++) { const xx = horiz ? x + d : x, yy = horiz ? y : y + d; const s = xx < 0 || yy < 0 || xx >= w || yy >= h ? 0 : src[yy * w + xx]; if (want ? !s : s) { v = want ? 0 : 1; break; } } dst[y * w + x] = v; } };
  pass(m, tmp, true, true); pass(tmp, er, false, true); pass(er, tmp, true, false); pass(tmp, out, false, false); return out; };

const rows = { inPlace: {}, shape: {}, thin: {} };
rows.thin10 = {};
for (const a of KINDS) { rows.inPlace[a] = {}; rows.shape[a] = {}; for (const b of KINDS) { rows.inPlace[a][b] = +iou(M[a].m, M[b].m).toFixed(2); rows.shape[a][b] = +iou(N[a], N[b]).toFixed(2); } const o = open(M[a], 7), o10 = open(M[a], 5); rows.thin[a] = +(1 - area(o) / area(M[a].m)).toFixed(3); rows.thin10[a] = +(1 - area(o10) / area(M[a].m)).toFixed(3); }

const show = (title, t, keys) => { console.log('\n' + title); console.log(''.padEnd(13) + keys.map((k) => k.slice(0, 7).padEnd(8)).join('')); for (const a of keys) console.log(a.padEnd(13) + keys.map((b) => (a === b ? '  -     ' : String(t[a][b].toFixed(2)).padEnd(8))).join('')); };
show('IoU IN PLACE (true scale, same distance; target < ' + TARGET + ' for every pair of game kinds)', rows.inPlace, KINDS);
show('IoU SHAPE ONLY (each scaled to the same height; the stricter reading)', rows.shape, KINDS);
console.log('\nthin-feature loss, share of the silhouette thinner than 15 cm (masses must not be: bells, pipes, tines, fringe) | thinner than ~10 cm (only limbs may be; the Gaunt is spindly by design):');
console.log(KINDS.map((k) => `${k} ${(rows.thin[k] * 100).toFixed(1)}% | ${(rows.thin10[k] * 100).toFixed(1)}%`).join('\n'));
const worst = (t, keys) => { let best = { v: 0 }; for (const a of keys) for (const b of keys) if (a < b && !(a.startsWith('tollbearer') && b.startsWith('tollbearer')) && t[a][b] > best.v) best = { v: t[a][b], a, b }; return best; };
const wi = worst(rows.inPlace, GAME), ws = worst(rows.shape, GAME);
console.log(`\nWORST PAIR in place: ${wi.a} / ${wi.b} = ${wi.v}  ${wi.v < TARGET ? 'PASS' : 'FAIL'} (target < ${TARGET})`);
console.log(`WORST PAIR shape-only: ${ws.a} / ${ws.b} = ${ws.v}`);
fs.writeFileSync(path.join(dir, 'sil-matrix.json'), JSON.stringify({ target: TARGET, kinds: KINDS, ...rows, worstInPlace: wi, worstShape: ws }, null, 1));
process.exit(wi.v < TARGET ? 0 : 1);
