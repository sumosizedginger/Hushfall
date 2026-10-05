// DEV-ONLY render diagnostics (render truth). Imported by src/game/testhook.js only, which main.js loads behind `import.meta.env.DEV`, so none of this ships in a
// production build. Read-only: it measures what GameView has put in the scene and changes nothing.
import * as THREE from 'three';
import { ENEMIES } from '../engine/defs.js';
import { floorAt, groundAt } from '../engine/terrain.js';
import { debrisFloor } from './debris.js';

/** per enemy, the sim's numbers next to what is actually DRAWN, in world space (PT-001/PT-002). `min`/`max` are the exact vertex bounds of the mesh on screen (the live rig,
 *  or the merged mesh of a sleeper), `root` is the rig's world position. `ground` is the sim's own contract (groundAt over the actor's footprint, what e.y is kept equal to);
 *  `floorCentre` is the centre-cell floor, kept only to show where the two differ. */
export function enemyBounds(view, w) {
  const out = [], b = new THREE.Box3(), wp = new THREE.Vector3();
  for (const e of w.enemies) {
    const v = view.enemyViews.get(e.id); if (!v) continue; const obj = v.frozen ?? v.root; if (obj === v.root && !v.root.visible) continue;
    obj.updateMatrixWorld(true); b.setFromObject(obj, true); v.root.getWorldPosition(wp); const def = ENEMIES[e.kind];
    out.push({ id: e.id, kind: e.kind, state: e.state, dead: e.dead, yaw: e.yaw, sim: { x: e.x, y: e.y ?? 0, z: e.z }, ground: groundAt(w, e.x, e.z, def.radius), floorCentre: floorAt(w, e.x, e.z), hit: { radius: def.radius, height: def.height, hitRadius: def.hitRadius ?? def.radius, hitForward: def.hitForward ?? 0 },
      root: { x: wp.x, y: wp.y, z: wp.z }, min: [b.min.x, b.min.y, b.min.z], max: [b.max.x, b.max.y, b.max.z], frozen: !!v.frozen });
  }
  return out;
}
/** where the Cantor's shield and the ring beams are actually drawn (world space), to compare with the body */
export function encounterProbe(view) {
  const sh = view.shield; return { shield: sh && sh.visible ? { x: sh.position.x, y: sh.position.y, z: sh.position.z, r: sh.scale.x } : null, beams: [...view.beams].map(([key, m]) => ({ key, a: m.userData.a, b: m.userData.b })) };
}
/** every live piece of debris with the floor it will land on */
export function debrisProbe(view, w) {
  return view.debris.map((d) => ({ y: d.m.position.y, floor: d.ground == null ? null : debrisFloor(w, d.m.position.x, d.m.position.z, d.ground) }));
}
