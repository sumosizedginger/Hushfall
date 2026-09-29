// Code-authored low-poly 3D models. Every surface wears a p5.brush-painted UV atlas cell / texture.
import * as THREE from 'three';

const INSET = 3 / 256;
/** Remap a primitive's 0..1 UVs into one 64px cell of a 4x4 atlas (cell 0 = top-left of the baked image). */
export function atlas(geom, cell) {
  const uv = geom.attributes.uv, cx = cell % 4, cy = Math.floor(cell / 4);
  const u0 = cx * 0.25 + INSET, u1 = (cx + 1) * 0.25 - INSET;
  const v0 = 1 - (cy + 1) * 0.25 + INSET, v1 = 1 - cy * 0.25 - INSET;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, u0 + uv.getX(i) * (u1 - u0), v0 + uv.getY(i) * (v1 - v0));
  return geom;
}
const ease = (t) => t * t * (3 - 2 * t);
const clamp01 = (x) => Math.min(1, Math.max(0, x));

// ---------------------------------------------------------------- Tollbearer
export function makeTollbearer(atlasTex) {
  const mat = new THREE.MeshLambertMaterial({ map: atlasTex });
  const glowMat = new THREE.MeshBasicMaterial({ color: 0x3fffe0 });
  const M = (g, cell, m = mat) => new THREE.Mesh(atlas(g, cell), m);
  const root = new THREE.Group();
  const hips = new THREE.Group(); hips.position.y = 0.96; root.add(hips);

  const legs = [-1, 1].map((s) => {
    const thigh = new THREE.Group(); thigh.position.set(s * 0.11, 0, 0); hips.add(thigh);
    const tm = M(new THREE.CylinderGeometry(0.09, 0.075, 0.46, 7), 4); tm.position.y = -0.23; thigh.add(tm);
    const shin = new THREE.Group(); shin.position.y = -0.46; thigh.add(shin);
    const sm = M(new THREE.CylinderGeometry(0.07, 0.055, 0.44, 7), 4); sm.position.y = -0.22; shin.add(sm);
    const boot = M(new THREE.BoxGeometry(0.13, 0.09, 0.27), 5); boot.position.set(0, -0.455, 0.05); shin.add(boot);
    return { thigh, shin };
  });

  const spine = new THREE.Group(); spine.position.y = 0.05; hips.add(spine);
  const coat = M(new THREE.CylinderGeometry(0.2, 0.31, 0.78, 8), 0); coat.scale.z = 0.72; coat.position.y = 0.36; spine.add(coat);
  const hem = M(new THREE.CylinderGeometry(0.31, 0.37, 0.24, 8, 1, true), 0); hem.scale.z = 0.72; hem.position.y = -0.09; spine.add(hem);
  const placket = M(new THREE.BoxGeometry(0.07, 0.74, 0.03), 1); placket.position.set(0, 0.36, 0.19); spine.add(placket);

  const arms = [-1, 1].map((s) => {
    const long = s < 0;
    const sh = new THREE.Group(); sh.position.set(s * 0.3, 0.68, 0); spine.add(sh);
    const ua = M(new THREE.CylinderGeometry(0.06, 0.052, 0.36, 7), 0); ua.position.y = -0.18; sh.add(ua);
    const el = new THREE.Group(); el.position.y = -0.36; sh.add(el);
    const fl = long ? 0.5 : 0.4;
    const fa = M(new THREE.CylinderGeometry(0.052, 0.045, fl, 7), 0); fa.position.y = -fl / 2; el.add(fa);
    const hand = M(new THREE.BoxGeometry(0.09, 0.13, 0.05), 8); hand.position.y = -fl - 0.05; el.add(hand);
    return { sh, el };
  });

  const neck = new THREE.Group(); neck.position.set(0, 0.8, 0.02); spine.add(neck);
  const head = new THREE.Group(); head.position.y = 0.1; neck.add(head);
  const skull = M(new THREE.IcosahedronGeometry(0.16, 1), 2); skull.scale.set(0.92, 1.12, 1); skull.position.y = 0.06; head.add(skull);
  const jawPivot = new THREE.Group(); jawPivot.position.set(0, -0.06, 0.03); head.add(jawPivot);
  const jaw = M(new THREE.BoxGeometry(0.13, 0.07, 0.13), 3); jaw.position.set(0, -0.035, 0.05); jawPivot.add(jaw);
  for (const s of [-1, 1]) { const e = new THREE.Mesh(new THREE.SphereGeometry(0.024, 6, 4), glowMat); e.position.set(s * 0.06, 0.08, 0.145); head.add(e); }

  // warden hat (a converted Tide-Warden), shoulder pads, belt
  const brim = M(new THREE.CylinderGeometry(0.27, 0.27, 0.025, 10), 1); brim.position.set(0, 0.2, 0.02); head.add(brim);
  const crown = M(new THREE.CylinderGeometry(0.13, 0.16, 0.15, 10), 1); crown.position.set(0, 0.28, 0.02); head.add(crown);
  for (const s of [-1, 1]) { const pad = M(new THREE.IcosahedronGeometry(0.095, 0), 0); pad.position.set(s * 0.29, 0.7, 0); spine.add(pad); }
  const belt = M(new THREE.TorusGeometry(0.22, 0.022, 4, 10), 5); belt.rotation.x = Math.PI / 2; belt.scale.set(1.15, 0.72, 1); belt.position.y = 0.28; spine.add(belt);

  // the Bell: crystal growth from the right shoulder
  const bell = new THREE.Group(); bell.position.set(0.3, 0.7, -0.02); spine.add(bell);
  const mass = M(new THREE.IcosahedronGeometry(0.11, 0), 6); bell.add(mass);
  const big = M(new THREE.CylinderGeometry(0.015, 0.11, 0.52, 5), 6); big.position.set(0.05, 0.3, 0); big.rotation.z = -0.3; bell.add(big);
  const small = M(new THREE.CylinderGeometry(0.01, 0.07, 0.3, 5), 7); small.position.set(-0.03, 0.2, 0.08); small.rotation.set(0.4, 0, 0.25); bell.add(small);
  const glow = new THREE.Mesh(new THREE.SphereGeometry(0.045, 6, 4), glowMat); glow.position.set(0.02, 0.07, 0.1); bell.add(glow);

  root.traverse((o) => { if (o.isMesh) o.frustumCulled = true; });

  /** p: {t, walk 0..1, phase, attack 0..1 (0 = not attacking), dead 0..1, flash 0..1} */
  function pose(p) {
    const w = p.walk, ph = p.phase, t = p.t;
    const swing = Math.sin(ph) * 0.65 * w;
    legs[0].thigh.rotation.x = swing; legs[1].thigh.rotation.x = -swing;
    legs[0].shin.rotation.x = 0.12 + Math.max(0, Math.cos(ph)) * 0.8 * w;
    legs[1].shin.rotation.x = 0.12 + Math.max(0, -Math.cos(ph)) * 0.8 * w;
    hips.position.y = 0.96 - 0.02 + Math.abs(Math.sin(ph)) * 0.035 * w;
    spine.rotation.x = 0.2 + 0.08 * w + Math.sin(t * 1.3) * 0.02;
    spine.rotation.z = Math.sin(ph) * 0.06 * w + Math.sin(t * 0.9) * 0.015;
    spine.rotation.y = -Math.sin(ph) * 0.12 * w;
    arms[0].sh.rotation.x = -Math.sin(ph) * 0.4 * w + Math.sin(t * 1.1) * 0.05; arms[0].sh.rotation.z = -0.08;
    arms[1].sh.rotation.x = Math.sin(ph) * 0.4 * w + Math.sin(t * 1.3 + 1) * 0.05; arms[1].sh.rotation.z = 0.08;
    arms[0].el.rotation.x = -0.12 - 0.1 * w; arms[1].el.rotation.x = -0.2;
    let a = p.attack, bellPulse = 1 + 0.2 * Math.sin(t * 3);
    if (a > 0) {                                  // readable tell: raise the arm, bell flares, slam
      const raise = a < 0.55 ? ease(a / 0.55) : 1, slam = a < 0.55 ? 0 : ease(clamp01((a - 0.55) / 0.12)), rec = a < 0.7 ? 0 : ease(clamp01((a - 0.7) / 0.3));
      arms[1].sh.rotation.x = -2.5 * raise + (2.6 * slam) * (1 - rec) + (rec ? 0 : 0);
      arms[1].el.rotation.x = -0.6 * raise * (1 - slam);
      spine.rotation.x += 0.35 * slam * (1 - rec) - 0.15 * raise * (1 - slam);
      bellPulse += 1.6 * raise * (1 - rec);
      jawPivot.rotation.x = 0.7 * raise;
    } else jawPivot.rotation.x = 0.15 + 0.1 * Math.sin(t * 2);
    head.rotation.x = 0.35 + Math.sin(t * 0.8) * 0.04; head.rotation.z = Math.sin(t * 0.6) * 0.05;
    glow.scale.setScalar(bellPulse);
    // death: topple backwards about the feet
    const d = ease(clamp01(p.dead));
    root.rotation.x = -d * 1.5 + (p.dead > 0.85 ? Math.sin((p.dead - 0.85) * 40) * 0.02 : 0);
    root.position.y = d * 0.12;
    mat.emissive.setRGB(0.7 * p.flash, 0.55 * p.flash, 0.4 * p.flash);
  }
  return { root, pose, mat };
}

// ------------------------------------------------------------- Flare cannon
export function makeFlareCannon(tex) {
  const mat = new THREE.MeshLambertMaterial({ map: tex });
  const glassMat = new THREE.MeshLambertMaterial({ map: tex, emissive: 0x1a6a60 });
  const M = (g, cell, m = mat) => new THREE.Mesh(atlas(g, cell), m);
  const g = new THREE.Group();
  const barrel = M(new THREE.CylinderGeometry(0.05, 0.062, 0.6, 8), 0); barrel.rotation.x = -Math.PI / 2; barrel.position.z = -0.3; g.add(barrel);
  const ring = M(new THREE.CylinderGeometry(0.082, 0.066, 0.08, 8), 1); ring.rotation.x = -Math.PI / 2; ring.position.z = -0.62; g.add(ring);
  for (const z of [-0.2, -0.4]) { const b = M(new THREE.TorusGeometry(0.066, 0.011, 4, 10), 5); b.position.z = z; g.add(b); }
  const recv = M(new THREE.BoxGeometry(0.17, 0.15, 0.32), 2); recv.position.set(0, -0.02, 0.02); g.add(recv);
  const plate = M(new THREE.BoxGeometry(0.12, 0.025, 0.25), 2); plate.position.set(0, 0.065, 0.02); g.add(plate);
  const tube = new THREE.Mesh(atlas(new THREE.CylinderGeometry(0.024, 0.024, 0.2, 6), 6), glassMat); tube.rotation.x = Math.PI / 2; tube.position.set(-0.105, -0.02, 0.03); g.add(tube);
  const grip = M(new THREE.BoxGeometry(0.06, 0.18, 0.075), 7); grip.position.set(0, -0.15, 0.12); grip.rotation.x = 0.3; g.add(grip);
  const handR = M(new THREE.BoxGeometry(0.085, 0.1, 0.11), 3); handR.position.set(0.005, -0.19, 0.13); g.add(handR);
  const handL = M(new THREE.BoxGeometry(0.1, 0.085, 0.14), 3); handL.position.set(-0.005, -0.1, -0.25); g.add(handL);
  const sleeveR = M(new THREE.CylinderGeometry(0.06, 0.075, 0.42, 7), 4); sleeveR.position.set(0.09, -0.3, 0.34); sleeveR.rotation.x = -1.15; g.add(sleeveR);
  const sleeveL = M(new THREE.CylinderGeometry(0.06, 0.075, 0.5, 7), 4); sleeveL.position.set(-0.14, -0.22, 0.0); sleeveL.rotation.set(-1.1, 0, 0.55); g.add(sleeveL);
  // muzzle flash: real geometry, shown briefly
  const flash = new THREE.Group(); flash.position.z = -0.72; flash.visible = false; g.add(flash);
  flash.add(new THREE.Mesh(new THREE.IcosahedronGeometry(0.13, 0), new THREE.MeshBasicMaterial({ color: 0xffb040 })));
  flash.add(new THREE.Mesh(new THREE.IcosahedronGeometry(0.07, 0), new THREE.MeshBasicMaterial({ color: 0xfff4d0 })));
  return { group: g, flash };
}

// -------------------------------------------------------------------- props
export function makeCrate(tex) { return new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.1, 1.1), new THREE.MeshLambertMaterial({ map: tex })); }
export function makeBarrel(tex) { return new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.34, 1.0, 10), new THREE.MeshLambertMaterial({ map: tex, color: 0xb8a890 })); }
export function makePillar(tex, H) { const m = new THREE.Mesh(new THREE.BoxGeometry(1.1, H, 1.1), new THREE.MeshLambertMaterial({ map: tex })); m.position.y = H / 2; const g = new THREE.Group(); g.add(m); return g; }

export function makePod(tex, H) {
  const group = new THREE.Group();
  const prof = [[0.001, -0.95], [0.26, -0.82], [0.5, -0.45], [0.56, 0.1], [0.44, 0.6], [0.2, 0.9], [0.001, 0.98]].map(([x, y]) => new THREE.Vector2(x, y));
  const body = new THREE.Mesh(new THREE.LatheGeometry(prof, 10), new THREE.MeshLambertMaterial({ map: tex, emissive: 0x2a0f30 }));
  body.position.y = -1.9; group.add(body);
  const cable = new THREE.MeshLambertMaterial({ map: tex, color: 0x9a7aa0 });
  for (const [dx, dz] of [[0.18, 0.1], [-0.15, 0.14], [0.02, -0.2]]) { const c = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.045, 1.0, 5), cable); c.position.set(dx, -0.5, dz); group.add(c); }
  for (let i = 0; i < 6; i++) {                        // neural taps
    const a = i * 1.047, spike = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.28, 5), new THREE.MeshBasicMaterial({ color: 0x3fd6c0 }));
    spike.position.set(Math.cos(a) * 0.55, -1.7 + (i % 2) * 0.4, Math.sin(a) * 0.55); spike.rotation.z = -Math.cos(a) * 1.2; spike.rotation.x = Math.sin(a) * 1.2; group.add(spike);
  }
  const light = new THREE.PointLight(0x3fffe0, 40, 10, 2);
  light.userData.base = 40; light.userData.flicker = 'pod';
  return { group, light };
}

export function makeLamp(H) {
  const group = new THREE.Group();
  const shade = new THREE.Mesh(new THREE.ConeGeometry(0.34, 0.3, 8, 1, true), new THREE.MeshLambertMaterial({ color: 0x2f3a3a, side: THREE.DoubleSide }));
  shade.position.y = -0.85; group.add(shade);
  const bulb = new THREE.Mesh(new THREE.IcosahedronGeometry(0.1, 0), new THREE.MeshBasicMaterial({ color: 0xffd48a })); bulb.position.y = -0.92; group.add(bulb);
  const wire = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.7, 4), new THREE.MeshBasicMaterial({ color: 0x14100c })); wire.position.y = -0.35; group.add(wire);
  const light = new THREE.PointLight(0xffb060, 110, 16, 2);
  light.userData.base = 110; light.userData.flicker = 'lamp';
  return { group, light };
}

export function makeLampPost() {
  const group = new THREE.Group();
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.11, 3.2, 6), new THREE.MeshLambertMaterial({ color: 0x24302f })); pole.position.y = 1.6; group.add(pole);
  const cage = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.14, 0.34, 6), new THREE.MeshLambertMaterial({ color: 0x1a201f })); cage.position.y = 3.3; group.add(cage);
  const bulb = new THREE.Mesh(new THREE.IcosahedronGeometry(0.13, 0), new THREE.MeshBasicMaterial({ color: 0xffe0a0 })); bulb.position.y = 3.3; group.add(bulb);
  const light = new THREE.PointLight(0xffc880, 120, 20, 2);
  light.userData.base = 120; light.userData.flicker = 'lamp';
  return { group, light };
}
