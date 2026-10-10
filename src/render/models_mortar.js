// The Bell-breaker mortar (weapon 10, PT-027): view model, the bomb in flight, and the world pickup. A short, fat cast-iron tube with a flared BELL for a mouth (it was made to ring the Vael's bells loose), hooped in brass, a ladder sight on a
// curved arm, a lanyard of rope off the breech cap, leather under the hands. Built from the shared guns_atlas cells (gunkit.js): 2 brass, 6 black rubber, 8 pitted iron, 9 rope, 14 leather, 15 gunmetal: no new art, no bake.
// The bomb sits in the bell until the cooldown runs out (the view drives `bolt`, as it does the line-thrower's rocket). Gun space: -z is forward, the tube is tilted up a little the way a mortar is carried.
import * as THREE from 'three';
import { atlas } from './atlasuv.js';
import { ironSights } from './weapon-sights.js';
import { gunKit, lathe, fist } from './gunkit.js';

const PI = Math.PI;

export function makeMortar(tex, gunTex, o = {}) {
  const K = gunKit(tex, gunTex), { G } = K, g = new THREE.Group();
  const tube = new THREE.Group(); tube.rotation.x = 0.22; tube.position.set(0, 0.04, -0.1); g.add(tube);                                                                          // everything on the barrel is tilted up together
  const barrel = G(new THREE.CylinderGeometry(0.072, 0.078, 0.66, 14), 8); barrel.rotation.x = -PI / 2; barrel.position.z = -0.02; tube.add(barrel);                                  // the cast tube
  for (const z of [-0.28, -0.06, 0.18]) { const hoop = G(new THREE.TorusGeometry(0.079, 0.0105, 5, 16), 2); hoop.position.z = z; tube.add(hoop); }                                  // brass hoops
  const bell = lathe(K, 2, [[0.06, 0.0], [0.072, 0.05], [0.1, 0.11], [0.128, 0.17], [0.134, 0.19]], 16); bell.rotation.x = -PI / 2; bell.position.z = -0.3; tube.add(bell);        // the bell: a mouth that flares
  const lip = G(new THREE.TorusGeometry(0.134, 0.011, 5, 18), 2); lip.position.z = -0.49; tube.add(lip);
  const breech = G(new THREE.SphereGeometry(0.086, 12, 8), 8); breech.scale.set(1, 1, 0.8); breech.position.z = 0.34; tube.add(breech);                                              // the breech cap
  const lug = G(new THREE.TorusGeometry(0.026, 0.006, 4, 8), 2); lug.position.set(0, 0.07, 0.4); lug.rotation.y = PI / 2; tube.add(lug);
  const lanyard = G(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0.07, 0.4), new THREE.Vector3(0.04, 0.0, 0.5), new THREE.Vector3(0.1, -0.12, 0.46), new THREE.Vector3(0.12, -0.22, 0.34)]), 10, 0.0055, 4), 9); tube.add(lanyard);
  // the ladder sight: a curved arm on the left of the tube with brass ticks on it (it only has to say "far" or "near")
  const arm = G(new THREE.TorusGeometry(0.12, 0.007, 4, 14, PI * 0.5), 15); arm.rotation.set(0, PI / 2, PI * 0.5); arm.position.set(-0.098, 0.015, 0.0); tube.add(arm);
  for (let i = 0; i < 5; i++) { const a = i / 4 * PI * 0.5, tick = G(new THREE.BoxGeometry(0.02, 0.0045, 0.0045), 2); tick.position.set(-0.098, 0.015 + Math.sin(a) * 0.12 - 0.0, Math.cos(a) * 0.12 - 0.12 + 0.0); tube.add(tick); }
  // the bomb in the bell (hidden while the next one is loaded: the view drives `bolt`)
  const bolt = new THREE.Group(); bolt.position.set(0, 0, -0.3); tube.add(bolt);
  const body = G(new THREE.SphereGeometry(0.066, 12, 9), 15); bolt.add(body);
  const band = G(new THREE.TorusGeometry(0.067, 0.008, 4, 14), 2); band.rotation.x = PI / 2; band.position.z = 0.0; bolt.add(band);
  const tail = G(new THREE.ConeGeometry(0.03, 0.09, 8), 8); tail.rotation.x = PI / 2; tail.position.z = 0.1; bolt.add(tail);
  // the hands: a rope-wrapped fore-handle under the barrel and a leather grip behind the balance
  const fore = lathe(K, 9, [[0.028, -0.1], [0.043, -0.07], [0.046, 0], [0.043, 0.07], [0.028, 0.1]]); fore.position.set(0, -0.13, -0.3); g.add(fore);
  const bracket = G(new THREE.BoxGeometry(0.034, 0.07, 0.08), 8); bracket.position.set(0, -0.045, -0.3); g.add(bracket);
  const grip = lathe(K, 14, [[0.034, -0.09], [0.046, -0.055], [0.05, -0.005], [0.046, 0.045], [0.04, 0.09]]); grip.position.set(0, -0.15, 0.14); grip.rotation.x = 0.3; g.add(grip);
  const strap = G(new THREE.BoxGeometry(0.1, 0.05, 0.1), 14); strap.position.set(0, -0.05, 0.14); g.add(strap);
  const sights = ironSights(g, K.gmat, 15, { rearZ: 0.2, frontZ: -0.36, rearBase: 0.15, frontBase: 0.17, line: 0.205, gap: 0.02, post: 0.012, peep: true });
  if (o.hands !== false) {
    fist(K, g, { at: [0.0, -0.15, 0.14], rot: [0.3, PI / 2, 0], shoulder: [0.3, -0.85, 0.95], pole: [0.5, -1, 0.2] });
    fist(K, g, { at: [0.0, -0.13, -0.3], rot: [0, -PI / 2, 0], shoulder: [-0.4, -0.8, 0.5], pole: [-0.5, -1, 0.1] });
  }
  const flash = new THREE.Group(); flash.position.set(0, 0.17, -0.62); flash.visible = false; g.add(flash);
  flash.add(new THREE.Mesh(new THREE.IcosahedronGeometry(0.15, 0), new THREE.MeshBasicMaterial({ color: 0xff8a28 })));
  flash.add(new THREE.Mesh(new THREE.IcosahedronGeometry(0.085, 0), new THREE.MeshBasicMaterial({ color: 0xfff0c0 })));
  return { group: g, flash, pump: null, bolt, spin: null, spinAxis: 'x', adsY: -0.05, sleeveMat: K.sleeveMat, sights };
}

/** the bomb in flight: a dark iron ball with a brass band, fins at the tail and a spark of fuse (the view tumbles it along its arc; `spark` is what it breathes) */
export function makeBombMesh() {
  const g = new THREE.Group(), iron = new THREE.MeshLambertMaterial({ color: 0x3a3e42, emissive: 0x141210 }), brass = new THREE.MeshLambertMaterial({ color: 0xc09a40, emissive: 0x2a2008 });
  const ball = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 9), iron); g.add(ball);
  const band = new THREE.Mesh(new THREE.TorusGeometry(0.122, 0.014, 5, 16), brass); band.rotation.x = Math.PI / 2; g.add(band);
  const tail = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.2, 8), iron); tail.rotation.x = Math.PI / 2; tail.position.z = 0.2; g.add(tail);
  for (let i = 0; i < 4; i++) { const f = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.1, 0.12), iron); f.position.set(Math.cos(i * PI / 2) * 0.06, Math.sin(i * PI / 2) * 0.06, 0.28); f.rotation.z = i * PI / 2; g.add(f); }
  const spark = new THREE.Mesh(new THREE.IcosahedronGeometry(0.05, 0), new THREE.MeshBasicMaterial({ color: 0xffb040 })); spark.position.set(0, 0.13, -0.02); g.add(spark);
  return { group: g, spark };
}

/** world pickup: the mortar itself (its rockets are the line-thrower's crates) */
export function makePickupMortar(kind, tex, weaponTex, gunTex) {
  const g = new THREE.Group();
  const gun = makeMortar(weaponTex || tex, gunTex, { hands: false }).group; gun.scale.setScalar(0.62); gun.rotation.set(0, PI / 2, 0); gun.position.y = 0.32; g.add(gun);
  const glow = new THREE.Mesh(new THREE.IcosahedronGeometry(0.07, 0), new THREE.MeshBasicMaterial({ color: 0xffa040 })); glow.position.y = 0.8; g.add(glow);
  return g;
}
