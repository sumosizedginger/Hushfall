// The Vael tuning-fork (weapon 9, PT-022): the gravity tool. view model and its world pickup. Everything the Vael make is an instrument, and a recovered tuning rig is the one that moves things: a brass resonator on a leather grip, a copper-wound
// coil, a hammered copper charge drum, and two long tines that sing, a teal orb between them that swells as the beam takes hold. guns_atlas cells (gunkit.js): 3 hammered copper, 8 iron, 10 polished lantern brass, 11 teal glass, 12 copper coil, 14 leather, 15 gunmetal.
// `tick(st)` is the view's per-frame hook for a rig that animates a part of itself (the tines and the orb): st = { t, beam 0..1 (the tractor is on), hold 0|1 (it holds something), punt 0..1 (the shock just went out) }.
import * as THREE from 'three';
import { atlas } from './atlasuv.js';
import { gunKit, lathe, fist } from './gunkit.js';

const PI = Math.PI;

export function makeFork(tex, gunTex, o = {}) {
  const K = gunKit(tex, gunTex), { G } = K, g = new THREE.Group(), glow = new THREE.MeshLambertMaterial({ map: gunTex ?? tex, emissive: 0x168a7c }); glow.userData.atlas = 'guns';
  const housing = G(new THREE.CylinderGeometry(0.062, 0.068, 0.3, 14), 10); housing.rotation.x = -PI / 2; housing.position.set(0, 0.0, -0.02); g.add(housing);                       // the resonator: a polished brass drum
  for (const z of [-0.12, -0.06, 0.0, 0.06]) { const ring = G(new THREE.TorusGeometry(0.07, 0.013, 6, 16), 12); ring.position.set(0, 0.0, z); g.add(ring); }                       // the copper coil
  const cap = G(new THREE.CylinderGeometry(0.052, 0.07, 0.07, 12), 8); cap.rotation.x = -PI / 2; cap.position.set(0, 0.0, 0.18); g.add(cap);                                      // the iron end cap
  const root = G(new THREE.BoxGeometry(0.1, 0.05, 0.07), 15); root.position.set(0, 0.0, -0.2); g.add(root);                                                                         // where the two tines meet
  // the tines: each a long brass bar with a teal glass tip, splayed a little; they hum (tick drives their sway)
  const tines = [-1, 1].map((s) => {
    const t = new THREE.Group(); t.position.set(s * 0.05, 0.0, -0.22); t.rotation.y = -s * 0.09; g.add(t);                                                              // splayed: a tine on the left leans left
    const bar = G(new THREE.CylinderGeometry(0.02, 0.027, 0.56, 10), 10); bar.rotation.x = -PI / 2; bar.position.set(0, 0, -0.28); t.add(bar);
    const tip = new THREE.Mesh(atlas(new THREE.CylinderGeometry(0.03, 0.02, 0.12, 10), 11), glow); tip.rotation.x = -PI / 2; tip.position.set(0, 0, -0.6); t.add(tip);
    return t;
  });
  const tie = G(new THREE.TorusGeometry(0.085, 0.01, 5, 14), 2); tie.rotation.y = PI / 2; tie.position.set(0, 0, -0.5); tie.scale.set(1, 1, 0.7); g.add(tie);                         // a brass tie ring between the tines
  const core = new THREE.Mesh(new THREE.IcosahedronGeometry(0.05, 1), new THREE.MeshBasicMaterial({ color: 0x6ffff0 })); core.position.set(0, 0.0, -0.5); g.add(core);               // the orb the beam is made in
  const drum = G(new THREE.CylinderGeometry(0.058, 0.058, 0.12, 12), 3); drum.rotation.z = PI / 2; drum.position.set(-0.11, -0.025, 0.04); g.add(drum);                              // a hammered copper charge drum on the left
  const band = new THREE.Mesh(atlas(new THREE.CylinderGeometry(0.061, 0.061, 0.026, 12), 11), glow); band.rotation.z = PI / 2; band.position.set(-0.11, -0.025, 0.04); g.add(band);
  const grip = lathe(K, 14, [[0.034, -0.09], [0.047, -0.055], [0.05, -0.005], [0.047, 0.045], [0.04, 0.09]]); grip.position.set(0, -0.125, 0.12); grip.rotation.x = 0.3; g.add(grip);       // stitched leather
  const bracket = G(new THREE.BoxGeometry(0.04, 0.06, 0.06), 8); bracket.position.set(0, -0.06, -0.12); g.add(bracket);
  const handle = lathe(K, 14, [[0.03, -0.09], [0.043, -0.06], [0.046, 0], [0.043, 0.06], [0.03, 0.09]]); handle.position.set(0, -0.125, -0.12); g.add(handle);                         // the fore-handle
  const strap = G(new THREE.TorusGeometry(0.07, 0.008, 4, 12, PI), 14); strap.rotation.set(0, PI / 2, 0); strap.position.set(0, -0.04, 0.0); g.add(strap);
  if (o.hands !== false) {
    fist(K, g, { at: [0.0, -0.125, 0.12], rot: [0.3, PI / 2, 0], shoulder: [0.3, -0.85, 0.95], pole: [0.5, -1, 0.2] });
    fist(K, g, { at: [0.0, -0.125, -0.12], rot: [0, -PI / 2, 0], shoulder: [-0.4, -0.8, 0.5], pole: [-0.5, -1, 0.1] });
  }
  const flash = new THREE.Group(); flash.position.z = -0.7; flash.visible = false; g.add(flash);                                                                                     // the punt's shock: two rings and a bright core
  const ringMat = new THREE.MeshBasicMaterial({ color: 0xbafff2, transparent: true, opacity: 0.8, depthWrite: false, side: THREE.DoubleSide });
  for (const r of [0.12, 0.2]) { const ring = new THREE.Mesh(new THREE.TorusGeometry(r, 0.012, 4, 20), ringMat); flash.add(ring); }
  flash.add(new THREE.Mesh(new THREE.IcosahedronGeometry(0.07, 0), new THREE.MeshBasicMaterial({ color: 0xf0fffc })));
  const rig = { group: g, flash, pump: null, core, adsY: -0.048, sleeveMat: K.sleeveMat, tines };
  rig.tick = (st) => {                                                                                                                                                                 // the tines hum, harder in the beam; the orb swells when it holds something
    const beam = st.beam ?? 0, hum = Math.sin((st.t ?? 0) * 46) * (0.012 + 0.05 * beam) + Math.sin((st.t ?? 0) * 71) * 0.02 * beam;
    tines.forEach((t, i) => { t.rotation.y = (i ? -1 : 1) * (0.09 + 0.03 * beam) + hum * (i ? 1 : -1); t.rotation.x = hum * 0.4; });
    core.scale.setScalar(1 + 0.12 * Math.sin((st.t ?? 0) * 9) + 0.5 * beam + 0.5 * (st.hold ?? 0) + 1.4 * (st.punt ?? 0));
  };
  return rig;
}

/** world pickup: the tuning rig lying where it was found */
export function makePickupFork(kind, tex, weaponTex, gunTex) {
  const g = new THREE.Group();
  if (kind === 'weapon_fork') {
    const gun = makeFork(weaponTex || tex, gunTex, { hands: false }).group; gun.scale.setScalar(0.6); gun.rotation.set(0, Math.PI / 2, 0); gun.position.y = 0.34; g.add(gun);
    const glow = new THREE.Mesh(new THREE.IcosahedronGeometry(0.07, 0), new THREE.MeshBasicMaterial({ color: 0x6ffff0 })); glow.position.y = 0.8; g.add(glow);
  }
  return g;
}
