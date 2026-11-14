// The hero view of every map (design/VISUAL_AWE_PLAN.md, session A1): the place on the main road from which the most of the level is seen at once,
// and the way to face there. Written to maps-src/hero-views.json, in SHIPPED cells (the frame of maps/<ID>.json), one entry a map:
//   { "C1E1M01": { "x": 12.5, "z": 30.5, "yaw": -1.57, "pitch": 0.04, "sees": 212 } }
// A view the owner or a builder sets by hand carries "by": "hand" and is never overwritten.
// Node only. `node tools/dev/hero-views.mjs [ID ...]` (no ids = every shipped map); `--print` lists the three best of each and writes nothing.
import fs from 'node:fs';
import path from 'node:path';
import { parseMap } from '../../src/engine/mapformat.js';

const root = path.resolve(import.meta.dirname, '../..'),
  FILE = path.join(root, 'maps-src', 'hero-views.json');
export const HERO = Object.freeze({ cone: (70 * Math.PI) / 180, reach: 40, rays: 29, dirs: 16, pitch: 0.04 });

/** forward of a yaw, in cells (the game's convention: 0 looks north, -PI/2 east) */
export const forward = (yaw) => [-Math.sin(yaw), -Math.cos(yaw)];

const solidFor = (map) => (cx, cz) => {
  if (cx < 0 || cz < 0 || cx >= map.w || cz >= map.h) return true;
  return map.kind(cx, cz) === 'wall'; // doors and panels count as open: the picture is taken with the doors open
};

/**
 * how much of the level a camera at cell centre (x, z) facing `yaw` sees: the cells its rays cross before a wall, each counted once, a far cell
 * worth more than a near one (a long view is the point), an open-sky cell half as much again
 */
export function viewScore(map, x, z, yaw) {
  const solid = solidFor(map),
    seen = new Set();
  let score = 0;
  for (let i = 0; i < HERO.rays; i++) {
    const a = yaw + (i / (HERO.rays - 1) - 0.5) * HERO.cone,
      [dx, dz] = forward(a);
    for (let t = 0.5; t <= HERO.reach; t += 0.5) {
      const cx = Math.floor(x + dx * t),
        cz = Math.floor(z + dz * t);
      if (solid(cx, cz)) break;
      const k = cx + cz * map.w;
      if (seen.has(k)) continue;
      seen.add(k);
      score += (0.4 + t / HERO.reach) * (map.kind(cx, cz) === 'outdoor' || map.kind(cx, cz) === 'water' || map.kind(cx, cz) === 'void' ? 1.5 : 1);
    }
  }
  return score;
}

/** the best views of a map along its main route: [{ x, z, yaw, sees }] best first */
export function heroCandidates(map, route) {
  const cells = [[Math.floor(map.spawn.x / map.cell), Math.floor(map.spawn.z / map.cell)], ...route.filter((o) => Array.isArray(o.at)).map((o) => o.at)],
    best = [],
    done = new Set();
  for (const [cx, cz] of cells) {
    const k = cx + ',' + cz;
    if (done.has(k) || map.kind(cx, cz) === 'wall') continue;
    done.add(k);
    let top = null;
    for (let d = 0; d < HERO.dirs; d++) {
      const yaw = -Math.PI + (d / HERO.dirs) * 2 * Math.PI,
        s = viewScore(map, cx + 0.5, cz + 0.5, yaw);
      if (!top || s > top.sees) top = { x: cx + 0.5, z: cz + 0.5, yaw: +yaw.toFixed(3), sees: Math.round(s) };
    }
    best.push(top);
  }
  return best.sort((a, b) => b.sees - a.sees);
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(import.meta.filename)) {
  const args = process.argv.slice(2),
    print = args.includes('--print'),
    named = args.filter((a) => !a.startsWith('--')),
    ids = named.length
      ? named
      : fs
          .readdirSync(path.join(root, 'maps'))
          .filter((f) => f.endsWith('.json'))
          .map((f) => f.slice(0, -5))
          .sort(),
    out = fs.existsSync(FILE) ? JSON.parse(fs.readFileSync(FILE, 'utf8')) : {};
  for (const id of ids) {
    const map = parseMap(JSON.parse(fs.readFileSync(path.join(root, 'maps', id + '.json'), 'utf8'))),
      rf = path.join(root, 'routes', id + '.main.route.json'),
      c = heroCandidates(map, fs.existsSync(rf) ? JSON.parse(fs.readFileSync(rf, 'utf8')) : []);
    if (print)
      console.log(
        id,
        c
          .slice(0, 3)
          .map((v) => `(${v.x},${v.z}) yaw ${v.yaw} sees ${v.sees}`)
          .join('  |  '),
      );
    else if (out[id]?.by !== 'hand') out[id] = { x: c[0].x, z: c[0].z, yaw: c[0].yaw, pitch: HERO.pitch, sees: c[0].sees };
  }
  if (!print) {
    fs.writeFileSync(FILE, JSON.stringify(Object.fromEntries(Object.entries(out).sort()), null, 1) + '\n');
    console.log('wrote', path.relative(root, FILE), Object.keys(out).length, 'maps');
  }
}
