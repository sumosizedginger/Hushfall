// PT-052: the director's audit (tools/dev/director-audit.mjs) reads every shipped map, is deterministic, counts no peaceful creature as a combatant, and gives each map exactly one tier from the named rules.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { auditAll, RULES } from '../tools/dev/director-audit.mjs';
import { ENEMIES } from '../src/engine/defs.js';
import { ROOT } from './helpers.js';

const rows = auditAll();
const TIERS = [/^KEEP/, /^C exemplar$/, /^B structural$/, /^A encounters and roster$/, /^A- light pass$/];

test('one row per shipped map, in order, each with exactly one known tier', () => {
  const files = fs.readdirSync(path.join(ROOT, 'maps')).filter((f) => f.endsWith('.json')).map((f) => f.replace('.json', '')).sort();
  assert.deepEqual(rows.map((r) => r.id), files);
  for (const r of rows) assert.equal(TIERS.filter((t) => t.test(r.tier)).length, 1, r.id + ': ' + r.tier);
});

test('the audit is deterministic and its numbers are finite', () => {
  assert.deepEqual(auditAll(), rows);
  for (const r of rows) for (const k of ['walk', 'enemies', 'density', 'kinds', 'topShare', 'rangedShare', 'levelsPct', 'symmetry']) assert.ok(Number.isFinite(r[k]), r.id + ' ' + k);
});

test('the four named exemplars are the only C maps, and a map with no combat is never rebuilt', () => {
  assert.deepEqual(rows.filter((r) => /^C /.test(r.tier)).map((r) => r.id).sort(), ['C1E4M06', 'C2M02', 'C2M11', 'C2M21']);
  for (const r of rows.filter((r) => r.enemies === 0)) assert.ok(/^KEEP/.test(r.tier), r.id);
});

test('peaceful creatures are no combatants: no roster share or density counts them', () => {
  assert.ok(ENEMIES.vaelfolk.peaceful);
  const m = rows.find((r) => r.id === 'C2M03'), src = JSON.parse(fs.readFileSync(path.join(ROOT, 'maps', 'C2M03.json'), 'utf8')), all = src.entities.filter((e) => e.type === 'enemy').length, folk = src.entities.filter((e) => e.type === 'enemy' && ENEMIES[e.kind]?.peaceful).length;
  assert.ok(folk > 0, 'C2M03 has peaceful Vael'); assert.equal(m.enemies, all - folk);
});

test('the rules are the numbers the plan page and design/ROADMAP.md 0.12 quote', () => {
  assert.deepEqual(RULES.sparse, [12, 15]); assert.deepEqual(RULES.long, [2500, 3000]); assert.equal(RULES.symmetric, 0.88); assert.deepEqual(RULES.oneNote, [50, 60]);
});
