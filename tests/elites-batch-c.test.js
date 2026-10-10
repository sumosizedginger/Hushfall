// PT-028: Episode 3 Batch C's two elites. ENEMIES.bulwark (the shield-bearer: a closed carapace that opens to strike) and ENEMIES.weeping (the brood-mother: broods and tears that pool), defs.js + world.js.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createWorld, step, spawnEnemy, drainEvents, damageEnemy, hashWorld } from '../src/engine/world.js';
import { ENEMIES, FX, PLAYER } from '../src/engine/defs.js';
import { shippedMap } from './helpers.js';

const idle = (o = {}) => ({ move: [0, 0], yaw: 0, pitch: 0, fire: false, aim: false, sprint: false, use: false, weapon: null, weaponStep: 0, ...o });
const B = ENEMIES.bulwark, M = ENEMIES.weeping;
/** the Landing Scar's basin: the player at (21, 22.5) cells facing east, a creature `dx` metres east of them on the same floor, facing the player */
function duel(kind, { dx = 6, hp = 1e6, seed = 1, difficulty = 'normal', face = -Math.PI / 2, awake = true } = {}) {
  const map = shippedMap('C1E3M01'), w = createWorld(map, { seed, difficulty, carry: { hp, armor: 0, ammo: {}, weapons: ['flare', 'scattergun', 'rivet'] } });
  w.enemies.length = 0; w.pickups.length = 0;
  Object.assign(w.player, { x: 21 * map.cell, z: 22.5 * map.cell, yaw: -Math.PI / 2, pitch: 0, y: 0, ammo: { flare: 8, shell: 12, rivet: 60 } }); w.player.hp = hp;
  const e = spawnEnemy(w, kind, w.player.x + dx, w.player.z, face); if (awake) { e.state = 'chase'; e.lastX = w.player.x; e.lastZ = w.player.z; }
  return { w, e, map };
}
const run = (w, ticks, cmd = idle()) => { const ev = []; for (let i = 0; i < ticks; i++) { step(w, cmd); ev.push(...drainEvents(w)); } return ev; };

test('Bulwark Shell: a closed carapace takes a few percent of a direct hit from the front, full damage from behind, from a blast, from a harpoon bolt, and a stunned one takes more', () => {
  assert.ok(B.armor.front <= 0.1 && B.armor.opens && B.poise >= 3 && B.turnRate <= 2, 'closed, opens, an elite, slow to turn');
  const hit = (mutate, opts) => { const { w, e } = duel('bulwark'); mutate?.(w, e); const before = e.hp; damageEnemy(w, e, 20, opts); return before - e.hp; };
  assert.ok(Math.abs(hit() - 20 * B.armor.front) < 1e-6, 'from the front: 7%');
  assert.equal(hit((w, e) => { e.yaw = Math.PI / 2; }), 20, 'from behind: the whole of it');
  assert.ok(Math.abs(hit((w, e) => { e.yaw = -Math.PI / 2 + 1.3; }) - 20 * B.armor.front) < 1e-6, 'a player 74 degrees off its heading is still in front of the plate'); assert.equal(hit((w, e) => { e.yaw = -Math.PI / 2 + 1.7; }), 20, 'and one 97 degrees off is behind it');
  assert.equal(hit(null, { splash: true }), 20, 'a blast ignores it'); assert.equal(hit(null, { pierceArmor: true }), 20, 'a harpoon bolt ignores it');
  assert.ok(Math.abs(hit((w, e) => { e.stunT = 1; }) - 20 * B.armor.stunMult) < 1e-6, 'staggered it takes ' + B.armor.stunMult + 'x');
  assert.equal(hit((w, e) => { e.attackT = 0.2; }), 20, 'and it is OPEN while it bashes');
});

test('Bulwark Shell: it walks at you, bashes (a heavy blow that shoves you back) and its carapace is open for exactly the bash', () => {
  const { w, e } = duel('bulwark', { dx: 5 }); const x0 = w.player.x; let opened = null, closedAfter = null, struck = null, hp0 = w.player.hp;
  for (let i = 0; i < 60 * 8 && !struck; i++) {
    step(w, idle()); for (const ev of drainEvents(w)) if (ev.type === 'enemy_strike' && ev.kind === 'bulwark') struck = ev;
    if (e.attackT >= 0 && opened === null) opened = i; if (opened !== null && e.attackT < 0 && closedAfter === null) closedAfter = i;
  }
  assert.ok(struck, 'it bashed within 8 s'); assert.ok(opened !== null, 'the carapace opened (attackT >= 0) before the blow');
  assert.ok(hp0 - w.player.hp >= Math.round(B.attack.damage * 0.9), `the bash hurts: ${hp0 - w.player.hp}`); assert.ok(x0 - w.player.x >= B.attack.knock * 0.6 || w.player.x < x0 - 0.5 || Math.abs(w.player.x - x0) > 0.5, `and shoves the player: x ${x0.toFixed(2)} -> ${w.player.x.toFixed(2)}`);
  run(w, 60 * 3); assert.ok(e.attackT < 0 || e.state !== 'dead', 'it goes on');
});

test('Bulwark Shell: a player who circles it is behind it before it has turned (it turns at ' + B.turnRate + ' rad/s)', () => {
  const { w, e } = duel('bulwark', { dx: 3.2 }); let behind = null, th = 0; const omega = PLAYER.speed / 3.2;                // the player runs round it at 3.2 m, the speed of a strafe
  for (let i = 0; i < 60 * 6 && behind === null; i++) {
    th += omega / 60; w.player.x = e.x + Math.cos(th) * 3.2; w.player.z = e.z + Math.sin(th) * 3.2; step(w, idle()); drainEvents(w);
    const tx = w.player.x - e.x, tz = w.player.z - e.z, tl = Math.hypot(tx, tz) || 1; if ((Math.sin(e.yaw) * tx + Math.cos(e.yaw) * tz) / tl < -0.2) behind = i;
  }
  assert.ok(behind !== null && behind < 60 * 3, 'the runner is behind the shell within 3 s: ' + behind);
});

test('Weeping Mother: she plants herself at her stand-off distance, weeps a tear after a visible windup, and the tear lands where the player stood, leaving a pool that slows and burns', () => {
  assert.ok(M.brood && M.tears && M.stand > M.attack.range && M.tears.windup >= 0.6 && M.tears.minFlight >= 0.8, 'broods, weeps, a readable windup and a long arc');
  const { w, e } = duel('weeping', { dx: 14 }); const ev = []; let landed = null, windup = null, lob = null;
  for (let i = 0; i < 60 * 10 && !landed; i++) { step(w, idle()); for (const x of drainEvents(w)) { ev.push(x); if (x.type === 'tear_windup') windup = windup ?? i; if (x.type === 'tear_lob') lob = lob ?? i; if (x.type === 'tear_land') landed = x; } }
  assert.ok(windup !== null && lob !== null && landed, 'windup, lob, land'); assert.ok((lob - windup) / 60 >= M.tears.windup - 0.05, `the tell lasts ${((lob - windup) / 60).toFixed(2)} s`);
  assert.ok(Math.hypot(landed.x - w.player.x, landed.z - w.player.z) < 0.25, `the tear lands on the player's place: ${Math.hypot(landed.x - w.player.x, landed.z - w.player.z).toFixed(2)} m off`);
  assert.equal(w.patches.length, 1); const hp0 = w.player.hp; const speed0 = w.player.vz; run(w, 60 * 2); assert.ok(hp0 - w.player.hp >= 4, `the pool burns the player standing in it: ${hp0 - w.player.hp}`);
  assert.equal(FX.p.speed < 0.8 && FX.p.dps > 0, true);
});

test('a tear pool slows the player by its factor, ends after its life, and is a player-only hazard (the creatures walk through)', () => {
  const { w, e } = duel('weeping', { dx: 14, awake: false }); w.patches = [{ id: 99, x: w.player.x, z: w.player.z, r: 1.8, life: 2, t0: 0 }]; w.tears = [];
  const run1 = () => { const x0 = w.player.x, z0 = w.player.z; run(w, 15, idle({ move: [0, 1], yaw: 0 })); return Math.hypot(w.player.x - x0, w.player.z - z0); };
  const inPool = run1(); w.patches = []; w.player.x = 21 * 2; w.player.z = 22.5 * 2; w.player.vx = w.player.vz = 0; const free = run1();
  assert.ok(inPool < free * 0.8 && inPool > free * 0.4, 'the pool slows a runner: ' + inPool.toFixed(2) + ' m in a quarter second against ' + free.toFixed(2) + ' m on dry floor');
  w.patches = [{ id: 100, x: w.player.x, z: w.player.z, r: 1.8, life: 0.5, t0: 0 }]; w.tears = []; const ev = run(w, 60); assert.equal(w.patches.length, 0, 'dry after its life'); assert.ok(ev.some((x) => x.type === 'pool_dry'));
});

test('Weeping Mother: she broods: a sac swells, then creatures of her brood drop beside her (summoned: no drops), never more than max alive, and a stun breaks the swell', () => {
  const Bd = M.brood; const { w, e } = duel('weeping', { dx: 12 }); const ev = run(w, 60 * 12);
  const swell = ev.find((x) => x.type === 'brood_swell'), born = ev.filter((x) => x.type === 'enemy_spawn' && x.brood), birth = ev.find((x) => x.type === 'brood_birth');
  assert.ok(swell && birth && born.length >= 1, 'a swell and a birth'); assert.ok((birth.tick - swell.tick) / 60 >= Bd.swell - 0.05, 'the swell lasts ' + ((birth.tick - swell.tick) / 60).toFixed(2) + ' s');
  const kids = w.enemies.filter((o) => o.summoned && o.kind === Bd.kind); assert.ok(kids.length >= 1 && kids.length <= Bd.max, `brood alive: ${kids.length}`);
  assert.ok(born.every((b) => Math.hypot(b.x - e.x, b.z - e.z) < 3.4), 'they drop beside her');
  const r = duel('weeping', { dx: 12, seed: 2 }); let swollen = false; for (let i = 0; i < 60 * 12 && !swollen; i++) { step(r.w, idle()); drainEvents(r.w); if (r.e.broodT >= 0) swollen = true; }
  assert.ok(swollen); r.e.stunT = 0.5; run(r.w, 3); assert.equal(r.e.broodT, -1, 'a stagger breaks the swell'); assert.equal(r.w.enemies.filter((o) => o.summoned).length, 0);
});

test('Weeping Mother: she slams at close range (a heavy blow that shoves), and she does the same thing twice for the same seed', () => {
  const { w } = duel('weeping', { dx: 3 }); const hp0 = w.player.hp; const ev = run(w, 60 * 4); assert.ok(ev.some((x) => x.type === 'enemy_strike' && x.kind === 'weeping'), 'a slam'); assert.ok(hp0 - w.player.hp >= Math.round(M.attack.damage * 0.9));
  const a = duel('weeping', { dx: 12, seed: 5 }), b = duel('weeping', { dx: 12, seed: 5 }); run(a.w, 60 * 14); run(b.w, 60 * 14); assert.equal(hashWorld(a.w), hashWorld(b.w));
});

test('a world with neither elite carries no tears, pools or brood state (the maps and routes of Episodes 1 to 3 are unchanged)', () => {
  const { w, e } = duel('bulwark'); run(w, 120); assert.equal(w.tears, undefined); assert.equal(w.patches, undefined); assert.equal(e.broodT, undefined);
  const g = duel('chorister'); run(g.w, 60); assert.equal(g.w.tears, undefined);
});
