// MapData -> Three.js scene content. Geometry comes from the grid; props/lights/doors from the entity list.
import * as THREE from 'three';
import { makeCrate, makeBarrel, makePod, makeLamp, makeLampPost, makePillar, makeDoorSlab, makeExitGate } from './models.js';

class Quads {
  constructor() { this.pos = []; this.nor = []; this.uv = []; this.idx = []; }
  add(p, n, uvs) { const b = this.pos.length / 3; for (let i = 0; i < 4; i++) { this.pos.push(...p[i]); this.nor.push(...n); this.uv.push(...uvs[i]); } this.idx.push(b, b + 1, b + 2, b, b + 2, b + 3); }
  geometry() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(this.nor, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(this.uv, 2));
    g.setIndex(this.idx); return g;
  }
}

/** The four wall faces of cell (cx,cz) that face `open(nx,nz)` neighbours; same UV formula for level walls and secret panels so they are flush. */
function wallFaces(q, S, H, cx, cz, open) {
  const x = cx * S, z = cz * S, u = (px, pz) => (px + pz) / S;
  const face = (n, p0, a) => { const p = [p0, [p0[0] + a[0] * S, p0[1], p0[2] + a[2] * S], [p0[0] + a[0] * S, H, p0[2] + a[2] * S], [p0[0], H, p0[2]]]; q.add(p, n, p.map((r) => [u(r[0], r[2]), r[1] / S])); };
  if (open(cx, cz - 1)) face([0, 0, -1], [x + S, 0, z], [-1, 0, 0]);
  if (open(cx, cz + 1)) face([0, 0, 1], [x, 0, z + S], [1, 0, 0]);
  if (open(cx - 1, cz)) face([-1, 0, 0], [x, 0, z], [0, 0, 1]);
  if (open(cx + 1, cz)) face([1, 0, 0], [x + S, 0, z + S], [0, 0, -1]);
}

export function buildLevel(map, tex) {
  const S = map.cell, H = map.ceiling, group = new THREE.Group();
  const lights = [], doorViews = new Map(), walls = new Quads(), floorIn = new Quads(), floorOut = new Quads(), ceil = new Quads();
  for (let cz = 0; cz < map.h; cz++) for (let cx = 0; cx < map.w; cx++) {
    const k = map.kind(cx, cz), x = cx * S, z = cz * S;
    if (k === 'wall') { wallFaces(walls, S, H, cx, cz, (nx, nz) => map.kind(nx, nz) !== 'wall'); continue; }
    const fl = [[x, 0, z], [x, 0, z + S], [x + S, 0, z + S], [x + S, 0, z]];
    (k === 'outdoor' ? floorOut : floorIn).add(fl, [0, 1, 0], fl.map((p) => [p[0] / S, p[2] / S]));
    if (k !== 'outdoor') { const cl = [[x, H, z], [x + S, H, z], [x + S, H, z + S], [x, H, z + S]]; ceil.add(cl, [0, -1, 0], cl.map((p) => [p[0] / S, p[2] / S])); }
  }
  const mk = (q, m, color = 0xffffff) => { const mesh = new THREE.Mesh(q.geometry(), new THREE.MeshLambertMaterial({ map: m, color })); group.add(mesh); return mesh; };
  mk(walls, tex.wall_bulkhead_a); mk(floorIn, tex.floor_planks_a); mk(floorOut, tex.floor_planks_a, 0x8fa0b0); mk(ceil, tex.floor_planks_a, 0x8a7a6a);

  // ceiling beams along x through each interior row run
  const beamMat = new THREE.MeshLambertMaterial({ map: tex.crate_wood_a, color: 0x8a7a6a });
  for (let cz = 1; cz < map.h - 1; cz += 2) {
    let start = null;
    for (let cx = 0; cx <= map.w; cx++) {
      const inside = cx < map.w && map.kind(cx, cz) === 'floor';
      if (inside && start === null) start = cx;
      if (!inside && start !== null) { const len = (cx - start) * S; if (len >= 2 * S) { const b = new THREE.Mesh(new THREE.BoxGeometry(len, 0.34, 0.34), beamMat); b.position.set(start * S + len / 2, H - 0.17, (cz + 0.5) * S); group.add(b); } start = null; }
    }
  }

  // doors and secret panels (dynamic meshes; the sim owns their open state)
  const doorTex = tex.door_hatch_a;
  for (const d of map.doors.values()) {
    const m = makeDoorSlab(doorTex, S, H, map.doorAxis(d.cx, d.cz), !!d.key);
    m.position.set((d.cx + 0.5) * S, 0, (d.cz + 0.5) * S); group.add(m); doorViews.set(d.cx + ',' + d.cz, m);
  }
  for (const s of map.secrets) {
    const q = new Quads(); wallFaces(q, S, H, s.panel[0], s.panel[1], () => true);
    const m = new THREE.Mesh(q.geometry(), new THREE.MeshLambertMaterial({ map: tex.wall_bulkhead_a }));
    const holder = new THREE.Group(); holder.add(m); group.add(holder); doorViews.set(s.panel.join(','), holder);
  }

  let seed = 7;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  for (const p of map.props) {
    const yaw = (rnd() - 0.5) * 0.5; let m = null;
    if (p.kind === 'crate') { m = makeCrate(tex.crate_wood_a); m.position.set(p.x, 0.55, p.z); m.rotation.y = yaw; }
    else if (p.kind === 'barrel') { m = makeBarrel(tex.crate_wood_a); m.position.set(p.x, 0.5, p.z); }
    else if (p.kind === 'pillar') { m = makePillar(tex.wall_bulkhead_a, H); m.position.set(p.x, 0, p.z); }
    else if (p.kind === 'pod') { const r = makePod(tex.pod_organic_a, H); m = r.group; m.position.set(p.x, H, p.z); r.light.position.set(p.x, H - 1.6, p.z); group.add(r.light); lights.push(r.light); }
    else if (p.kind === 'lamp') { const r = makeLamp(H); m = r.group; m.position.set(p.x, H, p.z); r.light.position.set(p.x, H - 0.9, p.z); group.add(r.light); lights.push(r.light); }
    else if (p.kind === 'lamppost') { const r = makeLampPost(); m = r.group; m.position.set(p.x, 0, p.z); r.light.position.set(p.x, 3.2, p.z); group.add(r.light); lights.push(r.light); }
    if (m) group.add(m);
  }
  for (const e of map.exits) {                                // the gate is set flush against the nearest wall, facing into the room
    const r = makeExitGate(tex.door_hatch_a, H), cx = Math.floor(e.at[0]), cz = Math.floor(e.at[1]);
    let best = null;
    for (const [dx, dz, rot] of [[1, 0, 0], [-1, 0, Math.PI], [0, 1, -Math.PI / 2], [0, -1, Math.PI / 2]]) {
      for (let n = 1; n <= 4; n++) if (map.kind(cx + dx * n, cz + dz * n) === 'wall') { if (!best || n < best.n) best = { n, dx, dz, rot }; break; }
    }
    const dist = (best.n - 0.5) * S - 0.3;
    r.group.position.set(e.x + best.dx * dist, 0, e.z + best.dz * dist); r.group.rotation.y = best.rot;
    r.light.userData.base = 60; r.light.userData.flicker = 'lamp';
    group.add(r.group); lights.push(r.light);
  }
  return { group, lights, doorViews };
}
