import test from 'node:test';
import assert from 'node:assert/strict';
import { validateMap, parseMap, MapError } from '../src/engine/mapformat.js';
import { analyseReach } from '../src/engine/reach.js';
import { mapSrc, loadMap, setTile } from './helpers.js';

const bad = (mutate, expect) => {
  const s = mapSrc(); mutate(s);
  const v = validateMap(s);
  assert.equal(v.ok, false, 'expected invalid');
  assert.ok(v.errors.some((e) => expect.test(e)), `expected /${expect}/ in ${JSON.stringify(v.errors)}`);
};

test('C1E1M01 is a valid map with sane counts', () => {
  const v = validateMap(mapSrc());
  assert.deepEqual(v, { ok: true, errors: [] });
  const c = loadMap().counts();
  assert.deepEqual(c, { enemies: 8, items: 10, secrets: 1 });
});

test('map validation rejects broken maps (negative cases)', () => {
  bad((s) => { s.grid[3] += '#'; }, /grid row 3 has length/);
  bad((s) => setTile(s, 5, 5, '?'), /unknown tile/);
  bad((s) => setTile(s, 0, 4, '.'), /edge .* not a wall/);
  bad((s) => { s.doors.pop(); }, /'D' tile at 27,3 has no doors entry/);
  bad((s) => { s.doors[1].key = 'gold'; }, /unknown key/);
  bad((s) => { s.entities = s.entities.filter((e) => e.kind !== 'key_brass'); }, /needs 'brass' but no such key pickup/);
  bad((s) => { s.entities = s.entities.filter((e) => e.type !== 'exit'); }, /no exit/);
  bad((s) => { s.entities.push({ type: 'player', at: [2, 2] }); }, /exactly 1 player/);
  bad((s) => { s.entities.push({ type: 'enemy', kind: 'tollbearer', at: [0, 0] }); }, /not on a floor/);
  bad((s) => { s.entities.push({ type: 'enemy', kind: 'nope', at: [2, 6] }); }, /unknown enemy kind/);
  bad((s) => { s.secrets[0].panel = [12, 3]; }, /panel must be on an 'S' tile/);
  bad((s) => setTile(s, 2, 9, 'D'), /no doors entry|straight wall line/);
  assert.throws(() => parseMap({ format: 1 }), MapError);
});

test('reachability: exit, key and secret are reachable on the shipped map', () => {
  const r = analyseReach(loadMap());
  assert.equal(r.exitReachable, true);
  assert.deepEqual(r.keysObtainable, ['brass']);
  assert.deepEqual(r.secretsReachable, [{ id: 'pocket', reachable: true }]);
  assert.deepEqual(r.unreachable, []);
});

test('reachability catches a softlock: key placed behind its own locked door', () => {
  const s = mapSrc();
  const k = s.entities.find((e) => e.kind === 'key_brass'); k.at = [30, 3];          // inside the boathouse
  assert.equal(validateMap(s).ok, true, 'structurally valid, so only reachability can catch it');
  const r = analyseReach(parseMap(s));
  assert.equal(r.exitReachable, false);
  assert.deepEqual(r.keysObtainable, []);
});

test('reachability catches a walled-off exit', () => {
  const s = mapSrc();
  for (const cz of [1, 2, 4, 5, 6]) setTile(s, 27, cz, '#');
  setTile(s, 27, 3, '#'); s.doors = s.doors.filter((d) => d.at[0] !== 27);
  const r = analyseReach(parseMap(s));
  assert.equal(r.exitReachable, false);
});
