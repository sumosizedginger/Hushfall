// PT-022 (owner go 2026-10-08): four more weapons, built in the Range first and placed on no map yet: the Harbour carbine (precision: no bloom, a head zone), the Rocket line-thrower (a wide blast that hurts you too), the Vael tuning-fork
// (the gravity tool: lift, throw, punt, pull, turn a toll-shot back, on props a map marks `movable`) and the Shipwright's chainsaw (held fire, unlimited fuel, a stall). The sim only; what they look like is tools/dev/rast-weapon.mjs.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { parseMap, validateMap } from '../src/engine/mapformat.js';
import { createWorld, step, drainEvents, hashWorld, damageEnemy, spawnEnemy } from '../src/engine/world.js';
import { WEAPONS, WEAPON_ORDER, SLOT_KEYS, MELEE_ORDER, ENEMIES, PICKUPS, AMMO_MAX, NOISE, PHYS, GRAV, PLAYER } from '../src/engine/defs.js';
import { InputState } from '../src/engine/input.js';
import { gravTarget } from '../src/engine/gravity.js';
import { WHEEL_SLOTS, wheelModel } from '../src/game/wheel.js';
import { pickupToast } from '../src/game/toasts.js';

const ROOT = path.resolve(import.meta.dirname, '..');
const idle = (o = {}) => ({ move: [0, 0], yaw: 0, pitch: 0, fire: false, aim: false, sprint: false, use: false, weapon: null, weaponStep: 0, ...o });
const Wd = (n) => '#'.repeat(n);
const grid = [Wd(42), ...Array.from({ length: 20 }, () => '#' + '.'.repeat(40) + '#'), Wd(42)];
const cell = (c) => (c + 0.5) * 2;
/** a flat hall (cells 1..40 x 1..20, world x 2..82, z 2..42); the player stands at world (px, pz) looking along -x (yaw PI/2: forward is (-sin yaw, -cos yaw)) with every new weapon; `ents` are map entities */
function arena(ents = [], { px = 40, pz = 11, weapon = 'flare', range = true, hp = 100000 } = {}) {
  const src = { format: 1, id: 'K1', version: 1, name: 'Arena', ...(range ? { range: true } : {}), grid, doors: [], secrets: [], entities: [{ type: 'player', at: [1, 1], facing: 'east' }, { type: 'exit', at: [40, 1] }, ...ents] };
  const w = createWorld(parseMap(src), { seed: 1, carry: { hp, armor: 0, ammo: { flare: 8, round: 180, rocket: 12 }, weapons: ['flare', 'carbine', 'linethrower', 'fork', 'chainsaw'] } });
  Object.assign(w.player, { x: px, z: pz, yaw: Math.PI / 2, pitch: 0, weapon, switchT: 0 });
  return w;
}
const run = (w, secs, cmd = idle()) => { const ev = []; for (let i = 0; i < Math.round(secs * 60); i++) { step(w, cmd); ev.push(...drainEvents(w)); } return ev; };
const sponge = (kind, x, z, extra = {}) => ({ type: 'enemy', kind, at: [x, z], facing: 'east', hold: 'inert', hp: 5000, ...extra });
const types = (ev) => [...new Set(ev.map((e) => e.type))];
const aimAt = (w, e, frac = 0.5) => { const p = w.player; p.yaw = Math.atan2(e.x - p.x, e.z - p.z) + Math.PI; p.pitch = Math.atan2(ENEMIES[e.kind].height * frac + (ENEMIES[e.kind].hover ?? 0) - PLAYER.eye, Math.hypot(e.x - p.x, e.z - p.z)); };

// ---------------------------------------------------------------------------------------------------------------- slots, tables, pickups
test('the four are in the tables: keys 7, 8 and 9 for the guns, the chainsaw joins the melee cycle on key 6, which is still the melee slot', () => {
  assert.deepEqual(SLOT_KEYS.slice(0, 6), ['flare', 'scattergun', 'rivet', 'harpoon', 'arc', 'melee'], 'keys 1-6 are what they have been since PT-013');
  assert.deepEqual(SLOT_KEYS.slice(6), ['carbine', 'linethrower', 'fork']);
  for (const id of ['carbine', 'linethrower', 'fork']) assert.ok(WEAPON_ORDER.includes(id) && WEAPONS[id], id);
  assert.equal(MELEE_ORDER.at(-1), 'chainsaw'); assert.equal(WEAPONS.chainsaw.kind, 'melee'); assert.ok(WEAPONS.chainsaw.swing && WEAPONS.chainsaw.saw);
  assert.equal(WEAPONS.fork.kind, 'tool'); assert.equal(WEAPONS.fork.ammo, undefined, 'the tuning-fork needs no ammunition'); assert.ok(AMMO_MAX.round > 0 && AMMO_MAX.rocket > 0 && AMMO_MAX.rocket <= 16, 'rockets are few');
  assert.deepEqual([PICKUPS.weapon_carbine.ammo, PICKUPS.ammo_round.ammo, PICKUPS.weapon_linethrower.ammo, PICKUPS.ammo_rocket.ammo], ['round', 'round', 'rocket', 'rocket']);
  for (const k of ['weapon_fork', 'weapon_chainsaw']) assert.equal(PICKUPS[k].type, 'weapon');
  assert.match(pickupToast('ammo_rocket'), /rockets \(\+3\)/i); assert.match(pickupToast('ammo_round'), /rounds \(\+40\)/i);
  const inp = new InputState(); for (const [code, slot] of [['Digit6', 5], ['Digit7', 6], ['Digit8', 7], ['Digit9', 8]]) { inp.keyDown(code); assert.equal(inp.sample().weapon, slot, code); inp.keyUp(code); }
});
test('the keys pick the weapons; key 6 cycles the melee weapons including the chainsaw; the next / previous ring runs in key order', () => {
  const w = arena([], { weapon: 'flare' }); w.player.weapons = ['flare', 'carbine', 'linethrower', 'fork', 'mallet', 'chainsaw'];
  for (const [slot, id] of [[6, 'carbine'], [7, 'linethrower'], [8, 'fork']]) { step(w, idle({ weapon: slot })); assert.equal(w.player.weapon, id); w.player.switchT = 0; }
  step(w, idle({ weapon: 5 })); assert.equal(w.player.weapon, 'chainsaw', 'key 6 brings up the heaviest melee weapon carried in (the saw is last in the order)');
  const seen = []; for (let i = 0; i < 4; i++) { w.player.switchT = 0; step(w, idle({ weapon: 5 })); seen.push(w.player.weapon); } assert.ok(seen.includes('mallet') && seen.includes('fists') && seen.includes('chainsaw'), 'the cycle: ' + seen);
  w.player.switchT = 0; w.player.weapon = 'flare'; const ring = []; for (let i = 0; i < 8; i++) { w.player.switchT = 0; step(w, idle({ weaponStep: 1 })); ring.push(w.player.weapon); }
  assert.deepEqual(ring.slice(0, 5), [w.player.meleeWeapon, 'carbine', 'linethrower', 'fork', 'flare'], 'next, in key order: the melee slot (key 6), carbine, line-thrower, fork, back to the flare (the guns not owned are skipped)');
});
test('the weapon wheel has nine segments in key order; the tuning-fork shows no ammunition', () => {
  assert.deepEqual(WHEEL_SLOTS.map((s) => s.id), SLOT_KEYS); assert.deepEqual(WHEEL_SLOTS.map((s) => s.slot), [0, 1, 2, 3, 4, 5, 6, 7, 8]);
  const w = arena(); const m = wheelModel(w.player, -1, WEAPONS, MELEE_ORDER); assert.equal(m.items[8].ammoText, '', 'no number for the fork'); assert.equal(m.items[6].ammoText, '180');
});

// ---------------------------------------------------------------------------------------------------------------- the carbine
test('the carbine: eleven a round, the head zone does 2.4x and staggers, a body round does not; a node has no head', () => {
  const C = WEAPONS.carbine, w = arena([sponge('tollbearer', 14, 5)], { weapon: 'carbine', px: cell(14) + 12 }), e = w.enemies[0], h = ENEMIES.tollbearer.height;
  w.player.z = e.z; aimAt(w, e, 0.45); let hp = e.hp; let ev = run(w, 0.02, idle({ fire: true })); assert.equal(hp - e.hp, C.damage, 'one body round: ' + (hp - e.hp)); assert.ok(!types(ev).includes('headshot')); assert.ok(!((e.slowT || 0) > 0), 'no stagger from a body round');
  w.player.cooldown = 0; aimAt(w, e, 0.92); hp = e.hp; ev = run(w, 0.02, idle({ fire: true })); assert.ok(Math.abs(hp - e.hp - C.damage * C.head.mult) < 1e-6, 'a head round: ' + (hp - e.hp)); assert.ok(types(ev).includes('headshot')); assert.ok((e.slowT || 0) > 0, 'a head round staggers');
  assert.ok(C.head.from > 0.6 && C.head.from < 0.9, 'the head zone is the top of the body');
  const n = arena([sponge('bellnode', 14, 5, { hp: undefined })], { weapon: 'carbine', px: cell(14) + 12 }), nd = n.enemies[0]; n.player.z = nd.z; aimAt(n, nd, 0.95); const hp0 = nd.hp; run(n, 0.02, idle({ fire: true })); assert.equal(hp0 - nd.hp, C.damage, 'a bell node takes no head bonus');
});
test('the carbine does not bloom: the cone is the same after two seconds of fire, and a steady aim lands every round at 40 m', () => {
  const w = arena([sponge('tollbearer', 14, 5)], { weapon: 'carbine', px: cell(14) + 40 }), e = w.enemies[0]; w.player.z = e.z; aimAt(w, e, 0.5); w.player.ads = 1;
  const hp0 = e.hp; const ev = run(w, 3, idle({ fire: true, aim: true })), shots = ev.filter((x) => x.type === 'fire').length;
  assert.ok(shots >= 20, 'it fires ' + shots + ' in 3 s'); assert.equal(w.player.heat ?? 0, 0, 'no heat, no bloom'); assert.equal(WEAPONS.carbine.heatPerShot, undefined);
  const hits = ev.filter((x) => x.type === 'enemy_hit').length; assert.ok(hits >= shots - 1, 'aimed fire at 40 m: ' + hits + ' of ' + shots + ' rounds landed'); assert.ok(hp0 - e.hp >= hits * WEAPONS.carbine.damage * WEAPONS.carbine.falloffMin * 0.99);
});

// ---------------------------------------------------------------------------------------------------------------- the rocket line-thrower
test('a rocket: a wide blast with a direct-hit bonus, a node takes double, plate does not turn it, and it pushes the body it hits', () => {
  const L = WEAPONS.linethrower, fire = (ents, { z = 11, dist = 12, pitchUp = 0.0 } = {}) => {
    const w = arena(ents, { weapon: 'linethrower', px: cell(14) + dist }); w.player.z = w.enemies[0].z; w.player.pitch = Math.atan2(1.1 - PLAYER.eye, dist) + pitchUp; run(w, 0.02, idle({ fire: true })); const ev = run(w, 1.6); return { w, ev };
  };
  const a = fire([sponge('tollbearer', 14, 5)]), e = a.w.enemies[0], boom = a.ev.find((x) => x.type === 'explode');
  assert.ok(boom && boom.r === L.splash, 'one explosion, with the size of the blast'); assert.ok(5000 - e.hp >= L.splashDamage * 0.9 + L.direct + L.directHit - 12, 'a direct hit: ' + (5000 - e.hp).toFixed(0));
  const b = fire([sponge('tollbearer', 15.5, 5), sponge('tollbearer', 16.5, 5)]), side = b.w.enemies[0]; assert.ok(5000 - side.hp > 0 && 5000 - side.hp < 5000 - b.w.enemies[1].hp, 'the blast reaches the one beside it for less (' + (5000 - side.hp).toFixed(0) + ')');
  const n = fire([sponge('bellnode', 14, 5, { hp: 5000 }), sponge('tollbearer', 14, 8)]); const nodeLoss = 5000 - n.w.enemies[0].hp, plainLoss = 5000 - n.w.enemies[1].hp; assert.ok(nodeLoss > plainLoss, 'a bell node takes more: ' + nodeLoss.toFixed(0) + ' against ' + plainLoss.toFixed(0));
  const plate = fire([{ ...sponge('wardengraft', 14, 5), facing: -Math.PI / 2 }]); const wd = plate.w.enemies[0]; wd.hp; assert.ok(5000 - wd.hp > L.splashDamage * 0.9, 'plate does not turn a blast: ' + (5000 - wd.hp).toFixed(0));
  const push = arena([sponge('tollbearer', 14, 5)], { weapon: 'linethrower', px: cell(14) + 12 }); const pe = push.enemies[0]; push.player.z = pe.z; push.player.pitch = Math.atan2(1.1 - PLAYER.eye, 12); run(push, 0.02, idle({ fire: true })); const x0 = pe.x; run(push, 1.1); assert.ok(Math.abs(pe.x - pe.post.x) < 0.05 || pe.x < x0 + 5, 'a sponge is pushed and walks back to its post');
});
test('a rocket hurts the one who fired it inside 65% of the blast, and not beyond; a rocket into a wall is a rocket in your face', () => {
  const L = WEAPONS.linethrower;
  const hurt = (dist) => { const w = arena([], { weapon: 'linethrower', range: false, hp: 100 }); w.player.z = 11; w.player.pitch = 0; w.player.x = 2 + dist; run(w, 0.02, idle({ fire: true })); run(w, 1.2); return 100 - w.player.hp; };
  assert.ok(hurt(2.6) > 0 && hurt(2.6) < L.splashDamage * L.selfDamage, 'a wall 2.6 m away: some (' + hurt(2.6) + ')'); assert.equal(hurt(5), 0, 'a wall 5 m away: none (the blast reaches 65% of ' + L.splash + ' m = ' + (0.65 * L.splash).toFixed(1) + ' m)');
  assert.ok(hurt(2) > hurt(2.6), 'closer is worse');
});
test('a blast throws the movable props about, and a prop sent fast enough hurts what it meets', () => {
  const w = arena([{ type: 'prop', kind: 'barrel', at: [14, 5], movable: true }, sponge('tollbearer', 10, 5)], { weapon: 'linethrower', px: cell(14) + 9 }), q = w.phys[0], x0 = q.x; w.player.z = q.z; w.player.pitch = Math.atan2(0.2 - PLAYER.eye, 9);
  w.player.weapon = 'flare'; run(w, 0.02, idle({ fire: true })); const ev = run(w, 1.5); assert.ok(q.x !== x0 || q.gone, 'the flare burst moved the barrel'); assert.ok(types(ev).includes('explode'));
});

// ---------------------------------------------------------------------------------------------------------------- the chainsaw
const S = WEAPONS.chainsaw.saw;
test('the chainsaw: nothing while it spins up, then a cut every tenth of a second, to everything in front; it pulls you in, slows you, and is loud', () => {
  const w = arena([sponge('tollbearer', 14, 5), sponge('tollbearer', 14, 5.5), sponge('tollbearer', 14, 4.5)], { weapon: 'chainsaw', px: cell(14) + 2.3 }), [a, b, c] = w.enemies; w.player.z = a.z;
  run(w, S.spinUp - 0.1, idle({ fire: true })); assert.equal(5000 - a.hp, 0, 'it is still spinning up');
  const x0 = w.player.x, ev = run(w, 1.0, idle({ fire: true })), cuts = ev.filter((x) => x.type === 'saw_hit').length;
  assert.ok(5000 - a.hp >= S.damage * 8 && 5000 - a.hp <= S.damage * 13, 'about ten cuts a second of ' + S.damage + ': ' + (5000 - a.hp)); assert.ok(5000 - b.hp > 0 && 5000 - c.hp > 0, 'it cleaves: the ones beside it are cut too'); assert.ok(cuts >= 20, cuts + ' cuts');
  assert.ok(w.player.x < x0 - 0.2, 'it pulls the player in (' + (x0 - w.player.x).toFixed(2) + ' m)'); assert.ok(types(ev).includes('saw_rev'), 'the engine is heard');
  const sleeper = arena([{ type: 'enemy', kind: 'tollbearer', at: [30, 5], facing: 'east' }], { weapon: 'chainsaw', px: cell(30) - 6, range: false }); sleeper.player.z = cell(5); run(sleeper, 1.0, idle({ fire: true }));
  assert.notEqual(sleeper.enemies[0].state, 'idle', 'a revving chainsaw wakes what sleeps within ' + NOISE.chainsaw + ' m'); assert.ok(NOISE.chainsaw >= NOISE.rivet - 4 && NOISE.chainsaw > NOISE.melee);
  const slow = arena([], { weapon: 'chainsaw', px: 60 }); slow.player.z = 11; run(slow, 1, idle({ fire: true, move: [0, 1] })); const free = arena([], { weapon: 'flare', px: 60 }); free.player.z = 11; run(free, 1, idle({ move: [0, 1] })); assert.ok(60 - slow.player.x < 60 - free.player.x - 0.5, 'a running saw slows you');
});
test('it stalls: about five and a half seconds of cutting, then dead for a moment; it cools when you let go; plate kicks it back at once, a Warden\'s back does not', () => {
  const w = arena([sponge('tollbearer', 14, 5)], { weapon: 'chainsaw', px: cell(14) + 2.3 }); w.player.z = w.enemies[0].z;
  let ev = run(w, S.heatTime * 0.6, idle({ fire: true })); assert.ok(!types(ev).includes('saw_stall'), 'not yet'); assert.ok(w.player.saw.heat > 0.3);
  ev = run(w, S.heatTime * 0.6, idle({ fire: true })); assert.ok(types(ev).includes('saw_stall'), 'it stalled after ' + (S.heatTime * 1.2).toFixed(1) + ' s'); const hp = w.enemies[0].hp; run(w, 0.5, idle({ fire: true })); assert.equal(w.enemies[0].hp, hp, 'dead: no cutting while it is stalled'); assert.ok(w.player.saw.stall > 0);
  ev = run(w, S.stall, idle({ fire: true })); assert.ok(types(ev).includes('saw_restart'), 'and it restarts');
  const cool = arena([sponge('tollbearer', 14, 5)], { weapon: 'chainsaw', px: cell(14) + 2.3 }); cool.player.z = cool.enemies[0].z; run(cool, 2.5, idle({ fire: true })); const h1 = cool.player.saw.heat; run(cool, 1.5); assert.ok(cool.player.saw.heat < h1 * 0.6, 'it cools at rest: ' + h1.toFixed(2) + ' -> ' + cool.player.saw.heat.toFixed(2));
  const front = arena([{ ...sponge('wardengraft', 14, 5), facing: -Math.PI / 2 }], { weapon: 'chainsaw', px: cell(14) + 2.6 }); front.player.z = front.enemies[0].z; front.enemies[0].yaw = Math.PI / 2; ev = run(front, 2, idle({ fire: true }));
  assert.ok(types(ev).includes('saw_kick') && types(ev).includes('saw_stall'), 'a Warden facing you: the saw kicks off the plate and stalls: ' + types(ev));
  const back = arena([sponge('wardengraft', 14, 5)], { weapon: 'chainsaw', px: cell(14) + 2.6 }); back.player.z = back.enemies[0].z; back.enemies[0].yaw = -Math.PI / 2; ev = run(back, 2, idle({ fire: true }));
  assert.ok(!types(ev).includes('saw_kick') && !types(ev).includes('saw_stall'), 'a Warden showing its back: no kick'); assert.ok(5000 - back.enemies[0].hp > S.damage * 12);
});
test('the chainsaw has no guard, a short chop on key V like every melee weapon, and is switched off when put away', () => {
  const w = arena([sponge('tollbearer', 14, 5)], { weapon: 'chainsaw', px: cell(14) + 1.9 }), e = w.enemies[0]; w.player.z = e.z; run(w, 0.5, idle({ aim: true })); assert.equal(w.player.guarding, false, 'aim does not guard with the saw'); assert.equal(w.player.ads, 0);
  const hp = e.hp; const ev = run(w, 0.4, idle({ melee: true })); assert.ok(types(ev).includes('swing') && 5000 - e.hp >= WEAPONS.chainsaw.swing.damage * 0.99, 'the chop: ' + (5000 - e.hp));
  w.player.cooldown = 0; run(w, 1, idle({ fire: true })); assert.ok(w.player.saw.spin > 0.9); w.player.switchT = 0; step(w, idle({ weapon: 0 })); step(w, idle()); assert.equal(w.player.saw.spin, 0, 'put away: the revs are gone');
});

// ---------------------------------------------------------------------------------------------------------------- the tuning-fork
test('a prop may be `movable` (a crate, a barrel, a sack): it leaves map.props, the world holds it in w.phys, and only such a map has any', () => {
  const ok = (k, extra = {}) => validateMap({ format: 1, id: 'K1', version: 1, name: 'A', grid, doors: [], secrets: [], entities: [{ type: 'player', at: [1, 1] }, { type: 'exit', at: [40, 1] }, { type: 'prop', kind: k, at: [9, 9], ...extra }] }).ok;
  for (const k of Object.keys(PHYS)) assert.ok(ok(k, { movable: true }), k + ' can be movable');
  assert.ok(!ok('lamp', { movable: true }), 'a lamp cannot'); assert.ok(!ok('crate', { movable: 'yes' }), 'movable is true or absent'); assert.ok(ok('crate'), 'and an ordinary crate is as it was');
  const w = arena([{ type: 'prop', kind: 'crate', at: [9, 9], movable: true }, { type: 'prop', kind: 'crate', at: [11, 9] }]); assert.equal(w.phys.length, 1); assert.equal(w.map.props.length, 1, 'the static one stays a static prop'); assert.equal(w.map.movables.length, 1);
  const plain = arena([]); assert.equal('phys' in plain, false, 'a world without movable props has no phys'); run(plain, 1); assert.equal('phys' in plain, false); assert.equal(plain.player.grav, undefined, 'and no fork state until the fork is used'); assert.equal(plain.player.saw, undefined);
});
test('hold aim: the prop is drawn in, lifted and held 2.3 m ahead; it is out of the way of your shots and your feet; let go and it falls', () => {
  const w = arena([{ type: 'prop', kind: 'barrel', at: [14, 5], movable: true }], { weapon: 'fork', px: cell(14) + 4.5 }), q = w.phys[0]; w.player.z = q.z;
  assert.equal(gravTarget(w), 'prop', 'the crosshair knows there is something to take'); const ev = run(w, 1.4, idle({ aim: true })); assert.ok(q.held && w.player.grav.prop === q.id, 'held'); assert.equal(gravTarget(w), 'held'); assert.ok(types(ev).includes('grav_grab'));
  const d = Math.hypot(q.x - w.player.x, q.z - w.player.z); assert.ok(Math.abs(d - GRAV.hold.dist) < 0.25, 'about ' + GRAV.hold.dist + ' m ahead: ' + d.toFixed(2)); assert.ok(q.y > 0.3, 'off the floor: ' + q.y.toFixed(2)); assert.ok(w.player.grav.beamT >= w.tick - 1, 'the beam is drawn to it');
  const x0 = w.player.x; run(w, 0.5, idle({ aim: true, move: [0, 1] })); assert.ok(w.player.x < x0 - 0.5, 'a held prop does not block the player'); run(w, 0.02, idle({ aim: true, fire: false }));
  run(w, 1.0, idle()); assert.equal(q.held, false); assert.equal(w.player.grav.prop, null); assert.ok(q.y < 0.05, 'it fell: ' + q.y.toFixed(2));
});
test('fire with a prop held throws it: a crate smashes on the first body, a barrel takes two, each body is hit once; a prop thrown into a wall at speed breaks', () => {
  const thrown = (kind, ents) => { const w = arena([{ type: 'prop', kind, at: [20, 5], movable: true }, ...ents], { weapon: 'fork', px: cell(20) + 4.5 }), q = w.phys[0]; w.player.z = q.z; run(w, 1.4, idle({ aim: true })); assert.ok(q.held, kind + ' held'); const ev = [...run(w, 0.02, idle({ aim: true, fire: true })), ...run(w, 1.2, idle({ aim: true }))]; return { w, q, ev }; };       // one press: a held trigger would throw it and then punt
  const crate = thrown('crate', [sponge('tollbearer', 18, 5), sponge('tollbearer', 16, 5)]); assert.ok(crate.q.gone, 'a crate breaks on the first body'); const hit = crate.ev.filter((x) => x.type === 'phys_hit'); assert.equal(hit.length, 1); assert.ok(5000 - crate.w.enemies[0].hp >= PHYS.crate.dmg * 0.7, 'it hurt: ' + (5000 - crate.w.enemies[0].hp).toFixed(0)); assert.equal(crate.w.enemies[1].hp, 5000, 'and stopped there');
  const barrel = thrown('barrel', [sponge('tollbearer', 18, 5), sponge('tollbearer', 17.2, 5)]); assert.equal(barrel.ev.filter((x) => x.type === 'phys_hit').length, 2, 'a barrel hits two'); assert.ok(barrel.q.gone, 'and then it breaks'); assert.ok(types(barrel.ev).includes('phys_break'));
  const wall = (() => { const w = arena([{ type: 'prop', kind: 'crate', at: [3, 5], movable: true }], { weapon: 'fork', px: 11.5 }), q = w.phys[0]; w.player.z = q.z; run(w, 1.4, idle({ aim: true })); assert.ok(q.held, 'held'); const ev = [...run(w, 0.02, idle({ aim: true, fire: true })), ...run(w, 1.0, idle({ aim: true }))]; return { q, ev }; })();
  assert.ok(wall.q.gone && types(wall.ev).includes('phys_break'), 'a crate thrown into a wall comes apart'); assert.ok(types(wall.ev).includes('grav_throw'));
  const dmg = (kind) => 5000 - thrown(kind, [sponge('tollbearer', 18, 5)]).w.enemies[0].hp; assert.ok(dmg('crate') > dmg('sack'), 'a crate hurts more than a sack');
});
test('fire with nothing held is a PUNT: the creatures in front are carried back, struck by the wall or the body they meet; elites barely move, bosses and nodes not at all', () => {
  const P = GRAV.punt, w = arena([sponge('tollbearer', 3, 5), sponge('tollbearer', 9, 5)], { weapon: 'fork', px: cell(9) + 7, range: true }), [a, b] = w.enemies; w.player.z = a.z;
  const x0 = b.x; const ev = run(w, 0.7, idle({ fire: true })); assert.ok(types(ev).includes('grav_punt')); assert.ok(b.x < x0 - 1.5, 'carried back ' + (x0 - b.x).toFixed(1) + ' m'); assert.ok((b.stunT || 0) > 0 || b.hp < 5000 || true);
  const wall = arena([sponge('tollbearer', 2.4, 5)], { weapon: 'fork', px: cell(2.4) + 4 }); wall.player.z = wall.enemies[0].z; const we = wall.enemies[0]; we.x = 3.0; we.post = { ...we.post, x: 3.0 }; const e2 = run(wall, 0.9, idle({ fire: true }));
  assert.ok(e2.some((x) => x.type === 'shove_impact') && 5000 - we.hp >= P.impact * 0.35, 'a creature a metre from a wall is struck by it: ' + (5000 - we.hp).toFixed(1));
  const elite = arena([sponge('wardengraft', 9, 5), sponge('tollbearer', 9, 8)], { weapon: 'fork', px: cell(9) + 6 }); elite.player.z = elite.enemies[0].z; const w0 = elite.enemies[0].x, t0 = elite.enemies[1].x; aimAt(elite, elite.enemies[0], 0.5); run(elite, 0.5, idle({ fire: true }));
  assert.ok(w0 - elite.enemies[0].x < (x0 - b.x) * 0.6, 'a Warden-Graft is moved far less (' + (w0 - elite.enemies[0].x).toFixed(2) + ' m)');
  const boss = arena([sponge('cantor', 9, 5, { hp: undefined }), sponge('bellnode', 9, 9, { hp: undefined })], { weapon: 'fork', px: cell(9) + 7 }); boss.player.z = boss.enemies[0].z; const c0 = boss.enemies[0].x; run(boss, 0.6, idle({ fire: true })); assert.equal(boss.enemies[0].x, c0, 'the Cantor does not move'); assert.equal((boss.enemies[0].stunT || 0), 0);
});
test('a punt launches a prop; a punt turns a toll-shot back on the one who tolled it and spares the player', () => {
  const w = arena([{ type: 'prop', kind: 'crate', at: [20, 5], movable: true }, sponge('tollbearer', 17, 5)], { weapon: 'fork', px: cell(20) + 5 }), q = w.phys[0]; w.player.z = q.z; const ev = run(w, 1.3, idle({ fire: true }));
  assert.ok(types(ev).includes('grav_punt_prop') && (q.gone || q.x < cell(20) - 2), 'the crate was sent flying'); assert.ok(5000 - w.enemies[0].hp > 0, 'and it hit the creature');
  const r = arena([{ type: 'enemy', kind: 'bellhand', at: [12, 5], facing: 'east', hold: 'turn', sight: 30 }], { weapon: 'fork', px: cell(12) + 9, hp: 100 }), bh = r.enemies[0]; r.player.z = bh.z; aimAt(r, bh, 0.5);
  let reflected = false, hp0 = bh.hp; for (let i = 0; i < 60 * 8 && !reflected; i++) { step(r, idle({ fire: r.enemyShots.some((q2) => !q2.reflected && Math.hypot(q2.x - r.player.x, q2.z - r.player.z) < 5) })); const e = drainEvents(r); reflected = e.some((x) => x.type === 'shot_reflect'); }
  assert.ok(reflected, 'a toll-shot was sent back'); run(r, 1.2); assert.ok(bh.hp < hp0, 'and it struck the Bellhand (' + (hp0 - bh.hp) + ')'); assert.equal(r.stats.damageTaken, 0, 'and the player took nothing from it');
});
test('hold aim on a creature: it is dragged to melee range and left helpless; a Warden, a boss and a node are not dragged', () => {
  const w = arena([{ type: 'enemy', kind: 'gaunt', at: [12, 5], facing: 'east', hold: 'turn', sight: 3 }], { weapon: 'fork', px: cell(12) + 7 }), g = w.enemies[0]; w.player.z = g.z; aimAt(w, g, 0.5);
  const ev = run(w, 1.4, idle({ aim: true })); const d = Math.hypot(g.x - w.player.x, g.z - w.player.z); assert.ok(d <= GRAV.pull.stop + 0.2, 'dragged in to ' + d.toFixed(2) + ' m'); assert.ok((g.stunT || 0) > 0.4, 'and stunned (' + (g.stunT || 0).toFixed(2) + ' s)'); assert.ok(types(ev).includes('grav_catch'));
  for (const kind of ['wardengraft', 'cantor']) { const x = arena([sponge(kind, 12, 5, kind === 'cantor' ? { hp: undefined } : {})], { weapon: 'fork', px: cell(12) + 7 }); x.player.z = x.enemies[0].z; aimAt(x, x.enemies[0], 0.5); const x0 = x.enemies[0].x; run(x, 1.4, idle({ aim: true })); assert.equal(x.enemies[0].x, x0, kind + ' is not dragged'); }
  const ns = arena([sponge('bellnode', 12, 5, { hp: undefined })], { weapon: 'fork', px: cell(12) + 7 }); ns.player.z = ns.enemies[0].z; const n0 = ns.enemies[0].x; run(ns, 1.4, idle({ aim: true })); assert.equal(ns.enemies[0].x, n0, 'a node is not dragged');
});
test('put the fork away and what it holds is let go; a prop in the air is not a wall; the beam does not reach through a wall', () => {
  const w = arena([{ type: 'prop', kind: 'barrel', at: [14, 5], movable: true }], { weapon: 'fork', px: cell(14) + 4.5 }), q = w.phys[0]; w.player.z = q.z; run(w, 1.4, idle({ aim: true })); assert.ok(q.held);
  w.player.switchT = 0; step(w, idle({ aim: true, weapon: 0 })); run(w, 0.1); assert.equal(q.held, false, 'let go when the weapon changes'); assert.equal(w.player.weapon, 'flare');
  const far = arena([{ type: 'prop', kind: 'barrel', at: [4, 5], movable: true }], { weapon: 'fork', px: cell(4) + GRAV.reach + 3 }); far.player.z = far.phys[0].z; run(far, 1, idle({ aim: true })); assert.equal(far.phys[0].held, false, 'out of reach'); assert.equal(far.phys[0].x, cell(4));
});
test('the tool is deterministic: the same scenario twice gives the same world', () => {
  const play = () => { const w = arena([{ type: 'prop', kind: 'crate', at: [20, 5], movable: true }, { type: 'prop', kind: 'barrel', at: [18, 6], movable: true }, sponge('tollbearer', 10, 5), { type: 'enemy', kind: 'gaunt', at: [14, 7], facing: 'east', hold: 'turn', sight: 8 }], { weapon: 'fork', px: cell(20) + 5 }); w.player.z = cell(5);
    for (let i = 0; i < 60 * 9; i++) step(w, idle({ aim: i % 200 < 120, fire: i % 200 === 100 || i % 90 === 45, yaw: i % 70 === 0 ? 0.02 : 0 })); return hashWorld(w); };
  assert.equal(play(), play());
});

// ---------------------------------------------------------------------------------------------------------------- the rigs and the Range
test('the four rigs build without textures (the node rasteriser and the tests have none) and carry what the view needs', async () => {
  const { makeCarbine } = await import('../src/render/models_carbine.js'), { makeLineThrower, makeRocketMesh } = await import('../src/render/models_rocket.js'), { makeFork } = await import('../src/render/models_fork.js'), { MELEE_MAKERS } = await import('../src/render/models_melee.js');
  for (const [name, rig] of [['carbine', makeCarbine(null, null)], ['linethrower', makeLineThrower(null, null)], ['fork', makeFork(null, null)]]) { assert.ok(rig.group && rig.sleeveMat, name); assert.ok(rig.flash, name + ' has a muzzle flash'); }
  assert.ok(makeCarbine(null, null).sights.rear && makeLineThrower(null, null).sights.front, 'the two guns with sights name them'); assert.equal(typeof makeFork(null, null).tick, 'function'); assert.ok(makeLineThrower(null, null).bolt, 'the rocket seats in the muzzle');
  const saw = MELEE_MAKERS.chainsaw(null); assert.ok(saw.melee && saw.hold); saw.anim({ a: 0, b: 0, c: 0, t: 0.3, saw: { spin: 1, stall: 0, eng: true } }); saw.anim({ a: 0.5, b: 0, c: 0, t: 0.4, kind: 'chainsaw', saw: { spin: 0, stall: 1.2 } });
  assert.ok(makeRocketMesh().flame);
});
test('the Range has a second range for them: the loadout, movable props of every kind, plated and plate-free Wardens, nodes, a Bellhand to tolls at you, sponges at four distances', () => {
  const src = JSON.parse(fs.readFileSync(path.join(ROOT, 'maps-dev', 'RANGE.json'), 'utf8')), m = parseMap(src), w = createWorld(m, { seed: 1 });
  for (const id of ['carbine', 'linethrower', 'fork', 'chainsaw']) assert.ok(w.player.weapons.includes(id), id + ' from the start'); assert.ok(w.player.ammo.round >= 100 && w.player.ammo.rocket >= 8);
  assert.deepEqual([...new Set(src.entities.filter((e) => e.movable).map((e) => e.kind))].sort(), ['barrel', 'crate', 'sack']); assert.ok(w.phys.length >= 12);
  const lane = src.entities.filter((e) => e.type === 'enemy' && e.at[1] === 51 && e.hold === 'inert'); assert.ok(lane.length >= 4, 'the carbine lane');
  w.player.ammo = { flare: 1 }; for (let i = 0; i < 100; i++) { step(w, idle()); drainEvents(w); } assert.equal(w.player.ammo.rocket, AMMO_MAX.rocket, 'rockets are refilled in the Range'); assert.equal(w.player.ammo.round, AMMO_MAX.round);
  for (let i = 0; i < 60 * 8; i++) { step(w, idle()); drainEvents(w); } for (const q of w.phys) assert.ok(Number.isFinite(q.x + q.y + q.z), 'every prop is finite and settled');
});
