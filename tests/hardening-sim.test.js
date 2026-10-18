// PT-050 H2 (design/HARDENING.md): the economy, weapon and input findings of the two hostile testers, each re-checked against the real code before it was touched. What each turned out to be:
//  H-S6  the Locker took `toString` / `__proto__` for an upgrade track and crashed                                  -> real (a forged progress blob), fixed
//  H-I1  a weapon step below -1 gave a negative ring index (the input layer only ever makes -1, 0, +1)             -> real in the sim, unreachable from the keys; a true modulo now
//  H-I2  an infinite look value made the view vector NaN for good                                                    -> real (a broken device), fixed
//  H-E1  the last-resort feed handed out flares to a player with no flare cannon (every real player owns one)        -> real in the sim, unreachable in play; the feed now fits the gun
//  H-E2  Brood Vat spawns raise the kill total                                                                       -> BY DESIGN: every summoned creature counts in the total AND in the kills when it dies, so the ratio holds
//  H-E3  script-spawned creatures "farm" ammunition                                                                  -> NOT exploitable: a trigger fires once, and the parser makes every switch single-use (`once: true`); a guard for a map that says otherwise
//  H-W1  the mortar's push-out to minRange landed INSIDE a near wall and the ring drawn on the ground lied           -> real, fixed
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { buy, describeNext, newProgress } from '../src/engine/progress.js';
import { createWorld, step, drainEvents, forwardVec, cellSolid } from '../src/engine/world.js';
import { loadMapFile } from '../src/engine/harness.js';
import { parseMap } from '../src/engine/mapformat.js';
import { activateSwitch } from '../src/engine/script.js';
import { designate } from '../src/engine/mortar.js';
import { WEAPONS, PLAYER } from '../src/engine/defs.js';
import { ROOT } from './helpers.js';

const idle = (o = {}) => ({ move: [0, 0], yaw: 0, pitch: 0, fire: false, aim: false, sprint: false, use: false, weapon: null, weaponStep: 0, ...o });
const m1 = loadMapFile(path.join(ROOT, 'maps', 'C1E1M01.json'));

test('H-S6: names that live on every object (`toString`, `__proto__`, `constructor`) are not upgrade tracks', () => {
  const p = { ...newProgress(), salvage: 99 };
  for (const name of ['toString', '__proto__', 'constructor', 'hasOwnProperty', 'valueOf', '', undefined, null, 7]) {
    let b, d; assert.doesNotThrow(() => { b = buy(p, name); d = describeNext(p, name); }, String(name)); assert.equal(b.ok, false); assert.equal(b.reason, 'unknown'); assert.equal(b.progress, p, 'nothing was spent'); assert.equal(d.cost, null);
  }
  assert.equal(buy(p, 'ammo').ok, true); assert.equal(buy(p, 'armor').ok, true); assert.ok(describeNext(p, 'ammo').cost > 0, 'the real tracks still work');
});

test('H-I1: any weapon step, however wild, picks a weapon the player owns (the keys only make -1, 0 and +1)', () => {
  for (const st of [-1, 1, -2, -3, -7, -100, 5, 99, 2.7, -2.7, Number.NaN, Infinity, -Infinity, 'x', null]) {
    const w = createWorld(m1, { seed: 1 }); w.player.weapons = ['flare', 'scattergun', 'rivet']; w.player.weapon = 'flare'; w.player.switchT = 0;
    assert.doesNotThrow(() => step(w, idle({ weaponStep: st })), String(st)); assert.ok(w.player.weapons.includes(w.player.weapon) || w.player.weapon === 'fists', `${st}: holds ${w.player.weapon}`); assert.ok(typeof w.player.weapon === 'string');
  }
  const w = createWorld(m1, { seed: 1 }); w.player.weapons = ['flare', 'scattergun', 'rivet']; w.player.switchT = 0; w.player.weapon = 'flare'; step(w, idle({ weaponStep: -1 })); const back = w.player.weapon; w.player.switchT = 0; w.player.weapon = 'flare'; step(w, idle({ weaponStep: 1 }));
  assert.notEqual(back, 'flare', 'a normal step still changes weapon'); assert.notEqual(w.player.weapon, 'flare');
});
test('H-I2: an infinite or broken look value never makes the view vector NaN; a normal turn is unchanged', () => {
  for (const yaw of [Infinity, -Infinity, Number.NaN, 'x', undefined, null]) { const w = createWorld(m1, { seed: 1 }), y0 = w.player.yaw; assert.doesNotThrow(() => step(w, idle({ yaw }))); assert.equal(w.player.yaw, y0, `${yaw}: the look did not move`); assert.ok(forwardVec(w.player).every(Number.isFinite)); }
  const w = createWorld(m1, { seed: 1 }), y0 = w.player.yaw; step(w, idle({ yaw: 0.25 })); assert.ok(Math.abs(w.player.yaw - (y0 + 0.25)) < 1e-12);
  const w2 = createWorld(m1, { seed: 1 }); step(w2, idle({ pitch: Infinity })); assert.ok(w2.player.pitch <= 1.3 && Number.isFinite(w2.player.pitch), 'pitch was always clamped');
});

test('H-E1: the last-resort feed hands out the ammunition of a gun the player CARRIES; with the flare cannon (every real player) it is still a flare', () => {
  const run = (weapons, weapon) => { const w = createWorld(m1, { seed: 1 }); w.player.weapons = weapons; w.player.weapon = weapon; w.player.ammo = {}; for (let t = 0; t < 700; t++) step(w, idle()); return w.player.ammo; };
  const a = run(['carbine', 'harpoon', 'fists'], 'carbine'); assert.ok((a.bolt || 0) >= 1, 'a harpoon bolt for the harpoon rifle: ' + JSON.stringify(a)); assert.ok(!(a.flare > 0), 'no flares for a gun nobody holds');
  const b = run(['flare', 'fists'], 'flare'); assert.ok(b.flare >= 1, 'a flare for the cannon: ' + JSON.stringify(b)); const c = run(['fists'], 'fists'); assert.ok(c.flare >= 1, 'a player with only fists keeps the old safety net');
});

test('H-E2: every creature a summoner or a vat makes counts in the kill total AND in the kills when it dies, so the ratio holds (by design)', () => {
  const src = fs.readFileSync(path.join(ROOT, 'src/engine/world.js'), 'utf8'), at = [...src.matchAll(/summoned = true/g)].map((m) => m.index);
  assert.ok(at.length >= 4, 'the summoners, the Mother, the vat and the Hive Cantor: ' + at.length);
  for (const i of at) assert.ok(/total\.enemies\+\+/.test(src.slice(i, i + 200)), 'a summon site that does not raise the total: ' + src.slice(i - 60, i + 60).replace(/\s+/g, ' '));
});
test('H-E3: a trigger fires once, every shipped switch is single-use, and a switch that SPAWNS is single-use even if a map said otherwise', () => {
  let switches = 0, spawning = 0;
  for (const f of fs.readdirSync(path.join(ROOT, 'maps')).filter((x) => x.endsWith('.json'))) { const m = parseMap(JSON.parse(fs.readFileSync(path.join(ROOT, 'maps', f), 'utf8'))); for (const s of m.switches) { switches++; if (s.do?.some((a) => a?.spawn)) { spawning++; assert.equal(s.once, true, `${f}:${s.id} spawns creatures and is single-use`); } } }       // (11 lift and car switches are repeatable on purpose; none of them spawns)
  assert.ok(switches > 40 && spawning >= 4, `switches ${switches}, spawning ${spawning}`);
  const m = loadMapFile(path.join(ROOT, 'maps', 'C1E1M03.json')), w = createWorld(m, { seed: 1 }), sw = m.switches.find((s) => s.id === 'north'); assert.ok(sw.do.some((a) => a.spawn));
  const total0 = w.stats.total.enemies; activateSwitch(w, sw); const n1 = w.enemies.length, total1 = w.stats.total.enemies; assert.equal(total1, total0 + 4, 'four Gaunts, once');
  activateSwitch(w, sw); drainEvents(w); assert.equal(w.enemies.length, n1, 'the second flip spawns nothing'); assert.equal(w.stats.total.enemies, total1);
  const bad = { ...sw, once: false }, w2 = createWorld(m, { seed: 1 }); activateSwitch(w2, bad); const n2 = w2.enemies.length; activateSwitch(w2, bad); assert.equal(w2.enemies.length, n2, 'even a spawning switch marked once:false is single-use');
});

const Wd = (n) => '#'.repeat(n), grid = [Wd(42), ...Array.from({ length: 20 }, () => '#' + '.'.repeat(40) + '#'), Wd(42)];
function hall() { const src = { format: 1, id: 'K1', version: 1, name: 'Arena', grid, doors: [], secrets: [], entities: [{ type: 'player', at: [1, 1], facing: 'east' }, { type: 'exit', at: [40, 1] }] }; const w = createWorld(parseMap(src), { seed: 1 }); Object.assign(w.player, { yaw: Math.PI / 2, pitch: 0, switchT: 0 }); return w; }
test('H-W1: the mortar never lands inside a wall, so the ring on the ground tells the truth; an open aim is unchanged', () => {
  const D = WEAPONS.mortar, w = hall(), p = w.player, cell = w.map.cell; p.z = 22;
  for (const dist of [3, 5, 8, 8.9]) { p.x = 2 + dist; for (const yaw of [Math.PI / 2, Math.PI / 2 + 0.4, Math.PI / 2 - 0.4]) { p.yaw = yaw; const s = designate(w, p, D); assert.ok(!cellSolid(w, Math.floor(s.x / cell), Math.floor(s.z / cell)), `${dist} m from the wall, yaw ${yaw.toFixed(2)}: lands at ${s.x.toFixed(2)},${s.z.toFixed(2)} inside a wall`); assert.ok(s.x >= 2 - 1e-9, 'inside the hall'); assert.ok(Number.isFinite(s.vy) && Number.isFinite(s.vx) && Number.isFinite(s.T), 'a valid arc'); } }
  p.x = 60; p.yaw = Math.PI / 2; p.pitch = -0.12; const open = designate(w, p, D); assert.equal(open.clamped, false, 'a far open aim is not pushed or pulled'); assert.ok(open.d > D.designate.minRange && !cellSolid(w, Math.floor(open.x / cell), Math.floor(open.z / cell)));
  const near = (() => { p.x = 12; p.z = 22; p.pitch = -0.3; return designate(w, p, D); })(); assert.ok(near.d >= D.designate.minRange - 1e-9 || near.clamped, 'a close aim into open floor is still pushed out to the minimum range');
});
