// PT-083 Y4, S1, S2: a campaign played again, a pulled headset, a crash in the play log, the skill sidecar.
import test from 'node:test';
import assert from 'node:assert/strict';
import { defaultProfile, keepForAgain, againCarry, sanitizeProfile } from '../src/game/profile.js';
import { addCrash, emptyLog } from '../src/game/playlog.js';
import { applySkill } from '../tools/mapkit/skill.mjs';
import { createWorld } from '../src/engine/world.js';
import { parseMap, validateMap } from '../src/engine/mapformat.js';
import { flatSource, shippedSrc } from './helpers.js';

test('Y4: a finished campaign leaves its guns for the next, and a fresh profile has nothing to offer', () => {
  assert.equal(againCarry(defaultProfile()), null);
  const p = keepForAgain(defaultProfile(), { weapons: ['flare', 'scattergun', 'harpoon'], mods: { spinup: 1 }, upgrades: { armor: 2 }, ammo: { flare: 99 } }),
    c = againCarry(p);
  assert.deepEqual(c.weapons, ['flare', 'scattergun', 'harpoon']);
  assert.deepEqual(c.mods, { spinup: 1 });
  assert.deepEqual(c.upgrades, { armor: 2 });
  assert.ok(c.ammo.flare <= 12, 'the guns, not the ammunition');
  assert.deepEqual(sanitizeProfile(JSON.parse(JSON.stringify(p))).again.weapons, ['flare', 'scattergun', 'harpoon'], 'it survives a save');
  assert.equal(sanitizeProfile({ version: 1, maps: {}, again: { weapons: [3] } }).again, undefined, 'and a damaged one is dropped');
  const main = flatSource('src/game/main.js');
  assert.ok(main.includes('g.profile = keepForAgain(g.profile, nextCarry())'));
});

test('S1: the page answers a change of audio device and a hidden tab pauses', () => {
  const main = flatSource('src/game/main.js');
  assert.ok(main.includes("addEventListener?.('devicechange'"));
  assert.ok(main.includes("document.addEventListener('visibilitychange'"));
});

test('S2: a crash goes into the play log, at most ten of them, and only when the log is on', () => {
  let log = emptyLog({}, () => 0.5, '2026-11-03');
  for (let i = 0; i < 14; i++) log = addCrash(log, { message: 'x'.repeat(500) + i, map: 'C1E1M01', mode: 'playing' });
  assert.equal(log.crashes.length, 10);
  assert.ok(log.crashes[0].message.length <= 160);
  assert.ok(flatSource('src/game/main.js').includes('if (settings.playLog) { g.playlog = addCrash(g.playlog, report);'));
});

test('the sidecar: creatures on every difficulty, on Hard only, and left out on Easy; nothing else moves id', () => {
  const src = shippedSrc('C1E1M01');
  src.version = 1;
  const plainFloor = src.entities.find((e) => e.type === 'player').at,
    map = applySkill(JSON.parse(JSON.stringify(src)), {
      all: [{ kind: 'gaunt', at: [plainFloor[0] + 1, plainFloor[1]] }],
      hard: [{ kind: 'gaunt', at: [plainFloor[0] + 2, plainFloor[1]] }],
    });
  assert.ok(validateMap(map).ok, (validateMap(map).errors ?? []).join('; '));
  const m = parseMap(map),
    count = (d) => createWorld(m, { seed: 1, difficulty: d }).enemies.length,
    base = src.entities.filter((e) => e.type === 'enemy' && e.skill !== 'hard' && !e.extra).length;
  assert.equal(count('normal'), base + 1);
  assert.equal(count('hard'), base + 2);
  assert.equal(count('easy'), base + 1, 'Easy has every creature Normal has');
  const ids = (d) => Object.fromEntries(createWorld(m, { seed: 1, difficulty: d }).enemies.map((e) => [e.x + ',' + e.z, e.id]));
  const n = ids('normal'),
    e = ids('easy');
  for (const k of Object.keys(e)) assert.equal(e[k], n[k], 'a creature keeps its id on Easy');
  assert.equal(createWorld(m, { seed: 1, difficulty: 'easy' }).stats.total.enemies, base + 1, 'and the kill total counts what stands');
  const twice = applySkill(JSON.parse(JSON.stringify(map)), { all: [{ kind: 'gaunt', at: [plainFloor[0] + 1, plainFloor[1]] }] });
  assert.equal(twice.version, map.version, 'a second pass does not raise the version again');
  assert.equal(applySkill(JSON.parse(JSON.stringify(map)), null).entities.filter((q) => q.skill || q.extra).length, 0, 'it can be taken off again');
});
