// A03: tryMove() in world.js only tests the DESTINATION of a knockback, and a Warden-Graft charge hit knocks the player 3.0 m (defs.js: charge.knock = 3.0)
// while cells are 2 m: a player standing against a one-cell wall can be thrown THROUGH it. Uses the real world.step on shipped M06.
// The quay's north wall (row 7) is one cell (2 m) thick, with the winch cabin behind it. Player starts on the quay side pressed against the wall.
// Run: node review/gate-2/audit/repro/a03_warden_knockback_tunnels.mjs
import { loadMapFile } from '../../../../src/engine/harness.js';
import { createWorld, step, spawnEnemy } from '../../../../src/engine/world.js';
const map = loadMapFile('maps/C1E1M06.json');
const w = createWorld(map, { seed: 1, difficulty: 'easy' });
for (const e of w.enemies) e.state = 'dead';                      // clear the level: isolate the mechanic
const cell = map.cell;
const p = w.player; p.x = 85; p.z = 16.6; // 0.6 m from the wall face: the Warden's straight-line path needs r*0.9 = 0.5 m of clearance at the player's end p.yaw = Math.PI;       // facing south, towards the Warden
const warden = spawnEnemy(w, 'wardengraft', 85, 24, Math.PI);       // yaw pi -> heading -z (north), at the player
warden.state = 'chase'; warden.lastX = p.x; warden.lastZ = p.z;
const cellOf = (z) => Math.floor(z / cell);
console.log('before: player z=', p.z.toFixed(2), 'cell row', cellOf(p.z), 'kind', map.kind(Math.floor(p.x / cell), cellOf(p.z)), '| wall row above:', map.kind(Math.floor(p.x / cell), 7), '| cabin row 6:', map.kind(Math.floor(p.x / cell), 6));
let hit = false;
for (let i = 0; i < 400 && !hit; i++) {
  const before = { x: p.x, z: p.z };
  step(w, { move: [0, 0] });
  if (Math.hypot(p.x - before.x, p.z - before.z) > 1.0) { hit = true; console.log('tick', w.tick, 'KNOCKBACK: player moved', Math.hypot(p.x - before.x, p.z - before.z).toFixed(2), 'm in ONE tick from z=' + before.z.toFixed(2), 'to z=' + p.z.toFixed(2), '(row', cellOf(before.z), '->', cellOf(p.z) + ')', 'hp', p.hp); }
}
console.log('player now in cell row', cellOf(p.z), 'kind', map.kind(Math.floor(p.x / cell), cellOf(p.z)), '-> passed through wall row 7 (2 m thick):', cellOf(p.z) < 7);
