// Round 1 of the outside audit, story pass 4 (tools/dev/story-pass-4.mjs): three lines that contradicted the story's own record. The compiled maps carry the new wording, the tool is idempotent (a second run finds nothing to do),
// and the old wording is gone from the maps, the Record and the shell's epilogue.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { ROOT } from './helpers.js';

const msg = (map, id) => JSON.parse(fs.readFileSync(path.join(ROOT, 'maps', map + '.json'), 'utf8')).messages.find((m) => m.id === id)?.text;

test('the three lines say what is true: the heart has stopped (the chain is gone), the cache can be fetched at any time, and the first Acolyte is "a tall one"', () => {
  assert.equal(msg('C2M29', 'hush'), 'The heart has stopped. The stair north of the bell is lit.');
  assert.equal(msg('C2M29', 'drop').startsWith('The chain is gone: it falls.'), true, 'the phase-two line it must agree with is still there');
  assert.equal(msg('C2M28', 'caches'), 'Health and armour lie along the highest step. Fetch them between squads.');
  assert.equal(msg('C1E3M05', 'east'), 'A tall one, a wheel of bells behind it. Anything near it takes half. Kill it first.');
  const all = ['C2M29', 'C2M28', 'C1E3M05'].flatMap((id) => JSON.parse(fs.readFileSync(path.join(ROOT, 'maps', id + '.json'), 'utf8')).messages.map((m) => m.text)).join('\n');
  for (const gone of ['on its chain', 'before the first stroke; after it there is no time', 'Another of the tall ones']) assert.ok(!all.includes(gone), 'gone: ' + gone);
});

test('"the tall one with the wheel" is introduced before anything calls it "again": the first line in play order is C1E3M05\'s "A tall one"', () => {
  const rec = fs.readFileSync(path.join(ROOT, 'design/story/RECORD.md'), 'utf8'), first = rec.indexOf('A tall one, a wheel of bells'), again = rec.indexOf('The tall one with the wheel again');
  assert.ok(first > 0 && again > first, 'the introduction comes first (' + first + ' < ' + again + ')');
});

test('story pass 4 is idempotent: a second run (--check) has nothing left to do', () => {
  const r = spawnSync(process.execPath, [path.join(ROOT, 'tools/dev/story-pass-4.mjs'), '--check'], { cwd: ROOT, encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr); assert.match(r.stdout, /^0 edit\(s\) would be made in 0 map\(s\)/);
});
