// PT-049 U2, DECIDED 2026-10-15 ("don't mess with the simulation clock for text"): the player reads when they pause. Every message also goes to the Journal's Log, the HUD counts the unread ones, and Tab opens the Journal and PAUSES (it opens on the Log when
// something is unread, otherwise on the Map). The model is pure (journal.js); the screen is exercised against a stand-in DOM; main.js's wiring is checked as text. NOTHING here touches the simulation clock: that is asserted too.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { journalLog, openTab } from '../src/game/journal.js';
import { recordAdd } from '../src/game/record.js';
import { defaultSettings, sanitizeSettings } from '../src/game/settings.js';
import { UI } from '../src/game/ui.js';
import { standInDom } from './stubs.js';
import { ROOT } from './helpers.js';

const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
const maps = { M1: { messages: [{ id: 'a', speaker: 'HARBOUR RADIO', text: 'First.' }, { id: 'b', speaker: 'KEEPER LOG', text: 'Second.' }, { id: 'c', speaker: '', text: 'Third.' }] }, M0: { messages: [{ id: 'z', speaker: 'OLD', text: 'Earlier.' }] } };
const progressOf = (...pairs) => pairs.reduce((p, [m, id]) => recordAdd(p, m, id), { record: {} });

test('the Log is this map\'s messages, NEWEST FIRST, the unread ones marked, documents set apart, earlier maps counted', () => {
  const p = progressOf(['M0', 'z'], ['M1', 'b'], ['M1', 'a'], ['M1', 'c']);
  const log = journalLog({ maps, progress: p, mapId: 'M1', unread: new Set(['c', 'a']) });
  assert.deepEqual(log.entries.map((e) => e.id), ['c', 'a', 'b'], 'the order they were received, newest first'); assert.deepEqual(log.entries.map((e) => e.isNew), [true, true, false]);
  assert.equal(log.newCount, 2); assert.equal(log.earlier, 1); assert.equal(log.entries.find((e) => e.id === 'b').document, true, 'a KEEPER LOG is a found document'); assert.equal(log.entries.find((e) => e.id === 'a').document, false, 'a voice is not');
  assert.equal(log.entries[0].speaker, '', 'an unsigned message keeps an empty speaker (the screen says unsigned)');
});
test('what is not there is skipped, not invented: an id with no message, a map with no record, no progress at all', () => {
  assert.deepEqual(journalLog({ maps, progress: progressOf(['M1', 'gone'], ['M1', 'a']), mapId: 'M1' }).entries.map((e) => e.id), ['a']);
  assert.deepEqual(journalLog({ maps, progress: { record: {} }, mapId: 'M1' }), { entries: [], newCount: 0, earlier: 0 }); assert.deepEqual(journalLog({ maps, progress: undefined, mapId: 'nope' }), { entries: [], newCount: 0, earlier: 0 });
  assert.doesNotThrow(() => journalLog({ maps: undefined, progress: { record: { M1: 'not a list', M2: ['x'] } }, mapId: 'M1' }));
});
test('the Journal opens on the Log when something is unread and on the Map otherwise', () => { assert.equal(openTab(0), 'map'); assert.equal(openTab(1), 'log'); assert.equal(openTab(40), 'log'); });

test('the Journal screen: entries are drawn, new ones marked, hostile text is escaped, the tabs switch, the HUD count shows and hides (against a stand-in DOM)', () => {
  const dom = standInDom();
  try {
    const ui = new UI(new Proxy({}, { get: () => () => {} })), el = (id) => dom.els.get(id) ?? document.getElementById(id);
    const log = { entries: [{ id: 'x', speaker: '<b>EVIL</b>', text: 'a "quoted" <script>alert(1)</script> & more', document: true, isNew: true }, { id: 'y', speaker: 'RADIO', text: 'Plain.', document: false, isNew: false }], newCount: 1, earlier: 3 };
    ui.show('journal', { log, mapName: 'Marrow Quay', tab: 'log' });
    const html = el('journal-list').innerHTML; assert.ok(!html.includes('<script>') && !html.includes('<b>EVIL') && html.includes('&lt;script&gt;') && html.includes('&quot;quoted&quot;'), 'escaped: ' + html.slice(0, 160));
    assert.ok(html.includes('rec doc new') && html.includes('class="rec"'), 'new and document classes'); assert.ok(html.includes('3 more from earlier maps'), 'earlier count'); assert.equal(el('journal-title').textContent, 'Marrow Quay'); assert.equal(el('journal-new').textContent, '(1 new)');
    assert.equal(el('journal-log').classes.has('hidden'), false, 'the Log tab shows the list'); assert.equal(el('screen-journal').classes.has('map'), false); assert.equal(el('btn-journal-log').classes.has('on'), true);
    ui.journalShowTab('map'); assert.equal(el('journal-log').classes.has('hidden'), true); assert.equal(el('screen-journal').classes.has('map'), true, 'the Map tab lets the automap show through'); assert.equal(el('btn-journal-map').classes.has('on'), true);
    ui.show('journal', { log: { entries: [], newCount: 0, earlier: 0 }, mapName: 'M', tab: 'map' }); assert.match(el('journal-list').innerHTML, /Nothing received on this map yet/); assert.equal(el('journal-new').textContent, '');
    ui.setUnread(4); assert.equal(el('hud-log').classes.has('hidden'), false); assert.equal(el('hud-log-n').textContent, '4'); ui.setUnread(0); assert.equal(el('hud-log').classes.has('hidden'), true);
  } finally { dom.restore(); }
});

test('the setting: Tab pauses by default, a player can switch it off, an old save gets the default', () => {
  assert.equal(defaultSettings().journalPause, true); const old = { ...defaultSettings() }; delete old.journalPause; assert.equal(sanitizeSettings(old).settings.journalPause, true, 'an older save: the default');
  assert.equal(sanitizeSettings({ ...defaultSettings(), journalPause: false }).settings.journalPause, false); assert.equal(sanitizeSettings({ ...defaultSettings(), journalPause: 'no' }).settings.journalPause, true, 'only false turns it off');
});
test('the wiring: Tab opens the Journal and pauses (the sim is not stepped), the map key closes it, the Map tab draws the automap, unread is counted and reset, and the clock is never scaled for text', () => {
  const main = read('src/game/main.js'), html = read('index.html');
  assert.ok(/if \(cmd\.map\) \{ if \(settings\.journalPause !== false\) \{ openJournal\(\); return; \} g\.mapOpen = !g\.mapOpen; \}/.test(main), 'stepOnce opens the Journal, or toggles the live map when the setting is off');
  const open = main.slice(main.indexOf('function openJournal()'), main.indexOf('function resume()')); assert.ok(open.includes("g.mode = 'paused'") && open.includes('document.exitPointerLock') && open.includes('journalLog(') && open.includes('openTab('), 'it pauses like the pause menu');
  assert.ok(/ui\.screen === 'journal' && g\.mode === 'paused' && \(g\.input\.bindings\.map \|\| \[\]\)\.includes\(e\.code\)\) \{ e\.preventDefault\(\); resume\(\)/.test(main), 'the map key closes it');
  assert.ok(main.includes("ui.screen === 'journal' && g.journalTab === 'map'"), 'the Map tab draws the automap'); assert.ok(main.includes('g.unread.add(e.id)') && main.includes('g.unread = new Set(); ui.setUnread(0)'), 'unread counted, and reset on a new level');
  assert.ok(!/timeScale[^;\n]*message|message[^;\n]*timeScale|timeScale[^;\n]*comms|comq[^;\n]*timeScale/i.test(main), 'no message ever scales the clock');
  for (const id of ['screen-journal', 'journal-bar', 'btn-journal-map', 'btn-journal-log', 'btn-journal-close', 'btn-journal-record', 'journal-list', 'journal-log', 'journal-title', 'journal-new', 'hud-log', 'hud-log-n', 'set-journalpause']) assert.ok(html.includes('id="' + id + '"'), id + ' in the page');
});
