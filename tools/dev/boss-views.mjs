// The views of every boss fight (step 5 of the 2026-11-18 playtest list: "bosses are fought down long empty corridors and the boss is often small
// or off-screen"): for each map with a boss, the last route waypoint before the boss op, faced at the boss, and a second view from the boss's far
// side of the floor. Writes a views file for `VIEWS=<file> tools/dev/shoot-hero.mjs` (keys BOSS-<ID>-near / -far, cells). Node only.
//   node tools/dev/boss-views.mjs <out.json>
import fs from 'node:fs';
import path from 'node:path';
import { parseMap } from '../../src/engine/mapformat.js';
import { ENEMIES } from '../../src/engine/defs.js';

const root = path.resolve(import.meta.dirname, '../..'),
  out = process.argv[2];
const views = {},
  rows = [];
for (const f of fs.readdirSync(path.join(root, 'maps')).filter((f) => /^C\d.*\.json$/.test(f))) {
  const src = JSON.parse(fs.readFileSync(path.join(root, 'maps', f), 'utf8')),
    boss = src.entities.find((e) => e.type === 'enemy' && ENEMIES[e.kind]?.boss);
  if (!boss) continue;
  const id = src.id,
    map = parseMap(src),
    route = JSON.parse(fs.readFileSync(path.join(root, 'routes', id + '.main.route.json'), 'utf8'));
  const k = route.findIndex((o) => o.op === 'killboss'),
    before = route
      .slice(0, k < 0 ? route.length : k)
      .reverse()
      .find((o) => Array.isArray(o.at));
  const [bx, bz] = boss.at,
    [nx, nz] = before?.at ?? [map.spawn.x / map.cell, map.spawn.z / map.cell];
  // the yaw that faces from (x, z) to (tx, tz): forward = (-sin yaw, -cos yaw)
  const face = (x, z, tx, tz) => +Math.atan2(-(tx - x), -(tz - z)).toFixed(3);
  // the far side: walk on from the boss, away from the near point, while the floor lasts (at most 14 cells)
  const ux = (bx - nx) / (Math.hypot(bx - nx, bz - nz) || 1),
    uz = (bz - nz) / (Math.hypot(bx - nx, bz - nz) || 1);
  let fx = bx,
    fz = bz;
  for (let d = 1; d <= 14; d++) {
    const x = bx + ux * d,
      z = bz + uz * d,
      kk = map.kind(Math.floor(x), Math.floor(z));
    if (kk !== 'floor' && kk !== 'outdoor') break;
    fx = x;
    fz = z;
  }
  views[`BOSS-${id}-near`] = { map: id, x: nx + 0.5, z: nz + 0.5, yaw: face(nx + 0.5, nz + 0.5, bx, bz), pitch: 0.05 };
  views[`BOSS-${id}-far`] = { map: id, x: +fx.toFixed(1), z: +fz.toFixed(1), yaw: face(fx, fz, bx, bz), pitch: 0.05 };
  rows.push(`${id} ${boss.kind} at ${bx},${bz}; near ${nx},${nz} (${Math.hypot(bx - nx, bz - nz).toFixed(0)} cells off)`);
}
fs.writeFileSync(out, JSON.stringify(views, null, 1));
console.log(rows.join('\n'));
