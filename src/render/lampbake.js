// Darkness and pools of light (design/VISUAL_AWE_PLAN.md, session A2). The level's walls, floors and ceilings were lit evenly and only the nearest
// eight lamps were ever on, so no room had a dark corner or a bright one. Here every lamp of the map is baked ONCE into the level mesh's vertex
// colours when the level is built: under a roof the general light is turned down, and each lamp adds a warm pool that walls stop. It costs nothing
// per frame. The real point lights stay, for creatures, the gun and whatever moves.
// Drawn only: nothing here reads or writes the simulation. The maths is pure (no Three) so node tests hold it; `bakeMeshes` is the one function
// that touches geometry.

/** the numbers; a look may carry its own `indoor` block (LOOKS in defs.js), else these */
export const LAMP_BAKE = Object.freeze({
  ambient: 0.42, // the general light left under a roof, where the map has lamps to see by
  lampGain: 1.45, // how much a lamp adds at its foot
  outdoorGain: 0.45, // a lamp under open sky adds less: the sky is already lighting the place
  warm: 0.6, // how far a lit surface takes the lamp's colour
  reach: 11, // metres a lamp reaches when its light names no distance
  cap: 2.1, // the brightest a surface is ever baked
  floorMin: 0.22, // no floor a player walks on is baked darker than this
  minLamps: 3, // a map with fewer lamps than this keeps its general light: there would be nothing to see by
});

/** is there a wall cell on the straight line from (x0, z0) to (x1, z1)? `solid(cx, cz)`, `S` the cell size; the two end cells are not tested */
export function wallBetween(solid, S, x0, z0, x1, z1) {
  const d = Math.hypot(x1 - x0, z1 - z0),
    n = Math.ceil(d / (S * 0.45)),
    c0 = Math.floor(x0 / S) + ',' + Math.floor(z0 / S),
    c1 = Math.floor(x1 / S) + ',' + Math.floor(z1 / S);
  for (let i = 1; i < n; i++) {
    const t = i / n,
      cx = Math.floor((x0 + (x1 - x0) * t) / S),
      cz = Math.floor((z0 + (z1 - z0) * t) / S),
      k = cx + ',' + cz;
    if (k !== c0 && k !== c1 && solid(cx, cz)) return true;
  }
  return false;
}

/** how much of one lamp reaches a point `d` metres away: 1 at the lamp, 0 at its reach, falling off smoothly */
export const lampFalloff = (d, reach) => {
  const t = 1 - d / reach;
  return t <= 0 ? 0 : t * t;
};

/**
 * the baked light at a point: [r, g, b] multipliers. `lamps` = [{ x, y, z, reach, power, color: [r, g, b] }], `roofed` = the point is under a roof,
 * `cfg` = LAMP_BAKE (or a look's own), `dim` = whether the map's general light is turned down at all
 */
export function lightAt(px, py, pz, lamps, solid, S, roofed, cfg = LAMP_BAKE, dim = true) {
  let sum = 0,
    cr = 0,
    cg = 0,
    cb = 0;
  for (const l of lamps) {
    const dx = l.x - px,
      dz = l.z - pz;
    if (Math.abs(dx) > l.reach || Math.abs(dz) > l.reach) continue;
    const d = Math.hypot(dx, l.y - py, dz),
      w = lampFalloff(d, l.reach) * l.power;
    if (w <= 0.004 || wallBetween(solid, S, l.x, l.z, px, pz)) continue;
    sum += w;
    cr += w * l.color[0];
    cg += w * l.color[1];
    cb += w * l.color[2];
  }
  const base = roofed && dim ? cfg.ambient : 1,
    add = sum * (roofed ? cfg.lampGain : cfg.outdoorGain),
    k = Math.min(cfg.cap, base + add);
  if (sum <= 0) return [k, k, k];
  // the lamp's share of the light at this point decides how much of its colour the surface takes
  const share = (add / (base + add)) * cfg.warm,
    m = Math.max(cr, cg, cb) || 1,
    tr = 1 + (cr / m - 1) * share,
    tg = 1 + (cg / m - 1) * share,
    tb = 1 + (cb / m - 1) * share;
  return [k * tr, k * tg, k * tb];
}

/** the lamps of a built level as plain data: `lights` = THREE.PointLight list (world matrices current) */
export function lampsOf(lights, cfg = LAMP_BAKE) {
  const out = [];
  for (const l of lights) {
    const e = l.matrixWorld.elements,
      base = l.userData?.base ?? l.intensity ?? 0;
    if (!(base > 0)) continue;
    out.push({
      x: e[12],
      y: e[13],
      z: e[14],
      reach: l.distance > 0 ? Math.min(l.distance, 16) : cfg.reach,
      power: Math.max(0.35, Math.min(1.4, base / 60)),
      color: [l.color.r, l.color.g, l.color.b],
    });
  }
  return out;
}

/**
 * bake the lamps into the level's meshes. `meshes` = [{ geometry, surf }] (surf: 'wall' | 'floor' | 'ceil' | 'riser'), `map` the MapData,
 * `look` the place's look (its `indoor` block overrides LAMP_BAKE). A dark map (the hand lantern's) is left exactly as it was.
 * Returns { lamps, dimmed, verts } for the tests and the dev hook.
 */
export function bakeMeshes(meshes, lights, map, look) {
  const cfg = { ...LAMP_BAKE, ...(look?.indoor ?? {}) },
    lamps = lampsOf(lights, cfg),
    S = map.cell,
    stats = { lamps: lamps.length, dimmed: false, verts: 0 };
  if (map.dark || !lamps.length) return stats;
  const solid = (cx, cz) => cx < 0 || cz < 0 || cx >= map.w || cz >= map.h || map.kind(cx, cz) === 'wall',
    roofedAt = (x, z) => {
      const k = map.kind(Math.floor(x / S), Math.floor(z / S));
      return k === 'floor' || k === 'door' || k === 'secret';
    },
    dim = lamps.length >= cfg.minLamps;
  stats.dimmed = dim;
  for (const { geometry: g, surf } of meshes) {
    const pos = g.getAttribute('position'),
      nor = g.getAttribute('normal');
    if (!pos || !nor) continue;
    if (!g.getAttribute('color')) g.setAttribute('color', new pos.constructor(new Float32Array(pos.count * 3).fill(1), 3)); // (trims carry none)
    const col = g.getAttribute('color');
    for (let q = 0; q + 3 < pos.count; q += 4) {
      // every quad has four vertices; whether it is under a roof is decided once, from a point just in front of its middle
      let mx = 0,
        mz = 0;
      for (let i = q; i < q + 4; i++) {
        mx += pos.getX(i) / 4;
        mz += pos.getZ(i) / 4;
      }
      const nx = nor.getX(q),
        ny = nor.getY(q),
        nz = nor.getZ(q),
        roofed = roofedAt(mx + nx * 0.3, mz + nz * 0.3);
      for (let i = q; i < q + 4; i++) {
        // the light is read a hand's width off the surface and a little toward the quad's middle, so a corner vertex is not inside the wall it meets
        const px = pos.getX(i) + nx * 0.25 + (mx - pos.getX(i)) * 0.12,
          py = pos.getY(i) + ny * 0.25,
          pz = pos.getZ(i) + nz * 0.25 + (mz - pos.getZ(i)) * 0.12,
          k = lightAt(px, py, pz, lamps, solid, S, roofed, cfg, dim);
        let r = col.getX(i) * k[0],
          gg = col.getY(i) * k[1],
          b = col.getZ(i) * k[2];
        if (surf === 'floor') {
          const m = Math.max(r, gg, b);
          if (m < cfg.floorMin) {
            const up = cfg.floorMin / Math.max(m, 1e-4);
            r *= up;
            gg *= up;
            b *= up;
          }
        }
        col.setXYZ(i, r, gg, b);
        stats.verts++;
      }
    }
    col.needsUpdate = true;
  }
  return stats;
}
