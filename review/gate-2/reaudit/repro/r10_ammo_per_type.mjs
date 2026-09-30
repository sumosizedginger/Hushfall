// R10: the new 'ammo slack' gate (viability.js ammoCapacity / viabilityChecks) sums rounds of every ammo type and compares the sum with the number of shots fired of every type.
// Flares, shells and rivets are worth very different amounts of damage, and each weapon has its own ammo, so an aggregate can be comfortable while ONE type is tight.
// This script recomputes slack PER AMMO TYPE for every map and difficulty from the canonical main route: available (cold-start loadout + every pickup at that difficulty's rate) / fired (fire events per weapon).
// Run from repo root: node review/gate-2/reaudit/repro/r10_ammo_per_type.mjs
import fs from 'node:fs';
import { loadMapFile, loadRouteFile, runRoute } from '../../../../src/engine/harness.js';
import { PICKUPS, DIFFICULTY, PLAYER, WEAPONS } from '../../../../src/engine/defs.js';
const ids = fs.readdirSync('maps').filter((f) => f.endsWith('.json')).map((f) => f.replace('.json', '')).sort();
for (const id of ids) {
  const map = loadMapFile(`maps/${id}.json`), route = loadRouteFile(`routes/${id}.main.route.json`);
  for (const d of ['normal', 'hard']) {
    const dm = DIFFICULTY[d], avail = { ...(map.entryLoadout?.ammo ?? PLAYER.startAmmo) };
    for (const e of map.entities) if (e.type === 'pickup') { const p = PICKUPS[e.kind]; if (p.type === 'ammo' || p.type === 'weapon') avail[p.ammo] = (avail[p.ammo] ?? 0) + Math.round(p.amount * dm.ammoPickup); }
    const r = runRoute(map, route, { seed: 1, difficulty: d }), fired = {}; for (const ev of r.events) if (ev.type === 'fire') { const a = WEAPONS[ev.weapon].ammo; fired[a] = (fired[a] ?? 0) + 1; }
    const per = Object.keys({ ...avail, ...fired }).map((k) => `${k} ${avail[k] ?? 0}/${fired[k] ?? 0}=${fired[k] ? 'x' + ((avail[k] ?? 0) / fired[k]).toFixed(2) : '-'}`).join('  ');
    const tight = Object.keys(fired).filter((k) => (avail[k] ?? 0) / fired[k] < 1.5);
    console.log(id, d.padEnd(6), r.result.padEnd(8), per, tight.length ? ' <== below 1.5x for: ' + tight.join(',') : '');
  }
}
