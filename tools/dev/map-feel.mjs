// How a map FEELS in numbers, for every shipped map (PT-008: "the entire game feels way wide open"). Read-only, deterministic, no browser.
//   node tools/dev/map-feel.mjs            one row per map
// roofed   = share of walkable cells that get a ceiling (floor kind `floor`; the outdoor skins get none, whatever stands around them)
// sight    = median / 90th percentile of straight sightlines to the nearest wall, from every 3rd walkable cell, 16 directions (props ignored: an upper bound)
// density  = enemies per 1000 walkable cells; first = metres from the spawn to the nearest enemy
// aliens   = alien props (pod, cradle) on the map; new = enemy kinds not seen on an earlier map of the same listing
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseMap } from '../../src/engine/mapformat.js';
import { DEFAULT_CEILING } from '../../src/engine/defs.js';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

export function mapFeel(src) {
  const map = parseMap(src);
  // S = solid (wall, water, a secret panel); O = open air (outdoor floor); R = roofed (floor, door): the same rule as `hasCeil` in render/levelmesh.js
  const cls = Array.from({ length: map.h }, (_, z) => Array.from({ length: map.w }, (_, x) => { const k = map.kind(x, z); return k === 'outdoor' ? 'O' : k === 'floor' || k === 'door' ? 'R' : 'S'; }));
  let walk = 0, roofed = 0;
  for (const row of cls) for (const c of row) if (c !== 'S') { walk++; if (c === 'R') roofed++; }
  const sights = [];
  for (let z = 1; z < map.h - 1; z += 3) for (let x = 1; x < map.w - 1; x += 3) {
    if (cls[z][x] === 'S') continue;
    for (let a = 0; a < 16; a++) {
      const dx = Math.cos(a * Math.PI / 8), dz = Math.sin(a * Math.PI / 8);
      let d = 0;
      for (; d < 80; d += 0.5) { const cx = Math.floor(x + 0.5 + dx * d), cz = Math.floor(z + 0.5 + dz * d); if (cx < 0 || cz < 0 || cx >= map.w || cz >= map.h || cls[cz][cx] === 'S') break; }
      sights.push(d);
    }
  }
  sights.sort((p, q) => p - q);
  const player = map.entities.find((e) => e.type === 'player');
  const enemies = map.entities.filter((e) => e.type === 'enemy');
  const first = enemies.map((e) => Math.hypot(e.at[0] - player.at[0], e.at[1] - player.at[1])).sort((p, q) => p - q)[0];
  const kinds = {}; for (const e of enemies) kinds[e.kind] = (kinds[e.kind] ?? 0) + 1;
  const aliens = map.entities.filter((e) => e.type === 'prop' && (e.kind === 'pod' || e.kind === 'cradle')).length;
  return {
    id: map.id, name: map.name, size: `${map.w}x${map.h}`, walkable: walk, roofedPct: Math.round(100 * roofed / walk), ceiling: src.ceilingHeight ?? DEFAULT_CEILING,
    sightMedian: sights[sights.length >> 1], sightP90: sights[Math.floor(sights.length * 0.9)], enemies: enemies.length, density: Math.round(1000 * enemies.length / walk),
    first: first == null ? null : Math.round(first), kinds, aliens, secrets: (map.secrets ?? []).length, switches: map.entities.filter((e) => e.type === 'switch').length,
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const seen = new Set();
  console.log('map      name                     size    walk roofed ceil  sight med/p90  enemies density first  aliens secrets  new enemy kinds');
  for (const f of fs.readdirSync(path.join(ROOT, 'maps')).filter((x) => x.endsWith('.json')).sort()) {
    const r = mapFeel(JSON.parse(fs.readFileSync(path.join(ROOT, 'maps', f), 'utf8')));
    const fresh = Object.keys(r.kinds).filter((k) => !seen.has(k)); fresh.forEach((k) => seen.add(k));
    console.log(`${r.id.padEnd(8)} ${r.name.padEnd(24)} ${r.size.padEnd(7)} ${String(r.walkable).padStart(4)} ${(r.roofedPct + '%').padStart(5)} ${String(r.ceiling).padStart(4)}  ${(r.sightMedian + ' / ' + r.sightP90).padStart(12)}  ${String(r.enemies).padStart(6)} ${String(r.density).padStart(7)} ${String(r.first ?? '-').padStart(5)}  ${String(r.aliens).padStart(6)} ${String(r.secrets).padStart(7)}  ${fresh.join(', ')}`);
  }
}
