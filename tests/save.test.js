import test from 'node:test';
import assert from 'node:assert/strict';
import { createWorld, step, hashWorld, carryOver } from '../src/engine/world.js';
import { makeSave, parseSave, loadWorld, SaveStore, storeSave, SAVE_VERSION, SAVE_MAGIC } from '../src/engine/save.js';
import { runRoute } from '../src/engine/harness.js';
import { loadMap, mapLoader, shippedMap, shippedRoute } from './helpers.js';

function scriptedCmd(tick) {
  const phase = Math.floor(tick / 45) % 6;
  return { move: [phase === 2 ? 1 : 0, phase < 4 ? 1 : 0], yaw: phase === 1 ? 0.03 : phase === 3 ? -0.05 : 0, pitch: 0, fire: tick % 90 === 0, use: tick % 200 === 0, weapon: null };
}
const idle = () => ({ move: [0, 0], yaw: 0, pitch: 0, fire: false, use: false, weapon: null });

test('mid-level save round-trips: resumed run equals the uninterrupted run', () => {
  const map = loadMap();
  const straight = createWorld(map, { seed: 11, difficulty: 'hard' });
  for (let t = 0; t < 900; t++) step(straight, scriptedCmd(t));
  const w = createWorld(map, { seed: 11, difficulty: 'hard' });
  for (let t = 0; t < 400; t++) step(w, scriptedCmd(t));
  const text = JSON.stringify(makeSave(w, 'mid-level', { now: 123 }));
  const parsed = parseSave(text); assert.equal(parsed.ok, true);
  const loaded = loadWorld(parsed.save, mapLoader); assert.equal(loaded.ok, true);
  assert.equal(hashWorld(loaded.world), hashWorld(w), 'loaded state equals saved state');
  for (let t = 400; t < 900; t++) step(loaded.world, scriptedCmd(t));
  assert.equal(hashWorld(loaded.world), hashWorld(straight), 'continuation matches uninterrupted play');
});

test('level-start save restores carried inventory but not keys or map progress', () => {
  const map = loadMap(); const w = createWorld(map, { seed: 2 });
  w.player.hp = 40; w.player.armor = 30; w.player.ammo.flare = 5; w.player.keys.push('brass');
  const s = parseSave(JSON.stringify(makeSave(w, 'level-start'))).save;
  const r = loadWorld(s, mapLoader).world;
  assert.equal(r.player.hp, 40); assert.equal(r.player.armor, 30); assert.equal(r.player.ammo.flare, 5);
  assert.deepEqual(r.player.keys, []); assert.equal(r.tick, 0);
});

test('save immediately after a transition (tick 0 with carry) loads identically', () => {
  const map = loadMap(); const a = createWorld(map, { seed: 4 });
  const ex = map.exits[0]; a.player.x = ex.x; a.player.z = ex.z; step(a, idle());
  const next = createWorld(map, { seed: 4, carry: carryOver(a) });
  const back = loadWorld(parseSave(JSON.stringify(makeSave(next, 'mid-level'))).save, mapLoader).world;
  assert.equal(hashWorld(back), hashWorld(next));
});

test('reload after finding the secret keeps the count and does not double count', () => {
  const map = loadMap(); const w = createWorld(map, { seed: 1 });
  const cell = map.secrets[0].cells[0]; w.player.x = (cell[0] + 0.5) * 2; w.player.z = (cell[1] + 0.5) * 2; step(w, idle());
  assert.equal(w.stats.secrets, 1);
  const r = loadWorld(parseSave(JSON.stringify(makeSave(w, 'mid-level'))).save, mapLoader).world;
  assert.equal(r.stats.secrets, 1); assert.deepEqual(r.secretsFound, ['pocket']);
  for (let i = 0; i < 30; i++) step(r, idle());
  assert.equal(r.stats.secrets, 1);
});

test('corrupt, foreign and newer saves are rejected with explicit reasons (never silently loaded)', () => {
  assert.equal(parseSave('{not json').reason, 'corrupt');
  assert.equal(parseSave(JSON.stringify({ magic: 'NOPE' })).reason, 'wrong-magic');
  assert.equal(parseSave(JSON.stringify({ magic: SAVE_MAGIC, version: SAVE_VERSION + 1 })).reason, 'newer-version');
  assert.equal(parseSave(JSON.stringify({ magic: SAVE_MAGIC, version: 0 })).reason, 'bad-version');
  assert.equal(parseSave(JSON.stringify({ magic: SAVE_MAGIC, version: SAVE_VERSION })).reason, 'corrupt', 'missing campaign/carry');
});

test('schema change: an old save with no migration is invalidated explicitly', () => {
  const s = makeSave(createWorld(loadMap(), { seed: 1 }), 'level-start');
  const r = parseSave(JSON.stringify(s), {}, SAVE_VERSION + 1);          // pretend the game is now one version newer
  assert.equal(r.ok, false); assert.equal(r.reason, 'incompatible');
});

test('schema change: registered migrations are applied in order (machinery test with synthetic v1->v3)', () => {
  const s = makeSave(createWorld(loadMap(), { seed: 1 }), 'level-start'); s.version = 1;
  const migrations = {
    1: (x) => ({ ...x, version: 2, campaign: { ...x.campaign, difficulty: x.campaign.difficulty ?? 'normal' } }),
    2: (x) => ({ ...x, version: 3, carry: { ...x.carry, migrated: true } }),
  };
  const r = parseSave(JSON.stringify(s), migrations, 3);
  assert.equal(r.ok, true); assert.equal(r.migratedFrom, 1); assert.equal(r.save.version, 3); assert.equal(r.save.carry.migrated, true);
  const boom = parseSave(JSON.stringify(s), { 1: () => { throw new Error('bad'); } }, 2);
  assert.equal(boom.reason, 'migration-failed');
});

test('a mid-level save from an older map version degrades to level start with a stated reason', () => {
  const map = loadMap(); const w = createWorld(map, { seed: 1 }); for (let t = 0; t < 100; t++) step(w, scriptedCmd(t));
  const save = makeSave(w, 'mid-level'); save.campaign.mapVersion = 0;
  const r = loadWorld(save, mapLoader);
  assert.equal(r.ok, true); assert.match(r.degraded, /map-changed/); assert.equal(r.world.tick, 0);
  assert.equal(loadWorld({ ...save, campaign: { ...save.campaign, mapId: 'C9E9M99' } }, mapLoader).reason, 'unknown-map');
});

test('storeSave writes one save, and a throw from building it or from the store becomes a message', () => {
  const mem = [];
  const store = { write(slot, save) { if (save && save.boom) throw new Error('The quota has been exceeded.'); mem.push([slot, save]); } };
  assert.equal(storeSave(store, 'auto', () => ({ ok: 1 })), null);
  assert.deepEqual(mem, [['auto', { ok: 1 }]]);
  assert.equal(storeSave(store, 'auto', () => { throw new Error('map missing'); }), 'map missing');
  assert.equal(mem.length, 1, 'a build that throws does not write');
  assert.equal(storeSave(store, 'auto', () => ({ boom: true })), 'The quota has been exceeded.');
  assert.equal(mem.length, 1, 'a store that throws does not record a partial save');
  let mode = 'title', saveNote = '';
  const err = storeSave(store, 'auto', () => ({ boom: true }));
  if (err) saveNote = 'Progress could not be saved: ' + err;
  mode = 'playing';
  assert.equal(mode, 'playing');
  assert.equal(saveNote, 'Progress could not be saved: The quota has been exceeded.');
});

test('a save whose lists hold a null, or a shot with no position, is refused at load and never reaches the frame loop (round 1, Codex 2: all three of its saves were accepted and threw on the next tick)', () => {
  const bad = (edit) => { const s = makeSave(createWorld(loadMap(), { seed: 1 }), 'mid-level'); edit(s.world); const p = parseSave(JSON.stringify(s)); return p.ok ? loadWorld(p.save, mapLoader) : p; };
  for (const key of ['projectiles', 'enemyShots', 'doors', 'pickups', 'enemies', 'spores']) { const r = bad((w) => { w[key] = [null, ...(w[key] ?? [])]; }); assert.equal(r.ok, false, key + ' with a null entry is refused'); assert.equal(r.reason, 'corrupt', key); }
  assert.equal(bad((w) => { w.enemies = [...w.enemies, 7]; }).ok, false, 'a number among the enemies');
  const shot = { id: 9, x: 5, y: 1, z: 5, vx: 1, vy: 0, vz: 0, life: 2, dmg: 5 };
  assert.equal(bad((w) => { w.enemyShots = [{ ...shot, life: undefined }]; }).ok, false, 'a shot with no life');
  assert.equal(bad((w) => { w.enemyShots = [{ ...shot, x: null }]; }).ok, false, 'a shot with no position');
  assert.equal(bad((w) => { w.projectiles = [{ ...shot, weapon: 'flare', vz: null }]; }).ok, false, 'a projectile with no speed');
  assert.equal(bad((w) => { w.projectiles = [{ ...shot, weapon: 'no-such-gun' }]; }).ok, false, 'a projectile of an unknown gun');
  const honest = bad((w) => { w.enemyShots = [shot]; w.projectiles = [{ ...shot, weapon: 'flare' }]; }); assert.equal(honest.ok, true, 'the same lists, well formed, load');
  assert.doesNotThrow(() => step(honest.world, idle()), 'and the loaded world plays');
});

test('every save an honest run makes is still accepted by the stricter loader: a scripted run saved every 60 ticks, with and without shots in the air', () => {
  const map = loadMap(), w = createWorld(map, { seed: 5, difficulty: 'hard' }); let shots = 0, bolts = 0, saves = 0;
  for (let t = 0; t < 1500; t++) {
    step(w, scriptedCmd(t)); shots += w.enemyShots.length ? 1 : 0; bolts += w.projectiles.length ? 1 : 0;
    if (t % 60 === 59) { const p = parseSave(JSON.stringify(makeSave(w, 'mid-level', { now: t }))); assert.equal(p.ok, true); const l = loadWorld(p.save, mapLoader); assert.equal(l.ok, true, 'tick ' + t + ': ' + (l.detail ?? '')); saves++; }
  }
  assert.equal(saves, 25); assert.ok(shots + bolts > 0, 'the run had something in the air at some tick (' + shots + ' + ' + bolts + ')');
});

test('honest saves from real routes on the maps with the unusual lists (tears and patches, pulses, spikes, spores, sectors) are all accepted: 985 of 985 on fourteen maps when this rule was written', () => {
  let saves = 0;
  for (const id of ['C1E3M04', 'C2M24', 'C2M29', 'C1E4M08']) {
    runRoute(shippedMap(id), shippedRoute(id + '.main'), { seed: 1, difficulty: 'normal', onTick: (w, t) => {
      if (t % 150 !== 0) return; const p = parseSave(JSON.stringify(makeSave(w, 'mid-level', { now: t }))), l = p.ok ? loadWorld(p.save, (m) => shippedMap(m)) : p; saves++;
      assert.equal(l.ok, true, id + ' tick ' + t + ': ' + (l.detail ?? l.reason));
    } });
  }
  assert.ok(saves >= 30, 'a real number of saves was checked: ' + saves);
});

test('SaveStore: slots, empty slot, and corrupt slot handled without throwing', () => {
  const mem = new Map(); const storage = { getItem: (k) => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => mem.set(k, v), removeItem: (k) => mem.delete(k) };
  const store = new SaveStore(storage);
  assert.equal(store.read('a').reason, 'empty');
  store.write('a', makeSave(createWorld(loadMap(), { seed: 1 }), 'level-start')); assert.equal(store.read('a').ok, true);
  storage.setItem('hushfall.save.b', '\u0000garbage'); assert.equal(store.read('b').reason, 'corrupt');
  store.clear('a'); assert.equal(store.read('a').reason, 'empty');
});
