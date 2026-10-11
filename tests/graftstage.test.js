// PT-035: the Tollbearer's graft stage (src/render/graftstage.js). A regex in view.js lost its backslashes when it was written (`/^CdE(d)/`), matched no map, and every map drew the grown graft for three days:
// 752 tests passed because nothing asked the game WHICH stage Episode 1 gets. This asks it, for every shipped map, and checks the view really asks the module.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { graftStage } from '../src/render/graftstage.js';
import { ROOT } from './helpers.js';

const ids = fs.readdirSync(path.join(ROOT, 'maps')).filter((f) => /^C\dE\dM?S?\d+\.json$/.test(f) || f.endsWith('.json')).map((f) => f.replace('.json', ''));

test('every Campaign 1 Episode 1 map draws the early graft, every other shipped map the grown one', () => {
  assert.ok(ids.length >= 36, 'the shipped maps were found: ' + ids.length);
  for (const id of ids) assert.equal(graftStage({ id }), /^C1E1/.test(id) ? 0 : 2, `${id} draws stage ${graftStage({ id })}`);
  assert.equal(ids.filter((id) => graftStage({ id }) === 0).length, 9, 'Episode 1 is the eight maps and the secret');
});
test('what is not a Campaign 1 map id (Campaign 2, the Range, no id, no map) draws the grown graft', () => {
  for (const m of [{ id: 'C2E1M01' }, { id: 'C2E3M05' }, { id: 'RANGE' }, { id: '' }, {}, null, undefined]) assert.equal(graftStage(m), 2, JSON.stringify(m));
});
test('the view builds every creature with the stage the module gives (the wiring, not just the function)', () => {
  const src = fs.readFileSync(path.join(ROOT, 'src/render/view.js'), 'utf8');
  assert.match(src, /import \{ graftStage \} from '\.\/graftstage\.js'/); assert.match(src, /\{ stage: graftStage\(map\) \}/);
  assert.doesNotMatch(src, /CdE/, 'no hand-written pattern left in the view');
});
