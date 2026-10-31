# Your Run, in Numbers: a stats database for Hushfall

A plan, written for someone learning SQL. Nothing here is built yet. (Planned 2026-10-31; the owner: "give me your ideas, explain them like I'm an ijit, ignorant but competent and lacking vocab". It is not graded: the point is to learn the ideas on a project you know.)

## 1. What we are making

While you play, the game quietly writes down what happens: every kill, every hit you take, every death, how many shots each gun fired, how long each level took. When you beat a campaign, a screen shows you **your run in numbers**: how many times you died and where, your favourite gun, the creature that hurt you most, your closest call. A short version (three lines) appears on the end-of-level screen after every level, and the whole thing can be opened any time from the title screen.

All of it is kept in a small **SQL database** inside the game, and every line on the stats screen is one **SQL question** asked of that database. You can export the database file and ask it your own questions with a free program (DB Browser for SQLite).

## 2. The words you need (the vocabulary, in plain English)

| Word | What it means | In this project |
|--|--|--|
| **Database** | One file that holds a set of tables. | `hushfall-stats.sqlite`, kept in your browser. |
| **SQL** ("sequel" or "S-Q-L") | The language you use to ask a database questions and to put things in it. | Every stat on the screen is one SQL question. |
| **SQLite** | A small, free database that lives in a single file (no server). It is the most used database in the world: it is in every phone. | We run it inside the game with a library called **sql.js**. |
| **Table** | Like one tab of a spreadsheet. | `kills`, `deaths`, `hits_taken`, ... |
| **Row** (also "record") | One line of a table: ONE thing. | One kill. One death. One hit. |
| **Column** (also "field") | One kind of fact every row has. | A kill's columns: which creature, which gun, when. |
| **Schema** | The blueprint: every table, its columns, what type each column holds. | Section 4 below. |
| **Primary key** | A column whose value is different on every row, so you can point at one row. Like a receipt number. | `run_id` in `level_runs`. |
| **Foreign key** | A column that holds ANOTHER table's primary key: "this row belongs to that one". | A kill's `run_id` says which play of which level it happened in. |
| **Query** | A question asked in SQL. | "Which gun did I fire most?" |
| **Insert** | Putting a new row into a table. | The game inserts a row into `kills` every time something dies. |
| **Join** | A query that lines up two tables using a foreign key, so you can use columns from both. | `deaths` only knows the run; joining `level_runs` and `levels` gives you the level's NAME. |
| **Aggregate** | A question that squashes many rows into one number: `COUNT` (how many), `SUM` (add up), `AVG` (average), `MIN`, `MAX`. | "How many deaths?" is `COUNT`. |
| **GROUP BY** | "Do the aggregate once per group." | "Damage taken, per creature." |
| **Normalisation** | Store each fact ONCE and point to it, instead of copying it everywhere. | A level's name lives only in `levels`; everything else refers to it by its id. |
| **Index** | Like the index at the back of a book: a lookup that makes finding rows fast. | On `run_id`, because nearly every question uses it. |
| **Transaction** | A bundle of changes that either ALL happen or NONE do. | When a level ends, its rows are saved as one bundle, so a crash never leaves half a level written. |

## 3. The big design decisions (and why)

These are the choices a teacher will ask you to defend. Each has a short "why".

**1. One row per IMPORTANT event, a running count for FREQUENT ones.** A kill, a hit taken, a death and a level played each get their own row: there are a few thousand of them in a whole campaign, and keeping each one lets us ask questions we have not thought of yet ("what killed me most in Episode 3?"). Shots are different: a playthrough fires tens of thousands of shots, and we never care about one shot on its own, so each level keeps ONE row per gun with two numbers (`fired`, `hit`). This is the classic trade-off between **raw events** (flexible, big) and **tallies** (small, but you can only ask the questions you planned for). Footsteps and pickups that do not matter are not stored at all.

**2. Reference data in its own tables.** The names of the levels, creatures and guns already exist in the game. We copy them into `levels`, `creatures` and `weapons` once, so the event tables only hold short ids (`gaunt`, `rivet`) and the stats screen can JOIN to get the proper names. That is normalisation.

**3. The stats never touch the game.** The part of the game that decides what happens (the "simulation") only announces events ("a Gaunt died", "you took 9 damage from a Bellhand"); the stats recorder LISTENS and writes rows. It can never change a fight. This rule already holds for the sound and the pictures, and it is why the stats need no new testing of the levels themselves.

**4. If the database breaks, the game keeps going.** Any error in the stats part is caught and the stats switch themselves off for that session; the game never stops because of them.

**5. It stays on your computer.** Nothing is sent anywhere. The player can EXPORT the file if they want to.

**6. Saved at the end of each level, as one transaction.** During a level the rows go into the database in memory; when the level ends (won, died, quit) the database is saved to the browser's storage in one go.

## 4. The schema (the blueprint)

Reference tables (filled from the game's own data the first time):

```sql
CREATE TABLE levels (
  level_id    TEXT PRIMARY KEY,      -- 'C1E1M03'
  name        TEXT NOT NULL,         -- 'Fishmarket Rows'
  campaign    INTEGER NOT NULL,      -- 1 or 2
  episode     INTEGER,               -- 1..4 (Campaign 2 uses acts)
  kind        TEXT NOT NULL,         -- 'main' or 'secret'
  par_seconds INTEGER                -- the target time
);
CREATE TABLE creatures (
  kind    TEXT PRIMARY KEY,          -- 'gaunt'
  name    TEXT NOT NULL,             -- 'Gaunt Runner'
  hp      INTEGER,
  is_boss INTEGER NOT NULL DEFAULT 0 -- SQLite has no true/false: 0 or 1
);
CREATE TABLE weapons (
  weapon TEXT PRIMARY KEY,           -- 'rivet'
  name   TEXT NOT NULL               -- 'Rivet driver'
);
```

What happened (the event tables):

```sql
CREATE TABLE playthroughs (                      -- one per New Game
  playthrough_id INTEGER PRIMARY KEY,
  started_at     TEXT NOT NULL,                  -- the date and time
  difficulty     TEXT NOT NULL                   -- 'easy' | 'normal' | 'hard'
);
CREATE TABLE level_runs (                        -- one per attempt at a level
  run_id         INTEGER PRIMARY KEY,
  playthrough_id INTEGER NOT NULL REFERENCES playthroughs(playthrough_id),
  level_id       TEXT    NOT NULL REFERENCES levels(level_id),
  difficulty     TEXT    NOT NULL,
  seconds        REAL,                           -- how long it lasted
  outcome        TEXT                            -- 'complete' | 'dead' | 'quit' | 'restart'
);
CREATE TABLE shots (                             -- a TALLY: one row per gun per run
  run_id INTEGER NOT NULL REFERENCES level_runs(run_id),
  weapon TEXT    NOT NULL REFERENCES weapons(weapon),
  fired  INTEGER NOT NULL DEFAULT 0,
  hit    INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (run_id, weapon)                   -- a key made of TWO columns
);
CREATE TABLE kills (
  kill_id   INTEGER PRIMARY KEY,
  run_id    INTEGER NOT NULL REFERENCES level_runs(run_id),
  creature  TEXT    NOT NULL REFERENCES creatures(kind),
  weapon    TEXT,                                -- NULL when nothing you hold did it (a creature in a toxic pool)
  at_second REAL
);
CREATE TABLE hits_taken (
  hit_id    INTEGER PRIMARY KEY,
  run_id    INTEGER NOT NULL REFERENCES level_runs(run_id),
  source    TEXT    NOT NULL,                    -- a creature kind ('bellhand') or a hazard ('toxic', 'fall', 'own_blast')
  amount    INTEGER NOT NULL,
  hp_after  INTEGER NOT NULL,
  at_second REAL
);
CREATE TABLE deaths (
  death_id  INTEGER PRIMARY KEY,
  run_id    INTEGER NOT NULL REFERENCES level_runs(run_id),
  killer    TEXT    NOT NULL,                    -- the source of the last hit
  at_second REAL
);
CREATE INDEX kills_by_run  ON kills(run_id);
CREATE INDEX hits_by_run   ON hits_taken(run_id);
CREATE INDEX deaths_by_run ON deaths(run_id);
```

Why `source` in `hits_taken` is TEXT and not a foreign key to `creatures`: a hit can come from a creature OR from the world (a fall, a toxic floor, your own rocket). That is a real modelling question; the simple answer here is one text column. The tidier answer (a `sources` table that lists creatures AND hazards) is a good thing to ask your tutor about.

## 5. The questions (each line of the stats screen is one query)

**How many times did I die?**
```sql
SELECT COUNT(*) AS deaths FROM deaths;
```

**Which level killed me most?** (a JOIN through two tables, then GROUP BY)
```sql
SELECT l.name, COUNT(*) AS deaths
FROM deaths d
JOIN level_runs r ON r.run_id = d.run_id
JOIN levels l     ON l.level_id = r.level_id
GROUP BY l.level_id
ORDER BY deaths DESC
LIMIT 1;
```

**My most used gun, and my accuracy with each** (SUM of a tally; `* 100.0` makes the division a decimal)
```sql
SELECT w.name, SUM(s.fired) AS shots, ROUND(SUM(s.hit) * 100.0 / SUM(s.fired)) AS accuracy_pct
FROM shots s
JOIN weapons w ON w.weapon = s.weapon
GROUP BY s.weapon
HAVING SUM(s.fired) > 0          -- HAVING is WHERE, but for groups
ORDER BY shots DESC;
```

**My deadliest gun** (kills per gun)
```sql
SELECT w.name, COUNT(*) AS kills
FROM kills k JOIN weapons w ON w.weapon = k.weapon
GROUP BY k.weapon ORDER BY kills DESC LIMIT 1;
```

**What hurt me most?** (a LEFT JOIN keeps hazards, which have no row in `creatures`)
```sql
SELECT COALESCE(c.name, h.source) AS what, SUM(h.amount) AS damage
FROM hits_taken h
LEFT JOIN creatures c ON c.kind = h.source
GROUP BY h.source ORDER BY damage DESC LIMIT 3;
```

**My closest call** (the lowest health I survived)
```sql
SELECT MIN(hp_after) FROM hits_taken WHERE hp_after > 0;
```

**Time against par, per episode** (only finished levels)
```sql
SELECT l.campaign, l.episode,
       ROUND(AVG(r.seconds))       AS my_average,
       ROUND(AVG(l.par_seconds))   AS par
FROM level_runs r JOIN levels l ON l.level_id = r.level_id
WHERE r.outcome = 'complete'
GROUP BY l.campaign, l.episode;
```

**My favourite gun in each episode** (harder: a "window function", worth learning later)
```sql
SELECT campaign, episode, weapon, shots FROM (
  SELECT l.campaign, l.episode, s.weapon, SUM(s.fired) AS shots,
         RANK() OVER (PARTITION BY l.campaign, l.episode ORDER BY SUM(s.fired) DESC) AS place
  FROM shots s
  JOIN level_runs r ON r.run_id = s.run_id
  JOIN levels l     ON l.level_id = r.level_id
  GROUP BY l.campaign, l.episode, s.weapon
) WHERE place = 1;
```

## 6. How the data flows (the pipeline)

1. Something happens in a level. The simulation announces it as an EVENT (it already does: "enemy died", "player hurt", "weapon fired").
2. The **stats recorder** (a new, small part of the game shell) listens to those events and turns them into `INSERT` statements.
3. The rows sit in the database in memory while you play.
4. When the level ends, the recorder fills in the level's time and outcome and saves the whole database to the browser's storage, inside one transaction.
5. The end-of-level screen runs three short queries for that run. The end of a campaign runs the full set (section 5) for that playthrough. The title screen's **Stats** page runs them over everything.
6. **Export** saves the database file to your computer.

## 7. What has to change in the game

- **The hit event names its source.** Today a "you were hurt" event says HOW MUCH and FROM WHERE (a spot on the map, for the red glow at the screen's edge), but not WHO. It needs a creature kind or a hazard name. That is a small change to the simulation's announcements only; nothing about a fight changes.
- **The kill event names the gun.** Same kind of small change.
- **A library: sql.js** (SQLite compiled to run in a web page; MIT licence, about 1 MB), added to the licence notices.
- **The recorder, the three screens and the export button**, in the game shell.
- **Tests**: the recorder fed a made-up set of events, then every query in section 5 checked against numbers worked out by hand.
- **One full overnight re-check** of all 68 levels, because the game itself changed (the levels play exactly the same).

## 8. Questions worth asking your tutor (to compare notes)

1. Raw events or tallies: was it right to keep one row per kill but only a count of shots? Where would you draw the line?
2. `hits_taken.source` holds either a creature or a hazard. One TEXT column, two nullable foreign-key columns, or a `sources` table: which is the "proper" design, and what does each cost?
3. Is `level_runs.difficulty` a duplicate of `playthroughs.difficulty` (a normalisation smell)? (Answer here: it is copied on purpose, so each run says by itself how hard it was: a level started from the level picker can be played on a different difficulty from the rest of the playthrough. Is that a good enough reason, or should the playthrough's difficulty be the only one?)
4. Should the stats screen run queries every time it opens, or should the game store the answers? (That is the question of **views** and **caching**.)
5. What happens if the save at the end of a level fails half-way? (That is why it is one **transaction**.)
