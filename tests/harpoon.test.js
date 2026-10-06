// The Harpoon rifle (weapon 4): one heavy instant bolt, long reach, it goes through plate and through a second body, slow and scarce, only accurate in the sights.
// Runs on the shipped Evaporation Pans (a 90 m lane: the rifle's whole point is distance) with the sim only; what it looks like is tools/dev/shoot-harpoon.mjs.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createWorld, step, drainEvents, spawnEnemy } from '../src/engine/world.js';
import { WEAPONS, WEAPON_ORDER, ENEMIES, PICKUPS, AMMO_MAX, NOISE, TICK } from '../src/engine/defs.js';
import { ammoCap } from '../src/engine/progress.js';
import { shippedMap } from './helpers.js';

const idle = (o = {}) => ({ move: [0, 0], yaw: 0, pitch: 0, fire: false, aim: false, sprint: false, use: false, weapon: null, weaponStep: 0, ...o });
const H = WEAPONS.harpoon;
/** the west road of the Pans: z = 51, open from x = 24 to the pump station's west door at x = 70; the player stands at x = 24 facing east with the rifle raised */
function lane(seed = 1, { upgrades } = {}) {
  const w = createWorld(shippedMap('C1E2M02'), { seed, carry: { hp: 100000, armor: 0, ammo: { flare: 8, bolt: 12 }, weapons: ['flare', 'harpoon'], upgrades } });
  w.enemies.length = 0; Object.assign(w.player, { x: 24, z: 51, yaw: -Math.PI / 2, pitch: 0, weapon: 'harpoon', switchT: 0 });
  return w;
}
const at = (w, kind, dx, { hp = 1000, state = 'idle', yaw = Math.PI / 2 } = {}) => { const e = spawnEnemy(w, kind, w.player.x + dx, 51, yaw); e.hp = hp; e.state = state; return e; };
const raise = (w, ticks = 20) => { for (let i = 0; i < ticks; i++) step(w, idle({ aim: true })); };
const body = (w, e) => { const p = w.player; p.pitch = Math.atan2(0.8 - 1.6, Math.hypot(e.x - p.x, e.z - p.z)); };     // aim at the body, not the eye line: a Gaunt is 1.5 m tall
const shoot = (w, aim = true) => { step(w, idle({ aim, fire: true })); return drainEvents(w); };

test('the harpoon is the fourth weapon, with its own ammunition and pickups', () => {
  assert.equal(WEAPON_ORDER[3], 'harpoon');
  assert.equal(H.kind, 'hitscan'); assert.equal(H.ammo, 'bolt'); assert.ok(AMMO_MAX.bolt > 0 && AMMO_MAX.bolt <= 30, 'few rounds: it is a scarce gun');
  assert.deepEqual([PICKUPS.weapon_harpoon.weapon, PICKUPS.weapon_harpoon.ammo, PICKUPS.ammo_bolt.ammo], ['harpoon', 'bolt', 'bolt']);
  assert.ok(H.cooldown >= 1.0, 'slow: a bolt every ' + H.cooldown + ' s'); assert.ok(NOISE.harpoon >= NOISE.scattergun, 'and loud');
});

test('one bolt at 40 m kills what the scattergun cannot reach, and the sights make it exact', () => {
  for (const kind of ['tollbearer', 'bellhand', 'gaunt', 'sexton']) {
    const w = lane(), e = at(w, kind, 40, { hp: ENEMIES[kind].hp }); body(w, e); raise(w); shoot(w);
    assert.equal(e.state, 'dead', `${kind} at 40 m`);
  }
  const hit = (aim) => { let n = 0; for (let s = 1; s <= 30; s++) { const w = lane(s), e = at(w, 'tollbearer', 40); if (aim) raise(w); shoot(w, aim); if (e.hp < 1000) n++; } return n; };
  const ads = hit(true), hip = hit(false);
  assert.equal(ads, 30, 'aimed: every bolt lands at 40 m'); assert.ok(hip < ads * 0.4, `from the hip it scatters: ${hip}/30 land at 40 m`);
});

test('the bolt goes through a body into the one behind it (60% damage) and no further', () => {
  const w = lane(), a = at(w, 'tollbearer', 10), b = at(w, 'tollbearer', 14), c = at(w, 'tollbearer', 18); raise(w); const ev = shoot(w);
  assert.equal(1000 - a.hp, H.damage); assert.ok(Math.abs(1000 - b.hp - H.damage * H.pierceDamage) < 1e-6, 'the second takes the reduced damage'); assert.equal(c.hp, 1000, 'the third is untouched');
  assert.equal(ev.filter((e) => e.type === 'enemy_hit').length, 2); assert.equal(ev.filter((e) => e.type === 'fire').length, 1);
});

test('plate: the bolt ignores the Warden-Graft\'s front armour (the rivet driver does not)', () => {
  const frontOn = (weapon) => { const w = lane(); w.player.weapons = ['flare', 'rivet', 'harpoon']; w.player.weapon = weapon; w.player.ammo.rivet = 50; const e = at(w, 'wardengraft', 12, { yaw: -Math.PI / 2 }); raise(w); shoot(w); return 1000 - e.hp; };
  assert.equal(frontOn('harpoon'), H.damage, 'the full bolt through the plate');
  assert.ok(frontOn('rivet') < WEAPONS.rivet.damage * 0.5, 'a rivet on the plate: ' + frontOn('rivet'));
});

test('walls stop the bolt and it says so (the view draws the streak and leaves the bolt standing)', () => {
  const w = lane(); at(w, 'tollbearer', 60); raise(w); w.player.x = 64; w.player.yaw = -Math.PI / 2;            // the station\'s west door (closed) is 6 m ahead, the target is behind it
  const e = w.enemies[0]; e.x = 80; raise(w); const ev = shoot(w);
  assert.equal(e.hp, 1000, 'a closed door stops it'); const bolt = ev.find((x) => x.type === 'bolt');
  assert.ok(bolt && bolt.stuck === true && bolt.x1 > bolt.x0, 'a bolt event with the stop point'); assert.ok(ev.some((x) => x.type === 'impact'));
  const w2 = lane(); at(w2, 'tollbearer', 30); raise(w2); const open = shoot(w2).find((x) => x.type === 'bolt'); assert.ok(open && Number.isFinite(open.x1 + open.y1 + open.z1));
});

test('slow, one bolt per shot, dry-fire clicks, and the cooldown is respected', () => {
  const w = lane(); raise(w); w.player.ammo.bolt = 2; let ev = shoot(w); assert.equal(w.player.ammo.bolt, 1); assert.ok(ev.some((e) => e.type === 'fire' && e.weapon === 'harpoon'));
  for (let i = 0; i < Math.floor(H.cooldown / TICK) - 3; i++) step(w, idle({ aim: true, fire: true })); assert.equal(w.player.ammo.bolt, 1, 'no second bolt inside the cooldown');
  for (let i = 0; i < 10; i++) step(w, idle({ aim: true, fire: true })); assert.equal(w.player.ammo.bolt, 0, 'the second bolt after it'); drainEvents(w);
  for (let i = 0; i < 100; i++) step(w, idle({ aim: true, fire: true })); assert.ok(drainEvents(w).some((e) => e.type === 'dry'), 'an empty rifle clicks');
});

test('pickups: the rifle (switches to it, 6 bolts), bolt boxes, the cap, and the Locker\'s ammunition satchel raises that cap', () => {
  const w = lane(); w.player.weapons = ['flare']; w.player.weapon = 'flare'; w.player.ammo.bolt = 0; w.pickups.push({ id: 9001, kind: 'weapon_harpoon', x: w.player.x, z: w.player.z }); step(w, idle());
  assert.deepEqual([w.player.weapon, w.player.weapons.includes('harpoon'), w.player.ammo.bolt], ['harpoon', true, Math.round(PICKUPS.weapon_harpoon.amount * 1)], 'normal difficulty: the pickup amount');
  w.player.ammo.bolt = AMMO_MAX.bolt - 1; w.pickups.push({ id: 9002, kind: 'ammo_bolt', x: w.player.x, z: w.player.z }); step(w, idle()); assert.equal(w.player.ammo.bolt, AMMO_MAX.bolt, 'capped');
  const up = lane(1, { upgrades: { ammo: 2 } }); up.player.ammo.bolt = AMMO_MAX.bolt; up.pickups.push({ id: 9003, kind: 'ammo_bolt', x: up.player.x, z: up.player.z }); step(up, idle());
  assert.equal(up.player.ammo.bolt, Math.min(ammoCap('bolt', { ammo: 2 }), AMMO_MAX.bolt + PICKUPS.ammo_bolt.amount)); assert.ok(up.player.ammo.bolt > AMMO_MAX.bolt, 'two satchel tiers carry more bolts than the base cap');
});

test('the same seed and inputs give the same shot (deterministic) and the sim is not touched by the view-only bolt event', () => {
  const run = () => { const w = lane(7); const e = at(w, 'tollbearer', 25); raise(w); shoot(w, false); return [e.hp, w.player.ammo.bolt, w.rng ?? w.seed]; };
  assert.deepEqual(run(), run());
});
