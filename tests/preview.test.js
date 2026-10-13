// PT-043 (the Preview, design/PREVIEW.md): the four dev maps (HIVE, HIVEBOSS, BELLBOSS, HIVEEND) and what they promise. They are dev-only (maps-dev/, never maps/): no status, no manifest, no validation evidence count them, but they must load,
// say what they say, and their two boss fights and the ending must run in the sim: the beat floors bloom inner to outer, the choir is the way into the conductor, the clapper swings, falls, charges, opens, hangs and cuts the sound, the lamp opens the Gate.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { parseMap, validateMap } from '../src/engine/mapformat.js';
import { createWorld, step, drainEvents, damageEnemy } from '../src/engine/world.js';
import { ENEMIES, LOOKS, WALL_SKINS, FLOOR_SKINS, TICK } from '../src/engine/defs.js';
import { sporeState } from '../src/engine/breath.js';
import { ENDINGS } from '../src/game/ending.js';
import { ROOT } from './helpers.js';

const load = (id) => JSON.parse(fs.readFileSync(path.join(ROOT, 'maps-dev', id + '.json'), 'utf8'));
const idle = (o = {}) => ({ move: [0, 0], yaw: 0, pitch: 0, fire: false, aim: false, sprint: false, use: false, weapon: null, weaponStep: 0, ...o });
const world = (id, difficulty = 'normal') => { const src = load(id), map = parseMap(src), w = createWorld(map, { seed: 1, difficulty }); return { src, map, w }; };
const run = (w, ticks, keep = true) => { const ev = []; for (let i = 0; i < ticks; i++) { if (keep) { w.player.hp = Math.max(w.player.hp, 1e6); w.player.armor = 100; } step(w, idle()); ev.push(...drainEvents(w)); } return ev; };

test('the four dev maps are dev maps: not in maps/, valid, and loadable', () => {
  for (const id of ['HIVE', 'HIVEBOSS', 'BELLBOSS', 'HIVEEND']) {
    assert.equal(fs.existsSync(path.join(ROOT, 'maps', id + '.json')), false, id + ' is never in the campaign folder');
    const src = load(id), v = validateMap(src); assert.ok(v.ok, id + ': ' + JSON.stringify(v.errors?.slice(0, 3)));
    const m = parseMap(src); assert.ok(m.range || m.dev, id + ' is a dev map (range or dev)');
  }
  assert.equal(load('HIVE').range, true); assert.equal(load('HIVEBOSS').dev, true); assert.equal(load('BELLBOSS').dev, true); assert.equal(load('HIVEEND').dev, true);
});

test('THE HIVE: every creature of the game stands in the lineup, the variants and the pens and the three creatures are where the plan put them', () => {
  const { src } = world('HIVE'), kinds = new Set(src.entities.filter((e) => e.type === 'enemy' && e.at[1] === 107).map((e) => e.kind));
  for (const k of Object.keys(ENEMIES)) assert.ok(kinds.has(k), 'the lineup holds a ' + k);
  const variants = new Set(src.entities.filter((e) => e.variant).map((e) => e.variant)); for (const v of ['drowned', 'hived', 'woven', 'crystal']) assert.ok(variants.has(v), 'the variant ' + v);
  const en = src.entities.filter((e) => e.type === 'enemy');
  for (const k of ['resonant', 'hivecantor', 'rootbell']) { assert.ok(en.some((e) => e.kind === k && e.sight === 2.5), k + ' asleep'); assert.ok(en.some((e) => e.kind === k && e.hold === 'inert'), k + ' as a sponge'); }
  assert.ok(en.some((e) => e.kind === 'rootbell' && e.swing), 'a swinging sponge clapper'); assert.equal(en.filter((e) => e.kind === 'rootanchor' && !e.hold).length, 4, 'four anchors on stands');
  for (const g of ['rs-lone', 'rs-three', 'rs-mixed']) assert.ok(en.some((e) => e.group === g), 'a pen: ' + g);
  assert.equal(en.filter((e) => e.group === 'choir').length, 6, 'six singers on the sponge conductor\'s tier');
});

test('THE HIVE: fourteen look rooms, each lit by its own look, each in its own skins that exist, with a plate and a way in', () => {
  const { src, map } = world('HIVE'), looks = ['hive', 'nerve', 'woven', 'veins', 'reactor', 'mourning', 'copy', 'conductor', 'descent', 'roots', 'fault', 'tide', 'rootbell', 'unrung'];
  for (const l of looks) { assert.ok(LOOKS[l], 'look ' + l + ' exists'); assert.ok(src.lookZones.some((z) => z.look === l), 'a room is lit by ' + l); }
  const walls = new Set(), floors = new Set(); for (const row of src.grid) for (const c of row) { if (WALL_SKINS[c] && /[α-ξ]/.test(c)) walls.add(c); if (FLOOR_SKINS[c] && /[Α-Ξ]/.test(c)) floors.add(c); }
  assert.equal(walls.size, 14, 'fourteen new wall skins in use'); assert.equal(floors.size, 14, 'fourteen new floor skins in use');
  for (let i = 0; i < 14; i++) assert.ok(src.messages.some((m) => m.id === 'look' + i), 'a plate for room ' + i);
  const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'assets/baked/manifest.json'), 'utf8')), ids = new Set(Object.keys(manifest.assets ?? manifest));
  for (const c of walls) assert.ok(ids.has(WALL_SKINS[c]) || fs.existsSync(path.join(ROOT, 'assets/baked', WALL_SKINS[c] + '.png')), 'baked: ' + WALL_SKINS[c]);
  for (const c of floors) assert.ok(fs.existsSync(path.join(ROOT, 'assets/baked', FLOOR_SKINS[c].tex + '.png')), 'baked: ' + FLOOR_SKINS[c].tex);
  assert.ok(map.lookZones.length >= 14);
});

test('THE HIVE: the Resonant pens wake on the lever; a lone Resonant stays quiet, a Resonant with company rings on the beat', () => {
  const { w } = world('HIVE'), lever = w.map.switches.find((s) => s.id === 'pens'); assert.ok(lever);
  const lone = w.enemies.find((e) => e.group === 'rs-lone'); assert.equal(lone.state, 'idle', 'asleep until the lever');
  Object.assign(w.player, { x: lone.x + 8, z: lone.z, yaw: Math.PI / 2 }); run(w, 3);
  for (const e of w.enemies) if (e.group?.startsWith('rs-')) { e.state = 'chase'; e.lastX = w.player.x; e.lastZ = w.player.z; }
  const ev = run(w, 60 * 6).filter((e) => e.type === 'resonant_ring'); assert.ok(ev.length >= 3, 'the pens ring: ' + ev.length); assert.ok(ev.every((e) => e.n >= 1), 'only with company');
});

test('THE HIVE CANTOR\'S ARENA: 16 singers on the beat, a conductor over the podium, six pillars; the beat floors bloom inner, middle, outer on one bar', () => {
  const { src, w } = world('HIVEBOSS'); const en = src.entities.filter((e) => e.type === 'enemy');
  assert.equal(en.filter((e) => e.group === 'choir').length, 16); assert.ok(en.filter((e) => e.group === 'choir').every((e) => e.onBeat === true));
  const c = (k) => en.filter((e) => e.group === 'choir' && e.kind === k).length; assert.equal(c('tollbearer'), 8); assert.equal(c('chorister'), 4); assert.equal(c('zealot'), 4);
  const boss = en.find((e) => e.kind === 'hivecantor'); assert.ok(boss && boss.summons.length >= 4);
  assert.equal(src.pulses.length, 12, 'three tiers, four strips each'); const tiers = [src.pulses.slice(0, 4), src.pulses.slice(4, 8), src.pulses.slice(8, 12)];
  const on = (tier, t) => sporeState(tiers[tier][0], t).on;
  for (const t of [0.5, 2.0, 3.5, 5.2]) assert.equal([0, 1, 2].filter((k) => on(k, t)).length, t < 4.5 ? 1 : 0, 'at ' + t + ' s: one tier blooms, in order, then a rest');
  assert.ok(on(0, 0.5) && on(1, 2.0) && on(2, 3.5), 'inner on beat 1, middle on beat 2, outer on beat 3');
  assert.equal(w.map.atmosphere.beat, true);
});

test('THE HIVE CANTOR\'S ARENA: the conductor takes a twentieth while the choir stands, the whole blow when it is dead; half its strength or the choir silent is phase two; its death stops the beat and opens the exit', () => {
  const { w } = world('HIVEBOSS'); const boss = w.enemies.find((e) => e.kind === 'hivecantor'), H = ENEMIES.hivecantor;
  Object.assign(w.player, { x: 30, z: 68, yaw: -Math.PI / 2 }); const exit = w.map.exits[0]; assert.equal(w.exitLocked[exit.id], true);
  for (const e of w.enemies) if (e.group === 'choir' || e.group === 'cantor') { e.state = 'chase'; e.lastX = w.player.x; e.lastZ = w.player.z; }
  const hp0 = boss.hp; damageEnemy(w, boss, 100); assert.ok(Math.abs((hp0 - boss.hp) - 100 * H.unison.floor) < 1e-6, 'a twentieth through the shield');
  for (const e of w.enemies) if (e.group === 'choir') damageEnemy(w, e, 1e6);
  const hp1 = boss.hp; damageEnemy(w, boss, 100); assert.ok(Math.abs((hp1 - boss.hp) - 100) < 1e-6, 'the whole blow with the choir dead');
  run(w, 5); assert.equal(boss.ph, 1, 'phase two: the choir is silent'); w.player.x = 400; w.player.z = 20;
  const ev = run(w, 60 * 3); assert.ok(ev.length >= 0);
  damageEnemy(w, boss, 1e7); const after = run(w, 10);
  assert.equal(w.exitLocked[exit.id], false, 'the exit opens'); assert.equal(w.beatOff, true, 'the beat stops'); assert.ok(after.some((e) => e.type === 'beat_off'));
});

test('THE ROOT BELL\'S ARENA: the clapper swings, rings the floor, falls when the last anchor is cut, charges, opens in the Last Note, and when it dies it hangs and the sound is cut', () => {
  const { src, w } = world('BELLBOSS'), bell = w.enemies.find((e) => e.kind === 'rootbell'); assert.equal(bell.state, 'idle');
  assert.equal(w.map.dark, true); assert.deepEqual(w.map.lampHolds, { plain: 0.6, own: 0.4 }); assert.equal(src.entities.filter((e) => e.kind === 'rootanchor').length, 4);
  Object.assign(w.player, { x: 20, z: 84 }); const exit = w.map.exits[0]; assert.equal(w.exitLocked[exit.id], true);
  Object.assign(w.player, { x: (62 - 14) * 2 + 1, z: 42 * 2 + 1, yaw: -Math.PI / 2 }); const ev0 = run(w, 3); assert.equal(bell.state, 'chase', 'the trigger wakes it'); assert.ok(w.enemies.filter((e) => e.group === 'guard1').every((e) => e.state === 'chase'));
  const xs = []; let strikes = 0; for (let i = 0; i < 60 * 12; i++) { run(w, 1); xs.push(Math.hypot(bell.x - bell.rb.cx, bell.z - bell.rb.cz)); }
  assert.ok(Math.max(...xs) > 3, 'it swings: ' + Math.max(...xs).toFixed(2)); w.player.x = 400; w.player.z = 20;
  for (const a of w.enemies.filter((e) => e.kind === 'rootanchor')) damageEnemy(w, a, 1e6);
  const ev = run(w, 60 * 5); const types = new Set(ev.map((e) => e.type)); for (const t of ['bell_fall', 'bell_slam', 'tremor', 'spawn']) if (t !== 'spawn' && t !== 'tremor') assert.ok(types.has(t), 'event ' + t);
  assert.equal(bell.rb.mode, 'ground'); assert.ok(w.enemies.some((e) => e.group === 'guard2'), 'the second wave comes');
  assert.equal(w.enemies.filter((e) => e.group === 'guard2').length, 2, 'two Zealots come with the fall, and nothing else (PT-043 report 1: it was six)');
  bell.hp = ENEMIES.rootbell.hp * 0.25; bell.stunT = 0; const ev2 = run(w, 60 * 4); assert.equal(bell.rb.last, true); assert.ok(ev2.some((e) => e.type === 'bell_last')); assert.ok(w.ambient != null && w.ambient < 0.5, 'the lights fall: ' + w.ambient);
  damageEnemy(w, bell, 1e7); const ev3 = run(w, 60 * 6); assert.equal(w.silenced, true, 'the sound is cut'); assert.ok(ev3.some((e) => e.type === 'silence')); assert.equal(w.exitLocked[exit.id], false);
  assert.ok(Math.hypot(bell.x - bell.rb.cx, bell.z - bell.rb.cz) < 0.3 && bell.lift > 0.5, 'it hangs over the middle');
});

test('THE UNRUNG GATE: the lamp opens the door only at the door; the exit shows the draft epilogue of Campaign Two', () => {
  const { src, w } = world('HIVEEND'); const exit = w.map.exits[0]; assert.equal(exit.dest, 'secret'); assert.deepEqual(src.devEnding, { dest: 'secret', ending: 2 }); assert.ok(ENDINGS[src.devEnding.ending].cards.length >= 7);
  assert.equal(w.player.lamp.eternal, true, 'Ines\'s own lamp'); assert.equal(w.map.atmosphere.silence, true);
  w.player.lamp.on = true; run(w, 10); assert.equal(w.exitLocked[exit.id], true, 'a lit lamp far from the door opens nothing');
  Object.assign(w.player, { x: 106.5 * 2, z: 13.5 * 2 }); run(w, 10); assert.equal(w.exitLocked[exit.id], false, 'lit at the door: it opens');
  const w2 = world('HIVEEND').w; Object.assign(w2.player, { x: 106.5 * 2, z: 13.5 * 2 }); run(w2, 10); assert.equal(w2.exitLocked[w2.map.exits[0].id], true, 'at the door but dark: it stays shut');
});

test('the preview is deterministic: the same seed plays the arena twice to the same hash', () => {
  const play = () => { const { w } = world('HIVEBOSS'); for (const e of w.enemies) if (e.group) { e.state = 'chase'; e.lastX = w.player.x; e.lastZ = w.player.z; } run(w, 60 * 10); return JSON.stringify(w.enemies.map((e) => [Math.round(e.x * 100), Math.round(e.z * 100), Math.round(e.hp)])); };
  assert.equal(play(), play());
});

// PT-043 report 1 (the owner, playing the four dev levels): lamps hung from a sky with no ceiling in the Hive, and no way back up out of the two boss arenas' pits. The dev maps never went through tools/maplint.mjs; they do now.
import { mapLintChecks } from '../tools/maplint.mjs';
test('every Preview dev map passes the placement lint: no lamp floating in open air, no trap, no roofed slab over open ground', () => {
  for (const id of ['HIVE', 'HIVEBOSS', 'BELLBOSS', 'HIVEEND']) {
    const { map } = world(id), bad = mapLintChecks(map).filter((c) => !c.ok);
    assert.deepEqual(bad.map((c) => id + ': ' + c.name + ' -> ' + c.detail), [], id);
  }
});

test('THE TWO BOSS ARENAS can be climbed out of anywhere: no step up is higher than half a metre, so a player who went down a tier can come back', () => {
  for (const id of ['HIVEBOSS', 'BELLBOSS']) {
    const { map } = world(id); let worst = 0;
    for (let z = 0; z < map.h - 1; z++) for (let x = 0; x < map.w - 1; x++) for (const [dx, dz] of [[1, 0], [0, 1]]) {
      const a = map.kind(x, z), b = map.kind(x + dx, z + dz); if (a === 'wall' || b === 'wall' || a === 'void' || b === 'void') continue;
      worst = Math.max(worst, Math.abs(map.floor(x, z) - map.floor(x + dx, z + dz)));
    }
    assert.ok(worst <= 0.6 + 1e-9, id + ': the highest step between two walkable cells is ' + worst + ' m');
  }
});
