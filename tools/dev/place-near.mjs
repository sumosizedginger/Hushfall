// Where do the found weapons, their ammunition and the movable props go (PT-023)? Runs the main route of a map and, for each anchor cell you give, prints a free floor cell NEAR it:
//   default  ON THE LANE: a cell the route walks within half a metre of (a pickup there is collected by the route bot and by a player who follows the road; nothing else changes)
//   --off    OFF THE TRAFFIC: a cell no player or creature stood within 2 cells of while every route of the map was played (maps-src/lanes/<ID>.json, from tools/dev/lane-of.mjs), clear of doors and sectors:
//            a prop set there changes no route (a MOVABLE prop blocks a creature the path-finder does not know about, so it must stay off the traffic)
// Usage: node tools/dev/place-near.mjs <ID> [--off] [--r=4] [--route=main|secret] <x,z | f0.35> [...]     (an anchor is a cell x,z or a fraction f0.35 of the way along the route; a cell is printed as x,z; the same cell is never given twice in one call)
import fs from 'node:fs';
import { loadMapFile, loadRouteFile, runRoute } from '../../src/engine/harness.js';
import { fxAt } from '../../src/engine/terrain.js';
import { cellSolid } from '../../src/engine/world.js';
import { laneOf } from '../mapkit/shape.mjs';

const args = process.argv.slice(2), id = args.shift(), off = args.includes('--off'), rad = Number((args.find((a) => a.startsWith('--r=')) ?? '--r=4').slice(4));
const routeName = (args.find((a) => a.startsWith('--route=')) ?? '--route=main').slice(8);
const map = loadMapFile(`maps/${id}.json`), raw = JSON.parse(fs.readFileSync(`maps/${id}.json`, 'utf8')), route = loadRouteFile(`routes/${id}.${routeName}.route.json`);
const path = []; let W = null;
runRoute(map, route, { seed: 1, difficulty: 'normal', onTick: (w, t) => { W = w; if (t % 3 === 0) path.push([w.player.x, w.player.z]); } });
const w = W, cell = map.cell, occ = new Set();
const anchors = args.filter((a) => /^\d+,\d+$|^f[01]?\.?\d*$/.test(a)).map((a) => (a[0] === 'f' ? path[Math.min(path.length - 1, Math.floor(path.length * Number(a.slice(1))))].map((v) => Math.floor(v / map.cell)) : a.split(',').map(Number)));
for (const e of raw.entities || []) if (e.at) occ.add(Math.floor(e.at[0]) + ',' + Math.floor(e.at[1]));
for (const sc of raw.sectors || []) for (const c of sc.cells) occ.add(c[0] + ',' + c[1]);
for (const d of w.doors || []) occ.add(d.cx + ',' + d.cz);
const traffic = laneOf(id);
const dmin = (cx, cz) => { const x = (cx + 0.5) * cell, z = (cz + 0.5) * cell; let m = 1e9; for (const [px, pz] of path) m = Math.min(m, Math.hypot(px - x, pz - z)); return m; };
const nearTraffic = (cx, cz, pad) => { if (!traffic) return dmin(cx, cz) < pad * cell + 1; for (let dz = -pad; dz <= pad; dz++) for (let dx = -pad; dx <= pad; dx++) if (traffic.has((cx + dx) + ',' + (cz + dz))) return true; return false; };
const nextToDoor = (cx, cz) => { for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) { const k = map.kind(cx + dx, cz + dz); if (k === 'door' || k === 'secret') return true; } return false; };
const given = new Set();
console.log(id, off ? 'OFF the traffic' : 'ON the lane', 'path samples', path.length);
for (const [ax, az] of anchors) {
  let best = null;
  for (let dz = -rad; dz <= rad; dz++) for (let dx = -rad; dx <= rad; dx++) {
    const cx = ax + dx, cz = az + dz, k = cx + ',' + cz;
    if (cx < 1 || cz < 1 || cellSolid(w, cx, cz) || fxAt(w, (cx + 0.5) * cell, (cz + 0.5) * cell) || occ.has(k) || given.has(k) || map.kind(cx, cz) !== 'floor' && map.kind(cx, cz) !== 'outdoor') continue;
    if (map.floor(cx, cz) !== map.floor(ax, az) && off) continue;
    let ok; if (off) ok = !nearTraffic(cx, cz, 2) && !nextToDoor(cx, cz); else ok = dmin(cx, cz) < 0.5;
    if (!ok) continue;
    const d = Math.hypot(dx, dz); if (!best || d < best.d) best = { cx, cz, d };
  }
  if (best) { given.add(best.cx + ',' + best.cz); console.log(`anchor ${ax},${az} -> ${best.cx},${best.cz}  (${best.d.toFixed(1)} cells away${off ? '' : ', the path passes ' + dmin(best.cx, best.cz).toFixed(2) + ' m from its centre'}, floor ${map.floor(best.cx, best.cz)})`); }
  else console.log(`anchor ${ax},${az} -> NONE FOUND within ${rad} cells`);
}
