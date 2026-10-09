// PT-024: no place a player can walk or fall into leaves no way to the exit. The Pump Cathedral's catwalk stopped one cell short of the east wall, leaving a trench at floor level behind it that the east bays then
// widened: step off the back of the 4 m catwalk and there was no way up. src/engine/traps.js finds such cells (forward-reachable from the spawn, but no longer able to reach an exit) from the sim's own step rules.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { parseMap } from '../src/engine/mapformat.js';
import { findTraps } from '../src/engine/traps.js';
import { mapLintChecks } from '../tools/maplint.mjs';
import { shippedMap, ROOT } from './helpers.js';

/** a stair of 0.5 m steps up to a 4 m platform (x 1..9), and behind it a strip at x = 10 whose floor is `back` (units of 0.5 m) */
const stairs = (back, { sector = null } = {}) => parseMap({
  format: 1, id: 'T1', version: 1, name: 'Stair', ceilingHeight: 8, doors: [], secrets: [],
  grid: ['############', '#..........#', '#..........#', '#..........#', '############'],
  heights: ['000000000000', '001234567' + '8' + back + '0', '001234567' + '8' + back + '0', '001234567' + '8' + back + '0', '000000000000'].map((r) => r.slice(0, 12)),
  ...(sector ? { sectors: [sector], triggers: [{ id: 'raise', when: 'start', do: [{ sector: { id: sector.id, to: 'high' } }] }] } : {}),
  entities: [{ type: 'player', at: [1, 2], facing: 'east' }, { type: 'exit', at: [1, 3] }],
});

test('a strip of floor behind a raised platform is a trap: step off the back of the platform and the pocket cannot reach the exit', () => {
  const r = findTraps(stairs('0'));
  assert.equal(r.traps, 3, 'the three cells of the strip'); assert.equal(r.groups.length, 1);
  assert.deepEqual([r.groups[0].x, r.groups[0].z], [[10, 10], [1, 3]]); assert.deepEqual(r.groups[0].from.sort(), ['9,1', '9,2', '9,3'], 'entered from the platform\'s back edge');
});

test('flush with the platform it is not a trap; a drop of 0.5 m is one a player can climb back up (the step rule is 0.6 m)', () => {
  assert.equal(findTraps(stairs('8')).traps, 0, 'flush');
  assert.equal(findTraps(stairs('7')).traps, 0, 'a half-metre drop climbs back');
  assert.equal(findTraps(stairs('6')).traps, 3, 'a metre does not');
});

test('the map lint (so verify-map and `npm run map`) fails a map with a trap and says where', () => {
  const bad = mapLintChecks(stairs('0')).find((c) => /no trap/.test(c.name)), ok = mapLintChecks(stairs('8')).find((c) => /no trap/.test(c.name));
  assert.equal(bad.ok, false); assert.match(bad.detail, /3 cells at x 10..10 z 1..3/); assert.equal(ok.ok, true);
});

test('a moving floor counts at either of its heights (a lift in the trench is a way up, as reach.js has it)', () => {
  const lift = { id: 'lift', cells: [[10, 1], [10, 2], [10, 3]], low: 0, high: 4, start: 'low' };
  assert.equal(findTraps(stairs('0', { sector: lift })).traps, 0, 'the strip is a lift that rises to the platform');
});

test('EVERY shipped map is free of traps (and so is the Range)', () => {
  const dir = path.join(ROOT, 'maps'), bad = [];
  for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.json'))) { const r = findTraps(parseMap(JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')))); if (r.traps) bad.push(`${f}: ${r.groups.map((g) => `${g.cells} cells at x ${g.x} z ${g.z} (floor ${g.floor} m)`).join('; ')}`); }
  assert.deepEqual(bad, []);
  const range = path.join(ROOT, 'maps-dev/RANGE.json'); if (fs.existsSync(range)) assert.equal(findTraps(parseMap(JSON.parse(fs.readFileSync(range, 'utf8')))).traps, 0, 'the Range');
});

test('a prop that blocks its cell never closes the way to the exit or leaves a pocket (static props, and the movable ones a player without the fork cannot move)', () => {
  const dir = path.join(ROOT, 'maps');
  for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.json'))) for (const props of ['static', 'all']) {
    const r = findTraps(parseMap(JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'))), { props }); assert.equal(r.traps, 0, `${f} with ${props} props as walls: ${r.groups.map((g) => `x ${g.x} z ${g.z}`).join('; ')}`);
  }
});

test('the Pump Cathedral\'s east catwalk runs wall to wall: the strip behind it and the east bays are at catwalk height (the trench is gone), so the only drops left are into the nave, which the cage climbs again', () => {
  const m = shippedMap('C1E2M06');
  for (let z = 8; z <= 42; z++) assert.equal(m.floor(57, z), 4, `(57, ${z}) is at catwalk height, not a trench`);
  for (const [x, z] of [[58, 10], [58, 16], [58, 22], [59, 28], [58, 34], [58, 40]]) if (m.kind(x, z) === 'floor') assert.equal(m.floor(x, z), 4, `the bay at ${x},${z} is level with the catwalk`);
  assert.equal(findTraps(m).traps, 0);
});
