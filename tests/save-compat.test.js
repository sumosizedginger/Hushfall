// PT-071 (R21 / M3): what a player of an older build left behind still loads in this one. The fixtures were made by the code of the RC1 tag itself (tools/dev/make-save-fixture.mjs run in a worktree of rc1-2026-10-20):
// a save is either migrated or refused with an explicit reason, and these two must be migrated or read as they are, never refused and never half-loaded. The settings of RC1 (before the text size, the comfort settings,
// the automatic quality fallback and the play log existed) get the new settings' defaults and nothing else changes.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { parseMap } from '../src/engine/mapformat.js';
import { step } from '../src/engine/world.js';
import { parseSave, loadWorld, SAVE_VERSION } from '../src/engine/save.js';
import { InputState } from '../src/engine/input.js';
import { sanitizeSettings, defaultSettings } from '../src/game/settings.js';
import { sanitizeProgress } from '../src/engine/progress.js';

const ROOT = path.resolve(import.meta.dirname, '..'), read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
const MAP = parseMap(JSON.parse(read('maps/C1E1M01.json')));
const loader = (id) => (id === 'C1E1M01' ? MAP : null);

test('an RC1 mid-level save (the quick-save of that build) loads in this build and the world plays on', () => {
  const r = parseSave(read('tests/fixtures/save-rc1-mid.json')); assert.equal(r.ok, true, r.detail); assert.equal(r.save.version, SAVE_VERSION, 'the RC1 save is the current save version: no migration was needed, and none is promised away');
  const l = loadWorld(r.save, loader); assert.equal(l.ok, true, l.detail); assert.ok(!l.degraded, 'not degraded to a level start: the map of the RC1 save is this map');
  const w = l.world, snap = r.save.world; assert.equal(w.tick, snap.tick); assert.ok(Math.abs(w.player.x - snap.player.x) < 1e-9 && Math.abs(w.player.z - snap.player.z) < 1e-9, 'the player stands where they stood');
  const input = new InputState(); for (let i = 0; i < 600; i++) { const c = input.sample(); c.forward = 1; step(w, c); } assert.ok(w.tick === snap.tick + 600 && w.status === 'playing' || w.status === 'dead', 'the world plays on');
});

test('an RC1 level-start save (the autosave at a level\'s start) loads and its carried loadout is intact', () => {
  const r = parseSave(read('tests/fixtures/save-rc1-start.json')); assert.equal(r.ok, true, r.detail);
  const l = loadWorld(r.save, loader); assert.equal(l.ok, true, l.detail); assert.equal(l.world.tick, 0); assert.ok(l.world.player.hp > 0);
  assert.ok(Array.isArray(r.save.carry.weapons) && r.save.carry.weapons.includes('flare'));
});

test('a save of a NEWER build, a foreign file, a broken file, or one with a map that has changed, says so and never half-loads', () => {
  const s = JSON.parse(read('tests/fixtures/save-rc1-mid.json'));
  assert.equal(parseSave(JSON.stringify({ ...s, version: SAVE_VERSION + 1 })).ok, false); assert.equal(parseSave(JSON.stringify({ ...s, magic: 'OTHER' })).ok, false); assert.equal(parseSave('{"not":"a save"').ok, false);
  const changed = loadWorld({ ...s, campaign: { ...s.campaign, mapVersion: s.campaign.mapVersion + 1 } }, loader); assert.equal(changed.ok, true); assert.match(changed.degraded ?? '', /map-changed/, 'a changed map resumes from the level start, and says so');
  assert.equal(loadWorld({ ...s, campaign: { ...s.campaign, mapId: 'NOPE' } }, loader).ok, false);
});

test('the settings of the RC1 build (without the settings added since) load with the new defaults and keep what the player chose', () => {
  const NEW = ['textSize', 'reducedMotion', 'captions', 'firstRunSeen', 'autoQuality', 'playLog'], rc1 = { ...defaultSettings(), sensitivity: 1.7, masterVolume: 0.3, internalWidth: 640, subtitles: false };
  for (const k of NEW) delete rc1[k];
  const r = sanitizeSettings(rc1); assert.equal(r.settings.sensitivity, 1.7); assert.equal(r.settings.masterVolume, 0.3); assert.equal(r.settings.internalWidth, 640);
  assert.equal(r.settings.autoQuality, true, 'the new fallback is on'); assert.equal(r.settings.playLog, false, 'the play log is off until a player turns it on'); assert.equal(r.settings.firstRunSeen === true, false);
  assert.ok(!r.notes?.some((n) => /not supported/.test(n)), 'no "defaults used" note: the version is the same');
});

test('an RC1 progress record (rank per map, salvage, the Locker) is read as it was', () => {
  const p = sanitizeProgress(JSON.parse(read('tests/fixtures/save-rc1-mid.json')).progress); assert.ok(p && typeof p === 'object'); assert.equal(p.salvage, 0);
  const rich = sanitizeProgress({ salvage: 40, upgrades: { ammo: 1, armor: 2 }, records: { C1E1M01: { rank: 'B', score: 0.8, time: 300 } } }); assert.equal(rich.salvage, 40); assert.equal(rich.upgrades.armor, 2); assert.equal(rich.records.C1E1M01.rank, 'B');
});
