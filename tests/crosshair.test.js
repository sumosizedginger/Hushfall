// PT-048 / V2: the crosshair. The old one was a 7 px hollow teal ring (a median 17.8 luma of 255 from the ground behind it); the new default is a cross of four ticks round a dot, near white with a dark outline, and the player can change style, size,
// colour and opacity. The pure part (crosshair.js), the settings round trip and migration, the wiring in index.html / ui.js / main.js, and the UI call against a stand-in DOM are tested here; how it LOOKS is `tools/dev/crosshair-contrast.mjs` and the owner's eyes.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { CROSSHAIR_STYLES, CROSSHAIR_SIZES, CROSSHAIR_COLORS, defaultCrosshair, sanitizeCrosshair, crosshairCss } from '../src/game/crosshair.js';
import { defaultSettings, sanitizeSettings, loadSettings, saveSettings } from '../src/game/settings.js';
import { UI } from '../src/game/ui.js';
import { standInDom } from './stubs.js';
import { ROOT } from './helpers.js';

const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');

test('the default is a white cross round a dot at 95% opacity, and every option is a real one', () => {
  assert.deepEqual(defaultCrosshair(), { style: 'crossdot', size: 'medium', color: 'white', opacity: 0.95 });
  assert.deepEqual([...CROSSHAIR_STYLES], ['crossdot', 'cross', 'dot', 'circle']);
  for (const c of Object.values(CROSSHAIR_COLORS)) assert.match(c, /^#[0-9a-f]{6}$/i); for (const k of Object.values(CROSSHAIR_SIZES)) assert.ok(k > 0.5 && k < 2);
  assert.ok(CROSSHAIR_SIZES.small < CROSSHAIR_SIZES.medium && CROSSHAIR_SIZES.medium < CROSSHAIR_SIZES.large);
});
test('anything wrong falls back field by field and never throws: wrong types, unknown values, prototype names, NaN, out of range', () => {
  const d = defaultCrosshair();
  for (const bad of [null, undefined, 7, 'x', [], () => 1]) assert.deepEqual(sanitizeCrosshair(bad), d);
  const hostile = sanitizeCrosshair({ style: 'toString', size: '__proto__', color: 'constructor', opacity: NaN }); assert.deepEqual(hostile, d, 'inherited names are not options');
  assert.deepEqual(sanitizeCrosshair({ style: 'dot', size: 'large', color: 'red', opacity: 0.5 }), { style: 'dot', size: 'large', color: 'red', opacity: 0.5 });
  assert.equal(sanitizeCrosshair({ opacity: 0 }).opacity, 0.3, 'never invisible'); assert.equal(sanitizeCrosshair({ opacity: 9 }).opacity, 1); assert.equal(sanitizeCrosshair({ opacity: '0.5' }).opacity, d.opacity, 'a string is not a number');
  assert.equal(sanitizeCrosshair({ style: 'cross' }).color, 'white', 'one good field does not drag the others');
});
test('crosshairCss gives index.html its three variables and the style', () => {
  const css = crosshairCss({ style: 'dot', size: 'large', color: 'amber', opacity: 0.6 });
  assert.equal(css.style, 'dot'); assert.deepEqual(css.vars, { '--xc': CROSSHAIR_COLORS.amber, '--xk': String(CROSSHAIR_SIZES.large), '--xo': '0.6' });
  assert.deepEqual(crosshairCss(undefined), crosshairCss(defaultCrosshair()), 'no settings: the default');
});

test('settings: the default carries it, an OLD save without one gets the new default, a damaged one is repaired, and it survives save and load', () => {
  assert.deepEqual(defaultSettings().crosshair, defaultCrosshair());
  const old = { ...defaultSettings() }; delete old.crosshair; assert.deepEqual(sanitizeSettings(old).settings.crosshair, defaultCrosshair(), 'an older save migrates to the default');
  const damaged = sanitizeSettings({ ...defaultSettings(), crosshair: { style: 'laser', size: 3, color: null, opacity: 'x' } }).settings.crosshair; assert.deepEqual(damaged, defaultCrosshair());
  const store = new Map(), storage = { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, v) };
  const s = defaultSettings(); s.crosshair = { style: 'cross', size: 'small', color: 'green', opacity: 0.7 }; assert.ok(saveSettings(storage, s));
  assert.deepEqual(loadSettings(storage).settings.crosshair, s.crosshair);
});

test('index.html: the four controls exist, are bound in ui.js and main.js, and #cross has a rule for every style and every state', () => {
  const html = read('index.html'), ui = read('src/game/ui.js'), main = read('src/game/main.js');
  for (const id of ['set-xh-style', 'set-xh-size', 'set-xh-color', 'set-xh-opacity']) { assert.ok(html.includes('id="' + id + '"'), id + ' in the menu'); assert.ok(ui.includes("$('" + id + "')"), id + ' bound'); }
  for (const v of CROSSHAIR_STYLES) assert.ok(html.includes('<option value="' + v + '">'), 'style option ' + v);
  for (const v of Object.keys(CROSSHAIR_SIZES)) assert.ok(html.includes('<option value="' + v + '">'), 'size option ' + v); for (const v of Object.keys(CROSSHAIR_COLORS)) assert.ok(html.includes('<option value="' + v + '">'), 'colour option ' + v);
  assert.ok(main.includes("k === 'crosshair'") && main.includes('ui.syncCrosshair(settings.crosshair)'), 'main.js applies it at start and on every change');
  for (const sel of ['#cross[data-style=cross]', '#cross[data-style=dot]', '#cross[data-style=circle]', 'body[data-stance=ads] #cross', 'body[data-stance=sprint] #cross', 'body[data-stance=guard] #cross', '#cross.ripo', '#cross.supp', '#cross.grab', '#cross.held']) assert.ok(html.includes(sel + '{'), sel + ' has a rule');
  assert.ok(!html.includes('width:7px;height:7px;margin:-4px'), 'the old 7 px ring rule is gone');
  const rule = html.match(/#cross\{[^\n]*/)[0]; assert.ok(rule.includes('var(--xc') && rule.includes('var(--xo') && rule.includes('vh'), 'the base rule reads the settings and is sized in vh');
});
test('the UI applies it to #cross: the style and the three variables (against a stand-in DOM)', () => {
  const dom = standInDom();
  try {
    const ui = new UI(new Proxy({}, { get: () => () => {} })); ui.syncCrosshair({ style: 'dot', size: 'large', color: 'red', opacity: 0.5 });
    const el = dom.els.get('cross'); assert.equal(el.dataset.style, 'dot'); assert.equal(el.style['--xc'], CROSSHAIR_COLORS.red); assert.equal(el.style['--xk'], String(CROSSHAIR_SIZES.large)); assert.equal(el.style['--xo'], '0.5');
    assert.equal(dom.els.get('set-xh-color').value, 'red'); ui.applyCrosshair({ style: 'nonsense' }); assert.equal(el.dataset.style, 'crossdot', 'a bad value never reaches the page');
  } finally { dom.restore(); }
});
