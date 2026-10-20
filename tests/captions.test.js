// PT-071 (R20, accessibility): sound captions. Every event the audio layer handles is captioned or listed with a reason; directions are right; the feed keeps threats and merges repeats.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { CAPTIONS, NO_CAPTION, dirLabel, captionFor, CaptionFeed } from '../src/game/captions.js';

const ROOT = path.resolve(import.meta.dirname, '..');
const eventsSrc = fs.readFileSync(path.join(ROOT, 'src/audio/events.js'), 'utf8');
const handled = [...new Set([...eventsSrc.matchAll(/case '([a-z_]+)'/g)].map((m) => m[1]))];
const skipped = Object.values(NO_CAPTION).flat();

test('every event the audio layer handles is captioned or listed with a reason (and nothing is in both)', () => {
  assert.ok(handled.length > 120, `${handled.length} events found in events.js`);
  const unclassified = handled.filter((t) => !CAPTIONS[t] && !skipped.includes(t));
  assert.deepEqual(unclassified, [], 'a new event needs a caption or a line in NO_CAPTION (src/game/captions.js)');
  assert.deepEqual(skipped.filter((t) => CAPTIONS[t]), [], 'an event is both captioned and skipped');
  assert.deepEqual([...Object.keys(CAPTIONS), ...skipped].filter((t) => !handled.includes(t)), [], 'a caption or a skip names an event the audio layer does not handle (a typo?)');
  assert.equal(new Set(skipped).size, skipped.length, 'an event is listed twice in NO_CAPTION');
});

test('directions: ahead, right, behind, left and close, for a listener facing a yaw (the sim\'s convention: right = (cos, -sin))', () => {
  const at = (yaw, x, z) => dirLabel(0, 0, yaw, x, z);
  assert.equal(at(0, 0, 10), 'ahead'); assert.equal(at(0, 10, 0), 'right'); assert.equal(at(0, 0, -10), 'behind'); assert.equal(at(0, -10, 0), 'left');
  assert.equal(at(0, 7, 7), 'ahead right'); assert.equal(at(0, -7, -7), 'behind left'); assert.equal(at(0, 1, 1), 'close');
  assert.equal(at(Math.PI / 2, 10, 0), 'ahead', 'turning to face +x: +x is ahead'); assert.equal(at(Math.PI / 2, 0, -10), 'right');
});

test('captionFor: names the creature, adds where, drops what is not a caption, and a plain door says nothing', () => {
  const p = { x: 0, z: 0, yaw: 0 };
  assert.deepEqual(captionFor({ type: 'enemy_shot', kind: 'bellhand', x: -9, z: 1 }, p), { text: 'Bellhand fires, left', danger: true });
  assert.equal(captionFor({ type: 'enemy_alert', kind: 'tollbearer', x: 0, z: 12 }, p).text, 'Tollbearer has noticed you, ahead');
  assert.equal(captionFor({ type: 'exit_unlock' }, p).text, 'The exit is open');
  assert.equal(captionFor({ type: 'fire', weapon: 'flare' }, p), null, 'the player\'s own shot has no caption');
  assert.equal(captionFor({ type: 'door_open', x: 3, z: 3 }, p), null, 'an ordinary door is shown by the door');
  assert.match(captionFor({ type: 'door_open', breath: true, x: 3, z: 8 }, p).text, /^A breathing gate opens, /);
  assert.equal(captionFor({ type: 'secret' }, p).text, 'A secret panel opens');
  assert.equal(captionFor({ type: 'tear_land', x: 500, z: 0 }, p), null, 'news from far away is not captioned; a threat is');
  assert.ok(captionFor({ type: 'pulse', x: 500, z: 0 }, p));
  assert.equal(captionFor(null, p), null);
});

test('the feed: three lines at most, repeats merge, a threat outlives news and is not pushed out by it', () => {
  const f = new CaptionFeed();
  f.push({ text: 'A door opens', danger: false }, 0); f.push({ text: 'A door opens', danger: false }, 0.5);
  assert.deepEqual(f.lines(0.6).map((l) => l.text), ['A door opens'], 'the same words inside 1.2 s are one line');
  f.push({ text: 'Bellhand fires, left', danger: true }, 1); f.push({ text: 'A lever clicks', danger: false }, 1.1); f.push({ text: 'Something starts to move', danger: false }, 1.2);
  const lines = f.lines(1.3).map((l) => l.text);
  assert.equal(lines.length, 3); assert.ok(lines.includes('Bellhand fires, left'), 'the threat stays when the fourth line comes');
  assert.deepEqual(f.lines(4.7).map((l) => l.text), ['Bellhand fires, left'], 'news fades after 3.4 s, a threat after 5');
  assert.deepEqual(f.lines(6.2), []);
  f.push({ text: 'x', danger: false }, 7); f.clear(); assert.deepEqual(f.lines(7.1), []);
});
