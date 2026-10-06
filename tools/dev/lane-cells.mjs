// Where do pickups go so they are MET, not hunted for? Runs the main route of a map and, for each fraction of the way (0..1) you give, prints a free floor cell the route walks within half a metre of
// (no wall, sector floor, hazard, entity or pickup in it). Ammunition off the lane is missed by the bot AND by the player (batch 1, and PT-010: five bolt boxes two metres off the road).
// Usage: node tools/dev/lane-cells.mjs <ID> <fraction> [<fraction> ...]   e.g. node tools/dev/lane-cells.mjs C1E2M05 0.25 0.5 0.8
import fs from 'node:fs';
import { loadMapFile, loadRouteFile, runRoute } from '../../src/engine/harness.js';
import { fxAt } from '../../src/engine/terrain.js';
import { cellSolid } from '../../src/engine/world.js';
const [, , id, ...fr] = process.argv;
const map = loadMapFile(`maps/${id}.json`), route = loadRouteFile(`routes/${id}.main.route.json`);
const path = []; let W = null;
const r = runRoute(map, route, { seed: 1, difficulty: 'normal', onTick: (w, t) => { W = w; if (t % 3 === 0) path.push([w.player.x, w.player.z, w.player.y ?? 0]); } });
const w = W, cell = map.cell;
const taken = new Set(w.pickups.map((p) => Math.floor(p.x / cell) + ',' + Math.floor(p.z / cell)));
const occ = new Set(); for (const p of [...(map.props || []), ...(map.switches || [])]) occ.add(Math.floor((p.x ?? p.px) / cell) + ',' + Math.floor((p.z ?? p.pz) / cell));
for (const e of map.enemies || []) occ.add(Math.floor(e.x / cell) + ',' + Math.floor(e.z / cell));
const srcEnt0 = JSON.parse(fs.readFileSync(`maps/${id}.json`, 'utf8')); const srcEnt = JSON.parse((await import('node:fs')).readFileSync(`maps/${id}.json`, 'utf8')).entities; for (const e of srcEnt) if (e.at) occ.add(e.at[0] + ',' + e.at[1]);
for (const sc of srcEnt0.sectors || []) for (const c of sc.cells) occ.add(c[0] + ',' + c[1]);
const dmin = (cx, cz) => { const x = (cx + 0.5) * cell, z = (cz + 0.5) * cell; let m = 1e9; for (const [px, pz] of path) m = Math.min(m, Math.hypot(px - x, pz - z)); return m; };
console.log(id, r.result, 'samples', path.length, 'ticks', path.length * 3);
for (const f of fr.map(Number)) {
  const i = Math.min(path.length - 1, Math.floor(path.length * f)); const [px, pz] = path[i]; const pcx = Math.floor(px / cell), pcz = Math.floor(pz / cell); let best = null;
  for (let rad = 0; rad <= 3 && !best; rad++) for (let dz = -rad; dz <= rad; dz++) for (let dx = -rad; dx <= rad; dx++) {
    const cx = pcx + dx, cz = pcz + dz, k = cx + ',' + cz;
    if (cx < 0 || cz < 0 || cellSolid(w, cx, cz) || fxAt(w, (cx + 0.5) * cell, (cz + 0.5) * cell) || taken.has(k) || occ.has(k)) continue;
    const d = dmin(cx, cz); if (d < 0.5 && (!best || d < best.d)) best = { cx, cz, d };
  }
  console.log('fraction', f, 'path at cell', pcx + ',' + pcz, '->', best ? `box at ${best.cx},${best.cz} (path passes ${best.d.toFixed(2)} m from its centre)` : 'NONE FOUND');
}
