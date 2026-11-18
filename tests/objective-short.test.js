// The corner objective (the outside playtest of 2026-11-18: clipped and wrapping objectives): whole for twelve seconds, then whole sentences that
// fit two lines. Checked on every objective of every shipped map.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { objectiveShort, objectiveShown, OBJ_FULL_S, OBJ_SHORT_MAX } from '../src/game/objectivetext.js';

const all = [];
for (const f of fs.readdirSync('maps').filter((f) => f.endsWith('.json'))) {
  const re = /"objective": ?"((?:[^"\\]|\\.)*)"/g,
    s = fs.readFileSync('maps/' + f, 'utf8');
  let x;
  while ((x = re.exec(s))) all.push([f, JSON.parse('"' + x[1] + '"')]);
}

test('every objective has a short form: whole sentences from its start, at most two lines', () => {
  assert.ok(all.length > 200);
  for (const [f, t] of all) {
    const s = objectiveShort(t);
    assert.ok(s.length >= 4 && s.length <= OBJ_SHORT_MAX + 1, `${f}: "${s}"`);
    assert.ok(t.startsWith(s.replace(/…$/, '')), `${f}: the short form is the start of the objective`);
    assert.ok(!/[.!?][A-Za-z]/.test(s), `${f}: no sentence run together: "${s}"`);
  }
});

test('a new objective is shown whole, then shortened; a short one is never changed', () => {
  const long = 'Cross the hall into the bell. Shoot the four root anchors from cover; the clapper takes 30% while one stands';
  assert.equal(objectiveShown(long, 1), long);
  assert.equal(objectiveShown(long, OBJ_FULL_S + 1), 'Cross the hall into the bell');
  assert.equal(objectiveShown('Make for the ferry dock', 99), 'Make for the ferry dock');
  assert.equal(objectiveShown(null, 0), '');
});
