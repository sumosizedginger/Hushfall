// The Harbour carbine (weapon 7, PT-022): view model and world pickups. Its own file, like the other guns'. guns_atlas cells (gunkit.js): 0 walnut, 1 blued steel, 2 brass, 4 yellow enamel, 5 stamped steel, 6 black rubber, 8 pitted iron, 14 leather, 15 gunmetal.
// A harbour guard's rifle: blued steel and walnut, a yellow enamel band on the hand-guard (the guard's colour), a curved magazine, an aperture rear sight and a blade; the pose lines the eye up through them (weapon-sights.js).
import * as THREE from 'three';
import { atlas } from './atlasuv.js';
import { ironSights } from './weapon-sights.js';
import { gunKit, lathe, fist } from './gunkit.js';

const PI = Math.PI;

export function makeCarbine(tex, gunTex, o = {}) {
  const K = gunKit(tex, gunTex), { G } = K, g = new THREE.Group();
  const recv = G(new THREE.BoxGeometry(0.078, 0.108, 0.34), 1); recv.position.set(0, -0.004, 0.02); g.add(recv);                                                          // blued steel receiver
  const cover = G(new THREE.BoxGeometry(0.058, 0.02, 0.3), 15); cover.position.set(0, 0.056, 0.03); g.add(cover);                                                          // the dust cover along the top
  const port = G(new THREE.BoxGeometry(0.008, 0.045, 0.1), 8); port.position.set(0.04, 0.012, 0.0); g.add(port);                                                           // the ejection port, a dark slot on the right
  const barrel = G(new THREE.CylinderGeometry(0.0155, 0.0175, 0.62, 10), 1); barrel.rotation.x = -PI / 2; barrel.position.set(0, 0.012, -0.5); g.add(barrel);
  const guard = lathe(K, 0, [[0.03, -0.18], [0.04, -0.15], [0.043, 0], [0.04, 0.15], [0.03, 0.18]], 12); guard.rotation.x = PI / 2; guard.position.set(0, 0.0, -0.3); g.add(guard);  // the walnut hand-guard
  const band = G(new THREE.CylinderGeometry(0.046, 0.046, 0.04, 12), 4); band.rotation.x = -PI / 2; band.position.set(0, 0.0, -0.37); g.add(band);                            // the guard's yellow band
  const gas = G(new THREE.CylinderGeometry(0.0095, 0.0095, 0.34, 6), 15); gas.rotation.x = -PI / 2; gas.position.set(0, 0.043, -0.42); g.add(gas);                         // a gas tube over the barrel
  const block = G(new THREE.BoxGeometry(0.03, 0.03, 0.05), 15); block.position.set(0, 0.034, -0.62); g.add(block);                                                          // the front sight's block
  const brake = G(new THREE.CylinderGeometry(0.0245, 0.0245, 0.075, 10), 2); brake.rotation.x = -PI / 2; brake.position.set(0, 0.012, -0.84); g.add(brake);                   // a brass muzzle brake
  for (const z of [-0.815, -0.86]) { const ring = G(new THREE.TorusGeometry(0.0265, 0.0042, 4, 10), 8); ring.position.set(0, 0.012, z); g.add(ring); }
  const sights = ironSights(g, K.gmat, 15, { rearZ: 0.14, frontZ: -0.62, rearBase: 0.0475, frontBase: 0.049, line: 0.1, gap: 0.0185, post: 0.011, peep: true });
  // the curved magazine: three boxes stepping forward as they go down, stamped steel with a leather-wrapped base plate
  for (const [y, z, rx] of [[-0.075, -0.015, 0.0], [-0.12, -0.03, 0.14], [-0.162, -0.05, 0.28]]) { const m = G(new THREE.BoxGeometry(0.052, 0.058, 0.084), 5); m.position.set(0, y, z); m.rotation.x = rx; g.add(m); }
  const plate = G(new THREE.BoxGeometry(0.058, 0.014, 0.09), 14); plate.position.set(0, -0.196, -0.062); plate.rotation.x = 0.28; g.add(plate);
  const grip = lathe(K, 6, [[0.03, -0.09], [0.042, -0.06], [0.044, 0], [0.041, 0.05], [0.032, 0.09]]); grip.position.set(0, -0.115, 0.15); grip.rotation.x = 0.32; g.add(grip);       // black rubber, checkered
  const tg = G(new THREE.TorusGeometry(0.04, 0.006, 4, 10, PI), 1); tg.rotation.set(0, PI / 2, PI); tg.position.set(0, -0.065, 0.05); g.add(tg);                          // trigger guard
  const stock = G(new THREE.BoxGeometry(0.058, 0.1, 0.3), 0, ); stock.position.set(0, -0.04, 0.4); stock.rotation.x = 0.1; g.add(stock);                                   // walnut stock, dropping away to the shoulder
  const comb = G(new THREE.BoxGeometry(0.05, 0.03, 0.14), 0); comb.position.set(0, 0.018, 0.35); comb.rotation.x = 0.06; g.add(comb);
  const pad = G(new THREE.BoxGeometry(0.066, 0.115, 0.024), 6); pad.position.set(0, -0.052, 0.555); pad.rotation.x = 0.1; g.add(pad);
  const swivel = G(new THREE.TorusGeometry(0.014, 0.0035, 4, 8), 2); swivel.position.set(0.03, -0.075, 0.5); swivel.rotation.y = PI / 2; g.add(swivel);
  if (o.hands !== false) {
    fist(K, g, { at: [0.0, -0.115, 0.15], rot: [0.32, PI / 2, 0], shoulder: [0.3, -0.85, 0.95], pole: [0.5, -1, 0.2] });
    fist(K, g, { at: [0.0, -0.035, -0.32], rot: [PI / 2, 0, 0], shoulder: [-0.4, -0.8, 0.4], pole: [-0.5, -1, 0.1] });                                                       // the left hand under the hand-guard
  }
  const flash = new THREE.Group(); flash.position.z = -0.92; flash.visible = false; g.add(flash);
  flash.add(new THREE.Mesh(new THREE.IcosahedronGeometry(0.06, 0), new THREE.MeshBasicMaterial({ color: 0xffb040 })));
  flash.add(new THREE.Mesh(new THREE.IcosahedronGeometry(0.032, 0), new THREE.MeshBasicMaterial({ color: 0xfff4c8 })));
  return { group: g, flash, pump: null, adsY: -0.048, sleeveMat: K.sleeveMat, sights };
}

/** world pickups: the carbine and its rounds */
export function makePickupCarbine(kind, tex, weaponTex, gunTex) {
  const mat = new THREE.MeshLambertMaterial({ map: tex, emissive: 0x201810 }), g = new THREE.Group();
  const M = (geom, cell) => new THREE.Mesh(atlas(geom, cell), mat);
  if (kind === 'ammo_round') {
    const box = M(new THREE.BoxGeometry(0.3, 0.14, 0.2), 1); box.position.y = 0.09; g.add(box);                                                                              // a cartridge box
    const lid = M(new THREE.BoxGeometry(0.31, 0.03, 0.21), 8); lid.position.y = 0.175; g.add(lid);
    for (const [x, z] of [[-0.07, -0.05], [0.0, -0.05], [0.07, -0.05], [-0.035, 0.05], [0.035, 0.05]]) { const r = M(new THREE.CylinderGeometry(0.014, 0.014, 0.1, 5), 2); r.position.set(x, 0.24, z); g.add(r); }
    const glow = new THREE.Mesh(new THREE.IcosahedronGeometry(0.03, 0), new THREE.MeshBasicMaterial({ color: 0xffe08a })); glow.position.y = 0.46; g.add(glow);
  } else if (kind === 'weapon_carbine') {
    const gun = makeCarbine(weaponTex || tex, gunTex, { hands: false }).group; gun.scale.setScalar(0.62); gun.rotation.set(0, Math.PI / 2, 0); gun.position.y = 0.34; g.add(gun);
    const glow = new THREE.Mesh(new THREE.IcosahedronGeometry(0.07, 0), new THREE.MeshBasicMaterial({ color: 0xffe08a })); glow.position.y = 0.8; g.add(glow);
  }
  return g;
}
