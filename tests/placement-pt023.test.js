// PT-023: the eight found weapons and the ammunition for the PT-022 guns are PLACED on the shipped maps (owner, 2026-10-08: "update all the maps"). What this holds:
// each weapon is where the plan says and ON the lane a route walks (so a player who follows the road finds it); each map from a gun's introduction on supplies its ammunition on the lane;
// the movable props the tuning-fork lifts stand OFF the traffic of every route (a movable prop blocks a creature the path-finder does not know about); the route bot, which uses none of these guns, still finishes.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { loadMapFile, loadRouteFile, runRoute } from '../src/engine/harness.js';
import { createWorld, spawnEnemy } from '../src/engine/world.js';
import { PICKUPS, WEAPONS, ENEMIES } from '../src/engine/defs.js';
import { shippedSrc, ROOT } from './helpers.js';

const CAMPAIGN = ['C1E1M01', 'C1E1M02', 'C1E1M03', 'C1E1M04', 'C1E1M05', 'C1E1M06', 'C1E1M07', 'C1E1M08', 'C1E2M01', 'C1E2M02', 'C1E2M03', 'C1E2M04', 'C1E2M05', 'C1E2M06', 'C1E2M07', 'C1E2M08'];
const SECRETS = ['C1E1S01', 'C1E2S01'];
/** where each found weapon is, and the route that walks over it */
const WHERE = { weapon_boathook: ['C1E1M03', 'main'], weapon_marlinspike: ['C1E1M04', 'main'], weapon_mallet: ['C1E1M05', 'main'], weapon_carbine: ['C1E1M06', 'main'], weapon_linethrower: ['C1E1M07', 'main'], weapon_chainsaw: ['C1E2M03', 'secret'], weapon_axe: ['C1E2M04', 'main'], weapon_fork: ['C1E2M05', 'main'] };
const play = (id, name = 'main', opts = {}) => runRoute(loadMapFile(`maps/${id}.json`), loadRouteFile(`routes/${id}.${name}.route.json`), { seed: 1, difficulty: 'normal', ...opts });
const kinds = (id) => shippedSrc(id).entities.filter((e) => e.type === 'pickup').map((e) => e.kind);

test('each found weapon is on the map the plan names, once, and the route that walks over it picks it up', () => {
  for (const [kind, [id, route]] of Object.entries(WHERE)) {
    assert.equal(kinds(id).filter((k) => k === kind).length, 1, `${kind} appears once on ${id}`);
    const r = play(id, route), weapon = PICKUPS[kind].weapon;
    assert.equal(r.result, 'complete', `${id} ${route} still completes`);
    assert.ok(r.world.player.weapons.includes(weapon), `${id}: the ${route} route ends carrying the ${weapon}`);
    assert.equal(r.world.pickups.filter((p) => p.kind === kind).length, 0, `${kind} was on the lane`);
  }
});

test('the chainsaw also hangs on the main road of Slurry Undercroft, for the player who missed the Rail Yard\'s locker', () => {
  assert.ok(kinds('C1E2M07').includes('weapon_chainsaw'), 'a mainline copy'); assert.equal(PICKUPS.weapon_chainsaw.ammo, undefined, 'a melee tool: no ammunition');
  const r = play('C1E2M07'); assert.ok(r.world.player.weapons.includes('chainsaw'), 'the main route finds it'); assert.equal(r.result, 'complete');
  const main = play('C1E2M03'); assert.ok(!main.world.player.weapons.includes('chainsaw'), 'the Rail Yard\'s main road does not: its copy is in the secret locker');
});

test('the guns arrive in a ladder: carbine at the Ferry Terminal, line-thrower at the Signal House; no map before holds their ammunition except the secret cache', () => {
  const idx = (id) => CAMPAIGN.indexOf(id);
  for (const id of CAMPAIGN) {
    const k = kinds(id), rounds = k.filter((x) => x === 'ammo_round').length, rockets = k.filter((x) => x === 'ammo_rocket').length;
    if (idx(id) < idx('C1E1M06')) assert.equal(rounds, 0, `${id}: no carbine rounds before the carbine`); else assert.ok(rounds >= 3, `${id}: ${rounds} round boxes`);
    if (idx(id) < idx('C1E1M07')) assert.equal(rockets, 0, `${id}: no rockets before the line-thrower`); else assert.ok(rockets >= 1, `${id}: ${rockets} rocket boxes`);
  }
  for (const id of SECRETS) { const k = kinds(id); assert.ok(k.includes('ammo_round') && k.includes('ammo_rocket'), `${id}'s cache holds some of each: it is carried to the maps that have the guns`); }
});

test('the ammunition is ON the lane: the route of each map picks up every round and rocket box (and the weapons), none is left lying', () => {
  for (const id of [...CAMPAIGN, ...SECRETS]) {
    const r = play(id), left = r.world.pickups.filter((p) => /^(ammo_round|ammo_rocket|weapon_(carbine|linethrower|fork|boathook|marlinspike|mallet|axe))$/.test(p.kind));
    assert.equal(left.length, 0, `${id}: ${left.map((p) => p.kind + '@' + Math.floor(p.x / 2) + ',' + Math.floor(p.z / 2)).join(' ')} left on the floor`);
  }
});

test('the route bot uses none of the new guns and still finishes every route of every map, with what it picked up in hand', () => {
  for (const id of [...CAMPAIGN, ...SECRETS]) {
    for (const rf of fs.readdirSync(path.join(ROOT, 'routes')).filter((f) => f.startsWith(id + '.') && f.endsWith('.route.json'))) {
      const r = runRoute(loadMapFile(`maps/${id}.json`), loadRouteFile(`routes/${rf}`), { seed: 2, difficulty: 'hard' });
      assert.equal(r.result, 'complete', `${rf} on hard: ${r.result}`);
    }
  }
});

test('the route bot uses the carbine as its LAST resort: out of everything else it switches to it and fires (the sim\'s flare feed no longer carries a bot that holds a carbine and rounds)', () => {
  const map = loadMapFile('maps/C1E1M06.json');
  const w = createWorld(map, { seed: 1, carry: { hp: 1e6, armor: 0, ammo: { flare: 0, shell: 0, rivet: 0, round: 60 }, weapons: ['flare', 'scattergun', 'rivet', 'carbine'] } });
  w.enemies.length = 0; Object.assign(w.player, { x: 24.9, z: 47, yaw: -Math.PI / 2, pitch: 0, ammo: { flare: 0, shell: 0, rivet: 0, round: 60 } });          // (the carry is floored at the map's entry loadout, so the ammunition is set after the world is made)
  const e = spawnEnemy(w, 'tollbearer', w.player.x + 9, w.player.z, Math.PI / 2); e.state = 'chase';
  const r = runRoute(map, [{ op: 'kill' }], { world: w, seed: 1, difficulty: 'normal', maxTicks: 60 * 20 });
  assert.equal(e.state, 'dead', 'the Tollbearer is dead'); assert.ok(r.events.some((x) => x.type === 'fire' && x.weapon === 'carbine'), 'with the carbine');
  assert.ok(w.player.ammo.round < 60 && w.player.ammo.round > 0, 'a few rounds, not all of them: ' + w.player.ammo.round);
  // and it does NOT use it while a gun it fights with still has ammunition
  const w2 = createWorld(map, { seed: 1, carry: { hp: 1e6, armor: 0, ammo: { flare: 8, shell: 0, rivet: 0, round: 60 }, weapons: ['flare', 'scattergun', 'rivet', 'carbine'] } });
  w2.enemies.length = 0; Object.assign(w2.player, { x: 24.9, z: 47, yaw: -Math.PI / 2, pitch: 0, weapon: 'carbine', switchT: 0, ammo: { flare: 8, shell: 0, rivet: 0, round: 60 } });
  const e2 = spawnEnemy(w2, 'tollbearer', w2.player.x + 9, w2.player.z, Math.PI / 2); e2.state = 'chase';
  const r2 = runRoute(map, [{ op: 'kill' }], { world: w2, seed: 1, difficulty: 'normal', maxTicks: 60 * 20 });
  assert.ok(!r2.events.some((x) => x.type === 'fire' && x.weapon === 'carbine'), 'flares left: the carbine stays in the pocket'); assert.equal(w2.player.ammo.round, 60);
});

test('every movable prop stands off the traffic of every route (no player or creature stood within a cell of it) and off the doors', () => {
  let n = 0;
  for (const id of [...CAMPAIGN, ...SECRETS]) {
    const lane = path.join(ROOT, 'maps-src/lanes', id + '.json'), traffic = new Set(JSON.parse(fs.readFileSync(lane, 'utf8')));
    const src = shippedSrc(id);
    for (const e of src.entities.filter((x) => x.type === 'prop' && x.movable)) {
      n++; const [x, z] = e.at;
      for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) assert.ok(!traffic.has((x + dx) + ',' + (z + dz)), `${id}: the ${e.kind} at ${x},${z} is beside traffic at ${x + dx},${z + dz}`);
    }
  }
  assert.ok(n >= 20, `${n} movable props in the campaign (for the fork)`);
});

test('the fork\'s maps have things to lift: Episode 2 from the Cradle Annex on holds at least five movable props each', () => {
  for (const id of ['C1E2M05', 'C1E2M06', 'C1E2M07', 'C1E2M08']) assert.ok(shippedSrc(id).entities.filter((e) => e.type === 'prop' && e.movable).length >= 5, id);
  for (const id of ['C1E1M01', 'C1E1M02', 'C1E1M03', 'C1E1M04', 'C1E1M05', 'C1E1M06', 'C1E1M07', 'C1E1M08', 'C1E2M01', 'C1E2M02', 'C1E2M03', 'C1E2M04']) assert.equal(shippedSrc(id).entities.filter((e) => e.movable).length, 0, `${id}: no movable props before the fork`);
});

test('every weapon placed has its note: short, unique, delivered by a route', () => {
  for (const [kind, [id, route]] of Object.entries(WHERE)) {
    const m = shippedSrc(id).messages.find((x) => x.id === 'found-' + kind.slice(7)); assert.ok(m, `${id} has a note for ${kind}`);
    assert.ok(m.text.length > 20 && m.text.length <= 180 && m.speaker, `${id}: ${m.id}`); const r = play(id, route); assert.ok(r.world.messagesSeen.includes(m.id), `${id}: the ${route} route delivers ${m.id}`);
  }
  assert.ok(shippedSrc('C1E2M07').messages.some((x) => x.id === 'found-chainsaw'), 'and the mainline copy has its own');
});

test('the carried stock is capped like any ammunition: a secret cache\'s rounds and rockets wait in the inventory for the gun', () => {
  const r = play('C1E1S01'); assert.ok((r.world.player.ammo.round ?? 0) > 0 && (r.world.player.ammo.rocket ?? 0) > 0, 'the cache gave rounds and rockets');
  assert.ok(!r.world.player.weapons.includes('carbine'), 'without the carbine, so they are only stock');
  assert.ok(WEAPONS.carbine.ammo === 'round' && WEAPONS.linethrower.ammo === 'rocket' && ENEMIES.tollbearer.hp > 0);
});
