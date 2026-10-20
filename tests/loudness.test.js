// PT-071 (R22): the bounds that must always hold for the measured sounds (validation/audio.json, from `npm run audio-qa`): nothing clips, nothing is inaudible,
// nothing is not a number, every sound belongs to a family of the loudness report, and the report in design/ matches the data. The BALANCE between sounds is not tested:
// only ears can say it (design/AUDIO_LOUDNESS.md lists where to start listening).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { analyse, render, familyOf, FAMILIES } from '../tools/dev/loudness-report.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const audio = JSON.parse(fs.readFileSync(path.join(ROOT, 'validation/audio.json'), 'utf8'));

test('every measured sound is finite, under clipping, long enough to be heard and punchy enough to be audible', () => {
  assert.ok(audio.sfx.length >= 200, 'the QA covers the whole sound set');
  for (const s of audio.sfx) {
    assert.equal(s.nan, 0, s.id + ' has non-finite samples'); assert.ok(s.peak < 0.98, `${s.id} peaks at ${s.peak}`);
    assert.ok(s.peak > 0.02 && s.loudestWindowRms > 0.008, `${s.id} is nearly silent (peak ${s.peak}, loudest window ${s.loudestWindowRms})`); assert.ok(s.audibleSeconds > 0.03, `${s.id} is audible for ${s.audibleSeconds} s`);
    assert.ok(s.maxDiffLSB <= 8, s.id + ' does not render the same twice (differs by ' + s.maxDiffLSB + ' LSB; QA allows 8, about -72 dBFS)');
  }
  for (const [k, m] of Object.entries(audio.music)) { assert.equal(m.nan, 0, k); assert.ok(m.peak < 0.98 && m.peak > 0.02, k); }
});

test('the score stays under the loudest effects and above silence: its loudest window is neither the loudest thing in the game nor lost', () => {
  const a = analyse(audio), loudest = a.loudest[0].lw;
  for (const [k, m] of Object.entries(a.music)) { assert.ok(m.lw < loudest, k + ' music is louder than every effect'); assert.ok(m.lw > -40, k + ' music is inaudible'); }
});

test('every sound belongs to a family of the report (a new sound must be placed), and the families are not empty', () => {
  const placed = audio.sfx.filter((s) => familyOf(s.id) === 'other').map((s) => s.id); assert.deepEqual(placed, [], 'place these in FAMILIES in tools/dev/loudness-report.mjs');
  const a = analyse(audio); for (const [name] of FAMILIES) assert.ok(a.families.some((f) => f.name === name && f.n > 0), 'an empty family: ' + name);
});

test('the report in design/ is the report of this data (regenerate it with node tools/dev/loudness-report.mjs --write after a new audio-qa)', () => {
  const lf = (t) => t.replace(/\r\n/g, '\n'), onDisk = lf(fs.readFileSync(path.join(ROOT, 'design/AUDIO_LOUDNESS.md'), 'utf8'));
  assert.equal(onDisk, lf(render(analyse(audio), audio)));
});
