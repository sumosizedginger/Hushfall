// Gate 4 batch 2 (Episode 2): the first Vael-grown creatures, code-authored low-poly rigs wearing the painted pod texture (pod_organic_a): the Drone-Gill (a hovering sac with flapping gills),
// the cradle feeder (a pod on a stand: the Graft-Mother's shield) and the Graft-Mother (a giant pod on the line's end with grafting arms and egg sacs).
// Same contract as the human rigs (src/render/ground-contract.js): the view owns `root` (x, z, yaw, y = the sim's ground); `pose()` writes only `rig`; the lowest vertex is lifted onto the contact plane by the
// grounder. A FLYER adds its hover INSIDE the rig (after grounding), so it is still the pose that floats, never the root; the render census allows exactly `hover` above the ground (and none once it is dead).
import * as THREE from 'three';
import { lam, bas, makeRigGrounder } from './models.js';
import { ENEMIES } from '../engine/defs.js';

const clamp01 = (x) => Math.min(1, Math.max(0, x));
const ease = (t) => t * t * (3 - 2 * t);
const box = (w, h, d, mat, x = 0, y = 0, z = 0) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); return m; };
const podProfile = (k) => [[0.001, -0.95], [0.14, -0.9], [0.26, -0.82], [0.38, -0.66], [0.5, -0.45], [0.55, -0.2], [0.56, 0.1], [0.53, 0.35], [0.44, 0.6], [0.33, 0.78], [0.2, 0.9], [0.1, 0.96], [0.001, 0.98]].map(([x, y]) => new THREE.Vector2(x * k, y * k));

// ---------------------------------------------------------------- Drone-Gill
export function makeDroneGill(podTex) {
  const flesh = lam({ map: podTex, emissive: 0x2a0f30 }), fin = lam({ map: podTex, color: 0x9ad8cc, emissive: 0x0a3a34, side: THREE.DoubleSide }), glow = bas({ color: 0x3fffe0 }), sacMat = new THREE.MeshBasicMaterial({ color: 0xff8a50 });
  const root = new THREE.Group(), rig = new THREE.Group(); root.add(rig);
  const body = new THREE.Group(); body.position.y = 0.78; rig.add(body);
  const sac = new THREE.Mesh(new THREE.SphereGeometry(0.4, 10, 8), flesh); sac.scale.set(1.0, 0.9, 1.25); body.add(sac);                  // the ovoid body, long in the direction of travel (+z)
  const eyes = [-1, 1].map((s) => { const e = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 5), glow); e.position.set(s * 0.17, 0.12, 0.46); body.add(e); return e; });
  const spore = new THREE.Mesh(new THREE.SphereGeometry(0.13, 8, 6), sacMat); spore.position.set(0, -0.2, 0.44); body.add(spore);       // the spore sac under the snout: it swells and glows before a shot
  const gills = [];
  for (const s of [-1, 1]) for (let i = 0; i < 3; i++) {                                                                             // three flat gills a side, flapping
    const pivot = new THREE.Group(); pivot.position.set(s * 0.34, 0.05, 0.26 - i * 0.26); body.add(pivot);
    const f = box(0.3, 0.018, 0.18, fin, s * 0.15, 0, 0); pivot.add(f); gills.push({ pivot, s, i });
  }
  const tendrils = [[-0.15, -0.1], [0.15, -0.1], [-0.08, 0.2], [0.08, -0.35]].map(([x, z]) => {                                       // four trailing tendrils: the lowest vertices of the creature
    const g = new THREE.Group(); g.position.set(x, -0.28, z); body.add(g);
    const t = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.012, 0.52, 5), flesh); t.position.y = -0.26; g.add(t); return g;
  });
  const ground = makeRigGrounder(root, rig), H = ENEMIES.gill.hover;
  /** p: {t, walk, phase, attack 0..1, dead 0..1, flash}. Writes the RIG only. */
  function pose(p) {
    const d = ease(clamp01(p.dead)), w = p.walk, flap = Math.sin(p.t * 16 + p.phase * 0.5) * (0.35 + 0.5 * w) * (1 - d);
    for (const g of gills) { g.pivot.rotation.z = g.s * (0.25 + flap * (1 + g.i * 0.15)) + d * g.s * 0.9; g.pivot.rotation.y = g.s * (g.i - 1) * 0.18; }
    for (let i = 0; i < tendrils.length; i++) tendrils[i].rotation.set(Math.sin(p.t * 3 + i * 1.7) * 0.25 * (1 - d) - w * 0.35, 0, Math.cos(p.t * 2.3 + i) * 0.2 * (1 - d));
    const a = p.attack, swell = a > 0 ? (a < 0.5 ? ease(a / 0.5) : 1 - ease(clamp01((a - 0.5) / 0.4)) * 0.8) : 0;                   // windup: the sac swells, then it spits
    spore.scale.setScalar(1 + swell * 1.6); sacMat.color.setRGB(1, 0.55 + 0.35 * swell, 0.3 + 0.5 * swell);
    sac.scale.set(1.0 + 0.05 * Math.sin(p.t * 5), 0.9 + 0.05 * Math.sin(p.t * 5 + 1), 1.25 - 0.08 * swell);
    for (const e of eyes) e.scale.setScalar(1 + swell * 0.6 + (p.flash || 0) * 0.4);
    rig.rotation.x = -0.25 * w + (a > 0 ? -0.35 * swell : 0) + d * 0.9;                                                               // leans into its travel, rears back to spit, dives nose-first when it dies
    rig.rotation.z = d * 1.3 + Math.sin(p.t * 1.9) * 0.05 * (1 - d);
    ground();                                                                                                                            // the lowest tendril tip on the plane...
    rig.position.y += H * (1 - d) + Math.sin(p.t * 2.2) * 0.05 * (1 - d);                                                              // ...then up by the hover (the census allows exactly this), and down to the floor as it dies
    flesh.emissive.setRGB(0.16 + 0.7 * (p.flash || 0), 0.06 + 0.5 * (p.flash || 0), 0.19 + 0.4 * (p.flash || 0));
  }
  return { root, rig, pose, mat: flesh };
}

// ---------------------------------------------------------------- Cradle feeder (shield node)
export function makeFeeder(podTex) {
  const flesh = lam({ map: podTex, emissive: 0x2a0f30 }), iron = lam({ color: 0x2a2e33 }), glow = bas({ color: 0x3fffe0 }), cable = lam({ map: podTex, color: 0x9a7aa0 });
  const root = new THREE.Group(), rig = new THREE.Group(); root.add(rig);
  const stand = new THREE.Group(); rig.add(stand);
  stand.add(box(1.2, 0.2, 1.2, iron, 0, 0.1, 0));
  for (const [x, z] of [[-0.45, -0.45], [0.45, -0.45], [-0.45, 0.45], [0.45, 0.45]]) stand.add(box(0.1, 0.9, 0.1, iron, x, 0.65, z));
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.05, 6, 16), iron); ring.rotation.x = Math.PI / 2; ring.position.y = 1.1; stand.add(ring);
  const podG = new THREE.Group(); podG.position.y = 1.1; rig.add(podG);
  const pod = new THREE.Mesh(new THREE.LatheGeometry(podProfile(0.9), 14), flesh); pod.position.y = 0; podG.add(pod);
  const core = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 6), glow); core.position.y = 0.1; podG.add(core);
  for (const [dx, dz] of [[0.3, 0.2], [-0.25, 0.3], [0.05, -0.4]]) { const c = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.05, 1.1, 5), cable); c.position.set(dx, -0.7, dz); podG.add(c); }
  const ground = makeRigGrounder(root, rig);
  function pose(p) {
    const d = ease(clamp01(p.dead));
    podG.scale.set(1 + 0.04 * Math.sin(p.t * 3) * (1 - d), (1 - 0.55 * d) * (1 + 0.04 * Math.sin(p.t * 3 + 1)), 1 + 0.04 * Math.sin(p.t * 3) * (1 - d));
    podG.position.y = 1.1 - 0.5 * d; rig.rotation.z = d * 0.12;
    core.scale.setScalar(d > 0 ? 0.001 : 1 + 0.3 * Math.sin(p.t * 4) + 0.7 * (p.flash || 0));
    flesh.emissive.setRGB(0.16 + 0.7 * (p.flash || 0), 0.06 + 0.5 * (p.flash || 0), 0.19 + 0.4 * (p.flash || 0));
    ground();
  }
  return { root, rig, pose, mat: flesh };
}

// ---------------------------------------------------------------- Graft-Mother (boss)
export function makeGraftMother(podTex) {
  const flesh = lam({ map: podTex, emissive: 0x2a0f30 }), dark = lam({ map: podTex, color: 0x6a4a74, emissive: 0x160a1a }), iron = lam({ color: 0x2a2e33 }), glow = bas({ color: 0x3fffe0 }), eggMat = lam({ map: podTex, color: 0xc8a0d8, emissive: 0x4a1a50 });
  const root = new THREE.Group(), rig = new THREE.Group(); root.add(rig);
  const body = new THREE.Group(); body.position.y = 2.1; rig.add(body);
  const shell = new THREE.Mesh(new THREE.LatheGeometry(podProfile(2.15), 24), flesh); body.add(shell);                                // a pod the size of a room: 4.2 m tall, 2.4 m across
  const eyes = []; for (let i = -2; i <= 2; i++) { const e = new THREE.Mesh(new THREE.SphereGeometry(0.1, 4, 3), glow); e.position.set(i * 0.34, 1.05 - Math.abs(i) * 0.08, 1.12 - Math.abs(i) * 0.1); body.add(e); eyes.push(e); }
  const maw = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.12, 4, 10), dark); maw.position.set(0, 0.1, 1.2); maw.scale.set(1, 0.7, 1); body.add(maw);
  const mouth = new THREE.Mesh(new THREE.CircleGeometry(0.45, 12), new THREE.MeshBasicMaterial({ color: 0x1a0620 })); mouth.position.set(0, 0.1, 1.215); mouth.scale.set(1, 0.7, 1); body.add(mouth);
  const rack = new THREE.Group(); rig.add(rack);                                                                                       // the line's cradle rack she hangs in: four legs
  for (const [x, z] of [[-0.9, -0.7], [0.9, -0.7], [-0.9, 0.7], [0.9, 0.7]]) { const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.2, 1.7, 5), iron); leg.position.set(x, 0.85, z); leg.rotation.z = -x * 0.25; rack.add(leg); }
  const arms = [-1, 1].map((s) => {
    const sh = new THREE.Group(); sh.position.set(s * 1.0, 3.0, 0.3); rig.add(sh);
    const ua = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.15, 1.1, 5), dark); ua.position.y = -0.55; sh.add(ua);
    const el = new THREE.Group(); el.position.y = -1.1; sh.add(el);
    const fa = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.09, 1.1, 5), dark); fa.position.y = -0.55; el.add(fa);
    for (let i = -1; i <= 1; i++) { const c = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.45, 4), glow); c.position.set(i * 0.1, -1.3, 0.05); c.rotation.x = Math.PI; el.add(c); }   // grafting needles
    return { sh, el };
  });
  const gills = [-1, 1].flatMap((s) => [0, 1, 2].map((i) => { const pv = new THREE.Group(); pv.position.set(s * 1.05, -0.5 + i * 0.7, -0.4); body.add(pv); { const pl = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 0.5), dark); pl.material = dark; pl.rotation.y = Math.PI / 2; pl.position.set(s * 0.15, 0, -0.2); pv.add(pl); } return { pv, s, i }; }));
  const eggs = [[-1.0, 0.6, 0.7], [1.0, 0.6, 0.7], [0, 1.5, 0.8]].map(([x, y, z]) => { const e = new THREE.Mesh(new THREE.SphereGeometry(0.3, 6, 4), eggMat); e.position.set(x, y, z); body.add(e); return e; });   // the egg sacs the Gills hatch from
  const ground = makeRigGrounder(root, rig, 5);
  function pose(p) {
    const d = ease(clamp01(p.dead)), a = p.attack, br = Math.sin(p.t * 1.4);
    body.scale.set(1 + 0.025 * br * (1 - d), (1 - 0.5 * d) * (1 + 0.02 * Math.sin(p.t * 1.4 + 1)), 1 + 0.025 * br * (1 - d)); body.position.y = 2.1 * (1 - 0.3 * d);
    const up = a > 0 ? (a < 0.4 ? ease(a / 0.4) : 1) : 0, sl = a > 0.4 ? ease(clamp01((a - 0.4) / 0.2)) : 0;                         // windup: both arms rise; the slam brings them down
    arms[0].sh.rotation.x = -2.2 * up + 2.4 * sl + Math.sin(p.t * 0.9) * 0.05; arms[1].sh.rotation.x = -2.2 * up + 2.4 * sl - Math.sin(p.t * 0.9) * 0.05;
    arms[0].sh.rotation.z = -0.1 - d * 0.4; arms[1].sh.rotation.z = 0.1 + d * 0.4; arms[0].el.rotation.x = -0.4 + d * 0.8; arms[1].el.rotation.x = -0.4 + d * 0.8;
    for (const g of gills) g.pv.rotation.z = g.s * (0.35 + Math.sin(p.t * 2 + g.i) * 0.12 * (1 - d));
    for (const e of eggs) e.scale.setScalar(1 + 0.12 * Math.sin(p.t * 3 + e.position.x) + 0.3 * (p.flash || 0) - 0.7 * d);
    for (const e of eyes) e.scale.setScalar(d > 0.1 ? 0.001 : 1 + 0.25 * Math.sin(p.t * 4) + 1.2 * a + (p.flash || 0));
    rig.rotation.x = d * 0.25;
    flesh.emissive.setRGB(0.16 + 0.7 * (p.flash || 0), 0.06 + 0.5 * (p.flash || 0), 0.19 + 0.4 * (p.flash || 0));
    ground();
  }
  return { root, rig, pose, mat: flesh };
}
