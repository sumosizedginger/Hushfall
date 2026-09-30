// A04c: tests/shipped.test.js demands, for Marrow Quay only, "capacity >= 1.5 x rounds a perfect bot fires" (its own words: "humans miss, so this needs at least 1.5x slack").
// Apply the same rule to every Gate 2 map (normal difficulty, rounds = start loadout + every ammo/weapon pickup on the map, spent = stats.shots of the canonical route).
// Run: node review/gate-2/audit/repro/a04c_ammo_slack_vs_gate1_standard.mjs
import fs from 'node:fs';
import { loadMapFile, loadRouteFile, runRoute } from '../../../../src/engine/harness.js';
import { PICKUPS, DIFFICULTY, PLAYER } from '../../../../src/engine/defs.js';
for (const difficulty of ['normal', 'hard']) {
  const dm = DIFFICULTY[difficulty];
  for (const f of fs.readdirSync('maps').filter((f) => f.endsWith('.json'))) {
    const id = f.replace('.json', ''), map = loadMapFile('maps/' + f); if (!map.entities.some((e) => e.type === 'enemy')) continue;
    const start = Object.values(map.entryLoadout?.ammo ?? PLAYER.startAmmo).reduce((a, b) => a + b, 0);
    const pick = map.entities.filter((e) => e.type === 'pickup' && (PICKUPS[e.kind].type === 'ammo' || PICKUPS[e.kind].type === 'weapon')).reduce((a, e) => a + Math.round(PICKUPS[e.kind].amount * dm.ammoPickup), 0);
    const r = runRoute(map, loadRouteFile(`routes/${id}.main.route.json`), { seed: 1, difficulty }), spent = r.world.stats.shots, cap = start + pick;
    console.log(id.padEnd(9), difficulty.padEnd(6), `rounds available ${cap} (start ${start} + pickups ${pick}) vs fired ${spent} by a perfect bot -> slack x${(cap / spent).toFixed(2)}`, cap / spent < 1.5 ? '  <-- below the 1.5x rule the Gate 1 map is held to' : '', r.result !== 'complete' ? '(route ' + r.result + ')' : '');
  }
}
