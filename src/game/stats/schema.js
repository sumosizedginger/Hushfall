// THE STATS DATABASE, its blueprint (PT-077; design/STATS_DATABASE.md is the plan, written for someone learning SQL). Pure: SQL text and plain rows, no DOM, no sql.js.
// A database file knows its blueprint's version (`PRAGMA user_version`); MIGRATIONS[n] upgrades a file from version n - 1 to n inside one transaction, so a player's old stats survive a newer game.

export const SCHEMA_VERSION = 1;

/** what each version adds; index n is the step from n - 1 to n */
export const MIGRATIONS = {
  1: `
CREATE TABLE levels (
  level_id    TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  campaign    INTEGER NOT NULL CHECK (campaign IN (1, 2)),
  episode     INTEGER,
  kind        TEXT NOT NULL CHECK (kind IN ('main', 'secret')),
  par_seconds INTEGER CHECK (par_seconds > 0)
);
CREATE TABLE weapons (
  weapon TEXT PRIMARY KEY,
  name   TEXT NOT NULL
);
CREATE TABLE sources (
  source_id TEXT PRIMARY KEY,
  type      TEXT NOT NULL CHECK (type IN ('creature', 'environment', 'self', 'unknown')),
  name      TEXT NOT NULL,
  is_boss   INTEGER NOT NULL DEFAULT 0 CHECK (is_boss IN (0, 1)),
  peaceful  INTEGER NOT NULL DEFAULT 0 CHECK (peaceful IN (0, 1))
);
CREATE TABLE playthroughs (
  playthrough_id INTEGER PRIMARY KEY,
  started_at     TEXT NOT NULL,
  difficulty     TEXT NOT NULL CHECK (difficulty IN ('easy', 'normal', 'hard'))
);
CREATE TABLE level_runs (
  run_id         INTEGER PRIMARY KEY,
  playthrough_id INTEGER REFERENCES playthroughs(playthrough_id),
  level_id       TEXT NOT NULL REFERENCES levels(level_id),
  difficulty     TEXT NOT NULL CHECK (difficulty IN ('easy', 'normal', 'hard')),
  started_at     TEXT NOT NULL,
  from_save      INTEGER NOT NULL DEFAULT 0 CHECK (from_save IN (0, 1)),
  seconds        REAL CHECK (seconds >= 0),
  outcome        TEXT CHECK (outcome IN ('complete', 'dead', 'quit', 'restart', 'reloaded'))
);
CREATE TABLE weapon_use (
  run_id            INTEGER NOT NULL REFERENCES level_runs(run_id),
  weapon            TEXT    NOT NULL REFERENCES weapons(weapon),
  attacks_fired     INTEGER NOT NULL DEFAULT 0 CHECK (attacks_fired >= 0),
  attacks_connected INTEGER NOT NULL DEFAULT 0 CHECK (attacks_connected BETWEEN 0 AND attacks_fired),
  targets_hit       INTEGER NOT NULL DEFAULT 0 CHECK (targets_hit >= attacks_connected),
  damage            REAL    NOT NULL DEFAULT 0 CHECK (damage >= 0),
  PRIMARY KEY (run_id, weapon)
);
CREATE TABLE kills (
  kill_id   INTEGER PRIMARY KEY,
  run_id    INTEGER NOT NULL REFERENCES level_runs(run_id),
  victim    TEXT    NOT NULL REFERENCES sources(source_id),
  weapon    TEXT    REFERENCES weapons(weapon),
  at_second REAL    NOT NULL CHECK (at_second >= 0)
);
CREATE TABLE hits_taken (
  hit_id    INTEGER PRIMARY KEY,
  run_id    INTEGER NOT NULL REFERENCES level_runs(run_id),
  source    TEXT    NOT NULL REFERENCES sources(source_id),
  amount    REAL    NOT NULL CHECK (amount > 0),
  hp_after  INTEGER NOT NULL CHECK (hp_after >= 0),
  at_second REAL    NOT NULL CHECK (at_second >= 0)
);
CREATE TABLE deaths (
  death_id  INTEGER PRIMARY KEY,
  run_id    INTEGER NOT NULL UNIQUE REFERENCES level_runs(run_id),
  killer    TEXT    NOT NULL REFERENCES sources(source_id),
  x         REAL    NOT NULL,
  z         REAL    NOT NULL,
  at_second REAL    NOT NULL CHECK (at_second >= 0)
);
CREATE INDEX runs_by_playthrough ON level_runs(playthrough_id);
CREATE INDEX runs_by_level       ON level_runs(level_id);
CREATE INDEX kills_by_run        ON kills(run_id);
CREATE INDEX hits_by_run         ON hits_taken(run_id);
CREATE VIEW kills_by_weapon AS
  SELECT r.playthrough_id, k.weapon, COUNT(*) AS kills
  FROM kills k JOIN level_runs r ON r.run_id = k.run_id
  GROUP BY r.playthrough_id, k.weapon;
`,
};

/** what can hurt you besides a creature (the engine's `hurt` event names these: world.js `hurtPlayer`) */
export const HAZARDS = [
  ['hazard:toxic', 'environment', 'Toxic residue'],
  ['hazard:embers', 'environment', 'An ember bed'],
  ['hazard:spores', 'environment', 'A spore bed in bloom'],
  ['hazard:fall', 'environment', 'A fall into the void'],
  ['hazard:vacuum', 'environment', 'Vacuum'],
  ['hazard:load', 'environment', 'A falling container'],
  ['hazard:resonator', 'environment', 'A ringing fork'],
  ['hazard:floor', 'environment', 'A floor that hurts'],
  ['self:own_blast', 'self', 'Your own blast'],
  ['other:unknown', 'unknown', 'Something unseen'],
];

/** the reference rows from the game's own data: every level of the manifest, every weapon (and the quick bash), every creature and hazard */
/** Campaign Two has acts, not episodes (the manifest: A 1-8, B 9-16, C 17-24, D 25-30; the two secrets belong to Acts B and C); they go in the same column, 1 to 4 */
export const actOf = (m) => (m.campaign !== 2 ? null : m.id === 'C2S01' ? 2 : m.id === 'C2S02' ? 3 : m.order <= 8 ? 1 : m.order <= 16 ? 2 : m.order <= 24 ? 3 : 4);
export function referenceRows({ manifest, maps, weapons, enemies }) {
  const levels = manifest.maps.filter((m) => maps[m.id]).map((m) => ({ id: m.id, name: maps[m.id].name ?? m.name ?? m.id, campaign: m.campaign, episode: m.episode ?? actOf(m), kind: m.kind === 'secret' ? 'secret' : 'main', par: maps[m.id].par?.time > 0 ? Math.round(maps[m.id].par.time) : null }));
  const guns = [...Object.entries(weapons).map(([id, d]) => ({ id, name: d.name ?? id })), { id: 'bash', name: 'Quick bash' }];
  const sources = [...Object.entries(enemies).map(([k, d]) => ({ id: 'enemy:' + k, type: 'creature', name: d.name ?? k, boss: d.boss ? 1 : 0, peaceful: d.peaceful ? 1 : 0 })), ...HAZARDS.map(([id, type, name]) => ({ id, type, name, boss: 0, peaceful: 0 }))];
  return { levels, guns, sources };
}
