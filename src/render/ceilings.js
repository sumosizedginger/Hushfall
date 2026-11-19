// CEILINGS BY PLACE (2026-11-18, the visual pass: "make the levels stop looking like test chambers"). Every roofed cell of every map wore the same
// timber planks and the same timber beams, from the harbour office to the inside of the Vael ship and the Hive, and it was the strongest sign in
// all 68 openings that these rooms were made by one tool. Now a roofed cell takes a FAMILY from the walls round it (the nearest wall skin, then the
// floor's), and a family has its own ceiling texture (from the baked set) and its own overhead structure:
//   timber : the planks and a beam every other row (as before: the harbour, the customs house, the cellars, the kilns)
//   stone  : flagged stone and deep transverse ribs (churches, naves, the reliquary, the ossuary, the mourning halls)
//   iron   : riveted plate, I-section girders across, and a pair of pipes along the room (works, foundries, docks, the reactor)
//   organic: the Vael's grown ceiling, ribs that sag in the middle and cords hanging from them (the ship, the loom, the Hive, the heart)
//   cave   : bare rock and clusters of stone teeth (the Deep, the fault, the roots, the rime)
//   pale   : the Gate's builders: pale stone in deep coffers (the Gate, the approach, the stair, the mirror array)
// Drawn only, like the trims: the simulation, its collisions, sight lines and shots never see any of it. Every piece hangs from the ceiling and stops
// at least CEIL.clear m above the floor under it; under a low ceiling there is no structure at all. Pure and deterministic per map.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { WALL_SKINS, FLOOR_SKINS } from '../engine/defs.js';

export const CEIL = Object.freeze({
  clear: 2.7, // nothing hangs lower than this above its floor
  reach: 6, // how far (cells) a roofed cell looks for a wall to take its family from
  families: {
    timber: { tex: 'ceiling_a', tint: 0xa89888 },
    stone: { tex: 'floor_flag_a', tint: 0x8c867e },
    iron: { tex: 'wall_iron_a', tint: 0x8a8a90 },
    organic: { tex: 'wall_rib_a', tint: 0x9a8478 },
    cave: { tex: 'wall_deeprock_a', tint: 0x7a7470 },
    pale: { tex: 'wall_gate_a', tint: 0xb8b4ac },
  },
});

// a wall or floor texture name -> its family (the first word that matches; anything unknown is timber, the old look)
const WORDS = [
  [
    'organic',
    [
      'rib',
      'chitin',
      'throat',
      'loom',
      'loft',
      'heart',
      'nerve',
      'vein',
      'bonewoven',
      'bonecoral',
      'resin',
      'hive',
      'drowned',
      'bellinside',
      'rootbark',
      'rootwell',
      'flesh',
      'gill',
      'spore',
      'woven',
      'membrane',
    ],
  ],
  ['cave', ['deeprock', 'fault', 'glasscrust', 'crystal', 'rime', 'flowstone', 'rootloam', 'faultrock', 'silt', 'prism']],
  ['pale', ['gate', 'approach', 'stair', 'unrung', 'quiet', 'glass', 'mirror']],
  [
    'iron',
    ['lattice', 'iron', 'bulkhead', 'hull', 'foundry', 'reactor', 'corrugated', 'concrete', 'saltplate', 'dock', 'grate', 'deck', 'track', 'clinker', 'slurry'],
  ],
  [
    'stone',
    ['ashstone', 'basalt', 'citystone', 'marble', 'mourning', 'ossuary', 'reliquary', 'amphi', 'tidestone', 'flag', 'slate', 'bellstone', 'tile', 'terrace'],
  ],
];
export function familyOfTex(name = '') {
  const n = String(name);
  for (const [fam, words] of WORDS) if (words.some((w) => n.includes(w))) return fam;
  return 'timber';
}

/** the family of every roofed cell: Map 'cx,cz' -> family name (nearest wall skin within CEIL.reach cells, else the cell's own floor) */
export function ceilingFamilies(map, roofed) {
  const out = new Map();
  for (let cz = 0; cz < map.h; cz++)
    for (let cx = 0; cx < map.w; cx++) {
      if (!roofed(cx, cz)) continue;
      let fam = null;
      for (let r = 1; r <= CEIL.reach && !fam; r++) {
        // the ring at distance r, in a fixed order (deterministic)
        for (let dz = -r; dz <= r && !fam; dz++)
          for (let dx = -r; dx <= r && !fam; dx++) {
            if (Math.max(Math.abs(dx), Math.abs(dz)) !== r) continue;
            const x = cx + dx,
              z = cz + dz;
            if (x < 0 || z < 0 || x >= map.w || z >= map.h || map.kind(x, z) !== 'wall') continue;
            const t = WALL_SKINS[map.skin(x, z)];
            if (t) fam = familyOfTex(t);
          }
      }
      out.set(cx + ',' + cz, fam ?? familyOfTex(FLOOR_SKINS[map.skin(cx, cz)]?.tex));
    }
  return out;
}

// ---- the structures. Each returns geometries already placed in world space; the caller merges them per material.
const box = (w, h, d, x, y, z) => new THREE.BoxGeometry(w, h, d).translate(x, y, z);
const hash = (a, b) => {
  let h = (a * 374761393 + b * 668265263) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0;
  return (h ^ (h >>> 16)) / 4294967296;
};

/**
 * the overhead structure of a map: [{ family, part, geometry }] merged per family and part. `ce(cx, cz)` the ceiling height of a cell, `fl` its
 * floor, `S` the cell size, `fams` from ceilingFamilies
 */
export function buildCeilingStructure(map, fams, { ce, fl, S }) {
  const parts = new Map(); // 'family:part' -> [geometry]
  const put = (fam, part, g) => {
    const k = fam + ':' + part;
    if (!parts.has(k)) parts.set(k, []);
    parts.get(k).push(g);
  };
  const famAt = (cx, cz) => fams.get(cx + ',' + cz) ?? null;
  const room = (cx, cz) => ce(cx, cz) - fl(cx, cz); // the cell's height from floor to ceiling
  // runs along x on every other row (as the old beams): a run is cells of one family under one ceiling height
  const runs = [];
  for (let cz = 1; cz < map.h - 1; cz++) {
    let start = null;
    for (let cx = 0; cx <= map.w; cx++) {
      const f = cx < map.w ? famAt(cx, cz) : null,
        same = start !== null && f === famAt(start, cz) && Math.abs(ce(cx, cz) - ce(start, cz)) < 1e-6;
      if (start === null && f) start = cx;
      else if (start !== null && !same) {
        if (cx - start >= 2) runs.push({ cz, x0: start, x1: cx, fam: famAt(start, cz), y: ce(start, cz) });
        start = f ? cx : null;
      }
    }
  }
  for (const r of runs) {
    const len = (r.x1 - r.x0) * S,
      mx = r.x0 * S + len / 2,
      z = (r.cz + 0.5) * S,
      lowest = Math.min(...Array.from({ length: r.x1 - r.x0 }, (_, i) => room(r.x0 + i, r.cz)));
    if (lowest < CEIL.clear + 0.35) continue; // a low ceiling carries nothing
    const drop = Math.min(0.6, lowest - CEIL.clear); // how far a piece may hang
    if (r.fam === 'timber' && r.cz % 2 === 1) put('timber', 'beam', box(len, 0.34, 0.34, mx, r.y - 0.17, z));
    else if (r.fam === 'stone' && r.cz % 2 === 1) {
      // a deep rib with a lighter soffit band under it
      put('stone', 'rib', box(len, Math.min(0.55, drop), 0.46, mx, r.y - Math.min(0.55, drop) / 2, z));
      put('stone', 'soffit', box(len, 0.06, 0.52, mx, r.y - Math.min(0.55, drop) - 0.03, z));
    } else if (r.fam === 'iron' && r.cz % 2 === 1) {
      // an I-section girder: web and two flanges
      const h = Math.min(0.5, drop);
      put('iron', 'girder', box(len, h, 0.08, mx, r.y - h / 2, z));
      put('iron', 'girder', box(len, 0.06, 0.32, mx, r.y - 0.03, z));
      put('iron', 'girder', box(len, 0.06, 0.32, mx, r.y - h + 0.03, z));
    } else if (r.fam === 'iron' && r.cz % 4 === 2 && drop > 0.3) {
      // a pair of pipes along the run, on brackets
      for (const off of [-0.32, 0.32])
        put('iron', 'pipe', new THREE.CylinderGeometry(0.11, 0.11, len, 8).rotateZ(Math.PI / 2).translate(mx, r.y - 0.28, z + off));
      for (let x = r.x0; x < r.x1; x += 2) put('iron', 'girder', box(0.06, 0.28, 0.9, (x + 0.5) * S, r.y - 0.14, z));
    } else if (r.fam === 'organic' && r.cz % 2 === 1) {
      // a rib that sags: three segments, the middle one lower, thicker at the ends
      const sag = Math.max(0, Math.min(0.45, drop - 0.4)), // the rib (0.26 thick, 0.1 down) never hangs past the clearance
        a = r.x0 * S,
        third = len / 3;
      put(
        'organic',
        'rib',
        new THREE.CylinderGeometry(0.2, 0.26, third + 0.2, 7).rotateZ(Math.PI / 2 - Math.atan2(sag, third)).translate(a + third / 2, r.y - sag / 2 - 0.1, z),
      );
      put('organic', 'rib', new THREE.CylinderGeometry(0.18, 0.18, third + 0.1, 7).rotateZ(Math.PI / 2).translate(a + 1.5 * third, r.y - sag - 0.1, z));
      put(
        'organic',
        'rib',
        new THREE.CylinderGeometry(0.26, 0.2, third + 0.2, 7).rotateZ(Math.PI / 2 + Math.atan2(sag, third)).translate(a + 2.5 * third, r.y - sag / 2 - 0.1, z),
      );
      // cords hanging from it, here and there
      for (let x = r.x0; x < r.x1; x++) {
        if (hash(x, r.cz) > 0.3) continue;
        const L = Math.min(drop - 0.1 - sag, 0.6 + hash(r.cz, x) * 0.9);
        if (L > 0.2) put('organic', 'cord', new THREE.CylinderGeometry(0.035, 0.05, L, 5).translate((x + 0.5) * S, r.y - sag - 0.1 - L / 2, z + 0.15));
      }
    } else if (r.fam === 'pale' && r.cz % 2 === 1) {
      // the coffer grid: beams both ways, shallow and square
      put('pale', 'coffer', box(len, 0.32, 0.22, mx, r.y - 0.16, z - S / 2));
      for (let x = r.x0; x <= r.x1; x++) put('pale', 'coffer', box(0.22, 0.32, S, x * S, r.y - 0.16, z));
    }
  }
  // the cave's teeth: clusters of stone cones, one in about every five cells away from the walls
  for (const [key, fam] of fams) {
    if (fam !== 'cave') continue;
    const [cx, cz] = key.split(',').map(Number);
    if (hash(cx, cz) > 0.2 || map.kind(cx + 1, cz) === 'wall' || map.kind(cx - 1, cz) === 'wall') continue;
    const y = ce(cx, cz),
      drop = room(cx, cz) - CEIL.clear;
    if (drop < 0.4) continue;
    for (let i = 0; i < 3; i++) {
      const L = Math.min(drop, 0.5 + hash(cx * 7 + i, cz) * 1.3),
        r0 = 0.12 + hash(cx, cz * 5 + i) * 0.16;
      put(
        'cave',
        'tooth',
        new THREE.ConeGeometry(r0, L, 6).rotateX(Math.PI).translate((cx + 0.25 + 0.5 * hash(i, cx)) * S, y - L / 2, (cz + 0.25 + 0.5 * hash(cz, i)) * S),
      );
    }
  }
  const out = [];
  for (const [k, list] of parts) {
    const [family, part] = k.split(':');
    out.push({
      family,
      part,
      geometry: mergeGeometries(
        list.map((g) => g.toNonIndexed()),
        false,
      ),
    });
    for (const g of list) g.dispose();
  }
  return out;
}

/** the colour each part is drawn in (multiplied with its family's texture) */
export const PART_TINT = {
  beam: 0x8a7a6a,
  rib: 0x9a948c,
  soffit: 0xb8b2a8,
  girder: 0x6e7078,
  pipe: 0x8a6e52,
  cord: 0x7a5a52,
  coffer: 0xc8c2b6,
  tooth: 0x8a847e,
};

// ---- LANTERN BAYS (the second half of the pass): in a large roofed room the ceiling over its middle is raised CEIL.bay.rise m, with a band of light
// round the sides of the raise (a clerestory: high windows, an oculus, a shaft to the surface, the hollow of a rib cage). It is the vertical space
// the grid never had; drawn only (the sim's ceiling stays where it was: a shot at the lantern bursts at the old height, a rare sight).
export const BAY = Object.freeze({
  rise: 2.6, // how far the bay's roof is lifted
  band: [0.5, 1.4], // the light band, from and to, above the old ceiling
  sizes: [
    [8, 6],
    [6, 8],
    [6, 6],
    [8, 4],
    [4, 8],
    [6, 4],
    [4, 6],
    [4, 4],
  ],
  gap: 3, // cells between two bays
  max: 10, // bays a map at most
  // the light in the windows: a little under full, and not saturated (the first frames: a lime strip that read as a neon tube)
  glow: { timber: 0xe6c690, stone: 0xb4c0d8, iron: 0xa6b8c8, organic: 0x86aab0, cave: 0x8496aa, pale: 0xe6dac2 },
  pane: { w: 0.62, step: 1.0, inset: 0.03 }, // window panes along each side; the side's own texture is the frame between them
});

/**
 * where a map's lantern bays go: [{ x0, z0, x1, z1 (cells, inclusive start, exclusive end), y (the old ceiling), family }]. A bay sits wholly inside
 * one roofed room of one family and one ceiling height, with a ring of one roofed cell between it and any wall, door or step
 */
export function lanternBays(map, fams, { ce, fl }) {
  const ok = (x, z, fam, y) =>
    x >= 0 && z >= 0 && x < map.w && z < map.h && map.kind(x, z) === 'floor' && fams.get(x + ',' + z) === fam && Math.abs(ce(x, z) - y) < 1e-6;
  const found = [],
    taken = (x0, z0, x1, z1) => found.some((b) => x0 < b.x1 + BAY.gap && x1 + BAY.gap > b.x0 && z0 < b.z1 + BAY.gap && z1 + BAY.gap > b.z0);
  const cands = [];
  for (const [w, h] of BAY.sizes)
    for (let z0 = 1; z0 + h < map.h - 1; z0++)
      for (let x0 = 1; x0 + w < map.w - 1; x0++) {
        const fam = fams.get(x0 + ',' + z0);
        if (!fam) continue;
        const y = ce(x0, z0);
        if (y - fl(x0, z0) > 6) continue; // already a tall space
        let good = true;
        for (let z = z0 - 1; z <= z0 + h && good; z++) for (let x = x0 - 1; x <= x0 + w && good; x++) good = ok(x, z, fam, y);
        if (good) cands.push({ x0, z0, x1: x0 + w, z1: z0 + h, y, family: fam, area: w * h });
      }
  cands.sort((a, b) => b.area - a.area || a.z0 - b.z0 || a.x0 - b.x0);
  for (const c of cands) {
    if (found.length >= BAY.max) break;
    if (!taken(c.x0, c.z0, c.x1, c.z1)) found.push(c);
  }
  return found;
}

/**
 * the window panes round a bay (one merged geometry, world space, facing into the bay): panes BAY.pane.w wide every BAY.pane.step m along each
 * side, filling the band, a hair inside the bay's side so the side's own texture is the frame between them
 */
export function bayPanes(b, S) {
  const [l0, l1] = BAY.band,
    { w, step, inset } = BAY.pane,
    geos = [];
  const x0 = b.x0 * S,
    x1 = b.x1 * S,
    z0 = b.z0 * S,
    z1 = b.z1 * S,
    yc = b.y + (l0 + l1) / 2,
    h = l1 - l0;
  // a side from (ax, az) to (bx, bz), facing into the bay along (nx, nz)
  const side = (ax, az, bx, bz, nx, nz) => {
    const L = Math.hypot(bx - ax, bz - az),
      n = Math.max(1, Math.floor(L / step)),
      ux = (bx - ax) / L,
      uz = (bz - az) / L;
    for (let i = 0; i < n; i++) {
      const t = (i + 0.5) * (L / n),
        g = new THREE.PlaneGeometry(w, h);
      g.rotateY(Math.atan2(nx, nz));
      g.translate(ax + ux * t + nx * inset, yc, az + uz * t + nz * inset);
      geos.push(g);
    }
  };
  side(x0, z0, x1, z0, 0, 1);
  side(x0, z1, x1, z1, 0, -1);
  side(x0, z0, x0, z1, 1, 0);
  side(x1, z0, x1, z1, -1, 0);
  const merged = mergeGeometries(geos, false);
  for (const g of geos) g.dispose();
  return merged;
}
