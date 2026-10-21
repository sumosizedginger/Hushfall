// Round 1 of the outside audit (Codex 4): C2M30 says nine things in about 25 seconds of walking and the comms queue (FIFO, 4 s minimum, 55 ms a character, nothing dropped) needs about a minute to say them, so the radio reunion at the door was
// still waiting when the exit fired and the epilogue began. Two repairs, both small: a story scene stops the queue's clock (the strip is hidden while it plays), and the exit of a campaign's LAST map waits for the strip, bounded and skippable.
import test from 'node:test';
import assert from 'node:assert/strict';
import { CommsQueue, holdForComms, FINALE_HOLD_S, durationFor, MIN_MS, GAP_MS } from '../src/game/commsqueue.js';
import { runRoute } from '../src/engine/harness.js';
import { shippedMap, shippedRoute } from './helpers.js';

test('busy says whether something is on screen or waiting; shift gives a hidden queue its time back', () => {
  const q = new CommsQueue(); assert.equal(q.busy, false);
  q.push({ id: 'a', text: 'x'.repeat(10) }); assert.equal(q.busy, true, 'waiting');
  assert.equal(q.update(0).show.id, 'a'); assert.equal(q.busy, true, 'on screen');
  // a scene hides the strip for 10 s: without a shift the message would have run out unseen
  assert.equal(q.update(MIN_MS + 1).hide, true, 'control: unshifted, it ends after its 4 s');
  const p = new CommsQueue(); p.push({ id: 'a', text: 'x'.repeat(10) }); p.update(0);
  p.shift(10000); assert.equal(p.update(MIN_MS + 1).hide, false, 'shifted by the scene, it is still up'); assert.equal(p.update(MIN_MS + 10000 + 1).hide, true, 'and ends after its own time, 10 s later');
  p.shift(-5); p.shift(0); assert.equal(p.busy, false, 'a bad shift changes nothing (and the queue is now empty)');
  const t = new CommsQueue(); t.blockUntil(6300); t.shift(2000); t.push({ id: 'b', text: 'y' }); assert.equal(t.update(7000).show, null, 'the title-card block moves with the scene'); assert.equal(t.update(8400).show.id, 'b');
});

test('holdForComms: only a finale, only while busy, bounded, and any skip ends it at once', () => {
  const on = { finale: true, busy: true, dt: 1 };
  assert.deepEqual(holdForComms({ ...on, finale: false }), { hold: false, held: 0 }, 'an ordinary map never waits');
  assert.deepEqual(holdForComms({ ...on, busy: false }), { hold: false, held: 0 }, 'nothing left to say');
  assert.deepEqual(holdForComms({ ...on, skip: true, held: 5 }), { hold: false, held: 0 }, 'a press ends it');
  assert.deepEqual(holdForComms({ ...on, held: 3 }), { hold: true, held: 4 }, 'it counts');
  assert.equal(holdForComms({ ...on, held: FINALE_HOLD_S - 0.5 }).hold, false, 'and it is bounded');
  assert.equal(holdForComms({ ...on, held: FINALE_HOLD_S - 1.5 }).hold, true);
  assert.ok(FINALE_HOLD_S >= 60, 'long enough for the whole of the final map\'s transmissions (about 62 s of reading in all)');
});

test('C2M30 through the real queue: before, three of nine were said before the exit; with the hold, all nine, in order, within the bound', () => {
  const run = runRoute(shippedMap('C2M30'), shippedRoute('C2M30.main'), { seed: 1, difficulty: 'normal' }), msgs = run.events.filter((e) => e.type === 'message');
  assert.equal(run.result, 'complete'); assert.equal(msgs.length, 9);
  const q = new CommsQueue(); q.blockUntil(6300); let next = 0; const shown = [];
  for (let tick = 0; tick <= run.ticks; tick++) { const now = tick / 60 * 1000; while (next < msgs.length && msgs[next].tick <= tick) q.push(msgs[next++]); const r = q.update(now); if (r.show) shown.push(r.show.id); }
  assert.equal(shown.length, 3, 'without a hold only three had begun when the exit fired (the audit\'s number)'); assert.equal(q.pending, 6);
  let now = run.ticks / 60 * 1000, h = { held: 0 };
  for (;;) { const r = holdForComms({ finale: true, busy: q.busy, held: h.held, dt: 1 / 60 }); if (!r.hold) break; h = r; now += 1000 / 60; const u = q.update(now); if (u.show) shown.push(u.show.id); }
  assert.deepEqual(shown, msgs.map((m) => m.id), 'every message was said, in the order it was sent'); assert.equal(q.busy, false, 'and the strip is clear when the epilogue begins');
  assert.ok(h.held < FINALE_HOLD_S, 'inside the bound: ' + h.held.toFixed(1) + ' s');
  assert.ok(msgs.every((m) => durationFor(m.text) >= MIN_MS) && GAP_MS > 0);
});

test('the shell wiring: the hold is on the ending branch of the frame, the skip keys set the flag, and a scene starts and stops the queue', async () => {
  const fs = await import('node:fs'), path = await import('node:path'), { ROOT } = await import('./helpers.js');
  const main = fs.readFileSync(path.join(ROOT, 'src/game/main.js'), 'utf8'), ui = fs.readFileSync(path.join(ROOT, 'src/game/ui.js'), 'utf8');
  assert.match(main, /else if \(g\.timer <= 0 && finaleHolds\(dt\)\)/, 'the ending branch asks before it leaves');
  assert.match(main, /g\.mode === 'ending' && \(e\.code === 'Escape' \|\| e\.code === 'Enter' \|\| e\.code === 'Space'\)\) g\.holdSkip = true/);
  assert.match(main, /g\.mode === 'ending' && \(out\.pressed\.includes\('Pad0'\) \|\| out\.pressed\.includes\('Pad1'\)\)\) g\.holdSkip = true/);
  assert.match(main, /finale: !!endingFor\(CAMPAIGN, g\.mapId/, 'only a finale holds');
  assert.match(ui, /this\._cineAt = performance\.now\(\); clearTimeout\(this\._pumpT\)/); assert.match(ui, /this\.comq\.shift\(d\); this\.pumpComms\(\)/); assert.match(ui, /if \(this\._cineAt != null\) return;/);
});
