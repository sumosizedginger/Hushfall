// The Harpoon rifle (weapon 4): view model and world pickups. Kept in its own file, like the Riveter driver's.
// Same 4x4 painted atlas as the other guns (cells: 0/1 brass, 2 slate steel, 3 hide, 4 oilskin, 5 black iron, 6 teal, 7 wood).
import * as THREE from 'three';
import { atlas } from './atlasuv.js';
import { ironSights } from './weapon-sights.js';
import { gunKit, lathe, fist } from './gunkit.js';

const PI = Math.PI, gripProfile = [[0.034, -0.09], [0.047, -0.055], [0.05, -0.005], [0.047, 0.045], [0.04, 0.09]];

export function makeHarpoonRifle(tex, gunTex, o = {}) {
  const K = gunKit(tex, gunTex), { G } = K, g = new THREE.Group(), glow = new THREE.MeshLambertMaterial({ map: gunTex ?? tex, emissive: 0x0e5048 }); glow.userData.atlas = 'guns';
  const barrel = G(new THREE.CylinderGeometry(0.021, 0.024, 0.84, 10), 8); barrel.rotation.x = -PI / 2; barrel.position.set(0, 0.005, -0.52); g.add(barrel);                  // black iron
  for (const z of [-0.2, -0.5, -0.8]) { const band = G(new THREE.CylinderGeometry(0.032, 0.032, 0.035, 10), 2); band.rotation.x = -PI / 2; band.position.set(0, 0.005, z); g.add(band); }       // brass bands
  const brake = G(new THREE.CylinderGeometry(0.036, 0.031, 0.09, 10), 15); brake.rotation.x = -PI / 2; brake.position.set(0, 0.005, -0.93); g.add(brake);
  const recv = G(new THREE.BoxGeometry(0.095, 0.115, 0.32), 8); recv.position.set(0, -0.005, 0.02); g.add(recv);
  const rail = G(new THREE.BoxGeometry(0.03, 0.012, 0.3), 2); rail.position.set(0, 0.058, 0.02); g.add(rail);
  // the cable reel under the action, wound with rope: it pays out line when the bolt leaves (spins about x)
  const spin = new THREE.Group(); spin.position.set(0, -0.085, -0.22); g.add(spin);
  const drum = G(new THREE.CylinderGeometry(0.062, 0.062, 0.07, 14), 9); drum.rotation.z = PI / 2; spin.add(drum);
  for (const x of [-0.045, 0.045]) { const fl = G(new THREE.CylinderGeometry(0.078, 0.078, 0.012, 14), 8); fl.rotation.z = PI / 2; fl.position.x = x; spin.add(fl); }
  const hub = G(new THREE.CylinderGeometry(0.014, 0.014, 0.12, 6), 2); hub.rotation.z = PI / 2; spin.add(hub);
  const crank = G(new THREE.BoxGeometry(0.01, 0.07, 0.012), 2); crank.position.set(0.075, 0.035, 0); spin.add(crank);
  // the bolt carriage slides back and forward after every shot (the view drives pump)
  const pump = new THREE.Group(); g.add(pump);
  const carriage = G(new THREE.BoxGeometry(0.05, 0.05, 0.12), 8); carriage.position.set(0.055, 0.03, 0.0); pump.add(carriage);
  const knob = G(new THREE.SphereGeometry(0.02, 8, 6), 2); knob.position.set(0.1, 0.03, 0.04); pump.add(knob);
  // the harpoon in the muzzle: hidden while the action cycles (the view drives bolt), then it seats again
  const bolt = new THREE.Group(); g.add(bolt);
  const shaft = G(new THREE.CylinderGeometry(0.008, 0.008, 0.34, 6), 15); shaft.rotation.x = -PI / 2; shaft.position.set(0, 0.005, -1.0); bolt.add(shaft);
  const head = new THREE.Mesh(atlas(new THREE.ConeGeometry(0.026, 0.085, 6), 11), glow); head.rotation.x = -PI / 2; head.position.set(0, 0.005, -1.215); bolt.add(head);
  for (const a of [0, PI / 2]) { const barb = new THREE.Mesh(atlas(new THREE.BoxGeometry(0.05, 0.004, 0.03), 11), glow); barb.rotation.z = a; barb.position.set(0, 0.005, -1.17); bolt.add(barb); }
  // iron sights (weapon-sights.js): a blade at the muzzle and a peep ring behind; the pose lines the eye up through them
  const sights = ironSights(g, K.gmat, 15, { rearZ: 0.14, frontZ: -0.82, rearBase: 0.064, frontBase: 0.035, line: 0.103, gap: 0.02, post: 0.012, peep: true });
  const grip = lathe(K, 14, gripProfile); grip.position.set(0, -0.125, 0.16); grip.rotation.x = 0.3; g.add(grip);                                                    // leather-wrapped
  const stock = G(new THREE.BoxGeometry(0.065, 0.105, 0.36), 7); stock.position.set(0, -0.045, 0.35); stock.rotation.x = 0.08; g.add(stock);                                    // bleached whaling oak
  const inlay = G(new THREE.BoxGeometry(0.068, 0.04, 0.09), 7); inlay.position.set(0, -0.03, 0.4); g.add(inlay);
  const pad = G(new THREE.BoxGeometry(0.07, 0.125, 0.022), 6); pad.position.set(0, -0.05, 0.54); g.add(pad);
  const fore = lathe(K, 7, [[0.03, -0.13], [0.046, -0.1], [0.05, 0], [0.046, 0.1], [0.03, 0.13]]); fore.rotation.x = PI / 2; fore.position.set(0, -0.075, -0.4); g.add(fore);       // the oak fore-end
  if (o.hands !== false) {
    fist(K, g, { at: [0.0, -0.125, 0.16], rot: [0.3, PI / 2, 0], shoulder: [0.3, -0.85, 0.95], pole: [0.5, -1, 0.2] });
    fist(K, g, { at: [0.0, -0.075, -0.4], rot: [PI / 2, 0, 0], shoulder: [-0.4, -0.8, 0.35], pole: [-0.5, -1, 0.1] });
  }
  const flash = new THREE.Group(); flash.position.z = -1.0; flash.visible = false; g.add(flash);
  flash.add(new THREE.Mesh(new THREE.IcosahedronGeometry(0.1, 0), new THREE.MeshBasicMaterial({ color: 0x6ffff0 })));
  flash.add(new THREE.Mesh(new THREE.IcosahedronGeometry(0.055, 0), new THREE.MeshBasicMaterial({ color: 0xf0fffc })));
  return { group: g, flash, pump, spin, spinAxis: 'x', bolt, adsY: -0.048, sleeveMat: K.sleeveMat, sights };
}

/** world pickups for the weapon and its ammunition */
export function makePickupHarpoon(kind, tex, weaponTex, gunTex) {
  const mat = new THREE.MeshLambertMaterial({ map: tex, emissive: 0x201810 }), g = new THREE.Group();
  const M = (geom, cell) => new THREE.Mesh(atlas(geom, cell), mat);
  if (kind === 'ammo_bolt') {
    const rack = M(new THREE.BoxGeometry(0.34, 0.1, 0.2), 1); rack.position.y = 0.08; g.add(rack);
    for (const z of [-0.06, 0, 0.06]) {
      const shaft = M(new THREE.CylinderGeometry(0.012, 0.012, 0.46, 5), 2); shaft.rotation.z = Math.PI / 2; shaft.position.set(0, 0.17, z); g.add(shaft);
      const head = M(new THREE.ConeGeometry(0.03, 0.09, 6), 6); head.rotation.z = -Math.PI / 2; head.position.set(0.27, 0.17, z); g.add(head);
    }
    const band = M(new THREE.BoxGeometry(0.03, 0.14, 0.22), 5); band.position.set(-0.08, 0.15, 0); g.add(band);
  } else if (kind === 'weapon_harpoon') {
    const gun = makeHarpoonRifle(weaponTex || tex, gunTex, { hands: false }).group; gun.scale.setScalar(0.62); gun.rotation.set(0, Math.PI / 2, 0); gun.position.y = 0.34; g.add(gun);
    const glow = new THREE.Mesh(new THREE.IcosahedronGeometry(0.07, 0), new THREE.MeshBasicMaterial({ color: 0x6ffff0 })); glow.position.y = 0.8; g.add(glow);
  }
  return g;
}
