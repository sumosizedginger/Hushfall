// THE STATS RECORDER (PT-077): it LISTENS to the simulation's events and writes rows into the stats database; it never touches the world (a stats error can never change a fight).
// One attempt at a level is a "run". Kills, hits taken and a death are written as they happen; the gun tallies (attacks fired, attacks that connected, creatures hit, damage) are counted in memory
// and written at the end of the run, or whenever the database is about to be saved (flush). The rule for loading a save (design/STATS_DATABASE.md 3.7): what happened after the save still happened,
// so the run in progress is closed as 'reloaded' and a new run starts from the save; nothing is replayed by a load, so nothing is counted twice.
//
// Accuracy (STATS_DATABASE.md 3.2): every shot and swing has a number (`atk`, world.js); an attack CONNECTS when any creature takes damage from it (a flare that lands later carries its number);
// creatures hit counts each creature once per attack. A gun with no numbered attacks (the chainsaw's cut, the fork's throws) has damage and kills but no accuracy.

export class StatsRecorder {
  /** `db` is a StatsDB; `now()` gives the time as text (ISO) for started_at */
  constructor(db, { now = () => new Date().toISOString() } = {}) {
    this.db = db; this.now = now; this.run = null; this.refresh();
  }
  /** the ids the database knows (an event that names anything else is filed under 'other:unknown', or its gun left empty) */
  refresh() {
    this.sources = new Set(this.db.all('SELECT source_id FROM sources').map((r) => r.source_id));
    this.weapons = new Set(this.db.all('SELECT weapon FROM weapons').map((r) => r.weapon));
    this.levels = new Set(this.db.all('SELECT level_id FROM levels').map((r) => r.level_id));
  }
  /** a New Game: a new playthrough, returned by number (it goes into the run's progress, and so into every save) */
  newPlaythrough(difficulty) { return this.db.playthrough(null, difficulty, this.now()); }
  /** the playthrough a save names, written back in if this database has lost it; null stays null */
  ensurePlaythrough(id, difficulty) { return id == null ? null : this.db.playthrough(id, difficulty, this.now()); }

  /** a level begins (fresh, restarted, or loaded from a save). A level this database does not know (the dev range, a dev map) is not recorded. Returns the run's id, or null. */
  startRun({ levelId, difficulty, pt = null, fromSave = false, time = 0 }) {
    if (this.run) this.endRun('quit', time);                                                   // (the shell closes a run with its real reason before this; this only guards against a run left open)
    if (!this.levels.has(levelId)) return null;
    const id = this.db.beginRun({ pt, levelId, difficulty, startedAt: this.now(), fromSave });
    this.run = { id, levelId, pt, t0: time, tallies: new Map(), atkWeapon: new Map(), connected: new Set(), targets: new Set(), lastSrc: null, died: false };
    return id;
  }
  tally(weapon) { let t = this.run.tallies.get(weapon); if (!t) this.run.tallies.set(weapon, (t = { fired: 0, connected: 0, targets: 0, damage: 0 })); return t; }
  /** seconds into the run */
  at(time) { return Math.max(0, Math.round((time - this.run.t0) * 100) / 100); }
  src(id) { return this.sources.has(id) ? id : 'other:unknown'; }
  gun(id) { return id != null && this.weapons.has(id) ? id : null; }

  /** the events of one tick (drained by the shell) and the world they came from */
  events(list, world) {
    const R = this.run; if (!R || !list.length) return;
    for (const e of list) {                                                                         // the attacks of the tick first: a hitscan gun (the scattergun, the rivet driver) lands its hits BEFORE the engine announces the shot, in the same tick
      if (e.type !== 'fire' && e.type !== 'swing') continue;
      const g = this.gun(e.weapon); if (!g) continue;
      this.tally(g).fired++; if (e.atk != null) R.atkWeapon.set(e.atk, g);
    }
    for (const e of list) {
      if (e.type === 'dmg') {
        const g = this.gun(e.weapon); if (g) this.tally(g).damage += Math.max(0, e.amount || 0);
        const ag = e.atk != null ? R.atkWeapon.get(e.atk) : null;                               // an attack made in THIS run (a flare fired before a reload is not)
        if (ag) {
          if (!R.connected.has(e.atk)) { R.connected.add(e.atk); this.tally(ag).connected++; }
          const key = e.atk + ':' + e.id; if (!R.targets.has(key)) { R.targets.add(key); this.tally(ag).targets++; }
        }
      } else if (e.type === 'enemy_died') {
        const victim = 'enemy:' + e.kind; if (!this.sources.has(victim)) continue;
        this.db.addKill(R.id, victim, this.gun(e.weapon), this.at(world.time));
      } else if (e.type === 'hurt') {
        const amount = Math.round((e.amount || 0) * 100) / 100; if (!(amount > 0)) continue;          // (Hard multiplies damage: a hit can be 8.75)
        const s = this.src(e.src); R.lastSrc = s;
        this.db.addHit(R.id, s, amount, Math.max(0, Math.round(e.hp ?? world.player.hp)), this.at(world.time));
      }
    }
  }
  /** write the gun tallies as they stand (before a save, or before a screen asks the database) */
  flush() { if (this.run) this.db.tallies(this.run.id, this.run.tallies); }
  /** the run ends: 'complete' | 'dead' | 'quit' | 'restart' | 'reloaded'. A death also writes who did it and where. Returns true if a run was closed. */
  endRun(outcome, time, world = null) {
    const R = this.run; if (!R) return false;
    this.run = null;
    const at = Math.max(0, Math.round((time - R.t0) * 100) / 100);
    const death = outcome === 'dead' && world ? { killer: R.lastSrc ?? 'other:unknown', x: Math.round(world.player.x * 100) / 100, z: Math.round(world.player.z * 100) / 100, at } : null;
    this.db.endRun(R.id, R.tallies, at, outcome, death);
    return true;
  }
  get runId() { return this.run?.id ?? null; }
}
