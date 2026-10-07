// PT-013: the weapon wheel and the menu navigation. The wheel's clock effect is the owner's decision D7: time FROZEN on Easy, 15% speed on Normal, 5% on Hard, applied to the clock the simulation is fed
// (FixedLoop.advance), never inside the simulation. All pure: state machines and strings.
import test from 'node:test';
import assert from 'node:assert/strict';
import { WHEEL_SLOTS, WHEEL_TIME, timeScaleFor, easeScale, pickSegment, isHold, HOLD_MS, Wheel, wheelSvg, wheelModel } from '../src/game/wheel.js';
import { pickNext, navDir, NavRepeat } from '../src/game/padmenu.js';
import { FixedLoop } from '../src/engine/loop.js';
import { createWorld, step, hashWorld } from '../src/engine/world.js';
import { parseMap } from '../src/engine/mapformat.js';
import { WEAPONS, MELEE_ORDER, WEAPON_ORDER } from '../src/engine/defs.js';

test('the wheel has one segment per weapon slot, in the order of the keys, ending in the melee slot', () => {
  assert.deepEqual(WHEEL_SLOTS.map((s) => s.id), [...WEAPON_ORDER, 'melee']); assert.deepEqual(WHEEL_SLOTS.map((s) => s.slot), [0, 1, 2, 3, 4, 5]);
  for (const s of WHEEL_SLOTS) assert.ok(s.name && s.role, s.id);
});
test('D7 (owner): while the wheel is open time is FROZEN on Easy, 15% on Normal, 5% on Hard; the setting turns it off', () => {
  assert.deepEqual(WHEEL_TIME, { easy: 0, normal: 0.15, hard: 0.05 });
  assert.deepEqual([timeScaleFor('easy'), timeScaleFor('normal'), timeScaleFor('hard')], [0, 0.15, 0.05]); assert.deepEqual([timeScaleFor('easy', false), timeScaleFor('hard', false)], [1, 1], 'turned off: full speed');
});
test('D7 through the fixed-step loop: a second of wall clock gives 0 ticks frozen, about 9 at 15%, about 3 at 5%, 60 at full speed', () => {
  const ticks = (scale, seconds = 1, fps = 60) => { let n = 0; const loop = new FixedLoop(() => n++); for (let f = 0; f < seconds * fps; f++) loop.advance((1 / fps) * scale); return n; };
  assert.equal(ticks(0), 0); assert.ok(Math.abs(ticks(0.15) - 9) <= 1, 'normal ' + ticks(0.15)); assert.ok(Math.abs(ticks(0.05) - 3) <= 1, 'hard ' + ticks(0.05)); assert.ok(Math.abs(ticks(1) - 60) <= 1);
  assert.ok(Math.abs(ticks(0.15, 1, 144) - 9) <= 1, 'the same on a 144 Hz screen: the sim never follows the frame rate'); assert.ok(Math.abs(ticks(0.05, 1, 30) - 3) <= 1);
});
test('D7 does not touch the simulation: the world after N slowed frames is exactly the world after the same number of straight ticks', () => {
  const W = '#'.repeat(14), map = parseMap({ format: 1, id: 'K1', version: 1, name: 'Kit', grid: [W, '#' + '.'.repeat(12) + '#', '#' + '.'.repeat(12) + '#', '#' + '.'.repeat(12) + '#', W], doors: [], secrets: [], entities: [{ type: 'player', at: [1, 1], facing: 'east' }, { type: 'exit', at: [12, 1] }, { type: 'enemy', kind: 'tollbearer', at: [8, 2] }] });
  const cmd = (t) => ({ move: [0, t % 50 < 25 ? 1 : 0], yaw: 0.01, pitch: 0, fire: t % 70 === 0, aim: false, sprint: false, use: false, weapon: null, weaponStep: 0 });
  const slowed = createWorld(map, { seed: 3, difficulty: 'hard' }), loop = new FixedLoop(() => step(slowed, cmd(slowed.tick))); for (let f = 0; f < 600; f++) loop.advance((1 / 60) * 0.05);
  const straight = createWorld(map, { seed: 3, difficulty: 'hard' }); for (let t = 0; t < slowed.tick; t++) step(straight, cmd(straight.tick));
  assert.ok(slowed.tick > 20 && slowed.tick < 40, 'ten seconds at 5% is about thirty ticks: ' + slowed.tick); assert.equal(hashWorld(slowed), hashWorld(straight));
});
test('the clock glides to its target (not a jump) and lands exactly on it: frozen is exactly 0, full speed is exactly 1', () => {
  let s = 1; const seq = []; for (let f = 0; f < 60 && s !== 0; f++) { s = easeScale(s, 0, 1 / 60); seq.push(s); } assert.equal(s, 0); assert.ok(seq.length > 3 && seq.length < 40, 'a short glide: ' + seq.length + ' frames'); assert.ok(seq.every((v, i) => i === 0 || v <= seq[i - 1]), 'monotone');
  let u = 0; for (let f = 0; f < 80 && u !== 1; f++) u = easeScale(u, 1, 1 / 60); assert.equal(u, 1); assert.equal(easeScale(0.15, 0.15, 0.016), 0.15); assert.equal(easeScale(1, 0, 0), 1, 'no time, no change');
});
test('tap or hold: a short press is the last-weapon tap, a long one opens the wheel (once), releasing a held key picks the segment', () => {
  assert.equal(isHold(1000, 1100), false); assert.equal(isHold(1000, 1000 + HOLD_MS), true);
  const w = new Wheel(); w.press(1000); assert.equal(w.tick(1100), false); assert.equal(w.open, false); assert.deepEqual(w.release(), { tap: true, pick: -1 });
  w.press(2000); assert.equal(w.tick(2000 + HOLD_MS + 5), true, 'it opens'); assert.equal(w.tick(2000 + HOLD_MS + 20), false, 'but only once'); assert.equal(w.open, true);
  w.feed(0, -300); assert.equal(w.sel, 0, 'pushed up: the first segment'); const r = w.release(); assert.deepEqual(r, { tap: false, pick: 0 }); assert.equal(w.open, false); assert.equal(w.sel, -1);
  w.press(0); w.tick(9999); w.cancel(); assert.equal(w.open, false); assert.equal(w.downAt, null);
  const t = new Wheel(); t.forceOpen(5); assert.ok(t.open); assert.deepEqual(t.release(), { tap: false, pick: -1 }, 'opened and closed without pushing anywhere: nothing is chosen');
});
test('segments: the pointer vector picks the slice it points into (0 = up, clockwise), the dead centre picks nothing, and it wraps', () => {
  const at = (deg, r = 1) => pickSegment(Math.sin(deg * Math.PI / 180) * r, -Math.cos(deg * Math.PI / 180) * r);
  assert.deepEqual([0, 60, 120, 180, 240, 300].map((d) => at(d)), [0, 1, 2, 3, 4, 5]); assert.deepEqual([29, 31, 359, 331, 329].map((d) => at(d)), [0, 1, 0, 0, 5], 'the boundaries are at +-30 degrees');
  assert.equal(at(90, 0.2), -1, 'inside the dead centre'); assert.equal(pickSegment(0, 0), -1); assert.equal(pickSegment(0, -1, 8), 0); assert.equal(pickSegment(1, 0, 8), 2);
});
test('the pointer: the mouse accumulates a vector that stays in the unit circle, the stick IS the vector; nothing happens while closed', () => {
  const w = new Wheel(); w.feed(500, 0); assert.equal(w.x, 0, 'closed: ignored'); w.forceOpen(0); w.feed(5000, 0); assert.ok(Math.abs(Math.hypot(w.x, w.y) - 1) < 1e-9, 'clamped to the unit circle'); assert.ok([1, 2].includes(w.sel), 'pointing right, on the line between two segments: ' + w.sel);
  w.feed(-5000, 0); assert.ok(w.x < 0, 'it follows where you have pushed, not where you have been');
  const s = new Wheel(); s.forceOpen(0); s.stick(0, 0.3); assert.equal(s.sel, -1, 'a stick barely off centre'); s.stick(0, 0.9); assert.equal(s.sel, 3, 'pushed down'); s.stick(-0.9, -0.1); assert.equal(s.sel, 5, 'left and a touch up (276 degrees) is the last segment');
});
test('the wheel as SVG: six segments, the chosen one marked, weapons you do not have dimmed with no ammo count, the centre names the choice', () => {
  const p = { weapon: 'scattergun', weapons: ['flare', 'scattergun'], ammo: { flare: 5, shell: 12 }, meleeWeapon: 'fists' };
  const m = wheelModel(p, 1, WEAPONS, MELEE_ORDER); assert.equal(m.current, 'scattergun'); assert.deepEqual(m.items.map((i) => i.owned), [true, true, false, false, false, true], 'fists are always there');
  const svg = wheelSvg(m); assert.equal((svg.match(/<g class="seg/g) || []).length, 6); assert.equal((svg.match(/class="seg[^"]* sel/g) || []).length, 1); assert.equal((svg.match(/class="seg off/g) || []).length, 3); assert.equal((svg.match(/class="seg[^"]* cur/g) || []).length, 1);
  assert.match(svg, /SCATTERGUN/); assert.match(svg, /CLOSE/); assert.match(svg, /2 · 12/, 'the shell count'); assert.match(svg, /<svg[^>]*viewBox/); assert.ok(!/NaN|undefined/.test(svg));
  const none = wheelSvg(wheelModel(p, -1, WEAPONS, MELEE_ORDER)); assert.match(none, /WEAPONS/); assert.match(none, /release to equip/);
  const locked = wheelSvg(wheelModel(p, 4, WEAPONS, MELEE_ORDER)); assert.match(locked, /NOT FOUND YET/, 'the lamp is not owned yet');
  const melee = wheelModel({ ...p, weapon: 'axe', weapons: ['flare', 'axe'], meleeWeapon: 'axe' }, 5, WEAPONS, MELEE_ORDER); assert.equal(melee.current, 'melee'); assert.match(wheelSvg(melee), /FIRE AXE/);
});

// ------------------------------------------------------------------------------------------------------------------------------ menus
test('menu focus moves to the item that lies that way, preferring the one straight ahead, and stays put at an edge', () => {
  const items = [{ id: 'a', x: 0, y: 0, w: 100, h: 30 }, { id: 'b', x: 0, y: 40, w: 100, h: 30 }, { id: 'c', x: 0, y: 80, w: 100, h: 30 }, { id: 'd', x: 120, y: 40, w: 60, h: 30 }, { id: 'e', x: 300, y: 5, w: 60, h: 30 }];
  assert.equal(pickNext(items, 'a', 'down'), 'b'); assert.equal(pickNext(items, 'b', 'down'), 'c'); assert.equal(pickNext(items, 'c', 'up'), 'b'); assert.equal(pickNext(items, 'b', 'right'), 'd'); assert.equal(pickNext(items, 'd', 'left'), 'b');
  assert.equal(pickNext(items, 'a', 'up'), 'a', 'top edge: stay'); assert.equal(pickNext(items, 'c', 'down'), 'c'); assert.equal(pickNext(items, 'a', 'right'), 'd', 'the nearer one that way'); assert.equal(pickNext(items, 'd', 'right'), 'e'); assert.equal(pickNext(items, null, 'down'), 'a'); assert.equal(pickNext([], 'a', 'down'), null); assert.equal(pickNext(items, 'zzz', 'down'), 'a');
});
test('menu direction: the D-pad wins, the stick must be pushed firmly, the dominant axis decides; repeat waits, then runs, and a release re-arms it', () => {
  assert.equal(navDir(new Set(['Pad12']), [0, 0]), 'up'); assert.equal(navDir(new Set(['Pad15']), [0, 0]), 'right'); assert.equal(navDir(new Set(), [0.4, 0.4]), null, 'a light push does nothing'); assert.equal(navDir(new Set(), [0.2, 0.9]), 'up'); assert.equal(navDir(new Set(), [0.1, -0.9]), 'down'); assert.equal(navDir(new Set(), [-0.9, 0.3]), 'left');
  const r = new NavRepeat(0.4, 0.1); assert.equal(r.update('down', 0.016), 'down', 'fires at once'); assert.equal(r.update('down', 0.2), null); assert.equal(r.update('down', 0.2), 'down', 'after the first delay'); assert.equal(r.update('down', 0.05), null); assert.equal(r.update('down', 0.06), 'down', 'then every 0.1 s');
  assert.equal(r.update(null, 0.016), null); assert.equal(r.update('down', 0.016), 'down', 'released and pressed again: fires at once'); assert.equal(r.update('up', 0.016), 'up', 'a new direction fires at once');
});
