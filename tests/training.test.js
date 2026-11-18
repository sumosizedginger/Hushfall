// PT-083 U1, U2: the training yard opens its doors in order as you do what each room asks, ships in every build, and the campaign names a system the first time it matters.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { parseMap, validateMap } from '../src/engine/mapformat.js';
import { createWorld, step, drainEvents } from '../src/engine/world.js';
import { damageEnemy } from '../src/engine/weapons.js';
import { nextHint, HINTS, withKeys, keyNamer } from '../src/game/hints.js';
import { DEFAULT_BINDINGS } from '../src/engine/input.js';
import { defaultSettings, sanitizeSettings } from '../src/game/settings.js';
import { ROOT, flatSource } from './helpers.js';

const src = () => JSON.parse(fs.readFileSync(path.join(ROOT, 'maps-dev', 'TRAINING.json'), 'utf8'));
const idle = (over = {}) => ({
  move: [0, 0],
  yaw: 0,
  pitch: 0,
  fire: false,
  aim: false,
  sprint: false,
  use: false,
  weapon: null,
  weaponStep: 0,
  map: false,
  ...over,
});
const openDoors = (w) => w.doors.filter((d) => d.target === 1).length;

test('the yard is a valid map, says what it is, and ships', () => {
  const s = src(),
    v = validateMap(s);
  assert.ok(v.ok, (v.errors ?? []).join('; '));
  assert.equal(s.training, true);
  assert.equal(s.range, true, 'you cannot die in it');
  assert.ok(!fs.existsSync(path.join(ROOT, 'maps', 'TRAINING.json')), 'not one of the campaign');
  const main = flatSource('src/game/main.js');
  assert.ok(main.includes("from '../../maps-dev/TRAINING.json'") && main.includes('MAPS.TRAINING = parseMap(trainingSrc)'), 'in every build');
  assert.ok(main.includes('!w.map.training'), 'the dev readout does not show in it');
});

test('each door opens only when its room has been done, in order, and the last room lets you out', () => {
  const map = parseMap(src()),
    w = createWorld(map, { seed: 1, difficulty: 'normal' }),
    tick = (c) => {
      step(w, idle(c));
      drainEvents(w);
    },
    run = (n, c) => {
      for (let i = 0; i < n; i++) tick(c);
    },
    goto = (id) => {
      const m = map.messages.find((q) => q.id === id);
      w.player.x = m.x;
      w.player.z = m.z;
      run(25);
    };
  run(30);
  assert.equal(openDoors(w), 0, 'nothing is open at the start');
  goto('walked');
  assert.equal(openDoors(w), 1, 'walked');
  // run
  goto('s1');
  run(20, { sprint: true, move: [0, 1] });
  assert.ok(w.did?.sprint);
  run(3);
  assert.equal(openDoors(w), 2, 'ran');
  // the far one
  goto('s2');
  damageEnemy(
    w,
    w.enemies.find((e) => e.group === 'sights'),
    999,
    {},
  );
  run(3);
  assert.equal(openDoors(w), 3, 'the sights');
  // up close
  goto('s3');
  damageEnemy(
    w,
    w.enemies.find((e) => e.group === 'close'),
    999,
    {},
  );
  run(3);
  assert.equal(openDoors(w), 4, 'the scattergun');
  // the guard
  goto('s4');
  assert.equal(openDoors(w), 4, 'not before the guard');
  w.events.push({ type: 'parry' });
  run(3);
  assert.equal(openDoors(w), 5, 'the guard');
  // the charge
  goto('s5');
  w.events.push({ type: 'fire', weapon: 'arc', charge: 0 });
  run(2);
  assert.equal(openDoors(w), 5, 'a tap is not a charge');
  w.events.push({ type: 'fire', weapon: 'arc', charge: 0.6 });
  run(3);
  assert.equal(openDoors(w), 6, 'the charge');
  // a load
  goto('s6');
  w.player.weapon = 'scattergun';
  w.player.switchT = 0;
  tick({ load: true });
  run(3);
  assert.equal(openDoors(w), 7, 'a load');
  // the lantern
  goto('s7');
  tick({ lamp: true });
  run(3);
  assert.ok(w.player.lamp?.on, 'the lantern lights');
  assert.equal(openDoors(w), 8, 'the lantern');
  // another gun
  goto('s8');
  tick({ weapon: 2 });
  run(3);
  assert.equal(openDoors(w), 9, 'the wheel');
  // out
  const ex = map.exits[0];
  w.player.x = ex.x;
  w.player.z = ex.z;
  run(3);
  assert.equal(w.status, 'complete');
});

test('every line of the yard names keys the game has', () => {
  const s = src(),
    keyOf = keyNamer({ bindings: DEFAULT_BINDINGS });
  for (const m of [...s.messages, ...s.intro.lines.map((text) => ({ text }))]) {
    for (const [, a] of m.text.matchAll(/\{key:([a-zA-Z0-9]+)\}/g)) assert.ok(DEFAULT_BINDINGS[a], `${a} in: ${m.text}`);
    assert.ok(!/\{key:/.test(withKeys(m.text, keyOf)), 'all replaced');
  }
  assert.equal(
    withKeys('press {key:lamp}', () => 'L'),
    'press L',
  );
});

test('a hint comes the moment it matters, once, in the player own key', () => {
  const keyOf = keyNamer({ bindings: DEFAULT_BINDINGS });
  const player = { weapon: 'flare', meleeWeapon: 'fists', weapons: ['flare'], sprinting: false };
  const world = { player, map: { props: [] } };
  assert.equal(nextHint({ world, keyOf }), null, 'nothing yet');
  const running = nextHint({ world: { ...world, player: { ...player, sprinting: true } }, firing: true, keyOf });
  assert.equal(running.id, 'sprint');
  assert.ok(/Shift/.test(running.text), running.text);
  assert.ok(!nextHint({ world: { ...world, player: { ...player, sprinting: true } }, firing: true, seen: { sprint: true }, keyOf })?.text, 'once');
  assert.equal(nextHint({ world: { ...world, player: { ...player, weapon: 'arc' } }, keyOf }).id, 'arc');
  assert.equal(nextHint({ world, events: [{ type: 'door_locked' }], keyOf }).id, 'key');
  assert.ok(new Set(HINTS.map((h) => h.id)).size === HINTS.length);
  const s = sanitizeSettings({ ...defaultSettings(), hintsSeen: { arc: true, x: 'no' } }).settings;
  assert.deepEqual(s.hintsSeen, { arc: true });
  for (const bad of [null, 3, ['a']]) assert.deepEqual(sanitizeSettings({ ...defaultSettings(), hintsSeen: bad }).settings.hintsSeen, {});
});

test('the offer comes once, before the first new game, and the title has its own button', () => {
  const main = flatSource('src/game/main.js'),
    html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  assert.ok(main.includes('!skipOffer && !settings.trainingOffered'));
  for (const id of ['btn-training', 'training-offer', 'btn-offer-train', 'btn-offer-skip', 'set-hints']) assert.ok(html.includes(`id="${id}"`), id);
});
