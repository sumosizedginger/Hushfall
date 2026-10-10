// Node-only SILHOUETTES of the REAL built rigs (src/render/models_choir.js FACTORIES, no browser, no bake, no GPU): each creature posed at rest, seen orthographically from the front (or turned by --yaw=), black on white,
// 100 px per metre, feet on one row, centred on the creature's own axis: exactly what tools/look/sil-matrix.mjs reads (it also compares them cropped to one height). The same job tools/look/shoot-rigs.mjs does with Chrome.
//   node tools/dev/sil-rigs.mjs <outDir> [--yaw=0] [kind ...]     then   node tools/look/sil-matrix.mjs <outDir>
import * as THREE from 'three';
import fs from 'node:fs';
import path from 'node:path';
import { PNG } from 'pngjs';
import { FACTORIES } from '../../src/render/models_choir.js';

const args = process.argv.slice(2), outDir = path.resolve(args[0] ?? 'sil-out'), flags = Object.fromEntries(args.filter((a) => a.startsWith('--')).map((a) => { const [k, v] = a.slice(2).split('='); return [k, v ?? '1']; }));
const kinds = args.slice(1).filter((a) => !a.startsWith('--')), want = kinds.length ? kinds : Object.keys(FACTORIES), yaw = Number(flags.yaw ?? 0);
const W = 500, H = 520, FEET = 500, PPM = 100;
fs.mkdirSync(outDir, { recursive: true });
for (const kind of want) {
  const c = FACTORIES[kind](null); c.pose({ t: 0.7, walk: 0, phase: 0, attack: -1, lunge: 0, dead: 0, flash: 0 }); c.root.rotation.y = yaw; c.root.updateMatrixWorld(true);
  const img = new PNG({ width: W, height: H }); img.data.fill(255);
  const px = (v) => [W / 2 + v.x * PPM, FEET - v.y * PPM];
  c.root.traverse((m) => {
    if (!m.isMesh) return; for (let o = m; o; o = o.parent) if (o.visible === false) return;
    if (m.material.transparent && m.material.opacity < 0.5) return;                                  // the echo shells
    const g = m.geometry, pos = g.attributes.position, idx = g.index, mw = m.matrixWorld, V = [];
    for (let i = 0; i < pos.count; i++) V.push(new THREE.Vector3().fromBufferAttribute(pos, i).applyMatrix4(mw));
    const n = idx ? idx.count : pos.count;
    for (let i = 0; i < n; i += 3) {
      const t = [0, 1, 2].map((k) => px(V[idx ? idx.getX(i + k) : i + k])), minx = Math.max(0, Math.floor(Math.min(t[0][0], t[1][0], t[2][0]))), maxx = Math.min(W - 1, Math.ceil(Math.max(t[0][0], t[1][0], t[2][0]))), miny = Math.max(0, Math.floor(Math.min(t[0][1], t[1][1], t[2][1]))), maxy = Math.min(H - 1, Math.ceil(Math.max(t[0][1], t[1][1], t[2][1])));
      const area = (t[1][0] - t[0][0]) * (t[2][1] - t[0][1]) - (t[2][0] - t[0][0]) * (t[1][1] - t[0][1]); if (Math.abs(area) < 1e-6) continue;
      for (let y = miny; y <= maxy; y++) for (let x = minx; x <= maxx; x++) {
        const X = x + 0.5, Y = y + 0.5, w0 = ((t[1][0] - X) * (t[2][1] - Y) - (t[2][0] - X) * (t[1][1] - Y)) / area, w1 = ((t[2][0] - X) * (t[0][1] - Y) - (t[0][0] - X) * (t[2][1] - Y)) / area, w2 = 1 - w0 - w1;
        if (w0 >= 0 && w1 >= 0 && w2 >= 0) { const o = (y * W + x) * 4; img.data[o] = img.data[o + 1] = img.data[o + 2] = 0; }
      }
    }
  });
  fs.writeFileSync(path.join(outDir, `sil_${kind}.png`), PNG.sync.write(img));
}
console.log('wrote', want.length, 'silhouettes ->', outDir);
