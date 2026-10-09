// PT-026: the Chorister (Episode 3's suppression creature) and the Landing Scar that introduces it. ENEMIES.chorister and SUPPRESS in src/engine/defs.js, the burst / retreat / suppression in world.js.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createWorld, step, spawnEnemy, drainEvents, damageEnemy } from '../src/engine/world.js';
import { ENEMIES, SUPPRESS, WEAPONS } from '../src/engine/defs.js';
import { loadMapFile, loadRouteFile, runRoute } from '../src/engine/harness.js';
import { findTraps } from '../src/engine/traps.js';
import { shippedMap } from './helpers.js';

const idle = (o = {}) => ({ move: [0, 0], yaw: 0, pitch: 0, fire: false, aim: false, sprint: false, use: false, weapon: null, weaponStep: 0, ...o });
const C = ENEMIES.chorister;
/** the Landing Scar's basin, a clear stretch of it: the player stands at (20.5, 22.5) cells facing east with a Chorister `dx` metres ahead on the same floor */
function duel({ dx = 11, hp = 1e6, seed = 1, difficulty = 'normal' } = {}) {
  const map = shippedMap('C1E3M01'), w = createWorld(map, { seed, difficulty, carry: { hp, armor: 0, ammo: {}, weapons: ['flare', 'scattergun', 'rivet'] } });
  w.enemies.length = 0; w.pickups.length = 0;
  Object.assign(w.player, { x: 21 * map.cell, z: 22.5 * map.cell, yaw: -Math.PI / 2, pitch: 0, y: 0, ammo: { flare: 8, shell: 12, rivet: 60 } }); w.player.hp = hp;
  const e = spawnEnemy(w, 'chorister', w.player.x + dx, w.player.z, Math.PI / 2); e.state = 'chase'; e.lastX = w.player.x; e.lastZ = w.player.z;
  return { w, e };
}
const run = (w, ticks, cmd = idle()) => { const ev = []; for (let i = 0; i < ticks; i++) { step(w, cmd); ev.push(...drainEvents(w)); } return ev; };

test('the Chorister is a singer, not a brawler: a ranged burst creature that keeps its distance, circles and backs off', () => {
  assert.ok(C.ranged.burst.count >= 3 && C.ranged.burst.gap > 0 && C.ranged.burst.spread > 0, 'a burst of light shots'); assert.ok(C.ranged.damage <= 5, 'one round does little: it is the volume and the suppression');
  assert.ok(C.strafe && C.retreat && C.ranged.hold > C.ranged.minRange, 'strafes (flanks), retreats inside its minimum range, holds at range'); assert.ok(C.sight < 30, 'its sight is short enough that the Landing Scar\'s rims do not see the spawn');
  assert.ok(C.ranged.suppress.r >= 1, 'a round going by within a metre or two suppresses');
});

test('it fires its burst: the first shot after the windup, the rest a tenth of a second apart, none exactly on the line', () => {
  const { w } = duel(); const ev = run(w, 60 * 4), shots = ev.filter((x) => x.type === 'enemy_shot' && x.kind === 'chorister');
  assert.ok(shots.length >= C.ranged.burst.count, `${shots.length} shots in 4 s`);
  const first = shots[0], burst = shots.slice(0, C.ranged.burst.count); assert.equal(first.burst, false, 'the first is the shot of the windup'); assert.ok(burst.slice(1).every((s) => s.burst), 'the rest are the burst');
  const ticks = burst.map((s) => s.tick); for (let i = 1; i < ticks.length; i++) assert.ok(Math.abs((ticks[i] - ticks[i - 1]) * (1 / 60) - C.ranged.burst.gap) < 0.04, `shot ${i} follows after the gap: ${ticks.join(' ')}`);
});

test('a burst is off the line shot by shot (the seeded RNG: the same seed gives the same burst), and every shot carries the suppression radius', () => {
  const sample = (seed) => { const { w } = duel({ seed }); const out = []; for (let i = 0; i < 60 * 3 && out.length < 4; i++) { step(w, idle()); drainEvents(w); for (const q of w.enemyShots) if (!out.some((o) => o.id === q.id)) out.push({ id: q.id, vx: q.vx, vy: q.vy, vz: q.vz, sup: q.sup }); } return out; };
  const a = sample(3), b = sample(3), c = sample(4); assert.equal(a.length, 4); assert.deepEqual(a, b, 'same seed, same burst'); assert.notDeepEqual(a.map((q) => q.vz.toFixed(3)), c.map((q) => q.vz.toFixed(3)), 'another seed, another burst');
  assert.ok(new Set(a.map((q) => q.vz.toFixed(3))).size > 1, 'the four shots are not identical'); assert.ok(a.every((q) => q.sup === C.ranged.suppress.r));
});

test('it backs off when you come inside its minimum range, and holds near its hold distance when you do not', () => {
  const near = duel({ dx: 3 }); const d0 = near.e.x - near.w.player.x; run(near.w, 60 * 3); assert.ok(near.e.x - near.w.player.x > C.ranged.keep - 1, `backed off from ${d0.toFixed(1)} to ${(near.e.x - near.w.player.x).toFixed(1)} m (it keeps ${C.ranged.keep} m)`);
  const far = duel({ dx: 24 }); run(far.w, 60 * 6); const d = Math.hypot(far.e.x - far.w.player.x, far.e.z - far.w.player.z); assert.ok(d < 20 && d > C.ranged.minRange, `it closed to its range (${d.toFixed(1)} m), no further`);
});

test('it circles: while it holds it runs sideways round you in alternating runs (flanking), the same way twice for the same seed', () => {
  const trace = (seed) => { const { w, e } = duel({ dx: 12, seed }); const zs = []; for (let i = 0; i < 60 * 8; i++) { step(w, idle()); drainEvents(w); if (i % 30 === 0) zs.push(+(e.z - w.player.z).toFixed(2)); } return zs; };
  const a = trace(5), b = trace(5); assert.deepEqual(a, b); assert.ok(Math.max(...a) - Math.min(...a) > 3, `it moved sideways by ${(Math.max(...a) - Math.min(...a)).toFixed(1)} m`);
});

test('a round that goes by close SUPPRESSES: the player\'s every gun opens its cone for a moment, the crosshair is told, the sound plays once per burst; a round that goes by far off does not', () => {
  const { w } = duel(); let supp = 0, evs = 0; for (let i = 0; i < 60 * 8; i++) { step(w, idle()); for (const e of drainEvents(w)) if (e.type === 'suppress') evs++; supp = Math.max(supp, w.player.suppT || 0); }
  assert.ok(supp > 0 && supp <= SUPPRESS.time + 1e-9, `suppT peaked at ${supp}`); assert.ok(evs >= 1, 'a suppress event'); assert.ok(evs <= 4 * 8, 'not one per tick');
  const w2 = duel().w; w2.enemies.length = 0; const shot = (dz, id) => ({ id, x: w2.player.x + 3, y: w2.player.y + 1.2, z: w2.player.z + dz, vx: -19, vy: 0, vz: 0, life: 4, dmg: 3, sup: C.ranged.suppress.r });
  w2.enemyShots.push(shot(5, 9001)); run(w2, 30); assert.equal(w2.player.suppT || 0, 0, 'a round five metres off the line is nothing to the player');
  w2.enemyShots.push(shot(1, 9002)); run(w2, 12); assert.ok(w2.player.suppT > 0, 'a round a metre off the line suppresses');
  const w3 = duel().w; w3.enemies.length = 0; w3.player.suppT = SUPPRESS.time; for (let i = 0; i < 60; i++) step(w3, idle()); assert.equal(w3.player.suppT, 0, 'it wears off in under a second and a half'); assert.ok(SUPPRESS.time < 1.5);
});

test('suppression opens a gun\'s cone: the riveter hits less while suppressed, over the same seeds', () => {
  const hits = (supp) => { let h = 0; for (let seed = 1; seed <= 40; seed++) { const { w } = duel({ seed, dx: 14 }); w.enemies.length = 0; const t = spawnEnemy(w, 'tollbearer', w.player.x + 14, w.player.z, Math.PI / 2); t.hp = 1e6; t.state = 'idle'; w.player.weapon = 'rivet'; w.player.switchT = 0; w.player.suppT = supp; w.player.ads = 0; const before = t.hp; for (let i = 0; i < 6; i++) { step(w, idle({ fire: true })); w.player.suppT = supp; } drainEvents(w); h += (before - t.hp) > 0 ? 1 : 0; } return h; };
  const calm = hits(0), pinned = hits(SUPPRESS.time); assert.ok(calm > pinned, `${calm} of 40 volleys land when calm, ${pinned} when suppressed`);
  assert.ok(WEAPONS.rivet.spread.hip > 0, 'the riveter has a cone to open');
});

test('a stun breaks a burst in the middle, and a Chorister dies like any creature (38 hit points: a little more than a Gaunt)', () => {
  const { w, e } = duel(); run(w, 40); e.burstLeft = 3; e.stunT = 1; const n = w.enemyShots.length; run(w, 20); assert.equal(e.burstLeft, 0, 'the burst is cut'); assert.ok(w.enemyShots.length <= n + 1);
  assert.ok(C.hp > 24 && C.hp <= 45, 'a little more than a Gaunt'); assert.ok(damageEnemy(w, e, 1e5)); assert.equal(e.state, 'dead');
});

test('the Landing Scar: the singers sleep at the spawn (out of their sight), wake on the ramp, and the route plays through to the exit on every difficulty', () => {
  const map = shippedMap('C1E3M01'), w = createWorld(map, { seed: 1, difficulty: 'normal' }); const singers = w.enemies.filter((e) => e.kind === 'chorister');
  assert.ok(singers.length >= 6, `${singers.length} singers`); run(w, 60 * 6); assert.ok(singers.every((e) => e.state === 'idle'), 'nobody has noticed the player at the spawn');
  for (const difficulty of ['easy', 'normal', 'hard']) { const r = runRoute(loadMapFile('maps/C1E3M01.json'), loadRouteFile('routes/C1E3M01.main.route.json'), { seed: 1, difficulty }); assert.equal(r.result, 'complete', difficulty); assert.ok(r.events.some((x) => x.type === 'suppress'), 'suppression happened'); }
  const s = runRoute(loadMapFile('maps/C1E3M01.json'), loadRouteFile('routes/C1E3M01.secret.route.json'), { seed: 1, difficulty: 'normal' }); assert.equal(s.result, 'complete'); assert.equal(s.world.stats.secrets, 1);
  assert.equal(findTraps(map).traps, 0, 'no pit');
});
