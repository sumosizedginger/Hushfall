// Campaign flow: which map follows which, including secret exits and returns, and never into a map that is not built.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { nextMapId, mapName } from '../src/game/campaign.js';
import { ROOT } from './helpers.js';

const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'CAMPAIGN_MANIFEST.json'), 'utf8'));
const all = () => true, none = () => false;

test('the normal exit leads to the next map in the manifest, and only if that map exists', () => {
  assert.equal(nextMapId(manifest, 'C1E1M01', 'next', all), 'C1E1M02');
  assert.equal(nextMapId(manifest, 'C1E1M01', 'next', none), null, 'an unbuilt map cannot be entered');
  assert.equal(nextMapId(manifest, 'C1E1M08', 'next', all), 'C1E2M01', 'the episode boundary is just another next');
  assert.equal(nextMapId(manifest, 'C2M30', 'next', all), null, 'the last map has no next');
  assert.equal(nextMapId(manifest, 'NOPE', 'next', all), null);
});
test('a secret exit goes to the secret map; the secret map returns to the main route; a map without a secret exit ignores dest=secret', () => {
  assert.equal(nextMapId(manifest, 'C1E1M04', 'secret', all), 'C1E1S01');
  assert.equal(nextMapId(manifest, 'C1E1S01', 'next', all), 'C1E1M05', 'the lighthouse cellar returns to the map after the one that led to it');
  assert.equal(nextMapId(manifest, 'C1E1M02', 'secret', all), null);
});
test('every secret slot points back into the main chain consistently (enteredFrom.next === returnsTo)', () => {
  for (const s of manifest.maps.filter((m) => m.kind === 'secret')) { const from = manifest.maps.find((m) => m.id === s.enteredFrom); assert.equal(from.next, s.returnsTo, s.id); assert.equal(from.secretExit, s.id); }
  assert.equal(mapName(manifest, 'C1E1M02'), 'Customs Hall');
});
