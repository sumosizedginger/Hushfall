// THE STORY COHERENCE PASS (PT-070, R17): the tics and contradictions the pass removed, held down by ceilings so they cannot creep back, and the continuity sheet's facts checked against the text.
// design/story/CONTINUITY.md is the sheet; design/story/RECORD.md is the text in play order (tools/dev/story-export.mjs). The prose rules themselves are tools/dev/prose-lint.mjs (tests/prose.test.js if present).
import test from 'node:test';
import assert from 'node:assert/strict';
import { allText, stats } from '../tools/dev/story-stats.mjs';

const rows = allText(), has = (re) => rows.filter((r) => re.test(r.text));

test('the tics stay down: no "Whatever", no episode or act named inside the fiction, no instruction to press a key in a voice', () => {
  const S = stats();
  assert.ok(S.whatever <= 2, `"whatever" is used on ${S.whatever} lines (ceiling 2): ${has(/\bwhatever\b/i).map((r) => r.map).join(' ')}`);
  assert.equal(S.meta, 0, `a line names an episode or an act: ${has(/\b(episode|act) (one|two|three|four|1|2|3|4)\b|\bthe (first|second|third|last) act\b/i).map((r) => r.map).join(' ')}`);
  assert.equal(S.hullControl, 0, 'a voice names a key or a screen mark');
  assert.ok(S.openers <= 1, `${S.openers} operator lines open with "Calder, the <Place>." (ceiling 1)`);
  assert.ok(S.nobody <= 36, `"nobody / no one" is used on ${S.nobody} lines (ceiling 36)`);
  assert.ok(S.exclaim <= 3, `${S.exclaim} lines use an exclamation mark (ceiling 3: two survivors shout)`);
});

test('a fact is said once: no outro or intro line repeats a message of its own map', () => {
  const S = stats();
  assert.deepEqual(S.dupOutroMessage.map((d) => `${d.map}: ${d.outro.slice(0, 50)}`), []);
  assert.deepEqual(S.dupIntroMessage.map((d) => `${d.map}: ${d.intro.slice(0, 50)}`), []);
});

test('the continuity sheet: retired terms, one name for one thing, and the numbers that must agree', () => {
  assert.deepEqual(has(/\bthe (first |second )?firing\b/i).map((r) => r.map), [], '"the firing" was retired (the kilns were lit)');
  assert.deepEqual(has(/PELLEW, S\. MATE/).map((r) => r.map), [], 'Pellew writes logs to the end: no fork carries her plate');
  assert.deepEqual(rows.filter((r) => r.speaker === 'WARDEN CALDER').map((r) => r.map), [], "Warden Calder is not there to speak: his lines are notes or a log");
  assert.deepEqual(has(/\bthe Gate opened under the keel\b/).map((r) => r.map), [], 'the Marrow Girl was not taken through the Gate: Ines opens it at the end of Campaign One');
  assert.deepEqual(has(/\bsixteen singers\b/).map((r) => r.map), [], 'the Hive Cantor has nine singers');
  const plate = rows.find((r) => /OWED 52,310\. SUNG 49,715\. SHORT 2,595/.test(r.text)); assert.ok(plate, 'the count plate of the podium');
  assert.equal(52310 - 49715, 2595, 'the count plate adds up');
  assert.ok(rows.some((r) => /KEPT AS COPIES: 213/.test(r.text)) && rows.some((r) => /212 received, 424 processed/.test(r.text)), 'the customs counts: 212 persons, 424 processed, 213 copies');
  assert.ok(has(/lighthouse/i).length >= 3, 'the operator\'s place (the lighthouse) is told');
});

test('the Mother is named in full in every objective that names her', () => {
  const objectives = rows.filter((r) => r.ch === 'objective' && /\bMother\b/.test(r.text) && !/Weeping Mother|Graft-Mother/.test(r.text));
  assert.deepEqual(objectives.map((r) => `${r.map}: ${r.text}`), ['C2M08: The Mother holds the third terrace: the lift to the summit is at its north edge'], 'only the Threshold Ascent objective (at the 80-character limit) keeps the short name');
});
