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
  const G = (geom, cell, m = gmat) => new THREE.Mesh(atlas(geom, cell), m);
  return { G, gmat, H: hand.M, handMat: hand.mat, sleeveMat: hand.sleeveMat };
}

/** a turned part along +y: `prof` = [radius, y] pairs up the axis (a grip's swell, a fore-end's belly), spun into a lathe */
export function lathe(K, cell, prof, sides = 10, m) { return K.G(new THREE.LatheGeometry(prof.map(([r, y]) => new THREE.Vector2(r, y)), sides), cell, m); }

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
