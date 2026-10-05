# Gate 3: repeatable production (opened 2026-10-05)

The owner approved Gate 2 on the revised build ("Perfect look, love it now. approved") and asked to "start proving the repeatable production pipeline for the remaining 59 maps". This file is the plan and the acceptance criteria. It is intent, not status: status is derived by `npm run validate`.

## What Gate 3 is, and is not
- **Is:** proof that a new map can be added by changing ONLY that map's own files, checked by one command, with the shared gates driven by the maps that exist (not by lists), and that the Episode 2 look can be produced through the same art path. The proof is ONE pilot map built through the pipeline, with an honest effort/defect log, then a stop for the owner to play it.
- **Is not:** building Episode 2. Gate 4 (the campaign, in small batches, each batch played by the owner before the next) starts only after the owner approves Gate 3. No more than the pilot is built here. No new enemies or weapons: each is its own kit item (Gate 2's "production kit" table), introduced one at a time with a test and a map that needs it. COMPLETE stays the owner's: agents never award it.

## Acceptance criteria ("repeatable" means all of these, each measurable)
| # | Criterion | How it is checked |
|---|---|---|
| R1 | Adding a map touches only its own files: `maps-src/<ID>.level.mjs`, `maps-src/<ID>.views.json`, `routes/<ID>.*.route.json`, its brief in `design/` (plus a skin recipe + table row if it brings a new skin) | `git diff --name-only` of the pilot commit lists nothing under `tools/`, `tests/`, `src/` (except skins/defs rows) |
| R2 | One command runs the whole per-map loop and prints ONE verdict with the first failing reason | `npm run map -- <ID>` |
| R3 | The shared gates (real-game route parity, the render-truth census) are driven by the maps that exist, and a new map is verified by running only that map's browser evidence, not the whole 10+ minute suite | `validation/browser/<ID>.json`, `npm run map -- <ID> --browser` |
| R4 | Staleness stays derived: a map is AGENT_VERIFIED only while its own evidence and the shared evidence match the code that produced them | `npm run validate` (and its freshness tests) |
| R5 | The pilot reaches AGENT_VERIFIED through that loop; the effort and every defect the gates caught are written down | `PRODUCTION_LOG.md` pilot log, `design/GATE3.md` results |
| R6 | The owner plays the pilot; their findings are logged before any code; then they decide Gate 3 -> Gate 4 | `PLAYTEST_NOTES.md` |

## Inventory: what blocks R1-R3 today (measured 2026-10-05 from the repo)
| Where | Episode-1 assumption | Fix |
|---|---|---|
| `tools/dev/browser-check.mjs` (24 references) | the route-parity list `G2 = [['C1E1M02','main'], ...]`, the census `mapIds`, vantage lists, flow checks named after M01/M02/M05/M06 | per-map evidence (parity + census) moves to `tools/dev/browser-map.mjs`, driven by `maps/` and `routes/`; the feature checks that use E1 maps as fixtures (boss bar, fuse toast, Continue flow) stay shared and say so |
| `tools/dev/render-census.mjs` (9) | special cases for the M08 Cantor and the M05/M06 moving floors | the generic census runs per map; the encounter special cases are skipped when their map is not the one under test |
| `tools/validate.mjs`, `tools/verify-map.mjs` | read one `validation/browser-check.json` with `mapShas[id]` | read the shared check (freshness of code) AND `validation/browser/<ID>.json` (that map's parity + census) |
| `tools/gate2-bundle.mjs` | `IDS` list and Episode 1 README text | stays an Episode 1 artifact; an episode bundle tool is written when an episode is finished (Gate 4), not now |
| `tests/*.test.js` | chain / campaign / shipped / story tests name E1 maps | fine: they test E1 content. `tests/maps.test.js` already applies the generic bar to every file in `maps/` |
| `src/game/main.js`, `src/game/testhook.js` | none: maps and routes are `import.meta.glob`ed | nothing to do (verified) |
| `FIRST_MAP = 'C1E1M01'` | a new game starts in Episode 1 | correct, kept |

## Work packages
- **G3-A: manifest-driven gates.** `tools/mapset.mjs` (the maps that exist, their routes, kind, episode, from `maps/`, `routes/` and the manifest); `tools/dev/browser-map.mjs <ID...>` (real-game parity of every route of the map against the Node sim, plus that map's render-truth census, stamped with the map sha, its routes' sha and the browser source set); the shared `browser-check` keeps what is about code, not content. `validate` and `verify-map` consume both. Freshness tests for the new rule (a changed map invalidates only itself; changed render code invalidates all). Existing evidence is regenerated once.
- **G3-B: one command per map.** `npm run map -- <ID> [--browser]`: compile `maps-src` -> validate -> reachability -> plan image -> routes x 3 difficulties -> viability gates -> quality contract -> (browser evidence) -> one verdict line. `npm run map:new -- <ID>`: scaffold the source, views and route stubs from the manifest brief (thesis and narrative purpose become the header comment).
- **G3-C: episode theme kit.** What it takes to give Episode 2 ("The Salt Works": evaporation pans, rail yards, kilns) its own look through the existing art path (p5.js + p5.brush recipes in `tools/baker/recipes.js` -> `assets/baked/` -> `WALL_SKINS`/`FLOOR_SKINS` in `defs.js`): measured on the skins the pilot needs; any bake-only-one-recipe gap is fixed here. The look is judged by the owner, not by me.
- **G3-D: the pilot.** `C1E2M01 Brine Gate` ("checkpoint assault across open ground": the processing site is guarded and organised) with ONLY the existing enemies, weapons and kit. Chosen because it needs no new roster, exercises open-ground design and the new look, and is the episode's first map. Brief first (`design/EPISODE2.md`), then source, route, views.
- **G3-E: report and stop.** `review/gate-3/REPORT.md`: R1-R6 with evidence, the effort and defect log, what was hard, what the owner should look at. The build is handed over; the owner plays the pilot.

## Rules for every map from here on (what "repeatable" will mean in Gate 4)
brief in `design/` -> `maps-src` source + views + route -> `npm run map -- <ID> --browser` green -> owner plays it (findings logged first) -> only the owner can mark it COMPLETE. A batch is small (the owner sets the size) and is played before the next begins. Shared code changes (engine, render, shell, audio, assets) invalidate every map's evidence by design: they are regenerated together, from one clean commit.

## Pilot log and results
### G3-A / G3-B (2026-10-05): done
- Gates are discovered, not listed: `tools/mapset.mjs` (the maps that exist, their routes, kind and episode); `tools/dev/route-parity.mjs` is the ONE implementation of "play a route in the real game and compare it with the Node sim" (the Episode 1 browser check and the new per-map tool both use it); `tools/dev/render-census.mjs` takes `{ only: [ids] }` and finds moving floors and the boss encounter from the maps themselves (the last Episode 1 literals are gone from it).
- Per-map real-game evidence: `tools/dev/browser-map.mjs` -> `validation/browser/<ID>.json`. `validate` and `verify-map` now judge the SHARED browser check (code) and the map's OWN file; the old `mapShas` list is no longer read. Tests: `tests/freshness.test.js` (a changed or new map invalidates only itself; changed shared code invalidates every map; 4 of 14 fail on the old validator, `review/gate-3/freshness-tests-vs-OLD-validator.txt`), `tests/mapset.test.js`.
- One command per map: `npm run map -- <ID> [--browser]`, `npm run map:new -- <ID>`, `npm run map -- --list`.
- MEASURED on the nine Episode 1 maps: real-game evidence 2-16 s per map (all nine in about 110 s; a map's routes and census, software GL), the sim loop 1-32 s per map (verify-map; compile 0.1 s). All nine derive AGENT_VERIFIED through the new per-map evidence. The shared browser check (10+ minutes) is about code and is not re-run for a new map.
- Known cost kept for the record: the shared browser check still carries the Episode 1 route parity and the all-maps census as regression fixtures (duplicated by `browser-maps`); and adding a baked skin changes `src/engine/defs.js` (the skin tables) and `src/render/textures.js` (the texture list), which invalidates every map's evidence by design. The pilot measures that cost; making skins data (and per-map asset freshness) is the candidate fix.

### G3-C / G3-D / G3-E (2026-10-05): the pilot, C1E2M01 Brine Gate, built through the pipeline
- **Scaffold:** `npm run map:new -- C1E2M01` (source, views, route stub, brief from the manifest). **Design:** a wide salt pan, two brine channels, a gate wall with a rank and two Bellhand towers, the sluice wheel in a guardhouse on the west half (the gate only opens for it), a salt dyke (a line of stacked crates) cutting the sightline across the pan, the yard with the Warden-Graft, an optional pump house cache. ONLY existing enemies, weapons and kit. 30 enemies. Brief and the lessons: `design/EPISODE2.md`.
- **Theme kit:** three skins through the existing art path (p5.js + p5.brush recipes in `tools/baker/recipes_e2.js`, seeds 9101 / 9102 / 9201 in `ART_BIBLE.md`): salt-caked brick (`L`), rusted corrugated sheet (`K`), cracked salt crust (`l`). Each is one recipe, one row in `defs.js`, one `node tools/bake.mjs <id>` (about 15 s). The level builder's floor characters and the texture list used to be hand-kept strings; both now DERIVE from the skin tables. p5.brush crashed again on a narrow tall brush rect (known, ART_BIBLE): flat areas use `g.solid`.
- **What the gates caught, in order (about eight edit-and-run cycles of 20-60 s each; none of it needed a person):** (1) the first route draft found "no path": a dead-end pocket between the guardhouse door, a crate and the tower stair; (2) the perfect bot ran out of rivets and flares by the towers, hard and the aim-error bot died, normal completed on 1 of 3 seeds, the bot finished in 93 s (the contract wanted more); (3) after moving the guardhouse out of the towers' range, the whole garrison converged on the road at once and killed the perfect bot; (4) after thinning it the perfect bot took 7 damage (trivial) while the aim-error bot still died: the cliff the robustness gate exists to find; (5) the salt dyke fixed that and hard died at the road gap; (6) spreading the rank, thinning the hunters, armour and a pillbox at the gap and a pump house detour on the route fixed hard and pacing; (7) the per-map damage ordering (easy 27 > normal 19) and the par ratio needed two more ditch Tollbearers and par 600.
- **Result:** `npm run map -- C1E2M01 --browser` = **AGENT_VERIFIED in 21 s** (compile 0.1 s, plan image 0.1 s, real-game evidence 8.7 s, verify-map 11.8 s, validate 0.2 s): every gate green, the real game agrees with the Node sim (5432 ticks, same state hash), census 30 enemies and 0 violations. Perfect-bot damage easy / normal / hard = 18 / 49 / 82; the strafing bot with aim error completes on normal (21 damage). Evidence regenerated from a clean commit (stamped in every evidence file): the shared browser check passes, all ten maps are AGENT_VERIFIED (derived), `validate` OK. Tour of 16 stills: `review/level-c1e2m01/`.

### Criteria, judged honestly
| # | Verdict | Evidence |
|---|---|---|
| R1 | **Met for a map with existing skins; a new skin touches 3 more places.** The pilot commit touched its own files (`maps-src/` x2, `routes/`, `maps/`, `design/EPISODE2.md`) plus, because it brought a theme kit: `tools/baker/recipes_e2.js` + its registration, 3 PNGs + manifest, `ART_BIBLE.md`, 3 rows in `src/engine/defs.js`. The one-time derivations (`src/render/textures.js`, `tools/mapkit/builder.mjs`) and a test fixture are the pipeline's own work. | `git diff --name-only 1580b59..8bcdcd6` |
| R2 | Met | `npm run map -- <ID> [--browser]`: one verdict line and the first failing gate; 21 s on the pilot |
| R3 | Met | per-map real-game evidence 8.7 s (all ten maps: about 2 minutes); the 10-minute shared check is about code |
| R4 | Met | `tests/freshness.test.js` (a changed or new map invalidates only itself; shared code invalidates every map) |
| R5 | Met | pilot AGENT_VERIFIED; the log above |
| R6 | **Waiting for the owner** | the owner plays the pilot, their findings are logged first, then they decide Gate 3 -> Gate 4 |

### What it still costs (the honest list)
- **A new skin invalidates every map's evidence** (it changes `src/engine/defs.js` and the baked assets): the full regeneration after the pilot was about 15 minutes for ten maps (shared check about 10 minutes, per-map real-game about 2, per-map sim about 3), and would be on the order of an hour for 68. Candidate fix, not built: skins as data outside the hashed engine files and per-map freshness of only the assets a map uses. It is a choice for the owner: do it before Gate 4, or accept a full regeneration per batch that adds a skin.
- **The route is hand-authored** (about 45 ops for the pilot) and tuned with `tools/dev/dbg-route.mjs`: it is the biggest manual cost of a map and the thing the bot-based gates run on.
- **The shared browser check (about 10 minutes) still carries the Episode 1 routes and the all-maps census as regression fixtures**, duplicating `browser-maps`.
- **A bot cannot judge the map**: whether the dyke makes the pan readable, whether the towers are fun, whether the light and colour work. Nobody has played it.
