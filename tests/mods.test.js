// PT-057 (R9 of the Director's Plan): WEAPON MODS, a permanent upgrade to one gun found on a map (design/WEAPONS_AND_CONTROLS_PLAN.md section 16). The sim: nothing exists until a mod is found; each mod changes the gun the way its card says (both barrels, a rate that climbs, two more jumps,
// a bolt that pins, ground that burns longer, a wider burst); tier two (bought at the Locker, `w.upgrades.mods2`) does its one thing more; mods ride between maps, are saved and are refused when they are not known.
import test from 'node:test';
import assert from 'node:assert/strict';
import { parseMap } from '../src/engine/mapformat.js';
import { createWorld, step, drainEvents } from '../src/engine/world.js';
import { MODS, MOD_ORDER, PICKUPS, WEAPONS, ENEMIES, PLAYER } from '../src/engine/defs.js';
import { addMod, modDef, modsOf, modTier, ownsMod, modMarks } from '../src/engine/mods.js';
import { pickupToast, pickupTier, pickupCard } from '../src/game/toasts.js';
import { pickupUse } from '../src/game/itemhelp.js';

const idle = (o = {}) => ({ move: [0, 0], yaw: 0, pitch: 0, fire: false, aim: false, sprint: false, use: false, weapon: null, weaponStep: 0, ...o });
const Wd = (n) => '#'.repeat(n);
const grid = [Wd(42), ...Array.from({ length: 20 }, () => '#' + '.'.repeat(40) + '#'), Wd(42)];
function arena(ents = [], { weapon = 'scattergun', upgrades = null } = {}) {
  const src = { format: 1, id: 'K4', version: 1, name: 'Arena', range: true, grid, doors: [], secrets: [], entities: [{ type: 'player', at: [1, 1], facing: 'east' }, { type: 'exit', at: [40, 1] }, ...ents] };
  const w = createWorld(parseMap(src), { seed: 1, carry: { hp: 100, armor: 0, ammo: { flare: 20, shell: 30, rivet: 150, bolt: 12, round: 100, cell: 80, rocket: 8 }, weapons: ['flare', 'scattergun', 'rivet', 'harpoon', 'arc', 'carbine', 'linethrower', 'mortar'], ...(upgrades ? { upgrades } : {}) } });
  Object.assign(w.player, { x: 40, z: 11, yaw: Math.PI / 2, pitch: 0, weapon, switchT: 0 }); w.range = { dmg: 0, hurtT: 0, shots: 0, fireT: 0, loads: true, loadsOff: true };
  return w;
}
const run = (w, secs, cmd = idle()) => { const ev = []; for (let i = 0; i < Math.round(secs * 60); i++) { step(w, cmd); ev.push(...drainEvents(w)); } return ev; };
const sponge = (kind, cx, cz = 5, extra = {}) => ({ type: 'enemy', kind, at: [cx, cz], facing: 'east', hold: 'inert', hp: 5000, ...extra });
const aimAt = (w, e) => { const p = w.player; p.yaw = Math.atan2(e.x - p.x, e.z - p.z) + Math.PI; p.pitch = Math.atan2(ENEMIES[e.kind].height * 0.5 - PLAYER.eye, Math.hypot(e.x - p.x, e.z - p.z)); };
const shoot = (w, e) => { w.player.cooldown = 0; w.player.switchT = 0; w.player.ads = 1; if (e) aimAt(w, e); const ev = run(w, 1 / 60, idle({ fire: true, aim: true })); ev.push(...run(w, 0.05)); return ev; };
const ctx = (w, gun = 'scattergun') => ({ tier: (id) => modTier(w, id), ammo: w.player.ammo[WEAPONS[gun].ammo], spin: w.player.spinT });

test('the tables: six mods, each for a gun that exists, each with a tier two and a cost; six pickups named by the mod; a mod is a MAJOR pickup with a card', () => {
  assert.equal(MOD_ORDER.length, 6);
  for (const id of MOD_ORDER) { const M = MODS[id]; assert.ok(WEAPONS[M.gun], id); assert.ok(M.tier2.cost >= 8 && M.tier2.line && M.line && M.mark, id); assert.deepEqual(PICKUPS['mod_' + id], { type: 'mod', mod: id }); assert.equal(pickupToast('mod_' + id), M.name); assert.equal(pickupTier('mod_' + id), 'major'); const c = pickupCard('mod_' + id); assert.ok(c.title === M.name && c.line.includes(WEAPONS[M.gun].name), id); assert.match(pickupUse('mod_' + id), new RegExp(String(M.tier2.cost))); }
  assert.deepEqual(MOD_ORDER.map((id) => MODS[id].gun), ['scattergun', 'rivet', 'arc', 'harpoon', 'flare', 'mortar']);
});

test('nothing exists until a mod is found: no p.mods, the gun definition comes back as the SAME object, no tier', () => {
  const w = arena([sponge('tollbearer', 18)]); run(w, 0.1); shoot(w, w.enemies[0]); assert.equal('mods' in w.player, false); assert.equal('spinT' in w.player, false);
  assert.equal(modDef(WEAPONS.scattergun, 'scattergun', w.player, ctx(w)), WEAPONS.scattergun); assert.deepEqual(modsOf(w.player, 'scattergun'), []); assert.equal(modMarks(w.player, w, 'scattergun'), '');
});

test('a mod pickup is taken once, becomes a permanent mark on the player and says weapon_pickup; a second of the same stays on the floor', () => {
  const w = arena([{ type: 'pickup', kind: 'mod_doublebarrel', at: [20, 5] }, { type: 'pickup', kind: 'mod_doublebarrel', at: [20, 5] }]); w.player.x = 41;
  const ev = run(w, 0.2); assert.deepEqual(w.player.mods, { doublebarrel: 1 }); assert.equal(ev.filter((e) => e.type === 'weapon_pickup' && e.kind === 'mod_doublebarrel').length, 1); assert.equal(w.pickups.length, 1, 'the second stays'); assert.ok(ownsMod(w.player, 'doublebarrel'));
  assert.equal(addMod(w.player, 'doublebarrel'), false); assert.equal(addMod(w.player, 'nope'), false);
});

test('DOUBLE BARREL: both barrels (twice the pellets, two shells, a longer cycle); one shell left is one barrel as ever; tier two shortens the cycle', () => {
  const w = arena([sponge('tollbearer', 18)]), e = w.enemies[0]; addMod(w.player, 'doublebarrel');
  const d = modDef(WEAPONS.scattergun, 'scattergun', w.player, ctx(w)); assert.equal(d.pellets, 18); assert.equal(d.cost, 2); assert.equal(d.cooldown, 1.3); assert.equal(WEAPONS.scattergun.pellets, 9, 'the table is never touched');
  const plain = arena([sponge('tollbearer', 18)]), pe = plain.enemies[0]; shoot(plain, pe); shoot(w, e); const dp = 5000 - pe.hp, dd = 5000 - e.hp; assert.ok(dd > dp * 1.8 && dd < dp * 2.2, `twice the pellets: ${dd} vs ${dp}`);
  assert.equal(w.player.ammo.shell, 28, 'two shells'); assert.ok(w.player.cooldown > 1.2, 'the cycle is longer');
  w.player.ammo.shell = 1; const d1 = modDef(WEAPONS.scattergun, 'scattergun', w.player, ctx(w)); assert.equal(d1, WEAPONS.scattergun, 'one shell, one barrel'); const hp0 = e.hp; shoot(w, e); assert.ok(hp0 - e.hp > 0, 'the one barrel fired');
  const w2 = arena([], { upgrades: { ammo: 0, armor: 0, mods2: { doublebarrel: true } } }); addMod(w2.player, 'doublebarrel'); assert.equal(modTier(w2, 'doublebarrel'), 2); assert.equal(modDef(WEAPONS.scattergun, 'scattergun', w2.player, ctx(w2)).cooldown, MODS.doublebarrel.tier2.cooldown); assert.equal(modMarks(w2.player, w2, 'scattergun'), 'DB+');
});

test('SPIN-UP: the clock climbs while the trigger is held and runs down after; at full speed the cycle is shorter and the spread tighter; tier two stops the heat bloom', () => {
  const w = arena([sponge('tollbearer', 18)], { weapon: 'rivet' }); addMod(w.player, 'spinup'); const e = w.enemies[0]; aimAt(w, e); w.player.ads = 0;
  run(w, 0.5, idle({ fire: true })); const mid = w.player.spinT; assert.ok(mid > 0.4 && mid <= 0.51, 'the clock: ' + mid); run(w, 1.5, idle({ fire: true })); assert.ok(w.player.spinT > 1.99, 'it stops at the top'); run(w, 1); assert.ok(w.player.spinT < 0.1, 'and runs down');
  const slow = modDef(WEAPONS.rivet, 'rivet', w.player, { ...ctx(w, 'rivet'), spin: 0 }), fast = modDef(WEAPONS.rivet, 'rivet', w.player, { ...ctx(w, 'rivet'), spin: 1.2 });
  assert.equal(slow.cooldown, WEAPONS.rivet.cooldown); assert.ok(Math.abs(fast.cooldown - WEAPONS.rivet.cooldown * MODS.spinup.rate) < 1e-9); assert.ok(fast.spread.hip < WEAPONS.rivet.spread.hip && fast.spread.ads < WEAPONS.rivet.spread.ads); assert.equal(fast.heatCone, WEAPONS.rivet.heatCone);
  const w2 = arena([], { weapon: 'rivet', upgrades: { ammo: 0, armor: 0, mods2: { spinup: true } } }); addMod(w2.player, 'spinup'); assert.equal(modDef(WEAPONS.rivet, 'rivet', w2.player, ctx(w2, 'rivet')).heatCone, 0);
  const shots = (m) => { const q = arena([sponge('tollbearer', 18)], { weapon: 'rivet' }); if (m) addMod(q.player, 'spinup'); aimAt(q, q.enemies[0]); const s0 = q.stats.shots; run(q, 3, idle({ fire: true })); return q.stats.shots - s0; };
  assert.ok(shots(true) > shots(false) * 1.2, 'more rivets in three seconds with the mod: ' + shots(true) + ' vs ' + shots(false));
});

test('LONG CHAIN: the lamp chains two more jumps (the tap and the charge), tier two one more', () => {
  const w = arena([], { weapon: 'arc' }); addMod(w.player, 'longchain'); const d = modDef(WEAPONS.arc, 'arc', w.player, ctx(w, 'arc')); assert.equal(d.chain, WEAPONS.arc.chain + 2); assert.equal(d.charge.chain, WEAPONS.arc.charge.chain + 2); assert.equal(WEAPONS.arc.chain, 3);
  const w2 = arena([], { weapon: 'arc', upgrades: { ammo: 0, armor: 0, mods2: { longchain: true } } }); addMod(w2.player, 'longchain'); assert.equal(modDef(WEAPONS.arc, 'arc', w2.player, ctx(w2, 'arc')).chain, WEAPONS.arc.chain + 3);
  const reach = (m) => { const q = arena([sponge('tollbearer', 18, 5), sponge('tollbearer', 17, 7), sponge('tollbearer', 17, 3), sponge('tollbearer', 16, 5), sponge('tollbearer', 16, 7), sponge('tollbearer', 16, 3), sponge('tollbearer', 15, 5)], { weapon: 'arc' }); if (m) addMod(q.player, 'longchain'); const first = [...q.enemies].sort((a, b) => b.x - a.x)[0]; aimAt(q, first); q.player.cooldown = 0; run(q, 1 / 60, idle({ fire: true })); run(q, 0.1); return q.enemies.filter((e) => e.hp < 5000).length; };
  assert.ok(reach(true) > reach(false), `the arc reaches more bodies: ${reach(true)} vs ${reach(false)}`);
});

test('BARBED BOLT: pins a lunging Gaunt and staggers a Bulwark; an idle creature is only hurt; tier two pins longer and the wound bleeds', () => {
  const mk = (kind, tier2) => { const w = arena([sponge(kind, 18)], { weapon: 'harpoon', ...(tier2 ? { upgrades: { ammo: 0, armor: 0, mods2: { barbed: true } } } : {}) }); addMod(w.player, 'barbed'); return { w, e: w.enemies[0] }; };
  const g = mk('gaunt'); g.e.lungeT = 0.1; shoot(g.w, g.e); assert.ok(g.e.stunT >= 1.1, 'the lunge is pinned: ' + g.e.stunT); assert.equal(g.e.lungeT, -1);
  const idleG = mk('gaunt'); shoot(idleG.w, idleG.e); assert.ok(!(idleG.e.stunT > 0.5), 'a gaunt not lunging is not pinned');
  const b = mk('bulwark'); b.e.attackT = -1; shoot(b.w, b.e); assert.ok(b.e.stunT >= 1.1 || b.e.hp < 5000, 'a Bulwark is staggered by the bolt that goes through its shell');
  const t2 = mk('gaunt', true); t2.e.lungeT = 0.1; shoot(t2.w, t2.e); assert.ok(t2.e.stunT >= 1.7, 'tier two pins longer'); assert.equal(t2.e.bleedDps, 5); const h = t2.e.hp; run(t2.w, 3.2); assert.ok(h - t2.e.hp > 12, 'it bleeds: ' + (h - t2.e.hp)); assert.equal(t2.e.bleedT, 0);
});

test('PHOSPHOR: the flare ground burns twice as long; tier two widens it. AIRBURST: the burst is wider, tier two wider again', () => {
  const burn = (mods2) => { const w = arena([], { weapon: 'flare', ...(mods2 ? { upgrades: { ammo: 0, armor: 0, mods2 } } : {}) }); addMod(w.player, 'phosphor'); w.player.pitch = 0.0; w.player.cooldown = 0; run(w, 1 / 60, idle({ fire: true })); run(w, 1.2); return w.burns[0]; };
  const plain = (() => { const w = arena([], { weapon: 'flare' }); w.player.cooldown = 0; run(w, 1 / 60, idle({ fire: true })); run(w, 1.2); return w.burns[0]; })();
  const b1 = burn(null), b2 = burn({ phosphor: true }); assert.ok(plain && b1 && b2, 'a flare fired level lands on the floor within a second'); assert.equal(b1.max, plain.max * 2); assert.ok(Math.abs(b2.r - plain.r * MODS.phosphor.tier2.r) < 1e-9);
  const w = arena([], { weapon: 'mortar' }); addMod(w.player, 'airburst'); assert.equal(modDef(WEAPONS.mortar, 'mortar', w.player, ctx(w, 'mortar')).splash, WEAPONS.mortar.splash * 1.2);
  const w2 = arena([], { weapon: 'mortar', upgrades: { ammo: 0, armor: 0, mods2: { airburst: true } } }); addMod(w2.player, 'airburst'); assert.equal(modDef(WEAPONS.mortar, 'mortar', w2.player, ctx(w2, 'mortar')).splash, WEAPONS.mortar.splash * 1.4);
});

test('mods ride between maps and Retry, the save holds them, and an unknown mod or a mod that is not 1 is refused', async () => {
  const { carryOver } = await import('../src/engine/world.js'); const { makeSave, parseSave, carryErrors, loadWorld } = await import('../src/engine/save.js');
  const w = arena(); w.player.hp = 100; addMod(w.player, 'barbed'); addMod(w.player, 'spinup'); const c = carryOver(w); assert.deepEqual(c.mods, { barbed: 1, spinup: 1 }); assert.deepEqual(carryErrors(c), []);
  const w2 = createWorld(w.map, { seed: 1, carry: c }); assert.deepEqual(w2.player.mods, { barbed: 1, spinup: 1 }); assert.notEqual(w2.player.mods, c.mods); assert.deepEqual(w2.levelStart.mods, { barbed: 1, spinup: 1 });
  assert.equal('mods' in createWorld(w.map, { seed: 1, carry: carryOver(createWorld(w.map, { seed: 1 })) }).player, false);
  assert.ok(carryErrors({ mods: { nope: 1 } }).length); assert.ok(carryErrors({ mods: { barbed: 7 } }).length); assert.ok(carryErrors({ mods: [1] }).length);
  const snap = makeSave(w2, 'mid-level', { now: 1 }); assert.equal(parseSave(JSON.stringify(snap)).ok, true);
  const bad = JSON.parse(JSON.stringify(snap)); bad.world.player.mods.nope = 1; const p = parseSave(JSON.stringify(bad)); let refused = !p.ok; if (p.ok) { try { refused = loadWorld(p.save, () => w2.map).ok === false; } catch { refused = true; } } assert.ok(refused, 'an unknown mod is refused');
});

test('the Locker: tier two of a mod you carry costs its salvage; a mod not found, one already bought, an unknown id and too little salvage are refused; a progress that never bought one is exactly what it was', async () => {
  const { buyMod, modRows, sanitizeUpgrades, newProgress, sanitizeProgress } = await import('../src/engine/progress.js');
  const p0 = { ...newProgress(), salvage: 10 }; assert.deepEqual(sanitizeUpgrades(p0.upgrades), { ammo: 0, armor: 0 }, 'no mods2 key until one is bought');
  assert.equal(buyMod(p0, 'barbed', []).reason, 'notfound'); assert.equal(buyMod(p0, 'nope', ['nope']).reason, 'unknown'); assert.equal(buyMod(p0, '__proto__', ['__proto__']).reason, 'unknown');
  const low = buyMod({ ...p0, salvage: 3 }, 'barbed', ['barbed']); assert.equal(low.ok, false); assert.equal(low.reason, 'salvage'); assert.equal(low.cost, MODS.barbed.tier2.cost);
  const r = buyMod(p0, 'doublebarrel', ['doublebarrel']); assert.equal(r.ok, true); assert.equal(r.cost, 8); assert.equal(r.progress.salvage, 2); assert.deepEqual(r.progress.upgrades.mods2, { doublebarrel: true }); assert.equal(p0.salvage, 10, 'the old progress is not mutated');
  assert.equal(buyMod(r.progress, 'doublebarrel', ['doublebarrel']).reason, 'bought');
  assert.deepEqual(modRows(r.progress, ['doublebarrel', 'spinup']).map((m) => [m.id, m.tier, m.cost]), [['doublebarrel', 2, null], ['spinup', 1, 12]]); assert.deepEqual(modRows(p0, []), []);
  assert.deepEqual(sanitizeProgress(JSON.parse(JSON.stringify(r.progress))).upgrades.mods2, { doublebarrel: true }, 'it survives the save');
  assert.deepEqual(sanitizeUpgrades({ ammo: 1, armor: 2, mods2: { doublebarrel: true, nope: true, spinup: 'yes', barbed: 1 } }), { ammo: 1, armor: 2, mods2: { doublebarrel: true } }, 'only known mods, only true');
  const { makeSave, parseSave } = await import('../src/engine/save.js'); const w = arena([], { upgrades: { ammo: 0, armor: 0, mods2: { doublebarrel: true } } }); assert.equal(modTier(w, 'doublebarrel'), 2); assert.equal(parseSave(JSON.stringify(makeSave(w, 'mid-level', { now: 1 }))).ok, true, 'a world with a second tier saves');
});

test('a double-barrel shot says so in its fire event and is heard as two shots a beat apart; a plain shot is unchanged', async () => {
  const { soundsForEvent: soundsFor } = await import('../src/audio/events.js');
  const w = arena([sponge('tollbearer', 18)]); addMod(w.player, 'doublebarrel'); const ev = shoot(w, w.enemies[0]), f = ev.find((e) => e.type === 'fire'); assert.equal(f.mod, 'doublebarrel');
  const plain = arena([sponge('tollbearer', 18)]); assert.equal(shoot(plain, plain.enemies[0]).find((e) => e.type === 'fire').mod, undefined);
  { const two = soundsFor(f).filter((s) => s.id === 'scatter_fire'); assert.equal(two.length, 2); assert.ok(two[1].delay > 0 && two[1].delay < 0.2); const one = soundsFor({ type: 'fire', weapon: 'scattergun' }).filter((s) => s.id === 'scatter_fire'); assert.equal(one.length, 1); }
});
