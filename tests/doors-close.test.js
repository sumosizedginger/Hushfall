// A door must close something (the owner, on Customs Hall: "a door that you can just go around, you don't need to open it at all"), and Easy has every creature Normal has
// (the owner, the same day: leaving creatures out had made it far too easy).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { parseMap } from '../src/engine/mapformat.js';
import { doorBypasses, doorFaults, fakeLocks } from '../src/engine/doorways.js';
import { createWorld } from '../src/engine/world.js';

const dir = path.resolve(import.meta.dirname, '../maps');
const shipped = fs.readdirSync(dir).filter((f) => f.endsWith('.json'));
const load = (f) => parseMap(JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')));
const exceptions = JSON.parse(fs.readFileSync(path.resolve(import.meta.dirname, '../design/door-exceptions.json'), 'utf8'));

// a small map from a picture: # wall, . floor, D plain door, K a key door, @ the player. Everything is a shipped map's own letters: W a wall, f a floor
const pic = (rows, keyAt = []) => {
  const grid = rows.map((r) =>
    r
      .replace(/[@]/g, 'f')
      .replace(/K/g, 'D')
      .replace(/\./g, 'f')
      .replace(/#/g, 'W'),
  );
  const doors = [];
  let at = [1, 1];
  rows.forEach((r, z) =>
    [...r].forEach((c, x) => {
      if (c === 'D' || c === 'K') doors.push({ at: [x, z], ...(c === 'K' ? { key: 'brass' } : {}) });
      if (c === '@') at = [x, z];
    }),
  );
  const entities = [
    { type: 'player', at, facing: 0 },
    { type: 'exit', at: [rows[0].length - 2, rows.length - 2] },
    ...keyAt.map((k) => ({ type: 'pickup', kind: 'key_brass', at: k })),
  ];
  return parseMap({ format: 1, id: 'T', version: 1, name: 'T', ceilingHeight: 3, atmosphere: {}, grid, doors, secrets: [], closets: [], triggers: [], entities, messages: [], par: { time: 60 } });
};

test('the check finds a door with a gap beside it, and passes a closed room', () => {
  const gap = pic(['########', '#@.#...#', '#..D...#', '#..#...#', '#......#', '########']);
  assert.equal(doorBypasses(gap).length, 1, 'the gap under the door is a way round');
  const shut = pic(['########', '#@.#...#', '#..D...#', '#..#...#', '#..#...#', '########']);
  assert.equal(doorBypasses(shut).length, 0);
});

test('a room with two doors is a closed room; a key door with a plain door behind it is not locked', () => {
  const two = pic(['#########', '#@.#....#', '#..D....#', '#..#....#', '#..#....#', '#..D....#', '#..#....#', '#########']);
  assert.equal(doorBypasses(two).length, 0, 'every door shut: the sides do not join');
  const fake = pic(['#########', '#@.#....#', '#..K....#', '#..#....#', '#..#....#', '#..D....#', '#..#....#', '#########'], [[1, 3]]);
  assert.equal(doorBypasses(fake).length, 0);
  assert.equal(fakeLocks(fake).length, 1, 'the plain door gets you past the key door');
  const real = pic(['#########', '#@.#....#', '#..K....#', '#..#....#', '#..#....#', '#..K....#', '#..#....#', '#########'], [[1, 3]]);
  assert.equal(fakeLocks(real).length, 0, 'both doors want the key');
});

test('every door of every shipped map closes something', () => {
  const bad = [];
  for (const f of shipped) {
    const id = f.replace('.json', ''),
      faults = doorFaults(load(f), exceptions[id]);
    for (const d of faults) bad.push(`${id} ${d.at.join(',')}: ${d.fault}, ${d.cells} cells`);
  }
  assert.deepEqual(bad, []);
});

test('every written exception is still a real way round, with a reason', () => {
  for (const [id, cells] of Object.entries(exceptions)) {
    if (id === '_') continue;
    const m = load(id + '.json'),
      round = doorBypasses(m).map((d) => d.at.join());
    for (const [cell, why] of Object.entries(cells)) {
      assert.ok(round.includes(cell), `${id} ${cell} no longer needs its exception`);
      assert.ok(why.length > 40, `${id} ${cell} needs a real reason`);
    }
  }
});

test('Easy has every creature Normal has, on every shipped map', () => {
  for (const f of shipped) {
    const m = load(f),
      count = (d) => createWorld(m, { seed: 1, difficulty: d }).enemies.length;
    assert.equal(count('easy'), count('normal'), f);
  }
});
