// Every render module must at least LOAD. On 2026-10-07 a duplicate `const` in view.js ("Identifier 'wp' has already been declared") stopped the whole game on its loading screen, and nothing in the
// suite imported view.js, so 380 tests passed over a game that did not start. This imports each module of src/render (textures.js is Vite-only: import.meta.glob) the way the browser does.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const dir = path.resolve(import.meta.dirname, '../src/render');
const VITE_ONLY = new Set(['textures.js']);

test('every module in src/render loads (a syntax error or a duplicate declaration would stop the game on its loading screen)', async () => {
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.js') && !VITE_ONLY.has(f)).sort(), bad = [];
  assert.ok(files.includes('view.js') && files.includes('models_choir.js') && files.includes('weapon-pose.js'), 'the render modules are where the test expects them');
  for (const f of files) { try { await import(pathToFileURL(path.join(dir, f)).href); } catch (e) { bad.push(`${f}: ${e.message}`); } }
  assert.equal(bad.length, 0, bad.join(' | '));
});

test('GameView is exported and constructible as a class (the game builds one per level)', async () => {
  const { GameView } = await import(pathToFileURL(path.join(dir, 'view.js')).href);
  assert.equal(typeof GameView, 'function'); assert.ok(GameView.prototype.update || Object.getOwnPropertyNames(GameView.prototype).length > 3, 'GameView has methods');
});

test('PT-013: the new shell modules (controller, wheel, menu focus) load in node: they are pure on purpose', async () => {
  for (const f of ['gamepad.js', 'wheel.js', 'padmenu.js']) { const m = await import(pathToFileURL(path.resolve(import.meta.dirname, '../src/game', f)).href); assert.ok(Object.keys(m).length >= 3, f); }
});
test('PT-013: every melee rig builds with no texture, carries anim(), and anim() poses it without throwing at any phase of a swing', async () => {
  const { MELEE_MAKERS } = await import(pathToFileURL(path.join(dir, 'models_melee.js')).href), { swingPhase, swingTimes, meleePose } = await import(pathToFileURL(path.join(dir, 'weapon-pose.js')).href);
  assert.deepEqual(Object.keys(MELEE_MAKERS), ['fists', 'boathook', 'marlinspike', 'mallet', 'axe']);
  for (const [id, make] of Object.entries(MELEE_MAKERS)) {
    const rig = make(null); assert.ok(rig.melee && typeof rig.anim === 'function' && rig.sleeveMat && rig.group, id);
    const kind = id === 'fists' ? 'jab' : id, T = swingTimes(kind);
    for (let u = 0; u <= 1.0001; u += 0.1) { rig.anim({ ...swingPhase(kind, u * (T.windup + T.recover)), kind, charge: u, guard: u, alt: u > 0.5 ? 1 : 0, t: u * 3 }); const p = meleePose(rig, { sprint: u, sway: 0.01, dead: 0, dip: 0, kick: u }); assert.ok([...p.pos, ...p.rot, p.scale].every(Number.isFinite), `${id} at ${u}`); }
    let n = 0; rig.group.traverse((o) => { if (o.isMesh) { n++; const uv = o.geometry.attributes.uv; for (let i = 0; i < uv.count; i++) { assert.ok(uv.getX(i) >= -0.001 && uv.getX(i) <= 1.001 && uv.getY(i) >= -0.001 && uv.getY(i) <= 1.001, `${id}: a UV leaves the atlas`); } } }); assert.ok(n >= 8 && n < 60, `${id}: ${n} meshes`);
  }
});
