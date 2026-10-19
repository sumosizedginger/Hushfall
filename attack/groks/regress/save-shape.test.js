// GROKS regression contracts. These tests describe the behaviour the loader and the
// shell promise ("a damaged save must not take the shell down") and they FAIL on
// the current engine. They are the repros for attack/groks/REPORT.md.
// Run: node --test attack/groks/regress/save-shape.test.js
import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createWorld, step } from '../../../src/engine/world.js';
import { loadMapFile } from '../../../src/engine/harness.js';
import { makeSave, parseSave, loadWorld } from '../../../src/engine/save.js';
import { earn, sanitizeProgress } from '../../../src/engine/progress.js';
import { FixedLoop } from '../../../src/engine/loop.js';
import { maybeDrop } from '../../../src/engine/drops.js';
import { PLAYER } from '../../../src/engine/defs.js';
import { InputState } from '../../../src/engine/input.js';
import { sanitizeSettings, defaultSettings } from '../../../src/game/settings.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const map = loadMapFile(path.join(root, 'maps', 'C1E1M01.json'));
const idle = { move: [0, 0], yaw: 0, pitch: 0, fire: false, aim: false, sprint: false, use: false, melee: false, lamp: false, weapon: null, weaponStep: 0, weaponLast: false, pause: false, map: false };
const blankProgress = { salvage: 0, upgrades: { ammo: 0, armor: 0 }, records: {} };

function loaded(mut) {
  const w = createWorld(map, { seed: 1 });
  step(w, idle); step(w, idle);
  const save = makeSave(w, 'mid-level', { now: 1 });
  mut(save);
  const parsed = parseSave(JSON.stringify(save));
  assert.equal(parsed.ok, true, parsed.detail);
  try { return loadWorld(parsed.save, () => map); }
  catch (e) { return { ok: false, threw: e.message }; }
}

test('G-01 a complete save with no endStats is rejected, or earn() does not throw', () => {
  const r = loaded((s) => { s.world.status = 'complete'; s.world.endStats = null; });
  assert.equal(r.threw, undefined);
  if (r.ok) assert.doesNotThrow(() => earn(blankProgress, 'C1E1M01', r.world.endStats, map.par?.time));
  else assert.equal(r.ok, false);
});

test('G-01 an unknown weapon on a non-playing world is rejected (render would throw outside the step catch)', () => {
  const r = loaded((s) => {
    s.world.status = 'complete';
    s.world.player.weapon = 'nope';
    s.world.endStats = { time: 10, kills: 0, items: 0, secrets: 0, total: { enemies: 1, secrets: 0 }, damageTaken: 0, dest: 'next' };
  });
  assert.equal(r.ok, false, r.detail || 'unknown weapon was loaded');
});

test('G-02 an unknown weapon while playing is rejected before step()', () => {
  const r = loaded((s) => { s.world.player.weapon = 'nope'; });
  assert.equal(r.ok, false, r.detail || 'unknown weapon was loaded');
});

test('G-02 events:null is rejected, or the first shot does not throw', () => {
  const r = loaded((s) => { s.world.events = null; });
  if (!r.ok) return;
  assert.doesNotThrow(() => step(r.world, { ...idle, fire: true }));
});

test('G-02 a string weapons list is rejected, or a kill does not throw in dropType', () => {
  const r = loaded((s) => { s.world.player.weapons = 'flare'; });
  if (!r.ok) return;                                  // rejected on load (PT-050 H1): the contract is met
  const e = r.world.enemies.find((o) => o.state !== 'dead');
  e.hp = 0; e.state = 'dead';
  assert.doesNotThrow(() => maybeDrop(r.world, e));
});

test('G-02 keys stored as a string are rejected, or picking up a different key does not throw', () => {
  const r = loaded((s) => {
    s.world.player.keys = 'brass';
    s.world.pickups.push({ kind: 'key_iron', x: s.world.player.x, z: s.world.player.z, y: s.world.player.y ?? 0 });
  });
  if (!r.ok) return;                                  // rejected on load (PT-050 H1): the contract is met
  assert.doesNotThrow(() => step(r.world, idle));
});

test('G-02 a null pickup is rejected, or standing on it does not throw', () => {
  const r = loaded((s) => { s.world.pickups = [null]; });
  if (!r.ok) return;
  assert.doesNotThrow(() => step(r.world, idle));
});

test('G-03 a status other than playing, dead or complete is rejected', () => {
  const r = loaded((s) => { s.world.status = 'banana'; });
  assert.equal(r.ok, false, 'status banana was loaded and step() then no-ops');
});

test('G-04 a complete save with an empty endStats does not pay salvage', () => {
  const r = loaded((s) => { s.world.status = 'complete'; s.world.endStats = {}; });
  if (!r.ok) return;
  const res = earn(blankProgress, 'C1E1M01', r.world.endStats, map.par?.time);
  assert.equal(res.gain, 0);
});

test('G-05 hit points above the cap are rejected or clamped', () => {
  const r = loaded((s) => { s.world.player.hp = 1e9; s.world.player.armor = 1e9; });
  assert.ok(!r.ok || (r.world.player.hp <= PLAYER.maxHp && r.world.player.armor <= PLAYER.maxArmor));
});

test('G-05 a string ammunition count cannot become NaN when fired', () => {
  const r = loaded((s) => { s.world.player.ammo.flare = 'lots'; });
  if (!r.ok) return;                                  // rejected on load (PT-050 H1): the contract is met
  step(r.world, { ...idle, fire: true });
  assert.equal(Number.isFinite(r.world.player.ammo.flare), true, 'ammo=' + r.world.player.ammo.flare);
});

test('G-05 negative ammunition is rejected or clamped to zero', () => {
  const r = loaded((s) => { s.world.player.ammo.flare = -3; });
  assert.ok(!r.ok || r.world.player.ammo.flare >= 0);
});

test('G-05 salvage above a safe integer is not kept', () => {
  const p = sanitizeProgress({ salvage: 1e308, upgrades: { ammo: 0, armor: 0 }, records: {} });
  assert.equal(Number.isSafeInteger(p.salvage), true, 'salvage=' + p.salvage);
});

test('G-06 an unknown difficulty is a rejected save, not a throw', () => {
  const w = createWorld(map, { seed: 1 });
  const save = makeSave(w, 'level-start', { now: 1 });
  save.campaign.difficulty = 'nightmare';
  const r = loadWorld(save, () => map);
  assert.equal(r.ok, false);
});

test('G-07 the same keyboard code is not left on two actions', () => {
  const raw = defaultSettings();
  raw.bindings = { ...raw.bindings, fire: ['KeyF'], use: ['KeyF'] };
  const { settings } = sanitizeSettings(raw);
  const owners = Object.entries(settings.bindings).filter(([, codes]) => codes.includes('KeyF')).map(([action]) => action);
  assert.equal(owners.length, 1, 'KeyF is on ' + owners.join(' and ') + ' (legend still names every owner; the lookup keeps only the last)');
  const input = new InputState(settings.bindings);
  input.keyDown('KeyF');
  const cmd = input.sample();
  assert.equal(cmd.fire !== cmd.use, true);
});

test('G-08 a NaN frame does not freeze every later frame', () => {
  let steps = 0;
  const loop = new FixedLoop(() => { steps++; });
  loop.advance(Number.NaN);
  loop.advance(0.05);
  assert.ok(steps > 0, 'acc=' + loop.acc);
});
