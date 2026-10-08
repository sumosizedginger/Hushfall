// The Riveter driver (weapon 3): view model and world pickups. Kept in its own file so models.js does not import it.
import * as THREE from 'three';
import { atlas } from './atlasuv.js';
import { ironSights } from './weapon-sights.js';
import { gunKit, lathe, fist } from './gunkit.js';

const PI = Math.PI, gripProfile = [[0.034, -0.09], [0.047, -0.055], [0.05, -0.005], [0.047, 0.045], [0.04, 0.09]];       // a swelled grip (cell given per gun)

export function makeRivetDriver(tex, gunTex, o = {}) {
  const K = gunKit(tex, gunTex), { G } = K, g = new THREE.Group();
  const recv = G(new THREE.BoxGeometry(0.11, 0.115, 0.36), 5); recv.position.set(0, -0.005, 0.02); g.add(recv);                                                  // stamped, perforated sheet steel
  const spine = G(new THREE.BoxGeometry(0.06, 0.02, 0.3), 15); spine.position.set(0, 0.062, 0.03); g.add(spine);
  const shroud = G(new THREE.CylinderGeometry(0.042, 0.048, 0.34, 10), 15); shroud.rotation.x = -PI / 2; shroud.position.set(0, 0.0, -0.3); g.add(shroud);            // gunmetal
  for (const z of [-0.18, -0.34, -0.46]) { const r = G(new THREE.TorusGeometry(0.05, 0.007, 4, 10), 2); r.position.z = z; g.add(r); }                              // brass bands
  const spin = new THREE.Group(); spin.position.set(0, 0.0, -0.5); g.add(spin);                                                                                  // the barrel cluster turns while it fires
  for (let i = 0; i < 4; i++) { const a = i * PI / 2, b = G(new THREE.CylinderGeometry(0.012, 0.012, 0.16, 6), 8); b.rotation.x = -PI / 2; b.position.set(Math.cos(a) * 0.026, Math.sin(a) * 0.026, -0.05); spin.add(b); }
  const ring = G(new THREE.TorusGeometry(0.036, 0.008, 4, 10), 2); ring.position.z = -0.04; spin.add(ring);
  const drum = G(new THREE.CylinderGeometry(0.078, 0.078, 0.11, 12), 5); drum.rotation.z = PI / 2; drum.position.set(-0.118, -0.015, 0.03); g.add(drum);            // side-mounted so the sights stay clear
  const drumCap = G(new THREE.CylinderGeometry(0.03, 0.03, 0.14, 8), 2); drumCap.rotation.z = PI / 2; drumCap.position.set(-0.118, -0.015, 0.03); g.add(drumCap);
  const hose = G(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(-0.118, -0.06, 0.06), new THREE.Vector3(-0.2, -0.13, 0.2), new THREE.Vector3(-0.22, -0.3, 0.46), new THREE.Vector3(-0.12, -0.55, 0.9)]), 14, 0.016, 6), 6); g.add(hose);   // the feed hose runs back and away
  const sights = ironSights(g, K.gmat, 15, { rearZ: 0.12, frontZ: -0.55, rearBase: 0.0475, frontBase: 0.045, line: 0.0825, gap: 0.022 });
  const grip = lathe(K, 6, gripProfile); grip.position.set(0, -0.125, 0.14); grip.rotation.x = 0.3; g.add(grip);                                                    // black rubber, checkered
  const guard = G(new THREE.TorusGeometry(0.042, 0.007, 4, 10, PI), 8); guard.rotation.set(0, PI / 2, PI); guard.position.set(0, -0.07, 0.05); g.add(guard);
  const handle = lathe(K, 6, [[0.03, -0.1], [0.045, -0.07], [0.048, 0], [0.045, 0.07], [0.03, 0.1]]); handle.position.set(0, -0.12, -0.3); g.add(handle);              // a vertical fore-handle under the shroud
  for (const s of [-1, 1]) { const t = G(new THREE.CylinderGeometry(0.009, 0.009, 0.3, 5), 15); t.rotation.x = PI / 2 + 0.12; t.position.set(s * 0.03, -0.045, 0.37); g.add(t); }   // a skeletal stock
  const pad = G(new THREE.BoxGeometry(0.075, 0.1, 0.025), 6); pad.position.set(0, -0.06, 0.53); pad.rotation.x = 0.12; g.add(pad);
  if (o.hands !== false) {
    fist(K, g, { at: [0.0, -0.125, 0.14], rot: [0.3, PI / 2, 0], shoulder: [0.3, -0.85, 0.95], pole: [0.5, -1, 0.2] });
    fist(K, g, { at: [0.0, -0.12, -0.3], rot: [0, -PI / 2, 0], shoulder: [-0.4, -0.8, 0.5], pole: [-0.5, -1, 0.1] });
  }
  const flash = new THREE.Group(); flash.position.z = -0.62; flash.visible = false; g.add(flash);
  flash.add(new THREE.Mesh(new THREE.IcosahedronGeometry(0.08, 0), new THREE.MeshBasicMaterial({ color: 0xffa030 })));
  flash.add(new THREE.Mesh(new THREE.IcosahedronGeometry(0.045, 0), new THREE.MeshBasicMaterial({ color: 0xfff0c0 })));
  return { group: g, flash, pump: null, spin, adsY: -0.048, sleeveMat: K.sleeveMat, sights };
}

/** world pickups for the new weapon and its ammo */
export function makePickupRivet(kind, tex, weaponTex, gunTex) {
  const mat = new THREE.MeshLambertMaterial({ map: tex, emissive: 0x201810 }), g = new THREE.Group();
  const M = (geom, cell) => new THREE.Mesh(atlas(geom, cell), mat);
  if (kind === 'ammo_rivet') {
    const box = M(new THREE.BoxGeometry(0.34, 0.16, 0.22), 1); box.position.y = 0.1; g.add(box);
    for (let i = -2; i <= 2; i++) { const r = M(new THREE.CylinderGeometry(0.018, 0.018, 0.14, 5), 4); r.rotation.z = Math.PI / 2; r.position.set(0, 0.22, i * 0.05); g.add(r); }
  } else if (kind === 'weapon_rivet') {
    const gun = makeRivetDriver(weaponTex || tex, gunTex, { hands: false }).group; gun.scale.setScalar(0.55); gun.rotation.set(0, Math.PI / 2, 0); gun.position.y = 0.3; g.add(gun);
    const glow = new THREE.Mesh(new THREE.IcosahedronGeometry(0.06, 0), new THREE.MeshBasicMaterial({ color: 0xffe08a })); glow.position.y = 0.62; g.add(glow);
  }
  return g;
}
