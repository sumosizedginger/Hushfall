// A04b: static ammo-economy margin per map: total damage the map's ammo could deal if EVERY round hit at close range (upper bound) divided by total enemy HP.
// Ratio near 1 means a player who misses or wastes shots cannot finish the level without leaving enemies alive. Also lists key spawn-only enemies (summons/waves).
// Run: node review/gate-2/audit/repro/a04b_ammo_economy.mjs
import fs from 'node:fs';
import { loadMapFile } from '../../../../src/engine/harness.js';
import { ENEMIES, PICKUPS, WEAPONS, DIFFICULTY, AMMO_MAX } from '../../../../src/engine/defs.js';
const dmgPer = { flare: WEAPONS.flare.direct + WEAPONS.flare.splashDamage, shell: WEAPONS.scattergun.pellets * WEAPONS.scattergun.damage, rivet: WEAPONS.rivet.damage };
const realistic = { flare: dmgPer.flare * 0.5, shell: dmgPer.shell * 0.5, rivet: dmgPer.rivet * 0.7 };   // rough: half the pellets/splash connect on average, 70% of rivets
console.log('damage per round, upper bound:', JSON.stringify(dmgPer), '| rough realistic:', JSON.stringify(realistic));
for (const f of fs.readdirSync('maps').filter((f) => f.endsWith('.json') && !f.includes('M01'))) {
  const map = loadMapFile('maps/' + f); if (!map.entities.some((e) => e.type === 'enemy')) continue;
  for (const difficulty of ['normal', 'hard']) {
    const dm = DIFFICULTY[difficulty], hp = map.entities.filter((e) => e.type === 'enemy').reduce((a, e) => a + ENEMIES[e.kind].hp * dm.enemyHp * (ENEMIES[e.kind].shield ? 1 : 1), 0);
    const ammo = { ...(map.entryLoadout?.ammo ?? {}) };
    for (const e of map.entities) if (e.type === 'pickup') { const d = PICKUPS[e.kind]; if (d.type === 'ammo' || d.type === 'weapon') ammo[d.ammo] = (ammo[d.ammo] || 0) + Math.round(d.amount * dm.ammoPickup); }
    const cap = (k) => ammo[k] || 0;
    const up = Object.keys(dmgPer).reduce((a, k) => a + cap(k) * dmgPer[k], 0), re = Object.keys(realistic).reduce((a, k) => a + cap(k) * realistic[k], 0);
    console.log(f.replace('.json', '').padEnd(9), difficulty.padEnd(6), 'enemy HP', Math.round(hp), '| ammo on map', JSON.stringify(ammo), '| upper-bound dmg', Math.round(up), `(x${(up / hp).toFixed(1)})`, '| rough realistic', Math.round(re), `(x${(re / hp).toFixed(1)})`);
  }
}
