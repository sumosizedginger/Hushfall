// R11: how much does the new last-resort flare feed (PLAYER.dryFeed: +1 flare after 4 s whenever the player holds NO ammunition of any kind) change the game?
// Experiment: the canonical main route with the player starting with ZERO ammunition and every ammo/weapon pickup worth nothing (ammoScale 0): the ONLY ammunition is the feed (1 flare per 4 s, ~70-80 splash damage each).
// A route bot that only shoots when it has ammo completes some maps this way, i.e. ammunition scarcity has no floor except time. Reported per map: result, simulated seconds, flares fed, shots fired.
// Run from repo root: node review/gate-2/reaudit/repro/r11_dry_feed_only_run.mjs [difficulty]
import fs from 'node:fs';
import { loadMapFile, loadRouteFile, runRoute } from '../../../../src/engine/harness.js';
import { createWorld } from '../../../../src/engine/world.js';
const difficulty = process.argv[2] || 'normal';
for (const id of ['C1E1M01', 'C1E1M02', 'C1E1M03', 'C1E1M04', 'C1E1M05', 'C1E1M06', 'C1E1M07', 'C1E1M08']) {
  const map = loadMapFile(`maps/${id}.json`), route = loadRouteFile(`routes/${id}.main.route.json`);
  const w = createWorld(map, { seed: 1, difficulty, ammoScale: 0 }); w.player.ammo = { flare: 0, shell: 0, rivet: 0 };
  const r = runRoute(map, route, { world: w, seed: 1, difficulty, maxTicks: 60 * 60 * 20 });
  const fed = r.events.filter((e) => e.type === 'dry_feed').length;
  console.log(id, difficulty, r.result.padEnd(11), (r.ticks / 60).toFixed(0).padStart(4) + ' s', 'fed', String(fed).padStart(3), 'shots', String(r.world.stats.shots).padStart(3), 'damage taken', r.world.stats.damageTaken, r.failure ?? '');
}
