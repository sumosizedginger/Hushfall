// design/VISUAL_AWE_PLAN.md, session A2: darkness and pools of light. Every lamp of a map is baked into the level's still surfaces: a wall stops
// a lamp, a room is darker away from its lamps than at them, no walked floor goes black, and a dark (lantern) map is left as it was.
import test from 'node:test';
import assert from 'node:assert/strict';
import { LAMP_BAKE, wallBetween, lampFalloff, lightAt } from '../src/render/lampbake.js';
import { buildLevel } from '../src/render/levelmesh.js';
import { shippedMap } from './helpers.js';
import { texProxy } from './stubs.js';

const S = 2,
  open = () => false,
  lamp = (x, z, o = {}) => ({ x, y: 2.4, z, reach: 11, power: 1, color: [1, 0.8, 0.5], ...o });

test('a lamp is brightest at its foot and gone at its reach', () => {
  assert.equal(lampFalloff(0, 11), 1);
  assert.equal(lampFalloff(11, 11), 0);
  assert.equal(lampFalloff(20, 11), 0);
  assert.ok(lampFalloff(3, 11) > lampFalloff(6, 11));
});

test('a wall between a lamp and a point stops the light; the cells the two ends stand in do not', () => {
  const wall = (cx) => cx === 3; // a wall across x = 6..8 m
  assert.equal(wallBetween(wall, S, 1, 1, 11, 1), true);
  assert.equal(wallBetween(wall, S, 1, 1, 5, 1), false);
  assert.equal(wallBetween(wall, S, 7, 1, 9, 1), false, 'a lamp set in a wall cell still lights the room beside it');
});

test('under a roof a point by a lamp is at least three times as bright as one no lamp reaches, and takes the lamp colour', () => {
  const lamps = [lamp(10, 10), lamp(40, 40), lamp(70, 70)],
    near = lightAt(10, 0.2, 11, lamps, open, S, true),
    far = lightAt(25, 0.2, 25, lamps, open, S, true);
  assert.ok(near[0] >= far[0] * 3, `near ${near[0].toFixed(2)} far ${far[0].toFixed(2)}`);
  assert.equal(far[0], LAMP_BAKE.ambient);
  assert.ok(near[0] > near[2], 'a warm lamp leaves the surface warmer than it found it');
  assert.ok(Math.max(...near) <= LAMP_BAKE.cap * 1.0001);
});

test('under open sky the general light is not turned down, and a lamp adds less than it does indoors', () => {
  const lamps = [lamp(10, 10)],
    out = lightAt(10, 0.2, 11, lamps, open, S, false),
    inn = lightAt(10, 0.2, 11, lamps, open, S, true);
  assert.equal(lightAt(60, 0.2, 60, lamps, open, S, false)[0], 1);
  assert.ok(out[0] > 1 && out[0] - 1 < inn[0] - LAMP_BAKE.ambient);
});

test('a place with too few lamps to see by keeps its general light', () => {
  assert.equal(lightAt(60, 0.2, 60, [lamp(10, 10)], open, S, true, LAMP_BAKE, false)[0], 1);
});

const colours = (lvl) => {
  const out = [];
  lvl.group.traverse((o) => {
    const c = o.geometry?.getAttribute?.('color');
    if (c && o.material?.vertexColors && o.material.userData?.surface) out.push({ surf: o.material.userData.surface, c, parent: o.parent });
  });
  return out;
};

test('Customs Hall, built: its lamps are baked, the hall has dark and light, and no floor is black', () => {
  const map = shippedMap('C1E1M02'),
    lvl = buildLevel(map, texProxy());
  assert.ok(lvl.lampBake.lamps >= LAMP_BAKE.minLamps, 'the map has lamps: ' + lvl.lampBake.lamps);
  assert.equal(lvl.lampBake.dimmed, true);
  assert.ok(lvl.lampBake.verts > 1000);
  let lo = Infinity,
    hi = 0,
    floorLo = Infinity;
  for (const { surf, c, parent } of colours(lvl)) {
    if (parent !== lvl.group) continue;
    for (let i = 0; i < c.count; i++) {
      const m = Math.max(c.getX(i), c.getY(i), c.getZ(i));
      lo = Math.min(lo, m);
      hi = Math.max(hi, m);
      if (surf === 'floor') floorLo = Math.min(floorLo, m);
      assert.ok(Number.isFinite(m));
    }
  }
  assert.ok(hi >= lo * 3, `the brightest baked surface (${hi.toFixed(2)}) is at least three times the darkest (${lo.toFixed(2)})`);
  assert.ok(floorLo >= LAMP_BAKE.floorMin - 1e-6, 'no floor under ' + LAMP_BAKE.floorMin + ': ' + floorLo.toFixed(3));
  assert.ok(hi <= LAMP_BAKE.cap * 1.35, 'nothing is baked far past the cap (the shading before it may add a little): ' + hi.toFixed(2));
});

test('a dark map (the hand lantern) is left exactly as it was', () => {
  const map = shippedMap('C2M09');
  if (!map.dark) return; // (The Sounding Deep is dark as shipped; if that changes this case has nothing to hold)
  const lvl = buildLevel(map, texProxy());
  assert.equal(lvl.lampBake.verts, 0);
});
