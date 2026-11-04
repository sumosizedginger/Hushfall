// PT-083 L0: every main map meets the floors or carries a written reason. The floors that need a route replayed (the first fight, the longest quiet walk) run only under FULL_AUDIT (the whole sweep takes minutes);
// the rest are read from the maps every time. A reason is a sentence, and a reason may not be kept for a floor the map now meets.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { auditAll, routeStats } from '../tools/dev/director-audit.mjs';
import { failing, readFloorDoc, FLOORS } from '../tools/dev/floors.mjs';
import { ROOT } from './helpers.js';

const rows = auditAll().filter((r) => /M/.test(r.id.slice(2))),
  doc = readFloorDoc(),
  full = !!process.env.FULL_AUDIT,
  mapOf = (id) => JSON.parse(fs.readFileSync(path.join(ROOT, 'maps', id + '.json'), 'utf8'));

test('there are 62 main maps and every one has a named moment', () => {
  assert.equal(rows.length, 62);
  for (const r of rows) assert.ok(doc.moments?.[r.id]?.length > 20, r.id);
});

test('every excuse names a floor and gives a reason in words', () => {
  for (const [id, ex] of Object.entries(doc.excused)) {
    assert.ok(
      rows.some((r) => r.id === id),
      id + ' is a main map',
    );
    for (const [floor, why] of Object.entries(ex)) {
      assert.ok(FLOORS[floor], `${id}: ${floor} is a floor`);
      assert.ok(typeof why === 'string' && why.length >= 20, `${id}: the reason for ${floor}`);
    }
  }
});

test(`every main map meets the floors or has a written reason${full ? '' : ' (the floors read from the map; FULL_AUDIT replays the routes)'}`, () => {
  const bad = [];
  for (const r of rows) {
    const f = failing(r, full ? routeStats(r.id) : null, mapOf(r.id), doc);
    if (Object.keys(f).length) bad.push(`${r.id}: ${Object.values(f).join('; ')}`);
  }
  assert.deepEqual(bad, []);
});

test('at least a third of the main maps have a key hunt', () => {
  const keyed = rows.filter((r) => r.keys > 0).length;
  assert.ok(keyed >= rows.length / 3, `${keyed} of ${rows.length}`);
});

test('a key hunt is findable: its key is off the road with a light by it and something said on finding it', () => {
  const dir = path.join(ROOT, 'maps-src', 'skill');
  for (const f of fs.readdirSync(dir)) {
    const side = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')),
      id = f.replace('.json', ''),
      map = mapOf(id);
    for (const k of side.keys ?? []) {
      assert.ok(k.line?.length > 10, id + ' says something on finding it');
      assert.ok(k.lamp, id + ' lights it');
      assert.ok(
        map.entities.some((e) => e.type === 'pickup' && e.kind === 'key_' + k.key && e.at[0] === k.at[0] && e.at[1] === k.at[1]),
        id + ' places it',
      );
      if (k.lever) assert.deepEqual(map.entities.find((e) => e.id === k.lever).needs, [k.key], id + ' the lever wants it');
      else assert.equal(map.doors.find((d) => d.at[0] === k.door[0] && d.at[1] === k.door[1]).key, k.key, id + ' the door wants it');
    }
  }
});
