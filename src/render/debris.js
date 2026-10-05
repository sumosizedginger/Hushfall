// Where a piece of debris stops. It used to be removed at world y < 0, which is the floor only on flat ground: over a raised floor (the M02 gallery, 3 m up) the chips
// fell THROUGH it and lived on, invisibly, until their lifetime ran out. The floor is the terrain under the debris (static heights and moving floors, from the sim's own
// floorAt), except while it is still inside a wall cell (impacts are emitted where the ray stopped, one step inside the wall): then it lands on the room it came from.
import { floorAt, groundAt } from '../engine/terrain.js';

/** the floor of the room an impact belongs to, measured once at the first update: the highest floor within 0.6 m (the neighbouring open cell of a wall hit) */
export const spawnGround = (w, x, z) => groundAt(w, x, z, 0.6);

/** y below which debris at (x, z) has hit the ground; `spawn` = spawnGround() for this piece */
export function debrisFloor(w, x, z, spawn) {
  const m = w.map, cx = Math.floor(x / m.cell), cz = Math.floor(z / m.cell);
  return m.kind(cx, cz) === 'wall' ? spawn : floorAt(w, x, z);
}
