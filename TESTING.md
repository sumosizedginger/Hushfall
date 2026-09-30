# TESTING

Numbers below were read from the evidence files at the commit named in `validation/browser-check.json` (`commit`). If a number here disagrees with a file in `validation/`, the file wins and this page is stale.

## Commands
- `npm test` — 236 node:test tests (the count at the Gate 2 evidence run; `test-results.json` in the bundle is authoritative), headless (no browser, no GPU). Areas: `sim` (determinism, RNG, loop scheduling, saves, carry-over), `ai` (waking, alerts, noise, hunting, cover, actor collision, Bellhand, Retry inventory, spawn-overlap validation), `weapons`, `controls` (sprint/ADS/accuracy), `bindings`, `settings`, `automap`, `audio` (event coverage, recipes, music-stall regression), `story` (message format, sim delivery, UI queue rules on a fake clock), `tiles`, `render` (level-mesh structure built headless), `mapformat`, `save`, `route`, `campaign`, `shipped` (Marrow Quay design contracts, canonical routes, viability gates, par plausibility). Engine tests run on FROZEN fixtures in `tests/fixtures/` (the old hall-and-quay layout); only `shipped`/`story`/`render` read the level that ships.
- `npm run validate` / `npm run status` — manifest topology + evidence-derived status + asset file check. `npm test` no longer touches tracked evidence files (a test asserts that).
- `npm run browsercheck` — headless Chrome (SwiftShader software GL, 1280x720) against the dev server, 92 checks (about 7 minutes with the Gate 2 routes); writes `validation/browser-check.json` (stamped with commit, map sha, map version), `validation/render-budget.json`, screenshots in `review/engine-skeleton/`. `-- --update-baseline` rewrites `validation/render-budget-baseline.json` (the reference the budget check compares against; do it deliberately).
- `npm run verify-map -- C1E1M01` — map evidence: reachability, routes x 3 difficulties, **viability** (passive runner must not get through; perfect fighter must bleed; damage rises with difficulty; par is 2x-8x the bot's time), browser evidence bound to this map file's sha, open BLOCKERs from both known-defects files, and (Gate 2 audit repairs) the **gate-skip probe** (a fighting bot sent straight at each main exit must not finish), **ammo slack** (rounds available >= 1.5x what the perfect bot fires, every difficulty), **robustness** (a strafing fighter with 0.03 rad aim error, and one whose ammo pickups are worth 25% less, must still complete on normal), and an **engine hash** so evidence made by other engine code goes stale.
- `npm run audio-qa`, `npm run shoot-level`, `npm run shoot-stances`, `npm run shoot-weapons` — evidence/screenshot tools; they clear the title card and overlays so the images show what a player sees.
- `npm run gate2-bundle` — assembles `review/gate-2/` (Episode 1: nine maps) from evidence, per-map table, all vantage tours, honest limits; same exit codes as gate1-bundle (3 also when the browser check did not run on a map's current file).
- `npm run build-map -- <ID>` / `npm run mapview -- <ID> [scale]` / `npm run shoot-map -- <ID> [view]` — authoring loop: compile `maps-src/<ID>.level.mjs`, top-down plan, vantage tour. `node tools/dev/dbg-route.mjs <map> <route> [difficulty] [seed]` attributes bot damage (`HITS=1` lists each hit).
- `npm run gate1-bundle` — assembles `review/gate-1/` from evidence; exits non-zero if tests fail (1), the defect list is empty (2), or evidence/code provenance differs or source is dirty (3).
- `npm run build` — production build; the dev test hook must not appear in `dist/`.
- Asset tools: `node tools/dev/determinism.mjs <asset>`, `node tools/dev/clean-regen.mjs`.

## What each layer proves (and what it does not)
| layer | proves | does NOT prove |
|---|---|---|
| unit/integration tests | sim rules, determinism, AI behaviours, save migrations, UI queue ordering, level structure | that anything is fun, readable or fast |
| route bot (`fights:true`) | one valid path per difficulty completes through the real input layer; a perfect fighter completes and takes real damage on every difficulty (numbers per map in `review/gate-2/maps.json`); a strafing fighter with aim error or less ammo still completes on normal | balance for humans: the bot has perfect aim |
| runner bot (`fights:false`) | a player who never shoots cannot simply walk through: dies or is blocked on every map (numbers per map in `review/gate-2/maps.json`); a fighting bot sent straight at an exit cannot finish a gated level | that the level is fair |
| headless Chrome check (Gate 2 addition) | every Episode 1 canonical route (M02..M08, both secret routes, S01) completes in the real game and ends with the same tick count and state hash as the headless sim; the intermission Next button loads the next map with the inventory carried; the objective line, the Cantor's boss bar with its shield note and the fuse pickup toast appear | that anything in those maps is fun or fair |
| headless Chrome check | the real game runs: real key/mouse input, un-teleported walk with ordered transmissions, prompts, F5/F9, pause layout at four window sizes, WebGL-unavailable message, Node-vs-Chrome identical state (tick count + hash) for the Gate 1 route and all ten Episode 1 routes, GPU-leak check | pointer lock, real GPU speed, how it feels |
| audio QA | each of 54 effects rendered ALONE is finite, non-silent, below full scale, decays; 2 score renders (combat louder than calm) | mixed loudness, overlap, music-vs-effects balance, that it sounds good |
| render budget | draw calls / triangles at 14 vantage points (5 on the Gate 1 map, 9 on Gate 2 maps; sleeping and all-enemies-awake) are within 25% of a recorded baseline and under ceilings (350 asleep / 900 awake: engineering budgets, not measurements) | frame rate on any real machine |

## Results (see validation/*.json for the source)
| area | result |
|---|---|
| unit/integration tests | 236/236 pass (Gate 2 added: kit, elites, chain (M01->M08 carried, hard and normal), pinned-number tests, gate-skip, validator fuzz shapes, save shape checks, resume == uninterrupted on M05) |
| browser check | 92/92 pass (software GL), including every Episode 1 route played in the real game with tick count and state hash identical to the headless sim (10 routes), the M01 -> M02 Next flow, New Game -> C1E1M01 after quitting another map, Continue -> newest save |
| render budget (Gate 1 map) | pier 191 calls / 21.5k tris; plaza 161 / 19.3k; warehouse 68 / 9.5k; plaza with every enemy awake 493; warehouse awake 145 |
| render budget (Gate 2 vantages) | M03 market 234 asleep / **819 all awake**; M05 terrace 121 / 419; M06 quay 180 / **830 all awake**; M07 atrium 210; M08 chamber 196 / 537. Each awake enemy rig is ~30 draw calls; the awake ceiling is 900 (an engineering budget). The baseline (`validation/render-budget-baseline.json`) was recorded once, from the same code, at the Gate 2 evidence run: it detects regressions from here on, it does not prove these numbers are good |
| software-GL frames (unclamped) | ~900 frames per sample, tens of ms each; the exact figures change every run: see `perf` in `validation/browser-check.json`. NOT a performance claim |
| GPU lifecycle | 12 level restarts: no growth in geometries/textures/programs (the check passes; the absolute counts rose with the Gate 2 content: 1446 geometries, 31 textures, 12 programs) |
| level viability | all nine maps: passive runner does not finish; the perfect (stationary) fighter finishes on all three seeds it plays on easy and normal and on at least two of three on hard, and bleeds; gate-skip probe blocked; ammo slack >= 1.5x; strafing fighter with aim error / 25% less ammo pickups finishes on normal (per-map numbers: `review/gate-2/maps.json`) |
| audio QA | 54 SFX + 2 score renders, peaks <= 0.93 |
| production build | succeeds |

## Failure-injection coverage
Death while holding the key (restart restores it), use/interact spam on locked and unlocked doors, exit on the same tick as fatal damage (death wins), save immediately after a transition, reload after finding a secret (no double count), a 50-level carry-over chain (bounded, no growth), corrupt/foreign/newer/old saves (v1..v7 migrate to the current v8; structurally broken saves are rejected with a reason), map changed since save, unusable storage, key placed behind its own door (reachability catches it), a body spawned inside a solid prop (validation rejects it), a music scheduler stalled for 3 minutes (no burst of catch-up notes; the test fails without the fix), WebGL unavailable (browser check), Retry after a load (unit + browser check).

## Not tested / limits (honest list)
- **Nobody has played Episode 1.** Every balance number (damage, ammo slack, boss pacing, par) comes from bots: a stationary perfect shot, a strafing variant, a passive runner. A bot has perfect aim on demand and no fear.
- **Pointer lock**: cannot be granted in headless Chrome or the app browser pane. The Esc -> Resume -> click flow, and whether a rejected request recovers, need a hand test in real Chrome.
- **Real-GPU performance**: only software-GL numbers exist; crowds of awake enemies are the expensive case (~830 draw calls at the M03 market and the M06 quay).
- **Audio has never been heard by a person.** Live playback was verified by engine state and log only.
- **Reachability** (`reach.js`) is optimistic about switches, moving floors and locks (moving floors count at either height); gating is proven by the gate-skip probe and the canonical routes, not by reachability.
- Splash damage ignores walls (audit A14, open): a flare can hurt an enemy on the far side of a wall.
- Screenshots were reviewed by eye for appearance only. The app browser pane suspends animation frames when hidden, so live verification uses headless Chrome.
- The mutation run of the Gate 2 audit was not repeated in full after the repairs; the seven surviving mutations it named now each fail a test, M12 (melee ignores height difference) is still unpinned.

## Known defects
Authoritative lists: `review/gate-1/known-defects.json` (Gate 1) and `review/gate-2/known-defects.json` (the Gate 2 audit's A01-A22 with what was done, plus G2-U1..U10). Still open or partial after the repairs: A04 (hard difficulty is fragile under degraded play), A09 (render baseline), A12 (dark sea horizon), A13 (repository size), A14 (splash through walls), A21 (M12 unpinned), and the unverified items: nobody has played it, audio unheard, real-GPU performance, pointer lock, par times. Other standing issues carried from Gate 1:
- MAJOR: value-banding post pass reads more posterised-pixel than brushy (look decision pending).
- MINOR: weapon view-model reads blocky; enemy coat is a plain cone.
- MINOR: exterior is very dark away from lamp posts; lighting values are placeholders.
- MINOR: baking is slow (atlas ~100 s under software GL). Concept sprites `enemy_tollbearer_idle.png` / `weapon_flarecannon.png` are unused leftovers (excluded from the build).

## History
- Gate 0 asset spike: p5 seeding, opaque bases and matting findings are in `ART_BIBLE.md`; clean-env regeneration within 0.3% differing bytes (`review/gate-0/clean-regen.json`).
- Look demo: two bugs fixed (weapon pass wiped world depth so outlines vanished; brush fills were translucent atlas cells).
- Second weapon/enemy, controls pass, engine skeleton: bugs found by tests/checks and fixed in the game (pellet knockback compounding, Gaunt stuck on a barrel, flare in flight using the current weapon's stats, muzzle offset missing aimed shots, hook + rAF both stepping the sim, a per-restart geometry leak, dropped sub-tick key taps).
- Gate 1 audit (commit 7bf03a9, independent): 0 verified BLOCKER, 15 MAJOR, 5 MINOR; 18 weak tests; 9 unsupported doc claims. Repairs: hunting AI + Bellhand + viability gates (the level used to play itself), message queue, UI prompts, pause layout, Retry inventory (save v6), spawn-overlap validation, pointer-lock retry, honest perf sampling, evidence provenance, and the weak tests rewritten so they can fail (e.g. seeds-diverge now compares real shots; the flare test asserts on the enemy it aimed at; par is checked against the bot; ammo against what the bot spends).
- Gate 2 audit (code f79bf59, independent): 1 BLOCKER, 6 MAJOR, 15 MINOR, all confirmed by script (`review/gate-2/audit/`). The BLOCKER was mine: M07 and M08 each declared their exit twice (a `>` glyph plus a locked entity) and the unlocked one won, so the fuse gate and the Cantor gate never locked; 220 tests and 89 browser checks passed anyway because nothing tested that a gate gates. Repairs: exit validation, the gate-skip probe, Warden knockback sub-stepping, arrival inventory floored at the authored loadout (+ a carried M01->M08 chain test), New Game/Continue fixes, ammo-slack and robustness gates, a last-resort flare feed, a mandatory funicular, save structure checks, validator hardening, nav determinism, engine-hash staleness, moving-floor pickups/switches, pinned-number tests.
