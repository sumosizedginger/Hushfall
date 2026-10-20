// PT-071 (R21): the automatic quality fallback. Fed synthetic frame times; it steps the render width down under sustained slowness (never past two rungs under the player's choice), back up after thirty quiet seconds, ignores hitches, and is wired into the shell.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { QualityGovernor, QUALITY } from '../src/game/quality.js';
import { RESOLUTIONS, defaultSettings, sanitizeSettings } from '../src/game/settings.js';

const ROOT = path.resolve(import.meta.dirname, '..');
/** feed `seconds` of frames of `ms` each (a small jitter) and return the widths it announced, in order */
const feed = (gov, ms, seconds, jitter = 0) => { const out = []; for (let t = 0; t < seconds; t += ms / 1000) { const w = gov.sample(ms + (jitter ? ((Math.round(t * 1000) % 3) - 1) * jitter : 0), ms / 1000); if (w) out.push(w); } return out; };

test('good frames change nothing', () => { const g = new QualityGovernor(480); assert.deepEqual(feed(g, 8, 60), []); assert.equal(g.width, 480); });

test('sustained slow frames step the width down one rung at a time, with a pause between, and stop two rungs under the player\'s choice', () => {
  const g = new QualityGovernor(640); const seen = feed(g, 33, 60);
  assert.deepEqual(seen, [480, 400], '640 -> 480 -> 400 and no further: two rungs under the choice');
  assert.equal(g.width, 400);
  const low = new QualityGovernor(320); assert.deepEqual(feed(low, 40, 60), [], 'the lowest rung has nowhere to go');
  const mid = new QualityGovernor(400); assert.deepEqual(feed(mid, 33, 60), [320], '400 -> 320 and stop');
});

test('a few slow frames are not sustained slowness (the 95th percentile, over a window)', () => {
  const g = new QualityGovernor(480); const out = [];
  for (let i = 0; i < 1200; i++) { const w = g.sample(i % 25 === 0 ? 45 : 8, 0.008); if (w) out.push(w); }          // one frame in 25 is a hitch: 4% of the frames
  assert.deepEqual(out, []);
});

test('hitches over 250 ms (a hidden tab, a pause, a load) are not samples', () => {
  const g = new QualityGovernor(480); for (let i = 0; i < 400; i++) assert.equal(g.sample(1500, 1.5), null); assert.equal(g.samples.length, 0); assert.equal(g.width, 480);
});

test('it steps back up after thirty quiet seconds, one rung at a time, and never past the player\'s choice', () => {
  const g = new QualityGovernor(480); assert.deepEqual(feed(g, 33, 30), [400, 320]);
  assert.deepEqual(feed(g, 8, 20), [], 'twenty quiet seconds are not enough');
  const up = feed(g, 8, 120); assert.deepEqual(up, [400, 480], 'then one rung per thirty quiet seconds');
  assert.equal(g.width, 480); assert.deepEqual(feed(g, 8, 90), [], 'and it stays at the choice');
});

test('a new choice of width starts it again; forget() drops stale samples; the rungs are the game\'s own', () => {
  const g = new QualityGovernor(480); feed(g, 33, 10); g.reset(800); assert.equal(g.width, 800); assert.equal(g.samples.length, 0);
  g.sample(10, 0.01); g.forget(); assert.equal(g.samples.length, 0);
  assert.equal(new QualityGovernor(123).width, 480, 'an unknown width falls back to the default');
  assert.deepEqual(RESOLUTIONS, [320, 400, 480, 640, 800]);
  assert.ok(QUALITY.slowMs > QUALITY.fastMs, 'a dead band between slow and quiet');
});

test('the setting: on by default, off when asked, and the shell is wired to it', () => {
  assert.equal(defaultSettings().autoQuality, true);
  assert.equal(sanitizeSettings({ ...defaultSettings(), autoQuality: false }).settings.autoQuality, false);
  assert.equal(sanitizeSettings({ ...defaultSettings(), autoQuality: 'no' }).settings.autoQuality, true, 'only false turns it off');
  const main = fs.readFileSync(path.join(ROOT, 'src/game/main.js'), 'utf8'), html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  assert.ok(main.includes('g.governor.sample(raw * 1000, raw)') && main.includes('const renderWidth =') && main.includes('g.governor.reset(v)') && html.includes('id="set-autoquality"'));
});
