// What the five guns share (PT-021 step 3), and nothing else: their own materials, and HANDS that look like hands. The outside critique: "the guns are still the same yellow glove on five thin sticks... Bigger in the frame.
// Different materials. A hand that looks like a hand." The guns' bodies are in models_guns.js / models_rivet.js / models_harpoon.js / models_arc.js; this is the kit they are made from.
//   gunKit(tex, gunTex)   tex = the weapon atlas (the hands, wraps and sleeves: cells 4, 8, 9), gunTex = guns_atlas (every gun's own steel, wood, brass, rubber...; PT-021). The gun material says userData.atlas = 'guns' so the
//                          node rasteriser can sample the right image when the rigs are built without textures.
//   fist(K, ...)           the finger-ring hand of the melee weapons (models_melee.js glove()) closed round a grip or a fore-end, and its forearm: a swept sleeve from below the screen, built once (the gun carries it)
import * as THREE from 'three';
import { atlas } from './atlasuv.js';
import { kit as meleeKit, arm, glove } from './models_melee.js';

/** every gun's materials: G(geometry, gunCell[, material]) a part of the gun, H(geometry, handCell) a part of a hand, sleeveMat the forearms' (faded in the sights) */
export function gunKit(tex, gunTex) {
  const hand = meleeKit(tex), gmat = new THREE.MeshLambertMaterial({ map: gunTex ?? tex, emissive: 0x1a1410 }); gmat.userData.atlas = 'guns';
  hand.sleeveMat.color.setHex(0x4a5650); hand.mat.color.setHex(0x9a8670);                               // look polish 1: Ines's oilskin sleeves are dark and her wrapped hands weathered leather, not a white mass at the edge of the picture
  const G = (geom, cell, m = gmat) => new THREE.Mesh(atlas(smooth(geom), cell), m);
  return { G, gmat, H: hand.M, handMat: hand.mat, sleeveMat: hand.sleeveMat };
}

/** look polish 1: the held gun is drawn at the screen's resolution now, so a 10-sided barrel shows its facets: round parts get at least 20 sides (cylinders, tori and lathes; everything else as it was) */
export function smooth(geom) {
  const p = geom.parameters ?? {};
  if (geom.type === 'CylinderGeometry' && p.radialSegments < 20) { geom.dispose(); return new THREE.CylinderGeometry(p.radiusTop, p.radiusBottom, p.height, 20, p.heightSegments, p.openEnded, p.thetaStart, p.thetaLength); }
  if (geom.type === 'TorusGeometry' && p.tubularSegments < 24) { geom.dispose(); return new THREE.TorusGeometry(p.radius, p.tube, Math.max(p.radialSegments, 8), 24, p.arc); }
  if (geom.type === 'LatheGeometry' && p.segments < 20) { geom.dispose(); return new THREE.LatheGeometry(p.points, 20, p.phiStart, p.phiLength); }
  return geom;
}

/**
 * LOOK POLISH 7: a muzzle flash that reads as fire, not two opaque balls (drawn crisp at the screen's resolution they showed every facet): a soft glow, a flame cone thrown forward, five petals of fire
 * round the muzzle (the view turns the whole flash a random amount each shot, so no two are alike) and a white-hot core. All additive, none writes depth. r = the old outer ball's radius.
 */
export function muzzleFlash(r, color, hot = 0xfff4d0) {
  const g = new THREE.Group(), add = (geom, c, op) => { const m = new THREE.Mesh(geom, new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: op, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })); m.renderOrder = 5; g.add(m); return m; };
  for (const [k, op] of [[1.5, 0.09], [1.1, 0.12], [0.78, 0.18]]) add(new THREE.SphereGeometry(r * k, 16, 10), color, op);          // the glow in three soft bands (one sphere showed a hard rim)
  const cone = add(new THREE.ConeGeometry(r * 0.62, r * 3.2, 14, 1, true), color, 0.4); cone.rotation.x = -Math.PI / 2; cone.position.z = -r * 1.5;          // the flame thrown down the line of fire
  const blade = new THREE.BufferGeometry(); blade.setAttribute('position', new THREE.Float32BufferAttribute([-r * 0.26, 0, 0, r * 0.26, 0, 0, 0, r * 2.1, 0], 3));
  for (let i = 0; i < 5; i++) { const m = add(blade, i % 2 ? hot : color, 0.62); m.rotation.z = i * (Math.PI * 2 / 5) + (i % 2) * 0.35; m.scale.y = i % 2 ? 0.66 : 1; }
  add(new THREE.SphereGeometry(r * 0.5, 12, 8), hot, 1);
  g.userData.muzzle = true; return g;
}

/** a turned part along +y: `prof` = [radius, y] pairs up the axis (a grip's swell, a fore-end's belly), spun into a lathe */
export function lathe(K, cell, prof, sides = 20, m) { return K.G(new THREE.LatheGeometry(prof.map(([r, y]) => new THREE.Vector2(r, y)), sides), cell, m); }

/**
 * A fist closed round a grip, and the forearm that comes up from below the screen to it. `at` = the hand's centre in the gun's space, `rot` = [rx, ry, rz] of the closed hand (the grip runs along the hand's y axis; its back is
 * toward +z of the hand before `rot`), `shoulder` = where the forearm starts (also gun space, far below and behind), `pole` = which way the elbow bends. The forearm is a continuous swept sleeve (models_melee.js arm()),
 * solved ONCE here: the gun carries it. Everything is in the gun's space, which the view scales (about 0.7), so sizes are authored 1/0.7 larger than a hand: `k`.
 */
export function fist(K, parent, { at, rot, shoulder, pole, k = 1.35, armParent = parent, thumb = 1 }) {
  const h = glove(K.H); h.scale.set(k * thumb, k, k); h.position.set(...at); h.rotation.set(...rot); parent.add(h);
  const a = arm((g, c) => new THREE.Mesh(atlas(g, c), K.sleeveMat), K.sleeveMat, 0.074, 0.9, 0.9);        // the cuff fades with the sleeve in the sights
  a.aim(shoulder, at, pole); armParent.add(a.mesh); armParent.add(a.cuff);
  return { hand: h, arm: a };
}
