// The flare cannon (weapon 1) and the Tidewarden scattergun (weapon 2), rebuilt (PT-021 step 3): each in its OWN materials (guns_atlas, via gunkit.js), a body with a silhouette of its own, a fat grip and a fore-end a hand can
// close on, and the finger-ring fists and swept sleeves of the melee weapons instead of two boxes and two cylinders. The contract with the view is unchanged: { group, flash, pump, adsY, sleeveMat, sights }, `rig.sights` for the
// sight-line pose, the muzzle flash group, the pump group that slides. Pass { hands: false } for a gun on the ground (a pickup carries no arms).
//   flare cannon: signal-yellow enamel and brass, a copper bell at the muzzle, a glass flare tube, a walnut grip and fore-end      scattergun: blued steel, brass, walnut; hammers, a rib, a pump
import * as THREE from 'three';
import { atlas } from './atlasuv.js';
import { ironSights, tang } from './weapon-sights.js';
import { gunKit, lathe, fist } from './gunkit.js';

const PI = Math.PI;
/** a grip: a swell, a waist, a flare at the heel (cell = its material), tilted back like a pistol grip */
const gripProfile = [[0.034, -0.09], [0.047, -0.055], [0.05, -0.005], [0.047, 0.045], [0.04, 0.09]];

export function makeFlareCannon(tex, gunTex, o = {}) {
  const K = gunKit(tex, gunTex), { G } = K, g = new THREE.Group(), glassMat = new THREE.MeshLambertMaterial({ map: gunTex ?? tex, emissive: 0x1a8a7a }); glassMat.userData.atlas = 'guns';
  const dbl = K.gmat.clone(); dbl.side = THREE.DoubleSide; dbl.userData.atlas = 'guns';
  const barrel = G(new THREE.CylinderGeometry(0.052, 0.064, 0.56, 10), 2); barrel.rotation.x = -PI / 2; barrel.position.z = -0.27; g.add(barrel);                       // brass
  for (const z of [-0.16, -0.38]) { const b = G(new THREE.TorusGeometry(0.068, 0.012, 5, 12), 2); b.position.z = z; g.add(b); }                                           // brass bands
  const ring = G(new THREE.CylinderGeometry(0.082, 0.066, 0.08, 10), 3); ring.rotation.x = -PI / 2; ring.position.z = -0.6; g.add(ring);                                   // the front-sight seat: copper
  const bell = G(new THREE.CylinderGeometry(0.1, 0.066, 0.16, 12, 1, true), 3, dbl); bell.rotation.x = -PI / 2; bell.position.z = -0.74; g.add(bell);                       // the bell muzzle: it flares past the sight, below the sight line
  const recv = G(new THREE.BoxGeometry(0.17, 0.15, 0.32), 4); recv.position.set(0, -0.02, 0.02); g.add(recv);                                                             // signal-yellow enamel, chipped
  const plate = G(new THREE.BoxGeometry(0.12, 0.025, 0.25), 2); plate.position.set(0, 0.065, 0.02); g.add(plate);
  for (const s of [-1, 1]) { const cheek = G(new THREE.BoxGeometry(0.01, 0.1, 0.2), 2); cheek.position.set(s * 0.09, -0.02, 0.03); g.add(cheek); }                          // brass side plates
  const sights = ironSights(g, K.gmat, 15, { rearZ: 0.1, frontZ: -0.62, rearBase: 0.0775, frontBase: 0.082, line: 0.112 });
  tang(g, K.gmat, 2, { z: 0.145, y: 0.0775, width: 0.11, len: 0.5, drop: 0.45 });
  const tube = new THREE.Mesh(atlas(new THREE.CylinderGeometry(0.026, 0.026, 0.22, 8), 11), glassMat); tube.rotation.x = PI / 2; tube.position.set(-0.11, -0.02, 0.03); g.add(tube);   // the flare tube
  const cap = G(new THREE.CylinderGeometry(0.03, 0.03, 0.02, 8), 2); cap.rotation.x = PI / 2; cap.position.set(-0.11, -0.02, -0.085); g.add(cap);
  const grip = lathe(K, 0, gripProfile); grip.position.set(0, -0.15, 0.12); grip.rotation.x = 0.3; g.add(grip);                                                            // walnut
  const guard = G(new THREE.TorusGeometry(0.042, 0.007, 4, 10, PI), 8); guard.rotation.set(0, PI / 2, PI); guard.position.set(0, -0.085, 0.045); g.add(guard);
  const fore = lathe(K, 0, [[0.032, -0.13], [0.05, -0.1], [0.055, 0], [0.05, 0.1], [0.032, 0.13]]); fore.rotation.x = PI / 2; fore.position.set(0, -0.105, -0.24); g.add(fore);      // a fore-end to cup
  if (o.hands !== false) {
    fist(K, g, { at: [0.0, -0.15, 0.12], rot: [0.3, PI / 2, 0], shoulder: [0.3, -0.85, 0.95], pole: [0.5, -1, 0.2] });
    fist(K, g, { at: [0.0, -0.105, -0.24], rot: [PI / 2, 0, 0], shoulder: [-0.38, -0.8, 0.5], pole: [-0.5, -1, 0.1] });
  }
  const flash = new THREE.Group(); flash.position.z = -0.86; flash.visible = false; g.add(flash);
  flash.add(new THREE.Mesh(new THREE.IcosahedronGeometry(0.13, 0), new THREE.MeshBasicMaterial({ color: 0xffb040 })));
  flash.add(new THREE.Mesh(new THREE.IcosahedronGeometry(0.07, 0), new THREE.MeshBasicMaterial({ color: 0xfff4d0 })));
  return { group: g, flash, pump: null, adsY: -0.067, sleeveMat: K.sleeveMat, sights };
}

/** Double-barrelled pump shotgun: blued steel, walnut, brass; hammers on the receiver, a rib between the barrels, a pump that slides. */
export function makeScattergun(tex, gunTex, o = {}) {
  const K = gunKit(tex, gunTex), { G } = K, g = new THREE.Group();
  for (const x of [-0.032, 0.032]) { const b = G(new THREE.CylinderGeometry(0.029, 0.031, 0.68, 10), 1); b.rotation.x = -PI / 2; b.position.set(x, 0.005, -0.34); g.add(b); }               // blued
  const rib = G(new THREE.BoxGeometry(0.03, 0.012, 0.62), 15); rib.position.set(0, 0.038, -0.33); g.add(rib);
  for (const z of [-0.52, -0.24]) { const band = G(new THREE.BoxGeometry(0.152, 0.078, 0.028), 2); band.position.set(0, 0.005, z); g.add(band); }                               // brass bands
  const recv = G(new THREE.BoxGeometry(0.135, 0.12, 0.23), 1); recv.position.set(0, -0.01, 0.03); g.add(recv);
  for (const s of [-1, 1]) { const plate = G(new THREE.BoxGeometry(0.008, 0.1, 0.18), 2); plate.position.set(s * 0.07, -0.01, 0.04); g.add(plate); const hammer = G(new THREE.BoxGeometry(0.014, 0.045, 0.04), 8); hammer.position.set(s * 0.034, 0.075, 0.13); hammer.rotation.x = 0.5; g.add(hammer); }   // engraved plates, the hammers
  const sights = ironSights(g, K.gmat, 15, { rearZ: 0.1, frontZ: -0.66, rearBase: 0.0475, frontBase: 0.044, line: 0.0825, gap: 0.022 });
  const pump = new THREE.Group(); const fore = lathe(K, 0, [[0.03, -0.11], [0.052, -0.08], [0.058, 0], [0.052, 0.08], [0.03, 0.11]]); fore.rotation.x = PI / 2; fore.scale.set(1, 1, 0.8); fore.position.set(0, -0.058, -0.26); pump.add(fore);
  const grooves = G(new THREE.BoxGeometry(0.11, 0.012, 0.16), 15); grooves.position.set(0, -0.012, -0.26); pump.add(grooves); g.add(pump);                                         // walnut fore-end on its slide
  const stock = G(new THREE.BoxGeometry(0.08, 0.12, 0.38), 0); stock.position.set(0, -0.06, 0.35); stock.rotation.x = 0.12; g.add(stock);
  const butt = G(new THREE.BoxGeometry(0.085, 0.14, 0.02), 8); butt.position.set(0, -0.052, 0.54); butt.rotation.x = 0.12; g.add(butt);                                           // the iron butt plate
  const grip = lathe(K, 0, gripProfile); grip.position.set(0, -0.125, 0.14); grip.rotation.x = 0.3; g.add(grip);
  if (o.hands !== false) {
    fist(K, g, { at: [0.0, -0.125, 0.14], rot: [0.3, PI / 2, 0], shoulder: [0.3, -0.85, 0.95], pole: [0.5, -1, 0.2] });
    fist(K, pump, { at: [0.0, -0.058, -0.26], rot: [PI / 2, 0, 0], shoulder: [-0.38, -0.8, 0.45], pole: [-0.5, -1, 0.1] });
  }
  const flash = new THREE.Group(); flash.position.z = -0.78; flash.visible = false; g.add(flash);
  flash.add(new THREE.Mesh(new THREE.IcosahedronGeometry(0.16, 0), new THREE.MeshBasicMaterial({ color: 0xffa030 })));
  flash.add(new THREE.Mesh(new THREE.IcosahedronGeometry(0.09, 0), new THREE.MeshBasicMaterial({ color: 0xfff0c0 })));
  return { group: g, flash, pump, adsY: -0.048, sleeveMat: K.sleeveMat, sights };
}
