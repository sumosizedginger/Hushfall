// design/VISUAL_AWE_PLAN.md, session A1: every shipped map has a hero view (the place its before / after picture is taken from), on floor a player
// can stand on, looking at more than a wall; and the picture's numbers are computed as the plan says.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from './helpers.js';
import { parseMap } from '../src/engine/mapformat.js';
import { viewScore, forward } from '../tools/dev/hero-views.mjs';
import { scoreFrame, misses } from '../tools/dev/frame-score.mjs';

const VIEWS = JSON.parse(fs.readFileSync(path.join(ROOT, 'maps-src', 'hero-views.json'), 'utf8')),
  IDS = fs
    .readdirSync(path.join(ROOT, 'maps'))
    .filter((f) => f.endsWith('.json'))
    .map((f) => f.slice(0, -5));

test('every shipped map has a hero view on walkable floor that sees more than a wall', () => {
  const bad = [];
  for (const id of IDS) {
    const v = VIEWS[id];
    if (!v) {
      bad.push(id + ': no hero view');
      continue;
    }
    const map = parseMap(JSON.parse(fs.readFileSync(path.join(ROOT, 'maps', id + '.json'), 'utf8'))),
      k = map.kind(Math.floor(v.x), Math.floor(v.z));
    if (k === 'wall' || k === 'water' || k === 'void') bad.push(`${id}: the hero view stands in ${k}`);
    else if (!Number.isFinite(v.yaw) || viewScore(map, v.x, v.z, v.yaw) < 12) bad.push(`${id}: the hero view faces a wall`);
  }
  assert.deepEqual(bad, []);
});

test('a yaw of 0 looks north and -PI/2 looks east (the game shell uses the same convention for a teleport)', () => {
  const near = (a, b) => assert.ok(Math.abs(a - b) < 1e-9);
  near(forward(0)[0], 0);
  near(forward(0)[1], -1);
  near(forward(-Math.PI / 2)[0], 1);
  near(forward(-Math.PI / 2)[1], 0);
});

test('the picture numbers: a half black, half white frame has the widest spread, and a flat grey one misses the floors', () => {
  const frame = (fn) => {
    const width = 192,
      height = 108,
      data = new Uint8Array(width * height * 4);
    for (let y = 0; y < height; y++)
      for (let x = 0; x < width; x++) {
        const [r, g, b] = fn(x, y),
          i = (y * width + x) * 4;
        data[i] = r;
        data[i + 1] = g;
        data[i + 2] = b;
        data[i + 3] = 255;
      }
    return { width, height, data };
  };
  const split = scoreFrame(frame((x, y) => (y < 30 ? [255, 255, 255] : [0, 0, 0])));
  assert.equal(split.spread, 255);
  assert.ok(split.dark > 40 && split.bright > 20);
  const grey = scoreFrame(frame(() => [90, 90, 90]));
  assert.equal(grey.spread, 0);
  assert.deepEqual(misses(grey), ['spread', 'bright', 'dark', 'coloured']);
  assert.deepEqual(misses(grey, { colourless: true }), ['spread', 'bright', 'dark']);
  const warm = scoreFrame(frame((x) => (x % 2 ? [200, 90, 30] : [30, 40, 120])));
  assert.ok(warm.coloured > 90 && warm.top2hue === 100);
});
