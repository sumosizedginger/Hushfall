// T04: the M08 chamber door seals behind the player and only reopens when the Cantor dies; the game has no melee weapon. How much ammo is inside the chamber?
// Counts pickups whose cell is inside the sealed chamber (x 17..39, z 13..37 cells, i.e. everything west of the door at (40,35)) and compares with the HP that must be removed.
// Run: node review/gate-2/audit/repro/t04_m08_chamber_ammo.mjs
import { loadMapFile } from '../../../../src/engine/harness.js';
import { PICKUPS, ENEMIES, DIFFICULTY } from '../../../../src/engine/defs.js';
const map = loadMapFile('maps/C1E1M08.json');
const inside = (e) => e.at[0] >= 17 && e.at[0] <= 39 && e.at[1] >= 13 && e.at[1] <= 37;
const ammo = {}, other = {};
for (const e of map.entities) if (e.type === 'pickup' && inside(e)) { const d = PICKUPS[e.kind]; if (d.type === 'ammo' || d.type === 'weapon') ammo[d.ammo] = (ammo[d.ammo] || 0) + d.amount; else other[e.kind] = (other[e.kind] || 0) + 1; }
const foes = map.entities.filter((e) => e.type === 'enemy' && inside(e));
for (const difficulty of ['normal', 'hard']) {
  const dm = DIFFICULTY[difficulty];
  const hp = foes.reduce((a, e) => a + ENEMIES[e.kind].hp * dm.enemyHp, 0);
  const shell = Math.round((ammo.shell || 0) * dm.ammoPickup), flare = Math.round((ammo.flare || 0) * dm.ammoPickup), rivet = Math.round((ammo.rivet || 0) * dm.ammoPickup);
  console.log(difficulty, '| inside-chamber ammo (after difficulty multiplier): flare', flare, 'shell', shell, 'rivet', rivet, '| other pickups', JSON.stringify(other));
  console.log('   HP to remove in the chamber (nodes+cantor+residents):', Math.round(hp), '| summoned gaunts are extra (3 per 18 s, up to 8 alive) | upper-bound damage from chamber ammo: flare', flare * 82, 'shell', shell * 81, 'rivet', rivet * 7, 'total', flare * 82 + shell * 81 + rivet * 7, '| Cantor takes 5% while any node stands');
}
console.log('enemies inside chamber:', JSON.stringify(foes.reduce((a, e) => (a[e.kind] = (a[e.kind] || 0) + 1, a), {})));
console.log('door sealed by trigger `sealed` at [37,33] r=3 cells; unsealed only by trigger `cantor-dead` (dead:cantor). w.doors[].sealed blocks Use (door_remote).');
