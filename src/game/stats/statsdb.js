// THE STATS DATABASE (PT-077): a thin wrapper round one SQLite database run by sql.js (in the browser and in node tests alike). It knows the blueprint (schema.js), keeps the integrity rules on, wraps the
// writes that belong together in a transaction, and exports the database as bytes for saving. No DOM. Every query that the screens show lives in report.js.
import { SCHEMA_VERSION, MIGRATIONS } from './schema.js';

export class StatsDB {
  /** `SQL` is the sql.js module (initSqlJs's result); `bytes` an exported database to open, or nothing for a new one. Throws if the bytes are not a database this game can use. */
  constructor(SQL, bytes = null) {
    this.SQL = SQL; this.db = bytes ? new SQL.Database(bytes) : new SQL.Database();
    try { this.pragmas(); this.migrate(); } catch (e) { this.db.close(); throw e; }
  }
  /** SQLite does not enforce foreign keys unless asked, on every connection; sql.js's export() closes and reopens the database, which resets it, so this runs again after each export */
  pragmas() { this.db.run('PRAGMA foreign_keys = ON'); }
  version() { return Number(this.get('PRAGMA user_version')?.user_version ?? 0); }
  /** bring an older file up to SCHEMA_VERSION, one step at a time, each inside a transaction; a file from a NEWER game is refused (it is left as it was) */
  migrate() {
    const v = this.version();
    if (v > SCHEMA_VERSION) throw new Error(`these stats were made by a newer version of the game (blueprint ${v}, this game knows ${SCHEMA_VERSION})`);
    for (let n = v + 1; n <= SCHEMA_VERSION; n++) this.tx(() => { this.db.exec(MIGRATIONS[n]); this.db.exec(`PRAGMA user_version = ${n}`); });
  }
  /** a bundle of writes that all happen or none do */
  tx(fn) {
    this.db.exec('BEGIN');
    try { const r = fn(); this.db.exec('COMMIT'); return r; } catch (e) { try { this.db.exec('ROLLBACK'); } catch { /* the error that matters is e */ } throw e; }
  }
  run(sql, params = {}) { this.db.run(sql, params); }
  all(sql, params = {}) {
    const st = this.db.prepare(sql), out = [];
    try { st.bind(params); while (st.step()) out.push(st.getAsObject()); } finally { st.free(); }
    return out;
  }
  get(sql, params = {}) { return this.all(sql, params)[0] ?? null; }
  lastId() { return Number(this.get('SELECT last_insert_rowid() AS id').id); }

  /** the reference tables from the game's own data (schema.js referenceRows): inserted, or brought up to date, every time the game starts ("upsert": ON CONFLICT ... DO UPDATE) */
  reference({ levels, guns, sources }) {
    this.tx(() => {
      for (const l of levels) this.run(`INSERT INTO levels (level_id, name, campaign, episode, kind, par_seconds) VALUES (:id, :name, :campaign, :episode, :kind, :par)
        ON CONFLICT(level_id) DO UPDATE SET name = excluded.name, campaign = excluded.campaign, episode = excluded.episode, kind = excluded.kind, par_seconds = excluded.par_seconds`,
      { ':id': l.id, ':name': l.name, ':campaign': l.campaign, ':episode': l.episode, ':kind': l.kind, ':par': l.par });
      for (const g of guns) this.run('INSERT INTO weapons (weapon, name) VALUES (:id, :name) ON CONFLICT(weapon) DO UPDATE SET name = excluded.name', { ':id': g.id, ':name': g.name });
      for (const s of sources) this.run(`INSERT INTO sources (source_id, type, name, is_boss, peaceful) VALUES (:id, :type, :name, :boss, :peaceful)
        ON CONFLICT(source_id) DO UPDATE SET type = excluded.type, name = excluded.name, is_boss = excluded.is_boss, peaceful = excluded.peaceful`,
      { ':id': s.id, ':type': s.type, ':name': s.name, ':boss': s.boss, ':peaceful': s.peaceful });
    });
  }
  has(table, key, value) { return !!this.get(`SELECT 1 AS x FROM ${table} WHERE ${key} = :v`, { ':v': value }); }

  /** the playthrough a save names (`id`): kept if it is in this database, written in under the same number if it is not (the browser's storage was cleared, but the save survived); a new one when there is no id */
  playthrough(id, difficulty, startedAt) {
    if (id != null && this.has('playthroughs', 'playthrough_id', id)) return id;
    if (id != null) { this.run('INSERT INTO playthroughs (playthrough_id, started_at, difficulty) VALUES (:id, :at, :d)', { ':id': id, ':at': startedAt, ':d': difficulty }); return id; }
    this.run('INSERT INTO playthroughs (started_at, difficulty) VALUES (:at, :d)', { ':at': startedAt, ':d': difficulty }); return this.lastId();
  }
  beginRun({ pt, levelId, difficulty, startedAt, fromSave }) {
    this.run('INSERT INTO level_runs (playthrough_id, level_id, difficulty, started_at, from_save) VALUES (:pt, :level, :d, :at, :fs)', { ':pt': pt ?? null, ':level': levelId, ':d': difficulty, ':at': startedAt, ':fs': fromSave ? 1 : 0 });
    return this.lastId();
  }
  addKill(run, victim, weapon, at) { this.run('INSERT INTO kills (run_id, victim, weapon, at_second) VALUES (:r, :v, :w, :t)', { ':r': run, ':v': victim, ':w': weapon, ':t': at }); }
  addHit(run, source, amount, hpAfter, at) { this.run('INSERT INTO hits_taken (run_id, source, amount, hp_after, at_second) VALUES (:r, :s, :a, :h, :t)', { ':r': run, ':s': source, ':a': amount, ':h': hpAfter, ':t': at }); }
  addDeath(run, killer, x, z, at) { this.run('INSERT INTO deaths (run_id, killer, x, z, at_second) VALUES (:r, :k, :x, :z, :t)', { ':r': run, ':k': killer, ':x': x, ':z': z, ':t': at }); }
  /** the gun tallies of a run, written as they stand (an "upsert": the row is created the first time and replaced after) */
  tallies(run, map) {
    for (const [weapon, t] of map) this.run(`INSERT INTO weapon_use (run_id, weapon, attacks_fired, attacks_connected, targets_hit, damage) VALUES (:r, :w, :f, :c, :t, :d)
      ON CONFLICT(run_id, weapon) DO UPDATE SET attacks_fired = excluded.attacks_fired, attacks_connected = excluded.attacks_connected, targets_hit = excluded.targets_hit, damage = excluded.damage`,
    { ':r': run, ':w': weapon, ':f': t.fired, ':c': t.connected, ':t': t.targets, ':d': Math.round(t.damage * 100) / 100 });
  }
  /** the end of an attempt: its last tallies, the death that ended it (if one did), its length and how it ended, as ONE transaction */
  endRun(run, tallies, seconds, outcome, death = null) {
    this.tx(() => {
      this.tallies(run, tallies);
      if (death) this.addDeath(run, death.killer, death.x, death.z, death.at);
      this.run('UPDATE level_runs SET seconds = :s, outcome = :o WHERE run_id = :r', { ':s': Math.max(0, seconds), ':o': outcome, ':r': run });
    });
  }
  /** the whole database as bytes (to save or to download); the pragmas come back on afterwards */
  export() { const bytes = this.db.export(); this.pragmas(); return bytes; }
  close() { this.db.close(); }

  /** is this file a stats database this game can open? (for Import): it opens a COPY, so a bad file never touches the stats in use */
  static check(SQL, bytes) {
    let t = null;
    try {
      { const raw = new SQL.Database(bytes); let v = 0; try { v = Number(raw.exec('PRAGMA user_version')[0]?.values?.[0]?.[0] ?? 0); } finally { raw.close(); } if (!(v >= 1)) return { ok: false, reason: 'this is not a Hushfall stats file' }; }          // (an empty or foreign SQLite file has blueprint 0: it would be "upgraded" into an empty stats file, which is not what Import means)
      t = new StatsDB(SQL, bytes);
      const ok = t.get('PRAGMA integrity_check')?.integrity_check === 'ok', fk = t.all('PRAGMA foreign_key_check').length === 0;
      if (!ok) return { ok: false, reason: 'the file is damaged (integrity check failed)' };
      if (!fk) return { ok: false, reason: 'the file breaks its own rules (a row points at something that is not there)' };
      return { ok: true, runs: Number(t.get('SELECT COUNT(*) AS n FROM level_runs').n) };
    } catch (e) { return { ok: false, reason: String(e.message ?? e).replace(/^Error: /, '').slice(0, 140) }; } finally { t?.close(); }
  }
}
