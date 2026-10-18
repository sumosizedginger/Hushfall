// PT-052 (R1): the director's floor. design/director-floor.json holds, for every map with combat, the numbers it must not fall below (density, shooters, ambushes, kinds, loops: never lower; the commonest kind's share, mirror overlap, size: never higher) and the list of REBUILT maps,
// which must also meet the laws of the Director's Plan. A floor only ever rises (`node tools/dev/director-audit.mjs --ratchet`); a map that is made worse fails here, and a rebuilt map that breaks a law fails here.
import test from 'node:test';
import assert from 'node:assert/strict';
import { auditAll, readFloor, belowFloor, laws, raiseFloor } from '../tools/dev/director-audit.mjs';

const rows = auditAll(), doc = readFloor();

test('every map with combat has a floor, and no map is below it', () => {
  const combat = rows.filter((r) => r.enemies > 0).map((r) => r.id);
  assert.deepEqual(Object.keys(doc.floor).sort(), combat.sort(), 'a floor for every combat map and for nothing else');
  assert.deepEqual(belowFloor(rows, doc), []);
});

test('the floor only rises: raising it from the current maps changes nothing that is already higher', () => {
  const up = raiseFloor(rows, doc);
  for (const id of Object.keys(doc.floor)) for (const k of Object.keys(doc.floor[id])) assert.ok(['topShare', 'symmetry', 'walk'].includes(k) ? up.floor[id][k] <= doc.floor[id][k] : up.floor[id][k] >= doc.floor[id][k], id + ' ' + k);
});

test('a rebuilt map meets the laws of the plan', () => {
  for (const id of doc.rebuilt ?? []) { const r = rows.find((x) => x.id === id); assert.ok(r, id + ' exists'); assert.deepEqual(laws(r), [], id + ' breaks a law'); }
});

test('the laws read the numbers the plan page quotes (a bad map is caught, a good one passes)', () => {
  const good = { id: 'C1E2M03', enemies: 40, topShare: 30, topKind: 'tollbearer', rangedShare: 25, kinds: 5, ambushes: 3, density: 20, secrets: 2, setpiece: false, boss: false };
  assert.deepEqual(laws(good), []);
  const bad = laws({ ...good, topShare: 61, rangedShare: 14, kinds: 3, ambushes: 0, density: 10, secrets: 5 }); assert.equal(bad.length, 6, bad.join(' | '));
  assert.deepEqual(laws({ ...good, id: 'C1E1M01', topShare: 50, kinds: 3, rangedShare: 19 }), [], 'the first maps are the introduction');
});
