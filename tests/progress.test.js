// Campaign progression (owner decision, PT-008): ranks, salvage, the Locker, the caps the upgrades raise in the simulation, and the save that carries it all.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createWorld, step, hashWorld, carryOver, restartWorld } from '../src/engine/world.js';
import { makeSave, parseSave, loadWorld, SAVE_VERSION, SAVE_MAGIC } from '../src/engine/save.js';
import { AMMO_MAX, PLAYER } from '../src/engine/defs.js';
import { RANK, TRACKS, rankFor, salvageFor, earn, buy, newProgress, sanitizeProgress, ammoCap, armorCap, describeNext } from '../src/engine/progress.js';
import { loadMap, mapLoader } from './helpers.js';

const idle = () => ({ move: [0, 0], yaw: 0, pitch: 0, fire: false, use: false, weapon: null });
const end = (o = {}) => ({ time: 100, kills: 30, secrets: 1, total: { enemies: 30, secrets: 1 }, ...o });

test('rank: a perfect run is S; each shortfall costs a letter in the expected order', () => {
  assert.equal(rankFor(end({ time: 40 }), 100).rank, 'S', 'every kill, the secret, inside half the par');
  assert.equal(rankFor(end({ time: 100 }), 100).rank, 'A', 'on par: time scores 0.75 -> 0.9125, just under S');
  assert.equal(rankFor(end({ time: 100, secrets: 0 }), 100).rank, 'B', 'the secret missed: 0.4 + 0.2625 = 0.6625');
  assert.equal(rankFor(end({ time: 400, kills: 10, secrets: 0 }), 100).rank, 'C', 'slow, few kills, no secret');
  assert.equal(rankFor(end({ time: 90 }), undefined).parts.time, 1, 'a map with no par never costs time');
});

test('rank on a map with no secret redistributes the weight (it can still be S, and no secret is not a penalty)', () => {
  const noSecret = (o) => end({ secrets: 0, total: { enemies: 30, secrets: 0 }, ...o });
  assert.equal(rankFor(noSecret({ time: 40 }), 100).rank, 'S');
  assert.equal(rankFor(noSecret({ time: 100 }), 100).rank, 'A', '0.55 + 0.45 * 0.75 = 0.8875');
  assert.equal(rankFor(noSecret({ time: 150, kills: 21 }), 100).rank, 'B', '0.385 + 0.225 = 0.61');
  assert.equal(rankFor(noSecret({ time: 500, kills: 9 }), 100).rank, 'C');
  assert.equal(rankFor({ time: 10, kills: 0, secrets: 0, total: { enemies: 0, secrets: 0 } }, 100).rank, 'S', 'an empty map (a safe room) is not penalised');
});

test('salvage: the rank pays, every secret pays more, and replaying a map pays only the IMPROVEMENT (no farming)', () => {
  assert.equal(salvageFor('S', 1), RANK.salvage.S + RANK.secretSalvage); assert.equal(salvageFor('C', 0), 0);
  let p = newProgress();
  const first = earn(p, 'M1', end({ time: 100, secrets: 0 }), 100); assert.equal(first.result.rank, 'B'); assert.equal(first.gain, RANK.salvage.B); p = first.progress;
  const again = earn(p, 'M1', end({ time: 100, secrets: 0 }), 100); assert.equal(again.gain, 0, 'the same result pays nothing twice'); p = again.progress;
  const better = earn(p, 'M1', end({ time: 40 }), 100); assert.equal(better.result.rank, 'S'); assert.equal(better.gain, salvageFor('S', 1) - RANK.salvage.B, 'only the difference'); p = better.progress;
  assert.equal(p.salvage, salvageFor('S', 1));
  const worse = earn(p, 'M1', end({ time: 900, kills: 5, secrets: 0 }), 100); assert.equal(worse.gain, 0); assert.equal(worse.record.rank, 'S', 'the record keeps the BEST rank'); assert.equal(worse.record.time, 40, 'and the best time');
  assert.equal(earn(p, 'M2', end({ time: 40 }), 100).gain, salvageFor('S', 1), 'another map pays on its own');
});

test('the Locker: tiers cost what the table says, cannot be bought without salvage, stop at the last tier, and never mutate the input', () => {
  assert.deepEqual(TRACKS.ammo.costs, [3, 5, 8, 12, 18]);
  const poor = { ...newProgress(), salvage: 2 }, snapshot = JSON.stringify(poor);
  const r0 = buy(poor, 'ammo'); assert.equal(r0.ok, false); assert.equal(r0.reason, 'salvage'); assert.equal(r0.cost, 3); assert.equal(JSON.stringify(poor), snapshot, 'untouched');
  let p = { ...newProgress(), salvage: 100 };
  for (let tier = 0; tier < 5; tier++) { const r = buy(p, 'ammo'); assert.equal(r.ok, true); assert.equal(r.cost, TRACKS.ammo.costs[tier]); p = r.progress; assert.equal(p.upgrades.ammo, tier + 1); }
  assert.equal(p.salvage, 100 - 3 - 5 - 8 - 12 - 18);
  assert.equal(buy(p, 'ammo').reason, 'maxed'); assert.equal(buy(p, 'armor').ok, true, 'the other track is independent'); assert.equal(buy(p, 'nonsense').reason, 'unknown');
  assert.equal(describeNext(p, 'ammo').cost, null, 'a maxed track says so');
  assert.match(describeNext(newProgress(), 'armor').text, /armour holds up to 120/);
});

test('the caps: each ammunition tier adds 15% to every ammunition type and each armour tier 20 points; garbage tiers are clamped, never trusted', () => {
  assert.equal(ammoCap('flare', null), AMMO_MAX.flare); assert.equal(ammoCap('rivet', { ammo: 0 }), AMMO_MAX.rivet);
  assert.equal(ammoCap('shell', { ammo: 2 }), Math.round(AMMO_MAX.shell * 1.3)); assert.equal(ammoCap('rivet', { ammo: 5 }), Math.round(AMMO_MAX.rivet * 1.75));
  assert.equal(armorCap(null), PLAYER.maxArmor); assert.equal(armorCap({ armor: 3 }), PLAYER.maxArmor + 60);
  assert.equal(ammoCap('shell', { ammo: 99 }), ammoCap('shell', { ammo: 5 }), 'above the last tier is the last tier');
  assert.equal(ammoCap('shell', { ammo: -4 }), AMMO_MAX.shell); assert.equal(armorCap({ armor: NaN }), PLAYER.maxArmor); assert.equal(armorCap({ armor: 'x' }), PLAYER.maxArmor);
  const s = sanitizeProgress({ salvage: -5, upgrades: { ammo: 'many', armor: 2.9 }, records: { A: { rank: 'S', paid: 5 }, B: { rank: 'Z' }, C: 7 } });
  assert.deepEqual([s.salvage, s.upgrades.ammo, s.upgrades.armor, Object.keys(s.records).join()], [0, 0, 2, 'A']);
  assert.deepEqual(sanitizeProgress('nonsense'), newProgress());
});

const world = (up, seed = 1) => createWorld(loadMap(), { seed, carry: { upgrades: up } });
/** put a pickup under the player and step once: was it taken? */
const drop = (w, kind) => { const it = { id: 9001, kind, x: w.player.x, z: w.player.z }; w.pickups.push(it); step(w, idle()); return !w.pickups.includes(it); };

test('the simulation: with no upgrades the caps are the old ones; with them a pickup fills past the old cap, to the new one and no further', () => {
  let w = world(undefined); w.player.ammo.shell = AMMO_MAX.shell; assert.equal(drop(w, 'ammo_shell'), false, 'full at the old cap: the box stays on the floor');
  const up = { ammo: 3, armor: 0 }, cap = ammoCap('shell', up);
  w = world(up); w.player.ammo.shell = AMMO_MAX.shell; assert.equal(drop(w, 'ammo_shell'), true, 'an upgraded satchel takes the box');
  assert.ok(w.player.ammo.shell > AMMO_MAX.shell && w.player.ammo.shell <= cap, `shells ${w.player.ammo.shell}, cap ${cap}`);
  w = world(up); w.player.ammo.shell = cap - 1; drop(w, 'ammo_shell'); assert.equal(w.player.ammo.shell, cap, 'never above the new cap');
  w = world(undefined); w.player.armor = PLAYER.maxArmor; assert.equal(drop(w, 'armor_vest'), false);
  w = world({ ammo: 0, armor: 2 }); w.player.armor = PLAYER.maxArmor; assert.equal(drop(w, 'armor_vest'), true); assert.equal(w.player.armor, armorCap({ armor: 2 }), 'a vest tops up to the raised cap (100 + 50 would be 150; the cap is 140)');
});

test('with zero upgrades the world is exactly the one that existed before progression (the same state hash), and the tiers are plain data the sim never changes', () => {
  const a = createWorld(loadMap(), { seed: 1 }), b = world({ ammo: 0, armor: 0 });
  assert.equal(JSON.stringify(a.upgrades), JSON.stringify({ ammo: 0, armor: 0 })); assert.equal(hashWorld(a), hashWorld(b));
  const w = world({ ammo: 2, armor: 1 }); for (let i = 0; i < 120; i++) step(w, idle()); assert.deepEqual(w.upgrades, { ammo: 2, armor: 1 });
});

test('upgrades travel: carry-over to the next level, Retry (level start) and a mid-level save all keep them; the save also carries the salvage and the records', () => {
  const w = world({ ammo: 2, armor: 1 });
  assert.deepEqual(carryOver(w).upgrades, { ammo: 2, armor: 1 }); assert.deepEqual(restartWorld(w).upgrades, { ammo: 2, armor: 1 });
  assert.deepEqual(createWorld(loadMap(), { seed: 2, carry: carryOver(w) }).upgrades, { ammo: 2, armor: 1 });
  const progress = { salvage: 7, upgrades: { ammo: 2, armor: 1 }, records: { C1E1M01: { rank: 'A', score: 0.8, time: 90, kills: 16, secrets: 0, paid: 2 } } };
  const parsed = parseSave(JSON.stringify(makeSave(w, 'mid-level', { progress })));
  assert.equal(parsed.ok, true); assert.deepEqual(parsed.save.progress, progress);
  const back = loadWorld(parsed.save, mapLoader); assert.equal(back.ok, true); assert.equal(hashWorld(back.world), hashWorld(w)); assert.deepEqual(back.world.upgrades, { ammo: 2, armor: 1 });
  assert.deepEqual(parseSave(JSON.stringify(makeSave(w, 'level-start'))).save.carry.upgrades, { ammo: 2, armor: 1 }, 'a level-start save restores the tiers through its carry');
});

test('save v8 -> v9: an old save loads with no progress, its world gains zero upgrades, and the shape check accepts it', () => {
  const w = createWorld(loadMap(), { seed: 1 }); for (let i = 0; i < 30; i++) step(w, idle());
  const old = JSON.parse(JSON.stringify(makeSave(w, 'mid-level'))); old.version = 8; delete old.progress; delete old.carry.upgrades; delete old.world.upgrades; delete old.world.levelStart.upgrades;
  const r = parseSave(JSON.stringify(old)); assert.equal(r.ok, true); assert.equal(r.migratedFrom, 8); assert.equal(r.save.version, SAVE_VERSION);
  assert.deepEqual(r.save.progress, newProgress()); assert.deepEqual(r.save.world.upgrades, { ammo: 0, armor: 0 }); assert.deepEqual(r.save.carry.upgrades, { ammo: 0, armor: 0 });
  const back = loadWorld(r.save, mapLoader); assert.equal(back.ok, true, back.detail);
  assert.deepEqual(back.world, w, 'the same world (the state hash is order-sensitive and a migration adds keys, so this compares the structure, not the hash)');
  assert.equal(parseSave(JSON.stringify({ magic: SAVE_MAGIC, version: SAVE_VERSION })).reason, 'corrupt');
});

import { shippedMap } from './helpers.js';
test('upgrades survive the arrival merge with a map\'s authored entry loadout (the real-game check found arrivalInventory dropping them); Retry and a level-start save keep them too', () => {
  const map = shippedMap('C1E2M01'); assert.ok(map.entryLoadout, 'the pilot has an authored entry loadout, which is what triggers the merge');
  const up = { ammo: 2, armor: 3 }, w = createWorld(map, { seed: 1, carry: { hp: 80, armor: 10, ammo: { flare: 5 }, weapons: ['flare'], upgrades: up } });
  assert.deepEqual(w.upgrades, up); assert.deepEqual(w.levelStart.upgrades, up); assert.deepEqual(restartWorld(w).upgrades, up);
  assert.equal(w.player.ammo.rivet, map.entryLoadout.ammo.rivet, 'and the floor at the entry loadout still applies');
  const back = loadWorld(parseSave(JSON.stringify(makeSave(w, 'level-start'))).save, (id) => (id === 'C1E2M01' ? map : null)); assert.equal(back.ok, true); assert.deepEqual(back.world.upgrades, up);
  assert.deepEqual(createWorld(map, { seed: 1, carry: { hp: 80, armor: 0, ammo: {}, weapons: ['flare'] } }).upgrades, { ammo: 0, armor: 0 }, 'no upgrades in the carry: none in the world');
});
