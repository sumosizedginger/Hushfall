// PT-083 R3, R5, S3: a creature standing still is still alive; the rings, shields and beams speak one language; a save this build writes is read back.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { FACTORIES } from '../src/render/models_choir.js';
import { texProxy } from './stubs.js';
import { flatSource, ROOT } from './helpers.js';
import { parseMap } from '../src/engine/mapformat.js';
import { parseSave, loadWorld, SAVE_VERSION } from '../src/engine/save.js';
import { step } from '../src/engine/world.js';
import { InputState } from '../src/engine/input.js';

test('R3: every creature moves while it stands still and awake, the object-like ones too', () => {
  const tex = texProxy();
  for (const [kind, make] of Object.entries(FACTORIES)) {
    const v = make(tex),
      joints = Object.values(v.J ?? {}).filter((o) => o?.isObject3D);
    assert.ok(joints.length, kind + ' has joints');
    const snap = () => joints.flatMap((o) => [o.rotation.x, o.rotation.y, o.rotation.z, o.position.x, o.position.y, o.position.z, o.scale.x]);
    let lo = null,
      hi = null;
    for (let i = 0; i < 180; i++) {
      v.pose({ t: i / 60, walk: 0, phase: 0, look: 0, attack: 0, lunge: 0, dead: 0, flash: 0, awake: true, swell: 0, weep: 0, sweep: 0, aim: 0, beat: 0 });
      const s = snap();
      lo = lo ? lo.map((x, k) => Math.min(x, s[k])) : [...s];
      hi = hi ? hi.map((x, k) => Math.max(x, s[k])) : [...s];
    }
    const moved = lo.reduce((m, x, k) => Math.max(m, hi[k] - x), 0);
    assert.ok(moved >= 0.03, `${kind} moved only ${moved.toFixed(3)} in three seconds of standing`);
  }
});

test('R5: a ring, a shield and a beam are the shared glow materials, and a flash is the shared one', () => {
  assert.ok(flatSource('src/render/view.js').includes('ringMaterial('), 'the rings on the floor');
  assert.ok(flatSource('src/render/shield.js').includes('shellMaterial('), 'the shield');
  assert.ok(flatSource('src/render/beamfx.js').includes('beamMaterial('), 'the beams');
  for (const f of ['models_guns.js', 'models_rivet.js', 'models_harpoon.js', 'models_arc.js', 'models_carbine.js', 'models_rocket.js', 'models_mortar.js'])
    assert.ok(flatSource('src/render/' + f).includes('muzzleFlash('), f + ' draws the shared muzzle flash');
});

test('S3: a save this build writes (version ' + SAVE_VERSION + ') is read back and plays on, and it is the only version anyone outside can hold', () => {
  const r = parseSave(fs.readFileSync(path.join(ROOT, 'tests/fixtures/save-pt083-mid.json'), 'utf8'));
  assert.equal(r.ok, true, r.detail);
  assert.equal(r.save.version, SAVE_VERSION);
  const map = parseMap(JSON.parse(fs.readFileSync(path.join(ROOT, 'tests/fixtures/map-C1E1M01-v7.json'), 'utf8'))),
    shipped = parseMap(JSON.parse(fs.readFileSync(path.join(ROOT, 'maps/C1E1M01.json'), 'utf8')));
  for (const m of [map, shipped]) {
    const l = loadWorld(r.save, (id) => (id === 'C1E1M01' ? m : null));
    assert.equal(l.ok, true, l.detail);
    const input = new InputState();
    for (let i = 0; i < 120; i++) step(l.world, input.sample());
    assert.equal(l.world.status, 'playing');
  }
});
