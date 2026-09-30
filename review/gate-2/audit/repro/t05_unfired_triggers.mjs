// T05: which triggers / switches / messages / closets never fire (or open) on the canonical routes? A trigger that no legal play fires is dead content.
// Run: node review/gate-2/audit/repro/t05_unfired_triggers.mjs
import fs from 'node:fs';
import { loadMapFile, loadRouteFile, runRoute } from '../../../../src/engine/harness.js';
for (const id of ['C1E1M02', 'C1E1M03', 'C1E1M04', 'C1E1M05', 'C1E1M06', 'C1E1M07', 'C1E1M08', 'C1E1S01']) {
  const map = loadMapFile(`maps/${id}.json`); const fired = new Set(), msgs = new Set(), sw = new Set(), opened = new Set();
  for (const name of ['main', 'secret']) {
    const f = `routes/${id}.${name}.route.json`; if (!fs.existsSync(f)) continue;
    const r = runRoute(map, loadRouteFile(f), { seed: 1 }), w = r.world;
    for (const [k, v] of Object.entries(w.triggerState)) if (v.fired) fired.add(k);
    for (const m of w.messagesSeen) msgs.add(m); for (const [k, v] of Object.entries(w.switchState)) if (v.used) sw.add(k);
    for (const d of w.doors) if (d.closet && d.target === 1) opened.add(d.cx + ',' + d.cz);
  }
  const ms = (list, set, f = (x) => x.id) => list.filter((x) => !set.has(f(x))).map(f);
  console.log(id, '| triggers never fired:', JSON.stringify(ms(map.triggers, fired)), '| switches never used:', JSON.stringify(ms(map.switches, sw)), '| messages never seen:', JSON.stringify(ms(map.messages, msgs)), '| closets never opened:', [...map.doors.values()].filter((d) => d.closet && !opened.has(d.cx + ',' + d.cz)).length);
}
