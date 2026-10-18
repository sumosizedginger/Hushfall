// PT-047 V2: the toast column. Equal consecutive toasts merge instead of stacking copies, three show at most, and the column sits top right (it used to cover the middle of the picture); the weapon-switch toast is gone;
// the title no longer says "Episode 1 preview" and the controls line lists every weapon key of SLOT_KEYS (the mortar's 0 was missing). Pure model first, then the page, then the UI against a stand-in DOM.
import test, { mock } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { pushToast, toastLabel, TOAST } from '../src/game/toasts.js';
import { legendText, defaultBindings } from '../src/game/bindings.js';
import { SLOT_KEYS } from '../src/engine/defs.js';
import { UI } from '../src/game/ui.js';
import { standInDom } from './stubs.js';
import { ROOT } from './helpers.js';

const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');

test('equal consecutive toasts merge into one with a count and a renewed life', () => {
  let s = pushToast([], 'Rivets (+40)', 0); s = pushToast(s, 'Rivets (+40)', 1); s = pushToast(s, 'Rivets (+40)', 2);
  assert.equal(s.length, 1); assert.equal(s[0].count, 3); assert.ok(Math.abs(s[0].until - (2 + TOAST.life)) < 1e-9, 'the last one renewed its life'); assert.equal(toastLabel(s[0]), 'Rivets (+40) ×3');
  assert.equal(toastLabel({ text: 'A secret!', count: 1 }), 'A secret!', 'a single toast has no count');
  s = pushToast(s, 'Field dressing (+10)', 2.5); s = pushToast(s, 'Rivets (+40)', 3); assert.equal(s.length, 3, 'only the NEWEST toast merges: an older equal one does not'); assert.deepEqual(s.map((t) => t.count), [3, 1, 1]);
});
test('three at most: the oldest goes first; an expired toast is gone before anything is added', () => {
  let s = []; for (const [i, t] of ['a', 'b', 'c', 'd', 'e'].entries()) s = pushToast(s, t, i * 0.1); assert.deepEqual(s.map((t) => t.text), ['c', 'd', 'e']); assert.equal(TOAST.max, 3);
  assert.deepEqual(pushToast(s, 'f', TOAST.life + 0.35).map((t) => t.text), ['e', 'f'], 'c and d (made at 0.2 and 0.3) have expired by 3.55, e (0.4) has not');
  s = pushToast(s, 'f', TOAST.life + 1); assert.deepEqual(s.map((t) => t.text), ['f'], 'everything older than its life was dropped');
  const old = pushToast([], 'x', 0); assert.equal(pushToast(old, 'x', TOAST.life + 1)[0].count, 1, 'an equal toast that already expired starts again at 1, it does not merge');
  assert.deepEqual(pushToast(undefined, 'y', 0).map((t) => t.text), ['y'], 'no stack yet is fine');
});

test('the page: the column is top right, the arrival card has a scrim, the title is plain, the weapon-switch toast is gone', () => {
  const html = read('index.html'), ui = read('src/game/ui.js');
  const rule = html.match(/#toasts\{[^\n]*/)[0]; assert.ok(rule.includes('right:16px') && !rule.includes('left:50%') && rule.includes('align-items:flex-end'), 'top right, not centred: ' + rule.slice(0, 120));
  assert.ok(/#card::before\{[^}]*linear-gradient/.test(html), 'a dark band behind the two lines of the arrival card');
  assert.ok(html.includes('Port Marrow · the first night</div>') && !/Episode 1 preview/.test(html), 'the title subtitle');
  assert.ok(!/weapon_switch:/.test(ui), 'the weapon name is no longer toasted at every switch (the gun in hand and the HUD say it)');
});
test('the controls line lists a key for EVERY weapon slot of defs.js, in order, with the melee slot marked', () => {
  const b = defaultBindings(), text = legendText(b), m = text.match(/Weapons ([^·]*?) \/ wheel/); assert.ok(m, text);
  const keys = m[1].replace(' (melee)', '').split(' '); assert.equal(keys.length, SLOT_KEYS.length, SLOT_KEYS.length + ' slots: ' + m[1]);
  assert.deepEqual(keys, SLOT_KEYS.map((_, i) => ({ 0: '1', 1: '2', 2: '3', 3: '4', 4: '5', 5: '6', 6: '7', 7: '8', 8: '9', 9: '0' })[i]), 'the digit keys 1 to 9 and 0');
  assert.ok(m[1].includes(SLOT_KEYS.indexOf('melee') + 1 + ' (melee)'), 'the melee slot is marked');
  b.weapon10 = ['KeyM']; assert.match(legendText(b), /\bM \/ wheel/, 'a rebind shows');
});
test('the UI: equal toasts merge on the page, the column never holds more than three, expired ones leave (against a stand-in DOM)', () => {
  const dom = standInDom(); mock.timers.enable({ apis: ['setTimeout'] });                                          // the 3.3 s redraw timers must not fire after the test has ended
  try {
    let shown = []; document.getElementById('toasts').replaceChildren = (...kids) => { shown = kids; };                      // the stand-in's own replaceChildren drops its arguments: keep what the UI hands over
    const ui = new UI(new Proxy({}, { get: () => () => {} })), box = () => shown.map((c) => c.textContent);
    ui.toast('Rivets (+40)'); ui.toast('Rivets (+40)'); assert.deepEqual(box(), ['Rivets (+40) ×2']);
    ui.toast('A secret!'); ui.toast('Flare shells (+6)'); ui.toast('Brass key'); assert.equal(box().length, 3); assert.equal(box().at(-1), 'Brass key');
    for (const t of ui.toasts) t.until = 0; ui.renderToasts(); assert.deepEqual(box(), [], 'all expired');
  } finally { mock.timers.reset(); dom.restore(); }
});
