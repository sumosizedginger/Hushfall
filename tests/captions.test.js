// PT-071 (R20, accessibility): sound captions. Every event the audio layer handles is captioned or listed with a reason; directions are right; the
// feed keeps threats and merges repeats.
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
  assert.deepEqual(
    skipped.filter((t) => CAPTIONS[t]),
    [],
    'an event is both captioned and skipped',
  );
  assert.deepEqual(
    [...Object.keys(CAPTIONS), ...skipped].filter((t) => !handled.includes(t)),
    [],
    'a caption or a skip names an event the audio layer does not handle (a typo?)',
  );
  assert.equal(new Set(skipped).size, skipped.length, 'an event is listed twice in NO_CAPTION');
});

test("directions: ahead, right, behind, left and close, for a listener facing a yaw (the sim's convention: right = (cos, -sin))", () => {
  const at = (yaw, x, z) => dirLabel(0, 0, yaw, x, z);
  assert.equal(at(0, 0, 10), 'ahead');
  assert.equal(at(0, 10, 0), 'right');
  assert.equal(at(0, 0, -10), 'behind');
  assert.equal(at(0, -10, 0), 'left');
  assert.equal(at(0, 7, 7), 'ahead right');
  assert.equal(at(0, -7, -7), 'behind left');
  assert.equal(at(0, 1, 1), 'close');
  assert.equal(at(Math.PI / 2, 10, 0), 'ahead', 'turning to face +x: +x is ahead');
  assert.equal(at(Math.PI / 2, 0, -10), 'right');
});

test('captionFor: names the creature, adds where, drops what is not a caption, and a plain door says nothing', () => {
  const p = { x: 0, z: 0, yaw: 0 };
  assert.deepEqual(captionFor({ type: 'enemy_shot', kind: 'bellhand', x: -9, z: 1 }, p), { text: 'Bellhand fires, left', danger: true });
  assert.equal(captionFor({ type: 'enemy_alert', kind: 'tollbearer', x: 0, z: 12 }, p).text, 'Tollbearer has noticed you, ahead');
  assert.equal(captionFor({ type: 'exit_unlock' }, p).text, 'The exit is open');
  assert.equal(captionFor({ type: 'fire', weapon: 'flare' }, p), null, "the player's own shot has no caption");
  assert.equal(captionFor({ type: 'door_open', x: 3, z: 3 }, p), null, 'an ordinary door is shown by the door');
  assert.match(captionFor({ type: 'door_open', breath: true, x: 3, z: 8 }, p).text, /^A breathing gate opens, /);
  assert.equal(captionFor({ type: 'secret' }, p).text, 'A secret panel opens');
  assert.equal(captionFor({ type: 'tear_land', x: 500, z: 0 }, p), null, 'news from far away is not captioned; a threat is');
  assert.ok(captionFor({ type: 'pulse', x: 500, z: 0 }, p));
  assert.equal(captionFor(null, p), null);
});

test('the feed: three lines at most, repeats merge, a threat outlives news and is not pushed out by it', () => {
  const f = new CaptionFeed();
  f.push({ text: 'A door opens', danger: false }, 0);
  f.push({ text: 'A door opens', danger: false }, 0.5);
  assert.deepEqual(
    f.lines(0.6).map((l) => l.text),
    ['A door opens'],
    'the same words inside 1.2 s are one line',
  );
  f.push({ text: 'Bellhand fires, left', danger: true }, 1);
  f.push({ text: 'A lever clicks', danger: false }, 1.1);
  f.push({ text: 'Something starts to move', danger: false }, 1.2);
  const lines = f.lines(1.3).map((l) => l.text);
  assert.equal(lines.length, 3);
  assert.ok(lines.includes('Bellhand fires, left'), 'the threat stays when the fourth line comes');
  assert.deepEqual(
    f.lines(4.7).map((l) => l.text),
    ['Bellhand fires, left'],
    'news fades after 3.4 s, a threat after 5',
  );
  assert.deepEqual(f.lines(6.2), []);
  f.push({ text: 'x', danger: false }, 7);
  f.clear();
  assert.deepEqual(f.lines(7.1), []);
});

// PT-085, the owner: "that damned black bar saying ... over and over". A creature that strikes every 1.5 s used to stack the same words three times,
// because lines merged only inside 1.2 s while a threat stays up for 5.
test('the feed: a creature that keeps attacking is one line, wherever it moves to, until it stops', () => {
  const f = new CaptionFeed();
  for (let t = 0; t < 6; t += 1.5) f.push({ text: 'Gaunt strikes, ahead', danger: true }, t);
  assert.deepEqual(
    f.lines(4.6).map((l) => l.text),
    ['Gaunt strikes, ahead'],
    'the same words stay one line while they are on the screen',
  );
  f.push({ text: 'Gaunt strikes, behind left', danger: true }, 4.7);
  assert.deepEqual(
    f.lines(4.8).map((l) => l.text),
    ['Gaunt strikes, behind left'],
    'it moved: the same line says where it is now',
  );
  f.push({ text: 'Bellhand fires, close', danger: true }, 5);
  assert.equal(f.lines(5.1).length, 2, 'another creature is another line');
  assert.deepEqual(
    f.lines(9.8).map((l) => l.text),
    ['Bellhand fires, close'],
    'each line fades 5 s after its own last sound',
  );
  assert.deepEqual(f.lines(10.1), []);
  f.push({ text: 'A lever clicks', danger: false }, 11);
  f.push({ text: 'A lever clicks', danger: false }, 15);
  assert.equal(f.lines(15.1).length, 1, 'a line that has already faded is simply said again');
});

// PT-085, the owner: "literally right in the middle of the screen ... I can't see what I'm shooting". Reads the real rule from index.html and works its
// lengths out for each window, each corner-map setting and each text size: no browser, so this holds the geometry, not how it looks.
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const ruleOf = (selector) => {
  const at = html.indexOf(`${selector}{`);
  assert.ok(at >= 0, `no rule for ${selector}`);
  return Object.fromEntries(
    html
      .slice(at + selector.length + 1, html.indexOf('}', at))
      .split(';')
      .map((d) => {
        const c = d.indexOf(':');
        return [d.slice(0, c).trim(), d.slice(c + 1).trim()];
      }),
  );
};
/** a CSS length as a number of screen pixels in a window W x H with the text scaled by z (zoom scales px, never a percentage of the window) */
const length = (css, { W, H, z, vars = {} }) => {
  const js = css
    .replace(/var\((--[a-z-]+)\)/g, (_, v) => vars[v])
    .replace(/calc\(/g, '(')
    .replace(/(\d+(?:\.\d+)?)px/g, (_, n) => `(${n}*${z})`)
    .replace(/(\d+(?:\.\d+)?)%/g, (_, n) => `(${n}*${W}/100)`)
    .replace(/(\d+(?:\.\d+)?)vh/g, (_, n) => `(${n}*${H}/100*${z})`)
    .replace(/(\d+(?:\.\d+)?)vw/g, (_, n) => `(${n}*${W}/100)`);
  return new Function('min', 'max', 'clamp', `return ${js};`)(Math.min, Math.max, (a, b, c) => Math.min(Math.max(a, b), c));
};

test('the sound captions live in the top band: clear of the crosshair, the objective and message column, the corner map and the boss bar', () => {
  const r = ruleOf('#captions');
  assert.ok(!('bottom' in r), `the captions must not be anchored to the bottom of the picture (bottom: ${r.bottom})`);
  assert.equal(r.top, '14px');
  const capR = (mode) => ruleOf(`body[data-minimap=${mode}]`)['--cap-r'];
  const up = [html.indexOf('id="boss"'), html.indexOf('id="captions"')];
  assert.ok(up[0] > 0 && up[0] < up[1], 'the boss bar comes first in the page, so the rule that moves the captions under it can apply');
  const belowBoss = html.match(/#boss:not\(\.hidden\)~#captions\{top:(\d+)px\}/);
  assert.ok(belowBoss, 'a boss bar pushes the captions down');
  assert.ok(+belowBoss[1] >= 70, 'the bar with its name and its note is about 70 px down');
  for (const [W, H] of [
    [1024, 768],
    [1280, 720],
    [1366, 768],
    [1536, 864],
    [1920, 1080],
    [2560, 1440],
  ]) {
    for (const mode of ['small', 'large', 'off']) {
      for (const z of [1, 1.25, 1.5]) {
        const vars = { '--cap-r': capR(mode) };
        const left = length(r.left, { W, H, z }),
          width = Math.min(length(r.width, { W, H, z }), length(r['max-width'], { W, H, z, vars })),
          where = `${W}x${H} map ${mode} text x${z}`;
        const column = (16 + 560) * z; // the objective and the messages, at their widest (in a window under about 1220 px they are narrower still)
        if (W * 0.46 >= 560 * z) assert.ok(left >= column, `${where}: ${left} starts inside the message column (${column})`);
        const map =
          mode === 'off'
            ? Math.min(380 * z, W * 0.44)
            : (mode === 'small' ? Math.max(148, Math.min(H * 0.165, 240)) : Math.max(222, Math.min(H * 0.24, 340))) + 16;
        if (width > 200 * z) assert.ok(left + width <= W - map, `${where}: ${left} + ${width} runs under the corner map, which starts at ${W - map}`);
        assert.ok(width >= 150, `${where}: only ${width} px to write in`);
        // three lines at the largest caption size, under a boss bar, must end well above the crosshair
        const lineH = 28 * 1.5;
        assert.ok((+belowBoss[1] + 3 * lineH) * z < H / 2 - 40, `${where}: three lines reach the crosshair`);
      }
    }
  }
});

test('the plate setting really takes the plate away, and the size setting really sizes a caption', () => {
  assert.ok(!/(^|[;}\n])#captions div\{[^}]*background/.test(html), 'a line has a plate only when the setting asks for one');
  assert.ok(/body\.cap-plate #captions div\{[^}]*background/.test(html), 'the setting draws it, once, behind each line');
  assert.ok(!/body\.cap-plate #captions[,{]/.test(html), 'no second plate behind the whole block (the black bar)');
  assert.ok(/#captions div\{[^}]*text-shadow/.test(html), 'without a plate the words still read on a bright wall');
  assert.equal(ruleOf('body[data-capsize=large]')['--cap-k'], '1.25');
  assert.equal(ruleOf('body[data-capsize=larger]')['--cap-k'], '1.5');
  assert.ok(/#captions div\{[^}]*font-size:calc\([^}]*var\(--cap-k/.test(html), 'a line has its own font size, so the size setting must reach it');
});
