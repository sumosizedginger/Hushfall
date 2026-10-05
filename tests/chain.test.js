// Episode 1 played the way the game plays it: the canonical routes chained M01 -> M08 with the inventory carried from map to map (carryOver), the way src/game/main.js nextLevel() does.
// Per-map evidence always starts a map cold from its authored entryLoadout; arrival from the previous map is floored at that loadout (arrivalInventory), so this chain proves the two agree (audit A16).
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadMapFile, loadRouteFile, runRoute } from '../src/engine/harness.js';
import { createWorld, carryOver, arrivalInventory } from '../src/engine/world.js';

const IDS = ['C1E1M01', 'C1E1M02', 'C1E1M03', 'C1E1M04', 'C1E1M05', 'C1E1M06', 'C1E1M07', 'C1E1M08'];
const chain = (difficulty, seed) => {
  let carry = null; const log = [];
  for (const id of IDS) {
    const map = loadMapFile(`maps/${id}.json`), route = loadRouteFile(`routes/${id}.main.route.json`), w = createWorld(map, { seed, difficulty, carry });
    const e = map.entryLoadout; const arrival = { hp: w.player.hp, ammo: { ...w.player.ammo }, weapons: [...w.player.weapons] };
    if (e) { assert.ok(arrival.hp >= e.hp, id + ' starts at full health'); for (const [k, v] of Object.entries(e.ammo)) assert.ok((arrival.ammo[k] ?? 0) >= v, `${id} arrives with at least the authored ${k}`); for (const wp of e.weapons) assert.ok(arrival.weapons.includes(wp), id + ' arrives with ' + wp); }
    const r = runRoute(map, route, { world: w, seed, difficulty }); log.push(`${id}:${r.result}:${r.world.stats.damageTaken}`);
    assert.equal(r.result, 'complete', `${difficulty}/seed ${seed}: ${id} ended ${r.result} ${r.failure ?? ''} (chain so far: ${log.join(' ')})`);
    carry = carryOver(r.world);
  }
};

test('arrival inventory is the carried one floored at the level\'s authored loadout (health, each ammo type, weapons, armour)', () => {
  const entry = { hp: 100, armor: 0, ammo: { flare: 4, shell: 8, rivet: 40 }, weapons: ['flare', 'scattergun', 'rivet'] };
  assert.deepEqual(arrivalInventory(null, entry), entry); assert.equal(arrivalInventory({ hp: 3 }, null).hp, 3);
  const a = arrivalInventory({ hp: 1, armor: 30, ammo: { flare: 9, shell: 0, rivet: 200 }, weapons: ['flare'] }, entry);
  assert.deepEqual(a, { hp: 100, armor: 30, ammo: { flare: 9, shell: 8, rivet: 200 }, weapons: ['flare', 'scattergun', 'rivet'] });
  assert.deepEqual(arrivalInventory(a, entry), a, 'idempotent: Retry from a level start restores the same arrival');
});

// Hard is judged the way the per-map viability gate judges it (src/engine/viability.js: hard needs 2 of 3 seeds): the Cantor fight on hard is a knife edge for the perfect bot
// (M08 hard: 52 of 64 seeds complete, the same 81% before and after the fairer hit volumes of 2026-10-05, known defect A04), so pinning one seed asserts luck, not completability.
test('the whole of Episode 1 is completable in one carried run on hard (at least 2 of seeds 2, 3, 4; the difficulty with the least ammo and the hardest hits)', () => {
  const failures = [];
  for (const seed of [2, 3, 4]) { try { chain('hard', seed); } catch (e) { failures.push(e.message); } }
  assert.ok(failures.length <= 1, `${3 - failures.length} of 3 seeds completed the carried hard run: ` + failures.join(' || '));
});
test('the whole of Episode 1 is completable in one carried run on normal', () => { chain('normal', 1); });
