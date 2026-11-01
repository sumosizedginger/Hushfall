// PT-077, THE STATS DATABASE (src/game/stats, design/STATS_DATABASE.md): SQLite through sql.js, in node exactly as in the browser (the same WebAssembly build, minus the browser's loader and IndexedDB).
// What is held here: the blueprint and its rules refuse bad rows; the recorder, fed the events of REAL routes played by the bot, writes numbers that agree with the game's own counts (kills, damage taken,
// shots); every source and weapon the engine can name is in the reference tables (or a hit would be filed as "Something unseen"); the reload rule; saving is two steps and never overwrites a good copy with a
// failed one or a file it could not read; Import refuses what is not a Hushfall stats file; the pages show every table; and recording changes nothing in the simulation.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import initSqlJs from 'sql.js';
import { ROOT } from './helpers.js';
import { loadMapFile, loadRouteFile } from '../src/engine/harness.js';
import { createWorld, step, drainEvents, hashWorld } from '../src/engine/world.js';
import { Bot } from '../src/engine/bot.js';
import { InputState } from '../src/engine/input.js';
import { WEAPONS, ENEMIES } from '../src/engine/defs.js';
import { SCHEMA_VERSION, HAZARDS, referenceRows, actOf } from '../src/game/stats/schema.js';
import { StatsDB } from '../src/game/stats/statsdb.js';
import { StatsRecorder } from '../src/game/stats/recorder.js';
import { StatsService } from '../src/game/stats/service.js';
import { rundown, runCard, story } from '../src/game/stats/report.js';
import { statsHtml, runCardHtml, deathLine } from '../src/game/stats/page.js';

const SQL = await initSqlJs();
const MANIFEST = JSON.parse(fs.readFileSync(path.join(ROOT, 'CAMPAIGN_MANIFEST.json'), 'utf8'));
const MAPS = {}; for (const m of MANIFEST.maps) { const f = path.join(ROOT, 'maps', m.id + '.json'); if (fs.existsSync(f)) MAPS[m.id] = loadMapFile(f); }
const REF = referenceRows({ manifest: MANIFEST, maps: MAPS, weapons: WEAPONS, enemies: ENEMIES });
const fresh = () => { const db = new StatsDB(SQL); db.reference(REF); return db; };
let clockN = 0; const now = () => `2026-10-31T12:00:${String(clockN++ % 60).padStart(2, '0')}Z`;

/** play a map's route with the bot, feeding the recorder every tick's events as main.js does; `fights: false` is the passive runner (it gets hurt and often dies) */
function play(rec, id, { routeName = 'main', difficulty = 'normal', seed = 1, fights = true, pt = null, maxTicks = 60 * 60 * 8 } = {}) {
  const map = MAPS[id], route = loadRouteFile(path.join(ROOT, 'routes', `${id}.${routeName}.route.json`)), w = createWorld(map, { seed, difficulty });
  const input = new InputState(), bot = new Bot(w, input, route, { fights }), all = [];
  const run = rec ? rec.startRun({ levelId: id, difficulty, pt, time: w.time }) : null;
  let ticks = 0;
  while (!bot.done && !bot.failed && w.status === 'playing' && ticks < maxTicks) { bot.tick(); step(w, input.sample()); ticks++; const ev = drainEvents(w); all.push(...ev); if (rec && ev.length) rec.events(ev, w); }
  if (rec) rec.endRun(w.status === 'complete' ? 'complete' : w.status === 'dead' ? 'dead' : 'quit', w.time, w);
  return { w, run, events: all };
}

test('the blueprint: a new database is at the current version, foreign keys are on, the reference tables hold every level, weapon, creature and hazard', () => {
  const db = fresh();
  assert.equal(db.version(), SCHEMA_VERSION); assert.equal(db.get('PRAGMA foreign_keys').foreign_keys, 1);
  assert.equal(db.get('SELECT COUNT(*) AS n FROM levels').n, Object.keys(MAPS).length);
  assert.equal(db.get('SELECT COUNT(*) AS n FROM weapons').n, Object.keys(WEAPONS).length + 1, 'every weapon and the quick bash');
  assert.equal(db.get('SELECT COUNT(*) AS n FROM sources').n, Object.keys(ENEMIES).length + HAZARDS.length);
  assert.equal(db.get("SELECT peaceful FROM sources WHERE source_id = 'enemy:vaelfolk'").peaceful, 1);
  assert.equal(db.get("SELECT COUNT(*) AS n FROM levels WHERE campaign = 2 AND episode IS NULL").n, 0, 'every Campaign 2 level has an act');
  assert.equal(actOf({ campaign: 2, id: 'C2S02' }), 3); assert.equal(actOf({ campaign: 2, id: 'C2M25', order: 25 }), 4);
  db.reference(REF); assert.equal(db.get('SELECT COUNT(*) AS n FROM levels').n, Object.keys(MAPS).length, 'run again at every start: an upsert, never a second row');
});

test('the rules refuse bad rows: more connections than attacks, an unknown outcome, a kill of something that is not a source, a second death in one run', () => {
  const db = fresh(), pt = db.playthrough(null, 'normal', now()), run = db.beginRun({ pt, levelId: 'C1E1M01', difficulty: 'normal', startedAt: now(), fromSave: false });
  assert.throws(() => db.tallies(run, new Map([['flare', { fired: 2, connected: 3, targets: 3, damage: 1 }]])), /CHECK/);
  assert.throws(() => db.run("UPDATE level_runs SET outcome = 'won' WHERE run_id = :r", { ':r': run }), /CHECK/);
  assert.throws(() => db.addKill(run, 'enemy:dragon', 'flare', 1), /FOREIGN KEY/);
  assert.throws(() => db.beginRun({ pt: 999, levelId: 'C1E1M01', difficulty: 'normal', startedAt: now() }), /FOREIGN KEY/, 'a run of a playthrough that is not there');
  db.addDeath(run, 'enemy:gaunt', 1, 2, 3); assert.throws(() => db.addDeath(run, 'enemy:gaunt', 1, 2, 4), /UNIQUE/);
  assert.throws(() => db.endRun(run, new Map([['flare', { fired: 1, connected: 2, targets: 2, damage: 0 }]]), 10, 'complete'), /CHECK/);
  assert.equal(db.get('SELECT outcome FROM level_runs WHERE run_id = :r', { ':r': run }).outcome, null, 'the transaction rolled back: the run is not marked ended by half a write');
});

test('A REAL ROUTE, RECORDED: the stats agree with the game\'s own counts (kills, damage taken, shots), accuracy is never above 100%, and every hit names who did it', () => {
  const db = fresh(), rec = new StatsRecorder(db, { now }), pt = rec.newPlaythrough('normal');
  for (const id of ['C1E1M01', 'C1E2M04', 'C1E3M05']) {
    const { w, run, events } = play(rec, id, { pt });
    assert.equal(w.status, 'complete', id);
    const R = { ':r': run }, kills = db.get('SELECT COUNT(*) AS n FROM kills k JOIN sources s ON s.source_id = k.victim WHERE k.run_id = :r AND s.peaceful = 0', R).n;
    assert.equal(kills, w.stats.kills + events.filter((e) => e.type === 'enemy_revived').length, id + ': kills (a creature the Sexton raises and you kill again is two kills here; the level tally takes one back)');
    const hurt = db.get('SELECT COALESCE(SUM(amount), 0) AS d, COUNT(*) AS n FROM hits_taken WHERE run_id = :r', R);
    assert.ok(Math.abs(hurt.d - w.stats.damageTaken) <= 0.006 * hurt.n + 1e-9, `${id}: damage taken ${hurt.d} vs the world's ${w.stats.damageTaken}`);
    const fires = events.filter((e) => e.type === 'fire').length, guns = db.get(`SELECT COALESCE(SUM(attacks_fired), 0) AS n FROM weapon_use u WHERE run_id = :r AND weapon IN (${Object.keys(WEAPONS).filter((k) => WEAPONS[k].kind !== 'melee').map((k) => `'${k}'`).join(',')})`, R).n;
    assert.equal(guns, fires, id + ': every shot is one attack'); assert.equal(fires, w.stats.shots, id + ': and the world counted the same shots');
    const dealt = events.filter((e) => e.type === 'dmg' && e.weapon).reduce((a, e) => a + e.amount, 0), stored = db.get('SELECT COALESCE(SUM(damage), 0) AS d FROM weapon_use WHERE run_id = :r', R).d;
    assert.ok(Math.abs(stored - dealt) < 0.01 * 20, `${id}: damage dealt ${stored} vs the events' ${dealt}`);
    assert.equal(db.get("SELECT COUNT(*) AS n FROM hits_taken WHERE run_id = :r AND source = 'other:unknown'", R).n, 0, id + ': no hit from "something unseen"');
    const row = db.get('SELECT outcome, seconds FROM level_runs WHERE run_id = :r', R); assert.equal(row.outcome, 'complete'); assert.ok(Math.abs(row.seconds - w.time) < 0.01);
    const fired = new Map(); for (const e of events) if ((e.type === 'fire' || e.type === 'swing') && e.atk != null) fired.set(e.atk, e.weapon);
    const hits = new Map(); for (const e of events) if (e.type === 'dmg' && fired.has(e.atk)) { const g = fired.get(e.atk); hits.set(g, (hits.get(g) ?? new Set()).add(e.atk)); }
    for (const u of db.all('SELECT weapon, attacks_connected AS c FROM weapon_use WHERE run_id = :r', R)) assert.equal(u.c, hits.get(u.weapon)?.size ?? 0, `${id}: ${u.weapon} connected (a hitscan gun's hits come BEFORE its shot is announced, in the same tick)`);
    assert.ok([...hits.keys()].length > 0, id + ': something connected');
  }
  assert.equal(db.all('PRAGMA foreign_key_check').length, 0); assert.equal(db.get('PRAGMA integrity_check').integrity_check, 'ok');
  const m = rundown(db, pt); assert.equal(m.overview.finished, 3); assert.equal(m.overview.deaths, 0);
  for (const g of m.guns) assert.ok(g.accuracy == null || (g.accuracy >= 0 && g.accuracy <= 100), g.name);
  assert.deepEqual(rundown(db, null).overview, m.overview, 'one playthrough: lifetime and this playthrough agree');
});

test('A DEATH, RECORDED: the passive runner dies, the run says so, and the killer is whatever hurt it last', () => {
  const db = fresh(), rec = new StatsRecorder(db, { now }), pt = rec.newPlaythrough('hard');
  let dead = null;
  for (const id of ['C1E1M02', 'C1E1M03', 'C1E1M04', 'C1E1M05']) { const r = play(rec, id, { pt, fights: false, difficulty: 'hard' }); if (r.w.status === 'dead') { dead = r; break; } }
  assert.ok(dead, 'a passive runner on hard dies somewhere in Episode 1');
  const last = dead.events.filter((e) => e.type === 'hurt' && e.amount > 0).at(-1), d = db.get('SELECT * FROM deaths WHERE run_id = :r', { ':r': dead.run });
  assert.equal(d.killer, last.src); assert.ok(Math.abs(d.x - dead.w.player.x) < 0.01 && Math.abs(d.z - dead.w.player.z) < 0.01);
  const c = runCard(db, dead.run, pt); assert.equal(c.outcome, 'dead'); assert.equal(c.deaths, 1); assert.match(deathLine(c), /^Killed by .+ after \d+:\d\d\. Your first death on this level/);
  assert.equal(db.get("SELECT name FROM sources WHERE source_id = :s", { ':s': last.src }).name, c.killer);
});

test('THE RELOAD RULE: loading a save closes the attempt as "reloaded" and starts a new one from the save; nothing is replayed, so nothing is counted twice', () => {
  const db = fresh(), rec = new StatsRecorder(db, { now }), pt = rec.newPlaythrough('normal');
  const a = rec.startRun({ levelId: 'C1E1M01', difficulty: 'normal', pt, time: 0 });
  rec.events([{ type: 'fire', weapon: 'flare', atk: 1 }, { type: 'dmg', id: 7, kind: 'tollbearer', weapon: 'flare', atk: 1, amount: 30, killed: true }, { type: 'enemy_died', id: 7, kind: 'tollbearer', weapon: 'flare' }], { time: 5, player: { hp: 100, x: 0, z: 0 } });
  rec.endRun('reloaded', 12);
  const b = rec.startRun({ levelId: 'C1E1M01', difficulty: 'normal', pt, fromSave: true, time: 8 });
  rec.events([{ type: 'dmg', id: 7, kind: 'tollbearer', weapon: 'flare', atk: 1, amount: 4 }], { time: 9, player: { hp: 100 } });          // a flare fired before the load lands after it: damage, but no connection for an attack this run never made
  rec.endRun('complete', 20);
  const runs = db.all('SELECT run_id, outcome, from_save, seconds FROM level_runs ORDER BY run_id');
  assert.deepEqual(runs.map((r) => [r.outcome, r.from_save]), [['reloaded', 0], ['complete', 1]]); assert.equal(runs[1].seconds, 12, 'the second run counts from the save\'s clock');
  assert.equal(db.get('SELECT COUNT(*) AS n FROM kills').n, 1);
  const u = db.get('SELECT * FROM weapon_use WHERE run_id = :r', { ':r': b }); assert.equal(u.attacks_fired, 0); assert.equal(u.attacks_connected, 0); assert.equal(u.damage, 4);
  assert.equal(db.get('SELECT attacks_connected AS c, targets_hit AS t FROM weapon_use WHERE run_id = :r', { ':r': a }).c, 1);
  assert.equal(rundown(db, pt).overview.attempts, 2); assert.equal(rundown(db, pt).overview.finished, 1);
});

test('a pellet spread is one attack, one connection and as many creatures hit as it touched; an unknown level is not recorded', () => {
  const db = fresh(), rec = new StatsRecorder(db, { now });
  assert.equal(rec.startRun({ levelId: 'RANGE', difficulty: 'normal' }), null, 'the dev range is not a level of the stats');
  const run = rec.startRun({ levelId: 'C1E1M01', difficulty: 'normal' }), W = { time: 1, player: { hp: 50 } };
  rec.events([{ type: 'fire', weapon: 'scattergun', atk: 4 }, ...[1, 2, 2, 3].map((id) => ({ type: 'dmg', id, kind: 'gaunt', weapon: 'scattergun', atk: 4, amount: 6 })), { type: 'swing', weapon: 'fists', atk: 5 }, { type: 'hurt', amount: 3, src: 'enemy:nonesuch', hp: 47 }], W);
  rec.endRun('quit', 2);
  const u = db.get("SELECT * FROM weapon_use WHERE run_id = :r AND weapon = 'scattergun'", { ':r': run }); assert.deepEqual([u.attacks_fired, u.attacks_connected, u.targets_hit, u.damage], [1, 1, 3, 24]);
  assert.equal(db.get("SELECT attacks_connected AS c FROM weapon_use WHERE weapon = 'fists'").c, 0, 'a swing at the air');
  assert.equal(db.get('SELECT source FROM hits_taken').source, 'other:unknown', 'a source the database does not know is filed as unknown, never refused');
});

test('every source and weapon the ENGINE can name is in the reference tables (a new hazard or gun must be added to schema.js, or its hits would be filed as "something unseen")', () => {
  const ids = new Set(REF.sources.map((s) => s.id)), guns = new Set(REF.guns.map((g) => g.id));
  const found = new Set();
  for (const f of fs.readdirSync(path.join(ROOT, 'src/engine'))) { const t = fs.readFileSync(path.join(ROOT, 'src/engine', f), 'utf8'); for (const m of t.matchAll(/'((?:hazard|self|other):[a-z_]+)'/g)) found.add(m[1]); }
  assert.ok(found.size >= 9, [...found].join(', '));
  for (const s of found) assert.ok(ids.has(s), s + ' is named by the engine but is not a source');
  for (const k of Object.keys(ENEMIES)) assert.ok(ids.has('enemy:' + k), k);
  for (const k of [...Object.keys(WEAPONS), 'bash']) assert.ok(guns.has(k), k);
});

test('recording changes nothing: a route played with the recorder listening ends in the same world, bit for bit', () => {
  const a = play(null, 'C1E1M03'), rec = new StatsRecorder(fresh(), { now }), b = play(rec, 'C1E1M03');
  assert.equal(hashWorld(a.w), hashWorld(b.w)); assert.equal(a.w.tick, b.w.tick);
});

/** a stand-in for IndexedDB: `fail` makes the next writes throw, `bytes` is what is kept */
const fakeStore = (bytes = null) => ({ bytes, writes: 0, fail: false, async load() { if (this.loadFail) throw new Error('storage error'); return this.bytes; }, async save(b) { if (this.fail) throw new Error('quota exceeded'); this.writes++; this.bytes = new Uint8Array(b); } });

test('SAVING is two steps: the bytes are written and only then is it "saved"; a failed write keeps the last good copy; saves asked for during a save come after it, with the newest data', async () => {
  const store = fakeStore(), S = await StatsService.open({ SQL, store, ref: REF, now });
  const pt = S.newPlaythrough('normal'); S.startRun({ levelId: 'C1E1M01', difficulty: 'normal', pt }); S.events([{ type: 'enemy_died', kind: 'gaunt', weapon: 'flare' }], { time: 3, player: { hp: 90 } });
  assert.match(S.status, /Not saved yet/);
  assert.equal(await S.save(), true); assert.equal(store.writes, 1); assert.match(S.status, /^Saved on this device at \d\d:\d\d\.$/);
  const good = store.bytes; store.fail = true;
  S.endRun('complete', { time: 9, player: { x: 0, z: 0, hp: 90 } });
  assert.equal(await S.save(), false); assert.match(S.status, /NOT saved \(quota exceeded\)\. The last saved copy is kept/); assert.equal(store.bytes, good);
  store.fail = false; const p1 = S.save(), p2 = S.save(); assert.equal(p1, p2, 'one save at a time'); assert.equal(await p1, true); assert.equal(store.writes, 3, 'the second ask waits for the running write, then one more write carries the newest data');
  const back = await StatsService.open({ SQL, store, ref: REF, now }); const m = back.rundown(pt);
  assert.equal(m.overview.kills, 1); assert.equal(m.overview.finished, 1, 'the saved file opens with everything in it');
  assert.equal(back.db.get('PRAGMA foreign_keys').foreign_keys, 1, 'foreign keys are back on after opening (and after every export)');
});

test('a saved file that cannot be read or is from a NEWER game is never overwritten: that session keeps its stats in memory only', async () => {
  const newer = new SQL.Database(); newer.run('PRAGMA user_version = 99'); const bytes = newer.export(); newer.close();
  for (const store of [fakeStore(bytes), Object.assign(fakeStore(new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20])), {}), Object.assign(fakeStore(), { loadFail: true })]) {
    const before = store.bytes, S = await StatsService.open({ SQL, store, ref: REF, now });
    assert.match(S.status, /memory only; the saved file is left alone/); assert.equal(S.store, null);
    S.newPlaythrough('easy'); assert.equal(await S.save(), false); assert.equal(store.writes, 0); assert.equal(store.bytes, before);
  }
});

test('IMPORT: a real stats file replaces the stats; a damaged one, an empty SQLite file or random bytes are refused and nothing changes; not while a level is in hand', async () => {
  const src = await StatsService.open({ SQL, store: fakeStore(), ref: REF, now }); const pt = src.newPlaythrough('hard'); src.startRun({ levelId: 'C1E1M02', difficulty: 'hard', pt }); src.endRun('complete', { time: 50, player: {} });
  const file = src.exportBytes();
  const S = await StatsService.open({ SQL, store: fakeStore(), ref: REF, now }); S.newPlaythrough('easy');
  const empty = new SQL.Database(); const emptyBytes = empty.export(); empty.close();
  const broken = new StatsDB(SQL); broken.db.run('PRAGMA foreign_keys = OFF'); broken.db.run("INSERT INTO level_runs (playthrough_id, level_id, difficulty, started_at) VALUES (5, 'NOPE', 'easy', 'x')"); const brokenBytes = broken.db.export();
  for (const [bad, why] of [[new Uint8Array(64).fill(7), /not a Hushfall stats file|not a database|file is/], [emptyBytes, /not a Hushfall stats file/], [brokenBytes, /breaks its own rules/]]) {
    const r = await S.importBytes(bad); assert.equal(r.ok, false); assert.match(r.reason, why); assert.equal(S.rundown(null).overview.playthroughs, 0, 'unchanged');
  }
  S.startRun({ levelId: 'C1E1M01', difficulty: 'easy' }); assert.match((await S.importBytes(file)).reason, /finish or quit the level first/); S.endRun('quit', { time: 1, player: {} });
  const r = await S.importBytes(file); assert.equal(r.ok, true); assert.equal(r.runs, 1); assert.equal(S.rundown(null).overview.finished, 1); assert.equal(S.rundown(pt).overview.attempts, 1);
});

test('THE PAGES show every table the recorder fills (weapons, hurt, deaths, kills, records, chapters), with the story, and escape every name', () => {
  const db = fresh(), rec = new StatsRecorder(db, { now }), pt = rec.newPlaythrough('normal');
  play(rec, 'C1E1M01', { pt }); play(rec, 'C1E1M03', { pt });
  rec.startRun({ levelId: 'C1E1M04', difficulty: 'normal', pt }); rec.events([{ type: 'hurt', amount: 12.5, src: 'enemy:gaunt', hp: 0 }], { time: 4, player: { hp: 0 } }); rec.endRun('dead', 4, { player: { x: 10, z: 20 } });
  db.run("UPDATE weapons SET name = 'Flare <b>cannon</b>' WHERE weapon = 'flare'");
  const m = rundown(db, pt), lines = story(m), html = statsHtml(m, lines, { where: () => 'near the start' });
  for (const id of ['guns', 'hurt', 'deaths', 'kills', 'records', 'chapters']) assert.ok(html.includes(`id="st-${id}"`), id);
  for (const k of ['Levels finished', 'Attempts', 'Time played', 'Deaths', 'Kills', 'Damage taken']) assert.ok(html.includes(k), k);
  assert.ok(html.includes('Flare &lt;b&gt;cannon&lt;/b&gt;') && !html.includes('<b>cannon'), 'names are escaped');
  assert.ok(html.includes('Killed by') && html.includes('near the start') && html.includes('Gaunt Runner'), 'the death: who and where');
  assert.equal(m.overview.deaths, 1); assert.equal(m.overview.finished, 2); assert.equal(m.records.streak, 2);
  assert.match(lines[0], /^You finished 2 levels in 3 attempts, and died once\.$/); assert.ok(lines.some((l) => /hurt you more than anything else/.test(l)));
  assert.ok(lines.every((l) => !/undefined|NaN|null/.test(l)), lines.join(' | '));
  const withMap = statsHtml(m, lines, { where: () => 'near the start', mapOf: (id) => MAPS[id] });          // PT-080: the death map: a plan of the level with a dot where you fell
  assert.ok(withMap.includes('Where you fell') && withMap.includes('<svg class="st-map"') && /<circle cx="5\.00" cy="10\.00"/.test(withMap), 'the death at (10, 20) m is a dot at cell (5, 10)');
  assert.ok(!html.includes('<svg'), 'with no maps given, no plan');
  const card = runCardHtml(runCard(db, 1, pt)); assert.match(card, /THIS LEVEL, FROM YOUR STATS/); assert.match(card, /Attempts at this level/);
  assert.match(statsHtml(rundown(fresh(), null), [], { lifetime: true }), /Nothing recorded yet/);
});
