# HUSHFALL: work orders for the next builder (written 2026-11-10)

You are picking up a finished-but-unpolished game from another agent. This file is your complete brief. The reasons behind every item are in `design/ASSESSMENT_2026-11-10.md`; you do not need to re-derive them. Work the sessions in order. Each session is sized to be finished and committed in one sitting.

**How to start a session:** the owner will say something like "do session 3 of design/OPUS_HANDOFF.md". Read sections 1 and 2 of this file, then that session, then begin.

---

## 1. Rules that override everything else

These come from the owner's standing instructions. Breaking one of them has cost the owner real trouble before.

1. **No browser job without a named yes.** Do not start headless Chrome, puppeteer, a Vite dev server, a bake, a shoot, a probe, `npm run browsercheck`, `npm run regen`, `npm run audio-qa` or `npm run bake` unless the owner has said yes to that specific job in the current chat. Sessions below that need one say so in their title. If you have no yes, do the node-only parts and stop.
2. **When you do have a yes:** one job at a time, through `powershell -File tools/dev/low.ps1 <outfile> <node args>` (idle priority, two cores), with `GPU=1` in the environment, absolute paths, and never edit anything under `src/` while it runs. The job prints a pointer-lock count; it must be 0. Report it.
3. **Never kill a process by image name** (no `taskkill /im chrome.exe` or `node.exe`). Stop only processes you started, by PID.
4. **Commit locally after each session; never push.** Commit messages end with the attribution line your harness gives you. Do not merge branches, tag or force anything.
5. **Do not touch the things listed in section 2.4.**
6. **Evidence staleness.** Any edit under `src/`, `index.html`, `vite.config.js`, `package-lock.json`, `assets/baked/` or the verifier and probe tools listed in `tools/textsha.mjs` makes every map's real-game evidence stale. That is expected for sessions 2 to 5 and is repaired once, in session 6. Do not try to repair it yourself earlier. A changed map (`maps/<ID>.json` or its routes) stales only that map.
7. **Keep usage low.** No sub-agents. Do not read `AGENTS.md` end to end (it is 149 KB; search it). Do not open more than about six images in a session. Send noisy command output to a file and read the tail. Judge pictures by the numbers the tools print where a tool exists.
8. **Shell hazards.** Do not put backticks, regexes or backslashes inside `bash` or `node -e` strings; write a small `.mjs` file in the scratchpad with the Write tool and run that. Use the Edit and Write tools for all file changes, never `sed` or heredocs.
9. **Honest reporting.** Say what you ran and what you did not. "Not seen in a browser" is a normal and required sentence. Never award a map the status COMPLETE; only the owner's play does that.
10. **If a gate will not pass after three honest attempts, stop that item**, put the files back (`git checkout -- <files>`), write what you tried in the session report, and move to the next item. Do not loosen a test to get past it.

## 2. What you need to know about the project

### 2.1 Layout

- `src/engine/` the simulation. Pure JavaScript: no DOM, no Three.js, no clock, no `Math.random`, no `Math.sin/cos/atan2/acos/exp` (use `src/engine/dmath.js`). Everything else only reads its state and drains its events.
- `src/render/` Three.js view. `src/game/` the shell and UI. `src/audio/` WebAudio.
- `maps-src/<ID>.level.mjs` map sources, compiled by `node tools/mapkit/compile.mjs <ID>` into `maps/<ID>.json`. Marrow Quay (C1E1M01) has no source; its JSON is edited by small tools.
- `maps-src/skill/<ID>.json` per-map difficulty sidecars (applied last by the compiler).
- `routes/<ID>.<name>.route.json` the bot's routes.
- `tools/baker/recipes_*.js` the painted art recipes; baked output is `assets/baked/`.
- `ARCHITECTURE.md` is the code map. `PRODUCTION_LOG.md` top entry is the current state. `PLAYTEST_NOTES.md` is the owner's play reports.

### 2.2 The checks you will use (all node only, all safe)

| Purpose | Command |
|---|---|
| Topology and status | `npm run validate` |
| Fast suite | `npm test` (several minutes) |
| One test file | `node --test tests/<name>.test.js` |
| The real frame loop, headless | `node --test tests/frame-loop.test.js` (run after ANY change to `src/render`, `src/game`, `src/audio`) |
| Code health | `node --test tests/code-health.test.js` |
| One map's gates | `node tools/dev/fun-gates.mjs <ID>` |
| Did any route change? save a baseline BEFORE the change | `node tools/dev/fp-par.mjs save <file.json> --jobs=12` |
| ... then compare AFTER | `node tools/dev/fp-par.mjs check <file.json> --jobs=12` |
| Who hurt the bot on a map | `HITS=1 node tools/dev/dbg-route.mjs maps/<ID>.json routes/<ID>.main.route.json normal 1` |
| The difficulty table | `node tools/dev/curve-report.mjs` (reads the last `verify-map` evidence) |
| Simulation step cost | `node tools/dev/step-cost.mjs --all` |

Put baseline files in your scratchpad, not in the repo.

### 2.3 Two traps that have bitten before

- **Adding ONE entity to a map** (a pickup counts) flips the steering side of every creature spawned after it and can change a route. Add entities in pairs, or run the map's gates again.
- **A render-only change must leave every route identical.** If `fp-par.mjs check` reports any difference after a `src/render` change, you touched the simulation by accident. Undo and find out how.

### 2.4 Do not change

- The art direction: 480 default render width, ink outlines, value banding, painted atlases, red ink on hostiles.
- The gun roster, parry, sprint lockout, the sights' slowdown, loads and mods.
- **Hard difficulty stays very hard** (the owner's word, 2026-11-10). Do not lower Hard's numbers.
- The 68-map count. The story's protected lines (`tests/story-protected.test.js`).
- Hit volumes of creatures (a combat change; needs the owner).
- The large refactors (`updateEnemy`, `main.js`, `view.js`, `defs.js`): deferred until after release. Do not start them.

### 2.5 Where things stand

- Branch `master` in `D:\Doom`, clean at 2f45dc9 plus two uncommitted docs (this file and the assessment, with a line in `AGENTS.md`). A second worktree `D:\Doom_work` on branch `finish` is at the same commit; ignore it.
- `npm run status` says AGENT_VERIFIED 0 of 68. That is stale evidence, not broken maps.
- The owner is playing through the game now. Their reports outrank this list: if `PLAYTEST_NOTES.md` has a newer unfixed report, tell the owner before starting a session.

### 2.6 What to hand back at the end of every session

A short report in chat, and the same text appended as a dated entry at the TOP of `PRODUCTION_LOG.md` under "CURRENT STATE":

- What was changed, file by file, in one line each.
- What was run and the result (test counts, numbers before and after).
- What was NOT verified (always includes "not seen in a browser" unless a named job ran).
- Anything stopped under rule 10, with what was tried.
- The exact next session.

Then tick the session's box in section 4 of this file and commit.

---

## 3. The sessions

### Session 1: housekeeping (node only, stales nothing)

**Goal:** make every later session cheaper. No game code changes.

**1a. Commit the two documents** that are already written: `design/ASSESSMENT_2026-11-10.md`, `design/OPUS_HANDOFF.md`, and the edited `AGENTS.md`.

**1b. Shrink `AGENTS.md` (item C7).** Target: under 15 KB.

- Keep, word for word: the title block, "Non-negotiables", "Proof before expansion", "Status semantics", "Architecture (src/)", "p5.brush facts learned", "Repo hygiene", "Session start", "Checkpoint", "Machine load", "Verification rules".
- Under "Commands", keep only the npm scripts and the dozen tools in section 2.2 of this file, one line each.
- Every dated `PT-nnn` paragraph moves, unchanged, into a new file `design/history/AGENTS_CHANGELOG.md`, in the same order. Nothing is deleted.
- "Persistent files" stays, but as a plain list with one short line per file. Add a line for `design/history/AGENTS_CHANGELOG.md` and for this file.
- Check: `node --test tests/repo-layout.test.js` passes; every path named in the new `AGENTS.md` exists (write a ten-line scratch script that extracts backticked paths and tests `fs.existsSync`).

**1c. Archive one-task tools (item C8).**

- First open `tools/textsha.mjs` and list every tool path it hashes. **Those do not move.**
- A tool in `tools/dev/` stays if any of these name it: `package.json` scripts, any file under `tests/`, any other tool under `tools/`, the new `AGENTS.md`, this file, `ARCHITECTURE.md`. Write a scratch script that builds that reference list; do not judge by eye.
- Everything else moves to `D:\Doom_archive\2026-11-10\tools-dev\` (create it), with one line per file added to `design/ARCHIVE_INDEX.md`.
- Check: `npm test` passes; `node --test tests/repo-layout.test.js` passes; `npm run validate` passes. If a test fails because it wanted a tool you moved, move that tool back.
- Expect to end with roughly 80 to 100 files in `tools/dev`. Do not chase a number.

**1d. An event catalogue as a test (item C2, test-only form).**

- New file `tests/event-catalogue.test.js`. It reads every file in `src/engine` as text, collects every event name passed to `emit(w, '<name>'` (use `flatSource` from `tests/helpers.js`), and asserts three things:
  1. The set equals a frozen list written in the test (so a new event must be added on purpose).
  2. Every name is handled by `src/audio/events.js` or appears in an explicit `SILENT` list in the test.
  3. Every name that makes a sound has a caption in `src/game/captions.js` or is in its `NO_CAPTION` list.
- If assertion 2 or 3 fails on the current code, do NOT edit `src`. Put the name in a `KNOWN_GAPS` list in the test with a comment, and list those names in your report. They are findings for the owner.

**Done when:** `npm test` green, `AGENTS.md` under 15 KB, the changelog file holds every moved paragraph, the report lists any `KNOWN_GAPS`.

---

### Session 2: the picture, part one (node only; stales all evidence)

**Before anything:** `node tools/dev/fp-par.mjs save <scratchpad>/fp-before-s2.json --jobs=12`. This is the proof at the end that nothing in the simulation moved.

**2a. Floor moiré (item G1).** The checker tile in Customs Hall shimmers from mid-distance.

- Read `src/render/surface.js` (`SURFACE`, `surfaceGLSL`, `patchSurface`). It already injects world-space variation into every level material's fragment shader.
- Add a distance fade for FLOOR and CEILING kinds only: beyond a near distance, mix the sampled texture colour toward a lower-detail version of itself. The simplest correct way is a mip bias that grows with view distance: sample the map with `texture2D(map, vMapUv, bias)` where `bias = clamp((dist - near) / (far - near), 0.0, 1.0) * maxBias`. Start with near 6 m, far 18 m, maxBias 2.5. Put the three numbers in `SURFACE` as `calm: { near, far, bias }`.
- View distance is available in the fragment shader as `length(vViewPosition)`.
- Walls are unchanged.
- `tests/look-polish.test.js` and any test that reads `surfaceGLSL` must be updated to the new string, and you add one assertion: the floor shader contains the bias term, the wall shader does not.
- Also lower the tile's own contrast: in `tools/baker/recipes_polish2.js`, recipe `floor_tile_a` (about line 494), bring the two square colours closer in value by roughly a third. **Do not bake** (that is a browser job, session 4). Just change the recipe.

**2b. Seat the gun in the scene (item G4).**

- Read `src/render/gunlight.js` (`GUN_LIGHT`, `gunFactor`).
- Add a second output: a tint. In dark looks (factor under about 0.6) the weapon scene's hemisphere ground colour moves 35% toward the place's own ambient colour and the weapon's key light loses 20% saturation. Find where `gunFactor` is consumed (`GameView.setPlace` in `src/render/view.js`) and apply it there.
- Add the numbers to `GUN_LIGHT` so they are tunable. Add a test beside the existing gunlight test: a bright look returns no tint, the darkest look returns the full one, and the function is monotonic between.

**2c. The corner map is never empty (item G5).**

- Read `src/game/minimap.js` (`minimapView`, `drawMinimap`) and `src/engine/automap.js` (read only; do not change the engine).
- Two changes, shell side only:
  1. When the explored model has fewer than about 20 cells in view, draw the walls of the cells within the automap's own `EXPLORE_RADIUS_CELLS` of the player in a dim line, from the map data the shell already holds. This is drawing only; it does not mark anything explored.
  2. Draw a small tick on the corner map's border in the direction of the current objective when the objective has a known cell (the Journal's objective model already knows it where one exists; if there is no cell, draw nothing).
- Extend `tests/noisetell-automap.test.js` or the minimap test with a stand-in canvas: a fresh level produces more than zero draw calls for walls, and an objective to the east produces a tick on the east edge.

**Close the session:**

- `node --test tests/frame-loop.test.js` green.
- `node tools/dev/fp-par.mjs check <scratchpad>/fp-before-s2.json --jobs=12` reports every run identical.
- `npm test` green.
- Report: not seen in a browser; the tile recipe changed but is not baked.

---

### Session 3: the picture, part two (node only; stales all evidence)

Save a fingerprint baseline first, as in session 2.

**3a. Far creatures read as figures (item G2).** At 12 m a creature is a red-rimmed smudge.

- Read `src/render/entityflag.js` (`RIM`, `patchEntityFragment`, `markEntity`) and how `choir_kit.js` builds a creature's materials.
- In the entity fragment patch, add a distance term: beyond about 9 m, quantise the creature's lit colour toward two tones (push values below the mid toward a dark tone, above it toward a light tone; a `smoothstep` around the creature's mean luma is enough), reaching full strength at about 16 m. The effect: a far creature becomes two or three flat readable shapes.
- Raise the rim strength `RIM.k` with distance over the same range (for example 0.05 near to 0.14 far).
- Put the numbers in a frozen `FAR` object in `entityflag.js`. Peaceful creatures get the same treatment.
- Tests: the patched shader contains the far term; `tests/silhouettes.test.js` still passes (it must, you changed no geometry).

**3b. The coat-wearers (item P8).** Eleven silhouette pairs are over 0.5 overlap among the Tollbearer, Bellhand, Chorister and Sexton.

- `node tools/look/sil-matrix.mjs` prints the matrix. `tests/silhouettes.test.js` has a `CEILING` table (about line 36) that holds each over-the-bar pair to its current value.
- Change what they WEAR and CARRY, never their hit volume: headgear (a hood, a wide hat, a mitre, a bare head), what is in the hands, a pack or a collar. Each creature's rig is a function in `src/render/models_choir.js`.
- After each change: `node tools/look/check-rigs.mjs <kind>` must pass (it holds the width rule that keeps the body inside the hit cylinder) and `node tools/dev/measure-rig.mjs <kind>` must show the hit volume unchanged.
- Goal: five or fewer pairs over 0.5. Then LOWER the numbers in `CEILING` to the new values so the gain cannot be lost.
- Use `node tools/dev/rast-creature.mjs` (no browser) to look at a rig; at most four images.

**3c. The slow simulation step (item C11).**

- `node tools/dev/step-cost.mjs --all > <scratchpad>/steps.txt`. Find the map and the tick with the worst step (last known: 8.2 ms; target under 4 ms).
- Profile that case in node (`node --cpu-prof` on a scratch script that replays that route to that tick). The likely culprits are `w.enemies.filter(...)` and `w.doors.find(...)` inside per-creature loops, and navigation field rebuilds.
- Fix by caching within the tick, never across saves. Any cache lives on a non-enumerable property (see `hidden` in `src/engine/simcore.js`) so save files do not change.
- This IS an engine change. The proof is strict: `fp-par.mjs check` identical on every run, `node --test tests/save-compat.test.js` green, `node --test tests/dmath.test.js` green.
- If the worst step is a one-off (a level's first tick, a big spawn), say so and leave it.

**Close the session** as session 2.

---

### Session 4: play fixes (node only; stales only the maps touched)

**4a. Rail Yard's spike (item P1).** C1E2M03 does 116 damage to the perfect bot on Normal; its neighbours do about 75.

- `HITS=1 node tools/dev/dbg-route.mjs maps/C1E2M03.json routes/C1E2M03.main.route.json normal 1 > <scratchpad>/railyard.txt`, and again for seeds 2 and 3. Group the hits by source and by where on the map.
- If one encounter is responsible for 40 or more of the damage, ease it in the sidecar `maps-src/skill/C1E2M03.json` (move one shooter's line of sight off the lane, or make one creature `hardOnly`). Remember the pairs rule from 2.3.
- If the damage is spread evenly, change nothing and write the reason into the `WHY` table of `tools/dev/curve-report.mjs` ("a long open yard with shooters at range; even pressure").
- Then `node tools/dev/compile.mjs`-equivalent: `node tools/mapkit/compile.mjs C1E2M03`, `node tools/dev/fun-gates.mjs C1E2M03`.

**4b. The inversions (item P3).**

- Bell Tower (C1E1M08): 144 on Normal, 117 on Hard. Lamplighter Hill (C1E1M05): 60 on Easy, 70 on Normal.
- Find out why with `dbg-route.mjs` on both difficulties. A common cause: Hard adds a creature that changes where the bot stands, which happens to shelter it.
- Fix on the NORMAL side for Bell Tower (ease Normal toward about 100; do not make Hard easier or harder on purpose) and leave Lamplighter Hill alone if the Easy and Normal runs differ by under 15: note it in the `WHY` table.
- Gates as in 4a for each touched map.

**4c. The curve report.** Run `npm run verify-map -- <ID>` for each touched map, then `node tools/dev/curve-report.mjs`. No flag may say "NO REASON YET".

**Close the session:** `MAPS=<the touched IDs> node --test tests/maps.test.js` green; `npm test` green.

---

### Session 5: BROWSER SESSION (needs the owner's named yes for each job)

Ask for all four at once, plainly: "This session needs a bake of floor_tile_a, a 30-frame before/after shoot, a 6-frame effects check, and the full regeneration (about 90 to 170 minutes). Yes to all four?" Run only what is granted.

**5a. Bake** the changed tile: `node tools/bake.mjs floor_tile_a` on SwiftShader (do NOT set `GPU=1` for bakes; it has hung), through `low.ps1`. Then `node tools/dev/refresh-manifest.mjs`.

**5b. The before/after shoot:** `GPU=1 VW=1920 VH=1080 node tools/dev/polish-shots.mjs D:\Doom_release\polish\s5-after` through `low.ps1`. The "before" set is `D:\Doom_release\polish\pt083-after`.

- Judge by numbers first: `node tools/dev/lumstats.mjs <dir>` and `node tools/dev/probe-gun.mjs` (the gun's light correlation should be over 0.9; it was 0.83).
- Open at most six frames. The ones that matter: `04-C1E1M02-05-hall-entry` (the floor), `21-C1E4M07-01-route` (far creatures and the gun in a navy room), `23-C2M18-01-rim`, `28-C1E1M02-fx-fire-hit`.
- If the floor still shimmers past 8 m, raise `SURFACE.calm.bias` by 0.5 and reshoot that one frame (`ONLY=<regex>`). At most two such rounds.

**5c. The effects check (item G7):** `GPU=1 node tools/dev/store-bosses.mjs <dir>` through `low.ps1`; open the five boss frames. The boss must be visible through its shield in each. If a shield still reads as a flat slab, lower the shell's opacity in `src/render/shield.js` / `glowfx.js` and reshoot that boss once. Report with the frames named.

**5d. Commit everything, confirm `git status` is clean, then the regeneration:** `GPU=1 npm run regen` through `low.ps1` with a log folder under `D:\Doom_release\regen-s5`. Do not edit anything while it runs. When it ends: `npm run status` must say AGENT_VERIFIED 68 of 68. Commit the evidence. If a gate is red, fix that one thing, and re-run only that map (`node tools/dev/browser-map.mjs <ID>` then `npm run verify-map -- <ID>`) unless the fix touched a source set.

**5e. Store pictures (item G6),** only if the owner granted it: `tools/dev/store-bosses.mjs`, `store-map.mjs`, `store-title.mjs` per `design/store/SHOTS.md`. The trailer is a separate, longer yes.

---

### Sessions 6 onward: content, one or two maps per session (node only)

Each of these changes maps, so each stales only the maps it touches. After each map: `node tools/dev/fun-gates.mjs <ID>`, and `MAPS=<ID> node --test tests/maps.test.js`. Raise the map's `version` field when its layout changes. The owner's play reports come first; do these between reports.

**Session 6 and 7: the four mechanics return (item P5).** Each gets one short REQUIRED beat on a later map's main road. Read `design/MECHANICS_RETURNING.md` first; it records where optional branches already exist and what failed before.

| Mechanic | First seen | Put a required beat in | Notes |
|---|---|---|---|
| Mirrors | C1E4M04 Mirror Array | a Campaign 2 Act A or B map with a roofed hall | one emitter, one or two mirrors, one receiver that opens the way; engine is `src/engine/beams.js`; the bot op is `{ op: 'mirror', id, rot }` |
| Timing platforms | C1E3M05 Resonance Loom | an Episode 4 or Act A map with a height change on the lane | a sector with `cycle`; bot op `waitplatform` |
| The tide | C2M28 Last Tide | an Act C or D map with a low floor on the lane | `tide: { levels, loop }`; a loop must end where it starts |
| Cars | C2M20 Vein Rail | an Act D map with a void to cross | `cars: [...]`; bot op `ride`; the squeeze tool cannot move a car track, so pick a map with no `MAP.squeeze` |

Rules for each: tell the player what to do in one objective line at the moment it matters; the gate object is on the lane, lit and named (run `node tools/dev/findable.mjs <ID>`); run `node tools/dev/trap-cells.mjs <ID>` after any height change; the route must be updated (`node tools/dev/write-routes.mjs <ID>` if the source exports `waypoints`, otherwise edit the route file). If a map will not pass its gates with the beat after three attempts, pick another map from the same act.

**Session 8 and 9: the floor exceptions (item P4).** `design/level-floors.json` lists maps excused from a floor, each with a reason. Take only the ones whose reason is that the bot gates refused more.

- For each: `node tools/dev/level-pass.mjs <ID> --ambush`. It searches placements against every gate and backs off by itself.
- If it finds one, keep it and remove the exception. If it does not, try one hand-placed ambush closet with the encounter kit (`tools/mapkit/encounters.mjs`, `E.closet`), in a pair of creatures, behind the player on a return path.
- If that fails too, rewrite the exception's reason so it is about the MAP (what the level is for) and leave it.
- Goal: ten or fewer exceptions. `FULL_AUDIT=1 node --test tests/level-floors.test.js` green.

**Session 10: key hunts (item P6).** 21 of 62 main maps have one. Add ten more.

- Candidates: maps with a dead-end room the main route already passes. `node tools/dev/roomgraph.mjs <ID>` lists rooms and dead ends.
- `node tools/dev/add-key-hunt.mjs <ID> <key> "<objective line>"`.
- The PT-087 lint must pass (a key is never a long walk back from its door): it runs inside `fun-gates`.
- Prefer maps in Episodes 2 and 3 and Acts A and B, where there are fewest.

**Session 11: reading load (item P7).**

- `node tools/dev/route-story.mjs <ID>` prints what a main route makes the player read. Write a scratch script that runs it for all 62 main maps and counts words; list the top fifteen.
- For those fifteen: any radio line that is not an instruction and not in `tests/story-protected.test.js` may be turned into a found document near where it played (a `document` message on a prop, off the lane), so it goes to the Journal without interrupting.
- Do not rewrite any line's words. Do not touch protected lines. `node --test tests/story-protected.test.js tests/story-coherence.test.js` green.

**Session 12 onward: room accents (item G3).** `node tools/dev/materials-lint.mjs` lists rooms with no accent. Work through main-lane rooms first, five maps a session.

- An accent is a second wall skin on one wall, a trim, or dressing. Use a `PT-035 materials`-style block in the map source, placed BEFORE `L.layers()` is read (a block after it silently does nothing).
- A wall or floor skin swap must never change a cell's KIND. Prove it: `node tools/dev/route-fingerprint.mjs save` before, `check` after, for that map: identical.
- No browser needed to do the work; the owner or a later browser session judges the look.

---

## 4. Progress

Tick a box when its session is committed.

- [x] Session 1: housekeeping (2026-11-10: `AGENTS.md` 149 KB -> about 18 KB, not 15: the sections kept word for word already total about 11 KB; 19 tools archived, 135 left; the event catalogue found no gaps)
- [x] Session 2: the picture, part one (2026-11-11: G1 mip bias + quieter tile recipe (unbaked), G4 tint band 0.9 to 0.35 instead of "under 0.6", G5 dim walls + exit tick; routes identical, suite 1659)
- [ ] Session 3: the picture, part two
- [ ] Session 4: play fixes
- [ ] Session 5: browser session (bake, shoots, regeneration)
- [ ] Session 6: mirrors and timing platforms return
- [ ] Session 7: the tide and cars return
- [ ] Session 8: floor exceptions, first half
- [ ] Session 9: floor exceptions, second half
- [ ] Session 10: key hunts
- [ ] Session 11: reading load
- [ ] Session 12+: room accents (note the maps done here)

## 5. When to stop and ask the owner

- A session needs a browser job and you have no named yes.
- A change would alter a hit volume, a gun's numbers, Hard's numbers or a protected story line.
- A fingerprint check differs after a change that should not have touched the simulation, and you cannot find why in one attempt.
- `PLAYTEST_NOTES.md` has a newer report than this file's date that conflicts with a session.
- You are about to delete anything. (Move it to `D:\Doom_archive\` and list it in `design/ARCHIVE_INDEX.md`.)
