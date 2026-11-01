// The shield of a boss whose nodes still live (the Cantor's ring, the Graft-Mother's feeders, the Root Bell's anchors, the Gate Warden's seals): PT-021 step 3. It was a teal wireframe icosphere (the outside critique: "the old
// alien toy... a pulse or a ring of sound, not a glow sphere"), then three bands of curved plates; at the game's 480 pixels those plates read as tall flat translucent slabs with ink round them (Art Gate 0,
// design/ART_GATE0_EVIDENCE.md row 6). PT-080: it is a BELL OF SOUND round the boss: one bell-shaped shell, clear where you look straight through it (the boss shows), glowing where you see it edge-on, with rings
// of sound running up it from its lip, and a second, finer shell turning the other way inside it. It still says the two things it must: "you cannot hurt it now" (the shell is there while the sim says the shield
// stands) and "that hit was absorbed" (the whole bell lights, and view.js sends a ring of sound out along the floor). When the last node dies the shell is shed (view.js throws it off as debris).
// Unit radius at the lip, about two units tall; the caller scales and places the group. Additive and depth-blind: it adds light, it never paints a slab over the boss, and the ink pass never outlines it.
import * as THREE from 'three';
import { shellMaterial } from './glowfx.js';

export const SHIELD = { rest: 0.2, flare: 0.95, shells: [{ k: 1, rings: 9, speed: 1.1, spin: 0.35 }, { k: 0.86, rings: 14, speed: -0.7, spin: -0.5 }] };

/** a church bell's outline, crown to lip, as [radius, y] (y from about -1 to 1) */
const BELL = [[0.18, 1.0], [0.42, 0.94], [0.62, 0.78], [0.72, 0.5], [0.76, 0.18], [0.8, -0.18], [0.88, -0.56], [0.96, -0.86], [1.0, -1.0]];

export function makeShield() {
  const group = new THREE.Group(), rings = [];
  for (const s of SHIELD.shells) {
    const g = new THREE.LatheGeometry(BELL.map(([r, y]) => new THREE.Vector2(r * s.k, y * s.k)), 40);
    const m = new THREE.Mesh(g, shellMaterial(0x3fffe0, SHIELD.rest, s.rings, s.speed)); m.userData.spin = s.spin; m.renderOrder = 3; group.add(m); rings.push(m);
  }
  /** turn the shells and set their strength: `flash` 0..1 is how recently a hit was absorbed */
  const update = (time, flash = 0) => { rings.forEach((m, i) => { m.rotation.y = time * m.userData.spin + i; const u = m.material.userData.u; u.uTime.value = time; u.uFlash.value = flash; m.material.opacity = SHIELD.rest + (SHIELD.flare - SHIELD.rest) * flash; }); };
  return { group, rings, update };
}
