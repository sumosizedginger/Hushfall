// A16: play the WHOLE episode the way the game does: C1E1M01 -> M02 -> ... -> M08 with the canonical routes, carrying the inventory from level to level
// (carryOver: hp >= 1, armour, ammo, weapons; keys reset) exactly like src/game/main.js nextLevel(). The per-map evidence (verify-map, tests) always starts a map cold
// with its authored `entryLoadout` (M07: 4 flares / 8 shells / 40 rivets), which a real player never gets after M01.
// Run: node review/gate-2/audit/repro/a16_campaign_chain.mjs
import { loadMapFile, loadRouteFile } from '../../../../src/engine/harness.js';
import { createWorld, step, carryOver, drainEvents } from '../../../../src/engine/world.js';
import { InputState } from '../../../../src/engine/input.js';
import { Bot } from '../../../../src/engine/bot.js';
const IDS = ['C1E1M01', 'C1E1M02', 'C1E1M03', 'C1E1M04', 'C1E1M05', 'C1E1M06', 'C1E1M07', 'C1E1M08'];
for (const difficulty of ['easy', 'normal', 'hard']) {
  for (const seed of [1, 2]) {
    let carry = null; const rows = [];
    for (const id of IDS) {
      const map = loadMapFile(`maps/${id}.json`), route = loadRouteFile(`routes/${id}.main.route.json`);
      const w = createWorld(map, { seed, difficulty, carry }), input = new InputState(), bot = new Bot(w, input, route);
      const entry = `hp${w.player.hp} ar${w.player.armor} f${w.player.ammo.flare ?? 0}/s${w.player.ammo.shell ?? 0}/r${w.player.ammo.rivet ?? 0}`;
      let ticks = 0; while (!bot.done && !bot.failed && w.status === 'playing' && ticks < 60 * 60 * 6) { bot.tick(); step(w, input.sample()); ticks++; }
      const res = w.status === 'complete' ? 'ok' : w.status === 'dead' ? 'DEAD' : 'FAIL:' + (bot.failed || '').slice(0, 30);
      rows.push(`${id.slice(4)} [${entry}] ${res} dmg${w.stats.damageTaken}`);
      if (w.status !== 'complete') break;
      carry = carryOver(w);
    }
    console.log(difficulty.padEnd(6), 'seed', seed, '|', rows.join(' | '));
  }
}
