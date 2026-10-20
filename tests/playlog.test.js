// PT-071 (R24): the opt-in play log: what it keeps, what it never keeps, and that it never throws.
import test from 'node:test';
import assert from 'node:assert/strict';
import { emptyLog, addLevel, addSurvey, sanitizeLog, exportText, describe, loadLog, saveLog, clearLog, FrameHistogram, SURVEY, PLAYLOG_VERSION, CAP, KEY } from '../src/game/playlog.js';

const rnd = (() => { let a = 7; return () => { a = (a * 16807) % 2147483647; return a / 2147483647; }; })();
const store = () => { const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k), m }; };

test('a fresh log has a random session number, the notice and nothing else that could name anyone', () => {
  const log = emptyLog({ renderer: 'ANGLE (NVIDIA)', browser: 'Chrome 140' }, rnd, '2026-10-20');
  assert.equal(log.version, PLAYLOG_VERSION); assert.match(log.session, /^[0-9a-f]{8}$/); assert.match(log.note, /no name, no address/); assert.deepEqual(log.entries, []);
  assert.deepEqual(Object.keys(log).sort(), ['browser', 'day', 'entries', 'note', 'renderer', 'session', 'version']);
});

test('a level entry keeps the numbers a tester would give and clamps what is odd; it never throws', () => {
  let log = emptyLog({}, rnd);
  log = addLevel(log, { map: 'C1E1M01', difficulty: 'hard', outcome: 'dead', seconds: 123.456, kills: 12, damageTaken: 100, secrets: 1, items: 9, deathAt: [31.2, 18], frames: { n: 5000, p50: 7.5, p95: 16.5, p99: 33.5, width: 480 }, attempt: 2 });
  const e = log.entries[0]; assert.deepEqual([e.kind, e.map, e.difficulty, e.outcome, e.seconds, e.deathAt], ['level', 'C1E1M01', 'hard', 'dead', 123.46, [31.2, 18]]); assert.equal(e.frames.p95, 16.5);
  log = addLevel(log, { map: 'x'.repeat(100), difficulty: 'nightmare', outcome: 'exploded', seconds: NaN, kills: -5, frames: { n: 'a' }, deathAt: 'here' });
  const f = log.entries[1]; assert.deepEqual([f.map.length, f.difficulty, f.outcome, f.seconds, f.kills, f.deathAt], [12, 'normal', 'quit', 0, 0, null]);
  assert.doesNotThrow(() => addLevel(log, {})); assert.doesNotThrow(() => addLevel(log, { frames: null }));
});

test('the five questions: only the known answers are kept, the note is cut and cleaned, a second answer set of the same attempt replaces the first', () => {
  assert.equal(SURVEY.length, 5);
  let log = emptyLog({}, rnd);
  log = addSurvey(log, 'C2M09', 1, { know: 'yes', move: 'maybe', surprise: 'some', bogus: 'yes' }, 'The   drum\tgate was\nhard to find. ' + 'x'.repeat(300));
  const s = log.entries[0]; assert.deepEqual(s.answers, { know: 'yes', surprise: 'some' }); assert.ok(s.note.length <= 200 && !/[\t\n]/.test(s.note) && s.note.startsWith('The drum gate was hard to find.'));
  log = addSurvey(log, 'C2M09', 1, { know: 'no' }, ''); assert.equal(log.entries.length, 1, 'the same attempt is replaced'); assert.deepEqual(log.entries[0].answers, { know: 'no' });
  log = addSurvey(log, 'C2M09', 2, { know: 'yes' }); assert.equal(log.entries.length, 2, 'another attempt is another entry');
});

test('the log is capped, and a stored log that is foreign or damaged gives a fresh one, never an error', () => {
  let log = emptyLog({}, rnd); for (let i = 0; i < CAP + 40; i++) log = addLevel(log, { map: 'C1E1M01', outcome: 'complete', seconds: i }); assert.equal(log.entries.length, CAP); assert.equal(log.entries[0].seconds, 40, 'the oldest go first');
  assert.match(sanitizeLog({ version: 99, entries: [] }, rnd).note, /not recognised/); assert.match(sanitizeLog(null, rnd).note, /not recognised/); assert.match(sanitizeLog({ version: 1, entries: 'x' }, rnd).note, /not recognised/);
  const ok = sanitizeLog({ ...log, entries: [...log.entries.slice(0, 3), { kind: 'level', map: 'C1E1M02', outcome: 'bogus', seconds: -1 }, { kind: 'mystery' }, null] }, rnd).log; assert.equal(ok.entries.length, 4, 'a mystery entry is dropped, a bad one repaired'); assert.equal(ok.entries[3].outcome, 'quit');
  const st = store(); st.setItem(KEY, '{not json'); assert.deepEqual(loadLog(st, rnd).entries, []); assert.deepEqual(loadLog({ getItem() { throw new Error('blocked'); } }, rnd).entries, []);
});

test('storage: save, load, clear; a blocked store does not throw; the export is plain JSON with the notice', () => {
  const st = store(); let log = addLevel(emptyLog({ renderer: 'GPU' }, rnd, '2026-10-20'), { map: 'C1E1M01', outcome: 'complete', seconds: 90 });
  assert.equal(saveLog(st, log), true); assert.equal(loadLog(st, rnd).entries.length, 1); clearLog(st); assert.equal(st.m.size, 0);
  assert.equal(saveLog({ setItem() { throw new Error('full'); } }, log), false); assert.doesNotThrow(() => clearLog({ removeItem() { throw new Error('x'); } }));
  const t = exportText(log), back = JSON.parse(t); assert.equal(back.entries[0].map, 'C1E1M01'); assert.match(back.note, /Nothing was sent anywhere/);
  assert.match(describe(log), /1 map and 0 sets/); assert.equal(describe(emptyLog({}, rnd)), 'nothing kept yet');
});

test('the frame histogram: percentiles of a whole level in 200 numbers', () => {
  const h = new FrameHistogram(); for (let i = 0; i < 1000; i++) h.add(i % 100 === 0 ? 40 : 8); const s = h.stats(480);
  assert.deepEqual([s.n, s.width], [1000, 480]); assert.ok(s.p50 >= 8 && s.p50 < 9 && s.p95 < 9 && s.p99 >= 8, JSON.stringify(s)); assert.ok(h.pct(0.995) > 39);
  h.add(5000); assert.equal(h.pct(1), 200.5 > 200 ? 200 : 200); h.add(NaN); h.add(-3); assert.equal(h.n, 1001, 'bad samples are not counted'); h.reset(); assert.equal(h.stats().n, 0);
});

test('the shell: the log is off by default, only an exact true turns it on, and the page and main.js carry its parts', async () => {
  const fs = await import('node:fs'), path = await import('node:path'), { defaultSettings, sanitizeSettings } = await import('../src/game/settings.js');
  const ROOT = path.resolve(import.meta.dirname, '..'), read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
  assert.equal(defaultSettings().playLog, false); assert.equal(sanitizeSettings({ ...defaultSettings(), playLog: true }).settings.playLog, true);
  for (const bad of ['true', 1, 'yes', null]) assert.equal(sanitizeSettings({ ...defaultSettings(), playLog: bad }).settings.playLog, false, String(bad));
  const html = read('index.html'), main = read('src/game/main.js'), ui = read('src/game/ui.js');
  for (const id of ['set-playlog', 'btn-playlog-export', 'btn-playlog-copy', 'btn-playlog-clear', 'playlog-note', 'survey', 'survey-rows', 'survey-note', 'testers-box']) assert.ok(html.includes(`id="${id}"`), id);
  for (const o of ['complete', 'dead', 'quit', 'restart']) assert.ok(main.includes(`logAttempt('${o}')`), 'an attempt that ends as ' + o + ' is logged');
  assert.ok(main.includes('if (!settings.playLog') && main.includes('g.attemptLogged'), 'nothing is kept when the log is off; an attempt is kept once');
  assert.ok(ui.includes('buildSurvey()') && ui.includes('playlogNote(t)'));
});

test('the log never leaves the device: no network call anywhere in it, and the export is a file the player sends', async () => {
  const fs = await import('node:fs'), path = await import('node:path'), ROOT = path.resolve(import.meta.dirname, '..');
  const log = fs.readFileSync(path.join(ROOT, 'src/game/playlog.js'), 'utf8'), main = fs.readFileSync(path.join(ROOT, 'src/game/main.js'), 'utf8');
  for (const bad of ['fetch(', 'XMLHttpRequest', 'sendBeacon', 'WebSocket', 'navigator.share']) assert.ok(!log.includes(bad) && !main.includes(bad), bad);
  assert.ok(main.includes('playlogExport') && main.includes('hushfall-playlog.json'));
});
