// The shield of a boss whose nodes still live (the Cantor's ring, the Graft-Mother's feeders): PT-021 step 3. It was a teal wireframe icosphere, a glow ball (the outside critique: "the old alien toy... a pulse or a ring of
// sound, not a glow sphere"). It still has to say two things clearly, and does: "you cannot hurt it now" (the plates are there while the sim says the shield stands) and "that hit was absorbed" (the plates flare and a ring of sound
// goes out from the boss: see `ripple`). When the last node dies the plates are shed (view.js throws them off as debris).
// Three bands of curved plates, each a ring of ten with gaps between, turning against each other: a cage of bells, not a ball. Unit radius; the caller scales the group.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export const SHIELD = { bands: [{ y: 0.55, h: 0.7, spin: 0.55 }, { y: 0, h: 0.8, spin: -0.4 }, { y: -0.55, h: 0.7, spin: 0.7 }], plates: 10, arc: 0.5, rest: 0.42, flare: 0.95 };

export function makeShield() {
  const group = new THREE.Group(), rings = [];
  for (const b of SHIELD.bands) {
    const parts = []; for (let i = 0; i < SHIELD.plates; i++) { const g = new THREE.CylinderGeometry(1, 1, b.h, 6, 1, true, 0, SHIELD.arc); g.rotateY(i * Math.PI * 2 / SHIELD.plates); parts.push(g); }
    const m = new THREE.Mesh(mergeGeometries(parts), new THREE.MeshBasicMaterial({ color: 0x3fffe0, transparent: true, opacity: SHIELD.rest, side: THREE.DoubleSide, depthWrite: false }));
    parts.forEach((p) => p.dispose()); m.position.y = b.y; m.userData.spin = b.spin; group.add(m); rings.push(m);
  }
  /** turn the bands and set their strength: `flash` 0..1 is how recently a hit was absorbed */
  const update = (time, flash = 0) => { rings.forEach((m, i) => { m.rotation.y = time * m.userData.spin + i; m.material.opacity = SHIELD.rest + (SHIELD.flare - SHIELD.rest) * flash; m.material.color.setHex(flash > 0.05 ? 0xd8fff8 : 0x3fffe0); }); };
  return { group, rings, update };
}
