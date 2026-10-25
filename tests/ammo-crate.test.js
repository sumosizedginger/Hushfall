// FREEZE F8, the heavy ammunition crate (src/engine/crate.js, PICKUPS.ammo_crate): every gun you carry to 60% of what it can hold, nothing taken away, only taken when it would add something, scaled by the difficulty's pickup factor like an ordinary box.
import test from 'node:test';
import assert from 'node:assert/strict';
import { PICKUPS, WEAPONS, AMMO_MAX } from '../src/engine/defs.js';
import { carriedAmmoTypes, crateGains, takeCrate } from '../src/engine/crate.js';
import { createWorld, step, drainEvents } from '../src/engine/world.js';
import { ammoCap } from '../src/engine/progress.js';
import { pickupToast, pickupTier, pickupCard, PICKUP_NAMES } from '../src/game/toasts.js';
import { pickupUse } from '../src/game/itemhelp.js';
import { loadMap } from './helpers.js';

const DEF = PICKUPS.ammo_crate, cap = (t) => AMMO_MAX[t];
const body = (weapons, ammo) => ({ weapons, ammo: { ...ammo } });
const idle = { move: [0, 0], yaw: 0, pitch: 0, fire: false, aim: false, sprint: false, use: false, weapon: null, weaponStep: 0 };

test('the crate is a pickup of its own type with a fill of 60%', () => {
  assert.deepEqual(DEF, { type: 'crate', fill: 0.6 }); assert.equal(PICKUP_NAMES.ammo_crate, 'Heavy ammunition crate');
});

test('it counts the ammunition of the guns carried, once each: melee, the fork and the chainsaw have none, the line-thrower and the mortar share rockets', () => {
  assert.deepEqual(carriedAmmoTypes(body(['fists', 'boathook', 'fork', 'chainsaw'], {})), []);
  assert.deepEqual(carriedAmmoTypes(body(['flare', 'scattergun', 'rivet'], {})), ['flare', 'shell', 'rivet']);
  assert.deepEqual(carriedAmmoTypes(body(['linethrower', 'mortar'], {})), ['rocket']);
  for (const id of ['flare', 'scattergun', 'rivet', 'harpoon', 'arc', 'carbine', 'linethrower', 'mortar']) assert.ok(WEAPONS[id].ammo, id + ' has an ammunition type');
});

test('it raises each carried type to 60% of its cap and never takes anything away', () => {
  const p = body(['flare', 'scattergun', 'rivet'], { flare: 0, shell: cap('shell'), rivet: 10, bolt: 0 });
  const g = crateGains(p, DEF, cap); assert.equal(g.flare, Math.round(cap('flare') * 0.6)); assert.equal(g.rivet, Math.round(cap('rivet') * 0.6) - 10);
  assert.equal(g.shell, undefined, 'a gun past the mark gains nothing'); assert.equal(g.bolt, undefined, 'a type for a gun not carried is left alone');
  const w = { stats: {} }; assert.equal(takeCrate(w, p, DEF, cap), true); assert.equal(p.ammo.shell, cap('shell')); assert.equal(p.ammo.flare, Math.round(cap('flare') * 0.6)); assert.equal(p.ammo.bolt, 0);
  assert.equal(w.stats.gained.flare, Math.round(cap('flare') * 0.6), 'the stats note what it gave');
});

test('it is not taken when every carried gun is already at or past the mark (it stays where it lies)', () => {
  const p = body(['flare', 'scattergun', 'rivet'], { flare: cap('flare'), shell: Math.round(cap('shell') * 0.6), rivet: cap('rivet') });
  assert.deepEqual(crateGains(p, DEF, cap), {}); const w = { stats: {} }; assert.equal(takeCrate(w, p, DEF, cap), false); assert.equal(w.stats.gained, undefined, 'no stats when nothing was added');
  assert.equal(takeCrate({ stats: {} }, body(['fists', 'axe'], {}), DEF, cap), false, 'a body with no gun has nothing to fill');
});

test('the difficulty\'s pickup factor scales the mark as it does an ordinary box, and the cap still binds', () => {
  const p = body(['rivet'], { rivet: 0 }); assert.equal(crateGains(p, DEF, cap, 0.8).rivet, Math.round(cap('rivet') * 0.6 * 0.8)); assert.equal(crateGains(p, DEF, cap, 1.5).rivet, Math.round(cap('rivet') * 0.9));
  assert.equal(crateGains(p, DEF, cap, 10).rivet, cap('rivet'), 'never past the cap');
});

test('in a world: walking over a crate fills the guns, emits one pickup event and counts as an item; a second crate is left when the guns are full enough', () => {
  const w = createWorld(loadMap('C1E1M01'), { seed: 1, difficulty: 'normal' }), p = w.player; p.hp = 1e6; p.weapons = ['flare', 'scattergun', 'rivet']; p.ammo = { flare: 0, shell: 0, rivet: 0 };
  const put = (dx) => w.pickups.push({ id: w.nextId++, kind: 'ammo_crate', x: p.x + dx, z: p.z, y: p.y });
  put(0); const items0 = w.stats.items; step(w, idle); const ev = drainEvents(w);
  assert.ok(ev.some((e) => e.type === 'pickup' && e.kind === 'ammo_crate'), 'the pickup event names the crate'); assert.equal(w.stats.items, items0 + 1);
  for (const t of ['flare', 'shell', 'rivet']) assert.equal(p.ammo[t], Math.min(ammoCap(t, w.upgrades), Math.round(ammoCap(t, w.upgrades) * 0.6)), t + ' to 60%');
  assert.equal(p.ammo.bolt ?? 0, 0, 'no bolts: no harpoon'); put(0); const n = w.pickups.length; step(w, idle); assert.equal(w.pickups.length, n, 'the second crate stays: nothing to add');
});

test('the toast, the tier, the item line and the model: a medium pickup that says what it does; no card', () => {
  assert.equal(pickupToast('ammo_crate'), 'Heavy ammunition crate (every gun to 60%)'); assert.equal(pickupTier('ammo_crate'), 'medium'); assert.equal(pickupCard('ammo_crate'), null);
  assert.match(pickupUse('ammo_crate'), /every gun you carry up to 60 per cent/); assert.match(pickupUse('ammo_crate'), /takes nothing from a gun that has more/);
});
