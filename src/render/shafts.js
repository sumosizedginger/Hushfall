// Light shafts (design/VISUAL_AWE_PLAN.md, session A5). Where a roofed room opens onto the sky (a doorway, a broken roof, an arcade) and the sun
// stands on that side, a faint slab of light slants in from the top of the opening to the floor. With the sun's shadows (sunshadow.js) the floor
// inside is already lit through the opening; this is the lit air above it.
// Still geometry built once per level, additive and faint: it adds light, it never hides anything (and it fades to nothing at the floor, where
// creatures stand). Drawn only. `findOpenings` is pure (no Three) and tested.
import * as THREE from 'three';

export const SHAFTS = Object.freeze({
  strength: 0.16, // the light added at the top of an opening
  minElev: 12, // degrees: a sun lower than this sends its light too far to draw; higher than maxElev it barely enters
  maxElev: 68,
  maxLen: 9, // metres a shaft reaches along the floor at most
  maxHead: 3.4, // metres: the opening's height is the room's, but never more than this
  facing: 0.25, // how squarely the opening must face the sun (the cosine)
  cap: 80, // shafts per level at most (the nearest the start first)
});

const DIRS = [
  [0, -1],
  [0, 1],
  [-1, 0],
  [1, 0],
];
const roofed = (k) => k === 'floor' || k === 'door' || k === 'secret',
  open = (k) => k === 'outdoor';

/**
 * the openings of a map that the sun shines through: `sunDir` = [x, y, z] pointing from the ground to the sun. Each: { cx, cz (the roofed cell),
 * dx, dz (from the open cell into the room), len (metres the light reaches along the floor), head (the opening's height), y (its floor) }
 */
export function findOpenings(map, sunDir) {
  const hl = Math.hypot(sunDir[0], sunDir[2]),
    elev = (Math.atan2(sunDir[1], hl) * 180) / Math.PI,
    out = [];
  if (!(hl > 1e-6) || elev < SHAFTS.minElev || elev > SHAFTS.maxElev) return out;
  const lx = -sunDir[0] / hl, // the way the light travels along the ground
    lz = -sunDir[2] / hl,
    S = map.cell;
  for (let cz = 0; cz < map.h; cz++)
    for (let cx = 0; cx < map.w; cx++) {
      if (!roofed(map.kind(cx, cz))) continue;
      for (const [dx, dz] of DIRS) {
        // the open cell is at (cx - dx, cz - dz); the light must travel from it into the room
        if (!open(map.kind(cx - dx, cz - dz)) || lx * dx + lz * dz < SHAFTS.facing) continue;
        const y = map.floor(cx, cz),
          head = Math.min(SHAFTS.maxHead, map.ceilingAt(cx, cz) - y);
        if (!(head > 1.2) || Math.abs(map.floor(cx - dx, cz - dz) - y) > 0.6) continue;
        // how far the light runs before a wall: walked in half cells from the middle of the opening
        const ex = (cx + 0.5 - dx * 0.5) * S,
          ez = (cz + 0.5 - dz * 0.5) * S;
        let len = Math.min(SHAFTS.maxLen, head / Math.tan((elev * Math.PI) / 180));
        for (let t = S * 0.5; t < len; t += S * 0.5) {
          const k = map.kind(Math.floor((ex + lx * t) / S), Math.floor((ez + lz * t) / S));
          if (k === 'wall') {
            len = t;
            break;
          }
        }
        if (len > 0.8) out.push({ cx, cz, dx, dz, len, head, y });
      }
    }
  return out;
}

/** the shafts of a level as one additive mesh (null when there are none): `look` gives the sun's direction and colour */
export function buildShafts(map, look) {
  if (map.dark) return null;
  const sunDir = look.sun[2],
    hl = Math.hypot(sunDir[0], sunDir[2]);
  let ops = findOpenings(map, sunDir);
  if (!ops.length) return null;
  if (ops.length > SHAFTS.cap) {
    const sx = map.spawn.x / map.cell,
      sz = map.spawn.z / map.cell;
    ops = ops.sort((a, b) => Math.hypot(a.cx - sx, a.cz - sz) - Math.hypot(b.cx - sx, b.cz - sz)).slice(0, SHAFTS.cap);
  }
  const lx = -sunDir[0] / hl,
    lz = -sunDir[2] / hl,
    S = map.cell,
    c = new THREE.Color(look.sun[0]),
    k = SHAFTS.strength,
    pos = [],
    col = [],
    idx = [];
  const quad = (a, b, c2, d, ka, kb) => {
    const base = pos.length / 3;
    pos.push(...a, ...b, ...c2, ...d);
    for (const kk of [ka, ka, kb, kb]) col.push(c.r * kk, c.g * kk, c.b * kk);
    idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
  };
  for (const o of ops) {
    // the opening's edge: the side of the roofed cell that faces the open one
    const mx = (o.cx + 0.5 - o.dx * 0.5) * S,
      mz = (o.cz + 0.5 - o.dz * 0.5) * S,
      tx = -o.dz * S * 0.5, // along the edge
      tz = o.dx * S * 0.5,
      p0 = [mx - tx, mz - tz],
      p1 = [mx + tx, mz + tz],
      top = o.y + o.head,
      fx = lx * o.len,
      fz = lz * o.len;
    // the top of the lit air: from the head of the opening down to where the light meets the floor (bright at the opening, nothing at the floor)
    quad([p0[0], top, p0[1]], [p1[0], top, p1[1]], [p1[0] + fx, o.y + 0.05, p1[1] + fz], [p0[0] + fx, o.y + 0.05, p0[1] + fz], k, 0);
    // a second, fainter sheet from half the opening's height, so the shaft has a body when it is seen from the side
    quad(
      [p0[0], o.y + o.head * 0.5, p0[1]],
      [p1[0], o.y + o.head * 0.5, p1[1]],
      [p1[0] + fx * 0.5, o.y + 0.05, p1[1] + fz * 0.5],
      [p0[0] + fx * 0.5, o.y + 0.05, p0[1] + fz * 0.5],
      k * 0.6,
      0,
    );
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setIndex(idx);
  const mesh = new THREE.Mesh(
    g,
    new THREE.MeshBasicMaterial({
      vertexColors: true,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
      fog: false,
    }),
  );
  mesh.renderOrder = 4;
  mesh.userData.shafts = ops.length;
  return mesh;
}
