// PT-038 (Campaign 2 Act B, design/ACTB.md E5): THE HAND LANTERN. Sim only (the light, the HUD and the pickup's look are held by the render tests and the browser check): a map that is `atmosphere.dark` hides the
// player from creatures that follow their eyes unless the lantern is lit (or a lit prop is near); the lantern burns oil; the Hush-driven kinds ignore it; a world without one has none of its state.
import test from 'node:test';
import assert from 'node:assert/strict';
import { parseMap, validateMap } from '../src/engine/mapformat.js';
import { createWorld, step, drainEvents, hashWorld } from '../src/engine/world.js';
import { makeSave, parseSave, loadWorld } from '../src/engine/save.js';
import { ENEMIES, LANTERN, PICKUPS } from '../src/engine/defs.js';
import { InputState, ACTIONS } from '../src/engine/input.js';
import { runRoute } from '../src/engine/harness.js';

const idle = (o = {}) => ({ move: [0, 0], yaw: 0, pitch: 0, fire: false, aim: false, sprint: false, use: false, weapon: null, weaponStep: 0, map: false, ...o });
const run = (w, n, cmd = () => idle()) => { const ev = []; for (let i = 0; i < n; i++) { step(w, cmd(i)); ev.push(...drainEvents(w)); } return ev; };
/** a hall 40 cells long and 5 wide; the player at cell 3, creatures and props as asked */
const src = ({ dark = true, lantern = { oil: 20, max: 40 }, extra = [] } = {}) => ({ format: 1, id: 'LN', version: 1, name: 'Lantern', cellSize: 2, grid: ['#'.repeat(40), ...Array.from({ length: 5 }, () => '#' + '.'.repeat(38) + '#'), '#'.repeat(40)], doors: [], secrets: [], messages: [],
  ...(dark ? { atmosphere: { dark: true } } : {}), ...(lantern ? { lantern } : {}),
  entities: [{ type: 'player', at: [3, 3], facing: 'east' }, { type: 'exit', at: [38, 3] }, ...extra] });
const world = (o = {}, seed = 1) => createWorld(parseMap(src(o)), { seed, difficulty: 'normal' });
const awake = (e) => e.state !== 'idle';

test('the map format: a lantern needs a dark place and sane numbers; a map without one is as it was', () => {
  assert.equal(validateMap(src()).ok, true, JSON.stringify(validateMap(src()).errors));
  assert.equal(validateMap(src({ dark: false })).ok, false, 'a lantern in a lit place is refused');
  for (const bad of [{ oil: -1 }, { oil: 9999 }, { oil: 10, max: 0 }, { oil: 10, eternal: 'yes' }]) assert.equal(validateMap(src({ lantern: bad })).ok, false, JSON.stringify(bad));
  assert.equal(validateMap(src({ lantern: null })).ok, true, 'a dark place with no lantern is allowed (the player has only what lights the world gives)');
  const plain = world({ dark: false, lantern: null }); assert.equal('lamp' in plain.player, false); assert.equal('lit' in plain, false);
  const darkOnly = world({ lantern: null }); assert.equal('lamp' in darkOnly.player, false); assert.equal(darkOnly.lit, false);
});

test('the lantern is lit and put out by its action, burns an oil a second, goes out dry with a cough, and says so when pressed dry', () => {
  const w = world({ lantern: { oil: 3, max: 40 } }), L = w.player.lamp;
  assert.deepEqual([L.on, L.oil, L.max, L.eternal], [false, 3, 40, false]);
  let ev = run(w, 1, () => idle({ lamp: true })); assert.equal(L.on, true); assert.deepEqual(ev.filter((e) => e.type === 'lamp').map((e) => e.on), [true]);
  run(w, 60); assert.ok(Math.abs(L.oil - 2) < 0.03, 'one oil a second: ' + L.oil.toFixed(2));
  ev = run(w, 1, () => idle({ lamp: true })); assert.equal(L.on, false); assert.deepEqual(ev.filter((e) => e.type === 'lamp').map((e) => e.on), [false]);
  run(w, 60); assert.ok(Math.abs(L.oil - 2) < 0.03, 'an unlit lamp burns nothing');
  run(w, 1, () => idle({ lamp: true })); ev = run(w, 60 * 3); assert.equal(L.on, false, 'out'); assert.equal(L.oil, 0); assert.equal(ev.filter((e) => e.type === 'lamp_out').length, 1);
  ev = run(w, 1, () => idle({ lamp: true })); assert.equal(L.on, false); assert.equal(ev.filter((e) => e.type === 'lamp_dry').length, 1, 'a dry lamp cannot be lit');
  const eternal = world({ lantern: { oil: 0, eternal: true } }); run(eternal, 1, () => idle({ lamp: true })); run(eternal, 60 * 90); assert.equal(eternal.player.lamp.on, true, 'Ines\'s own lamp never burns out');
});

test('lamp oil: a tin gives its amount up to the tank, is left where it lies when the tank is full, and is not taken where there is no lantern', () => {
  const tin = (n) => Array.from({ length: n }, (_, i) => ({ type: 'pickup', kind: 'oil', at: [3, 3 + (i % 2)] }));
  const w = world({ lantern: { oil: 5, max: 40 }, extra: tin(1) }); run(w, 2); assert.equal(w.player.lamp.oil, 5 + PICKUPS.oil.amount); assert.equal(w.pickups.length, 0);
  const full = world({ lantern: { oil: 38, max: 40 }, extra: tin(1) }); run(full, 2); assert.equal(full.player.lamp.oil, 40, 'capped'); const topped = world({ lantern: { oil: 40, max: 40 }, extra: tin(1) }); run(topped, 5); assert.equal(topped.pickups.length, 1, 'a full tank leaves the tin');
  const none = world({ lantern: null, extra: tin(1) }); run(none, 5); assert.equal(none.pickups.length, 1, 'no lantern, no oil');
});

test('in a dark place a creature that follows its eyes does not notice the player 12 m off until the lantern is lit', () => {
  const mk = (kind, o = {}) => world({ ...o, extra: [{ type: 'enemy', kind, at: [3 + 6, 3] }] }), gaunt = ENEMIES.gaunt;
  assert.ok(gaunt.sight > LANTERN.sightDark && !gaunt.hush && ENEMIES.chorister.sight > LANTERN.sightDark);
  const dark = mk('gaunt'); run(dark, 90); assert.equal(awake(dark.enemies[0]), false, 'asleep: it cannot see 12 m in the dark');
  const lit = mk('gaunt'); run(lit, 1, () => idle({ lamp: true })); run(lit, 90); assert.equal(awake(lit.enemies[0]), true, 'a lit lantern is seen from 24 m');
  const near = world({ extra: [{ type: 'enemy', kind: 'gaunt', at: [3 + 2, 3] }] }); run(near, 90); assert.equal(awake(near.enemies[0]), true, 'it notices the dark player from 4 m');
  const day = mk('gaunt', { dark: false, lantern: null }); run(day, 90); assert.equal(awake(day.enemies[0]), true, 'a place that is not dark: the ordinary range, as it always was');
});

test('the Hush-driven kinds (the Tollbearer, the Bellhand, the Sexton) ignore the light: they notice from their ordinary range in the dark', () => {
  for (const kind of ['tollbearer', 'bellhand', 'sexton']) { assert.equal(ENEMIES[kind].hush, true, kind); const w = world({ extra: [{ type: 'enemy', kind, at: [3 + 8, 3] }] }); run(w, 90); assert.equal(awake(w.enemies[0]), true, kind + ' follows the Hush, not the light'); }
  for (const kind of ['gaunt', 'gill', 'chorister', 'zealot', 'bulwark', 'weeping', 'acolyte']) assert.ok(!ENEMIES[kind].hush, kind + ' follows its eyes');
});

test('a lit prop lights the player within 8 m, and only the lit ones', () => {
  const lamp = { type: 'prop', kind: 'lantern', at: [3 + 3, 3] }, far = { type: 'prop', kind: 'lamp', at: [3 + 12, 3] };
  const w = world({ extra: [lamp, { type: 'enemy', kind: 'gaunt', at: [3 + 9, 3] }] }); run(w, 3); assert.equal(w.lit, true); run(w, 90); assert.equal(awake(w.enemies[0]), true, 'in the lantern\'s light a Gaunt 18 m... 9 cells off sees them');
  const dim = world({ extra: [far] }); run(dim, 3); assert.equal(dim.lit, false, 'a prop 24 m away lights nothing');
  const crate = world({ extra: [{ type: 'prop', kind: 'crate', at: [3 + 1, 3] }] }); run(crate, 3); assert.equal(crate.lit, false, 'a crate is not a light');
});

test('the lantern is an action: the key and the input layer carry it, and the bot lights it in a dark place by itself (and a lamp op puts it out)', () => {
  assert.ok(ACTIONS.includes('lamp')); const input = new InputState(); input.press('lamp'); assert.equal(input.sample().lamp, true); assert.equal(input.sample().lamp, false, 'an edge: once per press');
  const map = parseMap(src({ lantern: { oil: 60, max: 60 } })), lit = [];
  const r = runRoute(map, [{ op: 'goto', at: [10, 3] }, { op: 'goto', at: [30, 3] }, { op: 'goto', at: [38, 3] }], { onTick: (w) => lit.push(w.player.lamp.on) });
  assert.equal(r.result, 'complete'); assert.equal(lit[5], true, 'lit in the first moments of the walk'); assert.ok(r.world.player.lamp.oil < 60 && r.world.player.lamp.oil > 0, 'and it burned: ' + r.world.player.lamp.oil.toFixed(1));
  const dark = [], r2 = runRoute(map, [{ op: 'lamp', on: false }, { op: 'goto', at: [30, 3] }, { op: 'goto', at: [38, 3] }], { onTick: (w) => dark.push(w.player.lamp.on) });
  assert.equal(r2.result, 'complete'); assert.equal(dark.some(Boolean), false, 'a route that puts the lantern out walks in the dark'); assert.equal(r2.world.player.lamp.oil, 60);
});

test('a world with a lantern is deterministic, saved and loaded whole (the lamp and the lit flag come back)', () => {
  const a = world({ extra: [{ type: 'enemy', kind: 'gaunt', at: [14, 3] }] }, 5), b = world({ extra: [{ type: 'enemy', kind: 'gaunt', at: [14, 3] }] }, 5);
  for (const q of [a, b]) { run(q, 1, () => idle({ lamp: true })); run(q, 200, (i) => idle({ move: [0, i % 80 < 40 ? 1 : 0] })); }
  assert.equal(hashWorld(a), hashWorld(b));
  const text = JSON.stringify(makeSave(a, 'mid-level', { now: 1 })), parsed = parseSave(text); assert.equal(parsed.ok, true);
  const maps = { LN: parseMap(src({ extra: [{ type: 'enemy', kind: 'gaunt', at: [14, 3] }] })) }, loaded = loadWorld(parsed.save, (id) => maps[id]); assert.equal(loaded.ok, true, JSON.stringify(loaded));
  assert.deepEqual(loaded.world.player.lamp, a.player.lamp); assert.equal(loaded.world.lit, a.lit);
});
