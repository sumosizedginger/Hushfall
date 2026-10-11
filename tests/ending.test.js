// The end of a campaign (PT-036): which map is a finale, the epilogue, the tally, and the card sequence as a function of time. Pure functions; no browser.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from './helpers.js';
import { campaignOf, isFinale, endingFor, ENDINGS, tally, TYPING, startSequence, stepSequence, pressSequence, skipSequence, viewSequence } from '../src/game/ending.js';
import { newProgress, earn } from '../src/engine/progress.js';

const MANIFEST = JSON.parse(fs.readFileSync(path.join(ROOT, 'CAMPAIGN_MANIFEST.json'), 'utf8'));
const CARDS = ENDINGS[1].cards;

test('campaignOf reads the campaign from a map id', () => {
  assert.equal(campaignOf('C1E4M08'), 1); assert.equal(campaignOf('C2M07'), 2); assert.equal(campaignOf('C2S01'), 2); assert.equal(campaignOf('RANGE'), null); assert.equal(campaignOf(undefined), null);
});

test('a finale is the last MAIN map of a campaign: the Gate Warden and the Unrung Gate, nothing else', () => {
  const finales = MANIFEST.maps.filter((m) => isFinale(MANIFEST, m.id)).map((m) => m.id);
  assert.deepEqual(finales, ['C1E4M08', 'C2M30']);
  assert.equal(isFinale(MANIFEST, 'C1E4M07'), false); assert.equal(isFinale(MANIFEST, 'C1E1M08'), false, 'the end of an episode is not the end of a campaign');
  assert.equal(isFinale(MANIFEST, 'C1E4S01'), false, 'a secret map is never a finale'); assert.equal(isFinale(MANIFEST, 'NOPE'), false);
});

test('the Gate Warden has an epilogue by its normal exit and none by a secret exit; the other campaign has none yet', () => {
  const e = endingFor(MANIFEST, 'C1E4M08', 'next');
  assert.ok(e); assert.equal(e.campaign, 1); assert.equal(e.cards.length, CARDS.length);
  assert.equal(endingFor(MANIFEST, 'C1E4M08', undefined)?.campaign, 1, 'a missing dest is the normal exit');
  assert.equal(endingFor(MANIFEST, 'C1E4M08', 'secret'), null);
  assert.equal(endingFor(MANIFEST, 'C1E4M07', 'next'), null);
  assert.equal(endingFor(MANIFEST, 'C2M30', 'next'), null, 'Campaign Two has no epilogue until it is written');
});

test('the epilogue is readable: spoken by the voices the campaign uses, each card short enough for a screen, and it points at the next campaign by its real name', () => {
  assert.ok(CARDS.length >= 5 && CARDS.length <= 9);
  for (const c of CARDS) {
    assert.ok(['', 'SIGNAL HOUSE', 'INES'].includes(c.who), c.who);
    assert.ok(c.text.length >= 20 && c.text.length <= 170, `${c.text.length}: ${c.text}`);
    assert.doesNotMatch(c.text, /[‘’“”]/, 'plain quotes only, like the rest of the game text');
  }
  assert.equal(ENDINGS[1].next.name, MANIFEST.campaigns.find((c) => c.id === 2).name);
  assert.equal(ENDINGS[1].name, 'The Hush');
});

test('the tally of an empty run is empty; of the real manifest it is 4 episodes of 8 main maps, 32 main maps, 4 secret maps', () => {
  const t = tally(MANIFEST, newProgress(), 1);
  assert.equal(t.episodes.length, 4); assert.ok(t.episodes.every((e) => e.maps.length === 8 && e.maps.every((m) => m.rank === null) && e.secretMaps === 1 && e.secretMapsFound === 0));
  assert.equal(t.total, 32); assert.equal(t.cleared, 0); assert.equal(t.secretMaps, 4); assert.equal(t.kills, 0); assert.equal(t.time, 0);
  assert.deepEqual(t.ranks, { C: 0, B: 0, A: 0, S: 0 });
  assert.deepEqual(t.episodes[3].maps.map((m) => m.id), ['C1E4M01', 'C1E4M02', 'C1E4M03', 'C1E4M04', 'C1E4M05', 'C1E4M06', 'C1E4M07', 'C1E4M08'], 'in play order');
});

test('the tally adds up the best record of each map: ranks, kills, secrets, time, the secret maps found', () => {
  let p = newProgress();
  const run = (id, end, par) => { p = earn(p, id, end, par).progress; };
  run('C1E1M01', { time: 100, kills: 10, secrets: 1, total: { enemies: 10, secrets: 1 } }, 200);          // an S
  run('C1E1M02', { time: 600, kills: 2, secrets: 0, total: { enemies: 10, secrets: 1 } }, 200);          // a C
  run('C1E4S01', { time: 50, kills: 0, secrets: 1, total: { enemies: 0, secrets: 1 } }, 60);             // a secret map
  run('C1E1M02', { time: 300, kills: 6, secrets: 0, total: { enemies: 10, secrets: 1 } }, 200);          // a replay: the better kills stay, the faster time stays
  const t = tally(MANIFEST, p, 1);
  assert.equal(t.cleared, 2); assert.equal(t.secretMapsFound, 1); assert.equal(t.episodes[3].secretMapsFound, 1);
  assert.equal(t.kills, 10 + 6 + 0); assert.equal(t.secrets, 1 + 0 + 1); assert.equal(t.time, 100 + 300 + 50);
  assert.equal(t.ranks.S + t.ranks.A + t.ranks.B + t.ranks.C, 2, 'a secret map has no disc in the ranks');
  assert.equal(t.episodes[0].maps[0].rank, 'S');
  assert.equal(t.salvage, p.salvage); assert.deepEqual(t.upgrades, p.upgrades);
  assert.equal(tally(MANIFEST, p, 2).total, 30, 'the other campaign counts its own maps');
});

test('the card sequence types a card, holds it, then comes to the next by itself, and ends in the tally', () => {
  let s = startSequence(), v = viewSequence(s, CARDS);
  assert.equal(v.index, 0); assert.equal(v.text, ''); assert.equal(v.full, false); assert.equal(v.tally, false);
  s = stepSequence(s, CARDS, TYPING.lead + 0.5); v = viewSequence(s, CARDS);
  assert.ok(v.text.length > 0 && v.text.length < CARDS[0].text.length, 'mid-typing: ' + v.text.length);
  assert.equal(v.text, CARDS[0].text.slice(0, v.text.length), 'what is shown is a prefix of the card');
  s = stepSequence(s, CARDS, 2); assert.equal(viewSequence(s, CARDS).full, true);
  const first = s.i;
  s = stepSequence(s, CARDS, 30); assert.ok(s.i > first, 'it moved on by itself');
  const t = stepSequence(startSequence(), CARDS, 1000);
  assert.equal(t.phase, 'tally'); assert.equal(t.i, CARDS.length - 1); assert.equal(viewSequence(t, CARDS).tally, true);
  assert.equal(viewSequence(t, CARDS).text, CARDS[CARDS.length - 1].text);
});

test('stepping in small ticks and in one big step reach the same card and phase; stepping never changes the state it was given', () => {
  const a = startSequence(), frozen = JSON.stringify(a);
  let small = a; for (let k = 0; k < 4000; k++) small = stepSequence(small, CARDS, 0.016);
  const big = stepSequence(a, CARDS, 4000 * 0.016);
  assert.equal(JSON.stringify(a), frozen);
  assert.equal(small.i, big.i); assert.equal(small.phase, big.phase);
  const total = CARDS.reduce((n, c) => n + TYPING.lead + c.text.length / TYPING.cps + TYPING.hold(c.text), 0);
  assert.ok(total > 25 && total < 90, `the whole epilogue runs ${total.toFixed(0)} s untouched`);
});

test('a press finishes typing first, then advances; the last press leaves the cards; Esc skips to the tally', () => {
  let s = startSequence();
  s = pressSequence(s, CARDS); assert.equal(s.i, 0); assert.equal(viewSequence(s, CARDS).full, true, 'the first press completes the card');
  s = pressSequence(s, CARDS); assert.equal(s.i, 1); assert.equal(viewSequence(s, CARDS).text, '', 'the second moves on');
  for (let k = 0; k < 40 && s.phase === 'cards'; k++) s = pressSequence(s, CARDS);
  assert.equal(s.phase, 'tally'); assert.equal(s.i, CARDS.length - 1);
  assert.equal(pressSequence(s, CARDS), s, 'a press in the tally is not the sequence\'s business');
  const k = skipSequence(startSequence(), CARDS); assert.equal(k.phase, 'tally'); assert.equal(viewSequence(k, CARDS).tally, true);
});

test('the shell wires the epilogue only for a finale, and the intermission still follows it', () => {
  const main = fs.readFileSync(path.join(ROOT, 'src/game/main.js'), 'utf8');
  assert.match(main, /endingFor\(/); assert.match(main, /g\.mode = 'epilogue'/); assert.match(main, /finishEpilogue/);
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  for (const id of ['screen-ending', 'ending-art', 'ending-who', 'ending-text', 'ending-tally']) assert.match(html, new RegExp(`id="${id}"`), id);
});
