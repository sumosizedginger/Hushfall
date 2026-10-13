// PT-045 (DROP B of the Preview): THE HIVE YARDS, THE DARK (maps-dev/HIVEDARK.json): the sleepers' yard (the noise tell) and the lamp yard (the lamp holds sound back). Dev-only, like HIVE. Played in the sim: the tell's numbers are what a shot really does to the sleepers, a lit lantern cuts a ring
// to 0.6 and Ines's own lamp to 0.4, and the other answers (a pillar, a half-metre step) work as the plates say. Whether any of it is good to play is the owner's, in the DEV picker.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { parseMap, validateMap } from '../src/engine/mapformat.js';
import { createWorld, step, drainEvents, noise } from '../src/engine/world.js';
import { runActions } from '../src/engine/script.js';
import { noiseTell } from '../src/engine/noisetell.js';
import { analyseReach } from '../src/engine/reach.js';
import { findTraps } from '../src/engine/traps.js';
import { mapLintChecks } from '../tools/maplint.mjs';
import { DIFFICULTY, LANTERN } from '../src/engine/defs.js';
import { ROOT } from './helpers.js';

const load = () => JSON.parse(fs.readFileSync(path.join(ROOT, 'maps-dev', 'HIVEDARK.json'), 'utf8'));
const idle = (o = {}) => ({ move: [0, 0], yaw: 0, pitch: 0, fire: false, aim: false, sprint: false, use: false, weapon: null, weaponStep: 0, map: false, ...o });
const fresh = () => createWorld(parseMap(load()), { seed: 1, difficulty: 'easy' });
const C = (c) => (c + 0.5) * 2;
const WEST = Math.PI / 2, EAST = -Math.PI / 2;

test('THE DARK YARDS: a dev map, valid, dark with a lantern, the lamp\'s hold and the noise tell on; no trap, no stray lamp, everything reachable', () => {
  assert.equal(fs.existsSync(path.join(ROOT, 'maps', 'HIVEDARK.json')), false); const src = load(), v = validateMap(src); assert.ok(v.ok, JSON.stringify(v.errors?.slice(0, 3)));
  const m = parseMap(src); assert.equal(m.range, true); assert.equal(m.dark, true); assert.deepEqual(m.lampHolds, { plain: 0.6, own: 0.4 }); assert.equal(m.noiseTell, true); assert.ok(m.lantern && m.lantern.oil === 600);
  const bad = mapLintChecks(m).filter((c) => !c.ok); assert.deepEqual(bad.map((c) => c.name + ': ' + c.detail), []); assert.equal(findTraps(m).traps, 0); const r = analyseReach(m); assert.equal(r.exitReachable, true); assert.deepEqual(r.unreachable, []);
  assert.equal(src.entities.filter((e) => e.type === 'enemy' && !e.hold).length, 10, 'ten sleepers'); assert.equal(src.entities.filter((e) => e.hold === 'turn' && e.kind === 'subcantor').length, 1);
  assert.ok(src.entities.filter((e) => e.type === 'switch').map((e) => e.id).sort().join() === 'own,plain' && src.entities.filter((e) => e.type === 'switch').every((e) => e.once === false), 'two levers, repeatable');
});

test('THE SLEEPERS\' YARD: the HUD number is what a shot really does: at the same place the loud gun wakes sleepers the quiet one does not, and nothing wakes without a noise', () => {
  const at = (weapon) => { const w = fresh(); Object.assign(w.player, { x: C(33), z: C(30) }); w.player.weapon = weapon; return w; };
  const w = at('flare'); for (let i = 0; i < 120; i++) { step(w, idle()); drainEvents(w); } assert.equal(w.enemies.filter((e) => !e.hold && e.state !== 'idle').length, 0, 'ten sleepers sleep through two seconds of nothing');
  const loud = at('flare'), quiet = at('arc'), lt = noiseTell(loud), qt = noiseTell(quiet); assert.equal(lt.label, 'LOUD'); assert.equal(qt.label, 'QUIET'); assert.ok(lt.radius > qt.radius);
  noise(loud, loud.player.x, loud.player.z, lt.radius); noise(quiet, quiet.player.x, quiet.player.z, qt.radius); const awake = (x) => x.enemies.filter((e) => !e.hold && e.state !== 'idle').length;
  assert.ok(awake(loud) > awake(quiet), 'the number on the HUD is the number that wakes them: ' + awake(loud) + ' with the ' + lt.radius + ' m gun, ' + awake(quiet) + ' with the ' + qt.radius + ' m one'); assert.ok(awake(quiet) < 10);
  const dark = at('arc'); assert.equal(noiseTell(dark).light.sees, LANTERN.sightDark); step(dark, idle({ lamp: true })); assert.equal(noiseTell(dark).light.sees, LANTERN.sightLit, 'lit: seen from 24 m'); assert.equal(dark.lit, true);
});

/** the first ring of the Sub-Cantor to reach the player: { real damage, whether any ring hit }; armour is held at 0 so the number is the ring's own */
function ringTaken(setup, secs = 14) {
  const w = fresh(); Object.assign(w.player, { x: C(102), z: C(40), yaw: EAST }); setup(w); const hits = [];
  for (let i = 0; i < Math.round(secs * 60) && hits.length < 1; i++) { w.player.armor = 0; w.player.hp = 100; step(w, idle()); for (const e of drainEvents(w)) if (e.type === 'hurt') hits.push(e.amount); }
  return hits[0] ?? 0;
}
test('THE LAMP YARD: a ring from the Sub-Cantor hurts; a lit lantern cuts it to 0.6, Ines\'s own lamp to 0.4; a pillar in the way and a half-metre step each avoid it altogether', () => {
  const base = Math.round(12 * DIFFICULTY.easy.enemyDamage), want = (k) => Math.round(base * k);
  const bare = ringTaken(() => {}); assert.equal(bare, base, 'unlit: the ring is ' + base);
  const lit = ringTaken((w) => step(w, idle({ lamp: true }))); assert.equal(lit, want(0.6), 'the plain lantern lit: 0.6 of it');
  const own = ringTaken((w) => { runActions(w, [{ lamp: 'own' }]); step(w, idle({ lamp: true })); }); assert.equal(own, want(0.4), 'Ines\'s own lamp lit: 0.4 of it');
  const off = ringTaken((w) => { runActions(w, [{ lamp: 'own' }]); }); assert.equal(off, base, 'the lamp holds nothing while it is out');
  const cover = ringTaken((w) => Object.assign(w.player, { x: 207.3, z: 75.1 }), 24); assert.equal(cover, 0, 'behind a pillar, on the line from the Sub-Cantor through it: no ring reaches you');
  const ledge = ringTaken((w) => Object.assign(w.player, { x: C(108), z: C(31) }), 24); assert.equal(ledge, 0, 'on the ledge a metre and a half up: the ring (a metre high) passes under you');
});

test('the `rings` flag: only a range target that has a hold may say it, and only true or false', () => {
  const src = load(), v = (f) => { const s = JSON.parse(JSON.stringify(src)); f(s); return validateMap(s); };
  assert.equal(v(() => {}).ok, true);
  let r = v((s) => { s.entities.find((e) => e.kind === 'zealot').rings = true; }); assert.equal(r.ok, false); assert.ok(r.errors.some((e) => /may ring/.test(e)), 'a live creature may not');
  r = v((s) => { s.entities.find((e) => e.rings).rings = 'yes'; }); assert.equal(r.ok, false); r = v((s) => { delete s.range; }); assert.equal(r.ok, false);
});
