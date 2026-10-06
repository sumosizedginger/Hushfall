// The Harpoon rifle (weapon 4): view model and world pickups. Kept in its own file, like the Riveter driver's.
// Same 4x4 painted atlas as the other guns (cells: 0/1 brass, 2 slate steel, 3 hide, 4 oilskin, 5 black iron, 6 teal, 7 wood).
import * as THREE from 'three';
import { atlas } from './models.js';

export function makeHarpoonRifle(tex) {
  const mat = new THREE.MeshLambertMaterial({ map: tex, emissive: 0x1c1610 });
  const M = (g, cell, m = mat) => new THREE.Mesh(atlas(g, cell), m);
  const sleeveMat = new THREE.MeshLambertMaterial({ map: tex, transparent: true, depthWrite: false });
  const g = new THREE.Group();
  const barrel = M(new THREE.CylinderGeometry(0.02, 0.022, 0.84, 8), 2); barrel.rotation.x = -Math.PI / 2; barrel.position.set(0, 0.005, -0.52); g.add(barrel);
  for (const z of [-0.2, -0.5, -0.8]) { const band = M(new THREE.CylinderGeometry(0.03, 0.03, 0.035, 8), 1); band.rotation.x = -Math.PI / 2; band.position.set(0, 0.005, z); g.add(band); }
  const brake = M(new THREE.CylinderGeometry(0.034, 0.03, 0.09, 8), 5); brake.rotation.x = -Math.PI / 2; brake.position.set(0, 0.005, -0.93); g.add(brake);
  const recv = M(new THREE.BoxGeometry(0.095, 0.115, 0.32), 5); recv.position.set(0, -0.005, 0.02); g.add(recv);
  const rail = M(new THREE.BoxGeometry(0.03, 0.012, 0.3), 1); rail.position.set(0, 0.058, 0.02); g.add(rail);
  // the cable reel under the action: it pays out line when the bolt leaves (spins about x)
  const spin = new THREE.Group(); spin.position.set(0, -0.085, -0.22); g.add(spin);
  const drum = M(new THREE.CylinderGeometry(0.06, 0.06, 0.07, 12), 0); drum.rotation.z = Math.PI / 2; spin.add(drum);
  for (const x of [-0.045, 0.045]) { const fl = M(new THREE.CylinderGeometry(0.075, 0.075, 0.012, 12), 1); fl.rotation.z = Math.PI / 2; fl.position.x = x; spin.add(fl); }
  const hub = M(new THREE.CylinderGeometry(0.014, 0.014, 0.12, 6), 5); hub.rotation.z = Math.PI / 2; spin.add(hub);
  const crank = M(new THREE.BoxGeometry(0.01, 0.07, 0.012), 5); crank.position.set(0.075, 0.035, 0); spin.add(crank);
  // the bolt carriage slides back and forward after every shot (the view drives `pump`)
  const pump = new THREE.Group(); g.add(pump);
  const carriage = M(new THREE.BoxGeometry(0.05, 0.05, 0.12), 1); carriage.position.set(0.055, 0.03, 0.0); pump.add(carriage);
  const knob = M(new THREE.SphereGeometry(0.02, 6, 5), 5); knob.position.set(0.1, 0.03, 0.04); pump.add(knob);
  // the harpoon in the muzzle: hidden while the action cycles (the view drives `bolt`), then it seats again
  const bolt = new THREE.Group(); g.add(bolt);
  const shaft = M(new THREE.CylinderGeometry(0.008, 0.008, 0.34, 6), 2); shaft.rotation.x = -Math.PI / 2; shaft.position.set(0, 0.005, -1.0); bolt.add(shaft);
  const head = M(new THREE.ConeGeometry(0.026, 0.085, 6), 6, new THREE.MeshLambertMaterial({ map: tex, emissive: 0x0e5048 })); head.rotation.x = -Math.PI / 2; head.position.set(0, 0.005, -1.215); bolt.add(head);
  for (const a of [0, Math.PI / 2]) { const barb = M(new THREE.BoxGeometry(0.05, 0.004, 0.03), 6); barb.rotation.z = a; barb.position.set(0, 0.005, -1.17); bolt.add(barb); }
  // iron sights: blade at the muzzle, a peep ring behind; the view lines them up on the crosshair
  const bead = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.03, 0.012), new THREE.MeshBasicMaterial({ color: 0xffe08a })); bead.position.set(0, 0.062, -0.82); g.add(bead);
  const peep = M(new THREE.TorusGeometry(0.017, 0.004, 4, 10), 5); peep.position.set(0, 0.061, 0.14); g.add(peep);
  const peepPost = M(new THREE.BoxGeometry(0.008, 0.03, 0.012), 5); peepPost.position.set(0, 0.043, 0.14); g.add(peepPost);
  const grip = M(new THREE.BoxGeometry(0.055, 0.13, 0.07), 7); grip.position.set(0, -0.12, 0.15); grip.rotation.x = 0.3; g.add(grip);
  const stock = M(new THREE.BoxGeometry(0.06, 0.1, 0.34), 7); stock.position.set(0, -0.04, 0.34); stock.rotation.x = 0.08; g.add(stock);
  const pad = M(new THREE.BoxGeometry(0.065, 0.12, 0.02), 5); pad.position.set(0, -0.045, 0.52); g.add(pad);
  const handR = M(new THREE.BoxGeometry(0.085, 0.1, 0.11), 3); handR.position.set(0.005, -0.18, 0.17); g.add(handR);
  const handL = M(new THREE.BoxGeometry(0.1, 0.085, 0.14), 3); handL.position.set(-0.005, -0.075, -0.38); g.add(handL);
  const sleeveR = M(new THREE.CylinderGeometry(0.06, 0.075, 0.42, 7), 4, sleeveMat); sleeveR.position.set(0.09, -0.3, 0.36); sleeveR.rotation.x = -1.15; g.add(sleeveR);
  const sleeveL = M(new THREE.CylinderGeometry(0.06, 0.075, 0.5, 7), 4, sleeveMat); sleeveL.position.set(-0.14, -0.2, -0.12); sleeveL.rotation.set(-1.1, 0, 0.55); g.add(sleeveL);
  const flash = new THREE.Group(); flash.position.z = -1.0; flash.visible = false; g.add(flash);
  flash.add(new THREE.Mesh(new THREE.IcosahedronGeometry(0.1, 0), new THREE.MeshBasicMaterial({ color: 0x6ffff0 })));
  flash.add(new THREE.Mesh(new THREE.IcosahedronGeometry(0.055, 0), new THREE.MeshBasicMaterial({ color: 0xf0fffc })));
  return { group: g, flash, pump, spin, spinAxis: 'x', bolt, adsY: -0.048, sleeveMat };
}

/** world pickups for the weapon and its ammunition */
export function makePickupHarpoon(kind, tex, weaponTex) {
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
    const gun = makeHarpoonRifle(weaponTex || tex).group; gun.scale.setScalar(0.62); gun.rotation.set(0, Math.PI / 2, 0); gun.position.y = 0.34; g.add(gun);
    const glow = new THREE.Mesh(new THREE.IcosahedronGeometry(0.07, 0), new THREE.MeshBasicMaterial({ color: 0x6ffff0 })); glow.position.y = 0.8; g.add(glow);
  }
  return g;
}
