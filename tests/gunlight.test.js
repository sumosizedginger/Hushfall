// THE HELD GUN IN THE PLACE'S LIGHT (PT-065, V3 measured): the weapon scene's light follows a per-look factor (src/render/gunlight.js) fitted to the
// sign-off probe, not the hemisphere alone.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { LOOKS, lookOf } from '../src/engine/defs.js';
import { GUN_LIGHT, GUN_TINT, gunFactor, gunTint, desaturateHex, lookName } from '../src/render/gunlight.js';
import { createWorld } from '../src/engine/world.js';
import { GameView, WEAPON_LIGHT } from '../src/render/view.js';
import { texProxy, stubRenderer } from './stubs.js';
import { ROOT, shippedMap } from './helpers.js';

test('every look with a factor is a real look, the factors stay in a range where the gun is neither lost nor blown out, and a look with no row keeps the hemisphere formula', () => {
  for (const [name, f] of Object.entries(GUN_LIGHT)) {
    assert.ok(LOOKS[name], `${name} is a look`);
    assert.ok(f >= 0.3 && f <= 1.9, `${name}: ${f}`);
  }
  assert.equal(gunFactor(LOOKS.harbour, 1), null, 'the default look has no row: the formula');
  assert.equal(lookName(LOOKS.deepgate), 'deepgate');
  assert.ok(gunFactor(LOOKS.woven, 1) > gunFactor(LOOKS.deepgate, 1) * 1.8, 'a bright place lights the gun well above a dark one');
  assert.ok(gunFactor(LOOKS.woven, 0.25) < gunFactor(LOOKS.woven, 1) * 0.6 && gunFactor(LOOKS.woven, 0.25) > 0, 'lights going out dim the gun, never to black');
});

test('the 29 sign-off maps all name a look that has a row (so the measured fit applies to them)', () => {
  const ids =
    'C1E1M01 C1E1M02 C1E1M08 C1E2M05 C2M02 C2M09 C2M10 C2M11 C2M12 C2M13 C2M14 C2M15 C2M16 C2M17 C2M18 C2M19 C2M20 C2M21 C2M22 C2M23 C2M24 C2M25 C2M26 C2M27 C2M28 C2M29 C2M30 C2S01 C2S02'.split(
      ' ',
    );
  for (const id of ids) {
    const m = JSON.parse(fs.readFileSync(path.join(ROOT, 'maps', id + '.json'), 'utf8'));
    assert.ok(GUN_LIGHT[m.atmosphere.look], `${id}: look ${m.atmosphere.look}`);
  }
});

test('the view lights the weapon scene from the factor: a dark look gives the gun less light than a bright one, and an unknown look uses the floor of the formula', () => {
  const light = (id) => {
    const map = shippedMap(id),
      w = createWorld(map, { seed: 1, difficulty: 'normal' }),
      v = new GameView(stubRenderer(), texProxy(), map, w);
    v.setSize(640, 360, 640);
    v.setPlace(lookOf(map.atmosphere));
    const i = v.weaponHemi.intensity;
    v.dispose();
    return i;
  };
  const dark = light('C2M24'),
    bright = light('C2M19');
  assert.ok(bright > dark * 1.8, `bright ${bright.toFixed(2)} vs dark ${dark.toFixed(2)}`);
  assert.ok(Math.abs(dark - 1.5 * gunFactor(lookOf(shippedMap('C2M24').atmosphere), 1)) < 0.05, 'dark = 1.5 x the factor');
  assert.ok(WEAPON_LIGHT.floor > 0 && WEAPON_LIGHT.floor < 0.6);
});

test('G4: a bright place gives the gun no tint, the darkest look the full one, and the tint grows steadily between', () => {
  assert.equal(gunTint(gunFactor(LOOKS.woven, 1)), null, 'a bright look: no tint');
  assert.equal(gunTint(GUN_TINT.from), null, 'none at the start of the band');
  const darkest = Math.min(...Object.values(GUN_LIGHT)),
    full = gunTint(gunFactor(LOOKS[lookName(LOOKS.dusk)], 1));
  assert.equal(darkest, GUN_LIGHT.dusk);
  assert.ok(Math.abs(full.ground - GUN_TINT.ground) < 1e-9 && Math.abs(full.desat - GUN_TINT.desat) < 1e-9, 'the darkest look: the full tint');
  let prev = 0;
  for (let f = GUN_TINT.from; f >= 0.2; f -= 0.01) {
    const t = gunTint(f)?.ground ?? 0;
    assert.ok(t >= prev - 1e-12, 'monotonic at ' + f.toFixed(2));
    prev = t;
  }
  assert.ok(gunTint(gunFactor(LOOKS.deepgate, 1)), 'a navy look is tinted');
  assert.equal(desaturateHex(0x808080, 1), 0x808080);
  assert.equal(desaturateHex(0xffe0b0, 0), 0xffe0b0);
  const g = desaturateHex(0xff0000, 1);
  assert.ok(((g >> 16) & 255) === ((g >> 8) & 255) && (g & 255) === ((g >> 8) & 255), 'full desaturation is grey');
});

test('G4 in the view: a dark look greys the key light and pulls the ground toward the place, a bright look leaves both as they were', () => {
  const lights = (id) => {
    const map = shippedMap(id),
      w = createWorld(map, { seed: 1, difficulty: 'normal' }),
      v = new GameView(stubRenderer(), texProxy(), map, w);
    v.setSize(640, 360, 640);
    const look = lookOf(map.atmosphere);
    v.setPlace(look);
    const out = { key: v.weaponKey.color.getHex(), ground: v.weaponHemi.groundColor.getHex(), base: v.mixHex(0xffe0b0, look.sun[0], 0.35) };
    v.dispose();
    return out;
  };
  const bright = lights('C2M19');
  assert.equal(bright.key, bright.base, 'bright: the key light is untouched');
  const dark = lights('C2M24');
  assert.notEqual(dark.key, dark.base, 'dark: the key light is greyed');
});
