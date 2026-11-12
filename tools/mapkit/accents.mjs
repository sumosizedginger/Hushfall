// ROOM ACCENTS (item G3 of design/ASSESSMENT_2026-11-10.md, Session 12 of design/OPUS_HANDOFF.md): a room laid in one floor skin reads flat
// (tools/dev/materials-lint.mjs). `floorBorder` lays a second skin in a one-cell band round the room, where its floor meets anything that is not
// floor (a wall, a door, a pillar): plate along the walls and the room's own floor in the middle.
// Only the CHARACTER of a floor cell changes, never its kind ('floor' stays roofed, 'outdoor' stays open: checked), height, effect or object, and
// only to a skin of the SAME surface family
// (src/engine/surfaces.js), so the simulation and every event it emits are unchanged: tools/dev/route-fingerprint.mjs proves it per map.
// Call it in a map source BEFORE L.layers() (a block after it silently does nothing).
import { FLOOR_SKINS } from '../../src/engine/defs.js';
import { FLOOR_FAMILY } from '../../src/engine/surfaces.js';

const familyOf = (ch) => FLOOR_FAMILY[FLOOR_SKINS[ch]?.tex];

/**
 * for each seed cell [x, z] standing on floor `from`, the room of `from` cells joined to it (4-neighbours) gets `to` on every cell that touches a
 * cell that is not floor. Returns the number of cells changed. Throws if the two skins are of different surface families.
 */
export function floorBorder(L, seeds, from, to) {
  if (!FLOOR_SKINS[from] || !FLOOR_SKINS[to]) throw new Error(`floorBorder: '${from}' and '${to}' must both be floor skins`);
  if (familyOf(from) !== familyOf(to)) throw new Error(`floorBorder: '${from}' (${familyOf(from)}) and '${to}' (${familyOf(to)}) are different surface families`);
  // the KIND too: an 'outdoor' skin has no roof over it, so a swap between 'floor' and 'outdoor' would open or close the sky
  if (FLOOR_SKINS[from].kind !== FLOOR_SKINS[to].kind) throw new Error(`floorBorder: '${from}' (${FLOOR_SKINS[from].kind}) and '${to}' (${FLOOR_SKINS[to].kind}) are different kinds`);
  const at = (x, z) => L.g[z]?.[x],
    seen = new Set(),
    border = [];
  for (const [x0, z0] of seeds) {
    // a seed may name a room by a cell a pillar or a prop stands on: the nearest cell of `from` within three cells stands for it
    let seed = null;
    for (let r = 0; r <= 3 && !seed; r++)
      for (let dz = -r; dz <= r && !seed; dz++) for (let dx = -r; dx <= r && !seed; dx++) if (at(x0 + dx, z0 + dz) === from) seed = [x0 + dx, z0 + dz];
    if (!seed) throw new Error(`floorBorder: no '${from}' within three cells of the seed ${x0},${z0}`);
    const stack = [seed];
    while (stack.length) {
      const [x, z] = stack.pop(),
        k = x + ',' + z;
      if (seen.has(k) || at(x, z) !== from) continue;
      seen.add(k);
      let edge = false;
      for (const [dx, dz] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ]) {
        const c = at(x + dx, z + dz);
        if (c === undefined || !FLOOR_SKINS[c]) edge = true;
        else if (c === from) stack.push([x + dx, z + dz]);
      }
      if (edge) border.push([x, z]);
    }
  }
  for (const [x, z] of border) L.g[z][x] = to;
  return border.length;
}
