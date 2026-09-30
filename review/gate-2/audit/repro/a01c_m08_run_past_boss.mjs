// A01c: with the duplicate-exit bug (A01) the Cantor never has to die. Start a player at full health just inside the sealed chamber door (as if they had fought their way up the tower)
// and let a bot that NEVER fires walk to the hatch via three waypoints that go round the bell node standing in front of it (the bot cannot sidestep on its own). Reports whether the level completes and what it costs. Uses the real world.step and InputState.
// Run: node review/gate-2/audit/repro/a01c_m08_run_past_boss.mjs
import { loadMapFile } from '../../../../src/engine/harness.js';
import { createWorld, step } from '../../../../src/engine/world.js';
import { InputState } from '../../../../src/engine/input.js';
import { Bot } from '../../../../src/engine/bot.js';
const map = loadMapFile('maps/C1E1M08.json');
for (const difficulty of ['easy', 'normal', 'hard']) {
  const w = createWorld(map, { seed: 1, difficulty }); w.player.x = 78.6; w.player.z = 71; w.player.yaw = Math.PI / 2; w.player.y = 12;   // just west of the door at cell (40,35), on the chamber floor (12 m)
  const input = new InputState(), bot = new Bot(w, input, [{ op: 'goto', at: [30, 24] }, { op: 'goto', at: [26, 19] }, { op: 'goto', at: [26, 16] }, { op: 'goto', at: [28, 15] }], { fights: false });
  let t = 0; while (!bot.done && !bot.failed && w.status === 'playing' && t < 60 * 90) { bot.tick(); step(w, input.sample()); t++; }
  const cantor = w.enemies.find((e) => e.kind === 'cantor'), nodes = w.enemies.filter((e) => e.kind === 'bellnode' && e.state !== 'dead').length;
  console.log(difficulty.padEnd(6), 'status', w.status, '| after', (t / 60).toFixed(1), 's | damage', w.stats.damageTaken, '| hp left', w.player.hp, '| bell nodes still ringing', nodes, '| Cantor', cantor.state, Math.round(cantor.hp) + '/' + Math.round(720 * ({ easy: 0.75, normal: 1, hard: 1.2 })[difficulty]), '| cantor-dead trigger fired:', w.triggerState['cantor-dead'].fired);
}
