// R09b: cost of the repaired nav-field versioning (nav.js navVersion) as the map grows, while a moving floor is in motion.
// Old behaviour: a distance field was reused for up to 30 ticks. New: a field is valid only while (door passability, sector heights) are unchanged, so while ANY sector moves every tick needs a fresh BFS per distinct target.
// Synthetic open maps of N x N cells (N = 56, 100, 160 = the validator's cap of 25,600 cells) with one lift that is driven up and down, one hunting enemy that cannot see the player. Prints ms per tick.
// Run from repo root: node review/gate-2/reaudit/repro/r09b_nav_cost_by_map_size.mjs [rootDir]   (rootDir = alternative repo copy, e.g. the pre-repair tree)
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const root = path.resolve(process.argv[2] || '.');
const M = await import(pathToFileURL(path.join(root, 'src/engine/mapformat.js')).href);
const W = await import(pathToFileURL(path.join(root, 'src/engine/world.js')).href);
const S = await import(pathToFileURL(path.join(root, 'src/engine/script.js')).href);
for (const n of [56, 100, 160]) {
  const grid = Array.from({ length: n }, (_, z) => (z === 0 || z === n - 1 ? '#'.repeat(n) : '#' + '.'.repeat(n - 2) + '#'));
  const heights = Array.from({ length: n }, () => '.'.repeat(n));
  const src = { format: 1, id: 'N' + n, version: 1, name: 'n', grid, doors: [], secrets: [], ceilingHeight: 6, heights,
    sectors: [{ id: 'lift', cells: [[3, 3], [3, 4]], low: 0, high: 2, speed: 1, start: 'low' }],
    triggers: [{ id: 'drive', when: 'time:99999', do: [{ sector: { id: 'lift', to: 'high' } }] }],
    entities: [{ type: 'player', at: [2, 2], facing: 'east' }, { type: 'exit', at: [n - 3, n - 3] }, { type: 'enemy', kind: 'tollbearer', at: [n - 8, n - 8] }] };
  const v = M.validateMap(src); if (!v.ok) { console.log(n, 'map rejected:', v.errors[0]); continue; }
  const w = W.createWorld(M.parseMap(src), { seed: 1 }); w.player.hp = 1e9; const e = w.enemies[0]; e.state = 'chase'; e.lastX = w.player.x; e.lastZ = w.player.z;
  const N = 600; const t0 = process.hrtime.bigint(); let worst = 0;
  for (let i = 0; i < N; i++) { if (i % 90 === 0) S.runAction(w, { sector: { id: 'lift', to: 'toggle' } }); e.state = 'chase'; e.lost = 0; e.lastX = w.player.x; e.lastZ = w.player.z; const a = process.hrtime.bigint(); W.step(w, { move: [0, 0], yaw: 0, pitch: 0 }); worst = Math.max(worst, Number(process.hrtime.bigint() - a) / 1e6); W.drainEvents(w); }
  console.log(`${n}x${n} (${n * n} cells): ${(Number(process.hrtime.bigint() - t0) / 1e6 / N).toFixed(2)} ms/tick average, worst tick ${worst.toFixed(1)} ms, one hunting enemy, a lift in motion`);
}
