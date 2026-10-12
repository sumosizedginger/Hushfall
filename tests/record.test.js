// The Record (PT-037): every message a player receives is kept by id in the run's progress and replayed, by map, from the pause menu and the title. Pure functions plus the shipped data they read; no browser.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, shippedMap } from './helpers.js';
import { recordAdd, recordView, recordCounts, isDocument } from '../src/game/record.js';
import { newProgress, sanitizeProgress } from '../src/engine/progress.js';

const MANIFEST = JSON.parse(fs.readFileSync(path.join(ROOT, 'CAMPAIGN_MANIFEST.json'), 'utf8'));
const shippedIds = fs.readdirSync(path.join(ROOT, 'maps')).filter((f) => f.endsWith('.json')).map((f) => f.replace('.json', ''));

test('a message is remembered once, per map, without touching the old progress object', () => {
  const p0 = newProgress(), p1 = recordAdd(p0, 'C1E1M01', 'start');
  assert.equal(p0.record, undefined, 'the original is not mutated');
  assert.deepEqual(p1.record, { C1E1M01: ['start'] });
  assert.equal(recordAdd(p1, 'C1E1M01', 'start'), p1, 'seen again: the same object');
  const p2 = recordAdd(recordAdd(p1, 'C1E1M01', 'b'), 'C1E1M02', 'a');
  assert.deepEqual(p2.record, { C1E1M01: ['start', 'b'], C1E1M02: ['a'] });
  assert.equal(recordAdd(p2, null, 'x'), p2); assert.equal(recordAdd(p2, 'C1E1M01', ''), p2); assert.equal(recordAdd(p2, 'C1E1M01', 7), p2);
});

test('a map keeps at most 400 messages in the Record', () => {
  let p = newProgress(); for (let i = 0; i < 450; i++) p = recordAdd(p, 'X', 'm' + i);
  assert.equal(p.record.X.length, 400);
});

test('progress carries the Record through a save and a damaged one is made safe; an empty run has no record field at all', () => {
  const p = recordAdd(recordAdd(newProgress(), 'C1E1M01', 'start'), 'C1E1M01', 'b');
  assert.deepEqual(sanitizeProgress(JSON.parse(JSON.stringify(p))).record, { C1E1M01: ['start', 'b'] });
  assert.equal('record' in sanitizeProgress({ salvage: 5 }), false, 'lazy: nothing recorded, no field (a fresh save is byte for byte what it was)');
  const bad = sanitizeProgress({ record: { A: ['x', 'x', 7, null, '', 'y'.repeat(60), 'z'], B: 'nope', C: [], D: { 0: 'a' } } });
  assert.deepEqual(bad.record, { A: ['x', 'z'] });
  assert.equal('record' in sanitizeProgress({ record: 5 }), false); assert.equal('record' in sanitizeProgress({ record: [] }), false);
});

test('which speakers are found documents and which are voices', () => {
  for (const s of ["CHANDLER'S LOG", 'WARDEN LOG', 'CUSTOMS NOTICE', 'CUSTOMS MANIFEST', 'LEDGER', 'REGISTER', "A CHILD'S DRAWING", 'NET-LOFT NOTE', 'BEACON NOTES', 'FUNICULAR PLACARD', 'TICKET BOARD']) assert.equal(isDocument(s), true, s);
  for (const s of ['INES', 'SIGNAL HOUSE', 'HULL', 'WARDEN CALDER', 'THE QUIET ONE', 'UNKNOWN (VAEL)', '', undefined]) assert.equal(isDocument(s), false, String(s));
});

test('the Record reads its text from the maps, in the campaign order, in the order a map lists its messages, and skips what is gone', () => {
  const maps = { C1E1M01: shippedMap('C1E1M01'), C1E1M02: shippedMap('C1E1M02') };
  const m1 = maps.C1E1M01.messages, m2 = maps.C1E1M02.messages;
  assert.ok(m1.length >= 3 && m2.length >= 2);
  let p = newProgress();
  p = recordAdd(p, 'C1E1M02', m2[1].id); p = recordAdd(p, 'C1E1M01', m1[2].id); p = recordAdd(p, 'C1E1M01', m1[0].id); p = recordAdd(p, 'C1E1M01', 'a-line-that-was-cut'); p = recordAdd(p, 'NOT_A_MAP', 'x');
  const v = recordView(MANIFEST, maps, p);
  assert.deepEqual(v.map((g) => g.mapId), ['C1E1M01', 'C1E1M02'], 'manifest order, not the order they were met in');
  assert.deepEqual(v[0].entries.map((e) => e.id), [m1[0].id, m1[2].id], 'a map lists its messages in its own order; a cut line is skipped');
  assert.equal(v[0].entries[0].text, m1[0].text); assert.equal(v[0].name, 'Marrow Quay'); assert.equal(v[0].campaign, 1);
  assert.deepEqual(recordCounts(v).all, 3);
  assert.deepEqual(recordView(MANIFEST, maps, newProgress()), []); assert.deepEqual(recordView(MANIFEST, maps, undefined), []);
});

test('every shipped message can be found again: it has an id that is unique in its map, a speaker and a text', () => {
  assert.ok(shippedIds.length >= 36);
  for (const id of shippedIds) {
    const m = shippedMap(id), seen = new Set();
    for (const x of m.messages) { assert.ok(x.id && x.text, `${id}: a message without an id or a text`); assert.ok(!seen.has(x.id), `${id}: message id '${x.id}' is used twice`); assert.ok(x.id.length <= 48, `${id}: '${x.id}' is too long to record`); seen.add(x.id); }
  }
});

test('the shell is wired to it: the pause menu and the title open it, a received message is recorded, Esc and the pad leave it', () => {
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8'), main = fs.readFileSync(path.join(ROOT, 'src/game/main.js'), 'utf8'), ui = fs.readFileSync(path.join(ROOT, 'src/game/ui.js'), 'utf8');
  for (const id of ['screen-record', 'record-list', 'record-sub', 'btn-record', 'btn-record-title', 'btn-record-close']) assert.ok(html.includes(`id="${id}"`), id);
  assert.match(main, /recordMessages\(ev\)/); assert.match(main, /function openRecord\(from\)/); assert.match(main, /function closeRecord\(\)/);
  assert.match(main, /if \(ui\.screen === 'record'\)/g); assert.ok((main.match(/ui\.screen === 'record'/g) ?? []).length >= 2, 'the keyboard and the pad both handle it');
  assert.match(ui, /recordOpen\(view, counts, current\)/); assert.match(ui, /openRecord\('pause'\)/); assert.match(ui, /openRecord\('title'\)/);
});
