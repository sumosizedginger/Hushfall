// Every shipped map must clear the same objective bar (the one tools/verify-map.mjs applies): valid, fully reachable, completable by the canonical route
// on every difficulty, NOT completable by a passive runner, damaging to a perfect bot, deterministic, story delivered, and the map's own `quality` contract met.
// Map-specific design contracts live in tests/shipped.test.js (Marrow Quay); this file is the generic bar for all maps.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { validateMap, parseMap } from '../src/engine/mapformat.js';
import { runRoute } from '../src/engine/harness.js';
import { evaluateViability, viabilityChecks, levelFacts, qualityChecks, analyseReach } from '../src/engine/viability.js';
import { ROOT } from './helpers.js';

const ids = fs.readdirSync(path.join(ROOT, 'maps')).filter((f) => f.endsWith('.json')).map((f) => f.replace('.json', '')).sort();
const load = (id) => JSON.parse(fs.readFileSync(path.join(ROOT, 'maps', id + '.json'), 'utf8'));
const route = (id, name) => { const f = path.join(ROOT, 'routes', `${id}.${name}.route.json`); return fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : null; };

for (const id of ids) {
  const src = load(id), map = parseMap(src), main = route(id, 'main'), secret = route(id, 'secret');

  test(`${id} ${src.name}: valid, every pickup/enemy/secret reachable, the exit reachable`, () => {
    assert.deepEqual(validateMap(src), { ok: true, errors: [] });
    const r = analyseReach(map); assert.equal(r.exitReachable, true); assert.deepEqual(r.unreachable, []); assert.ok(r.secretsReachable.every((s) => s.reachable), JSON.stringify(r.secretsReachable));
  });

  test(`${id}: has a canonical main route; viability gates pass (runner blocked, fighter completes on all difficulties, damage rises, par plausible)`, () => {
    assert.ok(main, 'routes/' + id + '.main.route.json exists');
    const v = evaluateViability(map, main);
    for (const c of viabilityChecks(v, map.par?.time)) assert.ok(c.ok, c.name + ' ' + c.detail);
    const facts = levelFacts(map);
    for (const c of qualityChecks(map, src.quality, facts, v.normal.fighter.seconds)) assert.ok(c.ok, c.name + ' ' + c.detail);
  });

  test(`${id}: deterministic (same seed, same final state) and its story is delivered by the routes`, () => {
    const a = runRoute(map, main, { seed: 5 }), b = runRoute(map, main, { seed: 5 });
    assert.equal(a.hash, b.hash); assert.equal(a.ticks, b.ticks);
    const seen = new Set(a.world.messagesSeen); if (secret) for (const m of runRoute(map, secret, { seed: 1 }).world.messagesSeen) seen.add(m);
    assert.deepEqual(map.messages.map((m) => m.id).filter((m) => !seen.has(m)), [], 'every message is delivered by the main or secret route');
  });

  if (map.secrets.length) test(`${id}: only the secret route finds the secret`, () => {
    assert.ok(secret, 'a secret route exists'); const m = runRoute(map, main, { seed: 1 }), s = runRoute(map, secret, { seed: 1 });
    assert.equal(m.world.stats.secrets, 0); assert.equal(s.result, 'complete', s.failure); assert.equal(s.world.stats.secrets, map.secrets.length);
  });
}
