// The Charge-arc lamp (weapon 5): view model and world pickups. Own file, like the other new guns'.
// Same 4x4 painted atlas as the other guns (cells: 0/1 brass, 2 slate steel, 3 hide, 4 oilskin, 5 black iron, 6 teal, 7 wood).
import * as THREE from 'three';
import { atlas } from './models.js';
import { ironSights } from './weapon-sights.js';

export function makeArcLamp(tex) {
  const mat = new THREE.MeshLambertMaterial({ map: tex, emissive: 0x1c1610 });
  const M = (g, cell, m = mat) => new THREE.Mesh(atlas(g, cell), m);
  const sleeveMat = new THREE.MeshLambertMaterial({ map: tex, transparent: true, depthWrite: false });
  const g = new THREE.Group();
  // the housing: a brass lantern body wound with coil rings, the glass bulb in a cage at the front, two electrodes beyond it
  const body = M(new THREE.CylinderGeometry(0.058, 0.064, 0.34, 10), 0); body.rotation.x = -Math.PI / 2; body.position.set(0, 0, -0.08); g.add(body);
  for (const z of [-0.2, -0.12, -0.04, 0.04]) { const ring = M(new THREE.TorusGeometry(0.066, 0.012, 5, 12), 1); ring.position.set(0, 0, z); g.add(ring); }
  const collar = M(new THREE.CylinderGeometry(0.07, 0.07, 0.05, 10), 5); collar.rotation.x = -Math.PI / 2; collar.position.set(0, 0, -0.27); g.add(collar);
  const core = new THREE.Mesh(new THREE.IcosahedronGeometry(0.05, 1), new THREE.MeshBasicMaterial({ color: 0x6ffff0 })); core.position.set(0, 0, -0.35); g.add(core);               // the bulb: it breathes, and flares when the arc fires
  for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + Math.PI / 4, rod = M(new THREE.CylinderGeometry(0.006, 0.006, 0.17, 4), 5); rod.rotation.x = -Math.PI / 2; rod.position.set(Math.cos(a) * 0.062, Math.sin(a) * 0.062, -0.35); g.add(rod); }
  const cap = M(new THREE.CylinderGeometry(0.01, 0.06, 0.05, 8), 5); cap.rotation.x = -Math.PI / 2; cap.position.set(0, 0, -0.46); g.add(cap);
  for (const x of [-0.028, 0.028]) { const el = M(new THREE.CylinderGeometry(0.007, 0.01, 0.2, 5), 2); el.rotation.x = -Math.PI / 2; el.position.set(x, 0, -0.58); g.add(el); const tip = new THREE.Mesh(new THREE.IcosahedronGeometry(0.014, 0), new THREE.MeshBasicMaterial({ color: 0xbafff2 })); tip.position.set(x, 0, -0.69); g.add(tip); }
  // the charge cell on the left, a brass drum with a teal band
  const cell = M(new THREE.CylinderGeometry(0.06, 0.06, 0.13, 10), 1); cell.rotation.z = Math.PI / 2; cell.position.set(-0.12, -0.02, 0.02); g.add(cell);
  const band = M(new THREE.CylinderGeometry(0.063, 0.063, 0.03, 10), 6); band.rotation.z = Math.PI / 2; band.position.set(-0.12, -0.02, 0.02); g.add(band);
  const sights = ironSights(g, mat, 5, { rearZ: 0.02, frontZ: -0.46, rearBase: 0.078, frontBase: 0.06, line: 0.113, gap: 0.024 });
  const grip = M(new THREE.BoxGeometry(0.055, 0.13, 0.07), 7); grip.position.set(0, -0.13, 0.12); grip.rotation.x = 0.3; g.add(grip);
  const stock = M(new THREE.BoxGeometry(0.05, 0.075, 0.2), 7); stock.position.set(0, -0.045, 0.28); g.add(stock);
  const handR = M(new THREE.BoxGeometry(0.085, 0.1, 0.11), 3); handR.position.set(0.005, -0.19, 0.13); g.add(handR);
  const handL = M(new THREE.BoxGeometry(0.1, 0.085, 0.14), 3); handL.position.set(-0.005, -0.08, -0.16); g.add(handL);
  const sleeveR = M(new THREE.CylinderGeometry(0.06, 0.075, 0.42, 7), 4, sleeveMat); sleeveR.position.set(0.09, -0.3, 0.32); sleeveR.rotation.x = -1.15; g.add(sleeveR);
  const sleeveL = M(new THREE.CylinderGeometry(0.06, 0.075, 0.5, 7), 4, sleeveMat); sleeveL.position.set(-0.14, -0.2, -0.02); sleeveL.rotation.set(-1.1, 0, 0.55); g.add(sleeveL);
  const flash = new THREE.Group(); flash.position.z = -0.7; flash.visible = false; g.add(flash);
  flash.add(new THREE.Mesh(new THREE.IcosahedronGeometry(0.09, 0), new THREE.MeshBasicMaterial({ color: 0x6ffff0 })));
  flash.add(new THREE.Mesh(new THREE.IcosahedronGeometry(0.05, 0), new THREE.MeshBasicMaterial({ color: 0xf0fffc })));
  return { group: g, flash, pump: null, core, adsY: -0.048, sleeveMat, sights };
}

/** world pickups for the lamp and its charge cells */
export function makePickupArc(kind, tex, weaponTex) {
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
    const gun = makeArcLamp(weaponTex || tex).group; gun.scale.setScalar(0.7); gun.rotation.set(0, Math.PI / 2, 0); gun.position.y = 0.34; g.add(gun);
    const glow = new THREE.Mesh(new THREE.IcosahedronGeometry(0.07, 0), new THREE.MeshBasicMaterial({ color: 0x6ffff0 })); glow.position.y = 0.8; g.add(glow);
  }
  return g;
}
