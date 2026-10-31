# Your Run, in Numbers: a stats database for Hushfall

A plan, written for someone learning SQL. **BUILT on 2026-10-31 (PT-077): section 0 says what was built and where it differs from the plan.**
- Version 1 (2026-10-31): the first plan.
- **Version 2 (2026-10-31): revised after an outside review** (the owner's SQL tutor read version 1 against the GitHub copy of the game). Section 9 lists what the review changed and the one place this plan answers it differently. Every query in this file was run against a small sample database in Node's built-in SQLite before it was written here.

## 0. AS BUILT (PT-077, 2026-10-31)

All three milestones are built: the recording (STATS-001), the screens (STATS-002) and the export, import, records and story (STATS-003). Nobody has played it yet.

**Where it lives** (`src/game/stats/`, all plain JavaScript, no game code inside):

| File | What it does |
|--|--|
| `schema.js` | the blueprint as SQL (`MIGRATIONS[1]`), the list of hazards, and the reference rows built from the game's own data (every level, weapon, creature and hazard) |
| `statsdb.js` | a thin wrapper round one sql.js database: foreign keys on, migrations, transactions, the writes, export, and `check()` for Import |
| `recorder.js` | listens to the simulation's events and writes rows (it never touches the game) |
| `report.js` | every question the screens ask, as SQL (`Q`), and the story built from the answers |
| `service.js` | what the game holds: the database, the recorder, saving (two steps), Export and Import |
| `boot.js` | the browser half: loads sql.js and its WebAssembly file, and the IndexedDB store |
| `page.js` | the answers as the stats screen, the card after a level and the line on the death screen |

The game shell (`src/game/main.js`) tells the recorder when a level starts, hands it every tick's events, and ends the attempt on a finish, a death, a restart, a load, a quit or a closed tab. The engine changes are the ones section 7 asked for (a source on every hurt, attack numbers, a `dmg` event); 132 recorded route runs played identically before and after them.

**Where the screens are:** the title and the pause menu have **Your stats** (two tabs: This playthrough, Lifetime; Export and, on the title, Import). The level-end screen has **This level, from your stats**. The death screen says who killed you, after how long, and which death on that level it was. The end of a campaign tells your playthrough as a short story.

**Where it differs from version 2 of the plan, and why:**
1. `weapon_use.damage` was added (a column) so the weapons table can show damage per gun. `hits_taken.amount` is REAL, not INTEGER: Hard multiplies damage, so a hit can be 8.75.
2. `sources` has a `peaceful` column (the Vael civilians: killing one is counted as harming an innocent, never as a kill) and a fourth type, `unknown`, with one row `other:unknown` ("Something unseen"). A test reads the engine's code for every source name it can use and fails if one is missing from this table, so nothing lands there by accident.
3. A creature the Sexton raises and you kill again is TWO kills in the stats (you did kill it twice); the level's own tally takes one back. The screen says so.
4. The chainsaw's cut and the tuning-fork's throws are not counted as attacks (they are not one shot or one swing); their damage and kills are.
5. Gun tallies are written on every save as well as at the end of an attempt (this answers question 3 of section 10). The stats are saved when an attempt ends, when you pause, on a quick save, every two minutes of play, and when the tab closes.
6. If the saved stats cannot be read at start (damaged, or made by a newer version), that session keeps its stats in memory only and never writes over the file.
7. Import REPLACES the stats (it does not merge), only from the title, and refuses a file that fails `integrity_check` or `foreign_key_check`, an empty SQLite file, or anything that is not a Hushfall stats file.
8. "Where you died" is shown in words ("35 m north-east of the start"), not as a drawn map.
9. The level picker of the developer build starts a new playthrough each time; the dev ranges are not recorded.

**How it was checked:** `tests/stats.test.js` (12 tests: the rules refuse bad rows; three real levels played by the bot agree with the game's own kills, damage taken and shots; a death names its killer; the reload rule; a pellet spread is one attack; every engine source is known; recording changes nothing in the game; saving keeps the last good copy; a newer or damaged file is never overwritten; Import refuses junk; the pages show every table). `tools/dev/probe-stats.mjs` does the same in a real browser page (sql.js's WebAssembly and IndexedDB, including a reload). The licence test now expects sql.js (MIT) as the second thing that ships, and its notice is in Credits and licences.

## 1. What we are making

While you play, the game quietly writes down what happens: every kill, every hit you take, every death and where it happened, how often each gun fired and connected, how long each level took. When you beat a campaign, a screen shows **your run in numbers**, and closes with a short story told from the facts ("The Bellhands hurt you more than anything else. Fishmarket Rows claimed you six times. And eventually, you made it through."). A short version appears after every level, and a **Stats** page on the title screen shows everything you have ever played (your *lifetime*).

It is all kept in a small **SQL database** inside the game, and every line on those screens is one **SQL question** asked of it. You can export the database file and ask it your own questions with a free program (DB Browser for SQLite).

## 2. The words you need

| Word | What it means | In this project |
|--|--|--|
| **Database** | One file that holds a set of tables. | `hushfall-stats.sqlite` |
| **SQL** | The language you use to put things in a database and ask it questions. | Every stat is one SQL question. |
| **SQLite** | A small free database that lives in one file, no server. It is in every phone. | Run inside the game by a library, **sql.js**. |
| **Table / row / column** | A spreadsheet tab / one line (ONE thing) / one kind of fact every line has. | `kills` / one kill / which gun did it. |
| **Schema** | The blueprint: every table and column. | Section 4. |
| **Primary key** | A value that is different on every row, so you can point at one row. A receipt number. | `run_id` |
| **Foreign key** | A column that holds ANOTHER table's primary key: "this belongs to that". | A kill's `run_id` says which attempt it happened in. |
| **Constraint** | A rule the database itself enforces, so impossible data cannot get in. `CHECK`, `NOT NULL`, `UNIQUE`. | "Damage taken is more than zero." |
| **Query** | A question in SQL. | "Which gun did I fire most?" |
| **Join** | Lining two tables up by a foreign key so you can use columns from both. | A death plus its attempt plus its level's NAME. |
| **Aggregate** + **GROUP BY** | Squash many rows into one number (`COUNT`, `SUM`, `AVG`, `MIN`, `MAX`), once per group. | "Damage taken, per creature." |
| **View** | A named, saved QUESTION (not saved answers): every time you use it, it is asked again. | `kills_by_weapon` |
| **Normalisation** | Store each fact once and point to it. | A level's name lives only in `levels`. |
| **Index** | A lookup, like a book's index, that makes finding rows fast. | On `run_id`. |
| **Transaction** | A bundle of changes that ALL happen or NONE do. | A level's rows go in as one bundle. |
| **Migration** | A small script that upgrades an old database to the newest blueprint. | When version 2 of the game adds a column, your old stats are kept. |
| **Persistence** | Making data survive closing the game. | Saving the database's bytes to the browser's storage (IndexedDB). |

## 3. The design decisions (and why)

**1. Important things get a row each; frequent things get running counts.** A kill, a hit you take, a death and an attempt at a level each get their own row: a whole campaign has a few thousand, and keeping each lets us ask questions we have not thought of yet. Gunfire is tens of thousands of trigger pulls we never care about one by one, so each attempt keeps ONE row per gun with three counts (section 3.2). This is the trade-off between **raw events** (flexible, big) and **tallies** (small, but only the questions you planned for).

**2. What "accuracy" means, exactly.** One scattergun blast can hit four creatures. If "hits divided by shots" counted all four, you could have 400% accuracy. So each gun keeps:
- `attacks_fired`: trigger pulls that actually fired (or melee swings),
- `attacks_connected`: attacks that hit AT LEAST ONE creature,
- `targets_hit`: how many creatures were struck in total.

**Accuracy = attacks connected / attacks fired.** Damage over time (a creature on fire) never counts as a connection. This needs the game to give every attack a number and carry it to wherever it lands, including a flare or a bolt that lands later and a blast that hits several things (section 7).

**3. "Who hurt me" points at a SOURCES table.** A hit can come from a creature, from the world (a fall, a toxic floor, a falling container) or from yourself (your own rocket). One table lists them all, each with a `type`:

| source_id | type | name |
|--|--|--|
| `enemy:gaunt` | creature | Gaunt Runner |
| `enemy:bellhand` | creature | Bellhand |
| `hazard:toxic` | environment | Toxic residue |
| `hazard:fall` | environment | A fall into the void |
| `self:own_blast` | self | Your own blast |

Every hit, kill and death points at one row here, so a typo cannot get in, and "are hazards more dangerous than creatures?" is one `GROUP BY type`. (Version 1 used a plain text column; the review was right that this is better.)

**4. The stats never touch the game.** The part of the game that decides what happens (the simulation) only ANNOUNCES events; the stats recorder LISTENS and writes rows. It cannot change a fight. A test will prove it: the same inputs give exactly the same game with the stats on and off.

**5. If the database breaks, the game keeps going.** Any error in the stats is caught; the stats switch off for that session and say so; the game never stops.

**6. Two scopes: this playthrough and lifetime.** Every screen asks its questions either for ONE playthrough (one New Game to the end) or for everything ever recorded. A query for a playthrough must follow the chain death -> attempt -> playthrough; counting every row in `deaths` is the LIFETIME answer.

**7. Reloading has a rule.** The game has quicksave and quickload. When you load, what you did since the save still HAPPENED: you fired those shots and took those hits. So a load closes the current attempt with the outcome `reloaded` and opens a new attempt from the save point (marked `from_save`). Nothing is deleted and nothing is counted twice: the game does not replay events when it loads, it just puts the world back. "Levels finished" counts levels with a COMPLETE attempt, so a reloaded attempt never counts as a finish. (Section 9 says why this differs a little from the review's suggestion.)

**8. Saving is two separate steps, and both must succeed.** sql.js keeps the database IN MEMORY. A transaction protects the database in memory, but the copy that survives closing the game is a separate thing:
1. put the attempt's rows in, inside one SQLite transaction;
2. export the whole database as bytes;
3. write the bytes to the browser's IndexedDB, inside one IndexedDB transaction;
4. only when that write says "done" are the stats marked as saved;
5. if the write fails, the last saved copy stays as it was, and the screen says the newest stats were not saved.

This happens when a level ends, on a quicksave and when you pause, so a crash or a closed tab loses at most what happened since the last of those. The game also asks the browser to keep its storage permanently (`navigator.storage.persist()`), and the Stats page has **Export** and **Import** so a player can keep a copy.

**9. The database knows its own version.** `PRAGMA user_version` holds the blueprint's version number. When a later version of the game changes the blueprint, a **migration** upgrades the old file inside a transaction. A database from a NEWER game than this one is left untouched and the stats switch off.

**10. Integrity rules are switched ON.** `PRAGMA foreign_keys = ON` every time the database is opened (SQLite does not enforce foreign keys unless you ask), and `CHECK` constraints for every rule that must always hold.

## 4. The schema (the blueprint)

```sql
PRAGMA foreign_keys = ON;   -- every time the database is opened
PRAGMA user_version = 1;    -- the blueprint's version (for migrations)

-- reference tables: filled from the game's own data
CREATE TABLE levels (
  level_id    TEXT PRIMARY KEY,                          -- 'C1E1M03'
  name        TEXT NOT NULL,                             -- 'Fishmarket Rows'
  campaign    INTEGER NOT NULL CHECK (campaign IN (1, 2)),
  episode     INTEGER,                                   -- 1..4 (Campaign 2: the act)
  kind        TEXT NOT NULL CHECK (kind IN ('main', 'secret')),
  par_seconds INTEGER CHECK (par_seconds > 0)
);
CREATE TABLE weapons (
  weapon TEXT PRIMARY KEY,                               -- 'rivet'
  name   TEXT NOT NULL                                   -- 'Rivet driver'
);
CREATE TABLE sources (                                   -- everything that can hurt you, or that you can kill
  source_id TEXT PRIMARY KEY,                            -- 'enemy:gaunt', 'hazard:toxic', 'self:own_blast'
  type      TEXT NOT NULL CHECK (type IN ('creature', 'environment', 'self')),
  name      TEXT NOT NULL,
  is_boss   INTEGER NOT NULL DEFAULT 0 CHECK (is_boss IN (0, 1))
);

-- what happened
CREATE TABLE playthroughs (                              -- one per New Game
  playthrough_id INTEGER PRIMARY KEY,
  started_at     TEXT NOT NULL,
  difficulty     TEXT NOT NULL CHECK (difficulty IN ('easy', 'normal', 'hard'))
);
CREATE TABLE level_runs (                                -- one per attempt at a level
  run_id         INTEGER PRIMARY KEY,
  playthrough_id INTEGER REFERENCES playthroughs(playthrough_id),   -- may be empty: a level started on its own
  level_id       TEXT NOT NULL REFERENCES levels(level_id),
  difficulty     TEXT NOT NULL CHECK (difficulty IN ('easy', 'normal', 'hard')),
  started_at     TEXT NOT NULL,
  from_save      INTEGER NOT NULL DEFAULT 0 CHECK (from_save IN (0, 1)),
  seconds        REAL CHECK (seconds >= 0),
  outcome        TEXT CHECK (outcome IN ('complete', 'dead', 'quit', 'restart', 'reloaded'))   -- empty while it is being played
);
CREATE TABLE weapon_use (                                -- TALLIES: one row per gun per attempt
  run_id            INTEGER NOT NULL REFERENCES level_runs(run_id),
  weapon            TEXT    NOT NULL REFERENCES weapons(weapon),
  attacks_fired     INTEGER NOT NULL DEFAULT 0 CHECK (attacks_fired >= 0),
  attacks_connected INTEGER NOT NULL DEFAULT 0 CHECK (attacks_connected BETWEEN 0 AND attacks_fired),
  targets_hit       INTEGER NOT NULL DEFAULT 0 CHECK (targets_hit >= attacks_connected),
  PRIMARY KEY (run_id, weapon)                           -- a key made of TWO columns
);
CREATE TABLE kills (
  kill_id   INTEGER PRIMARY KEY,
  run_id    INTEGER NOT NULL REFERENCES level_runs(run_id),
  victim    TEXT    NOT NULL REFERENCES sources(source_id),
  weapon    TEXT    REFERENCES weapons(weapon),          -- empty when no gun did it
  at_second REAL    NOT NULL CHECK (at_second >= 0)
);
CREATE TABLE hits_taken (
  hit_id    INTEGER PRIMARY KEY,
  run_id    INTEGER NOT NULL REFERENCES level_runs(run_id),
  source    TEXT    NOT NULL REFERENCES sources(source_id),
  amount    INTEGER NOT NULL CHECK (amount > 0),
  hp_after  INTEGER NOT NULL CHECK (hp_after >= 0),
  at_second REAL    NOT NULL CHECK (at_second >= 0)
);
CREATE TABLE deaths (
  death_id  INTEGER PRIMARY KEY,
  run_id    INTEGER NOT NULL UNIQUE REFERENCES level_runs(run_id),  -- UNIQUE: a death ends the attempt, so one at most
  killer    TEXT    NOT NULL REFERENCES sources(source_id),
  x         REAL    NOT NULL,                            -- WHERE it happened (for a map of deaths)
  z         REAL    NOT NULL,
  at_second REAL    NOT NULL CHECK (at_second >= 0)
);
CREATE INDEX runs_by_playthrough ON level_runs(playthrough_id);
CREATE INDEX kills_by_run        ON kills(run_id);
CREATE INDEX hits_by_run         ON hits_taken(run_id);

-- a VIEW: a saved question (asked again each time it is used)
CREATE VIEW kills_by_weapon AS
  SELECT r.playthrough_id, k.weapon, COUNT(*) AS kills
  FROM kills k JOIN level_runs r ON r.run_id = k.run_id
  GROUP BY r.playthrough_id, k.weapon;
```

## 5. The questions

`:pt` is a **parameter**: the playthrough being shown, filled in by the game when it asks. Parameters are also how you keep data out of the SQL text itself, which is what stops "SQL injection".

**Deaths this playthrough** (and the lifetime version underneath)
```sql
SELECT COUNT(*) AS deaths
FROM deaths d JOIN level_runs r ON r.run_id = d.run_id
WHERE r.playthrough_id = :pt;
```
```sql
SELECT COUNT(*) AS deaths FROM deaths;   -- LIFETIME: every death ever recorded
```

**The level that claimed me most**
```sql
SELECT l.name, COUNT(*) AS deaths
FROM deaths d
JOIN level_runs r ON r.run_id = d.run_id
JOIN levels l     ON l.level_id = r.level_id
WHERE r.playthrough_id = :pt
GROUP BY l.level_id
ORDER BY deaths DESC
LIMIT 1;
```

**Each gun: attacks, accuracy, kills** (a LEFT JOIN to the view keeps a gun that fired but never killed)
```sql
SELECT w.name,
       SUM(u.attacks_fired) AS attacks,
       ROUND(SUM(u.attacks_connected) * 100.0 / SUM(u.attacks_fired)) AS accuracy_pct,
       COALESCE(k.kills, 0) AS kills
FROM weapon_use u
JOIN level_runs r ON r.run_id = u.run_id
JOIN weapons w    ON w.weapon = u.weapon
LEFT JOIN kills_by_weapon k ON k.playthrough_id = r.playthrough_id AND k.weapon = u.weapon
WHERE r.playthrough_id = :pt
GROUP BY u.weapon
HAVING SUM(u.attacks_fired) > 0
ORDER BY attacks DESC;
```

**What hurt me most**
```sql
SELECT s.name, SUM(h.amount) AS damage
FROM hits_taken h
JOIN level_runs r ON r.run_id = h.run_id
JOIN sources s    ON s.source_id = h.source
WHERE r.playthrough_id = :pt
GROUP BY h.source
ORDER BY damage DESC
LIMIT 3;
```

**Creatures, the world, or myself?**
```sql
SELECT s.type, SUM(h.amount) AS damage
FROM hits_taken h
JOIN level_runs r ON r.run_id = h.run_id
JOIN sources s    ON s.source_id = h.source
WHERE r.playthrough_id = :pt
GROUP BY s.type;
```

**My closest call.** Defined as: *the lowest health I reached in a level I went on to finish.* (A low point in an attempt that ended in death was not survived.)
```sql
SELECT MIN(h.hp_after) AS closest_call
FROM hits_taken h JOIN level_runs r ON r.run_id = h.run_id
WHERE r.playthrough_id = :pt AND r.outcome = 'complete' AND h.hp_after > 0;
```

**Time against par, per episode** (finished attempts only)
```sql
SELECT l.campaign, l.episode,
       ROUND(AVG(r.seconds))     AS my_average,
       ROUND(AVG(l.par_seconds)) AS par
FROM level_runs r JOIN levels l ON l.level_id = r.level_id
WHERE r.playthrough_id = :pt AND r.outcome = 'complete'
GROUP BY l.campaign, l.episode;
```

**My longest streak of levels without dying.** A classic puzzle called "gaps and islands": a running count of deaths gives every stretch between two deaths its own number, then we count the finished levels in each stretch. It uses a **CTE** (`WITH`: a temporary named result) and a **window function** (`SUM(...) OVER (...)`: a running total).
```sql
WITH ordered AS (
  SELECT run_id, outcome,
         SUM(CASE WHEN outcome = 'dead' THEN 1 ELSE 0 END) OVER (ORDER BY run_id) AS stretch
  FROM level_runs
  WHERE playthrough_id = :pt AND outcome IN ('complete', 'dead')
)
SELECT MAX(levels) AS longest_streak
FROM (SELECT stretch, COUNT(*) AS levels FROM ordered WHERE outcome = 'complete' GROUP BY stretch);
```

**Where I die on a level** (for a map of deaths; rounding to 4 metres groups nearby deaths)
```sql
SELECT ROUND(d.x / 4) * 4 AS x, ROUND(d.z / 4) * 4 AS z, COUNT(*) AS deaths
FROM deaths d JOIN level_runs r ON r.run_id = d.run_id
WHERE r.level_id = :level
GROUP BY 1, 2
ORDER BY deaths DESC;
```

## 6. How the data flows

1. Something happens in a level. The simulation announces it as an EVENT ("enemy died", "player hurt", "weapon fired").
2. The **stats recorder** (new, in the game shell) listens and turns events into rows: kills, hits taken and deaths go in as they happen; gun tallies are counted in memory and written once at the end of the attempt.
3. When an attempt ends (finished, died, quit, restarted, reloaded), its time and outcome are filled in and the database is saved (section 3.8). Also on a quicksave and when you pause.
4. The end-of-level screen asks three questions about that attempt; the end of a campaign asks the full set for that playthrough and builds the short story from the answers; the title's **Stats** page asks them for everything (lifetime).
5. **Export** saves the file to your computer; **Import** loads one back.

## 7. What has to change in the game (checked against the current code, 2026-10-31)

- **"You were hurt" must say WHO or WHAT.** Today the event says how much and from which spot on the map (for the red glow at the screen's edge). There are fifteen places in the simulation that hurt the player: a creature's blow or bite, its shots, its rings and beams, your own blast, a fall into the void, a toxic floor, vacuum, a falling container, spikes. Each must name a source. A creature's shot is a separate object that can land after its shooter has died, so the shot must carry its shooter's kind. That adds a field to things the simulation keeps, so the game's state fingerprint changes once (identically on every computer); the fights do not.
- **Attacks get numbers.** Every trigger pull and every swing gets a number; a flare, a bolt or a rocket carries it to where it lands; "an enemy was hit" says which attack hit it and with which gun; "an enemy died" says which gun killed it. Burning does not count as a hit.
- **A library: sql.js** (MIT licence, about 1 MB), added to the licence notices and the licence test.
- **The recorder, the screens, Export / Import**, all in the game shell.
- **Tests**: the recorder fed made-up events (including a quicksave, a quickload and a death) with every query checked against numbers worked out by hand; every constraint shown to refuse bad data; a failed IndexedDB write shown to keep the old copy; and the same game played with the stats ON and OFF ending in exactly the same state.
- **One full overnight re-check** of all 68 levels, because the game changed.

## 8. In three steps (milestones)

| Milestone | What you get |
|--|--|
| **STATS-001** | The engine announcements of section 7, the schema, the recorder, saving with its failure rules, migrations, and the tests. No screens yet: you can EXPORT the file and open it in DB Browser for SQLite. |
| **STATS-002** | The three screens: after each level, at the end of each campaign, and the lifetime Stats page. |
| **STATS-003** | Import, personal records, the death map, and the short story at the end of a campaign. |

## 9. Review round 1 (the owner's tutor, 2026-10-31)

The review read version 1 against the GitHub copy of the game (older than the working copy), approved the idea, and asked for changes before building. Every claim about the code was checked against the current working copy first (section 7 lists what that check found).

| The review said | This plan now |
|--|--|
| Define accuracy: one blast that hits four creatures must not count as 400%. | Adopted: attacks fired / attacks connected / targets hit (3.2). It needs attack numbers carried through the simulation (7). |
| Use a `sources` table instead of a text column. | Adopted (3.3, 4). |
| Keep difficulty on each attempt; allow an attempt with no playthrough. | Adopted (4). In the game you buy, every level is played inside a playthrough (the level picker exists only in the developer build), so an empty `playthrough_id` is rare; it costs nothing to allow. |
| Ask the database each time a screen opens; no cached answers; learn VIEWs. | Adopted, with one view (4). |
| A SQLite transaction does not make the saved copy safe; sql.js lives in memory; save to IndexedDB and only call it saved when that finishes; keep the old copy if it fails. | Adopted (3.8). Also saved on quicksave and pause, so a crash loses little. |
| Record WHERE deaths happen. | Adopted (`deaths.x`, `deaths.z`; the death-map query). |
| Separate campaign statistics from lifetime statistics. | Adopted: every screen query takes `:pt` (5). |
| Define "closest call". | Adopted: the lowest health in a level you went on to finish (5). |
| `CHECK` constraints and `PRAGMA foreign_keys = ON`. | Adopted (3.10, 4). |
| A schema version, migrations, persistent storage, export and import. | Adopted (3.8, 3.9). |
| Tell the run as a story built only from facts. | Adopted for STATS-003. |
| Three milestones; prove stats on and off play the same game. | Adopted (7, 8). |
| **Quicksave / quickload: avoid replayed events becoming duplicate statistics; preserve recorder checkpoints across saves.** | **Answered a little differently.** The game does not replay events when it loads a save: it puts the world back silently, so nothing can be counted twice. The real question is what to do with what happened AFTER the save. This plan keeps it (you did take those hits) and closes that attempt as `reloaded` (3.7). Rolling the statistics back to the save point would need the recorder's state inside every save file, and would hide deaths and fights that really happened. Worth asking the tutor which they would choose for a player-facing screen. |

## 10. Questions still worth asking

1. The reload rule (the last row of section 9): keep what happened after a save, or roll it back?
2. `sources` holds creatures AND hazards AND "yourself", and `kills.victim` points at it too. Is one table for "things that hurt you" and "things you killed" a good idea, or should creatures have their own table?
3. Gun tallies are written once at the end of an attempt. If the game crashes mid-level, those counts are lost but the kills (written as they happen) are not. Is that inconsistency acceptable, or should tallies be flushed on every save too?
4. When would you move from sql.js (the whole database exported on every save) to SQLite's own browser build with the Origin Private File System (only the changed parts written)? What would you measure first?
