// CEILINGS BY PLACE (2026-11-18, the visual pass): every roofed cell takes a family from the walls round it; the families have their own ceiling
// and overhead structure; nothing hangs lower than CEIL.clear over its floor (drawn only: the sim never sees it).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { parseMap } from '../src/engine/mapformat.js';
import { CEIL, familyOfTex, ceilingFamilies, buildCeilingStructure } from '../src/render/ceilings.js';

const roofed = (m) => (cx, cz) => ['floor', 'door', 'secret'].includes(m.kind(cx, cz));
const load = (id) => parseMap(JSON.parse(fs.readFileSync(`maps/${id}.json`, 'utf8')));

test('a wall texture names its family', () => {
  assert.equal(familyOfTex('wall_timber_a'), 'timber');
  assert.equal(familyOfTex('wall_iron_a'), 'iron');
  assert.equal(familyOfTex('wall_rib_a'), 'organic');
  assert.equal(familyOfTex('wall_deeprock_a'), 'cave');
  assert.equal(familyOfTex('wall_gate_a'), 'pale');
  assert.equal(familyOfTex('wall_mourning_a'), 'stone');
  assert.equal(familyOfTex('wall_glasscrust_a'), 'cave', 'glass crust is rock, not the Gate');
  for (const f of Object.values(CEIL.families)) assert.ok(fs.existsSync(`assets/baked/${f.tex}.png`), f.tex + ' is baked');
});

test('the campaign is no longer roofed with one ceiling: every family is used, and no family roofs most of it', () => {
  const total = {};
  for (const f of fs.readdirSync('maps').filter((f) => /^C\d.*\.json$/.test(f))) {
    const m = load(f.slice(0, -5));
    for (const fam of ceilingFamilies(m, roofed(m)).values()) total[fam] = (total[fam] ?? 0) + 1;
  }
  const all = Object.values(total).reduce((a, b) => a + b, 0);
  assert.deepEqual(Object.keys(total).sort(), Object.keys(CEIL.families).sort());
  for (const [fam, n] of Object.entries(total)) assert.ok(n / all < 0.45, `${fam} roofs ${Math.round((100 * n) / all)}%`);
});

test('nothing overhead hangs lower than the clearance over its floor', () => {
  for (const id of ['C1E1M02', 'C1E2M06', 'C1E3M04', 'C1E4M08', 'C2M09', 'C2M13', 'C2M26']) {
    const m = load(id),
      S = m.cell,
      fams = ceilingFamilies(m, roofed(m)),
      parts = buildCeilingStructure(m, fams, { ce: (x, z) => m.ceilingAt(x, z), fl: (x, z) => m.floor(x, z), S });
    assert.ok(parts.length > 0, id + ' has a structure');
    for (const p of parts) {
      const a = p.geometry.attributes.position.array;
      for (let i = 0; i < a.length; i += 3) {
        const cx = Math.floor(a[i] / S),
          cz = Math.floor(a[i + 2] / S);
        if (m.kind(cx, cz) === 'wall') continue; // a beam's end inside the wall it rests on
        assert.ok(a[i + 1] >= m.floor(cx, cz) + CEIL.clear - 0.05, `${id} ${p.family} ${p.part} at ${cx},${cz} hangs to ${a[i + 1].toFixed(2)}`);
      }
    }
  }
});
