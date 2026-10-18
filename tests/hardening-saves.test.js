// PT-050 H1 (design/HARDENING.md): a save the loader ACCEPTS must be one the game can play, and loading NEVER throws. Grok's sixteen contracts (attack/groks/regress/save-shape.test.js) and Gemini's save cases
// (GEMINI-02, GEMINI-10) live here as permanent tests. Three of Grok's tests asserted `ok === true` for a damaged save although their names say "rejected, or ..."; the save policy (save.js) is to REJECT with a reason, so here
// either outcome passes as long as nothing throws afterwards, and the mutation fuzz at the end holds the whole loader to it.
import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { createWorld, step, drainEvents } from '../src/engine/world.js';
import { loadMapFile } from '../src/engine/harness.js';
import { makeSave, parseSave, loadWorld, carryErrors, endStatsErrors } from '../src/engine/save.js';
import { earn, sanitizeProgress } from '../src/engine/progress.js';
import { FixedLoop } from '../src/engine/loop.js';
import { maybeDrop } from '../src/engine/drops.js';
import { PLAYER } from '../src/engine/defs.js';
import { InputState } from '../src/engine/input.js';
import { sanitizeSettings, defaultSettings } from '../src/game/settings.js';
import { ROOT } from './helpers.js';

const map = loadMapFile(path.join(ROOT, 'maps', 'C1E1M01.json'));
const idle = { move: [0, 0], yaw: 0, pitch: 0, fire: false, aim: false, sprint: false, use: false, melee: false, lamp: false, weapon: null, weaponStep: 0, weaponLast: false, pause: false, map: false };
const blankProgress = { salvage: 0, upgrades: { ammo: 0, armor: 0 }, records: {} };

/** a mid-level save of C1E1M01 after two ticks, `mut(save)` damages it, and it goes through the REAL text round trip (parseSave) and loadWorld */
function loaded(mut, kind = 'mid-level') {
  const w = createWorld(map, { seed: 1 }); step(w, idle); step(w, idle);
  const save = makeSave(w, kind, { now: 1 }); mut(save);
  const parsed = parseSave(JSON.stringify(save)); assert.equal(parsed.ok, true, parsed.detail);
  try { return loadWorld(parsed.save, () => map); } catch (e) { return { ok: false, threw: e.message }; }
}
const playable = (r, ticks = 3) => { assert.equal(r.threw, undefined, 'loadWorld threw: ' + r.threw); if (!r.ok) return; for (let i = 0; i < ticks; i++) { step(r.world, i === 1 ? { ...idle, fire: true, use: true } : idle); drainEvents(r.world); } };
const rejected = (r, what) => { assert.equal(r.threw, undefined, 'loadWorld threw: ' + r.threw); assert.equal(r.ok, false, what + ' was loaded'); assert.equal(r.reason, 'corrupt'); assert.ok(r.detail, 'a reason is given'); };

test('an undamaged save still loads and plays on (the validator rejects nothing honest)', () => {
  const r = loaded(() => {}); assert.equal(r.ok, true, r.detail); playable(r, 30);
  const w = createWorld(map, { seed: 3 }); for (let i = 0; i < 400; i++) step(w, { ...idle, move: [0, 1], fire: i % 5 === 0 }); const s = makeSave(w, 'mid-level', { now: 2 });
  const p = parseSave(JSON.stringify(s)); assert.equal(p.ok, true); const r2 = loadWorld(p.save, () => map); assert.equal(r2.ok, true, r2.detail);
  assert.equal(Object.getPrototypeOf(r2.world), Object.prototype); assert.ok(Array.isArray(r2.world.events) && r2.world.map === map, 'the map and the event queue are the live ones');
});

test('G-01: a complete save with no end stats, or an empty one, is rejected; earn() pays nothing for a finish without numbers', () => {
  rejected(loaded((s) => { s.world.status = 'complete'; s.world.endStats = null; }), 'complete with endStats null');
  rejected(loaded((s) => { s.world.status = 'complete'; s.world.endStats = {}; }), 'complete with empty endStats');
  const good = { time: 10, kills: 0, items: 0, secrets: 0, total: { enemies: 1, secrets: 0 }, damageTaken: 0, dest: 'next' };
  const ok = loaded((s) => { s.world.status = 'complete'; s.world.endStats = good; }); assert.equal(ok.ok, true, ok.detail);
  for (const bad of [null, {}, { time: 'x' }, { time: 1, kills: 1, secrets: 0 }, { time: -1, kills: 0, secrets: 0, total: { enemies: 1, secrets: 0 } }]) { const res = earn(blankProgress, 'C1E1M01', bad, map.par?.time); assert.equal(res.gain, 0); assert.deepEqual(res.progress.records, {}, 'nothing recorded'); assert.ok(res.result.rank); }
  assert.deepEqual(endStatsErrors(good), []); assert.ok(endStatsErrors({}).length >= 3);
});
test('G-01/G-02: an unknown weapon, a weapons list or keys that are not lists of known ones, a status nobody handles: all rejected before the first step', () => {
  rejected(loaded((s) => { s.world.player.weapon = 'nope'; }), 'unknown weapon');
  rejected(loaded((s) => { s.world.status = 'complete'; s.world.player.weapon = 'nope'; s.world.endStats = { time: 10, kills: 0, items: 0, secrets: 0, total: { enemies: 1, secrets: 0 }, damageTaken: 0, dest: 'next' }; }), 'unknown weapon on a finished world');
  rejected(loaded((s) => { s.world.player.weapons = 'flare'; }), 'weapons as a string'); rejected(loaded((s) => { s.world.player.weapons = ['flare', 'nope']; }), 'weapons with an unknown id');
  rejected(loaded((s) => { s.world.player.keys = 'brass'; }), 'keys as a string'); rejected(loaded((s) => { s.world.player.keys = ['skeleton']; }), 'an unknown key');
  rejected(loaded((s) => { s.world.status = 'banana'; }), 'status banana');
});
test('G-02: events:null, a null pickup and a pickup of an unknown kind never reach the sim', () => {
  const ev = loaded((s) => { s.world.events = null; }); playable(ev); if (ev.ok) assert.ok(Array.isArray(ev.world.events), 'the live event queue was kept');
  rejected(loaded((s) => { s.world.pickups = [null]; }), 'a null pickup'); rejected(loaded((s) => { s.world.pickups.push({ kind: 'key_unobtainium', x: 1, z: 1 }); }), 'an unknown pickup kind');
  const e = loaded((s) => { delete s.world.player.weapons; }); assert.equal(e.threw, undefined);
  const dropped = loaded(() => {}); const en = dropped.world.enemies.find((o) => o.state !== 'dead'); en.hp = 0; en.state = 'dead'; assert.doesNotThrow(() => maybeDrop(dropped.world, en));
});
test('G-05 / GEMINI-10: hit points, armour and ammunition that no honest game reaches (negative, a string, 1e9) are rejected; the honest edge (full caps) is not', () => {
  rejected(loaded((s) => { s.world.player.hp = 1e9; }), 'hp 1e9'); rejected(loaded((s) => { s.world.player.armor = 1e9; }), 'armor 1e9'); rejected(loaded((s) => { s.world.player.hp = -50; }), 'hp -50');
  rejected(loaded((s) => { s.world.player.ammo.flare = 'lots'; }), 'ammo as a string'); rejected(loaded((s) => { s.world.player.ammo.flare = -3; }), 'ammo -3'); rejected(loaded((s) => { s.world.player.ammo.flare = 1e9; }), 'ammo 1e9'); rejected(loaded((s) => { s.world.player.ammo.plasma = 5; }), 'an ammo type that does not exist');
  const full = loaded((s) => { s.world.player.hp = PLAYER.maxHp; s.world.player.armor = PLAYER.maxArmor; s.world.player.ammo.flare = 30; }); assert.equal(full.ok, true, full.detail); playable(full);
  const dead = loaded((s) => { s.world.player.hp = 0; s.world.status = 'dead'; }); assert.equal(dead.ok, true, dead.detail);
  assert.ok(carryErrors({ hp: 1e9 }).length && carryErrors({ ammo: { flare: 'x' } }).length && carryErrors({ weapons: 'flare' }).length && carryErrors(null).length && carryErrors({ hp: 100, armor: 50, ammo: { flare: 8 }, weapons: ['flare'] }).length === 0);
  rejected(loaded((s) => { s.carry.hp = 1e9; }, 'level-start'), 'a carry with hp 1e9'); rejected(loaded((s) => { s.carry.weapons = 'flare'; }, 'level-start'), 'a carry with weapons as a string');
});
test('GEMINI-02: a save that carries enumerable `map` or `events` keys cannot overwrite the live map or event queue; `__proto__` is not copied', () => {
  const r = loaded((s) => { s.world.map = { w: 1 }; s.world.events = { push: 'not a function' }; s.world.__proto__ = { hacked: true }; const raw = JSON.stringify(s).replace('"__proto__"', '"__proto__"'); void raw; });
  playable(r, 5); if (r.ok) { assert.equal(r.world.map, map, 'the live map'); assert.ok(Array.isArray(r.world.events)); assert.equal(r.world.hacked, undefined); }
  const raw = JSON.stringify((() => { const w = createWorld(map, { seed: 1 }); step(w, idle); return makeSave(w, 'mid-level', { now: 1 }); })()).replace('"player":', '"__proto__":{"hacked":true},"player":'); // a real own key named __proto__ after JSON.parse
  const p = parseSave(raw); assert.equal(p.ok, true); const r2 = loadWorld(p.save, () => map); assert.equal(r2.threw, undefined); if (r2.ok) { assert.equal(r2.world.hacked, undefined); assert.equal(Object.getPrototypeOf(r2.world), Object.prototype); step(r2.world, idle); }
});
test('G-06: an unknown difficulty, a bad seed, a missing campaign, an unknown map are rejected with a reason, never a throw', () => {
  const w = createWorld(map, { seed: 1 }), base = () => makeSave(w, 'level-start', { now: 1 });
  for (const mut of [(s) => { s.campaign.difficulty = 'nightmare'; }, (s) => { s.campaign.difficulty = 'toString'; }, (s) => { s.campaign.seed = 'x'; }, (s) => { delete s.campaign; }]) { const s = base(); mut(s); let r; assert.doesNotThrow(() => { r = loadWorld(s, () => map); }); assert.equal(r.ok, false); assert.ok(r.reason && r.detail); }
  assert.equal(loadWorld(base(), () => null).reason, 'unknown-map'); assert.doesNotThrow(() => loadWorld(base(), () => { throw new Error('boom'); }), 'even a throwing map loader is a rejected save');
  assert.equal(loadWorld(null, () => map).ok, false); assert.equal(loadWorld({}, () => map).ok, false);
});
test('G-05: salvage is a safe integer, never 1e308', () => {
  for (const v of [1e308, 1e15, Infinity]) assert.equal(Number.isSafeInteger(sanitizeProgress({ salvage: v, upgrades: { ammo: 0, armor: 0 }, records: {} }).salvage), true, String(v));
  assert.equal(sanitizeProgress({ salvage: 120, upgrades: { ammo: 0, armor: 0 }, records: {} }).salvage, 120);
});
test('G-07: the same keyboard code is never left on two actions; an action left with none gets its default keys back', () => {
  const raw = defaultSettings(); raw.bindings = { ...raw.bindings, fire: ['KeyF'], use: ['KeyF'] };
  const { settings } = sanitizeSettings(raw), owners = Object.entries(settings.bindings).filter(([, codes]) => codes.includes('KeyF')).map(([a]) => a);
  assert.deepEqual(owners, ['fire'], 'the first action in the list keeps the shared code'); assert.ok(settings.bindings.use.length > 0, 'use got its own keys back: ' + settings.bindings.use);
  const input = new InputState(settings.bindings); input.keyDown('KeyF'); const cmd = input.sample(); assert.equal(cmd.fire, true); assert.equal(!!cmd.use, false);
  const d = sanitizeSettings(defaultSettings()).settings; assert.deepEqual(d.bindings, defaultSettings().bindings, 'the defaults are untouched');
});
test('G-08: one NaN, negative or infinite frame time does not freeze or poison the loop', () => {
  for (const bad of [Number.NaN, -1, Infinity, undefined, 'x']) { let steps = 0; const loop = new FixedLoop(() => { steps++; }); loop.advance(bad); const r = loop.advance(0.05); assert.ok(steps > 0, String(bad) + ': acc=' + loop.acc); assert.ok(Number.isFinite(loop.acc) && Number.isFinite(r.alpha)); }
});

// ---------------------------------------------------------------------------------------------------------------- the whole loader against random damage
test('mutation fuzz: damage every top-level and player field of a real save in seven ways; the loader never throws, and any save it accepts survives three ticks of play', () => {
  const w0 = createWorld(map, { seed: 1 }); step(w0, idle); step(w0, idle); const base = JSON.parse(JSON.stringify(makeSave(w0, 'mid-level', { now: 1 })));
  const garbage = [null, 'x', -1, 1e9, true, [], {}], failures = []; let accepted = 0, rejectedN = 0;
  const targets = [...Object.keys(base.world).map((k) => ['world', k]), ...Object.keys(base.world.player).map((k) => ['player', k]), ...Object.keys(base.carry).map((k) => ['carry', k])];
  for (const [where, key] of targets) for (const g of garbage) {
    const s = JSON.parse(JSON.stringify(base)); (where === 'world' ? s.world : where === 'player' ? s.world.player : s.carry)[key] = JSON.parse(JSON.stringify(g));
    const parsed = parseSave(JSON.stringify(s)); if (!parsed.ok) continue; let r;
    try { r = loadWorld(parsed.save, () => map); } catch (e) { failures.push(`${where}.${key}=${JSON.stringify(g)}: loadWorld threw ${e.message}`); continue; }
    if (!r.ok) { rejectedN++; continue; } accepted++;
    try { for (let i = 0; i < 3; i++) { step(r.world, i === 1 ? { ...idle, fire: true, use: true } : idle); drainEvents(r.world); } } catch (e) { failures.push(`${where}.${key}=${JSON.stringify(g)}: accepted, then step threw ${e.message}`); }
  }
  assert.ok(accepted > 50 && rejectedN > 50, `both outcomes happen (accepted ${accepted}, rejected ${rejectedN})`);
  assert.deepEqual(failures.slice(0, 12), [], failures.length + ' damaged saves were accepted and then broke the sim');
});
