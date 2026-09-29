// In-world messages (transmissions, notes, title card): format, sim behaviour, persistence, and the narrative contract of the shipped level.
import test from 'node:test';
import assert from 'node:assert/strict';
import { validateMap, parseMap } from '../src/engine/mapformat.js';
import { createWorld, step, drainEvents } from '../src/engine/world.js';
import { makeSave, parseSave, loadWorld } from '../src/engine/save.js';
import { runRoute } from '../src/engine/harness.js';
import { soundsForEvent } from '../src/audio/events.js';
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

test('every message makes a sound (radio) so it is noticed even when you are not looking at the text', () => {
  assert.deepEqual(soundsForEvent({ type: 'message' }).map((s) => s.id), ['radio']);
});

test('shipped level: it has a title card, an outro, and short well-formed messages', () => {
  const m = shippedMap(); assert.ok(m.intro?.title === 'MARROW QUAY' && m.intro.lines.length >= 2); assert.match(m.outro, /Customs Hall/);
  assert.ok(m.messages.length >= 7);
  for (const x of m.messages) assert.ok(x.text.length > 20 && x.text.length <= 180 && x.speaker, x.id);
});

test('narrative contract: the REQUIRED route delivers the premise; the secret note is optional depth', () => {
  const m = shippedMap(), main = runRoute(m, shippedRoute('C1E1M01.main'), { seed: 1 }), sec = runRoute(m, shippedRoute('C1E1M01.secret'), { seed: 1 });
  const seenMain = new Set(main.world.messagesSeen), seenSec = new Set(sec.world.messagesSeen);
  for (const id of ['pier-start', 'pier-tower', 'plaza', 'shed-manifest', 'warehouse-cradles', 'dock', 'hut-log']) assert.ok(seenMain.has(id), 'main route must deliver ' + id);
  assert.equal(seenMain.has('net-loft'), false, 'the optional note is not on the required route'); assert.ok(seenSec.has('net-loft'));
  const text = m.messages.filter((x) => seenMain.has(x.id)).map((x) => x.text).join(' ').toLowerCase();
  for (const idea of ['bell', 'tone', 'wearing', 'cradle', 'processed']) assert.ok(text.includes(idea), `the required messages convey "${idea}"`);
  assert.ok(main.events.filter((e) => e.type === 'message').length >= 7);
});

test('messages are triggered in a sensible order on the required route (tower glimpse before the plaza, cradles before the dock)', () => {
  const r = runRoute(shippedMap(), shippedRoute('C1E1M01.main'), { seed: 1 }), order = r.events.filter((e) => e.type === 'message').map((e) => e.id);
  const at = (id) => order.indexOf(id);
  assert.ok(at('pier-start') < at('pier-tower') && at('pier-tower') < at('plaza') && at('plaza') < at('warehouse-cradles') && at('warehouse-cradles') < at('dock'), order.join(' > '));
});
