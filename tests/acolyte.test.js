// PT-029: the Cantor Acolyte (Episode 3, Batch D): ENEMIES.acolyte in src/engine/defs.js, `wardOf` / `acolyteStep` in src/engine/world.js. It WARDS (everything within 9 m takes half while it is awake and not staggered), keeps its distance and sings a small tone pulse.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createWorld, step, spawnEnemy, drainEvents, damageEnemy } from '../src/engine/world.js';
import { ENEMIES } from '../src/engine/defs.js';
import { shippedMap } from './helpers.js';

const idle = (o = {}) => ({ move: [0, 0], yaw: 0, pitch: 0, fire: false, aim: false, sprint: false, use: false, weapon: null, weaponStep: 0, ...o });
const A = ENEMIES.acolyte;
/** the Landing Scar's basin again: the player at (21, 22.5) cells facing east on a clear floor; enemies are added by the tests */
function field({ hp = 1e6, seed = 1, difficulty = 'normal' } = {}) {
  const map = shippedMap('C1E3M01'), w = createWorld(map, { seed, difficulty, carry: { hp, armor: 0, ammo: {}, weapons: ['flare', 'scattergun', 'rivet'] } });
  w.enemies.length = 0; w.pickups.length = 0; Object.assign(w.player, { x: 21 * map.cell, z: 22.5 * map.cell, yaw: -Math.PI / 2, pitch: 0, y: 0 }); w.player.hp = hp;
  return { w, map };
}
const at = (w, kind, dx, dz = 0, state = 'chase') => { const e = spawnEnemy(w, kind, w.player.x + dx, w.player.z + dz, Math.PI / 2); e.state = state; e.lastX = w.player.x; e.lastZ = w.player.z; return e; };
const run = (w, ticks, cmd = idle()) => { const ev = []; for (let i = 0; i < ticks; i++) { step(w, cmd); ev.push(...drainEvents(w)); } return ev; };

test('the ward: an awake Acolyte halves what a creature within 9 m takes; beyond it, asleep, staggered, or standing as a Range sponge, it does nothing; it does not ward itself, a node or a boss', () => {
  assert.ok(A.ward.r >= 8 && A.ward.reduce <= 0.6 && A.poise >= 3, 'a ward that matters, on an elite');
  const dmg = (setup) => { const { w } = field(); const target = at(w, 'tollbearer', 14, 3, 'chase'); setup?.(w, target); const before = target.hp; damageEnemy(w, target, 20); return before - target.hp; };
  assert.equal(dmg(), 20, 'no Acolyte: full damage');
  assert.equal(dmg((w, t) => { at(w, 'acolyte', 14, -3); }), 20 * A.ward.reduce, 'an awake Acolyte six metres away: halved');
  assert.equal(dmg((w, t) => { at(w, 'acolyte', 14, -10); }), 20, 'ten metres away: not covered');
  assert.equal(dmg((w, t) => { at(w, 'acolyte', 14, -3, 'idle'); }), 20, 'asleep: it wards nobody');
  assert.equal(dmg((w, t) => { const a = at(w, 'acolyte', 14, -3); a.stunT = 1; }), 20, 'staggered: the ward is down');
  assert.equal(dmg((w, t) => { const a = at(w, 'acolyte', 14, -3); a.hold = 'inert'; }), 20, 'a Range sponge does not ward');
  assert.equal(dmg((w, t) => { at(w, 'acolyte', 14, -3); damageEnemy(w, w.enemies.find((e) => e.kind === 'acolyte'), 1e6); }), 20, 'a dead one wards nobody');
  const { w } = field(); const a1 = at(w, 'acolyte', 14, 0), a2 = at(w, 'acolyte', 14, 3), b0 = a1.hp; damageEnemy(w, a1, 20); assert.equal(b0 - a1.hp, 20, 'an Acolyte is not warded by another');
  const n = spawnEnemy(w, 'bellnode', w.player.x + 14, w.player.z + 6, 0); const nb = n.hp; damageEnemy(w, n, 20); assert.equal(nb - n.hp, 20, 'a node is not warded'); void a2;
});

test('the ward is a rule of damage, not of a weapon: a blast and a melee blow are halved too, and the Acolyte announces it (ward_hit)', () => {
  const { w } = field(); at(w, 'acolyte', 14, -3); const t = at(w, 'tollbearer', 14, 3), b = t.hp; w.events.length = 0; damageEnemy(w, t, 40, { splash: true }); assert.equal(b - t.hp, 40 * A.ward.reduce);
  assert.ok(drainEvents(w).some((e) => e.type === 'ward_hit' && e.id === t.id), 'it says so');
  const t2 = at(w, 'tollbearer', 14, 4), b2 = t2.hp; damageEnemy(w, t2, 30, { melee: true }); assert.equal(b2 - t2.hp, 15);
});

test('the Acolyte keeps its distance (it backs away inside keepAway), and after its windup it sings a pulse ring that hurts a player standing in the open', () => {
  const { w } = field(); const a = at(w, 'acolyte', 4, 0); const d0 = Math.hypot(a.x - w.player.x, a.z - w.player.z); run(w, 120); const d1 = Math.hypot(a.x - w.player.x, a.z - w.player.z); assert.ok(d1 > d0 + 1.5, `it backed off: ${d0.toFixed(1)} -> ${d1.toFixed(1)} m`);
  const f = field(); const b = at(f.w, 'acolyte', 9, 0); b.pulseCd = 0; const ev = []; let windup = null, ring = null, hurt = f.w.stats.damageTaken;
  for (let i = 0; i < 60 * 6; i++) { step(f.w, idle()); for (const e of drainEvents(f.w)) { ev.push(e); if (e.type === 'enemy_windup' && e.kind === 'acolyte') windup = windup ?? i; if (e.type === 'pulse') ring = ring ?? i; } }
  assert.ok(windup !== null && ring !== null && (ring - windup) / 60 >= A.pulse.windup - 0.05, `a windup of ${((ring - windup) / 60).toFixed(2)} s before the ring`); assert.ok(f.w.stats.damageTaken - hurt >= Math.round(A.pulse.damage * 0.9) || ev.some((e) => e.type === 'pulse_hit'), 'the ring reached the player standing still in the open');
});

test('it is deterministic and a world without one carries nothing new', () => {
  const run1 = () => { const { w } = field({ seed: 4 }); at(w, 'acolyte', 12, 0); at(w, 'tollbearer', 14, 2); run(w, 60 * 8); return JSON.stringify(w.enemies.map((e) => [e.kind, Math.round(e.x * 100), Math.round(e.z * 100), Math.round(e.hp)])); };
  assert.equal(run1(), run1());
  const { w } = field(); at(w, 'tollbearer', 10, 0); run(w, 120); assert.equal(w.tears, undefined); assert.equal(w.patches, undefined);
});
