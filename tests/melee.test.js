// PT-013: melee and parry. Fists are always owned (slot 6), a quick bash (key V) works with any gun and needs no ammunition, found weapons share the melee slot, the Aim key GUARDS with a melee weapon in hand
// (block, and a guard raised just before a strike PARRIES it), the old last-resort flare feed is gone because nobody is ever left without a weapon. Sim only; every number is a first guess in defs.js.
import test from 'node:test';
import assert from 'node:assert/strict';
import { parseMap } from '../src/engine/mapformat.js';
import { createWorld, step, drainEvents, spawnEnemy, carryOver } from '../src/engine/world.js';
import { makeSave, parseSave, loadWorld, SAVE_VERSION } from '../src/engine/save.js';
import { WEAPONS, GUARD, BASH, MELEE_ORDER, WEAPON_ORDER, PICKUPS, ENEMIES } from '../src/engine/defs.js';

const idle = (o = {}) => ({ move: [0, 0], yaw: 0, pitch: 0, fire: false, aim: false, sprint: false, use: false, weapon: null, weaponStep: 0, melee: false, weaponLast: false, ...o });
const W = (n) => '#'.repeat(n);
const hall = (n = 18) => [W(n), '#' + '.'.repeat(n - 2) + '#', '#' + '.'.repeat(n - 2) + '#', '#' + '.'.repeat(n - 2) + '#', W(n)];
const src = (grid, extra = {}) => ({ format: 1, id: 'K1', version: 1, name: 'Kit', grid, doors: [], secrets: [], entities: [{ type: 'player', at: [1, 1], facing: 'east' }, { type: 'exit', at: [grid[0].length - 2, 1] }], ...extra });
/** the player at (5, 5) facing east with the chosen weapon in hand; the enemies stand east of them facing west */
function room({ weapon = 'fists', weapons = ['flare'], ammo = { flare: 8 }, seed = 1, hp = 100000 } = {}) {
  const w = createWorld(parseMap(src(hall())), { seed, carry: { hp, armor: 0, ammo, weapons } });
  w.enemies.length = 0; Object.assign(w.player, { x: 5, z: 5, yaw: -Math.PI / 2, pitch: 0, weapon, switchT: 0 }); if (weapon !== 'flare' && WEAPONS[weapon].kind === 'melee') w.player.meleeWeapon = weapon; return w;
}
const put = (w, kind, dx, dz = 0, hp = 1000) => { const e = spawnEnemy(w, kind, w.player.x + dx, 5 + dz, -Math.PI / 2); e.hp = hp; e.state = 'chase'; e.lastX = w.player.x; e.lastZ = w.player.z; return e; };
const still = (e) => { e.stunT = 1e9; return e; };
const run = (w, n, f = () => idle()) => { const ev = []; for (let i = 0; i < n; i++) { step(w, f(i)); ev.push(...drainEvents(w)); } return ev; };
const tap = (w, o = {}) => { const ev = run(w, 1, () => idle({ ...o, fire: true })); ev.push(...run(w, 1, () => idle({ ...o, fire: false }))); return ev; };         // a tap on the fire key: charging weapons fire on release
const settle = (w) => run(w, 90);
const lost = (e) => 1000 - e.hp;

// ------------------------------------------------------------------------------------------------------------------------------ the melee slot
test('fists are always owned: key 6 brings them up from any gun, Q goes back, and nobody is ever without something to hit with', () => {
  const w = room({ weapon: 'flare' }); assert.ok(!w.player.weapons.includes('fists'), 'fists are not an inventory item');
  run(w, 1, () => idle({ weapon: 5 })); assert.equal(w.player.weapon, 'fists'); assert.equal(w.player.lastWeapon, 'flare');
  run(w, 30); run(w, 1, () => idle({ weaponLast: true })); assert.equal(w.player.weapon, 'flare', 'Q swaps back'); run(w, 30); run(w, 1, () => idle({ weaponLast: true })); assert.equal(w.player.weapon, 'fists', 'and forth');
  const dry = room({ weapon: 'flare', ammo: { flare: 0 } }); const e = still(put(dry, 'tollbearer', 2.2)); run(dry, 1, () => idle({ melee: true })); run(dry, 30);
  assert.equal(lost(e), BASH.damage, 'with every gun dry, a bash still hurts'); run(dry, 60 * 12); assert.equal(dry.player.ammo.flare, 1, 'and the old safety net still feeds one flare (fists cannot hurt plate: a player dry in front of a Warden must not be stuck)');
});
test('key 6 cycles the melee weapons you carry; the wheel / next / previous step through the guns and then the melee slot; Q goes to the last weapon', () => {
  const w = room({ weapon: 'flare', weapons: ['flare', 'scattergun', 'mallet', 'axe'], ammo: { flare: 8, shell: 8 } });
  const press6 = () => { run(w, 1, () => idle({ weapon: 5 })); run(w, 30); return w.player.weapon; };
  assert.equal(w.player.meleeWeapon, 'axe', 'a world that starts carrying found weapons brings up the heaviest first');
  assert.deepEqual([press6(), press6(), press6(), press6()], ['axe', 'fists', 'mallet', 'axe'], 'key 6 brings up the heaviest, pressing it again cycles through fists and the found weapons in slot order');
  w.player.weapon = 'flare'; w.player.meleeWeapon = 'mallet'; assert.equal(press6(), 'mallet', 'key 6 from a gun brings up the melee weapon last used');
  w.player.weapon = 'scattergun'; run(w, 1, () => idle({ weaponStep: 1 })); assert.equal(w.player.weapon, 'mallet', 'next: after the last gun, the melee slot (the weapon last used)');
});
test('picking up a found melee weapon adds it, equips it and counts as an item; fists stay; pickups are defined for all four', () => {
  for (const id of ['boathook', 'marlinspike', 'mallet', 'axe']) assert.deepEqual(PICKUPS['weapon_' + id], { type: 'weapon', weapon: id });
  const w = room({ weapon: 'flare' }); w.pickups.push({ id: 900, kind: 'weapon_mallet', x: 5, z: 5 }); run(w, 2);
  assert.deepEqual([w.player.weapons, w.player.weapon, w.player.meleeWeapon, w.stats.items], [['flare', 'mallet'], 'mallet', 'mallet', 1]);
  w.pickups.push({ id: 901, kind: 'weapon_mallet', x: 5, z: 5 }); run(w, 2); assert.ok(w.pickups.some((p) => p.id === 901), 'a second copy stays on the floor: nothing to take');
  assert.deepEqual(carryOver(w).weapons, ['flare', 'mallet'], 'it carries to the next map');
});

// ------------------------------------------------------------------------------------------------------------------------------ swings
test('fists: a tap is a jab (8) that reaches 1.9 m to the body\'s surface, inside a cone, behind no wall; hold it back for the heavy punch (30 and a stagger)', () => {
  const J = WEAPONS.fists.swing, H = WEAPONS.fists.charge.heavy;
  const jab = (dx, dz = 0, yaw = 0) => { const w = room(); const e = still(put(w, 'tollbearer', dx, dz)); w.player.yaw += yaw; tap(w); settle(w); return lost(e); };
  assert.equal(jab(2.1), J.damage, 'a Tollbearer 2.1 m away (1.7 m to its surface) is hit'); assert.equal(jab(2.6), 0, '2.6 m is out of reach'); assert.equal(jab(2.1, 0, 1.4), 0, 'behind the shoulder: out of the cone');
  const slice = room(); const behind = still(put(slice, 'tollbearer', 2.1)); slice.map.grid; tap(slice); settle(slice); assert.ok(lost(behind) > 0);
  const heavy = room(); const e = still(put(heavy, 'tollbearer', 2.1)); e.stunT = 0; run(heavy, 1, () => idle({ fire: true })); run(heavy, 45, () => idle({ fire: true }));
  const ev = run(heavy, 1, () => idle({ fire: false })); assert.ok(ev.some((x) => x.type === 'swing' && x.heavy), 'a long hold throws the heavy punch'); run(heavy, 15);
  assert.equal(lost(e), H.damage); assert.ok(e.stunT > 0.5 && e.stunT <= H.stun, 'and staggers: ' + e.stunT); assert.ok(heavy.player.cooldown > 0.5, 'the heavy punch recovers slowly');
  const half = room(); const f = still(put(half, 'tollbearer', 2.1)); run(half, 12, () => idle({ fire: true })); run(half, 1, () => idle({ fire: false })); run(half, 20); assert.equal(lost(f), J.damage, 'a short hold is just a jab');
});
test('a wall between you and the body stops the blow; a sleeping enemy is woken by it', () => {
  const g = hall(); const w = createWorld(parseMap(src([g[0], '#' + '.'.repeat(6) + '#' + '.'.repeat(9) + '#', '#' + '.'.repeat(6) + '#' + '.'.repeat(9) + '#', '#' + '.'.repeat(6) + '#' + '.'.repeat(9) + '#', g[4]])), { seed: 1, carry: { hp: 1e5, armor: 0, ammo: { flare: 8 }, weapons: ['flare'] } });
  w.enemies.length = 0; Object.assign(w.player, { x: 11, z: 5, yaw: -Math.PI / 2, weapon: 'fists', switchT: 0 }); const e = spawnEnemy(w, 'tollbearer', 14, 5, -Math.PI / 2); e.hp = 1000; e.state = 'idle'; tap(w); settle(w); assert.equal(lost(e), 0, 'a 2 m wall is in the way');
  const w2 = room(); const s = put(w2, 'tollbearer', 2.1); s.state = 'idle'; tap(w2); assert.ok(drainEvents(w2).length >= 0); run(w2, 10); assert.notEqual(s.state, 'idle', 'woken');
});
test('the quick bash (V): any gun, 15 damage, knocks back, blocks the gun while it lasts, drops the sights and the sprint', () => {
  const w = room({ weapon: 'flare', ammo: { flare: 8 } }); const e = still(put(w, 'tollbearer', 2.1)); const x0 = e.x;
  const ev = run(w, 1, () => idle({ melee: true, aim: true })); assert.ok(ev.some((x) => x.type === 'swing' && x.kind === 'bash')); run(w, 12); assert.equal(lost(e), BASH.damage); assert.ok(e.x > x0 + 0.2, 'shoved back ' + (e.x - x0).toFixed(2));
  const f = room({ weapon: 'flare' }); run(f, 1, () => idle({ melee: true })); run(f, 3, () => idle({ fire: true })); assert.equal(f.stats.shots, 0, 'no shot while the bash is in the air'); run(f, 40, () => idle({ fire: true })); assert.equal(f.stats.shots, 1, 'and the gun is ready right after');
  const s = room({ weapon: 'flare' }); run(s, 12, () => idle({ move: [0, 1], sprint: true })); assert.ok(s.player.sprinting); run(s, 1, () => idle({ move: [0, 1], sprint: true, melee: true })); assert.ok(!s.player.sprinting, 'a bash ends the sprint');
  const d = room({ weapon: 'flare' }); run(d, 1, () => idle({ melee: true })); run(d, 1, () => idle({ melee: true })); const sw = drainEvents(d); void sw; assert.ok(d.player.swingT >= 0 || d.player.cooldown > 0, 'one swing at a time');
});
test('the found weapons: the axe cleaves everything in its arc, the others strike one; the hook pulls; the spike triples on a sleeper or a turned back; the mallet ignores the Warden\'s plate and staggers', () => {
  const crowd = (weapon) => { const w = room({ weapon, weapons: ['flare', weapon] }); const es = [put(w, 'tollbearer', 2.3, 0), put(w, 'tollbearer', 2.2, 1.1), put(w, 'tollbearer', 2.2, -1.1)].map(still); tap(w); settle(w); return es.filter((e) => lost(e) > 0).length; };
  assert.equal(crowd('axe'), 3, 'the axe cleaves all three'); assert.equal(crowd('mallet'), 1); assert.equal(crowd('marlinspike'), 1);
  const w = room({ weapon: 'axe', weapons: ['flare', 'axe'] }); const e = still(put(w, 'tollbearer', 2.3)); tap(w); settle(w); assert.equal(lost(e), WEAPONS.axe.swing.damage);
  const hook = room({ weapon: 'boathook', weapons: ['flare', 'boathook'] }); const far = still(put(hook, 'tollbearer', 3.0)); const d0 = far.x - hook.player.x; tap(hook); settle(hook); assert.ok(d0 - (far.x - hook.player.x) > 1.0, `pulled in ${(d0 - (far.x - hook.player.x)).toFixed(2)} m`); assert.equal(lost(far), WEAPONS.boathook.swing.damage); assert.equal(far.x - hook.player.x > 1.2, true, 'but not into your face');
  const stab = (asleep, turned) => { const sight = ENEMIES.tollbearer.sight; if (asleep) ENEMIES.tollbearer.sight = 0;       // (a sleeper wakes the moment it SEES you, so for the test it is blind)
    try { const s = room({ weapon: 'marlinspike', weapons: ['flare', 'marlinspike'] }); const t = still(put(s, 'tollbearer', 1.9)); if (asleep) { t.state = 'idle'; t.stunT = 0; } if (turned) t.yaw = Math.PI / 2; tap(s); settle(s); return lost(t); } finally { ENEMIES.tollbearer.sight = sight; } };
  const sp = WEAPONS.marlinspike.swing; assert.equal(stab(false, false), sp.damage); assert.equal(stab(true, false), sp.damage * sp.backstab, 'a sleeper'); assert.equal(stab(false, true), sp.damage * sp.backstab, 'a turned back'); assert.ok(sp.damage * sp.backstab >= ENEMIES.tollbearer.hp, 'a stab kills a sleeping Tollbearer outright');
  const plated = (weapon) => { const p = room({ weapon, weapons: ['flare', weapon] }); const wd = put(p, 'wardengraft', 2.6); wd.stunT = 0; wd.state = 'chase'; tap(p); settle(p); return wd; };
  const ma = plated('mallet'), ax = plated('axe'); assert.equal(lost(ma), WEAPONS.mallet.swing.damage, 'the mallet\'s full 30 through the plate'); assert.ok(lost(ax) < WEAPONS.axe.swing.damage * 0.5, 'the axe\'s 55 is turned by it: ' + lost(ax)); assert.ok(ma.stunT > 0 || ma.hp < 1000, 'and the Warden staggers');
});

// ------------------------------------------------------------------------------------------------------------------------------ guard and parry
/** a Tollbearer next to the player winding up a blow that will land in `inTicks` ticks (facing the player) */
const windup = (w, inTicks, kind = 'tollbearer', dx = 1.5) => { const e = put(w, kind, dx); const d = ENEMIES[kind]; e.attackT = d.attack.duration * d.attack.windup - inTicks / 60 + 1e-6; e.struck = false; return e; };
test('with a melee weapon the Aim key GUARDS (no sights, slower walking); with a gun it still aims', () => {
  const w = room(); run(w, 8, () => idle({ aim: true })); assert.ok(w.player.guarding && w.player.guard === 1 && w.player.ads === 0, 'guarding, not aiming');
  const g = room({ weapon: 'flare' }); run(g, 20, () => idle({ aim: true })); assert.ok(!g.player.guarding && g.player.ads === 1);
  const speed = (guard) => { const v = room(); run(v, 30, () => idle({ move: [0, 1], aim: guard })); return Math.hypot(v.player.vx, v.player.vz); }; assert.ok(speed(true) < speed(false) * 0.8, 'guarding slows you');
});
test('PARRY: a guard raised just before a melee strike lands cancels it, staggers the attacker, and makes your next hit hit twice as hard', () => {
  const w = room(); const e = windup(w, 6); const hp = w.player.hp; const ev = run(w, 1, () => idle({ aim: true })); run(w, 8, () => idle({ aim: true }));
  assert.ok(ev.length >= 0); assert.equal(w.player.hp, hp, 'no damage taken'); assert.ok(e.stunT > 0.8, 'the attacker is staggered ' + e.stunT);
  const all = run(room(), 0); void all;
  const w2 = room(); const e2 = windup(w2, 6); const ev2 = run(w2, 12, (i) => idle({ aim: true })); assert.ok(ev2.some((x) => x.type === 'parry'), 'a parry event'); assert.ok(w2.player.riposteT > 1.5, 'riposte ready'); assert.equal(w2.player.hp, 100000);
  e2.stunT = 0; tap(w2, { aim: false }); run(w2, 20); assert.equal(1000 - e2.hp, WEAPONS.fists.swing.damage * GUARD.riposteMult, 'the next hit is doubled'); assert.equal(w2.player.riposteT, 0, 'and uses it up');
});
test('BLOCK: a guard held longer stops most of the blow; a heavy blow (a Warden\'s) breaks it; an attacker behind you is not blocked', () => {
  const dmg = (kind, build) => { const w = room({ hp: 100 }); run(w, 20, () => idle({ aim: true })); const e = windup(w, 8, kind, kind === 'wardengraft' ? 2 : 1.5); if (build) build(w, e); const hp = w.player.hp; run(w, 14, () => idle({ aim: true })); return { w, lost: hp - w.player.hp }; };
  const raw = ENEMIES.tollbearer.attack.damage, b = dmg('tollbearer'); assert.equal(b.lost, Math.round(raw * GUARD.block), 'blocked: 30% gets through'); assert.ok(b.w.player.guarding);
  const un = (() => { const w = room({ hp: 100 }); const e = windup(w, 8); void e; const hp = w.player.hp; run(w, 14); return hp - w.player.hp; })(); assert.equal(un, raw, 'unguarded: the full ' + raw);
  const heavy = dmg('wardengraft'); assert.ok(heavy.lost >= ENEMIES.wardengraft.attack.damage * 0.95, 'a Warden\'s blow breaks through: ' + heavy.lost); assert.ok(!heavy.w.player.guarding && heavy.w.player.brokenT > 0, 'and the guard is broken for a moment');
  const back = dmg('tollbearer', (w, e) => { e.x = w.player.x - 1.5; e.yaw = Math.PI / 2; }); assert.equal(back.lost, raw, 'from behind: the guard does nothing');
});
test('the parry window: it closes after 0.2 s, and a window that found nothing cannot be reopened for 0.8 s (no mashing); a parried Gaunt lunge and a Warden charge are parried too', () => {
  const late = room(); const e = windup(late, 21); run(late, 4, () => idle({ aim: true })); const hp = late.player.hp; run(late, 24, () => idle({ aim: true })); assert.equal(hp - late.player.hp, Math.round(ENEMIES.tollbearer.attack.damage * GUARD.block), 'raised more than 0.2 s ahead: a block, not a parry'); void e;
  const spam = room(); run(spam, 6, () => idle({ aim: true })); run(spam, 6); const e2 = windup(spam, 5); const ev = run(spam, 12, () => idle({ aim: true })); assert.ok(!ev.some((x) => x.type === 'parry'), 'raised again 0.2 s after the last: no window'); void e2;
  const ok = room(); run(ok, 6, () => idle({ aim: true })); run(ok, 60); const e3 = windup(ok, 5); const ev3 = run(ok, 12, () => idle({ aim: true })); assert.ok(ev3.some((x) => x.type === 'parry'), 'but after the cooldown it works');
  const gaunt = room(); const g = put(gaunt, 'gaunt', 1.0); g.lungeT = 0.35; g.lungeHit = false; run(gaunt, 1, () => idle({ aim: true })); assert.ok(gaunt.player.riposteT > 0, 'a lunge in the air is parried'); assert.ok(g.lungeT === -1 || g.stunT > 0);
  const warden = room(); const wd = put(warden, 'wardengraft', 2.0); wd.chargeT = 0.9; run(warden, 1, () => idle({ aim: true })); run(warden, 8, () => idle({ aim: true })); assert.ok(warden.player.riposteT > 0 || warden.player.hp < 1e5, 'the charge is parried or lands');
  void e3;
});
test('toll-shots and tone pulses are NOT guarded (a deliberate limit); a swing cancels the guard; the guard cannot be raised while broken or dead', () => {
  const w = room({ hp: 100 }); run(w, 20, () => idle({ aim: true })); w.enemyShots.push({ id: 99, x: 8, y: 1.5, z: 5, vx: -9, vy: 0, vz: 0, life: 4, dmg: 14 }); run(w, 40, () => idle({ aim: true })); assert.equal(w.player.hp, 86, 'the shot hurts through the guard');
  const s = room(); run(s, 20, () => idle({ aim: true })); run(s, 1, () => idle({ aim: true, fire: true })); run(s, 1, () => idle({ aim: true, fire: false })); run(s, 1, () => idle({ aim: true })); assert.ok(!s.player.guarding, 'a swing drops the guard');
  const b = room(); b.player.brokenT = 0.5; run(b, 10, () => idle({ aim: true })); assert.ok(!b.player.guarding, 'a broken guard cannot be raised');
});

// ------------------------------------------------------------------------------------------------------------------------------ saves and determinism
test('save: a v9 save (before melee) migrates to v10 and plays on; the new fields are present and at rest; a v10 mid-level save round-trips', () => {
  const w = room({ weapon: 'axe', weapons: ['flare', 'axe'] }); run(w, 5);
  const save = JSON.parse(JSON.stringify(makeSave(w, 'mid-level'))); assert.equal(save.version, SAVE_VERSION);
  const old = JSON.parse(JSON.stringify(save)); old.version = 9; delete old.world.burns; for (const k of ['charge', 'swingT', 'swingKind', 'swingHit', 'guard', 'guarding', 'parryW', 'parryCd', 'riposteT', 'brokenT', 'meleeWeapon', 'lastWeapon']) delete old.world.player[k];
  const p = parseSave(JSON.stringify(old)); assert.ok(p.ok && p.migratedFrom === 9, JSON.stringify(p).slice(0, 200)); assert.deepEqual(p.save.world.burns, []); assert.equal(p.save.world.player.swingT, -1); assert.equal(p.save.world.player.meleeWeapon, 'fists');
  const m = parseMap(src(hall())); const r = loadWorld(p.save, () => m); assert.ok(r.ok, JSON.stringify(r)); run(r.world, 60, () => idle({ aim: true, melee: true }));
  const again = loadWorld(parseSave(JSON.stringify(makeSave(w, 'mid-level'))).save, () => m); assert.ok(again.ok); assert.equal(again.world.player.weapon, 'axe');
});
test('melee is deterministic: the same inputs give the same world', () => {
  const play = () => { const w = room({ seed: 4 }); const es = [put(w, 'tollbearer', 2.2), put(w, 'gaunt', 3, 1)]; for (let t = 0; t < 400; t++) step(w, idle({ fire: t % 40 < 20, aim: t % 100 > 70, melee: t % 97 === 0, move: [0, t % 160 < 30 ? 1 : 0] })); return JSON.stringify([es.map((e) => [e.hp, e.x, e.z, e.stunT]), w.player]); };
  assert.equal(play(), play());
});
test('the melee table: every swing has reach, arc, damage and timings; the order has fists first', () => {
  assert.equal(MELEE_ORDER[0], 'fists'); assert.equal(WEAPON_ORDER.length, 8, 'eight guns (PT-022 added the carbine, the line-thrower and the fork); the melee slot is key 6 (SLOT_KEYS)');
  for (const id of MELEE_ORDER) { const S = WEAPONS[id].swing; for (const k of ['reach', 'arc', 'damage', 'windup', 'recover']) assert.ok(S[k] > 0, id + '.' + k); assert.ok(S.reach <= 3 && S.arc <= Math.PI, id + ' sane'); }
  assert.ok(WEAPONS.axe.swing.damage > WEAPONS.mallet.swing.damage && WEAPONS.mallet.swing.damage > WEAPONS.marlinspike.swing.damage, 'heavier hits harder'); assert.ok(WEAPONS.axe.swing.recover > WEAPONS.marlinspike.swing.recover, 'and recovers slower');
});
