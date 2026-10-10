// Node-only silhouettes of the REAL built rigs (src/render/models_choir.js FACTORIES): each creature posed at rest, seen orthographically (from the front, or turned by `yaw`), black = 1, 100 px per metre, feet on one row,
// centred on the creature's own axis. Used by tools/dev/sil-rigs.mjs (PNG files for tools/look/sil-matrix.mjs) and by tests/silhouettes.test.js (the overlap bar, in place at true scale: PT-028).
import * as THREE from 'three';
import { FACTORIES } from '../../src/render/models_choir.js';

export const SIL = { W: 500, H: 520, FEET: 500, PPM: 100 };
export function silhouette(kind, yaw = 0, pose = {}) {
  const { W, H, FEET, PPM } = SIL, mask = new Uint8Array(W * H);
  const c = FACTORIES[kind](null); c.pose({ t: 0.7, walk: 0, phase: 0, attack: -1, lunge: 0, dead: 0, flash: 0, ...pose }); c.root.rotation.y = yaw; c.root.updateMatrixWorld(true);
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
        if (w0 >= 0 && w1 >= 0 && w2 >= 0) mask[y * W + x] = 1;
      }
    }
  });
  return mask;
}
/** intersection over union of two masks (the same measure as tools/look/sil-matrix.mjs, in place) */
export function iou(a, b) { let i = 0, u = 0; for (let n = 0; n < a.length; n++) { if (a[n] && b[n]) i++; if (a[n] || b[n]) u++; } return u ? i / u : 0; }
