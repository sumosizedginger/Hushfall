// THE DRESSING (PT-079, design/ART_ASSESSMENT.md item 1: "rooms are boxes, and the boxes are empty": two or three wall planes from floor to ceiling, little at eye level). Things people put on the walls of the
// places people built, drawn only, as the trims are (trims.js): the simulation, its collisions, sight lines and shots never see any of it, and every piece stands at most DRESS.maxD proud of its wall, inside
// the distance a body keeps from a wall (tests/look-polish.test.js holds every vertex of every shipped map to 24 cm).
//   indoors:  SHELVES at eye level with jars, tins and bottles on them; NOTICE BOARDS with papers pinned; under a high ceiling a PIPE RUN in brackets along the wall
//   outdoors: LIFE RINGS on the harbour's walls, HOOKS with a coil of rope, a posted NOTICE
// Only on the walls of human places (DRESS.skins: harbour iron, brick, timber, plaster, concrete...: a church bell's flesh does not get a shelf), only on long plain runs into a roofed room (the same runs the
// pilasters stand on, between them), never near a door, a lever, an exit, a secret panel or a closet, never where something stands in front of the wall. Deterministic per map and cell (a hash, not a random
// stream). Returns meshes for buildTrims to add.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { WALL_SKINS } from '../engine/defs.js';

export const DRESS = Object.freeze({
  maxD: 0.22,
  skins: ['wall_bulkhead_a', 'brick_warm_a', 'wall_timber_a', 'wall_plaster_a', 'wall_concrete_a', 'wall_iron_a', 'wall_corrugated_a', 'wall_saltbrick_a', 'wall_kiln_a', 'wall_dock_a', 'wall_tidestone_a', 'wall_saltplate_a', 'wall_quiet_a'],
  chance: 0.72, chanceOut: 0.4, waterNear: 5, margin: 0.36, clear: 1.5,          // (the first pass, half as dense and with single shelves, barely read in the real game's frames at 480 pixels: a piece has to have MASS to be seen)
  shelf: { ys: [1.0, 1.48, 1.96], d: 0.2, t: 0.05 }, cabinet: { h: [0.85, 1.25], d: 0.2 }, vpipe: { d: 0.14, w: 0.11 }, board: { y0: 1.05, y1: 2.0, d: 0.04 }, pipe: { below: 0.62, d: 0.15, h: 0.13, minH: 3.2 }, ring: { y: 1.55, r: 0.3, tube: 0.06 }, hook: { y: 1.7 },
  // PT-080 (Art Gate 1): green that spills over the top of a garden's box walls, so a planted wall is not a cube (the maps and the wall skins it grows on); and chains with a lamp under the roof of a tall hall
  caps: { C2M14: ['wall_orchard_a'] }, capColors: [0x3e6a34, 0x4e7a3c, 0x5a8a44, 0x2e5428], bloom: [0xd88aa8, 0xe8e0c0, 0xc8a0d8],
  hang: { minH: 4.6, every: 4, clearWalls: 2, drop: [1.0, 1.7], chain: 0x2e2a28, shade: 0x5a4a38, bulb: 0xffd49a },
  colors: { wood: 0x8a6a48, tin: 0x8a8e92, glassG: 0x4e7a52, glassA: 0x9a6a2a, paper: 0xd8cfb0, cork: 0x8a6440, pipe: 0x6a6460, bracket: 0x3a3634, ring: 0xd85a2c, rope: 0xb89a68 },
});

/** a small deterministic hash of integers to 0..1 */
const h01 = (...n) => { let h = 2166136261 >>> 0; for (const v of n) h = Math.imul(h ^ (v | 0), 16777619) >>> 0; h ^= h >>> 13; h = Math.imul(h, 0x5bd1e995) >>> 0; h ^= h >>> 15; return (h >>> 0) / 4294967296; };
const idHash = (s) => { let h = 7; for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) | 0; return h; };

/**
 * `ctx`: { Q (the quad builder of trims.js), faceFrame, kind, fl, ce, sector, panels, skinOf, clearOf, S } from buildTrims; `tex(name)` a texture; `patch` the level's surface treatment.
 * Returns { meshes, count }.
 */
export function buildDressing(map, { Q, faceFrame, kind, fl, ce, sector, panels, skinOf, clearOf, tex, patch = null, wallTop = null }) {
  const S = map.cell, seed = idHash(map.id), D = DRESS, human = new Set(Object.entries(WALL_SKINS).filter(([, id]) => D.skins.includes(id)).map(([c]) => c));
  const q = { wood: new Q(), tin: new Q(), glassG: new Q(), glassA: new Q(), paper: new Q(), cork: new Q(), pipe: new Q(), bracket: new Q(), rope: new Q() }, rings = [], ropes = [];
  const standing = new Set(map.props.map((p) => Math.floor(p.at[0]) + ',' + Math.floor(p.at[1])));
  let count = 0;
  const DIRS = [[0, -1], [0, 1], [-1, 0], [1, 0]];
  for (const [di, [dx, dz]] of DIRS.entries()) {
    const alongX = dz !== 0, lines = alongX ? map.h : map.w, len = alongX ? map.w : map.h;
    for (let L = 0; L < lines; L++) for (let i = 0; i < len; i++) {
      const cx = alongX ? i : L, cz = alongX ? L : i, nx = cx + dx, nz = cz + dz, k = kind(cx, cz), nk = kind(nx, nz);
      if (k !== 'wall' || panels.has(cx + ',' + cz) || !human.has(skinOf(cx, cz)) || sector(nx, nz) || standing.has(nx + ',' + nz)) continue;
      if (nk !== 'floor' && nk !== 'outdoor') continue;
      // the faces on either side must be wall of the same run (a piece never hangs off a corner)
      const sx = alongX ? 1 : 0, sz = alongX ? 0 : 1;
      if (kind(cx - sx, cz - sz) !== 'wall' || kind(cx + sx, cz + sz) !== 'wall' || kind(nx - sx, nz - sz) !== nk || kind(nx + sx, nz + sz) !== nk) continue;
      if (Math.abs(fl(nx - sx, nz - sz) - fl(nx, nz)) > 1e-6 || Math.abs(fl(nx + sx, nz + sz) - fl(nx, nz)) > 1e-6) continue;
      const roll = h01(seed, cx, cz, di); if (roll > (nk === 'outdoor' ? D.chanceOut : D.chance)) continue;
      const { o, t, n } = faceFrame(S, cx, cz, dx, dz), mx = o[0] + t[0] * S / 2 + n[0] * 0.1, mz = o[1] + t[1] * S / 2 + n[1] * 0.1; if (!clearOf(mx, mz)) continue;
      const f = fl(nx, nz), top = nk === 'floor' ? ce(nx, nz) : f + 4, u0 = D.margin, u1 = S - D.margin, pick = h01(seed + 1, cx, cz, di), r = (j) => h01(seed + 2 + j, cx, cz, di);
      if (nk === 'floor') {
        if (top - f < 2.4) continue;
        const industrial = ['I', 'C', '#'].includes(skinOf(cx, cz)) || /corrugated|saltplate/.test(WALL_SKINS[skinOf(cx, cz)] ?? '');
        /** what was left on a surface at height y: tins, jars and bottles of different sizes in a row with gaps */
        const things = (y, salt) => { let u = u0 + 0.06; for (let j = 0; u < u1 - 0.1 && j < 10; j++) { const w = 0.07 + r(j + salt) * 0.1, hgt = 0.1 + r(j + 20 + salt) * 0.22, d = Math.min(D.shelf.d - 0.03, 0.07 + r(j + 40 + salt) * 0.08), which = r(j + 60 + salt); if (which > 0.12) (which < 0.42 ? q.tin : which < 0.68 ? q.glassG : which < 0.88 ? q.glassA : q.wood).box(o, t, n, u, u + w, d, y, y + hgt, S, f); u += w + 0.03 + r(j + 80 + salt) * 0.09; } };
        if (top - f > D.pipe.minH && pick < 0.16) {                                                                     // a pipe run under the ceiling, in two brackets
          const y = top - D.pipe.below; q.pipe.box(o, t, n, -0.02, S + 0.02, D.pipe.d, y, y + D.pipe.h, S, f);
          for (const u of [S * 0.25, S * 0.75]) q.bracket.box(o, t, n, u - 0.05, u + 0.05, D.pipe.d + 0.02, y - 0.06, y + D.pipe.h + 0.04, S, f);
        } else if (industrial && pick < 0.32) {                                                                          // two pipes from the floor to the ceiling, clamped to the wall
          for (const u of [S * 0.38, S * 0.62]) { q.pipe.box(o, t, n, u - D.vpipe.w / 2, u + D.vpipe.w / 2, D.vpipe.d, f - 0.02, top - 0.05, S, f); for (const y of [f + 0.6, f + 1.8, top - 0.5]) q.bracket.box(o, t, n, u - D.vpipe.w / 2 - 0.03, u + D.vpipe.w / 2 + 0.03, D.vpipe.d + 0.03, y, y + 0.07, S, f); }
          q.bracket.box(o, t, n, S * 0.38 - 0.09, S * 0.62 + 0.09, D.vpipe.d + 0.04, f + 1.25, f + 1.5, S, f);           // a valve box across them
        } else if (pick < 0.66) {                                                                                        // shelving: two or three shelves on uprights, and what was left on them
          const ys = D.shelf.ys.filter((y) => f + y + 0.35 < top);
          for (const u of [u0, u1 - 0.05]) q.wood.box(o, t, n, u, u + 0.05, D.shelf.d, f - 0.02, f + ys[ys.length - 1] + 0.08, S, f);                // the uprights
          ys.forEach((y, k) => { q.wood.box(o, t, n, u0, u1, D.shelf.d, f + y, f + y + D.shelf.t, S, f); if (r(90 + k) < 0.85) things(f + y + D.shelf.t, k * 100); });
        } else if (pick < 0.82) {                                                                                        // a low cabinet against the wall, its doors, and things on its top
          const ch = D.cabinet.h[0] + r(70) * (D.cabinet.h[1] - D.cabinet.h[0]);
          q.wood.box(o, t, n, u0, u1, D.cabinet.d, f - 0.02, f + ch, S, f); q.bracket.box(o, t, n, S / 2 - 0.01, S / 2 + 0.01, D.cabinet.d + 0.008, f + 0.1, f + ch - 0.08, S, f);
          for (const u of [S / 2 - 0.12, S / 2 + 0.08]) q.tin.box(o, t, n, u, u + 0.04, D.cabinet.d + 0.015, f + ch * 0.55, f + ch * 0.55 + 0.04, S, f);       // its handles
          things(f + ch, 300);
        } else {                                                                                                         // a notice board with papers pinned to it
          const B = D.board; q.cork.box(o, t, n, u0, u1, B.d, f + B.y0, f + B.y1, S, f); q.wood.box(o, t, n, u0 - 0.04, u1 + 0.04, B.d + 0.02, f + B.y1, f + B.y1 + 0.05, S, f);
          for (let j = 0; j < 6; j++) { const a = u0 + 0.06 + r(j) * (u1 - u0 - 0.4), b = f + B.y0 + 0.08 + r(j + 10) * 0.5; q.paper.box(o, t, n, a, a + 0.18 + r(j + 20) * 0.1, B.d + 0.012, b, b + 0.22 + r(j + 30) * 0.08, S, f); }
        }
      } else {                                                                                                           // outdoors: the harbour's things
        const wet = (() => { for (let a = -D.waterNear; a <= D.waterNear; a++) for (let b = -D.waterNear; b <= D.waterNear; b++) if (kind(nx + a, nz + b) === 'water') return true; return false; })();          // life rings only where there is water to throw one into
        if (wet && pick < 0.5) { rings.push({ c: [o[0] + t[0] * S / 2 + n[0] * (D.ring.tube + 0.02), f + D.ring.y, o[1] + t[1] * S / 2 + n[1] * (D.ring.tube + 0.02)], n }); q.bracket.box(o, t, n, S / 2 - 0.04, S / 2 + 0.04, 0.06, f + D.ring.y + D.ring.r - 0.04, f + D.ring.y + D.ring.r + 0.08, S, f); }
        else if (pick < (wet ? 0.78 : 0.6)) { q.bracket.box(o, t, n, S / 2 - 0.03, S / 2 + 0.03, 0.14, f + D.hook.y, f + D.hook.y + 0.05, S, f); ropes.push({ c: [o[0] + t[0] * S / 2 + n[0] * 0.08, f + D.hook.y - 0.28, o[1] + t[1] * S / 2 + n[1] * 0.08], n }); }
        else { const B = D.board; q.paper.box(o, t, n, u0 + 0.3, u1 - 0.3, 0.02, f + 1.3, f + 1.75, S, f); q.bracket.box(o, t, n, u0 + 0.28, u1 - 0.28, 0.01, f + 1.74, f + 1.78, S, f); }
      }
      count++;
    }
  }
  const out = [], C = D.colors;
  const lam = (color, texName, kindName) => { const m = new THREE.MeshLambertMaterial({ color, ...(texName ? { map: tex(texName) } : {}) }); if (kindName) patch?.(m, kindName); return m; };
  const mats = { wood: lam(C.wood, 'wall_timber_a', 'trim'), tin: lam(C.tin, 'wall_iron_a', 'trim'), glassG: lam(C.glassG), glassA: lam(C.glassA), paper: lam(C.paper), cork: lam(C.cork, 'wall_timber_a', 'trim'), pipe: lam(C.pipe, 'wall_iron_a', 'trim'), bracket: lam(C.bracket), rope: lam(C.rope) };
  for (const [name, qq] of Object.entries(q)) { if (qq.empty) continue; const m = new THREE.Mesh(qq.geometry(), mats[name]); m.userData.trim = 'dressing'; out.push(m); }
  const torus = (list, r, tube, color) => {
    if (!list.length) return;
    const geos = list.map(({ c, n }) => { const g = new THREE.TorusGeometry(r, tube, 6, 16); g.rotateY(Math.atan2(n[0], n[1])); g.translate(c[0], c[1], c[2]); return g; });
    const g = mergeGeometries(geos); geos.forEach((x) => x.dispose()); const m = new THREE.Mesh(g, lam(color)); m.userData.trim = 'dressing'; out.push(m);
  };
  torus(rings, D.ring.r, D.ring.tube, C.ring);
  // PT-080: the green over a garden's walls (drawn on top of the wall, inside its footprint but for a hand's breadth: the walls already block every sight line, so nothing the sim sees changes)
  const capSkins = new Set(Object.entries(WALL_SKINS).filter(([, id]) => (D.caps[map.id] ?? []).includes(id)).map(([c]) => c)), caps = [], blooms = [];
  if (capSkins.size && wallTop) for (let cz = 1; cz < map.h - 1; cz++) for (let cx = 1; cx < map.w - 1; cx++) {
    if (kind(cx, cz) !== 'wall' || !capSkins.has(skinOf(cx, cz))) continue;
    const top = wallTop(cx, cz); if (!Number.isFinite(top)) continue;
    const r = (j) => h01(seed + 7 + j, cx, cz, 0), x = (cx + 0.5) * S, z = (cz + 0.5) * S;
    for (let k = 0; k < 3; k++) { const g = new THREE.IcosahedronGeometry(1, 1); g.scale(S * (0.32 + 0.16 * r(k)), 0.22 + 0.22 * r(k + 3), S * (0.32 + 0.16 * r(k + 6))); g.translate(x + (r(k + 9) - 0.5) * S * 0.45, top + 0.06 + 0.1 * r(k + 12), z + (r(k + 15) - 0.5) * S * 0.45); caps.push({ g, c: D.capColors[Math.floor(r(k + 18) * D.capColors.length)] }); }
    if (r(30) < 0.45) { const g = new THREE.IcosahedronGeometry(0.11, 0); g.translate(x + (r(31) - 0.5) * S * 0.6, top + 0.34, z + (r(32) - 0.5) * S * 0.6); blooms.push({ g, c: D.bloom[Math.floor(r(33) * D.bloom.length)] }); }
  }
  const lumps = (list, emissive = 0) => { if (!list.length) return; const byC = new Map(); for (const { g, c } of list) { if (!byC.has(c)) byC.set(c, []); byC.get(c).push(g); } for (const [c, gs] of byC) { const g = mergeGeometries(gs); gs.forEach((x) => x.dispose()); const m = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ color: c, flatShading: true, emissive })); m.userData.trim = 'dressing'; out.push(m); } };
  lumps(caps); lumps(blooms, 0x221418);
  // PT-080: chains with a lamp hanging from the roof of a tall hall of a human place (above head height, every few cells, never near a wall: thin, high things that never hide a creature)
  const H = D.hang, hang = [], bulbs = [], nearHuman = (cx, cz) => { for (let a = -3; a <= 3; a++) for (let b = -3; b <= 3; b++) if (kind(cx + a, cz + b) === 'wall' && human.has(skinOf(cx + a, cz + b))) return true; return false; };
  for (let cz = 2; cz < map.h - 2; cz += 1) for (let cx = 2; cx < map.w - 2; cx += 1) {
    if (kind(cx, cz) !== 'floor' || sector(cx, cz) || (cx * 7 + cz * 3) % H.every !== 0 || h01(seed + 40, cx, cz, 0) > 0.3) continue;
    const f = fl(cx, cz), top = ce(cx, cz); if (top - f < H.minH) continue;
    let ok = true; for (let a = -H.clearWalls; a <= H.clearWalls && ok; a++) for (let b = -H.clearWalls; b <= H.clearWalls; b++) if (kind(cx + a, cz + b) !== 'floor') { ok = false; break; }
    if (!ok || !nearHuman(cx, cz)) continue;
    const x = (cx + 0.5) * S, z = (cz + 0.5) * S, low = Math.max(f + 3.0, top - (H.drop[0] + (H.drop[1] - H.drop[0]) * h01(seed + 41, cx, cz, 0)));
    const chain = new THREE.BoxGeometry(0.035, top - low, 0.035); chain.translate(x, (top + low) / 2, z); hang.push({ g: chain, c: H.chain });
    const shade = new THREE.ConeGeometry(0.26, 0.2, 10, 1, true); shade.translate(x, low - 0.06, z); hang.push({ g: shade, c: H.shade });
    const bulb = new THREE.IcosahedronGeometry(0.08, 0); bulb.translate(x, low - 0.16, z); bulbs.push(bulb);
  }
  lumps(hang);
  if (bulbs.length) { const g = mergeGeometries(bulbs); bulbs.forEach((x) => x.dispose()); const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: H.bulb })); m.userData.trim = 'dressing'; out.push(m); }
  count += caps.length + hang.length / 2;
  torus(ropes, 0.2, 0.05, C.rope);
  for (const m of Object.values(mats)) if (!out.some((x) => x.material === m)) m.dispose();
  return { meshes: out, count };
}
