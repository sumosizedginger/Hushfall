// The pause screen says where you are and how the run stands (the owner, 2026-11-04: "it needs to be as indepth as all other menus"). The page is read from a real world here:
// no browser, so how it LOOKS is not tested.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { parseMap } from '../src/engine/mapformat.js';
import { createWorld } from '../src/engine/world.js';
import { pauseInfo, pauseInfoHtml, pauseWhereHtml, placeInCampaign } from '../src/game/pauseinfo.js';

const root = path.resolve(import.meta.dirname, '..');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'CAMPAIGN_MANIFEST.json'), 'utf8'));
const load = (id) => parseMap(JSON.parse(fs.readFileSync(path.join(root, 'maps', id + '.json'), 'utf8')));
const info = (id, opts = {}, tweak = null) => {
  const map = load(id),
    world = createWorld(map, { seed: 1, difficulty: opts.difficulty ?? 'easy' });
  tweak?.(world);
  return pauseInfo({ world, map, manifest, mapId: id, profile: opts.profile ?? null, progress: opts.progress ?? null });
};

test('every map in the campaign can say where it is', () => {
  for (const slot of manifest.maps) {
    const p = placeInCampaign(manifest, slot.id);
    assert.match(p.campaign, /^Campaign \d: /, slot.id);
    if (slot.kind === 'secret') assert.equal(p.place, 'Secret map', slot.id);
    else {
      assert.match(p.place, /^Map \d+ of \d+$/, slot.id);
      assert.ok(p.part, slot.id + ' names its episode or act');
    }
  }
});

test('the second level says it is the second level', () => {
  const i = info('C1E1M02');
  assert.equal(i.name, 'Customs Hall');
  assert.equal(i.part, 'Episode 1: Port Marrow');
  assert.equal(i.place, 'Map 2 of 8');
  assert.equal(i.difficulty.name, 'Easy');
  assert.match(pauseWhereHtml(i), /Customs Hall/);
  assert.match(pauseWhereHtml(i), /Map 2 of 8/);
  assert.equal(placeInCampaign(manifest, 'C2M05').part, 'Act A: Threshold');
});

test('the page holds the run as the world has it', () => {
  const i = info('C1E1M02', {}, (w) => {
    w.stats.kills = 7;
    w.stats.secrets = 1;
    w.stats.damageTaken = 33;
    w.time = 125;
    w.objective = 'Find the brass key';
    w.player.hp = 64;
    w.player.keys = ['brass'];
  });
  assert.equal(i.run.time, '2:05');
  assert.equal(i.run.kills.have, 7);
  assert.ok(i.run.kills.of > 7);
  assert.equal(i.you.hp, 64);
  assert.equal(i.you.keys.length, 1);
  assert.ok(i.arms.length >= 1 && i.arms.some((a) => a.inHand));
  const html = pauseInfoHtml(i);
  for (const want of ['Where you are', 'Objective', 'This run', 'You', 'Arms', 'Your best here', 'Last heard', 'The campaign so far', 'Find the brass key', 'Customs Hall', '2:05', 'Rank if you left now'])
    assert.ok(html.includes(want), want);
});

test('your best and the campaign come from the records, and an empty record is fine', () => {
  const blank = info('C1E1M02');
  assert.equal(blank.best.finished, false);
  assert.equal(blank.campaignRun.cleared, 0);
  const full = info('C1E1M02', {
    profile: { maps: { C1E1M02: { byDiff: { easy: { rank: 'A', time: 300, done: { noDamage: true } }, hard: { rank: 'S', time: 280, done: {} } }, docs: [] } } },
    progress: { records: { C1E1M01: { rank: 'B', kills: 12, secrets: 1, time: 240 } }, salvage: 2 },
  });
  assert.equal(full.best.rank, 'A');
  assert.equal(full.best.time, '5:00');
  assert.ok(full.best.challenges.find((c) => c.label.startsWith('Untouched')).done);
  assert.deepEqual(full.best.others, [{ name: 'Hard', rank: 'S' }]);
  assert.equal(full.campaignRun.cleared, 1);
  assert.equal(full.campaignRun.kills, 12);
});

test('what the page writes is escaped, and a map outside the campaign does not break it', () => {
  const html = pauseInfoHtml(info('C1E1M02', {}, (w) => (w.objective = '<img src=x>')));
  assert.ok(!html.includes('<img'), 'an objective is text, not markup');
  const map = load('C1E1M02'),
    world = createWorld(map, { seed: 1, difficulty: 'normal' });
  const dev = pauseInfo({ world, map, manifest, mapId: 'RANGE' });
  assert.equal(dev.campaignRun, null);
  assert.ok(pauseInfoHtml(dev).length > 200);
});

test('it reads the world and never writes it', () => {
  const map = load('C1E1M02'),
    world = createWorld(map, { seed: 1, difficulty: 'normal' });
  const before = JSON.stringify(world);
  pauseInfoHtml(pauseInfo({ world, map, manifest, mapId: 'C1E1M02' }));
  assert.equal(JSON.stringify(world), before);
});

test('the page has its place in the document, and hides rather than overflows on a small window', () => {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  for (const id of ['pause-where', 'pause-info', 'btn-pause-journal']) assert.ok(html.includes(`id="${id}"`), id);
  assert.match(html, /@media \(max-width:1000px\)\{#pause-info\{display:none\}\}/);
});
