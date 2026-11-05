// PT-087, the owner on the Bell Tower: "I have been up and down this level 3 times and haven't found a key". add-key-hunt put the key in the first courtyard and
// the locked door at the top of the whole spiral, 147 cells on foot, and nothing said so. A key may not be a long walk back, and a door you have tried shows you its key.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createWorld } from '../src/engine/world.js';
import { parseMap } from '../src/engine/mapformat.js';
import { keyFaults, keyWalks } from '../src/engine/doorways.js';
import { automapModel } from '../src/engine/automap.js';
import { keyMarks, keyObjective, lockedPrompt } from '../src/game/keymarks.js';
import { minimapView, drawMinimap, MINIMAP } from '../src/game/minimap.js';
import { drawAutomap } from '../src/game/automap.js';
import { mapLintChecks } from '../tools/maplint.mjs';
import { canvasContext } from './stubs.js';
import { ROOT, flatSource } from './helpers.js';

const raw = (id) => JSON.parse(fs.readFileSync(path.join(ROOT, 'maps', id + '.json'), 'utf8'));
const load = (id) => parseMap(raw(id));
const ids = fs
  .readdirSync(path.join(ROOT, 'maps'))
  .filter((f) => f.endsWith('.json'))
  .map((f) => f.slice(0, -5));

test('no key on any map is a long walk back from its door', () => {
  const bad = ids.flatMap((id) =>
    keyFaults(load(id)).map((k) => `${id} ${k.key}: ${k.walk} cells, the key ${k.spawnToKey} from the start, the door ${k.spawnToDoor}`),
  );
  assert.deepEqual(bad, []);
});

test('the Bell Tower: the key is on the way up, and with the key back in the first courtyard the map fails its checks', () => {
  const k = keyWalks(load('C1E1M08')).find((q) => q.key === 'bell');
  assert.ok(k.walk <= 40, `${k.walk} cells from key to door`);
  assert.ok(k.spawnToKey > k.spawnToDoor / 2, 'met on the way to the door, not left behind at the start');
  const src = raw('C1E1M08');
  src.entities.find((e) => e.kind === 'key_bell').at = [19, 53];
  const back = parseMap(src);
  assert.equal(keyFaults(back).length, 1);
  const check = mapLintChecks(back).find((c) => c.name.includes('a key is not'));
  assert.equal(check.ok, false);
  assert.match(check.detail, /bell/);
});

test('both routes of the Bell Tower fetch the key near the door, not from the courtyard', () => {
  for (const name of ['main', 'secret']) {
    const r = JSON.parse(fs.readFileSync(path.join(ROOT, 'routes', `C1E1M08.${name}.route.json`), 'utf8'));
    assert.ok(!r.some((q) => q.at?.[0] === 19 && q.at?.[1] === 53), name);
    const key = r.findIndex((q) => q.at?.[0] === 42 && q.at?.[1] === 6),
      door = r.findIndex((q) => q.op === 'use' && q.at?.[0] === 40 && q.at?.[1] === 35);
    assert.ok(key >= 0 && key < door, `${name}: the key (${key}) before the door (${door})`);
  }
});

test('a key is marked only once its door has been tried, and only until it is held', () => {
  const w = createWorld(load('C1E1M08'), { seed: 1, difficulty: 'easy' });
  assert.deepEqual(keyMarks(w, new Set()), []);
  assert.deepEqual(keyMarks(w, null), []);
  assert.deepEqual(keyMarks(w, new Set(['iron'])), [], 'a key this map does not have');
  const [m] = keyMarks(w, new Set(['bell']));
  assert.equal(m.key, 'bell');
  assert.ok(Math.abs(m.x / w.map.cell - 42.5) < 1 && Math.abs(m.z / w.map.cell - 6.5) < 1, `at ${m.x},${m.z}`);
  w.player.keys = ['bell'];
  assert.deepEqual(keyMarks(w, new Set(['bell'])), []);
});

test('the words say the key is on the map only when it is', () => {
  assert.equal(lockedPrompt('bell', false), 'Locked: needs the bell key');
  assert.equal(lockedPrompt('bell', true), 'Locked: needs the bell key (marked on your map)');
  assert.equal(keyObjective('bell'), 'Find the bell key: it is marked on your map');
});

test('both maps draw the mark; the corner map holds a far key at its edge, so it says which way to go', () => {
  const w = createWorld(load('C1E1M08'), { seed: 1, difficulty: 'easy' });
  const model = { ...automapModel(w), keyMarks: keyMarks(w, new Set(['bell'])) };
  const r = MINIMAP.sizes.small.r,
    v = minimapView(model, r);
  assert.equal(v.keys.length, 1);
  assert.ok(Math.abs(v.keys[0].fx) <= r + 0.5 && Math.abs(v.keys[0].fz) <= r + 0.5, 'inside the window');
  assert.equal(v.keys[0].far, true, 'the start is a long way from the key');
  assert.ok(v.keys[0].fx > 0 && v.keys[0].fz < 0, 'north-east of the courtyard');
  const none = minimapView(automapModel(w), r);
  assert.deepEqual(none.keys, []);
  const canvas = {
    width: 0,
    height: 0,
    getContext: () => canvasContext(),
    getBoundingClientRect: () => ({ width: 180, height: 180 }),
    clientWidth: 180,
    clientHeight: 180,
  };
  globalThis.innerWidth = 1280;
  globalThis.innerHeight = 720;
  drawMinimap(canvas, model, 'small');
  const big = { width: 1280, height: 720, getContext: () => canvasContext() };
  drawAutomap(big, model);
});

test('the shell: a tried door is remembered for the attempt, and the map and the prompt read it', () => {
  const main = flatSource('src/game/main.js');
  assert.ok(main.includes("e.type === 'door_locked'"), 'it listens for the door');
  assert.ok(main.includes('g.keysAsked = new Set()'), 'each level starts knowing nothing');
  assert.equal((main.match(/\.keyMarks = keyMarks\(g\.world, g\.keysAsked\)/g) ?? []).length, 2, 'the big map and the corner map');
  assert.ok(main.includes('lockedPrompt('), 'the prompt at the door');
  assert.ok(
    !/world|step\(/.test(
      flatSource('src/game/keymarks.js')
        .replace(/world\.(player|pickups)/g, '')
        .replace(/keyMarks\(world, asked\)/, '')
        .replace(/the world in/, '')
        .replace(/\/\/.*|\/\*[\s\S]*?\*\//g, ''),
    ),
    'it never writes the simulation',
  );
});
