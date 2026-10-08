// The Charge-arc lamp (weapon 5): view model and world pickups. Own file, like the other new guns'.
// Same 4x4 painted atlas as the other guns (cells: 0/1 brass, 2 slate steel, 3 hide, 4 oilskin, 5 black iron, 6 teal, 7 wood).
import * as THREE from 'three';
import { atlas } from './atlasuv.js';
import { ironSights } from './weapon-sights.js';
import { gunKit, lathe, fist } from './gunkit.js';

const PI = Math.PI, gripProfile = [[0.034, -0.09], [0.047, -0.055], [0.05, -0.005], [0.047, 0.045], [0.04, 0.09]];

export function makeArcLamp(tex, gunTex, o = {}) {
  const K = gunKit(tex, gunTex), { G } = K, g = new THREE.Group();
  // the housing: a polished lantern body wound with copper coil, the glass bulb in a cage at the front on porcelain insulators, two electrodes beyond it
  const body = G(new THREE.CylinderGeometry(0.058, 0.064, 0.34, 12), 10); body.rotation.x = -PI / 2; body.position.set(0, 0, -0.08); g.add(body);
  for (const z of [-0.2, -0.12, -0.04, 0.04]) { const ring = G(new THREE.TorusGeometry(0.067, 0.014, 6, 14), 12); ring.position.set(0, 0, z); g.add(ring); }                       // copper coil
  const collar = G(new THREE.CylinderGeometry(0.072, 0.072, 0.05, 12), 13); collar.rotation.x = -PI / 2; collar.position.set(0, 0, -0.27); g.add(collar);                          // porcelain insulator
  const core = new THREE.Mesh(new THREE.IcosahedronGeometry(0.05, 1), new THREE.MeshBasicMaterial({ color: 0x6ffff0 })); core.position.set(0, 0, -0.35); g.add(core);               // the bulb: it breathes, and flares when the arc fires
  for (let i = 0; i < 4; i++) { const a = i * PI / 2 + PI / 4, rod = G(new THREE.CylinderGeometry(0.006, 0.006, 0.17, 4), 15); rod.rotation.x = -PI / 2; rod.position.set(Math.cos(a) * 0.062, Math.sin(a) * 0.062, -0.35); g.add(rod); }
  const cap = G(new THREE.CylinderGeometry(0.01, 0.06, 0.05, 10), 10); cap.rotation.x = -PI / 2; cap.position.set(0, 0, -0.46); g.add(cap);
  for (const x of [-0.028, 0.028]) { const el = G(new THREE.CylinderGeometry(0.007, 0.01, 0.2, 6), 15); el.rotation.x = -PI / 2; el.position.set(x, 0, -0.58); g.add(el); const tip = new THREE.Mesh(new THREE.IcosahedronGeometry(0.014, 0), new THREE.MeshBasicMaterial({ color: 0xbafff2 })); tip.position.set(x, 0, -0.69); g.add(tip); }
  // the charge cell on the left, a brass drum with a glass band
  const cell = G(new THREE.CylinderGeometry(0.062, 0.062, 0.13, 12), 10); cell.rotation.z = PI / 2; cell.position.set(-0.125, -0.02, 0.02); g.add(cell);
  const band = new THREE.Mesh(atlas(new THREE.CylinderGeometry(0.065, 0.065, 0.03, 12), 11), new THREE.MeshLambertMaterial({ map: gunTex ?? tex, emissive: 0x168a7c })); band.material.userData.atlas = 'guns'; band.rotation.z = PI / 2; band.position.set(-0.125, -0.02, 0.02); g.add(band);
  const sights = ironSights(g, K.gmat, 15, { rearZ: 0.02, frontZ: -0.46, rearBase: 0.078, frontBase: 0.06, line: 0.113, gap: 0.024 });
  const conduit = G(new THREE.CylinderGeometry(0.02, 0.02, 0.3, 8), 12); conduit.rotation.x = PI / 2 + 0.1; conduit.position.set(0, -0.035, 0.27); g.add(conduit);                      // a copper conduit runs back to the shoulder
  const butt = G(new THREE.CylinderGeometry(0.05, 0.05, 0.03, 10), 14); butt.rotation.x = PI / 2; butt.position.set(0, -0.045, 0.43); g.add(butt);
  const grip = lathe(K, 14, gripProfile); grip.position.set(0, -0.13, 0.12); grip.rotation.x = 0.3; g.add(grip);                                                              // stitched leather
  const handle = lathe(K, 14, [[0.03, -0.09], [0.043, -0.06], [0.046, 0], [0.043, 0.06], [0.03, 0.09]]); handle.position.set(0, -0.12, -0.16); g.add(handle);                   // a carrying handle under the housing
  const strap = G(new THREE.TorusGeometry(0.06, 0.008, 4, 12, PI), 10); strap.rotation.set(0, PI / 2, 0); strap.position.set(0, -0.045, -0.16); g.add(strap);
  if (o.hands !== false) {
    fist(K, g, { at: [0.0, -0.13, 0.12], rot: [0.3, PI / 2, 0], shoulder: [0.3, -0.85, 0.95], pole: [0.5, -1, 0.2] });
    fist(K, g, { at: [0.0, -0.12, -0.16], rot: [0, -PI / 2, 0], shoulder: [-0.4, -0.8, 0.5], pole: [-0.5, -1, 0.1] });
  }
  const flash = new THREE.Group(); flash.position.z = -0.7; flash.visible = false; g.add(flash);
  flash.add(new THREE.Mesh(new THREE.IcosahedronGeometry(0.09, 0), new THREE.MeshBasicMaterial({ color: 0x6ffff0 })));
  flash.add(new THREE.Mesh(new THREE.IcosahedronGeometry(0.05, 0), new THREE.MeshBasicMaterial({ color: 0xf0fffc })));
  return { group: g, flash, pump: null, core, adsY: -0.048, sleeveMat: K.sleeveMat, sights };
}

/** world pickups for the lamp and its charge cells */
export function makePickupArc(kind, tex, weaponTex, gunTex) {
  const mat = new THREE.MeshLambertMaterial({ map: tex, emissive: 0x201810 }), g = new THREE.Group();
  const M = (geom, cell) => new THREE.Mesh(atlas(geom, cell), mat);
  if (kind === 'ammo_cell') {
    for (const [x, z] of [[-0.09, 0], [0.09, 0.02]]) {
      const can = M(new THREE.CylinderGeometry(0.07, 0.07, 0.3, 9), 1); can.position.set(x, 0.17, z); g.add(can);
      const band = M(new THREE.CylinderGeometry(0.074, 0.074, 0.07, 9), 6); band.position.set(x, 0.2, z); g.add(band);
      const cap = M(new THREE.CylinderGeometry(0.03, 0.04, 0.05, 7), 5); cap.position.set(x, 0.345, z); g.add(cap);
    }
    const glow = new THREE.Mesh(new THREE.IcosahedronGeometry(0.035, 0), new THREE.MeshBasicMaterial({ color: 0x6ffff0 })); glow.position.y = 0.5; g.add(glow);
  } else if (kind === 'weapon_arc') {
    const gun = makeArcLamp(weaponTex || tex, gunTex, { hands: false }).group; gun.scale.setScalar(0.7); gun.rotation.set(0, Math.PI / 2, 0); gun.position.y = 0.34; g.add(gun);
    const glow = new THREE.Mesh(new THREE.IcosahedronGeometry(0.07, 0), new THREE.MeshBasicMaterial({ color: 0x6ffff0 })); glow.position.y = 0.8; g.add(glow);
  }
  return g;
}
