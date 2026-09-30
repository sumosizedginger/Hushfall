// R01b: trace the A03 'real charge' half of tests/kit.test.js ('knockback stops at a wall') step by step, exactly as the test sets it up, on the repaired tree AND with the pre-repair tryMove semantics
// (rootDir argument = a tree whose world.js still has the old tryMove, e.g. the f79bf59 archive; the scenario itself is copied verbatim from the test).
// Shows whether the Warden ever strikes the player. It does not: it is spawned with yaw -pi/2 (heading -x, away from the player at +x), so it charges into the west wall and stuns itself.
// Run from repo root: node review/gate-2/reaudit/repro/r01b_kit_test_scenario_trace.mjs [rootDir]
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const root = path.resolve(process.argv[2] || '.');
const M = await import(pathToFileURL(path.join(root, 'src/engine/mapformat.js')).href);
const W = await import(pathToFileURL(path.join(root, 'src/engine/world.js')).href);
const idle = () => ({ move: [0, 0], yaw: 0, pitch: 0, fire: false, aim: false, sprint: false, use: false, weapon: null, weaponStep: 0, map: false });
const cell = (c) => (c + 0.5) * 2;
const g = ['###########', '#....#....#', '#....#....#', '#....#....#', '###########'];
const src = { format: 1, id: 'K1', version: 1, name: 'Kit', grid: g, doors: [], secrets: [], entities: [{ type: 'player', at: [1, 1], facing: 'east' }, { type: 'exit', at: [9, 1] }] };
for (const yaw of [-Math.PI / 2, Math.PI / 2]) {
  const w = W.createWorld(M.parseMap(src), { seed: 1 }), e = W.spawnEnemy(w, 'wardengraft', cell(1), cell(2), yaw);
  Object.assign(w.player, { x: cell(4) - 0.1, z: cell(2), yaw: 0 }); e.state = 'chase'; e.chargeT = 0.85 + 0.01; e.chargeCd = 0;
  const seen = new Set(); let px0 = w.player.x, maxJump = 0, ex = e.x;
  for (let i = 0; i < 240; i++) { const x0 = w.player.x; W.step(w, idle()); for (const ev of W.drainEvents(w)) seen.add(ev.type); maxJump = Math.max(maxJump, Math.abs(w.player.x - x0)); }
  console.log(`warden yaw ${yaw > 0 ? '+' : '-'}pi/2: events ${[...seen].filter((t) => /strike|crash|windup|hurt/.test(t)).join(',') || '(none)'} | player hp ${w.player.hp} x ${px0.toFixed(2)} -> ${w.player.x.toFixed(2)} (largest one-tick jump ${maxJump.toFixed(2)} m) | warden x ${ex.toFixed(2)} -> ${e.x.toFixed(2)}`);
}
