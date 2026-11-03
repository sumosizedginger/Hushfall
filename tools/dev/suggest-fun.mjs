// PT-081 (design/FUN_CHECK.md): suggestions for a map's fun pass, read from its COMPILED map and its main route (node only, read-only). It prints kit
// lines to paste into the map source (they are
// checked again when the source compiles):
// * BYPASS candidates: a corridor through solid from the wall-side floor of the route at one point to the wall-side floor further along (north,
// south, west or east of the route), the shortest
//     corridor that touches no other floor, ranked by how far the route walks between the two ends (a long walk round = a real loop);
//   * a PLATFORM spot: the largest block of one-height floor off the lane, with room for its steps.
//   node tools/dev/suggest-fun.mjs <ID> [--n=3]
import fs from 'node:fs';
import path from 'node:path';
import { FLOOR_SKINS, WALL_SKINS } from '../../src/engine/defs.js';

const root = path.resolve(import.meta.dirname, '../..'),
  args = process.argv.slice(2),
  id = args.find((a) => !a.startsWith('--')),
  N = Number((args.find((a) => a.startsWith('--n=')) ?? '--n=3').slice(4));
const map = JSON.parse(fs.readFileSync(path.join(root, 'maps', id + '.json'), 'utf8')),
  G = map.grid,
  H = G.length,
  W = G[0].length,
  FLOOR = new Set(Object.keys(FLOOR_SKINS));
const hv = (c) =>
    c === undefined || c === '.'
      ? 0
      : c >= '0' && c <= '9'
        ? +c
        : c >= 'a' && c <= 'z'
          ? c.charCodeAt(0) - 87
          : c >= 'A' && c <= 'Z'
            ? c.charCodeAt(0) - 29
            : 0,
  ht = (x, z) => hv(map.heights?.[z]?.[x]);
const get = (x, z) => G[z]?.[x],
  bad = (c) => FLOOR.has(c) || 'DSX'.includes(c),
  occ = new Set(map.entities.filter((e) => e.at).map((e) => Math.floor(e.at[0]) + ',' + Math.floor(e.at[1])));
const laneF = path.join(root, 'maps-src', 'lanes', id + '.json'),
  lane = fs.existsSync(laneF) ? new Set(JSON.parse(fs.readFileSync(laneF, 'utf8'))) : new Set();
const route = JSON.parse(fs.readFileSync(path.join(root, 'routes', id + '.main.route.json'), 'utf8'))
  .filter((o) => o.at && o.op === 'goto')
  .map((o) => o.at);
const key = (x, z) => x + ',' + z,
  D4 = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ];
function bypass(from, to) {
  const solid = (x, z) => x >= 1 && z >= 1 && x < W - 1 && z < H - 1 && (get(x, z) in WALL_SKINS || get(x, z) === '#');
  const nearEnd = (x, z) => Math.max(Math.abs(x - from[0]), Math.abs(z - from[1])) <= 1 || Math.max(Math.abs(x - to[0]), Math.abs(z - to[1])) <= 1;
  const carvable = (x, z) => {
    if (!solid(x, z)) return false;
    const end = nearEnd(x, z);
    for (let dz = -1; dz <= 1; dz++)
      for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dz) continue;
        const c = get(x + dx, z + dz);
        if ('DSX'.includes(c) || (!end && FLOOR.has(c))) return false;
      }
    return true;
  };
  const goal = new Set(D4.map(([dx, dz]) => key(to[0] + dx, to[1] + dz))),
    prev = new Map(),
    q = [];
  for (const [dx, dz] of D4) {
    const s = [from[0] + dx, from[1] + dz];
    if (carvable(...s)) {
      prev.set(key(...s), null);
      q.push(s);
    }
  }
  for (let i = 0; i < q.length; i++) {
    const [x, z] = q[i];
    if (goal.has(key(x, z))) {
      let n = 0;
      for (let c = [x, z]; c; c = prev.get(key(...c))) n++;
      return n;
    }
    for (const [dx, dz] of D4) {
      const nn = [x + dx, z + dz],
        k = key(...nn);
      if (!prev.has(k) && carvable(...nn)) {
        prev.set(k, [x, z]);
        q.push(nn);
      }
    }
  }
  return 0;
}
/** from a route cell, walk in direction (dx, dz) while the floor goes on: the last floor cell, beside the wall */
const wallSide = ([x, z], [dx, dz]) => {
  if (!FLOOR.has(get(x, z))) return null;
  while (FLOOR.has(get(x + dx, z + dz))) {
    x += dx;
    z += dz;
  }
  return [x, z];
};
const along = [];
let acc = 0;
route.forEach((c, i) => {
  if (i) acc += Math.hypot(c[0] - route[i - 1][0], c[1] - route[i - 1][1]);
  along.push(acc);
});
const cands = [];
for (let i = 0; i < route.length; i++)
  for (let j = i + 1; j < route.length; j++) {
    const walk = along[j] - along[i],
      straight = Math.hypot(route[j][0] - route[i][0], route[j][1] - route[i][1]);
    if (walk < 18 || straight < 8 || straight > 40) continue;
    for (const dir of [
      [0, -1],
      [0, 1],
      [-1, 0],
      [1, 0],
    ]) {
      const a = wallSide(route[i], dir),
        b = wallSide(route[j], dir);
      if (!a || !b || (a[0] === b[0] && a[1] === b[1])) continue;
      if (Math.abs(ht(...a) - ht(...b)) > 6) continue;
      const n = bypass(a, b);
      if (n >= 4 && n <= 30) cands.push({ from: a, to: b, n, walk: Math.round(walk), score: walk / n });
    }
  }
cands.sort((p, q) => q.score - p.score);
const seen = new Set(),
  picks = [];
for (const c of cands) {
  const k = key(...c.from) + '>' + key(...c.to);
  if (seen.has(k)) continue;
  seen.add(k);
  if (picks.some((p) => Math.hypot(p.from[0] - c.from[0], p.from[1] - c.from[1]) < 6 && Math.hypot(p.to[0] - c.to[0], p.to[1] - c.to[1]) < 6)) continue;
  picks.push(c);
  if (picks.length >= N) break;
}
console.log(`${id} ${map.name}: ${W}x${H}, ${route.length} route points`);
for (const p of picks) console.log(`  BYPASS ${p.n} cells, the route walks ${p.walk} cells between its ends:  E.bypass({ from: [${p.from}], to: [${p.to}] });`);
if (!picks.length) console.log('  no bypass candidate');
// the platform: the 5 x 4 block (with its steps along x, and a ring) of one-height floor off the lane, nearest the middle of the route
for (const [w, d] of [
  [5, 4],
  [4, 3],
  [3, 3],
]) {
  let best = null;
  const mid = route[Math.floor(route.length / 2)] ?? [W / 2, H / 2];
  for (let z = 1; z < H - d; z++)
    for (let x = 1; x < W - w; x++) {
      const h0 = ht(x, z);
      let ok = true;
      for (let zz = z - 1; zz <= z + d && ok; zz++)
        for (let xx = x - 2; xx <= x + w + 1 && ok; xx++) {
          if (!FLOOR.has(get(xx, zz)) || ht(xx, zz) !== h0 || (map.ceilings && map.ceilings[zz]?.[xx] !== '.')) ok = false;
          const inner = xx >= x - 1 && xx <= x + w && zz >= z && zz <= z + d - 1;
          if (ok && inner && (occ.has(key(xx, zz)) || lane.has(key(xx, zz)))) ok = false;
        }
      if (!ok) continue;
      const dd = Math.hypot(x + w / 2 - mid[0], z + d / 2 - mid[1]);
      if (!best || dd < best.d) best = { x, z, d: dd };
    }
  if (best) {
    console.log(
      `  PLATFORM ${w}x${d} off the lane at [${best.x}, ${best.z}]:  E.platform({ search: { region: [${best.x - 2}, ${best.z - 2}, ${best.x + w + 2}, ${best.z + d + 2}], lane: laneOf('${id}') }, w: ${w}, d: ${d} });`,
    );
    break;
  }
  if (w === 3) console.log('  no platform spot off the lane');
}
