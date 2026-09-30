// In-world messages (transmissions, notes, title card): format, sim behaviour, persistence, and the narrative contract of the shipped level.
import test from 'node:test';
import assert from 'node:assert/strict';
import { validateMap, parseMap } from '../src/engine/mapformat.js';
import { createWorld, step, drainEvents } from '../src/engine/world.js';
import { makeSave, parseSave, loadWorld } from '../src/engine/save.js';
import { runRoute } from '../src/engine/harness.js';
import { soundsForEvent, SILENT_EVENTS, RADIO_SOUND } from '../src/audio/events.js';
import { SFX } from '../src/audio/synth.js';
import { shippedMap, shippedSrc, shippedRoute } from './helpers.js';

const idle = (o = {}) => ({ move: [0, 0], yaw: 0, pitch: 0, fire: false, aim: false, sprint: false, use: false, weapon: null, weaponStep: 0, map: false, ...o });
const ROOM = ['#######', '#.....#', '#.....#', '#######'];
const src = (messages, extra = {}) => ({ format: 1, id: 'S1', version: 1, name: 'Story', grid: ROOM, doors: [], secrets: [], messages, entities: [{ type: 'player', at: [1, 1], facing: 'east' }, { type: 'exit', at: [5, 2] }], ...extra });
const msg = (o = {}) => ({ id: 'a', at: [4, 1], radius: 1.5, speaker: 'TEST', text: 'Hello.', ...o });
const quiet = (m, seed = 1) => { const w = createWorld(m, { seed }); w.enemies.length = 0; return w; };
const tick = (w, n = 12) => { const ev = []; for (let i = 0; i < n; i++) { step(w, idle()); ev.push(...drainEvents(w)); } return ev; };

test('message validation: duplicate ids, out-of-grid, empty/long text, bad radius and bad intro are all rejected', () => {
  assert.equal(validateMap(src([msg()])).ok, true);
  const bad = (messages, re, extra) => { const v = validateMap(src(messages, extra)); assert.equal(v.ok, false); assert.ok(v.errors.some((e) => re.test(e)), JSON.stringify(v.errors)); };
  bad([msg(), msg()], /duplicate id/); bad([msg({ at: [99, 1] })], /inside the grid/); bad([msg({ text: '   ' })], /empty text/); bad([msg({ text: 'x'.repeat(181) })], /too long/);
  bad([msg({ radius: 0 })], /radius/); bad([msg({ radius: 20 })], /radius/); bad([], /intro/, { intro: { title: 1 } });
});

test('a message fires once, only when the player comes within range, with speaker and text', () => {
  const w = quiet(parseMap(src([msg()])));                                 // player at cell (1,1) = world (3,3); message at cell (4,1) = (9,3), radius 3 m
  assert.equal(tick(w).filter((e) => e.type === 'message').length, 0, 'not in range yet');
  w.player.x = 7; w.player.z = 3;
  const ev = tick(w).filter((e) => e.type === 'message'); assert.equal(ev.length, 1);
  assert.deepEqual([ev[0].id, ev[0].speaker, ev[0].text], ['a', 'TEST', 'Hello.']); assert.deepEqual(w.messagesSeen, ['a']);
  assert.equal(tick(w, 60).filter((e) => e.type === 'message').length, 0, 'never repeats');
});

test('messages remembered in a save do not replay after loading', () => {
  const m = parseMap(src([msg()])); const w = quiet(m); w.player.x = 8; w.player.z = 3; tick(w);
  const back = loadWorld(parseSave(JSON.stringify(makeSave(w, 'mid-level'))).save, () => m).world;
  assert.deepEqual(back.messagesSeen, ['a']); assert.equal(tick(back, 30).filter((e) => e.type === 'message').length, 0);
  const s = makeSave(w, 'mid-level'); s.version = 4; delete s.world.messagesSeen;
  const r = parseSave(JSON.stringify(s)); assert.equal(r.ok, true, r.detail); assert.equal(r.migratedFrom, 4);
  assert.deepEqual(loadWorld(r.save, () => m).world.messagesSeen, []);
});

test('the radio blip belongs to the moment a message is SHOWN (queued by the UI), so the event itself is declared silent and the recipe exists', () => {
  assert.deepEqual(soundsForEvent({ type: 'message' }), []); assert.match(SILENT_EVENTS.message, /UI plays/); assert.equal(typeof SFX[RADIO_SOUND], 'function');
});

test('shipped level: it has a title card, an outro, and short well-formed messages', () => {
  const m = shippedMap(); assert.ok(m.intro?.title === 'MARROW QUAY' && m.intro.lines.length >= 2); assert.match(m.outro, /Customs Hall/);
  assert.ok(m.messages.length >= 7);
  for (const x of m.messages) assert.ok(x.text.length > 20 && x.text.length <= 180 && x.speaker, x.id);
});

test('narrative contract (sim events only; UI ordering is tested on CommsQueue below and in the browser check): the REQUIRED route triggers the premise beats; the secret note is optional depth', () => {
  const m = shippedMap(), main = runRoute(m, shippedRoute('C1E1M01.main'), { seed: 1 }), sec = runRoute(m, shippedRoute('C1E1M01.secret'), { seed: 1 });
  const seenMain = new Set(main.world.messagesSeen), seenSec = new Set(sec.world.messagesSeen);
  for (const id of ['pier-start', 'pier-tower', 'plaza', 'shed-manifest', 'warehouse-cradles', 'dock', 'hut-log']) assert.ok(seenMain.has(id), 'main route must deliver ' + id);
  assert.equal(seenMain.has('net-loft'), false, 'the optional note is not on the required route'); assert.ok(seenSec.has('net-loft'));
  const text = m.messages.filter((x) => seenMain.has(x.id)).map((x) => x.text).join(' ').toLowerCase();
  for (const idea of ['bell', 'tone', 'wearing', 'cradle', 'processed']) assert.ok(text.includes(idea), `the required messages convey "${idea}"`);
  assert.ok(main.events.filter((e) => e.type === 'message').length >= 7);
});

test('sim event order on the required route (tower glimpse before the plaza, cradles before the dock); whether the UI shows them in that order is the CommsQueue tests', () => {
  const r = runRoute(shippedMap(), shippedRoute('C1E1M01.main'), { seed: 1 }), order = r.events.filter((e) => e.type === 'message').map((e) => e.id);
  const at = (id) => order.indexOf(id);
  assert.ok(at('pier-start') < at('pier-tower') && at('pier-tower') < at('plaza') && at('plaza') < at('warehouse-cradles') && at('warehouse-cradles') < at('dock'), order.join(' > '));
});

// ---- the UI-side ordering rules (audit F02), on the pure queue with a fake clock
import { CommsQueue, durationFor, GAP_MS } from '../src/game/commsqueue.js';
const drive = (q, to, step = 50) => { const log = []; for (let t = 0; t <= to; t += step) { const r = q.update(t); if (r.show) log.push(['show', r.show.id, t]); if (r.hide) log.push(['hide', null, t]); } return log; };

test('comms queue: two messages triggered 0.8 s apart during the title card show in order, one at a time, none dropped', () => {
  const q = new CommsQueue(); q.blockUntil(6300); q.push({ id: 'pier-start', text: 'Calder, come in. The bells are ringing. Nobody rings the bells at night.' }); q.push({ id: 'pier-tower', text: "The bell tower's lit. Teal. That's no lamp of ours." });
  const log = drive(q, 20000), shows = log.filter((l) => l[0] === 'show');
  assert.deepEqual(shows.map((s) => s[1]), ['pier-start', 'pier-tower']); assert.ok(shows[0][2] >= 6300, 'nothing before the card is gone: ' + shows[0][2]);
  const first = { text: 'Calder, come in. The bells are ringing. Nobody rings the bells at night.' };
  assert.ok(shows[1][2] - shows[0][2] >= durationFor(first.text) + GAP_MS, 'the second waits for the first to be read: ' + (shows[1][2] - shows[0][2]));
});

test('comms queue: every message stays up at least 4 s, longer text stays proportionally longer, and a burst of messages is all delivered in order', () => {
  assert.equal(durationFor('short'), 4000); assert.equal(durationFor('x'.repeat(180)), 180 * 55);
  const q = new CommsQueue(); for (const id of ['a', 'b', 'c', 'd', 'e']) q.push({ id, text: 'x'.repeat(60) });
  const log = drive(q, 60000), shows = log.filter((l) => l[0] === 'show');
  assert.deepEqual(shows.map((s) => s[1]), ['a', 'b', 'c', 'd', 'e']); assert.equal(q.pending, 0);
  for (let i = 1; i < shows.length; i++) assert.ok(shows[i][2] - shows[i - 1][2] >= 4000 + GAP_MS - 50);
});

test('comms queue: clear() (new level / restart) drops queued messages and the card block', () => {
  const q = new CommsQueue(); q.blockUntil(9999); q.push({ id: 'a', text: 'hello there' }); q.clear();
  assert.equal(q.pending, 0); q.push({ id: 'b', text: 'fresh' }); assert.equal(q.update(0).show.id, 'b');
});
