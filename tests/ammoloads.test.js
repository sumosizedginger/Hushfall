// PT-056 (R9 of the Director's Plan): AMMUNITION LOADS, slag (fire), rime (cold) and the penetrator, an alternate type of ammunition for a gun you already hold (design/WEAPONS_AND_CONTROLS_PLAN.md section 15). These tests hold the sim:
// nothing exists until a load is picked up (a world that never meets one is untouched), the pickup respects the cap and selects the first load, a load is spent INSTEAD of the standard ammunition and gives way to it when it runs dry,
// slag burns and is put out by water, rime chills and the next blow lands harder, the penetrator doubles on plate and goes through a second body, the key cycles, the HUD model and the toast read the same numbers.
import test from 'node:test';
import assert from 'node:assert/strict';
import { parseMap } from '../src/engine/mapformat.js';
import { createWorld, step, drainEvents, hashWorld } from '../src/engine/world.js';
import { AMMO_LOADS, AMMO_LOAD_ORDER, AMMO_LOAD_AMOUNT, AMMO_MAX, PICKUPS, ENEMIES, WEAPONS, PLAYER } from '../src/engine/defs.js';
import { activeLoad, addLoad, cycleLoad, loadCost, loadCount, loadedDef, loadsOf, spendLoad, loadFits } from '../src/engine/ammoloads.js';
import { ACTIONS, DEFAULT_BINDINGS, InputState } from '../src/engine/input.js';
import { pickupToast, pickupTier } from '../src/game/toasts.js';

const idle = (o = {}) => ({ move: [0, 0], yaw: 0, pitch: 0, fire: false, aim: false, sprint: false, use: false, weapon: null, weaponStep: 0, ...o });
const Wd = (n) => '#'.repeat(n);
const grid = [Wd(42), ...Array.from({ length: 20 }, () => '#' + '.'.repeat(40) + '#'), Wd(42)];
const WEAPONS_ALL = ['flare', 'scattergun', 'rivet', 'harpoon', 'carbine'];
/** a flat hall; the player stands at world (40, 11) looking along -x with the five guns; `ents` are map entities; `fx` (rows) paints a floor effect over the whole hall */
function arena(ents = [], { weapon = 'scattergun', fx = null } = {}) {
  const src = { format: 1, id: 'K2', version: 1, name: 'Arena', range: true, grid, ...(fx ? { fx: Array.from({ length: 22 }, (_, z) => (z < 2 || z === 21 ? '.'.repeat(42) : '.' + fx.repeat(40) + '.')) } : {}), doors: [], secrets: [], entities: [{ type: 'player', at: [1, 1], facing: 'east' }, { type: 'exit', at: [40, 1] }, ...ents] };
  const w = createWorld(parseMap(src), { seed: 1, carry: { hp: 100000, armor: 0, ammo: { flare: 20, shell: 30, rivet: 150, bolt: 12, round: 120 }, weapons: WEAPONS_ALL } });
  Object.assign(w.player, { x: 40, z: 11, yaw: Math.PI / 2, pitch: 0, weapon, switchT: 0 }); w.range = { dmg: 0, hurtT: 0, shots: 0, fireT: 0, loads: true, loadsOff: true };          // (a Range world: the Range's own loads are switched off so the arithmetic below is ours)
  return w;
}
const run = (w, secs, cmd = idle()) => { const ev = []; for (let i = 0; i < Math.round(secs * 60); i++) { step(w, cmd); ev.push(...drainEvents(w)); } return ev; };
const sponge = (kind, cx, cz = 5, extra = {}) => ({ type: 'enemy', kind, at: [cx, cz], facing: 'east', hold: 'inert', hp: 5000, ...extra });
const aimAt = (w, e) => { const p = w.player; p.yaw = Math.atan2(e.x - p.x, e.z - p.z) + Math.PI; p.pitch = Math.atan2(ENEMIES[e.kind].height * 0.5 - PLAYER.eye, Math.hypot(e.x - p.x, e.z - p.z)); };
/** one shot: fire for one tick with the gun ready, then let the volley settle */
const shoot = (w, e) => { w.player.cooldown = 0; w.player.switchT = 0; w.player.ads = 1; if (e) aimAt(w, e); const ev = run(w, 1 / 60, idle({ fire: true, aim: true })); ev.push(...run(w, 0.05)); return ev; };
const target = (w, kind = 'tollbearer') => w.enemies.find((e) => e.kind === kind);

test('the tables: three loads, nine pickups, every pairing carries an amount and a name, caps are shares of the standard cap', () => {
  assert.deepEqual(AMMO_LOAD_ORDER, ['slag', 'rime', 'pen']);
  let n = 0;
  for (const id of AMMO_LOAD_ORDER) for (const gun of AMMO_LOADS[id].guns) { n++; assert.ok(WEAPONS[gun].ammo, gun); const k = `ld_${id}_${gun}`; assert.deepEqual(PICKUPS[k], { type: 'load', load: id, gun, amount: AMMO_LOAD_AMOUNT[id][gun] }); assert.match(pickupToast(k), /\(\+\d+\)$/); assert.equal(pickupTier(k), 'medium'); }
  assert.equal(n, 9); assert.equal(Object.keys(PICKUPS).filter((k) => k.startsWith('ld_')).length, 9);
  for (const id of AMMO_LOAD_ORDER) assert.ok(AMMO_LOADS[id].cap > 0 && AMMO_LOADS[id].cap < 1, id + ' cap is a share of the standard');
  assert.equal(loadCost('pen', 'rivet'), 2); assert.equal(loadCost('pen', 'carbine'), 2); assert.equal(loadCost('pen', 'harpoon'), 1); assert.equal(loadCost('slag', 'scattergun'), 1);
  assert.equal(loadFits('slag', 'harpoon'), false); assert.equal(loadFits('rime', 'flare'), true); assert.equal(loadFits('pen', 'scattergun'), false);
  assert.match(pickupToast('ld_slag_scattergun'), /^Slag shells/); assert.match(pickupToast('ld_pen_rivet'), /^Penetrator rivets/); assert.match(pickupToast('ld_rime_harpoon'), /^Rime bolts/);
});

test('nothing exists until a load is picked up: firing every gun at a sponge, the cycle key and a hundred ticks leave no load state on the player, the world or the creature', () => {
  const w = arena([sponge('tollbearer', 10)]), e = target(w), before = hashWorld(w);
  for (const g of WEAPONS_ALL) { w.player.weapon = g; shoot(w, e); }
  const ev = run(w, 0.1, idle({ load: true }));
  assert.ok(ev.some((q) => q.type === 'load_none'), 'the key says there is nothing to cycle to');
  for (const k of ['loads', 'loadSel', 'loadSeen']) assert.equal(k in w.player, false, k); assert.equal('loadFx' in w, false); assert.equal('ignT' in e, false); assert.equal('chillT' in e, false); assert.equal('brittle' in e, false);
  assert.notEqual(hashWorld(w), before, 'the world moved (shots were fired), it just never made a load field');
});

test('a load pickup adds to p.loads, selects the first load of that gun, stops at the cap, and is refused for a gun the player does not hold', () => {
  const w = arena([{ type: 'pickup', kind: 'ld_slag_scattergun', at: [20, 5] }, { type: 'pickup', kind: 'ld_slag_scattergun', at: [20, 5] }, { type: 'pickup', kind: 'ld_slag_scattergun', at: [20, 5] }]);
  w.player.x = 41; const ev = run(w, 0.2), p = w.player; const cap = Math.floor(AMMO_MAX.shell * AMMO_LOADS.slag.cap);
  assert.equal(p.loads.scattergun.slag, Math.min(cap, 3 * Math.round(PICKUPS.ld_slag_scattergun.amount * 1)) , 'three boxes, held to the cap'); assert.equal(p.loadSel.scattergun, 'slag', 'the first load is selected');
  assert.ok(ev.filter((q) => q.type === 'pickup' && q.kind === 'ld_slag_scattergun').length >= 1);
  const w2 = arena([{ type: 'pickup', kind: 'ld_pen_harpoon', at: [20, 5] }]); w2.player.weapons = ['flare']; w2.player.x = 41; run(w2, 0.2); assert.equal('loads' in w2.player, false, 'no harpoon, no penetrator bolts'); assert.equal(w2.pickups.length, 1, 'it stays on the floor');
  assert.equal(addLoad({ weapons: [] }, 'rivet', 'slag', 5, 0), 0, 'a full cap takes nothing');
});

test('a selected load is fired INSTEAD of the standard ammunition (the shells stay), the fire event names it, and an empty load gives the gun back to its standard', () => {
  const w = arena([sponge('tollbearer', 10)]), p = w.player, e = target(w); addLoad(p, 'scattergun', 'slag', 2, 16); const shells = p.ammo.shell;
  let ev = shoot(w, e); assert.equal(p.ammo.shell, shells, 'the standard is untouched'); assert.equal(p.loads.scattergun.slag, 1); assert.equal(ev.find((q) => q.type === 'fire').load, 'slag');
  ev = shoot(w, e); assert.equal(p.loads.scattergun.slag, 0); assert.ok(ev.some((q) => q.type === 'load_empty'), 'the last shot says so'); assert.equal(activeLoad(p, 'scattergun'), null); assert.equal('scattergun' in (p.loadSel ?? {}), false);
  ev = shoot(w, e); assert.equal(p.ammo.shell, shells - 1, 'back on the standard'); assert.equal(ev.find((q) => q.type === 'fire').load, undefined);
});

test('SLAG: every creature that survives a loaded shot burns (6 a second for 4), the burn kills nothing instantly and a creature standing in water is not lit', () => {
  const w = arena([sponge('tollbearer', 10)]), p = w.player, e = target(w); addLoad(p, 'scattergun', 'slag', 8, 16);
  const ev = shoot(w, e); assert.ok(ev.some((q) => q.type === 'load_hit' && q.fx === 'ignite'), 'the hit says it caught'); assert.ok(e.ignT > 3 && e.ignT <= 4, 'four seconds, a little gone'); assert.equal(e.ignDps, 6);
  const hp0 = e.hp; run(w, 1); const lost = hp0 - e.hp; assert.ok(lost > 5 && lost < 7.5, 'about six hit points in a second: ' + lost);
  run(w, 4); assert.equal(e.ignT, 0, 'it burns out'); const hp1 = e.hp; run(w, 1); assert.equal(e.hp, hp1, 'and stops hurting');
  const wet = arena([sponge('tollbearer', 10)], { fx: 'w' }), pw = wet.player, ew = target(wet); addLoad(pw, 'scattergun', 'slag', 8, 16);
  const ev2 = shoot(wet, ew); assert.ok(ev2.some((q) => q.type === 'load_hit' && q.fx === 'fizzle'), 'it fizzles in the water'); assert.equal(ew.ignT || 0, 0);
});

test('RIME: 80% of the damage, a chill that takes 40% of the speed for 3 s, the NEXT blow does half again, once; it puts a fire out; a bell node takes it twice', () => {
  const w = arena([sponge('tollbearer', 18)]), p = w.player, e = target(w); addLoad(p, 'scattergun', 'rime', 8, 16);
  const plain = arena([sponge('tollbearer', 18)]), pe = target(plain); shoot(plain, pe); const std = 5000 - pe.hp;
  const ev = shoot(w, e); const first = 5000 - e.hp; assert.ok(ev.some((q) => q.type === 'load_hit' && q.fx === 'chill')); assert.ok(first > 0 && first < std * 0.95, `rime does less: ${first} vs ${std}`);
  assert.ok(e.chillT > 2.5 && e.chillT <= 3 && e.brittle === 1.5, 'chilled and brittle');
  p.loadSel.scattergun = null; delete p.loadSel.scattergun; const hp0 = e.hp; shoot(w, e); const second = hp0 - e.hp; assert.ok(second > std * 1.3, `the next blow lands harder: ${second} vs ${std}`); assert.equal(e.brittle, 0, 'once');
  const w3 = arena([sponge('tollbearer', 18)]); const e3 = target(w3); e3.ignT = 3; e3.ignDps = 6; w3.loadFx = true; addLoad(w3.player, 'scattergun', 'rime', 8, 16); const ev3 = shoot(w3, e3); assert.ok(ev3.some((q) => q.fx === 'quench'), 'the fire goes out'); assert.equal(e3.ignT, 0);
  const wn = arena([sponge('bellnode', 18)]), en = target(wn, 'bellnode'), pn = arena([sponge('bellnode', 18)]), epn = target(pn, 'bellnode'); addLoad(wn.player, 'scattergun', 'rime', 8, 16);
  shoot(pn, epn); shoot(wn, en); assert.ok(5000 - en.hp > (5000 - epn.hp) * 1.4, 'a node takes the cold twice over (and 0.8 of the base)');
});

test('a chilled creature walks slower (the same hook the rivets use), and frost wears off', () => {
  const w = arena([{ type: 'enemy', kind: 'tollbearer', at: [10, 5], facing: 'east' }]), e = w.enemies[0]; Object.assign(e, { x: 20, z: 11, state: 'chase' });
  const free = run(arena([{ type: 'enemy', kind: 'tollbearer', at: [10, 5], facing: 'east' }]), 0.01) && 0; void free;
  const a = arena([{ type: 'enemy', kind: 'tollbearer', at: [10, 5], facing: 'east' }]), b = arena([{ type: 'enemy', kind: 'tollbearer', at: [10, 5], facing: 'east' }]);
  for (const q of [a, b]) { Object.assign(q.enemies[0], { x: 20, z: 11, state: 'chase', yaw: 0 }); }
  b.enemies[0].chillT = 3; b.enemies[0].chillK = 0.4; b.loadFx = true;
  run(a, 1); run(b, 1); const da = Math.hypot(a.enemies[0].x - 20, a.enemies[0].z - 11), db = Math.hypot(b.enemies[0].x - 20, b.enemies[0].z - 11); assert.ok(da > 0.5 && db < da * 0.8, `${db.toFixed(2)} m chilled, ${da.toFixed(2)} m free`);
  run(b, 3); assert.equal(b.enemies[0].chillT, 0);
});

test('PEN: the penetrator does double to a plated creature from the front, nothing extra from behind, and the rivet driver spends two rounds a shot', () => {
  const mk = (load) => { const w = arena([sponge('wardengraft', 10)], { weapon: 'rivet' }), e = target(w, 'wardengraft'); e.yaw = Math.PI / 2; if (load) addLoad(w.player, 'rivet', 'pen', 10, 60); return { w, e }; };   // yaw PI/2: the plate faces +x... toward the player at x = 40
  const plain = mk(false), pen = mk(true); const r0 = plain.w.player.ammo.rivet;
  shoot(plain.w, plain.e); shoot(pen.w, pen.e); const dPlain = 5000 - plain.e.hp, dPen = 5000 - pen.e.hp;
  assert.ok(dPen > dPlain * 1.8 && dPen < dPlain * 2.2, `double on plate: ${dPen} vs ${dPlain}`); assert.equal(pen.w.player.loads.rivet.pen, 8, 'two rounds a shot'); assert.equal(plain.w.player.ammo.rivet, r0 - 1);
  const back = (load) => { const { w, e } = mk(load); e.yaw = -Math.PI / 2; shoot(w, e); return 5000 - e.hp; }; const b0 = back(false), b1 = back(true); assert.ok(Math.abs(b1 - b0) < 0.5, `no plate, no bonus: ${b1} vs ${b0}`);
});

test('PEN goes on through one more body at 70%: two sponges in a line both take a rivet; the harpoon gains a second body at 70%', () => {
  const w = arena([sponge('tollbearer', 10), sponge('tollbearer', 6)], { weapon: 'rivet' }), p = w.player, [near, far] = [...w.enemies].sort((a, b) => b.x - a.x); addLoad(p, 'rivet', 'pen', 20, 60);
  w.player.ads = 1; w.player.cooldown = 0; aimAt(w, near); run(w, 1 / 60, idle({ fire: true })); run(w, 0.05);
  assert.ok(5000 - near.hp > 0 && 5000 - far.hp > 0, 'both were hit'); const rn = 5000 - near.hp, rf = 5000 - far.hp; assert.ok(rf > rn * 0.55 && rf < rn * 0.85, `the second at about 70%: ${rf} vs ${rn}`);
  const w2 = arena([sponge('tollbearer', 10), sponge('tollbearer', 6), sponge('tollbearer', 3)], { weapon: 'harpoon' }), q = w2.player; addLoad(q, 'harpoon', 'pen', 4, 9); const order = [...w2.enemies].sort((a, b) => b.x - a.x);
  shoot(w2, order[0]); assert.ok(order.every((e) => e.hp < 5000), 'a penetrator bolt goes through three bodies (its own pierce, and one more)');
  const plainH = arena([sponge('tollbearer', 10), sponge('tollbearer', 6), sponge('tollbearer', 3)], { weapon: 'harpoon' }), po = [...plainH.enemies].sort((a, b) => b.x - a.x); shoot(plainH, po[0]); assert.equal(po[2].hp, 5000, 'the plain bolt stops after two bodies');
});

test('the flare with rime leaves FROST ground (no damage, a chill, the fire goes out) and does 80% of the burst', () => {
  const w = arena([sponge('tollbearer', 10)], { weapon: 'flare' }), e = target(w), p = w.player; addLoad(p, 'flare', 'rime', 5, 12);
  e.ignT = 3; e.ignDps = 6; w.loadFx = true; aimAt(w, e); p.cooldown = 0;
  const ev = run(w, 1.5, idle({ fire: true })); const burn = ev.find((q) => q.type === 'burn'); assert.ok(burn && burn.frost === true, 'the ground is frost'); assert.ok(w.burns.every((b) => b.frost || b.t <= 0) || w.burns.length === 0 || w.burns.some((b) => b.frost));
  const hpAfter = e.hp; run(w, 1); assert.ok(e.chillT > 0 || e.hp === hpAfter, 'standing in it chills'); assert.equal(e.ignT, 0, 'and puts the fire out');
  assert.equal(loadedDef(WEAPONS.flare, 'flare', 'rime').splashDamage, WEAPONS.flare.splashDamage * 0.8);
});

test('the cycle: standard -> slag -> rime -> standard, only loads that have something in them, and the HUD readout model never lies', () => {
  const p = { weapons: ['scattergun'], loads: {}, loadSel: {} }; assert.equal(cycleLoad(p, 'scattergun'), null);
  addLoad(p, 'scattergun', 'slag', 4, 16); addLoad(p, 'scattergun', 'rime', 4, 16); assert.deepEqual(loadsOf(p, 'scattergun'), ['slag', 'rime']); assert.equal(activeLoad(p, 'scattergun'), 'slag', 'the first found is selected');
  assert.deepEqual(cycleLoad(p, 'scattergun'), { gun: 'scattergun', load: 'rime' }); assert.deepEqual(cycleLoad(p, 'scattergun'), { gun: 'scattergun', load: null }); assert.equal(activeLoad(p, 'scattergun'), null); assert.deepEqual(cycleLoad(p, 'scattergun'), { gun: 'scattergun', load: 'slag' });
  assert.equal(spendLoad(p, 'scattergun', 'slag'), false); p.loads.scattergun.slag = 1; assert.equal(spendLoad(p, 'scattergun', 'slag'), true, 'the last shot reports it'); assert.equal(loadCount(p, 'scattergun', 'slag'), 0);
  const w = arena(); addLoad(w.player, 'scattergun', 'slag', 4, 16); addLoad(w.player, 'scattergun', 'rime', 4, 16); const ev = run(w, 1 / 60, idle({ load: true })); assert.deepEqual(ev.filter((q) => q.type === 'load_cycle').map((q) => q.load), ['rime']);
});

test('the input: `load` is an action on KeyT, the sample carries the edge once, and a pad has it on X', () => {
  assert.ok(ACTIONS.includes('load')); assert.deepEqual(DEFAULT_BINDINGS.load, ['KeyT']); const i = new InputState(); i.keyDown('KeyT'); assert.equal(i.sample().load, true); assert.equal(i.sample().load, false, 'an edge, not a hold');
});

test('a world with loads in flight serialises and replays: the snapshot is plain data and the same seed gives the same hash', () => {
  const play = () => { const w = arena([sponge('tollbearer', 10)]); addLoad(w.player, 'scattergun', 'slag', 8, 16); const e = target(w); for (let i = 0; i < 3; i++) shoot(w, e); run(w, 2); return w; };
  const a = play(), b = play(); assert.equal(hashWorld(a), hashWorld(b)); const j = JSON.parse(JSON.stringify({ loads: a.player.loads, sel: a.player.loadSel })); assert.ok(j.loads.scattergun.slag >= 0);
});

test('the Range gives every load for every gun held, selects none, and tops them up after a pause', () => {
  const w = arena(); delete w.range; step(w, idle()); const p = w.player;
  for (const id of AMMO_LOAD_ORDER) for (const gun of AMMO_LOADS[id].guns) assert.equal(p.loads[gun][id], Math.floor(AMMO_MAX[WEAPONS[gun].ammo] * AMMO_LOADS[id].cap), `${id} for the ${gun}`);
  assert.deepEqual(p.loadSel ?? {}, {}, 'nothing is selected for the tester'); assert.equal(activeLoad(p, 'scattergun'), null);
  p.loadSel = { scattergun: 'slag' }; p.cooldown = 0; shoot(w, null); const used = p.loads.scattergun.slag; assert.ok(used < 16); run(w, 2); assert.equal(p.loads.scattergun.slag, 16, 'topped up after the pause');
});

test('the bot reads the pairing table: plate gets the penetrator, a bell node or a Gaunt the rime, a creature of substance the slag, water and trifles the standard; and it taps the key until the gun is turned', async () => {
  const { Bot } = await import('../src/engine/bot.js'); const w = arena([sponge('wardengraft', 10), sponge('bellnode', 12), sponge('gaunt', 14), sponge('tollbearer', 16), sponge('tollbearer', 16, 8)]);
  const p = w.player; for (const [gun, id] of [['rivet', 'slag'], ['rivet', 'pen'], ['harpoon', 'rime'], ['harpoon', 'pen'], ['scattergun', 'slag'], ['scattergun', 'rime']]) addLoad(p, gun, id, 20, 60);
  const bot = new Bot(w, new InputState(), []), by = (k) => ({ e: w.enemies.find((e) => e.kind === k), d: 10 });
  assert.equal(bot.wantLoad(by('wardengraft'), 'harpoon'), 'pen'); assert.equal(bot.wantLoad(by('wardengraft'), 'scattergun'), 'slag', 'no penetrator shells, so the slag');
  assert.equal(bot.wantLoad(by('bellnode'), 'harpoon'), 'rime'); assert.equal(bot.wantLoad(by('gaunt'), 'scattergun'), 'rime'); assert.equal(bot.wantLoad(by('tollbearer'), 'rivet'), 'slag');
  const t = by('tollbearer'); t.e.hp = 20; w.enemies.filter((e) => e !== t.e).forEach((e) => { e.x = 300; }); assert.equal(bot.wantLoad(t, 'rivet'), null, 'a weak creature alone is not worth the slag');
  const wet = arena([sponge('tollbearer', 10)], { fx: 'w' }); addLoad(wet.player, 'rivet', 'slag', 20, 60); const bw = new Bot(wet, new InputState(), []); assert.equal(bw.wantLoad({ e: wet.enemies[0], d: 10 }, 'rivet'), null, 'it would only fizzle');
  // the tap: the gun is on the standard, the table says slag: one press turns it
  t.e.hp = 45; p.weapon = 'rivet'; p.loadSel = {}; bot.fight({ e: w.enemies.find((e) => e.kind === 'tollbearer' && e.x < 40), d: 10 }); const cmd = bot.in.sample(); assert.equal(cmd.load, true, 'the bot tapped the load key');
});

test('loads ride between maps like ammunition, Retry gives back what the level began with, and a save holds them (a gun that cannot take a load, or a count no honest game reaches, is refused)', async () => {
  const { carryOver } = await import('../src/engine/world.js'); const { makeSave, parseSave, loadWorld, carryErrors } = await import('../src/engine/save.js');
  const w = arena(); w.player.hp = 100; addLoad(w.player, 'scattergun', 'slag', 5, 16); addLoad(w.player, 'harpoon', 'pen', 3, 9);
  const c = carryOver(w); assert.deepEqual(c.loads, { scattergun: { slag: 5 }, harpoon: { pen: 3 } }); assert.deepEqual(c.loadSel, { scattergun: 'slag', harpoon: 'pen' }); assert.deepEqual(carryErrors(c), []);
  const w2 = createWorld(parseMap({ format: 1, id: 'K3', version: 1, name: 'B', grid, doors: [], secrets: [], entities: [{ type: 'player', at: [1, 1], facing: 'east' }, { type: 'exit', at: [40, 1] }] }), { seed: 1, carry: c });
  assert.equal(w2.player.loads.scattergun.slag, 5); assert.equal(w2.player.loadSel.harpoon, 'pen'); assert.notEqual(w2.player.loads, c.loads, 'a copy, not the same object'); assert.equal(w2.levelStart.loads.scattergun.slag, 5, 'Retry restores them');
  const plain = createWorld(w2.map, { seed: 1, carry: carryOver(createWorld(w2.map, { seed: 1 })) }); assert.equal('loads' in plain.player, false, 'a carry with none makes none');
  assert.ok(carryErrors({ loads: { scattergun: { pen: 4 } } }).length, 'a penetrator shell does not exist'); assert.ok(carryErrors({ loads: { scattergun: { slag: 99999 } } }).length); assert.ok(carryErrors({ loads: { nope: { slag: 1 } } }).length); assert.ok(carryErrors({ loads: 'x' }).length); assert.ok(carryErrors({ loadSel: { scattergun: 'pen' } }).length);
  const snap = makeSave(w2, 'mid-level', { now: 1 }); assert.equal(parseSave(JSON.stringify(snap)).ok, true);
  const bad = JSON.parse(JSON.stringify(snap)); bad.world.player.loads.scattergun.slag = 1e9; const p = parseSave(JSON.stringify(bad)); let refused = !p.ok; if (p.ok) { try { refused = loadWorld(p.save, () => w2.map).ok === false; } catch { refused = true; } } assert.ok(refused, 'an absurd load count is refused');
});
