// A02: for every map, run the bot with a single 'goto exit' op (fights on, and fights off) and report whether the level completes
// without the designed gate (keys, switches, sectors, boss). Run: node review/gate-2/audit/repro/a02_gate_skip_all_maps.mjs
import fs from 'node:fs';
import { loadMapFile, runRoute } from '../../../../src/engine/harness.js';
for (const f of fs.readdirSync('maps').filter((f) => f.endsWith('.json'))) {
  const id = f.replace('.json', ''), map = loadMapFile('maps/' + f);
  const ex = map.exits.filter((e) => !e.locked);
  for (const e of map.exits) {
    for (const fights of [true, false]) {
      const r = runRoute(map, [{ op: 'goto', at: e.at.map(Math.floor) }], { seed: 1, difficulty: 'normal', fights });
      const w = r.world;
      const used = Object.entries(w.switchState).filter(([, s]) => s.used).map(([k]) => k);
      console.log(id.padEnd(8), e.id, 'locked=' + e.locked, 'dest=' + e.dest, 'fights=' + fights, '->', r.result.padEnd(10), (r.ticks / 60).toFixed(0) + 's', 'kills', w.stats.kills, 'dmg', w.stats.damageTaken, 'keys', JSON.stringify(w.player.keys), 'switches', JSON.stringify(used), r.failure || '');
    }
  }
}
