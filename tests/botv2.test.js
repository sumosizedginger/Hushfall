// PT-052, Bot v2 FIRST HALF (the Director's Plan, P2): a map's gates accept a route that EITHER fighter policy completes: the old one (it stands still and shoots) or the strafing one (`weave: 2`: it strafes while any awake shooter is in range; a toll-shot is aimed at where the player IS, so a moving player is not hit).
// This is not a looser gate for its own sake: a map the standing bot dies on and a strafing one walks through unscathed is a map a competent player can play. These tests hold the pieces: the option is deterministic, `runRouteEither` says which policy completed, and a map of eleven Bellhands that kills the standing bot is completed by the strafing one (it still takes damage on the way: the pickups heal it).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { loadMapFile, loadRouteFile, runRoute, runRouteEither } from '../src/engine/harness.js';
import { viabilityChecks } from '../src/engine/viability.js';
import { ROOT } from './helpers.js';

const route = (id) => loadRouteFile(path.join(ROOT, 'routes', id + '.main.route.json')), map = (id) => loadMapFile(path.join(ROOT, 'maps', id + '.json'));

test('the strafing option is deterministic (same seed, same hash) and its default is the old standing fighter', () => {
  const m = map('C1E1M03'), r = route('C1E1M03');
  const a = runRoute(m, r, { seed: 3, difficulty: 'normal', weave: 2 }), b = runRoute(m, r, { seed: 3, difficulty: 'normal', weave: 2 }); assert.equal(a.hash, b.hash); assert.equal(a.ticks, b.ticks);
  const c = runRoute(m, r, { seed: 3, difficulty: 'normal' }), d = runRoute(m, r, { seed: 3, difficulty: 'normal', weave: false }); assert.equal(c.hash, d.hash, 'no option = the standing fighter');
});

test('runRouteEither returns the standing run when it completes, and says so', () => {
  const m = map('C1E1M03'), r = runRouteEither(m, route('C1E1M03'), { seed: 1, difficulty: 'easy' });
  assert.equal(r.result, 'complete'); assert.equal(r.policy, 'standing'); assert.equal(r.strafed, undefined, 'the strafing run is not even played when the standing one completes');
});

test('a crowd of Bellhands in the dark Signal House kills the standing fighter and the strafing one completes it: runRouteEither says "strafing"', () => {          // (ENEMY ACTIONS, 2026-10-26: the shots now come in turns and the cellar has a vest and a mend, so it took twelve Tollbearers turned Bellhands on Hard, not nine on Normal; PT-076: with the brain and two vests in the entry hall it is fourteen on Normal, found by a search over the count and the difficulty)
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bv2-'));
  try {
    const c = spawnSync(process.execPath, [path.join(ROOT, 'tools/mapkit/compile.mjs'), 'C1E1M07'], { cwd: ROOT, env: { ...process.env, MAP_OUT: dir, ROSTER_ID: 'C1E1M07', ROSTER_PLAN: JSON.stringify([{ from: 't', to: 'b', n: 14, pick: 'range' }]) }, encoding: 'utf8' });
    assert.equal(c.status, 0, (c.stderr || c.stdout).slice(0, 300));
    const m = loadMapFile(path.join(dir, 'C1E1M07.json')), r = route('C1E1M07'), stand = runRoute(m, r, { seed: 1, difficulty: 'normal' });
    assert.notEqual(stand.result, 'complete', 'the standing fighter does not get through a crowd of Bellhands in the dark');
    const either = runRouteEither(m, r, { seed: 1, difficulty: 'normal' }); assert.equal(either.result, 'complete'); assert.equal(either.policy, 'strafing'); assert.ok(either.world.stats.damageTaken < stand.world.stats.damageTaken + 100, 'it still bleeds (the pickups heal it), it is not a free walk');
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('the gate counts a seed as completed if either policy completes it, and says how many only strafing did', () => {
  const d = (over = {}) => ({ runner: { result: 'dead', damage: 100 }, ammo: { capacity: 300, fired: 100, capacityBy: {}, firedBy: {}, drops: true }, fighter: { completedSeeds: 3, seeds: 3, result: 'complete', damage: 30, meanDamage: 30, seconds: 100, kills: 20, ...over } });
  const v = (h, n) => ({ easy: d({ meanDamage: 5 }), normal: n, hard: h, threats: 20, gate: [], robust: {} });
  const fail = (x) => viabilityChecks(x, undefined).filter((c) => !c.ok).map((c) => c.name);
  assert.deepEqual(fail(v(d({ meanDamage: 40 }), d({ meanDamage: 20 }))), [], 'a healthy map passes');
  const only = v(d({ completedSeeds: 0, eitherSeeds: 2, strafedSeeds: 2, meanDamage: 40 }), d({ completedSeeds: 1, eitherSeeds: 3, strafedSeeds: 2, meanDamage: 20 }));
  assert.deepEqual(fail(only), [], 'seeds the standing fighter dies on count when the strafing one completes them');
  const names = viabilityChecks(only, undefined).map((c) => c.name).join(' | '); assert.ok(/2 did, 2 only by strafing/.test(names) && /3 did, 2 only by strafing/.test(names), names.slice(0, 300));
  assert.ok(fail(v(d({ completedSeeds: 0, eitherSeeds: 1, meanDamage: 40 }), d({ meanDamage: 20 }))).some((n) => /hard: the perfect fighter completes on 2 of 3/.test(n)), 'one seed in three is still not enough on hard');
});
