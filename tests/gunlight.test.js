// THE HELD GUN IN THE PLACE'S LIGHT (PT-065, V3 measured): the weapon scene's light follows a per-look factor (src/render/gunlight.js) fitted to the sign-off probe, not the hemisphere alone.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { LOOKS, lookOf } from '../src/engine/defs.js';
import { GUN_LIGHT, gunFactor, lookName } from '../src/render/gunlight.js';
import { createWorld } from '../src/engine/world.js';
import { GameView, WEAPON_LIGHT } from '../src/render/view.js';
import { texProxy, stubRenderer } from './stubs.js';
import { ROOT, shippedMap } from './helpers.js';

test('every look with a factor is a real look, the factors stay in a range where the gun is neither lost nor blown out, and a look with no row keeps the hemisphere formula', () => {
  for (const [name, f] of Object.entries(GUN_LIGHT)) { assert.ok(LOOKS[name], `${name} is a look`); assert.ok(f >= 0.3 && f <= 1.9, `${name}: ${f}`); }
  assert.equal(gunFactor(LOOKS.harbour, 1), null, 'the default look has no row: the formula'); assert.equal(lookName(LOOKS.deepgate), 'deepgate');
  assert.ok(gunFactor(LOOKS.woven, 1) > gunFactor(LOOKS.deepgate, 1) * 1.8, 'a bright place lights the gun well above a dark one');
  assert.ok(gunFactor(LOOKS.woven, 0.25) < gunFactor(LOOKS.woven, 1) * 0.6 && gunFactor(LOOKS.woven, 0.25) > 0, 'lights going out dim the gun, never to black');
});

test('the 29 sign-off maps all name a look that has a row (so the measured fit applies to them)', () => {
  const ids = 'C1E1M01 C1E1M02 C1E1M08 C1E2M05 C2M02 C2M09 C2M10 C2M11 C2M12 C2M13 C2M14 C2M15 C2M16 C2M17 C2M18 C2M19 C2M20 C2M21 C2M22 C2M23 C2M24 C2M25 C2M26 C2M27 C2M28 C2M29 C2M30 C2S01 C2S02'.split(' ');
  for (const id of ids) { const m = JSON.parse(fs.readFileSync(path.join(ROOT, 'maps', id + '.json'), 'utf8')); assert.ok(GUN_LIGHT[m.atmosphere.look], `${id}: look ${m.atmosphere.look}`); }
});

test('the view lights the weapon scene from the factor: a dark look gives the gun less light than a bright one, and an unknown look uses the floor of the formula', () => {
  const light = (id) => { const map = shippedMap(id), w = createWorld(map, { seed: 1, difficulty: 'normal' }), v = new GameView(stubRenderer(), texProxy(), map, w); v.setSize(640, 360, 640); v.setPlace(lookOf(map.atmosphere)); const i = v.weaponHemi.intensity; v.dispose(); return i; };
  const dark = light('C2M24'), bright = light('C2M19'); assert.ok(bright > dark * 1.8, `bright ${bright.toFixed(2)} vs dark ${dark.toFixed(2)}`);
  assert.ok(Math.abs(dark - 1.5 * gunFactor(lookOf(shippedMap('C2M24').atmosphere), 1)) < 0.05, 'dark = 1.5 x the factor'); assert.ok(WEAPON_LIGHT.floor > 0 && WEAPON_LIGHT.floor < 0.6);
});
