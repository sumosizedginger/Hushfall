// Top-down PNG of a map for design review: skins, heights, hazards, doors/keys, sectors, entities, triggers, messages, with a coordinate ruler.
// Usage: node tools/mapkit/mapview.mjs <ID> [scale]  ->  review/maps/<ID>.png   (also reads maps/<ID>.json only; no browser)
import fs from 'node:fs';
import path from 'node:path';
import { PNG } from 'pngjs';
import { parseMap } from '../../src/engine/mapformat.js';
import { HEIGHT_UNIT } from '../../src/engine/defs.js';

const root = path.resolve(import.meta.dirname, '../..');
const WALL = { '#': [58, 70, 76], B: [124, 76, 60], W: [104, 82, 60], P: [200, 190, 150], C: [130, 132, 128], I: [90, 96, 104], R: [110, 70, 160], T: [110, 116, 130] };
const FLOOR = { '.': [92, 74, 56], ':': [70, 76, 84], p: [110, 92, 64], t: [180, 172, 150], g: [40, 56, 64], c: [130, 60, 56], f: [96, 100, 100], m: [82, 70, 52], s: [64, 72, 84] };
const KEYC = { brass: [230, 190, 70], iron: [150, 180, 220], bell: [70, 240, 210] };
const ENEMY = { tollbearer: [220, 60, 50], gaunt: [255, 150, 40], bellhand: [240, 60, 200], sexton: [160, 90, 240], wardengraft: [255, 255, 255], cantor: [255, 0, 90] };
const PICK = (k) => (k.startsWith('key') ? KEYC[k.slice(4)] || [255, 220, 90] : k.startsWith('weapon') ? [255, 255, 120] : k.startsWith('health') ? [90, 230, 110] : k.startsWith('armor') ? [90, 160, 255] : [90, 210, 220]);
const DIGITS = ['111101101101111', '010110010010111', '111001111100111', '111001111001111', '101101111001001', '111100111001111', '111100111101111', '111001001001001', '111101111101111', '111101111001111'];

export function renderMap(m, scale = 10) {
  const W = m.w * scale + 24, Hh = m.h * scale + 24, png = new PNG({ width: W, height: Hh }), ox = 24, oz = 24;
  const px = (x, y, c, a = 255) => { if (x < 0 || y < 0 || x >= W || y >= Hh) return; const i = (y * W + x) * 4; if (a === 255) { png.data[i] = c[0]; png.data[i + 1] = c[1]; png.data[i + 2] = c[2]; } else { for (let k = 0; k < 3; k++) png.data[i + k] = Math.round(png.data[i + k] * (1 - a / 255) + c[k] * a / 255); } png.data[i + 3] = 255; };
  const rect = (x0, y0, w, h, c, a = 255) => { for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) px(x, y, c, a); };
  const ring = (cx, cy, r, c) => { for (let a = 0; a < 720; a++) px(Math.round(cx + Math.cos(a / 360 * Math.PI) * r), Math.round(cy + Math.sin(a / 360 * Math.PI) * r), c); };
  rect(0, 0, W, Hh, [12, 14, 20]);
  const cellPx = (cx, cz) => [ox + cx * scale, oz + cz * scale], centre = (cx, cz) => [ox + (cx + 0.5) * scale, oz + (cz + 0.5) * scale];
  for (let cz = 0; cz < m.h; cz++) for (let cx = 0; cx < m.w; cx++) {
    const t = m.tile(cx, cz), k = m.kind(cx, cz), [x0, y0] = cellPx(cx, cz);
    let c;
    if (k === 'wall') c = WALL[t] || [80, 80, 80];
    else if (k === 'water') c = [24, 52, 84];
    else if (k === 'door' || k === 'secret') c = [30, 24, 20];
    else { const base = FLOOR[t] || [90, 90, 90], lift = Math.min(90, m.floor(cx, cz) * 18); c = base.map((v) => Math.min(255, v + lift)); }
    rect(x0, y0, scale, scale, c);
    if (k !== 'wall' && k !== 'water') { const f = m.fx(cx, cz); if (f === 'w') rect(x0, y0, scale, scale, [60, 150, 220], 90); if (f === 'x') rect(x0, y0, scale, scale, [60, 255, 150], 130); }
    if (m.sectorAt(cx, cz) >= 0) for (let i = 0; i < scale; i += 3) rect(x0 + i, y0, 1, scale, [255, 255, 255], 90);
    if (k === 'wall') rect(x0, y0, scale, 1, [0, 0, 0], 70);
    if (t === 'X') { rect(x0 + 1, y0 + 1, scale - 2, scale - 2, [140, 40, 160], 150); }
    if (t === 'S') { rect(x0 + 1, y0 + 1, scale - 2, scale - 2, [255, 230, 120], 60); }
  }
  for (const d of m.doors.values()) { const [x0, y0] = cellPx(d.cx, d.cz); const c = d.closet ? [200, 80, 220] : d.key ? KEYC[d.key] || [255, 200, 60] : d.remote ? [230, 120, 60] : [200, 170, 110]; rect(x0 + 1, y0 + 1, scale - 2, scale - 2, c); }
  for (const s of m.sectors) for (const [cx, cz] of s.cells) { const [x0, y0] = cellPx(cx, cz); rect(x0, y0, scale, 1, [255, 255, 255]); rect(x0, y0 + scale - 1, scale, 1, [255, 255, 255]); }
  for (const e of m.entities) {
    const [cx, cz] = centre(Math.floor(e.at[0]), Math.floor(e.at[1])), r = Math.max(2, Math.floor(scale * 0.3));
    if (e.type === 'enemy') { for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) if (dx * dx + dy * dy <= r * r) px(cx + dx, cz + dy, ENEMY[e.kind] || [255, 0, 0]); }
    else if (e.type === 'pickup') rect(cx - 1, cz - 1, 3, 3, PICK(e.kind));
    else if (e.type === 'prop') rect(cx - 1, cz - 1, 3, 3, [150, 150, 150], 200);
    else if (e.type === 'player') { rect(cx - r, cz - r, 2 * r + 1, 2 * r + 1, [60, 255, 90]); rect(cx - 1, cz - 1, 3, 3, [0, 0, 0]); }
    else if (e.type === 'exit') { ring(cx, cz, r + 2, [255, 255, 255]); ring(cx, cz, r, [255, 255, 255]); if (e.dest === 'secret') ring(cx, cz, r + 4, [255, 230, 120]); }
    else if (e.type === 'switch') { rect(cx - r, cz - r, 2 * r + 1, 2 * r + 1, [255, 240, 60]); }
  }
  for (const t of m.triggers) if (t.when === 'enter') ring(ox + (t.at[0] + 0.5) * scale, oz + (t.at[1] + 0.5) * scale, t.r / m.cell * scale, [190, 90, 255]);
  for (const g of m.messages) { const [cx, cz] = [ox + (g.at[0] + 0.5) * scale, oz + (g.at[1] + 0.5) * scale]; for (let i = -2; i <= 2; i++) { px(cx + i, cz, [90, 220, 255]); px(cx, cz + i, [90, 220, 255]); } }
  // ruler: a tick and a number every 10 cells
  const num = (n, x, y) => { let s = String(n); for (const ch of s) { const d = DIGITS[Number(ch)]; for (let i = 0; i < 15; i++) if (d[i] === '1') px(x + (i % 3), y + Math.floor(i / 3), [220, 220, 230]); x += 4; } };
  for (let cx = 0; cx < m.w; cx += 10) { num(cx, ox + cx * scale, 6); rect(ox + cx * scale, 16, 1, 6, [220, 220, 230]); }
  for (let cz = 0; cz < m.h; cz += 10) { num(cz, 1, oz + cz * scale + 2); rect(18, oz + cz * scale, 6, 1, [220, 220, 230]); }
  for (let cx = 0; cx < m.w; cx += 10) for (let cz = 0; cz < m.h; cz += 10) px(ox + cx * scale, oz + cz * scale, [255, 255, 255], 120);
  return png;
}
if (import.meta.url.endsWith(path.basename(process.argv[1] || ''))) {
  const id = process.argv[2]; if (!id) { console.error('usage: mapview.mjs <ID> [scale]'); process.exit(2); }
  const m = parseMap(JSON.parse(fs.readFileSync(path.join(root, 'maps', id + '.json'), 'utf8'))), png = renderMap(m, Number(process.argv[3] || 10));
  fs.mkdirSync(path.join(root, 'review/maps'), { recursive: true });
  const f = path.join(root, 'review/maps', id + '.png'); fs.writeFileSync(f, PNG.sync.write(png)); console.log(`wrote ${path.relative(root, f)} (${png.width}x${png.height})  legend: red=Tollbearer orange=Gaunt magenta=Bellhand purple=Sexton white=Warden green=player/health cyan=ammo gold/blue/teal=keys yellow-square=switch purple-ring=trigger cyan-cross=message white-hatch=lift`);
}
