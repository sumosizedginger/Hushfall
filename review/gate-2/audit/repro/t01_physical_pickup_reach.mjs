// T01: ground-truth pickup reachability using the REAL collision code (blockedCircle: player radius, solid prop circles, ledges via tooHigh), not the 4-connected cell
// model of reach.js. Lattice flood fill at 0.25 m from the spawn, all doors open, actors ignored, each sector tried at low, high and start; a pickup counts as
// collectable if a reached lattice point is within 0.9 m (horizontal) and |pickup.y - player.y| <= 1.0, the sim's pickup rule.
// Run: node review/gate-2/audit/repro/t01_physical_pickup_reach.mjs
import fs from 'node:fs';
import { loadMapFile } from '../../../../src/engine/harness.js';
import { createWorld, blockedCircle } from '../../../../src/engine/world.js';
import { PLAYER, STEP, PICKUPS } from '../../../../src/engine/defs.js';
import { groundAt } from '../../../../src/engine/terrain.js';
const STEPM = 0.25;
for (const f of fs.readdirSync('maps').filter((f) => f.endsWith('.json'))) {
  const map = loadMapFile('maps/' + f), variants = map.sectors.length ? ['low', 'high'] : ['start'];
  const collectable = new Set(), pickups = map.entities.map((e, i) => ({ e, i })).filter((o) => o.e.type === 'pickup');
  for (const v of variants) {
    const w = createWorld(map, { seed: 1 });
    for (const e of w.enemies) e.state = 'dead';
    for (const d of w.doors) { d.open = 1; d.target = 1; d.secret = true; }
    for (const s of w.sectors) { const def = map.sectors.find((q) => q.id === s.id); if (v !== 'start') { s.h = s.target = v === 'high' ? def.high : def.low; } }
    const W = Math.ceil(map.w * map.cell / STEPM), H = Math.ceil(map.h * map.cell / STEPM), seen = new Uint8Array(W * H), ys = new Float32Array(W * H);
    const sx = Math.round(map.spawn.x / STEPM), sz = Math.round(map.spawn.z / STEPM), q = [[sx, sz]]; seen[sz * W + sx] = 1; ys[sz * W + sx] = groundAt(w, map.spawn.x, map.spawn.z, PLAYER.radius);
    const P = w.player;
    while (q.length) {
      const [ix, iz] = q.pop(), y0 = ys[iz * W + ix];
      for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = ix + dx, nz = iz + dz; if (nx < 0 || nz < 0 || nx >= W || nz >= H || seen[nz * W + nx]) continue;
        P.y = y0; if (blockedCircle(w, nx * STEPM, nz * STEPM, PLAYER.radius, P)) continue;
        seen[nz * W + nx] = 1; ys[nz * W + nx] = groundAt(w, nx * STEPM, nz * STEPM, PLAYER.radius); q.push([nx, nz]);
      }
    }
    for (const { e, i } of pickups) {
      const px = (e.at[0] + 0.5) * map.cell, pz = (e.at[1] + 0.5) * map.cell, py = groundAt(w, px, pz, 0) /* floorAt used by createWorld */;
      const R = Math.ceil(0.9 / STEPM);
      for (let dz = -R; dz <= R; dz++) for (let dx = -R; dx <= R; dx++) { const ix = Math.round(px / STEPM) + dx, iz = Math.round(pz / STEPM) + dz; if (ix < 0 || iz < 0 || ix >= W || iz >= H || !seen[iz * W + ix]) continue; if (Math.hypot(ix * STEPM - px, iz * STEPM - pz) <= 0.9 && Math.abs(py - ys[iz * W + ix]) <= 1.0) collectable.add(i); }
    }
  }
  const bad = pickups.filter((o) => !collectable.has(o.i));
  console.log(f.replace('.json', '').padEnd(9), 'pickups', pickups.length, 'not physically collectable in any sector state:', bad.length, bad.length ? JSON.stringify(bad.map((o) => o.e.kind + '@' + o.e.at)) : '');
}
