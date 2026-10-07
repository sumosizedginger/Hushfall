// A node-only software rasteriser for the FIRST-PERSON WEAPON (no browser, no GPU, one core): it draws the weapon rig exactly where the game puts it (src/render/weapon-pose.js, the same function view.js calls), through the
// weapon camera (58 degrees, as view.js), with the weapon scene's own light recipe and the real painted atlas sampled by UV. It has NO ink, NO value banding and NO paper grain (the real post pass is not here): it is
// for COMPOSITION (where the sights are, how much of the screen the body takes, what the barrel does), never for the final look. Made because the owner's mouse stops reaching the screen while my Chrome jobs run (PT-011).
//   node tools/dev/rast-weapon.mjs <out.png> <weapon|all> [--ads=1] [--sprint=0] [--w=930] [--legacy]      weapons: flare scattergun rivet harpoon arc
//   --gs=0.5 --dist=0.2 override the rig's aim scale and the eye-to-rear-sight distance (experiments)
//   --legacy draws the pose view.js used before the sight-line pose (to compare with the owner's screenshots)
//   MELEE (PT-013): weapons fists boathook marlinspike mallet axe; --swing=<jab|heavy|bash|id> --u=<0..1> (how far through the swing), --guard=1, --charge=1 (fists drawn back), --alt=1 (the other fist leads);
//   with no --u the rig stands in its ready pose. --bash=<0..1> draws a gun mid-bash instead of mid-aim.
import * as THREE from 'three';
import fs from 'node:fs';
import { PNG } from 'pngjs';
import { makeFlareCannon, makeScattergun } from '../../src/render/models.js';
import { makeRivetDriver } from '../../src/render/models_rivet.js';
import { makeHarpoonRifle } from '../../src/render/models_harpoon.js';
import { makeArcLamp } from '../../src/render/models_arc.js';
import { weaponPose, HIP, swingTimes, swingPhase, meleePose } from '../../src/render/weapon-pose.js';
import { MELEE_MAKERS } from '../../src/render/models_melee.js';

const args = process.argv.slice(2), outFile = args[0], which = args[1] ?? 'all';
const flags = Object.fromEntries(args.filter((a) => a.startsWith('--')).map((a) => { const [k, v] = a.slice(2).split('='); return [k, v ?? '1']; }));
const W = Number(flags.w ?? 930), H = Math.round(W * 940 / 1860), ADS = Number(flags.ads ?? 1), SPR = Number(flags.sprint ?? 0);
const atlasPng = PNG.sync.read(fs.readFileSync(new URL('../../assets/baked/flarecannon_atlas.png', import.meta.url)));
const MAKERS = { flare: makeFlareCannon, scattergun: makeScattergun, rivet: makeRivetDriver, harpoon: makeHarpoonRifle, arc: makeArcLamp, ...MELEE_MAKERS };
const FOV = 58, NEAR = 0.1;

function sampleAtlas(u, v) { const x = Math.min(atlasPng.width - 1, Math.max(0, Math.floor(u * atlasPng.width))), y = Math.min(atlasPng.height - 1, Math.max(0, Math.floor((1 - v) * atlasPng.height))), i = (y * atlasPng.width + x) * 4; return [atlasPng.data[i] / 255, atlasPng.data[i + 1] / 255, atlasPng.data[i + 2] / 255]; }
const srgbToLin = (c) => c.map((x) => (x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4)), linToSrgb = (x) => (x <= 0.0031308 ? x * 12.92 : 1.055 * x ** (1 / 2.4) - 0.055);
const KEY = new THREE.Vector3(-1, 1.5, 1).normalize(), SKY = new THREE.Color(0x9fb8d0), GND = new THREE.Color(0x3a2a30), KEYC = new THREE.Color(0xffe0b0);

function render(name) {
  const rig = MAKERS[name](null), a = ADS, sp = SPR; if (flags.gs) rig.adsScale = Number(flags.gs); if (flags.dist) rig.adsDist = Number(flags.dist);
  let pose;
  if (rig.melee) {
    const kind = flags.swing ?? (name === 'fists' ? 'jab' : name), T = swingTimes(kind), t = flags.u != null ? Number(flags.u) * (T.windup + T.recover) : -1, ph = swingPhase(kind, t);
    rig.anim({ ...ph, kind, charge: Number(flags.charge ?? 0), guard: Number(flags.guard ?? 0), alt: Number(flags.alt ?? 0), t: 0 }); pose = meleePose(rig, { sprint: sp });
  } else {
    rig.sleeveMat.opacity = Math.max(0, 1 - a / 0.6) ** 2;
    const bt = flags.bash != null ? swingPhase('bash', Number(flags.bash) * (swingTimes('bash').windup + swingTimes('bash').recover)) : null;
    pose = weaponPose(rig, { ads: bt ? 0 : a, sprint: sp, sway: 0, recoil: 0, dead: 0, dip: 0, legacy: !!flags.legacy, bash: bt && bt.on ? bt : null });
  }
  rig.group.scale.setScalar(pose.scale); rig.group.position.set(...pose.pos); rig.group.rotation.set(...pose.rot);
  const cam = new THREE.PerspectiveCamera(FOV, W / H, NEAR, 100); cam.position.set(0, 0, 0); cam.updateMatrixWorld(true);
  const scene = new THREE.Scene(); scene.add(rig.group); rig.group.updateMatrixWorld(true);
  const img = new PNG({ width: W, height: H }), zbuf = new Float32Array(W * H).fill(Infinity);
  // backdrop: dusk sky over a floor, a crosshair target 12 m away (a dark post 1.7 m tall), so occlusion of the target is visible
  const tanH = Math.tan(FOV * Math.PI / 360);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const ny = 1 - 2 * (y + 0.5) / H, o = (y * W + x) * 4, sky = ny > 0, t = Math.abs(ny);
    const c = sky ? [0.95 - 0.35 * t, 0.62 - 0.25 * t, 0.55 + 0.1 * t] : [0.22 + 0.1 * (1 - t), 0.2 + 0.08 * (1 - t), 0.26 + 0.1 * (1 - t)];
    img.data[o] = c[0] * 255; img.data[o + 1] = c[1] * 255; img.data[o + 2] = c[2] * 255; img.data[o + 3] = 255;
    const wx = (2 * (x + 0.5) / W - 1) * tanH * (W / H), wy = ny * tanH;           // direction at unit distance
    if (Math.abs(wx * 12) < 0.18 && wy * 12 > -1.6 && wy * 12 < 0.1 + 0.0) { img.data[o] = 40; img.data[o + 1] = 36; img.data[o + 2] = 44; }   // the target figure: x within 0.18 m at 12 m, from the floor (eye 1.6 m) to just above the crosshair
  }
  const proj = (v) => { const p = v.clone().applyMatrix4(cam.matrixWorldInverse); return p; };
  const tris = [];
  rig.group.traverse((m) => {
    if (!m.isMesh) return; for (let o = m; o; o = o.parent) if (o.visible === false) return;                   // an invisible ancestor (the muzzle flash group) hides its meshes
    const mats = m.material; if (mats.transparent && mats.opacity < 0.05) return;
    const g = m.geometry, pos = g.attributes.position, uv = g.attributes.uv, nrm = g.attributes.normal, idx = g.index, mw = m.matrixWorld, nm = new THREE.Matrix3().getNormalMatrix(mw);
    const verts = []; for (let i = 0; i < pos.count; i++) { const v = new THREE.Vector3().fromBufferAttribute(pos, i).applyMatrix4(mw); const n = new THREE.Vector3().fromBufferAttribute(nrm, i).applyMatrix3(nm).normalize(); verts.push({ p: v, n, u: uv ? uv.getX(i) : 0, v: uv ? uv.getY(i) : 0 }); }
    const count = idx ? idx.count : pos.count;
    for (let i = 0; i < count; i += 3) { const t = [0, 1, 2].map((k) => verts[idx ? idx.getX(i + k) : i + k]); tris.push({ t, mat: mats }); }
  });
  const shade = (mat, n, u, v) => {
    if (mat.isMeshBasicMaterial) return [mat.color.r, mat.color.g, mat.color.b];
    const tex = mat.map || mat.userData?.map ? [1, 1, 1] : srgbToLin(sampleAtlas(u, v));          // the rigs are built with a null map here: sample the atlas by hand
    const up = 0.5 + 0.5 * n.y, hemi = [SKY.r * up + GND.r * (1 - up), SKY.g * up + GND.g * (1 - up), SKY.b * up + GND.b * (1 - up)].map((x) => x * 1.5), k = Math.max(0, n.dot(KEY)) * 1.6;
    const em = mat.emissive ? [mat.emissive.r, mat.emissive.g, mat.emissive.b] : [0, 0, 0];
    return [0, 1, 2].map((c) => Math.min(1, (tex[c] * (hemi[c] * 0.5 + [KEYC.r, KEYC.g, KEYC.b][c] * k * 0.45)) + em[c]));
  };
  const sx = (x, z) => (0.5 + 0.5 * (x / (-z * tanH * (W / H)))) * W, sy = (y, z) => (0.5 - 0.5 * (y / (-z * tanH))) * H;
  for (const { t, mat } of tris) {
    // near-plane clip (camera space z < -NEAR is in front)
    let poly = t.map((q) => ({ c: proj(q.p), n: q.n, u: q.u, v: q.v }));
    const out = []; for (let i = 0; i < poly.length; i++) { const A = poly[i], B = poly[(i + 1) % poly.length], ina = A.c.z < -NEAR, inb = B.c.z < -NEAR; if (ina) out.push(A); if (ina !== inb) { const f = (-NEAR - A.c.z) / (B.c.z - A.c.z); out.push({ c: A.c.clone().lerp(B.c, f), n: A.n.clone().lerp(B.n, f).normalize(), u: A.u + (B.u - A.u) * f, v: A.v + (B.v - A.v) * f }); } }
    if (out.length < 3) continue;
    for (let k = 1; k + 1 < out.length; k++) {
      const [P, Q, Rr] = [out[0], out[k], out[k + 1]], pts = [P, Q, Rr].map((s) => ({ x: sx(s.c.x, s.c.z), y: sy(s.c.y, s.c.z), iw: 1 / -s.c.z, s }));
      const [p0, p1, p2] = pts, area = (p1.x - p0.x) * (p2.y - p0.y) - (p2.x - p0.x) * (p1.y - p0.y);
      if (area >= 0) continue;                                                              // back-facing (screen y is down, so front faces are negative here)
      const minx = Math.max(0, Math.floor(Math.min(p0.x, p1.x, p2.x))), maxx = Math.min(W - 1, Math.ceil(Math.max(p0.x, p1.x, p2.x))), miny = Math.max(0, Math.floor(Math.min(p0.y, p1.y, p2.y))), maxy = Math.min(H - 1, Math.ceil(Math.max(p0.y, p1.y, p2.y)));
      for (let y = miny; y <= maxy; y++) for (let x = minx; x <= maxx; x++) {
        const px = x + 0.5, py = y + 0.5, w0 = ((p1.x - px) * (p2.y - py) - (p2.x - px) * (p1.y - py)) / area, w1 = ((p2.x - px) * (p0.y - py) - (p0.x - px) * (p2.y - py)) / area, w2 = 1 - w0 - w1;
        if (w0 < 0 || w1 < 0 || w2 < 0) continue;
        const iw = w0 * p0.iw + w1 * p1.iw + w2 * p2.iw, z = 1 / iw; if (z >= zbuf[y * W + x]) continue;
        const b0 = w0 * p0.iw / iw, b1 = w1 * p1.iw / iw, b2 = w2 * p2.iw / iw, u = b0 * P.u + b1 * Q.u + b2 * Rr.u, v = b0 * P.v + b1 * Q.v + b2 * Rr.v, n = P.n.clone().multiplyScalar(b0).addScaledVector(Q.n, b1).addScaledVector(Rr.n, b2).normalize();
        const col = shade(mat, n, u, v), o = (y * W + x) * 4; zbuf[y * W + x] = z;
        img.data[o] = linToSrgb(col[0]) * 255; img.data[o + 1] = linToSrgb(col[1]) * 255; img.data[o + 2] = linToSrgb(col[2]) * 255;
      }
    }
  }
  // crosshair marks (the HUD's own crosshair is hidden in the sights; these are only here to show where the axis is)
  for (let d = -6; d <= 6; d++) { for (const [x, y] of [[W / 2 + d, H / 2], [W / 2, H / 2 + d]]) { const o = (Math.round(y) * W + Math.round(x)) * 4; img.data[o] = 255; img.data[o + 1] = 40; img.data[o + 2] = 200; } }
  return { img, pose };
}

const names = which === 'all' ? Object.keys(MAKERS) : which.split(',');
const cols = Math.min(names.length, 2), rows = Math.ceil(names.length / cols), sheet = new PNG({ width: W * cols, height: H * rows });
names.forEach((n, i) => { const { img, pose } = render(n); PNG.bitblt(img, sheet, 0, 0, W, H, (i % cols) * W, Math.floor(i / cols) * H); console.log(n.padEnd(11), 'scale', pose.scale.toFixed(3), 'pos', pose.pos.map((x) => x.toFixed(3)).join(','), 'rot', pose.rot.map((x) => x.toFixed(3)).join(',')); });
fs.writeFileSync(outFile, PNG.sync.write(sheet));
console.log('wrote', outFile, sheet.width + 'x' + sheet.height);
