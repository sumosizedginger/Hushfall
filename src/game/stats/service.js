// THE STATS SERVICE (PT-077): what the game shell holds. The database (statsdb.js), the recorder (recorder.js), the place the database is kept between sessions (`store`: IndexedDB in the browser, a
// stand-in in tests) and a line of plain words saying whether the stats are saved. No DOM; the browser's loading of sql.js and IndexedDB is boot.js.
// SAVING (design/STATS_DATABASE.md 3.8) is two steps that must both succeed: the database is exported as bytes, then the bytes are written to the store; only when the store says the write is complete are
// the stats called saved. A failed write leaves the last saved copy as it was. If the saved stats cannot be READ at start (a damaged file, one from a newer game, a storage error), this session keeps its
// stats in memory only and NEVER writes over the saved file.
import { StatsDB } from './statsdb.js';
import { StatsRecorder } from './recorder.js';
import { rundown, runCard, story } from './report.js';

const why = (e) => String(e?.message ?? e).replace(/^Error: /, '').slice(0, 120);
const clock = (d) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

export class StatsService {
  /** open the stats: the saved database if there is one, else a new one; `ref` = schema.js referenceRows(...) */
  static async open({ SQL, store = null, ref, now }) {
    let bytes = null, note = '', writable = !!store;
    if (store) { try { bytes = await store.load(); } catch (e) { writable = false; note = `The saved stats could not be read (${why(e)}). This session keeps its stats in memory only; the saved file is left alone.`; } }
    let db = null;
    if (bytes) { try { db = new StatsDB(SQL, bytes); } catch (e) { writable = false; note = `The saved stats could not be opened (${why(e)}). This session keeps its stats in memory only; the saved file is left alone.`; } }
    db ??= new StatsDB(SQL);
    db.reference(ref);
    return new StatsService({ SQL, db, store: writable ? store : null, ref, note, now });
  }
  constructor({ SQL, db, store, ref, note = '', now }) {
    this.SQL = SQL; this.db = db; this.store = store; this.ref = ref; this.now = now;
    this.rec = new StatsRecorder(db, now ? { now } : {});
    this.status = note || (store ? 'Kept on this device. Not saved yet this session.' : 'Kept in memory only: this browser offers no storage for them.');
    this.saving = null; this.pending = false; this.saved = false; this.persistAsked = false;
  }
  // ---- what the shell calls while you play
  newPlaythrough(difficulty) { return this.rec.newPlaythrough(difficulty); }
  ensurePlaythrough(id, difficulty) { return this.rec.ensurePlaythrough(id, difficulty); }
  startRun(o) { return this.rec.startRun(o); }
  events(list, world) { this.rec.events(list, world); }
  endRun(outcome, world) { return world ? this.rec.endRun(outcome, world.time, world) : false; }
  get runId() { return this.rec.runId; }
  // ---- saving
  /** export and write; resolves true when the write is complete (a save asked for while one is running is done after it, with the newest bytes) */
  save() {
    if (!this.store) return Promise.resolve(false);
    if (this.saving) { this.pending = true; return this.saving; }
    this.saving = (async () => {
      let ok = false;
      try {
        do { this.pending = false; this.rec.flush(); const bytes = this.db.export(); await this.store.save(bytes); ok = true; } while (this.pending);
        this.saved = true; this.status = `Saved on this device at ${clock(new Date())}.`;
        if (!this.persistAsked && this.store.persist) { this.persistAsked = true; this.store.persist().catch(() => {}); }          // ask the browser to keep the storage for good (it may decline: Export keeps a copy anyway)
      } catch (e) { ok = false; this.status = `The newest stats were NOT saved (${why(e)}). The last saved copy is kept.`; }
      this.saving = null; return ok;
    })();
    return this.saving;
  }
  // ---- what the screens ask
  rundown(scope) { this.rec.flush(); return rundown(this.db, scope); }
  story(m) { return story(m); }
  runCard(runId, scope) { return runId == null ? null : runCard(this.db, runId, scope); }
  // ---- the file
  exportBytes() { this.rec.flush(); return this.db.export(); }
  /** replace the stats with a file the player chose (only with no level in hand: the title screen); a file this game cannot use is refused and the stats in use are not touched */
  async importBytes(bytes) {
    if (this.rec.runId != null) return { ok: false, reason: 'finish or quit the level first' };
    const c = StatsDB.check(this.SQL, bytes); if (!c.ok) return c;
    const db = new StatsDB(this.SQL, bytes); db.reference(this.ref);
    this.db.close(); this.db = db; this.rec = new StatsRecorder(db, this.now ? { now: this.now } : {});
    const saved = await this.save();
    return { ok: true, runs: c.runs, saved };
  }
}
