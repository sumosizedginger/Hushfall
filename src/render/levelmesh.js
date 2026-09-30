// MapData -> Three.js scene content. Geometry comes from the grid (+ the optional terrain layers); props/lights/doors/scenery from the entity lists.
// Gate 2: per-cell floor heights with risers, per-cell ceilings, wall/floor skins, moving-floor sectors, wading/toxic overlays, switch panels, closets.
import * as THREE from 'three';
import { mergeStatic } from './merge.js';
import { WALL_SKINS, FLOOR_SKINS } from '../engine/defs.js';
import { makeCrate, makeBarrel, makePod, makeLamp, makeLampPost, makePillar, makeDoorSlab, makeExitGate, makeCrate2, makeBollard, makeStall, makeBoat, makeCrane, makeTower } from './models.js';
import { makeCart, makeSack, makeCradle, makeRope, makeTable, makeShelf, makeLantern, makeBellNode, makeSwitchPanel } from './models_g2.js';

const WATER_Y = -0.55;                        // the sea; walls and pier fascia run down to just below it
class Quads {
  constructor() { this.pos = []; this.nor = []; this.uv = []; this.idx = []; }
  add(p, n, uvs) { const b = this.pos.length / 3; for (let i = 0; i < 4; i++) { this.pos.push(...p[i]); this.nor.push(...n); this.uv.push(...uvs[i]); } this.idx.push(b, b + 1, b + 2, b, b + 2, b + 3); }
  get empty() { return this.pos.length === 0; }
  geometry() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(this.nor, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(this.uv, 2));
    g.setIndex(this.idx); return g;
  }
}
const DIRS = [[0, -1], [0, 1], [-1, 0], [1, 0]];

/** One vertical face of cell (cx,cz) toward neighbour (dx,dz), spanning y0..y1. UVs are in world units; the vertical coordinate counts up from `vBase` (the floor the face rises from),
 *  so a wall's texture starts at its own floor: a plaster wainscot sits at the bottom of a wall on a raised gallery too, and walls beside a panel line up with it. */
function face(q, S, cx, cz, dx, dz, y0, y1, vBase = 0) {
  const x = cx * S, z = cz * S, u = (px, pz) => (px + pz) / S;
  let p0, a;
  if (dz === -1) { p0 = [x + S, z]; a = [-1, 0]; } else if (dz === 1) { p0 = [x, z + S]; a = [1, 0]; } else if (dx === -1) { p0 = [x, z]; a = [0, 1]; } else { p0 = [x + S, z + S]; a = [0, -1]; }
  const p = [[p0[0], y0, p0[1]], [p0[0] + a[0] * S, y0, p0[1] + a[1] * S], [p0[0] + a[0] * S, y1, p0[1] + a[1] * S], [p0[0], y1, p0[1]]];
  q.add(p, [dx, 0, dz], p.map((r) => [u(r[0], r[2]), (r[1] - vBase) / S]));
}
const flatQuad = (q, S, cx, cz, y, up) => {
  const x = cx * S, z = cz * S, p = up ? [[x, y, z], [x, y, z + S], [x + S, y, z + S], [x + S, y, z]] : [[x, y, z], [x + S, y, z], [x + S, y, z + S], [x, y, z + S]];
  q.add(p, [0, up ? 1 : -1, 0], p.map((r) => [r[0] / S, r[2] / S]));
};

export function buildLevel(map, tex) {
  const S = map.cell, H = map.ceiling, group = new THREE.Group();
  const lights = [], doorViews = new Map(), sectorViews = [], switchViews = new Map(), exitViews = new Map();
  const T = (name) => tex[name] ?? tex.wall_bulkhead_a;
  const isOpenKind = (k) => k !== 'wall';
  const hasCeil = (k) => k === 'floor' || k === 'door' || k === 'secret';
  const fl = (cx, cz) => map.floor(cx, cz), ce = (cx, cz) => map.ceilingAt(cx, cz);
  const sectorOf = (cx, cz) => map.sectorAt(cx, cz);
  const floorSkinAt = (cx, cz) => {
    const c = map.skin(cx, cz); if (FLOOR_SKINS[c]) return c;
    for (const [dx, dz] of DIRS) { const n = map.skin(cx + dx, cz + dz); if (FLOOR_SKINS[n]) return n; }
    return '.';
  };
  const wallSkinNear = (cx, cz) => { for (const [dx, dz] of [[-1, 0], [0, -1], [1, 0], [0, 1]]) { const c = map.skin(cx + dx, cz + dz); if (WALL_SKINS[c]) return c; } return '#'; };
  /** how high the solid block at a wall cell rises: to the ceiling of an interior neighbour, or floor + H beside open air */
  const wallTop = (cx, cz) => { let t = -Infinity; for (const [dx, dz] of DIRS) { const nx = cx + dx, nz = cz + dz, k = map.kind(nx, nz); if (k === 'wall') continue; t = Math.max(t, hasCeil(k) ? ce(nx, nz) : fl(nx, nz) + H); } return t; };

  const walls = new Map(), floors = new Map(), risers = new Map(), ceil = new Quads(), ceilSteps = new Quads(), fascia = new Quads();
  const bucket = (m, key) => { let q = m.get(key); if (!q) m.set(key, q = new Quads()); return q; };
  const fxQuads = { w: new Quads(), x: new Quads() }, wsize = 700;
  const sectorQ = map.sectors.map(() => ({ top: new Map(), skirt: new Map() }));

  for (let cz = 0; cz < map.h; cz++) for (let cx = 0; cx < map.w; cx++) {
    const k = map.kind(cx, cz), skin = map.skin(cx, cz);
    if (k === 'water') continue;                                                    // one big water plane below covers all water cells
    if (k === 'wall') {
      const top = wallTop(cx, cz); if (top === -Infinity) continue;
      for (const [dx, dz] of DIRS) { const nk = map.kind(cx + dx, cz + dz); if (nk === 'wall') continue; const base = nk === 'water' ? WATER_Y : fl(cx + dx, cz + dz) - 0.05; face(bucket(walls, WALL_SKINS[skin] ? skin : '#'), S, cx, cz, dx, dz, base, top, nk === 'water' ? 0 : fl(cx + dx, cz + dz)); }
      continue;
    }
    const fs = floorSkinAt(cx, cz), si = sectorOf(cx, cz), y = si >= 0 ? 0 : fl(cx, cz);
    if (si >= 0) {                                                                  // a moving floor: its own meshes, positioned by the view each frame
      flatQuad(bucket(sectorQ[si].top, fs), S, cx, cz, 0, true);
      const sd = map.sectors[si], depth = sd.high - sd.low + 0.6;
      for (const [dx, dz] of DIRS) face(bucket(sectorQ[si].skirt, fs), S, cx, cz, dx, dz, -depth, 0);
    } else flatQuad(bucket(floors, fs), S, cx, cz, y, true);
    if (hasCeil(k)) {
      flatQuad(ceil, S, cx, cz, ce(cx, cz), false);
      for (const [dx, dz] of DIRS) { const nk = map.kind(cx + dx, cz + dz); if (hasCeil(nk) && ce(cx + dx, cz + dz) < ce(cx, cz) - 1e-6) face(ceilSteps, S, cx + dx, cz + dz, -dx, -dz, ce(cx + dx, cz + dz), ce(cx, cz)); }
    }
    // risers: where this cell stands above a walkable neighbour (stairs, terraces, ledges) and the drop to the water
    for (const [dx, dz] of DIRS) {
      const nx = cx + dx, nz = cz + dz, nk = map.kind(nx, nz);
      if (nk === 'water') { if (si < 0) face(fascia, S, cx, cz, dx, dz, WATER_Y, y); continue; }
      if (nk === 'wall' || si >= 0) continue;
      const nsi = sectorOf(nx, nz), lowN = nsi >= 0 ? map.sectors[nsi].low : fl(nx, nz);
      if (y > lowN + 1e-6) face(bucket(risers, fs), S, cx, cz, dx, dz, lowN, y);
    }
    const fx = map.fx(cx, cz);
    if (fx && (fx === 'w' || fx === 'x')) { const yy = y + 0.07, x0 = cx * S, z0 = cz * S, p = [[x0, yy, z0], [x0, yy, z0 + S], [x0 + S, yy, z0 + S], [x0 + S, yy, z0]]; fxQuads[fx].add(p, [0, 1, 0], p.map((r) => [r[0] / wsize, r[2] / wsize])); }
  }
  const skinTex = (c) => { const f = FLOOR_SKINS[c]; return [T(f?.tex ?? 'floor_planks_a'), f?.tint ?? 0xffffff]; };
  const mk = (q, m, color = 0xffffff, emissive = 0x000000, parent = group) => { if (q.empty) return null; const mesh = new THREE.Mesh(q.geometry(), new THREE.MeshLambertMaterial({ map: m, color, emissive })); parent.add(mesh); return mesh; };
  for (const [c, q] of walls) mk(q, T(WALL_SKINS[c]));
  for (const [c, q] of floors) { const [t, tint] = skinTex(c); const outdoor = FLOOR_SKINS[c]?.kind === 'outdoor'; mk(q, t, outdoor ? (c === ':' ? 0xdde4ee : tint) : tint, outdoor ? (c === ':' ? 0x1c222b : c === 'p' ? 0x0e1116 : 0x101418) : 0x000000); }
  for (const [c, q] of risers) { const [t] = skinTex(c); mk(q, t, 0x9aa0a8, 0x080a0c); }
  mk(ceil, T('floor_planks_a'), 0x8a7a6a); mk(ceilSteps, T('floor_planks_a'), 0x6a5e52); mk(fascia, T('floor_planks_a'), 0x5a6068);
  // sector meshes (lifts, ramps): a group per sector, moved along y by the view
  map.sectors.forEach((sd, i) => {
    const g = new THREE.Group(); group.add(g); sectorViews[i] = g;
    for (const [c, q] of sectorQ[i].top) { const [t, tint] = skinTex(c); mk(q, t, tint, 0x0a0c10, g); }
    for (const [c, q] of sectorQ[i].skirt) { const [t] = skinTex(c); mk(q, t, 0x7a8088, 0x050607, g); }
    g.position.y = sd.start === 'high' ? sd.high : sd.low;
  });

  // water: one big plane, painted sky reflections; the view scrolls the texture slowly
  const water = new THREE.Mesh(new THREE.PlaneGeometry(wsize, wsize), new THREE.MeshBasicMaterial({ map: tex.water_dusk, color: 0xa8b4c4 }));
  tex.water_dusk.repeat.set(wsize / 8, wsize / 8); water.rotation.x = -Math.PI / 2; water.position.set(map.w * S / 2, WATER_Y, map.h * S / 2); group.add(water);
  // wading water and toxic residue: translucent overlays just above the floor (they share the sea texture; the view pulses the toxic one)
  const fxMats = {};
  if (!fxQuads.w.empty) { fxMats.w = new THREE.MeshBasicMaterial({ map: tex.water_dusk, color: 0x9ab8c8, transparent: true, opacity: 0.55, depthWrite: false }); const m = new THREE.Mesh(fxQuads.w.geometry(), fxMats.w); m.renderOrder = 2; group.add(m); }
  if (!fxQuads.x.empty) { fxMats.x = new THREE.MeshBasicMaterial({ map: tex.water_dusk, color: 0x3fffc0, transparent: true, opacity: 0.62, depthWrite: false }); const m = new THREE.Mesh(fxQuads.x.geometry(), fxMats.x); m.renderOrder = 2; group.add(m); }

  // ceiling beams along x through each interior row run (only where the ceiling height is constant along the run)
  const beamMat = new THREE.MeshLambertMaterial({ map: tex.crate_wood_a, color: 0x8a7a6a });
  for (let cz = 1; cz < map.h - 1; cz += 2) {
    let start = null, startCe = 0;
    for (let cx = 0; cx <= map.w; cx++) {
      const inside = cx < map.w && map.kind(cx, cz) === 'floor' && (start === null || Math.abs(ce(cx, cz) - startCe) < 1e-6);
      if (inside && start === null) { start = cx; startCe = ce(cx, cz); }
      if (!inside && start !== null) { const len = (cx - start) * S; if (len >= 2 * S) { const b = new THREE.Mesh(new THREE.BoxGeometry(len, 0.34, 0.34), beamMat); b.position.set(start * S + len / 2, startCe - 0.17, (cz + 0.5) * S); group.add(b); } start = null; if (cx < map.w && map.kind(cx, cz) === 'floor') { start = cx; startCe = ce(cx, cz); } }
    }
  }

  // doors, closets and secret panels (dynamic meshes; the sim owns their open state)
  for (const d of map.doors.values()) {
    const fy = fl(d.cx, d.cz), span = ce(d.cx, d.cz) - fy, pos = [(d.cx + 0.5) * S, fy, (d.cz + 0.5) * S];
    if (d.closet) {                                                                 // a closet panel is drawn exactly like the wall it sits in
      const q = new Quads(); for (const [dx, dz] of DIRS) face(q, S, d.cx, d.cz, dx, dz, fy, fy + span, fy);
      const holder = new THREE.Group(); holder.add(new THREE.Mesh(q.geometry(), new THREE.MeshLambertMaterial({ map: T(WALL_SKINS[wallSkinNear(d.cx, d.cz)]) }))); holder.userData = { base: 0, span: span - 0.05 }; group.add(holder); doorViews.set(d.cx + ',' + d.cz, holder); continue;
    }
    const m = makeDoorSlab(T('door_hatch_a'), S, span, map.doorAxis(d.cx, d.cz), !!d.key);
    m.position.set(...pos); m.userData = { base: fy, span: span - 0.05 }; group.add(m); doorViews.set(d.cx + ',' + d.cz, m);
  }
  for (const s of map.secrets) {
    const fy = fl(s.panel[0], s.panel[1]), span = ce(s.panel[0], s.panel[1]) - fy;
    const q = new Quads(); for (const [dx, dz] of DIRS) face(q, S, s.panel[0], s.panel[1], dx, dz, fy, fy + span, fy);
    const m = new THREE.Mesh(q.geometry(), new THREE.MeshLambertMaterial({ map: T(WALL_SKINS[wallSkinNear(s.panel[0], s.panel[1])]) }));                 // match the wall it sits in
    const holder = new THREE.Group(); holder.add(m); holder.userData = { base: 0, span: span - 0.05 }; group.add(holder); doorViews.set(s.panel.join(','), holder);
    // the tell: a hairline of lamplight leaking round the panel's seam on every open side. Easy to miss, easy to find if you look at the walls.
    const leak = new THREE.MeshBasicMaterial({ color: 0xffb45a, transparent: true, opacity: 0.32 });
    for (const [dx, dz] of DIRS) {
      const nk = map.kind(s.panel[0] + dx, s.panel[1] + dz); if (nk !== 'floor' && nk !== 'outdoor') continue;
      const strip = new THREE.Mesh(new THREE.PlaneGeometry(0.05, 1.9), leak); strip.rotation.y = Math.atan2(dx, dz);
      strip.position.set((s.panel[0] + 0.5) * S + dx * (S / 2 + 0.012), fy + 1.1, (s.panel[1] + 0.5) * S + dz * (S / 2 + 0.012)); holder.add(strip);
    }
  }
  // wall switches: an iron panel with a lamp (red = waiting, green = used)
  for (const sw of map.switches) {
    const r = makeSwitchPanel(); const dir = { north: [0, -1], south: [0, 1], east: [1, 0], west: [-1, 0] }[sw.wallDir] || [0, -1];
    r.group.position.set(sw.px, sw.fy + 1.35, sw.pz); r.group.rotation.y = Math.atan2(-dir[0], -dir[1]);           // faces away from the wall (local +z)
    group.add(r.group); switchViews.set(sw.id, r);
  }

  const dressing = new THREE.Group(); group.add(dressing);              // all static props + scenery; merged into a few meshes at the end
  let seed = 7;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  for (const p of map.props) {
    const yaw = (rnd() - 0.5) * 0.5; let m = null; const pcx = Math.floor(p.at[0]), pcz = Math.floor(p.at[1]), fy = fl(pcx, pcz), cy = hasCeil(map.kind(pcx, pcz)) ? ce(pcx, pcz) : fy + H;
    if (p.kind === 'crate') { m = makeCrate(tex.crate_wood_a); m.position.set(p.x, fy + 0.55, p.z); m.rotation.y = yaw; }
    else if (p.kind === 'crate2') { m = makeCrate2(tex.crate_wood_a); m.position.set(p.x, fy, p.z); m.rotation.y = yaw; }
    else if (p.kind === 'barrel') { m = makeBarrel(tex.crate_wood_a); m.position.set(p.x, fy + 0.5, p.z); }
    else if (p.kind === 'bollard') { m = makeBollard(); m.position.set(p.x, fy, p.z); }
    else if (p.kind === 'stall') { m = makeStall(tex.crate_wood_a, tex.awning_stripe_a); m.position.set(p.x, fy, p.z); m.rotation.y = (p.yaw ?? 0) + yaw * 0.3; }
    else if (p.kind === 'pillar') { m = makePillar(T(WALL_SKINS[p.skin] ?? 'wall_bulkhead_a'), cy - fy); m.position.set(p.x, fy, p.z); }
    else if (p.kind === 'pod') { const r = makePod(tex.pod_organic_a, cy); m = r.group; m.position.set(p.x, cy, p.z); r.light.position.set(p.x, cy - 1.6, p.z); group.add(r.light); lights.push(r.light); }
    else if (p.kind === 'lamp') { const r = makeLamp(cy, p.tint); m = r.group; m.position.set(p.x, cy, p.z); r.light.position.set(p.x, cy - 0.9, p.z); group.add(r.light); lights.push(r.light); }
    else if (p.kind === 'lamppost') { const r = makeLampPost(); m = r.group; m.position.set(p.x, fy, p.z); r.light.position.set(p.x, fy + 3.2, p.z); group.add(r.light); lights.push(r.light); }
    else if (p.kind === 'lantern') { const r = makeLantern(); m = r.group; m.position.set(p.x, fy, p.z); r.light.position.set(p.x, fy + 2.3, p.z); group.add(r.light); lights.push(r.light); }
    else if (p.kind === 'cart') { m = makeCart(tex.crate_wood_a); m.position.set(p.x, fy, p.z); m.rotation.y = (p.yaw ?? 0) + yaw; }
    else if (p.kind === 'sack') { m = makeSack(); m.position.set(p.x, fy, p.z); m.rotation.y = yaw * 4; }
    else if (p.kind === 'rope') { m = makeRope(); m.position.set(p.x, fy, p.z); m.rotation.y = yaw * 4; }
    else if (p.kind === 'table') { m = makeTable(tex.crate_wood_a); m.position.set(p.x, fy, p.z); m.rotation.y = (p.yaw ?? 0) + yaw * 0.3; }
    else if (p.kind === 'shelf') { m = makeShelf(tex.crate_wood_a); m.position.set(p.x, fy, p.z); m.rotation.y = p.yaw ?? 0; }
    else if (p.kind === 'cradle') { const r = makeCradle(tex.tollbearer_atlas); m = r.group; m.position.set(p.x, cy, p.z); r.light.position.set(p.x, cy - 1.8, p.z); group.add(r.light); lights.push(r.light); }
    else if (p.kind === 'bellnode') { m = makeBellNode(); m.position.set(p.x, fy, p.z); }
    if (m) dressing.add(m);
  }
  // scenery: non-colliding landmarks, possibly far outside the playable grid
  let towerGlow = null;
  for (const sc of map.scenery) {
    let m = null;
    if (sc.kind === 'tower') { m = makeTower(tex.tower_stone_a, tex.tollbearer_atlas); towerGlow = m.userData.glow; }
    else if (sc.kind === 'boat') { m = makeBoat(tex.boat_hull_a); m.position.y = -0.35; }
    else if (sc.kind === 'crane' || sc.kind === 'gantry') { m = makeCrane(); }
    if (!m) continue;
    m.position.x = sc.x; m.position.z = sc.z; m.position.y += sc.y ?? 0; m.rotation.y = sc.yaw ?? 0; if (sc.scale) m.scale.setScalar(sc.scale); dressing.add(m);
  }
  mergeStatic(dressing);
  for (const e of map.exits) {                                // the gate is set flush against the nearest wall, facing into the room
    const r = makeExitGate(tex.door_hatch_a, H), cx = Math.floor(e.at[0]), cz = Math.floor(e.at[1]);
    let best = null;
    for (const [dx, dz, rot] of [[1, 0, 0], [-1, 0, Math.PI], [0, 1, -Math.PI / 2], [0, -1, Math.PI / 2]]) {
      for (let n = 1; n <= 4; n++) if (map.kind(cx + dx * n, cz + dz * n) === 'wall') { if (!best || n < best.n) best = { n, dx, dz, rot }; break; }
    }
    best = best || { n: 1, dx: 1, dz: 0, rot: 0 };
    const dist = (best.n - 0.5) * S - 0.3;
    r.group.position.set(e.x + best.dx * dist, fl(cx, cz), e.z + best.dz * dist); r.group.rotation.y = best.rot;
    r.light.userData.base = 60; r.light.userData.flicker = 'lamp'; r.group.userData.exitId = e.id;
    group.add(r.group); lights.push(r.light);
    exitViews.set(e.id, r);
  }
  return { group, lights, doorViews, towerGlow, sectorViews, fxMats, switchViews, exitViews };
}
