// T07: README says the screenshots were "taken from positions a player can stand in". Check every vantage in maps-src/*.views.json against the real collision code
// (walls, solid props, ledges; doors opened for views with `open`). Run: node review/gate-2/audit/repro/t07_screenshot_viewpoints.mjs
import fs from 'node:fs';
import { loadMapFile } from '../../../../src/engine/harness.js';
import { createWorld, blockedCircle } from '../../../../src/engine/world.js';
import { PLAYER } from '../../../../src/engine/defs.js';
import { groundAt } from '../../../../src/engine/terrain.js';
let bad = 0, n = 0;
for (const id of ['C1E1M02', 'C1E1M03', 'C1E1M04', 'C1E1M05', 'C1E1M06', 'C1E1M07', 'C1E1M08', 'C1E1S01']) {
  const map = loadMapFile(`maps/${id}.json`), views = JSON.parse(fs.readFileSync(`maps-src/${id}.views.json`, 'utf8')), list = Array.isArray(views) ? views : views.views;
  for (const v of list) {
    n++; const w = createWorld(map, { seed: 1 }); for (const e of w.enemies) e.state = 'dead'; if (v.open) for (const d of w.doors) { d.open = 1; d.target = 1; }
    const x = v.x * map.cell, z = v.z * map.cell; w.player.x = x; w.player.z = z; w.player.y = groundAt(w, x, z, PLAYER.radius);
    if (blockedCircle(w, x, z, PLAYER.radius, w.player)) { bad++; console.log(id, v.name, `(${v.x},${v.z}) is INSIDE a collider (kind ${map.kind(Math.floor(v.x), Math.floor(v.z))})`); }
  }
}
console.log('views checked', n, 'not standable', bad);
