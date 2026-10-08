// Iron sights for the first-person guns (PT-011): a REAL sight picture, not two 3 px bumps. A rear U-notch (two posts joined by a base block) and a front blade with a bright tip, sized to read at the
// game's 480 px internal width when the gun is raised to the eye. Returns the anchors view/weapon-pose.js aligns with the eye: `rear` = the middle of the notch, `front` = the tip of the blade.
//   o.rearZ / o.frontZ   where they stand along the gun (group space, -z is forward)
//   o.rearBase / o.frontBase   the y of the surface each stands on (the receiver's top, the muzzle ring's top)
//   o.line               the y of the sight line (the notch centre and the blade tip): the posts and the blade are built up to it
//   o.gap, o.post        half-width of the notch, width of a post
import * as THREE from 'three';
import { atlas } from './atlasuv.js';

export function ironSights(group, mat, cellIron, o) {
  const { rearZ, frontZ, rearBase, frontBase, line, gap = 0.03, post = 0.02, bright = 0xffe08a, peep = false } = o;
  const M = (g) => new THREE.Mesh(atlas(g, cellIron), mat);
  const hP = line - rearBase + 0.012;                                                        // the posts stand a little above the line
  if (peep) {                                                                                // a rifle's aperture: a thick ring on a post, the eye looks through the hole
    const ring = M(new THREE.TorusGeometry(gap, post * 0.55, 5, 14)); ring.position.set(0, line, rearZ); group.add(ring);
    const stem = M(new THREE.BoxGeometry(post, line - gap - rearBase, 0.02)); stem.position.set(0, rearBase + (line - gap - rearBase) / 2, rearZ); group.add(stem);
  } else {
    for (const s of [-1, 1]) { const p = M(new THREE.BoxGeometry(post, hP, 0.02)); p.position.set(s * (gap + post / 2), rearBase + hP / 2, rearZ); group.add(p); }
    const base = M(new THREE.BoxGeometry(2 * gap + 2 * post, 0.012, 0.024)); base.position.set(0, rearBase + 0.006, rearZ); group.add(base);
  }
  const hB = line - frontBase + 0.008;
  const blade = new THREE.Mesh(new THREE.BoxGeometry(0.017, hB, 0.014), new THREE.MeshBasicMaterial({ color: bright })); blade.position.set(0, frontBase + hB / 2, frontZ); group.add(blade);
  const foot = M(new THREE.BoxGeometry(0.04, 0.012, 0.03)); foot.position.set(0, frontBase + 0.005, frontZ); group.add(foot);
  return { rear: [0, line, rearZ], front: [0, line, frontZ] };
}

/**
 * A tang: the top of the receiver carried BACK and DOWN toward the shoulder, so that with the gun raised to the eye you look along a ramp that widens to the bottom of the screen, not at a flat
 * vertical rear face (the owner's PT-011 stills: a 160-230 px slab). (z, y) = the rear top edge of the plate it continues; width = its width; len = its length along the slope; drop = angle in radians.
 */
export function tang(group, mat, cell, { z, y, width, len = 0.5, drop = 0.45, thick = 0.025 }) {
  const m = new THREE.Mesh(atlas(new THREE.BoxGeometry(width, thick, len), cell), mat), c = Math.cos(drop), s = Math.sin(drop), oy = -thick / 2, oz = len / 2;
  m.rotation.x = drop; m.position.set(0, y + (oy * c - oz * s), z + (oy * s + oz * c)); group.add(m); return m;
}
