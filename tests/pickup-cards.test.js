// PT-049 U1: pickups come in three tiers and the major ones (guns, keys) get a card. A test FAILS the day a kind is added to PICKUPS without a tier, or a weapon pickup without a card, so a new toy can never arrive silently.
import test, { mock } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { pickupTier, pickupCard, cardIcon, WEAPON_CARDS, pickupToast } from '../src/game/toasts.js';
import { PICKUPS, WEAPONS, KEYS, SLOT_KEYS } from '../src/engine/defs.js';
import { UI } from '../src/game/ui.js';
import { standInDom } from './stubs.js';
import { ROOT } from './helpers.js';

test('every pickup kind in the game has a tier; an unknown kind has none and no card', () => {
  for (const kind of Object.keys(PICKUPS)) assert.ok(['minor', 'medium', 'major'].includes(pickupTier(kind)), kind + ' has a tier');
  assert.equal(pickupTier('weapon_plasma'), null); assert.equal(pickupTier('toString'), null); assert.equal(pickupTier(undefined), null); assert.equal(pickupCard('weapon_plasma'), null); assert.equal(pickupCard('toString'), null);
});
test('the tiers: ammunition and small dressings are minor; armour, a large satchel and lamp oil medium; every gun, melee weapon and key major', () => {
  for (const k of ['ammo_flare', 'ammo_shell', 'ammo_rivet', 'ammo_bolt', 'ammo_cell', 'ammo_round', 'ammo_rocket', 'health_small']) assert.equal(pickupTier(k), 'minor', k);
  for (const k of ['armor_vest', 'health_large', 'oil']) assert.equal(pickupTier(k), 'medium', k);
  for (const [k, d] of Object.entries(PICKUPS)) if (d.type === 'weapon' || d.type === 'key') assert.equal(pickupTier(k), 'major', k);
  for (const k of Object.keys(PICKUPS)) if (pickupTier(k) !== 'major') assert.equal(pickupCard(k), null, k + ' is a toast, not a card');
});
test('every major pickup has a card: a name, ONE short line, its colour and an icon; weapon cards name the slot key from SLOT_KEYS', () => {
  const majors = Object.keys(PICKUPS).filter((k) => pickupTier(k) === 'major'); assert.ok(majors.length >= 16, 'the guns and the keys: ' + majors.length);
  for (const k of majors) {
    const c = pickupCard(k); assert.ok(c, k + ' has a card'); assert.equal(c.tier, 'major'); assert.ok(c.title.length >= 4 && c.title.length <= 40, k + ' title'); assert.ok(c.line.length >= 12 && c.line.length <= 130, k + ' line: ' + c.line.length);
    assert.match(c.color, /^#[0-9a-f]{6}$/i, k + ' colour'); assert.ok(['gun', 'melee', 'tool', 'key'].includes(c.icon), k + ' icon'); assert.ok(cardIcon(c.icon).startsWith('<svg') && cardIcon(c.icon).includes('currentColor'), k + ' icon is an svg in the card colour');
    if (PICKUPS[k].type === 'weapon') { assert.ok(Object.hasOwn(WEAPON_CARDS, k), k + ' has its own text'); const want = String((SLOT_KEYS.indexOf(WEAPONS[PICKUPS[k].weapon].kind === 'melee' ? 'melee' : PICKUPS[k].weapon) + 1) % 10); assert.ok(c.line.startsWith('Key ' + want + '. '), k + ': ' + c.line); }
  }
  assert.equal(pickupCard('key_brass').color, KEYS.brass.color); assert.match(pickupCard('key_brass').line, /brass doors/); assert.match(pickupCard('weapon_mortar').line, /^Key 0\. /, 'the mortar is key 0'); assert.match(pickupCard('weapon_axe').line, /^Key 6\. /, 'melee weapons share key 6');
  for (const k of Object.keys(WEAPON_CARDS)) assert.ok(PICKUPS[k]?.type === 'weapon', k + ' is a real weapon pickup');
});
test('minor and medium pickups keep their toast text (amounts come from PICKUPS)', () => { assert.match(pickupToast('ammo_rivet'), /\(\+40\)/); assert.match(pickupToast('armor_vest'), /\(\+50\)/); });

test('the UI: a gun or a key shows a card (and no toast); ammunition, armour and oil show a toast (against a stand-in DOM)', () => {
  const dom = standInDom(); mock.timers.enable({ apis: ['setTimeout'] });                                          // the toast redraw timers must not fire after the test has ended
  try {
    let shown = []; document.getElementById('toasts').replaceChildren = (...kids) => { shown = kids.map((k) => k.textContent); };
    const ui = new UI(new Proxy({}, { get: () => () => {} })), card = () => document.getElementById('pickup-card');
    ui.events([{ type: 'weapon_pickup', kind: 'weapon_carbine' }]); assert.match(card().innerHTML, /Harbour carbine/); assert.match(card().innerHTML, /Key 7\./); assert.match(card().innerHTML, /<svg/); assert.ok(card().classes.has('show')); assert.deepEqual(shown, [], 'no toast for a major pickup');
    ui.events([{ type: 'pickup', kind: 'key_iron' }]); assert.match(card().innerHTML, /Iron key/); assert.equal(card().style['--card'], KEYS.iron.color);
    ui.events([{ type: 'pickup', kind: 'ammo_rivet' }]); assert.ok(shown.some((t) => /Rivets/.test(t)), 'ammunition is a toast: ' + shown); ui.events([{ type: 'pickup', kind: 'armor_vest' }]); assert.ok(shown.some((t) => /flak vest/i.test(t)));
  } finally { mock.timers.reset(); dom.restore(); }
});
test('the page has the card and its styling', () => {
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8'); assert.ok(html.includes('<div id="pickup-card"></div>')); assert.ok(/#pickup-card\{[^}]*bottom:24%/.test(html) && html.includes('#pickup-card.show{animation:pcard') && html.includes('@keyframes pcard'));
});

test('a map that names its keys differently (the Signal House: fuses) gets a card that says what the place calls them (PT-065: the card said "Brass key" while the HUD and the lock said "brass fuse")', () => {
  const plain = pickupCard('key_brass'), fuse = pickupCard('key_brass', { brass: 'Brass fuse' });
  assert.equal(plain.title, KEYS.brass.name); assert.match(plain.line, /brass doors/);
  assert.equal(fuse.title, 'Brass fuse'); assert.match(fuse.line, /brass fuse/); assert.equal(fuse.color, KEYS.brass.color);
});

test('PT-071 (found by the real-GPU capture): a key named "iron damper handle" is "An iron ...", and a finished or cleared card leaves no animation to replay when the HUD comes back after a cinematic', async () => {
  assert.match(pickupCard('key_iron', { iron: 'Iron damper handle' }).line, /^An iron damper handle: the iron lock takes it\.$/); assert.match(pickupCard('key_brass', { brass: 'Brass fuse' }).line, /^A brass fuse: /);
  const { standInDom } = await import('./stubs.js'), { UI } = await import('../src/game/ui.js'), dom = standInDom();
  try {
    globalThis.innerWidth = 1280; globalThis.innerHeight = 720; const ui = new UI(new Proxy({}, { get: () => () => {} })), el = dom.els.get('pickup-card') ?? document.getElementById('pickup-card');
    assert.equal(ui.showPickupCard('key_brass'), true); assert.ok(el.classes.has('show') && el.innerHTML.includes('Brass key'));
    assert.equal(typeof el.onanimationend, 'function'); el.onanimationend(); assert.ok(!el.classes.has('show') && el.innerHTML === '', 'when the animation ends the card is empty and not running');
    ui.showPickupCard('key_brass'); ui.clearOverlays(); assert.ok(!el.classes.has('show') && el.innerHTML === '', 'a level start or a cinematic clears it');
  } finally { dom.restore(); }
});
