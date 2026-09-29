// Contact sheet of baked assets: alpha shown over a checkerboard, nearest-neighbour upscaled. Also a 2x2 tiling check for walls.
import { PNG } from 'pngjs';
import fs from 'node:fs';
import path from 'node:path';
const dir = path.resolve(import.meta.dirname, '../assets/baked');
const out = path.resolve(import.meta.dirname, '../review/gate-0');
fs.mkdirSync(out, { recursive: true });
const load = (n) => PNG.sync.read(fs.readFileSync(path.join(dir, n + '.png')));
function blit(dst, src, ox, oy, scale, tile = 1) {
  for (let ty = 0; ty < tile; ty++) for (let tx = 0; tx < tile; tx++)
    for (let y = 0; y < src.height * scale; y++) for (let x = 0; x < src.width * scale; x++) {
      const sx = Math.floor(x / scale), sy = Math.floor(y / scale), si = (sy * src.width + sx) * 4;
      const dx = ox + tx * src.width * scale + x, dy = oy + ty * src.height * scale + y;
      if (dx >= dst.width || dy >= dst.height) continue;
      const di = (dy * dst.width + dx) * 4, a = src.data[si + 3] / 255;
      const chk = ((dx >> 3) + (dy >> 3)) & 1 ? 90 : 60;
      for (let k = 0; k < 3; k++) dst.data[di + k] = Math.round(src.data[si + k] * a + chk * (1 - a));
      dst.data[di + 3] = 255;
    }
}
const sheet = new PNG({ width: 1100, height: 900 });
sheet.data.fill(20); for (let i = 3; i < sheet.data.length; i += 4) sheet.data[i] = 255;
blit(sheet, load('wall_bulkhead_a'), 10, 10, 1, 2);            // 2x2 tiling check
blit(sheet, load('enemy_tollbearer_idle'), 540, 10, 3);
blit(sheet, load('weapon_flarecannon'), 10, 540, 2);
blit(sheet, load('ui_title_art'), 540, 400, 1.6 > 1 ? 1 : 1);
fs.writeFileSync(path.join(out, 'pipeline-sheet.png'), PNG.sync.write(sheet));
console.log('wrote review/gate-0/pipeline-sheet.png');
