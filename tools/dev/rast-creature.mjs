// A node-only software rasteriser for a CREATURE rig (no browser, no GPU, one core): the rig exactly as the game builds it (src/render/models_choir.js FACTORIES), posed with its own pose function, sampled from its own baked
// atlas (assets/baked/choir_<kind>.png) by UV, lit by a simple hemisphere + key light. It has NO ink, NO value banding and NO paper grain (the real post pass is not here): it is for COMPOSITION (does the horn point where it
// should, does the silhouette read, are the proportions right, what colour is each part), never for the final look. Made for PT-026 (the Chorister) when the owner's mouse rule forbids a Chrome job for every look at a rig.
//   node tools/dev/rast-creature.mjs <out.png> <kind[,kind...]> [--views=front,three,side,sing,walk,dead] [--w=300] [--dist=5.2] [--cy=1.15]
// views: front (facing the camera), three (a three-quarter turn), side, back, sing (the attack pose, front: 0.6 through the arm-raise tell), walk (mid-stride, three-quarter), dead (the topple, three-quarter).
import * as THREE from 'three';
import fs from 'node:fs';
import { PNG } from 'pngjs';
import { FACTORIES } from '../../src/render/models_choir.js';

const args = process.argv.slice(2), outFile = args[0], kinds = (args[1] ?? 'chorister').split(',');
const flags = Object.fromEntries(args.filter((a) => a.startsWith('--')).map((a) => { const [k, v] = a.slice(2).split('='); return [k, v ?? '1']; }));
const VIEWS = (flags.views ?? 'front,three,side,sing').split(','), W = Number(flags.w ?? 300), H = Math.round(W * 1.25), DIST = Number(flags.dist ?? 5.2), CY = Number(flags.cy ?? 1.15), FOV = 34, NEAR = 0.1;
const POSES = {
  front: { yaw: 0, p: {} }, three: { yaw: 0.75, p: {} }, side: { yaw: Math.PI / 2, p: {} }, back: { yaw: Math.PI, p: {} },
  sing: { yaw: 0.35, p: { attack: 0.6 } }, walk: { yaw: 0.75, p: { walk: 1, phase: 1.1 } }, dead: { yaw: 0.75, p: { dead: 1 } },
};
const srgbToLin = (c) => c.map((x) => (x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4)), linToSrgb = (x) => (x <= 0.0031308 ? x * 12.92 : 1.055 * x ** (1 / 2.4) - 0.055);
const KEY = new THREE.Vector3(-1, 1.4, 1.2).normalize(), SKY = new THREE.Color(0x9fb8d0), GND = new THREE.Color(0x3a2a30), KEYC = new THREE.Color(0xffe0b0);
const atlases = {}; const atlasOf = (kind) => (atlases[kind] ??= PNG.sync.read(fs.readFileSync(new URL(`../../assets/baked/choir_${kind}.png`, import.meta.url))));
const sample = (png, u, v) => { const x = Math.min(png.width - 1, Math.max(0, Math.floor(u * png.width))), y = Math.min(png.height - 1, Math.max(0, Math.floor((1 - v) * png.height))), i = (y * png.width + x) * 4; return [png.data[i] / 255, png.data[i + 1] / 255, png.data[i + 2] / 255]; };

function render(kind, view) {
  const spec = POSES[view], c = FACTORIES[kind](null);
  c.pose({ t: 0.7, walk: 0, phase: 0, attack: -1, lunge: 0, dead: 0, flash: 0, ...spec.p });
  c.root.rotation.y = spec.yaw; c.root.updateMatrixWorld(true);
  const cam = new THREE.PerspectiveCamera(FOV, W / H, NEAR, 100); cam.position.set(0, CY, DIST); cam.lookAt(0, CY, 0); cam.updateMatrixWorld(true);
  const img = new PNG({ width: W, height: H }), zbuf = new Float32Array(W * H).fill(Infinity);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const ny = 1 - 2 * (y + 0.5) / H, t = Math.abs(ny), o = (y * W + x) * 4, sky = ny > -0.45, k = sky ? [0.55 - 0.15 * t, 0.62 - 0.12 * t, 0.62 - 0.05 * t] : [0.28, 0.26, 0.3]; img.data[o] = k[0] * 255; img.data[o + 1] = k[1] * 255; img.data[o + 2] = k[2] * 255; img.data[o + 3] = 255; }
  const tris = [];
  c.root.traverse((m) => {
    if (!m.isMesh) return; for (let o = m; o; o = o.parent) if (o.visible === false) return;
    const mat = m.material; if (mat.transparent && mat.opacity < 0.5) return;
    const g = m.geometry, pos = g.attributes.position, uv = g.attributes.uv, nrm = g.attributes.normal, idx = g.index, mw = m.matrixWorld, nm = new THREE.Matrix3().getNormalMatrix(mw), verts = [];
    for (let i = 0; i < pos.count; i++) verts.push({ p: new THREE.Vector3().fromBufferAttribute(pos, i).applyMatrix4(mw), n: new THREE.Vector3().fromBufferAttribute(nrm, i).applyMatrix3(nm).normalize(), u: uv ? uv.getX(i) : 0, v: uv ? uv.getY(i) : 0 });
    const count = idx ? idx.count : pos.count; for (let i = 0; i < count; i += 3) tris.push({ t: [0, 1, 2].map((k) => verts[idx ? idx.getX(i + k) : i + k]), mat });
  });
  const png = atlasOf(kind), tanH = Math.tan(FOV * Math.PI / 360);
  const shade = (mat, n, u, v) => {
    if (mat.isMeshBasicMaterial) return [mat.color.r, mat.color.g, mat.color.b];
    const tex = srgbToLin(sample(png, u, v)), up = 0.5 + 0.5 * n.y, hemi = [SKY.r * up + GND.r * (1 - up), SKY.g * up + GND.g * (1 - up), SKY.b * up + GND.b * (1 - up)].map((x) => x * 1.6), k = Math.max(0, n.dot(KEY)) * 1.7;
    return [0, 1, 2].map((q) => Math.min(1, tex[q] * (hemi[q] * 0.55 + [KEYC.r, KEYC.g, KEYC.b][q] * k * 0.5)));
  };
  const sx = (x, z) => (0.5 + 0.5 * (x / (-z * tanH * (W / H)))) * W, sy = (y, z) => (0.5 - 0.5 * (y / (-z * tanH))) * H;
  for (const { t, mat } of tris) {
    const poly = t.map((q) => ({ c: q.p.clone().applyMatrix4(cam.matrixWorldInverse), n: q.n, u: q.u, v: q.v }));
    if (poly.some((q) => q.c.z > -NEAR)) continue;
    const pts = poly.map((s) => ({ x: sx(s.c.x, s.c.z), y: sy(s.c.y, s.c.z), iw: 1 / -s.c.z, s })), [p0, p1, p2] = pts, area = (p1.x - p0.x) * (p2.y - p0.y) - (p2.x - p0.x) * (p1.y - p0.y);
    if (area >= 0) continue;
    const minx = Math.max(0, Math.floor(Math.min(p0.x, p1.x, p2.x))), maxx = Math.min(W - 1, Math.ceil(Math.max(p0.x, p1.x, p2.x))), miny = Math.max(0, Math.floor(Math.min(p0.y, p1.y, p2.y))), maxy = Math.min(H - 1, Math.ceil(Math.max(p0.y, p1.y, p2.y)));
    for (let y = miny; y <= maxy; y++) for (let x = minx; x <= maxx; x++) {
      const px = x + 0.5, py = y + 0.5, w0 = ((p1.x - px) * (p2.y - py) - (p2.x - px) * (p1.y - py)) / area, w1 = ((p2.x - px) * (p0.y - py) - (p0.x - px) * (p2.y - py)) / area, w2 = 1 - w0 - w1;
      if (w0 < 0 || w1 < 0 || w2 < 0) continue;
      const iw = w0 * p0.iw + w1 * p1.iw + w2 * p2.iw, z = 1 / iw; if (z >= zbuf[y * W + x]) continue;
      const b0 = w0 * p0.iw / iw, b1 = w1 * p1.iw / iw, b2 = w2 * p2.iw / iw, u = b0 * p0.s.u + b1 * p1.s.u + b2 * p2.s.u, v = b0 * p0.s.v + b1 * p1.s.v + b2 * p2.s.v, n = p0.s.n.clone().multiplyScalar(b0).addScaledVector(p1.s.n, b1).addScaledVector(p2.s.n, b2).normalize();
      const col = shade(mat, n, u, v), o = (y * W + x) * 4; zbuf[y * W + x] = z; img.data[o] = linToSrgb(col[0]) * 255; img.data[o + 1] = linToSrgb(col[1]) * 255; img.data[o + 2] = linToSrgb(col[2]) * 255;
    }
  }
  // a 1 m scale bar on the ground at the creature's feet, and a tick at every 0.5 m of height on the left edge
  for (let m = 0; m <= 2.5; m += 0.5) { const y = Math.round(sy(m - CY, -DIST)); for (let x = 4; x < 14; x++) { const o = (Math.max(0, Math.min(H - 1, y)) * W + x) * 4; img.data[o] = 255; img.data[o + 1] = m % 1 === 0 ? 255 : 80; img.data[o + 2] = 60; } }
  return img;
}

const sheet = new PNG({ width: W * VIEWS.length, height: H * kinds.length });
kinds.forEach((kind, r) => VIEWS.forEach((view, i) => PNG.bitblt(render(kind, view), sheet, 0, 0, W, H, i * W, r * H)));
fs.writeFileSync(outFile, PNG.sync.write(sheet)); console.log('wrote', outFile, sheet.width + 'x' + sheet.height, kinds.join(','), VIEWS.join(','));
