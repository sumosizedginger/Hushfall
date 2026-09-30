// A01b: play M07 / M08 with a route that goes straight to the exit (no fuses, no radio, no Cantor). Uses the real bot through InputState.
// Run: node review/gate-2/audit/repro/a01b_skip_route.mjs
import { loadMapFile, runRoute } from '../../../../src/engine/harness.js';
for (const [id, at] of [['C1E1M07', [24, 9]], ['C1E1M08', [28, 15]]]) {
  const map = loadMapFile(`maps/${id}.json`);
  for (const fights of [true, false]) {
    const r = runRoute(map, [{ op: 'goto', at }], { seed: 1, difficulty: 'normal', fights });
    console.log(id, 'direct-to-exit route, fights=' + fights, '->', r.result, 'ticks', r.ticks, 'sec', (r.ticks / 60).toFixed(1), 'kills', r.world.stats.kills, 'damage', r.world.stats.damageTaken, 'keys', JSON.stringify(r.world.player.keys), r.failure || '');
  }
}
