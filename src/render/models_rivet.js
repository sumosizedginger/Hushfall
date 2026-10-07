// The Riveter driver (weapon 3): view model and world pickups. Kept in its own file so models.js does not import it.
import * as THREE from 'three';
import { atlas } from './models.js';
import { ironSights } from './weapon-sights.js';

export function makeRivetDriver(tex) {
  const mat = new THREE.MeshLambertMaterial({ map: tex, emissive: 0x1c1610 });
  const M = (g, cell, m = mat) => new THREE.Mesh(atlas(g, cell), m);
  const sleeveMat = new THREE.MeshLambertMaterial({ map: tex, transparent: true, depthWrite: false });
  const g = new THREE.Group();
  const recv = M(new THREE.BoxGeometry(0.1, 0.105, 0.34), 2); recv.position.set(0, -0.005, 0.02); g.add(recv);
  const shroud = M(new THREE.CylinderGeometry(0.04, 0.045, 0.34, 8), 5); shroud.rotation.x = -Math.PI / 2; shroud.position.set(0, 0.0, -0.3); g.add(shroud);
  const spin = new THREE.Group(); spin.position.set(0, 0.0, -0.5); g.add(spin);                       // the barrel cluster turns while it fires
  for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2, b = M(new THREE.CylinderGeometry(0.012, 0.012, 0.16, 5), 0); b.rotation.x = -Math.PI / 2; b.position.set(Math.cos(a) * 0.026, Math.sin(a) * 0.026, -0.05); spin.add(b); }
  const ring = M(new THREE.TorusGeometry(0.036, 0.008, 4, 10), 1); ring.position.z = -0.04; spin.add(ring);
  const drum = M(new THREE.CylinderGeometry(0.075, 0.075, 0.1, 10), 1); drum.rotation.z = Math.PI / 2; drum.position.set(-0.115, -0.015, 0.03); g.add(drum);        // side-mounted so the sights stay clear
  const drumCap = M(new THREE.CylinderGeometry(0.03, 0.03, 0.12, 6), 5); drumCap.rotation.z = Math.PI / 2; drumCap.position.set(-0.115, -0.015, 0.03); g.add(drumCap);
  const sights = ironSights(g, mat, 5, { rearZ: 0.12, frontZ: -0.55, rearBase: 0.0475, frontBase: 0.045, line: 0.0825, gap: 0.022 });
  const grip = M(new THREE.BoxGeometry(0.055, 0.13, 0.07), 7); grip.position.set(0, -0.12, 0.13); grip.rotation.x = 0.3; g.add(grip);
  const stock = M(new THREE.BoxGeometry(0.05, 0.08, 0.22), 7); stock.position.set(0, -0.04, 0.3); g.add(stock);
  const handR = M(new THREE.BoxGeometry(0.085, 0.1, 0.11), 3); handR.position.set(0.005, -0.18, 0.15); g.add(handR);
  const handL = M(new THREE.BoxGeometry(0.1, 0.085, 0.14), 3); handL.position.set(-0.005, -0.075, -0.3); g.add(handL);
  const sleeveR = M(new THREE.CylinderGeometry(0.06, 0.075, 0.42, 7), 4, sleeveMat); sleeveR.position.set(0.09, -0.3, 0.34); sleeveR.rotation.x = -1.15; g.add(sleeveR);
  const sleeveL = M(new THREE.CylinderGeometry(0.06, 0.075, 0.5, 7), 4, sleeveMat); sleeveL.position.set(-0.14, -0.2, -0.05); sleeveL.rotation.set(-1.1, 0, 0.55); g.add(sleeveL);
  const flash = new THREE.Group(); flash.position.z = -0.62; flash.visible = false; g.add(flash);
  flash.add(new THREE.Mesh(new THREE.IcosahedronGeometry(0.08, 0), new THREE.MeshBasicMaterial({ color: 0xffa030 })));
  flash.add(new THREE.Mesh(new THREE.IcosahedronGeometry(0.045, 0), new THREE.MeshBasicMaterial({ color: 0xfff0c0 })));
  return { group: g, flash, pump: null, spin, adsY: -0.048, sleeveMat, sights };
}

/** world pickups for the new weapon and its ammo */
export function makePickupRivet(kind, tex, weaponTex) {
  const mat = new THREE.MeshLambertMaterial({ map: tex, emissive: 0x201810 }), g = new THREE.Group();
  const M = (geom, cell) => new THREE.Mesh(atlas(geom, cell), mat);
  if (kind === 'ammo_rivet') {
    const box = M(new THREE.BoxGeometry(0.34, 0.16, 0.22), 1); box.position.y = 0.1; g.add(box);
    for (let i = -2; i <= 2; i++) { const r = M(new THREE.CylinderGeometry(0.018, 0.018, 0.14, 5), 4); r.rotation.z = Math.PI / 2; r.position.set(0, 0.22, i * 0.05); g.add(r); }
  } else if (kind === 'weapon_rivet') {
    const gun = makeRivetDriver(weaponTex || tex).group; gun.scale.setScalar(0.55); gun.rotation.set(0, Math.PI / 2, 0); gun.position.y = 0.3; g.add(gun);
    const glow = new THREE.Mesh(new THREE.IcosahedronGeometry(0.06, 0), new THREE.MeshBasicMaterial({ color: 0xffe08a })); glow.position.y = 0.62; g.add(glow);
  }
  return g;
}
