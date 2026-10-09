// The Rocket line-thrower (weapon 8, PT-022): view model, the rocket in flight, and world pickups. A lifesaving line-thrower turned on the dead: a yellow enamel tube on a leather rest, brass hoops, a flared muzzle, a venturi at the back, a reel of line on the left,
// an aperture sight on a rail. guns_atlas cells (gunkit.js): 2 brass, 4 yellow enamel, 6 black rubber, 8 pitted iron, 9 rope, 14 leather, 15 gunmetal. The rocket seats in the muzzle again as the cooldown runs out (the view drives `bolt`, as it does the harpoon's).
import * as THREE from 'three';
import { atlas } from './atlasuv.js';
import { ironSights } from './weapon-sights.js';
import { gunKit, lathe, fist } from './gunkit.js';

const PI = Math.PI;

export function makeLineThrower(tex, gunTex, o = {}) {
  const K = gunKit(tex, gunTex), { G } = K, g = new THREE.Group();
  const tube = G(new THREE.CylinderGeometry(0.058, 0.058, 0.95, 14), 4); tube.rotation.x = -PI / 2; tube.position.set(0, 0.03, -0.1); g.add(tube);                                // the launch tube: chipped safety yellow
  for (const z of [-0.5, -0.1, 0.25]) { const hoop = G(new THREE.TorusGeometry(0.061, 0.0095, 5, 16), 2); hoop.position.set(0, 0.03, z); g.add(hoop); }                         // brass hoops
  const flare = G(new THREE.CylinderGeometry(0.078, 0.058, 0.07, 14), 8); flare.rotation.x = -PI / 2; flare.position.set(0, 0.03, -0.6); g.add(flare);                           // the flared muzzle
  const venturi = G(new THREE.CylinderGeometry(0.05, 0.088, 0.13, 14), 8); venturi.rotation.x = -PI / 2; venturi.position.set(0, 0.03, 0.44); g.add(venturi);                  // the venturi: the blast goes out of the back
  const seat = G(new THREE.BoxGeometry(0.1, 0.07, 0.16), 15); seat.position.set(0, -0.045, 0.12); g.add(seat);                                                                  // the breech block under the tube
  // the rocket in the muzzle (hidden while the next one is loaded: the view drives `bolt`)
  const bolt = new THREE.Group(); g.add(bolt);
  const body = G(new THREE.CylinderGeometry(0.046, 0.046, 0.1, 12), 15); body.rotation.x = -PI / 2; body.position.set(0, 0.03, -0.64); bolt.add(body);
  const bandR = G(new THREE.CylinderGeometry(0.0485, 0.0485, 0.018, 12), 2); bandR.rotation.x = -PI / 2; bandR.position.set(0, 0.03, -0.68); bolt.add(bandR);
  const nose = G(new THREE.ConeGeometry(0.046, 0.15, 12), 10); nose.rotation.x = -PI / 2; nose.position.set(0, 0.03, -0.765); bolt.add(nose);
  // the reel of line on the left, and the line along the tube to the rocket's tail
  const spin = new THREE.Group(); spin.position.set(-0.115, 0.0, 0.14); g.add(spin);
  const drum = G(new THREE.CylinderGeometry(0.058, 0.058, 0.065, 14), 9); drum.rotation.z = PI / 2; spin.add(drum);
  for (const x of [-0.04, 0.04]) { const fl = G(new THREE.CylinderGeometry(0.072, 0.072, 0.012, 14), 8); fl.rotation.z = PI / 2; fl.position.x = x; spin.add(fl); }
  const hub = G(new THREE.CylinderGeometry(0.013, 0.013, 0.11, 6), 2); hub.rotation.z = PI / 2; spin.add(hub);
  const line = G(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(-0.115, 0.05, 0.1), new THREE.Vector3(-0.075, 0.06, -0.05), new THREE.Vector3(-0.062, 0.05, -0.4), new THREE.Vector3(-0.04, 0.035, -0.62)]), 10, 0.0042, 4), 9); g.add(line);
  const rail = G(new THREE.BoxGeometry(0.03, 0.018, 0.56), 15); rail.position.set(0, 0.097, -0.06); g.add(rail);
  const sights = ironSights(g, K.gmat, 15, { rearZ: 0.2, frontZ: -0.5, rearBase: 0.106, frontBase: 0.106, line: 0.163, gap: 0.02, post: 0.012, peep: true });
  const grip = lathe(K, 14, [[0.034, -0.09], [0.047, -0.055], [0.05, -0.005], [0.047, 0.045], [0.04, 0.09]]); grip.position.set(0, -0.145, 0.17); grip.rotation.x = 0.3; g.add(grip);        // stitched leather
  const tg = G(new THREE.TorusGeometry(0.042, 0.007, 4, 10, PI), 8); tg.rotation.set(0, PI / 2, PI); tg.position.set(0, -0.1, 0.08); g.add(tg);
  const bracket = G(new THREE.BoxGeometry(0.034, 0.07, 0.08), 8); bracket.position.set(0, -0.025, -0.3); g.add(bracket);
  const fore = lathe(K, 9, [[0.03, -0.1], [0.045, -0.07], [0.048, 0], [0.045, 0.07], [0.03, 0.1]]); fore.position.set(0, -0.12, -0.3); g.add(fore);                                   // a rope-wrapped fore-handle
  const rest = G(new THREE.BoxGeometry(0.1, 0.05, 0.2), 14); rest.position.set(0, -0.015, 0.36); rest.rotation.x = 0.1; g.add(rest);                                              // the leather shoulder rest
  if (o.hands !== false) {
    fist(K, g, { at: [0.0, -0.145, 0.17], rot: [0.3, PI / 2, 0], shoulder: [0.3, -0.85, 0.95], pole: [0.5, -1, 0.2] });
    fist(K, g, { at: [0.0, -0.12, -0.3], rot: [0, -PI / 2, 0], shoulder: [-0.4, -0.8, 0.5], pole: [-0.5, -1, 0.1] });
  }
  const flash = new THREE.Group(); flash.position.z = -0.78; flash.visible = false; g.add(flash);
  flash.add(new THREE.Mesh(new THREE.IcosahedronGeometry(0.13, 0), new THREE.MeshBasicMaterial({ color: 0xff9a30 })));
  flash.add(new THREE.Mesh(new THREE.IcosahedronGeometry(0.075, 0), new THREE.MeshBasicMaterial({ color: 0xfff0c0 })));
  return { group: g, flash, pump: null, bolt, spin, spinAxis: 'x', adsY: -0.048, sleeveMat: K.sleeveMat, sights };
}

/** the rocket in flight, drawn pointing along -z (the view turns it to its velocity): a body, a nose, fins, a brass band and a flame behind (the flame is `flame`, the view breathes it) */
export function makeRocketMesh() {
  const g = new THREE.Group(), iron = new THREE.MeshLambertMaterial({ color: 0x4a4e52, emissive: 0x181410 }), brass = new THREE.MeshLambertMaterial({ color: 0xc09a40, emissive: 0x2a2008 }), tip = new THREE.MeshLambertMaterial({ color: 0xd8c070, emissive: 0x40300a });
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.42, 10), iron); body.rotation.x = Math.PI / 2; g.add(body);
  const band = new THREE.Mesh(new THREE.CylinderGeometry(0.053, 0.053, 0.03, 10), brass); band.rotation.x = Math.PI / 2; band.position.z = -0.06; g.add(band);
  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.16, 10), tip); nose.rotation.x = -Math.PI / 2; nose.position.z = -0.29; g.add(nose);
  for (let i = 0; i < 4; i++) { const f = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.1, 0.1), iron); f.position.set(Math.cos(i * Math.PI / 2) * 0.07, Math.sin(i * Math.PI / 2) * 0.07, 0.17); f.rotation.z = i * Math.PI / 2; g.add(f); }
  const flame = new THREE.Group(); flame.position.z = 0.24; g.add(flame);
  const core = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.4, 8), new THREE.MeshBasicMaterial({ color: 0xffd070 })); core.rotation.x = Math.PI / 2; core.position.z = 0.2; flame.add(core);
  const outer = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.7, 8), new THREE.MeshBasicMaterial({ color: 0xff6a1a, transparent: true, opacity: 0.55, depthWrite: false })); outer.rotation.x = Math.PI / 2; outer.position.z = 0.35; flame.add(outer);
  return { group: g, flame };
}

/** world pickups: the line-thrower and a crate of rockets */
export function makePickupRocket(kind, tex, weaponTex, gunTex) {
  const mat = new THREE.MeshLambertMaterial({ map: tex, emissive: 0x201810 }), g = new THREE.Group();
  const M = (geom, cell) => new THREE.Mesh(atlas(geom, cell), mat);
  if (kind === 'ammo_rocket') {
    const crate = M(new THREE.BoxGeometry(0.36, 0.12, 0.24), 1); crate.position.y = 0.08; g.add(crate);
    for (const z of [-0.07, 0.0, 0.07]) {
      const r = M(new THREE.CylinderGeometry(0.03, 0.03, 0.4, 8), 5); r.rotation.z = Math.PI / 2; r.position.set(0, 0.19, z); g.add(r);
      const n = M(new THREE.ConeGeometry(0.03, 0.09, 8), 2); n.rotation.z = -Math.PI / 2; n.position.set(0.245, 0.19, z); g.add(n);
    }
    const glow = new THREE.Mesh(new THREE.IcosahedronGeometry(0.035, 0), new THREE.MeshBasicMaterial({ color: 0xffa040 })); glow.position.y = 0.5; g.add(glow);
  } else if (kind === 'weapon_linethrower') {
    const gun = makeLineThrower(weaponTex || tex, gunTex, { hands: false }).group; gun.scale.setScalar(0.52); gun.rotation.set(0, Math.PI / 2, 0); gun.position.y = 0.34; g.add(gun);
    const glow = new THREE.Mesh(new THREE.IcosahedronGeometry(0.07, 0), new THREE.MeshBasicMaterial({ color: 0xffa040 })); glow.position.y = 0.8; g.add(glow);
  }
  return g;
}
