// Grid-authored level -> Three.js geometry. This is the seed of the real map format (ASCII grid + props).
import * as THREE from 'three';
import { makeCrate, makeBarrel, makePod, makeLamp, makeLampPost, makePillar } from './models.js';

export const S = 2;          // metres per cell
export const H = 3.6;        // interior wall height
const EXT_X = 12;            // cells with x >= EXT_X are the open quay (no ceiling)

export const MAP = [
  '########################',
  '#.....L....#.....l.....#',
  '#..cc......#...........#',
  '#.......p..#....bb.....#',
  '#..P....P..#...........#',
  '#.....T....#....T......#',
  '#..S...............T...#',
  '#......................#',
  '#....b.....#...........#',
  '#..........#....c......#',
  '#..cc.p....#...........#',
  '#....L.....#.....l.....#',
  '#..........#...........#',
  '########################',
];

export function parseMap() {
  const h = MAP.length, w = MAP[0].length;
  for (const r of MAP) if (r.length !== w) throw new Error('ragged map row: ' + r);
  const at = (cx, cz) => (cx < 0 || cz < 0 || cx >= w || cz >= h) ? '#' : MAP[cz][cx];
  const solid = (cx, cz) => { const c = at(cx, cz); return c === '#' || c === 'P'; };
  const props = [], colliders = [];
  let start = null; const enemies = [];
  for (let cz = 0; cz < h; cz++) for (let cx = 0; cx < w; cx++) {
    const c = MAP[cz][cx], x = (cx + 0.5) * S, z = (cz + 0.5) * S;
    if (c === 'S') start = { x, z };
    else if (c === 'T') enemies.push({ x, z });
    else if ('cbpLlP'.includes(c)) props.push({ type: c, x, z, cx, cz });
    if (c === 'c') colliders.push({ x, z, r: 0.78 });
    if (c === 'b') colliders.push({ x, z, r: 0.5 });
    if (c === 'l') colliders.push({ x, z, r: 0.3 });
  }
  return { w, h, at, solid, props, colliders, start, enemies, interior: (x, z) => Math.floor(x / S) < EXT_X && !solid(Math.floor(x / S), Math.floor(z / S)) };
}

export function blocked(map, x, z, r) {
  const x0 = Math.floor((x - r) / S), x1 = Math.floor((x + r) / S), z0 = Math.floor((z - r) / S), z1 = Math.floor((z + r) / S);
  for (let cz = z0; cz <= z1; cz++) for (let cx = x0; cx <= x1; cx++) {
    if (!map.solid(cx, cz)) continue;
    const nx = Math.max(cx * S, Math.min(x, (cx + 1) * S)), nz = Math.max(cz * S, Math.min(z, (cz + 1) * S));
    if ((x - nx) ** 2 + (z - nz) ** 2 < r * r) return true;
  }
  for (const c of map.colliders) if ((x - c.x) ** 2 + (z - c.z) ** 2 < (r + c.r) ** 2) return true;
  return false;
}

export function los(map, x0, z0, x1, z1) {
  const d = Math.hypot(x1 - x0, z1 - z0), n = Math.ceil(d / 0.4);
  for (let i = 1; i < n; i++) { const t = i / n, x = x0 + (x1 - x0) * t, z = z0 + (z1 - z0) * t; if (map.solid(Math.floor(x / S), Math.floor(z / S))) return false; }
  return true;
}

class Quads {
  constructor() { this.pos = []; this.nor = []; this.uv = []; this.idx = []; }
  add(p, n, uvs) {
    const b = this.pos.length / 3;
    for (let i = 0; i < 4; i++) { this.pos.push(...p[i]); this.nor.push(...n); this.uv.push(...uvs[i]); }
    this.idx.push(b, b + 1, b + 2, b, b + 2, b + 3);
  }
  geometry() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.nor, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(this.uv, 2));
    g.setIndex(this.idx);
    return g;
  }
}

export function buildLevel(map, tex) {
  const group = new THREE.Group(), lights = [];
  const walls = new Quads(), floorIn = new Quads(), floorOut = new Quads(), ceil = new Quads();
  const u = (x, z) => (x + z) / S;
  for (let cz = 0; cz < map.h; cz++) for (let cx = 0; cx < map.w; cx++) {
    const x = cx * S, z = cz * S;
    if (map.solid(cx, cz)) {
      const wallFace = (n, p0, a) => {         // a = along-wall axis vector (up x n)
        const p = [p0, [p0[0] + a[0] * S, p0[1], p0[2] + a[2] * S], [p0[0] + a[0] * S, H, p0[2] + a[2] * S], [p0[0], H, p0[2]]];
        walls.add(p, n, p.map((q) => [u(q[0], q[2]), q[1] / S]));
      };
      if (!map.solid(cx, cz - 1)) wallFace([0, 0, -1], [x + S, 0, z], [-1, 0, 0]);
      if (!map.solid(cx, cz + 1)) wallFace([0, 0, 1], [x, 0, z + S], [1, 0, 0]);
      if (!map.solid(cx - 1, cz)) wallFace([-1, 0, 0], [x, 0, z], [0, 0, 1]);
      if (!map.solid(cx + 1, cz)) wallFace([1, 0, 0], [x + S, 0, z + S], [0, 0, -1]);
      continue;
    }
    const fl = [[x, 0, z], [x, 0, z + S], [x + S, 0, z + S], [x + S, 0, z]];
    (cx >= EXT_X ? floorOut : floorIn).add(fl, [0, 1, 0], fl.map((q) => [q[0] / S, q[2] / S]));
    if (cx < EXT_X) {
      const cl = [[x, H, z], [x + S, H, z], [x + S, H, z + S], [x, H, z + S]];
      ceil.add(cl, [0, -1, 0], cl.map((q) => [q[0] / S, q[2] / S]));
    }
  }
  const mk = (q, map_, color = 0xffffff) => { const m = new THREE.Mesh(q.geometry(), new THREE.MeshLambertMaterial({ map: map_, color })); group.add(m); return m; };
  mk(walls, tex.wall_bulkhead_a);
  mk(floorIn, tex.floor_planks_a);
  mk(floorOut, tex.floor_planks_a, 0x8fa0b0);
  mk(ceil, tex.floor_planks_a, 0x8a7a6a);

  // ceiling beams across the hall
  const beamMat = new THREE.MeshLambertMaterial({ map: tex.crate_wood_a, color: 0x8a7a6a });
  for (const bz of [4, 8, 12, 16, 20, 24]) { const b = new THREE.Mesh(new THREE.BoxGeometry(22, 0.34, 0.34), beamMat); b.position.set(11, H - 0.17, bz); group.add(b); }

  let rot = 1;
  for (const p of map.props) {
    let m = null; rot = (rot * 16807) % 2147483647; const yaw = (rot / 2147483647) * 0.5 - 0.25;
    if (p.type === 'c') { m = makeCrate(tex.crate_wood_a); m.position.set(p.x, 0.55, p.z); m.rotation.y = yaw; }
    else if (p.type === 'b') { m = makeBarrel(tex.crate_wood_a); m.position.set(p.x, 0.5, p.z); }
    else if (p.type === 'P') { m = makePillar(tex.wall_bulkhead_a, H); m.position.set(p.x, 0, p.z); }
    else if (p.type === 'p') { const r = makePod(tex.pod_organic_a, H); m = r.group; m.position.set(p.x, H, p.z); lights.push(r.light); r.light.position.set(p.x, H - 1.6, p.z); group.add(r.light); }
    else if (p.type === 'L') { const r = makeLamp(H); m = r.group; m.position.set(p.x, H, p.z); r.light.position.set(p.x, H - 0.9, p.z); group.add(r.light); lights.push(r.light); }
    else if (p.type === 'l') { const r = makeLampPost(); m = r.group; m.position.set(p.x, 0, p.z); r.light.position.set(p.x, 3.2, p.z); group.add(r.light); lights.push(r.light); }
    if (m) group.add(m);
  }
  return { group, lights };
}
