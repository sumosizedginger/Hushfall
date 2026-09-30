// A01: M07 and M08 each declare TWO exit entities on the same cell (one unlocked via the '>' glyph, one locked:true).
// world.step() uses map.exits.find(...), which returns the FIRST (unlocked) one, so the lock never applies.
// Run from repo root: node review/gate-2/audit/repro/a01_duplicate_exit.mjs
import { loadMapFile } from '../../../../src/engine/harness.js';
import { createWorld, step } from '../../../../src/engine/world.js';
for (const id of ['C1E1M07', 'C1E1M08']) {
  const map = loadMapFile(`maps/${id}.json`);
  const w = createWorld(map, { seed: 1, difficulty: 'normal' });
  console.log(id, 'exits:', JSON.stringify(map.exits.map((e) => ({ id: e.id, at: e.at, locked: e.locked }))), 'exitLocked:', JSON.stringify(w.exitLocked));
  const ex = map.exits[0];
  w.player.x = ex.x; w.player.z = ex.z; w.player.y = 0;
  for (let i = 0; i < 3; i++) step(w, { move: [0, 0] });
  console.log(id, '-> standing on the exit cell at tick 3 with NO fuses / NO boss kill: status =', w.status, w.endStats ? '(level_complete emitted)' : '');
}
