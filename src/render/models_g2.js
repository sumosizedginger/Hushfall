// Gate 2 set dressing: code-authored low-poly props for the new maps. Static props use the shared cached materials from models.js so they
// merge into a few draw calls; the switch panel keeps its own lamp material because its colour changes with game state.
import * as THREE from 'three';
import { lam, bas, halo, makeRigGrounder } from './models.js';

const box = (w, h, d, mat, x = 0, y = 0, z = 0) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); return m; };
const cyl = (rt, rb, h, seg, mat, x = 0, y = 0, z = 0) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat); m.position.set(x, y, z); return m; };

/** two-wheeled handcart with a slatted bed and long handles */
export function makeCart(woodTex) {
  const g = new THREE.Group(), wood = lam({ map: woodTex }), iron = lam({ color: 0x2a2e33 });
  g.add(box(1.5, 0.12, 0.95, wood, 0, 0.62, 0));
  for (const s of [-1, 1]) g.add(box(1.5, 0.4, 0.08, wood, 0, 0.84, s * 0.44));
  g.add(box(0.08, 0.4, 0.95, wood, -0.72, 0.84, 0));
  for (const s of [-1, 1]) { const w = cyl(0.42, 0.42, 0.08, 10, iron, 0.1, 0.42, s * 0.56); w.rotation.x = Math.PI / 2; g.add(w); g.add(box(1.0, 0.06, 0.06, wood, 1.15, 0.7, s * 0.3)); }
  g.add(box(0.06, 0.06, 0.66, wood, 1.65, 0.7, 0));
  return g;
}
export function makeSack() {
  const g = new THREE.Group(), m = lam({ color: 0xb5a678 }), m2 = lam({ color: 0x9a8c62 });
  for (const [x, y, z, r, mm] of [[-0.25, 0.28, 0, 0.32, m], [0.28, 0.24, 0.08, 0.28, m2], [0.02, 0.6, -0.04, 0.3, m]]) { const s = new THREE.Mesh(new THREE.SphereGeometry(r, 7, 5), mm); s.scale.y = 0.75; s.position.set(x, y, z); g.add(s); }
  return g;
}
export function makeRope() {
  const g = new THREE.Group(), m = lam({ color: 0x8a7a52 });
  for (const [r, y] of [[0.28, 0.07], [0.2, 0.19]]) { const t = new THREE.Mesh(new THREE.TorusGeometry(r, 0.07, 5, 12), m); t.rotation.x = Math.PI / 2; t.position.y = y; g.add(t); }
  return g;
}
export function makeTable(woodTex) {
  const g = new THREE.Group(), wood = lam({ map: woodTex });
  g.add(box(1.5, 0.08, 0.95, wood, 0, 0.82, 0));
  for (const [x, z] of [[-0.65, -0.38], [0.65, -0.38], [-0.65, 0.38], [0.65, 0.38]]) g.add(box(0.08, 0.8, 0.08, wood, x, 0.4, z));
  return g;
}
/** floor-to-ceiling-ish shelving with jars and boxes: blocks sight */
export function makeShelf(woodTex) {
  const g = new THREE.Group(), wood = lam({ map: woodTex }), dark = lam({ color: 0x2a2018 });
  for (const s of [-1, 1]) g.add(box(0.07, 2.2, 0.45, wood, s * 0.62, 1.1, 0));
  for (let i = 0; i < 4; i++) { g.add(box(1.3, 0.05, 0.45, wood, 0, 0.3 + i * 0.6, 0)); }
  g.add(box(1.3, 2.2, 0.03, dark, 0, 1.1, -0.2));
  const cols = [0x5a7a6a, 0xa8874a, 0x7a4a3a, 0x8a8a7a];
  for (let i = 0; i < 4; i++) for (let k = 0; k < 3; k++) g.add(box(0.28, 0.28, 0.3, lam({ color: cols[(i + k) % 4] }), -0.4 + k * 0.4, 0.5 + i * 0.6, 0.02));
  return g;
}
/** a lantern on a short iron post: the survivors' signal on Lamplighter Hill. returns {group, light} */
export function makeLantern() {
  const g = new THREE.Group(), iron = lam({ color: 0x1e2226 });
  g.add(cyl(0.05, 0.08, 2.4, 6, iron, 0, 1.2, 0));
  g.add(box(0.5, 0.05, 0.05, iron, 0.22, 2.42, 0));
  const cage = cyl(0.13, 0.11, 0.3, 6, iron, 0.42, 2.25, 0); g.add(cage);
  const bulb = new THREE.Mesh(new THREE.IcosahedronGeometry(0.09, 0), bas({ color: 0xffd48a })); bulb.position.set(0.42, 2.25, 0); g.add(bulb);          // (it used to be added at the foot of the post: g.add() returns the group, so .position moved the group, and the bulb sat in the floor)
  halo(g, 0.42, 2.25, 0, 0.2, 0xffb060);
  const light = new THREE.PointLight(0xffb060, 70, 14, 2); light.userData.base = 70; light.userData.flicker = 'lamp';
  return { group: g, light };
}
/**
 * A Vael cradle (PT-021 step 2, "the cradle has to show a person in it"): a captive hung from the ceiling by two chains, upright and slumped, in a translucent resin cocoon, a sou'wester knocked back off the head, the arms
 * hanging, the boots dangling, tubes running from the ceiling into the back and the skull, a bronze graft seeded at the shoulder, teal veins down the chest, drips under the feet. The old one was a capsule and a ball.
 * Hangs from local y = 0 downward; the feet end near y = -2.8. Returns { group, light }.
 */
export function makeCradle(atlasTex) {
  const g = new THREE.Group(), iron = lam({ color: 0x1a1d22 }), skin = lam({ color: 0xb59f8a }), coat = lam({ color: 0x8a6c1e }), boot = lam({ color: 0x15130f }), hat = lam({ color: 0xa88a20 }), bronze = lam({ color: 0xb8722e }), glow = bas({ color: 0x3fffe0 });
  const shell = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 8), new THREE.MeshBasicMaterial({ color: 0x40e8d0, transparent: true, opacity: 0.2, depthWrite: false }));
  shell.position.y = -2.0; shell.scale.set(0.46, 1.05, 0.4); g.add(shell);                                         // the cocoon
  for (const s of [-1, 1]) g.add(cyl(0.015, 0.015, 1.1, 4, iron, s * 0.14, -0.55, 0));                               // the chains
  const cap = (r, len, mat, x, y, z, rz = 0) => { const m = new THREE.Mesh(new THREE.CapsuleGeometry(r, len, 4, 8), mat); m.position.set(x, y, z); m.rotation.z = rz; return m; };
  const torso = cap(0.19, 0.42, coat, 0, -1.82, 0); torso.scale.z = 0.72; torso.rotation.x = 0.08; g.add(torso);                      // the oilskin coat, slumped forward
  const head = new THREE.Mesh(new THREE.IcosahedronGeometry(0.13, 1), skin); head.position.set(0, -1.37, 0.07); head.scale.set(0.92, 1.1, 1); g.add(head);
  const brim = cyl(0.2, 0.2, 0.025, 10, hat, 0, -1.2, -0.12); brim.rotation.x = -0.9; g.add(brim);                      // the hat, knocked back
  const crown = cyl(0.1, 0.12, 0.13, 8, hat, 0, -1.25, -0.08); crown.rotation.x = -0.9; g.add(crown);
  for (const s of [-1, 1]) {
    g.add(cap(0.055, 0.5, coat, s * 0.28, -1.85, 0.02, s * 0.1));                                                   // the arms hang
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 5), skin); hand.position.set(s * 0.33, -2.22, 0.03); g.add(hand);
    g.add(cap(0.075, 0.5, coat, s * 0.09, -2.3, 0.02, s * 0.03));                                                   // the legs, together
    g.add(box(0.12, 0.1, 0.22, boot, s * 0.09, -2.72, 0.05));                                                       // the boots
  }
  const cone = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.34, 5), bronze); cone.position.set(0.25, -1.55, 0); cone.rotation.z = -0.5; g.add(cone);
  for (const [x, z, y1] of [[-0.06, -0.22, -1.55], [0.06, -0.22, -1.7], [0.0, -0.17, -1.3], [0.1, -0.2, -1.95]]) {   // tubes from the ceiling into the spine and the skull
    const t = cyl(0.018, 0.018, -y1, 4, iron, x, y1 / 2, z); g.add(t); const tip = new THREE.Mesh(new THREE.SphereGeometry(0.03, 5, 4), glow); tip.position.set(x, y1, z * 0.8); g.add(tip);
  }
  for (const y of [-1.65, -1.85, -2.05]) { const v = new THREE.Mesh(new THREE.SphereGeometry(0.035, 5, 4), glow); v.position.set(0.1, y, 0.2); g.add(v); }       // veins down the chest
  for (const [y, s] of [[-3.2, 0.05], [-3.5, 0.035]]) { const d = new THREE.Mesh(new THREE.SphereGeometry(s, 5, 4), glow); d.position.set(0.04, y, 0.05); g.add(d); }      // drips
  const light = new THREE.PointLight(0x3fffe0, 26, 8, 2); light.userData.base = 26; light.userData.flicker = 'pod';
  return { group: g, light };
}
/** a bronze bell on a timber frame with a glowing core (decor twin of the boss ring nodes) */
export function makeBellNode() {
  const g = new THREE.Group(), wood = lam({ color: 0x3a2c1e }), bronze = lam({ color: 0xb8722e, emissive: 0x2a1408 }), glow = bas({ color: 0x3fffe0 });
  for (const s of [-1, 1]) g.add(box(0.12, 2.4, 0.12, wood, s * 0.6, 1.2, 0));
  g.add(box(1.45, 0.14, 0.14, wood, 0, 2.38, 0));
  const bell = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.5, 0.85, 10), bronze); bell.position.y = 1.55; g.add(bell);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.05, 4, 12), bronze); rim.rotation.x = Math.PI / 2; rim.position.y = 1.13; g.add(rim);
  const core = new THREE.Mesh(new THREE.SphereGeometry(0.11, 6, 5), glow); core.position.y = 1.05; g.add(core);
  return g;
}
/** the wall switch: an iron box with a lever and a lamp. `lamp.material` is unique per panel: the view recolours it (red = waiting, green = used). Panel faces local +z. */
export function makeSwitchPanel() {
  const g = new THREE.Group(), iron = new THREE.MeshLambertMaterial({ color: 0x2a3036 }), brass = new THREE.MeshLambertMaterial({ color: 0xc9a44c, emissive: 0x2a2008 });
  g.add(box(0.5, 0.7, 0.14, iron, 0, 0, 0));
  const slot = box(0.1, 0.4, 0.05, new THREE.MeshLambertMaterial({ color: 0x0a0c0e }), 0, -0.02, 0.08); g.add(slot);
  const lever = box(0.06, 0.32, 0.06, brass, 0, 0.03, 0.12); lever.rotation.x = 0.4; g.add(lever);
  const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 5), new THREE.MeshBasicMaterial({ color: 0xff4a3a })); lamp.position.set(0, 0.26, 0.09); g.add(lamp);
  return { group: g, lamp, lever };
}

/** the enemy-view of a bell node: the bronze bell on its frame, a pulsing teal core; it tips and dims when severed */
export function makeBellNodeEnemy() {
  const model = makeBellNode(), core = model.children.find((c) => c.geometry?.type === 'SphereGeometry');
  const root = new THREE.Group(), rig = new THREE.Group(); root.add(rig); rig.add(model);        // root = world placement (the view owns it); rig = the tip-over
  const ground = makeRigGrounder(root, rig);
  function pose(p) {
    const d = Math.min(1, p.dead || 0); rig.rotation.z = d * 0.5; rig.scale.set(1, 1 - 0.55 * d, 1);
    if (core) core.scale.setScalar(d > 0 ? 0.001 : 1 + 0.25 * Math.sin(p.t * 4) + 0.6 * (p.flash || 0));
    ground();                                                                       // a severed node tips over ON the floor, not into it
  }
  return { root, rig, pose, mat: null };
}
