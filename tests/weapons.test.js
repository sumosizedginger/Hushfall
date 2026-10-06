// Scattergun (hitscan), weapon slots/switching/pickups, Gaunt Runner (lunge), and the v2 -> v3 save migration.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createWorld, step, drainEvents, spawnEnemy } from '../src/engine/world.js';
import { makeSave, parseSave, loadWorld } from '../src/engine/save.js';
import { WEAPONS, ENEMIES, AMMO_MAX, TICK } from '../src/engine/defs.js';
import { loadMap, mapLoader } from './helpers.js';

const idle = (o = {}) => ({ move: [0, 0], yaw: 0, pitch: 0, fire: false, aim: false, sprint: false, use: false, weapon: null, weaponStep: 0, ...o });
/** open hall floor, player at (4,18) facing east, no enemies */
function arena(seed = 1) {
  const w = createWorld(loadMap(), { seed }); w.enemies.length = 0;
  Object.assign(w.player, { x: 4, z: 18, yaw: -Math.PI / 2, pitch: 0 }); return w;
}
const armed = (w, shells = 10) => { w.player.weapons = ['flare', 'scattergun']; w.player.weapon = 'scattergun'; w.player.ammo.shell = shells; w.player.switchT = 0; return w; };
const aimAt = (w, x, z, y = 1.0) => { const p = w.player; p.yaw = Math.atan2(-(x - p.x), -(z - p.z)); p.pitch = Math.atan2(y - 1.6, Math.hypot(x - p.x, z - p.z)); };
const raise = (w, ticks = 20) => { for (let i = 0; i < ticks; i++) step(w, idle({ aim: true })); };
/** damage a scattergun blast deals to a 1000-hp target at `dist` metres */
function blast(seed, dist, { aim = true } = {}) {
  const w = armed(arena(seed)), e = spawnEnemy(w, 'tollbearer', 4 + dist, 18, -Math.PI / 2); e.hp = 1000; e.state = 'chase';       // awake and facing us: walks straight down the line, no sideways drift
  aimAt(w, e.x, e.z, 1.0); if (aim) raise(w);
  step(w, idle({ aim, fire: true })); return 1000 - e.hp;
}
const mean = (a) => a.reduce((x, y) => x + y, 0) / a.length;
const seeds = Array.from({ length: 30 }, (_, i) => i + 1);

test('scattergun: close range is devastating, long range is weak (damage falls off)', () => {
  const near = mean(seeds.map((s) => blast(s, 3))), far = mean(seeds.map((s) => blast(s, 20)));
  assert.ok(near >= 70, `point-blank blast ~${near.toFixed(1)} (9 pellets x 9)`);
  assert.ok(far < near / 2.5, `20 m blast ${far.toFixed(1)} vs 3 m ${near.toFixed(1)}`);
});

test('scattergun: one shot kills a Tollbearer at point blank, but needs several at range', () => {
  assert.ok(seeds.every((s) => blast(s, 2.5) >= ENEMIES.tollbearer.hp), 'always lethal up close (aimed)');
  assert.ok(mean(seeds.map((s) => blast(s, 16))) < ENEMIES.tollbearer.hp, 'not lethal at 16 m on average');
});

test('scattergun: aiming tightens the pattern (more pellets land on a distant target)', () => {
  const hip = mean(seeds.map((s) => blast(s, 10, { aim: false }))), ads = mean(seeds.map((s) => blast(s, 10)));
  assert.ok(ads > hip * 1.25, `ads ${ads.toFixed(1)} vs hip ${hip.toFixed(1)}`);
});

test('scattergun: pellets are stopped by walls (no damage through the divider) and leave impact events', () => {
  const w = armed(arena()); w.player.x = 16; w.player.z = 10; w.player.yaw = -Math.PI / 2;      // hall, facing the thick east wall
  const e = spawnEnemy(w, 'tollbearer', 31, 10); e.hp = 1000; aimAt(w, e.x, e.z, 1.2); raise(w);
  step(w, idle({ aim: true, fire: true }));
  assert.equal(e.hp, 1000); const ev = drainEvents(w).filter((x) => x.type === 'impact');
  assert.ok(ev.length >= 1 && ev.length <= 3, 'impacts: ' + ev.length);
});

test('scattergun: one shell per shot, dry-fire clicks, cooldown is respected', () => {
  const w = armed(arena(), 3);
  step(w, idle({ fire: true })); assert.equal(w.player.ammo.shell, 2);
  for (let i = 0; i < 20; i++) step(w, idle({ fire: true })); assert.equal(w.player.ammo.shell, 2, 'still cooling down (0.95 s)');
  for (let i = 0; i < 60; i++) step(w, idle({ fire: true })); assert.ok(w.player.ammo.shell < 2, 'fires again after the cooldown');
  w.player.ammo.shell = 0; w.player.cooldown = 0; drainEvents(w); step(w, idle({ fire: true }));
  assert.ok(drainEvents(w).some((x) => x.type === 'dry'));
});

test('weapon slots: switching costs time, blocks firing, ignores unowned weapons, wheel cycles and wraps', () => {
  const w = arena(); w.player.ammo.shell = 5;
  step(w, idle({ weapon: 1 })); assert.equal(w.player.weapon, 'flare', 'slot 2 not owned yet: ignored');
  w.player.weapons = ['flare', 'scattergun'];
  step(w, idle({ weapon: 1 })); assert.equal(w.player.weapon, 'scattergun'); assert.ok(w.player.switchT > 0.25);
  const shots = w.stats.shots; for (let i = 0; i < 10; i++) step(w, idle({ fire: true })); assert.equal(w.stats.shots, shots, 'cannot fire mid-switch');
  for (let i = 0; i < 20; i++) step(w, idle({ fire: true })); assert.equal(w.stats.shots, shots + 1, 'fires once the weapon is up');
  w.player.cooldown = 0;
  step(w, idle({ weaponStep: 1 })); assert.equal(w.player.weapon, 'flare', 'next wraps around');
  for (let i = 0; i < 30; i++) step(w, idle());
  step(w, idle({ weaponStep: -1 })); assert.equal(w.player.weapon, 'scattergun', 'prev wraps around');
});

test('weapon pickup: grants the weapon, equips it, adds shells, counts as an item; a second copy is just ammo', () => {
  const w = arena(); w.pickups.push({ id: 900, kind: 'weapon_scattergun', x: 4, z: 18 });
  step(w, idle());
  assert.deepEqual(w.player.weapons, ['flare', 'scattergun']); assert.equal(w.player.weapon, 'scattergun'); assert.equal(w.player.ammo.shell, 8);
  assert.equal(w.stats.items, 1); assert.ok(drainEvents(w).some((e) => e.type === 'weapon_pickup'));
  w.pickups.push({ id: 901, kind: 'weapon_scattergun', x: 4, z: 18 }); w.player.ammo.shell = 10; step(w, idle());
  assert.equal(w.player.ammo.shell, 18); assert.deepEqual(w.player.weapons, ['flare', 'scattergun'], 'no duplicate');
  w.pickups.push({ id: 902, kind: 'weapon_scattergun', x: 4, z: 18 }); w.player.ammo.shell = AMMO_MAX.shell; step(w, idle());
  assert.ok(w.pickups.some((p) => p.id === 902), 'full ammo: the pickup stays');
  w.pickups = w.pickups.filter((p) => p.id !== 902); w.pickups.push({ id: 903, kind: 'ammo_shell', x: 4, z: 18 }); w.player.ammo.shell = 38; step(w, idle()); assert.equal(w.player.ammo.shell, AMMO_MAX.shell, 'capped');
});

test('a flare already in flight keeps flare splash after you switch weapons (no NaN, still hurts)', () => {
  const w = arena(); w.player.weapons = ['flare', 'scattergun']; w.player.ammo.shell = 5;
  const e = spawnEnemy(w, 'tollbearer', 11, 18); e.hp = 1000; aimAt(w, e.x, e.z, 1.0); raise(w);
  step(w, idle({ aim: true, fire: true })); assert.equal(w.projectiles.length, 1);
  step(w, idle({ aim: true, weapon: 1 })); assert.equal(w.player.weapon, 'scattergun');
  for (let i = 0; i < 150; i++) { e.x = 11; e.z = 18; step(w, idle({ aim: true })); }          // the shot wakes it (correctly); pin it so the splash geometry is what is under test
  assert.equal(w.projectiles.length, 0); assert.ok(Number.isFinite(e.hp) && e.hp < 1000 - 12, 'flare splash applied: hp ' + e.hp);
});

// ---------------------------------------------------------------- Gaunt Runner
function gauntArena(dist = 4.5, difficulty = 'normal') {
  const w = createWorld(loadMap(), { seed: 1, difficulty }); w.enemies.length = 0;
  Object.assign(w.player, { x: 4, z: 18, yaw: -Math.PI / 2 });
  const e = spawnEnemy(w, 'gaunt', 4 + dist, 18, Math.PI / 2 * -1); e.state = 'chase'; return { w, e };
}
const untilEvent = (w, type, cmd = () => idle(), max = 200) => { for (let i = 0; i < max; i++) { step(w, cmd(i)); if (drainEvents(w).some((x) => x.type === type)) return w.tick; } return null; };

test('gaunt: crouches first (a real tell), then dashes several metres in a straight line', () => {
  const { w, e } = gauntArena(); const t0 = untilEvent(w, 'enemy_lunge'); assert.ok(t0, 'lunge starts within range');
  const x0 = e.x; let strikeTick = null;
  for (let i = 0; i < 60 && strikeTick === null; i++) { const dmg = w.stats.damageTaken; step(w, idle()); if (w.stats.damageTaken > dmg) strikeTick = w.tick; }
  assert.ok(strikeTick, 'a stationary target gets hit by the dash');
  assert.ok((strikeTick - t0) / 60 >= ENEMIES.gaunt.lunge.windup - 0.02, `tell lasts ${((strikeTick - t0) / 60).toFixed(2)} s before contact`);
  assert.ok(x0 - e.x > 2.5, 'covered ground during the dash: ' + (x0 - e.x).toFixed(2));
  assert.equal(w.stats.damageTaken, 9);
});

test('gaunt: a player who reads the tell and strafes is not hit by the lunge', () => {
  const { w, e } = gauntArena(); const t0 = untilEvent(w, 'enemy_lunge'); assert.ok(t0);
  for (let i = 0; i < 40; i++) step(w, idle({ move: [-1, 0] }));     // strafe left (the open side of the hall) through the crouch and the dash (0.66 s)
  assert.equal(w.stats.damageTaken, 0, 'dodged');
  assert.equal(w.status, 'playing'); assert.ok(e.lungeT < 0 || e.lungeHit === false);
});

test('gaunt: lunge has a cooldown, needs the right distance, and needs to be awake', () => {
  const { w, e } = gauntArena(); assert.ok(untilEvent(w, 'enemy_lunge'));
  for (let i = 0; i < 60; i++) step(w, idle({ move: [-1, 0] }));
  const hold = () => { e.x = w.player.x + 5; e.z = w.player.z; e.lungeT = -1; e.attackT = -1; };      // pin it at lunge range so only the cooldown gates the next lunge
  let early = false; for (let i = 0; i < 60; i++) { hold(); step(w, idle()); if (drainEvents(w).some((x) => x.type === 'enemy_lunge')) early = true; }
  assert.equal(early, false, 'no second lunge within the cooldown');
  let again = false; for (let i = 0; i < 200 && !again; i++) { hold(); step(w, idle()); again = drainEvents(w).some((x) => x.type === 'enemy_lunge'); }
  assert.ok(again, 'lunges again once it is ready');
  const close = gauntArena(2); let lunged = false; for (let i = 0; i < 60; i++) { step(close.w, idle()); if (drainEvents(close.w).some((x) => x.type === 'enemy_lunge')) lunged = true; }
  assert.equal(lunged, false, 'too close: it swipes instead');
  const asleep = gauntArena(5); asleep.e.state = 'idle'; asleep.w.player.hp = 100; asleep.w.player.x = 1.5; asleep.w.player.z = 1.5;   // far corner, out of sight
  for (let i = 0; i < 60; i++) step(asleep.w, idle()); assert.equal(asleep.e.state, 'idle');
});

test('gaunt: fragile (one scattergun blast) and hits harder on harder difficulties', () => {
  const { w, e } = gauntArena(2.5); e.state = 'idle'; armed(w); aimAt(w, e.x, e.z, 0.9); raise(w);
  step(w, idle({ aim: true, fire: true })); assert.equal(e.state, 'dead');
  const dmg = (d) => { const { w: ww } = gauntArena(4.5, d); untilEvent(ww, 'enemy_lunge'); for (let i = 0; i < 60; i++) step(ww, idle()); return ww.stats.damageTaken; };
  const easy = dmg('easy'), normal = dmg('normal'), hard = dmg('hard');
  assert.ok(easy < normal && normal < hard, JSON.stringify({ easy, normal, hard }));
});

test('save v2 (before weapon slots and lunges) migrates to v3 and plays on', () => {
  const w = createWorld(loadMap(), { seed: 4 }); spawnEnemy(w, 'gaunt', 30, 18); w.player.ammo.flare = 8; aimAt(w, 20, 18); step(w, idle({ fire: true }));
  const s = makeSave(w, 'mid-level'); s.version = 2;
  delete s.world.player.switchT; for (const q of s.world.projectiles) delete q.weapon; for (const e of s.world.enemies) { delete e.lungeT; delete e.lungeCd; delete e.lungeHit; }
  const r = parseSave(JSON.stringify(s)); assert.equal(r.ok, true, r.detail); assert.equal(r.migratedFrom, 2);
  const loaded = loadWorld(r.save, mapLoader).world;
  assert.equal(loaded.player.switchT, 0); assert.ok(loaded.projectiles.every((q) => q.weapon === 'flare')); assert.ok(loaded.enemies.every((e) => e.lungeT === -1));
  for (let i = 0; i < 300; i++) step(loaded, idle());
  assert.ok(Number.isFinite(loaded.player.x) && loaded.enemies.every((e) => Number.isFinite(e.x) && Number.isFinite(e.hp)));
});

test('weapon table sanity: every weapon has what the sim reads', () => {
  for (const [id, d] of Object.entries(WEAPONS)) {
    for (const k of ['name', 'kind', 'ammo', 'cooldown', 'switchTime', 'spread', 'muzzle']) assert.ok(d[k] !== undefined, `${id}.${k}`);
    if (d.kind === 'hitscan') for (const k of ['pellets', 'damage', 'range', 'falloffStart', 'falloffMin', 'knock']) assert.ok(d[k] !== undefined, `${id}.${k}`);
    else if (d.kind === 'arc') for (const k of ['damage', 'range', 'chain', 'jump', 'chainFalloff', 'lock']) assert.ok(d[k] !== undefined, `${id}.${k}`);
    else for (const k of ['speed', 'gravity', 'splash', 'splashDamage', 'direct', 'selfDamage']) assert.ok(d[k] !== undefined, `${id}.${k}`);
    assert.ok(AMMO_MAX[d.ammo] > 0, id + ' ammo type has a cap');
  }
  assert.ok(TICK > 0);
});

test('enemies steer around obstacles instead of pushing into them (regression: a Gaunt stuck on a barrel)', () => {
  const w = createWorld(loadMap(), { seed: 1 }); w.enemies.length = 0;               // crates at cells (3,2) and (4,2): a 4 m wide barrier at x 7..10, z 5
  Object.assign(w.player, { x: 4, z: 5, yaw: -Math.PI / 2 });
  for (const kind of ['tollbearer', 'gaunt']) {
    const e = spawnEnemy(w, kind, 13, 5); e.state = 'chase';
    let reached = false;
    for (let i = 0; i < 60 * 14 && !reached; i++) { step(w, idle()); w.player.hp = 100; if (Math.hypot(e.x - w.player.x, e.z - w.player.z) < 2.6) reached = true; }
    assert.ok(reached, kind + ' got around the crates: ended at ' + e.x.toFixed(1) + ',' + e.z.toFixed(1));
    w.enemies.length = 0;
  }
});
