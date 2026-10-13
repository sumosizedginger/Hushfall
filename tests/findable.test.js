// PT-043: the findability lint (tools/dev/findable.mjs; design/ACTC.md section 0, law 1) holds the maps that were fixed for it, and says so when a lever is hidden. C2M13's winch (the owner: "it is impossible to find the switch") stands on the lane, has a lantern and
// a hint; C2M09's lever too. The lint also has to FAIL a lever that is off the lane, unlit and unmentioned (a synthetic map: the pure checks of findable-lib.mjs).
import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { ROOT } from './helpers.js';
import { lintMap } from '../tools/dev/findable-lib.mjs';

test('the maps that were fixed for it pass the findability lint', () => {
  const r = spawnSync(process.execPath, [path.join(ROOT, 'tools/dev/findable.mjs'), 'C2M13', 'C2M09'], { cwd: ROOT, encoding: 'utf8' });
  assert.equal(r.status, 0, r.stdout + r.stderr); assert.match(r.stdout, /ok\s+C2M13/); assert.match(r.stdout, /ok\s+C2M09/);
});

test('a lever off the lane, unlit and unmentioned FAILS it; the same lever on the lane with a lamp and a hint passes; a lever-opened gate must be restated', () => {
  const lane = [[5, 5], [6, 5], [7, 5], [8, 5]], base = () => ({ atmosphere: {}, objective: 'Go on.', messages: [], triggers: [], doors: [], entities: [{ type: 'switch', id: 'w', at: [30, 30], do: [{ exit: { set: 'unlock' } }] }, { type: 'exit', at: [9, 5], locked: true }] });
  const bad = lintMap(base(), lane); const text = bad.issues.join(' | ');
  assert.match(text, /LANE/); assert.match(text, /LIT/); assert.match(text, /HINT/); assert.match(text, /RESTATED/);
  const good = base(); good.entities[0].at = [7, 7]; good.entities.push({ type: 'prop', kind: 'lantern', at: [7, 8] }); good.messages.push({ id: 'h', at: [7, 6], text: 'The lever on the wall opens the gate.' }, { id: 'g', at: [9, 6], text: 'A sealed gate. A lever on the north wall opens it.' });
  assert.deepEqual(lintMap(good, lane).issues, []);
  const dark = base(); dark.atmosphere = { dark: true }; dark.entities[0].at = [7, 7]; dark.objective = 'Throw the lever on the wall'; dark.messages.push({ id: 'g', at: [9, 6], text: 'A sealed gate: a lever opens it.' });
  assert.deepEqual(lintMap(dark, lane).issues, [], 'in a dark place a switch needs no lamp of its own (it glows)');
});
