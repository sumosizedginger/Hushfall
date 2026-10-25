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

// ---- FREEZE F11, the second rung: when the width is already as low as it may go, the effects step down (shadows and floor marks, then fewer lamps); they come back before the width ----
const feedFx = (gov, ms, seconds) => { const out = []; for (let t = 0; t < seconds; t += ms / 1000) { gov.sample(ms, ms / 1000); const f = gov.takeFx(); if (f != null) out.push(f); } return out; };

test('at the lowest rung the effects step down one level at a time (1, then 2) and stop there; the width is not touched', () => {
  const g = new QualityGovernor(320); assert.equal(g.effects, 0); assert.equal(g.takeFx(), null, 'nothing changed yet');
  assert.deepEqual(feedFx(g, 40, 60), [1, 2], 'two levels and no more'); assert.equal(g.effects, 2); assert.equal(g.width, 320); assert.equal(g.takeFx(), null, 'a level is announced once');
});

test('the width goes first: from 480 the width falls to 320 before the first effect is switched off', () => {
  const g = new QualityGovernor(480), seen = []; for (let t = 0; t < 60; t += 0.033) { const w = g.sample(33, 0.033), f = g.takeFx(); if (w) seen.push('w' + w); if (f != null) seen.push('fx' + f); }
  assert.deepEqual(seen, ['w400', 'w320', 'fx1', 'fx2']);
});

test('the effects come back before the width: after quiet seconds fx 2 -> 1 -> 0, then 320 -> 400', () => {
  const g = new QualityGovernor(400); feedFx(g, 40, 30); assert.equal(g.effects, 2); assert.equal(g.width, 320);
  const seen = []; for (let t = 0; t < 120; t += 0.0167) { const w = g.sample(16.7, 0.0167), f = g.takeFx(); if (w) seen.push('w' + w); if (f != null) seen.push('fx' + f); }
  assert.deepEqual(seen.slice(0, 3), ['fx1', 'fx0', 'w400'], 'effects first, then the width: ' + seen.join(' '));
});

test('a level that fails again is tried less often: the wait to bring it back doubles', () => {
  const g = new QualityGovernor(320); feedFx(g, 40, 20); assert.equal(g.effects, 2);
  assert.deepEqual(feedFx(g, 16.7, 40), [1], 'back to level 1 after about 30 quiet seconds'); assert.deepEqual(feedFx(g, 40, 10), [2], 'and level 2 fails a second time');
  assert.deepEqual(feedFx(g, 16.7, 40), [], '40 quiet seconds are no longer enough'); assert.deepEqual(feedFx(g, 16.7, 40), [1], 'it takes about twice as long');
});

test('a new choice of width puts the effects back; hitches and bursts are no more a reason to cut effects than to cut the width', () => {
  const g = new QualityGovernor(320); feedFx(g, 40, 20); assert.equal(g.effects, 2); g.reset(480); assert.equal(g.effects, 0); assert.equal(g.takeFx(), null);
  const h = new QualityGovernor(320), out = []; for (let i = 0; i < 3000; i++) { h.sample(i % 10 === 0 ? 40 : 16.7, 0.0167); const f = h.takeFx(); if (f != null) out.push(f); } assert.deepEqual(out, []);
  for (let i = 0; i < 400; i++) h.sample(1500, 1.5); assert.equal(h.effects, 0);
});

test('the view wears the level: setEffects hides the shadows and the floor marks from level 1 and lights fewer lamps from level 2; the shell hands the level to every new view and to the settings', async () => {
  const { GameView } = await import('../src/render/view.js'), view = { shadows: { mesh: { visible: true } }, floorMarks: { mesh: { visible: true } } };
  GameView.prototype.setEffects.call(view, 1); assert.equal(view.shadows.mesh.visible, false); assert.equal(view.floorMarks.mesh.visible, false); assert.equal(view.lightBudget, 8, 'level 1 keeps every lamp');
  GameView.prototype.setEffects.call(view, 2); assert.equal(view.lightBudget, 4); GameView.prototype.setEffects.call(view, 0); assert.equal(view.shadows.mesh.visible, true); assert.equal(view.floorMarks.mesh.visible, true); assert.equal(view.lightBudget, 8);
  GameView.prototype.setEffects.call({ shadows: null, floorMarks: undefined }, 2);                    // (a map with no floor marks: nothing to hide)
  const main = fs.readFileSync(path.join(ROOT, 'src/game/main.js'), 'utf8');
  assert.ok(main.includes('g.governor.takeFx()') && main.includes('g.view.setEffects(fx)') && main.includes('g.view.setEffects(settings.autoQuality !== false ? g.governor.effects : 0)') && main.includes('g.view?.setEffects(0)'));
});
