// The first ten minutes (the outside playtest of 2026-11-18): Marrow Quay says what to do, the controls card shows once and in a corner, and the
// basics (aim, melee, switching, ammunition, the peaceful Vael, running) are taught one at a time where they matter, never to a player who
// already knows them.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { controlsCard } from '../src/game/firstrun.js';
import { nextHint } from '../src/game/hints.js';
import { legendText } from '../src/game/bindings.js';
import { DEFAULT_BINDINGS } from '../src/engine/input.js';

const keyOf = (a) => '[' + a + ']';
const world = (over = {}) => ({
  time: 5,
  map: {},
  enemies: [],
  player: { x: 0, z: 0, weapon: 'flare', weapons: ['flare'], ammo: { flare: 8 }, sprinting: false, swingT: -1, ads: 0, meleeWeapon: 'fists' },
  ...over,
});
const foe = (x, z, state = 'chase', kind = 'tollbearer') => ({ kind, x, z, state });

test('Marrow Quay has an objective, so the first-run line about the line at the top is true', () => {
  const m = JSON.parse(fs.readFileSync('maps/C1E1M01.json', 'utf8'));
  assert.ok(typeof m.objective === 'string' && m.objective.length > 8 && m.objective.length <= 80);
});

test('the controls card: a first run or Marrow Quay only, one control a row, and it says how it goes away', () => {
  const legend = 'Move WASD · Fire Mouse L · Aim Mouse R';
  assert.equal(controlsCard({ legend, firstRun: false, mapId: 'C1E2M03' }), null);
  const quay = controlsCard({ legend, firstRun: false, mapId: 'C1E1M01' });
  assert.match(quay, /^Move WASD\nFire Mouse L\nAim Mouse R\n/);
  assert.match(quay, /Firing hides this/);
  const first = controlsCard({ legend, firstRun: true, mapId: 'C2M10', firstLine: 'The line at the top is what to do next.' });
  assert.ok(first.startsWith('The line at the top'));
});

test('the real legend splits into rows', () => {
  const rows = controlsCard({ legend: legendText(DEFAULT_BINDINGS), firstRun: true }).split('\n');
  assert.ok(rows.length >= 10);
});

test('aim: taught when a creature is awake in front of you, never when you already aim', () => {
  const w = world({ enemies: [foe(0, -15)] });
  assert.equal(nextHint({ world: w, keyOf }).id, 'aim');
  assert.match(nextHint({ world: w, keyOf }).text, /\[aim\]/);
  assert.deepEqual(nextHint({ world: w, down: new Set(['aim']), keyOf }), { id: 'aim', silent: true });
  assert.equal(nextHint({ world: world({ enemies: [foe(0, -15, 'idle')] }), seen: { run: true }, keyOf }), null, 'a sleeping creature teaches nothing');
});

test('aim and melee only for a creature in the picture (the first browser check: the melee lesson came while the player looked out to sea)', () => {
  assert.equal(nextHint({ world: world({ enemies: [foe(0, 2)] }), keyOf }), null, 'right behind you');
  assert.equal(nextHint({ world: world({ enemies: [foe(2.5, 0.2)] }), keyOf }), null, 'at your side');
  assert.equal(nextHint({ world: world({ enemies: [foe(1, -2)] }), seen: { aim: true }, keyOf }).id, 'melee', 'in front');
});

test('melee when one is close; ammunition when the gun runs low; switching on a new gun', () => {
  const seen = { aim: true };
  assert.equal(nextHint({ world: world({ enemies: [foe(0, -2)] }), seen, keyOf }).id, 'melee');
  const low = world();
  low.player.ammo.flare = 1;
  assert.equal(nextHint({ world: low, seen: { ...seen, melee: true }, keyOf }).id, 'ammo');
  const gun = world();
  gun.player.weapons = ['flare', 'scattergun'];
  assert.equal(nextHint({ world: gun, events: [{ type: 'weapon_pickup', kind: 'scattergun' }], seen, keyOf }).id, 'switch');
  assert.notEqual(nextHint({ world: gun, events: [{ type: 'weapon_pickup', kind: 'mod_choke' }], seen, keyOf }).id, 'switch', 'a mod is not a gun');
});

test('the peaceful Vael are named before the player shoots one; a peaceful one never counts as a foe', () => {
  const w = world({ enemies: [foe(0, -6, 'calm', 'vaelfolk')] });
  const h = nextHint({ world: w, keyOf });
  assert.equal(h.id, 'folk');
  assert.match(h.text, /rank/);
});

test('running: taught on a quiet walk after half a minute, silently skipped by a player who sprints', () => {
  const w = world({ time: 40 });
  assert.equal(nextHint({ world: w, keyOf }).id, 'run');
  w.player.sprinting = true;
  assert.deepEqual(nextHint({ world: w, keyOf }), { id: 'run', silent: true });
  assert.equal(nextHint({ world: world({ time: 40, enemies: [foe(0, -20)] }), seen: { aim: true }, keyOf }), null, 'never in a fight');
});
