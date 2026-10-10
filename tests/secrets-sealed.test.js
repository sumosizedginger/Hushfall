// A secret is behind a panel: its cells must NOT be reachable on foot while the panel is shut. The Choir Loft's niche was open (2026-10-10, found by the owner while playing): the wedge widens by a cell at x 24 and its floor met the niche's
// edge there, so there was a way in beside the panel; no gate looked for it. This holds every shipped map to it.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { parseMap } from '../src/engine/mapformat.js';
import { findTraps } from '../src/engine/traps.js';

const ROOT = path.resolve(import.meta.dirname, '..');

test('every secret of every shipped map is sealed: none of its cells can be reached without opening its panel', () => {
  let checked = 0; const open = [];
  for (const f of fs.readdirSync(path.join(ROOT, 'maps')).filter((x) => x.endsWith('.json'))) {
    const src = JSON.parse(fs.readFileSync(path.join(ROOT, 'maps', f), 'utf8')); if (!src.secrets?.length) continue;
    const m = parseMap(src), pub = findTraps(m, { secrets: false });
    for (const s of src.secrets) { checked++; const reachable = s.cells.filter(([x, z]) => pub.reach.has(pub.key(x, z))); if (reachable.length) open.push(`${f} ${s.id}: ${reachable.length}/${s.cells.length} cells reachable with the panel shut`); }
  }
  assert.ok(checked >= 19, 'the secrets of the shipped maps were found: ' + checked);
  assert.deepEqual(open, [], 'a secret with another way in is not a secret');
});
