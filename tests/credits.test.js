// PT-071 (R25): the credits roll. A role with no names never shows; no placeholder text ever ships; the roll scrolls on the wall clock and ends.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { PEOPLE, MADE_WITH, ROLL, creditsLines, creditsHeight, creditsState } from '../src/game/credits.js';

const ROOT = path.resolve(import.meta.dirname, '..');

test('a role with no names is not shown, a name is trimmed and listed once, and what the game is made with is always there', () => {
  const none = creditsLines(); assert.ok(!none.some((l) => l.kind === 'role' && PEOPLE.some(([r, n]) => r === l.text && !n.length)), 'no empty role');
  assert.deepEqual(none.filter((l) => l.kind === 'role').map((l) => l.text), ['Made with']);
  const some = creditsLines([['Design', ['  Ada   Quill ', 'Ada Quill', '']], ['Code', []], ['Sound', null]], MADE_WITH, 'X');
  assert.deepEqual(some.filter((l) => l.kind === 'name').slice(0, 1).map((l) => l.text), ['Ada Quill']); assert.equal(some.filter((l) => l.text === 'Ada Quill').length, 1);
  assert.deepEqual(some.filter((l) => l.kind === 'role').map((l) => l.text), ['Design', 'Made with']); assert.equal(some[0].text, 'X');
  for (const [n] of MADE_WITH) assert.ok(some.some((l) => l.text === n), n);
});

test('no placeholder or unfinished text can reach the screen', () => {
  const text = creditsLines().map((l) => l.text ?? '').join('\n');
  for (const bad of ['TODO', 'TBD', 'XXX', 'lorem', 'your name', 'undefined', 'null', 'NAME']) assert.ok(!text.includes(bad), bad);
  for (const l of creditsLines()) assert.ok(l.kind === 'gap' || (typeof l.text === 'string' && l.text.length > 0), 'every line has text: ' + JSON.stringify(l));
});

test('the roll starts below the window, rises at a steady speed after a pause, and is done after the last line has left and a pause of its own', () => {
  const lines = creditsLines(), h = creditsHeight(lines), view = 600;
  assert.ok(h > 200 && h < 3000, 'a plausible height: ' + h);
  assert.equal(creditsState(0, view, h).offset, view); assert.equal(creditsState(ROLL.lead, view, h).offset, view, 'it waits for the lead');
  const a = creditsState(ROLL.lead + 2, view, h), b = creditsState(ROLL.lead + 3, view, h); assert.ok(Math.abs((a.offset - b.offset) - ROLL.speed) < 1e-9, 'a steady speed');
  assert.equal(creditsState(ROLL.lead + (view + h) / ROLL.speed, view, h).offset, -h, 'the last line leaves the top');
  assert.equal(creditsState(ROLL.lead + (view + h) / ROLL.speed, view, h).done, false); assert.equal(creditsState(ROLL.lead + (view + h) / ROLL.speed + ROLL.tail + 0.01, view, h).done, true);
  assert.equal(creditsState(-5, view, h).offset, view, 'a clock that starts before zero changes nothing');
});

test('the licence the game owes three.js is named in the roll and the roll offers no claim the build cannot back', () => {
  const text = creditsLines().map((l) => l.text ?? '').join('\n');
  assert.match(text, /three\.js/); assert.match(text, /MIT/);
  const notices = fs.readFileSync(path.join(ROOT, 'THIRD_PARTY_NOTICES.md'), 'utf8'); assert.match(notices, /three\.js/);
  assert.ok(!/voice|motion capture|photograph/i.test(text), 'the game has no voice acting or photographs');
});

test('the shell: the roll opens from the title, scrolls on the wall clock through the real UI against a stand-in page, and goes back', async () => {
  const { standInDom } = await import('./stubs.js'), { UI } = await import('../src/game/ui.js'), dom = standInDom();
  try {
    globalThis.innerWidth = 1280; globalThis.innerHeight = 720;
    const ui = new UI(new Proxy({}, { get: () => () => {} })); ui.show('credits');
    const roll = dom.els.get('credits-roll'); assert.ok(roll.innerHTML.includes('HUSHFALL') && roll.innerHTML.includes('three.js'), 'the roll is drawn');
    const lines = creditsLines(), h = creditsHeight(lines); assert.equal((roll.innerHTML.match(/<div/g) ?? []).length, lines.length, 'a div for every line');
    for (const t of [0, 3, 40, 200]) { const st = creditsState(t, 720, h); ui.creditsFrame(st.offset); assert.equal(roll.style.transform, `translateY(${Math.round(st.offset)}px)`); }
    assert.equal(ui.screen, 'credits', 'the UI says it is on the roll');
    ui.show('title', { canContinue: false }); assert.equal(ui.screen, 'title', 'and back on the title');
    ui.clearOverlays?.();
  } finally { dom.restore(); }
});

test('the shell is wired: a title button, a screen, keys and the pad close it, the frame steps it, and the roll is the one credits.js builds', () => {
  const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8'), html = read('index.html'), main = read('src/game/main.js'), ui = read('src/game/ui.js');
  for (const id of ['btn-credits-title', 'screen-credits', 'credits-roll']) assert.ok(html.includes(`id="${id}"`), id);
  assert.ok(main.includes('function openCredits()') && main.includes('function closeCredits()') && main.includes('function stepCredits(dt)'));
  assert.ok(main.includes("if (ui.screen === 'credits') { if (e.code === 'Escape'") && main.includes("if (ui.screen === 'credits') { if (out.pressed.includes('Pad0')"), 'keys and the pad leave it');
  assert.ok(main.includes("g.mode === 'title' && ui.screen === 'credits') stepCredits("), 'the frame steps it');
  assert.ok(ui.includes("creditsLines().map(") && ui.includes('lineHeightOf(l.kind)'));
});
