import test from 'node:test';
import assert from 'node:assert/strict';
import { createWorld, step, drainEvents, hashWorld, carryOver } from '../src/engine/world.js';
import { InputState, DEFAULT_BINDINGS } from '../src/engine/input.js';
import { FixedLoop } from '../src/engine/loop.js';
import { TICK, ENEMIES, PLAYER, AMMO_MAX } from '../src/engine/defs.js';
import { loadMap } from './helpers.js';

const idle = () => ({ move: [0, 0], yaw: 0, pitch: 0, fire: false, use: false, weapon: null });
/** deterministic pseudo-input so runs are non-trivial (walk, turn, shoot) without needing a bot */
function scriptedCmd(tick) {
  const phase = Math.floor(tick / 45) % 6;
  return { move: [phase === 2 ? 1 : 0, phase < 4 ? 1 : 0], yaw: phase === 1 ? 0.03 : phase === 3 ? -0.05 : 0, pitch: 0, fire: tick % 90 === 0, use: tick % 200 === 0, weapon: null };
}
const runScripted = (w, from, to) => { for (let t = from; t < to; t++) step(w, scriptedCmd(t)); };

test('simulation is deterministic: same seed + inputs => identical state hash', () => {
  const a = createWorld(loadMap(), { seed: 7 }), b = createWorld(loadMap(), { seed: 7 });
  runScripted(a, 0, 900); runScripted(b, 0, 900);
  assert.equal(hashWorld(a), hashWorld(b));
  assert.ok(a.stats.shots > 0, 'the script must actually do something');
});

test('different seeds diverge: the RNG actually feeds the simulation (the same hip-fired flare flies differently; the same seed flies identically)', () => {
  const shoot = (seed) => { const w = createWorld(loadMap(), { seed }); w.enemies.length = 0; step(w, { ...idle(), fire: true }); assert.equal(w.projectiles.length, 1); const q = w.projectiles[0]; return [q.vx, q.vy, q.vz]; };
  assert.deepEqual(shoot(1), shoot(1)); assert.notDeepEqual(shoot(1), shoot(2), 'different seeds give a different spread');
});

test('render-frame schedules (60 / 144 / 30 fps / jittery) that feed the same per-tick commands give identical sim states (scope: FixedLoop + step; mouse delivery and render-side timers are outside the sim)', () => {
  const N = 600; // ticks
  const run = (dtFn) => {
    const w = createWorld(loadMap(), { seed: 3 }); let tick = 0;
    const loop = new FixedLoop(() => { step(w, scriptedCmd(tick)); tick++; });
    let frames = 0;
    while (tick < N) { loop.advance(dtFn(frames++)); if (frames > 100000) throw new Error('no progress'); }
    return { w, tick, dropped: loop.dropped };
  };
  const results = [() => 1 / 60, () => 1 / 144, () => 1 / 30, (f) => [0.004, 0.031, 0.011, 0.02][f % 4]].map(run);
  for (const r of results) assert.equal(r.dropped, 0);
  // all overshoot N by at most a few ticks: compare states at exactly N ticks by re-running each to tick===N
  const hashes = results.map((r) => { const w = createWorld(loadMap(), { seed: 3 }); runScripted(w, 0, r.tick); return hashWorld(w) === hashWorld(r.w); });
  assert.deepEqual(hashes, [true, true, true, true], 'each run equals a plain fixed-step replay of the same tick count');
  assert.ok(results.every((r) => r.tick >= N && r.tick <= N + 3));
});

test('FixedLoop: tick count tracks elapsed time and long stalls are clamped (no spiral of death)', () => {
  let ticks = 0; const loop = new FixedLoop(() => ticks++);
  for (let i = 0; i < 600; i++) loop.advance(1 / 60);
  assert.ok(Math.abs(ticks - 600) <= 1);
  ticks = 0; const l2 = new FixedLoop(() => ticks++, { maxStepsPerFrame: 4 });
  const r = l2.advance(0.25);
  assert.equal(r.steps, 4); assert.ok(l2.dropped > 0);
});

test('movement collides with walls, pillars and closed doors', () => {
  const w = createWorld(loadMap(), { seed: 1 });
  w.player.x = 3; w.player.z = 3; w.player.yaw = Math.PI / 2;             // facing west toward the x=2 wall (cell 0)
  for (let i = 0; i < 200; i++) step(w, { ...idle(), move: [0, 1] });
  assert.ok(w.player.x >= 2 + 0.3, 'stopped at the wall, x=' + w.player.x);
  const w2 = createWorld(loadMap(), { seed: 1 });                          // closed door at cell 5,10 (world 11,21)
  w2.player.x = 11; w2.player.z = 17; w2.player.yaw = Math.PI;              // facing south
  for (let i = 0; i < 300; i++) step(w2, { ...idle(), move: [0, 1] });
  assert.ok(w2.player.z < 20.1, 'a closed door blocks the player, z=' + w2.player.z);
});

test('locked door refuses without a key, opens with one; spamming use is safe', () => {
  const w = createWorld(loadMap(), { seed: 1 });
  w.player.x = 53; w.player.z = 7; w.player.yaw = -Math.PI / 2;            // west side of locked door (27,3), facing east
  const door = w.doors.find((d) => d.cx === 27 && d.cz === 3);
  for (let i = 0; i < 100; i++) step(w, { ...idle(), use: true });
  assert.equal(door.target, 0); assert.equal(door.open, 0);
  assert.ok(drainEvents(w).some((e) => e.type === 'door_locked'));
  w.player.keys.push('brass');
  for (let i = 0; i < 400; i++) step(w, { ...idle(), use: true });         // 400 use presses
  assert.ok(door.open >= 0 && door.open <= 1 && [0, 1].includes(door.target));
  assert.equal(door.open, 1);
});

test('auto-closing door does not close on top of the player', () => {
  const w = createWorld(loadMap(), { seed: 1 });
  for (const e of w.enemies) e.state = 'dead';                              // keep the test about the door, not about combat
  const door = w.doors.find((d) => d.cx === 5 && d.cz === 10); door.target = 1; door.open = 1;
  w.player.x = 11; w.player.z = 21;                                         // standing in the doorway
  for (let i = 0; i < 60 * 12; i++) step(w, idle());
  assert.equal(door.target, 1, 'held open while occupied');
  w.player.z = 25;
  for (let i = 0; i < 60 * 7; i++) step(w, idle());
  assert.equal(door.target, 0, 'closes once clear');
});

test('difficulty changes enemy damage and health', () => {
  const dmg = (difficulty) => {
    const w = createWorld(loadMap(), { seed: 1, difficulty });
    const e = w.enemies[0]; w.player.x = e.x; w.player.z = e.z + 1.5;
    e.state = 'chase'; e.yaw = 0; e.attackT = 0;
    for (let i = 0; i < 120; i++) { step(w, idle()); if (w.stats.damageTaken > 0) break; }
    return { taken: w.stats.damageTaken, hp: w.enemies[0].hp };
  };
  const easy = dmg('easy'), normal = dmg('normal'), hard = dmg('hard');
  assert.equal(normal.taken, Math.round(ENEMIES.tollbearer.attack.damage));
  assert.ok(easy.taken < normal.taken && normal.taken < hard.taken, JSON.stringify({ easy, normal, hard }));
  assert.ok(easy.hp < normal.hp && normal.hp < hard.hp);
});

test('armor absorbs part of the damage', () => {
  const w = createWorld(loadMap(), { seed: 1 }); w.player.armor = 50;
  const e = w.enemies[0]; w.player.x = e.x; w.player.z = e.z + 1.5; e.state = 'chase'; e.yaw = 0; e.attackT = 0;
  for (let i = 0; i < 120 && w.stats.damageTaken === 0; i++) step(w, idle());
  assert.equal(w.stats.damageTaken, 18 - Math.floor(18 * PLAYER.armorAbsorb));
  assert.equal(w.player.armor, 50 - Math.floor(18 * PLAYER.armorAbsorb));
});

test('pickups respect caps: full health/ammo is not consumed; ammo is capped', () => {
  const w = createWorld(loadMap(), { seed: 1 });
  const hp = w.pickups.find((p) => p.kind === 'health_small'); w.player.x = hp.x; w.player.z = hp.z;
  step(w, idle()); assert.ok(w.pickups.includes(hp), 'full-health player leaves the medkit');
  w.player.hp = 50; step(w, idle()); assert.ok(!w.pickups.includes(hp)); assert.equal(w.player.hp, 65);
  const am = w.pickups.find((p) => p.kind === 'ammo_flare'); w.player.ammo.flare = 29; w.player.x = am.x; w.player.z = am.z; step(w, idle());
  assert.equal(w.player.ammo.flare, 30);
});

test('firing consumes ammo, a dry weapon clicks, and flares kill enemies with splash', () => {
  const w = createWorld(loadMap(), { seed: 1 });
  const e = w.enemies[1], hp0 = e.hp; w.player.x = e.x - 7; w.player.z = e.z; w.player.yaw = -Math.PI / 2; w.player.pitch = 0.02;
  const ex = e.x, ez = e.z, pin = () => { e.x = ex; e.z = ez; };                          // the shot wakes it and it walks toward us (correct AI): pin it so the flare's geometry is what is tested
  for (let i = 0; i < 20; i++) { pin(); step(w, { ...idle(), aim: true }); }               // hip fire is deliberately inaccurate; aim for a reliable hit
  pin(); step(w, { ...idle(), aim: true, fire: true }); assert.equal(w.player.ammo.flare, 7);
  for (let i = 0; i < 120; i++) { pin(); step(w, { ...idle(), aim: true }); }
  assert.ok(e.state === 'dead' || e.hp < hp0, `the flare hurt the enemy it was aimed at (hp ${hp0} -> ${e.hp})`);
  w.player.ammo.flare = 0; w.player.cooldown = 0; drainEvents(w);
  step(w, { ...idle(), fire: true }); assert.ok(drainEvents(w).some((x) => x.type === 'dry'));
});

test('input layer: keyboard path and semantic path produce identical commands', () => {
  const kb = new InputState(), sem = new InputState();
  kb.keyDown('KeyW'); kb.keyDown('KeyD'); kb.keyDown('Mouse0'); kb.addMouse(100, -50);
  sem.press('forward'); sem.press('right'); sem.press('fire'); sem.addYaw(-100 * 0.0022); sem.addPitch(50 * 0.0022);
  assert.deepEqual(kb.sample(), sem.sample());
  kb.keyDown('KeyE'); const c1 = kb.sample(), c2 = kb.sample();
  assert.equal(c1.use, true); assert.equal(c2.use, false, 'use is edge-triggered');
});

test('input layer: opposing keys cancel, rebind steals codes and reports displaced actions', () => {
  const i = new InputState(); i.keyDown('KeyA'); i.keyDown('KeyD');
  assert.equal(i.sample().move[0], 0);
  const displaced = i.rebind('use', ['KeyG', 'KeyW']);
  assert.deepEqual(displaced, ['forward']);
  i.keyDown('KeyW'); assert.equal(i.sample().use, true);
  assert.deepEqual(new InputState().bindings, DEFAULT_BINDINGS);
  assert.throws(() => new InputState().press('teleport'));
});

test('input layer: a key tapped and released between two ticks still registers for one tick (tap latch)', () => {
  const i = new InputState(); i.keyDown('KeyW'); i.keyUp('KeyW');
  assert.equal(i.sample().move[1], 1, 'the tap is seen');
  assert.equal(i.sample().move[1], 0, 'and only once');
  i.keyDown('Mouse0'); i.keyUp('Mouse0'); assert.equal(i.sample().fire, true); assert.equal(i.sample().fire, false);
});

test('exit while taking fatal damage: death wins (a dead player cannot complete the level)', () => {
  const w = createWorld(loadMap(), { seed: 1 });
  const ex = w.map.exits[0], e = w.enemies[0];
  w.player.x = ex.x; w.player.z = ex.z; w.player.hp = 1;
  e.x = ex.x; e.z = ex.z + 1.2; e.state = 'chase'; e.yaw = Math.PI; e.attackT = ENEMIES.tollbearer.attack.duration * ENEMIES.tollbearer.attack.windup - TICK / 2;      // (facing the player, who is to its north: a blow lands only in front of the creature, PT-014)
  step(w, idle());
  assert.equal(w.status, 'dead');
  assert.equal(w.endStats, null);
});

test('after death the world is frozen and restart from level-start carry restores the key', () => {
  const map = loadMap(); const start = createWorld(map, { seed: 5 }); const carry = carryOver(start);
  const w = createWorld(map, { seed: 5, carry });
  const key = w.pickups.find((p) => p.kind === 'key_brass'); w.player.x = key.x; w.player.z = key.z; step(w, idle());
  assert.deepEqual(w.player.keys, ['brass']);
  w.player.hp = 0; step(w, idle()); assert.equal(w.status, 'dead');
  const t = w.tick; step(w, { ...idle(), move: [0, 1] }); assert.equal(w.tick, t, 'no simulation after death');
  const again = createWorld(map, { seed: 5, carry });
  assert.deepEqual(again.player.keys, []);
  assert.ok(again.pickups.some((p) => p.kind === 'key_brass'), 'the key is available again: no softlock');
});

test('a chain of 50 played levels: carry-over stays bounded, never invents weapons, and the serialised world does not grow', () => {
  const map = loadMap(); let carry = null; const sizes = [];
  for (let i = 0; i < 50; i++) {
    const w = createWorld(map, { seed: i, carry }); w.enemies.length = 0;
    w.player.hp = Math.max(1, w.player.hp - 7); w.player.ammo.flare = Math.min(AMMO_MAX.flare, w.player.ammo.flare + 9);          // play the level: take damage, pick up ammo
    const ex = map.exits[0]; w.player.x = ex.x; w.player.z = ex.z; step(w, idle());
    assert.equal(w.status, 'complete'); sizes.push(JSON.stringify(w).length);
    carry = carryOver(w);
    assert.ok(carry.hp >= 1 && carry.hp <= 100 && carry.ammo.flare <= AMMO_MAX.flare && carry.armor <= 100);
  }
  assert.deepEqual(carry.weapons, ['flare']); assert.ok(Math.abs(sizes[49] - sizes[5]) < 64, `world size drifted: ${sizes[5]} -> ${sizes[49]}`);
});
