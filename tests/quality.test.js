// PT-071 (R21): the automatic quality fallback. Fed synthetic frame times; it steps the render width down under sustained slowness (never past two rungs under the player's choice), back up after quiet seconds at the display's own rate
// (waiting longer each time a rung fails again), ignores bursts and hitches, and is wired into the shell. The numbers come from the real-page probe of 2026-10-20 (tools/dev/probe-quality.mjs).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { QualityGovernor, QUALITY } from '../src/game/quality.js';
import { RESOLUTIONS, defaultSettings, sanitizeSettings } from '../src/game/settings.js';

const ROOT = path.resolve(import.meta.dirname, '..');
/** feed `seconds` of frames of `ms` each and return the widths it announced, in order */
const feed = (gov, ms, seconds) => { const out = []; for (let t = 0; t < seconds; t += ms / 1000) { const w = gov.sample(ms, ms / 1000); if (w) out.push(w); } return out; };

test('good frames change nothing, and a 60 Hz display\'s own 16.7 ms frames are good frames', () => { const g = new QualityGovernor(480); assert.deepEqual(feed(g, 8, 60), []); assert.deepEqual(feed(g, 16.7, 60), []); assert.equal(g.width, 480); });

test('sustained slow frames step the width down one rung at a time, with a pause between, and stop two rungs under the player\'s choice', () => {
  const g = new QualityGovernor(640);
  assert.deepEqual(feed(g, 33, 60), [480, 400], '640 -> 480 -> 400 and no further: two rungs under the choice'); assert.equal(g.width, 400);
  assert.deepEqual(feed(new QualityGovernor(320), 40, 60), [], 'the lowest rung has nowhere to go');
  assert.deepEqual(feed(new QualityGovernor(400), 33, 60), [320], '400 -> 320 and stop');
});

test('bursts are not slowness: a creature wave that costs a tenth of the frames 40 ms (what the real page showed) changes nothing', () => {
  const g = new QualityGovernor(480), out = [];
  for (let i = 0; i < 3000; i++) { const w = g.sample(i % 10 === 0 ? 40 : 16.7, 0.0167); if (w) out.push(w); }
  assert.deepEqual(out, [], 'the typical frame stays at the display\'s rate');
});

test('hitches over 250 ms (a hidden tab, a pause, a load) are not samples', () => {
  const g = new QualityGovernor(480); for (let i = 0; i < 400; i++) assert.equal(g.sample(1500, 1.5), null); assert.equal(g.samples.length, 0); assert.equal(g.width, 480);
});

test('it steps back up after thirty quiet seconds at the display\'s rate, one rung at a time, and never past the choice', () => {
  const g = new QualityGovernor(480); assert.deepEqual(feed(g, 33, 30), [400, 320]);
  assert.deepEqual(feed(g, 16.7, 20), [], 'twenty quiet seconds are not enough');
  assert.deepEqual(feed(g, 16.7, 150), [400, 480], 'then one rung per thirty quiet seconds');
  assert.equal(g.width, 480); assert.deepEqual(feed(g, 16.7, 90), [], 'and it stays at the choice');
});

test('a rung that fails again is tried less often: the wait to come back up doubles', () => {
  const g = new QualityGovernor(480);
  assert.deepEqual(feed(g, 33, 5), [400]);                             // 480 fails once
  assert.deepEqual(feed(g, 16.7, 40), [480], 'back up after about 30 quiet seconds');
  assert.deepEqual(feed(g, 33, 5), [400]);                             // 480 fails a second time
  assert.deepEqual(feed(g, 16.7, 40), [], '40 quiet seconds are no longer enough');
  assert.deepEqual(feed(g, 16.7, 40), [480], 'it takes about twice as long');
});

test('a new choice of width starts it again; forget() drops stale samples; the rungs are the game\'s own', () => {
  const g = new QualityGovernor(480); feed(g, 33, 10); g.reset(800); assert.equal(g.width, 800); assert.equal(g.samples.length, 0);
  g.sample(10, 0.01); g.forget(); assert.equal(g.samples.length, 0);
  assert.equal(new QualityGovernor(123).width, 480, 'an unknown width falls back to the default');
  assert.deepEqual(RESOLUTIONS, [320, 400, 480, 640, 800]);
  assert.ok(QUALITY.slowMs > QUALITY.fastMs && QUALITY.fastMs > 16.7, 'a dead band between slow and quiet, and quiet is above one 60 Hz frame');
});

test('the setting: on by default, off when asked, and the shell is wired to it', () => {
  assert.equal(defaultSettings().autoQuality, true);
  assert.equal(sanitizeSettings({ ...defaultSettings(), autoQuality: false }).settings.autoQuality, false);
  assert.equal(sanitizeSettings({ ...defaultSettings(), autoQuality: 'no' }).settings.autoQuality, true, 'only false turns it off');
  const main = fs.readFileSync(path.join(ROOT, 'src/game/main.js'), 'utf8'), html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  assert.ok(main.includes('g.governor.sample(raw * 1000, raw)') && main.includes('const renderWidth =') && main.includes('g.governor.reset(v)') && html.includes('id="set-autoquality"'));
});
