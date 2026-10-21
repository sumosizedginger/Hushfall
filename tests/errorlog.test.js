// PT-050 H1 (HARDENING H-F1): the page's frame loop must never end silently, and a save that breaks the game must not be loaded again at every start. The guard and the report are pure (src/game/errorlog.js) and are run here exactly as main.js
// runs them; the slot quarantine is SaveStore.quarantine; the crash screen is exercised against a stand-in DOM; main.js's wiring is checked as text because main.js cannot be imported without a page.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { guardedFrame, makeReport, appendReport, reportText, loadErrors, saveErrors, MAX_REPORTS, ERROR_KEY } from '../src/game/errorlog.js';
import { SaveStore } from '../src/engine/save.js';
import { UI } from '../src/game/ui.js';
import { standInDom } from './stubs.js';
import { ROOT } from './helpers.js';

const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
/** a fake requestAnimationFrame: the queue of frames asked for, run one at a time */
function raf() { const q = []; return { schedule: (f) => q.push(f), run: (now) => { const f = q.shift(); if (f) f(now); return q.length; }, q }; }

test('the next frame is asked for BEFORE the body runs, so a throw in the body never ends the loop (it used to: a throw after the last statement skipped requestAnimationFrame)', () => {
  const r = raf(), crashes = []; let n = 0;
  const { frame } = guardedFrame({ body: () => { n++; if (n === 2) throw new Error('boom in the renderer'); }, schedule: r.schedule, onCrash: (e, c) => crashes.push([e.message, c]) });
  r.schedule(frame); for (let i = 0; i < 5; i++) assert.equal(r.run(i * 16), 1, 'frame ' + i + ': another frame is queued');
  assert.equal(n, 5, 'the body kept running after the throw'); assert.deepEqual(crashes, [['boom in the renderer', 1]]);
});
test('the same failure every frame halts the loop after three within two seconds instead of spamming; a rare one never does', () => {
  const r = raf(), crashes = []; const { frame, state } = guardedFrame({ body: () => { throw new Error('again'); }, schedule: r.schedule, onCrash: (e, c) => crashes.push(c) });
  r.schedule(frame); let left = 1; for (let i = 0; i < 6 && left; i++) left = r.run(i * 16); assert.deepEqual(crashes, [1, 2, 3]); assert.equal(state.halted, true); assert.equal(left, 0, 'nothing is queued once it halted');
  const r2 = raf(), c2 = []; let k = 0; const g2 = guardedFrame({ body: () => { if (k++ % 100 === 0) throw new Error('rare'); }, schedule: r2.schedule, onCrash: (e, c) => c2.push(c) });
  r2.schedule(g2.frame); for (let i = 0; i < 450; i++) r2.run(i * 16); assert.equal(g2.state.halted, false, 'a crash every 1.6 s is not "the same failure every frame"'); assert.ok(c2.length >= 4 && c2.every((c) => c <= 2));
});
test('a crash handler that itself throws, a NaN frame time and a missing handler argument never take the loop down', () => {
  const r = raf(); const { frame, state } = guardedFrame({ body: () => { throw new TypeError('x'); }, schedule: r.schedule, onCrash: () => { throw new Error('the crash screen broke too'); } });
  r.schedule(frame); assert.doesNotThrow(() => { r.run(Number.NaN); r.run(undefined); }); assert.equal(state.total, 2);
});

test('a report keeps the message, the first lines of the stack and where in the game it happened; strings are cut, numbers are checked', () => {
  const rep = makeReport(Object.assign(new Error('x'.repeat(1000)), { stack: Array.from({ length: 30 }, (_, i) => 'at line ' + i).join('\n') }), { mode: 'playing', map: 'C1E1M01', tick: 1234, seed: Number.NaN, flag: true, nested: { a: 1 }, long: 'y'.repeat(200) }, Date.UTC(2026, 9, 18));
  assert.equal(rep.message.length, 300); assert.equal(rep.stack.split('\n').length, 8); assert.equal(rep.at, '2026-10-18T00:00:00.000Z');
  assert.deepEqual(rep.where, { mode: 'playing', map: 'C1E1M01', tick: 1234, seed: null, flag: true, long: 'y'.repeat(60) }, 'objects are dropped, a NaN becomes null, strings are cut');
  assert.doesNotThrow(() => makeReport(null)); assert.doesNotThrow(() => makeReport('just a string')); assert.equal(makeReport('just a string').message, 'just a string');
  let list = []; for (let i = 0; i < 30; i++) list = appendReport(list, makeReport(new Error('e' + i), {}, i)); assert.equal(list.length, MAX_REPORTS); assert.equal(list.at(-1).message, 'e29'); assert.equal(list[0].message, 'e10');
  assert.match(reportText(list.slice(-1)), /HUSHFALL error report \(1\)[\s\S]*e29/); assert.doesNotThrow(() => reportText(undefined));
});
test('the log survives a full, a disabled or a corrupted storage: it is a convenience and never an error of its own', () => {
  const store = new Map(), ok = { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, v) };
  assert.equal(saveErrors(ok, appendReport([], makeReport(new Error('a'), {}, 1))), true); assert.equal(loadErrors(ok)[0].message, 'a'); assert.ok(store.has(ERROR_KEY));
  const full = { getItem: () => null, setItem: () => { throw new Error('QuotaExceededError'); } }; assert.equal(saveErrors(full, [{}]), false); assert.deepEqual(loadErrors(full), []);
  assert.deepEqual(loadErrors(undefined), []); assert.deepEqual(loadErrors({ getItem: () => '{not json' }), []); assert.deepEqual(loadErrors({ getItem: () => '{"a":1}' }), []);
});

test('SaveStore.quarantine sets a damaged slot aside as <slot>.bad and clears it, so the next slot is used; an empty slot is reported, and a full storage still clears it', () => {
  const m = new Map([['hushfall.save.quick', 'BROKEN TEXT'], ['hushfall.save.auto', 'older']]); const st = new SaveStore({ getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) });
  assert.equal(st.quarantine('quick'), true); assert.equal(m.get('hushfall.save.quick.bad'), 'BROKEN TEXT'); assert.equal(m.has('hushfall.save.quick'), false); assert.equal(m.get('hushfall.save.auto'), 'older', 'the other slot is untouched');
  assert.equal(st.read('quick').reason, 'empty'); assert.equal(st.quarantine('quick'), false, 'nothing left to set aside');
  const m2 = new Map([['hushfall.save.quick', 'X']]); const st2 = new SaveStore({ getItem: (k) => m2.get(k) ?? null, setItem: () => { throw new Error('full'); }, removeItem: (k) => m2.delete(k) });
  assert.doesNotThrow(() => st2.quarantine('quick')); assert.equal(m2.has('hushfall.save.quick'), false, 'cleared even when the copy could not be kept');
});

test('the crash screen: plain words, the error, the report text; a halted loop offers only a reload; it hides again (against a stand-in DOM)', () => {
  const dom = standInDom();
  try {
    const ui = new UI(new Proxy({}, { get: () => () => {} })), el = (id) => dom.els.get(id);
    ui.showCrash({ message: 'Cannot read properties of undefined', text: 'REPORT TEXT', halted: false, aside: 'quick' });
    assert.equal(el('screen-crash').classes.has('hidden'), false); assert.match(el('crash-text').textContent, /went back to the title/); assert.match(el('crash-text').textContent, /"quick" save was set aside/); assert.equal(el('crash-detail').textContent, 'Cannot read properties of undefined');
    assert.equal(el('btn-crash-title').classes.has('hidden'), false); assert.equal(ui.crashText, 'REPORT TEXT');
    ui.showCrash({ message: 'm', text: 't', halted: true, aside: '' }); assert.match(el('crash-text').textContent, /Reload the page/); assert.equal(el('btn-crash-title').classes.has('hidden'), true, 'a halted loop cannot go "back": reload');
    ui.hideCrash(); assert.equal(el('screen-crash').classes.has('hidden'), true);
  } finally { dom.restore(); }
});
test('main.js: the frame is the guarded one and no longer ends with its own requestAnimationFrame; a save that breaks the game early is set aside; the page has the crash screen', () => {
  const main = read('src/game/main.js'), html = read('index.html');
  assert.ok(/guardedFrame\(\{ body: frameBody/.test(main) && /const frame = guardedFrame/.test(main), 'the loop is the guarded one'); assert.ok(!/function frame\(now\)/.test(main), 'the old unguarded frame is gone');
  const body = main.slice(main.indexOf('function frameBody(now)'), main.indexOf('/** the weapons range\'s readout')); assert.ok(body.length > 500 && !body.includes('requestAnimationFrame'), 'the body never schedules the next frame itself');
  assert.ok(main.includes('quarantineLoaded()') && main.includes('store.quarantine(slot)') && main.includes('g.loadedSlot = slot'), 'a loaded slot that breaks the game within three seconds is set aside');
  assert.ok(main.includes('crashToTitle'), 'the crash screen can go back'); for (const id of ['screen-crash', 'crash-text', 'crash-detail', 'btn-crash-title', 'btn-crash-copy']) assert.ok(html.includes('id="' + id + '"'), id);
});
test('starting a fresh level still enters play when the autosave write throws', () => {
  const main = read('src/game/main.js');
  const body = main.slice(main.indexOf('function startLevel('), main.indexOf('function nextLevel('));
  assert.ok(body.includes("g.mode = 'playing'"), 'startLevel enters play');
  const guarded = /try\s*\{[\s\S]*?store\.write\('auto'[\s\S]*?\}\s*catch/.test(body) || /storeSave\(\s*store,\s*'auto'/.test(body);
  assert.equal(guarded, true, 'the level-start autosave can throw out of startLevel and skip play');
  const clearAt = body.indexOf('ui.clearOverlays()');
  const noteAt = body.indexOf('if (saveNote) ui.toast(saveNote)');
  assert.ok(clearAt >= 0 && noteAt > clearAt, 'the failure toast is raised after overlays are cleared, so the level start does not wipe it');
});
