// R07: arrival-inventory floor (world.js arrivalInventory) in the flows the audit brief asked about.
//  1. the secret chain M04 (secret exit) -> S01 -> M05, carried exactly like main.js nextLevel(): each map must complete and each arrival must be >= the authored entry loadout
//  2. Retry after death mid-level restores the LEVEL-START inventory (never the entry loadout unless that is what the level started with) and cannot be used to farm a better one
//  3. old level-start saves (carry lower than the loadout) load with the floor applied; mid-level saves keep their world
//  4. what the floor means for health: every shipped entryLoadout has hp 100, so carried health never matters
// Run from repo root: node review/gate-2/reaudit/repro/r07_secret_chain_and_retry.mjs
import { loadMapFile, loadRouteFile, runRoute } from '../../../../src/engine/harness.js';
import { createWorld, restartWorld, carryOver, arrivalInventory, step } from '../../../../src/engine/world.js';
import { makeSave, parseSave, loadWorld } from '../../../../src/engine/save.js';
const L = (id) => loadMapFile(`maps/${id}.json`), R = (id, n) => loadRouteFile(`routes/${id}.${n}.route.json`);
const inv = (w) => `hp${w.player.hp} ar${w.player.armor} f${w.player.ammo.flare ?? 0}/s${w.player.ammo.shell ?? 0}/r${w.player.ammo.rivet ?? 0} [${w.player.weapons.join(',')}]`;

// 1. secret chain
for (const [difficulty, seed] of [['normal', 1], ['hard', 2], ['hard', 3]]) {
  let carry = null; const row = [];
  for (const [id, route] of [['C1E1M01', 'main'], ['C1E1M02', 'main'], ['C1E1M03', 'main'], ['C1E1M04', 'secret'], ['C1E1S01', 'main'], ['C1E1M05', 'main']]) {
    const map = L(id), w = createWorld(map, { seed, difficulty, carry }), arrive = inv(w);
    const r = runRoute(map, R(id, route), { world: w, seed, difficulty }); row.push(`${id.slice(4)}(${route}) ${arrive} -> ${r.result} dmg${r.world.stats.damageTaken} dest=${r.world.endStats?.dest}`);
    if (r.result !== 'complete') break; carry = carryOver(r.world);
  }
  console.log(difficulty, 'seed', seed, '|', row.join(' | '));
}

// 2. Retry: die in M07 with the level-start inventory, retry, compare
{
  const map = L('C1E1M07'), carry = { hp: 1, armor: 0, ammo: { flare: 0, shell: 0, rivet: 0 }, weapons: ['flare'] };
  const w = createWorld(map, { seed: 1, carry }); console.log('arrival with a carried 1 hp / empty gun / flare-only inventory ->', inv(w), '| levelStart', JSON.stringify(w.levelStart));
  w.player.ammo.shell = 0; w.player.hp = 0; step(w, { move: [0, 0], yaw: 0, pitch: 0 }); const w2 = restartWorld(w); console.log('Retry after dying ->', inv(w2), '(the same floored arrival every time: no better, no worse)');
  console.log('idempotent floor:', JSON.stringify(arrivalInventory(arrivalInventory(carry, map.entryLoadout), map.entryLoadout)) === JSON.stringify(arrivalInventory(carry, map.entryLoadout)));
}
// 3. old saves
{
  const map = L('C1E1M07'), w = createWorld(map, { seed: 1, carry: { hp: 100, armor: 0, ammo: { flare: 8, shell: 12, rivet: 60 }, weapons: ['flare', 'scattergun', 'rivet'] } });
  const old = JSON.parse(JSON.stringify(makeSave(w, 'level-start'))); old.carry = { hp: 30, armor: 0, ammo: { flare: 1, shell: 0, rivet: 0 }, weapons: ['flare'] };   // a level-start save made before the floor existed and holding little
  const r = loadWorld(parseSave(JSON.stringify(old)).save, () => map); console.log('old level-start save with a poor carry loads as ->', inv(r.world), '(silently upgraded to the entry loadout)');
  const mid = JSON.parse(JSON.stringify(makeSave(w, 'mid-level'))); mid.world.player.hp = 12; mid.world.player.ammo = { flare: 0, shell: 0, rivet: 0 };
  const r2 = loadWorld(parseSave(JSON.stringify(mid)).save, () => map); console.log('mid-level save keeps the saved (poor) inventory ->', inv(r2.world), '| its levelStart (what Retry restores):', JSON.stringify(r2.world.levelStart));
}
