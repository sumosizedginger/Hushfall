// PT-052 Session C (U3 and U4 of the information workstream): the Journal's Objectives, Items and Bestiary pages and the minimap. The models are pure (journal.js, bestiary.js, minimap.js) and tested as data; the screen against a stand-in DOM; the shell's wiring as text and
// by the real world driving the real drawing code. NOTHING here touches the simulation: the Bestiary reads creature states, the minimap reads the explored cells, both read-only.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { objectivesPage, itemsPage, weaponKey, tabAfter, JOURNAL_TABS } from '../src/game/journal.js';
import { BESTIARY, seenKinds, sanitizeBestiary, bestiaryPage } from '../src/game/bestiary.js';
import { minimapView, drawMinimap, sanitizeMinimap, MINIMAP, MINIMAP_MODES } from '../src/game/minimap.js';
import { sanitizeProgress, newProgress } from '../src/engine/progress.js';
import { defaultSettings, sanitizeSettings } from '../src/game/settings.js';
import { ENEMIES } from '../src/engine/defs.js';
import { createWorld, step, drainEvents } from '../src/engine/world.js';
import { updateExplored, automapModel } from '../src/engine/automap.js';
import { loadMapFile } from '../src/engine/harness.js';
import { UI } from '../src/game/ui.js';
import { standInDom, canvasContext } from './stubs.js';
import { ROOT } from './helpers.js';

const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');

test('the Journal has five pages and left/right walk round them', () => {
  assert.deepEqual(JOURNAL_TABS, ['map', 'objectives', 'log', 'items', 'bestiary']);
  assert.equal(tabAfter('map', -1), 'bestiary'); assert.equal(tabAfter('bestiary', 1), 'map'); assert.equal(tabAfter('log', 1), 'items'); assert.equal(tabAfter('nonsense', 1), 'objectives');
});

test('the Objectives page: the goal now, the goals before it newest first, each once, never the current one twice', () => {
  assert.deepEqual(objectivesPage({ current: 'c', history: ['a', 'b', 'c', 'b'] }), { current: 'c', done: ['b', 'a'] });
  assert.deepEqual(objectivesPage(), { current: null, done: [] }); assert.deepEqual(objectivesPage({ current: '', history: [null, 7, 'x'] }), { current: null, done: ['x'] });
});

test('the Items page: weapons in slot order with their key, ammunition against the cap the Locker gives, keys by colour, armour against its cap', () => {
  const p = { weapons: ['mortar', 'boathook', 'scattergun', 'flare', 'carbine'], ammo: { flare: 5, shell: 12.9, round: 3, rocket: 2 }, keys: ['brass', 'iron', 'brass'], armor: 41.7 }, up = { ammo: 2, armor: 1 };
  const page = itemsPage({ player: p, upgrades: up });
  assert.deepEqual(page.weapons.map((w) => w.id), ['flare', 'scattergun', 'boathook', 'carbine', 'mortar'].sort((a, b) => ['flare', 'scattergun', 'rivet', 'harpoon', 'arc', 'melee', 'carbine', 'linethrower', 'fork', 'mortar'].indexOf(a === 'boathook' ? 'melee' : a) - ['flare', 'scattergun', 'rivet', 'harpoon', 'arc', 'melee', 'carbine', 'linethrower', 'fork', 'mortar'].indexOf(b === 'boathook' ? 'melee' : b)));
  assert.deepEqual(page.weapons.map((w) => w.key), ['1', '2', '6', '7', '0'], 'the guns by slot, the melee tool on 6, the mortar on 0');
  const sg = page.weapons.find((w) => w.id === 'scattergun'); assert.deepEqual(sg.ammo, { type: 'shell', have: 12, cap: 52 }, 'shells: 40 plus two tiers of 15%');
  assert.equal(page.weapons.find((w) => w.id === 'boathook').ammo, null, 'a melee weapon has no ammunition'); assert.ok(page.weapons.find((w) => w.id === 'carbine').line.length > 10, 'a found gun has its one line');
  assert.deepEqual(page.keys.map((k) => k.id), ['brass', 'iron']); assert.ok(/^#/.test(page.keys[0].color)); assert.deepEqual(page.armor, { value: 41, cap: 120 }); assert.deepEqual(page.upgrades.map((u) => [u.track, u.tier, u.max]), [['ammo', 2, 5], ['armor', 1, 5]]);
  assert.equal(weaponKey('mortar'), '0'); assert.equal(weaponKey('chainsaw'), '6'); assert.equal(weaponKey('nonsense'), '');
  assert.doesNotThrow(() => itemsPage()); assert.doesNotThrow(() => itemsPage({ player: { weapons: ['gone'], ammo: null, keys: null }, upgrades: 'garbage' }));
});

test('the Bestiary has a line for EVERY kind in the game, and a kind added without one fails here', () => {
  for (const k of Object.keys(ENEMIES)) assert.ok(typeof BESTIARY[k] === 'string' && BESTIARY[k].length >= 20 && BESTIARY[k].length <= 200, k + ' has a line of a sensible length');
  for (const k of Object.keys(BESTIARY)) assert.ok(ENEMIES[k], k + ' is a real kind');
});

test('a creature is MET when it is awake or dead; the list keeps the order of the game, adds only what is new, and returns the same array when nothing is', () => {
  const list = seenKinds([], [{ kind: 'gaunt', state: 'chase' }, { kind: 'tollbearer', state: 'idle' }, { kind: 'bellhand', state: 'dead' }, { kind: 'nonsense', state: 'chase' }, null]);
  assert.deepEqual(list, ['gaunt', 'bellhand'].sort((a, b) => Object.keys(ENEMIES).indexOf(a) - Object.keys(ENEMIES).indexOf(b)));
  assert.strictEqual(seenKinds(list, [{ kind: 'gaunt', state: 'chase' }, { kind: 'tollbearer', state: 'idle' }]), list, 'nothing new: the same array');
  assert.ok(seenKinds(list, [{ kind: 'tollbearer', state: 'chase' }]).includes('tollbearer')); assert.deepEqual(seenKinds(undefined, []), []);
  assert.deepEqual(sanitizeBestiary(['gaunt', 'gaunt', 'x', 7, 'tollbearer']), ['tollbearer', 'gaunt']); assert.deepEqual(sanitizeBestiary('nope'), []);
  const page = bestiaryPage(['gaunt']); assert.equal(page.entries.length, 1); assert.equal(page.entries[0].name, ENEMIES.gaunt.name); assert.equal(page.unmet, page.total - 1); assert.equal(page.entries[0].line, BESTIARY.gaunt);
});

test('the Bestiary is kept in the progress (lazy, honest) and a real world fills it when a creature wakes', () => {
  assert.equal(newProgress().bestiary, undefined, 'absent until the first meeting');
  assert.deepEqual(sanitizeProgress({ bestiary: ['gaunt', 'x', 'gaunt', 3] }).bestiary, ['gaunt']); assert.equal(sanitizeProgress({ bestiary: [] }).bestiary, undefined); assert.equal(sanitizeProgress({ bestiary: 'no' }).bestiary, undefined);
  const w = createWorld(loadMapFile(path.join(ROOT, 'maps', 'C1E1M01.json')), { seed: 1, difficulty: 'normal' }); assert.deepEqual(seenKinds([], w.enemies), [], 'everything is asleep at the start');
  const e = w.enemies.find((q) => q.kind === 'tollbearer'); e.state = 'chase'; assert.deepEqual(seenKinds([], w.enemies), ['tollbearer']);
});

test('the minimap view: only the explored cells within the window round the player, offsets from the player\'s cell, levers and exits placed from the player\'s exact spot', () => {
  const cells = []; for (let z = 0; z < 60; z++) for (let x = 0; x < 60; x++) cells.push({ cx: x, cz: z, kind: x === 0 || z === 0 ? 'wall' : 'floor' });
  const model = { w: 60, h: 60, cell: 2, cells, doors: [{ cx: 31, cz: 30, key: 'brass', keyColor: '#c9a44c', open: 0, axis: 'x' }, { cx: 5, cz: 5, key: null, open: 0, axis: 'z' }], exits: [{ x: 66, z: 61, locked: true }, { x: 4, z: 4, locked: false }], switches: [{ x: 62, z: 60, used: false }], player: { x: 61, z: 61, yaw: 0 } };
  const v = minimapView(model, 18);
  assert.ok(v.cells.every((c) => Math.abs(c.dx) <= 18 && Math.abs(c.dz) <= 18)); assert.equal(v.cells.length, 37 * 37, 'a full window of explored cells'); assert.equal(v.cells.find((c) => c.dx === 0 && c.dz === 0).kind, 'floor');
  assert.equal(v.doors.length, 1, 'the far door is outside the window'); assert.deepEqual([v.doors[0].dx, v.doors[0].dz], [1, 0]); assert.equal(v.exits.length, 1); assert.equal(v.exits[0].locked, true); assert.ok(Math.abs(v.exits[0].fx - 2.5) < 1e-9 && Math.abs(v.exits[0].fz - 0) < 1e-9);
  assert.equal(v.switches.length, 1); assert.deepEqual(v.frac, { x: 0.5, z: 0.5 });
});

test('the minimap draws into a canvas of its own size, the arrow in the middle, nothing for "off", and survives a player at the corner of a map', () => {
  assert.deepEqual(MINIMAP_MODES, ['off', 'small', 'large']); assert.equal(sanitizeMinimap('large'), 'large'); assert.equal(sanitizeMinimap('huge'), 'small'); assert.equal(sanitizeMinimap(undefined), 'small');
  const cells = []; for (let z = 0; z < 10; z++) for (let x = 0; x < 10; x++) cells.push({ cx: x, cz: z, kind: x === 0 || z === 0 || x === 9 || z === 9 ? 'wall' : 'floor' });
  const model = { w: 10, h: 10, cell: 2, cells, doors: [], exits: [], switches: [], player: { x: 2.5, z: 2.5, yaw: 1 } };
  for (const mode of ['small', 'large']) { const ctx = canvasContext(), canvas = { width: 0, height: 0, getContext: () => ctx }; assert.equal(drawMinimap(canvas, model, mode), true); const side = (2 * MINIMAP.sizes[mode].r + 1) * MINIMAP.sizes[mode].s; assert.deepEqual([canvas.width, canvas.height], [side, side]); assert.ok(ctx.calls.get('fillRect') >= 64, 'cells were drawn'); assert.ok(ctx.calls.get('closePath') >= 1, 'the arrow was drawn'); }
  const off = canvasContext(); assert.equal(drawMinimap({ width: 0, height: 0, getContext: () => off }, model, 'off'), false); assert.equal(off.calls.size, 0, 'off draws nothing');
});

test('the real world drives the real minimap on three maps: walk a little, build the model, draw: no throw, and what has been seen is drawn', () => {
  for (const id of ['C1E1M01', 'C1E4M02', 'C2M20']) {
    const w = createWorld(loadMapFile(path.join(ROOT, 'maps', id + '.json')), { seed: 1, difficulty: 'normal' });
    for (let i = 0; i < 90; i++) { w.player.hp = 100; step(w, { move: [0, 1], yaw: 0.01, pitch: 0, fire: false, aim: false, sprint: true, use: false, weapon: null, weaponStep: 0 }); drainEvents(w); } updateExplored(w);
    const model = automapModel(w), ctx = canvasContext(); assert.ok(model.cells.length > 20, id + ' has explored cells'); assert.equal(drawMinimap({ width: 0, height: 0, getContext: () => ctx }, model, 'small'), true); assert.ok(ctx.calls.get('fillRect') > 20, id + ': drew its cells');
  }
});

test('settings: the minimap defaults to small, an unknown value becomes small, and the page has the canvas, the select and the five tab buttons', () => {
  assert.equal(defaultSettings().minimap, 'small'); assert.equal(sanitizeSettings({ ...defaultSettings(), minimap: 'off' }).settings.minimap, 'off'); assert.equal(sanitizeSettings({ ...defaultSettings(), minimap: 'zzz' }).settings.minimap, 'small'); const old = { ...defaultSettings() }; delete old.minimap; assert.equal(sanitizeSettings(old).settings.minimap, 'small', 'an older save: the default');
  const html = read('index.html'); assert.ok(html.includes('<canvas id="minimap"></canvas>')); assert.ok(html.includes('id="set-minimap"')); for (const t of JOURNAL_TABS) assert.ok(html.includes('id="btn-journal-' + t + '"'), t);
  for (const id of ['journal-objectives', 'journal-log', 'journal-items', 'journal-bestiary']) assert.ok(html.includes('id="' + id + '"'), id);
});

test('the Journal screen draws the Objectives, Items and Bestiary pages (escaped), shows one page at a time, and the minimap mode reaches the body (stand-in DOM)', () => {
  const dom = standInDom();
  try {
    const ui = new UI(new Proxy({}, { get: () => () => {} })), el = (id) => dom.els.get(id) ?? document.getElementById(id);
    const log = { entries: [], newCount: 0, earlier: 0 };
    const objectives = { current: 'Open the <b>east</b> gate', done: ['Find the "key"'] };
    const items = itemsPage({ player: { weapons: ['flare', 'carbine'], ammo: { flare: 4, round: 20 }, keys: ['brass'], armor: 10 }, upgrades: { ammo: 1 } });
    const bestiary = bestiaryPage(['tollbearer', 'gaunt']);
    ui.show('journal', { log, objectives, items, bestiary, mapName: 'Test', tab: 'objectives' });
    const ob = el('journal-objectives').innerHTML; assert.ok(ob.includes('&lt;b&gt;east') && !ob.includes('<b>east') && ob.includes('&quot;key&quot;'), 'escaped: ' + ob.slice(0, 120)); assert.ok(ob.includes('Now') && ob.includes('Earlier on this map'));
    assert.equal(el('journal-objectives').classes.has('hidden'), false); for (const id of ['journal-log', 'journal-items', 'journal-bestiary']) assert.equal(el(id).classes.has('hidden'), true, id + ' hidden'); assert.equal(el('screen-journal').classes.has('map'), false); assert.equal(el('btn-journal-objectives').classes.has('on'), true);
    const it = el('journal-items').innerHTML; assert.ok(it.includes('Flare cannon') && it.includes('Harbour carbine') && it.includes('4 / 35 flare') && it.includes('Brass key') && it.includes('tier 1 of 5'), 'items: ' + it.slice(0, 200));
    const be = el('journal-bestiary').innerHTML; assert.ok(be.includes(ENEMIES.tollbearer.name) && be.includes('still to meet'), 'bestiary: ' + be.slice(0, 120));
    ui.journalShowTab('bestiary'); assert.equal(el('journal-bestiary').classes.has('hidden'), false); assert.equal(el('journal-objectives').classes.has('hidden'), true); ui.journalShowTab('map'); assert.equal(el('screen-journal').classes.has('map'), true); for (const id of ['journal-objectives', 'journal-log', 'journal-items', 'journal-bestiary']) assert.equal(el(id).classes.has('hidden'), true);
    ui.show('journal', { log, mapName: 'Test', tab: 'items' }); assert.ok(el('journal-objectives').innerHTML.includes('No objective yet'), 'a Journal opened with only a Log still draws');
    ui.setMinimap('large'); assert.equal(document.body.dataset.minimap, 'large'); ui.setMinimap('bogus'); assert.equal(document.body.dataset.minimap, 'small'); ui.syncSettings({ ...defaultSettings(), minimap: 'off' }); assert.equal(document.body.dataset.minimap, 'off'); assert.equal(el('set-minimap').value, 'off');
  } finally { dom.restore(); }
});

test('the shell wires it: the pages are built when the Journal opens, left/right turn the pages, the Bestiary fills every 30 ticks, the minimap redraws every few frames, nothing reads or writes the sim clock', () => {
  const main = read('src/game/main.js');
  assert.ok(main.includes('objectivesPage(') && main.includes('itemsPage(') && main.includes('bestiaryPage('), 'openJournal builds the pages'); assert.ok(main.includes("e.code === 'ArrowRight'") && main.includes('tabAfter('), 'the arrow keys turn the pages');
  assert.ok(/g\.world\.tick % 30 === 0[^;]*seenKinds\(/.test(main), 'the Bestiary is checked on a tick count'); assert.ok(main.includes('MINIMAP.every') && main.includes('drawMinimap('), 'the minimap is redrawn on a frame count'); assert.ok(main.includes("e.type === 'objective'") && main.includes('g.objectives'), 'objectives are remembered');
  assert.ok(!/world\.time\s*=/.test(read('src/game/journal.js') + read('src/game/bestiary.js') + read('src/game/minimap.js')), 'no module of the three writes the clock');
});

// The owner's screenshot, 2026-10-19: the minimap filled the whole window. `canvas{width:100vw;height:100vh}` (index.html, line 8) sizes EVERY canvas, and #minimap had no size of its own, so a 148 px drawing was stretched about twelve times with a dark wash over the picture and the frame round the edge. No node test could see layout, so this one reads the stylesheet: every canvas but the two full-window ones (the picture and the big map) must name a width and a height that are not the viewport's.
test('every canvas but the picture and the big map has a size of its own in the stylesheet (the global rule makes a canvas full-window)', () => {
  const html = read('index.html'), ids = [...html.matchAll(/<canvas id="([^"]+)"/g)].map((m) => m[1]);
  assert.ok(ids.includes('minimap') && ids.includes('c') && ids.includes('automap'), 'the three canvases of the page: ' + ids);
  assert.ok(/canvas\{[^}]*width:100vw[^}]*height:100vh/.test(html), 'the global rule this guards against is still there: if it goes, so can this test');
  for (const id of ids.filter((i) => i !== 'c' && i !== 'automap')) {
    const rule = [...html.matchAll(new RegExp('#' + id + '\{([^}]*)\}', 'g'))].map((m) => m[1]).join(';');
    const w = /(?:^|[;\s])width:([^;]+)/.exec(rule), h = /(?:^|[;\s])height:([^;]+)/.exec(rule);
    assert.ok(w && h, `#${id} names its own width and height`); assert.ok(!/100v[wh]|100%/.test(w[1] + h[1]), `#${id} is not full-window: width ${w?.[1]}, height ${h?.[1]}`);
  }
});
